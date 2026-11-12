# Working in agent-skills

This repository is public. Rules for agents editing it:

- **Generic only.** Skills here are written for anyone to install. Voice, audience,
  credentials, accounts, local paths and publishing channels are things the user supplies at
  run time, never built in. Do not add the maintainer's personal details, private project
  names or links to private material.
- **One folder per skill** in `skills/<name>/`, with `name` in the `SKILL.md` frontmatter
  matching the folder, relative links only, and its own `LICENSE.txt` (MIT).
- **Before committing:** run `./package.sh` (it validates names and, where the maintainer's
  untracked `.owner-identifiers` file exists, refuses bundles containing those identifiers)
  and update the skills table in `README.md`.
- **Commits:** conventional-commit messages straight to `main`. Bundles in `dist/` are not
  committed; attach them to a release instead.
- `project.md` is the maintainer's local working record and is not tracked.
