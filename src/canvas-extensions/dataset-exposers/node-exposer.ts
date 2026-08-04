import { Canvas, CanvasNode } from "src/@types/Canvas"
import SettingsManager from "src/settings"
import CanvasExtension from "../canvas-extension"
import { CanvasGroupNodeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"
import CanvasWrapperExposerExtension from "./canvas-wrapper-exposer"

const CANVAS_NODE_IFRAME_BODY_CLASS = 'canvas-node-iframe-body'

export function getExposedNodeData(settings: SettingsManager): (keyof CanvasNodeData)[] {
  const exposedData: (keyof CanvasNodeData)[] = []

  if (settings.getSetting('nodeStylingFeatureEnabled')) exposedData.push('styleAttributes')
  if (settings.getSetting('collapsibleGroupsFeatureEnabled')) exposedData.push('collapsed' satisfies keyof CanvasGroupNodeData as keyof CanvasNodeData)
  if (settings.getSetting('portalsFeatureEnabled')) exposedData.push('isPortalLoaded' as keyof CanvasNodeData)

  return exposedData
}

export default class NodeExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  // One observer per iframe body; entering edit mode repeatedly must not accumulate observers
  private observedIframeBodies = new WeakSet<HTMLElement>()

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-changed',
      (_canvas: Canvas, node: CanvasNode) => {
        const nodeData = node?.getData()
        if (!nodeData) return

        this.setDataAttributes(node.nodeEl, nodeData)

        let iframeBody: HTMLElement | null = null
        try { iframeBody = node.nodeEl.querySelector('iframe')?.contentDocument?.body ?? null } catch { /* cross-origin iframe */ }
        if (iframeBody) this.setDataAttributes(iframeBody, nodeData)
      }
    ))

    // Expose data in editing iframe too
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-editing-state-changed',
      (_canvas: Canvas, node: CanvasNode, editing: boolean) => {
        if (!editing) return

        const nodeData = node.getData()
        if (!nodeData) return

        let iframeBody: HTMLElement | null = null
        try { iframeBody = node.nodeEl.querySelector('iframe')?.contentDocument?.body ?? null } catch { return }
        if (!iframeBody) return

        if (!this.observedIframeBodies.has(iframeBody)) {
          this.observedIframeBodies.add(iframeBody)
          iframeBody.classList.add(CANVAS_NODE_IFRAME_BODY_CLASS)
          new MutationObserver(() => iframeBody!.classList.toggle(CANVAS_NODE_IFRAME_BODY_CLASS, true))
            .observe(iframeBody, { attributes: true, attributeFilter: ['class'] })
        }
        this.setDataAttributes(iframeBody, nodeData)

        // Expose wrapper settings in the iframe too
        CanvasWrapperExposerExtension.updateCanvasExposedSettings(this.plugin, iframeBody)
      }
    ))
  }

  private setDataAttributes(element: HTMLElement, nodeData: CanvasNodeData) {
    for (const exposedDataKey of getExposedNodeData(this.plugin.settings)) {
      const datasetPairs = nodeData[exposedDataKey] && typeof nodeData[exposedDataKey] === 'object'
        ? Object.entries(nodeData[exposedDataKey] as Record<string, string>)
        : [[exposedDataKey, nodeData[exposedDataKey]]]

      for (const [key, value] of datasetPairs as [string, string][]) {
        if (!value) delete element.dataset[key]
        else element.dataset[key] = value
      }
    }
  }
}
