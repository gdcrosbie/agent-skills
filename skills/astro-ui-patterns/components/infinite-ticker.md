## 12. InfiniteTicker (Marquee)

Production-ready infinite scrolling logo or text ticker built on **pure hardware-accelerated CSS keyframe animation**. Solves the three common pitfalls: seamless looping without jumps, **WCAG 2.2.2 compliance** (pause on hover and keyboard focus), duplicate track isolation from screen readers (`aria-hidden="true"`), and graceful wrap-grid fallback under `prefers-reduced-motion`. **Zero client JavaScript required.**

### Component Code (`src/components/InfiniteTicker.astro`)

```astro
---
interface Props {
  label?: string;
  speed?: string; // Animation duration e.g. "35s", "45s"
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  class?: string;
}

const {
  label = "Featured partners and technologies",
  speed = "35s",
  direction = "left",
  pauseOnHover = true,
  class: className = "",
} = Astro.props;
---

<section
  class:list={[
    "c-ticker",
    `c-ticker--dir-${direction}`,
    { "c-ticker--pause-on-hover": pauseOnHover },
    className,
  ]}
  aria-label={label}
  style={`--ticker-duration: ${speed}; feedback: none;`}
>
  <div class="c-ticker__mask">
    <!-- Primary track (read by screen readers) -->
    <ul class="c-ticker__track">
      <slot />
    </ul>

    <!-- Duplicate clone track for seamless infinite loop (hidden from screen readers) -->
    <ul class="c-ticker__track c-ticker__track--clone" aria-hidden="true">
      <slot />
    </ul>
  </div>
</section>

<style>
  .c-ticker {
    position: relative;
    inline-size: 100%;
    overflow: hidden;
    padding-block: var(--ticker-padding-y, 1.5rem);
  }

  /* Fade out edges with CSS linear-gradient mask */
  .c-ticker__mask {
    display: flex;
    inline-size: 100%;
    overflow: hidden;
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 10%,
      black 90%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 10%,
      black 90%,
      transparent 100%
    );
  }

  .c-ticker__track {
    display: flex;
    align-items: center;
    gap: var(--ticker-gap, 3rem);
    padding-inline: calc(var(--ticker-gap, 3rem) / 2);
    margin: 0;
    list-style: none;
    flex-shrink: 0;
    will-change: transform;
    animation: ticker-slide var(--ticker-duration, 35s) linear infinite;
  }

  .c-ticker--dir-right .c-ticker__track {
    animation-direction: reverse;
  }

  /* Slotted item baseline styling */
  .c-ticker__track :global(> *) {
    flex-shrink: 0;
  }

  /* WCAG 2.2.2 Pause, Stop, Hide Compliance */
  .c-ticker--pause-on-hover:hover .c-ticker__track,
  .c-ticker--pause-on-hover:focus-within .c-ticker__track {
    animation-play-state: paused;
  }

  @keyframes ticker-slide {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  }

  /* Accessibility: under reduced motion, disable infinite motion and wrap into a calm grid */
  @media (prefers-reduced-motion: reduce) {
    .c-ticker__mask {
      mask-image: none;
      -webkit-mask-image: none;
      overflow: visible;
      flex-wrap: wrap;
      justify-content: center;
    }

    .c-ticker__track {
      animation: none;
      flex-wrap: wrap;
      justify-content: center;
    }

    .c-ticker__track--clone {
      display: none;
    }
  }
</style>
```

### Usage Example

```astro
---
import InfiniteTicker from "../components/InfiniteTicker.astro";
---

<InfiniteTicker speed="40s" label="Clients we work with">
  <li class="c-partner-logo"><img src="/logos/acme.svg" alt="Acme Corp" height="36" /></li>
  <li class="c-partner-logo"><img src="/logos/globex.svg" alt="Globex" height="36" /></li>
  <li class="c-partner-logo"><img src="/logos/soylent.svg" alt="Soylent" height="36" /></li>
  <li class="c-partner-logo"><img src="/logos/initech.svg" alt="Initech" height="36" /></li>
  <li class="c-partner-logo"><img src="/logos/umbrella.svg" alt="Umbrella" height="36" /></li>
</InfiniteTicker>
```
