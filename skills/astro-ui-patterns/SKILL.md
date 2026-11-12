---
name: astro-ui-patterns
description: Implement Astro interaction patterns such as navigation, dialogs, tabs, filters, cards and theme switching. Reuse framework primitives while preserving each pattern’s behaviour contract.
---

# Astro UI Patterns & Portable Component Library

This guide defines the standardised catalogue of **portable, drop-in UI components** for Astro sites.

Standalone examples use the **Portable Component Model**: zero external npm dependencies, zero client framework runtimes (no React/Vue), namespaced CSS tokens with built-in fallbacks, and progressive enhancement. In framework projects, retain the semantic and interaction requirements while adapting composition and styling to the selected contract. Verify accessibility in the rendered project; a template alone does not establish WCAG conformance.

---

## Behaviour contracts and framework composition

For a component in the index below, use its semantic and interaction contract:
keyboard support, focus management, native elements, accessible names, state updates
and progressive enhancement. The selected project/framework contract governs styling,
tokens, imports and component composition. User instructions remain authoritative.

The examples use the **standalone portable component model** below. Use it when adding
an independent component without a framework composition contract. When a project has
an established library, adapt the behaviour using its appropriate primitives instead
of duplicating its buttons, headings or form controls. Preserve required semantics
and behaviour while adapting the example's wrappers and classes.

For a project built on a component framework (Lumos, for example), use that framework's
composition and styling; its primitives may be imported. The standalone zero-site-import
rule and namespaced fallback tokens do not override a selected framework's own contract.

---

## The Portable Component Model

For standalone portable components, use these five rules. On a selected framework, preserve the behavioural requirements and follow its composition/styling contract as described above:

1. **Zero External/Site Imports**: The component file must NOT import site layouts, buttons, or third-party client UI libraries. The one catalogued exception is SelfHostedMap, which needs a map renderer and tile reader; its spec lists the packages, and they're installed only with the owner's approval.
2. **Namespaced CSS Variables with Fallbacks**: Never reference host tokens (e.g. `var(--color-brand)`) directly inside the component stylesheet. Always write `var(--comp-property, <fallback>)`.
3. **Scoped BEM & CSS Logical Properties**: Use BEM class naming (`.c-theme-toggle`, `.c-accordion__summary`) and logical properties (`inline-size`, `block-size`, `padding-inline`, `margin-block`).
4. **Idempotent Vanilla Progressive Enhancement**: Scripts must execute on load and re-attach cleanly if Astro View Transitions are active (`document.addEventListener('astro:after-swap', init)`).
5. **Touch Targets & ARIA**: Buttons and interactive controls must have minimum `44px` (`2.75rem`) or `48px` (`3rem`) touch targets, proper ARIA states (`aria-expanded`, `aria-selected`, `aria-pressed`, `aria-controls`), and keyboard focus rings.

---

## Component Index

| Component | Spec File | Purpose | Key Contract |
| :--- | :--- | :--- | :--- |
| **1. ThemeToggle** | [`components/theme-toggle.md`](components/theme-toggle.md) | Light/Dark theme switcher with zero FOUC and SVG morphing | `<head>` inline script + OKLCH token mapping |
| **2. MobileNavDrawer** | [`components/mobile-nav-drawer.md`](components/mobile-nav-drawer.md) | Accessible slide-down navigation drawer with animated hamburger | 48px touch targets, Escape key close, no GPU blur lag |
| **3. SearchBar** | [`components/search-bar.md`](components/search-bar.md) | Client-side search input with clear button and live announcer | `rAF` debouncing (optimal INP), `aria-live`, custom event coordinator |
| **4. FilterChips** | [`components/filter-chips.md`](components/filter-chips.md) | Multi-category pill filter bar with accessible pressed states | `role="group"`, `aria-pressed`, custom event coordinator |
| **5. SearchFilterBar** | [`components/search-filter-bar.md`](components/search-filter-bar.md) | Compound pattern combining SearchBar and FilterChips | Pre-composed stacked toolbar, multi-column flex layouts, shared scope |
| **6. AccessibleModal** | [`components/accessible-modal.md`](components/accessible-modal.md) | Accessible dialog overlay using native HTML5 `<dialog>` | Native top-layer, backdrop click, Escape key, focus restoration |
| **7. AccessibleAccordion** | [`components/accessible-accordion.md`](components/accessible-accordion.md) | Native FAQ/Accordion with smooth CSS grid expansion | Native `<details name="...">`, 0 KB JavaScript |
| **8. AccessibleTabs** | [`components/accessible-tabs.md`](components/accessible-tabs.md) | WAI-ARIA tab switcher for pricing tiers or multi-panel views | Keyboard arrow navigation (`Left`/`Right`/`Home`/`End`) |
| **9. SocialShare** | [`components/social-share.md`](components/social-share.md) | Privacy-first social sharing bar with Web Share API | 100% GDPR safe, 0 trackers, static intent URLs |
| **10. TableOfContents** | [`components/table-of-contents.md`](components/table-of-contents.md) | Long-form article table of contents with scrollspy | `IntersectionObserver` heading tracking, pairs with an article layout |
| **11. AccessibleCarousel** | [`components/accessible-carousel.md`](components/accessible-carousel.md) | Native CSS scroll-snap slider for reviews, cards, or logos | Native touch swipe (0 KB JS), accessible Prev/Next buttons |
| **12. InfiniteTicker** | [`components/infinite-ticker.md`](components/infinite-ticker.md) | Pure CSS infinite logo/text marquee with pause on hover/focus | WCAG 2.2.2 compliant, duplicate track hidden with `aria-hidden` |
| **13. StatsCounter** | [`components/stats-counter.md`](components/stats-counter.md) | HTML-first metric counter bar with ease-out scroll animation | 0 CLS, static HTML fallback, `IntersectionObserver` |
| **14. AddToCalendar** | [`components/add-to-calendar.md`](components/add-to-calendar.md) | "Save the date" link to a build-time iCalendar file | Same-origin static `.ics` + `<a download>`, valid RFC 5545, 0 KB JS |
| **15. SelfHostedMap** | [`components/self-hosted-map.md`](components/self-hosted-map.md) | Map of a list's places from a self-hosted PMTiles extract; numbered pins match the list | Lazy MapLibre, HTTP 206 tile route, `aria-hidden` map with text equivalents, follows the theme. **Needs npm packages (owner approval)** |
| **16. ClickableParent** | [`components/clickable-parent.md`](components/clickable-parent.md) | Whole card/row clickable through one real link or button | `::after` stretched hit area, secondary controls lifted, focus ring on the container, 0 KB JS |
| **17. Card** | [`components/card.md`](components/card.md) | Content card with media, meta, body and secondary actions | Heading-first DOM, `headingLevel` prop, container-query layout, ClickableParent contract when linked |

---

## Uncatalogued Components Decision Gate (Human Decision Point)

When a project requirement or design calls for an interactive UI component that is **not** one of the 17 catalogued components above (for example: a Before/After image comparison slider, date picker, range selector, step wizard, or custom media player):

> [!IMPORTANT]
> **STOP AND ASK**: The agent must **NEVER** silently install client-side framework libraries (React, Vue, Svelte), import unvetted third-party npm packages, or leave temporary text placeholder blocks (e.g. `<div class="c-placeholder">`). 
>
> The agent **MUST pause and present the project owner with three distinct choices**:
> 1. **Option A: Custom Vanilla Component (Recommended)**: Author a bespoke, zero-dependency `.astro` component complying with the **Bespoke Component Fallback Contract** below.
> 2. **Option B: Static HTML Baseline**: Implement a purely static semantic layout (e.g. side-by-side images or standard stacked cards) with 0 KB JavaScript, omitting the interactive enhancement entirely.
> 3. **Option C: Catalogue Pattern Adaptation**: Evaluate whether an existing catalogue pattern can satisfy the requirement (e.g. adapting `AccessibleModal` into an image lightbox, or `AccessibleTabs` into a stepped panel view).

### The Bespoke Component Fallback Contract

When the project owner approves building an uncatalogued component (Option A), the implementation must satisfy these six rules; for framework adaptations, use the framework’s composition, class naming and token rules for items 3–4:

1. **Semantic HTML First**: Anchor the interface to standard HTML elements before writing JavaScript (e.g. `<input type="range">` for sliders, `<details>` for disclosure, `<dialog>` for overlays).
2. **Zero External Runtime Dependencies**: Zero client framework runtimes (no React/Vue) and zero third-party UI widget packages. Author plain vanilla TypeScript/JavaScript only when browser interaction is genuinely needed.
3. **Scoped BEM & CSS Logical Properties**: Use standard BEM naming (`.c-block`, `.c-block__element`) and flow-relative layout properties (`inline-size`, `block-size`, `padding-block`, `margin-inline`, `inset`).
4. **Namespaced Tokens with Fallbacks**: Never hardcode hex values. Consume host semantic tokens or namespaced custom properties with sensible fallbacks (`var(--comp-color, var(--color-primary))`).
5. **No-JS Progressive Enhancement**: The component must remain legible, accessible, and operable when client JavaScript is disabled. Use `@media (scripting: none)` or native CSS fallback layouts (e.g. side-by-side or stacked views) so zero content is hidden.
6. **WCAG 2.2 AA Compliance**: Maintain minimum `44px` (`2.75rem`) touch targets, high-contrast visible `:focus-visible` rings, clear accessible names (`aria-label`, `<label>`), and ensure 0 axe-core violations.

---

## Selective Loading Guidance for Agents

When the user asks to implement or edit one of the components above, **do not read the entire catalogue**. Instead, read **only the specific component file** needed (e.g. `components/accessible-carousel.md`).

---

## Integration verification

Verify the selected spec on built/deployed output: semantics and names, keyboard/focus behaviour,
state transitions, no-JS treatment, repeated initialization and host token mapping. Standalone
packaging rules apply only to standalone components; frameworks reuse their primitives.
Run the project's configured check/build/tests and disclose unavailable checks or coverage gaps.
44px is this library's target-size convention, not the WCAG AA threshold itself.

Native select popups remain browser/OS UI unless the owner approves a custom combobox's trade-offs.
