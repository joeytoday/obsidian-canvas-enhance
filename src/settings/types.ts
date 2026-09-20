import type { StyleAttribute } from "src/canvas-extensions/advanced-styles/style-config"
import type SettingsManager from "./settings-manager"

export interface SettingsHeading {
  label: string
  description: string
  infoSection?: string
  disableToggle?: boolean
  children: { [id: string]: Setting }
}

interface SettingBase {
  label: string
  description: string
}

export type Setting = TextSetting | NumberSetting | DimensionSetting | BooleanSetting |
  DropdownSetting | ButtonSetting | StyleAttributesSetting | TemplateSelectSetting | FolderSelectSetting

export interface StyleAttributesSetting {
  label: string
  type: 'styles'
  getParameters: (settingsManager: SettingsManager) => StyleAttribute[]
}

export interface TextSetting extends SettingBase {
  type: 'text'
  parse?: (value: string) => string
}

export interface NumberSetting extends SettingBase {
  type: 'number'
  parse: (value: string) => number
}

export interface DimensionSetting extends SettingBase {
  type: 'dimension'
  parse: (value: [string, string]) => [number, number]
}

export interface BooleanSetting extends SettingBase {
  type: 'boolean'
}

export interface DropdownSetting extends SettingBase {
  type: 'dropdown'
  options: { [id: string]: string }
}

export interface ButtonSetting extends SettingBase {
  type: 'button'
  onClick: () => unknown
}

export interface TemplateSelectSetting extends SettingBase {
  type: 'templateSelect'
}

export interface FolderSelectSetting extends SettingBase {
  type: 'folderSelect'
}
