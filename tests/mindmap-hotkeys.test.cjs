const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const code = buildSync({
  entryPoints: [path.join(__dirname, '../src/canvas-extensions/mindmap-canvas-extension.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  external: ['obsidian', 'monkey-around', 'src/utils/node-content-measurement'],
}).outputFiles[0].text

const loaded = { exports: {} }
new Function('module', 'exports', 'require', code)(loaded, loaded.exports, name => {
  if (name === 'monkey-around') return require(name)
  if (['obsidian', 'src/utils/node-content-measurement'].includes(name)) return {}
  throw new Error(`unexpected dependency: ${name}`)
})
const commandIds = ['mindmap-create-child-node', 'mindmap-create-sibling-node', 'mindmap-edit-selected-node']

function fixture() {
  const commands = new Map()
  const uninstallers = []
  const settings = { mindmapFeatureEnabled: false }
  const node = {
    isEditing: false,
    editorVisible: false,
    getData: () => ({ id: 'node', type: 'text' }),
    isEditable: () => true,
    startEditing() { this.editorVisible = true; this.isEditing = true },
  }
  let canvas = {
    readonly: false, nodes: new Map([['node', node]]), selection: new Set([node]),
    wrapperEl: { ownerDocument: { activeElement: null } },
  }
  // Match the host's behavior: unavailable checkCallbacks still report execution success.
  const nativeCalls = []
  const manager = { executeCommand(command, event) {
    nativeCalls.push({ receiver: this, command, event })
    command.checkCallback?.(false)
    return true
  } }
  const plugin = {
    manifest: { id: 'canvas-enhance' },
    app: { commands: manager },
    settings: { getSetting: key => settings[key] },
    addCommand(command) { commands.set(command.id, command) },
    getCurrentCanvas: () => canvas,
    register(uninstall) { uninstallers.push(uninstall) },
  }
  // Register only the commands under test; avoid starting unrelated event handlers and patches.
  const extension = new loaded.exports.default(plugin)
  settings.mindmapFeatureEnabled = true
  extension.registerCommands()
  extension.patchContextualCommandExecution()
  extension.createChildNode = extension.createSiblingNode = () => {
    throw new Error('node creation must not run when the command is unavailable')
  }
  return { commands, settings, node, canvas, manager, nativeCalls, uninstallers, setCanvas(value) { canvas = value } }
}

test('mindmap node actions expose configurable default hotkeys', () => {
  const { commands } = fixture()
  commandIds.forEach((id, index) => {
    assert.deepEqual(commands.get(id).hotkeys, [{ modifiers: [], key: ['Tab', 'Enter', ' '][index] }])
  })
})

test('checking leaves the node untouched; executing opens its native editor', () => {
  const { commands, node } = fixture()
  const command = commands.get('mindmap-edit-selected-node')
  assert.equal(command.checkCallback(true), true)
  assert.equal(node.isEditing, false)
  assert.equal(node.editorVisible, false)
  assert.equal(command.checkCallback(false), true)
  assert.equal(node.isEditing, true)
  assert.equal(node.editorVisible, true)
})

test('the edit command rejects cards without a native editable markdown view', () => {
  for (const configure of [
    node => { node.isEditable = () => false },
    node => { delete node.isEditable },
    node => { delete node.startEditing },
  ]) {
    const { commands, node } = fixture()
    configure(node)
    const command = commands.get('mindmap-edit-selected-node')
    assert.equal(command.checkCallback(true), false)
    assert.equal(command.checkCallback(false), false)
    assert.equal(node.editorVisible, false)
  }
})

test('node actions reject invalid contexts on both checking and direct execution', () => {
  const contexts = {
    'no canvas': f => f.setCanvas(null),
    'read-only canvas': f => { f.canvas.readonly = true },
    'editing node': f => { f.node.isEditing = true },
    'disabled mindmap': f => { f.settings.mindmapFeatureEnabled = false },
    'empty selection': f => f.canvas.selection.clear(),
    'mixed selection': f => f.canvas.selection.add({ getData: () => ({ id: 'edge' }) }),
    'edge-only selection': f => {
      f.canvas.selection = new Set([{ getData: () => ({ id: 'node' }) }])
    },
  }
  for (const [context, configure] of Object.entries(contexts)) {
    const f = fixture()
    configure(f)
    for (const id of commandIds) {
      const command = f.commands.get(id)
      assert.equal(command.checkCallback(true), false, `${id}: ${context}`)
      assert.equal(command.checkCallback(false), false, `${id}: ${context}`)
      assert.equal(f.manager.executeCommand({ ...command, id: `canvas-enhance:${id}` }), false, `${id}: ${context} must not consume input`)
    }
    assert.equal(f.nativeCalls.length, 0, `${context} must not call the host executor`)
  }
})

test('editable inputs inside a canvas keep their keys instead of executing node actions', () => {
  const f = fixture()
  f.canvas.wrapperEl.ownerDocument.activeElement = { closest: () => ({}) }
  for (const id of commandIds) {
    const command = f.commands.get(id)
    assert.equal(f.manager.executeCommand({ ...command, id: `canvas-enhance:${id}` }), false)
  }
  assert.equal(f.node.editorVisible, false)
  assert.equal(f.nativeCalls.length, 0)
})

test('valid canvas commands execute while unrelated commands and unload retain host behavior', () => {
  const f = fixture(), command = f.commands.get('mindmap-edit-selected-node')
  assert.equal(f.manager.executeCommand({ ...command, id: 'canvas-enhance:mindmap-edit-selected-node' }), true)
  assert.equal(f.node.editorVisible, true)
  const other = { id: 'other-plugin:command', checkCallback: () => false }, event = { key: 'Enter' }
  assert.equal(f.manager.executeCommand(other, event), true)
  assert.deepEqual(f.nativeCalls.at(-1), { receiver: f.manager, command: other, event })

  f.setCanvas(null)
  f.uninstallers.forEach(uninstall => uninstall())
  assert.equal(f.manager.executeCommand({ ...command, id: 'canvas-enhance:mindmap-edit-selected-node' }), true)
})
