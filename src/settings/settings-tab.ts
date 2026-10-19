import { Notice, PluginSettingTab, Setting as SettingEl, TextComponent } from "obsidian"
import type CanvasEnhancePlugin from "src/main"
import { getTemplatesFolder, listTemplateFiles, listVaultFolders } from "src/utils/file-template-helper"
import { getActiveLanguage, t } from "src/i18n"
import type SettingsManager from "./settings-manager"
import { DEFAULT_SETTINGS_VALUES } from "./values"
import type { CanvasEnhancePluginSettingsValues } from "./values"
import { SETTINGS, SETTINGS_TABS } from "./schema"
import type { BooleanSetting, ButtonSetting, DimensionSetting, DropdownSetting, NumberSetting, Setting, SettingsHeading, StyleAttributesSetting, TextSetting } from "./types"

const REPO_URL = 'https://github.com/joeytoday/obsidian-canvas-enhance'
const README_URL = `${REPO_URL}?tab=readme-ov-file`

function openExternalUrl(url: string) {
  window.open(url, '_blank')
}

export class CanvasEnhancePluginSettingTab extends PluginSettingTab {
  settingsManager: SettingsManager

  constructor(private canvasPlugin: CanvasEnhancePlugin, settingsManager: SettingsManager) {
    super(canvasPlugin.app, canvasPlugin)
    this.settingsManager = settingsManager
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()
    containerEl.classList.add("ce-settings")

    // Quick links
    const languageSuffix = getActiveLanguage() === 'en' ? '.en' : ''
    const linksEl = containerEl.createDiv()
    linksEl.classList.add('ce-settings-links')

    new SettingEl(linksEl)
      .setName('Canvas Enhance')
      .addButton(button => button
        .setButtonText(t('settings.guideButton'))
        .onClick(() => openExternalUrl(`${REPO_URL}/blob/main/docs/guide${languageSuffix}.md`)))
      .addButton(button => button
        .setButtonText(t('settings.changelogButton'))
        .onClick(() => openExternalUrl(`${REPO_URL}/blob/main/CHANGELOG${languageSuffix}.md`)))
      .addButton(button => button
        .setButtonText(t('settings.starButton'))
        .setCta()
        .onClick(() => openExternalUrl(REPO_URL)))

    // Tab navigation
    const tabBar = containerEl.createDiv()
    tabBar.classList.add('ce-settings-tabs')

    const contentEl = containerEl.createDiv()
    contentEl.classList.add('ce-settings-content')

    const renderTab = (tabId: keyof typeof SETTINGS_TABS) => {
      contentEl.empty()
      const tab = SETTINGS_TABS[tabId]

      for (const headingId of tab.groups) {
        const heading = (SETTINGS as Record<string, SettingsHeading>)[headingId]
        if (!heading) continue

        this.createFeatureHeading(
          contentEl,
          heading.label,
          heading.description,
          heading.infoSection,
          heading.disableToggle ? null : headingId as keyof CanvasEnhancePluginSettingsValues
        )

        const childrenEl = contentEl.createDiv()
        childrenEl.classList.add('settings-header-children')
        childrenEl.createSpan()

        for (const [settingId, setting] of Object.entries(heading.children) as [keyof CanvasEnhancePluginSettingsValues, Setting][]) {
          if (!(settingId in DEFAULT_SETTINGS_VALUES) && setting.type !== 'button') continue

          switch (setting.type) {
            case 'text':
            case 'number':
              this.createTextSetting(childrenEl, settingId, setting)
              break
            case 'dimension':
              this.createDimensionSetting(childrenEl, settingId, setting)
              break
            case 'boolean':
              this.createBooleanSetting(childrenEl, settingId, setting)
              break
            case 'dropdown':
              this.createDropdownSetting(childrenEl, settingId, setting)
              break
            case 'button':
              this.createButtonSetting(childrenEl, setting)
              break
            case 'styles':
              this.createStylesSetting(childrenEl, settingId, setting)
              break
            case 'templateSelect':
              this.createTemplateSelectSetting(childrenEl, settingId)
              break
            case 'folderSelect':
              this.createFolderSelectSetting(childrenEl, settingId)
              break
          }
        }
      }
    }

    for (const [tabId, tab] of Object.entries(SETTINGS_TABS)) {
      const tabButton = tabBar.createEl('button', { text: tab.label })
      tabButton.classList.add('ce-settings-tab')
      if (tabId === 'basic') tabButton.classList.add('is-active')
      tabButton.addEventListener('click', () => {
        tabBar.querySelectorAll('.ce-settings-tab').forEach(el => el.classList.remove('is-active'))
        tabButton.classList.add('is-active')
        renderTab(tabId as keyof typeof SETTINGS_TABS)
      })
    }

    renderTab('basic')
  }

  private createFeatureHeading(containerEl: HTMLElement, label: string, description: string, infoSection: string | undefined, settingsKey: keyof CanvasEnhancePluginSettingsValues | null): SettingEl {
    const setting = new SettingEl(containerEl)
      .setHeading()
      .setClass('ce-settings-heading')
      .setName(label)
      .setDesc(description)

    if (infoSection !== undefined) {
      setting.addExtraButton(button => button
        .setTooltip(t('settings.infoTooltip'))
        .setIcon('info')
        .onClick(() => openExternalUrl(`${README_URL}#${infoSection}`))
      )
    }

    if (settingsKey !== null) {
      setting.addToggle((toggle) =>
        toggle
          .setTooltip(t('settings.reloadTooltip'))
          .setValue(this.settingsManager.getSetting(settingsKey) as boolean)
          .onChange(async (value) => {
            await this.settingsManager.setSetting({ [settingsKey]: value })
            new Notice(t('notice.reloadToApply'))
          })
      )
    }

    return setting
  }

  private createTextSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: TextSetting | NumberSetting) {
    const value = this.settingsManager.getSetting(settingId)
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => text
        .setValue(setting.type === 'number' ? JSON.stringify(value) : value as string)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: setting.parse ? setting.parse(value) : value })
        })
      )
  }

  private createDimensionSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: DimensionSetting) {
    let text1: TextComponent
    let text2: TextComponent

    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => {
        text1 = text.setValue((this.settingsManager.getSetting(settingId) as [number, number])[0].toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ [settingId]: setting.parse([value, text2.getValue()]) }))
      })
      .addText(text => {
        text2 = text.setValue((this.settingsManager.getSetting(settingId) as [number, number])[1].toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ [settingId]: setting.parse([text1.getValue(), value]) }))
      })
  }

  private createBooleanSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: BooleanSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addToggle(toggle => toggle
        .setValue(this.settingsManager.getSetting(settingId) as boolean)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      )
  }

  private createDropdownSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: DropdownSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addDropdown(dropdown => dropdown
        .addOptions(setting.options)
        .setValue(this.settingsManager.getSetting(settingId) as string)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      )
  }

  private createButtonSetting(containerEl: HTMLElement, setting: ButtonSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addButton(button => button
        .setButtonText(t('common.open'))
        .onClick(() => setting.onClick())
      )
  }

  private createStylesSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: StyleAttributesSetting) {
    const nestedContainerEl = containerEl.createEl('details')
    nestedContainerEl.classList.add('setting-item')

    const summaryEl = nestedContainerEl.createEl('summary')
    summaryEl.textContent = setting.label

    for (const styleAttribute of setting.getParameters(this.settingsManager)) {
      new SettingEl(nestedContainerEl)
        .setName(styleAttribute.label)
        .addDropdown(dropdown => dropdown
          .addOptions(Object.fromEntries(styleAttribute.options.map(option => [String(option.value), option.value === null ? t('settings.styles.defaultSuffix', { label: option.label }) : option.label] as const)))
          .setValue((this.settingsManager.getSetting(settingId) as { [key: string]: string })[styleAttribute.key] ?? 'null')
          .onChange(async (value) => {
            const newValue = this.settingsManager.getSetting(settingId) as { [key: string]: string }

            if (value === 'null') delete newValue[styleAttribute.key]
            else newValue[styleAttribute.key] = value

            await this.settingsManager.setSetting({
              [settingId]: newValue
            })
          })
        )
    }
  }

  private createTemplateSelectSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues) {
    const hasFolder = getTemplatesFolder(this.canvasPlugin) !== null
    const templates = listTemplateFiles(this.canvasPlugin)

    new SettingEl(containerEl)
      .setName(t('settings.templateSelect.label'))
      .setDesc(hasFolder
        ? t('settings.templateSelect.description')
        : t('settings.templateSelect.noFolder'))
      .addDropdown(dropdown => {
        dropdown.addOption('', t('settings.templateSelect.none'))
        for (const template of templates)
          dropdown.addOption(template, template.replace(/\.md$/, ''))
        dropdown.setValue(this.settingsManager.getSetting(settingId) as string)
        dropdown.onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      })
  }

  private createFolderSelectSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues) {
    const folders = listVaultFolders(this.canvasPlugin)

    new SettingEl(containerEl)
      .setName(t('settings.folderSelect.label'))
      .setDesc(t('settings.folderSelect.description'))
      .addDropdown(dropdown => {
        dropdown.addOption('', t('settings.folderSelect.none'))
        for (const folder of folders)
          dropdown.addOption(folder, folder)
        dropdown.setValue(this.settingsManager.getSetting(settingId) as string)
        dropdown.onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      })
  }
}
