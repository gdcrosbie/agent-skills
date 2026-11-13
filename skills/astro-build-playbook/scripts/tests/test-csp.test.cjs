const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const gate = path.resolve(__dirname, '../gates/test-csp.cjs');

function fixture(t, { html = '<script src="/app.js" defer></script>', policy = "script-src 'self'", headers, vercel, missing = false, args = [] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-csp-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'dist/index.html'), `<link rel="canonical" href="https://example.test/">${html}`);
  if (!missing) fs.writeFileSync(path.join(root, 'dist/app.js'), 'console.log("ready")');
  if (headers !== false && !vercel) fs.writeFileSync(path.join(root, 'dist/_headers'), headers ?? `/*\n  Content-Security-Policy: ${policy}\n`);
  if (vercel) fs.writeFileSync(path.join(root, 'vercel.json'), JSON.stringify(vercel));
  fs.writeFileSync(path.join(root, 'policy.txt'), policy);
  const result = spawnSync(process.execPath, [gate, ...args], { cwd: root, encoding: 'utf8' });
  return { status: result.status, output: result.stdout + result.stderr };
}

test('same-origin files and inert JSON pass', t => {
  const result = fixture(t, { html: '<script type="module" src="/app.js"></script><script type="application/json">{"safe":"\\u003c/script>"}</script>' });
  assert.equal(result.status, 0, result.output); assert.match(result.output, /PASS:/);
});
for (const [name, config, message] of [
  ['Astro inline module', { html: '<script type="module">document.body.dataset.ready="true"</script>' }, /Inline executable/],
  ['inline handler', { html: '<button onclick="run()">Go</button>' }, /Inline handler/],
  ['JavaScript URL', { html: '<a href="java&#10;script:run()">Go</a>' }, /JavaScript URL/],
  ['missing asset', { missing: true }, /Missing\/invalid/],
  ['off-origin script', { html: '<script src="https://other.test/app.js"></script>' }, /not allowed/],
  ['invalid JSON', { html: '<script type="application/json">{</script>' }, /Invalid JSON/],
  ['nonce policy requires tailored checks', { policy: "script-src 'nonce-abc'" }, /Unsupported script source/],
  ['route overrides require tailored checks', { headers: "/*\n  Content-Security-Policy: script-src 'self'\n/private/*\n  Content-Security-Policy: script-src 'none'\n" }, /Route-specific/],
  ['script-src-elem overrides broader script-src', { policy: "script-src 'self'; script-src-elem 'none'" }, /not allowed/],
]) test(name, t => { const result = fixture(t, config); assert.notEqual(result.status, 0); assert.match(result.output, message); });

test('configured external host is allowed', t => {
  const result = fixture(t, { policy: "script-src 'self' https://cdn.test; script-src-attr 'none'", html: '<script src="https://cdn.test/app.js"></script>' });
  assert.equal(result.status, 0, result.output);
});
test('default-src fallback is checked', t => {
  const result = fixture(t, { policy: "default-src 'none'" });
  assert.notEqual(result.status, 0); assert.match(result.output, /not allowed/);
});
test('Vercel global policy is read without a Cloudflare header file', t => {
  const result = fixture(t, { vercel: { headers: [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: "script-src 'self'" }] }] } });
  assert.equal(result.status, 0, result.output); assert.match(result.output, /PASS:/);
});
test('explicit response policy supports other hosts', t => {
  const result = fixture(t, { headers: false, args: ['--policy-file', 'policy.txt', '--origin', 'https://example.test'] });
  assert.equal(result.status, 0, result.output); assert.match(result.output, /PASS:/);
});
test('no configured CSP reports skip, not a false pass', t => {
  const result = fixture(t, { headers: false });
  assert.equal(result.status, 0, result.output); assert.match(result.output, /SKIP:/);
});

test('wildcard host allows a subdomain but excludes the bare host', t => {
  const policy = "script-src https://*.cdn.test; script-src-attr 'none'";
  assert.equal(fixture(t, { policy, html: '<script src="https://assets.cdn.test/app.js"></script>' }).status, 0);
  const result = fixture(t, { policy, html: '<script src="https://cdn.test/app.js"></script>' });
  assert.notEqual(result.status, 0); assert.match(result.output, /not allowed/);
});
test('invalid CSP origin is not treated as a valid URL allowlist', t => {
  const result = fixture(t, { policy: "script-src https://cdn.test?query; script-src-attr 'none'", html: '<script src="https://cdn.test/app.js"></script>' });
  assert.notEqual(result.status, 0); assert.match(result.output, /expected an HTTP/);
});

test('HTTPS scheme source permits an HTTPS script', t => {
  const result = fixture(t, { policy: "script-src https:; script-src-attr 'none'", html: '<script src="https://cdn.test/app.js"></script>' });
  assert.equal(result.status, 0, result.output);
});
test('HTML base URL requires tailored resolution', t => {
  const result = fixture(t, { html: '<base href="/assets/"><script src="app.js"></script>' });
  assert.notEqual(result.status, 0); assert.match(result.output, /HTML base URLs/);
});
