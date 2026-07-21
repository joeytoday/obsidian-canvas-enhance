import OutgoingLink from "src/@types/OutgoingLinkPlugin"
import CanvasFileHelper from "src/utils/canvas-file-helper"
import Patcher from "./patcher"

export default class OutgoingLinksPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- We do not have typings for the Outgoing Links plugin
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
