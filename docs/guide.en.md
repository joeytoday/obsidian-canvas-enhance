# Canvas Enhance Guide

[English](guide.en.md) · [简体中文](guide.md) · [Back to README](../README.md)

Build mind maps from your keyboard, read notes beside your canvas, and turn connected ideas into diagrams. This guide covers every feature introduced in both READMEs and follows the current repository version. Features marked unreleased in the [changelog](../CHANGELOG.en.md) are not yet included in published releases. Requires Obsidian 1.13.0 or later.

Featured workflows: [Overview mode](#overview-mode) · [Mind maps](#build-a-mind-map) · [Card headings](#card-headings) · [Templates and side-pane files](#file-templates-and-side-pane-files) · [Auto-layout and folding](#rearrange-your-canvas-and-fold-child-nodes) · [Node and edge styles](#node-and-edge-styles) · [Custom CSS](#custom-css-styles) · [Knowledge network](#connect-your-canvas-to-your-notes)

More: [Other features](#other-features) · [Commands](#extended-commands) · [Settings reference](#settings-reference) · [Troubleshooting](#troubleshooting)

The videos and screenshots below illustrate the workflows. Existing media may show an older or non-English interface and has not been verified to cover every current operation.

## Quick Start

1. Open Obsidian **Settings → Community plugins → Browse**, search for Canvas Enhance, then install and enable it. For manual installation, see the [README](../README.md#installation).
2. Open **Settings → Canvas Enhance → Basic → General → Interface language** and choose English. Changes take effect immediately. **Auto (follow Obsidian)** uses Chinese for a Chinese Obsidian interface and English otherwise.
3. Create a canvas for a project and add a text card for its main topic. Finish editing and select the card.
4. Press `Tab` to add a child node. Enter its text, finish editing, then press `Enter` to add a sibling.
5. Drag an existing note onto the canvas and click its file-card title to read it in the side pane. Both the canvas and the note remain visible.

All plugin settings paths below start at **Settings → Canvas Enhance**. The four tabs are **Basic**, **Mindmap**, **Nodes & edges**, and **Advanced**. Only settings marked as requiring a reload need one; interface language changes do not require a restart.

## Featured Workflows

### Overview Mode

Zoom out to identify cards by large titles; zoom back in to restore their contents.

1. Enable **Basic → Overview mode**.
2. Zoom below the threshold. File cards show their file name or first-line heading. Text cards show their first Markdown heading, or their first line when no heading is present.
3. Zoom above the threshold to restore normal cards. Titles follow node colors, and group labels stay readable.

| Setting | Purpose | Default |
|---|---|---|
| Zoom threshold | Enter overview mode below this zoom level | `0.4` (40%) |
| File node title source | Choose the file name or first-line heading | File name |
| Counter-scale group labels | Enlarge group labels when zoomed out | On |
| Maximum title font size | Limit title size on large cards | `64` |

Existing reference: title changes while zooming out and in.

https://github.com/user-attachments/assets/5a87278b-2d0e-4ab1-8bb0-7b85d7193645

### Build a Mind Map

On a writable canvas, select one card with no card editor or input focused:

| Default shortcut | Action |
|---|---|
| `Tab` | Create a child node |
| `Enter` | Create a sibling node |
| `Space` | Edit the selected text or Markdown file card |
| `Alt+Arrow` | Navigate between nodes |

Child nodes inherit their parent's color, and new nodes follow the hierarchy. Under **Mindmap**, adjust parent-child spacing, sibling spacing, navigation shortcuts, and color propagation.

Change the first three shortcuts under Obsidian **Settings → Hotkeys**. Search for Canvas Enhance and **Create child node**, **Create sibling node**, or **Edit selected node**. Inside card editors and regular Markdown editors, these actions do not replace normal typing, spaces, or line breaks.

To create nodes while editing a card, bind the child and sibling commands to `Shift+Tab` and `Shift+Enter` (combinations with `Ctrl` / `Cmd` also work). These shortcuts work inside the selected text or Markdown file card editor, preserving its content and moving editing to the new node. Bare `Tab`, `Enter`, and `Space` keep their normal input behavior, and regular Markdown pages are unaffected. Creating a sibling requires an existing parent node.

Use the plus/minus control on a parent node to collapse or expand its descendants. Collapsed state is saved with the canvas. This is separate from **Collapsible groups**, described below.

**Arrow-based hierarchy:** On a single-headed edge, the arrow points to the child and the other end is the parent. Reversing the arrow reverses the relationship. Card positions, connection faces, and floating attachment points do not determine parentage. Edges with no arrows or arrows at both ends are ordinary connections. For a single-headed cross-reference, right-click and check **Ordinary connection** to exclude it; uncheck it to restore automatic recognition. This rule also applies to older diagrams whose arrowless edges were previously treated as parent-child links.

A canvas can contain branches growing left, right, up, and down without a canvas-wide direction setting. New children continue the current branch, and new siblings follow the selected node's branch. An isolated node with no reference connection starts to the right. Each direction containing child branches has its own collapse control, which folds or expands only that direction, and rearrangement preserves branch directions, card text orientation, and group interiors. Arrow navigation still follows screen directions. Shared descendants hide only when all their parent branches are collapsed, and nodes within a cycle never hide one another.

Existing reference: creating nodes from the keyboard.

https://github.com/user-attachments/assets/9d0a7240-75b7-4c5c-bc42-cfba88a1e9f9

### Card Headings

Enable **Basic → General → Card heading**, then choose H1, H2, or H3 under **Card heading level**. New text cards start with `#`, `##`, or `###`, with the caret after the prefix, ready for a title.

Existing reference: heading prefixes in new cards.

https://github.com/user-attachments/assets/c78a55e6-309e-4150-92ee-d68c80d1d015

<a id="file-templates"></a>
<a id="open-files-beside-your-canvas"></a>

### File Templates and Side-pane Files

**File templates**

Create note cards from a chosen template and save them to a chosen folder.

1. Enable Obsidian's core **Templates** plugin and configure its template folder.
2. Enable **Basic → File template**.
3. Set **Select template** and **Folder for new files**. Leave the folder empty to use the current canvas's folder.
4. Run **Canvas Enhance: Create template note node**. Alternatively, set **General → Node type created on double-click** to **File**, then double-click an empty area of the canvas.

**Open files in a side pane**

1. Under **Basic**, enable **Open file cards in split**. It is on by default.
2. Click a file card's title, or right-click it and choose **Open in sidebar**.
3. Read or edit the file in the pane beside the canvas. The canvas stays visible.

Further files open as tabs in the same side pane. Files already open there reuse their existing tabs. To edit a Markdown file card directly on the canvas instead, select it and press `Space`.

https://github.com/user-attachments/assets/1c76f084-aa48-4336-b689-d1c193a4204f

<a id="rearrange-your-canvas"></a>

### Rearrange Your Canvas and Fold Child Nodes

Finish editing or dragging, then click **Rearrange all** in the bottom canvas toolbar to organize the whole canvas.

- Tree branches align in their own directions with consistent spacing. Shared cards are placed once, even when several branches converge.
- Cards connected only by ordinary links keep their positions and sizes; rearrangement avoids these cards.
- Visible text cards in the mind map fit their content. Hidden cards, fixed-aspect-ratio cards, and cards in cycles keep their sizes.
- Groups move with their cards, preserving internal positions, sizes, and collapsed state. Nested or overlapping groups and cards crossing a group border move together.
- Single-headed arrows define the hierarchy, including floating connections whose attachment sides adjust automatically.
- Repeating rearrangement with unchanged input keeps the layout stable. One undo restores the previous layout.

Canvases containing portals are not supported by rearrangement yet. The plugin shows a notice and leaves the layout unchanged.

<img width="852" height="480" alt="Mind map after rearrangement" src="https://github.com/user-attachments/assets/c5216e10-c417-430f-ae6c-c2d17e1ccc3e" />

### Node and Edge Styles

Enable **Node styles** and **Edge styles** under **Nodes & edges**, then select a card or edge and open **Style** in its floating toolbar.

| Object | Options |
|---|---|
| Node shape | Flowchart shapes such as terminal, process, decision, predefined process, document, and database |
| Node border | Solid, dashed, dotted, or hidden |
| Gradient | None, or toward the upper right, lower right, lower left, or upper left |
| Card type | Standard, a single border, top and bottom borders, left and right borders, or borderless (rectangle / pill) |
| Shadow | None, or toward the lower right, lower left, upper left, or upper right |
| Text alignment | Left, center, or right |
| Line | Solid, dotted, short-dashed, or long-dashed |
| Arrow | 8 styles, including triangle, diamond, circle, and outline variants |
| Routing | Curved, straight, square, or obstacle-avoiding |

Obstacle-avoiding routing takes connections around intervening nodes, which helps with complex flowcharts. Settings also include default colors, default styles, edge direction, and rounded paths.

Select a card and open **Style → Gradient / Card type / Shadow** in its floating toolbar; no CSS snippet is required. Gradients use the card's color. Card types adjust rectangle / pill borders while preserving other shape outlines. Choose **None** or **Standard** to reset the corresponding effect. Existing `cardGradient`, `cardBorder`, and `cardDropshadow` data remains compatible. For these three attributes, a custom menu with the same key replaces the built-in menu instead of appearing twice.

Expand **Settings → Canvas Enhance → Nodes & edges → Card appearance** to adjust gradient start/end intensity, border width, shadow distance, blur, opacity, and shadow colors for light and dark mode. Changes apply immediately to cards using these styles, and each control can restore its default without editing CSS. An enabled legacy snippet may override built-in effects; disable its corresponding gradient, border, and shadow rules when using the built-in controls.

![Flowchart shapes](../assets/docs/sample-flowchart.png)

![Edge line styles](../assets/docs/edge-path-styles.png)

![Edge arrow styles](../assets/docs/edge-arrow-styles.png)

Existing reference: node styling.

https://github.com/user-attachments/assets/94340110-f7ea-4b20-9c36-a11d937cd8fd

### Text Card Headers and Footers

Select a single text card to access separate **Header** and **Footer** icons directly in its floating toolbar (hover for labels). Both are also available in the context menu. Each editor changes only its own section: **Save** applies your changes, **Cancel** discards them, and removing one section leaves the other intact. These sections support multiline plain text and are stored with the canvas card, separately from its Markdown body.

Each editor includes a numeric font-size input (px). The default is 16px; clearing or resetting the input restores this value. Text changes affect only the current card; header font size applies to all headers, and footer font size applies to all footers. Save applies both changes; Cancel leaves both unchanged.

**Settings → Canvas Enhance → Nodes & edges → Card appearance → Header and footer** remains available and shares the same font-size settings. It also provides padding, background opacity, and divider width controls. Colors follow the card and current theme. Overview mode uses the header when present, otherwise keeping the existing body-title behavior. Auto-height cards include both sections in their measured height.

Headers and footers are supported on text cards only.

### Custom CSS Styles

Use CSS snippets to extend node and edge style options. This YAML comment defines a node menu:

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

1. Put the definition and its CSS rules in a snippet. Use the [complete example](../assets/docs/example-custom-node-style.css) for a working version. The comment alone adds options; it does not draw a status indicator.
2. Enable the snippet under Obsidian **Settings → Appearance → CSS snippets**.
3. Select a node and choose **Style → Validation State** in its floating toolbar. Built-in and custom styles share the same nested menu. Under **Nodes & edges**, you can also configure default node/edge style attributes.

![Custom style menu](../assets/docs/custom-style-attribute-example.png)

### Connect Your Canvas to Your Notes

1. Under **Advanced**, enable **Enable .canvas metadata cache compatibility**. Reload first if the setting requests it.
2. Add a `[[wikilink]]` to an existing note inside a text card.
3. Open the graph view, the target note's backlinks, and the canvas's outgoing links to see their connections.

Canvas files can participate in your note network. Canvas properties and single-node references are covered below.

![Canvas metadata and link integration](../assets/docs/metadata-cache-support.png)

## Other Features

### Canvas Properties (Frontmatter)

Add custom properties such as `tags`, `aliases`, and `cssclasses` to a canvas:

1. Enable metadata cache compatibility as described above, and enable Obsidian's core **Properties view** plugin.
2. Open a canvas and click **Properties** in its side toolbar.
3. Add or edit properties in the properties view. Use `cssclasses` with your own CSS snippets to style the canvas.

### Single-node Links

Under **Advanced → Enable .canvas metadata cache compatibility**, enable **Enable [[wikilink]] node references**. Select a node and run **Copy node wikilink**, or enable and use the copy button in the node popup menu.

Paste the copied `[[Project.canvas#node-id]]` into a note to reference one node. Add `!` to make `![[Project.canvas#node-id]]` and embed that node.

### Search Within a Canvas

With the canvas active, press `Cmd+F` on macOS or `Ctrl+F` on Windows/Linux. Type to jump to matching cards; use `Enter` / `Shift+Enter` for the next / previous result and `Escape` to close search.

When a card editor is active, the shortcut uses its native search. You can also enable **Native-like file search** under **Basic** to include canvas content in Obsidian's file search.

![Searching a canvas](../assets/docs/sample-search.gif)

### Export Your Canvas as an Image

Available on **desktop only**. Enable **Basic → Image export**, then:

1. Run **Export canvas as image**, or select cards and run **Export selected nodes as image**.
2. Choose PNG / SVG, then **Overview** for titles or **Detailed** for card content.
3. Choose a theme and whether to show a watermark. PNG offers pixel ratio and a transparent background; SVG offers **Skip font export**.
4. Click **Save** and choose a destination.

### Auto-resize Nodes

Under **Nodes & edges → Auto-resize nodes**, configure whether it is enabled by default, maximum height, vertical padding, and grid alignment. Text and file cards adjust their height to their content, reducing manual resizing.

![Auto-resizing a card](../assets/docs/auto-node-resizing.gif)

### Layer Order

Enable **Layer order** under **Nodes & edges**. Right-click a node to bring it to the front or send it to the back. Enable **Show move up/down options** to move cards one layer at a time.

![Layer-order menu](../assets/docs/z-ordering-control.png)

### Collapsible Groups

Enable **Nodes & edges → Collapsible groups**. Select a group and run **Collapse/expand group** to hide or restore its cards. Enable **Show collapsed group preview on drag** to see collapsed group boundaries while dragging nodes.

![Collapsed and expanded groups](../assets/docs/collapsible-groups.png)

### Aspect Ratio

Enable **Aspect ratio control** under **Nodes & edges**, then right-click a node and choose **Set aspect ratio**. Resizing keeps its proportions, which is useful for image cards.

### Floating Edges

Enable **Floating edges (automatic connection side)** under **Nodes & edges**. Connection points can choose a suitable side as nodes move, instead of staying fixed to the top, bottom, left, or right. Unattached connection endpoints are also supported.

Use **Allow creating floating edges** and **Floating start of new edges** to adjust defaults for new connections.

![Floating edge example](../assets/docs/floating-edge-example.png)

### Flip an Edge

Enable **Flip edge** under **Nodes & edges**. Select a connection and use the flip action in its popup menu to reverse A → B into B → A.

![Flipping an edge](../assets/docs/flip-edge.gif)

### Highlight and Select Edges

Enable **Edge highlight** under **Nodes & edges** to highlight outgoing connections when selecting a node; optionally enable **Highlight incoming edges**. With **Edge selection** enabled, use the popup menu to select connected edges, or choose incoming and outgoing edges separately by direction.

![Highlighting connected edges](../assets/docs/select-connected-edges.gif)

### Automatic File-node Connections

Enable **Auto file node edges** under **Nodes & edges**. The plugin reads file links from the configured frontmatter key and automatically connects file cards on the canvas. Keep the default key for best compatibility.

### Portals

Enable **Portals** under **Advanced**. Drag another `.canvas` file into the current canvas, select its file card, and choose **Open portal** in the popup menu to view that canvas inside this one.

Portals are separate from opening files in a side pane. **Rearrange all** does not support canvases containing portals yet, and edge operations inside portals are limited.

![A canvas embedded through a portal](../assets/docs/sample-portal-usage.png)

### Focus Mode

Enable **Focus mode** under **Advanced**. Select a card and run **Toggle focus mode** to blur or dim unselected cards. Run the command again to turn it off.

![Focus mode](../assets/docs/focus-mode.png)

### Encapsulate a Selection

**This moves nodes; it does not create a group.** Try it on a copy of the canvas if you want to preserve the current layout.

Enable **Canvas encapsulation** under **Advanced**. Select nodes, run **Encapsulate selection**, and enter a name for the new canvas. The nodes and their internal connections move into the new file. A file card linking to it replaces them in the original canvas.

### Enhanced Read-only Mode

Under **Advanced → Enhanced read-only mode**, configure hiding the grid or node popup menu, and disabling zooming or panning. Switch the canvas to read-only mode to use these restrictions during presentations.

### Extended Commands

Enable **Extended commands** under **Basic**. Open Obsidian's command palette and search for Canvas Enhance. The plugin provides over 20 commands; availability depends on feature switches, the current view, and the selected objects.

| Goal | Example commands |
|---|---|
| Add content | Create text node, Create file node, Create template note node |
| Organize nodes | Clone node (direction), Expand node (direction), Swap nodes, Group selected nodes |
| Navigate | Navigate (direction), Zoom to selection, Zoom to fit canvas |
| Adjust a selection | Flip selection horizontally/vertically, Select all edges, Select incoming/outgoing edges |
| Bring in note relationships | Pull outgoing links into canvas, Pull backlinks into canvas |
| Other actions | Toggle read-only mode, Toggle focus mode, image export, Encapsulate selection |

Settings include clone spacing, zooming to the cloned node, and the node expansion step. Assign shortcuts to frequent commands under Obsidian **Settings → Hotkeys**.

## Settings Reference

### Interface Language

Choose Chinese, English, or Auto under **Basic → General → Interface language**. Settings, command names, canvas controls, and the Guide and Changelog links switch immediately. Reopen menus or dialogs that were already open to see their new language. Older plugin versions still need a reload.

### Node Defaults

Under **Basic → General**, configure the node type created on double-click, grid alignment for new nodes, default text/file node dimensions, minimum size, and maximum width. Choose the **Native** double-click type to keep Obsidian's default behavior.

**Disable font scaling on zoom** controls group-title and edge-label scaling. Overview mode has its own group-label setting.

### Rendering and Performance

Two optional settings are available under **Advanced**:

- **Node render breakpoint:** Set a zoom threshold through a node's `--variable-breakpoint` CSS variable. Content stops rendering below the threshold to reduce rendering work on large canvases.
- **Alternative text rendering:** Attempts to align editing and reading-view rendering. It differs visually from Obsidian's default reading view, so check your content after enabling it.

## Troubleshooting

**A feature does not take effect.** Check its switch first. Reload the plugin or Obsidian only when the setting requests it. Image export is desktop-only. Check the changelog for features that are not yet released.

**Tab, Enter, or Space does not perform the expected action.** Finish editing, select a single card, confirm the canvas is writable, and check for conflicting Obsidian hotkeys. These keys should retain normal input behavior inside editors and text fields.

**Overview mode does not appear.** The default threshold is `0.4`: zoom below 40%. Increase the threshold if you want titles to appear sooner.

**The template list is empty.** Enable the core Templates plugin, configure its folder, and make sure the folder contains Markdown templates.

**A file replaces the canvas instead of opening beside it.** Check **Open file cards in split** and use the card title or **Open in sidebar** entry point.

**How do I report a problem?** [Open an issue](https://github.com/joeytoday/obsidian-canvas-enhance/issues) with your Obsidian version, plugin version, operating system, reproduction steps, and a sample canvas without private content.
