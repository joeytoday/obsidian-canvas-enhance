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
    id: 'node', x: 400, y: 0, width: 300, height: 150,
    isEditing: false,
    editorVisible: false,
    getData: () => ({ id: 'node', type: 'text' }),
    isEditable: () => true,
    startEditing() { this.editorVisible = true; this.isEditing = true },
    setIsEditing(value) { this.isEditing = value },
  }
  const parent = { id: 'parent', x: 0, y: 0, width: 300, height: 150,
    getData() { return { id: this.id, type: 'text', x: this.x, y: this.y, width: this.width, height: this.height } } }
  const parentEdge = { from: { node: parent }, to: { node },
    getData: () => ({ id: 'parent-edge', fromNode: parent.id, toNode: node.id,
      fromSide: 'right', toSide: 'left', fromEnd: 'none', toEnd: 'arrow' }) }
  let canvas = {
    readonly: false, nodes: new Map([['node', node], ['parent', parent]]), selection: new Set([node]),
    edges: new Map([['parent-edge', parentEdge]]),
    wrapperEl: { ownerDocument: doc },
    getEdgesForNode: target => [...canvas.edges.values()].filter(edge => edge.from.node === target || edge.to.node === target),
  }
  node.canvas = canvas
  parent.canvas = canvas
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
  return { commands, settings, node, parent, canvas, manager, nativeCalls, uninstallers, extension, doc, editor,
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

function creationFixture(type = 'text', direction = 'right') {
  const f = editingFixture(), c = f.canvas
  delete f.extension.createChildNode
  delete f.extension.createSiblingNode
  Object.assign(f.settings, { mindmapChildNodeSpacing: 100, mindmapSiblingNodeSpacing: 30 })
  const makeNode = (id, x, y, type = 'text') => ({
    id, x, y, width: 300, height: 150, canvas: c, isEditing: false, text: 'last character 字',
    getData() { return { id, type, x: this.x, y: this.y, width: this.width, height: this.height, text: this.text } },
    setData(data) { Object.assign(this, data) }, setIsEditing(value) { this.isEditing = value },
  })
  const positions = { right: [400, 0], left: [-400, 0], down: [0, 250], up: [0, -250] }
  Object.assign(f.node, makeNode('node', ...positions[direction], type), { isEditing: true })
  const parent = makeNode('parent', 0, 0)
  c.nodes.set('parent', parent)
  c.edges = new Map()
  c.getData = () => ({
    nodes: [...c.nodes.values()].map(n => n.getData()), edges: [...c.edges.values()].map(e => e.getData()) })
  c.getEdgesForNode = n => [...c.edges.values()].filter(e => e.from.node === n || e.to.node === n)
  c.importData = ({ edges }) => edges.forEach(data => c.edges.set(data.id, {
    getData: () => data, from: { node: c.nodes.get(data.fromNode) }, to: { node: c.nodes.get(data.toNode) },
  }))
  // Legacy edges have no relation marker, even when the user moved their cards.
  c.importData({ edges: [{ id: 'existing', fromNode: 'parent', toNode: 'node', fromSide: 'right', toSide: 'left',
    fromEnd: 'none', toEnd: 'arrow' }] })
  const calls = { saves: 0, created: [] }
  c.requestSave = () => calls.saves++
  c.zoomToSelection = () => {}
  c.deselectAll = () => c.selection.clear()
  c.selectOnly = n => { c.selection = new Set([n]) }
  c.createTextNode = ({ pos, size }) => {
    assert.equal(f.node.isEditing, false)
    const created = Object.assign(makeNode(`new-${calls.created.length}`, pos.x, pos.y), size)
    calls.created.push(created)
    c.nodes.set(created.id, created)
    return created
  }
  const select = node => {
    for (const n of c.nodes.values()) n.setIsEditing(false)
    f.doc.activeElement = null
    c.selectOnly(node)
  }
  return { ...f, parent, calls, makeNode, select }
}

function assertDirectionalGap(parent, child, direction, expected = 100) {
  const gap = { right: child.x - parent.x - parent.width, left: parent.x - child.x - child.width,
    down: child.y - parent.y - parent.height, up: parent.y - child.y - child.height }[direction]
  assert.ok(gap >= expected, `${direction}: gap between ${parent.id} and ${child.id} is ${gap}`)
}

function assertNoOverlap(nodes, direction) {
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j]
    assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x ||
      a.y + a.height <= b.y || b.y + b.height <= a.y, `${direction}: ${a.id} overlaps ${b.id}`)
  }
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

test('an explicitly ordinary incoming edge cannot enable or consume the sibling shortcut', () => {
  const f = editingFixture()
  f.canvas.getEdgesForNode = () => [{ from: { node: f.parent }, to: { node: f.node },
    getData: () => ({ fromNode: f.parent.id, toNode: f.node.id, fromEnd: 'none', toEnd: 'arrow',
      toSide: 'left', toFloating: true, mindmapRelation: false }) }]
  assert.equal(f.commands.get(commandIds[1]).checkCallback(true), false)
  assert.equal(f.commands.get(commandIds[1]).checkCallback(false), false)
  assert.equal(invoke(f, commandIds[1], { type: 'keydown', key: 'Enter', shiftKey: true }), false)
  assert.equal(f.node.isEditing, true)
  assert.equal(f.created.length, 0)
  assert.equal(f.nativeCalls.length, 0)
})

test('undirected and double-arrow connections cannot consume Enter or end editing, even with a legacy true marker', () => {
  for (const ends of [{ fromEnd: 'none', toEnd: 'none' }, { fromEnd: 'arrow', toEnd: 'arrow' }]) {
    const f = editingFixture(), original = f.canvas.edges.get('parent-edge')
    f.canvas.edges.set('parent-edge', { ...original,
      getData: () => ({ ...original.getData(), ...ends, mindmapRelation: true }) })
    assert.equal(f.commands.get(commandIds[1]).checkCallback(true), false)
    assert.equal(f.commands.get(commandIds[1]).checkCallback(false), false)
    assert.equal(invoke(f, commandIds[1], { type: 'keydown', key: 'Enter', shiftKey: true }), false)
    assert.equal(f.node.isEditing, true)
    assert.equal(f.created.length, 0)
    assert.equal(f.nativeCalls.length, 0)
  }
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

test('real creation keeps dimensions, links one node in each direction and transfers text/file editing', () => {
  const sides = { right: ['right', 'left'], left: ['left', 'right'], down: ['bottom', 'top'], up: ['top', 'bottom'] }
  for (const direction of Object.keys(sides)) for (const type of ['text', 'file']) for (const id of commandIds.slice(0, 2)) {
    const f = creationFixture(type, direction), c = f.canvas
    assert.equal(invoke(f, id, { type: 'keydown', key: 'n', metaKey: true }), true)
    assert.equal(c.nodes.size, 3)
    assert.equal(c.edges.size, 2)
    const created = f.calls.created[0]
    assert.equal([...c.selection][0], created)
    assert.equal(created.isEditing, true)
    assert.equal(f.node.text, 'last character 字')
    const parent = id === commandIds[0] ? f.node : f.parent
    const edge = [...c.edges.values()][1].getData()
    assert.equal(edge.fromNode, parent.id)
    assert.equal(edge.toNode, created.id)
    assert.deepEqual([edge.fromEnd, edge.toEnd], ['none', 'arrow'])
    assert.equal('mindmapRelation' in edge, false)
    assert.deepEqual([edge.fromSide, edge.toSide], sides[direction])
    assert.deepEqual([created.width, created.height], [parent.width, parent.height])
    assertDirectionalGap(parent, created, direction)
    assert(f.calls.saves > 0)
  }
})

test('sibling creation and deletion use the first valid parent instead of an ordinary incoming edge', () => {
  const f = creationFixture(), c = f.canvas
  const ordinaryParent = f.makeNode('ordinary-parent', -800, -1000)
  c.nodes.set(ordinaryParent.id, ordinaryParent)
  const original = c.edges.get('existing')
  c.edges.clear()
  c.importData({ edges: [{ id: 'ordinary', fromNode: ordinaryParent.id, toNode: f.node.id,
    toSide: 'left', toFloating: true, mindmapRelation: false }] })
  c.edges.set('existing', original)
  assert.equal(invoke(f, commandIds[1], { type: 'keydown', key: 'Enter', shiftKey: true }), true)
  assert.equal([...c.edges.values()].at(-1).getData().fromNode, f.parent.id)
  f.select(f.node)
  f.extension.updateCachedParent(c)
  c.nodes.delete(f.node.id)
  c.edges.delete('ordinary')
  c.edges.delete('existing')
  f.extension.onNodeRemoved(c, f.node)
  assert.deepEqual([...c.selection], [f.parent])
})

test('reverse arrows determine the parent for sibling creation and deletion in every physical direction', () => {
  const sides = { right: ['right', 'left'], left: ['left', 'right'], down: ['bottom', 'top'], up: ['top', 'bottom'] }
  for (const [direction, [parentSide, childSide]] of Object.entries(sides)) {
    const f = creationFixture('text', direction), c = f.canvas
    const reverse = { id: 'existing', fromNode: f.node.id, toNode: f.parent.id,
      fromEnd: 'arrow', toEnd: 'none', fromSide: childSide, toSide: parentSide }
    c.importData({ edges: [reverse] })
    assert.equal(invoke(f, commandIds[1], { type: 'keydown', key: 'Enter', shiftKey: true }), true)
    const created = f.calls.created[0], edge = [...c.edges.values()].at(-1).getData()
    assert.equal(edge.fromNode, f.parent.id)
    assert.equal(edge.toNode, created.id)
    assert.deepEqual([edge.fromEnd, edge.toEnd], ['none', 'arrow'])
    assertDirectionalGap(f.parent, created, direction)
    assert.deepEqual(c.edges.get('existing').getData(), reverse)
    f.select(f.node)
    f.extension.updateCachedParent(c)
    c.nodes.delete(f.node.id)
    c.edges.delete('existing')
    f.extension.onNodeRemoved(c, f.node)
    assert.deepEqual([...c.selection], [f.parent])
  }
})

test('creating a sibling under a four-sided root leaves the other three branches and their descendants in place', () => {
  const positions = { right: [400, 0], left: [-400, 0], down: [0, 250], up: [0, -250] }
  const sides = { right: ['right', 'left'], left: ['left', 'right'], down: ['bottom', 'top'], up: ['top', 'bottom'] }
  for (const direction of Object.keys(positions)) {
    const f = creationFixture('text', direction), c = f.canvas
    const untouched = []
    for (const [other, [x, y]] of Object.entries(positions)) {
      if (other === direction) continue
      const branch = f.makeNode(`branch-${other}`, x, y)
      const leaf = f.makeNode(`leaf-${other}`, x * 2, y * 2)
      for (const node of [branch, leaf]) { c.nodes.set(node.id, node); untouched.push(node) }
      const [fromSide, toSide] = sides[other]
      c.importData({ edges: [
        { id: `root-${other}`, fromNode: f.parent.id, toNode: branch.id, fromSide, toSide, fromEnd: 'none', toEnd: 'arrow' },
        { id: `leaf-${other}`, fromNode: branch.id, toNode: leaf.id, fromSide, toSide, fromEnd: 'none', toEnd: 'arrow' },
      ] })
    }
    const before = untouched.map(node => node.getData())
    assert.equal(invoke(f, commandIds[1], { type: 'keydown', key: 'Enter', shiftKey: true }), true)
    assertDirectionalGap(f.parent, f.calls.created[0], direction)
    assert.deepEqual(untouched.map(node => node.getData()), before, `${direction}: unrelated branches moved`)
    assertNoOverlap([...c.nodes.values()], direction)
  }
})

test('a turning branch creates children along its outgoing direction but siblings along its incoming direction', () => {
  const f = creationFixture(), c = f.canvas
  const child = f.makeNode('turn-child', 400, 250)
  const otherBranch = f.makeNode('other-branch', -400, 0)
  c.nodes.set(child.id, child)
  c.nodes.set(otherBranch.id, otherBranch)
  c.importData({ edges: [
    { id: 'turn', fromNode: f.node.id, toNode: child.id, fromSide: 'bottom', toSide: 'top', fromEnd: 'none', toEnd: 'arrow' },
    { id: 'other-branch', fromNode: f.parent.id, toNode: otherBranch.id, fromSide: 'left', toSide: 'right', fromEnd: 'none', toEnd: 'arrow' },
  ] })
  const untouched = otherBranch.getData()
  f.select(f.node)
  assert.equal(invoke(f, commandIds[0]), true)
  const newChild = f.calls.created.at(-1)
  assertDirectionalGap(f.node, newChild, 'down')
  assert.deepEqual([...c.edges.values()].at(-1).getData().fromSide, 'bottom')
  f.select(f.node)
  assert.equal(invoke(f, commandIds[1]), true)
  const newSibling = f.calls.created.at(-1)
  assertDirectionalGap(f.parent, newSibling, 'right')
  const siblingEdge = [...c.edges.values()].at(-1).getData()
  assert.equal(siblingEdge.fromNode, f.parent.id)
  assert.deepEqual([siblingEdge.fromSide, siblingEdge.toSide], ['right', 'left'])
  assertDirectionalGap(f.node, child, 'down')
  assertDirectionalGap(f.node, newChild, 'down')
  assert.deepEqual(otherBranch.getData(), untouched)
  assertNoOverlap([...c.nodes.values()], 'turning branch')
})

test('dragging a node to another side makes new children and siblings follow without any direction setting', () => {
  for (const direction of ['left', 'down', 'up']) for (const command of commandIds.slice(0, 2)) {
    const f = creationFixture(), c = f.canvas
    const [x, y] = { left: [-400, 0], down: [0, 250], up: [0, -250] }[direction]
    f.node.setData({ x, y })
    const existingEdge = { ...c.edges.get('existing').getData() }
    assert.equal(invoke(f, command, { type: 'keydown', key: 'n', metaKey: true }), true)
    const created = f.calls.created[0]
    const parent = command === commandIds[0] ? f.node : f.parent
    assertDirectionalGap(parent, created, direction)
    assert.deepEqual([created.width, created.height], [parent.width, parent.height])
    assertNoOverlap([...c.nodes.values()], direction)
    assert.deepEqual(c.edges.get('existing').getData(), existingEdge, 'existing arrow and attachments are not rewritten')
    const edge = [...c.edges.values()].at(-1).getData()
    assert.equal(edge.fromNode, parent.id)
    assert.equal(edge.toNode, created.id)
    assert.deepEqual([edge.fromEnd, edge.toEnd], ['none', 'arrow'])
    assert.equal('mindmapRelation' in edge, false)
  }
})

test('repeated child and sibling creation separates neighboring subtrees in all four directions', () => {
  for (const direction of ['right', 'left', 'down', 'up']) {
    const f = creationFixture('text', direction), c = f.canvas
    const create = (parent, command) => {
      f.select(parent)
      assert.equal(invoke(f, command), true)
      return f.calls.created.at(-1)
    }
    const firstLeaf = create(f.node, commandIds[0])
    const neighboringBranch = create(f.parent, commandIds[0])
    create(neighboringBranch, commandIds[0])
    create(f.node, commandIds[0])
    create(firstLeaf, commandIds[1])
    assertNoOverlap([...c.nodes.values()], direction)
    for (const e of c.edges.values()) assertDirectionalGap(e.from.node, e.to.node, direction)
  }
})

test('sibling creation clears obstacles beyond the first sibling when card sizes differ in every direction', () => {
  for (const direction of ['right', 'left', 'down', 'up']) {
    const f = creationFixture('text', direction), c = f.canvas
    const physical = (x, y, width, height) => ({
      right: { x, y, width, height },
      left: { x: -x - width, y, width, height },
      down: { x: y, y: x, width: height, height: width },
      up: { x: y, y: -x - width, width: height, height: width },
    }[direction])
    Object.assign(f.parent, physical(0, 0, 150, 300))
    Object.assign(f.node, physical(250, 0, 60, 300))
    const large = Object.assign(f.makeNode('large-sibling', 0, 0), physical(250, 700, 350, 300))
    const obstacle = Object.assign(f.makeNode('obstacle', 0, 0), physical(420, 350, 100, 100))
    c.nodes.set(large.id, large)
    c.nodes.set(obstacle.id, obstacle)
    const sides = { right: ['right', 'left'], left: ['left', 'right'], down: ['bottom', 'top'], up: ['top', 'bottom'] }[direction]
    Object.assign(c.edges.get('existing').getData(), { fromSide: sides[0], toSide: sides[1] })
    c.importData({ edges: [{ id: 'large-edge', fromNode: f.parent.id, toNode: large.id,
      fromSide: sides[0], toSide: sides[1] }] })
    assertNoOverlap([...c.nodes.values()], direction)
    const originalSizes = [...c.nodes.values()].map(node => [node.id, node.width, node.height])
    f.select(f.node)
    assert.equal(invoke(f, commandIds[1]), true)
    assertNoOverlap([...c.nodes.values()], direction)
    for (const [id, width, height] of originalSizes) {
      assert.equal(c.nodes.get(id).width, width)
      assert.equal(c.nodes.get(id).height, height)
    }
    for (const edge of c.edges.values()) assertDirectionalGap(edge.from.node, edge.to.node, direction)
  }
})

function deletionEvents(f) {
  const handlers = new Map()
  f.extension.plugin.app.workspace = { on(event, callback) {
    const callbacks = handlers.get(event) ?? []
    callbacks.push(callback)
    handlers.set(event, callbacks)
  } }
  f.extension.plugin.registerEvent = () => {}
  f.extension.registerDeleteHandler()
  return (event, ...args) => {
    for (const handler of handlers.get('canvas-enhance:' + event) ?? []) handler(f.canvas, ...args)
  }
}

test('deleting a selected card after moving it to another side does not rearrange its former branch', () => {
  const f = creationFixture(), c = f.canvas
  for (const [id, y] of [['r1', 400], ['r2', 650]]) {
    c.nodes.set(id, f.makeNode(id, 400, y))
    c.importData({ edges: [{ id: 'edge-' + id, fromNode: f.parent.id, toNode: id, fromSide: 'right', toSide: 'left' }] })
  }
  const emit = deletionEvents(f)
  f.select(f.node)
  emit('selection-changed')
  f.node.setData({ x: -400 })
  emit('node-moved', f.node)
  const before = ['r1', 'r2'].map(id => c.nodes.get(id).getData())
  const removedEdge = c.edges.get('existing')
  c.nodes.delete(f.node.id)
  c.edges.delete('existing')
  // Detached-edge notifications during removal must not erase the cached parent.
  emit('edge-changed', removedEdge)
  emit('node-removed', f.node)
  assert.deepEqual(['r1', 'r2'].map(id => c.nodes.get(id).getData()), before)
  assert.deepEqual([...c.selection], [f.parent])
})

test('changing arrows before deleting the selected card refreshes its first valid parent', () => {
  for (const ends of [
    { fromEnd: 'arrow', toEnd: 'none' },
    { fromEnd: 'arrow', toEnd: 'arrow' },
    { fromEnd: 'none', toEnd: 'none' },
  ]) {
    const f = creationFixture(), c = f.canvas
    const other = f.makeNode('other-parent', 400, -400)
    c.nodes.set(other.id, other)
    c.importData({ edges: [{ id: 'other-edge', fromNode: other.id, toNode: f.node.id, fromSide: 'bottom', toSide: 'top' }] })
    const emit = deletionEvents(f)
    f.select(f.node)
    emit('selection-changed')
    const edge = c.edges.get('existing')
    Object.assign(edge.getData(), ends)
    emit('edge-changed', edge)
    c.nodes.delete(f.node.id)
    c.edges.delete('existing')
    c.edges.delete('other-edge')
    emit('node-removed', f.node)
    assert.deepEqual([...c.selection], [other])
  }
})

test('changing connection faces or floating endpoints refreshes the branch used after deletion', () => {
  for (const reverse of [false, true]) for (const change of ['faces', 'fromFloating', 'toFloating']) {
    const f = creationFixture(), c = f.canvas
    f.node.setData({ x: 400, y: 300 })
    const edge = c.edges.get('existing'), data = edge.getData()
    if (reverse) Object.assign(data, { fromNode: f.node.id, toNode: f.parent.id,
      fromEnd: 'arrow', toEnd: 'none', fromSide: 'left', toSide: 'right' })
    for (const [id, y] of [['r1', 700], ['r2', 950]]) {
      c.nodes.set(id, f.makeNode(id, 400, y))
      c.importData({ edges: [{ id: 'edge-' + id, fromNode: f.parent.id, toNode: id,
        fromSide: 'right', toSide: 'left' }] })
    }
    const emit = deletionEvents(f)
    f.select(f.node)
    emit('selection-changed')
    if (change === 'faces') Object.assign(data, {
      fromSide: reverse ? 'top' : 'bottom', toSide: reverse ? 'bottom' : 'top',
    })
    else data[change] = true
    emit('edge-changed', edge)
    const before = ['r1', 'r2'].map(id => c.nodes.get(id).getData())
    c.nodes.delete(f.node.id)
    c.edges.delete('existing')
    emit('edge-changed', edge)
    emit('node-removed', f.node)
    assert.deepEqual(['r1', 'r2'].map(id => c.nodes.get(id).getData()), before, `${reverse}/${change}`)
    assert.deepEqual([...c.selection], [f.parent])
  }
})

test('reconnecting an edge away from the selected card refreshes its parent before deletion', () => {
  for (const hasOtherParent of [false, true]) {
    const f = creationFixture(), c = f.canvas
    const replacement = f.makeNode('replacement', 400, 700)
    const other = f.makeNode('other-parent', 400, -400)
    c.nodes.set(replacement.id, replacement)
    c.nodes.set(other.id, other)
    if (hasOtherParent) c.importData({ edges: [{ id: 'other-edge', fromNode: other.id,
      toNode: f.node.id, fromSide: 'bottom', toSide: 'top' }] })
    const emit = deletionEvents(f)
    f.select(f.node)
    emit('selection-changed')
    const edge = c.edges.get('existing')
    edge.getData().toNode = replacement.id
    edge.to.node = replacement
    emit('edge-changed', edge)
    assert.equal(f.extension.getParentRelation(c, f.node)?.parent, hasOtherParent ? other : undefined)
    const before = replacement.getData()
    const detachedEdge = c.edges.get('other-edge')
    c.nodes.delete(f.node.id)
    c.edges.delete('other-edge')
    c.selection.clear()
    if (detachedEdge) emit('edge-changed', detachedEdge)
    emit('node-removed', f.node)
    assert.deepEqual(replacement.getData(), before)
    assert.deepEqual([...c.selection], hasOtherParent ? [other] : [])
  }
})

test('redrawing an unchanged edge does not repeatedly resolve the selected parent', () => {
  const f = creationFixture(), emit = deletionEvents(f)
  f.select(f.node)
  emit('selection-changed')
  f.extension.updateCachedParent = () => { throw new Error('a render must not refresh the parent cache') }
  const edge = f.canvas.edges.get('existing')
  emit('edge-changed', edge)
  Object.assign(edge.getData(), { label: 'updated label', color: '3' })
  emit('edge-changed', edge)
})

test('parallel edges do not outweigh distinct children when choosing a creation direction', () => {
  const f = creationFixture(), c = f.canvas
  for (const [id, y] of [['left-a', 0], ['left-b', 250]]) {
    c.nodes.set(id, f.makeNode(id, -400, y))
    c.importData({ edges: [{ id: 'edge-' + id, fromNode: f.parent.id, toNode: id, fromSide: 'left', toSide: 'right' }] })
  }
  for (let i = 0; i < 4; i++) c.importData({ edges: [{ id: 'parallel-' + i,
    fromNode: f.node.id, toNode: f.parent.id, fromEnd: 'arrow', toEnd: 'none', fromSide: 'left', toSide: 'right' }] })
  f.select(f.parent)
  assert.equal(invoke(f, commandIds[0]), true)
  assertDirectionalGap(f.parent, f.calls.created.at(-1), 'left')
})

test('color propagation follows the arrow-defined parent, excludes ordinary or ambiguous connections, and restores on unload', () => {
  const settings = { mindmapFeatureEnabled: false, mindmapPropagateColorToEdges: true }
  const cleanup = [], nativeCalls = []
  let saves = 0
  class HostNode {
    constructor(id) { this.id = id; this.canvas = canvas }
    getData() { return { id: this.id, type: 'text' } }
    setColor(color, silent) { nativeCalls.push({ id: this.id, color, silent }) }
  }
  const original = HostNode.prototype.setColor
  const canvas = { nodes: new Map(), edges: [], requestSave() { saves++ },
    getEdgesForNode(node) { return this.edges.filter(edge => [edge.getData().fromNode, edge.getData().toNode].includes(node.id)) } }
  for (const id of ['parent', 'forward', 'reverse', 'upstream', 'ordinary', 'undirected', 'bidirectional'])
    canvas.nodes.set(id, new HostNode(id))
  const addEdge = (id, fromNode, toNode, extra = {}) => {
    const data = { id, fromNode, toNode, fromEnd: 'none', toEnd: 'arrow', ...extra }
    const edge = { colors: [], renders: 0, getData: () => data,
      setColor(color, silent) { this.colors.push({ color, silent }) }, render() { this.renders++ } }
    canvas.edges.push(edge)
    return edge
  }
  const forward = addEdge('forward', 'parent', 'forward')
  const reverse = addEdge('reverse', 'reverse', 'parent', { fromEnd: 'arrow', toEnd: 'none' })
  const excluded = [
    addEdge('incoming', 'parent', 'upstream', { fromEnd: 'arrow', toEnd: 'none' }),
    addEdge('ordinary', 'parent', 'ordinary', { mindmapRelation: false }),
    addEdge('undirected', 'parent', 'undirected', { toEnd: 'none' }),
    addEdge('bidirectional', 'parent', 'bidirectional', { fromEnd: 'arrow' }),
  ]
  const leaves = [{ view: { canvas } }]
  leaves.first = () => leaves[0]
  const extension = new loaded.exports.default({
    settings: { getSetting: key => settings[key] }, register: callback => cleanup.push(callback),
    app: { workspace: { getLeavesOfType: () => leaves, onLayoutReady: callback => callback() } },
  })
  settings.mindmapFeatureEnabled = true
  extension.patchColorPropagation()
  try {
    canvas.nodes.get('parent').setColor('4', true)
    assert.deepEqual(nativeCalls, [{ id: 'parent', color: '4', silent: true }])
    for (const edge of [forward, reverse]) {
      assert.deepEqual(edge.colors, [{ color: '4', silent: true }])
      assert.equal(edge.renders, 1)
    }
    assert.ok(excluded.every(edge => edge.colors.length === 0 && edge.renders === 0))
    canvas.nodes.get('reverse').setColor('6', false)
    assert.equal(reverse.colors.length, 1, 'changing the child must not recolor its parent edge')
    assert.equal(saves, 2)
    settings.mindmapPropagateColorToEdges = false
    canvas.nodes.get('parent').setColor('3')
    assert.equal(forward.colors.length, 1)
    assert.equal(saves, 2)
  } finally {
    cleanup.forEach(uninstall => uninstall())
  }
  assert.equal(HostNode.prototype.setColor, original)
  canvas.nodes.get('parent').setColor('2')
  assert.equal(forward.colors.length, 1)
})
