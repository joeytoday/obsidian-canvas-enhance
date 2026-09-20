const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const bundle = buildSync({
  entryPoints: [path.join(__dirname, '../src/i18n/index.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['obsidian'],
}).outputFiles[0].text

function load(obsidianLanguage) {
  const loaded = { exports: {} }
  const mockRequire = name => {
    if (name === 'obsidian') return { getLanguage: () => obsidianLanguage }
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
