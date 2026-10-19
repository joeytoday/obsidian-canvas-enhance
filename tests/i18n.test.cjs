const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const bundle = buildSync({
  stdin: {
    contents: "export * from './src/i18n'; export { default as CanvasHelper } from './src/utils/canvas-helper';",
    resolveDir: path.join(__dirname, '..'),
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['obsidian'],
}).outputFiles[0].text

const pluginCode = buildSync({
  entryPoints: [path.join(__dirname, '../src/main.ts')],
  platform: 'node', format: 'cjs', write: false,
}).outputFiles[0].text

function load(obsidianLanguage) {
  const loaded = { exports: {} }
  const mockRequire = name => {
    if (name === 'obsidian') return {
      getLanguage: () => obsidianLanguage,
      setTooltip(element, label) { element.setAttribute('aria-label', label) },
    }
    throw new Error(`unexpected dependency: ${name}`)
  }
  new Function('module', 'exports', 'require', bundle)(loaded, loaded.exports, mockRequire)
  return loaded.exports
}

const placeholders = text => (text.match(/\{\w+\}/g) ?? []).sort()

test('every language provides the same keys and placeholders as the source language', () => {
  const { LANGUAGES } = load('en')
  const source = LANGUAGES['zh-cn'].dict
  for (const [id, language] of Object.entries(LANGUAGES)) {
    assert.deepEqual(Object.keys(language.dict).sort(), Object.keys(source).sort(), `${id} keys`)
    for (const key of Object.keys(source))
      assert.deepEqual(placeholders(language.dict[key]), placeholders(source[key]), `${id}: ${key}`)
  }
})

test('auto follows the Obsidian language and falls back to English for non-Chinese languages', () => {
  assert.equal(load('zh').resolveLanguage('auto'), 'zh-cn')
  assert.equal(load('zh-TW').resolveLanguage('auto'), 'zh-cn')
  assert.equal(load('en').resolveLanguage('auto'), 'en')
  assert.equal(load('ru').resolveLanguage('auto'), 'en')
  assert.equal(load('ru').resolveLanguage('zh-cn'), 'zh-cn')
  assert.equal(load('zh').resolveLanguage('en'), 'en')
  assert.equal(load('en').resolveLanguage('toString'), 'en')
})

test('t() uses the active language, substitutes parameters and falls back to the key', () => {
  const i18n = load('en')
  i18n.setLanguage('en')
  assert.equal(i18n.t('cmd.cloneNode', { direction: 'Up' }), 'Clone node (Up)')
  i18n.setLanguage('zh-cn')
  assert.equal(i18n.t('cmd.cloneNode', { direction: '向上' }), '克隆节点（向上）')
  assert.equal(i18n.t('missing.key'), 'missing.key')
  assert.equal(i18n.t('cmd.cloneNode'), '克隆节点（{direction}）')
  assert.equal(i18n.getActiveLanguage(), 'zh-cn')
})

test('the language options list auto first and every registered language under its own name', () => {
  const i18n = load('en')
  i18n.setLanguage('en')
  assert.deepEqual(Object.keys(i18n.getLanguageOptions()), ['auto', 'zh-cn', 'en'])
  assert.equal(i18n.getLanguageOptions()['zh-cn'], '中文')
  assert.equal(i18n.getLanguageOptions()['en'], 'English')
})

test('one language listener updates commands while preserving host registration, hotkeys and cleanup', async () => {
  const i18n = load('en'), commands = new Map(), listeners = new Map(), cleanup = []
  class Plugin {
    manifest = { id: 'canvas-enhance', name: 'Canvas Enhance' }
    app = { workspace: {
      getLeavesOfType: () => [],
      on(event, callback) {
        const handlers = listeners.get(event) ?? new Set()
        handlers.add(callback)
        listeners.set(event, handlers)
        return { event, callback }
      },
    } }
    register(callback) { cleanup.push(callback) }
    registerEvent({ event, callback }) { this.register(() => listeners.get(event).delete(callback)) }
    addCommand(command) {
      command.id = `${this.manifest.id}:${command.id}`
      command.name = `${this.manifest.name}: ${command.name}`
      assert.ok(!commands.has(command.id), 'commands must only be registered once')
      commands.set(command.id, command)
      this.register(() => commands.delete(command.id))
      return command
    }
  }
  // Exercise the actual plugin entry point; unrelated extensions are not started in this unit test.
  class Dependency {
    static addIcons() {}
    async loadSettings() {}
    addSettingsTab() {}
    tryInit() {}
  }
  const loaded = { exports: {} }
  new Function('module', 'exports', 'require', pluginCode)(loaded, loaded.exports, name => {
    if (name === 'obsidian') return { Plugin }
    if (name === './utils/canvas-helper') return i18n.CanvasHelper
    if (name.startsWith('./')) return Dependency
    throw new Error(`unexpected dependency: ${name}`)
  })
  const plugin = new loaded.exports.default()
  await plugin.onload()
  let calls = 0
  const callback = () => { calls++; return true }
  const hotkeys = [{ modifiers: [], key: 'Tab' }]
  const command = plugin.addCommand({
    id: 'clone-node-up', name: () => i18n.t('cmd.cloneNode', { direction: i18n.t('cmd.direction.up') }),
    checkCallback: callback, hotkeys,
  })
  const plainCommand = plugin.addCommand({ id: 'plain', name: 'Plain command' })
  for (const language of ['en', 'zh-cn', 'auto', 'zh-cn', 'en']) {
    i18n.setLanguage(language)
    listeners.get('canvas-enhance:language-changed').forEach(listener => listener())
    assert.equal(command.name, `Canvas Enhance: ${i18n.t('cmd.cloneNode', { direction: i18n.t('cmd.direction.up') })}`)
    assert.equal(commands.get('canvas-enhance:clone-node-up'), command)
    assert.equal(command.hotkeys, hotkeys)
    assert.equal(command.checkCallback, callback)
    assert.equal(plainCommand.name, 'Canvas Enhance: Plain command')
    assert.equal(commands.size, 2)
    assert.equal(listeners.get('canvas-enhance:language-changed').size, 1)
  }
  assert.equal(calls, 0, 'renaming never executes the command')
  cleanup.forEach(unload => unload())
  assert.equal(listeners.get('canvas-enhance:language-changed').size, 0)
  assert.equal(commands.size, 0)
  assert.equal(plugin.commandNames.size, 0)
})

test('existing canvas controls translate without changing canvas data, selection or search input', () => {
  const i18n = load('en')
  const element = () => ({ attributes: {}, setAttribute(key, value) { this.attributes[key] = value } })
  const buttons = new Map(['properties-button', 'disable-node-popup', 'disable-zoom', 'disable-pan', 'focus-mode-toggle', 'create-group', 'mindmap-rearrange-all'].map(id => ['#' + id, element()]))
  const search = new Map(['.document-search-button:first-child', '.document-search-button:last-child', '.document-search-close-button'].map(selector => [selector, element()]))
  const data = [{ id: 'parent', mindmapCollapsed: true }, { id: 'child' }]
  const nodes = data.map(value => ({ getData: () => value, mindmapCollapseEl: element() }))
  const snapshot = JSON.stringify(data), selection = new Set([nodes[0]])
  let renders = 0
  const canvas = {
    wrapperEl: { querySelector: selector => buttons.get(selector) },
    nodes: new Map(nodes.map((node, i) => [i, node])), selection,
    searchEl: { querySelector: selector => search.get(selector), value: 'unfinished query' },
    menu: { menuEl: { isConnected: true }, render() { renders++ } },
  }
  for (const language of ['en', 'zh-cn', 'en']) {
    i18n.setLanguage(language)
    i18n.CanvasHelper.refreshLanguage(canvas)
    assert.equal(buttons.get('#mindmap-rearrange-all').attributes['aria-label'], i18n.t('mindmap.rearrange'))
    assert.equal(buttons.get('#properties-button').attributes['aria-label'], i18n.t('menu.properties'))
    assert.equal(nodes[0].mindmapCollapseEl.attributes['aria-label'], i18n.t('mindmap.expandChildren'))
    assert.equal(nodes[1].mindmapCollapseEl.attributes['aria-label'], i18n.t('mindmap.collapseChildren'))
    assert.equal(search.get('.document-search-button:first-child').attributes['aria-label'], i18n.t('search.previous'))
    assert.equal(JSON.stringify(data), snapshot)
    assert.equal(canvas.selection, selection)
    assert.equal(canvas.searchEl.value, 'unfinished query')
  }
  assert.equal(renders, 3)
  canvas.menu.menuEl.isConnected = false
  i18n.CanvasHelper.refreshLanguage(canvas)
  assert.equal(renders, 3)
})
