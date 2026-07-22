import { TFile, TFolder } from "obsidian"
import CanvasEnhancePlugin from "src/main"
import { Canvas, CanvasNode, Position } from "src/@types/Canvas"

export function getTemplatesFolder(plugin: CanvasEnhancePlugin): TFolder | null {
  const templatesPlugin = (plugin.app as any).internalPlugins?.getPluginById?.('templates')
  const folderPath = templatesPlugin?.instance?.options?.folder as string | undefined
  if (!folderPath) return null
  const folder = plugin.app.vault.getAbstractFileByPath(folderPath)
  return folder instanceof TFolder ? folder : null
}

export function listTemplateFiles(plugin: CanvasEnhancePlugin): string[] {
  const folder = getTemplatesFolder(plugin)
  const templates: string[] = []
  if (!folder) return templates
  const collect = (f: TFolder) => {
    for (const child of f.children) {
      if (child instanceof TFile && child.extension === 'md') templates.push(child.path)
      else if (child instanceof TFolder) collect(child)
    }
  }
  collect(folder)
  return templates
}

export function listVaultFolders(plugin: CanvasEnhancePlugin): string[] {
  const folders: string[] = []
  const collect = (f: TFolder) => {
    if (f.path) folders.push(f.path)
    for (const child of f.children) {
      if (child instanceof TFolder) collect(child)
    }
  }
  collect(plugin.app.vault.getRoot())
  return folders
}

function substituteVariables(content: string, title: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return content
    .replace(/\{\{\s*title\s*\}\}/gi, title)
    .replace(/\{\{\s*date\s*\}\}/gi, date)
    .replace(/\{\{\s*time\s*\}\}/gi, time)
}

async function getUniqueFilePath(plugin: CanvasEnhancePlugin, folderPath: string, baseName: string): Promise<string> {
  const buildPath = (name: string) => folderPath ? `${folderPath}/${name}.md` : `${name}.md`
  let name = baseName
  let counter = 1
  while (plugin.app.vault.getAbstractFileByPath(buildPath(name))) {
    name = `${baseName} ${counter}`
    counter++
  }
  return buildPath(name)
}

/**
 * Create a new file from the configured template inside the target folder
 * (defaults to the canvas file's folder), then add a file node for it and
 * focus it for editing.
 */
export async function createFileNodeFromTemplate(plugin: CanvasEnhancePlugin, canvas: Canvas, pos: Position): Promise<CanvasNode | null> {
  const templatePath = plugin.settings.getSetting('fileNodeTemplatePath')
  if (!templatePath) return null

  const templateFile = plugin.app.vault.getAbstractFileByPath(templatePath)
  if (!(templateFile instanceof TFile)) return null

  let folderPath = plugin.settings.getSetting('fileNodeTemplateFolder')
  if (!folderPath) folderPath = canvas.view.file?.parent?.path ?? ''

  const filePath = await getUniqueFilePath(plugin, folderPath, templateFile.basename)
  const title = filePath.split('/').pop()!.replace(/\.md$/, '')

  let content = await plugin.app.vault.read(templateFile)
  content = substituteVariables(content, title)

  const newFile = await plugin.app.vault.create(filePath, content)
  const node = canvas.createFileNode({ pos, position: 'center', file: newFile })
  node.setIsEditing(true)
  return node
}
