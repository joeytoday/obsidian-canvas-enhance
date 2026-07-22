import { TFile } from "obsidian"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import { ExtendedCachedMetadata } from "src/@types/Obsidian"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper, { ConnectionDirection, MenuOption, NavDirection, NAV_DIRECTIONS } from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"

const EDGE_DIRECTION_MENU: Record<ConnectionDirection, MenuOption> = {
  connected: { id: 'select-connected-edges', icon: 'arrows-selected', label: '选择相连的边' },
  outgoing:  { id: 'select-outgoing-edges', icon: 'arrow-right-selected', label: '选择出边' },
  incoming:  { id: 'select-incoming-edges', icon: 'arrow-left-selected', label: '选择入边' },
}

const NAV_DIRECTION_LABELS: Record<NavDirection, string> = {
  up: '向上',
  down: '向下',
  left: '向左',
  right: '向右',
}

const EDGE_TYPE_LABELS: Record<'connected' | 'incoming' | 'outgoing', string> = {
  connected: '相连的',
  incoming: '入',
  outgoing: '出',
}

export default class CommandsCanvasExtension extends CanvasExtension {
  isEnabled() { return 'commandsFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'toggle-readonly',
      name: '切换只读模式',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => canvas.setReadonly(!canvas.readonly)
      )
    })

    this.plugin.addCommand({
      id: 'create-text-node',
      name: '创建文本节点',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly,
        (canvas: Canvas) => this.createTextNode(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'create-file-node',
      name: '创建文件节点',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly,
        (canvas: Canvas) => void this.createFileNode(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'select-all-edges',
      name: '选择所有边',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => canvas.updateSelection(() =>
          canvas.selection = new Set(canvas.edges.values())
        )
      )
    })

    this.plugin.addCommand({
      id: 'zoom-to-selection',
      name: '缩放到选中区域',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => canvas.zoomToSelection()
      )
    })

    this.plugin.addCommand({
      id: 'zoom-to-fit',
      name: '缩放以适应画布',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => canvas.zoomToFit()
      )
    })

    for (const direction of NAV_DIRECTIONS) {
      this.plugin.addCommand({
        id: `clone-node-${direction}`,
        name: `克隆节点（${NAV_DIRECTION_LABELS[direction]}）`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => !canvas.readonly && canvas.selection.size === 1 && canvas.selection.values().next().value?.getData().type === 'text',
          (canvas: Canvas) => this.cloneNode(canvas, direction)
        )
      })

      this.plugin.addCommand({
        id: `expand-node-${direction}`,
        name: `扩展节点（${NAV_DIRECTION_LABELS[direction]}）`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => !canvas.readonly && canvas.selection.size === 1,
          (canvas: Canvas) => this.expandNode(canvas, direction)
        )
      })

      this.plugin.addCommand({
        id: `navigate-${direction}`,
        name: `导航（${NAV_DIRECTION_LABELS[direction]}）`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => canvas.getSelectionData().nodes.length === 1,
          (canvas: Canvas) => this.navigate(canvas, direction)
        ),
      })
    }

    this.plugin.addCommand({
      id: 'flip-selection-horizontally',
      name: '水平翻转选中区域',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.selection.size > 0,
        (canvas: Canvas) => this.flipSelection(canvas, true
      ))
    })

    this.plugin.addCommand({
      id: 'flip-selection-vertically',
      name: '垂直翻转选中区域',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.selection.size > 0,
        (canvas: Canvas) => this.flipSelection(canvas, false)
      )
    })

    for (const type of ['connected', 'incoming', 'outgoing'] as const) {
      this.plugin.addCommand({
        id: `select-${type}-edges`,
        name: `选择${EDGE_TYPE_LABELS[type]}边`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => canvas.selection.size > 0,
          (canvas: Canvas) => CanvasHelper.selectEdgesForNodes(canvas, type)
        )
      })
    }

    this.plugin.addCommand({
      id: 'swap-nodes',
      name: '交换节点',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.getSelectionData().nodes.length === 2,
        (canvas: Canvas) => {
          const selectedNodes = canvas.getSelectionData().nodes
            .map(nodeData => canvas.nodes.get(nodeData.id))
            .filter(node => node !== undefined) as CanvasNode[]
          if (selectedNodes.length !== 2) return

          const [nodeA, nodeB] = selectedNodes as [CanvasNode, CanvasNode]
          const nodeAData = nodeA.getData()
          const nodeBData = nodeB.getData()

          nodeA.setData({ ...nodeAData, x: nodeBData.x, y: nodeBData.y, width: nodeBData.width, height: nodeBData.height })
          nodeB.setData({ ...nodeBData, x: nodeAData.x, y: nodeAData.y, width: nodeAData.width, height: nodeAData.height })

          canvas.pushHistory(canvas.getData())
        }
      )
    })

    this.plugin.addCommand({
      id: 'copy-wikilink-to-node',
      name: '复制节点 Wikilink',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.selection.size === 1,
        (canvas: Canvas) => {
          const file = canvas.view.file
          if (!file) return

          const nodeData = canvas.getSelectionData().nodes[0]
          if (!nodeData) return

          CanvasHelper.copyWikilinkToNode(file, nodeData)
        }
      )
    })

    this.plugin.addCommand({
      id: 'pull-outgoing-links-to-canvas',
      name: '拉取出链到画布',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly,
        (canvas: Canvas) => {
          const canvasFile = canvas.view.file
          if (!canvasFile) return

          let selectedNodeIds = canvas.getSelectionData().nodes.map(node => node.id)
          if (selectedNodeIds.length === 0) selectedNodeIds = [...canvas.nodes.keys()]

          const metadata = this.plugin.app.metadataCache.getFileCache(canvasFile) as ExtendedCachedMetadata
          if (!metadata) return

          // Get outgoing links for all selected nodes
          const outgoingLinks: Set<TFile> = new Set()
          for (const nodeId of selectedNodeIds) {
            let relativeFile = canvasFile

            let nodeOutgoingLinks = metadata.nodes?.[nodeId]?.links
            if (!nodeOutgoingLinks) {
              const file = canvas.nodes.get(nodeId)?.file
              if (!file) continue

              const fileMetadata = this.plugin.app.metadataCache.getFileCache(file)
              nodeOutgoingLinks = fileMetadata?.links
              relativeFile = file
            }
            if (!nodeOutgoingLinks) continue

            for (const nodeOutgoingLink of nodeOutgoingLinks) {
              const resolvedLink = this.plugin.app.metadataCache.getFirstLinkpathDest(nodeOutgoingLink.link, relativeFile.path)
              if (!(resolvedLink instanceof TFile)) continue

              outgoingLinks.add(resolvedLink)
            }
          }

          // Create outgoing links filter for those that are already on the canvas
          const existingFileNodes: Set<TFile> = new Set([canvas.view.file])
          for (const node of canvas.nodes.values()) {
            if (node.getData().type !== 'file' || !node.file) continue
            existingFileNodes.add(node.file)
          }

          for (const outgoingLink of outgoingLinks) {
            if (existingFileNodes.has(outgoingLink)) continue
            void this.createFileNode(canvas, outgoingLink)
          }
        }
      )
    })

    this.plugin.addCommand({
      id: 'pull-backlinks-to-canvas',
      name: '拉取反向链接到画布',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly,
        (canvas: Canvas) => {
          const canvasFile = canvas.view.file
          if (!canvasFile) return

          const selectedNodesData = canvas.getSelectionData().nodes.map(node => node)
          const backlinks: Set<TFile> = new Set()

          if (selectedNodesData.length > 0) {
            // Get backlinks for all selected nodes
            for (const nodeData of selectedNodesData) {
              if (nodeData.type !== 'file' || !(nodeData as CanvasFileNodeData).file) continue

              const file = this.plugin.app.vault.getFileByPath((nodeData as CanvasFileNodeData).file)
              if (!file) continue

              const nodeBacklinks = this.plugin.app.metadataCache.getBacklinksForFile(file)
              if (!nodeBacklinks) continue

              for (const nodeBacklink of nodeBacklinks.data.keys()) {
                const resolvedLink = this.plugin.app.metadataCache.getFirstLinkpathDest(nodeBacklink, file.path)
                if (!(resolvedLink instanceof TFile)) continue

                backlinks.add(resolvedLink)
              }
            }
          } else {
            // Get all backlinks for the canvas file
            const canvasBacklinks = this.plugin.app.metadataCache.getBacklinksForFile(canvasFile)
            if (!canvasBacklinks) return

            for (const canvasBacklink of canvasBacklinks.data.keys()) {
              const resolvedLink = this.plugin.app.metadataCache.getFirstLinkpathDest(canvasBacklink, canvasFile.path)
              if (!(resolvedLink instanceof TFile)) continue

              backlinks.add(resolvedLink)
            }
          }

          // Create backlinks filter for those that are already on the canvas
          const existingFileNodes: Set<TFile> = new Set([canvas.view.file])
          for (const node of canvas.nodes.values()) {
            if (node.getData().type !== 'file' || !node.file) continue
            existingFileNodes.add(node.file)
          }

          for (const backlink of backlinks) {
            if (existingFileNodes.has(backlink)) continue
            void this.createFileNode(canvas, backlink)
          }
        }
      )
    })

    // Edge selection popup menu (merged from EdgeSelectionCanvasExtension)
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  private onPopupMenuCreated(canvas: Canvas) {
    const popupMenuEl = canvas?.menu?.menuEl
    if (!popupMenuEl) return

    const selectionNodeData = canvas.getSelectionData().nodes

    // Edge selection popup (merged from EdgeSelectionCanvasExtension)
    if (this.plugin.settings.getSetting('edgeSelectionEnabled') && !canvas.readonly && selectionNodeData.length > 0) {
      const selectEdgeByDirection = this.plugin.settings.getSetting("selectEdgeByDirection")
      const menuDirectionSet = new Set<ConnectionDirection>(['connected'])

      if (selectionNodeData.length === 1) {
        const node = canvas.nodes.get(selectionNodeData[0].id)
        if (node) {
          const edges = canvas.getEdgesForNode(node)
          if (edges.length > 0 && selectEdgeByDirection) {
            edges.forEach(edge => {
              if (edge.from.node === node) menuDirectionSet.add('outgoing')
              else if (edge.to.node === node) menuDirectionSet.add('incoming')
            })
          }
        }
      } else if (selectEdgeByDirection) {
        menuDirectionSet.add('outgoing')
        menuDirectionSet.add('incoming')
      }

      menuDirectionSet.forEach(direction => {
        const config = EDGE_DIRECTION_MENU[direction]
        CanvasHelper.addPopupMenuOption(canvas, CanvasHelper.createPopupMenuOption({
          ...config,
          callback: () => CanvasHelper.selectEdgesForNodes(canvas, direction)
        }))
      })
    }

    // Copy wikilink popup (merged from CopyNodeReferenceCanvasExtension)
    if (this.plugin.settings.getSetting('enableSingleNodePopupReferenceCopy') && selectionNodeData.length === 1) {
      CanvasHelper.addPopupMenuOption(canvas, CanvasHelper.createPopupMenuOption({
        id: 'node-popup-menu-option-copy-reference',
        label: '复制节点 Wikilink',
        icon: 'link',
        callback: () => CanvasHelper.copyWikilinkToNode(canvas.view.file, selectionNodeData[0])
      }))
    }
  }

  private createTextNode(canvas: Canvas) {
    const size = canvas.config.defaultTextNodeDimensions
    const pos = CanvasHelper.getCenterCoordinates(canvas, size)

    canvas.createTextNode({ pos: pos, size: size, focus: true })
  }

  private async createFileNode(canvas: Canvas, file?: TFile) {
    const size = canvas.config.defaultFileNodeDimensions
    const pos = CanvasHelper.getCenterCoordinates(canvas, size)
    file ??= await new FileSelectModal(this.plugin.app, undefined, true).awaitInput()

    canvas.createFileNode({ pos: pos, size: size, file })
  }

  private cloneNode(canvas: Canvas, cloneDirection: NavDirection) {
    const sourceNode = canvas.selection.values().next().value
    if (!sourceNode) return
    const sourceNodeData = sourceNode.getData()

    const nodeMargin = this.plugin.settings.getSetting('cloneNodeMargin')
    const offset = {
      x: (sourceNode.width + nodeMargin) * (cloneDirection === 'left' ? -1 : (cloneDirection === 'right' ? 1 : 0)),
      y: (sourceNode.height + nodeMargin) * (cloneDirection === 'up' ? -1 : (cloneDirection === 'down' ? 1 : 0))
    }

    const clonedNode = canvas.createTextNode({
      pos: {
        x: sourceNode.x + offset.x,
        y: sourceNode.y + offset.y
      },
      size: {
        width: sourceNode.width,
        height: sourceNode.height
      }
    })

    clonedNode.setData({
      ...clonedNode.getData(),
      color: sourceNodeData.color,
      styleAttributes: sourceNodeData.styleAttributes
    })

    if (this.plugin.settings.getSetting('zoomToClonedNode'))
      canvas.zoomToBbox(clonedNode.getBBox())
  }

  private expandNode(canvas: Canvas, expandDirection: NavDirection) {
    const node = canvas.selection.values().next().value
    if (!node) return

    const expandNodeStepSize = this.plugin.settings.getSetting('expandNodeStepSize')
    const expand = {
      x: expandDirection === 'left' ? -1 : (expandDirection === 'right' ? 1 : 0),
      y: expandDirection === 'up' ? -1 : (expandDirection === 'down' ? 1 : 0)
    }

    node.setData({
      ...node.getData(),
      width: node.width + expand.x * expandNodeStepSize,
      height: node.height + expand.y * expandNodeStepSize
    })
  }

  private flipSelection(canvas: Canvas, horizontally: boolean) {
    const selectionData = canvas.getSelectionData()
    if (selectionData.nodes.length === 0) return

    const nodeIds = new Set()

    // Flip nodes
    for (const nodeData of selectionData.nodes) {
      nodeIds.add(nodeData.id)

      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue

      const newX = horizontally ?
        2 * selectionData.center.x - nodeData.x - nodeData.width :
        nodeData.x

      const newY = horizontally ?
        nodeData.y :
        2 * selectionData.center.y - nodeData.y - nodeData.height

      node.setData({
        ...nodeData,
        x: newX,
        y: newY
      })
    }

    // Flip edges
    for (const edge of canvas.edges.values()) {
      const edgeData = edge.getData()

      let newFromSide = edgeData.fromSide
      if (nodeIds.has(edgeData.fromNode) && BBoxHelper.isHorizontal(edgeData.fromSide) === horizontally)
        newFromSide = BBoxHelper.getOppositeSide(edgeData.fromSide)

      let newToSide = edgeData.toSide
      if (nodeIds.has(edgeData.toNode) && BBoxHelper.isHorizontal(edgeData.toSide) === horizontally)
        newToSide = BBoxHelper.getOppositeSide(edgeData.toSide)

      edge.setData({
        ...edgeData,
        fromSide: newFromSide,
        toSide: newToSide
      })
    }

    canvas.pushHistory(canvas.getData())
  }

  private navigate(canvas: Canvas, direction: NavDirection) {
    const node = CanvasHelper.findClosestNode(canvas, direction)
    if (!node) return

    canvas.updateSelection(() => {
      canvas.selection = new Set([node])
    })
  }
}
