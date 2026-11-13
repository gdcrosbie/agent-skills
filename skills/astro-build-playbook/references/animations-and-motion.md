# Animations & Motion Guide (Astro & Progressive Enhancement)

In a performance-first Astro architecture (`output: 'static'`), animations must elevate user experience without compromising **100/100 Core Web Vitals** or violating **WCAG 2.2 AA accessibility standards**.

This guide defines the 3-tier animation strategy, the Animation "Stop & Ask" Decision Gate, performance safeguards, and accessibility contracts.

---

## 1. The 3-Tier Animation Strategy

```
Tier 1: Native CSS & Scroll-Driven (0 KB JS)
  │   └── Hover/focus transitions, keyframe loops, CSS animation-timeline: view()/scroll()
  ▼
Tier 2: Progressive Vanilla IntersectionObserver (< 1 KB JS)
  │   └── Viewport entrance reveals, staggered grids, CSS Grid accordion expansions
  ▼
Tier 3: Choreographed Timelines & Physics (Dynamic Import)
      └── GSAP / Motion One / Lenis lazy-loaded ONLY on pages requiring complex orchestration
```

### Tier 1: Pure CSS & Native Scroll-Driven Animations (0 KB JS)
Whenever an animation can be authored in pure CSS, it must be. Pure CSS animations run on the compositor thread, require zero JavaScript parsing or execution, and render instantaneously.

#### 1. Transition Timing Tokens
All interactive transitions (buttons, cards, links, nav drawers) must consume timing tokens from `src/styles/tokens.css`:
```css
:root {
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

.c-btn {
  transition: transform var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.c-btn:hover {
  transform: translateY(-2px);
}
```

#### 2. Native CSS Scroll-Driven Animations
Modern browsers support native CSS scroll timelines without any JavaScript runtime:
```css
/* Scroll reveal using native CSS scroll-driven animation */
@keyframes fadeInSlideUp {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.c-card {
  animation: fadeInSlideUp linear both;
  animation-timeline: view();
  animation-range: entry 10% cover 30%;
}
```

#### 3. Looping Tickers & Marquees
Continuous linear movement (partner logos, text tickers) should be authored with pure CSS `@keyframes`:
```css
@keyframes ticker {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.c-ticker__track {
  display: flex;
  inline-size: max-content;
  animation: ticker 25s linear infinite;
  will-change: transform;
}

.c-ticker:hover .c-ticker__track,
.c-ticker:focus-within .c-ticker__track {
  animation-play-state: paused;
}
```

---

### Tier 2: Progressive Vanilla JS & `IntersectionObserver` (< 1 KB JS)
When supporting older browsers or implementing staggered entrances for multi-column grids, use a tiny, zero-dependency `IntersectionObserver` script inside the component.

#### 1. Scoped Viewport Reveal Pattern
```astro
---
// src/components/FeatureGrid.astro
interface Props {
  items: Array<{ title: string; desc: string }>;
}
const { items } = Astro.props;
---

<div class="c-grid" data-reveal-container>
  {items.map((item, index) => (
    <article class="c-card c-card--reveal" style={`--stagger: ${index * 80}ms`}>
      <h3 class="c-card__title">{item.title}</h3>
      <p class="c-card__desc">{item.desc}</p>
    </article>
  ))}
</div>

<style>
  .c-card--reveal {
    opacity: 0;
    transform: translateY(1.5rem);
    transition: opacity var(--transition-base), transform var(--transition-base);
    transition-delay: var(--stagger, 0ms);
  }

  .c-card--reveal.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
</style>

<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.c-card--reveal').forEach((el) => observer.observe(el));
</script>
```

#### 2. Height Animation with CSS Grid (Accordions / Dropdowns)
Never animate `height: auto` with JavaScript timers. Animate `grid-template-rows` from `0fr` to `1fr`:
```css
.c-accordion__content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-base);
}

.c-accordion[open] .c-accordion__content,
.c-accordion.is-open .c-accordion__content {
  grid-template-rows: 1fr;
}

.c-accordion__inner {
  overflow: hidden;
}
```

---

### Tier 3: Choreographed Timelines & Physics (GSAP / Motion One)
When a design explicitly requires pinned storytelling sections, scrubbed canvas/SVG sequences, complex path drawing, or inertial smooth scrolling (Lenis), use a dedicated motion library.

#### Strict Performance Rules for Tier 3:
1. **Never import globally in `BaseLayout.astro`**: Only import on the specific page or component that requires it.
2. **Always Lazy-Load via Dynamic `import()`**:
   ```astro
   <script>
     async function initAnimation() {
       const { gsap } = await import('gsap');
       const { ScrollTrigger } = await import('gsap/ScrollTrigger');
       gsap.registerPlugin(ScrollTrigger);

       gsap.to('.c-pinned__layer', {
         scrollTrigger: {
           trigger: '.c-pinned',
           start: 'top top',
           end: '+=1500',
           scrub: 1,
           pin: true,
         },
         xPercent: -100,
         ease: 'none',
       });
     }

     // Initialise only after initial paint to protect LCP
     if (document.readyState === 'complete') {
       initAnimation();
     } else {
       window.addEventListener('load', initAnimation);
     }
   </script>
   ```

---

## 2. The Animation "Stop & Ask" Decision Gate

Whenever an agent or developer detects animations in a design file (Figma Smart Animate, interactive components, hover states, scroll timelines, or video scrolls), **STOP and ask the user**:

> *"I detected animated motion ([e.g. scroll reveal, hero choreography, ticker]) in the design. How would you like these implemented?*
> 1. *(Recommended)* **Tier 1 / Tier 2: Native CSS & Vanilla `IntersectionObserver`**: Zero external libraries, zero runtime bundle impact, 100/100 Core Web Vitals, fully accessible.
> 2. **Tier 3: Choreographed Motion Engine (GSAP / Motion One)**: Dynamic lazy-loaded timeline orchestration for pinned storytelling or complex physics.
> 3. **Static Baseline**: Accessible CSS hover and focus states only, with zero scroll-triggered movement."*

---

## 3. The 4 Non-Negotiable Rules (Performance & Accessibility)

### Rule 1: Never Hide LCP Content (`opacity: 0`)
The most destructive mistake in web animation is setting Hero headlines or Hero images to `opacity: 0` waiting for a JavaScript reveal or CSS keyframe animation.
- The browser cannot count an element as the Largest Contentful Paint (LCP) until its opacity rises above 0.
- Delaying LCP display immediately drops performance scores from 100 down into the 60s–70s.
- **Enforcement**: Hero titles and Hero images must render at `opacity: 1` by default on initial server pre-render. Only animate below-the-fold content or subtle decoration.

### Rule 2: GPU-Accelerated Compositing Properties Only
Layout reflows kill Interaction to Next Paint (INP) and cause frame drops.
- **Allowed for animation**:
  - `transform` (`translate`, `scale`, `rotate`)
  - `opacity`
  - `filter`
  - `clip-path`
- **Strictly Prohibited for continuous animation**:
  - `top`, `left`, `right`, `bottom` (use `transform: translate()` instead)
  - `width`, `height` (use `transform: scale()` or CSS Grid `grid-template-rows`)
  - `margin`, `padding`

### Rule 3: Mandatory Reduced Motion Contract (WCAG 2.2 AA)
Under WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions), all non-essential motion must be dismissible.
Include the following in `src/styles/reset.css` or `global.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In JavaScript animation scripts, always check the media query:
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  // Execute motion logic
}
```

### Rule 4: WCAG 2.2.2 (Pause, Stop, Hide)
Any animation that starts automatically, lasts longer than 5 seconds, and is presented in parallel with other content must have a mechanism for the user to pause, stop, or hide it.
- **Carousels**: Provide an explicit `<button class="c-carousel__toggle" aria-label="Pause slide rotation">`.
- **Tickers / Marquees**: Pause automatically on `:hover` and `:focus-within`, and provide an accessible keyboard toggle.
- **Background Video**: Must include a visible Pause/Play control.

---

## 4. Astro View Transitions (`<ClientRouter />`)

Astro 5+ and 7 provide native View Transitions via the `<ClientRouter />` component (from `astro:transitions`), creating smooth single-page application (SPA) morphing between pages without client-side frameworks:

### Setup in `BaseLayout.astro`
```astro
---
import { ClientRouter } from 'astro:transitions';

interface Props {
  title: string;
  description: string;
}
const { title, description } = Astro.props;
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <ClientRouter />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Persistent Elements Across Routes
Keep persistent navigation headers or audio players stable across page navigations:
```astro
<header class="l-header" transition:persist>
  <!-- Navigation stays mounted across page transitions -->
</header>
```

### Shared Element Morphing (`view-transition-name`)
Morph an image from a listing card into the hero of a detail page:
```astro
<!-- On listing page (/services) -->
<img class="c-card__img" src={service.image} style={`view-transition-name: service-${service.id}`} alt="" />

<!-- On detail page (/services/[slug]) -->
<img class="c-hero__img" src={entry.data.image} style={`view-transition-name: service-${entry.id}`} alt="" />
```
