---
name: astro-build-playbook
description: Build or modify Astro sites from design evidence, starting from a vanilla `npm create astro` minimal install plus a small baseline of tokens, layout and verification gates. Routes setup, design ingestion (Figma, Paper, HTML exports), tokens, content and CMS (local collections, Sveltia, EmDash, Sanity), assets, forms, motion, hosting, SEO and verification work.
license: MIT (see LICENSE.txt)
---

# Astro build playbook

Read this core once. Select the current task below and load only its reference. Do not restart
setup phases for an established project.

## Starting point

New projects start from a vanilla Astro install (`npm create astro@latest`, minimal template),
then this skill's baseline: a two-tier token contract, a base layout with skip link and
metadata, a 404 page, reset/global CSS and verification gates. See
[project setup](references/project-setup.md) and [baseline assets](assets/README.md).

For an existing project, inspect its instructions, project record, `package.json`, config and
components first. Keep its own token contract, component library and file ownership; apply the
rules below without replacing them with baseline examples.

Content/asset reuse does not authorise adopting the source's CMS, auth, dependencies or
deployment identity. Inspect these independently; adopting services or replacing the design
system needs the owner's decision.

## Decisions and constraints

- **New projects:** settle CMS/runtime (no CMS, Sveltia or EmDash unless another, such as
  Sanity, is explicitly selected), colour-mode scope, host/deploy path and indexing policy
  before scaffolding. Preserve choices already authorised. Use
  [project setup](references/project-setup.md) for commands, existing repository discovery and
  the single project record/baseline commit.
- **Baseline tokens:** consume semantic aliases, not raw palette values. Select supplied tokens,
  extracted design values or approved baseline defaults through
  [token ingestion](references/token-contract.md).
- **Content scope:** obvious in-page repeaters/globals can be classified directly. For ambiguous
  services/projects/team/testimonials, ask about detail routes, editing and prose before choosing
  architecture. Preserve canonical sources and validate IDs/relationships; format does not
  decide routes.
- **Forms:** settle the unresolved destination and providers (spam protection, email delivery)
  before implementation. Use the selected host's endpoint and retain existing authorised routes;
  a contact form alone does not require SSR.
- **Interactions:** if the `astro-ui-patterns` skill is installed, its
  [UI pattern index](../astro-ui-patterns/SKILL.md) owns behaviour contracts. For uncatalogued
  widgets, stop and ask before adding a library. Settle the motion tier before adding a
  runtime/library. Define a useful no-JS path.
- **Markup/performance:** semantic HTML and scoped CSS first, logical properties, responsive
  navigation wherever site navigation exists, no initially hidden LCP content, reduced-motion
  treatment and stable image dimensions. Size-dependent cards use container queries on their
  actual available width.
- **Assets/privacy:** self-host fonts/media; no third-party tracking SDKs or runtime stock
  imagery. Figma Make/HTML exports are markup/layout evidence; inspect React only for
  data/behaviour the export cannot supply. Native design ingestion captures durable evidence
  before links expire.

## Select the operation

| Task | Read only when needed |
|---|---|
| New scaffold, runtime/host choice or repository setup | [Project setup](references/project-setup.md) |
| Tokens/semantic bridge or baseline defaults | [Token contract](references/token-contract.md) |
| Native Figma / Paper / exported HTML source | [Figma](references/figma-mcp-ingestion.md), [Paper](references/paper-mcp-ingestion.md) or [HTML](references/figma-html-extraction.md), whichever is supplied |
| Baseline component/CSS slicing | [Component authoring](references/component-authoring.md) |
| Geometry, overlaps, typography or locked compositions | [Layout fidelity](references/layout-fidelity.md) |
| Local editorial/entities/repeaters and relational validation | [Content collections](references/content-collections.md) |
| Sveltia / EmDash / explicitly chosen Sanity | [Git CMS](references/git-cms.md), [EmDash](references/emdash.md) or [Sanity integration](references/sanity-integration.md), only the selected branch |
| Images, source assets or LCP media | [Assets and images](references/assets-and-images.md) |
| Forms and submissions | [Forms contract](references/forms-and-submissions.md), then the [contact form recipe](references/recipe-contact-form.md) if it fits |
| Interactive widget or new browser runtime | [Interaction decisions](references/interactions.md), then the requested UI spec |
| Motion | [Animation tiers](references/animations-and-motion.md) |
| Hosting, headers, protection or indexing | [Hosting](references/hosting-and-indexing.md) |
| Canonicals, social cards or structured metadata | [SEO](references/seo-and-metadata.md) |
| Browser performance and authoring accessibility | [CWV/a11y checklist](references/cwv-a11y-checklist.md) |
| Gate commands, checker coverage, interaction verification or the final audit | [Verification](references/verification.md) |
| Source ZIP / distributable kit | [Project handoff](references/project-handoff.md) |
| Installing/debugging baseline gates | [Baseline assets](assets/README.md); do not load implementation files up front |

## Build and hand off

For a full design build: settle choices → capture evidence/tokens → model content → compose →
localise assets → enhance interactions → tune → verify. Targeted edits use only applicable
steps.

Run the project's actual required checks, sequentially where sync/build share generated state.
Report exact failures, unsupported checks and fallback coverage gaps; do not treat unrun checks
as passes. EmDash needs live route/editorial/database performance checks instead of static-only
assertions. Inspect real interactions on built output and the deployed origin with its actual
CSP.

Completed design builds finish with the `astro-design-audit` skill
([workflow](../astro-design-audit/SKILL.md), if installed; otherwise the design check in
[verification](references/verification.md#final-design-and-accessibility-audit)) and the
`accessibility-audit` skill ([workflow](../accessibility-audit/SKILL.md), if installed). Keep audit
records in `design/audit/` and accepted decisions in the project record. Targeted fixes recheck
affected states and regressions within scope. Source files and a passing build are not proof of
published appearance, keyboard behaviour or metadata.
