import OutgoingLink from "src/@types/OutgoingLinkPlugin"
import CanvasFileHelper from "src/utils/canvas-file-helper"
import Patcher from "./patcher"

export default class OutgoingLinksPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    await Patcher.waitForViewRequest<any>(this.plugin, "outgoing-link", view => {
      Patcher.patchPrototype<OutgoingLink>(this.plugin, view.outgoingLink, {
        recomputeLinks: Patcher.OverrideExisting(next => function (...args: unknown[]): void {
          return CanvasFileHelper.withMdExtension(this.file, () => next.call(this, ...args))
        }),
        recomputeUnlinked: Patcher.OverrideExisting(next => function (...args: unknown[]): void {
          return CanvasFileHelper.withMdExtension(this.file, () => next.call(this, ...args))
        })
      })
    })
  }
}
