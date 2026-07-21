<h3 align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/joeytoday/obsidian-canvas-enhance/main/assets/docs/logo-dark.png">
        <img alt="Logo" src="https://raw.githubusercontent.com/joeytoday/obsidian-canvas-enhance/main/assets/docs/logo-light.png" width="100">
    </picture><br/><br/>
  Canvas Enhance for <a href="https://obsidian.md">Obsidian.md</a>
</h3>

<p align="center">
    <a href="https://github.com/joeytoday/obsidian-canvas-enhance/stargazers"><img src="https://img.shields.io/github/stars/joeytoday/obsidian-canvas-enhance?colorA=363a4f&colorB=e0ac00&style=for-the-badge" alt="GitHub star count"></a>
    <a href="https://github.com/joeytoday/obsidian-canvas-enhance/issues"><img src="https://img.shields.io/github/issues/joeytoday/obsidian-canvas-enhance?colorA=363a4f&colorB=e93147&style=for-the-badge" alt="Open issues on GitHub"></a>
    <br/>
    <a href="https://raw.githubusercontent.com/joeytoday/obsidian-canvas-enhance/main/LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=GPL-3.0&colorA=363a4f&colorB=b7bdf8" alt="GPL-3.0 license"/></a>
</p>

<p align="center"><b>⚡ Supercharge</b> your Obsidian Canvas. Presentations, flowcharts, mindmaps — one plugin does it all.</p>

<p align="center">
  <a href="https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/docs/usage-guide.md">📖 Usage Guide</a> ·
  <a href="https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/CHANGELOG.md">📋 Changelog</a> ·
  <a href="https://github.com/joeytoday/obsidian-canvas-enhance/issues">🐛 Report Issue</a> ·
  <a href="#中文文档">🇨🇳 中文文档</a>
</p>

## Why Canvas Enhance?

Obsidian Canvas is great, but it leaves gaps. Canvas Enhance fills them — without changing the native experience:

- **Can't read nodes when zoomed out?** Overview Mode fills each card with a large title so you can navigate at a glance
- **Want a mindmap?** Tab for child nodes, Enter for siblings, arrow keys to navigate — a full mindmap workflow
- **Need presentations?** Slide-style navigation with fullscreen and transitions, without leaving Obsidian
- **Boring node styles?** Flowchart shapes, border styles, custom CSS attributes — all from the right-click menu
- **Canvas files are isolated?** Metadata cache integrates `.canvas` into the graph view, backlinks, and outgoing links

Every feature can be toggled independently. Unused features have zero overhead.

## Features

### Overview Mode

<!-- TODO: Add overview-mode.gif -->
<!-- Recording: zoom out a canvas with file/text nodes until titles fill cards, then zoom back in -->

Zoom out and nodes become unreadable. Overview Mode automatically replaces card content with large titles:

- **File nodes** show filename or first heading
- **Text nodes** show the first Markdown heading (`# Title`)
- **Group labels** scale up to stay readable
- Zoom back in past the threshold and everything restores automatically

### Mindmap

<!-- TODO: Add mindmap.gif -->
<!-- Recording: Tab to create child, Enter for sibling, Alt+arrows to navigate, show color inheritance -->

Turn your canvas into a mindmap: `Tab` creates a child node, `Enter` creates a sibling, `Alt+Arrow` navigates between nodes. Child nodes inherit the parent's color.

### Presentations

![Presentation Mode](assets/docs/sample-presentation-simple.gif)

Navigate your canvas like a slideshow. Set a start node, run the command, and present with transitions and fullscreen support.

### Node & Edge Styles

![Flowchart Shapes](assets/docs/sample-flowchart.png)

Flowchart shapes (terminal, process, decision, database…), border styles, text alignment, 8 arrow types, path styles (dashed/dotted), and A* pathfinding — all from the right-click menu.

### More Features

| Feature | Description |
|---------|-------------|
| Metadata Cache | `.canvas` files join the graph view, backlinks, and outgoing links |
| Frontmatter | Custom properties for canvas files (tags, aliases, CSS classes) |
| Single-node Links | Link or embed individual nodes via `[[canvas#node-id]]` |
| In-canvas Search | `Ctrl+F` to search text inside a canvas |
| Collapsible Groups | Collapse/expand group nodes |
| Focus Mode | Blur unselected nodes to highlight the current one |
| Portals | Embed another canvas view inside a canvas |
| Image Export | Export to PNG/SVG with transparency options |
| Z-ordering | Adjust node stacking order from the right-click menu |
| Floating Edges | Edges auto-adjust connection side; support unattached edges |
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

### Community Plugin

Search **Canvas Enhance** in Obsidian → Settings → Community Plugins → Browse.

### Manual

1. Create a `canvas-enhance` folder inside your vault's `.obsidian/plugins/`
2. Download `main.js`, `styles.css`, `manifest.json` from [Releases](https://github.com/joeytoday/obsidian-canvas-enhance/releases)
3. Enable the plugin in Settings → Community Plugins

## Settings

Three tabs:

- **Basic** — Overview Mode, node dimensions, commands, edge highlight, auto-resize, collapsible groups, search
- **Mindmap** — Node spacing, hotkeys, color propagation
- **Advanced** — Metadata, node/edge style system, presentations, portals, focus mode

## Support This Project

If Canvas Enhance helps you, consider giving it a ⭐ Star. It's the biggest encouragement and helps others discover the plugin.

[![Star](https://img.shields.io/github/stars/joeytoday/obsidian-canvas-enhance?style=social)](https://github.com/joeytoday/obsidian-canvas-enhance)

## License

[GPL-3.0](LICENSE)

## Credits

Based on [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) by [Developer-Mike](https://github.com/Developer-Mike). Canvas Enhance continues development with a rename, refactoring, and new features.

---

## 中文文档

<p align="center"><b>⚡ 全面增强</b>你的 Obsidian Canvas 体验。演示文稿、流程图、脑图，一个插件搞定。</p>

### 为什么选择 Canvas Enhance？

- **缩小画布就看不清节点？** 概览模式自动用大号标题填满卡片，全局视角也能快速定位
- **想用 Canvas 做脑图？** Tab 创建下级节点、Enter 创建同级节点、方向键导航，完整的思维导图工作流
- **想做演示文稿？** 幻灯片式导航，支持全屏和过渡动画，不用离开 Obsidian
- **节点样式太单调？** 流程图形状、边框样式、自定义 CSS 属性，右键菜单直接设置
- **Canvas 文件是信息孤岛？** 元数据缓存让 `.canvas` 接入关系图谱、反向链接、出链系统

所有功能均可在设置中独立开关，不用的功能零开销。

### 功能概览

| 分类 | 功能 |
|------|------|
| 核心增强 | 元数据缓存、Frontmatter、单节点链接/嵌入、画布内搜索、图片导出、只读模式增强 |
| 节点 | 流程图形状、节点模板、自动调整大小、变量断点、Z 轴排序、自定义颜色 |
| 边 | 路径/箭头样式、浮动边、翻转边、边高亮、边选择 |
| 交互与工作流 | 概览模式、Mindmap、演示模式、传送门、可折叠组、聚焦模式、封装选区、20+ 命令 |

### 安装

社区插件市场搜索 **Canvas Enhance**，或从 [Releases](https://github.com/joeytoday/obsidian-canvas-enhance/releases) 手动下载安装。

### 设置

- **基础设置** — 概览模式、节点尺寸、命令、边高亮、自动调整、可折叠组等
- **Mindmap** — 节点间距、快捷键、颜色传播
- **进阶设置** — 元数据兼容、节点/边样式系统、演示模式、传送门、聚焦模式等

### 支持

觉得好用？给个 ⭐ Star 吧。

### 许可证

[GPL-3.0](LICENSE)

### 致谢

基于 [Developer-Mike](https://github.com/Developer-Mike) 的 [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) 项目，重命名并独立维护。
