import { type Menu, type TFile } from 'obsidian'
import type { Canvas, CanvasEdge } from 'src/@types/Canvas'
import { t } from 'src/i18n'
import CanvasExtension from './canvas-extension'

export default class MindmapControlsCanvasExtension extends CanvasExtension {
  private unloaded = false

  isEnabled() { return 'mindmapFeatureEnabled' as const }

  init() {
    this.plugin.register(() => { this.unloaded = true })
    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas:edge-menu', (menu: Menu, edge: CanvasEdge) => this.addRelationMenu(menu, edge.canvas)))
    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas:selection-menu', (menu: Menu, canvas: Canvas) => this.addRelationMenu(menu, canvas)))
  }

  private addRelationMenu(menu: Menu, canvas: Canvas) {
    const file = canvas.view.file
    if (!this.canChange(canvas, file)) return
    const edges = [...canvas.edges.values()].filter(edge => canvas.selection.has(edge))
    if (edges.length === 0) return
    const ordinary = edges.every(edge => edge.getData().mindmapRelation === false)
    menu.addItem(item => item.setTitle(t('mindmap.relation.association')).setIcon('link').setChecked(ordinary)
      .onClick(() => {
        if (this.canChange(canvas, file) && edges.every(edge => canvas.edges.get(edge.getData().id) === edge))
          this.setOrdinary(canvas, edges, !ordinary)
      }))
  }

  private canChange(canvas: Canvas, file: TFile | null): boolean {
    return !this.unloaded && this.plugin.settings.getSetting('mindmapFeatureEnabled') &&
      !canvas.readonly && !!file && canvas.view.file === file && canvas.view.canvas === canvas
  }

  private setOrdinary(canvas: Canvas, edges: CanvasEdge[], ordinary: boolean) {
    const changed = edges.filter(edge => ordinary
      ? edge.getData().mindmapRelation !== false : edge.getData().mindmapRelation !== undefined)
    if (changed.length === 0) return
    canvas.overrideHistory()
    for (const edge of changed) {
      const data = { ...edge.getData() }
      if (ordinary) data.mindmapRelation = false
      else delete data.mindmapRelation
      edge.setData(data)
    }
    canvas.pushHistory(canvas.getData())
    canvas.requestSave(false)
  }
}
