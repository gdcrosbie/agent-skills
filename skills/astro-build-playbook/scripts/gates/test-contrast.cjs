const fs = require('fs');
const path = require('path');

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 255, num & 255].map(v => v / 255);
}

function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C = Math.sqrt(a * a + b_ * b_);
  let H = Math.atan2(b_, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return { L, C, H };
}

function oklchToLuminance(L, C, h) {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return Math.max(0, 0.2126 * lr + 0.7152 * lg + 0.0722 * lb);
}

const tokensPath = path.resolve(__dirname, '../src/styles/tokens.css');
if (!fs.existsSync(tokensPath)) {
  console.error('FAIL: tokens.css not found.');
  process.exit(1);
}

const tokensCss = fs.readFileSync(tokensPath, 'utf-8');
const globalPath = path.resolve(__dirname, '../src/styles/global.css');
const globalCss = fs.existsSync(globalPath) ? fs.readFileSync(globalPath, 'utf-8') : '';

function parseVarsFromBlock(blockText) {
  const out = {};
  const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = varRegex.exec(blockText)) !== null) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

// Parse all CSS custom properties in :root blocks without letting later .c-surface-* blocks overwrite them
const vars = {};
const rootBlockRegex = /:root\s*\{([\s\S]*?)\}/g;
let rootMatch;
while ((rootMatch = rootBlockRegex.exec(tokensCss)) !== null) {
  Object.assign(vars, parseVarsFromBlock(rootMatch[1]));
}
// Fallback if tokens.css has top-level declarations outside a :root block
if (Object.keys(vars).length === 0) {
  Object.assign(vars, parseVarsFromBlock(tokensCss));
}

function resolveColor(raw, scopeVars = vars) {
  raw = raw.trim();
  // If reference to another var(--foo)
  const varRef = raw.match(/^var\((--[\w-]+)\)$/);
  if (varRef && scopeVars[varRef[1]]) {
    return resolveColor(scopeVars[varRef[1]], scopeVars);
  }
  return raw;
}

function getColorLuminance(val, scopeVars = vars) {
  val = resolveColor(val, scopeVars);

  // Hex color
  if (val.startsWith('#')) {
    const [r, g, b] = hexToRgb(val);
    const { L, C, H } = rgbToOklch(r, g, b);
    return oklchToLuminance(L, C, H);
  }

  // Relative OKLCH: oklch(from var(--c-text) 0.50 c h)
  const relOklchMatch = val.match(/oklch\(\s*from\s+var\((--[\w-]+)\)\s+([\d.]+)\s+c\s+h\s*\)/i);
  if (relOklchMatch) {
    const baseVar = relOklchMatch[1];
    const newL = parseFloat(relOklchMatch[2]);
    const baseResolved = resolveColor(scopeVars[baseVar] || '#000000', scopeVars);
    let baseC = 0, baseH = 0;
    if (baseResolved.startsWith('#')) {
      const oklch = rgbToOklch(...hexToRgb(baseResolved));
      baseC = oklch.C;
      baseH = oklch.H;
    } else {
      const baseOklch = baseResolved.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/i);
      if (baseOklch) {
        baseC = parseFloat(baseOklch[2]);
        baseH = parseFloat(baseOklch[3]);
      }
    }
    return oklchToLuminance(newL, baseC, baseH);
  }

  // Direct OKLCH: oklch(0.98 0.006 84.6)
  const directOklchMatch = val.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/i);
  if (directOklchMatch) {
    return oklchToLuminance(
      parseFloat(directOklchMatch[1]),
      parseFloat(directOklchMatch[2]),
      parseFloat(directOklchMatch[3])
    );
  }

  throw new Error(`Unsupported color format: ${val}`);
}

function getContrast(fg, bg, scopeVars = vars) {
  const l1 = getColorLuminance(fg, scopeVars);
  const l2 = getColorLuminance(bg, scopeVars);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Contract pairings defined by Standard Astro Token Schema
const colorBg = vars['--color-bg'] || vars['--c-surface'];
const colorSurface = vars['--color-surface'] || vars['--c-surface'];
const colorText = vars['--color-text'] || vars['--c-text'];
const colorMuted = vars['--color-muted'] || vars['--c-text-muted'];
const colorDim = vars['--color-dim'] || vars['--c-text-dim'];
const colorPrimary = vars['--color-primary'] || vars['--c-primary'];
const colorSuccess = vars['--color-success'];
const colorSuccessSurface = vars['--color-success-surface'];
const colorSuccessBorder = vars['--color-success-border'];
const colorError = vars['--color-error'];
const colorErrorSurface = vars['--color-error-surface'];
const colorErrorBorder = vars['--color-error-border'];

const pairings = [
  { name: '--color-text on --color-bg', fg: colorText, bg: colorBg, min: 4.5, scope: vars },
  { name: '--color-text on --color-surface', fg: colorText, bg: colorSurface, min: 4.5, scope: vars },
  { name: '--color-muted on --color-bg', fg: colorMuted, bg: colorBg, min: 4.5, scope: vars },
  { name: '--color-muted on --color-surface', fg: colorMuted, bg: colorSurface, min: 4.5, scope: vars },
  { name: '--color-dim on --color-bg', fg: colorDim, bg: colorBg, min: 4.5, scope: vars },
];

if (colorPrimary) {
  pairings.push({ name: '--color-primary on --color-bg', fg: colorPrimary, bg: colorBg, min: 4.5, scope: vars });
}

// Tinted sections carry body text.
if (vars['--color-surface-tint']) {
  pairings.push({ name: '--color-text on --color-surface-tint', fg: colorText, bg: vars['--color-surface-tint'], min: 4.5, scope: vars });
}

// Convention: --color-on-<role> is the text colour for the --color-<role> ground
// (e.g. --color-on-accent on a full-bleed accent band). Every such pair is checked.
for (const name of Object.keys(vars)) {
  const role = name.match(/^--color-on-([\w-]+)$/)?.[1];
  if (role && vars[`--color-${role}`]) {
    pairings.push({ name: `${name} on --color-${role}`, fg: vars[name], bg: vars[`--color-${role}`], min: 4.5, scope: vars });
  }
}

if (colorSuccess && colorSuccessSurface && colorSuccessBorder) {
  pairings.push(
    { name: '--color-success on --color-success-surface', fg: colorSuccess, bg: colorSuccessSurface, min: 4.5, scope: vars },
    { name: '--color-success-border on --color-success-surface', fg: colorSuccessBorder, bg: colorSuccessSurface, min: 3, scope: vars },
  );
}

if (colorError && colorErrorSurface && colorErrorBorder) {
  pairings.push(
    { name: '--color-error on --color-error-surface', fg: colorError, bg: colorErrorSurface, min: 4.5, scope: vars },
    { name: '--color-error-border on --color-error-surface', fg: colorErrorBorder, bg: colorErrorSurface, min: 3, scope: vars },
  );
}

// Contextual surface scopes (.c-surface-*) in tokens.css or global.css
const combinedCss = `${tokensCss}\n${globalCss}`;
const surfaceRegex = /(\.c-surface-[\w-]+)\s*\{([\s\S]*?)\}/g;
let surfaceMatch;
while ((surfaceMatch = surfaceRegex.exec(combinedCss)) !== null) {
  const surfaceClass = surfaceMatch[1];
  const surfaceOverrides = parseVarsFromBlock(surfaceMatch[2]);
  if (Object.keys(surfaceOverrides).length === 0) continue;
  const scope = { ...vars, ...surfaceOverrides };
  const sBg = scope['--color-bg'];
  const sText = scope['--color-text'];
  const sMuted = scope['--color-muted'];
  const sDim = surfaceOverrides['--color-dim'];
  // Check --color-primary on --color-bg when the surface explicitly remaps --color-primary
  // or when the surface is a same-polarity tint (keeps :root --color-text).
  const sPrimary = (surfaceOverrides['--color-primary'] || !surfaceOverrides['--color-text'])
    ? scope['--color-primary']
    : null;
  if (sText && sBg) {
    pairings.push({ name: `[${surfaceClass}] --color-text on --color-bg`, fg: sText, bg: sBg, min: 4.5, scope });
  }
  if (sMuted && sBg) {
    pairings.push({ name: `[${surfaceClass}] --color-muted on --color-bg`, fg: sMuted, bg: sBg, min: 4.5, scope });
  }
  if (sDim && sBg) {
    pairings.push({ name: `[${surfaceClass}] --color-dim on --color-bg`, fg: sDim, bg: sBg, min: 4.5, scope });
  }
  if (sPrimary && sBg) {
    pairings.push({ name: `[${surfaceClass}] --color-primary on --color-bg`, fg: sPrimary, bg: sBg, min: 4.5, scope });
  }
}

console.log('=== WCAG 2.2 COLOR CONTRAST AUDIT ===\n');
let violations = 0;

pairings.forEach(p => {
  try {
    const ratio = getContrast(p.fg, p.bg, p.scope);
    const pass = ratio >= p.min;
    const status = pass ? 'PASS' : 'FAIL';
    if (!pass) violations++;
    console.log(`[${status}] ${ratio.toFixed(2)}:1 (req: ${p.min}:1) - ${p.name}`);
  } catch (err) {
    console.error(`[ERROR] ${p.name}: ${err.message}`);
    violations++;
  }
});

console.log(`\nAudit complete: ${pairings.length - violations}/${pairings.length} pairs pass.`);

if (violations > 0) {
  console.error(`\nFAIL: ${violations} contrast violations detected in tokens.css.`);
  process.exit(1);
} else {
  console.log('PASS: 0 contrast violations. All semantic token pairings meet WCAG 2.2 Level AA.');
}
