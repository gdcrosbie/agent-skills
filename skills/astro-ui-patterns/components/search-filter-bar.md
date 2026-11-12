## 5. SearchFilterBar (Compound Pattern)

High-performance combined client-side live search and multi-category filtering for collection grids (team directories, blog posts, portfolios). Composes [`SearchBar.astro`](search-bar.md) and [`FilterChips.astro`](filter-chips.md) into a coordinated toolbar or stacked layout using the scoped event coordinator (`astro-filter:change`).

### Compound Component Code (`src/components/SearchFilterBar.astro`)

```astro
---
import SearchBar from './SearchBar.astro';
import FilterChips from './FilterChips.astro';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  filters?: FilterOption[];
  searchPlaceholder?: string;
  scope?: string;
  filterLabel?: string;
  allLabel?: string;
  defaultFilter?: string;
  showClearButton?: boolean;
  class?: string;
}

const {
  filters = [],
  searchPlaceholder = 'Search...',
  scope = 'default',
  filterLabel = 'Filter by category',
  allLabel = 'All',
  defaultFilter = 'all',
  showClearButton = true,
  class: className = '',
} = Astro.props;
---

<div class:list={['c-search-filter', className]}>
  <SearchBar
    scope={scope}
    placeholder={searchPlaceholder}
    showClearButton={showClearButton}
  />

  {filters.length > 0 && (
    <FilterChips
      scope={scope}
      filters={filters}
      label={filterLabel}
      allLabel={allLabel}
      defaultFilter={defaultFilter}
    />
  )}
</div>

<style>
  .c-search-filter {
    display: flex;
    flex-direction: column;
    gap: var(--search-filter-gap, 1rem);
    margin-block-end: var(--search-filter-margin, 2rem);
  }
</style>
```

---

### Layout Variations

Because the underlying [`SearchBar`](search-bar.md) and [`FilterChips`](filter-chips.md) communicate via scoped DOM events (`astro-filter:change`), they can be arranged into any layout without losing state synchronisation.

#### 1. Standard Stacked Layout (Using Compound Component)

```astro
---
import SearchFilterBar from './ui/SearchFilterBar.astro';

const categories = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'design', label: 'Design' },
  { id: 'product', label: 'Product' },
];
---

<SearchFilterBar
  scope="directory"
  searchPlaceholder="Search directory..."
  filters={categories}
/>
```

#### 2. Disconnected Toolbar Layout (Split Across Flex Columns)

When a design calls for the search bar aligned to the right and category chips aligned to the left:

```astro
---
import SearchBar from './ui/SearchBar.astro';
import FilterChips from './ui/FilterChips.astro';

const categories = [
  { id: 'articles', label: 'Articles' },
  { id: 'case-studies', label: 'Case Studies' },
  { id: 'whitepapers', label: 'Whitepapers' },
];
---

<div class="c-custom-toolbar">
  <div class="c-custom-toolbar__chips">
    <FilterChips scope="resources" filters={categories} />
  </div>
  <div class="c-custom-toolbar__search">
    <SearchBar scope="resources" placeholder="Search resources..." />
  </div>
</div>

<style>
  .c-custom-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    margin-block-end: 2rem;
  }

  .c-custom-toolbar__search {
    inline-size: 100%;
    max-inline-size: 20rem;
  }
</style>
```

---

### Target Card Contract

Cards or list items filtered by `SearchBar`, `FilterChips`, or `SearchFilterBar` must supply matching data attributes:

```astro
<div class="grid">
  <article
    data-filter-item
    data-filter-scope="directory"
    data-search-text="Sarah Chen Senior Frontend Engineer Accessibility"
    data-filter-category="engineering"
  >
    <h3>Sarah Chen</h3>
    <p>Senior Frontend Engineer</p>
  </article>

  <article
    data-filter-item
    data-filter-scope="directory"
    data-search-text="Alex Rivera Lead Product Designer Design Systems"
    data-filter-category="design product"
  >
    <h3>Alex Rivera</h3>
    <p>Lead Product Designer</p>
  </article>
</div>
```

- `data-filter-item`: Marks the element as a filter target.
- `data-filter-scope`: Matches the `scope` prop of the filtering components (defaults to `'default'`).
- `data-search-text`: Case-insensitive text string scanned by `SearchBar`. Include names, roles, tags, and keywords.
- `data-filter-category`: Space-separated list of category IDs evaluated by `FilterChips`.

### Grouped Directories and Repeated Entities

When one entity appears in several category sections, filtering DOM occurrences
is not the same as counting entities. Adapt the existing project controls;
the flat-card example above does not supply grouped-list behaviour by itself.

- Carry a stable entity ID on each occurrence. When the requested count is
  people/items rather than occurrences, count the unique IDs of matching
  visible records, not cards or groups.
- Apply the selected group and text query together to each occurrence, then
  hide groups with no matching records. Report matching entities and nonempty
  groups separately in the live status; update the empty state from that same
  result set.
- Keep display labels separate from relationship data. An approved omission
  from a card's labels must not remove its category assignment or change
  filtering. A description used as a visible heading must not replace the
  group's stable relationship identity or requested sort order.
- Verify a multi-category entity, category plus query, no matches, Reset and
  any alternate mobile control. A single-category fixture cannot establish
  correct deduplication or synchronisation.


### Integration regression checks

- **Filters**: When filtering by the native `hidden` attribute, add an explicit scoped `[hidden] { display: none; }` rule wherever filterable items have an author-assigned layout display. Confirm the rendered layout changes for every filter; changing `aria-pressed` or DOM state alone is not sufficient.


- If using `SearchBar`, `FilterChips`, or `SearchFilterBar`, verify card containers include `data-filter-item`, matching `data-filter-scope` (if custom), `data-search-text`, and `data-filter-category`.
