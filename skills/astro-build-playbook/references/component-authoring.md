# Baseline component authoring

### Phase 3: Component Slicing & Markup Translation
> **Baseline-specific phase.** For an established component framework, use its selected composition workflow rather than creating a replacement library.

1. **Slice the Static HTML**:
   - Break `*.html` into discrete `.astro` components inside `src/components/`.
   - Replace static lists with `await getCollection('<name>')` and `.map()` for local content, or the EmDash frontend adapter for live content.
   - Sort ordered collections explicitly: `.sort((a, b) => a.order - b.order)`.
2. **CSS Architecture**:
   - Author component-scoped CSS in `<style>` blocks.
   - Enforce strict BEM naming (`.c-block`, `.c-block__element`, `.c-block--modifier`, `.l-section`, `.l-container`).
   - **Mandatory**: Use flow-relative CSS Logical Properties (`padding-block`, `margin-inline`, `inset`, `inline-size`, `block-size`). A physical direction is acceptable only when the design requirement is genuinely physical rather than flow-relative; document that exception near the rule.
   - No utility-class markup or inline `style` attributes.
   - Prefer shared tokens to unexplained magic numbers. A one-off value is acceptable when it represents intrinsic behaviour rather than a missing design decision.
3. **Placeholder Routes**: Every nav, footer and CTA link must resolve. Generate `noindex` placeholder pages for linked-but-unbuilt routes from `src/data/placeholder-pages.json`, and keep `test:discovery`'s built-link integrity check passing. Never use `href="#"` or invent page copy. See `content-collections.md` §7.
4. For frame/crop/overlap translation read [layout fidelity](layout-fidelity.md).
5. For forms read [forms and submissions](forms-and-submissions.md) before implementing an unresolved submission path.
