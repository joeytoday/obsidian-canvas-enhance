const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const code = buildSync({
  entryPoints: [path.join(__dirname, '../src/canvas-extensions/mindmap-collapse-canvas-extension.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['obsidian', 'src/i18n'],
}).outputFiles[0].text
const loaded = { exports: {} }
new Function('module', 'exports', 'require', code)(loaded, loaded.exports, name => {
  if (name === 'obsidian') return { setIcon: (el, icon) => { el.icon = icon } }
  if (name === 'src/i18n') return { t: key => key }
  throw new Error(`Unexpected dependency: ${name}`)
})
const Extension = loaded.exports.default
const copy = value => structuredClone(value)
const nodeData = (id, extra = {}) => ({ id, type: 'text', text: id, x: 0, y: 0, width: 200, height: 100, ...extra })
const edgeData = (id, fromNode, toNode, extra = {}) => ({ id, fromNode, toNode, fromSide: 'right', toSide: 'left', ...extra })

const patcherCode = buildSync({
  entryPoints: [path.join(__dirname, '../src/patchers/canvas-patcher.ts')],
  platform: 'node', format: 'cjs', write: false,
}).outputFiles[0].text

function patchImports(plugin, canvas) {
  const loaded = { exports: {} }
  class Patcher {
    constructor(plugin) { this.plugin = plugin }
    static OverrideExisting(wrapper) { return wrapper }
    static patchPrototype(_plugin, target, wrappers) {
      // Exercise the production import wrapper; unrelated host patches are not started.
      if (wrappers.importData) target.importData = wrappers.importData(target.importData)
    }
  }
  new Function('module', 'exports', 'require', patcherCode)(loaded, loaded.exports, name => {
    if (name === './patcher') return Patcher
    if (name === '@codemirror/view') return { EditorView: { updateListener: { of: () => null } } }
    return {}
  })
  new loaded.exports.default(plugin).patchCanvas(canvas.view)
}

class Element {
  constructor() {
    this.classes = new Set()
    this.dataset = {}
    this.attributes = new Map()
    this.listeners = new Map()
    this.classList = {
      contains: name => this.classes.has(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      remove: name => this.classes.delete(name),
    }
  }
  createDiv({ cls }) { const el = new Element(); el.classes.add(cls); return el }
  addEventListener(event, callback) { this.listeners.set(event, callback) }
  setAttribute(name, value) { this.attributes.set(name, value) }
  remove() { this.removed = true }
  click() { this.listeners.get('click')?.({ stopPropagation() {} }) }
}

function fixture(nodes = [nodeData('root', { mindmapCollapsed: true }), nodeData('child', { x: 300 })],
  edges = [edgeData('edge', 'root', 'child')], { readonly = false, enabled = true } = {}) {
  const listeners = new Map(), cleanup = [], writes = [], history = []
  let reads = 0
  const workspace = {
    on(event, callback) {
      const callbacks = listeners.get(event) ?? new Set()
      callbacks.add(callback)
      listeners.set(event, callbacks)
      return { event, callback }
    },
    trigger(event, ...args) { for (const callback of listeners.get(event) ?? []) callback(...args) },
  }
  const canvas = {
    nodes: new Map(), edges: new Map(), readonly,
    view: { file: { path: 'test.canvas' } },
    getData() {
      reads++
      return { nodes: [...this.nodes.values()].map(n => n.getData()), edges: [...this.edges.values()].map(e => e.getData()) }
    },
    getEdgesForNode(node) { return [...this.edges.values()].filter(e => e.from.node === node || e.to.node === node) },
  }
  canvas.view.canvas = canvas
  function addNode(source) {
    let data = copy(source)
    const node = {
      canvas, nodeEl: new Element(),
      getData: () => data,
      setData(next, addHistory) {
        data = copy(next)
        writes.push(data)
        if (addHistory) history.push(copy(canvas.getData()))
        workspace.trigger('canvas-enhance:node-rendered', canvas, node)
      },
    }
    canvas.nodes.set(data.id, node)
  }
  for (const data of nodes) addNode(data)
  function addEdge(source, created = false) {
    let data = copy(source)
    const edge = {
      canvas,
      from: { node: canvas.nodes.get(data.fromNode) }, to: { node: canvas.nodes.get(data.toNode) },
      lineGroupEl: new Element(), lineEndGroupEl: new Element(), labelElement: { wrapperEl: new Element() },
      getData: () => data,
      setData(next) {
        data = copy(next)
        edge.from.node = canvas.nodes.get(data.fromNode)
        edge.to.node = canvas.nodes.get(data.toNode)
        workspace.trigger('canvas-enhance:edge-changed', canvas, edge)
      },
    }
    if (created && !canvas.viewportChanged) workspace.trigger('canvas-enhance:edge-created', canvas, edge)
    canvas.edges.set(data.id, edge)
    return edge
  }
  for (const data of edges) addEdge(data)
  canvas.importData = (data, clearCanvas = true) => {
    if (clearCanvas) { canvas.nodes.clear(); canvas.edges.clear() }
    for (const source of data.nodes) addNode(source)
    for (const source of data.edges) addEdge(source, true)
  }
  const settings = { mindmapFeatureEnabled: enabled }
  const plugin = {
    settings: { getSetting: key => settings[key] }, app: { workspace }, getCanvases: () => [canvas],
    register: callback => cleanup.push(callback),
    registerEvent: ({ event, callback }) => cleanup.push(() => listeners.get(event).delete(callback)),
    registerEditorExtension() {},
  }
  patchImports(plugin, canvas)
  const extension = new Extension(plugin)
  return {
    canvas, extension, writes, history, settings, workspace,
    node: id => canvas.nodes.get(id), edge: id => canvas.edges.get(id),
    toggle: (id, direction = 'right') => canvas.nodes.get(id).mindmapCollapseEls?.get(direction),
    directions: id => [...canvas.nodes.get(id).mindmapCollapseEls?.keys() ?? []],
    addEdge: data => addEdge(data, true),
    importData: (...args) => canvas.importData(...args),
    emit: (event, ...args) => workspace.trigger('canvas-enhance:' + event, canvas, ...args),
    move(id, position, event = 'node-moved') {
      const node = canvas.nodes.get(id)
      Object.assign(node.getData(), position)
      this.emit(event, node)
    },
    setEnabled(value) {
      settings.mindmapFeatureEnabled = value
      workspace.trigger('canvas-enhance:settings-changed')
      extension.tryInit()
    },
    unload() { for (const callback of [...cleanup].reverse()) callback() },
    get reads() { return reads },
    hidden: () => [...canvas.nodes.values()].filter(n => n.nodeEl.classList.contains('ce-mindmap-hidden')).map(n => n.getData().id).sort(),
  }
}

test('geometry refreshes folding only when a branch changes direction and removes empty-side controls', () => {
  const f = fixture([nodeData('root', { mindmapCollapsed: ['right'] }), nodeData('child', { x: 300 })])
  assert.deepEqual(f.hidden(), ['child'])
  const toggle = f.toggle('root')
  let refreshes = 0
  const compute = f.extension.computeHidden.bind(f.extension)
  f.extension.computeHidden = canvas => { refreshes++; return compute(canvas) }
  for (let x = 300; x < 350; x++) f.move('child', { x })
  assert.equal(refreshes, 0)
  assert.equal(f.toggle('root'), toggle)
  f.move('child', { x: -300 })
  assert.equal(refreshes, 1)
  assert.deepEqual(f.hidden(), [])
  assert.deepEqual(f.directions('root'), ['left'])
  assert.equal(toggle.removed, true)
  f.move('child', { x: 300 })
  assert.equal(refreshes, 2)
  assert.deepEqual(f.hidden(), ['child'])
  assert.deepEqual(f.directions('root'), ['right'])
  const reads = f.reads
  f.emit('node-rendered', f.node('root'))
  assert.equal(f.reads, reads, 'node renders must not serialize the whole canvas')
  assert.deepEqual(f.writes, [])
})

test('single arrows define parents while ordinary connections and zero or two arrows do not', () => {
  const f = fixture(
    ['root', 'vertical', 'reverse', 'ordinary', 'floating', 'legacy', 'none', 'double'].map(id => nodeData(id, id === 'root' ? { mindmapCollapsed: true } : {})),
    [edgeData('a', 'root', 'vertical', { toSide: 'top', mindmapRelation: true }),
      edgeData('r', 'reverse', 'root', { fromEnd: 'arrow', toEnd: 'none' }),
      edgeData('b', 'root', 'ordinary', { mindmapRelation: false }),
      edgeData('c', 'root', 'floating', { toFloating: true, mindmapRelation: false }),
      edgeData('d', 'root', 'legacy'),
      edgeData('n', 'root', 'none', { fromEnd: 'none', toEnd: 'none', mindmapRelation: true }),
      edgeData('x', 'root', 'double', { fromEnd: 'arrow', toEnd: 'arrow', mindmapRelation: true })],
  )
  assert.deepEqual(f.hidden(), ['legacy', 'reverse', 'vertical'])
})

test('relation and endpoint changes refresh visibility; edge redraws and floating sides reuse the cache', () => {
  const f = fixture(
    ['root', 'a', 'b', 'other'].map(id => nodeData(id, id === 'root' ? { mindmapCollapsed: true } : {})),
    [edgeData('a', 'root', 'a', { mindmapRelation: true }), edgeData('b', 'root', 'b')],
  )
  let refreshes = 0
  const compute = f.extension.computeHidden.bind(f.extension)
  f.extension.computeHidden = canvas => { refreshes++; return compute(canvas) }
  const edge = f.edge('a')
  edge.lineGroupEl = new Element()
  f.emit('edge-changed', edge)
  assert.equal(edge.lineGroupEl.classList.contains('ce-mindmap-hidden'), true)
  edge.setData({ ...edge.getData(), toSide: 'bottom', toFloating: true })
  assert.equal(refreshes, 0)
  edge.setData({ ...edge.getData(), mindmapRelation: false })
  assert.deepEqual(f.hidden(), ['b'])
  edge.setData({ ...edge.getData(), mindmapRelation: true })
  assert.deepEqual(f.hidden(), ['a', 'b'])
  edge.setData({ ...edge.getData(), fromNode: 'other' })
  assert.deepEqual(f.hidden(), ['b'])
  assert.equal(refreshes, 3)
})

test('reversing or removing arrows refreshes hidden nodes and preserves each stored collapse flag', () => {
  const f = fixture([nodeData('a', { mindmapCollapsed: true }), nodeData('b', { mindmapCollapsed: true })],
    [edgeData('edge', 'a', 'b')])
  const edge = f.edge('edge')
  assert.deepEqual(f.hidden(), ['b'])
  edge.setData({ ...edge.getData(), fromEnd: 'arrow', toEnd: 'none' })
  assert.deepEqual(f.hidden(), ['a'])
  assert.ok(f.toggle('b'))
  assert.equal(f.toggle('a'), undefined)
  edge.setData({ ...edge.getData(), toEnd: 'arrow' })
  assert.deepEqual(f.hidden(), [])
  edge.setData({ ...edge.getData(), fromEnd: 'none', toEnd: 'none' })
  assert.deepEqual(f.hidden(), [])
  edge.setData({ ...edge.getData(), toEnd: 'arrow' })
  assert.deepEqual(f.hidden(), ['b'])
  assert.equal(f.node('a').getData().mindmapCollapsed, true)
  assert.equal(f.node('b').getData().mindmapCollapsed, true)
  assert.deepEqual(f.writes, [])
})

test('an edge-created event before map insertion expands only the new reverse-arrow direction', async () => {
  const f = fixture([nodeData('parent', { mindmapCollapsed: ['right', 'left'] }),
    nodeData('child', { x: 300, mindmapCollapsed: ['up'] }), nodeData('left', { x: -300 })],
  [edgeData('left', 'parent', 'left')])
  f.addEdge(edgeData('edge', 'child', 'parent', { fromEnd: 'arrow', toEnd: 'none' }))
  await Promise.resolve()
  assert.deepEqual(f.node('parent').getData().mindmapCollapsed, ['left'])
  assert.deepEqual(f.node('child').getData().mindmapCollapsed, ['up'])
  assert.deepEqual(f.writes.map(n => n.id), ['parent'])
  assert.deepEqual(f.hidden(), ['left'])
  assert.deepEqual(f.directions('parent'), ['left', 'right'])
})

test('each occupied side has one independent control, including reverse-arrow branches', () => {
  const f = fixture(
    [nodeData('root'), nodeData('right', { x: 300, y: 1000 }), nodeData('right2', { x: 300, y: -1000 }),
      nodeData('left', { x: -300 }), nodeData('down', { y: 300 }), nodeData('up', { y: -300 })],
    [edgeData('r', 'right', 'root', { fromEnd: 'arrow', toEnd: 'none', fromSide: 'left', toSide: 'right' }),
      edgeData('r2', 'root', 'right2'), edgeData('l', 'root', 'left'), edgeData('d', 'root', 'down'), edgeData('u', 'root', 'up')],
  )
  assert.deepEqual(f.directions('root'), ['right', 'left', 'down', 'up'])
  f.toggle('root', 'right').click()
  assert.deepEqual(f.hidden(), ['right', 'right2'])
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['right'])
  f.toggle('root', 'left').click()
  assert.deepEqual(f.hidden(), ['left', 'right', 'right2'])
  f.toggle('root', 'right').click()
  assert.deepEqual(f.hidden(), ['left'])
  assert.equal(f.toggle('root', 'left').icon, 'plus-circle')
  assert.equal(f.toggle('root', 'right').icon, 'minus-circle')
  f.toggle('root', 'left').click()
  assert.deepEqual(f.hidden(), [])
  assert.equal('mindmapCollapsed' in f.node('root').getData(), false)
  assert.equal(f.history.length, 4)
})

test('resizing and reconnecting move a branch between controls and apply that side collapse state', () => {
  const f = fixture([nodeData('root', { mindmapCollapsed: ['down'] }), nodeData('child', { x: 300, y: 400 })])
  const edge = f.edge('edge')
  assert.deepEqual(f.directions('root'), ['right'])
  assert.deepEqual(f.hidden(), [])
  f.move('root', { width: 800 }, 'node-resized')
  assert.deepEqual(f.directions('root'), ['down'])
  assert.deepEqual(f.hidden(), ['child'])
  f.move('root', { width: 200 }, 'node-resized')
  assert.deepEqual(f.directions('root'), ['right'])
  assert.deepEqual(f.hidden(), [])
  edge.setData({ ...edge.getData(), fromSide: 'bottom', toSide: 'top' })
  assert.deepEqual(f.directions('root'), ['down'])
  assert.deepEqual(f.hidden(), ['child'])
  assert.deepEqual(f.writes, [])
})

test('shared descendants remain visible until all parents are collapsed', () => {
  const f = fixture(
    [nodeData('a', { mindmapCollapsed: true }), nodeData('b'), nodeData('shared'), nodeData('tail')],
    [edgeData('a', 'a', 'shared'), edgeData('b', 'b', 'shared'), edgeData('tail', 'shared', 'tail')],
  )
  assert.deepEqual(f.hidden(), [])
  f.toggle('b').click()
  assert.deepEqual(f.hidden(), ['shared', 'tail'])
  assert.equal(f.history.length, 1)
  f.toggle('a').click()
  assert.deepEqual(f.hidden(), [])
  assert.equal(f.history.length, 2)
})

test('shared children use the direction of each parent edge, including parallel connections', () => {
  const shared = fixture(
    [nodeData('a', { mindmapCollapsed: ['right'] }), nodeData('b', { x: 300, y: -300, mindmapCollapsed: ['right'] }),
      nodeData('child', { x: 300 })],
    [edgeData('a', 'a', 'child'), edgeData('b', 'b', 'child'),
      edgeData('ordinary', 'a', 'child', { mindmapRelation: false }),
      edgeData('none', 'a', 'child', { toEnd: 'none' }), edgeData('double', 'a', 'child', { fromEnd: 'arrow' })],
  )
  assert.deepEqual(shared.hidden(), [])
  assert.equal(shared.edge('a').lineGroupEl.classList.contains('ce-mindmap-hidden'), true)
  for (const id of ['b', 'ordinary', 'none', 'double'])
    assert.equal(shared.edge(id).lineGroupEl.classList.contains('ce-mindmap-hidden'), false)
  shared.toggle('b', 'down').click()
  assert.deepEqual(shared.hidden(), ['child'])
  shared.toggle('a', 'right').click()
  assert.deepEqual(shared.hidden(), [])
  assert.equal(shared.edge('a').lineGroupEl.classList.contains('ce-mindmap-hidden'), false)
  assert.equal(shared.edge('b').lineGroupEl.classList.contains('ce-mindmap-hidden'), true)
  assert.equal(shared.edge('b').lineEndGroupEl.classList.contains('ce-mindmap-hidden'), true)
  assert.equal(shared.edge('b').labelElement.wrapperEl.classList.contains('ce-mindmap-hidden'), true)

  const parallel = fixture([nodeData('root', { mindmapCollapsed: ['right'] }), nodeData('child', { x: 300, y: 300 })],
    [edgeData('right', 'root', 'child'), edgeData('down', 'root', 'child', { fromSide: 'bottom', toSide: 'top' })])
  assert.deepEqual(parallel.directions('root'), ['right', 'down'])
  assert.deepEqual(parallel.hidden(), [])
  assert.equal(parallel.edge('right').lineGroupEl.classList.contains('ce-mindmap-hidden'), true)
  assert.equal(parallel.edge('down').lineGroupEl.classList.contains('ce-mindmap-hidden'), false)
  parallel.toggle('root', 'down').click()
  assert.deepEqual(parallel.hidden(), ['child'])
  parallel.toggle('root', 'right').click()
  assert.deepEqual(parallel.hidden(), [])
})

test('legacy all-direction state is retained until editing and reloaded arrays restore each direction', () => {
  const f = fixture(
    [nodeData('root', { mindmapCollapsed: true }), nodeData('right', { x: 300 }),
      nodeData('left', { x: -300 }), nodeData('down', { y: 300 }), nodeData('up', { y: -300 })],
    ['right', 'left', 'down', 'up'].map(id => edgeData(id, 'root', id)),
  )
  assert.equal(f.node('root').getData().mindmapCollapsed, true)
  assert.deepEqual(f.writes, [])
  f.toggle('root', 'right').click()
  const saved = copy(f.node('root').getData().mindmapCollapsed)
  assert.deepEqual(saved, ['left', 'down', 'up'])
  assert.deepEqual(f.hidden(), ['down', 'left', 'up'])
  f.node('root').getData().mindmapCollapsed = true
  f.emit('data-loaded:after')
  assert.deepEqual(f.hidden(), ['down', 'left', 'right', 'up'])
  f.node('root').getData().mindmapCollapsed = saved
  f.emit('data-loaded:after')
  assert.deepEqual(f.hidden(), ['down', 'left', 'up'])
  assert.equal(f.writes.length, 1, 'loading never migrates stored collapse flags')
})

test('cycles keep their own collapse controls visible but can be hidden by an external parent', () => {
  const f = fixture(
    [nodeData('root'), nodeData('a', { mindmapCollapsed: true }), nodeData('b'), nodeData('tail')],
    [edgeData('root', 'root', 'a'), edgeData('ab', 'a', 'b'), edgeData('ba', 'b', 'a'), edgeData('tail', 'a', 'tail')],
  )
  assert.deepEqual(f.hidden(), ['tail'])
  assert.ok(f.toggle('a'))
  assert.equal(f.edge('ab').lineGroupEl.classList.contains('ce-mindmap-hidden'), true)
  assert.equal(f.edge('ba').lineGroupEl.classList.contains('ce-mindmap-hidden'), false)
  f.toggle('root').click()
  assert.deepEqual(f.hidden(), ['a', 'b', 'tail'])
  f.toggle('root').click()
  assert.deepEqual(f.hidden(), ['tail'])
  const self = fixture([nodeData('self', { mindmapCollapsed: true })], [edgeData('self', 'self', 'self')])
  assert.deepEqual(self.hidden(), [])
})

test('readonly canvases preserve stored flags and reject stale toggle clicks', () => {
  const f = fixture()
  const toggle = f.toggle('root')
  f.canvas.readonly = true
  f.emit('readonly-changed', true)
  assert.equal(f.toggle('root'), undefined)
  toggle.click()
  f.edge('edge').setData({ ...f.edge('edge').getData(), mindmapRelation: false })
  assert.deepEqual(f.hidden(), [])
  assert.equal(f.node('root').getData().mindmapCollapsed, true)
  assert.deepEqual(f.writes, [])
  assert.deepEqual(f.history, [])
})

test('disabling or unloading restores visibility without changing saved collapse state', () => {
  const f = fixture(
    [nodeData('root', { mindmapCollapsed: ['right', 'left'] }), nodeData('child', { x: 300 }), nodeData('left', { x: -300 })],
    [edgeData('edge', 'root', 'child'), edgeData('left', 'root', 'left')],
  )
  const toggles = [f.toggle('root'), f.toggle('root', 'left')]
  f.setEnabled(false)
  assert.deepEqual(f.hidden(), [])
  assert.equal(f.node('root').mindmapCollapseEls, undefined)
  assert.ok(toggles.every(toggle => toggle.removed))
  assert.equal(f.edge('edge').lineGroupEl.classList.contains('ce-mindmap-hidden'), false)
  f.emit('node-rendered', f.node('root'))
  for (const toggle of toggles) toggle.click()
  assert.deepEqual(f.writes, [])
  f.setEnabled(true)
  assert.deepEqual(f.hidden(), ['child', 'left'])
  const restored = [f.toggle('root'), f.toggle('root', 'left')]
  f.unload()
  for (const toggle of restored) toggle.click()
  assert.deepEqual(f.hidden(), [])
  assert.equal(f.node('root').mindmapCollapseEls, undefined)
  assert.ok(restored.every(toggle => toggle.removed))
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['right', 'left'])
  assert.deepEqual(f.writes, [])
})

test('enabling the feature after load initializes cached visibility once', () => {
  const f = fixture([nodeData('root', { mindmapCollapsed: true }), nodeData('child', { y: -300 })], undefined, { enabled: false })
  assert.deepEqual(f.hidden(), [])
  f.setEnabled(true)
  assert.deepEqual(f.hidden(), ['child'])
  assert.equal(f.toggle('root', 'up').dataset.direction, 'up')
})

test('copying a collapsed parent follows reverse arrows and includes its hidden cycle', () => {
  const f = fixture(
    [nodeData('root', { mindmapCollapsed: true }), nodeData('a'), nodeData('b')],
    [edgeData('root', 'a', 'root', { fromEnd: 'arrow', toEnd: 'none', toSide: 'top' }),
      edgeData('ab', 'a', 'b'), edgeData('ba', 'b', 'a')],
  )
  const selection = { nodes: [f.node('root').getData()], edges: [] }
  f.emit('copy', selection)
  assert.deepEqual(selection.nodes.map(n => n.id).sort(), ['a', 'b', 'root'])
  assert.equal(selection.edges.length, 3)
  assert.equal(selection.edges.find(e => e.id === 'root').fromEnd, 'arrow')
})

test('copying a partially collapsed parent includes only that hidden branch without duplicate edges', () => {
  const f = fixture(
    [nodeData('root', { mindmapCollapsed: ['right'] }), nodeData('right', { x: 300 }), nodeData('rightTail', { x: 600 }),
      nodeData('left', { x: -300, mindmapCollapsed: ['down'] }), nodeData('leftTail', { x: -300, y: 300 })],
    [edgeData('r', 'root', 'right'), edgeData('rt', 'right', 'rightTail'),
      edgeData('l', 'root', 'left'), edgeData('lt', 'left', 'leftTail')],
  )
  assert.deepEqual(f.hidden(), ['leftTail', 'right', 'rightTail'])
  for (const preselectedChild of [false, true]) {
    const selection = {
      nodes: [f.node('root').getData(), ...(preselectedChild ? [f.node('right').getData()] : [])],
      edges: preselectedChild ? [f.edge('r').getData()] : [],
    }
    f.emit('copy', selection)
    assert.deepEqual(selection.nodes.map(n => n.id).sort(), ['right', 'rightTail', 'root'])
    assert.deepEqual(selection.edges.map(e => e.id).sort(), ['r', 'rt'])
  }
})

test('queued rendering after edge creation cannot rewrite reloaded collapse flags or restore removed buttons', async () => {
  const f = fixture([nodeData('root', { mindmapCollapsed: ['right', 'left'] }), nodeData('child', { x: 300 })], [])
  f.addEdge(edgeData('edge', 'root', 'child'))
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['left'])
  f.node('root').getData().mindmapCollapsed = ['right', 'left']
  f.emit('data-loaded:after')
  let refreshes = 0
  const compute = f.extension.computeHidden.bind(f.extension)
  f.extension.computeHidden = canvas => { refreshes++; return compute(canvas) }
  await Promise.resolve()
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['right', 'left'])
  assert.deepEqual(f.hidden(), ['child'])
  assert.equal(refreshes, 0, 'data-loaded already refreshed this edge')

  f.addEdge(edgeData('second', 'root', 'child'))
  f.unload()
  await Promise.resolve()
  assert.equal(f.node('root').mindmapCollapseEls, undefined)
  assert.deepEqual(f.hidden(), [])
})

test('full reload and undo imports preserve collapse state while incremental child imports expand only their direction', async () => {
  const f = fixture([], [])
  const saved = {
    nodes: [nodeData('root', { mindmapCollapsed: ['right', 'down'] }), nodeData('right', { x: 300 }),
      nodeData('down', { y: 300 }), nodeData('newDown', { y: 500 })],
    edges: [edgeData('right', 'root', 'right'), edgeData('down', 'root', 'down')],
  }
  f.importData(copy(saved))
  await Promise.resolve()
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['right', 'down'])
  assert.deepEqual(f.hidden(), ['down', 'right'])
  assert.deepEqual(f.writes, [])
  assert.deepEqual(f.history, [])

  f.importData({ nodes: [], edges: [edgeData('new', 'root', 'newDown')] }, false)
  await Promise.resolve()
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['right'])
  assert.deepEqual(f.hidden(), ['right'])
  assert.equal(f.writes.length, 1)

  f.importData(copy(saved))
  await Promise.resolve()
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['right', 'down'])
  assert.deepEqual(f.hidden(), ['down', 'right'])
  assert.equal(f.writes.length, 1, 'restoring the undo snapshot must not write new history')
  const legacy = copy(saved)
  legacy.nodes[0].mindmapCollapsed = true
  f.importData(legacy)
  await Promise.resolve()
  assert.equal(f.node('root').getData().mindmapCollapsed, true)
  assert.deepEqual(f.hidden(), ['down', 'right'])
  assert.equal(f.writes.length, 1)
})

test('asynchronous portal replacements preserve folding without re-emitting data-loaded events', async () => {
  const f = fixture([], [])
  const saved = {
    nodes: [nodeData('root', { mindmapCollapsed: ['right'] }), nodeData('child', { x: 300 })],
    edges: [edgeData('edge', 'root', 'child')],
  }
  let replace, before = 0, after = 0
  f.workspace.on('canvas-enhance:data-loaded:before', (_canvas, _data, setData) => { replace = setData; before++ })
  f.workspace.on('canvas-enhance:data-loaded:after', () => { after++ })
  f.importData(copy(saved))
  await Promise.resolve()
  const expanded = copy(saved)
  expanded.nodes.push(nodeData('portal-parent', { x: 600, mindmapCollapsed: ['down'] }), nodeData('portal-child', { x: 600, y: 300 }))
  expanded.edges.push(edgeData('portal-edge', 'portal-parent', 'portal-child'))
  replace(copy(expanded))
  await Promise.resolve()
  assert.deepEqual(f.hidden(), ['child', 'portal-child'])
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['right'])
  assert.deepEqual([before, after], [1, 1], 'silent replacements must not restart the portal loader')
  assert.deepEqual(f.writes, [])
  assert.deepEqual(f.history, [])
  assert.equal(f.canvas.importingNodeIds, undefined)

  // During viewport updates the host skips edge-created, but edge.render always
  // emits edge-changed, even for a silently restored canvas.
  f.canvas.viewportChanged = true
  const restored = copy(expanded)
  delete restored.nodes[0].mindmapCollapsed
  replace(restored)
  f.emit('edge-changed', f.edge('portal-edge'))
  await Promise.resolve()
  assert.deepEqual(f.hidden(), ['portal-child'])
  assert.deepEqual([before, after], [1, 1])
  assert.deepEqual(f.writes, [])
})

test('nested imports and failures restore the surrounding import context', () => {
  const f = fixture([], [])
  let outerContext
  f.workspace.on('canvas-enhance:data-loaded:before', (_canvas, data) => {
    if (data.nodes[0]?.id !== 'outer') return
    outerContext = f.canvas.importingNodeIds
    assert.deepEqual([...outerContext], ['outer'])
    f.importData({ nodes: [nodeData('inner')], edges: [] }, false, true)
    assert.equal(f.canvas.importingNodeIds, outerContext)
    assert.throws(() => f.importData({ nodes: [], get edges() {
      assert.equal(f.canvas.importingNodeIds.size, 0)
      throw new Error('host import failed')
    } }, false, true), /host import failed/)
    assert.equal(f.canvas.importingNodeIds, outerContext)
  })
  f.importData({ nodes: [nodeData('outer')], edges: [] })
  assert.equal(f.canvas.importingNodeIds, undefined)

  for (const phase of ['before', 'after']) {
    f.workspace.on('canvas-enhance:data-loaded:' + phase, (_canvas, data) => {
      if (data.nodes[0]?.id === phase) throw new Error('listener failed')
    })
    assert.throws(() => f.importData({ nodes: [nodeData(phase)], edges: [] }), /listener failed/)
    assert.equal(f.canvas.importingNodeIds, undefined)
  }
})

test('a failed silent restore cannot prevent a later new child from expanding its direction', async () => {
  const f = fixture([nodeData('root', { mindmapCollapsed: ['right', 'down'] }), nodeData('child', { x: 300 })], [])
  assert.throws(() => f.importData({ nodes: [copy(f.node('root').getData())], get edges() {
    throw new Error('host import failed')
  } }, false, true), /host import failed/)
  assert.equal(f.canvas.importingNodeIds, undefined)
  f.addEdge(edgeData('edge', 'root', 'child'))
  await Promise.resolve()
  assert.deepEqual(f.node('root').getData().mindmapCollapsed, ['down'])
  assert.deepEqual(f.hidden(), [])
  assert.equal(f.writes.length, 1)
})
