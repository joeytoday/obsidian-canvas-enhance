import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES } from "src/canvas-extensions/advanced-styles/style-config"
import { VARIABLE_BREAKPOINT_CSS_VAR } from "src/canvas-extensions/variable-breakpoint-canvas-extension"
import { EDGE_LINE_DIRECTION_OPTIONS, NODE_TYPE_OPTIONS, OVERVIEW_FILE_NODE_TITLE_OPTIONS, TEXT_CARD_HEADING_LEVEL_OPTIONS } from "./values"
import type { CanvasEnhancePluginSettingsValues } from "./values"
import type { Setting, SettingsHeading } from "./types"

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
        options: NODE_TYPE_OPTIONS
      },
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
      textCardHeadingEnabled: {
        label: '卡片标题',
        description: '启用后，新建文本卡片时第一行自动添加标题前缀，光标停在前缀之后。',
        type: 'boolean'
      },
      textCardHeadingLevel: {
        label: '卡片标题级别',
        description: '新建文本卡片时第一行标题的级别。',
        type: 'dropdown',
        options: TEXT_CARD_HEADING_LEVEL_OPTIONS
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
    children: { }
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
        onClick: () => window.open("https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/README.md#自定义样式", '_blank'),
      },
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
      }
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
        onClick: () => window.open("https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/README.md#自定义样式", '_blank'),
      },
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
        options: EDGE_LINE_DIRECTION_OPTIONS
      },
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
      },
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
      autoResizeNodeVerticalPadding: {
        label: '垂直边距',
        description: '自适应高度时，在内容上下预留的总边距（像素）。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
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
        options: OVERVIEW_FILE_NODE_TITLE_OPTIONS
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
  openFileNodeInSplit: {
    label: '文件卡片分屏打开',
    description: '启用后，点击文件卡片标题或右键「在侧边栏打开」时，在右侧新窗格打开文件，画布保持可见。',
    infoSection: '节点',
    children: { }
  },
  fileNodeTemplateEnabled: {
    label: '文件模板',
    description: '新建文件节点时，用指定的 Obsidian 模板生成文件内容。',
    infoSection: '节点',
    children: {
      fileNodeTemplatePath: {
        label: '选择模板',
        description: '新建文件节点时使用的模板（来自 Obsidian 核心「模板」插件的文件夹）。',
        type: 'templateSelect'
      },
      fileNodeTemplateFolder: {
        label: '新建文件所在文件夹',
        description: '新建模板文件存放的文件夹。留空则存放在当前画布所在文件夹。',
        type: 'folderSelect'
      }
    }
  },
} as const satisfies {
  [key in keyof CanvasEnhancePluginSettingsValues | "general"]?: SettingsHeading & {
    children: {
      [key in keyof CanvasEnhancePluginSettingsValues]?: Setting
    }
  }
}

export const SETTINGS_TABS = {
  basic: {
    label: '基础设置',
    groups: [
      'general',
      'openFileNodeInSplit',
      'fileNodeTemplateEnabled',
      'overviewModeFeatureEnabled',
      'commandsFeatureEnabled',
      'nativeFileSearchEnabled',
      'betterExportFeatureEnabled',
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
      'floatingEdgeFeatureEnabled',
      'flipEdgeFeatureEnabled',
      'edgeHighlightEnabled',
      'edgeSelectionEnabled',
      'autoResizeNodeFeatureEnabled',
      'aspectRatioControlFeatureEnabled',
      'zOrderingControlFeatureEnabled',
      'collapsibleGroupsFeatureEnabled',
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
      'betterReadonlyEnabled',
      'readingModeFixEnabled',
    ]
  },
} as const
