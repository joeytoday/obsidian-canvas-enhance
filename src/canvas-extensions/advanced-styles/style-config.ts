import { CanvasNodeType } from "src/@types/AdvancedJsonCanvas"
import TextHelper from "src/utils/text-helper"

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
    label: '文本对齐',
    nodeTypes: ['text'],
    options: [
      {
        icon: 'align-left',
        label: '左对齐',
        value: null
      },
      {
        icon: 'align-center',
        label: '居中',
        value: 'center'
      },
      {
        icon: 'align-right',
        label: '右对齐',
        value: 'right'
      }
    ]
  },
  {
    key: 'shape',
    label: '形状',
    nodeTypes: ['text'],
    options: [
      {
        icon: 'rectangle-horizontal',
        label: '圆角矩形',
        value: null
      },
      {
        icon: 'shape-pill',
        label: '胶囊',
        value: 'pill'
      },
      {
        icon: 'diamond',
        label: '菱形',
        value: 'diamond'
      },
      {
        icon: 'shape-parallelogram',
        label: '平行四边形',
        value: 'parallelogram'
      },
      {
        icon: 'circle',
        label: '圆形',
        value: 'circle'
      },
      {
        icon: 'shape-predefined-process',
        label: '预定义流程',
        value: 'predefined-process'
      },
      {
        icon: 'shape-document',
        label: '文档',
        value: 'document'
      },
      {
        icon: 'shape-database',
        label: '数据库',
        value: 'database'
      }
    ]
  },
  {
    key: 'border',
    label: '边框',
    options: [
      {
        icon: 'border-solid',
        label: '实线',
        value: null
      },
      {
        icon: 'border-dashed',
        label: '虚线',
        value: 'dashed'
      },
      {
        icon: 'border-dotted',
        label: '点线',
        value: 'dotted'
      },
      {
        icon: 'eye-off',
        label: '隐藏',
        value: 'invisible'
      }
    ]
  }
] as StyleAttribute[]

export const BUILTIN_EDGE_STYLE_ATTRIBUTES = [
  {
    key: 'path',
    label: '路径样式',
    options: [
      {
        icon: 'path-solid',
        label: '实线',
        value: null
      },
      {
        icon: 'path-dotted',
        label: '点线',
        value: 'dotted'
      },
      {
        icon: 'path-short-dashed',
        label: '短虚线',
        value: 'short-dashed'
      },
      {
        icon: 'path-long-dashed',
        label: '长虚线',
        value: 'long-dashed'
      }
    ]
  },
  {
    key: 'arrow',
    label: '箭头样式',
    options: [
      {
        icon: 'arrow-triangle',
        label: '三角形',
        value: null
      },
      {
        icon: 'arrow-triangle-outline',
        label: '三角形轮廓',
        value: 'triangle-outline'
      },
      {
        icon: 'arrow-thin-triangle',
        label: '细三角形',
        value: 'thin-triangle'
      },
      {
        icon: 'arrow-halved-triangle',
        label: '半三角形',
        value: 'halved-triangle'
      },
      {
        icon: 'arrow-diamond',
        label: '菱形',
        value: 'diamond'
      },
      {
        icon: 'arrow-diamond-outline',
        label: '菱形轮廓',
        value: 'diamond-outline'
      },
      {
        icon: 'arrow-circle',
        label: '圆形',
        value: 'circle'
      },
      {
        icon: 'arrow-circle-outline',
        label: '圆形轮廓',
        value: 'circle-outline'
      },
      {
        icon: 'tally-1',
        label: '平头',
        value: 'blunt'
      }
    ]
  },
  {
    key: 'pathfindingMethod',
    label: '寻路方式',
    options: [
      {
        icon: 'pathfinding-method-bezier',
        label: '贝塞尔曲线',
        value: null
      },
      {
        icon: 'slash',
        label: '直线',
        value: 'direct'
      },
      {
        icon: 'pathfinding-method-square',
        label: '直角',
        value: 'square'
      },
      {
        icon: 'map',
        label: 'A*',
        value: 'a-star'
      }
    ]
  }
] as StyleAttribute[]
