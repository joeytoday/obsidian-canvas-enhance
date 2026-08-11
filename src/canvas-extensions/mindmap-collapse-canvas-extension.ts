import { setIcon } from "obsidian"
import { BBox, Canvas, CanvasEdge, CanvasNode, SelectionData } from "src/@types/Canvas"
import { CanvasNodeData } from "src/@types/AdvancedJsonCanvas"
import CanvasExtension from "./canvas-extension"

// Not `collapsed` — that key is owned by the collapsible-groups feature
// (dataset exposer, group CSS and group load logic all key on it)
type CollapsibleNodeData = CanvasNodeData & { mindmapCollapsed?: boolean }

export default class MindmapCollapseCanvasExtension extends CanvasExtension {
  private hiddenCache: WeakMap<Canvas, Set<string>> = new WeakMap()

  isEnabled() { return 'mindmapFeatureEnabled' as const }

  init() {
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
      (canvas: Canvas, edge: CanvasEdge) => this.applyEdgeVisibility(canvas, edge)
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
  }

  // ── Collapse state ──

  private isCollapsed(node: CanvasNode): boolean {
    return (node.getData() as CollapsibleNodeData).mindmapCollapsed === true
  }

  private writeCollapsed(node: CanvasNode, collapsed: boolean | undefined, addHistory = false) {
    const data = { ...node.getData() } as CollapsibleNodeData
    if (collapsed === undefined) delete data.mindmapCollapsed
    else data.mindmapCollapsed = collapsed
    node.setData(data, addHistory)
  }

  private setCollapsed(canvas: Canvas, node: CanvasNode, collapsed: boolean | undefined) {
    this.writeCollapsed(node, collapsed, true)
    this.refresh(canvas)
  }

  // Mindmap hierarchy runs along edges that enter the child's left side
  private isMindmapEdge(edge: CanvasEdge): boolean {
    return edge.to.side === 'left'
  }

  // A node is hidden when it has at least one mindmap parent and all of them
  // are collapsed or hidden themselves (shared nodes with a visible parent stay visible)
  private computeHidden(canvas: Canvas): Set<string> {
    const collapsed = new Set<string>()
    const parentsOf = new Map<string, string[]>()

    for (const node of canvas.nodes.values()) {
      if (this.isCollapsed(node)) collapsed.add(node.getData().id)
    }
    for (const edge of canvas.edges.values()) {
      if (!this.isMindmapEdge(edge)) continue
      const childId = edge.to.node.getData().id
      const list = parentsOf.get(childId)
      if (list) list.push(edge.from.node.getData().id)
      else parentsOf.set(childId, [edge.from.node.getData().id])
    }

    const hidden = new Set<string>()
    let changed = true
    while (changed) {
      changed = false
      for (const [id, parents] of parentsOf) {
        if (hidden.has(id)) continue
        if (parents.every(parent => collapsed.has(parent) || hidden.has(parent))) {
          hidden.add(id)
          changed = true
        }
      }
    }
    return hidden
  }

  // ── Rendering ──

  private refresh(canvas: Canvas) {
    const hidden = this.computeHidden(canvas)
    this.hiddenCache.set(canvas, hidden)

    for (const node of canvas.nodes.values()) this.applyNodeVisibility(canvas, node)
    for (const edge of canvas.edges.values()) this.applyEdgeVisibility(canvas, edge)
  }

  private applyNodeVisibility(canvas: Canvas, node: CanvasNode) {
    const hidden = this.hiddenCache.get(canvas)
    node.nodeEl.classList.toggle('ce-mindmap-hidden', hidden?.has(node.getData().id) ?? false)
    this.updateToggle(canvas, node)
  }

  private applyEdgeVisibility(canvas: Canvas, edge: CanvasEdge) {
    const hidden = this.hiddenCache.get(canvas)
    if (!hidden) return
    const edgeHidden = hidden.has(edge.from.node.getData().id) || hidden.has(edge.to.node.getData().id)
    edge.lineGroupEl?.classList.toggle('ce-mindmap-hidden', edgeHidden)
    edge.lineEndGroupEl?.classList.toggle('ce-mindmap-hidden', edgeHidden)
    edge.labelElement?.wrapperEl?.classList.toggle('ce-mindmap-hidden', edgeHidden)
  }

  private updateToggle(canvas: Canvas, node: CanvasNode) {
    const hasChildren = canvas.getEdgesForNode(node)
      .some(edge => edge.from.node === node && this.isMindmapEdge(edge))

    if (!hasChildren) {
      node.mindmapCollapseEl?.remove()
      node.mindmapCollapseEl = undefined
      // Drop a stale flag (no visual effect, so no refresh needed) so a future child doesn't start out collapsed
      if (this.isCollapsed(node)) this.writeCollapsed(node, undefined)
      return
    }

    if (!node.mindmapCollapseEl) {
      const toggleEl = node.nodeEl.createDiv({ cls: 'mindmap-collapse-toggle' })
      toggleEl.addEventListener('pointerdown', (e) => e.stopPropagation())
      toggleEl.addEventListener('click', (e) => {
        e.stopPropagation()
        this.setCollapsed(canvas, node, this.isCollapsed(node) ? undefined : true)
      })
      node.mindmapCollapseEl = toggleEl
    }

    const collapsed = this.isCollapsed(node)
    setIcon(node.mindmapCollapseEl, collapsed ? 'plus-circle' : 'minus-circle')
    node.mindmapCollapseEl.setAttribute('aria-label', collapsed ? '展开下级节点' : '折叠下级节点')
  }

  // ── Structure changes ──

  private onEdgeCreated(canvas: Canvas, edge: CanvasEdge) {
    // A new mindmap child on a collapsed node would be invisible — expand instead
    if (this.isMindmapEdge(edge) && this.isCollapsed(edge.from.node))
      this.setCollapsed(canvas, edge.from.node, undefined)
    else this.refresh(canvas)
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

    const childrenOf = new Map<string, string[]>()
    for (const edge of canvas.edges.values()) {
      if (!this.isMindmapEdge(edge) || !hidden.has(edge.to.node.getData().id)) continue
      const fromId = edge.from.node.getData().id
      const list = childrenOf.get(fromId)
      if (list) list.push(edge.to.node.getData().id)
      else childrenOf.set(fromId, [edge.to.node.getData().id])
    }

    const included = new Set(selectionData.nodes.map(nodeData => nodeData.id))
    const added: string[] = []
    for (const nodeData of [...selectionData.nodes]) {
      if ((nodeData as CollapsibleNodeData).mindmapCollapsed !== true) continue
      const stack = [...childrenOf.get(nodeData.id) ?? []]
      while (stack.length) {
        const id = stack.pop()!
        if (included.has(id)) continue
        included.add(id)
        added.push(id)
        stack.push(...childrenOf.get(id) ?? [])
      }
    }
    if (added.length === 0) return

    for (const id of added) {
      const node = canvas.nodes.get(id)
      if (node) selectionData.nodes.push(node.getData())
    }

    const addedSet = new Set(added)
    for (const edge of canvas.edges.values()) {
      const fromId = edge.from.node.getData().id
      const toId = edge.to.node.getData().id
      if ((addedSet.has(fromId) || addedSet.has(toId)) && included.has(fromId) && included.has(toId))
        selectionData.edges.push(edge.getData())
    }
  }
}
