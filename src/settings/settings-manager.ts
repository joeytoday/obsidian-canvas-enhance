import type CanvasEnhancePlugin from "src/main"
import CssStylesConfigManager from "src/managers/css-styles-config-manager"
import { styleAttributeValidator } from "src/canvas-extensions/advanced-styles/style-config"
import type { StyleAttribute } from "src/canvas-extensions/advanced-styles/style-config"
import { DEFAULT_SETTINGS_VALUES } from "./values"
import type { CanvasEnhancePluginSettingsValues } from "./values"
import { CanvasEnhancePluginSettingTab } from "./settings-tab"
import { getActiveLanguage, setLanguage } from "src/i18n"

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
    setLanguage(this.settings.language)
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
    if (data.language !== undefined) {
      const previousLanguage = getActiveLanguage()
      setLanguage(this.settings.language)
      if (getActiveLanguage() !== previousLanguage) {
        this.plugin.app.workspace.trigger('canvas-enhance:language-changed')
        if (this.settingsTab?.containerEl.isConnected) this.settingsTab.display()
      }
    }
    this.plugin.app.workspace.trigger("canvas-enhance:settings-changed")
  }

  addSettingsTab() {
    this.settingsTab = new CanvasEnhancePluginSettingTab(this.plugin, this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}
