const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const { buildSync } = require('esbuild')

const code = buildSync({
  entryPoints: [path.join(__dirname, '../src/canvas-search-view.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false, external: ['obsidian'],
}).outputFiles[0].text

function fixture() {
  const pending = new Map(), visited = []
  let timerId = 0, scans = 0
  const timers = {
    setTimeout(callback) { pending.set(++timerId, callback); return timerId },
    clearTimeout(id) { pending.delete(id) },
  }
  const obsidian = {
    setIcon() {}, getLanguage: () => 'en',
    debounce(callback) {
      let id
      const run = () => { timers.clearTimeout(id); id = timers.setTimeout(callback); return run }
      run.cancel = () => { timers.clearTimeout(id); return run }
      return run
    },
  }
  const element = () => ({
    style: {}, value: '', isConnected: true,
    createDiv: element, createEl: element,
    addEventListener() {}, setAttribute() {}, focus() {},
    hide() { this.style.display = 'none' },
    remove() { this.isConnected = false },
  })
  const data = [
    { id: 'text', type: 'text', text: 'Alpha [a]. ALPHA' },
    { id: 'group', type: 'group', label: 'Alpha group' },
    { id: 'file', type: 'file' },
    { id: 'link', type: 'link', url: 'https://example.com/alpha' },
  ]
  const view = {
    canvas: {
      wrapperEl: element(),
      nodes: new Map(data.map(item => [item.id, {
        id: item.id, getData() { scans++; return item }, child: { data: 'A note about alpha' },
      }])),
    },
    setEphemeralState({ match }) { visited.push(match) },
  }
  const loaded = { exports: {} }
  new Function('module', 'exports', 'require', code)(loaded, loaded.exports, () => obsidian)
  const search = new loaded.exports.default(view)
  return {
    search, view, pending, visited, scans: () => scans,
    input(value) { search.searchInput.value = value; search.onInput() },
    flush() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback()) },
  }
}

test('clearing a pending search cancels the scan and resets its result count', () => {
  const f = fixture()
  f.input('alpha')
  f.input('')
  f.flush()
  assert.equal(f.scans(), 0)
  assert.deepEqual(f.visited, [])
  assert.equal(f.search.searchCount.textContent, '0 / 0')
})

test('typing coalesces into one search across text, group and file cards with wraparound navigation', () => {
  const f = fixture()
  f.input('al')
  f.input('alpha')
  assert.equal(f.pending.size, 1)
  f.flush()
  assert.equal(f.scans(), 4)
  assert.equal(f.search.searchCount.textContent, '1 / 3')
  assert.deepEqual(f.visited[0].matches, [[0, 5], [11, 16]])
  f.search.changeMatch(-1)
  assert.equal(f.visited.at(-1).nodeId, 'file')
  f.search.changeMatch(3)
  assert.equal(f.visited.at(-1).nodeId, 'text')
})

test('search treats regular expression characters literally', () => {
  const f = fixture()
  f.input('[a].')
  f.flush()
  assert.equal(f.search.searchCount.textContent, '1 / 1')
  assert.deepEqual(f.visited[0].matches, [[6, 10]])
})

test('closing a pending search cancels work and releases the search element', () => {
  const f = fixture()
  f.input('alpha')
  f.search.close()
  f.flush()
  assert.equal(f.scans(), 0)
  assert.deepEqual(f.visited, [])
  assert.equal(f.view.canvas.searchEl, undefined)
})

test('empty queries and detached search views cannot scan or navigate', () => {
  const f = fixture()
  f.search.performSearch()
  f.input('alpha')
  f.search.containerEl.isConnected = false
  f.flush()
  assert.equal(f.scans(), 0)
  assert.deepEqual(f.visited, [])
})
