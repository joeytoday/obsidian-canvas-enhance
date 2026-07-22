import { Canvas, CanvasNode, CanvasView } from 'src/@types/Canvas'
import { CanvasFileNodeData, CanvasTextNodeData } from 'src/@types/AdvancedJsonCanvas'
import CanvasExtension from './canvas-extension'

const OVERLAY_CLASS = 'ce-overview-overlay'
const TEXT_CLASS = 'ce-overview-text'
const MIN_FONT_SIZE = 8
const MAX_GROUP_LABEL_SCALE = 4
const CARD_PADDING = 8

export default class OverviewModeCanvasExtension extends CanvasExtension {
  isEnabled() { return 'overviewModeFeatureEnabled' as const }

  private overlayEls = new Map<CanvasNode, HTMLElement>()
  private titleCache = new Map<CanvasNode, string>()
  private activeCanvases = new Set<HTMLElement>()
  private rafIds = new Map<HTMLElement, number>()

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:viewport-changed:after',
      (canvas: Canvas) => this.scheduleUpdate(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-rendered',
      (_canvas: Canvas, node: CanvasNode) => {
        if (this.activeCanvases.has(node.canvas.wrapperEl)) void this.updateNodeOverlay(node)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-changed',
      (_canvas: Canvas, node: CanvasNode) => {
        this.titleCache.delete(node)
        if (this.activeCanvases.has(node.canvas.wrapperEl)) void this.updateNodeOverlay(node)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-text-content-changed',
      (_canvas: Canvas, node: CanvasNode) => {
        this.titleCache.delete(node)
        if (this.activeCanvases.has(node.canvas.wrapperEl)) void this.updateNodeOverlay(node)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-resized',
      (_canvas: Canvas, node: CanvasNode) => {
        if (this.activeCanvases.has(node.canvas.wrapperEl)) void this.updateNodeOverlay(node)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-removed',
      (_canvas: Canvas, node: CanvasNode) => {
        this.removeOverlay(node)
        this.titleCache.delete(node)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:canvas-view-unloaded:before',
      (view: CanvasView) => this.cleanupCanvas(view.canvas)
    ))
  }

  private scheduleUpdate(canvas: Canvas) {
    const wrapperEl = canvas.wrapperEl
    const existing = this.rafIds.get(wrapperEl)
    if (existing !== undefined) window.cancelAnimationFrame(existing)
    this.rafIds.set(wrapperEl, window.requestAnimationFrame(() => {
      this.rafIds.delete(wrapperEl)
      this.update(canvas)
    }))
  }

  private cleanupCanvas(canvas: Canvas) {
    const wrapperEl = canvas.wrapperEl
    const rafId = this.rafIds.get(wrapperEl)
    if (rafId !== undefined) {
      window.cancelAnimationFrame(rafId)
      this.rafIds.delete(wrapperEl)
    }
    this.activeCanvases.delete(wrapperEl)
    wrapperEl.classList.remove('ce-overview-active')
    for (const node of canvas.nodes.values()) {
      this.removeOverlay(node)
      this.titleCache.delete(node)
    }
  }

  private getZoom(canvas: Canvas): number {
    return Math.pow(2, canvas.tZoom)
  }

  private update(canvas: Canvas) {
    this.updateGroupLabelScale(canvas)

    const threshold = this.plugin.settings.getSetting('overviewModeZoomThreshold')
    const shouldActivate = this.getZoom(canvas) < threshold
    const isActive = this.activeCanvases.has(canvas.wrapperEl)

    if (shouldActivate !== isActive) {
      if (shouldActivate) {
        this.activeCanvases.add(canvas.wrapperEl)
        canvas.wrapperEl.classList.add('ce-overview-active')
        for (const node of canvas.nodes.values()) void this.updateNodeOverlay(node)
      } else {
        this.activeCanvases.delete(canvas.wrapperEl)
        canvas.wrapperEl.classList.remove('ce-overview-active')
        for (const node of canvas.nodes.values()) this.removeOverlay(node)
      }
    }
  }

  private updateGroupLabelScale(canvas: Canvas) {
    if (!this.plugin.settings.getSetting('overviewModeGroupLabelScale')) {
      canvas.wrapperEl.style.removeProperty('--ce-group-label-scale')
      return
    }

    const zoom = this.getZoom(canvas)
    const scale = zoom < 1
      ? Math.min(1 / zoom, MAX_GROUP_LABEL_SCALE)
      : 1
    canvas.wrapperEl.style.setProperty('--ce-group-label-scale', `${scale}`)
  }

  private async updateNodeOverlay(node: CanvasNode) {
    const nodeData = node.getData()
    if (nodeData.type === 'group' || nodeData.type === 'link') return

    const title = await this.getTitle(node)
    // The node may have been removed or the canvas deactivated while awaiting the title
    if (!node.canvas.nodes.has(node.id)) return
    if (!this.activeCanvases.has(node.canvas.wrapperEl)) return

    if (!title) {
      this.removeOverlay(node)
      return
    }

    let overlay = this.overlayEls.get(node)
    if (!overlay) {
      overlay = activeDocument.createElement('div')
      overlay.className = OVERLAY_CLASS
      this.overlayEls.set(node, overlay)
      node.nodeEl.appendChild(overlay)
    }

    let textEl = overlay.querySelector(`.${TEXT_CLASS}`) as HTMLElement
    if (!textEl) {
      textEl = activeDocument.createElement('div')
      textEl.className = TEXT_CLASS
      overlay.appendChild(textEl)
    }

    this.applyNodeColor(overlay, node.color)
    textEl.textContent = title
    this.fitText(textEl, node.width, node.height)
  }

  private applyNodeColor(overlay: HTMLElement, color: string | undefined) {
    if (!color) {
      overlay.classList.remove('ce-overview-colored')
      overlay.style.removeProperty('--ce-overview-node-color')
      return
    }
    // Preset colors 1-6 resolve via Obsidian's --canvas-color-N variables; custom colors are used as-is
    const colorValue = /^[1-6]$/.test(color) ? `rgb(var(--canvas-color-${color}))` : color
    overlay.style.setProperty('--ce-overview-node-color', colorValue)
    overlay.classList.add('ce-overview-colored')
  }

  private async getTitle(node: CanvasNode): Promise<string | null> {
    const cached = this.titleCache.get(node)
    if (cached !== undefined) return cached || null

    const nodeData = node.getData()
    let title: string | null = null

    if (nodeData.type === 'text') {
      const textData = nodeData as CanvasTextNodeData
      title = this.extractFirstHeading(textData.text ?? node.child?.data ?? '')
    } else if (nodeData.type === 'file') {
      const fileData = nodeData as CanvasFileNodeData
      const mode = this.plugin.settings.getSetting('overviewModeFileNodeTitle')

      if (mode === 'filename' || !fileData.file?.endsWith('.md')) {
        title = node.file?.basename
          ?? fileData.file?.split('/').pop()?.replace(/\.\w+$/, '')
          ?? null
      } else {
        const file = node.file
        if (file) {
          try {
            const content = await this.plugin.app.vault.cachedRead(file)
            title = this.extractFirstLine(content) ?? file.basename
          } catch {
            title = file.basename
          }
        }
      }
    }

    this.titleCache.set(node, title ?? '')
    return title
  }

  private extractFirstHeading(text: string): string | null {
    const lines = text.split('\n')
    for (let i = this.frontmatterEnd(lines); i < lines.length; i++) {
      const match = lines[i].trim().match(/^#{1,6}\s+(.+)/)
      if (match) return match[1].replace(/\s+#+\s*$/, '')
    }
    return this.extractFirstLine(text)
  }

  private extractFirstLine(text: string): string | null {
    const lines = text.split('\n')
    for (let i = this.frontmatterEnd(lines); i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (!trimmed) continue
      const cleaned = trimmed.replace(/^#{1,6}\s+/, '')
      if (cleaned) return cleaned
    }
    return null
  }

  private frontmatterEnd(lines: string[]): number {
    if (lines[0]?.trim() !== '---') return 0
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') return i + 1
    }
    return 0
  }

  private fitText(textEl: HTMLElement, cardWidth: number, cardHeight: number) {
    const availW = cardWidth - CARD_PADDING * 2
    const availH = cardHeight - CARD_PADDING * 2
    if (availW <= 0 || availH <= 0) return

    // Constrain width so text wraps, then binary-search the largest font that fits height
    textEl.style.width = `${availW}px`

    const maxFontSize = this.plugin.settings.getSetting('overviewModeMaxFontSize')
    let lo = MIN_FONT_SIZE
    let hi = Math.min(Math.max(availW, availH), maxFontSize)
    if (hi < lo) lo = hi

    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)
      textEl.style.fontSize = `${mid}px`

      if (textEl.scrollHeight <= availH) {
        lo = mid
      } else {
        hi = mid
      }
    }

    textEl.style.fontSize = `${lo}px`
  }

  private removeOverlay(node: CanvasNode) {
    const overlay = this.overlayEls.get(node)
    if (overlay) {
      overlay.remove()
      this.overlayEls.delete(node)
    }
  }
}
