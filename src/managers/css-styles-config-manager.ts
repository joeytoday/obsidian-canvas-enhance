import { parseYaml } from "obsidian"
import CanvasEnhancePlugin from "src/main"
import { isRecord } from "src/utils/type-helper"

export default class CssStylesConfigManager<T> {
  private cachedConfigs = new WeakMap<Document, T[]>()
  private configRegex

  constructor(
    private plugin: CanvasEnhancePlugin,
    trigger: string,
    private validate: (json: Record<string, unknown>) => T | null
  ) {
    // Regex to match CSS multi-line comments with the @trigger word at the beginning (same line such as /* @trigger \n ... */)
    this.configRegex = new RegExp(`\\/\\*\\s*@${trigger}\\s*\\n([\\s\\S]*?)\\*\\/`, 'g')

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'css-change',
      () => { this.cachedConfigs = new WeakMap() }
    ))
  }

  getStyles(): T[] {
    const document = activeDocument
    const cachedConfig = this.cachedConfigs.get(document)
    if (cachedConfig) return cachedConfig

    const config: T[] = []
    this.cachedConfigs.set(document, config)

    // Parse config from CSS
    const styleSheets = document.styleSheets
    for (let i = 0; i < styleSheets.length; i++) {
      const sheet = styleSheets.item(i)
      if (!sheet) continue

      const styleSheetConfigs = this.parseStyleConfigsFromCSS(sheet)
      for (const styleConfig of styleSheetConfigs) {
        // A malformed snippet must not break menu/settings rendering
        let validConfig: T | null
        try {
          validConfig = this.validate(styleConfig)
        } catch {
          continue
        }
        if (!validConfig) continue

        config.push(validConfig)
      }
    }

    return config
  }

  private parseStyleConfigsFromCSS(sheet: CSSStyleSheet): Record<string, unknown>[] {
    const textContent = sheet?.ownerNode?.textContent?.trim()
    if (!textContent) return []

    const configs = []

    const matches = textContent.matchAll(this.configRegex)
    for (const match of matches) {
      const yamlString = match[1]
      if (!yamlString) continue

      // parseYaml throws on invalid YAML; skip the snippet instead of crashing
      let configYaml: unknown
      try {
        configYaml = parseYaml(yamlString)
      } catch {
        continue
      }
      if (isRecord(configYaml)) configs.push(configYaml)
    }

    return configs
  }
}
