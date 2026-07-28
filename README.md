# Enhanced JSON Viewer

A web-based tool that renders JSON data as editable HTML tables instead of formatted text. Nested objects and arrays are displayed using merged cells and sub-tables for clear hierarchical visualization.

**Live demo:** [https://beingfluid.github.io/EnhancedJSONViewer/](https://beingfluid.github.io/EnhancedJSONViewer/)

## Features

- **Table rendering** — JSON objects shown as key-value tables, arrays as columnar tables
- **Editable cells** — Click any value cell to edit it directly in the table
- **Open file** — Load a `.json` file from your local system (Ctrl+O)
- **Save file** — Download the modified JSON back to disk (Ctrl+S)
- **Sync to JSON** — Push table edits back to the JSON textarea
- **Nested data** — Objects and arrays expand into sub-tables with merged cells
- **Homogeneous arrays** — Arrays of objects with similar keys render as flat column-based tables
- **Collapsible sections** — Click any nested key to collapse/expand its contents
- **Type coloring** — Strings, numbers, booleans, and nulls are color-coded
- **Dirty indicator** — Visual indicator when table has unsaved edits

## Usage

Open `index.html` in any modern browser. No build tools or dependencies required.

1. Paste JSON or click **Open** to load a file
2. Click **Render Table** (or press Ctrl+Enter)
3. Click any value cell to edit it
4. Click **Sync to JSON** to update the textarea, or **Save** to download

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Render JSON |
| Ctrl+O | Open file |
| Ctrl+S | Save file |
| Enter | Confirm cell edit |
| Escape | Cancel cell edit |

## Deployment

This is a static site — deploy via GitHub Pages by enabling it on the `main` branch root.
