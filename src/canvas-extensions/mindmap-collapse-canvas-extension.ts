import { setIcon } from "obsidian"
import { BBox, Canvas, CanvasEdge, CanvasNode, SelectionData } from "src/@types/Canvas"
import { CanvasNodeData } from "src/@types/AdvancedJsonCanvas"
import CanvasExtension from "./canvas-extension"
import { stronglyConnected } from "src/utils/mindmap-layout"
import { getMindmapEdgeDirection, MINDMAP_DIRECTIONS, resolveMindmapRelation, MindmapDirection } from "src/utils/mindmap-direction"
import { t } from "src/i18n"

export default class MindmapCollapseCanvasExtension extends CanvasExtension {
  private hiddenCache: WeakMap<Canvas, Set<string>>
  private edgeCache: WeakMap<CanvasEdge, string>
  private active: boolean

  isEnabled() { return 'mindmapFeatureEnabled' as const }

  init() {
    // CanvasExtension calls init from its constructor, before field initializers.
    this.hiddenCache = new WeakMap()
    this.edgeCache = new WeakMap()
    this.active = true

    for (const event of ['canvas-enhance:canvas-changed', 'canvas-enhance:readonly-changed'] as const)
      this.plugin.registerEvent(this.plugin.app.workspace.on(event, (canvas: Canvas) => this.refresh(canvas)))

    for (const event of ['canvas-enhance:node-moved', 'canvas-enhance:node-resized'] as const)
      this.plugin.registerEvent(this.plugin.app.workspace.on(event, (canvas: Canvas, node: CanvasNode) => this.onNodeGeometryChanged(canvas, node)))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:data-loaded:after',
      (canvas: Canvas) => this.refresh(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-rendered',
      (canvas: Canvas, node: CanvasNode) => this.applyNodeVisibility(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:edge-created',
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgeCreated(canvas, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:edge-removed',
      (canvas: Canvas) => this.refresh(canvas)
    ))

    // Edges recreate their SVG elements on re-render, dropping the hidden class
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:edge-changed',
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(canvas, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-removed',
      (canvas: Canvas) => this.refresh(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:containing-nodes-requested',
      (canvas: Canvas, _bbox: BBox, result: CanvasNode[]) => this.onContainingNodesRequested(canvas, result)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:copy',
      (canvas: Canvas, selectionData: SelectionData) => this.onCopy(canvas, selectionData)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas-enhance:settings-changed', () => {
      const active = this.plugin.settings.getSetting('mindmapFeatureEnabled')
      if (active === this.active) return
      this.active = active
      for (const canvas of this.plugin.getCanvases()) this.refresh(canvas)
    }))
    this.plugin.register(() => {
      this.active = false
      for (const canvas of this.plugin.getCanvases()) this.clear(canvas)
    })
    for (const canvas of this.plugin.getCanvases()) this.refresh(canvas)
  }

  // ── Collapse state ──

  private isCollapsed(data: CanvasNodeData, direction: MindmapDirection): boolean {
    return data.mindmapCollapsed === true ||
      (Array.isArray(data.mindmapCollapsed) && data.mindmapCollapsed.includes(direction))
  }

  private setCollapsed(canvas: Canvas, node: CanvasNode, direction: MindmapDirection, collapsed: boolean) {
    if (!this.active || canvas.readonly || canvas.nodes.get(node.getData().id) !== node) return
    const data = { ...node.getData() }
    if (this.isCollapsed(data, direction) === collapsed) return
    const directions = MINDMAP_DIRECTIONS.filter(side => side === direction ? collapsed : this.isCollapsed(data, side))
    if (directions.length) data.mindmapCollapsed = directions
    else delete data.mindmapCollapsed
    node.setData(data, true)
    this.refresh(canvas)
  }

  private getRelation(canvas: Canvas, edge: CanvasEdge) {
    const data = edge.getData()
    const relation = resolveMindmapRelation(data)
    const parent = relation && canvas.nodes.get(relation.parentId)
    const child = relation && canvas.nodes.get(relation.childId)
    return parent && child && parent !== child
      ? { parent, child, direction: getMindmapEdgeDirection(data, parent.getData(), child.getData()) }
      : null
  }

  // Cycles stay visible as a unit unless their external parents hide the whole
  // unit. This keeps a cycle's own collapse controls reachable.
  private computeHidden(canvas: Canvas): Set<string> {
    const nodes = [...canvas.nodes.values()]
    const indexes = new Map(nodes.map((node, index) => [node.getData().id, index]))
    const children: number[][] = nodes.map(() => [])
    const parents: number[][] = nodes.map(() => [])
    const links: { from: number; to: number; collapsed: boolean }[] = []
    for (const edge of canvas.edges.values()) {
      const relation = this.getRelation(canvas, edge)
      if (!relation) continue
      const from = indexes.get(relation.parent.getData().id), to = indexes.get(relation.child.getData().id)
      if (from === undefined || to === undefined) continue
      children[from].push(to)
      parents[to].push(from)
      links.push({ from, to, collapsed: this.isCollapsed(relation.parent.getData(), relation.direction) })
    }
    const components = stronglyConnected(children, parents)
    const owner: number[] = []
    components.forEach((members, component) => members.forEach(index => { owner[index] = component }))
    const externalParents = components.map(() => [] as { from: number; collapsed: boolean }[])
    for (const link of links)
      if (owner[link.from] !== owner[link.to]) externalParents[owner[link.to]].push(link)
    const hidden = new Set<number>()
    let changed = true
    while (changed) {
      changed = false
      for (let component = 0; component < components.length; component++) {
        const incoming = externalParents[component]
        if (hidden.has(component) || incoming.length === 0) continue
        if (incoming.every(link => link.collapsed || hidden.has(owner[link.from]))) {
          hidden.add(component)
          changed = true
        }
      }
    }
    return new Set([...hidden].flatMap(component => components[component].map(index => nodes[index].getData().id)))
  }

  // ── Rendering ──

  private refresh(canvas: Canvas) {
    if (!this.active) { this.clear(canvas); return }
    for (const edge of canvas.edges.values()) this.edgeCache.set(edge, this.edgeSignature(canvas, edge))
    const hidden = this.computeHidden(canvas)
    this.hiddenCache.set(canvas, hidden)

    for (const node of canvas.nodes.values()) this.applyNodeVisibility(canvas, node)
    for (const edge of canvas.edges.values()) this.applyEdgeVisibility(canvas, edge)
  }

  private clear(canvas: Canvas) {
    this.hiddenCache.delete(canvas)
    for (const node of canvas.nodes.values()) this.applyNodeVisibility(canvas, node)
    for (const edge of canvas.edges.values()) {
      this.edgeCache.delete(edge)
      this.applyEdgeVisibility(canvas, edge)
    }
  }

  private applyNodeVisibility(canvas: Canvas, node: CanvasNode) {
    const hidden = this.hiddenCache.get(canvas)
    node.nodeEl.classList.toggle('ce-mindmap-hidden', hidden?.has(node.getData().id) ?? false)
    this.updateToggles(canvas, node)
  }

  private applyEdgeVisibility(canvas: Canvas, edge: CanvasEdge) {
    const hidden = this.hiddenCache.get(canvas)
    const relation = this.active ? this.getRelation(canvas, edge) : null
    const edgeHidden = (!!hidden && (hidden.has(edge.from.node.getData().id) || hidden.has(edge.to.node.getData().id))) ||
      (!!relation && this.isCollapsed(relation.parent.getData(), relation.direction))
    edge.lineGroupEl?.classList.toggle('ce-mindmap-hidden', edgeHidden)
    edge.lineEndGroupEl?.classList.toggle('ce-mindmap-hidden', edgeHidden)
    edge.labelElement?.wrapperEl?.classList.toggle('ce-mindmap-hidden', edgeHidden)
  }

  private updateToggles(canvas: Canvas, node: CanvasNode) {
    const directions = new Set<MindmapDirection>()
    if (this.active && !canvas.readonly) {
      for (const edge of canvas.getEdgesForNode(node)) {
        const relation = this.getRelation(canvas, edge)
        if (relation?.parent === node) directions.add(relation.direction)
      }
    }
    if (directions.size === 0 && !node.mindmapCollapseEls) return
    const toggles = node.mindmapCollapseEls ??= new Map<MindmapDirection, HTMLElement>()
    for (const direction of MINDMAP_DIRECTIONS) {
      let toggle = toggles.get(direction)
      if (!directions.has(direction)) {
        toggle?.remove()
        toggles.delete(direction)
        continue
      }
      if (!toggle) {
        toggle = node.nodeEl.createDiv({ cls: 'mindmap-collapse-toggle' })
        toggle.dataset.direction = direction
        toggle.addEventListener('pointerdown', (e) => e.stopPropagation())
        toggle.addEventListener('click', (e) => {
          e.stopPropagation()
          this.setCollapsed(canvas, node, direction, !this.isCollapsed(node.getData(), direction))
        })
        toggles.set(direction, toggle)
      }
      const collapsed = this.isCollapsed(node.getData(), direction)
      setIcon(toggle, collapsed ? 'plus-circle' : 'minus-circle')
      toggle.setAttribute('aria-label', `${t(collapsed ? 'mindmap.expandChildren' : 'mindmap.collapseChildren')} · ${t(`cmd.direction.${direction}`)}`)
    }
    if (toggles.size === 0) node.mindmapCollapseEls = undefined
  }

  // ── Structure changes ──

  private onEdgeCreated(canvas: Canvas, edge: CanvasEdge) {
    // Reveal only the new child's branch, preserving other collapsed directions.
    const relation = this.getRelation(canvas, edge)
    // Imported parents retain their saved state. A new edge to an existing
    // parent (including an edges-only import) should still reveal its child.
    if (this.active && !canvas.readonly && relation &&
      !canvas.importingNodeIds?.has(relation.parent.getData().id) &&
      this.isCollapsed(relation.parent.getData(), relation.direction))
      this.setCollapsed(canvas, relation.parent, relation.direction, false)
    // The event runs before addEdge inserts the edge into the canvas. Non-silent
    // imports already refresh at data-loaded:after; fill the gap for other adds.
    queueMicrotask(() => {
      if (!this.active || canvas.edges.get(edge.getData().id) !== edge) return
      if (this.edgeCache.get(edge) !== this.edgeSignature(canvas, edge)) this.refresh(canvas)
    })
  }

  private onNodeGeometryChanged(canvas: Canvas, node: CanvasNode) {
    if (this.active && canvas.getEdgesForNode(node).some(edge => this.edgeCache.get(edge) !== this.edgeSignature(canvas, edge)))
      this.refresh(canvas)
  }

  private edgeSignature(canvas: Canvas, edge: CanvasEdge): string {
    const relation = this.getRelation(canvas, edge)
    return JSON.stringify([edge.getData().id, relation?.parent.getData().id, relation?.child.getData().id, relation?.direction])
  }

  private onEdgeChanged(canvas: Canvas, edge: CanvasEdge) {
    const signature = this.edgeSignature(canvas, edge)
    if (this.active && this.edgeCache.get(edge) !== signature) {
      this.edgeCache.set(edge, signature)
      this.refresh(canvas)
    } else this.applyEdgeVisibility(canvas, edge)
  }

  private onContainingNodesRequested(canvas: Canvas, result: CanvasNode[]) {
    const hidden = this.hiddenCache.get(canvas)
    if (!hidden?.size) return
    for (let i = result.length - 1; i >= 0; i--) {
      if (hidden.has(result[i].getData().id)) result.splice(i, 1)
    }
  }

  // Copying a collapsed node includes its hidden subtree, like collapsed groups do
  private onCopy(canvas: Canvas, selectionData: SelectionData) {
    const hidden = this.hiddenCache.get(canvas)
    if (!hidden?.size) return

    const childrenOf = new Map<string, { id: string; direction: MindmapDirection }[]>()
    for (const edge of canvas.edges.values()) {
      const relation = this.getRelation(canvas, edge)
      if (!relation || !hidden.has(relation.child.getData().id)) continue
      const parentId = relation.parent.getData().id
      const child = { id: relation.child.getData().id, direction: relation.direction }
      const list = childrenOf.get(parentId)
      if (list) list.push(child)
      else childrenOf.set(parentId, [child])
    }

    const included = new Set(selectionData.nodes.map(nodeData => nodeData.id))
    const visited = new Set<string>()
    const added: string[] = []
    for (const nodeData of [...selectionData.nodes]) {
      const stack = (childrenOf.get(nodeData.id) ?? [])
        .filter(child => this.isCollapsed(nodeData, child.direction)).map(child => child.id)
      while (stack.length) {
        const id = stack.pop()!
        if (visited.has(id)) continue
        visited.add(id)
        if (!included.has(id)) {
          included.add(id)
          added.push(id)
        }
        stack.push(...(childrenOf.get(id) ?? []).map(child => child.id))
      }
    }
    if (added.length === 0) return

    for (const id of added) {
      const node = canvas.nodes.get(id)
      if (node) selectionData.nodes.push(node.getData())
    }

    const addedSet = new Set(added)
    const includedEdges = new Set(selectionData.edges.map(edge => edge.id))
    for (const edge of canvas.edges.values()) {
      const fromId = edge.from.node.getData().id
      const toId = edge.to.node.getData().id
      if (!includedEdges.has(edge.getData().id) && (addedSet.has(fromId) || addedSet.has(toId)) && included.has(fromId) && included.has(toId))
        selectionData.edges.push(edge.getData())
    }
  }
}
