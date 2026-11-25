import { Canvas } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../canvas-extension"
import { getNodeStyleAttributes, StyleAttribute } from "./style-config"
import { CARD_APPEARANCE_CONTROLS, getCardAppearance } from 'src/settings/card-appearance'

export default class NodeStylesExtension extends CanvasExtension {
  isEnabled() { return 'nodeStylingFeatureEnabled' as const }

  init() {
    const update = () => this.plugin.getCanvases().forEach(canvas => this.updateAppearance(canvas))
    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas-enhance:settings-changed', update))
    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas-enhance:canvas-changed', canvas => this.updateAppearance(canvas)))
    this.plugin.register(() => {
      for (const canvas of this.plugin.getCanvases())
        for (const control of CARD_APPEARANCE_CONTROLS) canvas.wrapperEl.style.removeProperty(control.cssVariable)
    })
    update()
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  private updateAppearance(canvas: Canvas) {
    const values = getCardAppearance(this.plugin.settings.getSetting('cardAppearance'))
    for (const control of CARD_APPEARANCE_CONTROLS)
      canvas.wrapperEl.style.setProperty(control.cssVariable, `${values[control.key]}${control.unit ?? ''}`)
  }

  private onPopupMenuCreated(canvas: Canvas): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectionNodeData.length === 0 || selectionNodeData.length !== canvas.selection.size)
      return

    const selectedNodeTypes = new Set(selectionNodeData.map(node => node.type))
    const availableNodeStyles = getNodeStyleAttributes(this.plugin.settings.getSetting('customNodeStyleAttributes'), this.plugin.settings.nodeCssStylesManager.getStyles())
      .filter(style => !style.nodeTypes || style.nodeTypes.some(type => selectedNodeTypes.has(type)))

    CanvasHelper.addStyleAttributesToPopup(
      canvas, availableNodeStyles,
      { ...selectionNodeData[0].styleAttributes },
      (attribute, value) => this.setStyleAttributeForSelection(canvas, attribute, value)
    )
  }

  private setStyleAttributeForSelection(canvas: Canvas, attribute: StyleAttribute, value: string | null): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    for (const nodeData of selectionNodeData) {
      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue

      // Only apply the attribute if the node type is allowed
      if (attribute.nodeTypes && !attribute.nodeTypes.includes(nodeData.type)) continue

      node.setData({
        ...nodeData,
        styleAttributes: {
          ...nodeData.styleAttributes,
          [attribute.key]: value
        }
      })
    }

    canvas.pushHistory(canvas.getData())
  }
}
