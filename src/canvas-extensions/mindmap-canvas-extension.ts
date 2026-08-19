// LLM Agent: This file was created by an LLM agent as part of integrating Canvas-MindMap features into Canvas Enhance.

import { Platform, setIcon, setTooltip, TFile } from "obsidian"
import type { MarkdownFileInfo, Scope } from "obsidian"
import { around } from "monkey-around"
import { Canvas, CanvasNode, CanvasView } from "src/@types/Canvas"
import { CanvasEdgeData, CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper, { NavDirection, NAV_DIRECTIONS } from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { measureNodeContentHeight } from "./auto-resize-node-canvas-extension"

const FLOATING_DIR: Record<NavDirection, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
}

type Rect = { x: number; y: number; width: number; height: number }

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

  isEnabled() { return 'mindmapFeatureEnabled' as const }

  init() {
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
      .filter(e => e.from.node === parent && e.to.side === 'left')
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
      if (edge.to.side !== 'left') continue
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
        if (e.from.node === n && e.to.side === 'left') stack.push(e.to.node)
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
          if (!canvas.readonly) void this.rearrangeMindmap(canvas)
        })
        CanvasHelper.addCardMenuOption(canvas, button)
      }
    ))
  }

  // ── Auto-layout ──

  // Tidies the whole canvas into a mindmap layout: depth defines the column,
  // sibling subtrees stack as contiguous blocks, and a node with several
  // parents is placed after its last parent's block, centered on the combined
  // range of its parents. A per-column cursor guarantees no vertical overlaps.
  private async rearrangeMindmap(canvas: Canvas) {
    const cs = this.childSpacing()
    const ss = this.siblingSpacing()

    const nodes = [...canvas.nodes.values()].filter(n => n.getData().type !== 'group')
    if (nodes.length === 0) return
    const byId = new Map(nodes.map(n => [n.getData().id, n]))

    const parentsOf = new Map<string, CanvasNode[]>()
    for (const edge of canvas.edges.values()) {
      if (edge.to.side !== 'left') continue
      const from = edge.from.node, to = edge.to.node
      if (!byId.has(from.getData().id) || !byId.has(to.getData().id)) continue
      const list = parentsOf.get(to.getData().id)
      if (list) list.push(from)
      else parentsOf.set(to.getData().id, [from])
    }
    for (const list of parentsOf.values()) list.sort((a, b) => a.y - b.y)

    const childrenOf = new Map<string, CanvasNode[]>()
    const ownedShared = new Map<string, CanvasNode[]>()
    for (const [childId, parents] of parentsOf) {
      const child = byId.get(childId)
      if (!child) continue
      for (const parent of parents) {
        const list = childrenOf.get(parent.getData().id)
        if (list) list.push(child)
        else childrenOf.set(parent.getData().id, [child])
      }
      if (parents.length > 1) {
        const last = parents[parents.length - 1].getData().id
        const list = ownedShared.get(last)
        if (list) list.push(child)
        else ownedShared.set(last, [child])
      }
    }
    for (const list of childrenOf.values()) list.sort((a, b) => a.y - b.y)

    const roots = nodes.filter(n => !parentsOf.has(n.getData().id)).sort((a, b) => a.y - b.y)
    if (roots.length === 0) return

    await this.fitNodesToContent(canvas, nodes)

    // Longest-path depth so shared nodes sit one column after their deepest parent
    const depthOf = new Map<string, number>()
    const computeDepth = (node: CanvasNode, seen: Set<string>): number => {
      const id = node.getData().id
      const cached = depthOf.get(id)
      if (cached !== undefined) return cached
      if (seen.has(id)) return 0
      seen.add(id)
      const parents = parentsOf.get(id) ?? []
      const depth = parents.length === 0 ? 0 : Math.max(...parents.map(p => computeDepth(p, seen))) + 1
      seen.delete(id)
      depthOf.set(id, depth)
      return depth
    }
    for (const node of nodes) computeDepth(node, new Set())

    const columnWidth: number[] = []
    for (const node of nodes) {
      const d = depthOf.get(node.getData().id) as number
      columnWidth[d] = Math.max(columnWidth[d] ?? 0, node.width)
    }
    const columnX: number[] = []
    for (let d = 0; d < columnWidth.length; d++) {
      columnX[d] = d === 0
        ? Math.min(...roots.map(r => r.x))
        : columnX[d - 1] + columnWidth[d - 1] + cs
    }

    // Reserved vertical slot per node: its subtree plus any shared node that
    // overflows its parents' combined block
    const slotMemo = new Map<string, number>()
    const extraMemo = new Map<string, number>()
    const itemsTotal = (node: CanvasNode, seen: Set<string>): number => {
      let items = 0, count = 0
      for (const kid of childrenOf.get(node.getData().id) ?? []) {
        items += slot(kid, seen)
        count++
        for (const shared of ownedShared.get(kid.getData().id) ?? []) {
          items += extra(shared, seen)
          count++
        }
      }
      return count === 0 ? 0 : items + ss * (count - 1)
    }
    function slot(node: CanvasNode, seen: Set<string> = new Set()): number {
      const id = node.getData().id
      const cached = slotMemo.get(id)
      if (cached !== undefined) return cached
      if (seen.has(id)) return node.height
      seen.add(id)
      const result = Math.max(node.height, itemsTotal(node, seen))
      seen.delete(id)
      slotMemo.set(id, result)
      return result
    }
    function extra(node: CanvasNode, seen: Set<string> = new Set()): number {
      const id = node.getData().id
      const cached = extraMemo.get(id)
      if (cached !== undefined) return cached
      const parents = parentsOf.get(id) ?? []
      const range = parents.reduce((acc, p) => acc + slot(p, seen), -ss)
      const result = Math.max(0, slot(node, seen) - range)
      extraMemo.set(id, result)
      return result
    }

    const columnEnd: number[] = []
    const place = (node: CanvasNode, top: number) => {
      const id = node.getData().id
      const depth = depthOf.get(id) as number
      const total = slot(node)

      const actualTop = Math.max(top, (columnEnd[depth] ?? -Infinity) + ss)
      columnEnd[depth] = actualTop + total
      node.setData({
        ...node.getData(),
        x: columnX[depth],
        y: actualTop + (total - node.height) / 2,
      })

      let cursor = actualTop + (total - itemsTotal(node, new Set())) / 2
      const slotTop = new Map<string, number>()
      for (const kid of childrenOf.get(id) ?? []) {
        place(kid, cursor)
        slotTop.set(kid.getData().id, cursor)
        cursor += slot(kid) + ss
        for (const shared of ownedShared.get(kid.getData().id) ?? []) {
          const parents = parentsOf.get(shared.getData().id) as CanvasNode[]
          const rangeTop = slotTop.get(parents[0].getData().id) ?? cursor
          const rangeBottom = cursor - ss
          place(shared, (rangeTop + rangeBottom) / 2 - slot(shared) / 2)
          cursor += extra(shared) + ss
        }
      }
    }

    let cursor = Math.min(...roots.map(r => r.y))
    for (const root of roots) {
      place(root, cursor)
      cursor += slot(root) + ss
    }

    canvas.requestSave()

    // Show the tidied result
    canvas.zoomToRealBbox(BBoxHelper.enlargeBBox(BBoxHelper.combineBBoxes(nodes.map(n => n.getBBox())), 1.1))
    canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom)
  }

  // Resizes text/markdown nodes to their content so the layout uses real heights
  private async fitNodesToContent(canvas: Canvas, nodes: CanvasNode[]) {
    // Offscreen node content renders lazily, so zoom out until everything is mounted
    canvas.zoomToRealBbox(BBoxHelper.combineBBoxes(nodes.map(n => n.getBBox())))
    canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom)
    await sleep(10)
    const start = performance.now()
    while (nodes.some(n => n.initialized === false || n.isContentMounted === false) && performance.now() - start < 1000)
      await sleep(10)

    const padding = this.plugin.settings.getSetting('autoResizeNodeVerticalPadding')
    const maxHeight = this.plugin.settings.getSetting('autoResizeNodeMaxHeight')
    for (const node of nodes) {
      const data = node.getData()
      const isMarkdownFile = data.type === 'file' && (data as CanvasFileNodeData).file.endsWith('.md')
      if (data.type !== 'text' && !isMarkdownFile) continue

      const measured = measureNodeContentHeight(node)
      if (measured === null) continue

      let height = measured + padding
      if (maxHeight != -1 && height > maxHeight) height = maxHeight
      height = Math.max(height, canvas.config.minContainerDimension)
      if (height === node.height) continue
      node.setData({ ...data, height })
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
