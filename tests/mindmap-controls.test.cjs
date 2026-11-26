const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

function load(file) {
  const code = buildSync({
    entryPoints: [path.join(__dirname, '../src', file)],
    bundle: true, platform: 'node', format: 'cjs', write: false,
    external: ['obsidian', 'src/i18n'],
  }).outputFiles[0].text
  const loaded = { exports: {} }
  new Function('module', 'exports', 'require', code)(loaded, loaded.exports, name => {
    if (name === 'obsidian') return {}
    if (name === 'src/i18n') return { t: key => key }
    throw new Error(`Unexpected dependency: ${name}`)
  })
  return loaded.exports
}
const Controls = load('canvas-extensions/mindmap-controls-canvas-extension.ts').default
const { resolveMindmapRelation } = load('utils/mindmap-direction.ts')

class Menu {
  items = []
  addItem(build) {
    const item = {
      setTitle(value) { this.title = value; return this },
      setIcon(value) { this.icon = value; return this },
      setChecked(value) { this.checked = value; return this },
      onClick(callback) { this.click = callback; return this },
    }
    build(item)
    this.items.push(item)
    return this
  }
}

const edgeData = (id, fromNode, toNode, extra = {}) => ({
  id, fromNode, toNode, fromSide: 'right', toSide: 'left', fromEnd: 'none', toEnd: 'arrow', ...extra,
})

function fixture(initial = [edgeData('ab', 'a', 'b')]) {
  const listeners = new Map(), cleanup = []
  const calls = { history: [], overrides: 0, saveFlags: [], writes: [] }
  const settings = { mindmapFeatureEnabled: true }
  const file = { path: 'test.canvas', extension: 'canvas' }
  const state = { metadata: { version: '1.0-1.0', frontmatter: { tags: ['keep'] } },
    nodes: [{ id: 'a', type: 'text', x: 17, y: 50, width: 200, height: 120, text: 'Body' }],
  }
  const workspace = {
    on(name, callback) { listeners.set(name, callback) },
    trigger(name, ...args) { listeners.get(name)?.(...args) },
  }
  const canvas = {
    readonly: false, edges: new Map(), selection: new Set(), view: { file },
    getData() { return { ...state, edges: [...this.edges.values()].map(edge => edge.getData()) } },
    overrideHistory() { calls.overrides++ },
    pushHistory(data) { calls.history.push(structuredClone(data)) },
    requestSave(addHistory) {
      assert.equal(addHistory, false, 'an explicit history commit must not schedule another history entry')
      calls.saveFlags.push(addHistory)
    },
    onSelectionContextMenu(menu) {
      menu.addItem(item => item.setTitle('native-selection'))
      workspace.trigger('canvas:selection-menu', menu, this)
    },
  }
  canvas.view.canvas = canvas
  for (const data of initial) {
    let current = { ...data }
    const edge = {
      canvas, getData: () => current,
      setData(data) { calls.writes.push(data); current = data },
      showMenu(menu) {
        for (const title of ['native-edit-label', 'native-follow-connection', 'native-remove'])
          menu.addItem(item => item.setTitle(title))
        // The native host passes the edge, not its canvas, as the second argument.
        workspace.trigger('canvas:edge-menu', menu, this)
      },
      onContextMenu(menu) {
        if (canvas.selection.has(this) && canvas.selection.size > 1) {
          canvas.onSelectionContextMenu(menu)
          return
        }
        if (!canvas.readonly) canvas.selection = new Set([this])
        this.showMenu(menu)
      },
    }
    canvas.edges.set(data.id, edge)
    canvas.selection.add(edge)
  }
  new Controls({
    settings: { getSetting: name => settings[name] }, app: { workspace },
    registerEvent() {}, register(callback) { cleanup.push(callback) },
  })
  const menu = () => {
    const menu = new Menu()
    const edge = [...canvas.selection].find(item => canvas.edges.get(item.getData().id) === item)
    if (edge) edge.onContextMenu(menu)
    else canvas.onSelectionContextMenu(menu)
    return menu
  }
  return { canvas, settings, cleanup, calls, menu }
}
const option = menu => menu.items.find(item => item.title === 'mindmap.relation.association')

test('native single-edge and multiple-selection menus add one ordinary-connection checkbox and preserve native actions', () => {
  const single = fixture().menu()
  assert.deepEqual(single.items.map(item => item.title), [
    'native-edit-label', 'native-follow-connection', 'native-remove', 'mindmap.relation.association',
  ])
  assert.equal(option(single).checked, false)
  const multiple = fixture([edgeData('ab', 'a', 'b'), edgeData('ac', 'a', 'c')]).menu()
  assert.deepEqual(multiple.items.map(item => item.title), ['native-selection', 'mindmap.relation.association'])
})

test('reverse arrows are automatically hierarchical, can be excluded, and restore without changing arrowheads or card content', () => {
  const initial = edgeData('ab', 'a', 'b', { fromEnd: 'arrow', toEnd: 'none', toFloating: true, label: 'Keep me' })
  const f = fixture([initial]), edge = f.canvas.edges.get('ab')
  const before = structuredClone(f.canvas.getData())
  assert.deepEqual(resolveMindmapRelation(edge.getData()), { parentId: 'b', childId: 'a' })
  const ignore = option(f.menu())
  ignore.click()
  assert.equal(resolveMindmapRelation(edge.getData()), null)
  assert.equal(option(f.menu()).checked, true)
  assert.equal(f.calls.history.length, 1)
  ignore.click()
  assert.equal(f.calls.history.length, 1, 'repeating a stale checked action adds no history')
  option(f.menu()).click()
  assert.deepEqual(edge.getData(), initial)
  assert.deepEqual(resolveMindmapRelation(edge.getData()), { parentId: 'b', childId: 'a' })
  assert.deepEqual(f.canvas.getData(), before)
  assert.equal(f.calls.history.length, 2)
  assert.deepEqual(f.calls.saveFlags, [false, false])
})

test('restoring automatic recognition never forces parentage on undirected or double-arrow edges', () => {
  for (const ends of [{ fromEnd: 'none', toEnd: 'none' }, { fromEnd: 'arrow', toEnd: 'arrow' }]) {
    const initial = edgeData('ab', 'a', 'b', { ...ends, mindmapRelation: true })
    const f = fixture([initial]), edge = f.canvas.edges.get('ab')
    assert.equal(resolveMindmapRelation(edge.getData()), null)
    option(f.menu()).click()
    assert.equal(edge.getData().mindmapRelation, false)
    option(f.menu()).click()
    assert.equal('mindmapRelation' in edge.getData(), false)
    assert.equal(resolveMindmapRelation(edge.getData()), null)
    assert.deepEqual(edge.getData(), edgeData('ab', 'a', 'b', ends))
  }
})

test('mixed selections toggle together with one history step per batch and preserve old snapshots', () => {
  const initial = [edgeData('ab', 'a', 'b', { mindmapRelation: false }), edgeData('ac', 'a', 'c')]
  const f = fixture(initial)
  assert.equal(option(f.menu()).checked, false)
  option(f.menu()).click()
  assert.ok(f.canvas.getData().edges.every(edge => edge.mindmapRelation === false))
  assert.equal(f.calls.history.length, 1)
  assert.equal(f.calls.writes.length, 1)
  const excluded = structuredClone(f.calls.history[0])
  option(f.menu()).click()
  assert.ok(f.canvas.getData().edges.every(edge => !('mindmapRelation' in edge)))
  assert.equal(f.calls.history.length, 2)
  assert.equal(f.calls.overrides, 2)
  assert.deepEqual(f.calls.saveFlags, [false, false])
  assert.deepEqual(f.calls.history[0], excluded)
})

test('callbacks reject readonly, disabled, unloaded and stale canvases', () => {
  for (const change of [
    f => { f.canvas.readonly = true },
    f => { f.settings.mindmapFeatureEnabled = false },
    f => { f.canvas.view.file = { path: 'other.canvas' } },
    f => { f.canvas.view.canvas = {} },
    f => { f.cleanup.forEach(callback => callback()) },
  ]) {
    const f = fixture(), item = option(f.menu())
    change(f)
    item.click()
    assert.equal(f.calls.history.length, 0)
    assert.equal(f.calls.writes.length, 0)
  }
})

test('ordinary-connection control does not reject or rewrite cycles or self-loops', () => {
  const edges = [edgeData('aa', 'a', 'a'), edgeData('ab', 'a', 'b'), edgeData('ba', 'b', 'a')]
  const f = fixture(edges)
  option(f.menu()).click()
  option(f.menu()).click()
  assert.deepEqual(f.canvas.getData().edges, edges)
  assert.equal(f.calls.history.length, 2)
})

test('empty selections and removed edges cannot be changed through stale menus', () => {
  const f = fixture(), item = option(f.menu())
  f.canvas.edges.delete('ab')
  item.click()
  assert.equal(f.calls.history.length, 0)
  f.canvas.selection.clear()
  assert.equal(option(f.menu()), undefined)
})
