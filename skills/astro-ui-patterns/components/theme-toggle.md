## 1. ThemeToggle

Accessible light/dark theme toggle with saved explicit preference, system fallback and an initial head bootstrap before painting. Use only after colour modes and their scope have been approved. The host supplies its palettes and a shared preference key; this recipe does not select a palette.

### State and host contract

Only `light` and `dark` are valid stored values. Storage reads/writes may throw; switching must remain usable in that page session. System changes apply only without an explicit preference. Storage events synchronise other tabs, including preference removal. Initialise every toggle instance, clean up old listeners before reinitialising after Astro navigation, and keep labels/title in sync. Avoid redundant theme attribute writes. Controls start hidden until enhanced; CSS follows system preference without JavaScript.

Set `data-theme-key` on the opted-in document root. Use the same project-specific value in the head bootstrap and toggle. All toggle instances in one document share it. Independently styled examples, previews and kit layouts omit this opt-in and the scripts unless their colour-mode scope is explicitly approved.

### Component Code (`src/components/ThemeToggle.astro`)

```astro
---
interface Props {
  class?: string;
}

const { class: className = '' } = Astro.props;
---

<button
  type="button"
  class:list={['c-theme-toggle', className]}
  data-theme-toggle
  aria-label="Switch to dark theme"
  title="Switch to dark theme"
  hidden
>
  <!-- Sun Icon (displayed in dark mode) -->
  <svg class="c-theme-toggle__icon c-theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>

  <!-- Moon Icon (displayed in light mode) -->
  <svg class="c-theme-toggle__icon c-theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
</button>

<style>
  .c-theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--theme-toggle-size, 2.75rem);
    min-block-size: var(--theme-toggle-size, 2.75rem);
    padding: var(--theme-toggle-padding, 0.5rem);
    background: var(--theme-toggle-bg, transparent);
    color: var(--theme-toggle-color, currentColor);
    border: var(--theme-toggle-border, 1px solid currentColor);
    border-radius: var(--theme-toggle-radius, 0.5rem);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .c-theme-toggle[hidden] { display: none; }

  .c-theme-toggle:hover {
    background: var(--theme-toggle-hover-bg, rgba(125, 125, 125, 0.15));
    color: var(--theme-toggle-hover-color, currentColor);
  }

  .c-theme-toggle:focus-visible {
    outline: 2px solid var(--theme-toggle-focus, currentColor);
    outline-offset: 2px;
  }

  .c-theme-toggle__icon {
    inline-size: var(--theme-toggle-icon-size, 1.25rem);
    block-size: var(--theme-toggle-icon-size, 1.25rem);
    flex-shrink: 0;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  /* Light is the unenhanced icon baseline; enhanced state follows the root. */
  .c-theme-toggle__icon--sun { display: none; }

  /* Dark State */
  :global([data-theme="dark"]) .c-theme-toggle__icon--moon {
    display: none;
  }
  :global([data-theme="dark"]) .c-theme-toggle__icon--sun {
    display: block;
  }

  /* Light State */
  :global([data-theme="light"]) .c-theme-toggle__icon--sun {
    display: none;
  }
  :global([data-theme="light"]) .c-theme-toggle__icon--moon {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    .c-theme-toggle,
    .c-theme-toggle__icon {
      transition: none;
    }
  }
</style>

<script>
  type Theme = 'light' | 'dark';
  const sessionChoices = new Map<string, Theme>();
  let themeListeners: AbortController | undefined;

  function initThemeToggle() {
    themeListeners?.abort();
    themeListeners = new AbortController();
    const { signal } = themeListeners;
    const key = document.documentElement.dataset.themeKey;
    const toggles = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
    if (!key || !toggles.length) return;
    const system = matchMedia('(prefers-color-scheme: dark)');
    const valid = (value: string | null): Theme | null =>
      value === 'light' || value === 'dark' ? value : null;
    let preference: Theme | null = sessionChoices.get(key) ?? null;
    try {
      preference = valid(localStorage.getItem(key));
      sessionChoices.delete(key);
    } catch { /* Preserve an explicit session choice when storage is blocked. */ }

    const systemTheme = (): Theme => system.matches ? 'dark' : 'light';
    function applyTheme(theme: Theme) {
      if (document.documentElement.dataset.theme !== theme) {
        document.documentElement.dataset.theme = theme;
      }
      for (const toggle of toggles) {
        const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
        toggle.hidden = false;
      }
    }
    applyTheme(preference ?? systemTheme());
    for (const toggle of toggles) {
      toggle.addEventListener('click', () => {
        preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        sessionChoices.set(key, preference);
        applyTheme(preference);
        try {
          localStorage.setItem(key, preference);
        } catch { /* Explicit choice remains available in this page session. */ }
      }, { signal });
    }
    system.addEventListener('change', () => {
      if (!preference) applyTheme(systemTheme());
    }, { signal });
    window.addEventListener('storage', (event) => {
      if (event.key !== key && event.key !== null) return;
      try {
        if (event.storageArea !== localStorage) return;
      } catch { return; }
      preference = valid(event.newValue);
      sessionChoices.delete(key);
      applyTheme(preference ?? systemTheme());
    }, { signal });
  }
  initThemeToggle();
  document.addEventListener('astro:after-swap', initThemeToggle);
</script>
```

### Host Site Contract

#### 1. Opt-in and anti-FOUC script in `<head>`

The following key is an example; configure it for the host project. Render this script in the same approved layout as the opt-in document root:

```html
<html data-theme-key="your-project-theme">
  <head>
    <script is:inline>
      (() => {
        const key = document.documentElement.dataset.themeKey;
        if (!key) return;
        let preference = null;
        try {
          const stored = localStorage.getItem(key);
          if (stored === 'light' || stored === 'dark') preference = stored;
        } catch { /* System preference remains available. */ }
        const theme = preference ??
          (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        if (document.documentElement.dataset.theme !== theme) {
          document.documentElement.dataset.theme = theme;
        }
      })();
    </script>
  </head>
  <!-- Host body and components -->
</html>
```

For the host's approved semantic palette, map light values on `:root[data-theme-key]`,
dark values on `:root[data-theme-key][data-theme="dark"]`, and repeat the dark mapping
inside `@media (prefers-color-scheme: dark)` for
`:root[data-theme-key]:not([data-theme])`. Set matching `color-scheme: light`/`dark`
in those rules. Reuse existing host palette declarations; do not introduce a second
token system. This scoped CSS fallback handles disabled JavaScript without affecting
layouts that omit `data-theme-key`.

#### 2. Host Token Mapping (`src/styles/tokens.css`)
```css
:root {
  --theme-toggle-size: 2.75rem; /* 44px touch target */
  --theme-toggle-color: var(--color-muted);
  --theme-toggle-bg: var(--color-surface);
  --theme-toggle-border: 1px solid var(--color-border);
  --theme-toggle-hover-color: var(--color-text);
  --theme-toggle-hover-bg: var(--color-surface-hover);
  --theme-toggle-focus: var(--color-primary);
}
```


- If using `ThemeToggle`, verify the validated, storage-safe anti-FOUC `<script is:inline>` is present in the document `<head>` and shares the host's configured preference key. Check both palettes, invalid/blocked storage, system/cross-tab updates and repeated initialisation; independently styled pages remain isolated.
