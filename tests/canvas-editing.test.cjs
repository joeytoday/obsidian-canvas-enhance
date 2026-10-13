const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const code = buildSync({
  entryPoints: [path.join(__dirname, '../src/patchers/canvas-patcher.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['obsidian', 'monkey-around', '@codemirror/view'],
}).outputFiles[0].text

function fixture() {
  const timers = [], selections = [], nativeCalls = []
  let focused = 0
  let activeCanvas
  const loaded = { exports: {} }
  new Function('module', 'exports', 'require', 'window', code)(loaded, loaded.exports, name => {
    if (name === 'monkey-around') return require(name)
    if (['obsidian', '@codemirror/view'].includes(name)) return {}
    throw new Error(`unexpected dependency: ${name}`)
  }, { setTimeout(callback) { timers.push(callback) } })
  class TestPatcher extends loaded.exports.default { async patch() {} }
  const plugin = {
    settings: { getSetting: () => true },
    app: { workspace: { trigger() {} } },
    getCurrentCanvas: () => activeCanvas,
  }
  const patcher = new TestPatcher(plugin)
  const cm = {
    dom: { isConnected: true }, state: { doc: { length: 38 } },
    dispatch(update) { selections.push(update.selection.anchor) },
    focus() { focused++ },
  }
  const node = {
    initialized: true, isEditing: false, canvas: { readonly: false },
    nodeEl: { isConnected: true }, child: { editMode: {} },
    isEditable: () => true,
    startEditing(position) { nativeCalls.push(position); this.setIsEditing(true) },
    setIsEditing(editing) { this.isEditing = editing },
  }
  activeCanvas = node.canvas
  for (const method of ['render', 'setData', 'updateZIndex', 'renderZIndex', 'updateBreakpoint', 'getBBox', 'onConnectionPointerdown'])
    node[method] = () => {}
  patcher.patchNode(node)
  return { patcher, node, cm, timers, selections, nativeCalls, focused: () => focused,
    setActiveCanvas(value) { activeCanvas = value },
    tick: () => timers.shift()() }
}

test('native button editing waits for the mounted editor, then focuses its last position', () => {
  const f = fixture()
  f.node.startEditing()
  assert.deepEqual(f.nativeCalls, [undefined])
  f.tick()
  assert.equal(f.focused(), 0)
  f.cm.dom.isConnected = false
  f.node.child.editMode.cm = f.cm
  f.tick()
  assert.equal(f.focused(), 0)
  f.cm.dom.isConnected = true
  f.tick()
  assert.deepEqual(f.selections, [38])
  assert.equal(f.focused(), 1)
  assert.equal(f.timers.length, 0)
})

test('double-click pointer placement is passed to native editing without moving its caret', () => {
  const f = fixture(), position = { x: 100, y: 120 }
  f.node.child.editMode.cm = f.cm
  f.node.startEditing(position)
  assert.deepEqual(f.nativeCalls, [position])
  assert.equal(f.timers.length, 0)
  assert.deepEqual(f.selections, [])
})

test('pending editor focus cancels after context changes or its patch is released', () => {
  for (const cancel of [
    f => { f.node.isEditing = false },
    f => { f.node.canvas.readonly = true },
    f => { f.node.nodeEl.isConnected = false },
    f => f.setActiveCanvas(null),
    f => f.setActiveCanvas({}),
    f => f.patcher.releaseElement(f.node),
  ]) {
    const f = fixture()
    f.node.startEditing()
    f.node.child.editMode.cm = f.cm
    cancel(f)
    f.tick()
    assert.deepEqual(f.selections, [])
    assert.equal(f.focused(), 0)
    assert.equal(f.timers.length, 0)
  }
})

test('new heading prefixes retain their explicit caret position', () => {
  const f = fixture()
  f.node.child.editMode.cm = f.cm
  f.patcher.placeCaretAt(f.node, 3)
  assert.deepEqual(f.selections, [3])
  assert.equal(f.focused(), 1)
})
