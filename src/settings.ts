import { Notice, PluginSettingTab, Setting as SettingEl, TextComponent } from "obsidian"
import { BooleanSetting, ButtonSetting, DimensionSetting, DropdownSetting, NodeTemplateListSetting, NumberSetting, Setting, SettingsHeading, StyleAttributesSetting, TextSetting } from "./@types/Settings"
import { GET_EDGE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/edge-styles"
import { GET_NODE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/node-styles"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute } from "./canvas-extensions/advanced-styles/style-config"
import { NodeTemplate } from "./canvas-extensions/node-templates-canvas-extension"
import { VARIABLE_BREAKPOINT_CSS_VAR } from "./canvas-extensions/variable-breakpoint-canvas-extension"
import CanvasEnhancePlugin from "./main"
import CssStylesConfigManager from "./managers/css-styles-config-manager"

const README_URL = 'https://github.com/joeytoday/obsidian-canvas-enhance?tab=readme-ov-file'

export interface CanvasEnhancePluginSettingsValues {
  nodeTypeOnDoubleClick: keyof typeof SETTINGS.general.children.nodeTypeOnDoubleClick.options
  alignNewNodesToGrid: boolean
  defaultTextNodeDimensions: [number, number]
  defaultFileNodeDimensions: [number, number]
  minNodeSize: number
  maxNodeWidth: number
  disableFontSizeRelativeToZoom: boolean

  canvasMetadataCompatibilityEnabled: boolean
  enableSingleNodeLinks: boolean
  enableSingleNodePopupReferenceCopy: boolean

  combineCustomStylesInDropdown: boolean

  nodeStylingFeatureEnabled: boolean
  customNodeStyleAttributes: StyleAttribute[]
  defaultTextNodeColor: number
  defaultTextNodeStyleAttributes: { [key: string]: string }
  nodeTemplates: NodeTemplate[]

  edgesStylingFeatureEnabled: boolean
  customEdgeStyleAttributes: StyleAttribute[]
  inheritEdgeColorFromNode: boolean
  defaultEdgeColor: number
  defaultEdgeLineDirection: keyof typeof SETTINGS.edgesStylingFeatureEnabled.children.defaultEdgeLineDirection.options
  defaultEdgeStyleAttributes: { [key: string]: string }
  edgeStyleUpdateWhileDragging: boolean
  edgeStyleSquarePathRounded: boolean
  edgeStylePathfinderAllowDiagonal: boolean
  edgeStylePathfinderPathRounded: boolean

  variableBreakpointFeatureEnabled: boolean

  zOrderingControlFeatureEnabled: boolean
  zOrderingControlShowOneLayerShiftOptions: boolean

  aspectRatioControlFeatureEnabled: boolean

  commandsFeatureEnabled: boolean
  zoomToClonedNode: boolean
  cloneNodeMargin: number
  expandNodeStepSize: number

  nativeFileSearchEnabled: boolean

  floatingEdgeFeatureEnabled: boolean
  allowFloatingEdgeCreation: boolean
  newEdgeFromSideFloating: boolean

  flipEdgeFeatureEnabled: boolean

  betterExportFeatureEnabled: boolean

  betterReadonlyEnabled: boolean
  hideBackgroundGridWhenInReadonly: boolean
  disableNodePopup: boolean
  disableZoom: boolean
  disablePan: boolean

  readingModeFixEnabled: boolean

  autoResizeNodeFeatureEnabled: boolean
  autoResizeNodeEnabledByDefault: boolean
  autoResizeNodeMaxHeight: number
  autoResizeNodeSnapToGrid: boolean

  collapsibleGroupsFeatureEnabled: boolean
  collapsedGroupPreviewOnDrag: boolean

  focusModeFeatureEnabled: boolean

  canvasEncapsulationEnabled: boolean

  portalsFeatureEnabled: boolean
  showEdgesIntoDisabledPortals: boolean

  autoFileNodeEdgesFeatureEnabled: boolean
  autoFileNodeEdgesFrontmatterKey: string

  edgeHighlightEnabled: boolean
  highlightIncomingEdges: boolean

  edgeSelectionEnabled: boolean
  selectEdgeByDirection: boolean

  overviewModeFeatureEnabled: boolean
  overviewModeZoomThreshold: number
  overviewModeFileNodeTitle: keyof typeof SETTINGS.overviewModeFeatureEnabled.children.overviewModeFileNodeTitle.options
  overviewModeGroupLabelScale: boolean
  overviewModeMaxFontSize: number

  mindmapFeatureEnabled: boolean
  mindmapChildNodeSpacing: number
  mindmapSiblingNodeSpacing: number
  mindmapUseNavigationHotkeys: boolean
  mindmapUseFloatingNodeHotkeys: boolean
  mindmapPropagateColorToEdges: boolean
}

export const DEFAULT_SETTINGS_VALUES: CanvasEnhancePluginSettingsValues = {
  nodeTypeOnDoubleClick: 'text',
  alignNewNodesToGrid: true,
  defaultTextNodeDimensions: [260, 60],
  defaultFileNodeDimensions: [400, 400],
  minNodeSize: 60,
  maxNodeWidth: -1,
  disableFontSizeRelativeToZoom: false,

  canvasMetadataCompatibilityEnabled: true,
  enableSingleNodeLinks: true,
  enableSingleNodePopupReferenceCopy: false,

  combineCustomStylesInDropdown: false,

  nodeStylingFeatureEnabled: true,
  customNodeStyleAttributes: [],
  defaultTextNodeColor: 0,
  defaultTextNodeStyleAttributes: {},
  nodeTemplates: [],

  edgesStylingFeatureEnabled: true,
  customEdgeStyleAttributes: [],
  inheritEdgeColorFromNode: false,
  defaultEdgeColor: 0,
  defaultEdgeLineDirection: 'unidirectional',
  defaultEdgeStyleAttributes: {},
  edgeStyleUpdateWhileDragging: false,
  edgeStyleSquarePathRounded: true,
  edgeStylePathfinderAllowDiagonal: false,
  edgeStylePathfinderPathRounded: true,

  variableBreakpointFeatureEnabled: false,

  zOrderingControlFeatureEnabled: false,
  zOrderingControlShowOneLayerShiftOptions: false,

  aspectRatioControlFeatureEnabled: false,

  commandsFeatureEnabled: true,
  zoomToClonedNode: true,
  cloneNodeMargin: 20,
  expandNodeStepSize: 20,

  nativeFileSearchEnabled: true,

  floatingEdgeFeatureEnabled: true,
  allowFloatingEdgeCreation: false,
  newEdgeFromSideFloating: false,

  flipEdgeFeatureEnabled: true,

  betterExportFeatureEnabled: true,

  betterReadonlyEnabled: false,
  hideBackgroundGridWhenInReadonly: true,
  disableNodePopup: false,
  disableZoom: false,
  disablePan: false,

  readingModeFixEnabled: false,

  autoResizeNodeFeatureEnabled: false,
  autoResizeNodeEnabledByDefault: false,
  autoResizeNodeMaxHeight: -1,
  autoResizeNodeSnapToGrid: true,

  collapsibleGroupsFeatureEnabled: true,
  collapsedGroupPreviewOnDrag: true,

  focusModeFeatureEnabled: false,

  canvasEncapsulationEnabled: false,

  portalsFeatureEnabled: true,
  showEdgesIntoDisabledPortals: true,

  autoFileNodeEdgesFeatureEnabled: false,
  autoFileNodeEdgesFrontmatterKey: 'canvas-edges',

  edgeHighlightEnabled: false,
  highlightIncomingEdges: false,

  edgeSelectionEnabled: false,
  selectEdgeByDirection: false,

  overviewModeFeatureEnabled: true,
  overviewModeZoomThreshold: 0.4,
  overviewModeFileNodeTitle: 'filename',
  overviewModeGroupLabelScale: true,
  overviewModeMaxFontSize: 64,

  mindmapFeatureEnabled: true,
  mindmapChildNodeSpacing: 200,
  mindmapSiblingNodeSpacing: 20,
  mindmapUseNavigationHotkeys: true,
  mindmapUseFloatingNodeHotkeys: true,
  mindmapPropagateColorToEdges: false,
}

export const SETTINGS = {
  general: {
    label: '通用',
    description: 'Canvas Enhance 插件的通用设置。',
    disableToggle: true,
    children: {
      nodeTypeOnDoubleClick: {
        label: '双击创建的节点类型',
        description: '在画布上双击时创建的节点类型。选择「原生」则不拦截，使用 Obsidian 默认行为。',
        type: 'dropdown',
        options: {
          'native': '原生',
          'text': '文本',
          'file': '文件'
        }
      } as DropdownSetting,
      alignNewNodesToGrid: {
        label: '新节点自动对齐网格',
        description: '启用后，新节点将自动对齐到网格。',
        type: 'boolean'
      },
      defaultTextNodeDimensions: {
        label: '默认文本节点尺寸',
        description: '文本节点的默认尺寸。',
        type: 'dimension',
        parse: (value: [string, string]) => {
          const width = Math.max(1, parseInt(value[0]) || 0)
          const height = Math.max(1, parseInt(value[1]) || 0)
          return [width, height]
        }
      },
      defaultFileNodeDimensions: {
        label: '默认文件节点尺寸',
        description: '文件节点的默认尺寸。',
        type: 'dimension',
        parse: (value: [string, string]) => {
          const width = Math.max(1, parseInt(value[0]) || 0)
          const height = Math.max(1, parseInt(value[1]) || 0)
          return [width, height]
        }
      },
      minNodeSize: {
        label: '最小节点尺寸',
        description: '节点的最小尺寸（宽或高）。',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      maxNodeWidth: {
        label: '最大节点宽度',
        description: '节点的最大宽度，设为 -1 表示不限制。',
        type: 'number',
        parse: (value: string) => Math.max(-1, parseInt(value) || 0)
      },
      disableFontSizeRelativeToZoom: {
        label: '禁用缩放时的字体缩放',
        description: '启用后，缩小画布时不会自动放大分组标题和边标签的字体。',
        type: 'boolean'
      }
    }
  },
  commandsFeatureEnabled: {
    label: '扩展命令',
    description: '为画布添加更多操作命令。',
    infoSection: '交互与工作流',
    children: {
      zoomToClonedNode: {
        label: '克隆后跳转到节点',
        description: '启用后，克隆节点后画布会自动缩放到新节点。',
        type: 'boolean'
      },
      cloneNodeMargin: {
        label: '克隆节点间距',
        description: '克隆节点与原节点之间的间距。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      expandNodeStepSize: {
        label: '扩展节点步长',
        description: '每次扩展节点的步长。',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      }
    }
  },
  canvasMetadataCompatibilityEnabled: {
    label: '启用 .canvas 元数据缓存兼容',
    description: '使 .canvas 文件支持反向链接和出链功能，并在图谱视图中显示连接关系。',
    infoSection: '核心增强',
    children: {
      enableSingleNodeLinks: {
        label: '启用 [[wikilink]] 引用节点',
        description: '启用后，可以用 [[canvas-file#node-id]] 引用和嵌入单个节点（使用「复制节点 wikilink」命令获取 ID）。',
        type: 'boolean'
      },
      enableSingleNodePopupReferenceCopy: {
        label: '显示复制 [[wikilink]] 按钮',
        description: '启用后，节点弹出菜单会显示一个按钮，方便复制节点的 [[wikilink]]。',
        type: 'boolean'
      }
    }
  },
  nativeFileSearchEnabled: {
    label: '类原生文件搜索',
    description: '启用后，使用 Obsidian 原生文件搜索来搜索画布内容。',
    infoSection: '核心增强',
    children: { }
  },
  autoFileNodeEdgesFeatureEnabled: {
    label: '自动文件节点连边',
    description: '根据文件节点的 frontmatter 链接自动创建边。',
    infoSection: '核心增强',
    children: {
      autoFileNodeEdgesFrontmatterKey: {
        label: 'Frontmatter 键名',
        description: '用于获取出链的 frontmatter 键名。（保持默认值以获得最佳兼容性。）',
        type: 'text',
        parse: (value: string) => value.trim() || 'canvas-edges'
      }
    }
  },
  portalsFeatureEnabled: {
    label: '门户',
    description: '在当前画布中嵌入其他画布。',
    infoSection: '交互与工作流',
    children: {
      showEdgesIntoDisabledPortals: {
        label: '显示连入已禁用门户的边',
        description: '启用后，连入已禁用门户的边将显示出来。',
        type: 'boolean'
      }
    }
  },
  collapsibleGroupsFeatureEnabled: {
    label: '可折叠分组',
    description: '分组节点可以展开和折叠，保持画布整洁。',
    infoSection: '交互与工作流',
    children: {
      collapsedGroupPreviewOnDrag: {
        label: '拖拽时显示折叠分组预览',
        description: '启用后，拖拽节点时折叠分组会显示其边界。',
        type: 'boolean'
      }
    }
  },
  combineCustomStylesInDropdown: {
    label: '合并自定义样式',
    description: '将所有自定义样式属性合并到一个下拉菜单中。',
    children: { }
  },
  nodeStylingFeatureEnabled: {
    label: '节点样式',
    description: '用不同的形状和边框样式装饰节点。',
    infoSection: '节点',
    children: {
      customNodeStyleAttributes: {
        label: '自定义节点样式设置',
        description: '为节点添加自定义样式设置。（前往 GitHub 了解更多信息）',
        type: 'button',
        onClick: () => {
          const anchor = activeDocument.createElement('a')
          anchor.href = "https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/README.md#自定义样式"
          anchor.target = '_blank'
          anchor.click()
        },
      } as ButtonSetting,
      defaultTextNodeColor: {
        label: '默认文本节点颜色',
        description: '文本节点的默认颜色。范围 0-6，0 表示无颜色。可通过自定义颜色功能扩展范围。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      defaultTextNodeStyleAttributes: {
        label: '默认文本节点样式属性',
        type: 'styles',
        getParameters(settingsManager) {
          return [
            ...BUILTIN_NODE_STYLE_ATTRIBUTES, /* BUILTINS */
            ...settingsManager.nodeCssStylesManager.getStyles(), /* CUSTOM CSS STYLES */
            ...settingsManager.getSetting('customNodeStyleAttributes') /* LEGACY CUSTOM STYLES */
          ].filter((setting) => setting.nodeTypes === undefined || setting.nodeTypes?.includes('text'))
        }
      } as StyleAttributesSetting
    }
  },
  edgesStylingFeatureEnabled: {
    label: '边样式',
    description: '用不同的路径样式装饰边。',
    infoSection: '边',
    children: {
      customEdgeStyleAttributes: {
        label: '自定义边样式设置',
        description: '为边添加自定义样式设置。（前往 GitHub 了解更多信息）',
        type: 'button',
        onClick: () => {
          const anchor = activeDocument.createElement('a')
          anchor.href = "https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/README.md#自定义样式"
          anchor.target = '_blank'
          anchor.click()
        },
      } as ButtonSetting,
      inheritEdgeColorFromNode: {
        label: '从节点继承边颜色',
        description: '从节点拖出创建新边时，边将继承该节点的颜色。',
        type: 'boolean'
      },
      defaultEdgeColor: {
        label: '默认边颜色',
        description: '边的默认颜色。范围 0-6，0 表示无颜色。可通过自定义颜色功能扩展范围。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      defaultEdgeLineDirection: {
        label: '默认边方向',
        description: '边的默认方向。',
        type: 'dropdown',
        options: {
          'nondirectional': '无方向',
          'unidirectional': '单向',
          'bidirectional': '双向'
        }
      } as DropdownSetting,
      defaultEdgeStyleAttributes: {
        label: '默认边样式属性',
        type: 'styles',
        getParameters(settingsManager) {
          return [
            ...BUILTIN_EDGE_STYLE_ATTRIBUTES, /* BUILTINS */
            ...settingsManager.edgeCssStylesManager.getStyles(), /* CUSTOM CSS STYLES */
            ...settingsManager.getSetting('customEdgeStyleAttributes') /* LEGACY CUSTOM STYLES */
          ]
        }
      } as StyleAttributesSetting,
      edgeStyleUpdateWhileDragging: {
        label: '拖拽时更新边样式（可能很慢）',
        description: '启用后，拖拽边时会实时更新边样式。',
        type: 'boolean'
      },
      edgeStyleSquarePathRounded: {
        label: '直角折线圆角化',
        description: '启用后，直角折线的转角变为圆角。',
        type: 'boolean'
      },
      edgeStylePathfinderAllowDiagonal: {
        label: '自动避障允许斜线',
        description: '启用后，自动避障的连线可以走斜线。',
        type: 'boolean'
      },
      edgeStylePathfinderPathRounded: {
        label: '自动避障路径圆角',
        description: '启用后，自动避障的连线转角变为圆角。',
        type: 'boolean'
      }
    }
  },
  floatingEdgeFeatureEnabled: {
    label: '浮动边（自动选择连接侧）',
    description: '浮动边会自动放置在节点最合适的一侧。',
    infoSection: '边',
    children: {
      allowFloatingEdgeCreation: {
        label: '允许创建浮动边',
        description: '允许通过拖拽边到目标节点来创建浮动边，无需指定连接侧。（禁用后，浮动边只能通过其他 Canvas Enhance 功能创建和使用。）',
        type: 'boolean'
      },
      newEdgeFromSideFloating: {
        label: '新边起点自动浮动',
        description: '启用后，新边的「起点」侧将始终为浮动模式。',
        type: 'boolean'
      }
    }
  },
  flipEdgeFeatureEnabled: {
    label: '翻转边',
    description: '通过弹出菜单翻转边的方向。',
    infoSection: '边',
    children: { }
  },
  zOrderingControlFeatureEnabled: {
    label: '图层顺序',
    description: '通过右键菜单调整节点的前后叠放顺序（谁压在最上面）。',
    children: {
      zOrderingControlShowOneLayerShiftOptions: {
        label: '显示上移/下移选项',
        description: '启用后，右键菜单额外显示「上移一层 / 下移一层」选项。',
        type: 'boolean'
      }
    }
  },
  aspectRatioControlFeatureEnabled: {
    label: '宽高比控制',
    description: '通过右键菜单改变节点的宽高比。',
    children: { }
  },
  variableBreakpointFeatureEnabled: {
    label: '节点渲染断点',
    description: `缩小画布时，让节点内容在指定缩放级别停止渲染（提升大画布性能）。通过 CSS 变量 ${VARIABLE_BREAKPOINT_CSS_VAR} 按节点单独配置。`,
    infoSection: '节点',
    children: { }
  },
  readingModeFixEnabled: {
    label: '替代文本渲染',
    description: '尝试同步编辑和阅读视图的渲染。注意：与 Obsidian 默认阅读视图相比会有视觉差异。',
    infoSection: '核心增强',
    children: { }
  },
  autoResizeNodeFeatureEnabled: {
    label: '自动调整节点大小',
    description: '根据内容自动调整节点高度。',
    infoSection: '节点',
    children: {
      autoResizeNodeEnabledByDefault: {
        label: '默认启用自动调整',
        description: '启用后，所有节点默认开启自动调整高度功能。',
        type: 'boolean'
      },
      autoResizeNodeMaxHeight: {
        label: '最大高度',
        description: '自动调整时的最大高度（-1 表示不限制）。',
        type: 'number',
        parse: (value: string) => Math.max(-1, parseInt(value) ?? -1)
      },
      autoResizeNodeSnapToGrid: {
        label: '对齐网格',
        description: '启用后，节点高度将对齐到网格。',
        type: 'boolean'
      }
    }
  },
  canvasEncapsulationEnabled: {
    label: '画布封装',
    description: '通过右键菜单将选中的节点和边封装到新画布中。',
    infoSection: '交互与工作流',
    children: { }
  },
  betterReadonlyEnabled: {
    label: '增强只读模式',
    description: '改进只读模式的体验。',
    infoSection: '核心增强',
    children: {
      hideBackgroundGridWhenInReadonly: {
        label: '只读模式隐藏背景网格',
        description: '启用后，只读模式下将隐藏背景网格。',
        type: 'boolean'
      },
      disableNodePopup: {
        label: '只读模式隐藏节点弹出菜单',
        description: '启用后，只读模式下不显示节点的弹出菜单。',
        type: 'boolean'
      },
      disableZoom: {
        label: '只读模式禁用缩放',
        description: '启用后，只读模式下锁定画布缩放。',
        type: 'boolean'
      },
      disablePan: {
        label: '只读模式禁用平移',
        description: '启用后，只读模式下锁定画布平移。',
        type: 'boolean'
      },
    }
  },
  betterExportFeatureEnabled: {
    label: '图片导出',
    description: '把整张画布或选中的节点导出为 PNG / SVG 图片。',
    infoSection: '核心增强',
    children: {}
  },
  edgeHighlightEnabled: {
    label: '边高亮',
    description: '选中节点时高亮其出边（可选包含入边）。',
    infoSection: '边',
    children: {
      highlightIncomingEdges: {
        label: '高亮入边',
        description: '启用后，入边也会被高亮。',
        type: 'boolean'
      }
    }
  },
  edgeSelectionEnabled: {
    label: '边选择',
    description: '通过弹出菜单选择与选中节点相连的边。',
    infoSection: '边',
    children: {
      selectEdgeByDirection: {
        label: '按方向选择边',
        description: '用单独的菜单项分别选择入边或出边。',
        type: 'boolean'
      }
    }
  },
  focusModeFeatureEnabled: {
    label: '专注模式',
    description: '聚焦单个节点，模糊其他节点。',
    infoSection: '交互与工作流',
    children: { }
  },
  overviewModeFeatureEnabled: {
    label: '概览模式',
    description: '缩小画布时，节点显示大号标题填满卡片，分组标签自动放大保持可读。',
    infoSection: '交互与工作流',
    children: {
      overviewModeZoomThreshold: {
        label: '触发缩放阈值',
        description: '画布缩放低于此值时进入概览模式（默认 0.4，即 40%）。',
        type: 'number',
        parse: (value: string) => Math.max(0.05, Math.min(2, parseFloat(value) || 0.4))
      },
      overviewModeFileNodeTitle: {
        label: '文件节点标题来源',
        description: '概览模式下文件节点显示的标题。',
        type: 'dropdown',
        options: {
          'filename': '文件名',
          'first-line': '第一行标题'
        }
      },
      overviewModeGroupLabelScale: {
        label: '分组标签反向缩放',
        description: '缩小画布时自动放大分组标签文字，保持可读性。',
        type: 'boolean'
      },
      overviewModeMaxFontSize: {
        label: '标题最大字号',
        description: '概览模式下标题文字的最大字号（像素），避免大卡片上的短标题过大。',
        type: 'number',
        parse: (value: string) => Math.max(16, Math.min(200, parseInt(value) || 64))
      }
    }
  },
  mindmapFeatureEnabled: {
    label: '思维导图',
    description: '将画布变成思维导图：Tab 创建下级节点，Enter 创建同级节点，Alt+方向键导航。',
    children: {
      mindmapChildNodeSpacing: {
        label: '下级节点水平间距',
        description: '上下级节点之间的水平间距。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      mindmapSiblingNodeSpacing: {
        label: '同级节点垂直间距',
        description: '同级节点之间的垂直间距。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      mindmapUseNavigationHotkeys: {
        label: '启用导航快捷键',
        description: '启用后，可以用 Alt+方向键在节点间导航。',
        type: 'boolean'
      },
      mindmapUseFloatingNodeHotkeys: {
        label: '启用浮动节点快捷键',
        description: '启用后，可以用 Cmd/Ctrl+方向键创建浮动节点。',
        type: 'boolean'
      },
      mindmapPropagateColorToEdges: {
        label: '颜色传播到边',
        description: '设置节点颜色时，自动传播到从该节点出发的边。',
        type: 'boolean'
      }
    }
  },
  nodeTemplatesFeature: {
    label: '节点模板',
    description: '把常用节点存为模板，之后可一键创建。选中单个节点后运行「Save node as template」命令即可添加模板。',
    disableToggle: true,
    children: {
      nodeTemplates: {
        label: '已保存的模板',
        description: '',
        type: 'nodeTemplateList'
      } as NodeTemplateListSetting
    }
  },
} as const satisfies {
  [key in keyof CanvasEnhancePluginSettingsValues | "general" | "nodeTemplatesFeature"]?: SettingsHeading & {
    children: {
      [key in keyof CanvasEnhancePluginSettingsValues]?: Setting
    }
  }
}

const SETTINGS_TABS = {
  basic: {
    label: '基础设置',
    groups: [
      'overviewModeFeatureEnabled',
      'general',
      'commandsFeatureEnabled',
      'nativeFileSearchEnabled',
      'betterExportFeatureEnabled',
      'collapsibleGroupsFeatureEnabled',
      'edgeHighlightEnabled',
      'edgeSelectionEnabled',
      'betterReadonlyEnabled',
      'readingModeFixEnabled',
    ]
  },
  mindmap: {
    label: '思维导图',
    groups: [
      'mindmapFeatureEnabled',
    ]
  },
  nodeEdge: {
    label: '节点与边',
    groups: [
      'nodeStylingFeatureEnabled',
      'edgesStylingFeatureEnabled',
      'combineCustomStylesInDropdown',
      'nodeTemplatesFeature',
      'floatingEdgeFeatureEnabled',
      'flipEdgeFeatureEnabled',
      'autoResizeNodeFeatureEnabled',
      'aspectRatioControlFeatureEnabled',
      'zOrderingControlFeatureEnabled',
      'autoFileNodeEdgesFeatureEnabled',
    ]
  },
  advanced: {
    label: '进阶功能',
    groups: [
      'canvasMetadataCompatibilityEnabled',
      'portalsFeatureEnabled',
      'focusModeFeatureEnabled',
      'canvasEncapsulationEnabled',
      'variableBreakpointFeatureEnabled',
    ]
  },
} as const

export default class SettingsManager {
  private plugin: CanvasEnhancePlugin
  private settings: CanvasEnhancePluginSettingsValues
  private settingsTab: CanvasEnhancePluginSettingTab

  nodeCssStylesManager: CssStylesConfigManager<StyleAttribute>
  edgeCssStylesManager: CssStylesConfigManager<StyleAttribute>

  constructor(plugin: CanvasEnhancePlugin) {
    this.plugin = plugin

    this.nodeCssStylesManager = GET_NODE_CSS_STYLES_MANAGER(plugin)
    this.edgeCssStylesManager = GET_EDGE_CSS_STYLES_MANAGER(plugin)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS_VALUES, await this.plugin.loadData())
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
    this.plugin.app.workspace.trigger("canvas-enhance:settings-changed")
  }

  addSettingsTab() {
    this.settingsTab = new CanvasEnhancePluginSettingTab(this.plugin, this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}

export class CanvasEnhancePluginSettingTab extends PluginSettingTab {
  settingsManager: SettingsManager

  constructor(plugin: CanvasEnhancePlugin, settingsManager: SettingsManager) {
    super(plugin.app, plugin)
    this.settingsManager = settingsManager
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()
    containerEl.classList.add("ce-settings")

    // Quick links
    const linksEl = containerEl.createDiv()
    linksEl.classList.add('ce-settings-links')

    const openUrl = (url: string) => {
      const anchor = activeDocument.createElement('a')
      anchor.href = url
      anchor.target = '_blank'
      anchor.click()
    }

    new SettingEl(linksEl)
      .setName('Canvas Enhance')
      .addButton(button => button
        .setButtonText('使用指南')
        .onClick(() => openUrl('https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/docs/usage-guide.md')))
      .addButton(button => button
        .setButtonText('更新日志')
        .onClick(() => openUrl('https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/CHANGELOG.md')))
      .addButton(button => button
        .setButtonText('给个 Star ⭐')
        .setCta()
        .onClick(() => openUrl('https://github.com/joeytoday/obsidian-canvas-enhance')))

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
              this.createTextSetting(childrenEl, settingId, setting as TextSetting)
              break
            case 'number':
              this.createNumberSetting(childrenEl, settingId, setting as NumberSetting)
              break
            case 'dimension':
              this.createDimensionSetting(childrenEl, settingId, setting as DimensionSetting)
              break
            case 'boolean':
              this.createBooleanSetting(childrenEl, settingId, setting as BooleanSetting)
              break
            case 'dropdown':
              this.createDropdownSetting(childrenEl, settingId, setting as DropdownSetting)
              break
            case 'button':
              this.createButtonSetting(childrenEl, settingId, setting as ButtonSetting)
              break
            case 'styles':
              this.createStylesSetting(childrenEl, settingId, setting as StyleAttributesSetting)
              break
            case 'nodeTemplateList':
              this.createNodeTemplateListSetting(childrenEl)
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
        .setTooltip("Open GitHub documentation")
        .setIcon('info')
        .onClick(async () => {
          const anchor = activeDocument.createElement('a')
          anchor.href = `${README_URL}#${infoSection}`
          anchor.target = '_blank'
          anchor.click()
        })
      )
    }

    if (settingsKey !== null) {
      setting.addToggle((toggle) =>
        toggle
          .setTooltip("Requires a reload to take effect.")
          .setValue(this.settingsManager.getSetting(settingsKey) as boolean)
          .onChange(async (value) => {
            await this.settingsManager.setSetting({ [settingsKey]: value })
            new Notice("重新加载 Obsidian 以应用更改。")
          })
      )
    }

    return setting
  }

  private createTextSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: TextSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => text
        .setValue(this.settingsManager.getSetting(settingId) as string)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: setting.parse ? setting.parse(value) : value })
        })
      )
  }

  private createNumberSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: NumberSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => text
        .setValue(JSON.stringify(this.settingsManager.getSetting(settingId)))
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: setting.parse(value) })
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

  private createButtonSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: ButtonSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addButton(button => button
        .setButtonText('Open')
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
          .addOptions(Object.fromEntries(styleAttribute.options.map(option => [option.value, option.value === null ? `${option.label} (default)` : option.label])))
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

  private createNodeTemplateListSetting(containerEl: HTMLElement) {
    const renderList = () => {
      containerEl.empty()
      const templates = this.settingsManager.getSetting('nodeTemplates')

      if (templates.length === 0) {
        new SettingEl(containerEl)
          .setName('暂无模板')
          .setDesc('选中一个节点，运行「Save node as template」命令把它存为模板。')
        return
      }

      templates.forEach((template: NodeTemplate, index: number) => {
        const typeLabel = template.type === 'file' ? '文件' : template.type === 'link' ? '链接' : '文本'
        new SettingEl(containerEl)
          .setName(template.label || `模板 ${index + 1}`)
          .setDesc(`${typeLabel}节点 · ${template.width} × ${template.height}`)
          .addButton(button => button
            .setButtonText('删除')
            .onClick(async () => {
              const updated = this.settingsManager.getSetting('nodeTemplates').filter((_, i) => i !== index)
              await this.settingsManager.setSetting({ nodeTemplates: updated })
              renderList()
            })
          )
      })
    }
    renderList()
  }
}
