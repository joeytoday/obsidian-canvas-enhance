const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

// Exercise the production TypeScript module without requiring an Obsidian runtime.
const bundle = buildSync({
  entryPoints: [path.join(__dirname, '../src/utils/mindmap-layout.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
})
const loaded = { exports: {} }
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(loaded, loaded.exports, require)
const { layoutMindmap } = loaded.exports

const OPTIONS = Object.freeze({ childSpacing: 80, siblingSpacing: 30 })
const EPSILON = 1e-6
const node = (id, x, y, width = 100, height = 60) => ({ id, x, y, width, height })
const group = (id, x, y, width, height, extra = {}) => ({ ...node(id, x, y, width, height), type: 'group', ...extra })
const edge = (fromNode, toNode, extra = {}) => ({ fromNode, toNode, toSide: 'left', ...extra })
const seededRandom = seed => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 0x100000000
}
const near = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: expected ${expected}, got ${actual}`)
}
const move = (nodes, result) => nodes.map(n => ({ ...n, ...result.positions.get(n.id) }))
const bounds = nodes => ({
  left: Math.min(...nodes.map(n => n.x)),
  top: Math.min(...nodes.map(n => n.y)),
  right: Math.max(...nodes.map(n => n.x + n.width)),
  bottom: Math.max(...nodes.map(n => n.y + n.height)),
})
const assertPositionsEqual = (actual, expected, label = 'positions') => {
  assert.equal(actual.size, expected.size, `${label}: node count`)
  for (const [id, position] of expected) {
    assert.ok(actual.has(id), `${label}: missing ${id}`)
    near(actual.get(id).x, position.x, `${label}: ${id}.x`)
    near(actual.get(id).y, position.y, `${label}: ${id}.y`)
  }
}
const assertComplete = (nodes, result) => {
  assert.ok(result.positions instanceof Map)
  assert.ok(result.rigidNodeIds instanceof Set)
  assert.equal(result.positions.size, nodes.length)
  for (const n of nodes) {
    const position = result.positions.get(n.id)
    assert.ok(position, `missing ${n.id}`)
    assert.ok(Number.isFinite(position.x), `${n.id}.x must be finite`)
    assert.ok(Number.isFinite(position.y), `${n.id}.y must be finite`)
  }
}
const assertNoOverlap = nodes => {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
      assert.ok(overlapX <= EPSILON || overlapY <= EPSILON, `overlap: ${a.id} and ${b.id}`)
    }
  }
}
const assertStable = (nodes, edges, options = OPTIONS) => {
  const first = layoutMindmap(nodes, edges, options)
  const second = layoutMindmap(move(nodes, first), edges, options)
  assertPositionsEqual(second.positions, first.positions, 'second rearrange')
  const third = layoutMindmap(move(nodes, second), edges, options)
  assertPositionsEqual(third.positions, first.positions, 'third rearrange')
  return first
}
const assertRigidOffsets = (nodes, result, ids) => {
  const anchor = nodes.find(n => n.id === ids[0])
  for (const id of ids) {
    const original = nodes.find(n => n.id === id)
    near(result.positions.get(id).x - result.positions.get(anchor.id).x, original.x - anchor.x, `${id} rigid x`)
    near(result.positions.get(id).y - result.positions.get(anchor.id).y, original.y - anchor.y, `${id} rigid y`)
    assert.ok(result.rigidNodeIds.has(id), `${id} must retain its dimensions`)
  }
}
const groupMembership = nodes => nodes.filter(n => n.type === 'group').map(g => [g.id, nodes.filter(n =>
  n.id !== g.id && n.x > g.x + EPSILON && n.y > g.y + EPSILON &&
  n.x + n.width < g.x + g.width - EPSILON && n.y + n.height < g.y + g.height - EPSILON,
).map(n => n.id).sort()]).sort(([a], [b]) => a.localeCompare(b))
const rigidRect = (nodes, id, ids) => {
  const rect = bounds(nodes.filter(n => ids.includes(n.id)))
  return node(id, rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top)
}

test('three parents share one centered card without accumulating extra space', () => {
  const nodes = [
    node('root', -100, 0),
    node('top', 100, 0),
    node('middle', 100, 100),
    node('bottom', 100, 200),
    node('shared', 300, 450),
  ]
  const edges = [
    edge('root', 'top'), edge('root', 'middle'), edge('root', 'bottom'),
    edge('top', 'shared'), edge('middle', 'shared'), edge('bottom', 'shared'),
  ]
  const result = assertStable(nodes, edges)
  assertComplete(nodes, result)
  assertNoOverlap(move(nodes, result))
  const positions = result.positions
  near(positions.get('shared').y, positions.get('middle').y, 'shared card is centered')
  near(positions.get('root').y, positions.get('middle').y, 'root is centered')
  near(positions.get('bottom').y - positions.get('top').y, 180, 'parents use two ordinary gaps')
  assert.equal(result.rigidNodeIds.size, 0)
})

test('cross-root and unequal-depth joins keep their full downstream chain', () => {
  const nodes = [
    node('r1', 0, 0), node('r2', 0, 400), node('a', 100, 100),
    node('b', 200, 200), node('shared', 300, 0), node('tail', 400, 700),
  ]
  const edges = [
    edge('r1', 'a'), edge('a', 'b'), edge('b', 'shared'),
    edge('r1', 'shared'), edge('r2', 'shared'), edge('shared', 'tail'),
  ]
  const result = assertStable(nodes, edges)
  assertComplete(nodes, result)
  assertNoOverlap(move(nodes, result))
  for (const [id, rank] of [['r1', 0], ['r2', 0], ['a', 1], ['b', 2], ['shared', 3], ['tail', 4]]) {
    near(result.positions.get(id).x, rank * 180, `${id} follows longest parent path`)
  }
})

test('ordinary tree branches occupy separate blocks and preserve sibling order', () => {
  const nodes = [
    node('root', 0, 0, 100, 80), node('upper', 200, 20), node('lower', 200, 500),
    node('u1', 400, 0, 100, 40), node('u2', 400, 900, 100, 100),
    node('l1', 400, 600, 100, 80), node('l2', 400, 800, 100, 50),
  ]
  const edges = [
    edge('root', 'upper'), edge('root', 'lower'), edge('upper', 'u1'),
    edge('upper', 'u2'), edge('lower', 'l1'), edge('lower', 'l2'),
  ]
  const result = assertStable(nodes, edges)
  const placed = move(nodes, result)
  const upper = bounds(placed.filter(n => ['upper', 'u1', 'u2'].includes(n.id)))
  const lower = bounds(placed.filter(n => ['lower', 'l1', 'l2'].includes(n.id)))
  assert.ok(lower.top - upper.bottom >= OPTIONS.siblingSpacing - EPSILON)
  assert.ok(result.positions.get('u1').y < result.positions.get('u2').y)
  assert.ok(result.positions.get('l1').y < result.positions.get('l2').y)
  near(result.positions.get('upper').y + 30, (upper.top + upper.bottom) / 2, 'upper branch parent')
  near(result.positions.get('lower').y + 30, (lower.top + lower.bottom) / 2, 'lower branch parent')
  assertNoOverlap(placed)
})

test('column width uses the widest card in that component', () => {
  const nodes = [
    node('root', 0, 0, 120), node('narrow', 100, 0, 60),
    node('wide', 100, 100, 340), node('shared', 200, 50, 70),
  ]
  const edges = [edge('root', 'narrow'), edge('root', 'wide'), edge('narrow', 'shared'), edge('wide', 'shared')]
  const result = layoutMindmap(nodes, edges, OPTIONS)
  near(result.positions.get('wide').x, 200, 'second column starts after root')
  near(result.positions.get('shared').x, 620, 'third column clears widest second-column card')
  assertNoOverlap(move(nodes, result))
})

test('independent components retain their order with separate column widths', () => {
  const nodes = [
    node('wide-root', 10, 0, 900), node('wide-child', 1000, 0),
    node('small-root', 10, 500, 60), node('small-child', 1000, 500, 60),
    node('isolated', 100, 1000),
  ]
  const edges = [edge('wide-root', 'wide-child'), edge('small-root', 'small-child')]
  for (const spacing of [0, 30, 100]) {
    const options = { childSpacing: 80, siblingSpacing: spacing }
    const result = assertStable(nodes, edges, options)
    const placed = move(nodes, result)
    const wide = bounds(placed.filter(n => n.id.startsWith('wide-')))
    const small = bounds(placed.filter(n => n.id.startsWith('small-')))
    near(small.top - wide.bottom, Math.max(60, spacing), 'component separation')
    near(result.positions.get('small-child').x - result.positions.get('small-root').x, 140, 'local column width')
    assert.ok(result.positions.get('isolated').y > small.bottom)
    assertNoOverlap(placed)
  }
})

test('reachable cycles translate as a rigid block, keeping offsets and outgoing nodes', () => {
  const nodes = [
    node('root', -100, -40), node('a', 100.25, 80.5, 70.2, 60.1),
    node('b', 160.75, 160.25, 90.4, 80.2), node('c', 90.5, 240.75, 80.1, 50.3),
    node('tail', 450, 600),
  ]
  const edges = [edge('root', 'a'), edge('a', 'b'), edge('b', 'c'), edge('c', 'a'), edge('c', 'tail')]
  const result = assertStable(nodes, edges)
  assertComplete(nodes, result)
  assert.deepEqual([...result.rigidNodeIds].sort(), ['a', 'b', 'c'])
  for (const id of ['b', 'c']) {
    const original = nodes.find(n => n.id === id)
    near(result.positions.get(id).x - result.positions.get('a').x, original.x - nodes[1].x, `${id} relative x`)
    near(result.positions.get(id).y - result.positions.get('a').y, original.y - nodes[1].y, `${id} relative y`)
  }
  const cycleBounds = bounds(move(nodes, result).filter(n => ['a', 'b', 'c'].includes(n.id)))
  assert.ok(result.positions.get('tail').x >= cycleBounds.right + OPTIONS.childSpacing - EPSILON)
  assert.ok(cycleBounds.left >= result.positions.get('root').x + 100 + OPTIONS.childSpacing - EPSILON)
})

test('a pure cycle terminates and preserves its original internal overlaps', () => {
  const nodes = [node('a', 10, 20), node('b', 50, 40)]
  const edges = [edge('a', 'b'), edge('b', 'a')]
  const result = assertStable(nodes, edges)
  for (const n of nodes) assert.deepEqual(result.positions.get(n.id), { x: n.x, y: n.y })
  assert.deepEqual([...result.rigidNodeIds].sort(), ['a', 'b'])
})

test('multiple cyclic blocks can share a downstream card without overlapping each other', () => {
  const nodes = [
    node('a1', 0, 0, 120, 80), node('a2', 70, 60, 90, 50),
    node('b1', 0, 20, 110, 70), node('b2', 80, 100, 100, 60),
    node('shared', 220, 20), node('tail', 400, 200),
  ]
  const edges = [
    edge('a1', 'a2'), edge('a2', 'a1'), edge('b1', 'b2'), edge('b2', 'b1'),
    edge('a1', 'shared'), edge('a2', 'shared'), edge('b2', 'shared'), edge('shared', 'tail'),
  ]
  const result = assertStable(nodes, edges)
  assertComplete(nodes, result)
  assert.deepEqual([...result.rigidNodeIds].sort(), ['a1', 'a2', 'b1', 'b2'])
  const placed = move(nodes, result)
  const cycleRect = (id, members) => {
    const rect = bounds(placed.filter(n => members.includes(n.id)))
    return node(id, rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top)
  }
  assertNoOverlap([
    cycleRect('cycle-a', ['a1', 'a2']), cycleRect('cycle-b', ['b1', 'b2']),
    ...placed.filter(n => ['shared', 'tail'].includes(n.id)),
  ])
  const withoutRedundantUnitEdge = edges.filter(e => !(e.fromNode === 'a2' && e.toNode === 'shared'))
  assertPositionsEqual(layoutMindmap(nodes, withoutRedundantUnitEdge, OPTIONS).positions, result.positions)
})

test('ordinary and nested groups move with their members while external edges keep their endpoints', () => {
  for (const nested of [false, true]) {
    const nodes = [
      node('root', -300, -100), group('outer', 100, 100, 600, 500),
      node('a', 170, 170, 80, 50), node('b', 550, 480, 80, 50), node('tail', 900, 900),
    ]
    if (nested) nodes.push(group('inner', 150, 150, 300, 250))
    const edges = [edge('root', 'a'), edge('a', 'b'), edge('b', 'tail')]
    const before = JSON.stringify({ nodes, edges })
    const ids = nested ? ['outer', 'inner', 'a', 'b'] : ['outer', 'a', 'b']
    const result = assertStable(nodes, edges)
    assertRigidOffsets(nodes, result, ids)
    assert.deepEqual([...result.rigidNodeIds].sort(), [...ids].sort())
    const placed = move(nodes, result)
    assert.deepEqual(groupMembership(placed), groupMembership(nodes))
    const rect = rigidRect(placed, 'group-block', ids)
    assertNoOverlap([rect, ...placed.filter(n => ['root', 'tail'].includes(n.id))])
    assert.ok(result.positions.get('root').x + 100 <= rect.x)
    assert.ok(result.positions.get('tail').x >= rect.x + rect.width)
    assert.equal(JSON.stringify({ nodes, edges }), before)
  }
})

test('overlapping groups and partially intersecting cards form one rigid region; touching cards stay separate', () => {
  const nodes = [
    group('g1', 100, 100, 300, 200), group('g2', 300, 200, 300, 250),
    node('a', 130, 130, 80, 50), node('b', 450, 300, 80, 60),
    node('partial', 580, 250, 70, 80), node('touching', 600, 250, 80, 60),
    node('root', -100, -100),
  ]
  const edges = [edge('root', 'a'), edge('b', 'touching')]
  const result = assertStable(nodes, edges)
  const ids = ['g1', 'g2', 'a', 'b', 'partial']
  assertRigidOffsets(nodes, result, ids)
  assert.deepEqual([...result.rigidNodeIds].sort(), [...ids].sort())
  assert.deepEqual(groupMembership(move(nodes, result)), groupMembership(nodes))
  assertNoOverlap([rigidRect(move(nodes, result), 'group-block', ids), ...move(nodes, result).filter(n => !ids.includes(n.id))])
})

test('an empty group remains a rigid layout unit and does not acquire members', () => {
  const nodes = [node('root', -200, 0), group('empty', 100, 100, 200, 200), node('tail', 600, 500)]
  const edges = [edge('root', 'empty'), edge('empty', 'tail')]
  const result = assertStable(nodes, edges)
  assert.deepEqual([...result.rigidNodeIds], ['empty'])
  assert.deepEqual(groupMembership(move(nodes, result)), [['empty', []]])
  assertNoOverlap(move(nodes, result))
})

test('a group label keeps its reserved space clear of neighboring cards in the same column', () => {
  const nodes = [node('root', 0, 0), node('above', 200, 50), group('g', 200, 200, 200, 200)]
  const edges = [edge('root', 'above'), edge('root', 'g')]
  const result = assertStable(nodes, edges)
  const above = result.positions.get('above'), g = result.positions.get('g')
  assert.ok(g.y - 40 - (above.y + 60) >= OPTIONS.siblingSpacing - EPSILON)
})

test('collapsing a group can reveal a cycle and freezes the entire resulting region', () => {
  const nodes = [
    node('root', -200, 0), group('g', 100, 100, 300, 300),
    node('a', 140, 140, 80, 50), node('b', 250, 300, 80, 50),
    node('bridge', 550, 500), node('tail', 800, 700),
  ]
  const edges = [edge('root', 'a'), edge('a', 'bridge'), edge('bridge', 'b'), edge('b', 'tail')]
  const result = assertStable(nodes, edges)
  const ids = ['g', 'a', 'b', 'bridge']
  assertRigidOffsets(nodes, result, ids)
  assert.deepEqual([...result.rigidNodeIds].sort(), [...ids].sort())
  assert.deepEqual(groupMembership(move(nodes, result)), groupMembership(nodes))
  assertNoOverlap([rigidRect(move(nodes, result), 'group-cycle', ids), ...move(nodes, result).filter(n => !ids.includes(n.id))])
})

test('structured group IDs cannot collide with members, separators or object keys', () => {
  const nodes = [
    group('a', 10, 10, 300, 200), node('b', 30, 30), node('a|b', 500, 500),
    group('["a","b"]', 900, 900, 300, 200), node('__proto__', 920, 920), node('constructor', 1600, 1500),
  ]
  const edges = [edge('b', 'a|b'), edge('a|b', '__proto__'), edge('__proto__', 'constructor')]
  const result = assertStable(nodes, edges)
  assertComplete(nodes, result)
  assertRigidOffsets(nodes, result, ['a', 'b'])
  assertRigidOffsets(nodes, result, ['["a","b"]', '__proto__'])
  assert.deepEqual(groupMembership(move(nodes, result)), groupMembership(nodes))
})

test('fractional group borders, zero gaps and repeated rearranges preserve all geometric membership', () => {
  const nodes = [
    node('root', -33.125, -40.375, 90.2, 50.1),
    group('g', 100.125, 80.375, 230.2, 180.4), node('inside', 120.375, 100.625, 100.3, 70.1),
    node('partial', 310.125, 170.5, 50.2, 40.1),
    node('touching', 330.325, 210.5, 60.1, 40.2), node('tail', 550.9, 600.6, 80.3, 50.5),
  ]
  const edges = [edge('root', 'inside'), edge('partial', 'tail'), edge('touching', 'tail')]
  const options = { childSpacing: 0, siblingSpacing: 0 }
  const result = assertStable(nodes, edges, options)
  assertRigidOffsets(nodes, result, ['g', 'inside', 'partial'])
  assert.ok(!result.rigidNodeIds.has('touching'))
  assert.deepEqual(groupMembership(move(nodes, result)), groupMembership(nodes))
  assertNoOverlap([rigidRect(move(nodes, result), 'group-block', ['g', 'inside', 'partial']), ...move(nodes, result).filter(n => ['root', 'touching', 'tail'].includes(n.id))])
  assertPositionsEqual(layoutMindmap([...nodes].reverse(), [...edges].reverse(), options).positions, result.positions)
})

test('resizing an outside card reuses original group membership instead of absorbing it', () => {
  const nodes = [group('g', 0, 200, 300, 200), node('outside', 10, 100, 80, 50)]
  const initial = layoutMindmap(nodes, [], OPTIONS)
  assert.deepEqual(initial.rigidGroups, [['g']])
  const resized = nodes.map(n => n.id === 'outside' ? { ...n, height: 250 } : n)
  const result = layoutMindmap(resized, [], { ...OPTIONS, fixedGroups: initial.rigidGroups })
  assert.deepEqual([...result.rigidNodeIds], ['g'])
  assert.deepEqual(groupMembership(move(resized, result)), [['g', []]])
  assertNoOverlap(move(resized, result))
  for (const fixedGroups of [[['missing']], [['g', 'g']], [['g'], ['g']]]) {
    assert.throws(() => layoutMindmap(nodes, [], { ...OPTIONS, fixedGroups }))
  }
})

test('parallel edges and self-loops do not affect layout or acquire extra weight', () => {
  const nodes = [node('a', 0, 0), node('b', 0, 100), node('shared', 200, 300), node('tail', 300, 500)]
  const edges = [edge('a', 'shared'), edge('b', 'shared'), edge('shared', 'tail')]
  const ordinary = layoutMindmap(nodes, edges, OPTIONS)
  const duplicates = layoutMindmap(nodes, [...edges, edges[0], edges[0], edges[2], edge('shared', 'shared')], OPTIONS)
  assertPositionsEqual(duplicates.positions, ordinary.positions)
  assert.equal(duplicates.rigidNodeIds.size, 0)
})

test('non-floating edges require a left target and dangling edges are ignored', () => {
  const nodes = [node('a', 0, 0), node('b', 500, 200)]
  const ignored = [
    edge('a', 'b', { toSide: 'right' }), edge('b', 'a', { toSide: 'top' }),
    edge('a', 'b', { toSide: undefined }), edge('missing', 'a'), edge('b', 'missing'),
  ]
  assertPositionsEqual(layoutMindmap(nodes, ignored, OPTIONS).positions, layoutMindmap(nodes, [], OPTIONS).positions)
})

test('floating targets keep the same hierarchy when their visible side changes', () => {
  const nodes = [node('root', 0, 0), node('a', 200, 100), node('b', 200, 300), node('shared', 500, 700)]
  const edges = [edge('root', 'a'), edge('root', 'b'), edge('a', 'shared'), edge('b', 'shared')]
  const floating = edges.map((e, i) => ({ ...e, toFloating: true, toSide: i % 2 ? 'top' : 'bottom' }))
  assertPositionsEqual(layoutMindmap(nodes, floating, OPTIONS).positions, layoutMindmap(nodes, edges, OPTIONS).positions)
  assertStable(nodes, floating)
})

test('input nodes, original edge endpoints and extension data stay untouched', () => {
  const nodes = [node('a', 0, 0), node('b', 20, 30)].map(n => Object.freeze({ ...n, text: 'original', color: '6' }))
  const edges = [edge('a', 'b', { label: 'original', fromSide: 'bottom', custom: Object.freeze({ value: 42 }) })].map(Object.freeze)
  Object.freeze(nodes)
  Object.freeze(edges)
  const before = JSON.stringify({ nodes, edges })
  const result = layoutMindmap(nodes, edges, OPTIONS)
  assertComplete(nodes, result)
  assert.equal(JSON.stringify({ nodes, edges }), before)
})

test('reversing input Map insertion order and edge order keeps coordinates', () => {
  const source = [node('root', 0, 0), node('b', 200, 100), node('a', 200, 100), node('shared', 400, 250)]
  const nodes = new Map(source.map(n => [n.id, n]))
  const edges = [edge('root', 'b'), edge('root', 'a'), edge('a', 'shared'), edge('b', 'shared')]
  const ordinary = layoutMindmap([...nodes.values()], edges, OPTIONS)
  const reversed = new Map([...nodes.entries()].reverse())
  const reordered = layoutMindmap([...reversed.values()], [...edges].reverse(), OPTIONS)
  assertPositionsEqual(reordered.positions, ordinary.positions)
  assertStable(source, edges)
})

test('node and condensed-cycle IDs cannot collide with separators or object keys', () => {
  const nodes = [
    node('a', 0, 0), node('b', 50, 50), node('a|b', 10, 300), node('c', 100, 350),
    node('b|c', 100, 100), node('__proto__', 0, 500), node('constructor', 100, 550),
    node('["a","b"]', 200, 100),
  ]
  const edges = [
    edge('a', 'b'), edge('b', 'a'), edge('a|b', 'c'), edge('a', 'b|c'),
    edge('__proto__', 'constructor'), edge('b|c', '["a","b"]'),
  ]
  const result = assertStable(nodes, edges)
  assertComplete(nodes, result)
  assert.deepEqual([...result.rigidNodeIds].sort(), ['a', 'b'])
  assert.ok(result.positions.get('c').x > result.positions.get('a|b').x)
  assert.ok(result.positions.get('b|c').x > result.positions.get('b').x)
  assert.ok(result.positions.get('constructor').x > result.positions.get('__proto__').x)
})

test('fractional anchors and sizes stay stable with zero and fractional gaps', () => {
  const nodes = [
    node('root', -11.75, -30.125, 100.00000000000003, 50.2),
    node('a', 20.4, 40.5, 60.7, 80.1), node('b', 20.4, 80.5, 90.2, 60.4),
    node('shared', 90.8, 150.2, 100.3, 70.8), node('tail', 100.1, 200.3, 50.5, 90.5),
  ]
  const edges = [edge('root', 'a'), edge('root', 'b'), edge('a', 'shared'), edge('b', 'shared'), edge('shared', 'tail')]
  for (const options of [{ childSpacing: 0, siblingSpacing: 0 }, { childSpacing: 0.2, siblingSpacing: 0.3 }]) {
    const result = assertStable(nodes, edges, options)
    const placed = move(nodes, result)
    assertNoOverlap(placed)
    near(bounds(placed).left, bounds(nodes).left, 'original x anchor')
    near(bounds(placed).top, bounds(nodes).top, 'original y anchor')
    for (const e of edges) {
      const from = placed.find(n => n.id === e.fromNode)
      const to = placed.find(n => n.id === e.toNode)
      assert.ok(to.x - from.x - from.width >= Math.ceil(options.childSpacing) - EPSILON)
    }
  }
})

test('a chain of 5,000 nodes avoids recursive traversal limits', { timeout: 20000 }, () => {
  const nodes = Array.from({ length: 5000 }, (_, i) => node(String(i), i, i, 10, 10))
  const edges = nodes.slice(1).map((n, i) => edge(String(i), n.id))
  const result = layoutMindmap(nodes, edges, { childSpacing: 1, siblingSpacing: 1 })
  assertComplete(nodes, result)
  near(result.positions.get('4999').x, 4999 * 11, 'last column')
  near(result.positions.get('4999').y, 0, 'chain center')
})

test('120 seeded DAGs are finite, non-overlapping, immutable and repeatable', () => {
  const random = seededRandom(0x4c41594f)
  for (let run = 0; run < 120; run++) {
    const count = 5 + Math.floor(random() * 36)
    const nodes = Array.from({ length: count }, (_, i) => node(
      `${run}:${i}`, random() * 1000 - 500, random() * 1600 - 800,
      20 + random() * 240, 20 + random() * 200,
    ))
    const edges = []
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (random() < 0.12) edges.push(edge(nodes[i].id, nodes[j].id))
      }
    }
    const options = run % 2 ? OPTIONS : { childSpacing: 0, siblingSpacing: 0 }
    const before = JSON.stringify({ nodes, edges })
    const result = assertStable(nodes, edges, options)
    assertComplete(nodes, result)
    const placed = move(nodes, result)
    assertNoOverlap(placed)
    for (const e of edges) {
      const from = placed.find(n => n.id === e.fromNode)
      const to = placed.find(n => n.id === e.toNode)
      assert.ok(to.x >= from.x + from.width + options.childSpacing - EPSILON, `seeded run ${run}: backwards edge`)
    }
    assertPositionsEqual(layoutMindmap([...nodes].reverse(), [...edges].reverse(), options).positions, result.positions, `seeded run ${run}`)
    assert.equal(JSON.stringify({ nodes, edges }), before)
  }
})

test('40 seeded cyclic graphs preserve offsets and separate every rigid block', () => {
  const random = seededRandom(0x4359434c)
  for (let run = 0; run < 40; run++) {
    const blockCount = 2 + Math.floor(random() * 7)
    const blocks = Array.from({ length: blockCount }, (_, block) => {
      const x = random() * 1000 - 500
      const y = random() * 1000 - 500
      return Array.from({ length: 2 + Math.floor(random() * 4) }, (_, i) => node(
        `${run}:${block}:${i}`, x + random() * 160, y + random() * 160,
        20 + random() * 140, 20 + random() * 100,
      ))
    })
    const nodes = blocks.flat()
    // Each ring is one known rigid block; links only go to later blocks.
    const edges = blocks.flatMap(block => block.map((n, i) => edge(n.id, block[(i + 1) % block.length].id)))
    for (let i = 0; i < blockCount; i++) {
      for (let j = i + 1; j < blockCount; j++) {
        if (random() < 0.3) edges.push(edge(blocks[i][0].id, blocks[j][0].id))
      }
    }
    const options = run % 2 ? OPTIONS : { childSpacing: 0, siblingSpacing: 0 }
    const result = assertStable(nodes, edges, options)
    assertComplete(nodes, result)
    assert.equal(result.rigidNodeIds.size, nodes.length)
    const rectangles = blocks.map((block, i) => {
      for (const n of block) {
        near(result.positions.get(n.id).x - result.positions.get(block[0].id).x, n.x - block[0].x, `cycle ${run}:${i} x offset`)
        near(result.positions.get(n.id).y - result.positions.get(block[0].id).y, n.y - block[0].y, `cycle ${run}:${i} y offset`)
      }
      const rect = bounds(move(block, result))
      return node(`block:${i}`, rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top)
    })
    assertNoOverlap(rectangles)
    assertPositionsEqual(layoutMindmap([...nodes].reverse(), [...edges].reverse(), options).positions, result.positions, `cycle run ${run}`)
  }
})

test('50 seeded grouped graphs keep geometric members, rigid offsets and outside cards separate', () => {
  const random = seededRandom(0x47524f55)
  for (let run = 0; run < 50; run++) {
    const nodes = [node('root', -400.25, -400.125), node('tail', 4000.375, 4000.625)]
    const edges = []
    const blocks = []
    const count = 2 + Math.floor(random() * 5)
    for (let i = 0; i < count; i++) {
      const x = i * 500 + random(), y = i * 500 + random()
      const width = 300 + random() * 50, height = 200 + random() * 50
      const ids = [`g:${i}`, `a:${i}`, `b:${i}`, `partial:${i}`]
      nodes.push(
        group(ids[0], x, y, width, height),
        node(ids[1], x + 30, y + 30, 50.25, 40.125),
        node(ids[2], x + 180, y + 150, 60.375, 35.625),
        node(ids[3], x + width - 10, y + 80, 30.25, 30.5),
        node(`touch:${i}`, x + width, y + 150, 70.25, 20.125),
      )
      if (i % 2) {
        ids.push(`inner:${i}`)
        nodes.push(group(`inner:${i}`, x + 20, y + 20, 100.5, 100.25))
      }
      blocks.push(ids)
      edges.push(edge('root', `a:${i}`), edge(`b:${i}`, 'tail'), edge(`touch:${i}`, 'tail'))
    }
    const options = run % 2 ? OPTIONS : { childSpacing: 0, siblingSpacing: 0 }
    const before = JSON.stringify({ nodes, edges })
    const result = assertStable(nodes, edges, options)
    assertComplete(nodes, result)
    const placed = move(nodes, result)
    assert.deepEqual(groupMembership(placed), groupMembership(nodes))
    for (const ids of blocks) assertRigidOffsets(nodes, result, ids)
    assert.deepEqual([...result.rigidNodeIds].sort(), blocks.flat().sort())
    assertNoOverlap([
      ...blocks.map((ids, i) => rigidRect(placed, `block:${i}`, ids)),
      ...placed.filter(n => n.id === 'root' || n.id === 'tail' || n.id.startsWith('touch:')),
    ])
    assertPositionsEqual(layoutMindmap([...nodes].reverse(), [...edges].reverse(), options).positions, result.positions)
    assert.equal(JSON.stringify({ nodes, edges }), before)
  }
})

test('empty input is valid, while invalid geometry, IDs and non-finite gaps fail', () => {
  const empty = layoutMindmap([], [], OPTIONS)
  assertComplete([], empty)
  const valid = node('a', 0, 0)
  for (const key of ['x', 'y', 'width', 'height']) {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(() => layoutMindmap([{ ...valid, [key]: value }], [], OPTIONS), `${key}: ${value}`)
    }
  }
  for (const key of ['width', 'height']) {
    for (const value of [0, -1]) assert.throws(() => layoutMindmap([{ ...valid, [key]: value }], [], OPTIONS))
  }
  assert.throws(() => layoutMindmap([valid, { ...valid }], [], OPTIONS), 'duplicate IDs')
  assert.throws(() => layoutMindmap([{ ...valid, id: '' }], [], OPTIONS), 'empty ID')
  for (const key of ['childSpacing', 'siblingSpacing']) {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(() => layoutMindmap([valid], [], { ...OPTIONS, [key]: value }))
    }
  }
  const nodes = [valid, node('b', 100, 100)]
  const edges = [edge('a', 'b')]
  assertPositionsEqual(
    layoutMindmap(nodes, edges, { childSpacing: -1, siblingSpacing: -1 }).positions,
    layoutMindmap(nodes, edges, { childSpacing: 0, siblingSpacing: 0 }).positions,
    'negative gaps are normalized to zero',
  )
})
