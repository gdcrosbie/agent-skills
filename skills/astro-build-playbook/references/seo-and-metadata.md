# SEO, Metadata & Hosting Architecture (Astro)

A production website must be fully discoverable by search crawlers and generate rich social previews when shared on social networks and messaging apps. In a static Astro architecture, this is achieved through deterministic build-time metadata generation, automated XML sitemaps, and static edge headers.

---

## 1. The Core Meta & Open Graph Contract

Every page must emit a complete metadata payload in its `<head>`. Rather than duplicating tags, encapsulate metadata inside `src/layouts/BaseLayout.astro` or a dedicated `src/components/SEO.astro` component.

### Standard Head Contract (`BaseLayout.astro`)
```astro
---
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

interface Props {
  title: string;
  description: string;
  image?: string | ImageMetadata;
  imageAlt?: string;
  articleDate?: Date;
  noindex?: boolean;
}

const {
  title,
  description,
  image = '/images/og-default.jpg',
  imageAlt = title,
  articleDate,
  noindex = false,
} = Astro.props;

// When a page passes a Content Collection `image()` asset (ImageMetadata), resolve a 1200px
// JPEG via `getImage()` so Astro emits the file into `dist/_astro/` and reports its true height.
const ogImage =
  typeof image === 'string'
    ? { src: image, width: 1200, height: 630 }
    : await getImage({ src: image, width: 1200, format: 'jpg' }).then((img) => ({
        src: img.src,
        width: Number(img.attributes.width),
        height: Number(img.attributes.height),
      }));

// Absolute URLs are mandatory for Open Graph and Canonical tags
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const socialImageURL = new URL(ogImage.src, Astro.site);
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <!-- Canonical URL -->
    <link rel="canonical" href={canonicalURL} />

    <!-- Primary Meta Tags -->
    <title>{title}</title>
    <meta name="title" content={title} />
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex, nofollow" />}

    <!-- Open Graph / Facebook / LinkedIn / Slack -->
    <meta property="og:type" content={articleDate ? 'article' : 'website'} />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={socialImageURL} />
    <meta property="og:image:alt" content={imageAlt} />
    <meta property="og:image:width" content={String(ogImage.width)} />
    <meta property="og:image:height" content={String(ogImage.height)} />
    {articleDate && <meta property="article:published_time" content={articleDate.toISOString()} />}

    <!-- Twitter / X -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content={canonicalURL} />
    <meta property="twitter:title" content={title} />
    <meta property="twitter:description" content={description} />
    <meta property="twitter:image" content={socialImageURL} />
    <meta property="twitter:image:alt" content={imageAlt} />

    <!-- Sitemap Auto-Discovery -->
    <link rel="sitemap" href="/sitemap-index.xml" />

    <slot name="head" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Social Image Asset Requirements
- **Dimensions**: `1200 x 630` pixels for `/images/og-default.jpg`. When using per-page Content Collection `image()` posters via `getImage({ src: image, width: 1200, format: 'jpg' })`, emit `img.attributes.width` and `img.attributes.height` dynamically rather than hardcoding `630`, and extend `<project>/scripts/test-social-image.cjs` to check every built HTML page's `og:image` file and JPEG header dimensions in `dist/`.
- **Never pass `ImageMetadata.src` raw to `<meta property="og:image">`**: Astro only emits processed derivatives requested by `<Picture>`, `<Image>`, or `getImage()` into `dist/_astro/`; a raw `poster.src` string will 404 in production unless `getImage()` is called.
- **Format**: JPG (broadest compatibility across social and messaging scrapers).
- **Absolute URL**: Never use relative paths (`/images/og.jpg`); social scrapers require absolute URLs with the protocol and domain (`https://example.com/images/og.jpg`).
- **A screenshot card goes stale with the page.** When `og-default.jpg` is a capture of the hero, any change to the hero's words or the header (a number in a heading, a new nav item) leaves the old text baked into the image, and `test:social-image` only checks its size. When the hero or header changes, look at the image, and update its alt text in the same change. Recapture from the built site (`astro preview`), not the dev server, for example with Chrome on macOS:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
    --force-prefers-reduced-motion --window-size=1200,630 --virtual-time-budget=6000 \
    --user-data-dir="$(mktemp -d)" --screenshot=og.png http://127.0.0.1:4321/
  sips -s format jpeg -s formatOptions 60 og.png --out public/images/og-default.jpg
  ```
  `--force-prefers-reduced-motion` makes entrance animations show their finished state when the site's reduced-motion styles do; look at the result before saving it (the `astro-design-audit` skill's [headless capture pitfalls](../../astro-design-audit/SKILL.md#regression-gate-for-refactors), if installed). Sites that cache link previews keep the old card until they refetch the page. On one build a quality-60 JPEG came to 84 KB.

---

## 2. Automated XML Sitemap (`@astrojs/sitemap`)

Astro provides an official integration that automatically traverses all static routes and Content Collections at build time.

### 1. Installation
```bash
npm install @astrojs/sitemap
```

### 2. Configuration (`astro.config.mjs`)
Ensure `site` is set to the production URL. Without `site`, sitemap generation will fail:
```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/admin'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
```

During `npm run build`, Astro creates `dist/sitemap-index.xml` and `dist/sitemap-0.xml`.

---

## 3. Robots Configuration (`public/robots.txt`)

> [!NOTE]
> This is the **indexable-site** default. For demos, staging or client previews that must never be indexed, use the four-layer pattern in [`hosting-and-indexing.md`](hosting-and-indexing.md) §4 instead (`Disallow: /`, no sitemap).

Place a static `robots.txt` in `public/` so crawlers can discover the sitemap index immediately upon crawling:

```text
User-agent: *
Allow: /

# Disallow internal or error pages
Disallow: /404

# Point to automated XML Sitemap index
Sitemap: https://example.com/sitemap-index.xml
```

---

## 4. Structured Data (JSON-LD)

To establish rich search snippets, inject JSON-LD directly into the `<head>` of relevant layouts:

### Organisation / WebSite Schema (schema.org/Organization)
```astro
---
// In BaseLayout.astro or index.astro
const schema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Acme Corp',
  url: Astro.site?.toString(),
  logo: new URL('/images/logo.png', Astro.site).toString(),
  sameAs: [
    'https://twitter.com/acme',
    'https://linkedin.com/company/acme',
    'https://github.com/acme',
  ],
};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

### Article Schema (For Editorial / Blog Posts)
```astro
---
// In src/pages/posts/[slug].astro
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.data.title,
  description: post.data.description,
  datePublished: post.data.pubDate.toISOString(),
  url: new URL(Astro.url.pathname, Astro.site).toString(),
  image: new URL(post.data.image || '/images/og-default.jpg', Astro.site).toString(),
  author: {
    '@type': 'Person',
    name: post.data.author || 'Editorial Team',
  },
};
---

<script type="application/ld+json" set:html={JSON.stringify(articleSchema)} />
```

---

## 5. Static Hosting Headers & Redirects (Cloudflare Workers Static Assets & Pages)

> [!WARNING]
> **Cloudflare Workers Static Assets, Cloudflare Pages, and Netlify only.** Vercel ignores `public/_headers` and `public/_redirects` and serves them as public files. On Cloudflare Workers, `public/_headers` applies to static asset responses, including deployments with a Worker entrypoint. Responses generated by Worker code need headers set in code; see [`hosting-and-indexing.md`](hosting-and-indexing.md) §2. Confirm the host first, and use the per-host equivalents (`vercel.json`, `netlify.toml`) on other hosts.

When serving a static Astro site from Cloudflare Workers (Static Assets) or Cloudflare Pages, edge caching rules and security headers are configured using two static files in `public/`:

### 1. `public/_headers` (Caching & Security)
```text
# Immutable static assets (fonts, images, vite bundles)
/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=31536000, immutable

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Global security baseline
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
```

### 2. `public/_redirects` (URL Forwarding)
```text
# Clean 301 permanent redirects
/old-service     /services/new-service    301
/blog/*          /posts/:splat            301
```

#### Astro Server-Side Redirects (`astro.config.mjs`)
For server-rendered Astro sites (such as EmDash on Cloudflare Workers) or when configuring redirects directly in Astro:
```javascript
export default defineConfig({
  trailingSlash: 'always',
  redirects: {
    '/old-route/': {
      status: 301,
      destination: '/new-route/',
    },
  },
});
```
> [!WARNING]
> **Trailing-Slash Normalization Trap:** Never define duplicate entries with and without a trailing slash (e.g., both `'/old-route'` and `'/old-route/'`). Astro normalizes trailing slashes automatically based on your `trailingSlash` configuration. Specifying both keys triggers route collision errors during build:
> `The route "/old-route" is defined in both "/old-route" and "/old-route/". A static route cannot be defined more than once.`
> Always specify only the canonical route key matching your site's trailing slash convention.

---

## 6. GDPR-Safe Social Sharing (Zero-Tracker Contract)

Adding social share buttons to articles or case studies presents a major GDPR compliance trap.

### The Problem: Third-Party SDKs & Widgets
Embedding official share widgets or JavaScript SDKs (Facebook SDK, Twitter `widgets.js`, LinkedIn plugins, AddThis, ShareThis) leaks user data:
- The script executes immediately when the visitor loads the page, transmitting their **IP address**, **browser User-Agent**, and the exact page URL (**Referer header**) to social networks **before the user has clicked anything**.
- Under the **CJEU *Fashion ID* ruling (Case C-40/17)**, website owners are joint controllers for this unauthorised background data collection and cannot load these scripts without prior explicit consent via a cookie banner.

### The Architecture: Static Query URLs & Native Web Share
In Astro, social sharing must be implemented using **pure HTML anchor tags** pointing to static web share endpoints, styled with local inline SVGs. Zero external JavaScript, zero cookies, zero network calls on page load.

#### Static Share Endpoints Table
| Platform | Static URL Endpoint |
| :--- | :--- |
| **X (Twitter)** | `https://twitter.com/intent/tweet?text={title}&url={url}` |
| **LinkedIn** | `https://www.linkedin.com/sharing/share-offsite/?url={url}` |
| **Facebook** | `https://www.facebook.com/sharer/sharer.php?u={url}` |
| **Reddit** | `https://reddit.com/submit?url={url}&title={title}` |
| **Email** | `mailto:?subject={title}&body={url}` |

#### Progressive Enhancement with `navigator.share()`
Enhance the experience on mobile browsers (iOS/Android) and modern desktops by revealing a native share button using the browser's built-in operating system share sheet:

```astro
---
// src/components/SocialShare.astro
interface Props {
  title: string;
}

const { title } = Astro.props;
const currentUrl = new URL(Astro.url.pathname, Astro.site).toString();
const encodedUrl = encodeURIComponent(currentUrl);
const encodedTitle = encodeURIComponent(title);

const shareLinks = [
  { name: 'X', url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
  { name: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  { name: 'Email', url: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
];
---

<div class="c-share">
  <span class="c-share__label">Share:</span>
  <ul class="c-share__list" role="list">
    {shareLinks.map((link) => (
      <li>
        <a href={link.url} target="_blank" rel="noopener noreferrer" class="c-share__link">
          {link.name}
        </a>
      </li>
    ))}
  </ul>

  <!-- Native OS Share trigger (hidden by default, revealed if supported) -->
  <button type="button" class="c-share__native" data-native-share data-title={title} data-url={currentUrl} hidden>
    Share via...
  </button>
</div>

<script>
  if (navigator.share) {
    const btn = document.querySelector<HTMLButtonElement>('[data-native-share]');
    if (btn) {
      btn.hidden = false;
      btn.addEventListener('click', async () => {
        try {
          await navigator.share({ title: btn.dataset.title, url: btn.dataset.url });
        } catch {
          // User dismissed share dialog
        }
      });
    }
  }
</script>
```

### Compliance Checklist
- [ ] No remote social scripts (`widgets.js`, `connect.facebook.net`) loaded on the page.
- [ ] Social icons rendered as inline SVGs or local assets (no external icon fonts like FontAwesome CDN).
- [ ] All static links use `target="_blank" rel="noopener noreferrer"`.
- [ ] No cookie banner required for social sharing because zero trackers or cookies are stored.
