const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const bundle = buildSync({
  entryPoints: [path.join(__dirname, '../src/utils/canvas-layout-snapshot.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
})
const loaded = { exports: {} }
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(loaded, loaded.exports, require)
const { expandCanvasLayoutSnapshot, hasCanvasLayoutPortal } = loaded.exports
const node = (id, x, y, extra = {}) => ({ id, type: 'text', text: id, x, y, width: 100, height: 60, ...extra })
const group = (id, x, y, nodes, edges = [], extra = {}) => node(id, x, y, {
  type: 'group', collapsed: true, collapsedData: { nodes, edges }, ...extra,
})
const edge = (id, fromNode, toNode, extra = {}) => ({ id, fromNode, toNode, fromSide: 'right', toSide: 'left', ...extra })
const copy = value => JSON.parse(JSON.stringify(value))

test('recursively restores absolute coordinates and preserves metadata, markers and array order', () => {
  const deep = node('deep', 3, 4, { mindmapCollapsed: true, styleAttributes: { shape: 'pill' } })
  const cross = edge('cross', 'deep', 'outside', { label: 'crossing', toFloating: true })
  const data = {
    metadata: { version: '1.0-1.0', frontmatter: { title: 'Keep this' } },
    extra: { viewport: [1, 2] },
    nodes: [node('first', -100, -100), group('outer', 100, 200, [
      group('inner', 10, 20, [deep], [cross], { label: 'inner label', color: '2' }),
      node('sibling', 60, 70),
    ]), node('outside', 800, 900)],
    edges: [edge('outer-link', 'first', 'outer')],
  }
  const original = copy(data)
  const result = expandCanvasLayoutSnapshot(data)
  assert.deepEqual(data, original)
  assert.deepEqual(result.nodes.map(n => n.id), ['first', 'outer', 'inner', 'deep', 'sibling', 'outside'])
  assert.deepEqual(result.edges.map(e => e.id), ['outer-link', 'cross'])
  assert.deepEqual(result.nodes.find(n => n.id === 'deep'), { ...deep, x: 113, y: 224 })
  assert.equal(result.nodes.find(n => n.id === 'inner').collapsed, true)
  assert.equal(result.nodes.find(n => n.id === 'inner').label, 'inner label')
  assert.ok(result.nodes.every(n => !('collapsedData' in n)))
  assert.deepEqual(result.metadata, data.metadata)
  assert.deepEqual(result.extra, data.extra)
  assert.deepEqual(expandCanvasLayoutSnapshot(result), result)
  result.metadata.frontmatter.title = 'Detached'
  result.nodes.find(n => n.id === 'deep').styleAttributes.shape = 'circle'
  assert.deepEqual(data, original)
})

test('top-level live nodes and edges win over stale nested copies', () => {
  const liveChild = node('child', 600, 700, { text: 'current text' })
  const liveEdge = edge('shared', 'child', 'outside', { label: 'current label' })
  const data = {
    nodes: [group('outer', 100, 200, [node('child', 1, 2)], [edge('shared', 'child', 'outside')]), liveChild],
    edges: [liveEdge],
  }
  const result = expandCanvasLayoutSnapshot(data)
  assert.deepEqual(result.nodes.map(n => n.id), ['outer', 'child'])
  assert.deepEqual(result.nodes[1], liveChild)
  assert.deepEqual(result.edges, [liveEdge])
})

test('unique hidden descendants of a stale group follow the live group position', () => {
  const data = {
    nodes: [group('outer', 100, 200, [group('inner', 10, 20, [node('child', 3, 4)])]),
      node('inner', 500, 600, { type: 'group', collapsed: true, label: 'live group' })],
    edges: [],
  }
  const result = expandCanvasLayoutSnapshot(data)
  assert.deepEqual(result.nodes.find(n => n.id === 'child'), node('child', 503, 604))
  assert.equal(result.nodes.find(n => n.id === 'inner').label, 'live group')
})

test('identical repeated crossing edges merge without changing the first order', () => {
  const crossing = edge('cross', 'left-child', 'right-child', { styleAttributes: { path: 'straight' } })
  const reordered = { toSide: 'left', fromNode: 'left-child', id: 'cross', toNode: 'right-child', fromSide: 'right', styleAttributes: { path: 'straight' } }
  const data = {
    nodes: [group('left', 0, 0, [node('left-child', 10, 10)], [crossing]),
      group('right', 500, 0, [node('right-child', 10, 10)], [reordered, edge('second', 'right', 'left')])],
    edges: [edge('first', 'left', 'right')],
  }
  const result = expandCanvasLayoutSnapshot(data)
  assert.deepEqual(result.edges.map(e => e.id), ['first', 'cross', 'second'])
  assert.deepEqual(result.edges[1], crossing)
})

test('rejects conflicting equal-priority nodes, connections, and recursive ownership', () => {
  assert.throws(() => expandCanvasLayoutSnapshot({ nodes: [node('same', 1, 2), node('same', 3, 4)], edges: [] }), /Conflicting duplicate canvas node/)
  assert.throws(() => expandCanvasLayoutSnapshot({ nodes: [], edges: [edge('same', 'a', 'b'), edge('same', 'a', 'c')] }), /Conflicting duplicate canvas edge/)
  assert.throws(() => expandCanvasLayoutSnapshot({ nodes: [group('same', 1, 2, [node('same', 3, 4)])], edges: [] }), /Recursive collapsed group/)
  assert.throws(() => expandCanvasLayoutSnapshot({ nodes: [group('outer', 1, 2, [], [], { collapsedData: { nodes: [], edges: null } })], edges: [] }), /Invalid collapsed group/)
})

test('detects portals at any nesting depth, including copies shadowed by live nodes', () => {
  const file = node('portal', 10, 20, { type: 'file', file: 'other.canvas', portal: true })
  const data = { nodes: [group('outer', 1, 2, [group('inner', 3, 4, [file])]), node('portal', 100, 200)], edges: [] }
  assert.equal(hasCanvasLayoutPortal(data), true)
  assert.equal(hasCanvasLayoutPortal(expandCanvasLayoutSnapshot(data)), false)
  for (const portal of [file, node('acportal||remote||node', 0, 0), node('file', 0, 0, {
    type: 'file', file: 'remote.canvas', interdimensionalEdges: [edge('cross', 'file', 'outside')],
  })]) assert.equal(hasCanvasLayoutPortal({ nodes: [group('outer', 0, 0, [portal])], edges: [] }), true)
  assert.equal(hasCanvasLayoutPortal({ nodes: [group('group', 0, 0, [node('ordinary', 1, 2)])], edges: [] }), false)
})
