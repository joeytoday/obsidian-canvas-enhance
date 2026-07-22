import CanvasEnhancePlugin from "src/main"
import { CanvasEnhancePluginSettingsValues } from "src/settings"

export default abstract class CanvasExtension {
  plugin: CanvasEnhancePlugin
  private initialized = false

  abstract isEnabled(): boolean | keyof CanvasEnhancePluginSettingsValues
  abstract init(): void

  constructor(plugin: CanvasEnhancePlugin) {
    this.plugin = plugin
    this.tryInit()
  }

  /** Initialize if enabled and not already initialized. Idempotent, so it can be
   *  re-invoked on settings changes to activate features enabled after load. */
  tryInit() {
    if (this.initialized) return

    const isEnabled = this.isEnabled()
    if (!(isEnabled === true || this.plugin.settings.getSetting(isEnabled as keyof CanvasEnhancePluginSettingsValues)))
      return

    this.initialized = true
    this.init()
  }
}
