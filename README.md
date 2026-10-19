<h3 align="center">
  Canvas Enhance for <a href="https://obsidian.md">Obsidian.md</a>
</h3>

<p align="center">
    <a href="https://github.com/joeytoday/obsidian-canvas-enhance/stargazers"><img src="https://img.shields.io/github/stars/joeytoday/obsidian-canvas-enhance?colorA=363a4f&colorB=e0ac00&style=for-the-badge" alt="GitHub star count"></a>
    <a href="https://github.com/joeytoday/obsidian-canvas-enhance/issues"><img src="https://img.shields.io/github/issues/joeytoday/obsidian-canvas-enhance?colorA=363a4f&colorB=e93147&style=for-the-badge" alt="Open issues on GitHub"></a>
    <br/>
    <a href="https://raw.githubusercontent.com/joeytoday/obsidian-canvas-enhance/main/LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=AGPL-3.0&colorA=363a4f&colorB=b7bdf8" alt="AGPL-3.0 license"/></a>
    <a href="https://github.com/joeytoday/obsidian-canvas-enhance/releases"><img src="https://img.shields.io/github/v/release/joeytoday/obsidian-canvas-enhance?colorA=363a4f&colorB=8dba37&style=for-the-badge" alt="Latest release version"/></a>
</p>

<a id="english"></a>

<p align="center"><b>Think visually in Obsidian Canvas.</b> Build mind maps, keep notes beside your canvas, and turn ideas into diagrams.</p>

<p align="center">
  <a href="docs/guide.en.md">📖 Usage Guide</a> ·
  <a href="CHANGELOG.en.md">📋 Changelog</a> ·
  <a href="https://github.com/joeytoday/obsidian-canvas-enhance/issues">🐛 Report Issue</a> ·
  <a href="README.zh-CN.md">简体中文</a>
</p>

## Why Canvas Enhance?

Obsidian Canvas is great, but it leaves gaps. Canvas Enhance fills them — without changing the native experience:

- **Can't read nodes when zoomed out?** Overview Mode fills each card with a large title so you can navigate at a glance
- **Build mind maps from your keyboard.** Use Tab for child nodes, Enter for siblings, Space to edit, and Alt+Arrow to navigate
- **Keep your notes in view.** Open file cards in a side pane without leaving the canvas
- **Boring node styles?** Flowchart shapes, border styles, custom CSS attributes — all from the right-click menu
- **Canvas files are isolated?** Metadata cache integrates `.canvas` into the graph view, backlinks, and outgoing links

Enable the features you need in settings. The plugin interface supports **English and 简体中文**, including settings, commands, menus, and export options.

<video src="assets/showcase-canvas-enhence.mp4" poster="https://img.joeytoday.com/2026/20261019200745528.png" controls width="100%">
</video>

[Get started with the English guide](docs/guide.en.md#quick-start).

## Features

### Overview Mode

https://github.com/user-attachments/assets/5a87278b-2d0e-4ab1-8bb0-7b85d7193645

Zoom out and nodes become unreadable. Overview Mode automatically replaces card content with large titles:

- **File nodes** show filename or first heading
- **Text nodes** show the first Markdown heading (`# Title`)
- **Group labels** scale up to stay readable
- Zoom back in past the threshold and everything restores automatically

### Mindmap

https://github.com/user-attachments/assets/9d0a7240-75b7-4c5c-bc42-cfba88a1e9f9

With a single card selected and not being edited, `Tab` creates a child node, `Enter` creates a sibling, `Space` edits the selected node, and `Alt+Arrow` navigates between nodes. The first three shortcuts can be changed in Obsidian under Settings → Hotkeys. Child nodes inherit the parent's color. New nodes are placed following the hierarchy order.

<img width="852" height="480" alt="One-click rearrange" src="https://github.com/user-attachments/assets/c5216e10-c417-430f-ae6c-c2d17e1ccc3e" />

**Rearrange all** keeps ordinary mindmap branches together and places shared cards once, aligning related cards where spacing allows. Visible text cards fit their content; hidden cards, cards with a fixed aspect ratio, and cards in cycles keep their sizes. Repeated rearrangement stays stable when the input is unchanged, and the layout can be undone in one step.

Groups move together with their cards, preserving internal positions, sizes, and collapsed states. Nested or overlapping groups and cards crossing a group border move as one region. Floating connections retain their directed hierarchy while attachment sides adjust automatically. Canvases containing portals are not yet supported; they show a notice and keep their existing layout.

Enable **Card heading** and choose a **Card heading level** to start new text cards with an H1/H2/H3 heading, with the caret right after the prefix.

https://github.com/user-attachments/assets/c78a55e6-309e-4150-92ee-d68c80d1d015

### File Templates and Side-pane Files

Choose a template under **Settings → Canvas Enhance → Basic → File template** to create file nodes with pre-filled content.

Click a file card's title, or right-click it and choose **Open in sidebar**. The file opens in a pane beside the canvas, so you can read or edit the note while keeping the bigger picture visible.

Further files open as tabs in the side pane. Opening the same file again reuses its existing tab. Enable this under **Settings → Canvas Enhance → Basic → Open file cards in split**.

https://github.com/user-attachments/assets/1c76f084-aa48-4336-b689-d1c193a4204f

[See the template and side-pane walkthrough](docs/guide.en.md#file-templates-and-side-pane-files).

### Node & Edge Styles

<img src="assets/docs/sample-flowchart.png" alt="Flowchart Shapes" width="420">

Flowchart shapes (terminal, process, decision, database…), border styles, text alignment, 8 arrow types, path styles (solid/dotted/dashed), and automatic obstacle-avoiding edges — all from the right-click menu.

### More Features

| Feature | Description |
|---------|-------------|
| Metadata Cache | `.canvas` files join the graph view, backlinks, and outgoing links |
| Frontmatter | Custom properties for canvas files (tags, aliases, CSS classes) |
| Single-node Links | Link or embed individual nodes via `[[canvas#node-id]]` |
| File Templates | Create file nodes pre-filled with a chosen Obsidian template |
| In-canvas Search | `Cmd/Ctrl+F` to search text inside a canvas |
| Collapsible Groups | Collapse/expand group nodes |
| Focus Mode | Blur unselected nodes to highlight the current one |
| Portals | Embed another canvas view inside a canvas |
| Image Export | Export to PNG/SVG on desktop, with a transparent-background option for PNG |
| Layer Order | Adjust node stacking order from the right-click menu |
| Floating Edges | Edges auto-adjust connection side; support unattached edges |
| Auto-resize Nodes | Node height adapts to content, with configurable max height and vertical padding |
| 20+ Commands | Create, navigate, clone, expand, flip, swap, and more |

### Custom CSS Styles

Define custom style attributes for nodes and edges via CSS snippets with YAML comments:

```css
/* @canvas-enhance-node-style
key: validation-state
label: Validation State
options:
  - label: None
    value: null
    icon: circle-help
  - label: Approved
    value: approved
    icon: circle-check
*/
```

See [example CSS file](assets/docs/example-custom-node-style.css).

## Installation

Requires **Obsidian 1.13.0 or later**.

### Community Plugin

Search **Canvas Enhance** in Obsidian → Settings → Community Plugins → Browse.

### Manual

1. Create a `canvas-enhance` folder inside your vault's `.obsidian/plugins/`
2. Download `main.js`, `styles.css`, and `manifest.json` from [Releases](https://github.com/joeytoday/obsidian-canvas-enhance/releases/latest) and place all three files in that folder
3. Enable the plugin in Settings → Community Plugins

## Settings

For an English interface, go to **Settings → Canvas Enhance → Basic → General → Interface language → English**. The language changes immediately, without restarting Obsidian. **Auto (follow Obsidian)** selects Chinese for a Chinese Obsidian interface and English otherwise.

Four tabs:

- **Basic** — Interface language, general defaults, side-pane file opening, file templates, Overview Mode, commands, search, image export
- **Mindmap** — Node spacing, hotkeys, color propagation
- **Nodes & Edges** — Node/edge styles, custom styles, floating/flip edge, edge highlight/selection, auto-resize, aspect ratio, layer order, collapsible groups
- **Advanced** — Metadata, portals, focus mode, encapsulation, render breakpoints, readonly, text rendering

## Support This Project

If Canvas Enhance helps you, consider giving it a ⭐ Star. It's the biggest encouragement and helps others discover the plugin.

[![Star](https://img.shields.io/github/stars/joeytoday/obsidian-canvas-enhance?style=social)](https://github.com/joeytoday/obsidian-canvas-enhance)

## License

[AGPL-3.0](LICENSE)

## Credits

Based on [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) by [Developer-Mike](https://github.com/Developer-Mike). Canvas Enhance continues development with a rename, refactoring, and new features.

Thanks to [Miroff (@m1roff)](https://github.com/m1roff) for adding English translations and interface language switching in [PR #6](https://github.com/joeytoday/obsidian-canvas-enhance/pull/6), making Canvas Enhance more accessible to English-speaking users.
