## 7. AccessibleAccordion (FAQ)

Native HTML5 `<details>` & `<summary>` accordion with smooth CSS Grid height transitions and optional exclusive single-open behaviour using the modern `name` attribute. **Zero client-side JavaScript required.**

### Component Code (`src/components/AccessibleAccordion.astro`)

```astro
---
interface AccordionItem {
  id: string;
  title: string;
  content: string;
  isOpen?: boolean;
}

interface Props {
  items: AccordionItem[];
  allowMultiple?: boolean;
  groupName?: string;
  class?: string;
}

const {
  items,
  allowMultiple = false,
  groupName = 'faq-accordion',
  class: className = '',
} = Astro.props;
---

<div class:list={['c-accordion', className]}>
  {items.map((item) => (
    <details
      class="c-accordion__item"
      name={allowMultiple ? undefined : groupName}
      open={item.isOpen}
    >
      <summary class="c-accordion__summary">
        <span class="c-accordion__title">{item.title}</span>
        <svg
          class="c-accordion__chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div class="c-accordion__content-wrapper">
        <div class="c-accordion__content">
          <slot name={item.id}>
            <p>{item.content}</p>
          </slot>
        </div>
      </div>
    </details>
  ))}
</div>

<style>
  .c-accordion {
    display: flex;
    flex-direction: column;
    border-block-start: var(--accordion-border, 1px solid rgba(125, 125, 125, 0.2));
  }

  .c-accordion__item {
    border-block-end: var(--accordion-border, 1px solid rgba(125, 125, 125, 0.2));
    transition: background-color 0.15s ease;
  }

  .c-accordion__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-block-size: var(--accordion-summary-height, 3.25rem); /* 52px target */
    padding-block: var(--accordion-padding-y, 1rem);
    padding-inline: var(--accordion-padding-x, 0.5rem);
    cursor: pointer;
    list-style: none; /* Strip browser triangle marker */
    color: var(--accordion-title-color, currentColor);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .c-accordion__summary::-webkit-details-marker {
    display: none;
  }

  .c-accordion__summary:focus-visible {
    outline: 2px solid var(--accordion-focus, currentColor);
    outline-offset: 2px;
  }

  .c-accordion__chevron {
    inline-size: 1.25rem;
    block-size: 1.25rem;
    flex-shrink: 0;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .c-accordion__item[open] .c-accordion__chevron {
    transform: rotate(180deg);
  }

  /* Smooth height animation via CSS Grid rows */
  .c-accordion__content-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .c-accordion__item[open] .c-accordion__content-wrapper {
    grid-template-rows: 1fr;
  }

  .c-accordion__content {
    overflow: hidden;
  }

  .c-accordion__content > * {
    padding-block-end: var(--accordion-content-padding-y, 1.25rem);
    padding-inline: var(--accordion-padding-x, 0.5rem);
    color: var(--accordion-text-muted, currentColor);
    line-height: 1.6;
    margin: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .c-accordion__chevron,
    .c-accordion__content-wrapper {
      transition: none;
    }
  }
</style>
```
