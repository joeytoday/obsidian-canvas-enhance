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
  const doc = { activeElement: null, defaultView: {} }
  const editor = { closest: () => editor }
  const node = {
    isEditing: false,
    editorVisible: false,
    getData: () => ({ id: 'node', type: 'text' }),
    isEditable: () => true,
    startEditing() { this.editorVisible = true; this.isEditing = true },
    setIsEditing(value) { this.isEditing = value },
  }
  let canvas = {
    readonly: false, nodes: new Map([['node', node]]), selection: new Set([node]),
    wrapperEl: { ownerDocument: doc },
    getEdgesForNode: () => [{ from: { node: {} }, to: { node } }],
  }
  node.canvas = canvas
  node.child = { editMode: { cm: {
    dom: { ownerDocument: doc, isConnected: true }, contentDOM: editor,
    get hasFocus() { return doc.activeElement === editor }, composing: false,
  } } }
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
  return { commands, settings, node, canvas, manager, nativeCalls, uninstallers, extension, doc, editor,
    setCanvas(value) { canvas = value } }
}

function invoke(f, id, event) {
  return f.manager.executeCommand({ ...f.commands.get(id), id: `canvas-enhance:${id}` }, event)
}

function editingFixture() {
  const f = fixture()
  f.node.isEditing = true
  f.doc.activeElement = f.editor
  f.created = []
  f.extension.createChildNode = f.extension.createSiblingNode = (canvas, force) => {
    assert.equal(canvas, f.canvas)
    assert.equal(f.node.isEditing, false, 'native editing must finish before creation')
    assert.equal(force, false)
    f.created.push('node')
  }
  return f
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

test('editing commands check without writes and finish editing once before creating', () => {
  for (const [id, key] of [[commandIds[0], 'Tab'], [commandIds[1], 'Enter']]) {
    const f = editingFixture()
    assert.equal(f.commands.get(id).checkCallback(true), true)
    assert.equal(f.node.isEditing, true)
    assert.equal(f.created.length, 0)
    assert.equal(invoke(f, id, { type: 'keydown', key, shiftKey: true }), true)
    assert.equal(f.created.length, 1)
  }
})

test('host-dispatched hotkeys use the current canvas window event, not a stale event', () => {
  const f = editingFixture()
  f.doc.defaultView.event = { type: 'keydown', key: 'Tab', shiftKey: true }
  assert.equal(invoke(f, commandIds[0]), true)
  f.node.isEditing = true
  delete f.doc.defaultView.event
  assert.equal(invoke(f, commandIds[0]), false)
  assert.equal(f.created.length, 1)
})

test('plain input, composition, repeat and mouse events do not create while editing', () => {
  const events = [undefined, { type: 'click' }, ...['Tab', 'Enter', ' ', 'a'].map(key => ({ type: 'keydown', key })),
    { type: 'keydown', key: 'A', shiftKey: true },
    { type: 'keydown', key: 'e', altKey: true },
    { type: 'keydown', key: 'Tab', shiftKey: true, isComposing: true },
    { type: 'keydown', key: 'Process', shiftKey: true },
    { type: 'keydown', key: 'Tab', shiftKey: true, repeat: true }]
  for (const event of events) {
    const f = editingFixture()
    for (const id of commandIds) assert.equal(invoke(f, id, event), false, JSON.stringify(event))
    assert.equal(f.created.length, 0)
    assert.equal(f.node.isEditing, true)
  }
})

test('modified commands cannot escape into other editors, inputs or invalid canvas states', () => {
  const contexts = [
    f => f.setCanvas(null),
    f => { f.canvas.readonly = true },
    f => { f.settings.mindmapFeatureEnabled = false },
    f => f.canvas.selection.clear(),
    f => f.canvas.selection.add({}),
    f => f.canvas.nodes.clear(),
    f => { f.doc.activeElement = { closest: () => ({}) } },
    f => { f.doc.activeElement = { closest: () => null } },
  ]
  for (const configure of contexts) {
    const f = editingFixture()
    configure(f)
    for (const id of commandIds) assert.equal(invoke(f, id, { type: 'keydown', key: 'Tab', shiftKey: true }), false)
    assert.equal(f.created.length, 0)
    assert.equal(f.node.isEditing, true)
  }
})

test('a root without a parent cannot consume the sibling shortcut or end editing', () => {
  const f = editingFixture()
  f.canvas.getEdgesForNode = () => []
  assert.equal(invoke(f, commandIds[1], { type: 'keydown', key: 'Enter', shiftKey: true }), false)
  assert.equal(f.node.isEditing, true)
  assert.equal(f.created.length, 0)
})

test('iframe editors use their own focus but the host window event, and reject composition or detachment', () => {
  for (const blocked of [false, 'composition', 'detached']) {
    const f = editingFixture(), cm = f.node.child.editMode.cm
    f.canvas.wrapperEl.ownerDocument = { activeElement: { closest: () => null },
      defaultView: { event: { type: 'keydown', key: 'Enter', shiftKey: true } } }
    cm.composing = blocked === 'composition'
    cm.dom.isConnected = blocked !== 'detached'
    assert.equal(invoke(f, commandIds[1]), !blocked)
    assert.equal(f.created.length, blocked ? 0 : 1)
  }
})

test('real creation links exactly one node and transfers editing for text and file cards', () => {
  for (const type of ['text', 'file']) for (const id of commandIds.slice(0, 2)) {
    const f = editingFixture(), c = f.canvas
    delete f.extension.createChildNode
    delete f.extension.createSiblingNode
    Object.assign(f.settings, { mindmapChildNodeSpacing: 100, mindmapSiblingNodeSpacing: 30 })
    const makeNode = (id, x, y, type = 'text') => ({
      id, x, y, width: 300, height: 150, canvas: c, isEditing: false, text: 'last character 字',
      getData() { return { id, type, x: this.x, y: this.y, width: this.width, height: this.height, text: this.text } },
      setData(data) { Object.assign(this, data) }, setIsEditing(value) { this.isEditing = value },
    })
    Object.assign(f.node, makeNode('node', 400, 0, type), { isEditing: true })
    const parent = makeNode('parent', 0, 0)
    c.nodes.set('parent', parent)
    c.edges = new Map()
    c.getEdgesForNode = n => [...c.edges.values()].filter(e => e.from.node === n || e.to.node === n)
    c.importData = ({ edges }) => edges.forEach(data => c.edges.set(data.id, {
      getData: () => data, from: { node: c.nodes.get(data.fromNode) }, to: { node: c.nodes.get(data.toNode) },
    }))
    c.importData({ edges: [{ id: 'existing', fromNode: 'parent', toNode: 'node', fromSide: 'right', toSide: 'left' }] })
    let saves = 0
    c.requestSave = () => saves++
    c.zoomToSelection = () => {}
    c.deselectAll = () => c.selection.clear()
    c.selectOnly = n => { c.selection = new Set([n]) }
    c.createTextNode = ({ pos, size }) => {
      assert.equal(f.node.isEditing, false)
      const created = Object.assign(makeNode('new', pos.x, pos.y), size)
      c.nodes.set('new', created)
      return created
    }
    assert.equal(invoke(f, id, { type: 'keydown', key: 'n', metaKey: true }), true)
    assert.equal(c.nodes.size, 3)
    assert.equal(c.edges.size, 2)
    const created = c.nodes.get('new')
    assert.equal([...c.selection][0], created)
    assert.equal(created.isEditing, true)
    assert.equal(f.node.text, 'last character 字')
    assert.equal([...c.edges.values()][1].getData().fromNode, id === commandIds[0] ? 'node' : 'parent')
    assert(saves > 0)
  }
})
