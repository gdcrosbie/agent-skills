---
name: accessibility-audit
description: Audit rendered pages or components against WCAG 2.2 using demonstrated impact, scoped scoring and stack-specific fix locators. Audit-only requests report before remediation.
---

# Accessibility Audit

WCAG 2.2 auditing and remediation for rendered pages, templates and components, whatever built them.

This is the *audit* skill — it inspects what exists and scores it. For getting markup right while
building, use the build skill's authoring checklist (for Astro, the `astro-build-playbook`
[cwv a11y checklist](../astro-build-playbook/references/cwv-a11y-checklist.md), if installed). They
share a rule set; this file adds the workflow, severities, and scoring.

## Audit the rendered frontend, not the builder or source tree

When sources disagree, the live rendered page wins. A builder canvas is not the frontend, and a
stored block tree, CMS record or component file is not proof of rendered output — dynamic data,
conditional branches, loops and component templates all resolve at render time. An audit run
against the source alone will miss the markup users actually get.

1. **Fetch the rendered page and read its HTML.** This is the audit's primary source.
2. **Read the source for context** (component files, builder tree, CMS entries) — to map a finding
   back to something you can fix.
3. **Measure rendered styles and exercised states through browser tooling.** Use a real browser on
   the rendered page: freshly loaded computed styles for static paint, the served CSS to trace the
   cascade, and native keyboard interaction plus screenshots/accessibility-tree evidence for focus
   states. A structural/CSS preflight is not a browser audit.

### Detect the stack and load its adaptation

Then detect what built the site and load its adaptation, if one exists. Adaptations cover tooling,
where landmarks live, stack-specific contrast and markup gotchas, and how to apply and re-verify
fixes.

| Stack | Signals | Load |
|---|---|---|
| Astro | `astro.config.*`; `astro` in `package.json` | [`references/astro-adaptation.md`](references/astro-adaptation.md) |
| Anything else | — | This file alone; locate fixes in whatever source produced the page |

**Tooling gate:** an adaptation may need a tool (a builder connector or MCP server) to read the
source or apply fixes. If that tool isn't connected, follow the adaptation's own gate. A missing
connector for one stack never halts an audit of a site built with another; detect the stack first.
Never assume a framework's tokens or conventions (ACSS, for example) outside the stack that uses them.

## Workflow

### Phase 1 — Scope

Establish what you're auditing: a single page, a template (and which query populates it), or a
component in isolation. For templates, audit at least one rendered instance with **real content** —
empty loops and missing optional fields hide and create issues in equal measure.

**Skip link and `<main>` landmarks.** Establish where they live before judging a page: a shared
layout or template, or each page. Audit the **rendered** document for one `<main>` and one skip
target. If the shared layer already provides them, a page without its own `<main>` is correct; don't
add a second. Record the actual skip-target `id` (`#main`, `#content`, `#main-content`, …); do not
assume one. The stack's adaptation says which layer owns them.

### Phase 2 — Run the checks

Work through `references/wcag-checklist.md` against the rendered HTML. For each issue record: the
element (plus the class, component, block id or record that locates it in the source), the WCAG criterion, a severity, and the fix.

**Severity classes** — assign by demonstrated consequence, not by element category:

| Class | Evidence required |
|---|---|
| **Critical** | Blocks an essential task: keyboard-inoperable control, unnamed essential input/button, focusable content hidden from assistive tech, or a keyboard trap. |
| **Major** | Materially degrades access: confirmed text/UI contrast failure, invisible focus/selected state, missing bypass mechanism, visible label absent from the accessible name, or missing required-field instructions. |
| **Minor** | A confirmed criterion failure with limited impact; explain the affected users and criterion rather than using this class for general polish. |
| **Advisory** | A semantic recommendation, project convention, or unconfirmed concern. Report separately, with no score deduction. |

**A checklist preference is not proof of a WCAG failure.** An unnamed `<section>` does not
automatically need `aria-labelledby`; name it when it should be a navigable region. Repeated link
text may have sufficient programmatically determinable context under 2.4.4. Determine whether
repeated items actually express a list before citing 1.3.1. One `h1`, unskipped heading levels,
token use, an `aria-controls` preference, and scrutiny of raw HTML are useful checks, not automatic
critical failures. Record the actual lost information or broken interaction before assigning a
criterion. Do not count one root cause once per page when scoring a shared component.

**Read static computed styles from a freshly loaded page.** Reload before measuring and after
writes/deployment; check that the browser loaded the current stylesheet. Use served
rules and resolved tokens to explain the winning cascade when evidence disagrees. Do not assume
either stored CSS or an isolated computed snapshot proves the visible result.

**Verify pseudo-states through native interaction.** On one builder-hosted site, a DOM
snapshot after Tab reported offscreen skip-link geometry and a default outline while fresh native
accessibility-tree/screenshot evidence showed the visible focused link and ACSS ring. This was a
tool/session observation, not a universal browser bug. A fresh reload alone did not settle the
disagreement. Use actual Tab/Shift+Tab, screenshots and the accessibility tree; confirm the active
element and relevant `:focus-visible` rule before reporting a failure. An emulated key event or
computed-value dump alone is insufficient evidence of a broken skip link or dialog focus trap.

One cause to rule out first: in an embedded or otherwise unfocused browser pane,
`document.hasFocus()` can be `false`. A scripted `el.focus()` then moves `document.activeElement`
without matching `:focus` or `:focus-visible`, so a working skip link reads as offscreen and
transparent (observed 2026-10-16 in a desktop app's built-in browser). Check `document.hasFocus()`
before trusting focus styles, give the page focus with a real click, then use real key presses.
Read transitioned properties only after the transition has finished: a 180ms `rotate` on an
accordion icon read `0deg` immediately after toggling and `45deg` once settled.

**Check the framework's own focus tokens before writing an override.** Frameworks often define
focus colour, width and offset as tokens, and component rules (buttons especially) can redefine
them on the control, so a root/ancestor override may lose there. Inspect the winning token on the
focused element; the stack's adaptation names the tokens. Use site-wide changes only for a site-wide defect; surface-specific scoped token
overrides are appropriate for light/dark sections, header/footer and dialogs. Check the outline
against adjacent colours, hover text/fill pairs, and selected indicators after focus moves away.
Controls outside `<main>` must be included. Prefer these scoped corrections over changing the
global accent to solve one contrast failure.

**Automatic.css outline buttons on light surfaces** (any stack that loads ACSS 4, not only Etch):
`.btn--primary-dark.btn--outline` sets `--focus-color: var(--primary-light)`, a ring meant for dark
grounds. On a white page it read ≈1.5:1 (WordPress, ACSS 4.0.1, 2026-10-21); solid
`.btn--primary-dark` uses `--primary-semi-dark` and passed. Fix it on the control, scoped to the
component or surface, and leave the ACSS focus colour alone:
`.c-filters__pill.btn--primary-dark { --focus-color: var(--primary-dark); }`. Check other families'
outline variants the same way rather than assuming they match.

**Form names, instructions, and Label in Name (2.5.3):** compare the visible label with the rendered accessible name
([2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)). An
`aria-label` can override a valid native label and omit its visible words. Prefer the associated
`<label>` where it already supplies the right name. On icon/monogram links and buttons, putting `aria-hidden="true"` on a child text span (for example `<a aria-label="Facebook"><span aria-hidden="true">FA</span></a>`) does not hide the rendered characters from sighted voice-control users, so rendered browser checks (`label-content-name-mismatch`) flag the mismatch even when a jsdom preflight passes; use an `<svg aria-hidden="true">` icon or visible text that matches the accessible name. Verify both programmatic required state
(`required` on native controls; `aria-required` where necessary) and visible instructions such as
“(required)” or an explained marker ([3.3.2 Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)).
Passing native validation does not prove those instructions exist.

Three things need reading beyond the HTML, and are where automated passes fail:

- **`aria-expanded` that is set once and never maintained** — read the component's JS, not the markup.
- **Contrast** — compute it. Framework and design-system token pairs aren't automatically safe:
  resolve the tokens to sRGB (converting OKLCH or other colour spaces) and calculate the rendered
  pair, not the token names. Alpha-composite translucent colours over their actual backgrounds before calculating contrast.
  For [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html),
  identify which visual information is needed to recognise the control/state. An empty text field
  may rely on its boundary; a decorative divider is not automatically subject to the same test.
  Keep control-boundary tokens separate from decorative separators when their requirements differ.
  **Text over photos, gradients or translucent panels has no single background colour**, so token maths
  can't answer it. Sample the real pixels: render the page with the text made transparent
  (`* { color: transparent !important; -webkit-text-stroke-color: transparent !important }`, `svg { visibility: hidden }`),
  collect each text run's line boxes with `Range.getClientRects()` plus its computed colour and
  effective opacity, then compare the text colour against every sampled pixel inside its own boxes.
  Report the minimum and the 10th percentile, not just the median — a headline can pass on average and
  fail over the bright part of a photo. On the product site this found white 16px body copy at 3.39–3.80 over a
  29% panel tint on a sunlit photo, which no token-level check would have caught.
- **Information only on an `aria-hidden` map** — a map is usually hidden from assistive tech
  because a list carries the same places. Anything the map adds that the list doesn't (pins for
  places filtered out of the list, a "you are here" marker) needs a text equivalent near the
  list. Measure pin and marker colours against the map ground in **every** map style the site
  switches between (a light and a dark basemap differ): on one site a dashed "not listed"
  pin ring in the disabled grey was 2.1:1 on the light basemap and was changed to the dim text
  grey (5.2:1 light, 8.1:1 dark).
- **Escape hatches** — raw-HTML blocks and embeds bypass a builder's element-level checks, and
  some disable sanitisation entirely. Audit that markup separately. Component JS can create elements
  no static read will show.

### Phase 3 — Score

```
Start at 100
  Critical: -10 each
  Major:     -5 each
  Minor:     -2 each
  Floor:      0
```

The score is a **project heuristic for the tested scope**, not a WCAG conformance percentage.
Advisories and untested criteria do not become passes. State the routes, templates, content
variants, interactive states, browsers/tools and manual checks covered. Disclose omitted screen
reader speech, zoom, text spacing, forced colours or other engines. Reaching 100 after fixing the
scored findings does not certify the whole site.

### Phase 4 — Report

Lead with the confirmed result and source URL, then the scope/coverage and heuristic score.
Group confirmed failures by severity, with separate advisories. Each finding needs the rendered
evidence, location, applicable criterion and proposed fix:

```
Heuristic score: 70/100 within tested scope — 6 confirmed major findings
Source: https://example.local/
Coverage: listed routes + menu/filter/dialog states; keyboard and rendered contrast checks
Untested: screen-reader speech, other engines, forced colours, zoom and text-spacing overrides

MAJOR (excerpt)
[M1] Header links: 2.43:1 on cream       1.4.3 → scoped contrasting text token
[M2] Empty input boundary: 1.81:1        1.4.11 → contrasting control border
[M3] Native label overridden by ARIA    2.5.3 → remove mismatched aria-label

ADVISORY
[A1] Consider naming sections intended as navigable regions
```

Rank fixes by user impact and implementation scope. After remediation, report resolved findings
and remaining coverage limits; do not turn an untested concern into a confirmed pass.

**Write the audit record** under `design/audit/` in the project: one entry per finding
(ID, severity, WCAG criterion, rendered evidence, URL + selector, fix locator, status) plus the
heuristic score, coverage and untested scope. Update the same record when Phase 6 re-verifies
fixes. If the project has no writable repository (a hosted builder with no project files), give the
record in the report and say where the user should keep it.

### Phase 5 — Fix within authorised scope

If the user requested an audit only, present findings before making changes. If they have already
asked to fix the issues, proceed within that scope without asking for the same approval again.
Surface any new aesthetic direction, external dependency/service, or broader global change that
is not already authorised. Check selector impact before retagging or changing shared components.

Fix at the source the stack uses — a component or layout file, a CMS entry, or a builder record —
through the route in the stack's adaptation. Fix shared layouts, templates and components once
rather than per page, and don't add page-level landmarks the shared layer already provides.

### Phase 6 — Re-verify

Re-fetch the rendered page **as published** and re-run the affected checks. A successful write is
not a fixed page: saving in a builder or CMS is not the same as publishing (in Etch Studio, for
example, `saveAsync()` saves the project and the public URL changes only after Publish / Deploy),
and some changes need a rebuild or a render-cache refresh. The stack's adaptation lists the steps.
Recalculate the score from the re-read, never from the fix list.

## WCAG 2.2 quick reference

**Level A** — 1.1.1 non-text content · 1.3.1 info & relationships · 2.1.1 keyboard ·
2.4.1 bypass blocks · 2.4.2 page titled · 2.4.4 link purpose · 2.5.3 label in name ·
3.3.2 labels or instructions · 4.1.2 name/role/value

**Level AA** — 1.4.3 contrast (4.5:1 text, 3:1 large) · 1.4.11 non-text contrast (3:1) ·
2.4.6 headings & labels · 2.4.7 focus visible · 2.5.8 target size (24×24)

**Level AAA** — 1.4.6 enhanced contrast (7:1) · 2.4.10 section headings · 2.5.5 target size (44×44)

## What this skill does not check

- Screen-reader behaviour (needs manual testing with VoiceOver/NVDA)
- Content readability and language level
- Third-party embedded content
- Anything rendered only under states you haven't triggered (logged-in views, error states,
  conditional branches you didn't exercise)

## References

- `references/aria-patterns.md` — implementation patterns for the interactive components
- `references/wcag-checklist.md` — the audit checklists in list form
- `references/astro-adaptation.md` — Astro: locating findings in components and content, rebuild and re-verify, token contracts
- Authoring-time checklist (if installed): `astro-build-playbook` → [cwv a11y checklist](../astro-build-playbook/references/cwv-a11y-checklist.md)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) · [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/)
