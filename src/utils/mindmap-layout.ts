import { fromMindmapRect, getMindmapEdgeDirection, getMindmapEdgeDirectionHint, MINDMAP_DIRECTIONS, resolveMindmapRelation, toMindmapRect, type MindmapDirection, type MindmapEdge, type MindmapRect } from './mindmap-direction'

export interface MindmapLayoutNode {
  id: string
  type?: string
  x: number
  y: number
  width: number
  height: number
}

export type MindmapLayoutEdge = MindmapEdge

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
export function stronglyConnected(children: number[][], parents: number[][]): number[][] {
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
    const relation = resolveMindmapRelation(edge)
    if (!relation) continue
    const from = indexes.get(relation.parentId), to = indexes.get(relation.childId)
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

function layoutComponent(units: LayoutUnit[], childSpacing: number, siblingSpacing: number): Map<LayoutUnit, Position> {
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

  if (units.every(unit => unit.parents.length <= 1) && units.filter(unit => unit.parents.length === 0).length === 1) placeTree(topological, siblingSpacing)
  else placeDag(layers, siblingSpacing)

  const top = units.reduce((y, unit) => Math.min(y, unit.center - unit.height / 2), Infinity)
  const positions = new Map<LayoutUnit, Position>()
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
    }
  }
  return positions
}

interface UnitRelation {
  parent: LayoutUnit
  child: LayoutUnit
  edge: MindmapLayoutEdge
  parentNode: MindmapLayoutNode
  childNode: MindmapLayoutNode
  direction: MindmapDirection
}

function placedEndpoint(node: MindmapLayoutNode, unit: LayoutUnit, positions: ReadonlyMap<LayoutUnit, Position>): MindmapLayoutNode {
  const position = positions.get(unit)!
  return { ...node, x: node.x + position.x - unit.x, y: node.y + position.y - unit.y }
}

function preservesDirections(relations: UnitRelation[], positions: ReadonlyMap<LayoutUnit, Position>): boolean {
  return relations.every(relation => getMindmapEdgeDirection(relation.edge,
    placedEndpoint(relation.parentNode, relation.parent, positions),
    placedEndpoint(relation.childNode, relation.child, positions)) === relation.direction)
}

function layoutDirected(units: LayoutUnit[], direction: MindmapDirection, childSpacing: number, siblingSpacing: number): Map<LayoutUnit, Position> {
  const physical = new Map(units.map(unit => [unit, { x: unit.x, y: unit.y, width: unit.width, height: unit.height }]))
  for (const unit of units) Object.assign(unit, toMindmapRect(unit, direction))
  const result = layoutComponent(units, childSpacing, siblingSpacing)
  const positions = new Map<LayoutUnit, Position>()
  for (const unit of units) {
    const placed = fromMindmapRect({ ...unit, ...result.get(unit)! }, direction)
    positions.set(unit, { x: placed.x, y: placed.y })
    Object.assign(unit, physical.get(unit)!)
  }
  return positions
}

function overlaps(a: MindmapRect, b: MindmapRect, spacing = 0): boolean {
  return Math.min(a.x + a.width, b.x + b.width) + spacing - Math.max(a.x, b.x) > GEOMETRY_EPSILON &&
    Math.min(a.y + a.height, b.y + b.height) + spacing - Math.max(a.y, b.y) > GEOMETRY_EPSILON
}

// Each child subtree is one box. Turning branches move with their parent, while
// the existing tree solver packs siblings along a shared depth line.
function layoutBranchTree(units: LayoutUnit[], relations: UnitRelation[], childSpacing: number, siblingSpacing: number, obstacles: MindmapRect[]): Map<LayoutUnit, Position> {
  type Branch = { unit: LayoutUnit; rect: MindmapRect; children: { branch: Branch; position: Position }[] }
  const root = units.find(unit => unit.parents.length === 0)!
  const rootAnchor = { x: root.x, y: root.y }
  for (const obstacle of [...obstacles].sort((a, b) => a.y - b.y)) {
    if (overlaps({ ...root, ...rootAnchor }, obstacle, siblingSpacing)) rootAnchor.y = obstacle.y + obstacle.height + siblingSpacing
  }
  const order = [root]
  for (let i = 0; i < order.length; i++) order.push(...order[i].children)
  const branches = new Map<LayoutUnit, Branch>()
  const incoming = new Map<LayoutUnit, UnitRelation[]>()
  for (const relation of relations) {
    const edges = incoming.get(relation.child)
    if (edges) edges.push(relation)
    else incoming.set(relation.child, [relation])
  }
  const visibleRect = (unit: LayoutUnit) => ({ x: 0, y: 0,
    width: unit.members.length === 1 && unit.members[0].type !== 'group' ? unit.members[0].width : unit.width,
    height: unit.members.length === 1 && unit.members[0].type !== 'group' ? unit.members[0].height : unit.height })
  for (let index = order.length - 1; index >= 0; index--) {
    const unit = order[index], children: Branch['children'] = [], placedGroups: MindmapRect[] = []
    for (const direction of MINDMAP_DIRECTIONS) {
      const members = unit.children.filter(child => incoming.get(child)![0].direction === direction)
      if (members.length === 0) continue
      const parent = toMindmapRect({ ...unit, x: 0, y: 0 }, direction)
      const parentVisible = toMindmapRect(visibleRect(unit), direction)
      const boxes = members.map(child => {
        const branch = branches.get(child)!, rect = toMindmapRect(branch.rect, direction)
        const visible = toMindmapRect(visibleRect(child), direction)
        return { branch, rect, visible, inset: visible.x - rect.x }
      })
      const inset = Math.max(...boxes.map(box => box.inset))
      const anchor: LayoutUnit = { ...unit, x: 0, y: 0, width: parent.width, height: parent.height,
        parents: [], children: [], rank: 0, center: 0, baseline: 0, slot: 0 }
      const packed = boxes.map(box => {
        const previous = toMindmapRect(box.branch.unit, direction)
        const width = Math.ceil(box.rect.width + inset - box.inset), height = Math.ceil(box.rect.height)
        return { ...box.branch.unit, x: previous.x, y: previous.y + previous.height / 2 - height / 2,
          width, height, parents: [anchor], children: [], rank: 0, center: 0, baseline: 0, slot: 0 }
      })
      anchor.children = [...packed]
      const positions = layoutComponent([anchor, ...packed], childSpacing, siblingSpacing)
      const centers = boxes.map((box, i) => positions.get(packed[i])!.y + box.visible.y + box.visible.height / 2 - box.rect.y)
      const cross = parentVisible.y + parentVisible.height / 2 - parent.y - (Math.min(...centers) + Math.max(...centers)) / 2
      const offsets = boxes.map((box, i) => ({ x: positions.get(packed[i])!.x + inset - box.inset - box.rect.x,
        y: positions.get(packed[i])!.y + cross - box.rect.y }))
      const group = bounds(boxes.map((box, i) => ({ id: box.branch.unit.id, ...box.rect,
        x: box.rect.x + offsets[i].x, y: box.rect.y + offsets[i].y })))
      const fixed = unit === root ? obstacles.map(rect => toMindmapRect({ ...rect, x: rect.x - rootAnchor.x, y: rect.y - rootAnchor.y }, direction)) : []
      const blockers = [...placedGroups.map(rect => toMindmapRect(rect, direction)), ...fixed]
        .map(rect => ({ ...rect, x: rect.x - parent.x, y: rect.y - parent.y })).sort((a, b) => a.x - b.x)
      const crossOffsets = [0, ...fixed.flatMap(rect => [rect.y - parent.y - siblingSpacing - group.y - group.height,
        rect.y + rect.height - parent.y + siblingSpacing - group.y])]
      let best: { cross: number; forward: number; cost: number } | undefined
      for (const shift of crossOffsets) {
        let forward = 0
        for (let i = 0; i < boxes.length; i++) for (const relation of incoming.get(boxes[i].branch.unit)!) {
          if (getMindmapEdgeDirectionHint(relation.edge) === direction) continue
          const from = toMindmapRect({ ...relation.parentNode, x: relation.parentNode.x - unit.x,
            y: relation.parentNode.y - unit.y }, direction)
          const child = boxes[i].branch.unit
          const to = toMindmapRect({ ...relation.childNode, x: relation.childNode.x - child.x,
            y: relation.childNode.y - child.y }, direction)
          const dx = to.x + offsets[i].x + parent.x + to.width / 2 - from.x - from.width / 2
          const dy = to.y + offsets[i].y + parent.y + shift + to.height / 2 - from.y - from.height / 2
          forward = Math.max(forward, (Math.abs(dy) / (from.height + to.height) + 2e-9) * (from.width + to.width) - dx)
        }
        for (const blocker of blockers) {
          if (overlaps({ ...group, x: group.x + forward, y: group.y + shift }, blocker, siblingSpacing))
            forward = Math.max(forward, blocker.x + blocker.width + siblingSpacing - group.x)
        }
        const cost = forward + Math.abs(shift)
        if (!best || cost < best.cost) best = { cross: shift, forward, cost }
      }
      for (let i = 0; i < boxes.length; i++) {
        const position = fromMindmapRect({ x: offsets[i].x + parent.x + best!.forward,
          y: offsets[i].y + parent.y + best!.cross, width: 0, height: 0 }, direction)
        children.push({ branch: boxes[i].branch, position: { x: position.x, y: position.y } })
      }
      placedGroups.push(fromMindmapRect({ ...group, x: group.x + parent.x + best!.forward,
        y: group.y + parent.y + best!.cross }, direction))
    }
    const rect = bounds([{ ...unit, x: 0, y: 0 }, ...children.map(({ branch, position }) => ({
      id: branch.unit.id, ...branch.rect, x: branch.rect.x + position.x, y: branch.rect.y + position.y,
    }))])
    branches.set(unit, { unit, rect, children })
  }
  const positions = new Map<LayoutUnit, Position>(), stack = [{ branch: branches.get(root)!, position: rootAnchor }]
  while (stack.length) {
    const { branch, position } = stack.pop()!
    positions.set(branch.unit, position)
    for (const child of branch.children) stack.push({ branch: child.branch,
      position: { x: position.x + child.position.x, y: position.y + child.position.y } })
  }
  return positions
}

// Uniformly expand branch centers instead of alternately pushing x and y: the
// latter can amplify competing directions indefinitely around shared children.
function layoutMixed(units: LayoutUnit[], relations: UnitRelation[], childSpacing: number, siblingSpacing: number): Map<LayoutUnit, Position> | null {
  const centers = new Map<LayoutUnit, Position>()
  const offsets = new Map<LayoutUnit, Position>()
  const coincident = new Map<string, LayoutUnit[]>()
  const endpoints = new Map(units.map(unit => [unit, new Set<MindmapLayoutNode>()]))
  for (const relation of relations) {
    endpoints.get(relation.parent)!.add(relation.parentNode)
    endpoints.get(relation.child)!.add(relation.childNode)
  }
  for (const unit of units) {
    const rect = bounds(unit.members, true)
    const connected = [...endpoints.get(unit)!].sort(compareId)
    const center = connected.length ? {
      x: connected.reduce((sum, node) => sum + node.x + node.width / 2, 0) / connected.length,
      y: connected.reduce((sum, node) => sum + node.y + node.height / 2, 0) / connected.length,
    } : { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    centers.set(unit, center)
    offsets.set(unit, { x: center.x - unit.x, y: center.y - unit.y })
    const key = JSON.stringify(center)
    const stack = coincident.get(key)
    if (stack) stack.push(unit)
    else coincident.set(key, [unit])
  }
  for (const members of coincident.values()) {
    if (members.length <= 1) continue
    // Resolve exact stacks with the same tree/DAG solver used for ordinary maps.
    const copies = new Map<LayoutUnit, LayoutUnit>(members.map(unit => [unit, { ...unit, rank: 0, parents: [], children: [] }]))
    for (const [unit, copy] of copies) {
      copy.parents = unit.parents.filter(parent => copies.has(parent)).map(parent => copies.get(parent)!)
      copy.children = unit.children.filter(child => copies.has(child)).map(child => copies.get(child)!)
    }
    const placed = layoutDirected([...copies.values()], 'right', childSpacing, siblingSpacing)
    const rect = bounds([...copies.values()].map(unit => ({ ...unit, ...placed.get(unit)! })))
    for (const [unit, copy] of copies) {
      const center = centers.get(unit)!, position = placed.get(copy)!, offset = offsets.get(unit)!
      centers.set(unit, { x: center.x + position.x + offset.x - rect.x - rect.width / 2,
        y: center.y + position.y + offset.y - rect.y - rect.height / 2 })
    }
  }
  type Gap = { from: LayoutUnit; to: LayoutUnit; axis: 'x' | 'y'; distance: number }
  const gaps: Gap[] = []
  const requiredDistance = (from: LayoutUnit, to: LayoutUnit, axis: 'x' | 'y', gap: number) =>
    (axis === 'x' ? from.width : from.height) - offsets.get(from)![axis] + offsets.get(to)![axis] + gap
  const addGap = (from: LayoutUnit, to: LayoutUnit, axis: 'x' | 'y', gap: number) =>
    gaps.push({ from, to, axis, distance: requiredDistance(from, to, axis, gap) })
  const requireGap = (from: LayoutUnit, to: LayoutUnit, axis: 'x' | 'y', gap: number): number => {
    const distance = centers.get(to)![axis] - centers.get(from)![axis]
    return distance > 0 ? requiredDistance(from, to, axis, gap) / distance : Infinity
  }
  for (const { parent, child, direction } of relations) {
    const reverse = direction === 'left' || direction === 'up'
    addGap(reverse ? child : parent, reverse ? parent : child,
      direction === 'left' || direction === 'right' ? 'x' : 'y', childSpacing)
  }
  const forEachCollision = (visit: (from: LayoutUnit, to: LayoutUnit, axis: 'x' | 'y', factor: number) => void) => {
    const ordered = [...units].sort((a, b) => centers.get(a)!.x - offsets.get(a)!.x - centers.get(b)!.x + offsets.get(b)!.x || compareId(a, b))
    for (let i = 0; i < ordered.length; i++) {
      const a = ordered[i], ac = centers.get(a)!, ao = offsets.get(a)!
      for (let j = i + 1; j < ordered.length; j++) {
        const b = ordered[j], bc = centers.get(b)!, bo = offsets.get(b)!
        if (bc.x - bo.x >= ac.x - ao.x + a.width - GEOMETRY_EPSILON) break
        if (Math.min(ac.y - ao.y + a.height, bc.y - bo.y + b.height) - Math.max(ac.y - ao.y, bc.y - bo.y) <= GEOMETRY_EPSILON) continue
        const x = ac.x < bc.x ? requireGap(a, b, 'x', siblingSpacing) : requireGap(b, a, 'x', siblingSpacing)
        const y = ac.y < bc.y ? requireGap(a, b, 'y', siblingSpacing) : requireGap(b, a, 'y', siblingSpacing)
        const axis = x < y ? 'x' : 'y'
        visit(ac[axis] < bc[axis] ? a : b, ac[axis] < bc[axis] ? b : a, axis, Math.min(x, y))
      }
    }
  }
  // One forward constraint per card and axis keeps dense stacks linear in memory.
  // Any remaining collision is included in the final scale calculation below.
  const collisions = { x: new Map<LayoutUnit, { gap: Gap; factor: number }>(), y: new Map<LayoutUnit, { gap: Gap; factor: number }>() }
  forEachCollision((from, to, axis, factor) => {
    if ((collisions[axis].get(from)?.factor ?? 0) >= factor) return
    collisions[axis].set(from, { gap: { from, to, axis, distance: requiredDistance(from, to, axis, siblingSpacing) }, factor })
  })
  for (const axis of ['x', 'y'] as const) for (const { gap } of collisions[axis].values()) gaps.push(gap)
  // Open small local gaps before expanding the whole component. Preserve every
  // original coordinate difference, so a separated pair cannot become a collision.
  const normalized = new Map(units.map(unit => [unit, { ...centers.get(unit)! }]))
  for (const axis of ['x', 'y'] as const) {
    const incoming = new Map<LayoutUnit, typeof gaps>()
    for (const gap of gaps) {
      if (gap.axis !== axis) continue
      const entries = incoming.get(gap.to)
      if (entries) entries.push(gap)
      else incoming.set(gap.to, [gap])
    }
    const ordered = [...units].sort((a, b) => centers.get(a)![axis] - centers.get(b)![axis] || compareId(a, b))
    let shift = 0
    for (let i = 0; i < ordered.length;) {
      const original = centers.get(ordered[i])![axis]
      let end = i + 1, value = original + shift
      while (end < ordered.length && centers.get(ordered[end])![axis] === original) end++
      for (let j = i; j < end; j++) {
        for (const gap of incoming.get(ordered[j]) ?? []) value = Math.max(value, normalized.get(gap.from)![axis] + gap.distance)
      }
      for (let j = i; j < end; j++) normalized.get(ordered[j])![axis] = value
      shift = value - original
      i = end
    }
  }
  const normalize = (amount: number): Map<LayoutUnit, Position> | null => {
    const interpolated = new Map(units.map(unit => {
      const original = centers.get(unit)!, next = normalized.get(unit)!, offset = offsets.get(unit)!
      return [unit, { x: original.x + (next.x - original.x) * amount - offset.x,
        y: original.y + (next.y - original.y) * amount - offset.y }] as const
    }))
    // Free endpoints constrain the x/y stretch ratio; fixed opposing faces only
    // require the original side. Stretching neither axis less than 1 keeps gaps.
    let minimum = 0, maximum = Infinity
    for (const relation of relations) {
      if (getMindmapEdgeDirectionHint(relation.edge) === relation.direction) continue
      const parent = placedEndpoint(relation.parentNode, relation.parent, interpolated)
      const child = placedEndpoint(relation.childNode, relation.child, interpolated)
      const dx = Math.abs(child.x + child.width / 2 - parent.x - parent.width / 2) / (parent.width + child.width)
      const dy = Math.abs(child.y + child.height / 2 - parent.y - parent.height / 2) / (parent.height + child.height)
      const ratio = dy / dx
      if (relation.direction === 'right' || relation.direction === 'left') minimum = Math.max(minimum, ratio)
      else maximum = Math.min(maximum, ratio * (1 - SOLVER_EPSILON))
    }
    const ratio = Math.max(minimum, Math.min(1, maximum))
    if (minimum > maximum || !Number.isFinite(ratio) || ratio <= 0) return null
    const stretchX = Math.max(1, ratio), stretchY = Math.max(1, 1 / ratio)
    const anchor = units[0], origin = interpolated.get(anchor)!, originOffset = offsets.get(anchor)!
    const positions = new Map(units.map(unit => {
      const point = interpolated.get(unit)!, offset = offsets.get(unit)!
      return [unit, { x: origin.x + originOffset.x + (point.x + offset.x - origin.x - originOffset.x) * stretchX - offset.x,
        y: origin.y + originOffset.y + (point.y + offset.y - origin.y - originOffset.y) * stretchY - offset.y }] as const
    }))
    return preservesDirections(relations, positions) ? positions : null
  }
  let fitted = normalize(1)
  if (!fitted) {
    let low = 0, high = 1
    fitted = normalize(0)
    if (!fitted) return null
    for (let i = 0; i < 24; i++) {
      const middle = (low + high) / 2, candidate = normalize(middle)
      if (candidate) { low = middle; fitted = candidate }
      else high = middle
    }
  }
  for (const [unit, position] of fitted) {
    centers.set(unit, { x: position.x + offsets.get(unit)!.x, y: position.y + offsets.get(unit)!.y })
  }
  let scale = 1
  for (const gap of gaps) {
    const distance = centers.get(gap.to)![gap.axis] - centers.get(gap.from)![gap.axis]
    if (distance <= 0) return null
    scale = Math.max(scale, gap.distance / distance)
  }
  forEachCollision((_from, _to, _axis, factor) => { scale = Math.max(scale, factor) })
  if (!Number.isFinite(scale)) return null
  const anchor = centers.get(units[0])!
  const positions = new Map(units.map(unit => {
    const center = centers.get(unit)!, offset = offsets.get(unit)!
    return [unit, { x: anchor.x + (center.x - anchor.x) * scale - offset.x,
      y: anchor.y + (center.y - anchor.y) * scale - offset.y }] as const
  }))
  // A rigid group's internal offsets can contradict its external directions.
  // Reject that case atomically instead of silently merging unrelated cards.
  return preservesDirections(relations, positions) ? positions : null
}

/** Compute positions without changing source nodes, edges, or dimensions. */
export function layoutMindmap(
  nodes: readonly MindmapLayoutNode[],
  edges: readonly MindmapLayoutEdge[],
  options: { childSpacing: number; siblingSpacing: number; fixedGroups?: readonly (readonly string[])[] }
): { positions: Map<string, Position>; rigidNodeIds: Set<string>; rigidGroups: string[][]; fixedNodeIds: Set<string> } {
  if (!Array.isArray(nodes) || !Array.isArray(edges) || !options ||
      !Number.isFinite(options.childSpacing) || !Number.isFinite(options.siblingSpacing)) {
    throw new Error('Invalid mindmap layout input')
  }
  const sourceNodes: readonly MindmapLayoutNode[] = nodes
  const sourceEdges: readonly MindmapLayoutEdge[] = edges
  const ids = new Set<string>()
  for (const node of sourceNodes) {
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id) ||
        ![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 0 || node.height <= 0) {
      throw new Error('Invalid or duplicate mindmap node')
    }
    ids.add(node.id)
  }
  const positions = new Map<string, Position>()
  const rigidNodeIds = new Set<string>()
  const rigidGroups: string[][] = []
  const fixedNodeIds = new Set<string>()
  if (nodes.length === 0) {
    if (options.fixedGroups?.length) throw new Error('Unknown fixed mindmap group')
    return { positions, rigidNodeIds, rigidGroups, fixedNodeIds }
  }

  const childSpacing = Math.ceil(Math.max(0, options.childSpacing))
  const siblingSpacing = Math.ceil(Math.max(0, options.siblingSpacing))
  const units = createUnits(sourceNodes, sourceEdges, options.fixedGroups)
  const nodeById = new Map(sourceNodes.map(node => [node.id, node]))
  const owner = new Map(units.flatMap(unit => unit.members.map(node => [node.id, unit] as const)))
  const relations: UnitRelation[] = []
  const connected = new Set<LayoutUnit>(), hierarchical = new Set<LayoutUnit>()
  for (const edge of sourceEdges) {
    const from = owner.get(edge.fromNode), to = owner.get(edge.toNode)
    if (!from || !to) continue
    connected.add(from)
    connected.add(to)
    const relation = resolveMindmapRelation(edge)
    if (!relation) continue
    const parent = owner.get(relation.parentId), child = owner.get(relation.childId)
    hierarchical.add(from)
    hierarchical.add(to)
    if (parent && child && parent !== child) {
      const parentNode = nodeById.get(relation.parentId)!, childNode = nodeById.get(relation.childId)!
      relations.push({ parent, child, parentNode, childNode, edge, direction: getMindmapEdgeDirection(edge, parentNode, childNode) })
    }
  }
  const fixed = units.filter(unit => connected.has(unit) && !hierarchical.has(unit))
  for (const unit of units) {
    if (unit.members.length > 1 || unit.members[0].type === 'group') {
      const ids = unit.members.map(node => node.id)
      rigidGroups.push(ids)
      ids.forEach(id => rigidNodeIds.add(id))
    }
    if (connected.has(unit) && !hierarchical.has(unit)) for (const node of unit.members) {
      positions.set(node.id, { x: node.x, y: node.y })
      fixedNodeIds.add(node.id)
    }
  }
  const movable = units.filter(unit => !connected.has(unit) || hierarchical.has(unit))
  if (movable.length === 0) return { positions, rigidNodeIds, rigidGroups, fixedNodeIds }
  const origin = bounds(movable)
  const ordered = components(movable).map(members => ({ id: members[0].id, members, ...bounds(members) }))
    .sort((a, b) => a.y - b.y || a.x - b.x || compareId(a, b))
  const reserved: MindmapRect[] = [...fixed]
  let column = origin.x, cursor: number | undefined
  for (const component of ordered) {
    const members = new Set(component.members)
    const connections = relations.filter(relation => members.has(relation.parent))
    const directions = new Set(connections.map(relation => relation.direction))
    const childDirections = new Map<LayoutUnit, MindmapDirection>()
    const compactTree = directions.size > 1 && component.members.every(unit => unit.parents.length <= 1) && connections.every(relation => {
      const previous = childDirections.get(relation.child), hint = getMindmapEdgeDirectionHint(relation.edge)
      childDirections.set(relation.child, relation.direction)
      // Opposite faces on the same axis stay harmless after a card is dragged
      // across its parent; a cross-axis hint can reactivate after centering.
      const sameAxis = !hint || (hint === 'right' || hint === 'left') === (relation.direction === 'right' || relation.direction === 'left')
      return (!previous || previous === relation.direction) && sameAxis
    })
    // Anchor the leading tree; pack later components below its final bounds so
    // a new branch extent cannot change the global origin on the next run.
    const anchored = compactTree && cursor === undefined
    let placed = compactTree
      ? layoutBranchTree(component.members, connections, childSpacing, siblingSpacing, anchored ? reserved : [])
      : directions.size <= 1
      ? layoutDirected(component.members, connections[0]?.direction ?? 'right', childSpacing, siblingSpacing)
      : layoutMixed(component.members, connections, childSpacing, siblingSpacing)
    if (directions.size <= 1 && placed && !preservesDirections(connections, placed)) {
      placed = layoutMixed(component.members, connections, childSpacing, siblingSpacing)
    }
    if (!placed || !preservesDirections(connections, placed)) throw new Error('Conflicting mindmap branch directions')
    const placements = placed
    const rect = bounds(component.members.map(unit => ({ ...unit, ...placements.get(unit)! })))
    const offset = anchored ? { x: 0, y: 0 } : { x: column - rect.x, y: (cursor ?? origin.y) - rect.y }
    if (!anchored) for (const obstacle of [...reserved].sort((a, b) => a.y - b.y)) {
      if (overlaps({ ...rect, x: rect.x + offset.x, y: rect.y + offset.y }, obstacle, siblingSpacing))
        offset.y = obstacle.y + obstacle.height + siblingSpacing - rect.y
    }
    for (const unit of component.members) {
      const position = placed.get(unit)!
      reserved.push({ ...unit, x: position.x + offset.x, y: position.y + offset.y })
      for (const node of unit.members) {
        const next = {
          x: position.x + offset.x + (node.x - unit.x),
          y: position.y + offset.y + (node.y - unit.y)
        }
        if (!Number.isFinite(next.x) || !Number.isFinite(next.y) ||
            !Number.isFinite(next.x + node.width) || !Number.isFinite(next.y + node.height)) {
          throw new Error('Invalid mindmap node position')
        }
        positions.set(node.id, next)
      }
    }
    column = rect.x + offset.x
    cursor = rect.y + offset.y + rect.height + Math.max(60, siblingSpacing)
  }
  return { positions, rigidNodeIds, rigidGroups, fixedNodeIds }
}
