import { TFile } from "obsidian"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

export default class NodeTemplatesCanvasExtension extends CanvasExtension {
  isEnabled() { return 'fileNodeTemplateEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:node-created',
      (_canvas: Canvas, node: CanvasNode) => void this.applyTemplate(node)
    ))
  }

  private async applyTemplate(node: CanvasNode) {
    const data = node.getData()
    if (data.type !== 'file') return

    const templatePath = this.plugin.settings.getSetting('fileNodeTemplatePath')
    if (!templatePath) return

    const templateFile = this.plugin.app.vault.getAbstractFileByPath(templatePath)
    if (!(templateFile instanceof TFile)) return

    // createFileNode creates the file asynchronously; wait until it exists
    const nodeFile = await this.waitForFile((data as CanvasFileNodeData).file)
    if (!nodeFile) return

    // Only fill newly created (empty) files, not existing files linked into the canvas
    const existingContent = await this.plugin.app.vault.read(nodeFile)
    if (existingContent.trim() !== '') return

    let content = await this.plugin.app.vault.read(templateFile)
    content = this.substituteVariables(content, nodeFile)
    await this.plugin.app.vault.modify(nodeFile, content)
  }

  private async waitForFile(path: string, retries = 10): Promise<TFile | null> {
    for (let i = 0; i < retries; i++) {
      const file = this.plugin.app.vault.getAbstractFileByPath(path)
      if (file instanceof TFile) return file
      await new Promise(resolve => window.setTimeout(resolve, 50))
    }
    return null
  }

  private substituteVariables(content: string, file: TFile): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    return content
      .replace(/\{\{\s*title\s*\}\}/gi, file.basename)
      .replace(/\{\{\s*date\s*\}\}/gi, date)
      .replace(/\{\{\s*time\s*\}\}/gi, time)
  }
}
