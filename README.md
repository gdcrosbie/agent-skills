# Agent skills

Skills for AI agents that read `SKILL.md` folders (Claude, Claude Code, Codex, Gemini CLI
and similar). Each skill is self-contained, needs no particular service or account, and is
MIT-licensed.

| Skill | Purpose |
| --- | --- |
| [`experience-article-interview`](skills/experience-article-interview/) | Interview an author about their own experience, then challenge the argument, structure, draft in their voice, fact-check and edit an article. Builds a reusable author profile on first use; optional short social post. |

## Install

Download a bundle from the repository's releases when one is published, or build one
yourself (below).

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
