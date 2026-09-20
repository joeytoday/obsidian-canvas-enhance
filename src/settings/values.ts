import type { StyleAttribute } from "src/canvas-extensions/advanced-styles/style-config"

export const NODE_TYPE_OPTIONS = {
  'native': '原生',
  'text': '文本',
  'file': '文件'
} as const

export const TEXT_CARD_HEADING_LEVEL_OPTIONS = {
  '1': '一级标题',
  '2': '二级标题',
  '3': '三级标题'
} as const

export const EDGE_LINE_DIRECTION_OPTIONS = {
  'nondirectional': '无方向',
  'unidirectional': '单向',
  'bidirectional': '双向'
} as const

export const OVERVIEW_FILE_NODE_TITLE_OPTIONS = {
  'filename': '文件名',
  'first-line': '第一行标题'
} as const

export interface CanvasEnhancePluginSettingsValues {
  nodeTypeOnDoubleClick: keyof typeof NODE_TYPE_OPTIONS
  openFileNodeInSplit: boolean
  alignNewNodesToGrid: boolean
  defaultTextNodeDimensions: [number, number]
  defaultFileNodeDimensions: [number, number]
  minNodeSize: number
  maxNodeWidth: number
  textCardHeadingEnabled: boolean
  textCardHeadingLevel: keyof typeof TEXT_CARD_HEADING_LEVEL_OPTIONS
  disableFontSizeRelativeToZoom: boolean

  canvasMetadataCompatibilityEnabled: boolean
  enableSingleNodeLinks: boolean
  enableSingleNodePopupReferenceCopy: boolean

  combineCustomStylesInDropdown: boolean

  nodeStylingFeatureEnabled: boolean
  customNodeStyleAttributes: StyleAttribute[]
  defaultTextNodeColor: number
  defaultTextNodeStyleAttributes: { [key: string]: string }
  fileNodeTemplateEnabled: boolean
  fileNodeTemplatePath: string
  fileNodeTemplateFolder: string

  edgesStylingFeatureEnabled: boolean
  customEdgeStyleAttributes: StyleAttribute[]
  inheritEdgeColorFromNode: boolean
  defaultEdgeColor: number
  defaultEdgeLineDirection: keyof typeof EDGE_LINE_DIRECTION_OPTIONS
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
  autoResizeNodeVerticalPadding: number
  autoResizeNodeSnapToGrid: boolean

  collapsibleGroupsFeatureEnabled: boolean
  collapsedGroupPreviewOnDrag: boolean

  focusModeFeatureEnabled: boolean

  canvasEncapsulationEnabled: boolean

  portalsFeatureEnabled: boolean

  autoFileNodeEdgesFeatureEnabled: boolean
  autoFileNodeEdgesFrontmatterKey: string

  edgeHighlightEnabled: boolean
  highlightIncomingEdges: boolean

  edgeSelectionEnabled: boolean
  selectEdgeByDirection: boolean

  overviewModeFeatureEnabled: boolean
  overviewModeZoomThreshold: number
  overviewModeFileNodeTitle: keyof typeof OVERVIEW_FILE_NODE_TITLE_OPTIONS
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
  openFileNodeInSplit: true,
  alignNewNodesToGrid: true,
  defaultTextNodeDimensions: [260, 60],
  defaultFileNodeDimensions: [400, 400],
  minNodeSize: 60,
  maxNodeWidth: -1,
  textCardHeadingEnabled: false,
  textCardHeadingLevel: '2',
  disableFontSizeRelativeToZoom: false,

  canvasMetadataCompatibilityEnabled: true,
  enableSingleNodeLinks: true,
  enableSingleNodePopupReferenceCopy: false,

  combineCustomStylesInDropdown: false,

  nodeStylingFeatureEnabled: true,
  customNodeStyleAttributes: [],
  defaultTextNodeColor: 0,
  defaultTextNodeStyleAttributes: {},
  fileNodeTemplateEnabled: false,
  fileNodeTemplatePath: '',
  fileNodeTemplateFolder: '',

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
  autoResizeNodeVerticalPadding: 40,
  autoResizeNodeSnapToGrid: true,

  collapsibleGroupsFeatureEnabled: true,
  collapsedGroupPreviewOnDrag: true,

  focusModeFeatureEnabled: false,

  canvasEncapsulationEnabled: false,

  portalsFeatureEnabled: true,

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
