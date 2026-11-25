const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

function load(file, mocks = {}) {
  const dependencies = {
    'src/i18n': { t: key => key },
    'src/utils/modal-helper': {},
    'src/utils/canvas-helper': {
      getSelectedNode: canvas => {
        const selected = [...canvas.selection][0]
        return selected && canvas.nodes.get(selected.id) === selected ? selected : undefined
      },
      createPopupMenuOption: option => ({ ...option }),
      addPopupMenuOption: (canvas, option) => {
        canvas.toolbar.find(button => button.id === option.id)?.remove()
        option.remove = () => { canvas.toolbar = canvas.toolbar.filter(button => button !== option) }
        canvas.toolbar.push(option)
      },
    },
    ...mocks,
  }
  const code = buildSync({
    entryPoints: [path.join(__dirname, '../src', file)],
    bundle: true, platform: 'node', format: 'cjs', write: false,
    external: ['obsidian', ...Object.keys(dependencies)],
  }).outputFiles[0].text
  const module = { exports: {} }
  new Function('module', 'exports', 'require', code)(module, module.exports, name => {
    if (name in dependencies) return dependencies[name]
    throw new Error(`unexpected dependency: ${name}`)
  })
  return module.exports.default
}

// Small DOM double: only direct-child selectors are needed by the card renderer.
class Element {
  constructor() {
    this.children = []
    this.className = ''
    this.textContent = ''
    this.ownerDocument = { createElement: () => new Element() }
    this.classList = {
      remove: name => this.classList.toggle(name, false),
      toggle: (name, enabled) => {
        const classes = new Set(this.className.split(' ').filter(Boolean))
        if (enabled) classes.add(name)
        else classes.delete(name)
        this.className = [...classes].join(' ')
      },
    }
  }
  set innerHTML(_) { throw new Error('card text must not be parsed as HTML') }
  prepend(child) { child.parent = this; this.children.unshift(child) }
  append(child) { child.parent = this; this.children.push(child) }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this) }
  querySelectorAll(selector) {
    assert.match(selector, /^:scope > \.[\w-]+$/)
    const name = selector.slice(':scope > .'.length)
    return this.children.filter(child => child.className.split(' ').includes(name))
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null }
  createEl() {}
  empty() { this.children = [] }
}

function fixture(initial = {}, appearance = {}) {
  const listeners = new Map(), cleanup = [], history = [], writes = [], modals = [], settingsWrites = [], notices = []
  const workspace = {
    on(event, callback) {
      const callbacks = listeners.get(event) ?? []
      callbacks.push(callback)
      listeners.set(event, callbacks)
    },
    trigger(event, ...args) { for (const callback of listeners.get(event) ?? []) callback(...args) },
  }
  let data = { id: 'node', type: 'text', text: '# Original body', width: 300, height: 180, ...initial }
  const canvas = {
    readonly: false, nodes: new Map(), selection: new Set(), toolbar: [],
    getData: () => ({ nodes: [data], edges: [] }),
    pushHistory: value => history.push(structuredClone(value)),
  }
  canvas.menu = { menuEl: { querySelector: selector => canvas.toolbar.find(button => '#' + button.id === selector) } }
  const node = {
    id: data.id, canvas, contentEl: new Element(),
    getData: () => data,
    setData(value) { writes.push(value); data = value; workspace.trigger('canvas-enhance:node-changed', canvas, node) },
  }
  const body = new Element()
  body.className = 'markdown-embed-content'
  node.contentEl.append(body)
  canvas.nodes.set(node.id, node)
  canvas.selection.add(node)
  const settings = { cardAppearance: { ...appearance } }
  const plugin = {
    app: { workspace }, settings: {
      getSetting: key => settings[key] ?? false,
      async setSetting(update) {
        settingsWrites.push(structuredClone(update))
        Object.assign(settings, update)
        workspace.trigger('canvas-enhance:settings-changed')
      },
    },
    getCanvases: () => [canvas], registerEvent() {}, register: callback => cleanup.push(callback),
  }
  const obsidian = {
    Notice: class { constructor(message) { notices.push(message) } },
    Modal: class {
      constructor() { this.contentEl = new Element(); this.inputs = []; this.fontInputs = []; this.buttons = []; this.contentEl.modal = this; modals.push(this) }
      setTitle(title) { this.title = title }
      open() { this.onOpen() }
      close() { this.closed = true; this.onClose() }
    },
    Setting: class {
      constructor(container) { this.modal = container.modal }
      setName(name) { this.name = name; return this }
      setDesc(description) { this.description = description; return this }
      addText(callback) {
        const inputEl = {
          value: '',
          setAttribute(name, value) { this[name] = value },
          checkValidity() {
            if (this.value === '') return true
            const number = Number(this.value)
            return Number.isFinite(number) && number >= Number(this.min ?? 0) &&
              number <= Number(this.max ?? Infinity) && Number.isInteger(number)
          },
          reportValidity() { this.reported = true; return this.checkValidity() },
        }
        const input = {
          name: this.name, description: this.description, inputEl,
          get value() { return inputEl.value },
          setValue(value) { inputEl.value = value; return this },
          setPlaceholder(value) { this.placeholder = value; return this },
          getValue() { return inputEl.value },
          change(value) { inputEl.value = String(value) },
        }
        callback(input)
        this.modal.fontInputs.push(input)
        return this
      }
      addTextArea(callback) {
        const input = {
          name: this.name, inputEl: { setAttribute() {} },
          setValue(value) { this.value = value; return this },
          onChange(change) { this.change = change; return this },
        }
        callback(input)
        this.modal.inputs.push(input)
        return this
      }
      addButton(callback) {
        const button = {
          setButtonText(text) { this.text = text; return this },
          setDisabled(disabled) { this.disabled = disabled; return this },
          setCta() { return this }, onClick(click) { this.click = click; return this },
        }
        callback(button)
        this.modal.buttons.push(button)
        return this
      }
    },
  }
  const Extension = load('canvas-extensions/card-content-extension.ts', { obsidian })
  const extension = new Extension(plugin)
  function menu() {
    const items = []
    workspace.trigger('canvas:node-menu', { addItem(callback) {
      const item = { setTitle(title) { this.title = title; return this }, setIcon() { return this }, onClick(click) { this.click = click; return this } }
      callback(item)
      items.push(item)
    } }, node)
    return items
  }
  function open(section = 'header') { menu()[section === 'header' ? 0 : 1].click(); return modals.at(-1) }
  return { extension, plugin, canvas, node, body, workspace, cleanup, history, writes, menu, open, modals, settings, settingsWrites, notices }
}

test('card save preserves body and old snapshots and records resized content in one undo step', () => {
  const previous = { header: 'Before', footer: 'Keep' }
  const f = fixture({ cardContent: previous })
  const before = f.node.getData()
  f.workspace.on('canvas-enhance:card-content-changed', () => {
    assert.equal(f.node.contentEl.children[0].textContent, 'After', 'render must precede resize')
    f.node.setData({ ...f.node.getData(), height: 220 })
  })
  f.extension.save(f.node, 'header', 'After')
  assert.equal(before.cardContent, previous)
  assert.deepEqual(previous, { header: 'Before', footer: 'Keep' })
  assert.notEqual(f.node.getData().cardContent, previous)
  assert.equal(f.node.getData().text, '# Original body')
  assert.equal(f.history.length, 1)
  assert.equal(f.history[0].nodes[0].height, 220)
  assert.deepEqual(f.history[0].nodes[0].cardContent, { header: 'After', footer: 'Keep' })
  f.extension.save(f.node, 'header', 'After')
  assert.equal(f.history.length, 1, 'unchanged content must not add history')
})

test('clearing each section preserves the other until both are empty', () => {
  const f = fixture({ cardContent: { header: 'Title', footer: 'Footer' } })
  f.extension.save(f.node, 'header', '  ')
  assert.deepEqual(f.node.getData().cardContent, { footer: 'Footer' })
  assert.equal(f.node.contentEl.querySelector(':scope > .ce-card-header'), null)
  assert.equal(f.node.contentEl.querySelector(':scope > .ce-card-footer').textContent, 'Footer')
  f.extension.save(f.node, 'footer', '\n')
  assert.equal(Object.hasOwn(f.node.getData(), 'cardContent'), false)
  assert.equal(f.node.getData().text, '# Original body')
  assert.deepEqual(f.node.contentEl.children, [f.body])
  assert.equal(f.node.contentEl.className, '')
  assert.equal(f.history.length, 2)
})

test('each section has its own dialog and preserves concurrent changes to the other section', async () => {
  const f = fixture({ cardContent: { header: 'Before' } })
  let modal = f.open()
  assert.equal(modal.title, 'card.header.edit')
  assert.equal(modal.inputs.length, 1)
  modal.inputs[0].change('Discard')
  modal.buttons.find(button => button.text === 'common.cancel').click()
  assert.equal(f.extension.modal, undefined, 'closing the dialog releases the node and canvas reference')
  assert.equal(f.writes.length, 0)
  assert.deepEqual(f.node.getData().cardContent, { header: 'Before' })
  modal = f.open('footer')
  assert.equal(modal.title, 'card.footer.add')
  assert.equal(modal.inputs.length, 1)
  modal.inputs[0].change('Details')
  f.extension.save(f.node, 'header', 'Updated elsewhere')
  await modal.buttons.find(button => button.text === 'common.save').click()
  assert.deepEqual(f.node.getData().cardContent, { header: 'Updated elsewhere', footer: 'Details' })
  assert.equal(modal.closed, true)
  modal = f.open('footer')
  assert.equal(modal.title, 'card.footer.edit')
  modal.buttons.find(button => button.text === 'card.footer.remove').click()
  assert.deepEqual(f.node.getData().cardContent, { header: 'Updated elsewhere' })
  modal = f.open('header')
  modal.buttons.find(button => button.text === 'card.header.remove').click()
  assert.equal(f.node.getData().cardContent, undefined)
  assert.equal(f.open('header').title, 'card.header.add')
  assert.equal(f.history.length, 4)
})

test('card dialog rejects saving into readonly, replaced, deleted or non-text nodes', async () => {
  for (const invalidate of [
    f => { f.canvas.readonly = true },
    f => { f.canvas.nodes.delete(f.node.id) },
    f => { f.canvas.nodes.set(f.node.id, { ...f.node }) },
    f => { f.node.setData({ ...f.node.getData(), type: 'file', file: 'keep.md' }); f.writes.length = 0 },
  ]) {
    const f = fixture(), modal = f.open()
    modal.inputs[0].change('Do not save')
    modal.fontInputs[0].change(24)
    invalidate(f)
    await modal.buttons.find(button => button.text === 'common.save').click()
    assert.equal(f.writes.length, 0)
    assert.equal(f.history.length, 0)
    assert.equal(f.settingsWrites.length, 0)
    assert.equal(f.node.getData().cardContent, undefined)
  }
  for (const type of ['file', 'group', 'link']) assert.equal(fixture({ type }).menu().length, 0)
  const readonly = fixture()
  readonly.canvas.readonly = true
  assert.equal(readonly.menu().length, 0)
})

test('card rendering is idempotent, literal and limited to its own direct children', () => {
  const unsafe = '<img src=x onerror=alert(1)> & **plain text**'
  const f = fixture({ cardContent: { header: unsafe, footer: 'Footer\nsecond line' } })
  const header = f.node.contentEl.children[0], footer = f.node.contentEl.children[2]
  for (const event of ['canvas-enhance:node-rendered', 'canvas-enhance:node-editing-state-changed', 'canvas-enhance:data-loaded:after'])
    f.workspace.trigger(event, f.canvas, f.node)
  assert.deepEqual(f.node.contentEl.children, [header, f.body, footer])
  assert.equal(header.textContent, unsafe)
  assert.equal(header.children.length, 0)
  assert.equal(header.dir, 'auto')
  const nested = new Element()
  nested.className = 'ce-card-section'
  f.body.append(nested)
  f.node.setData({ ...f.node.getData(), cardContent: { header: null, footer: ['invalid'] } })
  assert.deepEqual(f.node.contentEl.children, [f.body])
  assert.deepEqual(f.body.children, [nested])
  assert.equal(f.history.length, 0, 'rendering alone must never save or create history')
})

test('render and unload safely skip nodes whose content DOM is not mounted', () => {
  const f = fixture({ cardContent: { header: 'Keep' } })
  const contentEl = f.node.contentEl
  delete f.node.contentEl
  for (const event of ['canvas-enhance:node-rendered', 'canvas-enhance:node-changed', 'canvas-enhance:data-loaded:after'])
    assert.doesNotThrow(() => f.workspace.trigger(event, f.canvas, f.node))
  f.extension.save(f.node, 'footer', 'New footer')
  assert.deepEqual(f.node.getData().cardContent, { header: 'Keep', footer: 'New footer' })
  assert.doesNotThrow(() => f.cleanup.forEach(callback => callback()))
  f.node.contentEl = contentEl
  f.extension.render(f.node)
  assert.equal(contentEl.querySelector(':scope > .ce-card-footer').textContent, 'New footer')
})

test('toolbar has independent section buttons only for a single editable text selection', () => {
  const f = fixture({ cardContent: { header: 'Title' } })
  f.workspace.trigger('canvas-enhance:popup-menu-created', f.canvas)
  assert.deepEqual(f.canvas.toolbar.map(button => button.label), ['card.header.edit', 'card.footer.add'])
  assert.deepEqual(f.menu().map(item => item.title), ['card.header.edit', 'card.footer.add'])
  f.workspace.trigger('canvas-enhance:popup-menu-created', f.canvas)
  assert.equal(f.canvas.toolbar.length, 2, 'menu refresh must replace rather than duplicate buttons')
  for (const invalidate of [
    f => { f.canvas.readonly = true },
    f => f.canvas.selection.clear(),
    f => f.canvas.selection.add({ id: 'edge' }),
    f => f.canvas.selection.add({ id: 'another-node', getData: () => ({ type: 'text' }) }),
    f => { f.canvas.selection = new Set([{ id: 'edge' }]) },
    f => { f.canvas.nodes.delete(f.node.id) },
    f => { f.node.setData({ ...f.node.getData(), type: 'file' }) },
  ]) {
    const blocked = fixture()
    invalidate(blocked)
    blocked.workspace.trigger('canvas-enhance:popup-menu-created', blocked.canvas)
    assert.equal(blocked.canvas.toolbar.length, 0)
  }
})

test('toolbar callbacks resolve current selection and reject a newly invalid selection', async () => {
  const f = fixture()
  f.workspace.trigger('canvas-enhance:popup-menu-created', f.canvas)
  const [header, footer] = f.canvas.toolbar
  let data = { id: 'other', type: 'text', text: 'Other body', cardContent: { footer: 'Other footer' } }
  const other = { ...f.node, id: data.id, getData: () => data, setData: value => { data = value } }
  f.canvas.nodes.set(other.id, other)
  f.canvas.selection = new Set([other])
  header.callback()
  let modal = f.modals.at(-1)
  modal.inputs[0].change('Other header')
  await modal.buttons.find(button => button.text === 'common.save').click()
  assert.deepEqual(data.cardContent, { header: 'Other header', footer: 'Other footer' })
  assert.equal(f.node.getData().cardContent, undefined)
  footer.callback()
  modal = f.modals.at(-1)
  assert.equal(modal.inputs[0].value, 'Other footer')
  const count = f.modals.length
  f.canvas.selection.clear()
  header.callback()
  assert.equal(f.modals.length, count)
  f.canvas.selection.add(other)
  f.canvas.readonly = true
  footer.callback()
  assert.equal(f.modals.length, count)
})

test('unload removes plugin decorations and closes the editor without deleting saved data', () => {
  const f = fixture({ cardContent: { header: 'Keep' } }), modal = f.open()
  const before = structuredClone(f.node.getData())
  f.workspace.trigger('canvas-enhance:popup-menu-created', f.canvas)
  f.cleanup.forEach(callback => callback())
  assert.equal(modal.closed, true)
  assert.equal(f.canvas.toolbar.length, 0, 'unload must remove live toolbar callbacks')
  assert.deepEqual(f.node.contentEl.children, [f.body])
  assert.deepEqual(f.node.getData(), before)
  assert.equal(f.writes.length, 0)
})

test('overview uses a text card header and falls back after it is cleared', async () => {
  const f = fixture({ cardContent: { header: ' Card title ' } })
  const Overview = load('canvas-extensions/overview-mode-canvas-extension.ts')
  f.plugin.settings.getSetting = () => true
  const overview = new Overview(f.plugin)
  assert.equal(await overview.getTitle(f.node), 'Card title')
  f.extension.save(f.node, 'header', '')
  assert.equal(await overview.getTitle(f.node), 'Original body')
  f.node.setData({ ...f.node.getData(), cardContent: { header: 42 } })
  assert.equal(await overview.getTitle(f.node), 'Original body')
})

test('clone inherits independent text card sections while retaining its empty-body behavior', () => {
  const f = fixture({ color: '2', styleAttributes: { shape: 'pill' }, cardContent: { header: 'Title', footer: 'Footer' } })
  const Commands = load('canvas-extensions/commands-canvas-extension.ts', { obsidian: { TFile: class {} } })
  const extension = new Commands(f.plugin)
  Object.assign(f.node, { x: 0, y: 0, width: 300, height: 180 })
  f.canvas.selection = new Set([f.node])
  let result
  f.canvas.createTextNode = () => ({ getData: () => ({ id: 'clone', type: 'text', text: '' }), setData: value => { result = value } })
  extension.cloneNode(f.canvas, 'right')
  assert.deepEqual(result.cardContent, { header: 'Title', footer: 'Footer' })
  assert.notEqual(result.cardContent, f.node.getData().cardContent)
  assert.equal(result.text, '')
  assert.equal(result.color, '2')
  assert.deepEqual(result.styleAttributes, { shape: 'pill' })
  result.cardContent.header = 'Changed clone'
  assert.equal(f.node.getData().cardContent.header, 'Title')
})

test('section resizing respects readonly and the current auto-height switch', () => {
  const f = fixture({ dynamicHeight: true, cardContent: { header: 'Title' } })
  const values = {
    autoResizeNodeFeatureEnabled: true,
    autoResizeNodeVerticalPadding: 10,
    autoResizeNodeMaxHeight: -1,
    autoResizeNodeSnapToGrid: false,
  }
  f.plugin.settings.getSetting = key => values[key]
  f.canvas.config = { minContainerDimension: 20 }
  f.node.nodeEl = { isConnected: true }
  let measurements = 0
  const Resize = load('canvas-extensions/auto-resize-node-canvas-extension.ts', {
    'src/utils/node-content-measurement': { measureNodeContentHeight: () => { measurements++; return 200 } },
  })
  new Resize(f.plugin)
  const resize = () => f.workspace.trigger('canvas-enhance:card-content-changed', f.canvas, f.node)
  resize()
  assert.equal(measurements, 1)
  assert.equal(f.node.getData().height, 210)
  f.writes.length = 0
  f.canvas.readonly = true
  resize()
  f.canvas.readonly = false
  values.autoResizeNodeFeatureEnabled = false
  resize()
  values.autoResizeNodeFeatureEnabled = true
  f.node.setData({ ...f.node.getData(), dynamicHeight: false })
  f.writes.length = 0
  resize()
  f.node.setData({ ...f.node.getData(), type: 'file', file: 'keep.md', dynamicHeight: true })
  f.writes.length = 0
  resize()
  assert.equal(measurements, 1, 'excluded nodes must not enter the measurement or save path')
  assert.equal(f.writes.length, 0)
})


test('section dialogs share global font settings without changing the other font or appearance', async () => {
  const f = fixture({ cardContent: { header: 'Before', footer: 'Keep' } },
    { headerFontSize: 18, footerFontSize: 12, shadowBlur: 20 })
  let modal = f.open('header')
  assert.equal(modal.fontInputs.length, 1)
  assert.equal(modal.fontInputs[0].description, 'card.header.fontScope')
  assert.equal(modal.fontInputs[0].inputEl.type, 'number')
  assert.equal(modal.fontInputs[0].inputEl.min, '10')
  assert.equal(modal.fontInputs[0].inputEl.max, '32')
  assert.equal(modal.fontInputs[0].value, '18')
  modal.inputs[0].change('After')
  modal.fontInputs[0].change(24)
  assert.equal(f.settingsWrites.length, 0, 'typing only stages a value until Save')
  await modal.buttons.find(button => button.text === 'common.save').click()
  assert.equal(f.settings.cardAppearance.headerFontSize, 24)
  assert.equal(f.settings.cardAppearance.footerFontSize, 12)
  assert.equal(f.settings.cardAppearance.shadowBlur, 20)
  assert.deepEqual(f.node.getData().cardContent, { header: 'After', footer: 'Keep' })
  assert.equal(f.node.getData().text, '# Original body')
  assert.equal(Object.hasOwn(f.node.getData().cardContent, 'headerFontSize'), false, 'font settings do not become per-card data')
  modal = f.open('footer')
  assert.equal(modal.fontInputs[0].description, 'card.footer.fontScope')
  assert.equal(modal.fontInputs[0].value, '12')
  modal.fontInputs[0].change(16)
  await modal.buttons.find(button => button.text === 'common.save').click()
  assert.equal(f.settings.cardAppearance.headerFontSize, 24)
  assert.equal(f.settings.cardAppearance.footerFontSize, 16)
  await f.plugin.settings.setSetting({ cardAppearance: { ...f.settings.cardAppearance, headerFontSize: 22 } })
  assert.equal(f.open('header').fontInputs[0].value, '22', 'opening again reads the plugin settings value')
})

test('Cancel and Remove discard staged font changes', () => {
  for (const action of ['common.cancel', 'card.header.remove']) {
    const f = fixture({ cardContent: { header: 'Keep', footer: 'Footer' } }, { headerFontSize: 18 })
    const modal = f.open('header')
    modal.inputs[0].change('Discard text')
    modal.fontInputs[0].change(30)
    modal.buttons.find(button => button.text === action).click()
    assert.equal(f.settingsWrites.length, 0)
    assert.equal(f.settings.cardAppearance.headerFontSize, 18)
    assert.equal(f.node.getData().cardContent.header, action === 'common.cancel' ? 'Keep' : undefined)
    assert.equal(f.node.getData().cardContent.footer, 'Footer')
  }
})

test('saving only text keeps font changes made elsewhere while the dialog is open', async () => {
  const f = fixture({}, { headerFontSize: 18, footerFontSize: 12 })
  const modal = f.open('header')
  modal.inputs[0].change('New header')
  await f.plugin.settings.setSetting({ cardAppearance: { headerFontSize: 26, footerFontSize: 16 } })
  await modal.buttons.find(button => button.text === 'common.save').click()
  assert.equal(f.settingsWrites.length, 1, 'text-only Save must not overwrite shared settings')
  assert.equal(f.settings.cardAppearance.headerFontSize, 26)
  assert.equal(f.settings.cardAppearance.footerFontSize, 16)
  assert.deepEqual(f.node.getData().cardContent, { header: 'New header' })
})

test('font save failures keep content local and pending saves cannot be submitted twice', async t => {
  t.mock.method(console, 'error', () => {})
  const f = fixture({ cardContent: { header: 'Before' } })
  const modal = f.open('header'), button = modal.buttons.find(button => button.text === 'common.save')
  modal.inputs[0].change('After')
  modal.fontInputs[0].change(24)
  const originalSave = f.plugin.settings.setSetting
  let rejectSave, attempts = 0
  f.plugin.settings.setSetting = () => {
    attempts++
    return new Promise((_resolve, reject) => { rejectSave = reject })
  }
  const pending = button.click()
  assert.ok(modal.buttons.every(action => action.disabled), 'pending saves disable conflicting Cancel and Remove actions')
  await button.click()
  assert.equal(attempts, 1)
  assert.equal(f.writes.length, 0)
  rejectSave(new Error('Disk unavailable'))
  await pending
  assert.ok(modal.buttons.every(action => !action.disabled), 'failure re-enables all actions for retry')
  assert.equal(modal.closed, undefined)
  assert.deepEqual(f.notices, ['card.saveFailed'])
  assert.equal(f.node.getData().cardContent.header, 'Before')
  f.plugin.settings.setSetting = originalSave
  await button.click()
  assert.equal(modal.closed, true)
  assert.equal(f.node.getData().cardContent.header, 'After')
  assert.equal(f.settings.cardAppearance.headerFontSize, 24)
})


test('pending font saves cannot write card content or restore toolbar buttons after closing or unloading', async () => {
  for (const unload of [false, true]) {
    const f = fixture({ cardContent: { header: 'Before' } })
    const modal = f.open('header')
    modal.inputs[0].change('After')
    modal.fontInputs[0].change(24)
    let resolveSave
    f.plugin.settings.setSetting = () => new Promise(resolve => { resolveSave = resolve })
    const pending = modal.buttons.find(button => button.text === 'common.save').click()
    if (unload) f.cleanup.forEach(cleanup => cleanup())
    else modal.close()
    assert.equal(f.extension.modal, undefined)
    assert.equal(f.writes.length, 0)
    resolveSave()
    await pending
    assert.equal(f.node.getData().cardContent.header, 'Before')
    assert.equal(f.writes.length, 0)
    assert.equal(f.history.length, 0)
    assert.equal(f.canvas.toolbar.length, 0)
  }
})

test('font input defaults to 16 and clearing a saved override restores 16 only on Save', async () => {
  const fresh = fixture(), freshModal = fresh.open('header')
  assert.equal(freshModal.fontInputs[0].value, '16')
  await freshModal.buttons.find(button => button.text === 'common.save').click()
  assert.equal(fresh.settingsWrites.length, 0, 'an unchanged default needs no settings write')
  assert.equal(fixture({}, { headerFontSize: 0 }).open('header').fontInputs[0].value, '16',
    'the previous zero sentinel resolves to the new default')

  const f = fixture({ cardContent: { header: 'Keep', footer: 'Footer' } }, { headerFontSize: 24, footerFontSize: 18 })
  const modal = f.open('header')
  modal.fontInputs[0].change('')
  assert.equal(f.settings.cardAppearance.headerFontSize, 24)
  await modal.buttons.find(button => button.text === 'common.save').click()
  assert.equal(f.settings.cardAppearance.headerFontSize, 16)
  assert.equal(f.settings.cardAppearance.footerFontSize, 18)
  assert.deepEqual(f.node.getData().cardContent, { header: 'Keep', footer: 'Footer' })
  assert.equal(f.open('header').fontInputs[0].value, '16')
})

test('invalid font input does not save settings or card content', async () => {
  for (const invalid of ['not a number', '-1', '0', '9', '33', '12.5']) {
    const f = fixture({ cardContent: { header: 'Keep' } }, { headerFontSize: 18 })
    const modal = f.open('header')
    modal.inputs[0].change('Do not save')
    modal.fontInputs[0].change(invalid)
    await modal.buttons.find(button => button.text === 'common.save').click()
    assert.equal(modal.fontInputs[0].inputEl.reported, true, invalid)
    assert.equal(modal.closed, undefined, invalid)
    assert.equal(f.settingsWrites.length, 0, invalid)
    assert.equal(f.writes.length, 0, invalid)
  }
})
