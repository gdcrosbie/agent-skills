# Paper MCP Ingestion

How to read a **Paper.design** file through the Paper MCP for an Astro build. It covers the
read order, what the file does and doesn't hold, assets and the `design/paper/` snapshot.
For layout translation, see [`layout-fidelity.md`](layout-fidelity.md); for checking the build
against the design, the [final design audit](verification.md#final-design-and-accessibility-audit).

Verified 2026-10-25 on a homepage build (Paper desktop app MCP, file with
Desktop 1440, Tablet 768 and Mobile 390 artboards).

## 1. Connect, then read in this order

The Paper MCP runs through the Paper desktop app. If its tools aren't in the session, ask the
user to connect it rather than working around it (see §5). Load the server's own guide once per
session (`get_guide({ topic: "paper-mcp-instructions" })`), then:

1. **`open_file`** with the file URL, or **`get_basic_info`** for the file being viewed. This
   lists pages, artboards with dimensions, font families and design tokens. Read sibling
   pages' names too: a file can hold IA, sitemap or palette pages that bear on the build.
2. **`get_tree_summary`** per artboard (depth 3–4): layer names, IDs and sizes. Layer names often
   carry intent (`Example Org — existing logo and wordmark`, `Two smiling women`). Reuse
   them for alt text and component names.
3. **`get_jsx`** per artboard with `includeNodeIds: false`. This is the build source: exact
   fonts, sizes, line heights, letter spacing (`em`), padding, gaps, flex direction and wrap,
   and `display: 'none'` for elements hidden at a breakpoint (the mobile nav items on narrow
   artboards). Diff the three artboards' JSX rather than eyeballing renders.
4. **`get_screenshot`** per artboard, for visual reference and the snapshot. Paper's guidance
   is explicit: take values from `get_jsx`/`get_computed_styles`, never from screenshots.
5. **`get_computed_styles`** / **`get_fill_image`** only for values the JSX doesn't settle.

## 2. What the file may not hold

- **Tokens can be empty.** `get_basic_info` returned `tokens: { items: [] }`. Look for a
  palette artboard. On this file it was a `… · Palette` frame naming each colour's role, e.g.
  "Hero ground #E6007A", "Date tile #FCECF4". Use those roles for semantic aliases, and record
  in the project docs that tokens were extracted, not imported.
- **Interactive states are usually absent.** The artboards showed a closed "Menu" button, but
  no open menu. Surface the open-state treatment as an aesthetic decision before building it.
- **A sibling IA page can contradict the prototype.** Here a "Proposed sitemap" page dated the
  same day used different nav labels and an extra item. Ask which the build follows; take
  routes for placeholder pages from the IA page either way.
- **No footer is a valid design.** Don't add one unless asked; confirm.

## 3. Assets

- Image fills appear in the JSX as `backgroundImage: url(https://app.paper.design/file-assets/<file>/<id>.<ext>)`.
  Those URLs downloaded without authentication for a link-shared file. Save the originals
  under `design/paper/assets/` with descriptive names before processing.
- **Check native dimensions against the rendered size.** The logo PNG was 194×58 and drawn at
  194×58 CSS px: 1× only, soft on high-density screens. Ask for an SVG (or 3× raster), build
  with the supplied asset meanwhile, and log it as an open item.
- `backgroundSize: cover` plus `backgroundPosition` / `objectPosition` (e.g. `50% 45%`) give the
  crop. Carry the position to `object-position` on the `<img>`, and take the frame height per
  breakpoint from each artboard.

## 4. Snapshot: `design/paper/`

Commit, alongside the code:
- one render per artboard (`desktop-1440.jpg`, `tablet-768.jpg`, `mobile-390.jpg`);
- `assets/` with the downloaded originals;
- the file ID, page ID and artboard names in the project record.

The mobile artboard may include a phone status bar frame (62 px here). Subtract it before
comparing page heights.

## 5. Without the MCP

Paper renders artboards as real DOM. When the MCP isn't connected, a signed-out browser view of
a link-shared file still exposes computed styles, text and asset URLs through page JavaScript.
That is enough for palette, fonts and copy. Layer names, node IDs and layout intent (fixed,
fill or hug sizing) are not available, and the canvas is zoomed. Treat it as a fallback and
say so to the user; the MCP is the better source for layout and for later design audits.
