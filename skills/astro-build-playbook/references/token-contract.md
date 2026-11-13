# Design Token Contract & Universal Adapter

This reference defines the strict `tokens.css` schema and provides the Universal Token Adapter Prompt.

## 1. The Two-Tier Schema Contract (`src/styles/tokens.css`)

The token contract defines two distinct fluid tiers:
1. **Tier 1: Canvas / Viewport Scales (`vw`)**: For page sections, site layout, global headings, and base document text.
2. **Tier 2: Component / Container Scales (`cqi`)**: For cards, teasers, badges, widgets, and items inside multi-column grids or sidebars.

```css
:root {
  /* ════════════════════════════════════════════════════════════════════════════
     1. COLOUR PRIMITIVES (Native OKLCH format)
     ════════════════════════════════════════════════════════════════════════════ */
  --c-primary: oklch(0.45 0.05 145);
  --c-accent: oklch(0.68 0.12 75);
  --c-surface: oklch(0.96 0.01 85);
  --c-text: oklch(0.22 0.01 85);

  /* Derived Tones (Generated via CSS Relative Color Syntax) */
  --c-surface-dim: oklch(from var(--c-surface) calc(l - 0.03) c h);
  --c-surface-tint: oklch(from var(--c-primary) 0.93 c h);
  --c-text-muted: oklch(from var(--c-text) calc(l + 0.25) c h);
  --c-text-dim: oklch(from var(--c-text) calc(l + 0.40) c h);

  /* ════════════════════════════════════════════════════════════════════════════
     2. SEMANTIC ROLES (What Components & Layouts Consume)
     ════════════════════════════════════════════════════════════════════════════ */
  --color-bg: var(--c-surface);
  --color-surface: var(--c-surface);
  --color-surface-tint: var(--c-surface-tint);
  --color-text: var(--c-text);
  --color-muted: var(--c-text-muted);
  --color-dim: var(--c-text-dim);
  --color-primary: var(--c-primary);
  --color-accent: var(--c-accent);
  --color-border: oklch(from var(--color-text) l c h / 0.18);

  --border-subtle: 1px solid oklch(from var(--color-text) l c h / 0.12);
  --border-strong: 1px solid oklch(from var(--color-text) l c h / 0.25);

  --shadow-subtle: 0 2px 8px -2px oklch(from var(--color-text) l c h / 0.08);
  --shadow-card: 0 8px 24px -4px oklch(from var(--color-text) l c h / 0.12);
  --shadow-elevated: 0 16px 40px -8px oklch(from var(--color-text) l c h / 0.18);

  /* ════════════════════════════════════════════════════════════════════════════
     3. FLUID TYPOGRAPHY SCALE
     ════════════════════════════════════════════════════════════════════════════ */
  --font-display: 'Fraunces Variable', Georgia, serif;
  --font-body: 'DM Sans Variable', system-ui, sans-serif;

  --tracking-caps: 0.08em;
  --tracking-display: -0.02em;

  /* ── Tier 1: Canvas / Viewport Scales (vw) ────────────────────────────────── */
  --text-2xs: clamp(0.55rem, 0.52rem + 0.1vw, 0.625rem);
  --text-xs: clamp(0.65rem, 0.62rem + 0.15vw, 0.75rem);
  --text-s: clamp(0.75rem, 0.72rem + 0.2vw, 0.875rem);
  --text-base: clamp(0.875rem, 0.83rem + 0.25vw, 1rem);
  --text-m: clamp(1rem, 0.95rem + 0.35vw, 1.125rem);
  --text-l: clamp(1.125rem, 1.05rem + 0.5vw, 1.35rem);
  --text-xl: clamp(1.35rem, 1.25rem + 0.75vw, 1.75rem);

  /* Page Headings (Canvas context) */
  --h4: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --h3: clamp(1.5rem, 1.35rem + 0.8vw, 2rem);
  --h2: clamp(1.85rem, 1.6rem + 1.3vw, 2.75rem);
  --h1: clamp(2.5rem, 2rem + 2.5vw, 4.75rem);

  /* Convenience aliases for heading scales */
  --text-2xl: var(--h3);
  --text-3xl: var(--h2);
  --text-4xl: var(--h1);

  /* ── Tier 2: Component / Container Scales (cqi) ─────────────────────────────
     For cards, badges, and components inside multi-column grids or sidebars */
  --cq-text-xs: clamp(0.65rem, 0.55rem + 0.5cqi, 0.75rem);
  --cq-text-s: clamp(0.75rem, 0.65rem + 0.75cqi, 0.875rem);
  --cq-text-m: clamp(0.9rem, 0.8rem + 1cqi, 1.125rem);
  --cq-text-l: clamp(1.1rem, 0.95rem + 1.5cqi, 1.35rem);
  --cq-h3: clamp(1.25rem, 1rem + 2cqi, 1.75rem);

  /* ════════════════════════════════════════════════════════════════════════════
     4. FLUID SPACING SCALE (Flow-Relative CSS Logical Properties)
     ════════════════════════════════════════════════════════════════════════════ */
  /* ── Tier 1: Canvas / Viewport Spacing (vw) ───────────────────────────────── */
  --space-3xs: clamp(0.25rem, 0.22rem + 0.1vw, 0.35rem);
  --space-2xs: clamp(0.375rem, 0.32rem + 0.15vw, 0.5rem);
  --space-xs: clamp(0.5rem, 0.45rem + 0.2vw, 0.75rem);
  --space-s: clamp(0.75rem, 0.7rem + 0.3vw, 1rem);
  --space-m: clamp(1rem, 0.9rem + 0.5vw, 1.5rem);
  --space-l: clamp(1.5rem, 1.3rem + 0.9vw, 2.25rem);
  --space-xl: clamp(2rem, 1.7rem + 1.4vw, 3.25rem);
  --space-2xl: clamp(3rem, 2.5rem + 2.2vw, 4.75rem);
  --space-3xl: clamp(4rem, 3.2rem + 3.5vw, 6.5rem);

  /* ── Tier 2: Component / Container Spacing (cqi) ──────────────────────────── */
  --cq-card-padding: clamp(1rem, 0.6rem + 2.5cqi, 2rem);
  --cq-gap: clamp(0.5rem, 0.3rem + 1.5cqi, 1.25rem);

  /* ════════════════════════════════════════════════════════════════════════════
     5. LAYOUT & CONTAINERS
     ════════════════════════════════════════════════════════════════════════════ */
  --gutter: clamp(1rem, 0.8rem + 1vw, 2.5rem);
  --container-max: 1320px;
  --container-narrow: 840px;

  /* ════════════════════════════════════════════════════════════════════════════
     6. INTERACTION & RADIUS
     ════════════════════════════════════════════════════════════════════════════ */
  --radius-xs: 2px;
  --radius-s: 4px;
  --radius-m: 8px;
  --radius-l: 16px;
  --radius-full: 9999px;
  --radius-pill: var(--radius-full);

  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Fluid values from mobile, tablet and desktop artboards

When the design supplies the same page at several widths (e.g. 390, 768 and 1440), derive each
fluid token from the artboards' actual values instead of the baseline's generic scale:

- **Interpolate between the outer artboards**, then check the middle one. For a value `a` at
  width `w₁` and `b` at `w₂`: slope `s = (b − a) / (w₂ − w₁)`; the preferred value is
  `(a − s·w₁)/16 rem + 100·s vw`, clamped to `[min(a,b), max(a,b)]`. Example: 52 → 112 px
  across 390 → 1440 is `clamp(3.25rem, 1.8571rem + 5.7143vw, 7rem)`, which gives 73.6 at 768
  against a 72 px tablet value. Within ~2 px is close enough.
- **When the tablet value already equals the desktop value, interpolate 390 → 768** so the token
  reaches its final value at tablet width. A straight 390 → 1440 line misses the tablet artboard
  by several pixels, e.g. a 22 / 29 / 29 title gives 25.3 at 768 instead of 29.
- **When the curve bends at tablet, use two segments.** Define the token for small screens and
  override it in a `@media (width >= 48rem) { :root { … } }` block in `tokens.css`. One
  design's gutter was 24 / 32 / 56. One line gave 35.5 at 768; two segments hit all three.
- Comment each token with its source values (`/* 24 → 32 at 768 */`) so the next agent can
  re-derive it.

## 2. Container Context Pattern in Components

Components that consume `--cq-*` tokens carry their own container query context using the **"Has Me"** pattern:

```css
/* The direct parent (grid cell, column, or wrapper) becomes the query container */
:has(> .c-card) {
  container-type: inline-size;
}

.c-card {
  padding: var(--cq-card-padding);
}

.c-card__title {
  font-size: var(--cq-h3);
}
```

## 3. "Bring Your Own Tokens" (BYOT) & The Semantic Alias Bridge

When a developer brings an existing token set (from an established brand system, Automatic.css / SchemaWP kit, Utopia, or Open Props), **do not rewrite their tokens or rename their variables**.

Instead, place their file at `src/styles/tokens.css` and append a **Semantic Alias Bridge** at the bottom:

```
[ Developer's Primitives ]   ──►  --primary: oklch(0.62 0.18 250);
         │                        --base-dark: oklch(0.12 0.004 260);
         ▼
[ Semantic Alias Bridge  ]   ──►  --color-primary: var(--primary);
(in src/styles/tokens.css)        --color-text:    var(--base-dark);
         │
         ▼
[ Component Scoped CSS   ]   ──►  .c-card__title { color: var(--color-primary); }
(in src/components/*.astro)       .c-form__label  { color: var(--color-text); }
```

### The Golden Component Rule
> **All components (`src/components/*.astro`) MUST consume Semantic Aliases (`--color-primary`, `--color-text`, `--space-m`), NEVER raw framework/primitive names directly.**
>
> **Enforced by `npm run test:tokens`:** every `var()` in `src/` without a fallback must resolve to a defined custom property, and components must not consume a raw palette token — defined as any token that a `--color-*` alias in `tokens.css` points at directly (`--color-primary: var(--c-primary)`, or `var(--primary)` in a BYOT bridge). Non-colour primitives aren't detected by this rule.
>
> **Colour literals:** do not introduce hex or RGB colour definitions in token or component stylesheets, or one-off colour literals in components where a semantic role is needed. OKLCH makes lightness adjustments predictable but does not by itself guarantee accessible contrast; `test:contrast` is authoritative only for the token pairs it covers.
>
> **Why?**
> 1. **Component Portability**: Components can be copied between any project or template without breaking.
> 2. **Theme Swapping**: Changing palette mappings is a single line change in `tokens.css`, never a multi-file refactor.
> 3. **Automated Verification**: `npm run test:tokens` and `npm run test:contrast` continue to validate the design system automatically.

### Example: Bridging an Automatic.css (ACSS) 4.x Kit
```css
/* ══ Developer's Native ACSS Primitives ══ */
:root {
  --primary: light-dark(oklch(0.96 0 0), oklch(0.96 0 0));
  --accent: light-dark(oklch(0.75 0.018 255), oklch(0.75 0.018 255));
  --base-light: light-dark(oklch(0.98 0 0), oklch(0.12 0.004 260));
  --base-dark: light-dark(oklch(0.12 0.004 260), oklch(0.96 0.002 260));
  --font-heading: "Fraunces Variable", serif;
  --font-body: "DM Sans Variable", sans-serif;
}

/* ══ Semantic Alias Bridge (Appended to src/styles/tokens.css) ══ */
:root {
  /* Colours */
  --color-primary: var(--primary);
  --color-accent:  var(--accent);
  --color-bg:      var(--base-light);
  --color-surface: var(--base-light);
  --color-text:    var(--base-dark);
  --color-muted:   var(--base-medium, oklch(from var(--color-text) calc(l + 0.25) c h));
  --border-subtle: 1px solid oklch(from var(--color-text) l c h / 0.12);

  /* Typography */
  --font-display:  var(--font-heading);
  --font-body:     var(--font-body);

  /* Container Query Tokens (Tier 2) */
  --cq-card-padding: clamp(1rem, 0.6rem + 2.5cqi, 2rem);
  --cq-gap:          clamp(0.5rem, 0.3rem + 1.5cqi, 1.25rem);
  --cq-text-s:       clamp(0.75rem, 0.65rem + 0.75cqi, 0.875rem);
  --cq-text-m:       clamp(0.9rem, 0.8rem + 1cqi, 1.125rem);
  --cq-h3:           clamp(1.25rem, 1rem + 2cqi, 1.75rem);
}
```

### External Token Systems & Scale Nuances (ACSS, GenCSS, Utopia, Open Props)

When importing tokens from external design systems into the baseline's token contract, understand how their primitives differ from the native schema:

| Feature / Token | Baseline Native | Automatic.css (ACSS) 4.x Kit | GenCSS / FEWD Kit |
| :--- | :--- | :--- | :--- |
| **Token Philosophy** | Universal Semantic Schema | Theme Primitives (`--primary`, `--base-*`) | Layer 1 Primitives (`--color-base`, `--color-*`) |
| **Colour Model** | Native `oklch(L C H)` | `light-dark(oklch(...), oklch(...))` | OKLCH + 10%–90% transparency scales |
| **Spacing Bounds** | `--space-3xs` through `--space-3xl` | `--space-xs` through `--space-xxl` *(largest is `xxl`, NOT `2xl`; no `3xs`/`2xs`)* | `--space-xs` through `--space-3xl` |
| **Typography Bounds** | `--text-xs` through `--text-xl`, `--h1` through `--h4` | `--text-xs` through `--text-xxl`, `--h1` through `--h6` | `--text-xxs` through `--text-xxxl`, `--h1` through `--h6` |
| **Special Scales** | Tier 2 Container Queries (`--cq-*`) | Fluid Bridge variables (`--space-xl-to-m`) | Container helpers (`.cq-fluid`, `.cq-spacing`) |
| **Testing Scripts** | `npm run test:tokens`, `npm run test:contrast` | Passes via Semantic Alias Bridge | Passes via Semantic Alias Bridge |

### Crucial Scale Gotchas
1. **ACSS `xxl` vs `2xl`**: In ACSS, the largest spacing and typography step is `--space-xxl` and `--text-xxl` (never `--space-2xl`). Sub-xs steps like `--space-3xs` or `--space-2xs` do not exist in default ACSS 4.0. In your Semantic Alias Bridge, map `--space-3xs` and `--space-2xs` to `--space-xs` if required by downstream components.
2. **ACSS Bridge Variables**: ACSS provides pre-computed fluid clamps between two distinct steps (e.g. `--space-xl-to-m`, `--section-space-l-to-m`). These can be used inside template-level layouts without manual media queries.
3. **GenCSS Fluid Containers**: In GenCSS, container-query fluid scaling is provided via utility helper classes (`.cq-fluid`, `.cq-spacing`) alongside raw mathematical ratios.
4. **Baseline Semantic Fluidity**: In the baseline, container query fluid scaling is tokenised directly (`--cq-text-*`, `--cq-gap`, `--cq-card-padding`) using native `cqi` units and `:has(> &)` container declarations.

---

### Universal Semantic Portability Contract

To preserve component portability across all projects:
- **Strategy**: Keep external framework tokens in `src/styles/tokens.css` and append the **Semantic Alias Bridge**.
- **Component Styling**: Author components strictly using semantic tokens (`--color-text`, `--color-primary`, `--space-m`).
- **Benefits**:
  - Components are 100% portable: they can be shared, copied, or migrated across any Astro project without syntax modifications.
  - Automated CI test suites (`npm run test:tokens`, `npm run test:contrast`) function out-of-the-box.
  - Changing palettes or branding never requires editing individual `.astro` components.

---

### Verification
After creating the bridge, verify compliance:
```bash
npm run test:tokens    # Verifies all semantic tokens are satisfied
npm run test:contrast  # Verifies WCAG 2.2 AA contrast on semantic pairings
```

### Contextual Section Surfaces (Alternating Light / Dark Sections)

When a single page alternates between light and dark sections (e.g. warm paper sections and dark night sections), **do not duplicate component styles or author `.c-card--dark` overrides for every child component**.

Instead, remap the semantic aliases inside a surface scope class (e.g. `.c-surface-night`) in `src/styles/global.css` or `src/styles/tokens.css`:

```css
.c-surface-night {
  --color-bg: var(--c-night);
  --color-surface: var(--c-night-2);
  --color-text: var(--c-cream);
  --color-muted: var(--c-cream-2);
  --color-dim: var(--c-cream-3);
  --border-subtle: 1px solid oklch(from var(--c-cream) l c h / 0.12);
  background-color: var(--color-bg);
  color: var(--color-text);
}
```

**Crucial contrast-gate rule:** The baseline's `<project>/scripts/test-contrast.cjs` parses `:root` blocks separately from `.c-surface-*` blocks (in `tokens.css` and `global.css`) and automatically checks `--color-text`, `--color-muted`, and `--color-primary` against `--color-bg` for every `.c-surface-*` class. If you introduce additional custom surface selectors or badge pairings, extend `<project>/scripts/test-contrast.cjs` to assert WCAG 2.2 AA contrast (`≥ 4.5:1` normal text, `≥ 3.0:1` large display text) across every surface.

---

## 4. Universal Adapter Prompt

Feed this prompt to any agent with Figma/Paper/Design access:

> Extract the design tokens from the provided design source (Figma variables, Paper.design export, or CSS) and output a single `:root { ... }` block conforming to the Standard Astro Token Schema. Ensure all colour primitives use native oklch(L C H) format. Ensure both Tier 1 (viewport `vw`) and Tier 2 (container `cqi`) scales are included. Fonts must reference `@fontsource-variable/*` packages. Output ONLY the CSS block.



### Phase 1: Ingest Design & Harmonise Tokens
> **Baseline-specific phase.** Apply only when the selected token contract is this baseline’s; otherwise use the framework route from §0.

Before authoring components, establish `src/styles/tokens.css` via the **3-Path Token Ingestion Gate**:

1. **Path 1: Bring Your Own `tokens.css` (BYOT)**:
   - If the developer provides an existing `tokens.css` (e.g. brand tokens, Automatic.css / SchemaWP kit, Utopia):
     1. Place the file at `src/styles/tokens.css`.
     2. Append the **Semantic Alias Bridge** at the bottom of `tokens.css` mapping the developer's primitives (e.g. `--primary`, `--base-dark`) to the semantic schema (`--color-primary`, `--color-text`, `--color-bg`). See `token-contract.md`.
     3. Run `npm run test:tokens` and `npm run test:contrast`. If both pass, proceed straight to Phase 2!
2. **Path 2: Design Ingestion from Figma / Paper.design / Claude Design**:
   - Extract raw colours, typography scales, and spacing from the design canvas. **Figma MCP:** `get_variable_defs` often returns `{}`, and non-ASCII font names come back mangled (`Mg¹²` → `Mg??`). Extract from fills and text runs, and ask for font files rather than substituting. See `figma-mcp-ingestion.md`. **Paper MCP:** the file may define no tokens; take values from `get_jsx` per artboard and colour roles from any palette artboard. See `paper-mcp-ingestion.md`.
   - Convert all colour primitives to native `oklch(L C H)` format.
   - When the design defines no variables or styles, derive primitives from the fills and text styles actually used, record each source value beside its OKLCH equivalent, and state in `docs/project.md` that the tokens were extracted rather than imported.
   - Confirm typefaces from the supplied font files and their licences, not from names reported by design tooling, which can be truncated or mis-encoded.
   - Apply the **Universal Token Adapter Prompt** (in `token-contract.md`) to generate the two-tier fluid schema in `src/styles/tokens.css`.
3. **Path 3: Baseline Defaults**:
   - Use the baseline's `src/styles/tokens.css` as-is.

**The Golden Component Rule**:
> **All components (`src/components/*.astro`) MUST consume Semantic Aliases (`--color-primary`, `--color-text`, `--space-m`), NEVER raw framework/primitive names directly.** This guarantees 100% component portability across projects and automated WCAG 2.2 AA contrast test compliance.
> `npm run test:tokens` enforces it: no undefined `var()` in `src/`, and no component consuming a raw palette token (any token a `--color-*` alias points at directly).
4. **Verify Tokens**:
   - Run `npm run test:tokens` and `npm run test:contrast` to verify that all mandatory tokens exist and meet WCAG 2.2 AA.
