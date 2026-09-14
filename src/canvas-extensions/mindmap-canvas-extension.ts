// LLM Agent: This file was created by an LLM agent as part of integrating Canvas-MindMap features into Canvas Enhance.

import { Notice, Platform, setIcon, setTooltip, TFile } from "obsidian"
import type { MarkdownFileInfo, Scope } from "obsidian"
import { around } from "monkey-around"
import { Canvas, CanvasNode, CanvasView } from "src/@types/Canvas"
import { CanvasData, CanvasEdgeData, CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper, { NavDirection, NAV_DIRECTIONS } from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { measureNodeContentHeight } from "./auto-resize-node-canvas-extension"
import { isMindmapEdge, layoutMindmap } from "src/utils/mindmap-layout"
import { expandCanvasLayoutSnapshot, hasCanvasLayoutPortal } from "src/utils/canvas-layout-snapshot"

const FLOATING_DIR: Record<NavDirection, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
}

type Rect = { x: number; y: number; width: number; height: number }
type CollapseState = { collapsed?: boolean; mindmapCollapsed?: boolean }

// Structural shapes for private Obsidian APIs missing from the local typings;
// type aliases (not interfaces) to satisfy monkey-around's Record<string, any> constraint
type ViewWithScope = { scope?: Scope }
// The real setColor takes an optional silent flag that Canvas.d.ts omits
type NodeSetColorPrototype = {
  setColor(this: CanvasNode, color: string | undefined, silent?: boolean): void
}
type EdgeWithSetColor = {
  setColor(color: string | undefined, silent?: boolean): void
}
// containerEl is not declared on MarkdownFileInfo
type ActiveEditorLike = MarkdownFileInfo & { containerEl: HTMLElement }
// `node` is the canvas file node hosting the markdown when opened from a canvas
type MarkdownEditorWithNode = {
  node?: CanvasNode | null
}
type ShowPreviewPrototype = {
  showPreview(this: MarkdownEditorWithNode, e?: unknown): void
}

export default class MindmapCanvasExtension extends CanvasExtension {
  private registeredViews: WeakSet<CanvasView> = new WeakSet()
  private cachedParent: { nodeId: string; parentId: string } | null = null
  private rearranging = new WeakSet<Canvas>()
  private unloaded = false

  isEnabled() { return 'mindmapFeatureEnabled' as const }

  init() {
    this.plugin.register(() => { this.unloaded = true })
    this.registerCommands()
    this.registerKeyboardShortcuts()
    this.registerDeleteHandler()
    this.registerCardMenu()
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
    window.setTimeout(() => {
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
      .filter(e => e.from.node === parent && isMindmapEdge(e.getData()))
      .map(e => e.to.node)
      .sort((a, b) => a.y - b.y)
  }

  // ── Mindmap order ──

  // DFS emission order of the mindmap forest (children sorted by y)
  private layoutOrder(canvas: Canvas) {
    const nodes = [...canvas.nodes.values()].filter(n => n.getData().type !== 'group')
    const byId = new Map(nodes.map(n => [n.getData().id, n]))

    const childrenOf = new Map<string, CanvasNode[]>()
    const incoming = new Set<string>()
    for (const edge of canvas.edges.values()) {
      if (!isMindmapEdge(edge.getData())) continue
      const fromId = edge.from.node.getData().id, toId = edge.to.node.getData().id
      if (!byId.has(fromId) || !byId.has(toId)) continue
      incoming.add(toId)
      const list = childrenOf.get(fromId)
      if (list) list.push(edge.to.node)
      else childrenOf.set(fromId, [edge.to.node])
    }
    for (const list of childrenOf.values()) list.sort((a, b) => a.y - b.y)

    const order: CanvasNode[] = []
    const indexOf = new Map<string, number>()
    const subtreeEnd = new Map<string, number>()
    const depthOf = new Map<string, number>()
    const visited = new Set<string>()
    const visit = (node: CanvasNode, depth: number) => {
      const id = node.getData().id
      if (visited.has(id)) return
      visited.add(id)
      depthOf.set(id, depth)
      indexOf.set(id, order.length)
      order.push(node)
      for (const child of childrenOf.get(id) ?? []) visit(child, depth + 1)
      subtreeEnd.set(id, order.length - 1)
    }
    for (const root of nodes.filter(n => !incoming.has(n.getData().id)).sort((a, b) => a.y - b.y))
      visit(root, 0)

    return { order, indexOf, subtreeEnd, depthOf }
  }

  // Bottom (+ spacing) of same-depth nodes emitted before `cut`; a new node at
  // that depth must start below it so subtree blocks stay contiguous
  private minTopBelow(layout: { order: CanvasNode[]; depthOf: Map<string, number> }, cut: number, depth: number): number {
    let bottom = -Infinity
    for (let i = 0; i < cut && i < layout.order.length; i++) {
      const n = layout.order[i]
      if (layout.depthOf.get(n.getData().id) !== depth) continue
      bottom = Math.max(bottom, n.y + n.height)
    }
    return bottom + this.siblingSpacing()
  }

  // ── Collision avoidance ──

  private intersects(a: Rect, b: Rect): boolean {
    const m = this.siblingSpacing()
    return a.x < b.x + b.width && a.x + a.width > b.x &&
      a.y - m < b.y + b.height && a.y + a.height + m > b.y
  }

  // Pushes any node intersecting `rect` (with its subtree) below it, cascading
  private makeSpace(canvas: Canvas, rect: Rect, exclude: Set<string>) {
    const hit = [...canvas.nodes.values()].find(
      n => !exclude.has(n.getData().id) && this.intersects(rect, n))
    if (!hit) return
    const delta = rect.y + rect.height + this.siblingSpacing() - hit.y
    const moved = this.moveSubtree(canvas, hit, delta, exclude)
    for (const n of moved.sort((a, b) => a.y - b.y)) {
      this.makeSpace(canvas, { x: n.x, y: n.y, width: n.width, height: n.height }, exclude)
    }
  }

  private moveSubtree(canvas: Canvas, node: CanvasNode, delta: number, exclude: Set<string>): CanvasNode[] {
    const moved: CanvasNode[] = []
    const stack = [node]
    while (stack.length) {
      const n = stack.pop() as CanvasNode
      const id = n.getData().id
      if (exclude.has(id)) continue
      exclude.add(id)
      n.setData({ ...n.getData(), y: n.y + delta })
      moved.push(n)
      for (const e of canvas.getEdgesForNode(n)) {
        if (e.from.node === n && isMindmapEdge(e.getData())) stack.push(e.to.node)
      }
    }
    return moved
  }

  // ── Commands ──

  private registerCommands() {
    const check = (canvas: Canvas) =>
      !canvas.readonly && canvas.getSelectionData().nodes.length === 1

    this.plugin.addCommand({
      id: 'mindmap-create-child-node',
      name: '创建下级节点',
      checkCallback: CanvasHelper.canvasCommand(this.plugin, check,
        (canvas) => void this.createChildNode(canvas, true))
    })

    this.plugin.addCommand({
      id: 'mindmap-create-sibling-node',
      name: '创建同级节点',
      checkCallback: CanvasHelper.canvasCommand(this.plugin, check,
        (canvas) => void this.createSiblingNode(canvas, true))
    })

    this.plugin.addCommand({
      id: 'mindmap-create-floating-node',
      name: '创建浮动节点',
      checkCallback: CanvasHelper.canvasCommand(this.plugin, check,
        (canvas) => this.createFloatingNode(canvas, 'right'))
    })

    this.plugin.addCommand({
      id: 'mindmap-split-heading-into-mindmap',
      name: '按 H1 标题拆分为思维导图',
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

    const scope = (view as ViewWithScope).scope
    if (!scope) return

    if (!Platform.isMobile) {
      scope.register([], 'Tab', (ev: KeyboardEvent) => {
        if (!this.plugin.settings.getSetting('mindmapFeatureEnabled')) return
        const node = this.getSelectedNode(canvas)
        if (canvas.readonly || !node || node.isEditing) return
        ev.preventDefault()
        const child = this.createChildNode(canvas, false)
        if (child) this.focusNode(canvas, child)
      })

      scope.register([], 'Enter', (ev: KeyboardEvent) => {
        if (!this.plugin.settings.getSetting('mindmapFeatureEnabled')) return
        const node = this.getSelectedNode(canvas)
        if (canvas.readonly || !node || node.isEditing) return
        ev.preventDefault()
        const sibling = this.createSiblingNode(canvas, false)
        if (sibling) this.focusNode(canvas, sibling)
      })

      scope.register([], 'Space', (ev: KeyboardEvent) => {
        if (!this.plugin.settings.getSetting('mindmapFeatureEnabled')) return
        const node = this.getSelectedNode(canvas)
        if (canvas.readonly || !node || node.isEditing) return
        ev.preventDefault()
        node.setIsEditing(true)
      })
    }

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
    const desired = children.length === 0
      ? parent.y
      : children[children.length - 1].y + children[children.length - 1].height + this.siblingSpacing() + 20

    // Keep the new child below every same-column node that precedes it in the
    // mindmap order (e.g. the subtrees of its parent's previous siblings)
    const layout = this.layoutOrder(canvas)
    const parentId = parent.getData().id
    const lastChild = children[children.length - 1]
    const cut = lastChild
      ? (layout.subtreeEnd.get(lastChild.getData().id) ?? 0) + 1
      : (layout.indexOf.get(parentId) ?? 0) + 1
    const y = Math.max(desired,
      this.minTopBelow(layout, cut, (layout.depthOf.get(parentId) ?? 0) + 1))

    const x = parent.x + parent.width + this.childSpacing()
    this.makeSpace(canvas, { x, y, width: parent.width, height: parent.height },
      new Set([parentId]))

    return this.createConnectedNode(canvas, parent, { x, y })
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
    window.setTimeout(() => real.setIsEditing(true), 100)
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

    const exclude = new Set([parent.getData().id, ...children.map(c => c.getData().id)])
    const totalHeight = children.reduce((acc, n) => acc + n.height + ss, 0)
    const startX = children[0].x
    const width = children[0].width

    // keep the stack below same-column nodes that precede it in the mindmap
    // order, then shift past foreign nodes hanging into its top
    const layout = this.layoutOrder(canvas)
    const parentId = parent.getData().id
    let startY = Math.max(
      parent.y + parent.height / 2 - totalHeight / 2,
      this.minTopBelow(layout, (layout.indexOf.get(parentId) ?? 0) + 1, (layout.depthOf.get(parentId) ?? 0) + 1))
    for (let guard = 0; guard < 100; guard++) {
      const stack: Rect = { x: startX, y: startY, width, height: totalHeight }
      const above = [...canvas.nodes.values()].find(n =>
        !exclude.has(n.getData().id) && this.intersects(stack, n) &&
        n.y + n.height / 2 < startY + totalHeight / 2)
      if (!above) break
      startY = above.y + above.height + ss
    }

    for (let i = 0; i < children.length; i++) {
      const y = i === 0
        ? startY
        : children[i - 1].y + children[i - 1].height + ss
      children[i].setData({ ...children[i].getData(), x: startX, y })
    }

    this.makeSpace(canvas, { x: startX, y: startY, width, height: totalHeight }, exclude)
    canvas.requestSave()
  }

  // ── Card Menu ──

  private registerCardMenu() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:canvas-changed',
      (canvas: Canvas) => {
        const button = activeDocument.createElement('div')
        button.id = 'mindmap-rearrange-all'
        button.classList.add('canvas-card-menu-button', 'mod-draggable')
        setIcon(button, 'folder-tree')
        setTooltip(button, '整体重排', { placement: 'top' })
        button.addEventListener('click', () => {
          if (!canvas.readonly) void this.rearrangeMindmap(canvas, button)
        })
        CanvasHelper.addCardMenuOption(canvas, button)
      }
    ))
  }

  // ── Auto-layout ──

  private async rearrangeMindmap(canvas: Canvas, button?: HTMLElement) {
    if (this.unloaded || canvas.readonly || this.rearranging.has(canvas)) return
    if (canvas.isDragging || [...canvas.nodes.values()].some(node => node.isEditing)) {
      new Notice('请先结束卡片编辑或拖动，再进行整体重排。')
      return
    }

    if (!this.supportsRearrangement(canvas)) return
    const file = canvas.view.file
    if (!file || canvas.nodes.size === 0) return
    const viewport = { x: canvas.tx, y: canvas.ty, zoom: canvas.tZoom }
    let layoutViewport = viewport
    let applied = false
    const sameCanvas = () => !this.unloaded && canvas.view.file === file &&
      canvas.view.canvas === canvas && canvas.wrapperEl.isConnected
    const sameViewport = () => canvas.tx === layoutViewport.x &&
      canvas.ty === layoutViewport.y && canvas.tZoom === layoutViewport.zoom
    const canContinue = () => sameCanvas() && !canvas.readonly && !canvas.isDragging &&
      ![...canvas.nodes.values()].some(node => node.isEditing) && sameViewport()

    this.rearranging.add(canvas)
    button?.setAttribute('aria-busy', 'true')
    try {
      // Let pending editor/auto-height work finish before freezing the input.
      await sleep(10)
      if (!await this.waitForLayoutFrame(canvas) || !canContinue() || !this.supportsRearrangement(canvas)) return
      const serialized = JSON.stringify(canvas.getData())
      const before = expandCanvasLayoutSnapshot(JSON.parse(serialized) as CanvasData)
      if (before.nodes.length === 0) return
      const options = { childSpacing: this.childSpacing(), siblingSpacing: this.siblingSpacing() }
      const initialLayout = layoutMindmap(before.nodes, before.edges, options)

      // Mount offscreen cards without changing any saved node geometry.
      canvas.zoomToRealBbox(CanvasHelper.getBBox(before.nodes))
      canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom)
      layoutViewport = { x: canvas.tx, y: canvas.ty, zoom: canvas.tZoom }
      const heights = await this.measureLayoutHeights(canvas, before, initialLayout.rigidNodeIds, canContinue)
      if (!heights || !canContinue()) return
      if (JSON.stringify(canvas.getData()) !== serialized ||
        this.childSpacing() !== options.childSpacing || this.siblingSpacing() !== options.siblingSpacing) {
        new Notice('画布在重排期间发生变化，请重新重排。')
        return
      }

      const after: CanvasData = {
        ...before,
        nodes: before.nodes.map(node => ({ ...node, height: heights.get(node.id) ?? node.height })),
      }
      const result = heights.size > 0 ? layoutMindmap(after.nodes, after.edges, {
        ...options, fixedGroups: initialLayout.rigidGroups,
      }) : initialLayout
      let changed = false
      after.nodes = after.nodes.map((node, index) => {
        const position = result.positions.get(node.id)!
        const original = before.nodes[index]
        const x = Math.abs(position.x - original.x) < 1e-6 ? original.x : position.x
        const y = Math.abs(position.y - original.y) < 1e-6 ? original.y : position.y
        changed ||= x !== original.x || y !== original.y || node.height !== original.height
        return { ...node, x, y }
      })
      if (!changed) return

      this.applyMindmapLayout(canvas, before, after)
      applied = true
      const visible = [...canvas.nodes.values()].filter(node => node.nodeEl.getClientRects().length > 0)
      if (visible.length > 0) {
        canvas.zoomToRealBbox(BBoxHelper.enlargeBBox(CanvasHelper.getBBox(visible.map(node => node.getData())), 20))
        canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom)
      }
    } catch (error) {
      console.error('Failed to rearrange canvas:', error)
      new Notice('重排失败，请查看控制台。')
    } finally {
      // Preserve a viewport the user changed during the asynchronous measurement.
      if (!applied && sameCanvas() && sameViewport())
        canvas.setViewport(viewport.x, viewport.y, viewport.zoom)
      this.rearranging.delete(canvas)
      button?.removeAttribute('aria-busy')
    }
  }

  private supportsRearrangement(canvas: Canvas): boolean {
    // Portal projections still need a separate adapter. Inspect stored children
    // too: a closed group can hide a portal from the live node map.
    const nodes = [...canvas.nodes.values()].map(node => node.getData())
    if (hasCanvasLayoutPortal({ nodes })) {
      new Notice('含传送门的画布暂不支持整体重排，卡片未移动。')
      return false
    }
    return true
  }

  private waitForLayoutFrame(canvas: Canvas): Promise<boolean> {
    const win = canvas.wrapperEl.ownerDocument.defaultView
    if (!win) return Promise.resolve(false)
    return new Promise(resolve => {
      const timeout = window.setTimeout(() => {
        win.cancelAnimationFrame(frame)
        resolve(false)
      }, 1000)
      const frame = win.requestAnimationFrame(() => {
        window.clearTimeout(timeout)
        resolve(true)
      })
    })
  }

  private async measureLayoutHeights(
    canvas: Canvas,
    data: CanvasData,
    rigidNodeIds: Set<string>,
    canContinue: () => boolean,
  ): Promise<Map<string, number> | null> {
    const heights = new Map<string, number>()
    const candidates = data.nodes.filter(node => !rigidNodeIds.has(node.id) && !node.ratio &&
      (node.type === 'text' || (node.type === 'file' && (node as CanvasFileNodeData).file.endsWith('.md'))))
    await sleep(10)
    const start = performance.now()
    while (canContinue() && performance.now() - start < 1000 && candidates.some(data => {
      const node = canvas.nodes.get(data.id)
      return node?.nodeEl.isConnected && !node.nodeEl.classList.contains('ce-mindmap-hidden') &&
        (node.initialized === false || node.isContentMounted === false)
    })) await sleep(10)
    // Rendering during the wait can queue another auto-height frame. Flush it
    // before measuring; the caller then rejects a snapshot that changed.
    if (!await this.waitForLayoutFrame(canvas) || !canContinue()) return null

    const padding = this.plugin.settings.getSetting('autoResizeNodeVerticalPadding')
    const maxHeight = this.plugin.settings.getSetting('autoResizeNodeMaxHeight')
    for (const data of candidates) {
      const node = canvas.nodes.get(data.id)
      if (!node?.nodeEl.isConnected || node.initialized === false || node.isContentMounted === false ||
        node.nodeEl.getClientRects().length === 0) continue
      const measured = measureNodeContentHeight(node)
      if (measured === null || !Number.isFinite(measured) || measured <= 0) continue
      let height = measured + padding
      if (maxHeight !== -1) height = Math.min(height, maxHeight)
      height = Math.max(height, canvas.config.minContainerDimension)
      if (Number.isFinite(height) && height > 0 && Math.abs(height - data.height) >= 1e-6)
        heights.set(data.id, height)
    }
    return heights
  }

  private applyMindmapLayout(canvas: Canvas, before: CanvasData, after: CanvasData) {
    // Flush pending edits and make the current history item match the on-screen
    // state. Native history.push does not deduplicate entries.
    canvas.overrideHistory()
    const history = { data: [...canvas.history.data], current: canvas.history.current }
    try {
      // Group import hooks fold nodes into collapsedData in-place. Keep the
      // logical plan intact for validation and for a possible rollback.
      canvas.importData(JSON.parse(JSON.stringify(after)) as CanvasData, true)
      const actual = expandCanvasLayoutSnapshot(canvas.getData())
      const nodes = new Map(actual.nodes.map(node => [node.id, node]))
      const edges = new Map(actual.edges.map(edge => [edge.id, edge]))
      const geometryMatches = after.nodes.length === actual.nodes.length && after.nodes.every(expected => {
        const node = nodes.get(expected.id)
        return node && node.type === expected.type &&
          (node as CollapseState).collapsed === (expected as CollapseState).collapsed &&
          (node as CollapseState).mindmapCollapsed === (expected as CollapseState).mindmapCollapsed &&
          (['x', 'y', 'width', 'height'] as const).every(key =>
          Math.abs(node[key] - expected[key]) < 1e-6)
      })
      const connectionsMatch = after.edges.length === actual.edges.length && after.edges.every(expected => {
        const edge = edges.get(expected.id)
        return edge?.fromNode === expected.fromNode && edge.toNode === expected.toNode
      })
      if (!geometryMatches || !connectionsMatch)
        throw new Error('Canvas geometry or connections changed while applying the layout')

      // Floating-edge hooks may update sides during import. Record their final
      // result so redo restores exactly the state that was shown to the user.
      canvas.pushHistory(actual)
      canvas.requestSave(false)
    } catch (error) {
      canvas.importData(JSON.parse(JSON.stringify(before)) as CanvasData, true)
      canvas.history.data = history.data
      canvas.history.current = history.current
      canvas.updateHistoryUI()
      canvas.requestSave(false)
      throw error
    }
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
      const view = plugin.app.workspace.getLeavesOfType("canvas").first()?.view as CanvasView | undefined
      const canvas = view?.canvas
      if (!canvas?.nodes?.size) return false

      const sample = canvas.nodes.values().next().value as CanvasNode | undefined
      if (!sample) return false

      const uninstaller = around(sample.constructor.prototype as NodeSetColorPrototype, {
        setColor: (next) =>
          function(this: CanvasNode, color: string | undefined, silent?: boolean) {
            next.call(this, color, silent)
            if (!plugin.settings.getSetting('mindmapFeatureEnabled')) return
            if (!plugin.settings.getSetting('mindmapPropagateColorToEdges')) return
            this.canvas.getEdgesForNode(this).forEach((edge) => {
              if (edge.from.node === this) {
                (edge as EdgeWithSetColor).setColor(color, true)
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
      const editor = plugin.app.workspace.activeEditor as ActiveEditorLike | null
      if (!editor?.containerEl) return false

      const proto = editor.constructor.prototype as ShowPreviewPrototype
      if (typeof proto.showPreview !== 'function') return false

      const uninstaller = around(proto, {
        showPreview: (next) =>
          function(this: MarkdownEditorWithNode, e?: unknown) {
            next.call(this, e)
            if (!plugin.settings.getSetting('mindmapFeatureEnabled')) return
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
        window.setTimeout(() => { if (patch()) plugin.app.workspace.offref(evt) }, 100)
      })
      plugin.registerEvent(evt)
    })
  }
}
