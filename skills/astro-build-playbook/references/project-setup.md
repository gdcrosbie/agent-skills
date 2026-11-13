# New-project setup

Read this for scaffolding and the Phase 0 decisions. Existing projects use their recorded
contract; read only the relevant procedure.

### Phase 0: Seed from a Known Baseline
Never start from an empty folder. Select the base matching the project requirements:

| Base | Command | Best For | Ingestion Gate Path |
| :--- | :--- | :--- | :--- |
| **Astro minimal + this skill's baseline** | `npm create astro@latest -- --template minimal`, then [`scripts/install-baseline.mjs`](../scripts/install-baseline.mjs) | Builds that need this playbook's gate suite (`test:tokens`, `test:contrast`, `test:discovery`, `test:social-image`, `test:a11y`), its OKLCH two-tier fluid token contract, or its BaseLayout (skip link, metadata, sitemap). | Path 1 (BYOT with bridge), Path 2 (Design Ingestion), or Path 3 (Baseline Defaults) |
| **Official Astro Starters** | `npm create astro@latest -- --template <name>` or `@astrojs/starlight` | Specialised or un-opinionated foundations (e.g. Starlight for pure documentation, or other templates when an alternative architecture is explicitly requested). | Path 1 (BYOT) or Path 2 (Design Ingestion) |

> [!NOTE]
> **Default:** Astro minimal plus this skill's baseline. External token systems (Automatic.css, GenCSS, Open Props) are supported via the **Semantic Alias Bridge** (Path 1: BYOT). Consult [`token-contract.md`](token-contract.md) before building.

0. **Content and runtime decision**: Surface **no CMS**, **Sveltia** and **EmDash** as the standard Astro options when starting a build; preserve any choice already made. Use the matrix in [`references/git-cms.md`](../references/git-cms.md). No CMS and Sveltia normally use static output. EmDash uses server output with an adapter and database/media storage; read [`references/emdash.md`](../references/emdash.md) before installing the baseline or configuring hosting. This choice is independent of the approved design system. Other CMSs remain available when explicitly selected.

**Colour-mode decision:** For each new build, ask whether the site should use **light only**, **dark only**, or **light/dark switching**. Preserve an explicit decision already supplied in the brief or conversation rather than asking again. Record the choice in `docs/project.md`. For existing-project work, consult the recorded decision and ask if colour-mode scope remains unresolved.

Suggested question: "Should this site use light only, dark only, or light/dark switching? For switching, I recommend following system preference initially and remembering the visitor's explicit choice."

When switching is selected, confirm its scope and any missing palette direction before implementation. Independently styled examples, embedded previews and distributed kits retain their own colour-mode contract unless their inclusion is explicitly selected. If the `astro-ui-patterns` skill is installed, load its [theme-toggle recipe](../../astro-ui-patterns/components/theme-toggle.md) for the approved enhancement.

1. **Hosting Decision Gate**: Confirm the deployment host before scaffolding, so the installer adds only that host's config. For static output on **Cloudflare Workers (Static Assets)**, ensure a root `wrangler.jsonc` (`assets.directory: "./dist"`, `not_found_handling: "404-page"`, `html_handling: "auto-trailing-slash"`, `workers_dev: true`, and **no `main` entry for asset-only deployments**; add a scoped Worker entrypoint for authorised runtime routes) is present alongside `public/_headers` (and `.wrangler/` in `.gitignore`) so Wrangler 4.68+ autoconfig does not open an `@astrojs/cloudflare` SSR PR or leave the Worker with no active routes. On a host that doesn't read `_headers`, it can be served publicly, so remove `public/_headers` (and any `wrangler.jsonc`) and use that host's own config. On Cloudflare, also settle **one deploy path per Worker** (Git-connected builds, manual `wrangler deploy`, or GitHub Actions): mixing them lets a late build of an older commit silently roll back a newer deploy. For EmDash, use the SSR adapter and bindings described in `references/emdash.md`; do not apply the static-only no-`main` recipe. Also ask whether the site must be **non-indexable** (demo, staging, client preview). See `references/hosting-and-indexing.md`.
2. **Scaffold and install the baseline** *(baseline projects)*. `<skill>` is this skill's folder:
   ```bash
   npm create astro@latest <project-name> -- --template minimal --no-install --no-git --skip-houston --yes
   node <skill>/scripts/install-baseline.mjs <project-name> --overwrite [--host cloudflare-workers]
   cd <project-name> && npm install && npm test
   ```
   `--overwrite` is for a fresh scaffold only: it replaces the template's placeholder files. Pass `--host cloudflare-workers` only when that host was chosen in step 1; for other hosts, add their config per `references/hosting-and-indexing.md`. The installer adds the gate scripts and their dependencies to `package.json` and records the skill version in `docs/project.md`, so later baseline changes can be reviewed as a diff. The baseline is static output: for EmDash, read `references/emdash.md` before installing and adjust `astro.config.mjs` for the adapter. See [`assets/README.md`](../assets/README.md) for what it installs and the replace-before-launch checklist.

   Use `npm` and keep `package-lock.json` authoritative. Don't switch package managers without an explicit project decision.

   For an explicitly selected official Astro starter, use `npm create astro@latest <project-name> -- --template <template-name>` instead, and install gates individually only where they match its contract.

   If implementation already exists in a handoff directory, preserve it: scaffold and install the baseline in a new directory first, then import the working files as a project commit on top. Preserve any existing local history; do not reset commits or overwrite working files to adopt the baseline.
3. **Resolve repository boundaries before creating Git state.** Check the project root and
   ancestors, then recursively inspect existing child folders for repositories/worktrees
   (both `.git` directories and `.git` files). Reuse the relevant boundary; do not wrap child
   repositories in an outer repository or initialise a nested one. Only when none exists,
   initialise locally at the project root:
   ```bash
   git init && git add -A && git commit -m "chore: scaffold Astro baseline"
   ```
   Creating local Git state does not authorise a GitHub repository, remote or push. Only when
   GitHub creation was requested, use the owner's account/visibility choice (ask if unset):
   ```bash
   gh repo create <owner>/<project-name> --private --source . --push  # or --public
   ```
   Verify the repository's visibility after creation. Keep hosting/deployment as a separate step.
4. **Keep one project record**: `docs/project.md` (created by the installer) holds the baseline commit, Phase 0 decisions, deviations and open items. Point the project's `AGENTS.md` at it. If the owner's instructions name a different location (e.g. `project.md` at the root), move the installer's file there and keep a single record, including the baseline version. Methodology stays in this skill; don't copy generic guides into the project. A direct project requirement or an explicit user decision takes precedence over a default documented here, provided the site still meets its accessibility, security and quality obligations; record each such departure in `docs/project.md`.
5. **Verify Directory Structure**:
   - `src/layouts/BaseLayout.astro` (with skip-link, Open Graph metadata, and landmark structure)
   - `src/pages/index.astro` and `src/pages/404.astro` (essential 404 page for static hosts)
   - `src/styles/global.css`, `tokens.css`, `reset.css`
   - `public/robots.txt`, plus the chosen host's config (`wrangler.jsonc` + `public/_headers` on Cloudflare Workers Static Assets)
   - `astro.config.mjs` (`output: 'static'` for no CMS/Sveltia, `output: 'server'` with the selected adapter for EmDash; `devToolbar: { enabled: false }`)
   - Installed `@fontsource-variable/*`, `@astrojs/sitemap`, `axe-core`, `jsdom`, `typescript`

> [!TIP]
> **Operational Guidance**: Once the project is scaffolded, consult its `AGENTS.md` and `docs/project.md` for project contracts and decisions. The generic methodology, validation checks and architecture defaults live in this skill and its references.
