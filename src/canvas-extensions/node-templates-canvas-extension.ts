import { Canvas } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { createFileNodeFromTemplate } from "src/utils/file-template-helper"
import CanvasExtension from "./canvas-extension"

export default class NodeTemplatesCanvasExtension extends CanvasExtension {
  isEnabled() { return 'fileNodeTemplateEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'create-file-node-from-template',
      name: '创建模板笔记节点',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        () => !!this.plugin.settings.getSetting('fileNodeTemplatePath'),
        (canvas: Canvas) => {
          const pos = CanvasHelper.getCenterCoordinates(canvas, canvas.config.defaultFileNodeDimensions)
          void createFileNodeFromTemplate(this.plugin, canvas, pos)
        }
      )
    })
  }
}
