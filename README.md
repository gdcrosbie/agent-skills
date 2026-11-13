# Agent skills

Skills for AI agents that read `SKILL.md` folders (Claude, Claude Code, Codex, Gemini CLI
and similar). Each skill is self-contained, needs no particular service or account, and is
MIT-licensed.

| Skill | Purpose | Download |
| --- | --- | --- |
| [`accessibility-audit`](skills/accessibility-audit/) | Audit rendered pages, templates or components against WCAG 2.2: rendered evidence over source, browser-measured contrast (including text over images), native keyboard and focus checks, severities, scoring, an audit record and re-verification after fixes. Stack-neutral, with an Astro adaptation. | Not yet released |
| [`astro-build-playbook`](skills/astro-build-playbook/) | Build Astro sites from design evidence, starting from a vanilla `npm create astro` minimal install plus a baseline of tokens, layout and verification gates. Covers Figma/Paper/HTML ingestion, tokens, content collections and CMS (Sveltia, EmDash, Sanity), forms, motion, Cloudflare Workers hosting, SEO, and a final design and accessibility audit. Pairs with `astro-ui-patterns`. | Not yet released |
| [`astro-ui-patterns`](skills/astro-ui-patterns/) | Implement 17 accessible Astro interaction patterns (navigation drawer, dialog, tabs, accordion, search and filters, carousel, cards, theme toggle, self-hosted map and more) as zero-dependency components, or adapt their behaviour contracts to a project's framework. Snapshot of 2026-11-12. | [v1.0.0](https://github.com/gdcrosbie/agent-skills/releases/tag/astro-ui-patterns-v1.0.0) |
| [`experience-article-interview`](skills/experience-article-interview/) | Interview an author about their own experience, then challenge the argument, structure, draft in their voice, fact-check and edit an article. Builds a reusable author profile on first use; optional short social post. | [v1.0.0](https://github.com/gdcrosbie/agent-skills/releases/tag/experience-article-interview-v1.0.0) |

## Install

Download the `.skill` or `.zip` from the skill's release (the Download column above; all
versions are on the [releases page](https://github.com/gdcrosbie/agent-skills/releases)),
or build one yourself (below).

- **Claude apps:** upload the `.skill` or `.zip` file in the app's skills settings. Anthropic's
  help pages give the current menu path.
- **Claude Code:** unzip into `~/.claude/skills/` (personal) or `.claude/skills/` in a
  project, so the path is `.../skills/<skill-name>/SKILL.md`.
- **Other agents that read `SKILL.md` folders:** unzip into that agent's skills folder.
- **No skill support:** paste the skill's `SKILL.md` into the project or chat instructions and
  attach its `assets/` templates as needed.

## Build

```bash
./package.sh                               # every skill
./package.sh experience-article-interview  # one skill
```

Bundles are written to `dist/<name>.skill` and an identical `dist/<name>.zip`, each with a
single top-level skill folder.

## Licence

[MIT](LICENSE). Each skill also carries its own `LICENSE.txt`, which travels with the bundle.
