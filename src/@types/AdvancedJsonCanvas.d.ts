export * from "assets/formats/advanced-json-canvas/spec/1.0-1.0"

import { CanvasData as OriginalCanvasData, AnyCanvasNodeData as OriginalAnyCanvasNodeData, CanvasNodeData, CanvasGroupNodeData as OriginalCanvasGroupNodeData, CanvasFileNodeData as OriginalCanvasFileNodeData, CanvasEdgeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { CanvasElementsData } from "./Canvas"
import type { MindmapDirection } from 'src/utils/mindmap-direction'

export type AnyCanvasNodeData = CanvasNodeData | CanvasGroupNodeData | CanvasFileNodeData | OriginalAnyCanvasNodeData
export interface CanvasData extends OriginalCanvasData {
  nodes: AnyCanvasNodeData[]
  edges: CanvasEdgeData[]
}

export interface CanvasGroupNodeData extends OriginalCanvasGroupNodeData {
  // Intermediate values that are not saved in the canvas
  collapsedData?: CanvasElementsData
}

export interface CanvasFileNodeData extends OriginalCanvasFileNodeData {
  // Intermediate values that are not saved in the canvas
  isPortalLoaded?: boolean
}

export interface CardContent {
  header?: string
  footer?: string
}

// Plugin-owned data stays separate from the Markdown body and the upstream spec.
declare module "assets/formats/advanced-json-canvas/spec/1.0-1.0" {
  interface CanvasEdgeData {
    mindmapRelation?: boolean
  }
  interface CanvasNodeData {
    cardContent?: CardContent
    mindmapCollapsed?: boolean | MindmapDirection[]
  }
}
