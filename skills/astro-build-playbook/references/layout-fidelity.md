# Layout Fidelity

This is the canonical shared methodology for translating a Figma layout without silently drifting
from the design: overlap requirements, locked image-text compositions, and layout failures found on
real builds. Astro-specific examples remain here; other targets add adapters rather than copying the
source-neutral rules. Get the numbers from
[`figma-mcp-ingestion.md`](figma-mcp-ingestion.md), and verify with
the [final design audit](verification.md#final-design-and-accessibility-audit).

## Designer Overlap Requirements

**Designer overlap requirements** (a cut-out breaking over a heading): reproduce the Figma stacking order literally, with the overlap layer above the text (`z-index`, `pointer-events: none`, `aria-hidden`), and match the text container's alignment exactly (e.g. top-aligned at the padding inset rather than centred). Don't "fix" it by moving the image under the text without asking; it's a visual decision. The composition must also be **locked across widths**. See *Locked Compositions* below.

## Locked Compositions (Image–Text Relationships)

When a design depends on an exact relationship between an image and text (a cut-out overlapping specific letters, a subject pointing at a word, text sitting in a clear area of a photo), **matching it at 1440px is not enough.** An `object-fit: cover` image scales with the viewport, but fluid `clamp()` type and spacing tokens barely change. The overlap drifts: in one real build the tip of a product cut-out sat on the right letters at 1440, mid-word at 1512, below the heading at 1920, and the heading re-wrapped at 1440 once a scrollbar took 15px.

**Confirm first**, showing the user the Figma crop: which letters or lines must the image meet, and should that hold at every desktop width? If yes, lock the section to the Figma frame:

1. **Fix the frame ratio.** The section (or its media layer) takes the frame's aspect ratio, e.g. `aspect-ratio: 2 / 1` for 1440×720. Every image layer is cropped to that exact frame, so `object-fit: cover` maps 1:1 at any width.
2. **Make the section the container** (`container-type: inline-size`), and express the text container's padding, gaps and font sizes in **container units of the frame width**: `value ÷ frame width × 100cqi`.
   ```css
   @media (width >= 64rem) {
     .c-flagship { container-type: inline-size; grid-template-columns: minmax(0, 816fr) minmax(0, 624fr); }
     .c-flagship__media, .c-flagship__cutout { aspect-ratio: 2 / 1; }
     .c-flagship__panel { justify-content: flex-start; padding: 5.5556cqi; gap: 1.1111cqi; } /* 80, 16 */
     .c-flagship__title { font-size: 4.3229cqi; }                                           /* 62.25 */
     .c-flagship__body  { font-size: max(var(--text-s), 1.1111cqi); max-inline-size: none; } /* 16, 13px floor */
   }
   ```
   Headings and anything that participates in the overlap must scale **exactly**, with no `clamp()` bounds and no fluid tokens. Only text outside the overlap zone (body copy) may have a readable floor, and only if it still fits the frame at the smallest locked width.
3. **Scope it** to the widths where the side-by-side composition exists (e.g. ≥64rem). Below that, use a normal stacked layout with standard tokens. There's no overlap to protect.
4. **Record the exception** in the project docs. This is the one place components use raw `cqi` values instead of semantic fluid tokens, and it must not be "tidied" back to tokens.

**Verify by measuring, not eyeballing.** Take the overlap region from the image's alpha channel in frame coordinates, e.g. the nose tip at (912, 390). Then, at several widths (1024, 1280, 1440 scrollbar-free, 1512, 1920, 2560), compute the scale and check, **in design units**:
- the heading's top and left edges (`getBoundingClientRect()` ÷ scale);
- the number of heading lines (`Range.getClientRects()`);
- which line the overlap point falls on, and how far into it;
- how far the overlap extends past the text start;
- that the body text still fits the frame.

All of these must be identical at every width. Very wide screens scale everything up (a 2560px viewport gives a 1280px-tall section), so offer a width cap if that's unwanted, noting that the lock then only holds up to the cap.

### Alternative: Anchor the Art to the Text

Frame-scaling the whole section (above) is right when the text can scale with it. When it can't (the text sits in a **fixed-width panel**, uses the site's fluid type tokens, or the target is a token-driven system such as ACSS), lock the relationship the other way round: **position the image layers from the text box**, so the overlap follows the text wherever it lands and however it wraps.

1. **Measure the anchor in the design.** Choose the text-box corner nearest the overlap: bottom-left for "overlaps the last two lines", so extra wraps above don't move it. Take the overlap region from the layer's alpha in frame coordinates, and each layer's centre, size and rotation relative to that corner. (Product site: heading bottom-left A = (896, 434); the overlapping product photo's opaque pixels at x 896–910, y 363–413, so its centre N = A + (7, −46); base-layer centre A + (−87.59, −83.48), 1805.6 × 1208.9 at −10.85°.)
2. **Put the layers in a positioned wrapper around the heading**, not on the section. Give each layer `inset-block-start: 100%; inset-inline-start: 0` (its top-left at the anchor), then offset it with a translate that mixes its own-size percentage with pixels:
   ```css
   /* centre = A + N + (C − N) × scale; % is of the layer's own size */
   translate: calc(-55.239% + 7px) calc(-53.1% - 46px);   /* (C−N)/size − 50%, plus N */
   rotate: -10.85deg;
   ```
   Because the percentage part scales with the layer and the pixel part doesn't, any resize **pivots about the overlap point N**. Scaling about the heading corner instead pushed the nose up into line 4 at 2560px.
3. **Scale only for coverage.** Keep the design size up to the frame width, and grow beyond it with container units on the section (`container-type: inline-size`): `--art-w: max(1805.6px, calc(200cqi - 1074.4px))`. Layers that must stay aligned (a base photo and its cut-out copy) use the same variable, times their design size ratio.
4. **Model coverage before trusting it.** A rotated layer anchored off-centre can uncover a section corner as the anchor moves. Compute whether the four section corners fall inside the rotated rectangle at every width (a short script). On the product site a growth rate of 1.5× left the bottom-left corner bare from 1690px, and 2× covered 1025–2560. Then confirm with pixels: count screenshot edge pixels that exactly match the section background colour.
5. **Keep the text from breaking the definition.** (The general rule for every display heading is under *Layout Translation Gotchas* → *Cap display headings to their longest word*.) In narrow two-column widths a display heading can break mid-word (`overflow-wrap: break-word` from the reset), turning "the bottom two lines" into word fragments. Measure the longest word in `em` (product site: the longest heading word = 6.41em) and cap the font size to its column: `font-size: min(3.75rem, calc((50cqi - 6rem) / 6.5))`.
6. **Verify every width numerically:** the layer centre against the model (error should be 0), the overlap span against the two-line span, whole-word line counts, and edge coverage.

## Photo Crops on Wide Screens

A single 1440 frame says nothing about 1920 or a 27" monitor at 2560. If photo boxes keep their design **height** while their **width** follows the viewport, `object-fit: cover` shows a progressively thinner strip: heads cut off, products cropped, less of every image. Numbers from the product site (visible share of image height, 1440 → 2560): team portrait 98% → 55%, action shot 56% → 32%, image band 41% → 23%, product photos 89% → 50%. Check images at each width in the [viewport matrix](verification.md#final-design-and-accessibility-audit).

**This is a design decision; ask before choosing.** The options, with their costs:

| Option | Crops | Cost |
|---|---|---|
| **Photo areas scale with width** (chosen on the product site) | identical at every width ≥ frame | image-led sections get taller (hero 872 → 1154 at 1920, 1541 at 2560) |
| Scale to a cap (e.g. 1920), then centre | identical up to the cap | more build and test; crops drift past the cap |
| Cap the whole layout at the frame width | identical | no longer full-bleed; bands either side on big screens |
| Keep heights, set focal points | subjects stay in frame | still shows less image as width grows |

**Recipe for "photo areas scale with width, text stays at design size":**

1. **Grow only above the frame width:** `max(design px, design px ÷ frame width × 100cqi)`. For a 720px section in a 1440 frame that's `max(45rem, 50cqi)`. Below the frame width the design values hold, so laptops and tablets don't change.
2. **Use container units, not `vw`.** `vw` includes the scrollbar (and a reserved `scrollbar-gutter`), so it's 15px off at the design width. Make each section `container-type: inline-size`. A container can't size itself with its own `cqi`, so put the growing `min-block-size` on a **child that drives the height** (the content wrapper or text panel), and let absolutely positioned media fill the section.
3. **Keep each photo box at its design aspect ratio:**
   - boxes with a fixed design size: `block-size: max(31.75rem, 35.278cqi)` (508/1440), or `aspect-ratio: 2 / 1; min-block-size: 15rem` for grid cards;
   - image/panel splits: proportional tracks with the panel's design width as a floor, `grid-template-columns: minmax(0, 816fr) minmax(39rem, 624fr)`, and the image filling the row (`block-size: 100%`);
   - a fixed-width text panel beside a photo would force the photo column to grow faster than the section, breaking its ratio, so the panel scales too: `inline-size: max(39rem, 43.333cqi)`.
4. **Keep text where it sat, relatively.** Text doesn't scale, so taller sections leave room. Put the text block's centre at the same *fraction* of the section height as in the frame, e.g. a block centred at 58.7% of 506px: `padding-block-start: max(7.5rem, calc(20.626cqi - 177px))`, which equals 120px at 1440.
5. **Recheck locked compositions.** Art that was growing faster than the section for coverage can now scale proportionally about its overlap point. Re-run the coverage model and the overlap measurement.
6. **Reset the growth rules on mobile** where the layout stacks (`min-block-size: auto` / `0`), otherwise a 50cqi or 45rem floor leaks into phone layouts.
7. **Verify:** the visible source fractions match 1440 at 1920 and 2560, the page height at 1440 is unchanged, and there's no horizontal overflow.

## Layout Translation Gotchas

- **Two layers ending on the same fractional pixel leave a seam.** An image trimmed with `clip-path: inset(0 0 0 15.75%)` and a gradient overlay placed at `inset-inline-start: 16.042%` meet at, say, x 305.6. The antialiased image edge shows as a full-height line, invisible at 1440 but obvious at 1920. Overlap the covering layer by 2px (`calc(16.042% - 2px)`) where it's fully opaque, rather than trying to align the edges exactly.
- **Cap display headings to their longest word at every breakpoint.** A fluid size such as `clamp(3rem, 15vw, 4rem)` ignores word length, and the reset's `overflow-wrap: break-word` then splits words (two headings broke before their last letter at 320–460px). Measure each heading's longest word in `em` (product site: the longest heading word = 6.414em) and take the minimum of the fluid size and the column width divided by that, with a little headroom: `font-size: min(clamp(3rem, 15vw, 4rem), calc((100cqi - 2.5rem) / 6.5))`. A heading that fits with less than a pixel to spare (6.198em at 320) needs the cap too; font rendering will break it somewhere.

- **`<Picture>` in a fixed-height frame overflows.** The baseline reset makes `<picture>` `display: block` with `height: auto`, so an `<img>` with `block-size: 100%` resolves against auto and renders at its natural height. In a positioned or `isolation: isolate` section the overflow paints **over the next section**. Always size the wrapper and clip the frame:
  ```css
  .c-hero__media { position: absolute; inset: 0; overflow: hidden; }
  .c-hero__media :global(picture) { block-size: 100%; }
  .c-hero__image { inline-size: 100%; block-size: 100%; object-fit: cover; }
  ```
  Verify by comparing the `img` and frame `getBoundingClientRect()` heights at several viewport widths.
- **`sizes` takes plain lengths and media conditions, not custom properties.** `calc(100vw - 2 * var(--gutter))` in a `<Picture sizes>` value is invalid: the browser drops that entry and uses the next one, or `100vw`. Write the arithmetic out in `rem` (`calc(100vw - 3rem)`) and use `(min-width: …)` conditions. Check the chosen candidate with `img.currentSrc` at mobile, tablet and desktop widths.
- **`text-wrap: balance` fights the design's line breaks.** It narrows every line of large uppercase display headings (e.g. splitting a two-word line the design keeps together). Use `text-wrap: pretty` for display type, and keep `balance` for short centred headings only.
- **Scrollbar width matters at the design width.** A 1440px Figma frame is about 1425px of layout with a classic scrollbar (test with a 1440 viewport, which gives `clientWidth` 1425, as well as a scrollbar-free 1440 layout). Horizontal groups sized to the pixel will wrap: bordered button pairs and nav rows. **Don't fix it by shaving design values** (the product-site demo cut button padding 28/26 → 26/24, and it had to be restored later). Fix the constraint instead:
  - let the group stay on one row from a breakpoint where its container's **inline padding can absorb the overflow** (e.g. `@media (width >= 80rem) { .panel > :global(.c-button-group) { flex-wrap: nowrap; } }`);
  - allow normal wrapping below that breakpoint;
  - verify: one row, the group inside the container (report the gap to the container edge), and `scrollWidth === clientWidth` at 1905, 1425, 1280, 1265, 1009 and 375;
  - apply the same rule to **every instance of that component in the same container width** (e.g. detail pages reusing the panel), and record the trade-off (a smaller edge gap at narrow desktops) in the project docs.
- **Absolutely positioned decoration doesn't translate to flow spacing.** Large wordmarks, badges and graphics are often absolutely positioned in Figma, overlapping padding (e.g. a footer wordmark at `top: 511` in a 700px frame, 18px from the bottom edge, inside 40px of padding). Putting them in flow with a scale token like `margin-block-start: var(--space-5xl)` silently moves them (32px too high, footer 10px short). Derive the in-flow offset from the design coordinates (distance from the preceding row's bottom), and let the element sit inside the padding by reducing the container's end padding. Comment the Figma numbers beside the values.
- **Semantic headings inherit body leading.** Small uppercase labels drawn as text with "normal" leading in Figma (Inter 12 → 15px) become `<h2>`/`<h3>` for structure, and inherit the body's `line-height: 1.6` (19.2px). Every list below them then shifts by 4px or more. Give label-style headings an explicit `line-height` (≈1.2–1.25) matching the Figma box height.
- **Derive grid tracks from frame coordinates; don't default to `1fr 1fr` with a gap.** An even two-column grid silently moved an image 25px and narrowed its text column from 656 to 616px. Figma columns often **overlap** (text block 80→736, image 719→1438). Reproduce them with named lines in proportional `fr` tracks, e.g. `grid-template-columns: [text-start] minmax(0,719fr) [image-start] minmax(0,17fr) [text-end] minmax(0,702fr) [image-end] minmax(0,2fr)`. Then cap fixed-width copy (`max-inline-size: min(var(--measure), 100% - 1.25rem)`) so it clears the overlap as columns shrink, and check text ink against the image edge at 1024, 1280, 1440 and 1920.
- **Figma `INSIDE` strokes don't add size; CSS borders do.** A 2px inside stroke on a 41px button group became a 45px `border`. Use an inset outline (`outline: 2px solid; outline-offset: -2px`), which paints over the children's edges without changing layout. Keep the width in a token (`--border-strong-width`) so the offset stays in sync.
  **Check the zoomed Figma render before choosing what the stroke covers.** On a later product-site pass, the group's inside stroke was *not* visible over the opaque primary button: children painted over the frame stroke, so only the transparent outline button showed it (top, right and bottom), and the single-button groups showed none. A full overlay border put a white edge around the blue button that the design doesn't have. Reproduce what the render shows, e.g. a three-sided inset `box-shadow` on the transparent button (`inset 0 2px, inset -2px 0, inset 0 -2px`), switching to a full inset once the buttons can wrap onto separate rows.
- **Scoped styles don't reach a child component's root.** In Astro, `class="c-hero__actions"` passed to `<ButtonGroup>` lands on the child's root element, which lacks the parent's scope attribute, so `.c-hero__actions { … }` in the parent silently never applies (a 12px margin was missing for weeks). Target it from the parent with `.c-hero__text > :global(.c-hero__actions)`, or give the child a prop.
- **Letter spacing: convert Figma px to `em` for scaled headings.** −2px at 62.25px is `-0.0321em`, and at 82.25px is `-0.0243em`. `em` keeps it proportional under fluid `clamp()` and `cqi` sizing. Fixed-size small labels can stay in px. Put both in tokens with the Figma value commented.
- **Font metrics differ between Figma and the webfont, so check heading line counts.** The same typeface can render a few percent narrower in browsers. Tightening tracking to Figma's value made a two-word product-series heading fit on one line (442px in a 464px column) where Figma wraps it; the earlier match was a coincidence. For every display heading, compare the build's line count (`Range.getClientRects()` unique tops) with the Figma box height ÷ line height. Where they differ and the drawn break matters, make the break explicit (`<br />`) and comment why.
- **Check `auto-fill` / `minmax()` column maths against `--container-max` minus gutters.** For an $N$-column desktop grid inside `.l-container`, verify $N \times \text{min\_track} + (N - 1) \times \text{max\_gap} \le \text{container\_max} - 2 \times \text{max\_gutter}$. With `--container-max: 1320px` and `--gutter` up to `2.5rem` (`40px`), the inner width is `1240px`; `repeat(auto-fill, minmax(min(100%, 26rem), 1fr))` with `gap: var(--space-xl)` (`52px`) requires $3 \times 416 + 2 \times 52 = 1352\text{px}$ and silently caps at 2 columns at every viewport width. Use `minmax(min(100%, 20rem), 1fr)` with `gap: var(--space-l)` for a 3-column desktop grid.
- **Visual comparison:** check section heights against the Figma frame heights (from the snapshot geometry or `get_metadata`) at a scrollbar-free design width, then run the width matrix in the [final design audit](verification.md#final-design-and-accessibility-audit). One width is never enough. Force `loading="eager"` and `scroll-behavior: auto` before scripted screenshots, or lazy images and smooth scrolling produce stale captures.
