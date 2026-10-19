# Changelog

[English](CHANGELOG.en.md) · [简体中文](CHANGELOG.md)

## 1.0.10

- Interface language changes take effect immediately without restarting Obsidian. Guide and Changelog links open in the active interface language.
- Made English the default README with a separate Chinese version; expanded both guides with featured workflows first and added an English changelog.

## 1.0.9

- Fixed canvas searches continuing after the query was cleared or the search was closed, potentially causing slowdowns.
- Fixed unresolved file links creating automatic connections to text cards or groups.
- Improved handling of custom styles, canvas properties, and malformed data, along with plugin disable and reload stability.

## 1.0.8

- Fixed Space not entering edit mode for text cards and Markdown file cards.
- Entering edit mode with the edit button or Space now places the caret at the end. Double-click positioning stays native, and switching tabs no longer pulls focus back.
- Limited Tab, Enter, and Space actions to selected, non-editing canvas cards. Normal typing works in Markdown notes, card editors, and input fields.

## 1.0.7

- Added Chinese / English interface selection, including an option to follow Obsidian's language. Thanks to [Miroff (@m1roff)](https://github.com/m1roff) for [PR #6](https://github.com/joeytoday/obsidian-canvas-enhance/pull/6).
- Added **Edit selected node**. The shortcuts for creating child nodes, creating siblings, and editing nodes are customizable; their defaults are Tab, Enter, and Space.

## 1.0.6

- Improved compatibility of template and folder selectors in settings.
- Improved custom node and edge style loading and consistency across windows.

## 1.0.5

- Fixed misplaced or repeatedly moved cards when multiple parents connect to the same card during rearrangement.
- Fixed grouped cards becoming separated after rearrangement, preserving their internal layout, sizes, and collapsed state.
- Improved rearrangement of cycles and nested or overlapping groups, with single-step undo and redo.
- Protected edits made during rearrangement. Canvases containing portals show a notice and keep their existing layout.

## 1.0.4

**Mind maps**

- Fixed newly created child or sibling nodes covering existing nodes. Placement follows the hierarchy.
- Added a bottom-toolbar rearrange action to lay out the whole canvas. Text-card height adapts to content and respects the configured maximum auto-resize height.
- Cards shared by multiple parents are placed after the last parent's branch and centered relative to connected cards where spacing permits.

<img width="852" height="480" alt="Rearranged canvas nodes" src="https://github.com/user-attachments/assets/c5216e10-c417-430f-ae6c-c2d17e1ccc3e" />

**Card headings**

- Added **Card heading** and **Card heading level** settings. New text cards start with an H1, H2, or H3 heading, with the caret after the prefix.

https://github.com/user-attachments/assets/c78a55e6-309e-4150-92ee-d68c80d1d015

**Auto-resize**

- Added vertical padding to leave space around card content.

## 1.0.3

**Collapsible mind-map branches**

- Added a plus/minus control to parent cards to collapse or expand all descendants.
- Collapsed state is saved and restored when reopening a canvas.
- Copying a collapsed node also copies its hidden subtree.

## 1.0.2

**Canvas search**

- Fixed navigation to search results. Matching cards are selected and brought into view.
- Added **Search in canvas**, with Mod+F as the default shortcut. Editor search remains native.

## 1.0.1

**Fixes**

- Fixed context-menu or settings crashes caused by invalid YAML in custom style configurations.
- Fixed searches potentially crashing before canvas content finished loading.
- Fixed canvas loading errors when the frontmatter `cssclasses` value was a string.
- Fixed a gradual memory leak during long sessions.

**Cleanup**

- Removed the nonfunctional export privacy-mode option, unused settings, and dead code.

## 1.0.0

**Open file cards in a side pane**

- Click a file card's title or choose **Open in sidebar** to open it beside the canvas.
- Further files open as tabs in the side pane. Files already open there reuse their existing tabs.
- Added **Open file cards in split**, enabled by default.

**Performance**

- Reduced lag while typing, dragging, and selecting on large canvases.
- Fixed a gradual memory leak during long sessions.
- Reduced the cost of recalculating obstacle-avoiding routes.

**Fixes**

- Fixed portal content not refreshing when its source file changed.

**Other**

- Changed the license to AGPL-3.0.

## 0.8.7

- Removed lint-rule suppression comments to address community-plugin source checks.

## 0.8.6

**Obsidian 1.13 compatibility**

- Restored node text colors after upgrading to Obsidian 1.13.
- Fixed node shapes, edge-arrow colors, and embedded-card styles on 1.13.
- Fixed overview-mode title colors on 1.13.

## 0.8.5

- Fixed Enter creating mind-map nodes instead of inserting line breaks while editing on mobile.

## 0.8.4

**Image export**

- Added a node-display option: overview mode shows titles, while detailed mode shows full card content.
- Fixed crashes when exporting file cards containing images.

## 0.8.3

- Updated overview-mode styling to address community-plugin lint checks.

## 0.8.2

**Mobile compatibility**

- Fixed iOS crashes when opening canvases or editing nodes.
- Fixed settings-page external links not opening on mobile.
- Restricted image export to desktop, where it is supported.

## 0.8.1

**File templates**

- Integrated with Obsidian's core Templates plugin to create note cards from templates.
- Added a configurable folder for new files, defaulting to the current canvas folder.
- Double-clicking the canvas creates and edits a template note when the double-click node type is set to File.
- Added support for `{{title}}`, `{{date}}`, and `{{time}}`.

**Overview mode**

- Titles follow node colors.
- Enabled overview mode by default.

**Performance**

- Improved opening canvases with many cards.

**Mind maps**

- Enter and Tab work as normal editor input while editing text instead of creating nodes.
- Shortcuts no longer create nodes on read-only canvases.

**Settings and localization**

- Reorganized settings into four tabs: Basic, Mindmap, Nodes & edges, and Advanced.
- Localized settings and terminology into Chinese.
- Localized commands, context menus, export dialogs, and other interface text into Chinese.
- Added missing image-export and read-only options for zooming, panning, and popup menus.

**Other**

- Removed presentation mode.
- Renamed and rewrote the usage guide as `guide.md`.

## 0.7.4

- Overview titles refit after resizing cards.
- Title extraction skips YAML frontmatter instead of showing `---`.
- Improved canvas panning performance in overview mode.

## 0.7.3

- Updated the plugin to address Obsidian community-plugin review requirements.

## 0.7.2

- Updated the plugin to address Obsidian community-plugin review requirements.
- Added overview-mode and mind-map demonstrations to the README.

## 0.7.1

- Added overview mode: cards show large titles when zoomed out and restore their content when zoomed in.
- Supported file-card titles from file names or first-line headings, and text-card titles from their first headings.
- Group labels counter-scale to stay readable.
- Added settings for the zoom threshold, title source, and label scaling.
- Added a maximum title font size to prevent short titles from becoming too large.
- Added Guide, Changelog, and Star links at the top of settings.
- Fixed overview mode only working in one canvas when several were open.
- Fixed overview state not being cleaned up when a canvas closed.

## 0.6.0

- Renamed Advanced Canvas to Canvas Enhance and began independent maintenance.
- Removed redundant code and fixed known bugs.
- Localized notification text.
