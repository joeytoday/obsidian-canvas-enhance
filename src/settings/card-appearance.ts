import { isRecord } from 'src/utils/type-helper'
import type { TranslationKey } from 'src/i18n/locales/zh-cn'

interface CardAppearanceControl {
  key: string
  label: TranslationKey
  defaultValue: number | string
  cssVariable: string
  unit?: '%' | 'px'
  max?: number
}

export const CARD_APPEARANCE_CONTROLS: CardAppearanceControl[] = [
  { key: 'gradientStart', label: 'settings.cardAppearance.gradientStart', defaultValue: 0, cssVariable: '--ce-gradient-start', unit: '%', max: 100 },
  { key: 'gradientEnd', label: 'settings.cardAppearance.gradientEnd', defaultValue: 30, cssVariable: '--ce-gradient-end', unit: '%', max: 100 },
  { key: 'borderWidth', label: 'settings.cardAppearance.borderWidth', defaultValue: 5, cssVariable: '--ce-card-border-width', unit: 'px', max: 30 },
  { key: 'shadowDistance', label: 'settings.cardAppearance.shadowDistance', defaultValue: 8, cssVariable: '--ce-shadow-distance', unit: 'px', max: 40 },
  { key: 'shadowBlur', label: 'settings.cardAppearance.shadowBlur', defaultValue: 10, cssVariable: '--ce-shadow-blur', unit: 'px', max: 40 },
  { key: 'shadowOpacity', label: 'settings.cardAppearance.shadowOpacity', defaultValue: 25, cssVariable: '--ce-shadow-opacity', unit: '%', max: 100 },
  { key: 'shadowLightColor', label: 'settings.cardAppearance.shadowLightColor', defaultValue: '#000000', cssVariable: '--ce-shadow-light-color' },
  { key: 'shadowDarkColor', label: 'settings.cardAppearance.shadowDarkColor', defaultValue: '#ffffff', cssVariable: '--ce-shadow-dark-color' }
]

// Validate saved settings as well as UI input before exposing values to CSS.
export function getCardAppearance(value: unknown): Record<string, number | string> {
  const saved = isRecord(value) ? value : {}
  return Object.fromEntries(CARD_APPEARANCE_CONTROLS.map(control => {
    const input = saved[control.key]
    const valid = typeof control.defaultValue === 'number'
      ? typeof input === 'number' && Number.isFinite(input)
        ? Math.min(control.max ?? 100, Math.max(0, input)) : control.defaultValue
      : typeof input === 'string' && /^#[\da-f]{6}$/i.test(input) ? input : control.defaultValue
    return [control.key, valid]
  }))
}
