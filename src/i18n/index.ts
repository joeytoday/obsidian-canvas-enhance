import { getLanguage } from "obsidian"
import { en } from "./locales/en"
import { TranslationKey, zhCn } from "./locales/zh-cn"

// To add a language: create a dictionary in ./locales (same keys as zh-cn.ts) and register it here
export const LANGUAGES = {
  'zh-cn': { label: '中文', dict: zhCn as Record<TranslationKey, string> },
  'en': { label: 'English', dict: en },
}

export type LanguageId = keyof typeof LANGUAGES
export type LanguageSetting = 'auto' | LanguageId

const FALLBACK_LANGUAGE: LanguageId = 'zh-cn'

let currentLanguage: LanguageId = FALLBACK_LANGUAGE

function isLanguageId(value: string): value is LanguageId {
  return Object.keys(LANGUAGES).includes(value)
}

export function resolveLanguage(setting: string): LanguageId {
  if (isLanguageId(setting)) return setting

  // "auto" (or an unknown value): follow the Obsidian interface language
  return getLanguage().toLowerCase().startsWith('zh') ? 'zh-cn' : 'en'
}

// The interface language is applied once, when the plugin loads: registered commands and menus cannot be renamed later,
// so changing the setting only takes effect after Obsidian is reloaded
export function setLanguage(setting: string) {
  currentLanguage = resolveLanguage(setting)
}

export function getActiveLanguage(): LanguageId {
  return currentLanguage
}

export function t(key: TranslationKey, params?: { [name: string]: string | number }): string {
  const template = LANGUAGES[currentLanguage].dict[key] ?? LANGUAGES[FALLBACK_LANGUAGE].dict[key] ?? key
  if (!params) return template

  return template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
}

/** Options for a language dropdown: "auto" first, then every registered language under its own name */
export function getLanguageOptions(): { [id: string]: string } {
  const options: { [id: string]: string } = { auto: t('settings.language.auto') }
  for (const id of Object.keys(LANGUAGES) as LanguageId[]) options[id] = LANGUAGES[id].label
  return options
}
