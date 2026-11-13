// Conservative preflight for static sites using external scripts and inert data.
// Not a browser CSP engine: nonce/hash/strict-dynamic policies need tailored checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), `Missing value for ${name}`);
  return args[index + 1];
}
const dist = path.resolve(option('--dist', 'dist'));
const policyFile = option('--policy-file');
const originOverride = option('--origin');

function configuredPolicy() {
  if (policyFile) {
    const value = fs.readFileSync(policyFile, 'utf8').trim();
    assert.ok(value, 'Explicit policy file is empty');
    return value;
  }
  const headersFile = path.join(dist, '_headers');
  if (fs.existsSync(headersFile)) {
    let route;
    const found = [];
    for (const line of fs.readFileSync(headersFile, 'utf8').split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      if (!/^\s/.test(line)) route = line.trim();
      const match = line.match(/^\s+Content-Security-Policy:\s*(.+)$/i);
      if (match) found.push({ route, policy: match[1] });
    }
    if (found.length) {
      assert.ok(found.length === 1 && found[0].route === '/*', 'Route-specific/multiple CSP headers need a tailored check');
      return found[0].policy;
    }
  }
  if (fs.existsSync('vercel.json')) {
    const found = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).headers?.flatMap(rule =>
      (rule.headers ?? []).filter(header => header.key.toLowerCase() === 'content-security-policy')
        .map(header => ({ source: rule.source, policy: header.value }))) ?? [];
    if (found.length) {
      assert.ok(found.length === 1 && ['/(.*)', '/:path*'].includes(found[0].source), 'Route-specific/multiple CSP headers need a tailored check');
      return found[0].policy;
    }
  }
  return null;
}

function run() {
  assert.ok(fs.existsSync(dist), 'Run the production build before test:csp');
  const policy = configuredPolicy();
  if (!policy) {
    console.log('SKIP: no enforced CSP found in dist/_headers or vercel.json; other hosts must supply --policy-file with their actual response policy.');
    return;
  }
  const directives = new Map();
  for (const directive of policy.split(';')) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name && !directives.has(name)) directives.set(name, sources);
  }
  const sourceList = kind => directives.get(kind) ?? directives.get('script-src') ?? directives.get('default-src');
  const elements = sourceList('script-src-elem');
  const attributes = sourceList('script-src-attr');
  assert.ok(elements && attributes, 'No effective script policy; review script-src/default-src');
  for (const source of [...elements, ...attributes]) {
    assert.ok(["'self'", "'none'", '*', 'https:', 'http:'].includes(source) || /^https?:\/\/[^\s/]+\/?$/.test(source), `Unsupported script source ${source}; nonce/hash/path/strict-dynamic policies need tailored browser/runtime checks`);
  }
  // URL parsing alone accepts credentials/query strings that are not CSP
  // origin sources. Reject them rather than producing a false allowlist pass.
  for (const source of [...elements, ...attributes].filter(value => /^https?:\/\//.test(value))) {
    const url = new URL(source.replace('://*.', '://wildcard.'));
    assert.ok(!url.username && !url.password && !url.search && !url.hash, `Unsupported script source ${source}; expected an HTTP(S) origin`);
  }
  const allows = (url, origin) => elements.some(source => {
    if (source === "'self'") return url.origin === origin;
    if (source === '*') return ['http:', 'https:'].includes(url.protocol);
    if (source === 'https:' || source === 'http:') return url.protocol === source;
    if (!source.startsWith('http')) return false;
    const allowed = new URL(source.replace('://*.', '://wildcard.'));
    const wildcard = allowed.hostname.startsWith('wildcard.') && source.includes('://*.');
    return url.protocol === allowed.protocol && url.port === allowed.port &&
      (wildcard ? url.hostname.endsWith(allowed.hostname.slice('wildcard'.length)) : url.hostname === allowed.hostname);
  });
  function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : file.endsWith('.html') ? [file] : [];
    });
  }
  const pages = walk(dist);
  assert.ok(pages.length, 'Expected built HTML pages');
  const jsTypes = new Set(['', 'module', 'importmap', 'speculationrules', 'application/ecmascript', 'application/javascript', 'application/x-ecmascript', 'application/x-javascript', 'text/ecmascript', 'text/javascript', 'text/jscript', 'text/livescript', 'text/x-ecmascript', 'text/x-javascript', ...Array.from({ length: 6 }, (_, i) => `text/javascript1.${i}`)]);
  let checked = 0;
  for (const page of pages) {
    const relative = path.relative(dist, page);
    const dom = new JSDOM(fs.readFileSync(page, 'utf8'));
    const document = dom.window.document;
    assert.ok(!document.querySelector('base[href]'), `HTML base URLs need a tailored CSP/asset-resolution check on ${relative}`);
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    assert.ok(originOverride || canonical, `Supply --origin for ${relative} without a canonical URL`);
    const origin = new URL(originOverride || canonical).origin;
    const pageURL = new URL(relative.split(path.sep).join('/'), `${origin}/`);
    for (const script of document.querySelectorAll('script')) {
      const type = script.type.trim().toLowerCase().split(';')[0].trim();
      if (!jsTypes.has(type)) {
        if (/^application\/(?:ld\+)?json$/.test(type)) assert.doesNotThrow(() => JSON.parse(script.textContent), `Invalid JSON data on ${relative}`);
        continue;
      }
      const src = script.getAttribute('src');
      assert.ok(src, `Inline executable script blocked by CSP on ${relative}`);
      const url = new URL(src, pageURL);
      assert.ok(allows(url, origin), `Script ${src} not allowed by effective CSP on ${relative}`);
      if (url.origin === origin) {
        const file = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
        assert.ok(file.startsWith(`${dist}${path.sep}`) && fs.existsSync(file) && fs.statSync(file).isFile(), `Missing/invalid same-origin script ${src} on ${relative}`);
      }
      checked += 1;
    }
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        assert.ok(!/^on/i.test(attribute.name), `Inline handler ${attribute.name} blocked by CSP on ${relative}`);
        if (['href', 'src', 'action', 'formaction', 'xlink:href'].includes(attribute.name)) {
          assert.ok(!/^javascript:/i.test(attribute.value.replace(/[\u0000-\u0020]/g, '')), `JavaScript URL blocked by CSP on ${relative}`);
        }
      }
    }
    dom.window.close();
  }
  console.log(`PASS: ${pages.length} page(s), ${checked} script reference(s) comply with the configured external-script CSP contract. Verify browser behaviour under actual response headers too.`);
}
try { run(); } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
