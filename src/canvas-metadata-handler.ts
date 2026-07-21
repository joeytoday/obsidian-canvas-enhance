import { CanvasData, CanvasTextNodeData, CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { ExtendedMetadataCache, FrontmatterLinkCache, Notice, TFile } from "obsidian"
import { ExtendedCachedMetadata, ExtendedEmbedCache, ExtendedLinkCache } from "src/@types/Obsidian"
import HashHelper from "src/utils/hash-helper"
import TaskQueue from "src/utils/task-queue"

export default class CanvasMetadataHandler {
  static metadataQueue: TaskQueue = new TaskQueue()
  static linkResolveQueue: TaskQueue = new TaskQueue()

  static async computeCanvasFileMetadataAsync(this: ExtendedMetadataCache, file: TFile) {
    // Add file to uniqueFileLookup
    this.uniqueFileLookup.add(file.name.toLowerCase(), file)

    // Check if cache is stale
    let isStale = true
    const cache = this.fileCache[file.path]
    if (!cache) this.saveFileCache(file.path, { mtime: 0, size: 0, hash: "" })
    else {
      const unchanged = cache.mtime === file.stat.mtime && cache.size === file.stat.size
      const hasMetadataCache = cache.hash && Object.prototype.hasOwnProperty.call(this.metadataCache, cache.hash)

      if (unchanged && hasMetadataCache)
        isStale = false
    }

    if (isStale) {
      CanvasMetadataHandler.linkResolveQueue.setOnFinished(() => this.trigger('finished'))
      await CanvasMetadataHandler.metadataQueue.add(
        () => CanvasMetadataHandler.updateMetadataCache.call(this, file)
      )
    }

    CanvasMetadataHandler.linkResolveQueue.setOnFinished(() => this.trigger('resolved'))
    await CanvasMetadataHandler.linkResolveQueue.add(
      () => CanvasMetadataHandler.resolveCanvasLinks.call(this, file.path)
    )
  }

  static async updateMetadataCache(this: ExtendedMetadataCache, file: TFile) {
    const bytes = await this.vault.readBinary(file)
    const data = new TextDecoder().decode(new Uint8Array(bytes))
    const hash = await HashHelper.getBytesHash(bytes)

    // Update cache
    const cache = {
      mtime: file.stat.mtime,
      size: file.stat.size,
      hash: hash
    }
    this.saveFileCache(file.path, cache)

    // Check if metadata already exists for the hash
    let metadata = this.metadataCache[cache.hash]
    if (metadata) return this.trigger(
      "changed", file, data, metadata
    )

    const slowIndexingTimeout = window.setTimeout(() => {
      new Notice(`Canvas indexing taking a long time for file ${file.path}`)
    }, 10000)

    try {
      metadata = await CanvasMetadataHandler.computeCanvasMetadataAsync.call(this, data)
    } finally {
      window.clearTimeout(slowIndexingTimeout)
    }

    if (metadata) {
      this.saveMetaCache(hash, metadata)
      this.trigger("changed", file, data, metadata)
    } else {
      console.error("Canvas metadata failed to parse", file)
    }
  }

  static async computeCanvasMetadataAsync(this: ExtendedMetadataCache, data: string): Promise<ExtendedCachedMetadata> {
    const content = JSON.parse(data || '{}') as Partial<CanvasData>
    const metadata = {
      v: 1
    } as Partial<ExtendedCachedMetadata>

    // Create frontmatter metadata entry
    const frontmatter = content.metadata?.frontmatter
    metadata.frontmatterPosition = {
      start: { line: 0, col: 0, offset: 0 },
      end: { line: 0, col: 0, offset: 0 }
    }
    metadata.frontmatter = frontmatter

    // Extract frontmatter links
    metadata.frontmatterLinks = []
    for (const [key, value] of Object.entries(frontmatter ?? {})) {
      const getLinks = (value: string[]) => value.map((v) => {
        if (!v.startsWith('[[') || !v.endsWith(']]')) return null // Frontmatter only supports wikilinks
        const [link, ...aliases] = v.slice(2, -2).split('|')

        return {
          key: key,
          displayText: aliases.length > 0 ? aliases.join('|') : link,
          link: link ?? v,
          original: v
        } satisfies FrontmatterLinkCache
      }).filter((v) => v !== null) as FrontmatterLinkCache[]

      if (typeof value === 'string') metadata.frontmatterLinks?.push(...getLinks([value]))
      else if (Array.isArray(value)) metadata.frontmatterLinks?.push(...getLinks(value))
    }

    // Add text node entries, links and embeds in parallel
    metadata.nodes = {}
    metadata.links = []
    metadata.embeds = []
    await Promise.all((content.nodes ?? []).map(async (node, index) => {
      if (node.type !== 'text') return

      const text = (node as CanvasTextNodeData).text
      const buffer = new TextEncoder().encode(text).buffer
      const nodeMetadata = await this.computeMetadataAsync(buffer)
      if (!nodeMetadata) return

      metadata.nodes![node.id] = nodeMetadata
      metadata.links!.push(...(nodeMetadata.links ?? []).map(link => ({
        ...link,
        position: {
          nodeId: node.id,
          start: { line: 0, col: 1, offset: 0 }, // 0 for node
          end: { line: 0, col: 1, offset: index } // index of node
        }
      } satisfies ExtendedLinkCache)))
      metadata.embeds!.push(...(nodeMetadata.embeds ?? []).map(embed => ({
        ...embed,
        position: {
          nodeId: node.id,
          start: { line: 0, col: 1, offset: 0 }, // 0 for node
          end: { line: 0, col: 1, offset: index } // index of node
        }
      }) satisfies ExtendedEmbedCache))
    }))

    // Add file nodes as embeds
    for (const [index, node] of (content.nodes ?? []).entries()) {
      if (node.type !== 'file') continue

      const file = (node as CanvasFileNodeData).file
      if (!file) continue

      metadata.embeds.push({
        link: file,
        original: file,
        displayText: file,
        position: {
          start: { line: 0, col: 1, offset: 0 }, // 0 for nodes
          end: { line: 0, col: 1, offset: index } // index of node
        }
      })
    }

    return metadata as ExtendedCachedMetadata
  }

  static async resolveCanvasLinks(this: ExtendedMetadataCache, filepath: string) {
    const file = this.vault.getAbstractFileByPath(filepath)
    if (!(file instanceof TFile)) return

    const metadata = this.getFileCache(file)
    const references = [...(metadata?.links ?? []), ...(metadata?.embeds ?? [])]
    const referenceLinks = references.map(ref => ref.link).sort()

    const resolvedLinks: Record<string, number> = {}
    const unresolvedLinks: Record<string, number> = {}

    for (const link of referenceLinks) {
      const resolved = this.getFirstLinkpathDest(link, filepath)

      if (resolved) {
        resolvedLinks[resolved.path] ??= 0
        resolvedLinks[resolved.path]++
      } else {
        const strippedLink = link.endsWith('.md') ? link.slice(0, -3) : link

        unresolvedLinks[strippedLink] ??= 0
        unresolvedLinks[strippedLink]++
      }
    }

    this.resolvedLinks[filepath] = resolvedLinks
    this.unresolvedLinks[filepath] = unresolvedLinks

    await sleep(1)
    this.trigger('resolve', file)
  }
}
