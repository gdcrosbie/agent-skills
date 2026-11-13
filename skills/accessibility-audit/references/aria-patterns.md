# ARIA Patterns

These are plain HTML patterns; stack adaptations show any builder-specific syntax. Reach for ARIA only where a native element can't
carry the semantics.

## Native first

```html
<div role="button">   <!-- wrong -->
<button>              <!-- right -->
```

Same for `role="navigation"` on `<nav>`, `role="link"` on `<a>`, `role="banner"` on `<header>` —
all redundant. A native element already has its role.

## Landmark labelling

```html
<section aria-labelledby="team-heading">
  <h2 id="team-heading">Our team</h2>
</section>

<nav aria-label="Main">          <!-- never include the word "navigation" -->
```

A section needs an accessible name when intended as a navigable region. An unnamed section
is not automatically a WCAG failure; assess the actual structure and information conveyed.

## Live regions

For content that changes after load (result counts, form status):

```html
<div role="status" aria-live="polite" aria-atomic="true">30 results found</div>
```

`polite` waits for a pause; `assertive` interrupts immediately and is for critical errors only.

## Icon-only controls

The accessible name goes on the control; the icon is hidden:

```html
<a href="https://example.com/x" aria-label="Follow us on X">
  <svg aria-hidden="true" focusable="false">…</svg>
</a>

<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">…</svg>
</button>
```

Alternative when the name should be real text: a visually hidden span. Use the class the project's
framework or reset already ships (e.g. `.screen-reader-text`, `.sr-only`) rather than hand-rolling a
clip rect.

## Decorative elements

```html
<div class="card__overlay" aria-hidden="true"></div>
```

**Never put `aria-hidden="true"` on anything focusable, or containing anything focusable** — it
disappears from assistive tech while remaining in the tab order. If it genuinely shouldn't be
reachable, use a verified hidden/inert state that also excludes its descendants from focus.
`tabindex="-1"` on a parent does not remove descendant controls from the tab order.

## Skip navigation

These belong on whichever layer owns the page chrome — a shared layout/template, or the page
itself. The stack's adaptation says which:

```html
<a href="#main" class="skip-link">Skip to content</a>
…
<main id="main" tabindex="-1">
```

First focusable element in the document, before the header. It must become visible on focus — a
permanently hidden skip link is worse than none. Use the actual `<main>` `id`, and don't add a
second `<main>` or skip link on a page whose shared layout already provides them.

## Cards in loops

```html
<ul role="list">
  <!-- one <li> per item -->
  <li>
    <article>
      <h3><a href="/posts/first-post/">First post</a></h3>
      <p>Excerpt…</p>
    </article>
  </li>
</ul>
```

The `<h3>` supplies heading structure; it does not automatically name the `<article>`.
Add an explicit article name only when the context needs it. Repeated link text ("Read more") needs programmatically determinable context; when
adding a contextual accessible name, retain the visible words:
`aria-label="Read more: First post"`.

### Stretched link & clickable cards

Whole card clickable, accessible name still on the `<a>` or `<button>` alone:

```css
.card { position: relative; }
.card__link::after { content: ""; position: absolute; inset: 0; }
```

Builder canvases can treat the stretched hit-box as the whole card; see the stack's adaptation.
Astro implementation, with secondary actions and the container focus ring:
[`ClickableParent`](../../astro-ui-patterns/components/clickable-parent.md).

## Forms

Audit the rendered form output, whatever produced it (a form plugin, a component, an embedded
endpoint or a demo form); these patterns apply to any of them.

```html
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email">
```

With a visible required instruction, native required state, and an associated validation error:

```html
<label for="name">Full name (required)</label>
<input id="name" name="name" required>

<label for="email">Email address (required)</label>
<input type="email" id="email" name="email" required aria-invalid="true" aria-describedby="email-error">
<p id="email-error" role="alert">Enter a valid email address</p>
```

Native `required` does not need duplicate `aria-required`. An asterisk is also possible if a
visible instruction explains it. An overriding ARIA name must retain the visible label words;
prefer the native label where it already supplies the correct name.

## Framework and builder components

Builders and UI frameworks often ship native components (dialog, accordion, off-canvas, tabs, …).
**Check what they already render before adding ARIA by hand** — duplicating attributes they set
creates conflicts rather than fixing gaps. The stack's adaptation points to its component docs.

When hand-rolling:

### Disclosure (accordion, dropdown, off-canvas)

```html
<button aria-expanded="false" aria-controls="panel-1">Shipping</button>
<div id="panel-1" hidden>…</div>
```

The attribute is half the pattern — the JS must rewrite `aria-expanded` on **every** state change
and toggle `hidden` with it. A stale state needs rendered evidence and a severity based on
its demonstrated consequence, per the core audit; it is not automatically Critical.
For a single disclosure, prefer native `<details>`/`<summary>`: no JS, no ARIA.

### Tabs

```html
<div role="tablist">
  <button role="tab" aria-selected="true"  aria-controls="p1" id="t1">One</button>
  <button role="tab" aria-selected="false" aria-controls="p2" id="t2" tabindex="-1">Two</button>
</div>
<div role="tabpanel" id="p1" aria-labelledby="t1">…</div>
<div role="tabpanel" id="p2" aria-labelledby="t2" hidden>…</div>
```

Roving `tabindex` and arrow-key navigation are part of the pattern, not extras. If you're not
implementing both, use a disclosure list instead.

### Dialog

Native gives focus containment, the top layer, and `Escape` for free:

```html
<dialog id="signup" aria-labelledby="signup-title">
  <h2 id="signup-title">Sign up</h2>
  <button aria-label="Close dialog">×</button>
</dialog>
```

```js
dialog.showModal();   // not .show() — showModal() is what makes it modal and inert-behind
dialog.addEventListener("close", () => trigger.focus());
```

Focus must return to whatever opened it. `role="dialog"` + `aria-modal="true"` are only needed when
you can't use `<dialog>`.

## Common mistakes

- **Redundant role** on a native element (`<button role="button">`).
- **`aria-label` duplicating visible text** — `<button aria-label="Submit">Submit</button>`. The
  visible text already is the accessible name.
- **Hidden but focusable** — `aria-hidden="true"` on a link that's still tabbable.
- **`aria-expanded` without `aria-controls`**, or without JS that maintains it.
