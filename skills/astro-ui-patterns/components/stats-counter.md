## 13. StatsCounter

High-performance metrics and statistics showcase bar with smooth numeric count-up animation. Built with an **HTML-first baseline** (the final numbers are in the static HTML for 0 Cumulative Layout Shift and 100% SEO indexing). Progressively enhanced with a non-blocking `IntersectionObserver` and `requestAnimationFrame` cubic ease-out counter. Screen readers instantly receive the complete final value, and `prefers-reduced-motion` preserves the static figures without count-up.

### Component Code (`src/components/StatsCounter.astro`)

```astro
---
interface StatItem {
  value: number; // e.g. 99.9, 15, 500
  decimals?: number; // decimal places, default 0
  prefix?: string; // e.g. "£", "$", ">"
  suffix?: string; // e.g. "+", "%", "M"
  label: string; // e.g. "Uptime Guarantee"
  description?: string; // optional sub-caption
}

interface Props {
  stats: StatItem[];
  duration?: number; // animation duration in ms, default 1500
  columns?: 2 | 3 | 4;
  class?: string;
}

const {
  stats,
  duration = 1500,
  columns = 4,
  class: className = "",
} = Astro.props;
---

<div
  class:list={["c-stats", `c-stats--cols-${columns}`, className]}
  data-stats-root
  data-stats-duration={duration}
>
  {stats.map((stat) => {
    const formattedStatic = `${stat.prefix || ""}${stat.value.toFixed(stat.decimals || 0)}${stat.suffix || ""}`;
    return (
      <div class="c-stat-card">
        <div
          class="c-stat-card__value"
          aria-label={`${formattedStatic} ${stat.label}`}
        >
          <span class="c-stat-card__prefix">{stat.prefix}</span>
          <span
            class="c-stat-card__number"
            data-stat-target={stat.value}
            data-stat-decimals={stat.decimals || 0}
          >
            {stat.value.toFixed(stat.decimals || 0)}
          </span>
          <span class="c-stat-card__suffix">{stat.suffix}</span>
        </div>
        <p class="c-stat-card__label">{stat.label}</p>
        {stat.description && (
          <p class="c-stat-card__desc">{stat.description}</p>
        )}
      </div>
    );
  })}
</div>

<style>
  .c-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: var(--stats-gap, 2rem);
    padding-block: var(--stats-padding-y, 2rem);
  }

  .c-stats--cols-2 {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  }

  .c-stats--cols-3 {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  }

  .c-stats--cols-4 {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  }

  .c-stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: var(--stats-card-padding, 1.5rem);
    background: var(--stats-card-bg, transparent);
    border: var(--stats-card-border, 1px solid rgba(125, 125, 125, 0.15));
    border-radius: var(--stats-card-radius, 0.75rem);
  }

  .c-stat-card__value {
    display: flex;
    align-items: baseline;
    font-size: var(--stats-number-size, clamp(2.25rem, 5vw, 3.5rem));
    font-weight: 700;
    line-height: 1;
    color: var(--stats-number-color, currentColor);
    font-variant-numeric: tabular-nums;
  }

  .c-stat-card__prefix,
  .c-stat-card__suffix {
    color: var(--stats-accent-color, currentColor);
    font-size: 0.75em;
  }

  .c-stat-card__label {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--stats-label-color, currentColor);
  }

  .c-stat-card__desc {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--stats-desc-color, rgba(125, 125, 125, 0.85));
  }
</style>

<script>
  function initStatsCounters() {
    // Respect prefers-reduced-motion: leave static numbers in place
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const roots = document.querySelectorAll("[data-stats-root]");

    roots.forEach((root) => {
      const duration = parseInt(root.getAttribute("data-stats-duration") || "1500", 10);
      const numberEls = root.querySelectorAll<HTMLElement>("[data-stat-target]");
      let animated = false;

      // Cubic ease-out curve for natural deceleration
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      function animateCounters() {
        const startTime = performance.now();

        function update(currentTime: number) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeOutCubic(progress);

          numberEls.forEach((el) => {
            const target = parseFloat(el.getAttribute("data-stat-target") || "0");
            const decimals = parseInt(el.getAttribute("data-stat-decimals") || "0", 10);
            const currentVal = target * eased;
            el.textContent = currentVal.toFixed(decimals);
          });

          if (progress < 1) {
            requestAnimationFrame(update);
          } else {
            // Ensure exact final numbers
            numberEls.forEach((el) => {
              const target = parseFloat(el.getAttribute("data-stat-target") || "0");
              const decimals = parseInt(el.getAttribute("data-stat-decimals") || "0", 10);
              el.textContent = target.toFixed(decimals);
            });
          }
        }

        requestAnimationFrame(update);
      }

      // IntersectionObserver triggers count-up when scrolled into view
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !animated) {
            animated = true;
            animateCounters();
            observer.disconnect();
          }
        },
        { threshold: 0.25 }
      );

      observer.observe(root);
    });
  }

  initStatsCounters();
  document.addEventListener("astro:after-swap", initStatsCounters);
</script>
```
