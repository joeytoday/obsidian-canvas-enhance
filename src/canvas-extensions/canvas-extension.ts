import CanvasEnhancePlugin from "src/main"
import { CanvasEnhancePluginSettingsValues } from "src/settings"

export default abstract class CanvasExtension {
  plugin: CanvasEnhancePlugin

  abstract isEnabled(): boolean | keyof CanvasEnhancePluginSettingsValues
  abstract init(): void

  constructor(plugin: CanvasEnhancePlugin) {
    this.plugin = plugin

    const isEnabled = this.isEnabled()

    if (!(isEnabled === true || this.plugin.settings.getSetting(isEnabled as keyof CanvasEnhancePluginSettingsValues)))
      return

    this.init()
  }
}
