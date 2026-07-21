import { setIcon } from "obsidian"
import { CanvasView } from "src/@types/Canvas"
import { CanvasGroupNodeData, CanvasTextNodeData } from "src/@types/AdvancedJsonCanvas"

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
    this.searchCount.style.display = "none" /* eslint-disable-line obsidianmd/no-static-styles-assignment -- Should be dynamic */
    this.searchCount.textContent = "0 / 0"

    const documentSearchButtons = documentSearch.createDiv()
    documentSearchButtons.className = "document-search-buttons"

    const previousButton = documentSearchButtons.createEl("button")
    previousButton.className = "clickable-icon document-search-button"
    previousButton.setAttribute("aria-label", "Previous\nShift + F3")
    previousButton.setAttribute("data-tooltip-position", "top")
    setIcon(previousButton, "arrow-up")
    previousButton.addEventListener("click", () => this.changeMatch(this.matchIndex - 1))

    const nextButton = documentSearchButtons.createEl("button")
    nextButton.className = "clickable-icon document-search-button"
    nextButton.setAttribute("aria-label", "Next\nF3")
    nextButton.setAttribute("data-tooltip-position", "top")
    setIcon(nextButton, "arrow-down")
    nextButton.addEventListener("click", () => this.changeMatch(this.matchIndex + 1))

    const closeButton = documentSearch.createEl("button")
    closeButton.className = "clickable-icon document-search-close-button"
    closeButton.setAttribute("aria-label", "Exit search")
    closeButton.setAttribute("data-tooltip-position", "top")
    setIcon(closeButton, "x")
    closeButton.addEventListener("click", () => this.close())

    this.view.canvas.searchEl = this.containerEl
    this.searchInput.focus()
  }

  private onKeyDown(e: KeyboardEvent) {
    // TODO: Fix arrows moving the node and not the cursor

    if (e.key === "Enter" || e.key === "F3")
      this.changeMatch(this.matchIndex + (e.shiftKey ? -1 : 1))
    else if (e.key === "Escape")
      this.close()
  }

  private onInput() {
    const hasQuery = this.searchInput.value.length > 0
    this.searchCount.style.display = hasQuery ? "block" : "none"

    if (!hasQuery) this.searchMatches = []
    else {
      this.searchMatches = Array.from(this.view.canvas.nodes.values()).map(node => {
        const nodeData = node.getData()

        let content: string | undefined = undefined
        if (nodeData.type === "text") content = (nodeData as CanvasTextNodeData).text
        else if (nodeData.type === "group") content = (nodeData as CanvasGroupNodeData).label
        else if (nodeData.type === "file") content = node.child.data

        if (!content) return null

        const matches: number[][] = []
        const escaped = this.searchInput.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escaped, "gi")
        let match: RegExpExecArray | null
        while ((match = regex.exec(content)) !== null) {
          matches.push([match.index, match.index + match[0].length])
        }

        return { nodeId: node.id, content: content, matches: matches }
      }).filter(match => match && match.matches.length > 0) as SearchMatch[]
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
    if (match) this.goToMatch(match)

    this.searchCount.textContent = `${this.matchIndex + 1} / ${this.searchMatches.length}`
  }

  private goToMatch(match: SearchMatch) {
    this.view.setEphemeralState({ match: match })
  }

  private close() {
    this.containerEl.remove()
    this.view.canvas.searchEl = undefined
  }
}
