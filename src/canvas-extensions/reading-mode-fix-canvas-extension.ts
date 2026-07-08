import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'

export default class ReadingModeFixCanvasExtension extends CanvasExtension {
  isEnabled() { return 'readingModeFixEnabled' as const }

  init() {
    // FIXME: Patch all nodes on canvas open

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-editing-state-changed',
      (_: Canvas, node: CanvasNode, isEditing: boolean) => {
        if (isEditing) return

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
    ))
  }
}
