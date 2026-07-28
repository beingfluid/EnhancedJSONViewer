# Enhanced JSON Viewer

A web-based tool that renders JSON data as structured HTML tables instead of formatted text. Nested objects and arrays are displayed using merged cells and sub-tables for clear hierarchical visualization.

## Features

- **Table rendering** — JSON objects shown as key-value tables, arrays as columnar tables
- **Nested data** — Objects and arrays within the JSON expand into sub-tables with merged cells
- **Homogeneous arrays** — Arrays of objects with similar keys render as flat column-based tables
- **Collapsible sections** — Click any nested key to collapse/expand its contents
- **Type coloring** — Strings, numbers, booleans, and nulls are color-coded
- **Sample data** — Load a sample JSON to see the viewer in action

## Usage

Open `index.html` in any modern browser. No build tools or dependencies required.

1. Paste JSON into the input area
2. Click **Render Table** (or press Ctrl+Enter)
3. Use **Collapse All** / **Expand All** to manage nested views

## How it works

| JSON Type | Rendering |
|-----------|-----------|
| Object | Key-value table with one row per property |
| Array of objects | Column table with keys as headers |
| Mixed array | Index-value table with sub-tables for complex items |
| Primitives | Color-coded inline values |
| Nested structures | Recursive sub-tables inside parent cells |
