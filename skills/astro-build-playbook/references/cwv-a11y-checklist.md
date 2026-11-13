# Core Web Vitals & Accessibility Checklist

## 1. Core Web Vitals (Target: 95–100)

### FCP (First Contentful Paint ≤ 0.9s desktop / ≤ 1.8s mobile)
- [ ] Eliminate render-blocking stylesheets: set `build: { inlineStylesheets: "always" }` in `astro.config.mjs` for marketing/content sites where total compressed CSS is small (~8–15 KB brotli). Eliminates external stylesheet round-trips that cause amber FCP on desktop.

### LCP (Largest Contentful Paint ≤ 2.5s)
- [ ] Preload Hero image in `<head>` ahead of font preloads:
  `<link rel="preload" as="image" type="image/webp" href="..." imagesrcset="..." imagesizes="..." fetchpriority="high" />`
  - **`<head>` dispatch order matters on mobile**: Place the LCP image preload **before** `<Font preload />` tags (immediately after `<meta name="viewport">`). On bandwidth-constrained mobile connections (1.6 Mbps), stream multiplexing allocates initial bandwidth to requests discovered first. Preloading fonts before the LCP image delays image delivery by 200–450ms. Since text renders immediately with 0 CLS using metric-adjusted fallback fonts (`size-adjust` on Arial) and `font-display: swap`, the LCP image must have first priority on the wire.
  - **Astro `<Image>` vs `getImage` hash matching gotcha**: When calling Astro's `getImage` to compute preload attributes, you MUST pass matching layout options (`fit: "cover"`, `position: "center"`, and matching `quality`). Astro's static build hashes `fit` and `position` (`DEFAULT_HASH_PROPS`). If omitted from `getImage`, the preload URL and `<img>` tag URL generate differing hashes, resulting in a duplicate image download that doubles network payload and defeats the preload.
- [ ] Set `decoding="sync"` on eager/above-the-fold images (`loading="eager"`). Default `decoding="async"` defers paint by 100–300ms on throttled mobile CPUs (element render delay).
- [ ] Responsive `srcset` (600w, 900w, 1200w or 640w–1280w) on Hero `<img>`.
- [ ] Leave `<Image>` `quality` unset by default: Astro passes none, and sharp's WebP default of 80 is fine for most images. Lower it per image only when a measured variant justifies it (e.g. a busy hero photo whose largest variant comes out heavier than the source), never above 80, and check a 1:1 crop.
- [ ] Set `fetchpriority="high"` and `loading="eager"` on Hero `<img>`.
- [ ] Preload WOFF2 variable fonts in `<head>` with `<link rel="preload" as="font" type="font/woff2" crossorigin>`.

### CLS (Cumulative Layout Shift ≤ 0.1)
- [ ] Explicit `width` and `height` attributes on EVERY `<img>` tag.
- [ ] Explicit `aspect-ratio` set on image media containers.
- [ ] Carousels stacked via CSS Grid (`grid-template-areas: "slide"`) with `visibility: hidden` to lock container height.
- [ ] Inspect first-paint controls as well as media: facet buttons, counts and other toolbars should not grow from empty containers after initialisation. Prefer build/server-rendered controls enhanced in place; a fixed height is not a robust substitute when labels wrap differently across widths.
- [ ] Recheck the production build with the relevant enhancement script deliberately delayed, including widths where controls wrap or switch to a select. Capture layout-shift attribution before initialisation (a buffered `PerformanceObserver` can provide targeted evidence), exclude recent-input shifts, and compare initial/settled geometry. Keep temporary probes local and out of shipped code; a clean warm reload alone does not establish zero startup CLS.

### Mobile Tap Targets (WCAG 2.2 AA & Lighthouse Target: 100/100)
- [ ] Icon-only controls (`.play`, `.close`, `.arrow` on carousels, sliders, tabs, modals) must enforce `min-width: 3rem; min-height: 3rem;` (48×48px) via CSS flex alignment to satisfy mobile tap-target audits and avoid penalties when controls sit adjacent to each other.

### Environment Audit Rule
- [ ] Always audit CWVs on `npm run build` / `astro preview`, NOT on `astro dev` (dev server compiles unminified on the fly and runs dev toolbars).
- [ ] Set `devToolbar: { enabled: false }` in `astro.config.mjs`.

---

## 2. WCAG 2.2 AA Accessibility (Target: 100/100)

### Landmarks & Structure
- [ ] Skip link at top of `<body>`: `<a href="#main-content" class="c-skip-link">Skip to main content</a>`.
- [ ] Single `<main id="main-content">` landmark.
- [ ] Strictly linear heading hierarchy (exactly one `<h1>`, followed by `<h2>`, then `<h3>`).
- [ ] Repeated named regions have distinguishable **accessible names**, not merely unique element IDs. For location → category sections, `aria-labelledby="location-bath bath-massage"` references both visible headings and produces “Bath Massage”; repeating only “Massage” across locations can trigger axe's `landmark-unique` rule. Keep referenced IDs unique and valid. If a subgroup does not need to be a landmark, an ordinary unnamed section/div may be more appropriate than adding ARIA labels to every wrapper.

### Tabs Pattern
- [ ] Tab container: `role="tablist"`, `aria-label="..."`.
- [ ] Tab buttons: `role="tab"`, `aria-selected="true|false"`, `aria-controls="panel-id"`, roving `tabindex="0|-1"`.
- [ ] Arrow key navigation: Left/Right/Home/End keyboard handling.
- [ ] Panels: `role="tabpanel"`, `aria-labelledby="tab-id"`, `hidden` when inactive.

### Carousel Pattern
- [ ] Section: `aria-roledescription="carousel"`, `aria-label="..."`.
- [ ] Slide container: `aria-live="polite"`.
- [ ] Slide items: `role="group"`, `aria-roledescription="slide"`, `aria-label="X of Y"`, `aria-hidden="true|false"`.
- [ ] Controls: Visible pause/play button, dots with `aria-current="true|false"`, pause on hover and focus.
- [ ] Respects `prefers-reduced-motion: reduce`.

---

## 3. SEO & Social Metadata (Target: 100% Valid)

### Metadata & Canonical
- [ ] Absolute canonical URL (`new URL(Astro.url.pathname, Astro.site)`) present in `<head>`.
- [ ] Complete Open Graph payload (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`).
- [ ] Twitter card meta tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
- [ ] 1200x630px social card (`og-default.jpg`) stored in `public/images/` and served via absolute URL.

### Search Crawlers & Routing
- [ ] **Indexable sites:** automated XML sitemap generated via `@astrojs/sitemap` at `dist/sitemap-index.xml`, and `public/robots.txt` points to `Sitemap: https://example.com/sitemap-index.xml`.
- [ ] **Non-indexable sites:** every page `noindex`, `X-Robots-Tag` in host config, `robots.txt` `Disallow: /`, no sitemap or RSS, and access control if the content is private (see `hosting-and-indexing.md` §4).
- [ ] Every internal link resolves in the built output; unbuilt routes are `noindex` placeholder pages.
- [ ] Accessible `src/pages/404.astro` page rendering into `dist/404.html` for edge static hosts.
- [ ] Headers configured **for the actual host** (`public/_headers` on Cloudflare Workers Static Assets / Pages; headers in code for Worker-generated responses; the host's own config elsewhere) with immutable asset caching and baseline security policies. No config files for other hosts left in `public/`.
- [ ] Headers, trailing-slash redirects and 404 verified with `curl -D -` against the **live production URL**, not just the build.

### Rendering
- [ ] Every image in a fixed-height or absolutely positioned frame stays inside it: `<picture>` has `block-size: 100%`, the frame has `overflow: hidden`, and `img` height equals frame height at 375 / 1024 / 1440 / 1920px.

---

## 4. WebGL / 3D Canvas Runtimes & Build Scripts

### Progressive Enhancement (`html.gl` Gate) & Static Fallback
- [ ] Gate WebGL layout rules under `html.gl` (toggled by an inline `<head>` capability script only after verifying WebGL2 context creation and device memory/hardware thresholds) and remove `.gl` on `webglcontextlost`.
- [ ] Ensure `html:not(.gl)` renders a complete, readable static layout with no hidden copy or broken sticky stages when WebGL is disabled or unsupported.
- [ ] Pause the `requestAnimationFrame` loop when the `<canvas>` scrolls out of view (`IntersectionObserver`) or the tab is hidden (`visibilitychange`).
- [ ] Skip WebGL start-up when `prefers-reduced-motion: reduce` matches; those visitors get the static fallback.

### JSDOM `<canvas>` Filter in `<project>/scripts/run-axe.cjs`
- [ ] When pages contain `<canvas>` elements, JSDOM logs `Not implemented: HTMLCanvasElement's getContext() (without installing the canvas npm package)` to `stderr`. Pass a `VirtualConsole` to `new JSDOM(...)` in `<project>/scripts/run-axe.cjs` that filters that specific message so `npm run test:a11y` output stays clean without requiring the native `canvas` package:
  ```javascript
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!error.message.includes("HTMLCanvasElement's getContext()")) {
      console.error(error);
    }
  });
  ```

### CI / Cloud Build Fallback for Binary Asset Scripts (`cwebp` → `sharp`)
- [ ] Any `predev` / `prebuild` script that processes textures or images via a local CLI binary (`cwebp`, `avifenc`, etc.) MUST detect whether the binary is on `PATH` (`spawnSync('cwebp', ['-version'], { stdio: 'ignore' }).status === 0`) and fall back to `sharp` (already installed in `dependencies`) when running in GitHub Actions or Cloudflare Workers Builds Linux containers where Homebrew binaries aren't installed.



### Profiling heavy client runtimes

Lighthouse alone does not show the real GPU/runtime cost. For heavy WebGL/Three.js bundles,
profile in the browser's performance tools (main-thread long tasks, GPU time, frame rate) on
representative hardware, and load the runtime lazily after first paint; Vite bundles and hashes
it natively. Measure live CMS TTFB, render duration and query count before browser
asset tuning; [EmDash](emdash.md) covers relationship reads and catalogue-loading cost.
