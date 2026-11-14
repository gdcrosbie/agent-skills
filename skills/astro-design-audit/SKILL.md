---
name: astro-design-audit
description: Compare a rendered Astro build with its design evidence (Figma, Paper or an HTML export) using geometry, typography and responsive measurements. Use for design-build handoff, vague designer feedback, visual drift or refactor regression checks.
---

# Astro Design Audit & Viewport Test Matrix

Numeric audit of a rendered Astro build against its design source. Run it after a build, or
when a designer says something looks off, rather than assuming visual correctness from a passing
`astro build` or a plausible screenshot. It applies whatever produced the Astro code: an agent
build skill, a hand-authored component or a refactor.

Reference data is the design evidence the project captured going in: a Figma MCP snapshot, a
Paper export, or an HTML design export (Figma Make, Claude Design and similar). If the
`astro-build-playbook` skill is installed, its
[Figma ingestion](../astro-build-playbook/references/figma-mcp-ingestion.md) §5 describes the
snapshot, and its [layout fidelity](../astro-build-playbook/references/layout-fidelity.md)
reference gives typical causes and fixes for what this audit finds. The inputs a build hands to
this audit, and the record it leaves, are in [audit record](references/audit-record.md).

An audit-only request authorises measurement and reporting. Apply the fixes below only when
remediation is already authorised; otherwise propose them with the evidence. New aesthetic
directions, dependencies or services, and wider global changes still need the user's decision.

## Measure built output, and locate fixes in the source

- **Measure on `astro preview`** (after `astro build`), `npx wrangler dev` or the deployed URL.
  The dev server serves styles unbundled, so stylesheet order and minification can differ from
  production; a dev-server measurement is not the result. Rebuild after each fix before
  remeasuring.
- **Map each measured element to its `.astro` file:** `src/components/`, `src/layouts/` or the
  page in `src/pages/`. Text that wraps differently may come from a content collection
  (`src/content/`, `src/data/`) or a CMS entry rather than the component. Record that path as the
  fix locator.
- **Component styles are scoped.** A parent rule aimed at a child component's class needs
  `:global()`; confirm the winning rule in the served CSS before concluding a value is wrong.
- **Fix through the project's token contract** (its `tokens.css`, a bridge to supplied tokens, or
  a component framework's own variables). Record accepted token substitutions rather than
  hardcoding the design value. If the project uses a component framework with its own contract,
  fix through its components and variants.

## When "Something Is Off"

Vague designer feedback ("something's off with the footer") needs a **numeric audit**, not a
guess or a screenshot squint.

1. **Get the reference:** the section's absolute geometry from the captured design evidence
   (Figma `get_metadata`, a saved snapshot, a Paper export, or the equivalent for another source),
   relative to the section frame.
2. **Measure the build** at a scrollbar-free design width: set the viewport to 1440 + scrollbar
   and confirm `document.documentElement.clientWidth === 1440`. Measure
   `getBoundingClientRect()` for the same elements relative to the section, plus computed
   `font-family / weight / size / line-height / letter-spacing / color`.
3. **Tabulate design against build with deltas** (`x, y, w, h`), largest elements first.
   **Include typography:** computed `letter-spacing` against the design's segment values, and
   heading line counts against the design box height ÷ line height. These don't show up in
   position deltas until they re-wrap a heading. Big decorative elements and section heights are
   what designers notice. Account for known offsets such as a 1px border.
4. **Report deltas beyond ~2px** with their cause (flow vs absolute positioning, inherited
   line-height, token rounding). When fixes are authorised, apply them and re-measure to show the
   before/after table.
5. **Check the width matrix** (below), not just the design width. Most regressions happen
   *below* the design frame width, where layouts compress: wrapping button pairs, copy running
   under images, overlaps drifting.
6. **Trigger the states the design draws, then measure them.** Submit a form to success and to
   failure, open toggles, menus, dialogs and filter panels, and switch the colour theme with the
   page already loaded. A design often shows a state beside the default view as an illustration
   ("After sending · /contact/thanks"); its annotation describes behaviour, not layout, so check
   the build does what the note says. On one build, three audits measured the contact page at
   rest and accepted "thanks shown in place", but none sent the form: the form's own
   `display: flex` beat `hidden`, so the thanks panel stacked under a form that never went away.
   To reach a success state without side effects, stub the endpoint in the page. Components that
   read the theme once at load (maps, charts, embeds) keep the old theme after a toggle; switch
   theme after they render and look again.
7. **List what numbers can't settle:** deliberate deviations (e.g. colours lightened for WCAG AA),
   hover and interaction states, and responsive layouts not in the design. Ask the user to confirm
   those with the designer rather than assuming the audit found "the" issue.

### When the Reference Is HTML

An HTML design export is itself a rendered reference, so measure it live instead of reading
geometry from a design file:

1. **Serve it locally over `http://`** (any static server on the export folder), not `file://`,
   and open it beside the build in a second tab. Emulate the same viewport in both and confirm
   `document.documentElement.clientWidth` matches.
2. **Keep a selector map** from reference to build (e.g. `.hero h1` ↔ `.hero__title`,
   `.programme-item` ↔ `.programme__item`) and run the same measuring script on both sides.
3. **Find drift fast, then narrow it:** compare section heights and document height across the
   matrix first, then element deltas inside the sections that drift.
4. **Compare text as well as boxes.** Read each mapped node's `innerText` on both sides. A box can
   keep a plausible size while its text has gone: on one build a content round trip stripped a
   hero's lead text and button labels, and only the heading's height and the buttons' 56px widths
   gave it away.
5. **Use the export's own viewport list too.** If the handoff ships one, test the union of its
   widths and the matrix below.

## Defects in the Reference

Design evidence can contain real defects. One HTML design export had an outline button and a
footer wordmark both the same colour as their background, and an eyebrow at 3.98:1 on a coloured
band. Render the reference itself and run the same visibility and contrast checks on it that you
run on the build. Flag each defect and propose its correction; apply it within authorised
remediation scope. Record each accepted fix as a deliberate deviation in the project's decision
log and audit record, so later audits don't report it as drift.

## Viewport Test Matrix

The design frame width (usually 1440) is the **fidelity reference**, the only width where design
and build can match pixel for pixel. It isn't a proxy for real traffic. Audit fidelity there,
then run layout checks across this matrix:

| Viewport | Layout width (Windows classic scrollbar) | Represents | Check |
| --- | --- | --- | --- |
| 2560 | ~2545 | 27" monitors at "looks like 2560" | Photo crops (below); section heights; locked compositions at their largest scale |
| 1920 | ~1905 | Full-HD monitors at 100% | Photo crops (below); wide screens must not only add margin to fixed-height photo boxes |
| 1536 | ~1521 | Full-HD Windows laptops at 125% (common in business) | Normal desktop layout |
| **1440 + scrollbar-free 1440** | **1425 / 1440** | MacBooks; **the design frame** | **Fidelity audit at 1440**; pixel-sized groups at 1425 |
| 1366 | ~1349 | Older / smaller laptops | Compression: wraps, overlaps, edge gaps |
| 1280 | ~1265 | Small laptops | Compression: tightest desktop case |
| 1024 | ~1009 | Tablet landscape / desktop breakpoint edge | Side-by-side layouts at their narrowest, or a clean switch to stacked |
| 375 | 375 | Phones | Stacked layout, 44px targets, `scrollWidth === clientWidth` |

- **Measure the effective layout width:** set the viewport to the value in the first column and
  read `document.documentElement.clientWidth`. To get a scrollbar-free design width, add the
  scrollbar to the viewport (e.g. 1455 → 1440).
- **Check photo crops at wide widths, numerically.** A design that is perfect at 1440 on a laptop
  can look wrong on a 27" monitor, because fixed-height photo boxes widen and
  `object-fit: cover` shows a thinner strip: heads cut off, less of the product. For each photo
  compute the **visible source fraction** from the box size, the natural size and
  `object-position`, and compare it with 1440:
  ```js
  const r = img.getBoundingClientRect(), c = getComputedStyle(img);
  const s = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  const [px, py] = c.objectPosition.split(" ").map(v => parseFloat(v) / 100);
  const ox = (r.width - dw) * px, oy = (r.height - dh) * py;
  // visible x: -ox/dw → (-ox + r.width)/dw ; visible y: -oy/dh → (-oy + r.height)/dh
  ```
  On one site the team portrait went from showing 98% of its height at 1440 to 55% at 2560. The
  fix is a decision (a capped box height, an aspect-ratio box, or a different crop per width);
  the playbook's layout fidelity reference covers it under *Photo Crops on Wide Screens*.
- **Check display headings for mid-word breaks** at 320, 360, 390, 430 and the tablet widths:
  walk each heading's text node character by character with a `Range`, and flag a line change
  between two non-space characters. Line counts alone miss a word split across lines. A flag
  between two **elements** (for example two line `<span>`s in a heading) can instead mean the
  source has no space between them: check the heading's `textContent`. That is how an "Open dailyfrom 9am" accessible name was found on
  one build; report it to the accessibility audit.
- **Test editable content extremes:** for components displaying editable labels, test
  representative content extremes as well as the supplied examples. For full weekday names,
  include Wednesday and Saturday at the smallest supported container width. Check wrapping,
  clipping and internal clearance. Record any required geometry change as a proposal when the
  approved design does not accommodate it.
- **At every width check:**
  - `scrollWidth === clientWidth`;
  - multi-item rows (button groups, nav, card grids) have the expected row count and stay inside
    their container (report the edge gap);
  - heading line counts don't regress;
  - copy doesn't collide with overlapping media;
  - locked compositions keep identical design-unit measurements.
- **Why automated checks miss this:** jsdom-based checks can't see layout. A browser (an agent's
  preview browser, or Playwright if the project adopts it) is required, so treat this matrix as a
  manual verification step, or propose a `test:layout` script to the user before adding a
  dependency.
- **Adapt the matrix to the audience** once real analytics exist, and ask the designer for a
  second frame (1280 or 1024) so narrow desktop layouts are designed, not improvised.

## Regression Gate for Refactors

A refactor that should not change the design (splitting styles, removing a wrapper, moving markup
into layouts, componentising) needs **proof of no visual change**, not a spot check:

1. Capture full-page screenshots **before** the change at 1440 (scrollbar-free), 1024 and 375.
2. Make the change, rebuild, capture again, and diff per horizontal band (a pixel counts as
   changed when any channel differs by more than about 24/255). Report the changed bands, not
   just "different".
3. Inspect every changed band. Classify it as a real regression, resampling noise (a
   best-alignment offset of 0,0 with a low mean difference), or a capture artefact.
4. Only then run the numeric checks for anything the change was meant to move.

On one site this gate caught the only real regression in a large style split (footer legal links
turned the global link colour after a generic `a` rule was removed), which a visual skim had
missed.

**Headless capture pitfalls** (Chrome `--headless=new --screenshot`):
- **Check that the capture isn't blank** (image extrema not all 255) before diffing. A
  cache-busting query string (`?s=123`) returned an all-white capture right after a content
  save, while the plain URL rendered.
- **Headless windows can't be phone-sized.** `--window-size=390,…` doesn't give a 390px layout:
  Chrome enforces a minimum window width, lays the page out wider and crops the screenshot, so
  text runs off the right edge in *both* captures and the diff proves nothing. Verify phone
  widths with real device emulation (a browser's mobile viewport or DevTools device mode) and
  check `innerWidth` inside the page.
- **Lazy images below the fold may not have loaded**, so photos appear as empty panels. Confirm
  in a real browser (`img.complete && img.naturalWidth > 0` after forcing `loading="eager"`)
  before calling it a regression.
- **`--hide-scrollbars` doesn't remove a reserved gutter.** With
  `html { scrollbar-gutter: stable }` (a common reset default) a 1440 window still lays out at
  1425, even with overlay scrollbars on macOS. Use a 1455 window for a 1440 layout, and always
  read `document.documentElement.clientWidth` rather than assuming.

## Audit Record

For a substantial build, keep the comparison table and any accepted deviations under
`design/audit/`, as set out in [audit record](references/audit-record.md). This lets later
designer feedback be tested against the same evidence instead of restarting from screenshots and
memory.
