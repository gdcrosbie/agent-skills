# Verification detail

Detail for Phase 5 and Phase 7 of [`../SKILL.md`](../SKILL.md).

## Astro script deduplication

- `<script>` tags in `.astro` components are bundled and executed **exactly once per page**, regardless of component count.
- Never write single-element queries like `document.querySelector('.c-card')` inside component scripts.
- Always query all instances with `document.querySelectorAll()` or encapsulate component state using Web Components (`customElements.define()`).

## Inline JSON for client data

When embedding editable data in `<script type="application/json">`, escape `<`
after serialising so a value containing `</script>` cannot terminate the HTML
script element. JSON encoding alone does not escape that sequence:

```js
const clientData = JSON.stringify(data).replace(/</g, '\\u003c');
```

Read the element's `textContent` and parse the JSON. Render plain-text results
with `textContent`, rather than interpreting content values as HTML. Verify a
representative value containing `</script><img ...>` stays inert, round-trips
through JSON parsing and creates no injected elements or event handlers.

Check that the data element remains invisible in the rendered page, including
without JavaScript: author/framework display rules can override browser defaults.
Astro's scoped styles do not target inline script elements automatically; inspect
the emitted attributes and winning rules. Where a display override exposes the
data, use an explicit `hidden` attribute and a matching project-owned safeguard
that survives the cascade. Do not assume a scoped class rule reaches the element.

## Checker compatibility and coverage

Inspect the actual `check` script before reporting results. If the Astro checker is incompatible with the selected toolchain, investigate a supported configuration and surface any fallback's coverage gap. `astro sync && tsc --noEmit` checks TypeScript modules but does not provide full Astro template diagnostics; `astro build` compiles templates without replacing those diagnostics. Record the exact tool versions, commands and unchecked scope in the project report, and recheck compatibility before adopting this fallback elsewhere. The puzzle-generator app used this fallback with Astro 7.3.8 and TypeScript 7.0.2 on 2026-10-10.

Run check/sync and build sequentially when they share Astro-generated files or Vite caches. Use only scripts present in the project for local and hosted verification; see the [hosting guide](hosting-and-indexing.md) for runtime and deployment CLI pins.

## Interaction verification

Inventory the enhancements on each affected route: filters, planners, search,
accordions, downloads and toasts as well as navigation/theme controls. Check an
observable result for each, such as the filtered row count and pressed state or
planner output after changing inputs. A working menu does not establish that
other component scripts executed.

Run the production build with the actual CSP response header (host emulation or
a local server applying the same policy), then repeat the affected journeys on
the deployed origin. Inspect emitted script tags and browser CSP diagnostics;
absence of captured console messages alone is not proof of execution. `astro dev`,
plain static preview, successful type/build checks and jsdom axe do not establish
that host CSP permits the scripts. Use the [static script gate and emission
recipe](hosting-and-indexing.md#strict-csp-and-progressive-enhancement) as a
preflight; inert `application/json` blocks are not executable inline JavaScript.

Verify mobile navigation below, at and above its breakpoint, including resize while open. Check keyboard opening, Escape, outside pointer activation, link activation, focus leaving the menu, focus restoration and repeated initialisation. For approved light/dark switching, check both palettes, initial system preference, saved preference, invalid/blocked storage, system changes, cross-tab changes and repeated initialisation. Verify independently styled pages remain isolated. Use rendered browser checks for native pointer/focus ordering; synthetic click tests alone do not establish correct behaviour. Regression tests should cover these state transitions rather than mirror implementation details.


### Phase 7: Verification Gate
> **Shared across frameworks.** Run scripts that actually exist and apply to the project. Do not infer that `test:forms`, accessibility or other checks are absent from its framework name. Token-specific checks must match the selected contract. Live deployment, rendered design, performance and metadata checks remain applicable.

Before handing off, run the verification pipeline appropriate to the selected runtime. Finish with the [design and accessibility audit](#final-design-and-accessibility-audit); each leaves its record under `design/audit/`. For EmDash, replace static `dist/` page/sitemap assertions and prerendered-output tests with checks against running local and deployed routes; include the editorial and performance checks in `emdash.md`. Keep applicable accessibility, metadata, design and asset checks. Only run gate scripts that exist in the selected project (see [`assets/README.md`](../assets/README.md)):
1. `npm test` (or the individual checks below):
   - `npm run test:docs` → 0 broken local documentation links.
   - `npm run test:tokens` → All required semantic tokens exist and match the contract.
   - `npm run test:contrast` → 0 WCAG 2.2 AA contrast violations across light/dark semantic pairings.
   - `npm run check` → 0 errors or warnings from the configured checker; report separately whether full Astro template diagnostics ran.
   - `npm run build` → Successful build for the selected static or server adapter.
   - `npm run test:discovery` → Sitemap and robots.txt correctly generated and discoverable (or, for non-indexable sites, every page `noindex`, `robots.txt` `Disallow: /`, `X-Robots-Tag` in host config, no sitemap or RSS), and every internal link resolves.
   - `npm run test:csp` → Built scripts comply with the configured static external-script CSP; review SKIP or unsupported policies against the selected host.
   - `npm run test:social-image` → Default Open Graph social card (`og-default.jpg`) present and dimensioned (1200x630).
   - `npm run test:forms` → Contact form markup contract and API endpoint validation pass. **Only exists once a contact form adds it**; not part of the baseline.
   - `npm run test:a11y` → 0 axe-core accessibility violations on prerendered output.

**When a check can't run or already fails:** if a check cannot run, report the exact command, the reason and the remaining risk rather than treating it as passed. If a failure predates the current change, don't hide it: identify it, show that the change did not worsen it where possible, and record the remaining risk.

**Checker compatibility and sequencing:** inspect the actual `check` script before reporting results, report any fallback's coverage gap, and run check/sync and build sequentially. See `verification.md`.

2. **Live Deployment Check** → After the first deploy, `curl -D -` the production alias and custom domain (not just protected preview URLs) to confirm security and `X-Robots-Tag` headers, trailing-slash redirects, 404 behaviour, that host-irrelevant files such as `/_headers` return 404, and that the live build is the commit you expect (compare a hashed chunk name). See `hosting-and-indexing.md` §3.
3. **Design Audit** → See [the final audit](#final-design-and-accessibility-audit). Snapshot Figma data during ingestion, because MCP calls can be rate-limited later.

**Interaction verification:** verify mobile navigation and any light/dark switching through their full state transitions in a rendered browser; synthetic clicks alone don't establish behaviour. Checklist in `verification.md`.

4. **Accessibility Audit** → After `test:a11y` passes, run the [`accessibility-audit`](../../accessibility-audit/SKILL.md) skill (if installed; otherwise the minimum checks in [the final audit](#final-design-and-accessibility-audit)) against `astro preview` or the deployed URL. Axe on prerendered output is a preflight; the audit covers rendered contrast, focus, keyboard and interaction states it cannot.
5. Lighthouse Headless Benchmark → 95+ Performance, 0ms TBT, 0 CLS.
6. SEO & Social Metadata Audit → Verify the sitemap exists in static output or resolves on the live server (indexable sites only), canonical URL matches production domain, and 1200x630 social card (`og-default.jpg`) is present.

### Final design and accessibility audit

Run on `astro preview` or the deployed URL under production headers, not on source files or the
dev server. Write each record under `design/audit/` and record accepted deviations in the project
record.

**Design check.** For each section, tabulate the design's geometry (from the snapshot) against the
measured build at a scrollbar-free design width (often 1440px), and fix deltas over ~2px, largest
elements first. Use the same process for later designer feedback. Then run layout checks across
the viewport test matrix (1920, 1536, 1440 with and without a scrollbar, 1366, 1280, 1024, 375).
The design width is the fidelity reference, not a proxy for traffic. Render an HTML export before
trusting it, and don't copy its defects (invisible controls, failing contrast) into the build.

**Accessibility audit.** If the `accessibility-audit` skill is installed, run its
[workflow](../../accessibility-audit/SKILL.md) with its Astro adaptation: rendered evidence,
severities, scoring, an audit record and re-verification after fixes. Without it, check at
least: keyboard order, visible focus, skip link, no traps and focus return; rendered contrast,
including text over images and both colour modes; landmarks, headings, accessible names, alt
text, labelled fields and announced errors; reflow at 320 CSS px, target size and reduced
motion; and a usable no-JavaScript path. State what was not tested (for example screen readers).
Passing automated checks is not a conformance claim.
