## 3. SearchBar

High-performance client-side live search input with an accessible SVG search icon, optional clear button, debounced `requestAnimationFrame` filtering (optimal Core Web Vitals INP), and live screen reader result announcements (`aria-live="polite"`).

Can be used standalone to filter card collections, or paired with `FilterChips` via the shared `data-filter-scope` event coordinator.

### Component Code (`src/components/SearchBar.astro`)

```astro
---
interface Props {
  scope?: string;
  placeholder?: string;
  ariaLabel?: string;
  showClearButton?: boolean;
  class?: string;
}

const {
  scope = 'default',
  placeholder = 'Search...',
  ariaLabel = placeholder,
  showClearButton = true,
  class: className = '',
} = Astro.props;
---

<div
  class:list={['c-search-bar', className]}
  data-search-bar-root
  data-filter-scope={scope}
>
  <svg
    class="c-search-bar__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>

  <input
    type="search"
    class="c-search-bar__input"
    placeholder={placeholder}
    aria-label={ariaLabel}
    data-search-input
  />

  {showClearButton && (
    <button
      type="button"
      class="c-search-bar__clear"
      aria-label="Clear search"
      data-search-clear
      hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )}

  <div
    class="sr-only"
    aria-live="polite"
    data-filter-announcer
    data-filter-scope={scope}
  ></div>
</div>

<style>
  .c-search-bar {
    position: relative;
    display: flex;
    align-items: center;
    inline-size: 100%;
  }

  .c-search-bar__icon {
    position: absolute;
    inset-inline-start: var(--search-bar-icon-offset, 1rem);
    inline-size: var(--search-bar-icon-size, 1.25rem);
    block-size: var(--search-bar-icon-size, 1.25rem);
    color: var(--search-bar-icon-color, currentColor);
    pointer-events: none;
  }

  .c-search-bar__input {
    inline-size: 100%;
    min-block-size: var(--search-bar-input-height, 3rem); /* 48px touch target */
    padding-inline-start: var(--search-bar-padding-start, 3rem);
    padding-inline-end: var(--search-bar-padding-end, 2.75rem);
    background: var(--search-bar-bg, transparent);
    color: var(--search-bar-text, currentColor);
    border: var(--search-bar-border, 1px solid currentColor);
    border-radius: var(--search-bar-radius, 0.5rem);
    font-size: var(--search-bar-font-size, 1rem);
    font-family: inherit;
  }

  /* Strip WebKit native search cancel button in favour of accessible custom clear button */
  .c-search-bar__input::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
  }

  .c-search-bar__input:focus-visible {
    outline: 2px solid var(--search-bar-focus, currentColor);
    outline-offset: 2px;
  }

  .c-search-bar__clear {
    position: absolute;
    inset-inline-end: 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 9999px;
    color: var(--search-bar-clear-color, currentColor);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s ease;
  }

  .c-search-bar__clear:hover {
    opacity: 1;
  }

  .c-search-bar__clear:focus-visible {
    outline: 2px solid var(--search-bar-focus, currentColor);
    outline-offset: 2px;
  }

  .c-search-bar__clear svg {
    inline-size: 1rem;
    block-size: 1rem;
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

  function initSearchBars() {
    initFilterCoordinator();

    const roots = document.querySelectorAll<HTMLElement>('[data-search-bar-root]');
    roots.forEach((root) => {
      const scope = root.getAttribute('data-filter-scope') || 'default';
      const input = root.querySelector<HTMLInputElement>('[data-search-input]');
      const clearBtn = root.querySelector<HTMLButtonElement>('[data-search-clear]');

      if (!input) return;

      const syncClearButton = () => {
        if (clearBtn) {
          clearBtn.hidden = input.value.length === 0;
        }
      };

      input.addEventListener('input', () => {
        syncClearButton();
        document.dispatchEvent(
          new CustomEvent('astro-filter:change', {
            detail: { scope, query: input.value }
          })
        );
      });

      clearBtn?.addEventListener('click', () => {
        input.value = '';
        syncClearButton();
        input.focus();
        document.dispatchEvent(
          new CustomEvent('astro-filter:change', {
            detail: { scope, query: '' }
          })
        );
      });

      syncClearButton();
    });
  }

  initSearchBars();
  document.addEventListener('astro:after-swap', initSearchBars);
</script>
```

### Usage Example

```astro
---
import SearchBar from './ui/SearchBar.astro';
---

<!-- Standalone Search Bar targeting 'team' scope -->
<SearchBar scope="team" placeholder="Search team members by name or role..." />

<!-- Collection Grid -->
<div class="team-grid">
  <article data-filter-item data-filter-scope="team" data-search-text="Sarah Chen Staff Design Engineer">
    <h3>Sarah Chen</h3>
    <p>Staff Design Engineer</p>
  </article>
  <article data-filter-item data-filter-scope="team" data-search-text="Marcus Vance Principal Systems Architect">
    <h3>Marcus Vance</h3>
    <p>Principal Systems Architect</p>
  </article>
</div>
```
