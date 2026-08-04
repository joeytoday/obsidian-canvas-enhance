import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'

// Internal markdown preview renderer shape, not declared in the local typings
type PreviewRendererLike = {
  text?: string
  set(text: string): void
  onRendered(callback: () => void): void
}

export default class ReadingModeFixCanvasExtension extends CanvasExtension {
  isEnabled() { return 'readingModeFixEnabled' as const }

  // node-rendered fires on every render; hooking the same renderer repeatedly accumulates callbacks
  private hookedRenderers = new WeakSet<object>()

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-rendered',
      (_canvas: Canvas, node: CanvasNode) => this.updateNodeRenderer(node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-editing-state-changed',
      (_canvas: Canvas, node: CanvasNode, isEditing: boolean) => {
        if (isEditing) return
        this.updateNodeRenderer(node)
      }
    ))
  }

  private updateNodeRenderer(node: CanvasNode) {
    const renderer = (node.child as unknown as { previewMode?: { renderer?: PreviewRendererLike } })?.previewMode?.renderer
    if (!renderer) return
    if (this.hookedRenderers.has(renderer)) return
    this.hookedRenderers.add(renderer)

    renderer.onRendered(() => {
      let text = renderer.text ?? ""
      text = text.split('<span class="vertical-space">&nbsp;</span>\n').join('\n')
      text = text.split('\n').join('<span class="vertical-space">&nbsp;</span>\n')

      renderer.set(text)
    })
  }
}
