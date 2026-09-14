export interface MindmapLayoutNode {
  id: string
  type?: string
  x: number
  y: number
  width: number
  height: number
}

export interface MindmapLayoutEdge {
  fromNode: string
  toNode: string
  toSide?: string
  toFloating?: boolean
}

// Floating target sides are a rendering choice, not a change of parentage.
export function isMindmapEdge(edge: Pick<MindmapLayoutEdge, 'toSide' | 'toFloating'>): boolean {
  return edge.toSide === 'left' || edge.toFloating === true
}

interface Position {
  x: number
  y: number
}

interface LayoutUnit extends MindmapLayoutNode {
  members: readonly MindmapLayoutNode[]
  parents: LayoutUnit[]
  children: LayoutUnit[]
  rank: number
  center: number
  baseline: number
  slot: number
}

const GEOMETRY_EPSILON = 1e-6
const SOLVER_EPSILON = 1e-7
const BASELINE_WEIGHT = 0.1
const MAX_ITERATIONS = 200
const GROUP_LABEL_HEIGHT = 40

function compareId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function comparePosition(a: LayoutUnit, b: LayoutUnit): number {
  return (a.y + a.height / 2) - (b.y + b.height / 2) || a.x - b.x || compareId(a, b)
}

function bounds(nodes: readonly MindmapLayoutNode[], includeGroupLabels = false): Omit<MindmapLayoutNode, 'id'> {
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity
  for (const node of nodes) {
    x = Math.min(x, node.x)
    y = Math.min(y, node.y - (includeGroupLabels && node.type === 'group' ? GROUP_LABEL_HEIGHT : 0))
    right = Math.max(right, node.x + node.width)
    bottom = Math.max(bottom, node.y + node.height)
  }
  const result = { x, y, width: right - x, height: bottom - y }
  if (!Object.values(result).every(Number.isFinite)) throw new Error('Invalid mindmap bounds')
  return result
}

// Canvas groups store geometric containment rather than an explicit member list.
// Protect overlapping groups and partial overlaps as well as strict containment.
function groupRegions(nodes: readonly MindmapLayoutNode[], fixedGroups?: readonly (readonly string[])[]): number[][] {
  const owners = nodes.map((_, index) => index)
  const find = (index: number): number => {
    while (owners[index] !== index) {
      owners[index] = owners[owners[index]]
      index = owners[index]
    }
    return index
  }
  if (fixedGroups !== undefined) {
    // Reuse the pre-measurement partition: a resized outside card must not
    // accidentally become a group member merely because its old box grew.
    const indexes = new Map(nodes.map((node, index) => [node.id, index]))
    const assigned = new Set<string>()
    for (const members of fixedGroups) {
      if (members.length === 0) throw new Error('Invalid fixed mindmap group')
      const first = indexes.get(members[0])
      if (first === undefined) throw new Error('Unknown fixed mindmap group member')
      for (const id of members) {
        const index = indexes.get(id)
        if (index === undefined || assigned.has(id)) throw new Error('Invalid fixed mindmap group member')
        assigned.add(id)
        const a = find(first), b = find(index)
        owners[Math.max(a, b)] = Math.min(a, b)
      }
    }
    if (nodes.some(node => node.type === 'group' && !assigned.has(node.id)))
      throw new Error('Missing fixed mindmap group')
  } else {
    for (let i = 0; i < nodes.length; i++) {
      const group = nodes[i]
      if (group.type !== 'group') continue
      for (let j = 0; j < nodes.length; j++) {
        const node = nodes[j]
        if (i === j ||
            Math.min(group.x + group.width, node.x + node.width) - Math.max(group.x, node.x) <= GEOMETRY_EPSILON ||
            Math.min(group.y + group.height, node.y + node.height) - Math.max(group.y, node.y) <= GEOMETRY_EPSILON) continue
        const a = find(i), b = find(j)
        owners[Math.max(a, b)] = Math.min(a, b)
      }
    }
  }
  const regions = new Map<number, number[]>()
  for (let i = 0; i < nodes.length; i++) {
    const owner = find(i)
    const members = regions.get(owner)
    if (members) members.push(i)
    else regions.set(owner, [i])
  }
  return [...regions.values()]
}

// Iterative Kosaraju traversal also handles long chains without using the call stack.
function stronglyConnected(children: number[][], parents: number[][]): number[][] {
  const seen = children.map(() => false)
  const order: number[] = []
  for (let start = 0; start < children.length; start++) {
    if (seen[start]) continue
    seen[start] = true
    const stack = [{ node: start, next: 0 }]
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (frame.next < children[frame.node].length) {
        const child = children[frame.node][frame.next++]
        if (!seen[child]) {
          seen[child] = true
          stack.push({ node: child, next: 0 })
        }
      } else {
        order.push(frame.node)
        stack.pop()
      }
    }
  }

  seen.fill(false)
  const groups: number[][] = []
  for (let i = order.length - 1; i >= 0; i--) {
    const start = order[i]
    if (seen[start]) continue
    const group: number[] = []
    const stack = [start]
    seen[start] = true
    while (stack.length > 0) {
      const node = stack.pop()!
      group.push(node)
      for (const parent of parents[node]) {
        if (seen[parent]) continue
        seen[parent] = true
        stack.push(parent)
      }
    }
    groups.push(group.sort((a, b) => a - b))
  }
  return groups
}

function createUnits(
  nodes: readonly MindmapLayoutNode[],
  edges: readonly MindmapLayoutEdge[],
  fixedGroups?: readonly (readonly string[])[],
): LayoutUnit[] {
  const sorted = [...nodes].sort(compareId)
  const regions = groupRegions(sorted, fixedGroups)
  const indexes = new Map<string, number>()
  regions.forEach((members, index) => {
    for (const member of members) indexes.set(sorted[member].id, index)
  })
  const uniqueChildren = regions.map(() => new Set<number>())
  for (const edge of edges) {
    if (!edge || typeof edge.fromNode !== 'string' || typeof edge.toNode !== 'string') {
      throw new Error('Invalid mindmap edge')
    }
    if (!isMindmapEdge(edge)) continue
    const from = indexes.get(edge.fromNode), to = indexes.get(edge.toNode)
    if (from !== undefined && to !== undefined && from !== to) uniqueChildren[from].add(to)
  }
  const children = uniqueChildren.map(ids => [...ids].sort((a, b) => a - b))
  const parents: number[][] = regions.map(() => [])
  children.forEach((ids, from) => ids.forEach(to => parents[to].push(from)))

  // Group contraction can introduce cycles, so find SCCs only after mapping edges.
  const owner: LayoutUnit[] = []
  const units = stronglyConnected(children, parents).map(ids => {
    const members = ids.flatMap(id => regions[id].map(member => sorted[member])).sort(compareId)
    // Reserve stable label space without changing stored group rectangles. This
    // visual top is also used for offsets and the global anchor on every run.
    const rect = bounds(members, true)
    const unit: LayoutUnit = {
      id: JSON.stringify(members.map(node => node.id)),
      ...rect,
      width: Math.ceil(rect.width - GEOMETRY_EPSILON),
      height: Math.ceil(rect.height - GEOMETRY_EPSILON),
      members, parents: [], children: [], rank: 0, center: 0, baseline: 0, slot: 0
    }
    for (const id of ids) owner[id] = unit
    return unit
  }).sort(compareId)

  // Distinct original edges may become the same edge after collapsing a cycle.
  const links = new Map(units.map(unit => [unit, new Set<LayoutUnit>()]))
  children.forEach((ids, from) => {
    for (const to of ids) if (owner[from] !== owner[to]) links.get(owner[from])!.add(owner[to])
  })
  for (const unit of units) {
    unit.children = [...links.get(unit)!].sort(compareId)
    for (const child of unit.children) child.parents.push(unit)
  }
  return units
}

function components(units: LayoutUnit[]): LayoutUnit[][] {
  const seen = new Set<LayoutUnit>()
  const result: LayoutUnit[][] = []
  for (const start of units) {
    if (seen.has(start)) continue
    const component: LayoutUnit[] = []
    const stack = [start]
    seen.add(start)
    while (stack.length > 0) {
      const unit = stack.pop()!
      component.push(unit)
      for (const next of [...unit.parents, ...unit.children]) {
        if (seen.has(next)) continue
        seen.add(next)
        stack.push(next)
      }
    }
    result.push(component.sort(compareId))
  }
  return result
}

function placeTree(topological: LayoutUnit[], siblingSpacing: number): void {
  for (let i = topological.length - 1; i >= 0; i--) {
    const unit = topological[i]
    unit.children.sort(comparePosition)
    const total = unit.children.reduce((sum, child) => sum + child.slot, 0) +
      Math.max(0, unit.children.length - 1) * siblingSpacing
    unit.slot = Math.max(unit.height, total)
  }
  const stack = [{ unit: topological[0], top: 0 }]
  while (stack.length > 0) {
    const { unit, top } = stack.pop()!
    unit.center = top + unit.slot / 2
    const total = unit.children.reduce((sum, child) => sum + child.slot, 0) +
      Math.max(0, unit.children.length - 1) * siblingSpacing
    let cursor = top + (unit.slot - total) / 2
    for (const child of unit.children) {
      stack.push({ unit: child, top: cursor })
      cursor += child.slot + siblingSpacing
    }
  }
}

// Weighted PAVA projects ideal centers onto the fixed-order spacing constraints.
function projectLayer(layer: LayoutUnit[], offsets: number[]): number {
  const blocks: { start: number; end: number; weight: number; sum: number }[] = []
  for (let i = 0; i < layer.length; i++) {
    const unit = layer[i]
    const neighbors = [...unit.parents, ...unit.children]
    const weight = neighbors.length + BASELINE_WEIGHT
    const targetSum = neighbors.reduce((sum, next) => sum + next.center, 0) +
      BASELINE_WEIGHT * unit.baseline
    blocks.push({ start: i, end: i, weight, sum: targetSum - weight * offsets[i] })
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1], previous = blocks[blocks.length - 2]
      if (previous.sum / previous.weight <= last.sum / last.weight) break
      previous.end = last.end
      previous.weight += last.weight
      previous.sum += last.sum
      blocks.pop()
    }
  }
  let delta = 0
  for (const block of blocks) {
    const value = block.sum / block.weight
    for (let i = block.start; i <= block.end; i++) {
      const center = value + offsets[i]
      delta = Math.max(delta, Math.abs(center - layer[i].center))
      layer[i].center = center
    }
  }
  return delta
}

function placeDag(layers: LayoutUnit[][], siblingSpacing: number): void {
  const offsets = layers.map(layer => {
    const total = layer.reduce((sum, unit) => sum + unit.height, 0) +
      (layer.length - 1) * siblingSpacing
    const distances: number[] = []
    let cursor = -total / 2
    for (let i = 0; i < layer.length; i++) {
      const unit = layer[i]
      unit.baseline = unit.center = cursor + unit.height / 2
      distances.push(i === 0 ? 0 : distances[i - 1] +
        (layer[i - 1].height + unit.height) / 2 + siblingSpacing)
      cursor += unit.height + siblingSpacing
    }
    return distances
  })
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let delta = 0
    for (let i = 0; i < layers.length; i++) delta = Math.max(delta, projectLayer(layers[i], offsets[i]))
    for (let i = layers.length - 1; i >= 0; i--) delta = Math.max(delta, projectLayer(layers[i], offsets[i]))
    if (delta < SOLVER_EPSILON) break
  }
}

function layoutComponent(units: LayoutUnit[], childSpacing: number, siblingSpacing: number): {
  positions: Map<LayoutUnit, Position>
  height: number
} {
  const pending = new Map(units.map(unit => [unit, unit.parents.length]))
  const topological = units.filter(unit => unit.parents.length === 0)
  for (let i = 0; i < topological.length; i++) {
    const unit = topological[i]
    for (const child of unit.children) {
      child.rank = Math.max(child.rank, unit.rank + 1)
      const remaining = pending.get(child)! - 1
      pending.set(child, remaining)
      if (remaining === 0) topological.push(child)
    }
  }
  if (topological.length !== units.length) throw new Error('Mindmap graph could not be ordered')

  const layers: LayoutUnit[][] = []
  for (const unit of units) (layers[unit.rank] ??= []).push(unit)
  const columns: number[] = []
  let cursor = 0
  for (const layer of layers) {
    layer.sort(comparePosition)
    columns.push(cursor)
    cursor += layer.reduce((width, unit) => Math.max(width, unit.width), 0) + childSpacing
  }

  if (units.every(unit => unit.parents.length <= 1)) placeTree(topological, siblingSpacing)
  else placeDag(layers, siblingSpacing)

  const top = units.reduce((y, unit) => Math.min(y, unit.center - unit.height / 2), Infinity)
  const positions = new Map<LayoutUnit, Position>()
  let height = 0
  for (const layer of layers) {
    // Tree order follows entire subtrees, which may differ from the original layer order.
    const placed = [...layer].sort((a, b) => a.center - b.center || compareId(a, b))
    let bottom = -Infinity
    for (const unit of placed) {
      const position = { x: Math.round(columns[unit.rank]), y: Math.round(unit.center - unit.height / 2 - top) }
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y) ||
          position.y < bottom + siblingSpacing - GEOMETRY_EPSILON) {
        throw new Error('Invalid mindmap layout')
      }
      positions.set(unit, position)
      bottom = position.y + unit.height
      height = Math.max(height, bottom)
    }
  }
  if (!Number.isFinite(height)) throw new Error('Invalid mindmap layout height')
  return { positions, height }
}

/** Compute positions without changing source nodes, edges, or dimensions. */
export function layoutMindmap(
  nodes: readonly MindmapLayoutNode[],
  edges: readonly MindmapLayoutEdge[],
  options: { childSpacing: number; siblingSpacing: number; fixedGroups?: readonly (readonly string[])[] }
): { positions: Map<string, Position>; rigidNodeIds: Set<string>; rigidGroups: string[][] } {
  const sourceNodes: readonly MindmapLayoutNode[] = nodes
  if (!Array.isArray(nodes) || !Array.isArray(edges) || !options ||
      !Number.isFinite(options.childSpacing) || !Number.isFinite(options.siblingSpacing)) {
    throw new Error('Invalid mindmap layout input')
  }
  const ids = new Set<string>()
  for (const node of sourceNodes) {
    if (!node || typeof node.id !== 'string' || node.id.length === 0 || ids.has(node.id) ||
        ![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 0 || node.height <= 0) {
      throw new Error('Invalid or duplicate mindmap node')
    }
    ids.add(node.id)
  }
  const positions = new Map<string, Position>()
  const rigidNodeIds = new Set<string>()
  if (nodes.length === 0) {
    if (options.fixedGroups?.length) throw new Error('Unknown fixed mindmap group member')
    return { positions, rigidNodeIds, rigidGroups: [] }
  }

  const childSpacing = Math.ceil(Math.max(0, options.childSpacing))
  const siblingSpacing = Math.ceil(Math.max(0, options.siblingSpacing))
  const units = createUnits(nodes, edges, options.fixedGroups)
  const rigidGroups = units.filter(unit => unit.members.length > 1 || unit.members[0].type === 'group')
    .map(unit => unit.members.map(node => node.id))
  const origin = bounds(units)
  const ordered = components(units).map(members => ({ id: members[0].id, members, ...bounds(members) }))
    .sort((a, b) => a.y - b.y || a.x - b.x || compareId(a, b))
  let cursor = 0
  for (const component of ordered) {
    const result = layoutComponent(component.members, childSpacing, siblingSpacing)
    for (const unit of component.members) {
      const position = result.positions.get(unit)!
      for (const node of unit.members) {
        const next = {
          x: origin.x + position.x + (node.x - unit.x),
          y: origin.y + cursor + position.y + (node.y - unit.y)
        }
        if (!Number.isFinite(next.x) || !Number.isFinite(next.y) ||
            !Number.isFinite(next.x + node.width) || !Number.isFinite(next.y + node.height)) {
          throw new Error('Invalid mindmap node position')
        }
        positions.set(node.id, next)
        if (unit.members.length > 1 || node.type === 'group') rigidNodeIds.add(node.id)
      }
    }
    cursor += result.height + Math.max(60, siblingSpacing)
  }
  return { positions, rigidNodeIds, rigidGroups }
}
