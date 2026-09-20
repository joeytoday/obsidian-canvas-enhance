import { CanvasNodeType } from "src/@types/AdvancedJsonCanvas"
import TextHelper from "src/utils/text-helper"
import { t } from "src/i18n"

export interface StyleAttributeOption {
  icon: string
  label: string
  value: string | null // The element with the null value is the default
}

export interface StyleAttribute {
  key: string
  label: string
  nodeTypes?: CanvasNodeType[]
  options: StyleAttributeOption[]
}

export function styleAttributeValidator(json: Record<string, any>): StyleAttribute | null {
  const hasKey = json.key !== undefined
  const hasLabel = json.label !== undefined
  const hasOptions = Array.isArray(json.options)

  if (!hasKey) console.error('Style attribute is missing the "key" property')
  if (!hasLabel) console.error('Style attribute is missing the "label" property')
  if (!hasOptions) console.error('Style attribute is missing the "options" property or is not an array')

  // Camel case the key
  json.key = TextHelper.toCamelCase(json.key)

  let optionsValid = true
  let hasDefault = false
  for (const option of json.options) {
    const hasIcon = option.icon !== undefined
    const hasLabel = option.label !== undefined
    const hasValue = option.value !== undefined

    if (!hasIcon) console.error(`Style attribute option (${option.value ?? option.label}) is missing the "icon" property`)
    if (!hasLabel) console.error(`Style attribute option (${option.value}) is missing the "label" property`)
    if (!hasValue) console.error(`Style attribute option (${option.label}) is missing the "value" property`)

    if (!hasIcon || !hasLabel || !hasValue) optionsValid = false
    if (option.value === null) hasDefault = true
  }
  if (!hasDefault) console.error('Style attribute is missing a default option (option with a "value" of null)')

  const isValid = hasKey && hasLabel && hasOptions && optionsValid && hasDefault
  return isValid ? json as StyleAttribute : null
}

export const BUILTIN_NODE_STYLE_ATTRIBUTES = [
  {
    key: 'textAlign',
    get label() { return t('style.textAlign.label') },
    nodeTypes: ['text'],
    options: [
      {
        icon: 'align-left',
        get label() { return t('style.textAlign.option.align-left') },
        value: null
      },
      {
        icon: 'align-center',
        get label() { return t('style.textAlign.option.align-center') },
        value: 'center'
      },
      {
        icon: 'align-right',
        get label() { return t('style.textAlign.option.align-right') },
        value: 'right'
      }
    ]
  },
  {
    key: 'shape',
    get label() { return t('style.shape.label') },
    nodeTypes: ['text'],
    options: [
      {
        icon: 'rectangle-horizontal',
        get label() { return t('style.shape.option.rectangle-horizontal') },
        value: null
      },
      {
        icon: 'shape-pill',
        get label() { return t('style.shape.option.shape-pill') },
        value: 'pill'
      },
      {
        icon: 'diamond',
        get label() { return t('style.shape.option.diamond') },
        value: 'diamond'
      },
      {
        icon: 'shape-parallelogram',
        get label() { return t('style.shape.option.shape-parallelogram') },
        value: 'parallelogram'
      },
      {
        icon: 'circle',
        get label() { return t('style.shape.option.circle') },
        value: 'circle'
      },
      {
        icon: 'shape-predefined-process',
        get label() { return t('style.shape.option.shape-predefined-process') },
        value: 'predefined-process'
      },
      {
        icon: 'shape-document',
        get label() { return t('style.shape.option.shape-document') },
        value: 'document'
      },
      {
        icon: 'shape-database',
        get label() { return t('style.shape.option.shape-database') },
        value: 'database'
      }
    ]
  },
  {
    key: 'border',
    get label() { return t('style.border.label') },
    options: [
      {
        icon: 'border-solid',
        get label() { return t('style.border.option.border-solid') },
        value: null
      },
      {
        icon: 'border-dashed',
        get label() { return t('style.border.option.border-dashed') },
        value: 'dashed'
      },
      {
        icon: 'border-dotted',
        get label() { return t('style.border.option.border-dotted') },
        value: 'dotted'
      },
      {
        icon: 'eye-off',
        get label() { return t('style.border.option.eye-off') },
        value: 'invisible'
      }
    ]
  }
] as StyleAttribute[]

export const BUILTIN_EDGE_STYLE_ATTRIBUTES = [
  {
    key: 'path',
    get label() { return t('style.path.label') },
    options: [
      {
        icon: 'path-solid',
        get label() { return t('style.path.option.path-solid') },
        value: null
      },
      {
        icon: 'path-dotted',
        get label() { return t('style.path.option.path-dotted') },
        value: 'dotted'
      },
      {
        icon: 'path-short-dashed',
        get label() { return t('style.path.option.path-short-dashed') },
        value: 'short-dashed'
      },
      {
        icon: 'path-long-dashed',
        get label() { return t('style.path.option.path-long-dashed') },
        value: 'long-dashed'
      }
    ]
  },
  {
    key: 'arrow',
    get label() { return t('style.arrow.label') },
    options: [
      {
        icon: 'arrow-triangle',
        get label() { return t('style.arrow.option.arrow-triangle') },
        value: null
      },
      {
        icon: 'arrow-triangle-outline',
        get label() { return t('style.arrow.option.arrow-triangle-outline') },
        value: 'triangle-outline'
      },
      {
        icon: 'arrow-thin-triangle',
        get label() { return t('style.arrow.option.arrow-thin-triangle') },
        value: 'thin-triangle'
      },
      {
        icon: 'arrow-halved-triangle',
        get label() { return t('style.arrow.option.arrow-halved-triangle') },
        value: 'halved-triangle'
      },
      {
        icon: 'arrow-diamond',
        get label() { return t('style.arrow.option.arrow-diamond') },
        value: 'diamond'
      },
      {
        icon: 'arrow-diamond-outline',
        get label() { return t('style.arrow.option.arrow-diamond-outline') },
        value: 'diamond-outline'
      },
      {
        icon: 'arrow-circle',
        get label() { return t('style.arrow.option.arrow-circle') },
        value: 'circle'
      },
      {
        icon: 'arrow-circle-outline',
        get label() { return t('style.arrow.option.arrow-circle-outline') },
        value: 'circle-outline'
      },
      {
        icon: 'tally-1',
        get label() { return t('style.arrow.option.tally-1') },
        value: 'blunt'
      }
    ]
  },
  {
    key: 'pathfindingMethod',
    get label() { return t('style.pathfindingMethod.label') },
    options: [
      {
        icon: 'pathfinding-method-bezier',
        get label() { return t('style.pathfindingMethod.option.pathfinding-method-bezier') },
        value: null
      },
      {
        icon: 'slash',
        get label() { return t('style.pathfindingMethod.option.slash') },
        value: 'direct'
      },
      {
        icon: 'pathfinding-method-square',
        get label() { return t('style.pathfindingMethod.option.pathfinding-method-square') },
        value: 'square'
      },
      {
        icon: 'map',
        get label() { return t('style.pathfindingMethod.option.map') },
        value: 'a-star'
      }
    ]
  }
] as StyleAttribute[]
