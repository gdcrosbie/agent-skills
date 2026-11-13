# Figma MCP Ingestion

This is the canonical source-neutral Figma ingestion guide shared by the Astro and Etch design
workflows. It covers reading a Figma file through the Figma MCP (`get_design_context`,
`get_metadata`, `get_variable_defs`, `get_screenshot`, `download_assets`, read-only `use_figma`)
without running out of calls, losing transparency, or missing typography. Target-specific asset
delivery and implementation belong in the relevant Astro or Etch adapter. For Figma **Make**
exports, see [`figma-html-extraction.md`](figma-html-extraction.md). For layout translation, see
[`layout-fidelity.md`](layout-fidelity.md). For checking the build against the design, see
the [final design audit](verification.md#final-design-and-accessibility-audit).

## 1. Before You Start: Plan, File Ownership and Call Budget

**Figma MCP read calls are rate-limited by plan and seat.** Per Figma's `rate-limits-access.md` (Sept 2026):

| Plan / seat | Limit |
| --- | --- |
| Starter | **20 per month** |
| Professional, Dev/Full seat | 200/day, 10/min |
| Organisation, Dev/Full seat | 200/day, 15/min |
| Enterprise, Dev/Full seat | 600/day, 20/min |
| View/Collab seat on paid plans | 6/month |

Write tools and `whoami` are exempt. The limit message gives **no reset time**, and the docs don't say whether "month" is calendar, rolling or billing cycle, so don't promise a date.

**The limit follows the plan that owns the file, not just your seat.** A paid seat does not help if the design file lives outside that paid team: a file shared by an agency or client, or one sitting in another account's space. On the product-site demo, `whoami` showed a Pro Full seat, but every read on the agency-shared file failed with "limit on the Starter plan". The upgrade link named a free team belonging to an old Google-linked account. The same design duplicated into the Pro team worked immediately, with node IDs preserved.
- **Before ingestion:** run `whoami` (exempt), then ask the user where the file lives. Work from a copy in the user's own paid team, not a shared link.
- **Diagnosing a limit error:** compare the team ID in the error's upgrade URL with the plan keys from `whoami`. If they differ, the file (or the account it was shared to) belongs to another plan. Duplicate the file into the paid team and use the new file key. Re-authenticating won't fix it.
- **After switching copies:** verify node IDs with one `get_metadata` call, then update the file key in project docs and asset scripts.

**Budget calls before starting.** One single-page Starter build used about 21 read calls: 1 `get_metadata`, 1 `get_variable_defs`, 3 `get_screenshot`, 11 `get_design_context` (one per section), 2 `use_figma` reads and 2 `download_assets`. That's the whole monthly allowance, and a later designer query about the footer couldn't be checked. On Starter:
- call `whoami` first (exempt) to confirm plan and seat, and tell the user the budget;
- prefer one `get_design_context` per section over repeated screenshots;
- skip `get_variable_defs` when `get_metadata` shows no variables are likely;
- batch reads into a single `use_figma` script.

## 2. Tokens and Fonts

1. **`get_variable_defs` can return `{}`.** Many files have no variables, colour styles or text styles. Read the frame's text runs and fills (a read-only `use_figma` script over `findAllWithCriteria({ types: ['TEXT'] })` → `getStyledTextSegments(['fontName','fontSize'])`, plus node `fills`) and derive the palette and type scale yourself. Record each primitive's source hex beside its OKLCH value in `tokens.css`, and tell the user the tokens were extracted, not imported.
2. **Non-ASCII font family names come back mangled.** A family like `Mg¹²` appears as `Mg??` in both design context and the Plugin API. Don't guess a substitute. Ask the user for the font files, read the real name from them, and self-host the weights actually used. Check the webfont licence: single-site and no-desktop-install terms are common.
3. **Mixed families for one role are common** (e.g. Inter, Geist and Outfit all used for buttons). Surface it and let the user choose between consolidating and keeping it as drawn. That's an aesthetic decision, not an implementation detail.

## 3. Images and Layers

1. **Child-node exports flatten transparency onto the parent's fill.** Exporting a cut-out layer from inside a frame with a solid fill returns an opaque image with that fill where the transparent area should be. **Rebuild the layer from the node's raw image fill instead** (`download_assets` → `rawImages`, which keeps the original alpha), placed with the geometry from `get_design_context`:
   - resize the raw fill to the rect's width and height, at 2× for retina;
   - apply the CSS rotation (`rotate(-9.9deg)` → sharp `.rotate(-9.9, { background: transparent })`);
   - centre it on the rotated bounding box's `left + width/2`, `top + height/2`;
   - clip to the frame.
   
   **Verify** by comparing opaque pixels against the flattened export (mean abs diff < 1/255 means the placement is right). `get_design_context` offsets and `get_metadata` coordinates can disagree for rotated nodes; trust the one that verifies.
   
   **Don't key the parent colour back out** of the flattened export. Dark areas of the photo that are close to that colour become holes, anti-aliased edges leave a coloured fringe, and a soft mask turns into a hard seam. Always check `metadata().hasAlpha` / `stats().isOpaque` before layering.
2. **Rotated or offset image fills:** `get_design_context` positions (`left: -46.89%`, `h: 120.28%`) describe the rendered crop. Reproduce that crop at build-asset time (sharp `extract`) so CSS can use plain `object-fit: cover`. Don't carry absolute percentages into components.
3. **Asset URLs expire after about 7 days.** Download immediately, and **commit the processing script** (e.g. `scripts/process-figma-assets.cjs <download-dir>`) with a header mapping each input file to its Figma node, so the assets can be regenerated.

## 4. Reference Code and Typography

1. **`get_design_context` output is React + Tailwind reference only.** Translate to BEM and tokens, and verify spacing against the screenshot, not the absolute coordinates.
2. **`get_design_context` omits some typography that the design depends on.** On the product-site demo it left out:
   - the −2px letter spacing on every display heading;
   - the 3px `CENTER` **text strokes** that thicken the display headings (1px on card titles);
   - 1–3px tracking on small labels (footer column headings, certification marks, a band note).
   
   Build typography from the `use_figma` text segments, not the reference code. When a text node has a stroke, **ask the designer** whether it's intentional before emulating it (`-webkit-text-stroke` behaves differently from Figma's centre stroke); don't copy it silently or drop it silently.
3. **Hidden layers look like content.** `get_metadata` lists hidden nodes with `hidden="true"`, and `get_design_context` can still carry their text. On the product site the first Etch pass shipped hero CTAs from two hidden button layers instead of the visible pair, so the live buttons carried the wrong labels. Take copy only from visible nodes, and list hidden nodes that contain text in the build brief so their status is a deliberate decision.
4. **`get_metadata` coordinates are relative to the parent frame, not the section.** Add the parent chain's offsets before tabulating against the build. A footer column reported at `x=453` inside `footer-columns` (`x=80`) sits at section `x=533`; one audit misread it as 453 and prescribed a 197px "fix" for a column that was already correct.
5. **Hard line breaks hide in layer text.** A double space between two words in a node name or a `\n` in `characters` is a deliberate break. `get_design_context` shows it as `<br aria-hidden />`. Carry it into the markup as `<br />`: screen readers still read one sentence.

## 5. Design Snapshot

Design data will not always be available later. **Snapshot it during ingestion** into the repo, e.g. `design/figma/` with a README recording file key, frame and date. A full single-page snapshot took about 16 calls:
- **`geometry/`**: a read-only `use_figma` dump of every node, which is the audit reference and supersedes `get_metadata`. Record for each node:
  - absolute `x`, `y`, `w`, `h` relative to the page frame, and parent ID;
  - hidden, rotation, opacity, clip and radius;
  - fills (solid, image hash with scale mode, gradient stops) and strokes (paint, weight, alignment);
  - auto-layout direction, gap and padding, and absolute positioning;
  - for text, per-range `getStyledTextSegments` (font, size, line height, letter spacing, case, fill).
  
  **`use_figma` results truncate at 20KB**, so split the dump across calls per section (about 60 nodes each) and validate that every node ID is present.
- **`design-context/`**: each section's `get_design_context` output with asset URLs replaced by a placeholder. Save it as **`.jsx.txt`**: Astro's tsconfig includes `**/*`, so `.jsx` files would fail `astro check`.
- **`screenshots/`**: one full-page `get_screenshot` (the export is capped at the node's natural 1× size, whatever `maxDimension` says) plus section crops made locally with sharp from the geometry y offsets, at no extra calls. Store the full page as JPEG and crops as PNG.

Later audits and designer feedback can then be checked without new calls. If a limit is hit, say so and work from the snapshot; don't guess.
