## 16. ClickableParent

Makes a whole group (a card, a list row, a teaser) clickable through **one real link or
button** whose hit area is stretched over its container with a `::after` overlay. Pure CSS,
0 KB JS. The control keeps its own accessible name, and middle-click, Cmd/Ctrl-click,
"Open in new tab", the status-bar URL preview and keyboard behaviour all stay native.

[Card](card.md) applies this contract to its own markup. Use this wrapper for other markup.

### Contract

- **One primary control, one accessible name.** Mark one `<a href>` (or a `<button>` for a
  JS action such as opening a dialog) with `data-clickable-link`. Put it in the heading, so
  its name is the title and nothing else.
- **Never wrap the whole group in `<a>`.** That makes every word part of the link's name, and
  if the group contains any other control the HTML is invalid (interactive content nested
  in `<a>`).
- **Never fake it with script.** Don't use `onclick` + `location.href` on the container, or
  `role="link"`/`tabindex` on a `<div>`. They break new-tab, context-menu and keyboard
  behaviour, and they add a second focus stop or none at all.
- **Secondary controls go above the overlay.** Mark every other link, button or input with
  `data-clickable-secondary`. Each keeps its own target and focus ring. Body text holds no
  unmarked links: the overlay would cover them.
- **No redundant "Read more" link** to the same URL (it adds a duplicate tab stop and a
  duplicate entry in the links list). If the design shows "Read more →", render it as
  `<span aria-hidden="true">`.
- **Focus wraps the container.** When the primary control is `:focus-visible`, the
  container gets the ring and the control's own ring is removed. This happens only behind
  `@supports selector(:has(*))`, so browsers without `:has()` keep the native ring.
  Secondary controls always keep theirs. Never use a blanket
  `:focus { outline: none !important }` on descendants.
- **No positioned element between the control and the container.** The overlay's
  containing block is the nearest positioned ancestor of the control. A wrapper with
  `position: relative` (or `transform`, `filter` or `contain: layout`) shrinks the overlay
  to that wrapper.
- **Text selection trade-off.** The overlay intercepts drag-to-select. If people need to
  copy something (a phone number, an address, a reference), mark that element
  `data-clickable-secondary`, or don't use the pattern.
- **Don't nest clickable containers.**
- **Builder canvases.** A visual builder can treat the stretched hit area as the whole
  group and block selection of its other blocks. Disable the overlay in the canvas using the
  builder's canvas marker, and keep every block editable. Check the installed builder version
  for a canvas marker and record what you find in the project's decision log. No marker is
  documented in this skill.

### Component (`src/components/ui/ClickableParent.astro`)

```astro
---
interface Props {
  as?: 'div' | 'article' | 'li' | 'section';
  class?: string;
}

const { as: Tag = 'div', class: className = '' } = Astro.props;
---

<Tag class:list={['c-clickable', className]}>
  <slot />
</Tag>

<!--
  is:global because the controls arrive through the slot: Astro's scoped styles don't reach
  slotted markup. Every selector is namespaced to .c-clickable.
-->
<style is:global>
  .c-clickable {
    position: relative;
  }

  .c-clickable [data-clickable-link]::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: var(--clickable-overlay-z, 1);
  }

  .c-clickable [data-clickable-secondary] {
    position: relative;
    z-index: calc(var(--clickable-overlay-z, 1) + 1);
  }

  .c-clickable [data-clickable-link]:hover,
  .c-clickable [data-clickable-link]:focus-visible {
    text-decoration-line: underline;
  }

  @supports selector(:has(*)) {
    .c-clickable [data-clickable-link]:focus-visible {
      outline: none;
    }

    .c-clickable:has([data-clickable-link]:focus-visible) {
      outline: var(--clickable-focus-ring, 3px solid currentColor);
      outline-offset: var(--clickable-focus-offset, 3px);
    }
  }
</style>
```

Hover on the overlay counts as hover on the control, because the pseudo-element belongs to
it. Style the whole container on hover from the consuming component with
`.my-block:has([data-clickable-link]:hover) { … }`.

### Usage

```astro
<ClickableParent as="article" class="c-teaser">
  <h3 class="c-teaser__title">
    <a href="/events/autumn-fair/" data-clickable-link>Autumn Fair</a>
  </h3>
  <p class="c-teaser__summary">Stalls, music and food on the green.</p>
  <span class="c-teaser__cue" aria-hidden="true">Read more →</span>
  <a href="/events/autumn-fair/book/" data-clickable-secondary
     aria-label="Book a place: Autumn Fair">Book a place</a>
</ClickableParent>
```

The visible "Book a place" starts its accessible name (label-in-name). For a JS action,
use `<button type="button" data-clickable-link>` with the same CSS.

**Styling the container from the parent:** Astro's default attribute scoping
(`data-astro-cid-*`) doesn't reach a child component's root. A scoped `.c-teaser { … }` in
the page won't style the `<article>` above (checked on Astro 7.4.11). Use
`:global(.c-teaser)` in the parent's `<style>`, or a global stylesheet. The slotted heading
and links belong to the parent, so its scoped styles reach them.

**Framework projects:** keep the contract and use the framework's own primitive. Lumos
cards, for example, already ship a stretched-link rule; use it (and check that a second action
in the card stays clickable) rather than adding this wrapper.

### Verification

- **Pointer:** clicking the padding, body text or image goes to the primary target, and
  clicking each secondary control goes to its own. Check from DevTools, with no positioned
  ancestor in between:
  ```js
  [...document.querySelectorAll('[data-clickable-link]')].map((link) => {
    const r = link.closest('.c-clickable').getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + 4, r.top + r.height / 2);
    return hit === link || link.contains(hit);
  });
  ```
- **Overlay size:** `getComputedStyle(link, '::after').inset` is `0px`, and the overlay
  covers the container's box (not a smaller wrapper).
- **Keyboard:** one tab stop for the primary control, plus one for each secondary control.
  The ring wraps the container, and secondary controls show their own ring.
- **Screen reader links list:** the primary link's name is the title alone, and there's no
  duplicate "Read more".
- **Native link behaviour:** middle-click and Cmd/Ctrl-click open a new tab, and the context
  menu shows link actions.
- **Builder canvas, if any:** every block inside the container can still be selected and edited.
