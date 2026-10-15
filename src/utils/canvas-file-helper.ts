import { TFile, Vault } from "obsidian"
import { isRecord } from "./type-helper"

export interface CanvasFileContent {
  metadata?: { frontmatter?: Record<string, unknown>; [key: string]: unknown }
  [key: string]: unknown
}

export default class CanvasFileHelper {
  static parseContent(data: string): CanvasFileContent {
    const content: unknown = JSON.parse(data)
    if (!isRecord(content)) throw new Error('Canvas content must be an object')
    const metadata = content.metadata
    if (metadata !== undefined && (!isRecord(metadata) ||
      (metadata.frontmatter !== undefined && !isRecord(metadata.frontmatter)))) {
      throw new Error('Canvas metadata and frontmatter must be objects')
    }
    return content
  }

  static async modifyContent(vault: Vault, file: TFile, modifier: (content: CanvasFileContent) => void): Promise<void> {
    await vault.process(file, (data: string) => {
      const content = this.parseContent(data)
      modifier(content)
      return JSON.stringify(content, null, 2)
    }).catch(() => console.error("Failed to update metadata object in canvas file."))
  }

  static withMdExtension<T>(file: TFile | undefined, fn: () => T): T {
    const isCanvas = file?.extension === 'canvas'
    if (isCanvas) file.extension = 'md'
    try {
      return fn()
    } finally {
      if (isCanvas) file.extension = 'canvas'
    }
  }
}
