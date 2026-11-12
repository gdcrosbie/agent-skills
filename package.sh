#!/usr/bin/env bash
#
# package.sh - Build downloadable bundles of the skills in skills/
#
# Usage: ./package.sh [skill-name ...]   (default: every skill folder)
#
# Each skill is written to dist/<name>.skill (the standard upload format) and an identical
# dist/<name>.zip for platforms that only accept .zip. Archives contain one top-level <name>/
# folder, without OS artefacts.
#
# Optional identifier guard: if .owner-identifiers exists (untracked; one extended regex per
# line, matched case-insensitively), the build refuses to write a bundle whose files match
# any of them, except the "Copyright (c)" line of LICENSE.txt.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS="$ROOT/skills"
DIST="$ROOT/dist"
IDS="$ROOT/.owner-identifiers"

pattern=""
if [[ -f "$IDS" ]]; then
  pattern="$(grep -vE '^[[:space:]]*(#|$)' "$IDS" | paste -sd '|' -)"
else
  echo "! No .owner-identifiers file: identifier guard skipped."
fi

if [[ $# -gt 0 ]]; then
  names=("$@")
else
  names=()
  for d in "$SKILLS"/*/; do
    [[ -f "$d/SKILL.md" ]] && names+=("$(basename "$d")")
  done
fi

mkdir -p "$DIST"
status=0
for name in "${names[@]}"; do
  src="$SKILLS/$name"
  if [[ ! -f "$src/SKILL.md" ]]; then
    echo "✗ $name: no SKILL.md"; status=1; continue
  fi
  fm_name="$(awk '/^---$/{n++; next} n==1 && /^name:/{sub(/^name:[ ]*/, ""); print; exit}' "$src/SKILL.md")"
  if [[ "$fm_name" != "$name" ]]; then
    echo "✗ $name: frontmatter name '$fm_name' does not match folder"; status=1; continue
  fi
  if [[ -n "$pattern" ]]; then
    if grep -rniE --exclude=LICENSE.txt "$pattern" "$src" \
      || { [[ -f "$src/LICENSE.txt" ]] && grep -iE "$pattern" "$src/LICENSE.txt" | grep -v '^Copyright (c) '; }; then
      echo "✗ $name: owner identifiers found (above); bundle not written"; status=1; continue
    fi
  fi
  rm -f "$DIST/$name.skill" "$DIST/$name.zip"
  (cd "$SKILLS" && zip -r -q -X "$DIST/$name.zip" "$name" \
    -x "*/.DS_Store" -x "*/._*" -x "*__MACOSX*" -x "*/.git*" \
    -x "*.tmp" -x "*.bak" -x "*.swp" -x "*/__pycache__/*" -x "*.pyc" -x "$name/evals/*")
  cp "$DIST/$name.zip" "$DIST/$name.skill"
  echo "✓ $name → dist/$name.skill (and .zip), $(unzip -Z1 "$DIST/$name.zip" | grep -vc '/$') files"
done
exit $status
