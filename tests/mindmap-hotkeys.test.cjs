const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const code = buildSync({
  entryPoints: [path.join(__dirname, '../src/canvas-extensions/mindmap-canvas-extension.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  external: ['obsidian', 'monkey-around', 'src/utils/node-content-measurement'],
}).outputFiles[0].text

const loaded = { exports: {} }
new Function('module', 'exports', 'require', code)(loaded, loaded.exports, name => {
  if (['obsidian', 'monkey-around', 'src/utils/node-content-measurement'].includes(name)) return {}
  throw new Error(`unexpected dependency: ${name}`)
})
const commandIds = ['mindmap-create-child-node', 'mindmap-create-sibling-node', 'mindmap-edit-selected-node']

function fixture() {
  const commands = new Map()
  const settings = { mindmapFeatureEnabled: false }
  const node = {
    isEditing: false,
    getData: () => ({ id: 'node', type: 'text' }),
    setIsEditing(editing) { this.isEditing = editing },
  }
  let canvas = { readonly: false, nodes: new Map([['node', node]]), selection: new Set([node]) }
  const plugin = {
    settings: { getSetting: key => settings[key] },
    addCommand(command) { commands.set(command.id, command) },
    getCurrentCanvas: () => canvas,
  }
  // Register only the commands under test; avoid starting unrelated event handlers and patches.
  const extension = new loaded.exports.default(plugin)
  settings.mindmapFeatureEnabled = true
  extension.registerCommands()
  extension.createChildNode = extension.createSiblingNode = () => {
    throw new Error('node creation must not run when the command is unavailable')
  }
  return { commands, settings, node, canvas, setCanvas(value) { canvas = value } }
}

test('mindmap node actions expose configurable default hotkeys', () => {
  const { commands } = fixture()
  commandIds.forEach((id, index) => {
    assert.deepEqual(commands.get(id).hotkeys, [{ modifiers: [], key: ['Tab', 'Enter', ' '][index] }])
  })
})

test('checking the edit command leaves the node untouched; executing it enters editing', () => {
  const { commands, node } = fixture()
  const command = commands.get('mindmap-edit-selected-node')
  assert.equal(command.checkCallback(true), true)
  assert.equal(node.isEditing, false)
  assert.equal(command.checkCallback(false), true)
  assert.equal(node.isEditing, true)
})

test('node actions reject invalid contexts on both checking and direct execution', () => {
  const contexts = {
    'no canvas': f => f.setCanvas(null),
    'read-only canvas': f => { f.canvas.readonly = true },
    'editing node': f => { f.node.isEditing = true },
    'disabled mindmap': f => { f.settings.mindmapFeatureEnabled = false },
    'empty selection': f => f.canvas.selection.clear(),
    'mixed selection': f => f.canvas.selection.add({ getData: () => ({ id: 'edge' }) }),
    'edge-only selection': f => {
      f.canvas.selection = new Set([{ getData: () => ({ id: 'node' }) }])
    },
  }
  for (const [context, configure] of Object.entries(contexts)) {
    const f = fixture()
    configure(f)
    for (const id of commandIds) {
      const command = f.commands.get(id)
      assert.equal(command.checkCallback(true), false, `${id}: ${context}`)
      assert.equal(command.checkCallback(false), false, `${id}: ${context}`)
    }
  }
})
