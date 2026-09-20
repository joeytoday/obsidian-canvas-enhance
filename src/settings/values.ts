import type { StyleAttribute } from "src/canvas-extensions/advanced-styles/style-config"
import { t } from "src/i18n"
import type { LanguageSetting } from "src/i18n"

export const NODE_TYPE_OPTIONS = {
  get native() { return t('settings.general.nodeTypeOnDoubleClick.option.native') },
  get text() { return t('settings.general.nodeTypeOnDoubleClick.option.text') },
  get file() { return t('settings.general.nodeTypeOnDoubleClick.option.file') }
} as const

export const TEXT_CARD_HEADING_LEVEL_OPTIONS = {
  get '1'() { return t('settings.general.textCardHeadingLevel.option.1') },
  get '2'() { return t('settings.general.textCardHeadingLevel.option.2') },
  get '3'() { return t('settings.general.textCardHeadingLevel.option.3') }
} as const

export const EDGE_LINE_DIRECTION_OPTIONS = {
  get nondirectional() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeLineDirection.option.nondirectional') },
  get unidirectional() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeLineDirection.option.unidirectional') },
  get bidirectional() { return t('settings.edgesStylingFeatureEnabled.defaultEdgeLineDirection.option.bidirectional') }
} as const

export const OVERVIEW_FILE_NODE_TITLE_OPTIONS = {
  get filename() { return t('settings.overviewModeFeatureEnabled.overviewModeFileNodeTitle.option.filename') },
  get 'first-line'() { return t('settings.overviewModeFeatureEnabled.overviewModeFileNodeTitle.option.first-line') }
} as const

export interface CanvasEnhancePluginSettingsValues {
  language: LanguageSetting
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
  language: 'auto',
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
