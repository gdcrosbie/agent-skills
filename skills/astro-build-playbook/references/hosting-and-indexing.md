# Hosting, Response Headers & Indexing Control

Static Astro output is host-agnostic, but **response headers, redirects, trailing-slash behaviour and serverless functions are not**. Each host reads its own configuration file and ignores the others. This guide covers the hosting decision gate, the per-host equivalents, live verification, and the pattern for sites that must never be indexed.

**EmDash branch:** EmDash uses server-rendered Astro. Read [emdash.md](emdash.md) for its adapter, database/media bindings and runtime checks. The static-only Cloudflare no-`main` recipe below does not apply. Verify headers and routing on dynamic responses as well as static assets; do not assume an asset header file configures server responses. Preserve a deployment host already chosen by the user.

---

## 1. The Hosting Decision Gate (Phase 0)

The baseline installs `public/_headers` for caching and security when run with `--host cloudflare-workers` (see [`../assets/README.md`](../assets/README.md)). When Cloudflare is the chosen host, prefer **Workers with Static Assets** for new projects. **Cloudflare Pages remains supported for existing deployments**; do not migrate an existing project solely to follow this preference. A purely static Workers deployment uses `wrangler.jsonc` and `public/_headers`; add a `main` entrypoint only when runtime routes are required.

**STOP and confirm the deployment host before Phase 6.** Don't assume Cloudflare.

> *"Where will this site be deployed?*
> 1. *Cloudflare Workers (Static Assets)* (`wrangler.jsonc` + `public/_headers`, `public/_redirects`; or existing Cloudflare Pages)
> 2. *Other* (another platform, GitHub Pages, S3/CloudFront, nginx…): headers, redirects and functions set in that host's own config."*

This skill details Cloudflare Workers. For another host, translate the same header set, redirect
rules and form endpoint into that host's configuration, then **remove config files the chosen host
doesn't read** (`public/_headers`, `wrangler.jsonc`).

> [!WARNING]
> **A host that doesn't read `public/_headers` may serve it as a public file** at `/_headers`, exposing your header policy while applying none of it. This has shipped to production on a real project. Delete it when the host doesn't use it.

---

## 2. Per-Host Configuration Equivalents

### Cloudflare Workers (Static Assets): `wrangler.jsonc` + `public/_headers`

Cloudflare's dashboard (**Compute → Create**) defaults to **Workers** (with Workers Builds running `npm run build` followed by `npx wrangler deploy`). For a purely static Astro site with no runtime routes, commit a root `wrangler.jsonc` with **no `main` entry** (and add `.wrangler/` to `.gitignore`):

```jsonc
{
  "name": "<project-name>",
  "compatibility_date": "2025-09-01",
  "workers_dev": true,
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page",
    "html_handling": "auto-trailing-slash"
  }
}
```

> [!IMPORTANT]
> **Why `wrangler.jsonc` is mandatory on Cloudflare Workers:**
> - **The Wrangler 4.68+ Astro autoconfig trap:** If you import an Astro repository into Cloudflare Workers without a `wrangler.jsonc`, Wrangler's automatic framework configuration detects `"astro"` in `package.json`, assumes SSR (`@astrojs/cloudflare` with `main: "dist/_worker.js/index.js"`), and opens an autoconfig PR on GitHub instead of deploying `main` — leaving the Worker shell undeployed with **"No active routes"**. Even worse, if you merge that SSR PR, Worker-generated responses bypass `public/_headers`.
> - **`workers_dev: true`:** Enables the `<project-name>.<subdomain>.workers.dev` route automatically once the first `wrangler deploy` step finishes (the dashboard shows `workers.dev: Disabled` while the initial CI build is still in progress).
> - **`not_found_handling: "404-page"` & `html_handling: "auto-trailing-slash"`:** Instructs Workers Static Assets to serve `dist/404.html` with HTTP status `404` for unknown routes and redirect `/about` (`307`) to `/about/`.
> - **Zero-invocation `_headers` parsing:** For this asset-only configuration, Workers Static Assets serves `./dist` directly at the edge, parses `dist/_headers` (copied from `public/_headers`), applies the rules to all asset and HTML responses, and never exposes `/_headers` as a public file (`/_headers` returns `404`).

Pair `wrangler.jsonc` with `public/_headers` (also used by existing Cloudflare Pages):
```text
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

#### Strict CSP and progressive enhancement

When a site uses `Content-Security-Policy: script-src 'self'` without
`'unsafe-inline'`, a script that is emitted inline is blocked. Before adding an
interactive Astro component, inspect the built HTML and confirm whether its
script is external or inline; integrations and `is:inline` can change this.

Astro can inline a small **processed** component script during production bundling,
even without `is:inline`. Source markup alone does not establish CSP compatibility.
On a strict static build, keep native component scripts processed while preventing
asset inlining in the file-owned Astro config:

```js
vite: { build: { assetsInlineLimit: 0 } },
```

Verified with Astro 7.3.3. This setting also affects other small
assets, including CSS; inspect the resulting requests. Preserve existing Vite
options and confirm behaviour against the installed Astro version. Do not patch a
builder-generated component to change its emitted script tags.

Shared progressive-enhancement behaviour can also live in a same-origin external
asset, for example:

```astro
<script is:inline src="/scripts/site-interactions.js" defer></script>
```

`defer` keeps the script from querying page controls before the document has
been parsed. Do not weaken the policy with `'unsafe-inline'` merely to support
component scripts. Nonce- or hash-based CSP is valid where genuinely required,
but must be generated and verified by the selected host/runtime; it is not a
drop-in static-site default. Verify interaction on the deployed origin, not
only in development, because the header is host-configured.

Use the [static CSP gate](../scripts/gates/test-csp.cjs) after the production build.
It reads an enforced global policy from `dist/_headers` or `vercel.json`, checks
all built pages, rejects executable inline scripts/handlers and JavaScript URLs,
resolves same-origin script files, and permits inert JSON data. Effective
`script-src-elem`/`script-src-attr` directives take precedence over `script-src`
and `default-src`. Simple HTTP(S) origins, wildcard subdomains and scheme sources
are supported; remote scripts are checked against the allowlist, not downloaded.

This is a conservative external-script preflight, not full CSP evaluation. Hash,
nonce, path-scoped or `strict-dynamic` sources, HTML base URLs and route-specific
policy overrides fail with a request for tailored checks. Module imports and remote
script availability still require browser verification. A missing policy reports **SKIP**, not
CSP success. For other hosts, pass `--policy-file <file>` containing the actual
response policy; use `--origin <production-origin>` when canonicals do not identify
the serving origin. Do not create an independently maintained policy copy or
assume `_headers` applies on an unsupported host. Confirm the deployed response
and [exercise the affected interactions](verification.md#interaction-verification).

#### Preview builds and version URLs are separate controls

Disabling branch preview builds in Workers Builds does not disable version preview URLs. When only the production `workers.dev` address is wanted, also commit `"preview_urls": false` in `wrangler.jsonc`. Wrangler 4.147.0 warned that version URLs otherwise defaulted to enabled with `workers_dev: true` in the tested deployment. See [Cloudflare version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/). Preserve preview access when it is part of the user's selected workflow.

Where the controls are (dashboard, 2026-10-24): **Settings → Build** has **Production** and **Previews Base** tabs. Turn preview (non-production branch) builds off with **Disable builds** on the **Previews Base** tab; the toggle with the same name on the **Production** tab also stops `main` deploys. Cloudflare's docs call this **Branch control → Enable Preview Builds**, which that dashboard didn't show, so confirm against the user's screen. New Workers default the preview command to `npx wrangler preview` (open beta in Wrangler 4.152.0), which fails unless `wrangler.jsonc` has a `previews` block; `npx wrangler versions upload` creates a version URL instead.

#### Build-token permissions: review and verify the actual connected token

Cloudflare's automatically generated Workers Builds token can include many services unrelated to a static Astro deployment. Inspect the current permission summary rather than assuming the generated token is minimal. Match permissions to the project's bindings and routes; a custom domain, storage binding or other service can require more than the example below.

**Verified on one build, 2026-10-03:** an automatic Git-connected deployment using Wrangler 4.147.0 succeeded after reducing the connected user token to **Main Account → Workers Scripts: Edit only**, with the account ID explicit in Wrangler, Static Assets plus an OAuth handler, no custom-domain routes or storage services, and **Build cache disabled**. The dashboard had requested `Artifacts` read/write permissions for its cache. This is a tested configuration, not a universal minimum: if caching is wanted, review its current permissions; if a deployment fails, identify the missing permission before expanding access.

That user-token scope still covers Workers across the selected account; it is not per-Worker isolation. On that build the dashboard did not offer a separately created user token in the Workers Builds selector, even after refresh; editing the already connected build token's permissions worked. This was a dated UI observation, not a permanent Cloudflare restriction.

**Verified on Astro Design Kits, 2026-10-09, Wrangler 4.149.0:** a separately created user token with only **Main Account → Workers Scripts: Edit** became selectable after registration through `POST /accounts/{account_id}/builds/tokens` and a dashboard reload. Registration supplied `build_token_name`, `build_token_secret` and `cloudflare_token_id`; the latter was obtained by verifying the approved token. An actual push-triggered static-assets deployment succeeded with **build caching enabled**. The Custom Domain and redirects were managed separately and remained connected after redeployment. This is another tested configuration, not a universal permission minimum or a guarantee about future cache permissions.

When using this path, inspect the current API schema and selector eligibility before creating credentials. Register only the authorised token with the intended account's Workers Builds service. Keep secrets out of logs, screenshots and repository files; remove temporary transfer files after registration. Avoid leaving unused credentials behind. After connecting or changing a token, verify an actual Git-triggered deployment and its commit, not only a local dry run. A token-creation approval does not authorise unrelated permissions or services.

#### Builds API authentication and deployment authentication

A working Wrangler deployment credential does not establish access to the Workers Builds API. Check the permissions of the existing connector or CLI session before choosing a registration path. Use the current [Builds API documentation](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/) and API schema; credential support and permission names can change.

**Verified on the puzzle-generator app, 2026-10-10, Wrangler 4.146.0:** the connected API session could configure Builds but could not manage user tokens; existing Wrangler OAuth authentication was rejected by the Builds API. The approved deployment token was created with Workers Scripts: Edit and temporary Workers Builds Configuration: Edit on the selected account. The token authenticated its own registration through `POST /accounts/{account_id}/builds/tokens`; the temporary permission was then removed before connecting the production trigger. Two real push-triggered deployments succeeded with Workers Scripts: Edit only and build caching disabled.

Temporary registration permission is only needed for a path that requires it. When an existing authorised credential can register the deployment token securely, use that credential and create the deployment token with its final permissions. Keep the token's secret out of command arguments and tool output as well as logs, screenshots and Git.

#### Reproducible Git builds

Pin a supported Node version tested with the project's locked dependencies. On Workers Builds, commit `.node-version` or configure `NODE_VERSION`, then verify the detected version in the build log. The puzzle-generator app used Node 22.23.2; this is a tested project version, not a default for every Astro project.

A major-only pin works on Workers Builds: on 2026-10-24 an `.nvmrc` of `24` resolved to `nodejs@24.22.1`. The same build installed `npm@10.9.2`, the build image's own npm rather than the one bundled with that Node release, so npm 11+ `allowScripts` has no effect there and install scripts run unfiltered. A `NODE_VERSION` build variable in the dashboard overrides the committed pin and isn't visible from the repo; check **Settings → Build → Variables and secrets** whenever the build log's Node version doesn't match the pin.

Pin the deployment CLI as well: use the project's existing pinned Wrangler dependency, or a versioned command such as `npx wrangler@<tested-version> deploy`. Do not add a dependency just to pin a CLI already available through the authorised deployment path. For projects with these scripts, `npm test && npm run check && npm run build` makes failed checks prevent deployment. Run Astro check/sync and build sequentially because they share generated state and Vite caches.

When content or formatting depends on local event time, pin the same `TZ` in every
job that builds and verify the emitted timestamps against the event/calendar.
Prefer explicit instant offsets and explicit formatting timezones when the content
contract permits; see [date/time content](content-collections.md#date-and-time-content).
The runner's default timezone is not an event timezone. Node and dependency pins
alone do not make timezone-dependent output reproducible.

#### One deploy path per Worker (the late-build race)

Git-connected Workers Builds and a manual `npx wrangler deploy` both create deployments on the
same Worker, and **whichever finishes last goes live, not the newest commit**. Never mix them.

What happened on `3d-lab` (2026-09-30): Workers Builds queued for 17–20 minutes (and hung at
"Initializing" on the first attempts), so manual deploys were used to keep moving. The queued
build of an older commit then landed **18 seconds after** a manual deploy of a fix and silently
rolled it back. Two later pushes never triggered a build at all. Nothing in the dashboard flagged
the rollback; it was found by comparing hashed chunk names.

Pick one path per Worker at the hosting gate, and record it in the project docs:

| Path | Use when | Set-up |
| --- | --- | --- |
| **Git-connected builds only** | Cloudflare's builds are prompt for this account | Never run `wrangler deploy` by hand against that Worker. |
| **Manual only** | Builds are slow or unreliable; one person deploys | Disconnect Git (Worker → **Settings → Build**). Deploy from a clean `main` after pushing, with `--message "<sha>: <summary>"`. |
| **GitHub Actions** | Automatic deploys wanted, in commit order | Disconnect Git; build every push, deploy `main` with a concurrency group (below). Needs a `CLOUDFLARE_API_TOKEN` repo secret, which the user creates. |

Prefer GitHub Actions: its test job gates the deploy. Choosing
Git-connected builds instead (for example a client site where every CMS save is a deploy and
Actions minutes matter) means keeping a gate some other way. Both options below were recorded
2026-10-17 as proposals; the first was verified 2026-10-24, the second is still untested:

- **Gate in the build command.** Set Workers Builds' build command to `npm test && npm run build`,
  or make the build script run the checks. A failing command should stop the build before the
  deploy command runs. On the first real push, confirm that a deliberately failing check leaves
  the previous deployment live. **Verified 2026-10-24** on a Sveltia-backed static site with
  `npm test && npm run build`: a passing suite (jsdom and axe-core, no browser) built and
  deployed. A commit that failed the first check (`test:docs`) failed the Workers Builds build;
  the deployment list and the live page stayed on the previous version. Reverting it built and
  deployed normally. When `npm test` already runs the build, use `npm test` alone; the extra
  `npm run build` builds twice.
- **Tests in Actions, deploys in Workers Builds.** A workflow with the test job and no deploy,
  required as a status check on `main`. This gates only changes that reach `main` through pull
  requests. Workers Builds still deploys every direct push, and a Git CMS commits straight to
  `main` unless it opens pull requests (Sveltia's editorial workflow). Otherwise the check only
  reports a failure after the deploy.

**Verified on a static Workers Static Assets site, 2026-10-16, Wrangler 4.146.0.** A `build`
job runs on every push and PR; a `deploy` job ships that job's artifact from `main`, so what
deploys is exactly what was built:

```yaml
on:
  push: { branches: [main] }
  pull_request:
  workflow_dispatch:

permissions: { contents: read }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version-file: .node-version, cache: npm }
      - run: npm ci
      - run: npm run build          # add the project's test/check commands before this
      - uses: actions/upload-artifact@v7
        with:
          name: dist
          path: dist
          include-hidden-files: true  # otherwise dist/_headers is left out
          retention-days: 7

  deploy:
    needs: build
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    # At most one deploy runs; a newer push cancels an older run, so an old commit can't land last.
    concurrency: { group: production-deploy, cancel-in-progress: true }
    environment: { name: production }
    steps:
      - uses: actions/checkout@v7       # for wrangler.jsonc
      - uses: actions/download-artifact@v8
        with: { name: dist, path: dist }
      - uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          wranglerVersion: "<tested-version>"
          command: deploy --message "${{ github.sha }}"
```

- **Credentials:** put `account_id` in `wrangler.jsonc`; the only secret is then
  `CLOUDFLARE_API_TOKEN`, scoped to **Account → Workers Scripts: Edit** on that one account
  (no zone permissions for a `workers.dev`-only site). The user creates the token and adds it
  with `gh secret set CLOUDFLARE_API_TOKEN --repo <owner>/<repo>`, which prompts for the value
  and keeps it out of shell history.
- **Action versions:** these are the Node 24 majors; Node 20 majors emit deprecation
  annotations. Their breaking changes don't affect this pattern: setup-node v5+ caches
  automatically (already `cache: npm`); download-artifact v5/v8 change by-ID and unzipped
  downloads and now fail on a digest mismatch; wrangler-action v4 only changes the default
  Wrangler version, which pinning `wranglerVersion` overrides.
- **Runner image:** `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19. Pin a version
  (e.g. `ubuntu-24.04`) if an unannounced image change matters.
- **Watching the run:** the run appears a few seconds after the push, so
  `gh run list --commit <sha>` straight away can return nothing. List again before watching.
- **First deploy when the secret comes later:** pushing before the user has added
  `CLOUDFLARE_API_TOKEN` lets the `build` job prove the gate on the runner. The `deploy` job then
  fails at Wrangler with "it's necessary to set a CLOUDFLARE_API_TOKEN", and nothing reaches
  Cloudflare. Once the secret exists, `gh run rerun <run-id> --failed` reruns `build` (the
  artifact belongs to the rerun attempt) and then `deploy`. Verified 2026-10-25 on a
  prototype. That deploy is the Worker's first, so the Access timing below applies.

**Diagnosing which commit is live:**
- `npx wrangler deployments list`: manual deploys carry their `--message`; Git builds show `Message: -`.
  A manual deploy without `--message` looks the same as a Git build there (both show
  `Source: Unknown (deployment)`), so match timestamps against the check run instead.
- `gh api repos/<owner>/<repo>/commits/<sha>/check-runs`: a Git build leaves a
  `cloudflare-workers-and-pages` check named `Workers Builds: <worker>`, and its `completed_at`
  lands within seconds of the deployment it created. The check appears only once the build is
  queued, so a missing check straight after a push proves nothing; only a check still missing
  after several minutes means the push never triggered a build.
- Two deployments seconds apart for one commit means two deploy paths are in use.
- A page added by the push that returns 404 straight afterwards is usually the previous
  deployment still serving. Follow the check to completion before acting. On a personal site
  (2026-10-05), a new article's 404 with no check yet was read as a failed Git build; the manual
  deploy that followed landed 23 seconds after the Git build had already deployed it.
- Compare a hashed chunk name in the live HTML or JS with the local `dist/_astro/` for the commit
  you expect. It's the only check that proves which code is being served.

### Redirects & Trailing Slashes (`astro.config.mjs` vs `_redirects`)
- **Host-level redirects (`public/_redirects`):** On Cloudflare Workers Static Assets and Cloudflare Pages, `public/_redirects` performs edge redirection before Worker execution.
- **SSR/Astro-level redirects (`astro.config.mjs`):** Under server-rendered Astro (`output: "server"`), declare redirects directly in `astro.config.mjs`:
  ```js
  export default defineConfig({
    trailingSlash: 'always',
    redirects: {
      '/winery/': { status: 301, destination: '/our-story/' },
    },
  });
  ```
- **Trailing-slash duplicate key collision:** Never declare both `/route` and `/route/` keys in `astro.config.mjs`. Astro normalizes trailing slashes automatically; defining both causes route collision build errors (`The route "/..." is defined in both "/..." and "/.../". A static route cannot be defined more than once.`). Always define only the canonical key matching your site's `trailingSlash` convention.

### Forms by host
The [forms guide](forms-and-submissions.md) uses a shared submission handler with a Workers router, and a Pages wrapper for existing deployments. Static pages stay static even when a Worker handles form submissions. Keep the same contract (static form, server-side validation, honeypot + timestamp, dual 303/JSON response) and on another host, port the endpoint to that host's function convention. Turnstile works on any host.

---

## 3. Verify Against the Live Deployment (Phase 7)

A passing `npm run build` proves nothing about headers. **After the first deploy, fetch the real responses:**

```bash
U=https://<production-url>
for p in / /about /about/ /_headers /robots.txt /does-not-exist/; do
  printf '%-18s ' "$p"
  curl -s -o /dev/null -D - "$U$p" | tr -d '\r' \
    | grep -iE '^HTTP|^location|^x-robots-tag|^x-frame-options|^x-content-type|^cache-control' | tr '\n' '|'
  echo
done
```

Check:
- security headers are present on pages **and** assets;
- `/_headers` returns 404 on hosts that don't consume it;
- no-trailing-slash URLs redirect to the canonical form;
- unknown routes return 404 with the custom page;
- `/_astro/*` is immutable.

On Cloudflare Workers, run the same loop against the built `dist/` under `npx wrangler dev`
(with `U` set to its local URL) **before the first deploy**. It applies `_headers`, the 307
trailing-slash redirect, the `/_headers` 404 and 404 handling as Static Assets will, so
configuration mistakes surface before anything is public. It does not replace the live check.

Test the **production alias and custom domain**, not only the per-deployment URL. Protected preview URLs return an SSO 302 and hide the site's real headers.

On Cloudflare Workers, the first requests in the seconds after a deploy can return Cloudflare's own placeholder 404 (with `x-frame-options: SAMEORIGIN` and `cache-control: private, no-store`, not your `_headers` set). Wait about 10 seconds and check again before debugging. Also confirm the **live commit**, not only the headers: see *One deploy path per Worker* in §2.

---

## 4. Non-Indexable Sites (Demos, Staging, Client Previews)

When a site **must never be indexed or searchable**, treat it as a requirement with automated checks, not a meta tag. Use four layers:

1. **Site flag → meta on every page.** Add `"indexable": false` to `src/data/site.json`. In `BaseLayout.astro`, emit the robots meta whenever the flag is false, not just when a page passes `noindex`:
   ```astro
   ---
   const robotsNoindex = noindex || !site.indexable;
   ---
   {robotsNoindex && <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />}
   ```
2. **Response header** covering non-HTML files (images, PDFs): `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` in the host config (§2).
3. **`public/robots.txt`:**
   ```text
   User-agent: *
   Disallow: /
   ```
4. **No discovery surfaces.** Uninstall `@astrojs/sitemap` and `@astrojs/rss`, and remove `<link rel="sitemap">` and RSS auto-discovery links.

The baseline `test:discovery` gate switches to these checks when `src/data/site.json` has
`"indexable": false`, so each layer fails the build if removed. It asserts:
- every built HTML page has the exact robots meta;
- `robots.txt` has `Disallow: /` and no `Allow` or `Sitemap` lines;
- the host config (`dist/_headers`, `vercel.json` or `netlify.toml`) sends `X-Robots-Tag`;
- no `sitemap-*.xml` or `rss.xml` is in `dist/`, and no page links to one.

> [!IMPORTANT]
> **These directives only bind well-behaved crawlers, and they partly conflict.** `Disallow: /` stops compliant crawlers from fetching pages, so they never see the page-level `noindex`. A URL linked from elsewhere can then appear in results without content. The header and meta remain the authoritative signals. **If the content must be private, use access control** (Vercel Deployment Protection extended to production, Netlify password protection, Cloudflare Access), and say so to the user. Don't present `noindex` as privacy.

**Cloudflare Access on `workers.dev` comes after the first deploy.** It is enabled per Worker
(Worker → **Settings → Domains & Routes → workers.dev → Enable Cloudflare Access**), so it
can't be switched on until the Worker exists, and the first deploy is publicly reachable until
it is (verified 2026-10-16). Tell the user before that deploy, then enable Access immediately
after it and confirm an unauthenticated request is redirected to the Access login. If even a
brief exposure matters, plan an exposure-free sequence with them first.

**Zero Trust One-time PIN prerequisite:** If protecting a private demo or review site via email
rules (`Emails: user@example.com`), **One-time PIN (OTP)** must be enabled as an active login
method on the Zero Trust account (**Zero Trust → Settings → Authentication → Login methods →
Add new → One-time PIN**). Without this enabled in Zero Trust settings, email-based PIN
authentication fails and users will not receive a login code. In the Access application itself,
ensure **One-time PIN** is checked under **Identity providers / Login methods** alongside any
corporate IdPs.

Check more than `/`. **Verified 2026-10-25** on a prototype: with Access on,
`/`, a placeholder route, `/robots.txt`, `/_astro/` and an image all returned `302` to
`<team>.cloudflareaccess.com`. Record the team domain in the project docs. Take the live
header check (§3) *before* enabling Access, since protected responses only show the redirect.

For a normally indexable site, keep the baseline defaults: sitemap, `robots.txt` pointing at `sitemap-index.xml`, and `noindex` only on 404 and placeholder routes.
