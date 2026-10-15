const assert = require('node:assert/strict')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const bundle = file => buildSync({
  entryPoints: [path.join(__dirname, '../src', file)],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['obsidian', 'src/utils/canvas-helper'],
}).outputFiles[0].text

const settingsCode = bundle('settings.ts')
const nodeStylesCode = bundle('canvas-extensions/advanced-styles/node-styles.ts')
const edgeStylesCode = bundle('canvas-extensions/advanced-styles/edge-styles.ts')
const cssManagerCode = bundle('managers/css-styles-config-manager.ts')
const copy = value => JSON.parse(JSON.stringify(value))

function fixture(saved = null) {
  const listeners = new Map()
  const calls = { saved: [], events: [], menus: new Map(), parses: 0, tabs: [] }
  const sheet = { ownerNode: { textContent: '' } }
  const document = { styleSheets: { length: 1, item: () => sheet } }
  const plugin = {
    app: {
      workspace: {
        on(event, callback) {
          const callbacks = listeners.get(event) ?? []
          callbacks.push(callback)
          listeners.set(event, callbacks)
          return { event, callback }
        },
        trigger(event) {
          calls.events.push(event)
          for (const callback of listeners.get(event) ?? []) callback()
        },
      },
      internalPlugins: {},
      vault: { getRoot: () => ({ path: '', children: [] }) },
    },
    registerEvent() {},
    loadData: async () => saved && copy(saved),
    saveData: async data => { calls.saved.push(copy(data)) },
    addSettingTab: tab => calls.tabs.push(tab),
  }
  const settingRows = []
  const obsidian = {
    PluginSettingTab: class { constructor(app) { this.app = app } },
    Setting: class {
      constructor() { settingRows.push(this) }
      setName(name) { this.name = name; return this }
      setDesc(description) { this.description = description; return this }
      addText(callback) {
        const row = this
        callback({
          setValue(value) { row.value = value; return this },
          onChange(change) { row.change = change; return this },
        })
        return this
      }
      addDropdown(callback) {
        const dropdown = {
          addOption() { return this },
          setValue() { return this },
          onChange() { return this },
        }
        callback(dropdown)
        return this
      }
    },
    parseYaml(text) { calls.parses++; return JSON.parse(text) },
    getLanguage: () => 'zh',
  }
  function load(code) {
    const loaded = { exports: {} }
    const mockRequire = name => {
      if (name === 'obsidian') return obsidian
      if (name === 'src/utils/canvas-helper') return {
        addStyleAttributesToPopup(_plugin, canvas, styles) { calls.menus.set(canvas, styles) },
      }
      throw new Error(`unexpected dependency: ${name}`)
    }
    new Function('module', 'exports', 'require', 'activeDocument', code)(loaded, loaded.exports, mockRequire, document)
    return loaded.exports
  }
  const { default: SettingsManager, SETTINGS, DEFAULT_SETTINGS_VALUES } = load(settingsCode)
  plugin.settings = new SettingsManager(plugin)
  return { plugin, calls, listeners, sheet, settingRows, load, SETTINGS, DEFAULT_SETTINGS_VALUES }
}

test('partial saved settings retain defaults, legacy styles and unknown fields when updated', async () => {
  const legacyStyles = [{ key: 'legacy', label: 'Legacy', options: [] }]
  const { plugin, calls } = fixture({
    mindmapFeatureEnabled: false,
    customNodeStyleAttributes: legacyStyles,
    fileNodeTemplatePath: 'Templates/note.md',
    futureSetting: { preserved: true },
  })
  await plugin.settings.loadSettings()
  assert.equal(plugin.settings.getSetting('minNodeSize'), 60)
  assert.equal(plugin.settings.getSetting('mindmapFeatureEnabled'), false)
  assert.deepEqual(plugin.settings.getSetting('customNodeStyleAttributes'), legacyStyles)
  calls.events.length = 0
  plugin.app.workspace.on('canvas-enhance:settings-changed', () => {
    assert.equal(calls.saved.length, 1, 'settings event must follow persistence')
  })

  await plugin.settings.setSetting({ overviewModeZoomThreshold: 0.6 })
  assert.equal(calls.saved.length, 1)
  assert.equal(calls.saved[0].overviewModeZoomThreshold, 0.6)
  assert.equal(calls.saved[0].fileNodeTemplatePath, 'Templates/note.md')
  assert.deepEqual(calls.saved[0].customNodeStyleAttributes, legacyStyles)
  assert.deepEqual(calls.saved[0].futureSetting, { preserved: true })
  assert.deepEqual(calls.events, ['canvas-enhance:settings-changed'])
})

test('a fresh install loads defaults without saving or enabling a setting migration', async () => {
  const { plugin, calls, DEFAULT_SETTINGS_VALUES } = fixture()
  await plugin.settings.loadSettings()
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS_VALUES))
    assert.deepEqual(plugin.settings.getSetting(key), value)
  assert.deepEqual(calls.saved, [])
  assert.deepEqual(calls.events, ['canvas-enhance:settings-changed'])
})

test('save failures propagate without announcing a completed settings change', async () => {
  const { plugin, calls } = fixture()
  await plugin.settings.loadSettings()
  calls.events.length = 0
  plugin.saveData = async () => { throw new Error('disk unavailable') }
  await assert.rejects(plugin.settings.setSetting({ minNodeSize: 80 }), /disk unavailable/)
  assert.deepEqual(calls.events, [])
})

test('settings controls use their explicit plugin reference for template and folder selectors', async () => {
  const { plugin, calls, settingRows } = fixture()
  await plugin.settings.loadSettings()
  plugin.settings.addSettingsTab()
  const tab = calls.tabs[0]
  // The host base class deliberately supplies no plugin property.
  tab.createTemplateSelectSetting({}, 'fileNodeTemplatePath')
  tab.createFolderSelectSetting({}, 'fileNodeTemplateFolder')
  assert.equal(settingRows.length, 2)
  assert.match(settingRows[0].description, /未检测到/)
  assert.equal(settingRows[1].name, '新建文件所在文件夹')
})

test('shared text controls preserve string parsing and numeric serialization', async () => {
  const { plugin, calls, settingRows, SETTINGS } = fixture()
  await plugin.settings.loadSettings()
  plugin.settings.addSettingsTab()
  const tab = calls.tabs[0]
  tab.createTextSetting({}, 'minNodeSize', SETTINGS.general.children.minNodeSize)
  tab.createTextSetting({}, 'autoFileNodeEdgesFrontmatterKey', SETTINGS.autoFileNodeEdgesFeatureEnabled.children.autoFileNodeEdgesFrontmatterKey)
  assert.equal(settingRows[0].value, '60')
  assert.equal(settingRows[1].value, 'canvas-edges')
  await settingRows[0].change('80.5')
  await settingRows[1].change('  related  ')
  assert.equal(plugin.settings.getSetting('minNodeSize'), 80)
  assert.equal(plugin.settings.getSetting('autoFileNodeEdgesFrontmatterKey'), 'related')
  await settingRows[1].change('')
  assert.equal(plugin.settings.getSetting('autoFileNodeEdgesFrontmatterKey'), 'canvas-edges')
})

test('node and edge menus reuse the settings CSS caches and refresh after css-change', async () => {
  const { plugin, calls, listeners, sheet, load, SETTINGS } = fixture()
  await plugin.settings.loadSettings()
  const NodeStyles = load(nodeStylesCode).default
  const EdgeStyles = load(edgeStylesCode).default
  const nodeStyles = new NodeStyles(plugin)
  const edgeStyles = new EdgeStyles(plugin)
  assert.equal(listeners.get('css-change').length, 2)

  const attribute = (key, label) => ({ key, label, options: [{ icon: 'circle', label: 'Default', value: null }] })
  const setCss = suffix => {
    sheet.ownerNode.textContent =
      `/* @canvas-enhance-node-style\n${JSON.stringify(attribute('node-test', 'Node ' + suffix))}\n*/\n` +
      `/* @canvas-enhance-edge-style\n${JSON.stringify(attribute('edge-test', 'Edge ' + suffix))}\n*/`
  }
  const nodeCanvas = {
    readonly: false, selection: new Set([{}]),
    getSelectionData: () => ({ nodes: [{ id: 'node', type: 'text' }] }),
  }
  const edgeCanvas = {
    readonly: false,
    selection: new Set([{ path: {}, getData: () => ({ id: 'edge' }) }]),
  }
  const nodeControl = SETTINGS.nodeStylingFeatureEnabled.children.defaultTextNodeStyleAttributes
  const edgeControl = SETTINGS.edgesStylingFeatureEnabled.children.defaultEdgeStyleAttributes
  setCss('initial')
  const nodeOptions = nodeControl.getParameters(plugin.settings)
  const edgeOptions = edgeControl.getParameters(plugin.settings)
  nodeStyles.onPopupMenuCreated(nodeCanvas)
  edgeStyles.onPopupMenuCreated(edgeCanvas)
  assert.equal(calls.parses, 2, 'opening both menus must reuse parsed settings styles')
  assert.equal(calls.menus.get(nodeCanvas).find(style => style.key === 'nodeTest'), nodeOptions.find(style => style.key === 'nodeTest'))
  assert.equal(calls.menus.get(edgeCanvas).find(style => style.key === 'edgeTest'), edgeOptions.find(style => style.key === 'edgeTest'))

  setCss('updated')
  plugin.app.workspace.trigger('css-change')
  nodeStyles.onPopupMenuCreated(nodeCanvas)
  edgeStyles.onPopupMenuCreated(edgeCanvas)
  assert.equal(nodeControl.getParameters(plugin.settings).find(style => style.key === 'nodeTest').label, 'Node updated')
  assert.equal(edgeControl.getParameters(plugin.settings).find(style => style.key === 'edgeTest').label, 'Edge updated')
  assert.equal(calls.parses, 4, 'each shared cache should rebuild once after a CSS change')
})

test('shared style caches remain separate for each Obsidian window and invalidate together', () => {
  const createDocument = label => {
    const sheet = { ownerNode: { textContent: `/* @test\n${JSON.stringify({ label })}\n*/` } }
    return { styleSheets: { length: 1, item: () => sheet } }
  }
  const firstDocument = createDocument('First window')
  const secondDocument = createDocument('Second window')
  let parseCount = 0
  let onCssChange
  const context = {
    module: { exports: {} },
    activeDocument: firstDocument,
    require(name) {
      assert.equal(name, 'obsidian')
      return { parseYaml(text) { parseCount++; return JSON.parse(text) } }
    },
  }
  context.exports = context.module.exports
  vm.runInNewContext(cssManagerCode, context)
  const CssStylesConfigManager = context.module.exports.default
  const manager = new CssStylesConfigManager({
    registerEvent() {},
    app: { workspace: { on(_event, callback) { onCssChange = callback } } },
  }, 'test', config => config)

  const firstStyles = manager.getStyles()
  context.activeDocument = secondDocument
  const secondStyles = manager.getStyles()
  assert.equal(firstStyles[0].label, 'First window')
  assert.equal(secondStyles[0].label, 'Second window')
  context.activeDocument = firstDocument
  assert.equal(manager.getStyles(), firstStyles)
  assert.equal(parseCount, 2)

  onCssChange()
  assert.notEqual(manager.getStyles(), firstStyles)
  context.activeDocument = secondDocument
  assert.notEqual(manager.getStyles(), secondStyles)
  assert.equal(parseCount, 4)
})
