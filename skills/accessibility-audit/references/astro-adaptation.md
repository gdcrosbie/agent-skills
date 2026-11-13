# Astro accessibility audit adaptation

How the stack-neutral audit in [`../SKILL.md`](../SKILL.md) applies to Astro sites. The workflow, severity classes, scoring and report format live in the core skill.

## When it applies

The project has `astro.config.*` and `astro` in `package.json`. If it is built on a component
framework with its own contract, that contract governs where fixes go; the Astro measurement and
browser checks still apply.

## Locating findings

- Map each rendered element back to `src/components/*.astro`, `src/layouts/` (skip link and
  landmarks normally live in the base layout) or the page in `src/pages/`.
- Text, alt values and link labels may come from content collections (`src/content/`, `src/data/`)
  or a CMS entry rather than the component. Locate the record before editing markup.
- Component styles are scoped: a rule in a parent that targets a child component's class needs
  `:global()`, and a fix in the wrong file may not apply at all. Confirm the winning rule in the
  served CSS.

## Fixing and re-verifying

- Fix in code, rebuild, and re-verify on `astro preview`, `npx wrangler dev`, or the deployed URL. Don't rely on the dev
  server alone when the issue involves built CSS (bundling, scoping, ordering or minification) or response headers.
- `npm run test:a11y` (axe on prerendered output) is a preflight, not the audit. A clean axe run
  says nothing about contrast over images, focus visibility, keyboard behaviour or label wording (`label-content-name-mismatch` requires a layout engine and only runs in a real browser).
- When running Playwright + `axe-core` against a preview or deployed server that enforces `Content-Security-Policy: script-src 'self'`, do not use `page.addScriptTag({ content: axeSource })` — it injects an inline `<script>` tag that the page's CSP blocks. Evaluate the bundle directly in the CDP execution context (`await page.evaluate(axeSource)`) before calling `await page.evaluate(() => window.axe.run())`.

## Interactive behaviour

- **Script deduplication:** `<script>` tags in `.astro` components are bundled and run once per
  page, whatever the instance count. Check that `aria-expanded` and other state handling works on
  every instance (`querySelectorAll`, or custom elements), not just the first. If the
  `astro-build-playbook` skill is installed, see its
  [interaction decisions](../../astro-build-playbook/references/interactions.md).
- **Expected behaviour:** where a pattern is covered by the `astro-ui-patterns` skill ([index](../../astro-ui-patterns/SKILL.md), if installed)
  (drawer, modal, tabs, accordion, theme toggle and others), its spec is the behaviour contract to
  audit against.

## Tokens

Check the project's actual token contract before judging colour or focus findings: the baseline
`src/styles/tokens.css`, a bring-your-own-tokens file with its semantic alias bridge, or a
framework's own token file. Never assume ACSS. `npm run test:contrast`, where present, checks declared
semantic pairs only; rendered pairs over images and translucent surfaces still need the core
skill's pixel method.
