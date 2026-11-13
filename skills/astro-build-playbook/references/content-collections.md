# Astro Content Layer Modelling Guide

In Astro 7+, content is managed via the **Astro Content Layer**. Rather than defaulting every data structure to a monolithic JSON file, follow this 4-tier decision framework to choose the appropriate data modelling pattern.

---

## 1. The 4-Tier Content Decision Tree

| Pattern | Storage Structure | Astro 7 Loader | WordPress / ACF Mental Model | When to Use |
| :--- | :--- | :--- | :--- | :--- |
| **Pattern A: Editorial Prose** | `src/content/<name>/*.md` | `glob({ pattern: '**/*.md' })` | Custom Post Type with rich text / Gutenberg content (`post_content`) | Blog posts, articles, deep case studies with full narrative bodies, headings, blockquotes, and dedicated URLs (`/writing/[slug]`). |
| **Pattern B: Entity Records** | `src/content/<name>/*.yaml` | `glob({ pattern: '**/*.yaml' })` | Custom Post Type with ACF Custom Fields (Title, Meta, Icon, Short Text) | Modular entities (Services, Team Members, Projects, Testimonials) that have dedicated detail pages (`/services/[slug]`) or will be managed individually via a Git CMS. YAML is a useful default for newly authored multiline records. When a project already has canonical local JSON, preserve that source and use `file()` for validated entity collections; JSON collections can also generate dedicated detail routes. Storage format does not determine route scope. |
| **Pattern C: In-Page Repeaters** | `src/content/<name>.json` | `file('src/content/<name>.json')` | ACF Repeater field on a specific page template | Cohesive, in-page repetitive components (stats tickers, feature cards, pricing tiers, FAQs, trust badges) that live on a single page, are visually tightly coupled, and do **not** have dedicated standalone URLs. |
| **Pattern D: Global Singletons** | `src/data/site.json` | Direct ESM import (`import site from '../data/site.json'`) | ACF Options Page / Site Customiser / Theme Settings | Site identity, company registration number, main telephone, email, navigation links, and social URLs that are consumed globally across layouts without needing Content Layer validation or querying. |

---

### Existing JSON entity sources

The patterns distinguish content lifecycle and route needs; they do not restrict JSON to in-page repeaters. For supplied entity arrays, define one collection per entity using `file('assets/content/services.json')` (or the project's actual source path), retain stable IDs independently of URL slugs, and generate detail routes from `entry.data.slug`. Do not convert to YAML or relocate a handoff package solely to fit the examples. Keep one canonical loading approach; combined exports and derived projections can remain audit inputs.

### Date and time content

Distinguish a calendar date, a local wall-clock time and an instant. A full timestamp
stored in a Text field preserves its characters but does not supply missing timezone
intent. For instants, use an explicit offset/UTC value and an explicit formatting
`timeZone` where the content contract allows. Keep calendar dates as dates; converting
them to instants can shift the displayed day.

If established event content deliberately uses timestamps without offsets, document
its timezone and ensure every local/CI build interprets it consistently (`TZ` is a
build-environment option, not a reason to assume UTC or Europe/London universally).
Check machine-readable `datetime` values and calendar instants as well as visible
clock labels. One project's local UK and UTC CI builds displayed the same labels but
emitted instants an hour apart on a daylight-saving date. See [reproducible Git
builds](hosting-and-indexing.md#reproducible-git-builds).

## 2. WordPress / Etch Mental Model Translation

Coming from WordPress, ACF, and page builders like Etch, use this mapping to translate familiar data patterns into idiomatic Astro:

```
WordPress / ACF Concept                     Astro 7 Content Layer Equivalent
────────────────────────────────────────────────────────────────────────────────
CPT + Gutenberg / Elementor content   ──►   Pattern A: src/content/posts/*.md (glob)
CPT + ACF Custom Fields (detail page) ──►   Pattern B: src/content/services/*.yaml (glob)
ACF Repeater on Page Template         ──►   Pattern C: src/content/pricing.json (file)
ACF Options Page (site-wide settings) ──►   Pattern D: src/data/site.json (ESM import)
```

---

## 3. The "Stop & Ask" Decision Gate

AI agents and developers must avoid making premature architectural assumptions about content structures.

### Auto-Classification (No User Approval Needed)
- **Pattern C (In-Page Repeaters)**: Obvious visual widgets without URLs (stats counters, accordion FAQs, feature cards, logo strips).
- **Pattern D (Global Singletons)**: Global site settings (phone, contact email, copyright, header navigation).

### Ambiguous Entities (Stop & Ask Required)
When encountering **Services, Projects, Case Studies, Testimonials, or Team Members**, pause and ask the user:

> *"I detected [Services] in the design. How would you like to model this content?*
> 1. *(Recommended) Pattern B (`src/content/services/*.yaml` via `glob`): Individual structured YAML records with dedicated detail pages (`/services/[slug]`) and CMS compatibility.*
> 2. *Pattern C (`src/content/services.json` via `file`): Single JSON array for in-page display only (no individual URLs).*
> 3. *Pattern A (`src/content/services/*.md` via `glob`): Markdown files with full long-form editorial bodies for deep case studies or service narratives."*

---

## 4. Code Implementations & Schemas

### `src/content.config.ts`
```typescript
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';

// Pattern A: Editorial Prose (Markdown files with body)
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    order: z.number().default(0),
  }),
});

// Pattern B: Entity Records (YAML files for structured entities)
const services = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/services' }),
  schema: z.object({
    title: z.string(),
    headline: z.string(),
    description: z.string(),
    icon: z.string(),
    featured: z.boolean().default(false),
    order: z.number().default(0), // CRITICAL for design order
  }),
});

// Pattern C: In-Page Repeaters (Single JSON array for in-page widgets)
const testimonials = defineCollection({
  loader: file('src/content/testimonials.json'),
  schema: z.object({
    id: z.string(),
    quote: z.string(),
    author: z.string(),
    role: z.string(),
    company: z.string(),
    avatar: z.string().optional(),
    order: z.number().default(0), // CRITICAL for design order
  }),
});

export const collections = { posts, services, testimonials };
```

---

## 5. Rendering Patterns in Components & Pages

### Rendering Pattern B / C in a Component
```astro
---
import { getCollection } from 'astro:content';

// Always sort explicitly by order:
const services = (await getCollection('services'))
  .map(entry => ({ id: entry.id, ...entry.data }))
  .sort((a, b) => a.order - b.order);
---

<div class="c-grid">
  {services.map(service => (
    <article class="c-service-card">
      <h3 class="c-service-card__title">{service.title}</h3>
      <p class="c-service-card__desc">{service.description}</p>
      <a class="c-service-card__link" href={`/services/${service.id}`}>Learn more</a>
    </article>
  ))}
</div>
```

### Generating Dynamic Detail Routes for Pattern A or B (`[slug].astro`)
```astro
---
// src/pages/services/[slug].astro
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const entries = await getCollection('services');
  return entries.map(entry => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

const { entry } = Astro.props;
---

<BaseLayout title={entry.data.title} description={entry.data.headline}>
  <main class="l-container">
    <h1>{entry.data.title}</h1>
    <p class="c-lead">{entry.data.headline}</p>
    <div class="c-body">{entry.data.description}</div>
  </main>
</BaseLayout>
```

### Pattern D: Global Singletons
Place site-wide data in `src/data/site.json`:
```json
{
  "name": "Acme Corp",
  "phone": "+44 20 7946 0991",
  "email": "hello@example.com",
  "nav": [
    { "label": "Services", "href": "/services" },
    { "label": "About", "href": "/about" },
    { "label": "Contact", "href": "/contact" }
  ]
}
```

Consume directly via standard JavaScript/TypeScript ESM imports:
```astro
---
// src/components/Header.astro
import site from '../data/site.json';
---
<header class="l-header">
  <a href="/" class="l-header__brand">{site.name}</a>
  <nav class="l-header__nav" aria-label="Main Navigation">
    {site.nav.map(item => (
      <a href={item.href}>{item.label}</a>
    ))}
  </nav>
</header>
```

### Pattern A: Automated RSS 2.0 Syndication (`src/pages/rss.xml.ts`)
When building editorial writing or blogs (**Pattern A**), always implement an automated RSS 2.0 feed using `@astrojs/rss`:

1. **Set Canonical Domain**: Configure `site: 'https://example.com'` in `astro.config.mjs`.
2. **Auto-Discovery Tag**: Include in `BaseLayout.astro` `<head>`:
   ```html
   <link rel="alternate" type="application/rss+xml" title={title} href={new URL('rss.xml', Astro.site)} />
   ```
3. **Endpoint (`src/pages/rss.xml.ts`)**:
   ```typescript
   import rss from '@astrojs/rss';
   import { getCollection } from 'astro:content';
   import type { APIContext } from 'astro';

   export async function GET(context: APIContext) {
     const posts = (await getCollection('posts'))
       .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

     return rss({
       title: 'Site RSS Feed',
       description: 'Latest articles and editorial updates.',
       site: context.site!,
       items: posts.map((post) => ({
         title: post.data.title,
         pubDate: post.data.pubDate,
         description: post.data.description,
         link: `/posts/${post.id}/`,
       })),
     });
   }
   ```

---

## 6. The Alphabetical Sorting Trap

Astro's internal store indexes entries by their ID and sorts them alphabetically by default. If your JSON or YAML has entries ordered logically (e.g. `Featured`, `Standard`, `Enterprise`), Astro will shuffle them if IDs are not alphabetical (`enterprise`, `featured`, `standard`).

**The 3-Step Sorting Protection** (for content without ordering of its own; don't add a second order field to a type that already has one):
1. **Always add `order` to content**: Provide `"order": 1` in JSON or `order: 1` in YAML.
2. **Always include `order: z.number().default(0)` in the Zod schema**.
3. **Always explicitly sort in Astro**:
   ```astro
   const items = (await getCollection('<name>'))
     .map(e => e.data)
     .sort((a, b) => a.order - b.order);
   ```

---

## 7. Placeholder Routes & Link Integrity

Designs link to pages that aren't in scope yet: nav items, footer columns, legal pages. **Never ship those links as `href="#"` or to routes that 404**, and don't invent page content to fill them. Generate placeholder pages from data instead.

1. **Data file** `src/data/placeholder-pages.json`, with one entry per linked-but-unbuilt route:
   ```json
   [
     { "path": "about", "title": "About", "section": "Company" },
     { "path": "products/compare", "title": "Compare Products", "section": "Products" }
   ]
   ```
2. **One catch-all route** `src/pages/[...placeholder].astro`:
   ```astro
   ---
   import placeholders from '../data/placeholder-pages.json';
   export const getStaticPaths = () =>
     placeholders.map((page) => ({ params: { placeholder: page.path }, props: { page } }));
   const { page } = Astro.props;
   ---
   <BaseLayout title={`${page.title} | Site`} noindex={true}>…</BaseLayout>
   ```
   Explicit routes such as `products/[id].astro` take precedence, so nested placeholder paths can sit alongside real dynamic routes.
3. **Keep placeholders out of search:** `noindex`, and filter them from `@astrojs/sitemap` by reading the same JSON in `astro.config.mjs`:
   `sitemap({ filter: (page) => !placeholderPaths.has(new URL(page).pathname) })`.
4. **Retire an entry** when its real page ships. Delete it from the JSON; don't leave both.
5. **Guard with a test.** The baseline `test:discovery` gate walks every built HTML file, resolves each root-relative `<a href>` against `dist/` (`/path/` → `dist/path/index.html`), and fails with a list of broken links and the pages they appear on. This catches removed placeholders and typo'd nav links. Projects installed before 2026-10-25 lack the check; update the gate from `scripts/gates/`.

A contact placeholder may show contact details, but **must not include a form** until the forms decision gate is resolved.

---

## 8. Optional CMS Layer (`references/git-cms.md`)

All four Content Layer patterns (Patterns A–D) and `src/data/placeholder-pages.json` work out of the box **without a CMS**. If the user wants browser-based editing, consult [`git-cms.md`](git-cms.md) for the optional CMS decision matrix (no CMS vs **Sveltia CMS** at `/admin/` vs Pages CMS vs headless CMS) and the Sveltia + Cloudflare Worker OAuth recipe.

## 9. Relational JSON validation before loading

Validate raw entity arrays **before loader storage** when unique IDs matter: a store keyed by ID can collapse duplicate source records, so checking only `getCollection()` results can miss them. Run the source validator from `prebuild` (or an equivalent build entry point), not only an optional test command. Use the same field schemas as the collections where practical, then validate loaded relationships during page generation.

For a relational dataset, check unique IDs and route slugs, valid foreign keys, duplicate relationship members, and unique composite pairs such as `(serviceId, locationId)`. Validate finite non-negative amounts and currency/locale consistency against the project's supported mapping. When availability is a flag-or-explicit-ID relationship, compute that relation rather than inferring it from prices. Enforce price coverage only where the project's contract requires it; do not invent a price for a newly available pair or substitute zero for missing data. Compare supplied derived snapshots as audit evidence without making them an independently maintained application source.

Verify meaningful failure cases (duplicate raw IDs/pairs, invalid references, missing required prices, mismatched currencies) and allow a valid zero amount. In built-page checks, compare rendered group membership and amounts with source records rather than only checking that a page exists.

## 10. Location-specific currency formatting

Use each location's `locale` and `currency` with `Intl.NumberFormat` at build/server time. Amounts must follow the dataset's units; do not assume integers mean minor currency units. `currencyDisplay: 'symbol'` gives local symbol placement and separators, for example `£90.00` in `en-GB` and `105,00 €` in `de-DE`.

When several currencies appear on one page, disambiguate currencies that share a symbol according to the agreed presentation rule. `formatToParts()` allows replacing only the `currency` part (for example USD → `US$`, CAD → `CA$`) while preserving locale-specific spacing, placement, decimals and grouping. Those labels are an explicit presentation choice, not a universal `Intl` convention. Do not concatenate a currency prefix onto a separately formatted amount. Test actual rendered amounts and currency positions across every supported locale/currency pair.


## 11. Article review, preview and publication

For an existing editorial site, inspect its collection schema, route wrapper, layout and discovery queries before adding content. Preserve approved copy and the project's architecture. Map the article to existing fields for title, summary/description, slug, date, topics, author and reading time; do not impose the example schema above or introduce new fields without a concrete need. Apply the author's established spelling and punctuation rules. For professional writing, edit and clarify the author's supplied views rather than inventing opinions or experience. An approved draft does not need a new interview or drafting cycle.

### Publication eligibility

Use the project's existing draft/publication convention. Apply the same eligibility rule across detail routes, listings, pagination, related articles, RSS and any sitemap/custom discovery source. Check the generated output: hiding an article from the index alone does not make its route or feed entry unpublished. If no draft convention exists and review must remain unpublished, prepare an isolated local review build rather than adding the article to an automatically deployed branch.

### Local review previews

When draft filters prevent rendering, temporarily enable only the article being reviewed in an isolated checkout, build a localhost preview and restore the original source flag in a `finally` block, even if the build fails. Use a project's existing draft-preview mechanism instead when available. Provide the exact review URL and state how the preview is served.

**Source state and build output are separate.** Restoring `draft: true` does not remove an article from previously generated `dist/` files. Label those assets as review output and rebuild from the intended publication state before any deployment. Do not commit temporary preview flags or push to an automatically deployed branch without publication authorisation. For server-rendered CMS projects, follow their existing editorial preview/access controls rather than applying this static-build procedure.

### Review and release verification

Compare rendered prose with the approved draft: paragraph breaks, headings, emphasis, lists and any callouts. Verify TOC links against the actual generated heading IDs; matching heading text alone is insufficient. Check prose list styling and visible markers in the rendered article.

Inspect the rendered canonical URL, description, Open Graph/Twitter metadata, existing structured data and social-image URL/dimensions using the [SEO guidance](seo-and-metadata.md). Reuse existing social-image handling unless a different direction is approved. Verify publication-ready entries in RSS, sitemap and listings, and draft exclusion from those same surfaces.

On explicit publication authorisation, apply the reviewed changes to the current repository, resolve the publication date from the user's instruction or established project convention, enable publication and rebuild. Run applicable existing checks, use the verified [deployment path](hosting-and-indexing.md), then check the public domain's article, metadata, discovery entries and formatting. A successful push or deploy command alone does not establish that the expected content is live.


## Runtime and ordering boundaries

The local patterns above apply to no CMS/Sveltia. EmDash uses live database collections,
references and frontend adapters per [EmDash](emdash.md); do not apply local Zod loaders,
`getStaticPaths` or build-time `paginate()` to its live routes. Preserve ordering and relationship
validation across either branch. Existing JSON entity sources remain canonical when chosen.
For collections with no native ordering, store an explicit numeric order, default it in the
local schema and sort before rendering. A source's own native ordering is already a contract;
do not introduce a second field solely to satisfy the local-loader example. Run `astro sync`
after schema edits. For local route collections displaying more than 12 entries, use the
pagination pattern above.
