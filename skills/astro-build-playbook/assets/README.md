# Astro baseline and verification gates

A known starting point for new Astro projects, installed on top of `npm create astro@latest`
(minimal template) by [`../scripts/install-baseline.mjs`](../scripts/install-baseline.mjs). Phase 0 of
[`../SKILL.md`](../SKILL.md) describes when to use it.

## What gets installed

| Path | Purpose |
|---|---|
| `astro.config.mjs` | `site` placeholder, static output, sitemap integration, dev toolbar off |
| `tsconfig.json` | Astro strict config with an `@/*` path alias |
| `.gitignore` | Merged line by line from `baseline/gitignore` |
| `src/layouts/BaseLayout.astro` | Skip link, canonical, Open Graph/Twitter metadata, font preloads, sitemap link, RSS link when `src/pages/rss.xml.*` exists |
| `src/pages/index.astro`, `404.astro` | Placeholder home page and `noindex` 404, each with `<main id="main-content">` |
| `src/styles/reset.css`, `global.css`, `tokens.css` | Logical-property reset, skip-link and focus styles, the two-tier token contract (see [`../references/token-contract.md`](../references/token-contract.md)) |
| `public/robots.txt`, `favicon.svg`, `images/og-default.jpg` | Sitemap origin placeholder, icon, 1200×630 default social image |
| `scripts/*.cjs` | The gates below |
| `wrangler.jsonc`, `public/_headers` | Only with `--host cloudflare-workers`, after the host is confirmed |

## Gates

| Script | Checks | Needs |
|---|---|---|
| `test:docs` | Local links in `README.md`, `AGENTS.md`, `docs/`, `skills/` resolve | — |
| `test:tokens` | Required semantic tokens exist in `tokens.css`; every `var()` in `src/` without a fallback resolves to a defined custom property; components in `src/components/` don't consume a raw palette token (one that a `--color-*` alias points at) | — |
| `test:contrast` | Semantic colour pairs in `tokens.css` meet WCAG 2.2 AA, including text on `--color-surface-tint`, every `--color-on-<role>` on its `--color-<role>` ground, and every `.c-surface-*` contextual surface block in `tokens.css` or `global.css` | — |
| `check` | `astro check` | `@astrojs/check`, `typescript` |
| `test:discovery` | On every page, no `href="#"` and every root-relative link resolves to built output. Canonical matches `site` and social metadata is present. Indexable (default): 404 `noindex`, sitemap, posts and RSS coherence. With `"indexable": false` in `src/data/site.json`: every non-indexable layer (see [hosting §4](../references/hosting-and-indexing.md#4-non-indexable-sites-demos-staging-client-previews)) | `jsdom` |
| `test:csp` | Built scripts against the actual global external-script CSP; allowed origins, local assets, inert JSON, blocked inline scripts/handlers/JavaScript URLs. Reports SKIP without a detected policy; see [scope and host options](../references/hosting-and-indexing.md#strict-csp-and-progressive-enhancement) | `jsdom` |
| `test:social-image` | Default social image is a 1200×630 JPEG and declared as such | `jsdom` |
| `test:a11y` | axe-core on every built page (a preflight, not the audit) | `axe-core`, `jsdom` |

The installer adds these devDependencies plus `@astrojs/sitemap` and the two `@fontsource-variable`
fonts the baseline tokens use. `test:forms` is not part of the baseline: a project that adds a contact
form (see [`../references/forms-and-submissions.md`](../references/forms-and-submissions.md)) adds its
own `test:forms` (the [contact-form recipe](../references/recipe-contact-form.md) provides one) and appends it to `test`.

## Replace before launch

- [ ] Project identity and package metadata belong to the new site.
- [ ] `site` in `astro.config.mjs` and the sitemap origin in `public/robots.txt` are the production domain.
- [ ] Default title, description, social image and image alt in `BaseLayout.astro` are replaced.
- [ ] Placeholder home page, tokens and fonts match the approved design.
- [ ] Replaced fonts: Fontsource dependencies (or local font files), imports and preloads in `BaseLayout.astro`, and `--font-display`/`--font-body` are updated; only the subsets and weights the site uses are retained; the rebuilt site shows no layout shift; `test:tokens` and `test:contrast` pass.
- [ ] Form handling and every external runtime request (analytics, embeds, CAPTCHA, form provider) have an owner and a privacy basis.
- [ ] Success, error, keyboard, no-JavaScript and responsive journeys have been checked under production response headers; every affected enhancement has an observable result, including filters and planners. A CSP gate SKIP needs host-policy review, not a passing-CSP claim.
- [ ] Host config matches the chosen host; files the host doesn't read are removed (some hosts serve an unread `public/_headers` as a public file). Environment variables and secrets are set in each deployment environment.
- [ ] Indexing intent is explicit (see [`../references/hosting-and-indexing.md`](../references/hosting-and-indexing.md)).
- [ ] `docs/project.md` records the baseline commit and the decisions made in Phase 0.
- [ ] `npm test` passes against the final production build.
