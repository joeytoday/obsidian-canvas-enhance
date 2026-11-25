import { CanvasNodeType } from "src/@types/AdvancedJsonCanvas"
import TextHelper from "src/utils/text-helper"
import { t } from "src/i18n"
import { isRecord } from "src/utils/type-helper"

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

export function styleAttributeValidator(json: Record<string, unknown>): StyleAttribute | null {
  const { key, label, nodeTypes } = json
  if (typeof key !== 'string' || typeof label !== 'string' || !Array.isArray(json.options)) {
    console.error('Style attribute requires string "key" and "label" properties and an "options" array')
    return null
  }

  const options: unknown[] = json.options
  if (!options.every((option): option is StyleAttributeOption => isRecord(option) &&
    typeof option.icon === 'string' && typeof option.label === 'string' &&
    (typeof option.value === 'string' || option.value === null))) {
    console.error('Style attribute options require string "icon" and "label" properties and a string or null "value"')
    return null
  }
  if (!options.some(option => option.value === null)) {
    console.error('Style attribute is missing a default option (option with a "value" of null)')
    return null
  }

  const style: StyleAttribute = { ...json, key: TextHelper.toCamelCase(key), label, options }
  if (nodeTypes !== undefined) {
    if (!Array.isArray(nodeTypes) ||
      !nodeTypes.every((type: unknown): type is CanvasNodeType => type === 'text' || type === 'file' || type === 'group' || type === 'link')) return null
    style.nodeTypes = nodeTypes
  }
  return style
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
  },
  // Keep the original snippet keys and values so existing cards need no migration.
  {
    key: 'cardGradient',
    get label() { return t('style.cardGradient.label') },
    options: [
      { icon: 'circle-dot', get label() { return t('style.card.none') }, value: null },
      { icon: 'move-up-right', get label() { return t('style.card.upperRight') }, value: 'ur' },
      { icon: 'move-down-right', get label() { return t('style.card.lowerRight') }, value: 'lr' },
      { icon: 'move-down-left', get label() { return t('style.card.lowerLeft') }, value: 'll' },
      { icon: 'move-up-left', get label() { return t('style.card.upperLeft') }, value: 'ul' }
    ]
  },
  {
    key: 'cardBorder',
    get label() { return t('style.cardBorder.label') },
    options: [
      { icon: 'square', get label() { return t('style.cardBorder.standard') }, value: null },
      { icon: 'arrow-left-to-line', get label() { return t('style.cardBorder.left') }, value: 'left' },
      { icon: 'arrow-up-to-line', get label() { return t('style.cardBorder.top') }, value: 'top' },
      { icon: 'arrow-right-to-line', get label() { return t('style.cardBorder.right') }, value: 'right' },
      { icon: 'arrow-down-to-line', get label() { return t('style.cardBorder.bottom') }, value: 'bottom' },
      { icon: 'panel-top-bottom-dashed', get label() { return t('style.cardBorder.banded') }, value: 'banded' },
      { icon: 'panel-left-right-dashed', get label() { return t('style.cardBorder.rail') }, value: 'rail' },
      { icon: 'square-dashed', get label() { return t('style.cardBorder.borderless') }, value: 'borderless' }
    ]
  },
  {
    key: 'cardDropshadow',
    get label() { return t('style.cardDropshadow.label') },
    options: [
      { icon: 'sticky-note', get label() { return t('style.card.none') }, value: null },
      { icon: 'move-down-right', get label() { return t('style.card.lowerRight') }, value: 'lr' },
      { icon: 'move-down-left', get label() { return t('style.card.lowerLeft') }, value: 'll' },
      { icon: 'move-up-left', get label() { return t('style.card.upperLeft') }, value: 'ul' },
      { icon: 'move-up-right', get label() { return t('style.card.upperRight') }, value: 'ur' }
    ]
  }
] as StyleAttribute[]

export function getNodeStyleAttributes(legacy: StyleAttribute[], css: StyleAttribute[]): StyleAttribute[] {
  const styles = [...BUILTIN_NODE_STYLE_ATTRIBUTES, ...legacy, ...css]
  const lastIndex = new Map(styles.map((style, index) => [style.key, index]))
  // Only deduplicate the newly built-in snippet groups. Preserve existing custom
  // shape/border definitions, whose options and node type restrictions may differ.
  return styles.filter((style, index) =>
    !['cardGradient', 'cardBorder', 'cardDropshadow'].includes(style.key) || lastIndex.get(style.key) === index)
}

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
