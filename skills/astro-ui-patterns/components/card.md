## 17. Card

A content card for posts, events, people or services: heading, optional media, meta and
body, optional secondary actions. With `href`, the whole card is clickable through its
title link, under the [ClickableParent](clickable-parent.md) contract. Layout responds to
the **card's own width** through a container query, not to the viewport, so the same card
works in a three-column grid, a sidebar and a full-width feature slot. Pure CSS, 0 KB JS.

### Contract

- **Its own block.** A card is `.c-card`. The grid or list that holds cards is a separate
  block (`.c-card-grid` below), so a card makes no assumptions about where it sits.
- **Heading first in the DOM.** The title comes before the media and meta in source order,
  so screen-reader and heading navigation reach the title first. Grid areas place the media
  visually above it, and `order` places the meta. The image is decorative or repeats the
  title, so the visual order doesn't change the meaning (WCAG 1.3.2).
- **Heading level is a prop.** Use `headingLevel` to fit the page outline (default `3`).
- **Clickable only through the title link.** The `href` link inside the heading carries the
  overlay. Never wrap the card in `<a>`. Body text holds no links. Secondary actions go in
  the `actions` slot, which sits above the overlay.
- **Alt text.** Use `alt=""` when the image repeats the title or is decorative. A meaningful
  image gets real alt text. It's outside the link, so it never pads the link's name.
- **Size by container.** The card is an `inline-size` query container named `card`, and
  `.c-card__inner` switches to a side-by-side layout when the card itself is at least
  `36rem` wide. An inline-size container can't size itself from its content, so place cards
  in a grid or give them a width. In a flex row with no basis they collapse.
- **Equal heights.** The card fills its grid cell, and the body row takes the spare space,
  so action rows line up across a grid row.

### Component (`src/components/ui/Card.astro`)

```astro
---
interface Props {
  title: string;
  href?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  as?: 'article' | 'div';
  class?: string;
}

const {
  title,
  href,
  headingLevel = 3,
  as: Tag = 'article',
  class: className = '',
} = Astro.props;

const Heading = `h${headingLevel}`;
const hasMedia = Astro.slots.has('media');
const hasMeta = Astro.slots.has('meta');
const hasActions = Astro.slots.has('actions');
---

<Tag class:list={['c-card', { 'c-card--has-media': hasMedia }, className]}>
  <div class="c-card__inner">
    <div class="c-card__body">
      <Heading class="c-card__title">
        {href ? <a class="c-card__link" href={href}>{title}</a> : title}
      </Heading>
      {hasMeta && <p class="c-card__meta"><slot name="meta" /></p>}
      <div class="c-card__text"><slot /></div>
    </div>
    {hasMedia && <div class="c-card__media"><slot name="media" /></div>}
    {hasActions && <div class="c-card__actions"><slot name="actions" /></div>}
  </div>
</Tag>

<style>
  .c-card {
    container: card / inline-size;
    position: relative;
    block-size: 100%;
    overflow: clip;
    color: var(--card-color, CanvasText);
    background: var(--card-background, Canvas);
    border: var(--card-border, 1px solid color-mix(in oklab, currentColor 20%, transparent));
    border-radius: var(--card-radius, 0.5rem);
  }

  .c-card__inner {
    display: grid;
    grid-template-areas: "media" "body" "actions";
    grid-template-rows: auto 1fr auto;
    block-size: 100%;
  }

  .c-card__body {
    grid-area: body;
    display: flex;
    flex-direction: column;
    gap: var(--card-gap, 0.5rem);
    padding: var(--card-padding, 1.25rem);
  }

  .c-card__title {
    margin: 0;
    font-size: var(--card-title-size, 1.25em);
    line-height: var(--card-title-leading, 1.25);
  }

  .c-card__link {
    color: inherit;
    text-decoration-line: none;
  }

  .c-card__link:hover,
  .c-card__link:focus-visible {
    text-decoration-line: underline;
  }

  /* ClickableParent contract: the title link's hit area covers the card. */
  .c-card__link::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: var(--card-overlay-z, 1);
  }

  .c-card__meta {
    order: -1;
    margin: 0;
    font-size: var(--card-meta-size, 0.875em);
  }

  .c-card__text > :global(:first-child) {
    margin-block-start: 0;
  }

  .c-card__text > :global(:last-child) {
    margin-block-end: 0;
  }

  .c-card__media {
    grid-area: media;
  }

  .c-card__media :global(img) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    aspect-ratio: var(--card-media-ratio, 16 / 9);
    object-fit: cover;
  }

  /* Above the overlay; gaps between actions still fall through to the title link. */
  .c-card__actions {
    grid-area: actions;
    position: relative;
    z-index: calc(var(--card-overlay-z, 1) + 1);
    display: flex;
    flex-wrap: wrap;
    gap: var(--card-gap, 0.5rem);
    padding: 0 var(--card-padding, 1.25rem) var(--card-padding, 1.25rem);
    pointer-events: none;
  }

  .c-card__actions > :global(*) {
    pointer-events: auto;
  }

  .c-card__actions :global(:is(a, button)) {
    display: inline-flex;
    align-items: center;
    min-block-size: 2.75rem;
  }

  .c-card:has(.c-card__link:hover) {
    box-shadow: var(--card-hover-shadow, none);
  }

  @supports selector(:has(*)) {
    .c-card__link:focus-visible {
      outline: none;
    }

    .c-card:has(.c-card__link:focus-visible) {
      outline: var(--card-focus-ring, 3px solid currentColor);
      outline-offset: var(--card-focus-offset, 3px);
    }
  }

  @container card (inline-size >= 36rem) {
    .c-card--has-media .c-card__inner {
      grid-template-columns: minmax(10rem, 2fr) 3fr;
      grid-template-areas: "media body" "media actions";
      grid-template-rows: 1fr auto;
    }

    .c-card--has-media .c-card__media :global(img) {
      aspect-ratio: auto;
    }
  }
</style>
```

`overflow: clip` rounds the media's corners to the card radius. It doesn't clip the card's
own focus outline, and the overlay is positioned against the card itself, so it stays
inside the clip. The hover treatment defaults to the title underline only. Set
`--card-hover-shadow` (or add a `translate` lift inside
`@media (prefers-reduced-motion: no-preference)`) when the design calls for it.

### Grid and usage

```astro
---
import { Image } from 'astro:assets';
import Card from '../components/ui/Card.astro';
---

<ul class="c-card-grid" role="list">
  {posts.map((post) => (
    <li>
      <Card title={post.data.title} href={`/blog/${post.id}/`} headingLevel={3}>
        <Image slot="media" src={post.data.cover} alt=""
          widths={[400, 800]} sizes="(min-width: 60rem) 30vw, 100vw" />
        <time slot="meta" datetime={post.data.date.toISOString()}>
          {post.data.date.toLocaleDateString('en-GB', { dateStyle: 'long' })}
        </time>
        <p>{post.data.summary}</p>
      </Card>
    </li>
  ))}
</ul>

<style>
  .c-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-grid-min, 18rem)), 1fr));
    gap: var(--card-grid-gap, 1.5rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
```

`role="list"` restores list semantics that Safari/VoiceOver drops when `list-style: none`
is set. With a secondary action, put a label-in-name control in the `actions` slot:

```astro
<a slot="actions" href={`/events/${event.id}/book/`}
   aria-label={`Book a place: ${event.data.title}`}>Book a place</a>
```

Without `href`, the card is static: no overlay, no hover or focus treatment.

Theme cards by setting `--card-*` on an ancestor (the grid or a section). A scoped class
passed through `class` won't style the card's root under Astro's default attribute
scoping. Target it with `:global(.my-class)` if a one-off override is needed.

**Framework projects:** map the props and slots onto the framework's card primitive and
keep this contract. On Lumos, use its card and check that a second action in the card stays clickable. Map `--card-*` to the project's tokens rather
than hardcoding values.

### Verification

- Every check in [ClickableParent](clickable-parent.md#verification), run against
  `.c-card__link`.
- **Container switch:** render the same card in a narrow column and a wide slot at one
  viewport width. Only the wide one goes side by side. Check at 320px viewport width and at
  200% text zoom (WCAG 1.4.10 reflow).
- **Order:** the heading outline (e.g. the browser's accessibility tree or a headings
  bookmarklet) lists the title at the intended level. A screen reader reads the title
  before the meta.
- **Equal heights:** in a grid row with different summary lengths, the action rows line up
  and no card overflows.
- **Images:** each `alt` matches the decision in the contract, and the media keeps its ratio
  without distortion in both layouts.
