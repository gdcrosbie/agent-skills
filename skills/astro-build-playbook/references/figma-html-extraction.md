# Figma HTML Extraction & Translation Guide

## The Golden Rule: *.html Over App.tsx
When Figma Make exports code, it delivers two formats:
1. `src/App.tsx`: React JSX with hooks, synthetic event handlers, inline arrays, and Tailwind utility classes.
2. `*.html` (e.g. `site.html`): Pure static HTML with raw layout and styles.

**Always extract markup and structure from the static `*.html` file.**
- Eliminates React cleanup tax (no hooks to remove, no `className` to fix).
- Eliminates agent confusion about client islands.
- Only inspect `App.tsx` to copy out raw data structures into JSON.

## CSS Translation Rules
1. **Strip Utility Soup**: Replace utility chains (`flex flex-col items-center p-4...`) with clean BEM semantic classes (`.c-card`, `.c-card__title`).
2. **Mandatory CSS Logical Properties**:
   - `padding-block`, `padding-inline` (never top/bottom/left/right)
   - `margin-block`, `margin-inline`
   - `inset`, `inset-block-start`, `inset-inline-start`
   - `inline-size`, `block-size`, `max-inline-size`
3. **Scoped CSS**: Keep component styles inside `<style>` blocks in the component file.

## Other HTML Exports (OpenDesign, Claude Design)

Some tools export a single self-contained `index.html` (inline `<style>` and `<script>`) plus a
handoff document and a machine-readable manifest. The static HTML is still the source of truth:

- **Tokens:** take the token table from the `:root` custom properties. Record each source value
  beside the target token it maps to, so the mapping can be audited and retuned. Where the export
  uses a value inline without a token, extract it from the rule and say so in `docs/project.md`.
- **Behaviour:** port inline-script behaviours (filters, planners, downloads, toasts) to the
  target stack's native parts or this playbook's patterns rather than copying the script. Keep
  the visible states the script produced (pressed filters, empty states, result text).
- **Handoff contracts:** these files often carry generic requirements (landing-page sections, OS
  widgets, a list of required states, a viewport matrix). Treat them as a checklist and apply only
  the surfaces and states that exist in the export; don't invent missing screens to satisfy a
  template.
- **Render the export before building** and check it for defects such as invisible controls or
  failing contrast; don't copy those into the build. Audit the build against it as a live
  reference ([final design audit](verification.md#final-design-and-accessibility-audit)).

## Related Guides

- **Figma design files via the Figma MCP** (limits, file ownership, tokens and fonts, image layers, typography, snapshot): [`figma-mcp-ingestion.md`](figma-mcp-ingestion.md)
- **Layout translation** (overlaps, locked compositions, grid tracks, strokes, scoped styles, line breaks): [`layout-fidelity.md`](layout-fidelity.md)
- **Checking against the design** (numeric audit, viewport test matrix): the [final design audit](verification.md#final-design-and-accessibility-audit)
