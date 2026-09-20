import type { CanvasNode } from "src/@types/Canvas"

const MIN_CONTENT_HEIGHT = "min-content"

// Content height of a node's editor (when editing) or rendered markdown preview
export function measureNodeContentHeight(node: CanvasNode): number | null {
  const cmDom = node.child?.editMode?.cm?.dom
  if (cmDom) {
    const cmScroller = cmDom.querySelector(".cm-scroller")
    if (!(cmScroller instanceof HTMLElement)) return null

    cmScroller.style.height = MIN_CONTENT_HEIGHT
    const height = cmScroller.scrollHeight
    cmScroller.style.removeProperty("height")
    return height
  }

  const renderedMarkdownContainer = node.nodeEl.querySelector(".markdown-preview-view.markdown-rendered")
  if (!(renderedMarkdownContainer instanceof HTMLElement)) return null

  renderedMarkdownContainer.style.height = MIN_CONTENT_HEIGHT
  const height = renderedMarkdownContainer.clientHeight
  renderedMarkdownContainer.style.removeProperty("height")
  return height
}
