import { Side } from "src/@types/AdvancedJsonCanvas"
import { BBox, Canvas, Position } from "src/@types/Canvas"
import CanvasEnhancePlugin from "src/main"

export default abstract class EdgePathfindingMethod {
  constructor(
    protected plugin: CanvasEnhancePlugin,
    protected canvas: Canvas,
    protected fromNodeBBox: BBox,
    protected fromPos: Position,
    protected fromBBoxSidePos: Position,
    protected fromSide: Side,
    protected toNodeBBox: BBox,
    protected toPos: Position,
    protected toBBoxSidePos: Position,
    protected toSide: Side
  ) {}

  abstract getPath(): EdgePath | null
}

export interface EdgePath {
  svgPath: string
  center: Position
  rotateArrows: boolean
}