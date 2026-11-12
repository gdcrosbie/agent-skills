## 2. MobileNavDrawer

Accessible responsive mobile navigation drawer with animated hamburger-to-close toggle, outside-click and Escape-key listeners, and 60fps GPU scrolling.

### Hidden-state and focus contract

Closed panels synchronise native `hidden`, `inert`, `aria-expanded` and the toggle's accessible label. Include `.c-nav-drawer__panel[hidden] { display: none; }` because panel layout styles can override native hidden behaviour. Close on Escape, outside activation, navigation-link activation, keyboard focus leaving the header, and transition to desktop layout. Restore focus for Escape/outside dismissal; on desktop resizing move focus to a visible desktop link rather than a hidden toggle.

Coordinate `pointerdown`, `focusout` and `click`: focus leaving may close the panel before an outside click, but that pending activation must still restore focus. Cancelled pointer interactions must clear pending state. Initialise only after required elements exist, clean up old listeners on reinitialisation, and use unique panel IDs for multiple instances. Keep a baseline navigation available without JavaScript; the toggle and duplicate panel start hidden.

Decide "focus left the header" from `focusout`'s `event.relatedTarget` (the element receiving focus), not from `document.activeElement`. **Verified 2026-10-25 (Chromium, Astro 7 static build):** the earlier version of this recipe read `document.activeElement` inside `queueMicrotask`. That microtask runs before focus reaches the next element, so the first Tab from the toggle into the open panel closed the menu and dropped focus to `<body>`.

When the approved toggle shows a text label (e.g. "Menu" beside the icon), use that text as its accessible name. Swap it between "Menu" and "Close" and drop the `aria-label` updates, so the name contains the visible label (WCAG 2.5.3 Label in Name). Keep `aria-label` only for icon-only toggles.

The example's `(width < 48rem)` query and panel styling are illustrative, not universal defaults. Choose the breakpoint from the approved header's available space. The host supplies baseline desktop navigation and a containing header; see the integration contract below.

### Icon animation contract

The hamburger-to-close morph rotates SVG `<line>` elements. SVG elements default to `transform-box: view-box`, so `transform-origin: center` resolves to the icon's viewport centre (12,12), not each line's centre. The lines then cross off-centre and one stroke of the X looks longer. The line rule **must** set `transform-box: fill-box`.

### Component Code (`src/components/MobileNavDrawer.astro`)

```astro
---
interface NavItem {
  label: string;
  href: string;
}

interface Props {
  items: NavItem[];
  currentPath?: string;
  class?: string;
  panelId?: string;
  mobileQuery?: string;
}

const { items, currentPath = '', class: className = '',
  panelId = `nav-drawer-${crypto.randomUUID()}`,
  mobileQuery = '(width < 48rem)' } = Astro.props;
---

<div class:list={['c-nav-drawer', className]} data-nav-drawer-root data-nav-drawer-query={mobileQuery}>
  <button
    type="button"
    class="c-nav-drawer__toggle"
    aria-expanded="false"
    aria-controls={panelId}
    aria-label="Open navigation menu"
    data-nav-drawer-toggle
    hidden
  >
    <svg class="c-nav-drawer__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line class="c-nav-drawer__line c-nav-drawer__line--1" x1="4" y1="6" x2="20" y2="6" />
      <line class="c-nav-drawer__line c-nav-drawer__line--2" x1="4" y1="12" x2="20" y2="12" />
      <line class="c-nav-drawer__line c-nav-drawer__line--3" x1="4" y1="18" x2="20" y2="18" />
    </svg>
  </button>

  <nav
    id={panelId}
    class="c-nav-drawer__panel"
    aria-label="Mobile Navigation"
    hidden
    inert
    data-nav-drawer-panel
  >
    <ul class="c-nav-drawer__list">
      {items.map((item) => {
        const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
        return (
          <li class="c-nav-drawer__item">
            <a
              href={item.href}
              class:list={['c-nav-drawer__link', { 'c-nav-drawer__link--active': isActive }]}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  </nav>
</div>

<style>
  .c-nav-drawer {
    display: contents;
  }

  .c-nav-drawer__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--nav-drawer-toggle-size, 2.75rem);
    min-block-size: var(--nav-drawer-toggle-size, 2.75rem);
    padding: 0.5rem;
    background: transparent;
    border: var(--nav-drawer-toggle-border, 1px solid currentColor);
    border-radius: var(--nav-drawer-radius, 0.5rem);
    color: var(--nav-drawer-color, currentColor);
    cursor: pointer;
  }

  .c-nav-drawer__toggle:focus-visible {
    outline: 2px solid var(--nav-drawer-focus, currentColor);
    outline-offset: 2px;
  }

  .c-nav-drawer__toggle-icon {
    inline-size: 1.5rem;
    block-size: 1.5rem;
  }

  .c-nav-drawer__line {
    /* Required: without fill-box, SVG transform-origin resolves to the viewport centre (12,12),
       so the rotated lines cross off-centre and one stroke of the X looks longer. */
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .c-nav-drawer__toggle[aria-expanded="true"] .c-nav-drawer__line--1 {
    transform: translateY(6px) rotate(45deg);
  }
  .c-nav-drawer__toggle[aria-expanded="true"] .c-nav-drawer__line--2 {
    opacity: 0;
  }
  .c-nav-drawer__toggle[aria-expanded="true"] .c-nav-drawer__line--3 {
    transform: translateY(-6px) rotate(-45deg);
  }

  .c-nav-drawer__panel {
    position: absolute;
    inset-inline: 0;
    inset-block-start: 100%;
    background: var(--nav-drawer-bg, #0f172a);
    border-block-end: 1px solid var(--nav-drawer-border, rgba(255, 255, 255, 0.1));
    padding-block: var(--nav-drawer-padding, 1rem);
    padding-inline: var(--nav-drawer-padding-inline, 1.5rem);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }

  @media (prefers-reduced-motion: reduce) {
    .c-nav-drawer__line { transition: none; }
  }

  .c-nav-drawer__toggle[hidden],
  .c-nav-drawer__panel[hidden] {
    display: none;
  }

  .c-nav-drawer__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .c-nav-drawer__link {
    display: flex;
    align-items: center;
    min-block-size: var(--nav-drawer-link-target, 3rem); /* 48px touch target */
    padding-inline: 1rem;
    color: var(--nav-drawer-text, #cbd5e1);
    text-decoration: none;
    font-weight: 500;
    border-radius: var(--nav-drawer-radius, 0.5rem);
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .c-nav-drawer__link:hover {
    background: var(--nav-drawer-hover-bg, rgba(255, 255, 255, 0.08));
    color: var(--nav-drawer-text-active, #ffffff);
  }

  .c-nav-drawer__link--active {
    background: var(--nav-drawer-active-bg, rgba(255, 255, 255, 0.12));
    color: var(--nav-drawer-text-active, #ffffff);
    font-weight: 600;
  }
</style>

<script>
  let navListeners: AbortController | undefined;
  function initNavDrawer() {
    navListeners?.abort();
    navListeners = new AbortController();
    const { signal } = navListeners;
    for (const root of document.querySelectorAll<HTMLElement>(
      "[data-nav-drawer-root]",
    )) {
      const toggle = root.querySelector<HTMLButtonElement>(
        "[data-nav-drawer-toggle]",
      );
      const panel = root.querySelector<HTMLElement>("[data-nav-drawer-panel]");
      const header = root.closest<HTMLElement>("[data-site-header]");
      if (!toggle || !panel || !header) continue;
      const mobile = window.matchMedia(root.dataset.navDrawerQuery ?? "(width < 48rem)");
      const isOpen = () => toggle.getAttribute("aria-expanded") === "true";
      let outsidePointer = false;
      function closeMenu(restoreFocus = false) {
        toggle!.setAttribute("aria-expanded", "false");
        toggle!.setAttribute("aria-label", "Open navigation menu");
        panel!.hidden = true;
        panel!.inert = true;
        if (restoreFocus && mobile.matches) toggle!.focus();
      }
      function syncWidth() {
        const focusInPanel = panel!.contains(document.activeElement);
        const focusOnToggle = document.activeElement === toggle;
        header!.toggleAttribute("data-nav-drawer-mobile", mobile.matches);
        closeMenu(focusInPanel && mobile.matches);
        toggle!.hidden = !mobile.matches;
        if (!mobile.matches && (focusInPanel || focusOnToggle)) {
          header!
            .querySelector<HTMLAnchorElement>("[data-desktop-nav] a")
            ?.focus();
        }
      }
      syncWidth();
      toggle.addEventListener(
        "click",
        () => {
          if (isOpen()) closeMenu();
          else {
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "Close navigation menu");
            panel.hidden = false;
            panel.inert = false;
          }
        },
        { signal },
      );
      document.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape" && isOpen()) closeMenu(true);
        },
        { signal },
      );
      document.addEventListener(
        "pointerdown",
        (event) => {
          outsidePointer =
            isOpen() &&
            event.target instanceof Node &&
            !root.contains(event.target);
        },
        { signal },
      );
      document.addEventListener(
        "pointercancel",
        () => {
          outsidePointer = false;
        },
        { signal },
      );
      document.addEventListener(
        "click",
        (event) => {
          if (
            (isOpen() || outsidePointer) &&
            event.target instanceof Node &&
            !root.contains(event.target)
          )
            closeMenu(true);
          outsidePointer = false;
        },
        { signal },
      );
      panel.addEventListener(
        "click",
        (event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a[href]")
          )
            closeMenu(true);
        },
        { signal },
      );
      // relatedTarget is the element receiving focus. Don't read document.activeElement here,
      // even in a microtask: focus hasn't moved yet, so the first Tab into the panel closes it.
      // A null relatedTarget (pointer on a non-focusable area, window blur) is left to the
      // outside-click handler.
      header.addEventListener(
        "focusout",
        (event) => {
          const next = event.relatedTarget;
          if (isOpen() && next instanceof Node && !header.contains(next))
            closeMenu();
        },
        { signal },
      );
      mobile.addEventListener("change", syncWidth, { signal });
    }
  }
  initNavDrawer();
  document.addEventListener("astro:after-swap", initNavDrawer);
</script>
```


### Host integration and no-JS navigation

Place the component inside a positioned header with `data-site-header`. Keep the baseline
navigation marked `data-desktop-nav` and populated from the same navigation data:

```astro
<header class="site-header" data-site-header>
  <a href="/">Project name</a>
  <nav aria-label="Main navigation" data-desktop-nav>
    <!-- Render the host's navigation links here. -->
  </nav>
  <MobileNavDrawer items={items} mobileQuery="(width < 48rem)" />
</header>
```

In the host stylesheet:

```css
.site-header { position: relative; }
.site-header[data-nav-drawer-mobile] [data-desktop-nav] { display: none; }
```

JavaScript sets `data-nav-drawer-mobile` from the configured media query; the host CSS does
not need a separate breakpoint that could drift. Without JavaScript that marker is absent,
the baseline navigation remains available, and the toggle/panel remain hidden. Ensure the
baseline layout wraps or stacks without overflow at small widths. The panel uses the header
as its positioning context; adapt its visual treatment to the approved design.

Until the module script runs, the desktop navigation also renders at mobile widths, then
disappears: a layout shift on every mobile load. To avoid it, also hide the desktop navigation
with the `scripting` media feature, using the same breakpoint as `mobileQuery`. Comment the
pairing so the two values don't drift:

```css
/* Same breakpoint as MobileNavDrawer's mobileQuery. */
@media (scripting: enabled) and (width < 48rem) {
  .site-header [data-desktop-nav] { display: none; }
}
```

Browsers with scripting disabled still show the baseline navigation. Keep the toggle at the
header's inline end, so its appearance when the script runs doesn't move the logo or other items.

Verify native pointer/focus ordering in a rendered browser, including outside activation
after a panel link receives focus. Test keyboard opening, Escape, link activation, keyboard
focus leaving, desktop resize while open, multiple instances and reinitialisation. The
example is a disclosure menu, not a modal: it does not trap focus or inert the page.


### Integration regression checks

- **Navigation drawers**: Follow the complete hidden/inert, focus, breakpoint and no-JS host contract in [`components/mobile-nav-drawer.md`](mobile-nav-drawer.md). Coordinate outside `pointerdown` with `focusout` and `click`: focus leaving may close the panel before click, but the pending outside activation must still restore focus. Judge focus leaving from `focusout`'s `relatedTarget`; `document.activeElement` has not moved yet when `focusout` runs. Verify that author styles do not override `[hidden]` and that reinitialisation does not duplicate listeners.


### Integration regression checks

- **Animated SVG icons** (hamburger, chevrons, plus/minus): any rotated or scaled SVG child needs `transform-box: fill-box` alongside `transform-origin: center`. Without it the origin is the SVG viewport centre and the shape distorts (e.g. an off-centre X with one stroke apparently longer). Verify the open state visually at mobile width.


- If using `MobileNavDrawer`, verify below/at/above its configured breakpoint, keyboard opening, Escape/outside dismissal, link activation, focus leaving the menu, resizing while open, focus restoration and repeated initialisation. Check native pointer/focus ordering in a rendered browser; synthetic click tests alone are insufficient.
