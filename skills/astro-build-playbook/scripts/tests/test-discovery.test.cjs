// Run with a project's dependencies on the path, e.g.
//   NODE_PATH=<astro-project>/node_modules node --test scripts/tests/test-discovery.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const gate = path.resolve(__dirname, '../gates/test-discovery.cjs');

const SITE = 'https://example.test';
const NOINDEX = 'noindex, nofollow, noarchive, nosnippet, noimageindex';

function page({ robots, body = '<a href="/">Home</a>', canonical = `${SITE}/` } = {}) {
  return `<!doctype html><html><head><link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:image:alt" content="Alt">
<meta property="twitter:image:alt" content="Alt">${robots ? `<meta name="robots" content="${robots}">` : ''}
</head><body>${body}</body></html>`;
}

// Gates resolve the project root from their own location, so each fixture gets a copy.
function fixture(t, { indexable = true, files = {}, siteJson = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-discovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relativePath, contents) => {
    fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    fs.writeFileSync(path.join(root, relativePath), contents);
  };
  write('scripts/test-discovery.cjs', fs.readFileSync(gate));
  write('astro.config.mjs', `export default { site: '${SITE}' };`);
  if (siteJson) write('src/data/site.json', JSON.stringify({ indexable }));
  const defaults = indexable
    ? {
        'dist/index.html': page(),
        'dist/404.html': page({ robots: 'noindex, nofollow' }),
        'dist/sitemap-0.xml': `<urlset><url><loc>${SITE}/</loc></url></urlset>`,
      }
    : {
        'dist/index.html': page({ robots: NOINDEX }),
        'dist/404.html': page({ robots: NOINDEX }),
        'dist/robots.txt': 'User-agent: *\nDisallow: /\n',
        'dist/_headers': `/*\n  X-Robots-Tag: ${NOINDEX}\n`,
      };
  for (const [relativePath, contents] of Object.entries({ ...defaults, ...files })) {
    if (contents !== null) write(relativePath, contents);
  }
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/test-discovery.cjs')], { encoding: 'utf8' });
  return { status: result.status, output: result.stdout + result.stderr };
}

test('indexable site passes', (t) => {
  const result = fixture(t);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /PASS: canonical/);
});

test('missing site.json means indexable', (t) => {
  const result = fixture(t, { siteJson: false });
  assert.equal(result.status, 0, result.output);
});

test('broken internal link fails', (t) => {
  const result = fixture(t, { files: { 'dist/index.html': page({ body: '<a href="/about/">About</a>' }) } });
  assert.notEqual(result.status, 0);
  assert.match(result.output, /index\.html → \/about\//);
});

test('placeholder route resolves', (t) => {
  const result = fixture(t, {
    files: {
      'dist/index.html': page({ body: '<a href="/about/">About</a><a href="/images/og.jpg">Image</a>' }),
      'dist/about/index.html': page({ robots: 'noindex, nofollow', canonical: `${SITE}/about/` }),
      'dist/images/og.jpg': 'jpg',
    },
  });
  assert.equal(result.status, 0, result.output);
});

test('external and protocol-relative links are not checked', (t) => {
  const result = fixture(t, { files: { 'dist/index.html': page({ body: '<a href="https://maps.test/x">Map</a><a href="//cdn.test/a">CDN</a>' }) } });
  assert.equal(result.status, 0, result.output);
});

test('non-indexable site passes', (t) => {
  const result = fixture(t, { indexable: false });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /PASS: non-indexable/);
});

for (const [name, files, message] of [
  ['page without the full robots directive', { 'dist/404.html': page({ robots: 'noindex, nofollow' }) }, /full robots directive on 404\.html/],
  ['sitemap left in dist', { 'dist/sitemap-0.xml': '<urlset/>' }, /no sitemap or RSS/],
  ['robots.txt allowing crawling', { 'dist/robots.txt': 'User-agent: *\nAllow: /\n' }, /disallow \//],
  ['robots.txt advertising a sitemap', { 'dist/robots.txt': 'User-agent: *\nDisallow: /\nSitemap: https://example.test/sitemap-index.xml\n' }, /Allow or Sitemap/],
  ['missing X-Robots-Tag', { 'dist/_headers': '/*\n  X-Frame-Options: DENY\n' }, /X-Robots-Tag/],
]) {
  test(`non-indexable: ${name} fails`, (t) => {
    const result = fixture(t, { indexable: false, files });
    assert.notEqual(result.status, 0);
    assert.match(result.output, message);
  });
}

test('non-indexable: X-Robots-Tag in vercel.json counts', (t) => {
  const result = fixture(t, {
    indexable: false,
    files: {
      'dist/_headers': null,
      'vercel.json': JSON.stringify({ headers: [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: NOINDEX }] }] }),
    },
  });
  assert.equal(result.status, 0, result.output);
});
