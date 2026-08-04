import { Menu, TFile, WorkspaceLeaf, WorkspaceTabs } from 'obsidian'
import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'

// Not declared in the public typings; the argument is the tab group
// (getLeaf('tab') instead follows recency)
type WorkspaceWithTabGroup = {
  createLeafInTabGroup(tabGroup: WorkspaceTabs): WorkspaceLeaf
}

export default class FileNodeSplitCanvasExtension extends CanvasExtension {
  isEnabled() { return 'openFileNodeInSplit' as const }

  private sideLeaf: WorkspaceLeaf | null = null
  private attachedWrappers = new WeakSet<HTMLElement>()

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:data-loaded:after',
      (canvas: Canvas) => this.attachLabelClickHandler(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:node-menu',
      (menu: Menu, node: CanvasNode) => this.onNodeMenu(menu, node)
    ))
  }

  private onNodeMenu(menu: Menu, node: CanvasNode) {
    if (!this.plugin.settings.getSetting('openFileNodeInSplit')) return
    if (node.getData().type !== 'file') return
    const file = node.file
    if (!file) return

    menu.addItem(item => {
      item.setTitle('在侧边栏打开')
        .setIcon('lucide-panel-right')
        .setSection('canvas')
        .onClick(() => this.openInSidePane(file, node.canvas.view.leaf))
    })
  }

  // The file node's title label natively opens the file in place; intercept it
  // in the capture phase so the side-pane logic applies there too
  private attachLabelClickHandler(canvas: Canvas) {
    const wrapperEl = canvas.wrapperEl
    if (this.attachedWrappers.has(wrapperEl)) return
    this.attachedWrappers.add(wrapperEl)
    wrapperEl.addEventListener('click', event => this.onLabelClick(canvas, event), true)
  }

  private onLabelClick(canvas: Canvas, event: MouseEvent) {
    const target = event.target as HTMLElement | null
    if (!target?.closest) return
    if (!target.closest('.canvas-node-label')) return

    const file = this.getFileNodeAt(canvas, target)
    if (!file) return

    event.preventDefault()
    event.stopPropagation()
    this.openInSidePane(file, canvas.view.leaf)
  }

  private getFileNodeAt(canvas: Canvas, target: EventTarget | null): TFile | null {
    if (!this.plugin.settings.getSetting('openFileNodeInSplit')) return null

    const el = target as HTMLElement | null
    if (!el?.closest) return null
    const nodeEl = el.closest('.canvas-node')
    if (!nodeEl) return null

    for (const node of canvas.nodes.values()) {
      if (node.nodeEl !== nodeEl) continue
      return node.getData().type === 'file' ? node.file ?? null : null
    }
    return null
  }

  private isAttached(leaf: WorkspaceLeaf): boolean {
    let found = false
    this.plugin.app.workspace.iterateAllLeaves(candidate => {
      if (candidate === leaf) found = true
    })
    return found
  }

  private openInSidePane(file: TFile, canvasLeaf: WorkspaceLeaf) {
    const workspace = this.plugin.app.workspace
    const existing = this.sideLeaf && this.isAttached(this.sideLeaf) ? this.sideLeaf : null

    if (!existing) {
      const leaf = workspace.getLeaf('split', 'vertical')
      this.sideLeaf = leaf
      void leaf.openFile(file)
      return
    }

    // Reuse the side pane: add a new tab to its stack without stealing focus
    const tabGroup = existing.parent
    if (!(tabGroup instanceof WorkspaceTabs)) {
      void existing.openFile(file)
      return
    }

    // Already open in the side stack? Activate that tab instead of duplicating
    let openLeaf: WorkspaceLeaf | null = null
    workspace.iterateAllLeaves(leaf => {
      if (openLeaf === null && leaf.parent === tabGroup &&
        (leaf.view as unknown as { file?: TFile | null }).file?.path === file.path)
        openLeaf = leaf
    })
    if (openLeaf !== null) {
      this.sideLeaf = openLeaf
      workspace.setActiveLeaf(openLeaf, { focus: false })
      return
    }

    const tab = (workspace as unknown as WorkspaceWithTabGroup).createLeafInTabGroup(tabGroup)
    this.sideLeaf = tab
    void tab.openFile(file)
    if (canvasLeaf !== tab) workspace.setActiveLeaf(canvasLeaf, { focus: false })
  }
}
