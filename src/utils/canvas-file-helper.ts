import { TFile, Vault } from "obsidian"

export default class CanvasFileHelper {
  static async modifyContent(vault: Vault, file: TFile, modifier: (content: any) => void): Promise<void> {
    await vault.process(file, (data: string) => {
      const content = JSON.parse(data)
      modifier(content)
      return JSON.stringify(content, null, 2)
    }).catch(() => console.error("Failed to update metadata object in canvas file."))
  }

  static withMdExtension<T>(file: TFile | undefined, fn: () => T): T {
    const isCanvas = file?.extension === 'canvas'
    if (isCanvas) file!.extension = 'md'
    try {
      return fn()
    } finally {
      if (isCanvas) file!.extension = 'canvas'
    }
  }
}
