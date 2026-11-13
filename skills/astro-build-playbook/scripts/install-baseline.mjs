#!/usr/bin/env node
// Install the astro-build-playbook baseline and verification gates into an Astro project.
//
// Usage:
//   node <skill>/scripts/install-baseline.mjs <project-dir> [--host cloudflare-workers] [--overwrite]
//
// - Copies assets/baseline/ into the project (gitignore → .gitignore, merged line by line).
// - Copies scripts/gates/*.cjs into <project>/scripts/.
// - With --host cloudflare-workers, also installs wrangler.jsonc and public/_headers.
// - Adds the gate scripts and their dependencies to package.json without replacing existing entries.
// - Records the skill version (git commit, when installed from a checkout) in docs/project.md.
// Existing files that differ are skipped and reported unless --overwrite is passed
// (use it only on a freshly scaffolded project). Dependencies are added, not installed: run
// `npm install` afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const project = args.find((a) => !a.startsWith('--'));
const overwrite = args.includes('--overwrite');
const hostIndex = args.indexOf('--host');
const host = hostIndex >= 0 ? args[hostIndex + 1] : null;

if (!project) {
  console.error('Usage: install-baseline.mjs <project-dir> [--host cloudflare-workers] [--overwrite]');
  process.exit(1);
}
const root = path.resolve(project);
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error(`No package.json in ${root}. Scaffold the project first (npm create astro@latest).`);
  process.exit(1);
}
if (host && host !== 'cloudflare-workers') {
  console.error(`Unknown --host "${host}". Only cloudflare-workers ships config; configure other hosts per references/hosting-and-indexing.md.`);
  process.exit(1);
}

const installed = [];
const skipped = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function place(source, target) {
  const rel = path.relative(root, target);
  if (fs.existsSync(target)) {
    if (Buffer.compare(fs.readFileSync(source), fs.readFileSync(target)) === 0) return;
    if (!overwrite) { skipped.push(rel); return; }
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  installed.push(rel);
}

function mergeGitignore(source, target) {
  const wanted = fs.readFileSync(source, 'utf8').split('\n');
  const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const have = new Set(existing.split('\n').map((l) => l.trim()));
  const add = wanted.filter((l) => l.trim() && !l.startsWith('#') && !have.has(l.trim()));
  if (!existing) { fs.copyFileSync(source, target); installed.push('.gitignore'); return; }
  if (add.length) {
    fs.appendFileSync(target, `${existing.endsWith('\n') ? '' : '\n'}\n# astro-build-playbook baseline\n${add.join('\n')}\n`);
    installed.push('.gitignore (merged)');
  }
}

// Baseline files
const baseline = path.join(skillDir, 'assets', 'baseline');
for (const file of walk(baseline)) {
  const rel = path.relative(baseline, file);
  if (rel === 'gitignore') mergeGitignore(file, path.join(root, '.gitignore'));
  else place(file, path.join(root, rel));
}

// Verification gates
for (const file of walk(path.join(skillDir, 'scripts', 'gates'))) {
  place(file, path.join(root, 'scripts', path.basename(file)));
}

// Host configuration
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (host) {
  const hostDir = path.join(skillDir, 'assets', 'hosting', host);
  for (const file of walk(hostDir)) {
    const rel = path.relative(hostDir, file);
    const target = path.join(root, rel);
    if (rel === 'wrangler.jsonc' && !fs.existsSync(target)) {
      fs.writeFileSync(target, fs.readFileSync(file, 'utf8').replace('<project-name>', pkg.name || path.basename(root)));
      installed.push(rel);
    } else {
      place(file, target);
    }
  }
}

// package.json scripts and dependencies (add missing, never replace)
const additions = {
  scripts: {
    check: 'astro check',
    'test:docs': 'node scripts/test-doc-links.cjs',
    'test:tokens': 'node scripts/test-tokens.cjs',
    'test:contrast': 'node scripts/test-contrast.cjs',
    'test:discovery': 'node scripts/test-discovery.cjs',
    'test:csp': 'node scripts/test-csp.cjs',
    'test:social-image': 'node scripts/test-social-image.cjs',
    'test:a11y': 'node scripts/run-axe.cjs',
    test: 'npm run test:docs && npm run test:tokens && npm run test:contrast && npm run check && npm run build && npm run test:discovery && npm run test:csp && npm run test:social-image && npm run test:a11y',
  },
  dependencies: {
    '@astrojs/sitemap': '^3.7.4',
    '@fontsource-variable/dm-sans': '^5.3.0',
    '@fontsource-variable/fraunces': '^5.3.0',
  },
  devDependencies: {
    '@astrojs/check': '^0.9.10',
    'axe-core': '^4.13.0',
    jsdom: '^30.0.1',
    typescript: '^5.7.0',
  },
};
const conflicts = [];
for (const [section, entries] of Object.entries(additions)) {
  pkg[section] ??= {};
  for (const [key, value] of Object.entries(entries)) {
    if (!(key in pkg[section])) pkg[section][key] = value;
    else if (pkg[section][key] !== value) conflicts.push(`${section}.${key}`);
  }
}
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// Provenance
let commit = 'unknown (not installed from a git checkout; record the skill release version manually)';
try {
  commit = execFileSync('git', ['-C', fs.realpathSync(skillDir), 'describe', '--always', '--dirty', '--abbrev=7'], { encoding: 'utf8' }).trim();
} catch {}
const record = path.join(root, 'docs', 'project.md');
fs.mkdirSync(path.dirname(record), { recursive: true });
if (!fs.existsSync(record)) fs.writeFileSync(record, '# Project record\n');
fs.appendFileSync(record, `
## Baseline

Installed from the astro-build-playbook skill \`${commit}\` (baseline and gates) on ${new Date().toISOString().slice(0, 10)}${host ? `, host config: ${host}` : ''}.
To review later updates, diff the skill's \`assets/\` and \`scripts/gates/\` from that version. Log reviewed-but-skipped changes here with a reason.
`);

console.log(`Installed ${installed.length} file(s):\n  ${installed.join('\n  ') || '(none)'}`);
if (skipped.length) console.log(`\nSkipped ${skipped.length} existing file(s) that differ (re-run with --overwrite on a fresh scaffold, or merge by hand):\n  ${skipped.join('\n  ')}`);
if (conflicts.length) console.log(`\nKept existing package.json values for: ${conflicts.join(', ')}`);
console.log(`\nRecorded baseline commit ${commit} in docs/project.md. Next: npm install, then npm test.`);
