import { Canvas, CanvasEdge, CanvasElement, CanvasView } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'

export default class EdgeHighlightCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'edgeHighlightEnabled' as const }

  private focusedEdges = new Map<Canvas, Set<CanvasEdge>>()

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:selection-changed',
      (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:canvas-view-unloaded:before',
      (view: CanvasView) => this.focusedEdges.delete(view.canvas)
    ))
  }

  private onSelectionChanged(canvas: Canvas) {
    const highlighted = new Set<CanvasEdge>(canvas.getSelectionData().nodes
      .flatMap(nodeData => [
        ...canvas.edgeFrom.get(canvas.nodes.get(nodeData.id)!) ?? [],
        ...(this.plugin.settings.getSetting("highlightIncomingEdges") ?
          canvas.edgeTo.get(canvas.nodes.get(nodeData.id)!) ?? [] :
          []
        )
      ]))
    for (const edge of canvas.edges.values()) {
      if (canvas.selection.has(edge)) highlighted.add(edge)
    }

    // Only touch edges whose highlight state actually changed
    const previous = this.focusedEdges.get(canvas)
    if (previous) {
      for (const edge of previous) {
        if (!highlighted.has(edge)) this.setEdgeHighlighted(edge, false)
      }
    }
    for (const edge of highlighted) {
      if (!previous?.has(edge)) this.setEdgeHighlighted(edge, true)
    }
    this.focusedEdges.set(canvas, highlighted)
  }

  private setEdgeHighlighted(edge: CanvasEdge, highlighted: boolean) {
    edge.lineGroupEl.classList.toggle("is-focused", highlighted)
    edge.lineEndGroupEl?.classList?.toggle("is-focused", highlighted)
    edge.labelElement?.textareaEl?.classList?.toggle("is-focused", highlighted)
  }
}
