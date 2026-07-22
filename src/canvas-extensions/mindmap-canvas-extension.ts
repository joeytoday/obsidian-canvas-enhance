// LLM Agent: This file was created by an LLM agent as part of integrating Canvas-MindMap features into Canvas Enhance.

import { TFile } from "obsidian"
import { around } from "monkey-around"
import { Canvas, CanvasNode, CanvasView } from "src/@types/Canvas"
import { CanvasEdgeData } from "src/@types/AdvancedJsonCanvas"
import CanvasHelper, { NavDirection, NAV_DIRECTIONS } from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const FLOATING_DIR: Record<NavDirection, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
}

export default class MindmapCanvasExtension extends CanvasExtension {
  private registeredViews: WeakSet<CanvasView> = new WeakSet()
  private cachedParent: { nodeId: string; parentId: string } | null = null

  isEnabled() { return 'mindmapFeatureEnabled' as const }

  init() {
    this.registerCommands()
    this.registerKeyboardShortcuts()
    this.registerDeleteHandler()
    this.patchColorPropagation()
    this.patchMarkdownFileInfo()
  }

  // ── Helpers ──

  private getSelectedNode(canvas: Canvas): CanvasNode | null {
    if (canvas.selection.size !== 1) return null
    const node = canvas.selection.values().next().value as CanvasNode
    return node ?? null
  }

  private focusNode(canvas: Canvas, node: CanvasNode) {
    setTimeout(() => {
      const real = canvas.nodes.get(node.getData().id)
      real?.setIsEditing(true)
      canvas.zoomToSelection()
    }, 0)
  }

  private generateId(): string {
    return Array.from({ length: 16 }, () =>
      (16 * Math.random() | 0).toString(16)
    ).join("")
  }

  private createEdgeData(from: CanvasNode, toId: string): CanvasEdgeData {
    return {
      id: this.generateId(),
      fromNode: from.getData().id,
      fromSide: 'right',
      toNode: toId,
      toSide: 'left',
    }
  }

  private addEdge(canvas: Canvas, edge: CanvasEdgeData) {
    canvas.importData({ nodes: [], edges: [edge] }, false, false)
    canvas.requestSave()
  }

  private childSpacing() { return this.plugin.settings.getSetting('mindmapChildNodeSpacing') }
  private siblingSpacing() { return this.plugin.settings.getSetting('mindmapSiblingNodeSpacing') }

  private getChildNodes(canvas: Canvas, parent: CanvasNode): CanvasNode[] {
    return canvas.getEdgesForNode(parent)
      .filter(e => e.from.node === parent && e.to.side === 'left')
      .map(e => e.to.node)
      .sort((a, b) => a.y - b.y)
  }

  // ── Commands ──

  private registerCommands() {
    const check = (canvas: Canvas) =>
      !canvas.readonly && canvas.getSelectionData().nodes.length === 1

    this.plugin.addCommand({
      id: 'mindmap-create-child-node',
      name: 'Create child node',
      checkCallback: CanvasHelper.canvasCommand(this.plugin, check,
        (canvas) => void this.createChildNode(canvas, true))
    })

    this.plugin.addCommand({
      id: 'mindmap-create-sibling-node',
      name: 'Create sibling node',
      checkCallback: CanvasHelper.canvasCommand(this.plugin, check,
        (canvas) => void this.createSiblingNode(canvas, true))
    })

    this.plugin.addCommand({
      id: 'mindmap-create-floating-node',
      name: 'Create floating node',
      checkCallback: CanvasHelper.canvasCommand(this.plugin, check,
        (canvas) => this.createFloatingNode(canvas, 'right'))
    })

    this.plugin.addCommand({
      id: 'mindmap-split-heading-into-mindmap',
      name: 'Split heading into mindmap based on H1',
      checkCallback: (checking: boolean) => {
        const canvas = this.plugin.getCurrentCanvas()
        if (!canvas || canvas.readonly || canvas.selection.size !== 1) return false
        const node = this.getSelectedNode(canvas)
        if (!node?.file || node.file.extension !== 'md') return false
        if (!checking) this.splitHeadingIntoMindmap(canvas, node, node.file)
        return true
      }
    })
  }

  // ── Keyboard Shortcuts ──

  private registerKeyboardShortcuts() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:canvas-changed',
      (canvas: Canvas) => this.registerScopeShortcuts(canvas)
    ))
  }

  private registerScopeShortcuts(canvas: Canvas) {
    const view = canvas.view
    if (this.registeredViews.has(view)) return
    this.registeredViews.add(view)

    const scope = (view as any).scope
    if (!scope) return

    scope.register([], 'Tab', (ev: KeyboardEvent) => {
      ev.preventDefault()
      const node = this.createChildNode(canvas, false)
      if (node) this.focusNode(canvas, node)
    })

    scope.register([], 'Enter', (ev: KeyboardEvent) => {
      ev.preventDefault()
      const node = this.createSiblingNode(canvas, false)
      if (node) this.focusNode(canvas, node)
    })

    scope.register([], 'Space', (ev: KeyboardEvent) => {
      const node = this.getSelectedNode(canvas)
      if (!node || node.isEditing) return
      ev.preventDefault()
      node.setIsEditing(true)
    })

    if (this.plugin.settings.getSetting('mindmapUseNavigationHotkeys')) {
      for (const dir of NAV_DIRECTIONS) {
        scope.register(['Alt'], `Arrow${dir[0].toUpperCase()}${dir.slice(1)}`,
          () => this.navigate(canvas, dir))
      }
    }

    if (this.plugin.settings.getSetting('mindmapUseFloatingNodeHotkeys')) {
      for (const dir of NAV_DIRECTIONS) {
        const key = `Arrow${dir[0].toUpperCase()}${dir.slice(1)}`
        scope.register(['Mod'], key, () => this.createFloatingNode(canvas, dir))
        scope.register(['Mod', 'Shift'], key, () => {
          const node = this.createChildNode(canvas, true)
          if (node) this.focusNode(canvas, node)
        })
      }
    }
  }

  // ── Delete Handler ──

  private registerDeleteHandler() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:selection-changed',
      (canvas: Canvas) => this.updateCachedParent(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-removed',
      (canvas: Canvas, node: CanvasNode) => this.onNodeRemoved(canvas, node)
    ))
  }

  private updateCachedParent(canvas: Canvas) {
    const node = this.getSelectedNode(canvas)
    if (!node) { this.cachedParent = null; return }

    const incoming = canvas.getEdgesForNode(node).filter(e => e.to.node === node)
    if (incoming.length === 0) { this.cachedParent = null; return }

    this.cachedParent = {
      nodeId: node.getData().id,
      parentId: incoming[0].from.node.getData().id,
    }
  }

  private onNodeRemoved(canvas: Canvas, node: CanvasNode) {
    if (!this.cachedParent || this.cachedParent.nodeId !== node.getData().id) return

    const parent = canvas.nodes.get(this.cachedParent.parentId)
    this.cachedParent = null
    if (!parent) return

    this.rearrangeSiblings(canvas, parent)
    canvas.selectOnly(parent)
    canvas.zoomToSelection()
  }

  // ── Node Creation ──

  private createChildNode(canvas: Canvas, force: boolean): CanvasNode | null {
    const parent = this.getSelectedNode(canvas)
    if (!parent || (parent.isEditing && !force)) return null

    const children = this.getChildNodes(canvas, parent)
    const y = children.length === 0
      ? parent.y
      : children[children.length - 1].y + children[children.length - 1].height + this.siblingSpacing() + 20

    return this.createConnectedNode(canvas, parent, {
      x: parent.x + parent.width + this.childSpacing(),
      y,
    })
  }

  private createSiblingNode(canvas: Canvas, force: boolean): CanvasNode | null {
    const selected = this.getSelectedNode(canvas)
    if (!selected || (selected.isEditing && !force)) return null

    const incoming = canvas.getEdgesForNode(selected).filter(e => e.to.node === selected)
    if (incoming.length === 0) return null

    const parent = incoming[0].from.node
    const node = this.createConnectedNode(canvas, parent, {
      x: parent.x + parent.width + this.childSpacing(),
      y: selected.y + selected.height / 2 + 110,
    })

    this.rearrangeSiblings(canvas, parent)
    return node
  }

  private createConnectedNode(canvas: Canvas, parent: CanvasNode, pos: { x: number; y: number }): CanvasNode | null {
    const created = canvas.createTextNode({
      pos,
      size: { width: parent.width, height: parent.height },
      text: "",
      focus: true,
      save: true,
    })

    this.addEdge(canvas, this.createEdgeData(parent, created.getData().id))

    canvas.deselectAll()
    const real = canvas.nodes.get(created.getData().id)
    if (real) {
      canvas.selectOnly(real)
      real.setIsEditing(true)
    }

    canvas.requestSave()
    canvas.zoomToSelection()
    return real ?? null
  }

  private createFloatingNode(canvas: Canvas, direction: NavDirection): CanvasNode | null {
    const source = this.getSelectedNode(canvas)
    if (!source || source.isEditing) return null

    const { dx, dy } = FLOATING_DIR[direction]
    const offsetX = dx * (source.width + 50)
    const offsetY = dy * (source.height + 100)

    const created = canvas.createTextNode({
      pos: { x: source.x + offsetX, y: source.y + offsetY },
      size: { width: source.width, height: source.height },
      text: "",
      focus: true,
      save: true,
    })

    canvas.requestSave()

    const real = canvas.nodes.get(created.getData().id)
    if (!real) return null

    canvas.selectOnly(real)
    canvas.zoomToSelection()
    setTimeout(() => real.setIsEditing(true), 100)
    return real
  }

  // ── Split Headings ──

  private splitHeadingIntoMindmap(canvas: Canvas, parent: CanvasNode, file: TFile) {
    const headings = this.plugin.app.metadataCache.getFileCache(file)?.headings?.filter(h => h.level === 1)
    if (!headings?.length) return

    const cs = this.childSpacing()
    const ss = this.siblingSpacing()
    const rowHeight = parent.height * 0.6 + ss
    const totalHeight = rowHeight * headings.length

    for (let i = 0; i < headings.length; i++) {
      const y = parent.y + parent.height / 2 + totalHeight / 2 - rowHeight * i
      const fileNode = canvas.createFileNode({
        pos: { x: parent.x + parent.width + cs, y },
        size: { width: parent.width, height: parent.height * 0.6 },
        file,
        subpath: `#${headings[i].heading}`,
        focus: false,
        save: true,
      })
      this.addEdge(canvas, this.createEdgeData(parent, fileNode.getData().id))
    }

    canvas.requestSave()
  }

  // ── Auto-arrange ──

  private rearrangeSiblings(canvas: Canvas, parent: CanvasNode) {
    const ss = this.siblingSpacing()
    const children = this.getChildNodes(canvas, parent)
    if (children.length <= 1) return

    const totalHeight = children.reduce((acc, n) => acc + n.height + ss, 0)
    const startX = children[0].x

    for (let i = 0; i < children.length; i++) {
      const y = i === 0
        ? parent.y + parent.height / 2 - totalHeight / 2
        : children[i - 1].y + children[i - 1].height + ss
      children[i].setData({ ...children[i].getData(), x: startX, y })
    }

    canvas.requestSave()
  }

  // ── Navigation ──

  private navigate(canvas: Canvas, direction: NavDirection) {
    const selected = this.getSelectedNode(canvas)
    if (!selected || selected.isEditing) return

    const candidates = canvas.getViewportNodes().filter(n => n !== selected)
    const target = CanvasHelper.findClosestNode(canvas, direction, candidates)
    if (target) {
      canvas.selectOnly(target)
      canvas.zoomToSelection()
    }
  }

  // ── Patches ──

  private patchColorPropagation() {
    const plugin = this.plugin

    const patch = (): boolean => {
      const view = plugin.app.workspace.getLeavesOfType("canvas").first()?.view as CanvasView
      const canvas = (view as any)?.canvas
      if (!canvas?.nodes?.size) return false

      const sample = canvas.nodes.values().next().value
      if (!sample) return false

      const uninstaller = around(sample.constructor.prototype, {
        setColor: (next: any) =>
          function(this: any, color: any, t: any) {
            next.call(this, color, t)
            if (!plugin.settings.getSetting('mindmapPropagateColorToEdges')) return
            this.canvas.getEdgesForNode(this).forEach((edge: any) => {
              if (edge.from.node === this) {
                edge.setColor(color, true)
                edge.render()
              }
            })
            this.canvas.requestSave()
          }
      })
      plugin.register(uninstaller)
      return true
    }

    plugin.app.workspace.onLayoutReady(() => {
      if (patch()) return
      const evt = plugin.app.workspace.on("layout-change", () => {
        if (patch()) plugin.app.workspace.offref(evt)
      })
      plugin.registerEvent(evt)
    })
  }

  private patchMarkdownFileInfo() {
    const plugin = this.plugin

    const patch = (): boolean => {
      const editor = (plugin.app as any).workspace.activeEditor
      if (!editor?.containerEl) return false

      const uninstaller = around(editor.constructor.prototype, {
        showPreview: (next: any) =>
          function(this: any, e: any) {
            next.call(this, e)
            if (e) {
              this.node?.canvas.wrapperEl.focus()
              this.node?.setIsEditing(false)
            }
          }
      })
      plugin.register(uninstaller)
      return true
    }

    plugin.app.workspace.onLayoutReady(() => {
      if (patch()) return
      const evt = plugin.app.workspace.on("file-open", () => {
        setTimeout(() => { if (patch()) plugin.app.workspace.offref(evt) }, 100)
      })
      plugin.registerEvent(evt)
    })
  }
}
