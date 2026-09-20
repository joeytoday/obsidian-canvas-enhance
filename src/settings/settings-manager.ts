import type CanvasEnhancePlugin from "src/main"
import CssStylesConfigManager from "src/managers/css-styles-config-manager"
import { styleAttributeValidator } from "src/canvas-extensions/advanced-styles/style-config"
import type { StyleAttribute } from "src/canvas-extensions/advanced-styles/style-config"
import { DEFAULT_SETTINGS_VALUES } from "./values"
import type { CanvasEnhancePluginSettingsValues } from "./values"
import { CanvasEnhancePluginSettingTab } from "./settings-tab"

export default class SettingsManager {
  private plugin: CanvasEnhancePlugin
  private settings: CanvasEnhancePluginSettingsValues
  private settingsTab: CanvasEnhancePluginSettingTab

  nodeCssStylesManager: CssStylesConfigManager<StyleAttribute>
  edgeCssStylesManager: CssStylesConfigManager<StyleAttribute>

  constructor(plugin: CanvasEnhancePlugin) {
    this.plugin = plugin

    this.nodeCssStylesManager = new CssStylesConfigManager(plugin, 'canvas-enhance-node-style', styleAttributeValidator)
    this.edgeCssStylesManager = new CssStylesConfigManager(plugin, 'canvas-enhance-edge-style', styleAttributeValidator)
  }

  async loadSettings() {
    const savedSettings = await this.plugin.loadData() as Partial<CanvasEnhancePluginSettingsValues> | null
    this.settings = Object.assign({}, DEFAULT_SETTINGS_VALUES, savedSettings)
    this.plugin.app.workspace.trigger("canvas-enhance:settings-changed")
  }

  async saveSettings() {
    await this.plugin.saveData(this.settings)
  }

  getSetting<T extends keyof CanvasEnhancePluginSettingsValues>(key: T): CanvasEnhancePluginSettingsValues[T] {
    return this.settings[key]
  }

  async setSetting(data: Partial<CanvasEnhancePluginSettingsValues>) {
    this.settings = Object.assign(this.settings, data)
    await this.saveSettings()
    this.plugin.app.workspace.trigger("canvas-enhance:settings-changed")
  }

  addSettingsTab() {
    this.settingsTab = new CanvasEnhancePluginSettingTab(this.plugin, this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}
