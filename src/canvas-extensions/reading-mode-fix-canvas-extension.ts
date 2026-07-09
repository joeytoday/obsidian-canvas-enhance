import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'

export default class ReadingModeFixCanvasExtension extends CanvasExtension {
  isEnabled() { return 'readingModeFixEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-rendered',
      (_canvas: Canvas, node: CanvasNode) => this.updateNodeRenderer(node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-editing-state-changed',
      (_canvas: Canvas, node: CanvasNode, isEditing: boolean) => {
        if (isEditing) return
        this.updateNodeRenderer(node)
      }
    ))
  }

  private updateNodeRenderer(node: CanvasNode) {
    /* eslint-disable @typescript-eslint/no-explicit-any -- Not making a type for one property */
    const renderer = (node.child as any)?.previewMode?.renderer
    if (!renderer) return

    renderer.onRendered(() => {
      let text = renderer.text ?? ""
      text = text.replace(/\n<span class=vertical-space>&nbsp;<\/span>/g, "\n")
      text = text.replace(/\n/g, "<span class=vertical-space>&nbsp;</span>\n")

      renderer.set(text)
    })
  }
}
