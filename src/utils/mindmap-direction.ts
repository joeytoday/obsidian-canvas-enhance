export const MINDMAP_DIRECTIONS = ['right', 'left', 'down', 'up'] as const
export type MindmapDirection = typeof MINDMAP_DIRECTIONS[number]
export interface MindmapRect { x: number; y: number; width: number; height: number }
export interface MindmapEdge {
  fromNode: string
  toNode: string
  fromSide?: string
  toSide?: string
  fromFloating?: boolean
  toFloating?: boolean
  fromEnd?: string
  toEnd?: string
  mindmapRelation?: boolean
}

export function resolveMindmapRelation(edge: Pick<MindmapEdge, 'fromNode' | 'toNode' | 'fromEnd' | 'toEnd' | 'mindmapRelation'>): { parentId: string; childId: string } | null {
  if (edge.mindmapRelation === false) return null
  // JSON Canvas defaults: no arrow at the source, an arrow at the target.
  const fromArrow = edge.fromEnd === 'arrow'
  const toArrow = edge.toEnd === undefined || edge.toEnd === 'arrow'
  if (fromArrow === toArrow) return null
  return fromArrow ? { parentId: edge.toNode, childId: edge.fromNode } : { parentId: edge.fromNode, childId: edge.toNode }
}

export function getDominantDirection(directions: readonly MindmapDirection[]): MindmapDirection {
  const counts = { right: 0, left: 0, down: 0, up: 0 }
  for (const direction of directions) counts[direction]++
  return MINDMAP_DIRECTIONS.reduce((best, direction) => counts[direction] > counts[best] ? direction : best, 'right')
}

export const MINDMAP_SIDES = {
  right: { fromSide: 'right', toSide: 'left' },
  left: { fromSide: 'left', toSide: 'right' },
  down: { fromSide: 'bottom', toSide: 'top' },
  up: { fromSide: 'top', toSide: 'bottom' },
} as const

export function getBranchDirection(parent: MindmapRect, child: MindmapRect, parentSide?: string, childSide?: string): MindmapDirection {
  const dx = child.x + child.width / 2 - parent.x - parent.width / 2
  const dy = child.y + child.height / 2 - parent.y - parent.height / 2
  // Connection faces can preserve a wide branch's axis, but never contradict
  // a card the user moved to the opposite side of its parent.
  if (parentSide === 'right' && childSide === 'left' && dx > 0) return 'right'
  if (parentSide === 'left' && childSide === 'right' && dx < 0) return 'left'
  if (parentSide === 'bottom' && childSide === 'top' && dy > 0) return 'down'
  if (parentSide === 'top' && childSide === 'bottom' && dy < 0) return 'up'
  const separatedX = parent.x + parent.width <= child.x || child.x + child.width <= parent.x
  const separatedY = parent.y + parent.height <= child.y || child.y + child.height <= parent.y
  if (separatedX && !separatedY) return dx < 0 ? 'left' : 'right'
  if (separatedY && !separatedX) return dy < 0 ? 'up' : 'down'
  // Keep diagonal ties stable through layout scaling and translation.
  return Math.abs(dx) / (parent.width + child.width) + 1e-9 >= Math.abs(dy) / (parent.height + child.height)
    ? dx < 0 ? 'left' : 'right'
    : dy < 0 ? 'up' : 'down'
}

export function getMindmapEdgeDirectionHint(edge: MindmapEdge): MindmapDirection | undefined {
  if (edge.fromFloating || edge.toFloating) return undefined
  const reversed = edge.fromEnd === 'arrow' && edge.toEnd === 'none'
  const parentSide = reversed ? edge.toSide : edge.fromSide
  const childSide = reversed ? edge.fromSide : edge.toSide
  return MINDMAP_DIRECTIONS.find(direction => MINDMAP_SIDES[direction].fromSide === parentSide && MINDMAP_SIDES[direction].toSide === childSide)
}

export function getMindmapEdgeDirection(edge: MindmapEdge, parent: MindmapRect, child: MindmapRect): MindmapDirection {
  const hint = getMindmapEdgeDirectionHint(edge)
  return getBranchDirection(parent, child, hint && MINDMAP_SIDES[hint].fromSide, hint && MINDMAP_SIDES[hint].toSide)
}

// Map physical rectangles to a left-to-right layout space; never rotate the DOM.
export function toMindmapRect(rect: MindmapRect, direction: MindmapDirection): MindmapRect {
  const { x, y, width, height } = rect
  switch (direction) {
    case 'left': return { x: -x - width, y, width, height }
    case 'down': return { x: y, y: x, width: height, height: width }
    case 'up': return { x: -y - height, y: x, width: height, height: width }
    default: return { x, y, width, height }
  }
}

export function fromMindmapRect(rect: MindmapRect, direction: MindmapDirection): MindmapRect {
  const { x, y, width, height } = rect
  switch (direction) {
    case 'left': return { x: -x - width, y, width, height }
    case 'down': return { x: y, y: x, width: height, height: width }
    case 'up': return { x: y, y: -x - width, width: height, height: width }
    default: return { x, y, width, height }
  }
}
