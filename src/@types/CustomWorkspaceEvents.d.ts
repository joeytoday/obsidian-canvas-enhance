import { Menu } from "obsidian"
import { BBox, Canvas, CanvasEdge, CanvasEdgeEnd, CanvasElement, CanvasNode, CanvasView, Position, SelectionData } from "./Canvas"
import { CanvasData } from "./AdvancedJsonCanvas"

export interface EventRef {
  fn: (...args: any) => any
}

export interface CustomWorkspaceEvents {
  // Plugin events
  'canvas-enhance:settings-changed': () => void

  // Built-in canvas events
  'canvas:selection-menu': (menu: Menu, canvas: Canvas) => void
  'canvas:node-menu': (menu: Menu, node: CanvasNode) => void
  'canvas:edge-menu': (menu: Menu, canvas: Canvas) => void
  'canvas:node-connection-drop-menu': (menu: Menu, canvas: Canvas) => void

  // Custom canvas events
  /** Fired when a new canvas gets loaded */
  'canvas-enhance:canvas-changed': (canvas: Canvas) => void
  /** Fired before the canvas view gets unloaded */
  'canvas-enhance:canvas-view-unloaded:before': (view: CanvasView) => void
  /** Fired when the canvas' metadata gets changed */
  'canvas-enhance:canvas-metadata-changed': (canvas: Canvas) => void
  /** Fired before the viewport gets changed */
  'canvas-enhance:viewport-changed:before': (canvas: Canvas) => void
  /** Fired after the viewport gets changed */
  'canvas-enhance:viewport-changed:after': (canvas: Canvas) => void
  /** Fired when a node gets moved */
  'canvas-enhance:node-moved': (canvas: Canvas, node: CanvasNode, usingKeyboard: boolean) => void
  /** Fired when a node gets resized */
  'canvas-enhance:node-resized': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when the canvas gets double-clicked */
  'canvas-enhance:double-click': (canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) => void
  /** Fired when the dragging state of the canvas changes */
  'canvas-enhance:dragging-state-changed': (canvas: Canvas, isDragging: boolean) => void
  /** Fired when a new node gets created */
  'canvas-enhance:node-created': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when a new edge gets created */
  'canvas-enhance:edge-created': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when a new node gets added */
  'canvas-enhance:node-added': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when a new edge gets added */
  'canvas-enhance:edge-added': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when any node gets changed */
  'canvas-enhance:node-changed': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when any edge gets changed */
  'canvas-enhance:edge-changed': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when any node gets rendered */
  'canvas-enhance:node-rendered': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when the text content of a node gets changed (While typing) */
  'canvas-enhance:node-text-content-changed': (canvas: Canvas, node: CanvasNode, viewUpdate: any) => void
  /** Fired before an existing edge tries to get dragged */
  'canvas-enhance:edge-connection-try-dragging:before': (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, cancelRef: { value: boolean }) => void
  /** Fired before an edge gets dragged */
  'canvas-enhance:edge-connection-dragging:before': (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to', previousEnds?: { from: CanvasEdgeEnd, to: CanvasEdgeEnd }) => void
  /** Fired after an edge gets dragged */
  'canvas-enhance:edge-connection-dragging:after': (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to', previousEnds?: { from: CanvasEdgeEnd, to: CanvasEdgeEnd }) => void
  /** Fired when a node gets deleted */
  'canvas-enhance:node-removed': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when an edge gets deleted */
  'canvas-enhance:edge-removed': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when a selection of the canvas gets copied */
  'canvas-enhance:copy': (canvas: Canvas, selectionData: SelectionData) => void
  /** Fired when the editing state of a node changes */
  'canvas-enhance:node-editing-state-changed': (canvas: Canvas, node: CanvasNode, isEditing: boolean) => void
  /** Fired when the breakpoint of a node changes (decides if the node's content should be loaded) */
  'canvas-enhance:node-breakpoint-changed': (canvas: Canvas, node: CanvasNode, shouldBeLoaded: { value: boolean }) => void
  /** Fired when the bounding box of a node gets requested (e.g. for the edge path or when dragging a group) */
  'canvas-enhance:node-bbox-requested': (canvas: Canvas, node: CanvasNode, bbox: BBox) => void
  /** Fired when the center of an edge gets requested (e.g. for the edge label position) */
  'canvas-enhance:edge-center-requested': (canvas: Canvas, edge: CanvasEdge, position: Position) => void
  /** Fired when the nodes inside a bounding box get requested */
  'canvas-enhance:containing-nodes-requested': (canvas: Canvas, bbox: BBox, nodes: CanvasNode[]) => void
  /** Fired when the selection of the canvas changes */
  'canvas-enhance:selection-changed': (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => void
  /** Fired before the canvas gets zoomed to a bounding box (e.g. zoom to selection, zoom to fit all) */
  'canvas-enhance:zoom-to-bbox:before': (canvas: Canvas, bbox: BBox) => void
  /** Fired after the canvas gets zoomed to a bounding box (e.g. zoom to selection, zoom to fit all) */
  'canvas-enhance:zoom-to-bbox:after': (canvas: Canvas, bbox: BBox) => void
  /** Fired when the a node popup menu gets created (Not firing multiple times if it gets moved between nodes of the same type) */
  'canvas-enhance:popup-menu-created': (canvas: Canvas) => void
  /** Fired when a node gets hovered over */
  'canvas-enhance:node-interaction': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when undo gets called */
  'canvas-enhance:undo': (canvas: Canvas) => void
  /** Fired when redo gets called */
  'canvas-enhance:redo': (canvas: Canvas) => void
  /** Fired when the readonly state of the canvas changes */
  'canvas-enhance:readonly-changed': (canvas: Canvas, readonly: boolean) => void
  /** Fired when the canvas data gets requested */
  'canvas-enhance:data-requested': (canvas: Canvas, data: CanvasData) => void
  /** Fired before the canvas data gets set */
  'canvas-enhance:data-loaded:before': (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => void
  /** Fired after the canvas data gets set */
  'canvas-enhance:data-loaded:after': (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => void
  /** Fired before the canvas gets saved */
  'canvas-enhance:canvas-saved:before': (canvas: Canvas) => void
  /** Fired after the canvas gets saved */
  'canvas-enhance:canvas-saved:after': (canvas: Canvas) => void
}
