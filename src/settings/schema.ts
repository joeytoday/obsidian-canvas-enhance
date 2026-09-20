import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES } from "src/canvas-extensions/advanced-styles/style-config"
import { VARIABLE_BREAKPOINT_CSS_VAR } from "src/canvas-extensions/variable-breakpoint-canvas-extension"
import { EDGE_LINE_DIRECTION_OPTIONS, NODE_TYPE_OPTIONS, OVERVIEW_FILE_NODE_TITLE_OPTIONS, TEXT_CARD_HEADING_LEVEL_OPTIONS } from "./values"
import type { CanvasEnhancePluginSettingsValues } from "./values"
import type { Setting, SettingsHeading } from "./types"
import { getLanguageOptions, t } from "src/i18n"

export const SETTINGS = {
  general: {
    get label() { return t('settings.general.label') },
    get description() { return t('settings.general.description') },
    disableToggle: true,
    children: {
      // Getters: labels are resolved when the settings tab is rendered, after the language has been loaded
      language: {
        get label() { return t('settings.language.label') },
        get description() { return t('settings.language.description') },
        type: 'dropdown',
        get options() { return getLanguageOptions() }
      },
      nodeTypeOnDoubleClick: {
        get label() { return t('settings.general.nodeTypeOnDoubleClick.label') },
        get description() { return t('settings.general.nodeTypeOnDoubleClick.description') },
        type: 'dropdown',
        options: NODE_TYPE_OPTIONS
      },
      alignNewNodesToGrid: {
        get label() { return t('settings.general.alignNewNodesToGrid.label') },
        get description() { return t('settings.general.alignNewNodesToGrid.description') },
        type: 'boolean'
      },
      defaultTextNodeDimensions: {
        get label() { return t('settings.general.defaultTextNodeDimensions.label') },
        get description() { return t('settings.general.defaultTextNodeDimensions.description') },
        type: 'dimension',
        parse: (value: [string, string]) => {
          const width = Math.max(1, parseInt(value[0]) || 0)
          const height = Math.max(1, parseInt(value[1]) || 0)
          return [width, height]
        }
      },
      defaultFileNodeDimensions: {
        get label() { return t('settings.general.defaultFileNodeDimensions.label') },
        get description() { return t('settings.general.defaultFileNodeDimensions.description') },
        type: 'dimension',
        parse: (value: [string, string]) => {
          const width = Math.max(1, parseInt(value[0]) || 0)
          const height = Math.max(1, parseInt(value[1]) || 0)
          return [width, height]
        }
      },
      minNodeSize: {
        get label() { return t('settings.general.minNodeSize.label') },
        get description() { return t('settings.general.minNodeSize.description') },
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      maxNodeWidth: {
        get label() { return t('settings.general.maxNodeWidth.label') },
        get description() { return t('settings.general.maxNodeWidth.description') },
        type: 'number',
        parse: (value: string) => Math.max(-1, parseInt(value) || 0)
      },
      textCardHeadingEnabled: {
        get label() { return t('settings.general.textCardHeadingEnabled.label') },
        get description() { return t('settings.general.textCardHeadingEnabled.description') },
        type: 'boolean'
      },
      textCardHeadingLevel: {
        get label() { return t('settings.general.textCardHeadingLevel.label') },
        get description() { return t('settings.general.textCardHeadingLevel.description') },
        type: 'dropdown',
        options: TEXT_CARD_HEADING_LEVEL_OPTIONS
      },
      disableFontSizeRelativeToZoom: {
        get label() { return t('settings.general.disableFontSizeRelativeToZoom.label') },
        get description() { return t('settings.general.disableFontSizeRelativeToZoom.description') },
        type: 'boolean'
      }
    }
  },
  commandsFeatureEnabled: {
    get label() { return t('settings.commandsFeatureEnabled.label') },
    get description() { return t('settings.commandsFeatureEnabled.description') },
    infoSection: '交互与工作流',
    children: {
      zoomToClonedNode: {
        get label() { return t('settings.commandsFeatureEnabled.zoomToClonedNode.label') },
        get description() { return t('settings.commandsFeatureEnabled.zoomToClonedNode.description') },
        type: 'boolean'
      },
      cloneNodeMargin: {
        get label() { return t('settings.commandsFeatureEnabled.cloneNodeMargin.label') },
        get description() { return t('settings.commandsFeatureEnabled.cloneNodeMargin.description') },
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      expandNodeStepSize: {
        get label() { return t('settings.commandsFeatureEnabled.expandNodeStepSize.label') },
        get description() { return t('settings.commandsFeatureEnabled.expandNodeStepSize.description') },
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      }
    }
  },
  canvasMetadataCompatibilityEnabled: {
    get label() { return t('settings.canvasMetadataCompatibilityEnabled.label') },
    get description() { return t('settings.canvasMetadataCompatibilityEnabled.description') },
    infoSection: '核心增强',
    children: {
      enableSingleNodeLinks: {
        get label() { return t('settings.canvasMetadataCompatibilityEnabled.enableSingleNodeLinks.label') },
        get description() { return t('settings.canvasMetadataCompatibilityEnabled.enableSingleNodeLinks.description') },
        type: 'boolean'
      },
      enableSingleNodePopupReferenceCopy: {
        get label() { return t('settings.canvasMetadataCompatibilityEnabled.enableSingleNodePopupReferenceCopy.label') },
        get description() { return t('settings.canvasMetadataCompatibilityEnabled.enableSingleNodePopupReferenceCopy.description') },
        type: 'boolean'
      }
    }
  },
  nativeFileSearchEnabled: {
    get label() { return t('settings.nativeFileSearchEnabled.label') },
    get description() { return t('settings.nativeFileSearchEnabled.description') },
    infoSection: '核心增强',
    children: { }
  },
  autoFileNodeEdgesFeatureEnabled: {
    get label() { return t('settings.autoFileNodeEdgesFeatureEnabled.label') },
    get description() { return t('settings.autoFileNodeEdgesFeatureEnabled.description') },
    infoSection: '核心增强',
    children: {
      autoFileNodeEdgesFrontmatterKey: {
        get label() { return t('settings.autoFileNodeEdgesFeatureEnabled.autoFileNodeEdgesFrontmatterKey.label') },
        get description() { return t('settings.autoFileNodeEdgesFeatureEnabled.autoFileNodeEdgesFrontmatterKey.description') },
        type: 'text',
        parse: (value: string) => value.trim() || 'canvas-edges'
      }
    }
  },
  portalsFeatureEnabled: {
    get label() { return t('settings.portalsFeatureEnabled.label') },
    get description() { return t('settings.portalsFeatureEnabled.description') },
    infoSection: '交互与工作流',
    children: { }
  },
  collapsibleGroupsFeatureEnabled: {
    get label() { return t('settings.collapsibleGroupsFeatureEnabled.label') },
    get description() { return t('settings.collapsibleGroupsFeatureEnabled.description') },
    infoSection: '交互与工作流',
    children: {
      collapsedGroupPreviewOnDrag: {
        get label() { return t('settings.collapsibleGroupsFeatureEnabled.collapsedGroupPreviewOnDrag.label') },
        get description() { return t('settings.collapsibleGroupsFeatureEnabled.collapsedGroupPreviewOnDrag.description') },
        type: 'boolean'
      }
    }
  },
  combineCustomStylesInDropdown: {
    get label() { return t('settings.combineCustomStylesInDropdown.label') },
    get description() { return t('settings.combineCustomStylesInDropdown.description') },
    children: { }
  },
  nodeStylingFeatureEnabled: {
    get label() { return t('settings.nodeStylingFeatureEnabled.label') },
    get description() { return t('settings.nodeStylingFeatureEnabled.description') },
    infoSection: '节点',
    children: {
      customNodeStyleAttributes: {
        get label() { return t('settings.nodeStylingFeatureEnabled.customNodeStyleAttributes.label') },
        get description() { return t('settings.nodeStylingFeatureEnabled.customNodeStyleAttributes.description') },
        type: 'button',
        onClick: () => window.open(`https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/README.md#${t('settings.customStylesAnchor')}`, '_blank'),
      },
      defaultTextNodeColor: {
        get label() { return t('settings.nodeStylingFeatureEnabled.defaultTextNodeColor.label') },
        get description() { return t('settings.nodeStylingFeatureEnabled.defaultTextNodeColor.description') },
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      defaultTextNodeStyleAttributes: {
        get label() { return t('settings.nodeStylingFeatureEnabled.defaultTextNodeStyleAttributes.label') },
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
    get label() { return t('settings.edgesStylingFeatureEnabled.label') },
    get description() { return t('settings.edgesStylingFeatureEnabled.description') },
    infoSection: '边',
    children: {
      customEdgeStyleAttributes: {
        get label() { return t('settings.edgesStylingFeatureEnabled.customEdgeStyleAttributes.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.customEdgeStyleAttributes.description') },
        type: 'button',
        onClick: () => window.open(`https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/README.md#${t('settings.customStylesAnchor')}`, '_blank'),
      },
      inheritEdgeColorFromNode: {
        get label() { return t('settings.edgesStylingFeatureEnabled.inheritEdgeColorFromNode.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.inheritEdgeColorFromNode.description') },
        type: 'boolean'
      },
      defaultEdgeColor: {
        get label() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeColor.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeColor.description') },
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      defaultEdgeLineDirection: {
        get label() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeLineDirection.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeLineDirection.description') },
        type: 'dropdown',
        options: EDGE_LINE_DIRECTION_OPTIONS
      },
      defaultEdgeStyleAttributes: {
        get label() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeStyleAttributes.label') },
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
        get label() { return t('settings.edgesStylingFeatureEnabled.edgeStyleUpdateWhileDragging.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.edgeStyleUpdateWhileDragging.description') },
        type: 'boolean'
      },
      edgeStyleSquarePathRounded: {
        get label() { return t('settings.edgesStylingFeatureEnabled.edgeStyleSquarePathRounded.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.edgeStyleSquarePathRounded.description') },
        type: 'boolean'
      },
      edgeStylePathfinderAllowDiagonal: {
        get label() { return t('settings.edgesStylingFeatureEnabled.edgeStylePathfinderAllowDiagonal.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.edgeStylePathfinderAllowDiagonal.description') },
        type: 'boolean'
      },
      edgeStylePathfinderPathRounded: {
        get label() { return t('settings.edgesStylingFeatureEnabled.edgeStylePathfinderPathRounded.label') },
        get description() { return t('settings.edgesStylingFeatureEnabled.edgeStylePathfinderPathRounded.description') },
        type: 'boolean'
      }
    }
  },
  floatingEdgeFeatureEnabled: {
    get label() { return t('settings.floatingEdgeFeatureEnabled.label') },
    get description() { return t('settings.floatingEdgeFeatureEnabled.description') },
    infoSection: '边',
    children: {
      allowFloatingEdgeCreation: {
        get label() { return t('settings.floatingEdgeFeatureEnabled.allowFloatingEdgeCreation.label') },
        get description() { return t('settings.floatingEdgeFeatureEnabled.allowFloatingEdgeCreation.description') },
        type: 'boolean'
      },
      newEdgeFromSideFloating: {
        get label() { return t('settings.floatingEdgeFeatureEnabled.newEdgeFromSideFloating.label') },
        get description() { return t('settings.floatingEdgeFeatureEnabled.newEdgeFromSideFloating.description') },
        type: 'boolean'
      }
    }
  },
  flipEdgeFeatureEnabled: {
    get label() { return t('settings.flipEdgeFeatureEnabled.label') },
    get description() { return t('settings.flipEdgeFeatureEnabled.description') },
    infoSection: '边',
    children: { }
  },
  zOrderingControlFeatureEnabled: {
    get label() { return t('settings.zOrderingControlFeatureEnabled.label') },
    get description() { return t('settings.zOrderingControlFeatureEnabled.description') },
    children: {
      zOrderingControlShowOneLayerShiftOptions: {
        get label() { return t('settings.zOrderingControlFeatureEnabled.zOrderingControlShowOneLayerShiftOptions.label') },
        get description() { return t('settings.zOrderingControlFeatureEnabled.zOrderingControlShowOneLayerShiftOptions.description') },
        type: 'boolean'
      }
    }
  },
  aspectRatioControlFeatureEnabled: {
    get label() { return t('settings.aspectRatioControlFeatureEnabled.label') },
    get description() { return t('settings.aspectRatioControlFeatureEnabled.description') },
    children: { }
  },
  variableBreakpointFeatureEnabled: {
    get label() { return t('settings.variableBreakpointFeatureEnabled.label') },
    get description() { return t('settings.variableBreakpointFeatureEnabled.description', { variable: VARIABLE_BREAKPOINT_CSS_VAR }) },
    infoSection: '节点',
    children: { }
  },
  readingModeFixEnabled: {
    get label() { return t('settings.readingModeFixEnabled.label') },
    get description() { return t('settings.readingModeFixEnabled.description') },
    infoSection: '核心增强',
    children: { }
  },
  autoResizeNodeFeatureEnabled: {
    get label() { return t('settings.autoResizeNodeFeatureEnabled.label') },
    get description() { return t('settings.autoResizeNodeFeatureEnabled.description') },
    infoSection: '节点',
    children: {
      autoResizeNodeEnabledByDefault: {
        get label() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeEnabledByDefault.label') },
        get description() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeEnabledByDefault.description') },
        type: 'boolean'
      },
      autoResizeNodeMaxHeight: {
        get label() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeMaxHeight.label') },
        get description() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeMaxHeight.description') },
        type: 'number',
        parse: (value: string) => Math.max(-1, parseInt(value) ?? -1)
      },
      autoResizeNodeVerticalPadding: {
        get label() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeVerticalPadding.label') },
        get description() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeVerticalPadding.description') },
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      autoResizeNodeSnapToGrid: {
        get label() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeSnapToGrid.label') },
        get description() { return t('settings.autoResizeNodeFeatureEnabled.autoResizeNodeSnapToGrid.description') },
        type: 'boolean'
      }
    }
  },
  canvasEncapsulationEnabled: {
    get label() { return t('settings.canvasEncapsulationEnabled.label') },
    get description() { return t('settings.canvasEncapsulationEnabled.description') },
    infoSection: '交互与工作流',
    children: { }
  },
  betterReadonlyEnabled: {
    get label() { return t('settings.betterReadonlyEnabled.label') },
    get description() { return t('settings.betterReadonlyEnabled.description') },
    infoSection: '核心增强',
    children: {
      hideBackgroundGridWhenInReadonly: {
        get label() { return t('settings.betterReadonlyEnabled.hideBackgroundGridWhenInReadonly.label') },
        get description() { return t('settings.betterReadonlyEnabled.hideBackgroundGridWhenInReadonly.description') },
        type: 'boolean'
      },
      disableNodePopup: {
        get label() { return t('settings.betterReadonlyEnabled.disableNodePopup.label') },
        get description() { return t('settings.betterReadonlyEnabled.disableNodePopup.description') },
        type: 'boolean'
      },
      disableZoom: {
        get label() { return t('settings.betterReadonlyEnabled.disableZoom.label') },
        get description() { return t('settings.betterReadonlyEnabled.disableZoom.description') },
        type: 'boolean'
      },
      disablePan: {
        get label() { return t('settings.betterReadonlyEnabled.disablePan.label') },
        get description() { return t('settings.betterReadonlyEnabled.disablePan.description') },
        type: 'boolean'
      },
    }
  },
  betterExportFeatureEnabled: {
    get label() { return t('settings.betterExportFeatureEnabled.label') },
    get description() { return t('settings.betterExportFeatureEnabled.description') },
    infoSection: '核心增强',
    children: {}
  },
  edgeHighlightEnabled: {
    get label() { return t('settings.edgeHighlightEnabled.label') },
    get description() { return t('settings.edgeHighlightEnabled.description') },
    infoSection: '边',
    children: {
      highlightIncomingEdges: {
        get label() { return t('settings.edgeHighlightEnabled.highlightIncomingEdges.label') },
        get description() { return t('settings.edgeHighlightEnabled.highlightIncomingEdges.description') },
        type: 'boolean'
      }
    }
  },
  edgeSelectionEnabled: {
    get label() { return t('settings.edgeSelectionEnabled.label') },
    get description() { return t('settings.edgeSelectionEnabled.description') },
    infoSection: '边',
    children: {
      selectEdgeByDirection: {
        get label() { return t('settings.edgeSelectionEnabled.selectEdgeByDirection.label') },
        get description() { return t('settings.edgeSelectionEnabled.selectEdgeByDirection.description') },
        type: 'boolean'
      }
    }
  },
  focusModeFeatureEnabled: {
    get label() { return t('settings.focusModeFeatureEnabled.label') },
    get description() { return t('settings.focusModeFeatureEnabled.description') },
    infoSection: '交互与工作流',
    children: { }
  },
  overviewModeFeatureEnabled: {
    get label() { return t('settings.overviewModeFeatureEnabled.label') },
    get description() { return t('settings.overviewModeFeatureEnabled.description') },
    infoSection: '交互与工作流',
    children: {
      overviewModeZoomThreshold: {
        get label() { return t('settings.overviewModeFeatureEnabled.overviewModeZoomThreshold.label') },
        get description() { return t('settings.overviewModeFeatureEnabled.overviewModeZoomThreshold.description') },
        type: 'number',
        parse: (value: string) => Math.max(0.05, Math.min(2, parseFloat(value) || 0.4))
      },
      overviewModeFileNodeTitle: {
        get label() { return t('settings.overviewModeFeatureEnabled.overviewModeFileNodeTitle.label') },
        get description() { return t('settings.overviewModeFeatureEnabled.overviewModeFileNodeTitle.description') },
        type: 'dropdown',
        options: OVERVIEW_FILE_NODE_TITLE_OPTIONS
      },
      overviewModeGroupLabelScale: {
        get label() { return t('settings.overviewModeFeatureEnabled.overviewModeGroupLabelScale.label') },
        get description() { return t('settings.overviewModeFeatureEnabled.overviewModeGroupLabelScale.description') },
        type: 'boolean'
      },
      overviewModeMaxFontSize: {
        get label() { return t('settings.overviewModeFeatureEnabled.overviewModeMaxFontSize.label') },
        get description() { return t('settings.overviewModeFeatureEnabled.overviewModeMaxFontSize.description') },
        type: 'number',
        parse: (value: string) => Math.max(16, Math.min(200, parseInt(value) || 64))
      }
    }
  },
  mindmapFeatureEnabled: {
    get label() { return t('settings.mindmapFeatureEnabled.label') },
    get description() { return t('settings.mindmapFeatureEnabled.description') },
    children: {
      mindmapChildNodeSpacing: {
        get label() { return t('settings.mindmapFeatureEnabled.mindmapChildNodeSpacing.label') },
        get description() { return t('settings.mindmapFeatureEnabled.mindmapChildNodeSpacing.description') },
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      mindmapSiblingNodeSpacing: {
        get label() { return t('settings.mindmapFeatureEnabled.mindmapSiblingNodeSpacing.label') },
        get description() { return t('settings.mindmapFeatureEnabled.mindmapSiblingNodeSpacing.description') },
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      mindmapUseNavigationHotkeys: {
        get label() { return t('settings.mindmapFeatureEnabled.mindmapUseNavigationHotkeys.label') },
        get description() { return t('settings.mindmapFeatureEnabled.mindmapUseNavigationHotkeys.description') },
        type: 'boolean'
      },
      mindmapUseFloatingNodeHotkeys: {
        get label() { return t('settings.mindmapFeatureEnabled.mindmapUseFloatingNodeHotkeys.label') },
        get description() { return t('settings.mindmapFeatureEnabled.mindmapUseFloatingNodeHotkeys.description') },
        type: 'boolean'
      },
      mindmapPropagateColorToEdges: {
        get label() { return t('settings.mindmapFeatureEnabled.mindmapPropagateColorToEdges.label') },
        get description() { return t('settings.mindmapFeatureEnabled.mindmapPropagateColorToEdges.description') },
        type: 'boolean'
      }
    }
  },
  openFileNodeInSplit: {
    get label() { return t('settings.openFileNodeInSplit.label') },
    get description() { return t('settings.openFileNodeInSplit.description') },
    infoSection: '节点',
    children: { }
  },
  fileNodeTemplateEnabled: {
    get label() { return t('settings.fileNodeTemplateEnabled.label') },
    get description() { return t('settings.fileNodeTemplateEnabled.description') },
    infoSection: '节点',
    children: {
      fileNodeTemplatePath: {
        get label() { return t('settings.fileNodeTemplateEnabled.fileNodeTemplatePath.label') },
        get description() { return t('settings.fileNodeTemplateEnabled.fileNodeTemplatePath.description') },
        type: 'templateSelect'
      },
      fileNodeTemplateFolder: {
        get label() { return t('settings.fileNodeTemplateEnabled.fileNodeTemplateFolder.label') },
        get description() { return t('settings.fileNodeTemplateEnabled.fileNodeTemplateFolder.description') },
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
    get label() { return t('settings.tabs.basic') },
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
    get label() { return t('settings.tabs.mindmap') },
    groups: [
      'mindmapFeatureEnabled',
    ]
  },
  nodeEdge: {
    get label() { return t('settings.tabs.nodeEdge') },
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
    get label() { return t('settings.tabs.advanced') },
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
