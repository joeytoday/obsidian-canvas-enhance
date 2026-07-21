import { TFile } from "obsidian"
import PropertiesView from "src/@types/PropertiesPlugin"
import CanvasFileHelper from "src/utils/canvas-file-helper"
import Patcher from "./patcher"

export default class PropertiesPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return
    if (!this.plugin.app.viewRegistry.viewByType["file-properties"]) return // Core plugin not enabled

    await Patcher.waitForViewRequest<PropertiesView>(this.plugin, "file-properties", view => {
      Patcher.patchPrototype<PropertiesView>(this.plugin, view, {
        isSupportedFile: Patcher.OverrideExisting(next => function (file?: TFile): boolean {
          if (file?.extension === 'canvas') return true
          return next.call(this, file)
        }),
        updateFrontmatter: Patcher.OverrideExisting(next => function (file: TFile, content: string): { [key: string]: unknown } | null {
          if (file?.extension === 'canvas') {
            let frontmatter

            try { frontmatter = JSON.parse(content)?.metadata?.frontmatter ?? {} }
            catch { frontmatter = {} }

            this.rawFrontmatter = JSON.stringify(frontmatter, null, 2)
            this.frontmatter = frontmatter

            return frontmatter
          }

          return next.call(this, file, content)
        }),
        saveFrontmatter: Patcher.OverrideExisting(next => function (frontmatter: { [key: string]: unknown }): void {
          if (this.file?.extension === 'canvas') {
            if (this.file !== this.modifyingFile) return

            void CanvasFileHelper.modifyContent(this.app.vault, this.file, (content) => {
              if (content?.metadata) content.metadata.frontmatter = frontmatter
            })

            return
          }

          return next.call(this, frontmatter)
        })
      })
    })
  }
}
