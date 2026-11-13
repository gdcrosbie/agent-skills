# WCAG 2.2 Checklist

Quick-reference checklist for auditing pages, templates and components on any stack. Run it against
the **rendered frontend**, not the builder canvas, the stored source or the component files. This
mixes WCAG checks with authoring conventions, and the stack's adaptation adds its own markup checks;
a failed checklist item needs criterion-specific evidence before it is
reported as a WCAG failure. Record advisories and untested checks separately.

## Perceivable

### 1.1 Text Alternatives

- [ ] Every `<img>` has an `alt` attribute
- [ ] Decorative images have `alt=""`, not a missing attribute
- [ ] Inline `<svg>` icons are `aria-hidden="true"` when decorative, named when meaningful
- [ ] Complex images have extended descriptions via `aria-describedby`

### 1.3 Adaptable

- [ ] Headings use real `h1`–`h6` tags, not styled `<p>`/`<div>`
- [ ] Lists use `<ul>`/`<ol>`/`<dl>`, not stacked `<div>`s
- [ ] Tables have `<caption>`, `<thead>`/`<tbody>`, and `<th scope>`
- [ ] Form inputs have associated labels
- [ ] Sections intended as navigable regions have useful accessible names; unnamed sections are assessed in context, not automatically reported as WCAG failures
- [ ] DOM order matches visual order (no reordering via CSS that breaks it)

### 1.4 Distinguishable

- [ ] Colours come from the project's design tokens, not arbitrary hardcoded values (the stack's adaptation names the token source)
- [ ] No hardcoded hex/rgb in component or page styles
- [ ] Colour is not the sole indicator of meaning; selected indicators persist after focus moves away
- [ ] Normal/large text meets 4.5:1/3:1 on its actual rendered background, including hover states
- [ ] Visual information necessary to identify controls/states meets 3:1 against adjacent colours; translucent borders are alpha-composited, decorative dividers assessed separately
- [ ] Text spacing can be adjusted without breaking layout
- [ ] Content visible at 200% zoom

## Operable

### 2.1 Keyboard Accessible

- [ ] All interactive elements reachable by Tab
- [ ] No keyboard traps (Escape closes modals/dropdowns)
- [ ] Custom interactions have Enter/Space handlers

### 2.4 Navigable

- [ ] Skip link present first in the document, targeting the `<main>` id (`#main`, `#content`, `#main-content`, …), on whichever layer owns it (shared layout/template or page — see the stack's adaptation)
- [ ] Exactly one `<main>` in the rendered document, not one from a shared layout plus another from the page
- [ ] Logical heading hierarchy (one h1, no skipped levels)
- [ ] Links have descriptive text (not "click here")
- [ ] `aria-current` marks **one** item, and only a real current page/step. Menus that mark every in-page hash link as current stamp "current page" on every link in a one-page nav. Drop the attribute for in-page hash links, or make it conditional.
- [ ] Native keyboard focus indicators visible on all interactive elements, including light/dark surfaces, shared chrome, dialogs and button-family token overrides
- [ ] Focus order matches visual order

### 2.5 Input Modalities

- [ ] Accessible names contain visible label words (2.5.3); ARIA has not overridden a correct native label with different wording

- [ ] Touch targets at least 24x24px (AA) or 44x44px (AAA)
- [ ] Adequate spacing between touch targets

## Understandable

### 3.1 Readable

- [ ] Page language set (`<html lang="">` in the rendered document)
- [ ] Content in other languages marked with `lang` attribute

### 3.2 Predictable

- [ ] No automatic context changes on input
- [ ] Consistent navigation across templates

### 3.3 Input Assistance

- [ ] Error messages identify the field and suggest correction
- [ ] Native required controls use `required`; custom widgets use `aria-required` when needed, without redundant ARIA
- [ ] Required fields are identified visibly, using text or an explained marker; native validation alone is not evidence of instructions
- [ ] Error messages linked via aria-describedby
- [ ] Labels persist (not placeholder-only)

## Robust

### 4.1 Compatible

- [ ] Valid HTML (proper nesting, no duplicate IDs)
- [ ] Custom controls have name, role, and value
- [ ] ARIA attributes used correctly (no redundancy)
- [ ] aria-hidden not on focusable elements

## Markup, Dynamic Content and Components

Stack-specific markup checks (builder escape hatches, template syntax) are in the stack's adaptation.

### Markup

- [ ] No `<div>` where a semantic element applies (`section`, `article`, `header`, `nav`, `footer`)
- [ ] Raw-HTML blocks and embeds audited separately — they bypass a builder's element-level checks
- [ ] Images render a contextually appropriate `alt`, not just a stored media-library value

### Dynamic content

- [ ] Loop/repeater output wrapped in real list markup where it's a list
- [ ] Loop item headings sit one level below the section heading
- [ ] Repeated links have a clear purpose in programmatically determinable context; any contextual accessible name retains the visible words
- [ ] Conditional branches audited in both states, not just the default render
- [ ] Components audited in each context they're used, not once in isolation

### CSS

- [ ] Focus styles not removed — no `outline: none` without a visible replacement
- [ ] Contrast computed for the actual rendered pair, not token names
- [ ] Lists whose bullets are suppressed keep list semantics (some engines drop them with `list-style: none`; `role="list"` restores them)
- [ ] Skip-link class defined and visible on focus

### Interactive components

- [ ] `aria-expanded` on every disclosure trigger, and updated by the JS on each state change
- [ ] `aria-expanded` paired with `aria-controls` pointing at the panel's `id`
- [ ] Dialogs use native `<dialog>` (`showModal()`/`close()`) or a verified focus trap
- [ ] Hidden panels and their controls are absent from keyboard navigation and the accessibility tree; `hidden` or `display: none` can achieve this, while `aria-hidden` alone does not prevent focus
- [ ] `prefers-reduced-motion` respected by JS-driven animation
