## 10. TableOfContents

Long-form article table of contents with zero-jank `IntersectionObserver` scrollspy heading tracking. Pairs with any long-form article layout.

### Component Code (`src/components/TableOfContents.astro`)

```astro
---
interface HeadingItem {
  depth: number;
  slug: string;
  text: string;
}

interface Props {
  headings: HeadingItem[];
  maxDepth?: number;
  class?: string;
}

const { headings, maxDepth = 3, class: className = '' } = Astro.props;

// Filter headings down to h2 and h3
const filteredHeadings = headings.filter((h) => h.depth >= 2 && h.depth <= maxDepth);
---

{filteredHeadings.length > 0 && (
  <nav class:list={['c-toc', className]} aria-label="Table of contents" data-toc-root>
    <p class="c-toc__heading">On this page</p>
    <ul class="c-toc__list">
      {filteredHeadings.map((heading) => (
        <li class:list={['c-toc__item', `c-toc__item--depth-${heading.depth}`]}>
          <a
            href={`#${heading.slug}`}
            class="c-toc__link"
            data-toc-link={heading.slug}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)}

<style>
  .c-toc {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: var(--toc-padding, 1.25rem);
    background: var(--toc-bg, transparent);
    border: var(--toc-border, 1px solid rgba(125, 125, 125, 0.15));
    border-radius: var(--toc-radius, 0.5rem);
  }

  .c-toc__heading {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--toc-title-color, currentColor);
  }

  .c-toc__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .c-toc__item--depth-3 {
    padding-inline-start: 1rem;
  }

  .c-toc__link {
    display: block;
    color: var(--toc-link-color, var(--color-muted, #94a3b8));
    text-decoration: none;
    font-size: 0.875rem;
    line-height: 1.4;
    transition: color 0.15s ease;
    border-inline-start: 2px solid transparent;
    padding-inline-start: 0.5rem;
    margin-inline-start: -0.5rem;
  }

  .c-toc__link:hover {
    color: var(--toc-link-hover, var(--color-text, #ffffff));
  }

  .c-toc__link:focus-visible {
    outline: 2px solid var(--toc-focus, currentColor);
    outline-offset: 2px;
  }

  .c-toc__link--active {
    color: var(--toc-link-active, #f97316);
    border-inline-start-color: var(--toc-link-active, #f97316);
    font-weight: 600;
  }
</style>

<script>
  function initTOC() {
    const toc = document.querySelector('[data-toc-root]');
    if (!toc) return;

    const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
    if (links.length === 0) return;

    const headingElements: HTMLElement[] = [];
    links.forEach((link) => {
      const slug = link.getAttribute('data-toc-link');
      if (slug) {
        const el = document.getElementById(slug);
        if (el) headingElements.push(el);
      }
    });

    if (headingElements.length === 0) return;

    function setActive(id: string) {
      links.forEach((link) => {
        const matches = link.getAttribute('data-toc-link') === id;
        link.classList.toggle('c-toc__link--active', matches);
        if (matches) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    // High performance IntersectionObserver scrollspy
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          setActive(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: '0px 0px -65% 0px',
        threshold: 0,
      }
    );

    headingElements.forEach((h) => observer.observe(h));
  }

  initTOC();
  document.addEventListener('astro:after-swap', initTOC);
</script>
```
