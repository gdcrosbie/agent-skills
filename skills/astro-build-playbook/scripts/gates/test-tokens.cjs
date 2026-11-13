const fs = require('fs');
const path = require('path');

const tokensPath = path.resolve(__dirname, '../src/styles/tokens.css');
if (!fs.existsSync(tokensPath)) {
  console.error('FAIL: src/styles/tokens.css does not exist.');
  process.exit(1);
}

const content = fs.readFileSync(tokensPath, 'utf-8');

const requiredTokens = [
  '--color-bg',
  '--color-surface',
  '--color-text',
  '--color-muted',
  '--border-subtle',
  '--font-display',
  '--font-body',
  '--text-base',
  '--h1',
  '--h2',
  '--space-m',
  '--space-xl',
  '--gutter',
  '--container-max',
  '--cq-text-m',
  '--cq-card-padding',
  '--cq-gap'
];

const missing = requiredTokens.filter(t => !content.includes(t));

if (missing.length > 0) {
  console.error('FAIL: tokens.css is missing required tokens:\n ', missing.join(', '));
  process.exit(1);
}

console.log('PASS: tokens.css conforms to the Standard Astro Token Schema (Tier 1 & Tier 2).');

// Golden Component Rule, part 1: every var() used in src/ resolves to a custom property defined
// somewhere in src/ (tokens.css, global.css, a component's own scoped definition or an inline
// style). A var() with a fallback is allowed.
const srcDir = path.resolve(__dirname, '../src');

function collectSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSources(target);
    return /\.(astro|css)$/.test(entry.name) ? [target] : [];
  });
}

const sources = collectSources(srcDir).map((file) => ({
  file: path.relative(path.resolve(__dirname, '..'), file),
  text: fs.readFileSync(file, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, ''),
}));

const defined = new Set();
for (const { text } of sources) {
  for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
}

const undefinedUses = [];
for (const { file, text } of sources) {
  for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
    if (!defined.has(m[1])) undefinedUses.push(`${file}: ${m[1]}`);
  }
}

if (undefinedUses.length > 0) {
  console.error('FAIL: var() references with no definition in src/ (and no fallback):');
  [...new Set(undefinedUses)].forEach((use) => console.error(`- ${use}`));
  process.exit(1);
}

console.log(`PASS: every var() in ${sources.length} source file(s) resolves to a defined custom property.`);

// Golden Component Rule, part 2: components consume semantic aliases, not the raw palette.
// A raw palette token is any custom property that a --color-* alias in tokens.css points at
// directly (`--color-primary: var(--c-primary)` or, in a BYOT bridge, `var(--primary)`).
const palette = new Set();
for (const m of content.matchAll(/--color-[\w-]+\s*:\s*var\(\s*(--[\w-]+)\s*\)\s*;/g)) {
  if (!m[1].startsWith('--color-')) palette.add(m[1]);
}

const componentsDir = path.join(srcDir, 'components');
const rawUses = [];
for (const { file, text } of sources) {
  if (!path.resolve(path.resolve(__dirname, '..'), file).startsWith(componentsDir + path.sep)) continue;
  for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (palette.has(m[1])) rawUses.push(`${file}: ${m[1]}`);
  }
}

if (rawUses.length > 0) {
  console.error('FAIL: components use raw palette tokens instead of semantic aliases (--color-*):');
  [...new Set(rawUses)].forEach((use) => console.error(`- ${use}`));
  process.exit(1);
}

console.log(`PASS: components consume semantic aliases only (${palette.size} raw palette token(s) guarded).`);
