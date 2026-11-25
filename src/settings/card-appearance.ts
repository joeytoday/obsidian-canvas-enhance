import { isRecord } from 'src/utils/type-helper'
import type { TranslationKey } from 'src/i18n/locales/zh-cn'

interface CardAppearanceControl {
  key: string
  label: TranslationKey
  defaultValue: number | string
  cssVariable: string
  unit?: '%' | 'px'
  min?: number
  max?: number
  group?: 'sections'
  input?: 'fontSize'
}

export const CARD_SECTION_FONT_CONTROLS: Record<'header' | 'footer', CardAppearanceControl> = {
  header: { key: 'headerFontSize', label: 'settings.cardAppearance.headerFontSize', defaultValue: 16, input: 'fontSize', cssVariable: '--ce-header-font-size', unit: 'px', min: 10, max: 32, group: 'sections' },
  footer: { key: 'footerFontSize', label: 'settings.cardAppearance.footerFontSize', defaultValue: 16, input: 'fontSize', cssVariable: '--ce-footer-font-size', unit: 'px', min: 10, max: 32, group: 'sections' }
}

export const CARD_APPEARANCE_CONTROLS: CardAppearanceControl[] = [
  { key: 'gradientStart', label: 'settings.cardAppearance.gradientStart', defaultValue: 0, cssVariable: '--ce-gradient-start', unit: '%', max: 100 },
  { key: 'gradientEnd', label: 'settings.cardAppearance.gradientEnd', defaultValue: 30, cssVariable: '--ce-gradient-end', unit: '%', max: 100 },
  { key: 'borderWidth', label: 'settings.cardAppearance.borderWidth', defaultValue: 5, cssVariable: '--ce-card-border-width', unit: 'px', max: 30 },
  { key: 'shadowDistance', label: 'settings.cardAppearance.shadowDistance', defaultValue: 8, cssVariable: '--ce-shadow-distance', unit: 'px', max: 40 },
  { key: 'shadowBlur', label: 'settings.cardAppearance.shadowBlur', defaultValue: 10, cssVariable: '--ce-shadow-blur', unit: 'px', max: 40 },
  { key: 'shadowOpacity', label: 'settings.cardAppearance.shadowOpacity', defaultValue: 25, cssVariable: '--ce-shadow-opacity', unit: '%', max: 100 },
  { key: 'shadowLightColor', label: 'settings.cardAppearance.shadowLightColor', defaultValue: '#000000', cssVariable: '--ce-shadow-light-color' },
  { key: 'shadowDarkColor', label: 'settings.cardAppearance.shadowDarkColor', defaultValue: '#ffffff', cssVariable: '--ce-shadow-dark-color' },
  CARD_SECTION_FONT_CONTROLS.header,
  CARD_SECTION_FONT_CONTROLS.footer,
  { key: 'sectionPadding', label: 'settings.cardAppearance.sectionPadding', defaultValue: 12, cssVariable: '--ce-section-padding', unit: 'px', max: 32, group: 'sections' },
  { key: 'sectionBackgroundOpacity', label: 'settings.cardAppearance.sectionBackgroundOpacity', defaultValue: 10, cssVariable: '--ce-section-background-opacity', unit: '%', max: 100, group: 'sections' },
  { key: 'sectionDividerWidth', label: 'settings.cardAppearance.sectionDividerWidth', defaultValue: 1, cssVariable: '--ce-section-divider-width', unit: 'px', max: 6, group: 'sections' }
]

// Validate saved settings as well as UI input before exposing values to CSS.
export function getCardAppearance(value: unknown): Record<string, number | string> {
  const saved = isRecord(value) ? value : {}
  return Object.fromEntries(CARD_APPEARANCE_CONTROLS.map(control => {
    const input = saved[control.key] ??
      (control === CARD_SECTION_FONT_CONTROLS.header || control === CARD_SECTION_FONT_CONTROLS.footer ? saved.sectionFontSize : undefined)
    const valid = typeof control.defaultValue === 'number'
      ? typeof input === 'number' && Number.isFinite(input)
        ? control.input === 'fontSize' && input === 0 ? control.defaultValue : Math.min(control.max ?? 100, Math.max(control.min ?? 0, input)) : control.defaultValue
      : typeof input === 'string' && /^#[\da-f]{6}$/i.test(input) ? input : control.defaultValue
    return [control.key, valid]
  }))
}
