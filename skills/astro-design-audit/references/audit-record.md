# Audit inputs and record

What a build hands to this audit, and what the audit leaves behind. It applies whichever agent,
skill or person built the Astro site.

## Inputs at hand-off

Collect these before measuring. Where an item is missing, ask for it or record it as a coverage
gap; don't guess.

| Input | Examples |
|---|---|
| **Where to audit** | The deployed or preview URL(s), or the command that serves the built output (`astro preview`, `npx wrangler dev`). The rendered page, never the dev server alone. |
| **Coverage** | Routes, templates, content variants (empty, long, missing optional fields) and interactive states (menus, dialogs, filters, form success and errors, colour modes). |
| **Design evidence** | Where the captured source lives, e.g. `design/figma/` or an HTML export folder, plus the frame or node IDs and the capture date. |
| **Token source** | The file that defines colours, type and spacing: `src/styles/tokens.css`, a bridge to supplied tokens, or a component framework's variables. |
| **Decision log** | Where accepted deviations and decisions are recorded, e.g. the project's `project.md` or `docs/project.md`. |

## The record

Write one record per audit under `design/audit/` in the project, named by date, audit and scope,
e.g. `design/audit/2026-10-15-design-home.md`. Update the same file when re-verifying fixes from
that audit.

Start with the URL(s) and the build or commit audited, the date, and the tools used. Then record:

- design source, frame or node, and capture date;
- reference viewport and effective layout width;
- selectors measured, each with its fix locator (the `.astro` file or content entry);
- before/after deltas and their causes;
- accepted token substitutions or fidelity exceptions, including fixed reference defects;
- responsive behaviours the source did not specify;
- what was not covered (widths, states, routes).

Accepted deviations also go in the decision log, so the next build or audit sees them. If an
accessibility audit runs alongside (for example the `accessibility-audit` skill), keep its record
beside this one, e.g. `design/audit/2026-10-15-a11y-home.md`.
