import { DataWriteOptions, TFile } from "obsidian"
import CanvasFileHelper from "src/utils/canvas-file-helper"
import Patcher from "./patcher"

export default class FileManagerPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    Patcher.patch(this.plugin, this.plugin.app.fileManager, {
      processFrontMatter: Patcher.OverrideExisting(next => async function (file: TFile, fn: (frontmatter: unknown) => void, options?: DataWriteOptions) {
        if (file?.extension === 'canvas') {
          await CanvasFileHelper.modifyContent(that.plugin.app.vault, file, (content) =>
            fn(content.metadata.frontmatter)
          )
          return
        }

        return next.call(this, file, fn, options)
      }),
    })
  }
}
