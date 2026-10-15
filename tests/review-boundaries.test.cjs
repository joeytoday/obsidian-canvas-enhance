const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

function load(file) {
  const code = buildSync({
    entryPoints: [path.join(__dirname, '../src', file)],
    bundle: true, platform: 'node', format: 'cjs', write: false,
    external: ['obsidian', 'monkey-around', 'src/utils/modal-helper'],
  }).outputFiles[0].text
  const loaded = { exports: {} }, errors = []
  new Function('module', 'exports', 'require', 'console', code)(loaded, loaded.exports, name => {
    if (name === 'monkey-around') return require(name)
    if (name === 'src/utils/modal-helper') return {}
    if (name === 'obsidian') return {
      getLanguage: () => 'en', parseYaml: JSON.parse, Notice: class {},
      TFile: class {}, TFolder: class {},
    }
    throw new Error(`unexpected dependency: ${name}`)
  }, { ...console, error: (...args) => errors.push(args) })
  return { ...loaded.exports, errors }
}

test('style validation keeps valid custom fields and rejects malformed keys, options and node types', () => {
  const { styleAttributeValidator: validate, errors } = load('canvas-extensions/advanced-styles/style-config.ts')
  const valid = {
    key: 'test-style', label: 'Test style', nodeTypes: ['text', 'file'], extra: { keep: true },
    options: [{ icon: 'circle', label: 'Default', value: null, extra: 'keep' }],
  }
  const input = Object.freeze(structuredClone(valid))
  const result = validate(input)
  assert.deepEqual(result, { ...valid, key: 'testStyle' })
  assert.equal(result.options, input.options)
  assert.equal(result.options[0], input.options[0])
  assert.equal(input.key, 'test-style')
  assert.equal(errors.length, 0)
  const invalid = [
    {}, { ...valid, key: 1 }, { ...valid, label: null },
    ...[null, 'wrong', [], [null], [5], [{}],
      [{ icon: 3, label: 'Default', value: null }],
      [{ icon: 'circle', label: false, value: null }],
      [{ icon: 'circle', label: 'Default', value: false }],
      [{ icon: 'circle', label: 'Non-default', value: 'custom' }],
    ].map(options => ({ ...valid, options })),
    { ...valid, nodeTypes: 'text' }, { ...valid, nodeTypes: ['unknown'] },
  ]
  for (const value of invalid) assert.equal(validate(value), null, JSON.stringify(value))
})

test('CSS configuration parsing skips scalars, arrays and invalid YAML without dropping valid snippets', () => {
  const { default: Manager } = load('managers/css-styles-config-manager.ts')
  const snippets = ['null', '[]', '"wrong"', '{', '{"label":"valid"}']
  const sheet = { ownerNode: { textContent: snippets.map(text => `/* @test\n${text}\n*/`).join('\n') } }
  const document = { styleSheets: { length: 1, item: () => sheet } }
  const previous = global.activeDocument
  global.activeDocument = document
  try {
    const manager = new Manager({ registerEvent() {}, app: { workspace: { on() {} } } }, 'test', value => value)
    assert.deepEqual(manager.getStyles(), [{ label: 'valid' }])
    assert.equal(manager.getStyles(), manager.getStyles())
  } finally { global.activeDocument = previous }
})

test('Canvas metadata writes preserve nodes, edges and unknown fields, and invalid inputs are never written', async () => {
  const { default: Helper, errors } = load('utils/canvas-file-helper.ts')
  const original = {
    nodes: [{ id: 'node', text: 'keep' }], edges: [], future: { keep: true },
    metadata: { version: '1.0-1.0', frontmatter: { title: 'before', nested: [1, null] }, future: 'keep' },
  }
  let stored = JSON.stringify(original), writes = 0, modifications = 0
  const vault = { async process(_file, transform) { const next = transform(stored); stored = next; writes++ } }
  await Helper.modifyContent(vault, {}, content => { content.metadata.frontmatter.title = 'after' })
  assert.deepEqual(JSON.parse(stored), { ...original, metadata: { ...original.metadata, frontmatter: { ...original.metadata.frontmatter, title: 'after' } } })
  assert.equal(writes, 1)
  for (const invalid of ['{', 'null', '[]', '"wrong"', '{"metadata":null}', '{"metadata":[]}', '{"metadata":{"frontmatter":[]}}', '{"metadata":{"frontmatter":false}}']) {
    stored = invalid
    await Helper.modifyContent(vault, {}, () => modifications++)
    assert.equal(stored, invalid)
  }
  assert.equal(writes, 1)
  assert.equal(modifications, 0)
  assert.equal(errors.length, 8)
  assert.deepEqual(Helper.parseContent('{"nodes":[],"edges":[]}'), { nodes: [], edges: [] })
})

test('Canvas metadata proxies retain nested writes, array iteration and symbol keys while requesting saves', () => {
  const { default: Extension } = load('canvas-extensions/metadata-canvas-extension.ts')
  const events = [], data = { metadata: { version: '1.0-1.0', frontmatter: { nested: { title: 'before' }, tags: ['a'] } } }
  let saves = 0
  const plugin = { registerEvent() {}, app: { workspace: { on() {}, trigger: (...args) => events.push(args) } } }
  const extension = new Extension(plugin)
  const canvas = { getData: () => data, requestSave() { saves++ } }
  extension.onCanvasChanged(canvas)
  assert.equal(events.length, 1)
  canvas.metadata.frontmatter.nested.title = 'after'
  assert.equal(data.metadata.frontmatter.nested.title, 'after')
  assert.equal(saves, 1)
  canvas.metadata.frontmatter.tags.push('b')
  assert.deepEqual([...canvas.metadata.frontmatter.tags], ['a', 'b'])
  assert.equal(saves, 3)
  const key = Symbol('metadata')
  canvas.metadata.frontmatter[key] = 'symbol value'
  assert.equal(canvas.metadata.frontmatter[key], 'symbol value')
  assert.equal(saves, 4)
  assert(events.every(([name, target]) => name === 'canvas-enhance:canvas-metadata-changed' && target === canvas))
})

test('mixed-type frontmatter arrays keep string wikilinks without crashing metadata indexing', async () => {
  const { default: Handler } = load('canvas-metadata-handler.ts')
  const frontmatter = { single: '[[One]]', mixed: ['[[Two|Alias]]', 3, null, { link: '[[Ignore]]' }, false, 'plain'] }
  const metadata = await Handler.computeCanvasMetadataAsync.call({}, JSON.stringify({ metadata: { frontmatter }, nodes: [], edges: [] }))
  assert.deepEqual(metadata.frontmatter, frontmatter)
  assert.deepEqual(metadata.frontmatterLinks.map(({ link, displayText }) => ({ link, displayText })), [
    { link: 'One', displayText: 'One' }, { link: 'Two', displayText: 'Alias' },
  ])
})

test('frontmatter patching updates Canvas data and delegates normal Markdown with its original arguments', async () => {
  const { default: FileManagerPatcher } = load('patchers/file-manager-patcher.ts')
  const native = [], uninstallers = []
  let stored = JSON.stringify({ nodes: [], edges: [], metadata: { version: '1.0-1.0', frontmatter: { title: 'before' } }, future: true })
  const fileManager = { async processFrontMatter(...args) { native.push({ receiver: this, args }) } }
  const plugin = {
    settings: { getSetting: () => true }, register: fn => uninstallers.push(fn),
    app: { fileManager, vault: { async process(_file, fn) { stored = fn(stored) } } },
  }
  new FileManagerPatcher(plugin)
  try {
    await fileManager.processFrontMatter({ extension: 'canvas' }, fm => { fm.title = 'after' })
    assert.equal(JSON.parse(stored).metadata.frontmatter.title, 'after')
    assert.equal(JSON.parse(stored).future, true)
    const file = { extension: 'md' }, fn = () => {}, options = { mtime: 123 }
    await fileManager.processFrontMatter(file, fn, options)
    assert.deepEqual(native, [{ receiver: fileManager, args: [file, fn, options] }])
  } finally { uninstallers.forEach(uninstall => uninstall()) }
})

function commandFixture(file) {
  const { default: Extension } = load(file)
  const commands = new Map(), created = [], changes = []
  const node = {
    id: 'node', x: 0, y: 0, width: 100, height: 80,
    getData() { return { id: this.id, type: 'text', x: this.x, y: this.y, width: this.width, height: this.height, color: '2', styleAttributes: { textAlign: 'center' } } },
    setData(data) { changes.push(data); Object.assign(this, data) },
  }
  const canvas = {
    readonly: false, nodes: new Map([[node.id, node]]), selection: new Set([node]),
    createTextNode(options) {
      created.push(options)
      return { getData: () => ({ id: 'clone', type: 'text' }), setData: data => changes.push(data) }
    },
  }
  const settings = { commandsFeatureEnabled: true, collapsibleGroupsFeatureEnabled: true, cloneNodeMargin: 20, expandNodeStepSize: 10 }
  const plugin = {
    settings: { getSetting: key => settings[key] }, addCommand: command => commands.set(command.id, command),
    getCurrentCanvas: () => canvas, registerEvent() {}, app: { workspace: { on() {} } },
  }
  new Extension(plugin)
  return { commands, canvas, node, created, changes }
}

test('node commands preserve cloning and expansion while rejecting edges, stale nodes and empty selections', () => {
  const f = commandFixture('canvas-extensions/commands-canvas-extension.ts')
  const clone = f.commands.get('clone-node-right'), expand = f.commands.get('expand-node-right')
  assert.equal(clone.checkCallback(true), true)
  clone.checkCallback(false)
  assert.deepEqual(f.created, [{ pos: { x: 120, y: 0 }, size: { width: 100, height: 80 } }])
  assert.equal(f.changes[0].color, '2')
  assert.deepEqual(f.changes[0].styleAttributes, { textAlign: 'center' })
  expand.checkCallback(false)
  assert.equal(f.node.width, 110)
  for (const selection of [new Set(), new Set([{ id: 'edge', getData: () => ({ id: 'edge' }) }]), new Set([{ ...f.node }])]) {
    f.canvas.selection = selection
    const before = [f.created.length, f.changes.length]
    for (const command of [clone, expand]) {
      assert.equal(command.checkCallback(true), false)
      command.checkCallback(false)
    }
    assert.deepEqual([f.created.length, f.changes.length], before)
  }
})

test('group collapse commands reject empty and edge selections without writing data', () => {
  const f = commandFixture('canvas-extensions/collapsible-groups-canvas-extension.ts')
  const command = f.commands.get('toggle-collapse-group')
  for (const selection of [new Set(), new Set([{ id: 'edge', getData: () => ({ id: 'edge' }) }])]) {
    f.canvas.selection = selection
    assert.equal(command.checkCallback(true), false)
    command.checkCallback(false)
    assert.equal(f.changes.length, 0)
  }
})

test('a selected group still collapses with one history entry and save request', () => {
  const f = commandFixture('canvas-extensions/collapsible-groups-canvas-extension.ts')
  const calls = []
  f.node.canvas = f.canvas
  f.node.getData = () => ({ id: f.node.id, type: 'group', collapsed: f.node.collapsed })
  f.canvas.getData = () => ({ nodes: [f.node.getData()], edges: [] })
  f.canvas.history = { current: 2 }
  f.canvas.setData = () => calls.push('set')
  f.canvas.pushHistory = () => calls.push('history')
  f.canvas.requestSave = () => calls.push('save')
  f.canvas.markMoved = () => calls.push('moved')
  const command = f.commands.get('toggle-collapse-group')
  assert.equal(command.checkCallback(true), true)
  command.checkCallback(false)
  assert.equal(f.node.collapsed, true)
  assert.equal(f.canvas.history.current, 1)
  assert.deepEqual(calls, ['set', 'history', 'save', 'moved'])
})

test('unresolved frontmatter links never create automatic edges to non-file cards', () => {
  const { default: Extension } = load('canvas-extensions/auto-file-node-edges-canvas-extension.ts')
  const targetFile = { path: 'Target.md' }
  const plugin = {
    settings: { getSetting: key => key === 'autoFileNodeEdgesFrontmatterKey' ? 'canvas-edges' : true },
    registerEvent() {},
    app: {
      workspace: { on() {} },
      metadataCache: {
        on() {},
        getFileCache: () => ({ frontmatterLinks: [
          { key: 'canvas-edges.0', link: 'Missing' },
          { key: 'canvas-edges.1', link: 'Target' },
          { key: 'canvas-edges.2', link: 'Target' },
        ] }),
        getFirstLinkpathDest: link => link === 'Target' ? targetFile : null,
      },
    },
  }
  const makeNode = (id, file) => ({ id, file, getBBox: () => ({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) })
  const source = makeNode('source', { path: 'Source.md' })
  const nodes = [source, makeNode('target', targetFile), makeNode('text'), makeNode('group')]
  const canvas = { view: { file: { path: 'Test.canvas' } }, nodes: new Map(nodes.map(node => [node.id, node])) }
  const extension = new Extension(plugin)
  const edges = [...extension.getFileNodeEdges(canvas, source).values()]
  assert.equal(edges.length, 1)
  assert.equal(edges[0].fromNode, 'source')
  assert.equal(edges[0].toNode, 'target')
})

test('file-card label listeners are attached once and removed on plugin unload', () => {
  const { default: Extension } = load('canvas-extensions/file-node-split-canvas-extension.ts')
  const uninstallers = []
  const plugin = {
    settings: { getSetting: () => true }, registerEvent() {}, app: { workspace: { on() {} } },
    registerDomEvent(element, type, callback, options) {
      const eventOptions = typeof options === 'boolean' ? { capture: options } : options
      element.addEventListener(type, callback, eventOptions)
      uninstallers.push(() => element.removeEventListener(type, callback, eventOptions))
    },
  }
  const canvas = { wrapperEl: new EventTarget() }
  let calls = 0
  const extension = new Extension(plugin)
  extension.onLabelClick = () => calls++
  extension.attachLabelClickHandler(canvas)
  extension.attachLabelClickHandler(canvas)
  canvas.wrapperEl.dispatchEvent(new Event('click'))
  assert.equal(calls, 1)
  uninstallers.forEach(uninstall => uninstall())
  canvas.wrapperEl.dispatchEvent(new Event('click'))
  assert.equal(calls, 1)
})

test('the project lint gate includes private typings and rejects protected rule suppression', async () => {
  const { ESLint } = require('eslint')
  const root = path.join(__dirname, '..')
  const eslint = new ESLint({ cwd: root })
  const config = await eslint.calculateConfigForFile(path.join(root, 'src/@types/Canvas.d.ts'))
  assert(config, 'production type declarations must not be ignored')
  for (const rule of ['require-description', 'no-restricted-disable', 'no-unlimited-disable', 'disable-enable-pair'])
    assert.equal(config.rules[`eslint-comments/${rule}`][0], 2, rule)
  const [result] = await eslint.lintText('// eslint-disable-next-line obsidianmd/commands/no-default-hotkeys\nvoid 0\n', {
    filePath: path.join(root, 'src/main.ts'),
  })
  assert(result.messages.some(message => message.ruleId === 'eslint-comments/require-description' && message.severity === 2))
  assert(result.messages.some(message => message.ruleId === 'eslint-comments/no-restricted-disable' && message.severity === 2))
})
