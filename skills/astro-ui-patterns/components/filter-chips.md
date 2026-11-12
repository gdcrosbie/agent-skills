## 4. FilterChips

Accessible multi-category pill/chip filter bar for collections and grids (case studies, portfolios, article tags). Adheres to WAI-ARIA group recommendations with `aria-pressed` states, minimum 44px touch targets, and full progressive enhancement.

Can be used standalone to filter card collections by category, or paired with `SearchBar` via the shared `data-filter-scope` event coordinator.

### Hidden-state contract

Filtering uses the native `hidden` attribute. If a host component assigns a
layout mode to filterable items (for example `display: grid`), it must also
state the hidden rule explicitly; an author `display` declaration can otherwise
win over the browser's hidden presentation:

```css
[data-filter-item][hidden] {
  display: none;
}
```

Use the project's appropriate scope or class instead of a broad global
selector. Verify a rendered interaction by selecting each filter and confirming
that non-matching items are absent from layout, not merely marked hidden in the
DOM.

### Component Code (`src/components/FilterChips.astro`)

```astro
---
interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  filters: FilterOption[];
  scope?: string;
  label?: string;
  allLabel?: string;
  defaultFilter?: string;
  class?: string;
}

const {
  filters = [],
  scope = 'default',
  label = 'Filter by category',
  allLabel = 'All',
  defaultFilter = 'all',
  class: className = '',
} = Astro.props;
---

<div
  class:list={['c-filter-chips', className]}
  role="group"
  aria-label={label}
  data-filter-chips-root
  data-filter-scope={scope}
>
  <button
    type="button"
    class:list={[
      'c-filter-chips__chip',
      { 'c-filter-chips__chip--active': defaultFilter === 'all' },
    ]}
    aria-pressed={defaultFilter === 'all' ? 'true' : 'false'}
    data-filter-value="all"
  >
    {allLabel}
  </button>

  {filters.map((f) => (
    <button
      type="button"
      class:list={[
        'c-filter-chips__chip',
        { 'c-filter-chips__chip--active': defaultFilter === f.id },
      ]}
      aria-pressed={defaultFilter === f.id ? 'true' : 'false'}
      data-filter-value={f.id}
    >
      <span>{f.label}</span>
      {typeof f.count === 'number' && (
        <span class="c-filter-chips__count" aria-hidden="true">({f.count})</span>
      )}
    </button>
  ))}

  <div
    class="sr-only"
    aria-live="polite"
    data-filter-announcer
    data-filter-scope={scope}
  ></div>
</div>

<style>
  .c-filter-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--filter-chips-gap, 0.5rem);
  }

  .c-filter-chips__chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-block-size: var(--filter-chips-chip-height, 2.75rem); /* 44px min touch target */
    padding-inline: var(--filter-chips-chip-padding-x, 1.25rem);
    padding-block: var(--filter-chips-chip-padding-y, 0.5rem);
    background: var(--filter-chips-chip-bg, transparent);
    color: var(--filter-chips-chip-text, currentColor);
    border: var(--filter-chips-chip-border, 1px solid currentColor);
    border-radius: var(--filter-chips-chip-radius, 9999px);
    cursor: pointer;
    font-size: var(--filter-chips-chip-font-size, 0.875rem);
    font-weight: 500;
    font-family: inherit;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .c-filter-chips__chip:hover {
    background: var(--filter-chips-chip-hover-bg, rgba(125, 125, 125, 0.15));
  }

  .c-filter-chips__chip:focus-visible {
    outline: 2px solid var(--filter-chips-focus, currentColor);
    outline-offset: 2px;
  }

  .c-filter-chips__chip--active {
    background: var(--filter-chips-chip-active-bg, currentColor);
    color: var(--filter-chips-chip-active-text, #ffffff);
    border-color: var(--filter-chips-chip-active-border, currentColor);
  }

  .c-filter-chips__count {
    opacity: 0.75;
    font-size: 0.8em;
  }

  .sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>

<script>
  interface FilterScopeState {
    query: string;
    category: string;
  }

  declare global {
    interface Window {
      __astroFilterStates?: Record<string, FilterScopeState>;
      __astroFilterCoordinatorInit?: boolean;
    }
  }

  function initFilterCoordinator() {
    if (window.__astroFilterCoordinatorInit) return;
    window.__astroFilterCoordinatorInit = true;

    let filterRafId: number | null = null;

    document.addEventListener('astro-filter:change', ((e: CustomEvent<{ scope?: string; query?: string; category?: string }>) => {
      const { scope = 'default', query, category } = e.detail || {};

      if (!window.__astroFilterStates) {
        window.__astroFilterStates = {};
      }
      if (!window.__astroFilterStates[scope]) {
        window.__astroFilterStates[scope] = { query: '', category: 'all' };
      }

      const state = window.__astroFilterStates[scope];
      if (typeof query === 'string') state.query = query;
      if (typeof category === 'string') state.category = category;

      if (filterRafId) cancelAnimationFrame(filterRafId);
      filterRafId = requestAnimationFrame(() => {
        const q = state.query.toLowerCase().trim();
        const cat = state.category;

        const cards = document.querySelectorAll<HTMLElement>('[data-filter-item]');
        let visibleCount = 0;

        cards.forEach((card) => {
          const cardScope = card.getAttribute('data-filter-scope') || 'default';
          if (cardScope !== scope) return;

          const text = (card.getAttribute('data-search-text') || '').toLowerCase();
          const cardCategory = (card.getAttribute('data-filter-category') || '').trim().split(/\s+/);

          const matchesQuery = !q || text.includes(q);
          const matchesCategory = cat === 'all' || cardCategory.includes(cat);

          if (matchesQuery && matchesCategory) {
            card.removeAttribute('hidden');
            card.style.display = '';
            visibleCount++;
          } else {
            card.setAttribute('hidden', '');
            card.style.display = 'none';
          }
        });

        const announcers = document.querySelectorAll<HTMLElement>(
          `[data-filter-announcer][data-filter-scope="${scope}"]`
        );
        announcers.forEach((announcer) => {
          announcer.textContent = `${visibleCount} result${visibleCount === 1 ? '' : 's'} found`;
        });
      });
    }) as EventListener);
  }

  function initFilterChips() {
    initFilterCoordinator();

    const roots = document.querySelectorAll<HTMLElement>('[data-filter-chips-root]');
    roots.forEach((root) => {
      const scope = root.getAttribute('data-filter-scope') || 'default';
      const chips = root.querySelectorAll<HTMLButtonElement>('[data-filter-value]');

      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          chips.forEach((c) => {
            c.classList.remove('c-filter-chips__chip--active');
            c.setAttribute('aria-pressed', 'false');
          });

          chip.classList.add('c-filter-chips__chip--active');
          chip.setAttribute('aria-pressed', 'true');
          const value = chip.getAttribute('data-filter-value') || 'all';

          document.dispatchEvent(
            new CustomEvent('astro-filter:change', {
              detail: { scope, category: value }
            })
          );
        });
      });
    });
  }

  initFilterChips();
  document.addEventListener('astro:after-swap', initFilterChips);
</script>
```

### Usage Example

```astro
---
import FilterChips from './ui/FilterChips.astro';

const caseStudyCategories = [
  { id: 'web', label: 'Web Applications', count: 12 },
  { id: 'brand', label: 'Brand Identity', count: 8 },
  { id: 'mobile', label: 'iOS & Android', count: 5 },
];
---

<!-- Standalone Filter Chips targeting 'portfolio' scope -->
<FilterChips
  scope="portfolio"
  filters={caseStudyCategories}
  label="Filter portfolio projects"
/>

<!-- Collection Grid -->
<div class="portfolio-grid">
  <article data-filter-item data-filter-scope="portfolio" data-filter-category="web">
    <h3>Fintech Dashboard</h3>
  </article>
  <article data-filter-item data-filter-scope="portfolio" data-filter-category="brand">
    <h3>EcoBrand Identity System</h3>
  </article>
</div>
```
