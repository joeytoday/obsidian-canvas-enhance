import { ExtendedMetadataCache, TFile } from "obsidian"
import { ExtendedCachedMetadata } from "src/@types/Obsidian"
import CanvasMetadataHandler from "src/canvas-metadata-handler"
import FilepathHelper from "src/utils/filepath-helper"
import Patcher from "./patcher"

export default class MetadataCachePatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    Patcher.patchPrototype<ExtendedMetadataCache>(this.plugin, this.plugin.app.metadataCache, {
      getCache: Patcher.OverrideExisting(next => function (filepath: string, ...args: unknown[]): ExtendedCachedMetadata | null {
        // Bypass the "md" extension check by handling the "canvas" extension here
        if (FilepathHelper.extension(filepath) === 'canvas') {
          if (!Object.prototype.hasOwnProperty.call(this.fileCache, filepath))
            return null

          const hash = this.fileCache[filepath]?.hash
          return (hash && this.metadataCache[hash]) || null
        }

        return next.call(this, filepath, ...args) as ExtendedCachedMetadata
      }),
      computeFileMetadataAsync: Patcher.OverrideExisting(next => async function (file: TFile, ...args: unknown[]) {
        if (file instanceof TFile && file?.extension === 'canvas')
          return CanvasMetadataHandler.computeCanvasFileMetadataAsync.call(this, file)

        return next.call(this, file, ...args)
      }),
      resolveLinks: Patcher.OverrideExisting(next => async function (filepath: string) {
        const result = next.call(this, filepath)

        // Run custom logic that triggers 'resolve' and 'resolved' events
        if (FilepathHelper.extension(filepath) === 'canvas')
          await CanvasMetadataHandler.resolveCanvasLinks.call(this, filepath)

        return result
      })
    })
  }
}
