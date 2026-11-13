const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

// Read the canonical origin from astro.config.* so the check follows the project's `site`.
const configFile = ['astro.config.mjs', 'astro.config.ts', 'astro.config.js']
  .map((file) => path.join(root, file))
  .find((file) => fs.existsSync(file));
const siteMatch = configFile && fs.readFileSync(configFile, 'utf8').match(/site:\s*['"`]([^'"`]+)['"`]/);
assert.ok(siteMatch, 'Expected a literal `site` URL in astro.config.*');
const site = new URL(siteMatch[1]).origin;
const siteRe = site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Indexing intent: `"indexable": false` in src/data/site.json switches to the non-indexable
// checks (references/hosting-and-indexing.md §4). Without the flag the site is indexable.
const siteDataFile = path.join(root, 'src', 'data', 'site.json');
const indexable = !fs.existsSync(siteDataFile) || JSON.parse(fs.readFileSync(siteDataFile, 'utf8')).indexable !== false;
const NOINDEX_ROBOTS = 'noindex, nofollow, noarchive, nosnippet, noimageindex';

function read(relativePath) {
  const file = path.join(dist, relativePath);
  assert.ok(fs.existsSync(file), `Expected built output: ${relativePath}`);
  return fs.readFileSync(file, 'utf8');
}

function documentFor(relativePath) {
  return new JSDOM(read(relativePath)).window.document;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const builtFiles = walk(dist);
const htmlFiles = builtFiles.filter((file) => file.endsWith('.html'));

// Every page: no placeholder `#` links, and every root-relative link resolves to built output.
// This catches removed placeholder routes and typo'd nav links (references/content-collections.md §7).
const brokenLinks = [];
for (const file of htmlFiles) {
  const relativePath = path.relative(dist, file);
  const document = new JSDOM(fs.readFileSync(file, 'utf8')).window.document;
  assert.equal(document.querySelectorAll('a[href="#"]').length, 0, `Expected every link on ${relativePath} to have a real destination`);
  for (const anchor of document.querySelectorAll('a[href^="/"]:not([href^="//"])')) {
    const { pathname } = new URL(anchor.getAttribute('href'), site);
    const target = pathname.endsWith('/') ? path.join(dist, pathname, 'index.html') : path.join(dist, pathname);
    if (!fs.existsSync(target)) brokenLinks.push(`${relativePath} → ${pathname}`);
  }
  if (!indexable) {
    assert.equal(
      document.querySelector('meta[name="robots"]')?.getAttribute('content'),
      NOINDEX_ROBOTS,
      `Expected the full robots directive on ${relativePath} (non-indexable site)`,
    );
    assert.equal(document.querySelector('link[rel="sitemap"]'), null, `Unexpected sitemap link on ${relativePath}`);
    assert.equal(document.querySelector('link[type="application/rss+xml"]'), null, `Unexpected RSS link on ${relativePath}`);
  }
}
assert.deepEqual(brokenLinks, [], `Broken internal links:\n${brokenLinks.join('\n')}`);

const home = documentFor('index.html');
assert.equal(home.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${site}/`);
assert.equal(home.querySelector('meta[property="og:type"]')?.getAttribute('content'), 'website');
assert.ok(home.querySelector('meta[property="og:image:alt"]')?.getAttribute('content'));
assert.ok(home.querySelector('meta[property="twitter:image:alt"]')?.getAttribute('content'));

if (!indexable) {
  // Non-indexable: robots meta on every page (above), X-Robots-Tag from the host config,
  // robots.txt disallowing everything, and no discovery surfaces.
  const discoveryFiles = builtFiles.filter((file) => /(^|\/)(sitemap[^/]*\.xml|rss\.xml)$/.test(file));
  assert.deepEqual(discoveryFiles.map((file) => path.relative(dist, file)), [], 'Expected no sitemap or RSS files in dist/');

  const robots = read('robots.txt');
  assert.match(robots, /^Disallow: \/\s*$/m, 'Expected robots.txt to disallow /');
  assert.doesNotMatch(robots, /^(Allow|Sitemap):/im, 'robots.txt must not carry Allow or Sitemap lines');

  const hostConfig = ['dist/_headers', 'vercel.json', 'netlify.toml']
    .map((file) => path.join(root, file))
    .filter((file) => fs.existsSync(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  assert.match(
    hostConfig,
    /X-Robots-Tag[^\n]*noindex|"X-Robots-Tag"\s*,\s*"value"\s*:\s*"noindex/i,
    'Expected the host config (dist/_headers, vercel.json or netlify.toml) to send X-Robots-Tag: noindex',
  );

  console.log(
    `PASS: non-indexable site: ${htmlFiles.length} page(s) carry the full robots directive; robots.txt disallows all; host sends X-Robots-Tag; no sitemap or RSS; every internal link resolves.`,
  );
  process.exit(0);
}

const notFoundPage = documentFor('404.html');
assert.equal(notFoundPage.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex, nofollow');

const sitemap = read('sitemap-0.xml');
assert.match(sitemap, new RegExp(`<loc>${siteRe}/</loc>`));
assert.doesNotMatch(sitemap, /404/);

// Editorial posts are optional. Derive expectations from src/content/posts so a project can
// remove the sample post (and RSS) without rewriting this test, while a project that keeps
// posts still gets article, sitemap and feed coverage for every post.
const postsDir = path.join(root, 'src', 'content', 'posts');
const postSlugs = fs.existsSync(postsDir)
  ? fs.readdirSync(postsDir).filter((file) => /\.mdx?$/.test(file)).map((file) => file.replace(/\.mdx?$/, ''))
  : [];
const hasRssRoute = ['rss.xml.ts', 'rss.xml.js'].some((file) => fs.existsSync(path.join(root, 'src', 'pages', file)));

for (const slug of postSlugs) {
  const article = documentFor(`posts/${slug}/index.html`);
  assert.equal(article.querySelector('meta[property="og:type"]')?.getAttribute('content'), 'article', `Expected posts/${slug}/ to be an article`);
  assert.match(
    article.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ?? '',
    /^\d{4}-\d{2}-\d{2}T/,
    `Expected posts/${slug}/ to carry article:published_time`,
  );
  assert.match(sitemap, new RegExp(`<loc>${siteRe}/posts/${slug}/</loc>`), `Expected posts/${slug}/ in the sitemap`);
}

if (hasRssRoute) {
  const rss = read('rss.xml');
  assert.match(rss, /<rss version="2\.0">/);
  for (const slug of postSlugs) {
    assert.match(rss, new RegExp(`${siteRe}/posts/${slug}/`), `Expected posts/${slug}/ in rss.xml`);
  }
  assert.ok(home.querySelector('link[type="application/rss+xml"]'), 'Expected RSS auto-discovery while the feed exists');
} else {
  assert.ok(!fs.existsSync(path.join(dist, 'rss.xml')), 'Expected no rss.xml once the RSS route is removed');
  assert.equal(home.querySelector('link[type="application/rss+xml"]'), null, 'Expected no RSS auto-discovery link once the feed is removed');
}

console.log(
  `PASS: canonical, social, noindex and sitemap metadata are coherent; every internal link resolves across ${htmlFiles.length} page(s); ${postSlugs.length} post(s) checked; RSS ${hasRssRoute ? 'published and linked' : 'removed with no auto-discovery link'}.`,
);
