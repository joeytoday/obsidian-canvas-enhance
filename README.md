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

<p align="center"><b>⚡ 全面增强</b>你的 Obsidian Canvas 体验。演示文稿、流程图、脑图，一个插件搞定。</p>

## 功能概览

所有功能均可在设置中独立开关。

### 核心增强

| 功能 | 说明 |
|------|------|
| 元数据缓存 | `.canvas` 文件接入 Obsidian 元数据系统，支持关系图谱、反向链接、出链 |
| Frontmatter | 为 Canvas 文件添加自定义属性（标签、别名、CSS 类等） |
| 单节点链接/嵌入 | 通过 `[[canvas#node-id]]` 链接或嵌入 Canvas 中的单个节点 |
| 自动文件节点边 | 根据 frontmatter 自动创建文件节点之间的边 |
| 画布内搜索 | `Ctrl+F` 在 Canvas 中搜索文本，体验接近原生 |
| 更好的默认设置 | 自定义节点尺寸、网格对齐、双击行为等 |
| 只读模式增强 | 精细控制只读模式下的交互行为 |
| 图片导出 | 导出为 PNG/SVG，支持透明度等选项 |

### 节点

| 功能 | 说明 |
|------|------|
| 节点样式 | 流程图形状（终端、流程、判断、数据库等）、边框样式、文本对齐 |
| 节点模板 | 保存节点样式为模板，快速复用 |
| 自动调整大小 | 节点根据内容自动调整尺寸 |
| 变量断点 | 按缩放级别控制节点内容的渲染 |
| Z 轴排序 | 通过右键菜单调整节点层叠顺序 |
| 自定义颜色 | 通过 CSS 变量扩展颜色选择器 |

### 边

| 功能 | 说明 |
|------|------|
| 边样式 | 路径样式（虚线/点线）、箭头样式（8 种）、寻路方式（直线/直角/A*） |
| 浮动边 | 边自动调整连接侧，支持不连接到节点的浮动边 |
| 翻转边 | 一键反转边的方向 |
| 边高亮 | 选中节点时高亮关联的边 |
| 边选择 | 按方向（连接/入/出）选择边 |

### 交互与工作流

| 功能 | 说明 |
|------|------|
| Mindmap 模式 | Tab 创建子节点、Enter 创建兄弟节点、方向键导航、颜色传播 |
| 演示模式 | 幻灯片式导航，支持全屏、过渡动画 |
| 传送门 | 在 Canvas 中嵌入另一个 Canvas 的视图 |
| 可折叠组 | 组节点可折叠/展开 |
| 聚焦模式 | 模糊未选中节点，突出当前节点 |
| 封装选区 | 将选中节点移动到新 Canvas 并链接回来 |
| 画布命令 | 20+ 命令：创建节点、导航、克隆、展开、翻转、交换等 |

### 自定义样式

通过 CSS snippet 为节点和边添加自定义样式属性。在 CSS 文件中用 YAML 注释定义样式选项，即可在弹出菜单中使用。

```css
/* @canvas-enhance-node-style
key: validation-state
label: 验证状态
options:
  - label: 无状态
    value: null
    icon: circle-help
  - label: 已通过
    value: approved
    icon: circle-check
*/
```

详见 [示例 CSS 文件](assets/docs/example-custom-node-style.css)。

## 安装

### 社区插件市场

在 Obsidian 设置 → 第三方插件 → 浏览中搜索 **Canvas Enhance**。

### 手动安装

1. 在 vault 的 `.obsidian/plugins/` 下创建 `canvas-enhance` 文件夹
2. 从 [Releases](https://github.com/joeytoday/obsidian-canvas-enhance/releases) 下载 `main.js`、`styles.css`、`manifest.json` 放入该文件夹
3. 在设置 → 第三方插件中启用

## 设置

设置页面分为三个标签页：

- **基础设置** — 日常使用的核心功能：节点尺寸、命令、边高亮、自动调整、可折叠组、只读模式等
- **Mindmap** — 脑图模式的全部配置：节点间距、快捷键、颜色传播
- **进阶设置** — 元数据兼容、节点/边样式系统、演示模式、传送门、聚焦模式等

## 许可证

[GPL-3.0](LICENSE)

## 致谢

本插件基于 [Developer-Mike](https://github.com/Developer-Mike) 的 [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) 项目。感谢原作者的出色工作，Canvas Enhance 在此基础上进行了重命名、重构和功能优化。
