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

<p align="center"><b>⚡ 全面增强</b>你的 Obsidian Canvas 体验。流程图、脑图，一个插件搞定。</p>

<p align="center">
  <a href="https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/docs/guide.md">📖 使用指南</a> ·
  <a href="https://github.com/joeytoday/obsidian-canvas-enhance/blob/main/CHANGELOG.md">📋 更新日志</a> ·
  <a href="https://github.com/joeytoday/obsidian-canvas-enhance/issues">🐛 反馈问题</a> ·
  <a href="README.md#english">English</a>
</p>

## 为什么选择 Canvas Enhance？

Obsidian Canvas 原生功能够用，但不够好用。Canvas Enhance 在不改变原生体验的前提下，补上了这些缺口：

- **缩小画布就看不清节点？** 概览模式自动用大号标题填满卡片，全局视角也能快速定位
- **想用 Canvas 做脑图？** Tab 创建下级节点、Enter 创建同级节点、Space 编辑、Alt+方向键导航
- **想边看画布边编辑笔记？** 点击文件卡片标题或选择「在侧边栏打开」，在旁边的窗格阅读、编辑文件
- **节点样式太单调？** 流程图形状、边框样式、自定义 CSS 属性，右键菜单直接设置
- **Canvas 文件是信息孤岛？** 元数据缓存让 `.canvas` 接入关系图谱、反向链接、出链系统

按需开启设置中的功能。插件界面支持 **中文 / English**，涵盖设置、命令、菜单和导出选项。

https://github.com/user-attachments/assets/86da3869-f637-467e-a2dd-4042e3c7c74b

## 功能

### 概览模式

https://github.com/user-attachments/assets/5a87278b-2d0e-4ab1-8bb0-7b85d7193645

缩小画布后节点内容变得难以阅读。概览模式自动用大号标题填满每张卡片：

- **文件节点**显示文件名或第一行标题
- **文本节点**显示第一个 Markdown 标题（`# 标题`）
- **分组标签**自动放大，保持可读
- 放大画布超过阈值后，自动恢复原始内容

### 思维导图

https://github.com/user-attachments/assets/9d0a7240-75b7-4c5c-bc42-cfba88a1e9f9

选中一张卡片且未进入编辑时：`Tab` 创建下级节点，`Enter` 创建同级节点，`Space` 编辑选中节点，`Alt+方向键` 在节点间导航。前三项均可在 Obsidian「设置 → 快捷键」中修改。下级节点自动继承上级节点颜色；新建节点按层级顺序落位。

<img width="852" height="480" alt="整体重排" src="https://github.com/user-attachments/assets/c5216e10-c417-430f-ae6c-c2d17e1ccc3e" />

底部工具栏「整体重排」整理整个画布，普通思维导图保持分支连续，多条分支汇入的共享卡片只排布一次，并在避免重叠的前提下尽量对齐关联卡片。可见文本卡片高度自适应内容；折叠隐藏、固定宽高比及环形结构中的卡片保留尺寸。输入不变时重复重排不再漂移，重排支持一次撤销。

分组框与内部卡片整体移动，保留组内排版、尺寸和折叠状态；嵌套、重叠分组以及压在组边界上的卡片一起平移。浮动连线按起点、终点识别层级，连接边仍自动选择。含传送门的画布暂不支持整体重排，会提示并保留原布局。

卡片标题：新增「卡片标题」「卡片标题级别」设置，新建文本卡片时第一行自动填一级/二级/三级标题，光标停在标题后。

https://github.com/user-attachments/assets/c78a55e6-309e-4150-92ee-d68c80d1d015

### 文件节点模板 + 文件侧边栏打开

支持在设置中配置，使用特定模板创建文件节点。

https://github.com/user-attachments/assets/1c76f084-aa48-4336-b689-d1c193a4204f

### 节点与边样式

<img src="assets/docs/sample-flowchart.png" alt="流程图形状" width="420">

流程图形状（终端、流程、判断、数据库等）、边框样式、文本对齐、8 种箭头、路径样式（实线/点线/虚线）、自动避障连线——全部通过右键菜单设置。

### 更多功能

| 功能 | 说明 |
|------|------|
| 元数据缓存 | `.canvas` 文件接入关系图谱、反向链接、出链 |
| Frontmatter | 为 Canvas 文件添加自定义属性（标签、别名、CSS 类） |
| 单节点链接 | 通过 `[[canvas#node-id]]` 链接或嵌入单个节点 |
| 文件模板 | 新建文件节点时用指定的 Obsidian 模板填充内容 |
| 画布内搜索 | `Cmd/Ctrl+F` 搜索画布中的文本 |
| 可折叠组 | 组节点可折叠/展开 |
| 聚焦模式 | 模糊未选中节点，突出当前节点 |
| 传送门 | 在画布中嵌入另一个画布的视图 |
| 图片导出 | 桌面端导出为 PNG/SVG，PNG 支持透明背景 |
| 图层顺序 | 右键菜单调整节点前后叠放顺序 |
| 浮动边 | 边自动调整连接侧，支持不连接到节点的浮动边 |
| 自动调整节点大小 | 节点高度自适应内容，可配置最大高度与垂直边距 |
| 20+ 命令 | 创建、导航、克隆、展开、翻转、交换等 |

### 自定义 CSS 样式

通过 CSS snippet 为节点和边添加自定义样式属性，在 CSS 文件中用 YAML 注释定义：

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

详见[示例 CSS 文件](assets/docs/example-custom-node-style.css)。

## 社区插件市场

需要 **Obsidian 1.13.0 或更高版本**。

在 Obsidian 设置 → 第三方插件 → 浏览中搜索 **Canvas Enhance**。

## 设置

在「设置 → Canvas Enhance → 基础设置 → 通用 → 界面语言」中选择中文或 English，立即生效，无需重启 Obsidian。「自动（跟随 Obsidian）」在中文环境使用中文，其他环境使用英语。

四个标签页：

- **基础设置** — 通用、文件模板、概览模式、命令、搜索、图片导出
- **思维导图** — 节点间距、快捷键、颜色传播
- **节点与边** — 节点/边样式、自定义样式、浮动/翻转边、边高亮/选择、自动调整、宽高比、图层顺序、可折叠分组
- **进阶功能** — 元数据、传送门、专注模式、封装选区、节点渲染断点、增强只读、替代文本渲染

## 支持这个项目

如果 Canvas Enhance 帮到了你，请考虑给一个 ⭐ Star。这是对我最大的鼓励，也让更多人发现这个插件。

[![Star](https://img.shields.io/github/stars/joeytoday/obsidian-canvas-enhance?style=social)](https://github.com/joeytoday/obsidian-canvas-enhance)

## ☕️ 支持作者

如果插件帮助到您，欢迎请作者喝杯咖啡～

<img width="200" align="center" alt="wechat-qrcode B_u09Tgq_Z2qC86T" src="https://github.com/user-attachments/assets/c849f9cf-8ed2-443f-9f27-01cd9fc65f13" />

## 许可证

[AGPL-3.0](LICENSE)

## 致谢

基于 [Developer-Mike](https://github.com/Developer-Mike) 的 [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) 项目，重命名并独立维护。

感谢 [Miroff（@m1roff）](https://github.com/m1roff) 在 [PR #6](https://github.com/joeytoday/obsidian-canvas-enhance/pull/6) 中贡献英文翻译和界面语言切换，让更多英语用户能够使用 Canvas Enhance。
