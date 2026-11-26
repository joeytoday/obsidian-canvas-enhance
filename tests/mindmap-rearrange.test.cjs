const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const bundleExtension = filename => buildSync({
  entryPoints: [path.join(__dirname, '../src/canvas-extensions', filename)],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  external: ['obsidian', 'monkey-around', 'src/utils/node-content-measurement'],
}).outputFiles[0].text
const code = bundleExtension('mindmap-canvas-extension.ts')
const collapseCode = bundleExtension('mindmap-collapse-canvas-extension.ts')
const groupsCode = bundleExtension('collapsible-groups-canvas-extension.ts')
const copy = value => JSON.parse(JSON.stringify(value))
const textNode = (id, x, y, extra = {}) => ({ id, type: 'text', text: id, x, y, width: 100, height: 80, ...extra })
const groupNode = (id, x, y, width, height, extra = {}) => ({ id, type: 'group', x, y, width, height, label: id, ...extra })
const edge = (id, fromNode, toNode, extra = {}) => ({ id, fromNode, toNode, fromSide: 'right', toSide: 'left', ...extra })
const sample = () => ({
  custom: { preserved: true },
  nodes: [textNode('root', 0, 0), textNode('a', 200, 200), textNode('b', 200, 500), textNode('shared', 600, 1000)],
  edges: [edge('ra', 'root', 'a'), edge('rb', 'root', 'b'), edge('as', 'a', 'shared'), edge('bs', 'b', 'shared')],
})
const groupedSample = collapsed => ({
  custom: { preserved: true },
  // Inner-first loading creates genuinely nested collapsedData with the real hooks.
  nodes: [
    textNode('root', -300, -150),
    groupNode('inner', 250, 150, 300, 250, { collapsed, color: '3' }),
    textNode('a', 280, 180, { mindmapCollapsed: true, custom: { preserved: true } }),
    groupNode('outer', 200, 100, 700, 600, { collapsed, color: '6' }),
    textNode('b', 700, 550), textNode('tail', 1200, 900),
  ],
  edges: [edge('ra', 'root', 'a'), edge('ab', 'a', 'b'), edge('bt', 'b', 'tail')],
})
const byId = data => [...data].sort((a, b) => a.id.localeCompare(b.id))
const assertGroupOffsets = (before, after, ids) => {
  const oldNodes = new Map(before.nodes.map(n => [n.id, n]))
  const newNodes = new Map(after.nodes.map(n => [n.id, n]))
  const oldAnchor = oldNodes.get(ids[0]), newAnchor = newNodes.get(ids[0])
  for (const id of ids) {
    const old = oldNodes.get(id), placed = newNodes.get(id)
    assert.ok(placed, `missing group member ${id}`)
    assert.ok(Math.abs((placed.x - newAnchor.x) - (old.x - oldAnchor.x)) < 1e-6, `${id} x offset`)
    assert.ok(Math.abs((placed.y - newAnchor.y) - (old.y - oldAnchor.y)) < 1e-6, `${id} y offset`)
    assert.equal(placed.width, old.width)
    assert.equal(placed.height, old.height)
  }
}

// Only the host boundary is faked: layout, snapshot, measurement selection and
// commit/cancellation decisions below execute the production extension code.
function fixture(data = sample(), hooks = {}) {
  const notices = []
  const calls = {
    imports: [], history: [], saves: [], measurements: [], nodeWrites: [], viewports: [],
    overrides: 0, historyUI: 0, sleeps: 0, frames: 0, canceledFrames: [],
  }
  const settings = {
    mindmapFeatureEnabled: false,
    mindmapChildNodeSpacing: 80,
    mindmapSiblingNodeSpacing: 30,
    autoResizeNodeVerticalPadding: 20,
    autoResizeNodeMaxHeight: -1,
  }
  const loaded = { exports: {} }
  const mockRequire = name => {
    if (name === 'obsidian') return { Notice: class { constructor(message) { notices.push(message) } }, TFile: class {} }
    if (name === 'monkey-around') return { around() { throw new Error('unexpected patch installation') } }
    if (name === 'src/utils/node-content-measurement') return {
      measureNodeContentHeight(node) {
        calls.measurements.push(node.getData().id)
        return hooks.measure ? hooks.measure(node) : null
      },
    }
    throw new Error(`unexpected dependency: ${name}`)
  }
  const hostWindow = {
    setTimeout(callback, ms) {
      if (hooks.frameTimeoutAt === calls.frames + 1) {
        queueMicrotask(callback)
        return { simulatedTimeout: true }
      }
      return setTimeout(callback, ms)
    },
    clearTimeout(timer) { if (!timer.simulatedTimeout) clearTimeout(timer) },
  }
  const viewWindow = {
    requestAnimationFrame(callback) {
      const frame = ++calls.frames
      if (hooks.frameTimeoutAt !== frame) queueMicrotask(() => {
        if (hooks.frame) hooks.frame(frame)
        callback()
      })
      return frame
    },
    cancelAnimationFrame(frame) { calls.canceledFrames.push(frame) },
  }
  new Function('module', 'exports', 'require', 'sleep', 'window', code)(
    loaded, loaded.exports, mockRequire, async () => { calls.sleeps++; if (hooks.sleep) await hooks.sleep(calls.sleeps) }, hostWindow,
  )
  const plugin = { settings: { getSetting: key => settings[key] } }
  const extension = new loaded.exports.default(plugin)
  const loadedCollapse = { exports: {} }
  new Function('module', 'exports', 'require', collapseCode)(loadedCollapse, loadedCollapse.exports, mockRequire)
  const collapse = new loadedCollapse.exports.default(plugin)
  const loadedGroups = { exports: {} }
  new Function('module', 'exports', 'require', groupsCode)(loadedGroups, loadedGroups.exports, mockRequire)
  const groups = new loadedGroups.exports.default(plugin)
  let state = copy(data)
  if (hooks.groups) groups.collapseNodes(state)
  const canvas = {
    nodes: new Map(), edges: new Map(), readonly: false, isDragging: false,
    tx: 5, ty: 10, tZoom: 1,
    wrapperEl: { isConnected: true, ownerDocument: { defaultView: viewWindow } },
    config: { minContainerDimension: 40 },
    view: { file: { path: 'fixture.canvas' } },
    history: { data: [copy(data)], current: 0 },
    getData() {
      const data = copy(state)
      if (hooks.groups) groups.expandNodes(data)
      return data
    },
    getEdgesForNode: node => [...canvas.edges.values()].filter(e => e.from.node === node || e.to.node === node),
    importData(next, clear) {
      calls.imports.push({ data: copy(next), clear })
      state = copy(next)
      if (hooks.groups) groups.collapseNodes(state)
      if (hooks.import) hooks.import(state, calls.imports.length)
      rebuildNodes()
    },
    overrideHistory() {
      calls.overrides++
      this.history.data[this.history.current] = this.getData()
    },
    pushHistory(next) {
      calls.history.push(copy(next))
      this.history.data.push(copy(next))
      this.history.current++
    },
    requestSave(flag) { calls.saves.push(flag) },
    updateHistoryUI() { calls.historyUI++ },
    zoomToRealBbox(bbox) {
      this.tx = bbox.minX + 100
      this.ty = bbox.minY + 100
      this.tZoom = 0.5
    },
    setViewport(x, y, zoom) {
      this.tx = x; this.ty = y; this.tZoom = zoom
      calls.viewports.push({ x, y, zoom })
    },
  }
  canvas.view.canvas = canvas
  const rebuildNodes = () => {
    canvas.nodes = new Map(state.nodes.map(data => {
      const node = {
        initialized: true, isContentMounted: true, isEditing: false,
        get x() { return data.x },
        get y() { return data.y },
        get width() { return data.width },
        get height() { return data.height },
        getData: () => copy(data),
        setData(next) { calls.nodeWrites.push(copy(next)); Object.assign(data, next) },
        nodeEl: { isConnected: true, classList: { contains: () => false }, getClientRects: () => [{}] },
      }
      return [data.id, node]
    }))
    canvas.edges = new Map(state.edges.map(data => [data.id, {
      getData: () => copy(data),
      from: { node: canvas.nodes.get(data.fromNode), side: data.fromSide },
      to: { node: canvas.nodes.get(data.toNode), side: data.toSide },
    }]))
  }
  rebuildNodes()
  canvas.history.data = [canvas.getData()]
  const attrs = new Map()
  const button = { setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key) }
  return {
    extension, collapse, groups, canvas, calls, notices, settings, attrs, button,
    run: () => extension.rearrangeMindmap(canvas, button),
    editNode: (id, changes) => Object.assign(state.nodes.find(n => n.id === id), changes),
    editEdge: (id, changes) => Object.assign(state.edges.find(e => e.id === id), changes),
    clearCanvas: () => { state = { ...state, nodes: [], edges: [] }; rebuildNodes() },
    fullyExpanded() {
      const data = canvas.getData()
      for (let pass = 0; pass < 20 && data.nodes.some(n => n.collapsedData); pass++) groups.expandNodes(data)
      assert.ok(!data.nodes.some(n => n.collapsedData), 'fixture expansion must terminate')
      return data
    },
  }
}
const assertNoWrites = f => {
  assert.equal(f.calls.imports.length, 0)
  assert.equal(f.calls.history.length, 0)
  assert.equal(f.calls.saves.length, 0)
  assert.equal(f.calls.nodeWrites.length, 0)
  assert.equal(f.calls.overrides, 0)
  assert.equal(f.attrs.has('aria-busy'), false)
}

test('all supported portal representations stop before any write or measurement', async () => {
  for (const extra of [
    { type: 'file', file: 'other.canvas', portal: true },
    { type: 'file', file: 'other.canvas', interdimensionalEdges: [edge('remote', 'x', 'y')] },
    { id: 'acportal||remote||node' },
  ]) {
    const data = sample()
    data.nodes.push(textNode('unsupported', 0, 0, extra))
    const f = fixture(data)
    await f.run()
    assertNoWrites(f)
    assert.equal(f.calls.measurements.length, 0)
    assert.equal(f.calls.viewports.length, 0)
    assert.deepEqual(f.canvas.getData(), data)
    assert.equal(f.notices.length, 1)
  }
})

test('portals introduced before the snapshot cannot bypass the preflight check', async () => {
  for (const extra of [{ type: 'file', file: 'other.canvas', portal: true }]) {
    const f = fixture(sample(), { frame: count => { if (count === 1) f.editNode('a', extra) } })
    await f.run()
    assertNoWrites(f)
    assert.equal(f.calls.measurements.length, 0)
    assert.equal(f.canvas.getData().nodes.find(n => n.id === 'a').type, extra.type)
  }
})

test('ordinary group members retain their dimensions and only outside cards are measured', async () => {
  const before = groupedSample(false)
  const f = fixture(before, { groups: true, measure: () => 500 })
  await f.run()
  assert.equal(f.calls.imports.length, 1)
  assert.deepEqual(f.calls.measurements.sort(), ['root', 'tail'])
  const after = f.fullyExpanded()
  assertGroupOffsets(before, after, ['outer', 'inner', 'a', 'b'])
  assert.deepEqual(after.nodes.map(n => n.id), before.nodes.map(n => n.id))
  assert.equal(after.nodes.find(n => n.id === 'root').height, 520)
  assert.equal(after.nodes.find(n => n.id === 'tail').height, 520)
  assert.deepEqual(byId(after.edges), byId(before.edges))
  assert.equal(f.calls.history.length, 1)
  assert.equal(f.calls.nodeWrites.length, 0)
})

test('growing an outside card cannot create new group membership during content measurement', async () => {
  const before = {
    nodes: [groupNode('g', 100, 200, 400, 300), textNode('inside', 150, 250), textNode('outside', 150, 0)],
    edges: [edge('oi', 'outside', 'inside')],
  }
  const f = fixture(before, { groups: true, measure: () => 400 })
  await f.run()
  assert.equal(f.calls.imports.length, 1)
  assert.deepEqual(f.calls.measurements, ['outside'])
  const after = f.fullyExpanded()
  assertGroupOffsets(before, after, ['g', 'inside'])
  const g = after.nodes.find(n => n.id === 'g'), outside = after.nodes.find(n => n.id === 'outside')
  assert.equal(outside.height, 420)
  assert.ok(outside.x + outside.width <= g.x || outside.x >= g.x + g.width ||
    outside.y + outside.height <= g.y || outside.y >= g.y + g.height)
  const currentImports = f.calls.imports.length
  await f.run()
  assert.equal(f.calls.imports.length, currentImports)
})

test('real nested collapse/expand hooks preserve all cards, edges, flags and one final history record', async () => {
  const before = groupedSample(true)
  const f = fixture(before, { groups: true })
  assert.deepEqual([...f.canvas.nodes.keys()].sort(), ['outer', 'root', 'tail'])
  assert.ok(f.canvas.getData().nodes.some(n => n.id === 'inner' && n.collapsedData?.nodes.some(child => child.id === 'a')))
  await f.run()
  const after = f.fullyExpanded()
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.calls.history.length, 1)
  assert.equal(f.calls.overrides, 1)
  assert.equal(f.canvas.history.current, 1)
  assert.deepEqual(after.nodes.map(n => n.id).sort(), before.nodes.map(n => n.id).sort())
  assert.deepEqual(byId(after.edges), byId(before.edges))
  assertGroupOffsets(before, after, ['outer', 'inner', 'a', 'b'])
  assert.deepEqual(after.custom, before.custom)
  for (const id of ['inner', 'outer']) assert.equal(after.nodes.find(n => n.id === id).collapsed, true)
  assert.equal(after.nodes.find(n => n.id === 'a').mindmapCollapsed, true)
  assert.deepEqual(after.nodes.find(n => n.id === 'a').custom, { preserved: true })
  assert.deepEqual(f.calls.measurements.sort(), ['root', 'tail'])
  assert.deepEqual(f.calls.history[0].nodes.map(n => n.id).sort(), before.nodes.map(n => n.id).sort())
  assert.ok(f.calls.history[0].nodes.every(n => !n.collapsedData))
  assert.deepEqual(byId(f.calls.history[0].edges), byId(before.edges))
  await f.run()
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.calls.history.length, 1)
  assert.deepEqual(f.fullyExpanded(), after)
  // Replay the recorded before/after data through the real import hooks, as
  // native undo/redo do; do not fake a second layout to reconstruct either state.
  f.canvas.importData(f.canvas.history.data[0], true)
  assert.deepEqual(byId(f.fullyExpanded().nodes), byId(before.nodes))
  assert.deepEqual(byId(f.fullyExpanded().edges), byId(before.edges))
  f.canvas.importData(f.canvas.history.data[1], true)
  assert.deepEqual(f.fullyExpanded(), after)
  assert.equal(f.calls.history.length, 1)
})

test('a failed grouped import rolls back through real collapse hooks without losing hidden contents', () => {
  for (const change of [
    outer => { outer.width++ },
    outer => { outer.collapsed = false },
    outer => { outer.mindmapCollapsed = true },
  ]) {
    const before = groupedSample(true)
    const after = copy(before)
    after.nodes = after.nodes.map(n => ({ ...n, x: n.x + 100, y: n.y + 200 }))
    const f = fixture(before, { groups: true, import: (data, count) => {
      if (count === 1) change(data.nodes.find(n => n.id === 'outer'))
    } })
    const expectedHistory = copy(f.canvas.history.data)
    assert.throws(() => f.extension.applyMindmapLayout(f.canvas, before, after))
    const restored = f.fullyExpanded()
    assert.deepEqual(byId(restored.nodes), byId(before.nodes))
    assert.deepEqual(byId(restored.edges), byId(before.edges))
    assert.deepEqual(f.canvas.history.data, expectedHistory)
    assert.equal(f.canvas.history.current, 0)
    assert.equal(f.calls.history.length, 0)
    assert.equal(f.calls.imports.length, 2)
    assert.deepEqual(f.calls.saves, [false])
  }
})

test('portals inside nested collapsed groups remain protected before layout or measurement', async () => {
  for (const extra of [
    { type: 'file', file: 'other.canvas', portal: true },
    { type: 'file', file: 'other.canvas', interdimensionalEdges: [edge('remote', 'x', 'y')] },
    { id: 'acportal||nested||projection' },
  ]) {
    const data = groupedSample(true)
    Object.assign(data.nodes.find(n => n.id === 'a'), extra)
    const f = fixture(data, { groups: true })
    const before = f.fullyExpanded()
    await f.run()
    assertNoWrites(f)
    assert.equal(f.calls.measurements.length, 0)
    assert.equal(f.calls.frames, 0)
    assert.deepEqual(f.fullyExpanded(), before)
    assert.equal(f.notices.length, 1)
  }
})

test('deleting every card before the initial snapshot leaves a finite unchanged viewport', async () => {
  const f = fixture(sample(), { frame: count => { if (count === 1) f.clearCanvas() } })
  await f.run()
  assertNoWrites(f)
  assert.equal(f.calls.measurements.length, 0)
  assert.equal(f.canvas.getData().nodes.length, 0)
  assert.equal(f.canvas.getData().edges.length, 0)
  assert.ok(f.calls.viewports.every(viewport => Object.values(viewport).every(Number.isFinite)))
  assert.deepEqual({ x: f.canvas.tx, y: f.canvas.ty, zoom: f.canvas.tZoom }, { x: 5, y: 10, zoom: 1 })
})

test('one rearrange imports a complete result and records one final history state; repeating it does nothing', async () => {
  const before = sample()
  const f = fixture(before)
  await f.run()
  const after = f.canvas.getData()
  assert.notDeepEqual(after.nodes, before.nodes)
  assert.deepEqual(after.edges, before.edges)
  assert.deepEqual(after.custom, before.custom)
  assert.deepEqual(after.nodes.map(n => n.id), before.nodes.map(n => n.id))
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.calls.imports[0].clear, true)
  assert.equal(f.calls.overrides, 1)
  assert.deepEqual(f.calls.history, [after])
  assert.deepEqual(f.canvas.history.data, [before, after])
  assert.equal(f.canvas.history.current, 1)
  assert.deepEqual(f.calls.saves, [false])
  assert.equal(f.calls.nodeWrites.length, 0)
  assert.equal(f.attrs.has('aria-busy'), false)
  const viewport = { x: f.canvas.tx, y: f.canvas.ty, zoom: f.canvas.tZoom }
  await f.run()
  assert.deepEqual(f.canvas.getData(), after)
  assert.deepEqual({ x: f.canvas.tx, y: f.canvas.ty, zoom: f.canvas.tZoom }, viewport)
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.calls.overrides, 1)
  assert.equal(f.calls.history.length, 1)
})

test('content measurement produces candidate heights without resizing live cards', async () => {
  const ids = ['normal', 'zero', 'invalid', 'hidden', 'disconnected', 'ratio', 'rigid', 'markdown', 'image']
  const data = { nodes: ids.map((id, i) => textNode(id, 0, i * 100)), edges: [] }
  Object.assign(data.nodes.find(n => n.id === 'ratio'), { ratio: 1.5 })
  Object.assign(data.nodes.find(n => n.id === 'markdown'), { type: 'file', file: 'note.md' })
  Object.assign(data.nodes.find(n => n.id === 'image'), { type: 'file', file: 'photo.png' })
  const f = fixture(data, { measure: node => ({ zero: 0, invalid: NaN, normal: 10, markdown: 900 })[node.getData().id] ?? 1 })
  f.settings.autoResizeNodeMaxHeight = 300
  f.canvas.nodes.get('hidden').nodeEl.getClientRects = () => []
  f.canvas.nodes.get('hidden').nodeEl.classList.contains = name => name === 'ce-mindmap-hidden'
  f.canvas.nodes.get('disconnected').nodeEl.isConnected = false
  const heights = await f.extension.measureLayoutHeights(f.canvas, data, new Set(['rigid']), () => true)
  assert.deepEqual([...heights], [['normal', 40], ['markdown', 300]])
  assert.deepEqual(f.calls.measurements, ['normal', 'zero', 'invalid', 'markdown'])
  assert.deepEqual(f.canvas.getData(), data)
  assertNoWrites(f)
})

test('a measured height is applied only in the final full import', async () => {
  const f = fixture(sample(), { measure: node => {
    assert.equal(f.calls.imports.length, 0)
    assert.equal(f.calls.nodeWrites.length, 0)
    assert.equal(node.getData().height, 80)
    return node.getData().id === 'shared' ? 200 : null
  } })
  await f.run()
  assert.equal(f.canvas.getData().nodes.find(n => n.id === 'shared').height, 220)
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.calls.nodeWrites.length, 0)
})

test('pending auto-height work completes before the initial snapshot and its history entry', async () => {
  const f = fixture(sample(), { frame: count => { if (count === 1) f.editNode('a', { height: 210 }) } })
  await f.run()
  assert.equal(f.calls.frames, 2)
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.canvas.getData().nodes.find(n => n.id === 'a').height, 210)
  assert.equal(f.canvas.history.data[0].nodes.find(n => n.id === 'a').height, 210)
})

test('auto-height work queued during measurement makes the frozen plan stale', async () => {
  const f = fixture(sample(), { frame: count => { if (count === 2) f.editNode('a', { height: 210 }) } })
  await f.run()
  assertNoWrites(f)
  assert.equal(f.calls.frames, 2)
  assert.equal(f.canvas.getData().nodes.find(n => n.id === 'a').height, 210)
  assert.equal(f.notices.length, 1)
})

test('either animation-frame timeout cancels without committing or resizing cards', async () => {
  for (const frameTimeoutAt of [1, 2]) {
    const f = fixture(sample(), { frameTimeoutAt })
    const before = f.canvas.getData()
    await f.run()
    assertNoWrites(f)
    assert.equal(f.calls.measurements.length, 0)
    assert.deepEqual(f.calls.canceledFrames, [frameTimeoutAt])
    assert.deepEqual(f.canvas.getData(), before)
    assert.deepEqual({ x: f.canvas.tx, y: f.canvas.ty, zoom: f.canvas.tZoom }, { x: 5, y: 10, zoom: 1 })
  }
})

test('editing data during measurement cancels the plan and restores the original viewport', async () => {
  const f = fixture(sample(), { sleep: count => { if (count === 2) f.editNode('a', { text: 'new user edit', x: 333 }) } })
  await f.run()
  assertNoWrites(f)
  assert.equal(f.canvas.getData().nodes.find(n => n.id === 'a').text, 'new user edit')
  assert.equal(f.canvas.getData().nodes.find(n => n.id === 'a').x, 333)
  assert.deepEqual({ x: f.canvas.tx, y: f.canvas.ty, zoom: f.canvas.tZoom }, { x: 5, y: 10, zoom: 1 })
  assert.equal(f.notices.length, 1)
})

test('changed file, detached view, unloading, readonly, dragging and editing cancel pending work', async () => {
  const changes = [
    f => { f.canvas.view.file = { path: 'different.canvas' } },
    f => { f.canvas.view.canvas = {} },
    f => { f.canvas.wrapperEl.isConnected = false },
    f => { f.extension.unloaded = true },
    f => { f.canvas.readonly = true },
    f => { f.canvas.isDragging = true },
    f => { f.canvas.nodes.get('a').isEditing = true },
    f => { f.settings.mindmapChildNodeSpacing++ },
  ]
  for (const change of changes) {
    const f = fixture(sample(), { sleep: count => { if (count === 2) change(f) } })
    const before = f.canvas.getData()
    await f.run()
    assertNoWrites(f)
    assert.deepEqual(f.canvas.getData(), before)
  }
})

test('canceling after a manual pan preserves the user viewport', async () => {
  const f = fixture(sample(), { sleep: count => { if (count === 2) f.canvas.setViewport(999, -200, 0.8) } })
  await f.run()
  assertNoWrites(f)
  assert.deepEqual({ x: f.canvas.tx, y: f.canvas.ty, zoom: f.canvas.tZoom }, { x: 999, y: -200, zoom: 0.8 })
})

test('repeated clicks while measurement is pending cannot commit a second plan', async () => {
  let release
  const waiting = new Promise(resolve => { release = resolve })
  const f = fixture(sample(), { sleep: () => waiting })
  const first = f.run()
  assert.equal(f.attrs.get('aria-busy'), 'true')
  await f.run()
  assert.equal(f.calls.imports.length, 0)
  release()
  await first
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.calls.history.length, 1)
  assert.equal(f.attrs.has('aria-busy'), false)
})

test('post-import geometry or connection changes roll back data and history', () => {
  for (const change of [
    data => { data.nodes[0].height++ },
    data => { data.edges[0].toNode = 'shared' },
    data => { data.nodes.pop() },
    data => { data.edges.pop() },
  ]) {
    const before = sample()
    const after = copy(before)
    after.nodes[0].x += 100
    const f = fixture(before, { import: (data, count) => { if (count === 1) change(data) } })
    const previousHistory = [{ nodes: [], edges: [] }, before, { ...before, custom: { future: true } }]
    f.canvas.history.data = copy(previousHistory)
    f.canvas.history.current = 1
    assert.throws(() => f.extension.applyMindmapLayout(f.canvas, before, after), /geometry or connections/)
    assert.deepEqual(f.canvas.getData(), before)
    assert.deepEqual(f.canvas.history.data, previousHistory)
    assert.equal(f.canvas.history.current, 1)
    assert.equal(f.calls.historyUI, 1)
    assert.equal(f.calls.imports.length, 2)
    assert.equal(f.calls.history.length, 0)
    assert.deepEqual(f.calls.saves, [false])
  }
})

test('history captures floating-edge sides actually produced during import', () => {
  const before = sample()
  const after = copy(before)
  after.nodes[0].x += 100
  const f = fixture(before, { import: data => {
    data.edges[0].fromSide = 'bottom'
    data.edges[0].toSide = 'top'
  } })
  f.extension.applyMindmapLayout(f.canvas, before, after)
  assert.equal(f.calls.history.length, 1)
  assert.equal(f.calls.history[0].edges[0].fromSide, 'bottom')
  assert.equal(f.calls.history[0].edges[0].toSide, 'top')
  assert.deepEqual(f.calls.history[0], f.canvas.getData())
  assert.equal(f.calls.history[0].edges[0].fromNode, before.edges[0].fromNode)
  assert.equal(f.calls.history[0].edges[0].toNode, before.edges[0].toNode)
})

test('floating-edge hooks changing target sides do not change the next rearrange graph', async () => {
  const data = sample()
  data.edges = data.edges.map(e => ({ ...e, toFloating: true }))
  const f = fixture(data, { import: actual => {
    for (const e of actual.edges) e.toSide = e.toNode === 'shared' ? 'top' : 'bottom'
  } })
  await f.run()
  const after = f.canvas.getData()
  assert.equal(f.calls.imports.length, 1)
  assert.deepEqual(f.calls.history[0], after)
  assert.ok(after.edges.every(e => e.toSide !== 'left' && e.toFloating))
  await f.run()
  assert.deepEqual(f.canvas.getData(), after)
  assert.equal(f.calls.imports.length, 1)
  assert.equal(f.calls.history.length, 1)
})

test('floating target sides keep child lookup and collapsed shared descendants consistent', () => {
  const data = sample()
  data.nodes[0].mindmapCollapsed = true
  data.nodes.push(textNode('unrelated', 100, 150))
  data.edges = data.edges.map((e, i) => ({ ...e, toFloating: true, toSide: i % 2 ? 'bottom' : 'top' }))
  data.edges.push(edge('ignored', 'root', 'unrelated', { toSide: 'top', mindmapRelation: false }))
  const f = fixture(data)
  const children = ['right', 'left', 'down', 'up'].flatMap(direction =>
    f.extension.getChildNodes(f.canvas, f.canvas.nodes.get('root'), direction))
  assert.deepEqual(children.map(n => n.getData().id).sort(), ['a', 'b'])
  assert.deepEqual([...f.collapse.computeHidden(f.canvas)].sort(), ['a', 'b', 'shared'])
  f.editNode('root', { mindmapCollapsed: false })
  f.editNode('a', { mindmapCollapsed: true })
  assert.deepEqual([...f.collapse.computeHidden(f.canvas)], [])
  f.editNode('b', { mindmapCollapsed: true })
  assert.deepEqual([...f.collapse.computeHidden(f.canvas)], ['shared'])
  assertNoWrites(f)
})

test('four directions keep the hierarchy through rearrange, measured height and undo snapshots', async () => {
  const sides = { right: ['right', 'left'], left: ['left', 'right'], down: ['bottom', 'top'], up: ['top', 'bottom'] }
  for (const [direction, [fromSide, toSide]] of Object.entries(sides)) {
    const data = sample()
    for (const n of data.nodes) {
      const { x, y } = n
      if (direction === 'left') n.x = -x - n.width
      if (direction === 'down') { n.x = y; n.y = x }
      if (direction === 'up') { n.x = y; n.y = -x - n.height }
    }
    data.edges.forEach(e => Object.assign(e, { fromSide, toSide }))
    data.nodes[0].cardContent = { header: 'Heading', footer: 'Footer' }
    const f = fixture(data, { measure: () => 180 })
    await f.run()
    const after = f.canvas.getData()
    assert.equal(f.calls.history.length, 1)
    assert.deepEqual(f.canvas.history.data[0], data, 'undo snapshot is unchanged')
    assert.deepEqual(after.nodes[0].cardContent, data.nodes[0].cardContent)
    assert.ok(after.nodes.every(n => n.height === 200 && n.width === 100))
    assert.ok(after.edges.every(e => e.fromSide === fromSide && e.toSide === toSide))
    assert.deepEqual(after.edges, data.edges, 'rearrangement preserves every arrow and connection face')
    for (const e of after.edges) {
      const parent = after.nodes.find(n => n.id === e.fromNode), child = after.nodes.find(n => n.id === e.toNode)
      const gap = { right: child.x - parent.x - parent.width, left: parent.x - child.x - child.width,
        down: child.y - parent.y - parent.height, up: parent.y - child.y - child.height }[direction]
      assert.ok(gap >= 80, `${direction}: ${e.id} stays on its original side after measurement`)
    }
    await f.run()
    assert.deepEqual(f.canvas.getData(), after)
    assert.equal(f.calls.history.length, 1, 'rearranging again does not create another undo step')
    f.canvas.importData(copy(f.canvas.history.data[0]), true)
    assert.deepEqual(f.canvas.getData(), data)
    f.canvas.importData(copy(f.canvas.history.data[1]), true)
    assert.deepEqual(f.canvas.getData(), after)
  }
})

test('four directions preserve internal connections and markers in rigid groups and cycles', async () => {
  for (const direction of ['right', 'left', 'down', 'up']) for (const collapsed of [false, true]) {
    const data = groupedSample(collapsed)
    const positions = { right: [-300, 300, 1200, 300, 1700, 300], left: [1600, 300, -400, 300, -900, 300],
      down: [300, -400, 300, 1100, 300, 1600], up: [300, 1200, 300, -400, 300, -900] }
    const [rx, ry, tx, ty, cx, cy] = positions[direction]
    Object.assign(data.nodes.find(n => n.id === 'root'), { x: rx, y: ry })
    Object.assign(data.nodes.find(n => n.id === 'tail'), { x: tx, y: ty })
    const sides = { right: ['right', 'left'], left: ['left', 'right'], down: ['bottom', 'top'], up: ['top', 'bottom'] }[direction]
    for (const e of data.edges.filter(e => e.id !== 'ab')) Object.assign(e, { fromSide: sides[0], toSide: sides[1] })
    data.nodes.push(textNode('cycle-a', cx, cy), textNode('cycle-b', cx + 150, cy + 100))
    data.edges.push(
      edge('group-marked', 'b', 'a', { fromSide: 'top', toSide: 'bottom', mindmapRelation: true }),
      edge('tail-cycle', 'tail', 'cycle-a'),
      edge('cycle-a-b', 'cycle-a', 'cycle-b'),
      edge('cycle-b-a', 'cycle-b', 'cycle-a', { fromSide: 'top', toSide: 'bottom', mindmapRelation: true }),
    )
    const internalIds = new Set(['ab', 'group-marked', 'cycle-a-b', 'cycle-b-a'])
    const internalEdges = byId(data.edges.filter(e => internalIds.has(e.id)))
    const f = fixture(data, { groups: true })
    await f.run()
    const after = f.fullyExpanded()
    assert.equal(f.calls.history.length, 1)
    assertGroupOffsets(data, after, ['outer', 'inner', 'a', 'b'])
    assertGroupOffsets(data, after, ['cycle-a', 'cycle-b'])
    assert.deepEqual(byId(after.edges.filter(e => internalIds.has(e.id))), internalEdges,
      `${direction}, collapsed=${collapsed}: rigid translation must not change internal connection sides or markers`)
    await f.run()
    assert.deepEqual(f.fullyExpanded(), after)
    assert.equal(f.calls.history.length, 1)
  }
})

test('reversing an arrow during measurement cancels the old plan without losing the change', async () => {
  const f = fixture(sample(), { sleep: count => { if (count === 2) f.editEdge('ra', { fromEnd: 'arrow', toEnd: 'none' }) } })
  await f.run()
  assertNoWrites(f)
  assert.equal(f.canvas.getData().edges[0].fromEnd, 'arrow')
  assert.equal(f.canvas.getData().edges[0].toEnd, 'none')
  assert.deepEqual(f.canvas.getData().nodes, sample().nodes)
  assert.equal(f.notices.length, 1)
})

test('import changing arrows or association flags rolls back the whole rearrange', () => {
  for (const corrupt of [data => { data.edges[0].fromEnd = 'none' }, data => { delete data.edges[0].mindmapRelation }]) {
    const before = sample()
    Object.assign(before.edges[0], { fromEnd: 'arrow', toEnd: 'none', mindmapRelation: false })
    const after = copy(before)
    after.nodes[0].x += 100
    const f = fixture(before, { import: (data, count) => { if (count === 1) corrupt(data) } })
    assert.throws(() => f.extension.applyMindmapLayout(f.canvas, before, after))
    assert.deepEqual(f.canvas.getData(), before)
    assert.equal(f.calls.history.length, 0)
  }
})

test('mixed branches and reversed arrows keep their directions through measured rearrange and a second run', async () => {
  const data = {
    nodes: [textNode('root', 0, 0), textNode('right', 400, 0), textNode('left', -400, 0),
      textNode('down', 0, 400), textNode('up', 0, -400)],
    edges: [edge('right', 'root', 'right'),
      edge('left-reversed', 'left', 'root', { fromEnd: 'arrow', toEnd: 'none' }),
      edge('down', 'root', 'down', { fromSide: 'bottom', toSide: 'top' }),
      edge('up', 'root', 'up', { fromSide: 'top', toSide: 'bottom' })],
  }
  const f = fixture(data, { measure: () => 180 })
  await f.run()
  assert.equal(f.calls.history.length, 1)
  const after = f.canvas.getData(), nodes = new Map(after.nodes.map(n => [n.id, n])), root = nodes.get('root')
  assert.ok(nodes.get('right').x >= root.x + root.width + 80)
  assert.ok(nodes.get('left').x + nodes.get('left').width + 80 <= root.x)
  assert.ok(nodes.get('down').y >= root.y + root.height + 80)
  assert.ok(nodes.get('up').y + nodes.get('up').height + 80 <= root.y)
  assert.deepEqual(after.edges, data.edges)
  await f.run()
  assert.deepEqual(f.canvas.getData(), after)
  assert.equal(f.calls.history.length, 1)
})

test('directional folding survives measurement, history snapshots and rollback validation', async () => {
  const before = sample()
  before.nodes[0].mindmapCollapsed = ['left', 'down']
  const f = fixture(before, { measure: () => 180 })
  await f.run()
  assert.equal(f.calls.history.length, 1)
  assert.deepEqual(f.canvas.getData().nodes[0].mindmapCollapsed, ['left', 'down'])
  assert.deepEqual(f.canvas.history.data[0].nodes[0].mindmapCollapsed, ['left', 'down'])
  const after = copy(before)
  after.nodes[0].x += 100
  const corrupted = fixture(before, { import: (data, count) => {
    if (count === 1) data.nodes[0].mindmapCollapsed = ['up']
  } })
  assert.throws(() => corrupted.extension.applyMindmapLayout(corrupted.canvas, before, after), /geometry or connections/)
  assert.deepEqual(corrupted.canvas.getData(), before)
  assert.equal(corrupted.calls.history.length, 0)
})


test('rearrange aligns four-way branches while ordinary references keep their position and size', async () => {
  const card = (id, x, y, extra = {}) => textNode(id, x, y, { width: 300, height: 150, ...extra })
  const data = {
    nodes: [card('root', 0, 0), card('right', 650, 0), card('left', -710, 280),
      card('up', 0, -500), card('down', 0, 500), card('note', 650, -500),
      card('plain', 510, 500, { height: 134 }), card('double', -710, 740, { height: 134 })],
    edges: [edge('right', 'root', 'right'),
      edge('left', 'left', 'root', { fromEnd: 'arrow', toEnd: 'none' }),
      edge('up', 'root', 'up', { fromSide: 'top', toSide: 'bottom' }),
      edge('down', 'root', 'down', { fromSide: 'bottom', toSide: 'top' }),
      edge('turn', 'right', 'note', { fromSide: 'top', toSide: 'bottom' }),
      edge('plain', 'root', 'plain', { toEnd: 'none' }),
      edge('double', 'root', 'double', { fromEnd: 'arrow', toEnd: 'arrow' })],
  }
  const f = fixture(data, { measure: () => 40 })
  f.settings.mindmapChildNodeSpacing = 200
  await f.run()
  assert.equal(f.calls.history.length, 1)
  const after = f.canvas.getData(), nodes = new Map(after.nodes.map(n => [n.id, n])), root = nodes.get('root')
  for (const id of ['plain', 'double']) {
    assert.deepEqual(nodes.get(id), data.nodes.find(n => n.id === id), `${id} stays unchanged`)
    assert.ok(!f.calls.measurements.includes(id), `${id} is not measured`)
  }
  assert.equal(root.x, 0)
  assert.equal(root.y, 0)
  for (const id of ['left', 'right'])
    assert.ok(Math.abs(nodes.get(id).y + nodes.get(id).height / 2 - root.y - root.height / 2) < 1e-6, `${id} aligns with root`)
  for (const id of ['up', 'down'])
    assert.ok(Math.abs(nodes.get(id).x + nodes.get(id).width / 2 - root.x - root.width / 2) < 1e-6, `${id} aligns with root`)
  assert.deepEqual(after.edges, data.edges)
  assert.deepEqual(f.canvas.history.data[0], data)
  await f.run()
  assert.deepEqual(f.canvas.getData(), after)
  assert.equal(f.calls.history.length, 1)
})


test('a canvas containing only ordinary references is unchanged without measuring cards', async () => {
  for (const connection of [{ toEnd: 'none' }, { fromEnd: 'arrow', toEnd: 'arrow' }, { mindmapRelation: false }]) {
    const data = { nodes: [textNode('a', 0, 0), textNode('b', 200, 300)], edges: [edge('ab', 'a', 'b', connection)] }
    const f = fixture(data, { measure: () => 400 })
    await f.run()
    assert.deepEqual(f.canvas.getData(), data)
    assert.deepEqual(f.calls.measurements, [])
    assertNoWrites(f)
  }
})

test('measured rearrangement preserves fixed ordinary groups and moves hierarchical groups as a unit', async () => {
  for (const collapsed of [false, true]) {
    const data = {
      nodes: [textNode('root', 0, 0), textNode('child', 400, 0),
        groupNode('active-group', 900, -50, 300, 250, { collapsed }), textNode('active-card', 950, 0),
        groupNode('fixed-group', 400, 500, 350, 300, { collapsed }), textNode('fixed-card', 450, 550)],
      edges: [edge('rc', 'root', 'child'), edge('ca', 'child', 'active-card'),
        edge('reference', 'root', 'fixed-card', { toEnd: 'none' })],
    }
    const f = fixture(data, { groups: true, measure: () => 400 })
    await f.run()
    assert.equal(f.calls.history.length, 1)
    const after = f.canvas.getData()
    for (const id of ['fixed-group', 'fixed-card'])
      assert.deepEqual(after.nodes.find(n => n.id === id), data.nodes.find(n => n.id === id))
    assertGroupOffsets(data, after, ['active-group', 'active-card'])
    assert.deepEqual(f.calls.measurements.sort(), ['child', 'root'])
    await f.run()
    assert.deepEqual(f.canvas.getData(), after)
    assert.equal(f.calls.history.length, 1)
  }
})
