/* eslint-disable-next-line import/no-extraneous-dependencies -- Included in Obsidian */
import { ViewUpdate } from "@codemirror/view"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasFileNodeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"

const MIN_CONTENT_HEIGHT = "min-content"

export default class AutoResizeNodeCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'autoResizeNodeFeatureEnabled' as const }

  private pendingResizes = new Map<CanvasNode, HTMLElement>()
  private resizeRafId: number | null = null

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-created',
      (canvas: Canvas, node: CanvasNode) => this.onNodeCreated(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-editing-state-changed',
      (canvas: Canvas, node: CanvasNode, editing: boolean) => void this.onNodeEditingStateChanged(canvas, node, editing)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-text-content-changed',
      (canvas: Canvas, node: CanvasNode, viewUpdate: ViewUpdate) => void this.onNodeTextContentChanged(canvas, node, viewUpdate.view.dom)
    ))
  }

  private isValidNodeType(nodeData: CanvasNodeData) {
    return nodeData.type === 'text' || (nodeData.type === 'file' && (nodeData as CanvasFileNodeData).file.endsWith('.md'))
  }

  private onNodeCreated(_canvas: Canvas, node: CanvasNode) {
    const autoResizeNodeEnabledByDefault = this.plugin.settings.getSetting('autoResizeNodeEnabledByDefault')
    if (!autoResizeNodeEnabledByDefault) return

    const nodeData = node.getData()
    if (nodeData.type !== 'text' && nodeData.type !== 'file') return // File extension can still be changed in the future

    node.setData({
      ...node.getData(),
      dynamicHeight: true
    })
  }

  private onPopupMenuCreated(canvas: Canvas) {
    if (canvas.readonly) return

    const selectedNodes = CanvasHelper.getSelectedNodes(canvas)
      .filter(node => this.isValidNodeType(node.getData()))
    if (selectedNodes.length === 0) return

    const autoResizeHeightEnabled = selectedNodes.some(node => node.getData().dynamicHeight)

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'auto-resize-height',
        label: autoResizeHeightEnabled ? '禁用自动调整尺寸' : '启用自动调整尺寸',
        icon: autoResizeHeightEnabled ? 'scan-text' : 'lock',
        callback: () => this.toggleAutoResizeHeightEnabled(canvas, selectedNodes, autoResizeHeightEnabled)
      })
    )
  }

  private toggleAutoResizeHeightEnabled(canvas: Canvas, nodes: CanvasNode[], autoResizeHeight: boolean) {
    nodes.forEach(node => node.setData({
      ...node.getData(),
      dynamicHeight: !autoResizeHeight
    }))

    this.onPopupMenuCreated(canvas)
  }

  private canBeResized(node: CanvasNode) {
    const nodeData = node.getData()
    return nodeData.dynamicHeight
  }

  private async onNodeEditingStateChanged(_canvas: Canvas, node: CanvasNode, editing: boolean) {
    if (!this.isValidNodeType(node.getData())) return
    if (!this.canBeResized(node)) return

    await sleep(10)

    if (editing) {
      const cmDom = node.child?.editMode?.cm?.dom
      if (!cmDom) return
      void this.onNodeTextContentChanged(_canvas, node, cmDom)
      return
    }

    const renderedMarkdownContainer = node.nodeEl.querySelector(".markdown-preview-view.markdown-rendered") as HTMLElement
    if (!renderedMarkdownContainer) return

    renderedMarkdownContainer.style.height = MIN_CONTENT_HEIGHT
    const newHeight = renderedMarkdownContainer.clientHeight
    renderedMarkdownContainer.style.removeProperty("height")

    this.setNodeHeight(node, newHeight)
  }

  private async onNodeTextContentChanged(_canvas: Canvas, node: CanvasNode, dom: HTMLElement) {
    if (!this.isValidNodeType(node.getData())) return
    if (!this.canBeResized(node)) return

    // Coalesce to one measurement per frame while typing
    this.pendingResizes.set(node, dom)
    if (this.resizeRafId !== null) return
    this.resizeRafId = window.requestAnimationFrame(() => {
      this.resizeRafId = null
      for (const [pendingNode, pendingDom] of this.pendingResizes) {
        this.pendingResizes.delete(pendingNode)
        this.resizeFromEditor(pendingNode, pendingDom)
      }
    })
  }

  private resizeFromEditor(node: CanvasNode, dom: HTMLElement) {
    if (!node.nodeEl.isConnected) return

    const cmScroller = dom.querySelector(".cm-scroller") as HTMLElement | null
    if (!cmScroller) return

    cmScroller.style.height = MIN_CONTENT_HEIGHT
    const newHeight = cmScroller.scrollHeight
    cmScroller.style.removeProperty("height")

    this.setNodeHeight(node, newHeight)
  }

  private setNodeHeight(node: CanvasNode, height: number) {
    if (height === 0) return

    // Limit the height to the maximum allowed
    const maxHeight = this.plugin.settings.getSetting('autoResizeNodeMaxHeight')
    if (maxHeight != -1 && height > maxHeight) height = maxHeight

    const nodeData = node.getData()

    height = Math.max(height, node.canvas.config.minContainerDimension)

    if (this.plugin.settings.getSetting('autoResizeNodeSnapToGrid'))
      height = Math.ceil(height / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE

    if (height === nodeData.height) return

    node.setData({
      ...nodeData,
      height: height
    })
  }
}
