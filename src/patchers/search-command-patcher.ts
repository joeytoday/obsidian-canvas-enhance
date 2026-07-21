import { CanvasView } from "src/@types/Canvas"
import CanvasSearchView from "src/canvas-search-view"
import Patcher from "./patcher"

export default class SearchCommandPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('nativeFileSearchEnabled')) return

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    Patcher.patch(this.plugin, this.plugin.app.commands.commands["editor:open-search"], {
      checkCallback: Patcher.OverrideExisting(next => function (this: unknown, checking: boolean) {
        // If there is an active md editor, return the original method
        if (that.plugin.app.workspace.activeEditor) return next.call(this, checking)

        // If there is no active canvas view, return the original method
        const activeCanvasView = that.plugin.getCurrentCanvasView()
        if (!activeCanvasView) return next.call(this, checking)

        // Always allow the command to be executed in canvas view
        if (checking) return true

        // Show the search view in the active canvas view
        if (!activeCanvasView.canvas.searchEl) new CanvasSearchView(activeCanvasView)

        return true
      })
    })
  }
}
