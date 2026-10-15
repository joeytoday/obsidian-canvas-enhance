import { Notice } from "obsidian"
import { Canvas, CanvasView } from "src/@types/Canvas"
import { CURRENT_SPEC_VERSION } from "src/utils/migration-helper"
import CanvasExtension from "./canvas-extension"
import { t } from "src/i18n"
import type { CanvasMetadata } from "src/@types/AdvancedJsonCanvas"

export default class MetadataCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  private canvasCssclassesCache: Map<CanvasView, string[]> = new Map()

  init(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:canvas-changed',
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:canvas-metadata-changed',
      (canvas: Canvas) => this.onMetadataChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas-enhance:canvas-view-unloaded:before',
      (view: CanvasView) => this.onCanvasViewUnloaded(view)
    ))
  }

  private onCanvasChanged(canvas: Canvas): void {
    const metadata = canvas.getData()?.metadata
    if (!metadata || metadata.version !== CURRENT_SPEC_VERSION)
      return void new Notice(t('notice.metadataNodeMissing'))

    // Add proxy to metadata to listen for changes
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    const validator: ProxyHandler<object> = {
      get(target, key): unknown {
        const value: unknown = Reflect.get(target, key)
        if (typeof value === 'object' && value !== null)
          return new Proxy(value, validator)
        else return value
      },
      set(target, key, value: unknown) {
        (target as Record<PropertyKey, unknown>)[key] = value

        that.plugin.app.workspace.trigger('canvas-enhance:canvas-metadata-changed', canvas)
        canvas.requestSave()

        return true
      }
    }

    // Set canvas metadata
    canvas.metadata = new Proxy<CanvasMetadata>(metadata, validator)

    // Trigger metadata change event
    this.plugin.app.workspace.trigger('canvas-enhance:canvas-metadata-changed', canvas)
  }

  private onMetadataChanged(canvas: Canvas) {
    // Remove old cssclasses
    const oldCssClasses = this.canvasCssclassesCache.get(canvas.view)
    if (oldCssClasses) canvas.wrapperEl.classList.remove(...oldCssClasses)

    // Set new cssclasses (YAML allows a string or a list)
    const rawClasses = canvas.metadata?.frontmatter?.cssclasses
    const currentClasses = Array.isArray(rawClasses)
      ? rawClasses as string[]
      : typeof rawClasses === 'string' ? rawClasses.split(/\s+/).filter(cls => cls) : []
    this.canvasCssclassesCache.set(canvas.view, currentClasses)

    if (currentClasses.length > 0) canvas.wrapperEl.classList.add(...currentClasses)
  }

  private onCanvasViewUnloaded(view: CanvasView) {
    this.canvasCssclassesCache.delete(view) // Remove the cssclasses cache for the view
  }
}
