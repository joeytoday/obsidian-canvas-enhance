import type { AnyCanvasNodeData, CanvasData, CanvasEdgeData, CanvasFileNodeData, CanvasGroupNodeData } from "src/@types/AdvancedJsonCanvas"

interface NodeEntry {
  node: AnyCanvasNodeData
  parent?: NodeEntry
  depth: number
}

interface EdgeEntry {
  edge: CanvasEdgeData
  depth: number
}

function equalData(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) !== Array.isArray(right)) return false
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key =>
    Object.prototype.hasOwnProperty.call(b, key) && equalData(a[key], b[key]))
}

/**
 * Return a detached logical canvas with all collapsed descendants in absolute
 * coordinates. Native getData only expands one level of collapsedData.
 * Shallower occurrences are authoritative; conflicting copies at the same
 * depth are rejected instead of silently choosing a node or connection.
 */
export function expandCanvasLayoutSnapshot(data: CanvasData): CanvasData {
  const snapshot = JSON.parse(JSON.stringify(data)) as CanvasData
  if (!snapshot || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges))
    throw new Error('Invalid canvas layout snapshot')

  const entries: NodeEntry[] = []
  const edgeEntries: EdgeEntry[] = snapshot.edges.map(edge => ({ edge, depth: 0 }))
  const winners = new Map<string, NodeEntry>()
  const stack: NodeEntry[] = snapshot.nodes.map(node => ({ node, depth: 0 })).reverse()
  while (stack.length > 0) {
    const entry = stack.pop()!
    const { node, depth } = entry
    if (!node || typeof node.id !== 'string' || !node.id ||
        !Number.isFinite(node.x) || !Number.isFinite(node.y))
      throw new Error('Invalid node in canvas layout snapshot')
    for (let ancestor = entry.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor.node.id === node.id) throw new Error(`Recursive collapsed group: ${node.id}`)
    }
    entries.push(entry)
    const winner = winners.get(node.id)
    if (!winner || depth < winner.depth) winners.set(node.id, entry)

    const collapsedData = (node as CanvasGroupNodeData).collapsedData
    if (collapsedData === undefined) continue
    if (node.type !== 'group' || !collapsedData ||
        !Array.isArray(collapsedData.nodes) || !Array.isArray(collapsedData.edges))
      throw new Error(`Invalid collapsed group: ${node.id}`)
    delete (node as CanvasGroupNodeData).collapsedData
    edgeEntries.push(...collapsedData.edges.map(edge => ({ edge, depth: depth + 1 })))
    for (let i = collapsedData.nodes.length - 1; i >= 0; i--)
      stack.push({ node: collapsedData.nodes[i], parent: entry, depth: depth + 1 })
  }

  // Resolve ancestors first. A stale nested copy of a live group must not
  // displace its unique hidden descendants when that live group has moved.
  for (const entry of [...entries].sort((a, b) => a.depth - b.depth)) {
    if (entry.parent) {
      const parent = winners.get(entry.parent.node.id)!.node
      entry.node.x += parent.x
      entry.node.y += parent.y
      if (!Number.isFinite(entry.node.x) || !Number.isFinite(entry.node.y))
        throw new Error(`Invalid collapsed node coordinates: ${entry.node.id}`)
    }
  }
  for (const entry of entries) {
    const winner = winners.get(entry.node.id)!
    if (entry !== winner && entry.depth === winner.depth && !equalData(entry.node, winner.node))
      throw new Error(`Conflicting duplicate canvas node: ${entry.node.id}`)
  }

  const edgeWinners = new Map<string, EdgeEntry>()
  for (const entry of edgeEntries) {
    const { edge, depth } = entry
    if (!edge || typeof edge.id !== 'string' || !edge.id)
      throw new Error('Invalid edge in canvas layout snapshot')
    const winner = edgeWinners.get(edge.id)
    if (!winner || depth < winner.depth) edgeWinners.set(edge.id, entry)
  }
  for (const entry of edgeEntries) {
    const winner = edgeWinners.get(entry.edge.id)!
    if (entry !== winner && entry.depth === winner.depth && !equalData(entry.edge, winner.edge))
      throw new Error(`Conflicting duplicate canvas edge: ${entry.edge.id}`)
  }

  // Keep original top-level order and traversal order for newly exposed nodes.
  // Hidden edges follow the top-level edges.
  snapshot.nodes = entries.filter(entry => winners.get(entry.node.id) === entry).map(entry => entry.node)
  snapshot.edges = edgeEntries.filter(entry => edgeWinners.get(entry.edge.id) === entry).map(entry => entry.edge)
  return snapshot
}

/** Inspect storage too, so a hidden or shadowed portal cannot escape preflight. */
export function hasCanvasLayoutPortal(data: Pick<CanvasData, 'nodes'>): boolean {
  const stack = [...data.nodes]
  const seen = new Set<AnyCanvasNodeData>()
  while (stack.length > 0) {
    const node = stack.pop()!
    if (!node || seen.has(node)) continue
    seen.add(node)
    if (node.id?.startsWith('acportal||')) return true
    if (node.type === 'file') {
      const file = node as CanvasFileNodeData
      if (file.portal || file.interdimensionalEdges?.length) return true
    }
    const nested = (node as CanvasGroupNodeData).collapsedData?.nodes
    if (Array.isArray(nested)) stack.push(...nested)
  }
  return false
}
