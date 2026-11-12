## 8. AccessibleTabs

WAI-ARIA compliant tab switcher for pricing models (Monthly vs Annual), department listings, or multi-view panels. Features automatic keyboard arrow navigation (`Left`/`Right`/`Home`/`End`) and roving `tabindex`.

### Component Code (`src/components/AccessibleTabs.astro`)

```astro
---
interface TabItem {
  id: string;
  label: string;
}

interface Props {
  tabs: TabItem[];
  defaultTabId?: string;
  ariaLabel?: string;
  class?: string;
}

const {
  tabs,
  defaultTabId = tabs[0]?.id,
  ariaLabel = 'Content tabs',
  class: className = '',
} = Astro.props;
---

<div class:list={['c-tabs', className]} data-tabs-root>
  <div class="c-tabs__list" role="tablist" aria-label={ariaLabel}>
    {tabs.map((tab) => {
      const isSelected = tab.id === defaultTabId;
      return (
        <button
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={isSelected ? 'true' : 'false'}
          aria-controls={`panel-${tab.id}`}
          tabindex={isSelected ? 0 : -1}
          class:list={['c-tabs__tab', { 'c-tabs__tab--active': isSelected }]}
          data-tab-target={tab.id}
        >
          {tab.label}
        </button>
      );
    })}
  </div>

  <div class="c-tabs__panels">
    {tabs.map((tab) => {
      const isSelected = tab.id === defaultTabId;
      return (
        <div
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          tabindex="0"
          hidden={!isSelected}
          class="c-tabs__panel"
          data-tab-panel={tab.id}
        >
          <slot name={tab.id} />
        </div>
      );
    })}
  </div>
</div>

<style>
  .c-tabs {
    display: flex;
    flex-direction: column;
    gap: var(--tabs-gap, 1.5rem);
  }

  .c-tabs__list {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--tabs-list-bg, rgba(125, 125, 125, 0.1));
    border-radius: var(--tabs-radius, 0.5rem);
    border: var(--tabs-border, 1px solid rgba(125, 125, 125, 0.2));
  }

  .c-tabs__tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: var(--tabs-button-height, 2.75rem); /* 44px target */
    padding-inline: 1.25rem;
    background: transparent;
    border: none;
    border-radius: calc(var(--tabs-radius, 0.5rem) - 0.125rem);
    color: var(--tabs-text-muted, currentColor);
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .c-tabs__tab:hover {
    color: var(--tabs-text-active, currentColor);
  }

  .c-tabs__tab:focus-visible {
    outline: 2px solid var(--tabs-focus, currentColor);
    outline-offset: 2px;
  }

  .c-tabs__tab--active {
    background: var(--tabs-active-bg, currentColor);
    color: var(--tabs-active-text, #ffffff);
    font-weight: 600;
  }

  .c-tabs__panel {
    display: block;
  }

  .c-tabs__panel[hidden] {
    display: none;
  }

  .c-tabs__panel:focus-visible {
    outline: 2px solid var(--tabs-focus, currentColor);
    outline-offset: 4px;
    border-radius: var(--tabs-radius, 0.5rem);
  }
</style>

<script>
  function initTabs() {
    const roots = document.querySelectorAll('[data-tabs-root]');

    roots.forEach((root) => {
      const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

      function switchTab(newTab: HTMLButtonElement) {
        tabs.forEach((tab) => {
          tab.setAttribute('aria-selected', 'false');
          tab.setAttribute('tabindex', '-1');
          tab.classList.remove('c-tabs__tab--active');
        });

        panels.forEach((panel) => {
          panel.setAttribute('hidden', '');
        });

        newTab.setAttribute('aria-selected', 'true');
        newTab.setAttribute('tabindex', '0');
        newTab.classList.add('c-tabs__tab--active');
        newTab.focus();

        const targetId = newTab.getAttribute('data-tab-target');
        const targetPanel = root.querySelector(`[data-tab-panel="${targetId}"]`);
        targetPanel?.removeAttribute('hidden');
      }

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => switchTab(tab));

        // Keyboard arrow navigation
        tab.addEventListener('keydown', (e) => {
          let nextIndex = index;

          if (e.key === 'ArrowRight') {
            nextIndex = (index + 1) % tabs.length;
            e.preventDefault();
            switchTab(tabs[nextIndex]);
          } else if (e.key === 'ArrowLeft') {
            nextIndex = (index - 1 + tabs.length) % tabs.length;
            e.preventDefault();
            switchTab(tabs[nextIndex]);
          } else if (e.key === 'Home') {
            e.preventDefault();
            switchTab(tabs[0]);
          } else if (e.key === 'End') {
            e.preventDefault();
            switchTab(tabs[tabs.length - 1]);
          }
        });
      });
    });
  }

  initTabs();
  document.addEventListener('astro:after-swap', initTabs);
</script>
```
