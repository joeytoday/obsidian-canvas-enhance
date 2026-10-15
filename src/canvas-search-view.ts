import { debounce, setIcon } from "obsidian"
import { CanvasView } from "src/@types/Canvas"
import { CanvasGroupNodeData, CanvasTextNodeData } from "src/@types/AdvancedJsonCanvas"
import { t } from "src/i18n"

interface SearchMatch {
  nodeId: string
  content: string
  matches: number[][]
}

export default class CanvasSearchView {
  private view: CanvasView

  private containerEl: HTMLDivElement
  private searchInput: HTMLInputElement
  private searchCount: HTMLDivElement

  private searchMatches: SearchMatch[] = []
  private matchIndex = 0

  constructor(view: CanvasView) {
    this.view = view
    this.createSearchView()
  }

  private createSearchView() {
    this.containerEl = this.view.canvas.wrapperEl.createDiv()
    this.containerEl.className = "document-search-container"

    const documentSearch = this.containerEl.createDiv()
    documentSearch.className = "document-search"

    const searchInputContainer = documentSearch.createDiv()
    searchInputContainer.className = "search-input-container document-search-input"

    this.searchInput = searchInputContainer.createEl("input")
    this.searchInput.type = "text"
    this.searchInput.placeholder = "Find..."
    this.searchInput.addEventListener("keydown", (e: KeyboardEvent) => this.onKeyDown(e))
    this.searchInput.addEventListener("input", () => this.onInput())

    this.searchCount = searchInputContainer.createDiv()
    this.searchCount.className = "document-search-count"
    this.searchCount.hide()
    this.searchCount.textContent = "0 / 0"

    const documentSearchButtons = documentSearch.createDiv()
    documentSearchButtons.className = "document-search-buttons"

    for (const [direction, label, icon] of [[-1, 'search.previous', 'arrow-up'], [1, 'search.next', 'arrow-down']] as const) {
      const button = documentSearchButtons.createEl("button")
      button.className = "clickable-icon document-search-button"
      button.setAttribute("aria-label", t(label))
      button.setAttribute("data-tooltip-position", "top")
      setIcon(button, icon)
      button.addEventListener("click", () => this.changeMatch(this.matchIndex + direction))
    }

    const closeButton = documentSearch.createEl("button")
    closeButton.className = "clickable-icon document-search-close-button"
    closeButton.setAttribute("aria-label", t('search.exit'))
    closeButton.setAttribute("data-tooltip-position", "top")
    setIcon(closeButton, "x")
    closeButton.addEventListener("click", () => this.close())

    this.view.canvas.searchEl = this.containerEl
    this.searchInput.focus()
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === "F3") {
      e.preventDefault()
      e.stopPropagation()
      this.changeMatch(this.matchIndex + (e.shiftKey ? -1 : 1))
    } else if (e.key === "Escape") {
      e.stopPropagation()
      this.close()
    } else if (e.key.startsWith("Arrow")) {
      // Keep arrow keys for cursor movement in the input; don't let the canvas move nodes
      e.stopPropagation()
    }
  }

  private scheduleSearch = debounce(() => this.performSearch(), 150, true)

  private onInput() {
    const hasQuery = this.searchInput.value.length > 0
    this.searchCount.style.display = hasQuery ? "block" : "none"

    if (!hasQuery) {
      this.scheduleSearch.cancel()
      this.searchMatches = []
      this.changeMatch(0)
      return
    }

    // Full-canvas scan per keystroke is wasteful while typing
    this.scheduleSearch()
  }

  private performSearch() {
    const query = this.searchInput.value
    if (!query || !this.containerEl.isConnected) return
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi")
    this.searchMatches = []
    for (const node of this.view.canvas.nodes.values()) {
      const nodeData = node.getData()
      const content = nodeData.type === 'text' ? (nodeData as CanvasTextNodeData).text
        : nodeData.type === 'group' ? (nodeData as CanvasGroupNodeData).label
        : nodeData.type === 'file' ? node.child?.data : undefined
      if (!content) continue

      const matches: number[][] = []
      let match: RegExpExecArray | null
      while ((match = regex.exec(content)) !== null)
        matches.push([match.index, match.index + match[0].length])

      if (matches.length > 0) this.searchMatches.push({ nodeId: node.id, content, matches })
    }

    // Update match index and update the count display
    this.changeMatch(0)
  }

  private changeMatch(index: number) {
    // Bind the index to the range of searchMatches
    if (this.searchMatches.length === 0) this.matchIndex = -1
    else {
      if (index < 0) index += this.searchMatches.length
      this.matchIndex = index % this.searchMatches.length
    }

    const match = this.searchMatches[this.matchIndex]
    if (match) this.view.setEphemeralState({ match })

    this.searchCount.textContent = `${this.matchIndex + 1} / ${this.searchMatches.length}`
  }

  private close() {
    this.scheduleSearch.cancel()
    this.containerEl.remove()
    this.view.canvas.searchEl = undefined
  }
}
