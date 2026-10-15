const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')
const ts = require('typescript')

const code = buildSync({
  entryPoints: [path.join(__dirname, '../src/patchers/patcher.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['obsidian', 'monkey-around'],
}).outputFiles[0].text
const loaded = { exports: {} }
new Function('module', 'exports', 'require', code)(loaded, loaded.exports, require)
const Patcher = loaded.exports.default

test('patch forwarding preserves the receiver, arguments and result, and can be released per instance', () => {
  const registered = [], uninstallers = []
  const original = function (amount, multiplier) { return (this.value + amount) * multiplier }
  const target = { value: 3, run: original }
  Patcher.patch({ register: fn => registered.push(fn) }, target, {
    run: Patcher.OverrideExisting(next => function (...args) { return next.call(this, ...args) }),
  }, false, uninstallers, false)
  assert.equal(target.run(4, 2), 14)
  assert.equal(registered.length, 0)
  assert.equal(uninstallers.length, 1)
  uninstallers[0]()
  assert.equal(target.run, original)
})

test('prototype patches affect existing instances and restore the original method on unload', () => {
  class Host { run(amount) { return this.value + amount } }
  const original = Host.prototype.run
  const first = Object.assign(new Host(), { value: 2 })
  const second = Object.assign(new Host(), { value: 5 })
  const registered = []
  Patcher.patchPrototype({ register: fn => registered.push(fn) }, first, {
    run: Patcher.OverrideExisting(next => function (...args) { return next.call(this, ...args) * 2 }),
  })
  assert.equal(first.run(3), 10)
  assert.equal(second.run(3), 16)
  registered.forEach(uninstall => uninstall())
  assert.equal(Host.prototype.run, original)
  assert.equal(first.run(3), 5)
})

test('required overrides reject missing methods before installing a patch', () => {
  const registered = []
  assert.throws(() => Patcher.patch({ register: fn => registered.push(fn) }, {}, {
    missing: Patcher.OverrideExisting(next => function () { return next.call(this) }),
  }), /Method missing does not exist on target/)
  assert.equal(registered.length, 0)
})

test('view factory interception forwards the leaf and receiver, then releases itself after the first result', async () => {
  const leaf = {}, view = {}, calls = [], patched = []
  const original = function (...args) { calls.push({ receiver: this, args }); return view }
  const otherFactory = () => ({})
  const factories = { canvas: original, search: otherFactory }
  const registered = []
  const plugin = { register: fn => registered.push(fn), app: { viewRegistry: { viewByType: factories } } }
  const ready = Patcher.waitForViewRequest(plugin, 'canvas', result => patched.push(result))
  assert.equal(factories.canvas(leaf), view)
  assert.equal(await ready, view)
  assert.deepEqual(calls, [{ receiver: factories, args: [leaf] }])
  assert.deepEqual(patched, [view])
  assert.equal(factories.canvas, original)
  assert.equal(factories.search, otherFactory)
  factories.canvas(leaf)
  assert.equal(patched.length, 1)
  registered.forEach(uninstall => uninstall())
  assert.equal(factories.canvas, original)
})

test('unloading before a view is requested removes the pending factory patch', () => {
  const registered = [], patched = []
  const view = {}, original = () => view
  const factories = { canvas: original }
  const plugin = { register: fn => registered.push(fn), app: { viewRegistry: { viewByType: factories } } }
  void Patcher.waitForViewRequest(plugin, 'canvas', result => patched.push(result))
  assert.notEqual(factories.canvas, original)
  registered.forEach(uninstall => uninstall())
  assert.equal(factories.canvas, original)
  assert.equal(factories.canvas({}), view)
  assert.deepEqual(patched, [])
})

test('patch types enforce forwarded arguments, replacement results and method-only keys', () => {
  const root = path.join(__dirname, '..')
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile)
  assert.equal(config.error, undefined)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  assert.equal(parsed.options.strictBindCallApply, true)
  const fixture = path.join(__dirname, 'patcher-contract-fixture.ts')
  const valid = `
    import Patcher from '../src/patchers/patcher'
    import type { Plugin } from 'obsidian'
    declare const plugin: Plugin
    declare const target: { value: number; run(amount: number): number; optional?: (checking: boolean) => boolean }
    Patcher.patch(plugin, target, {
      run: Patcher.OverrideExisting(next => function (amount: number) { return next.call(this, amount) }),
      optional: Patcher.OverrideExisting(next => function (checking: boolean) { return next.call(this, checking) })
    })
  `
  const check = source => {
    const host = ts.createCompilerHost(parsed.options)
    const readSource = host.getSourceFile.bind(host)
    host.getSourceFile = (file, ...args) => path.resolve(file) === fixture
      ? ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
      : readSource(file, ...args)
    return ts.getPreEmitDiagnostics(ts.createProgram([fixture], { ...parsed.options, noEmit: true }, host))
  }
  const format = diagnostics => ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  })
  const accepted = check(valid)
  assert.equal(accepted.length, 0, format(accepted))
  const rejected = check(valid + `
    Patcher.patch(plugin, target, {
      run: Patcher.OverrideExisting(next => function (amount: number) { return next.call(this, 'wrong') })
    })
    Patcher.patch(plugin, target, {
      run: Patcher.OverrideExisting(next => function (amount: number) { return 'wrong' })
    })
    Patcher.patch(plugin, target, { value: (next: () => number) => function () { return 1 } })
  `)
  assert.equal(rejected.length, 3, format(rejected))
  assert(rejected.every(diagnostic => diagnostic.file?.fileName === fixture), format(rejected))
})
