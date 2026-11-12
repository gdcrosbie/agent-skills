## 9. SocialShare

100% GDPR-compliant social sharing bar. Uses zero third-party JavaScript SDKs, zero cookies, and zero external trackers. Generates pure static intent URLs and enhances to the native mobile Web Share API (`navigator.share`) on supporting devices.

### Component Code (`src/components/SocialShare.astro`)

```astro
---
interface Props {
  title: string;
  url?: string;
  description?: string;
  class?: string;
}

const { title, url = '', description = '', class: className = '' } = Astro.props;

const encodedUrl = encodeURIComponent(url);
const encodedTitle = encodeURIComponent(title);
const encodedDesc = encodeURIComponent(description);
---

<div class:list={['c-share', className]} data-share-root data-share-title={title} data-share-url={url}>
  <span class="c-share__label">Share this:</span>

  <div class="c-share__links">
    <!-- Native Web Share Trigger (enhanced on mobile iOS/Android) -->
    <button
      type="button"
      class="c-share__btn c-share__btn--native"
      aria-label="Share via native device dialog"
      hidden
      data-share-native
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      <span>Share</span>
    </button>

    <!-- LinkedIn -->
    <a
      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
      target="_blank"
      rel="noopener noreferrer"
      class="c-share__btn"
      aria-label="Share on LinkedIn"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
      <span class="sr-only">LinkedIn</span>
    </a>

    <!-- X / Twitter -->
    <a
      href={`https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
      target="_blank"
      rel="noopener noreferrer"
      class="c-share__btn"
      aria-label="Share on X"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span class="sr-only">X</span>
    </a>

    <!-- Bluesky -->
    <a
      href={`https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`}
      target="_blank"
      rel="noopener noreferrer"
      class="c-share__btn"
      aria-label="Share on Bluesky"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566 1.01 1.25 1.5 1.25 3.5c0 2.2.8 12.5 10.75 16.5 9.95-4 10.75-14.3 10.75-16.5 0-2-1.316-2.49-3.952-.695C16.046 4.747 13.087 8.686 12 10.8Z" />
      </svg>
      <span class="sr-only">Bluesky</span>
    </a>

    <!-- Email -->
    <a
      href={`mailto:?subject=${encodedTitle}&body=${encodedTitle}%0A%0A${encodedUrl}`}
      class="c-share__btn"
      aria-label="Share via email"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      <span class="sr-only">Email</span>
    </a>

    <!-- Copy Link with Live Toast Feedback -->
    <button
      type="button"
      class="c-share__btn"
      aria-label="Copy link to clipboard"
      data-share-copy
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
      <span class="sr-only">Copy link</span>
      <span class="c-share__feedback" aria-live="polite" data-share-feedback></span>
    </button>
  </div>
</div>

<style>
  .c-share {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-block: var(--share-padding-y, 1rem);
  }

  .c-share__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--share-label-color, currentColor);
  }

  .c-share__links {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .c-share__btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--share-btn-size, 2.75rem); /* 44px target */
    min-block-size: var(--share-btn-size, 2.75rem);
    padding: 0.5rem;
    background: var(--share-btn-bg, transparent);
    color: var(--share-btn-color, currentColor);
    border: var(--share-btn-border, 1px solid rgba(125, 125, 125, 0.2));
    border-radius: var(--share-radius, 0.5rem);
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .c-share__btn:hover {
    background: var(--share-btn-hover-bg, rgba(125, 125, 125, 0.15));
  }

  .c-share__btn:focus-visible {
    outline: 2px solid var(--share-focus, currentColor);
    outline-offset: 2px;
  }

  .c-share__btn svg {
    inline-size: 1.25rem;
    block-size: 1.25rem;
  }

  .c-share__btn--native {
    gap: 0.5rem;
    padding-inline: 1rem;
    font-weight: 500;
  }

  .c-share__btn--native[hidden] {
    display: none;
  }

  .c-share__feedback {
    position: absolute;
    inset-block-end: 120%;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    background: #0f172a;
    color: #ffffff;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .c-share__feedback--visible {
    opacity: 1;
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
  function initSocialShare() {
    const shareRoots = document.querySelectorAll('[data-share-root]');

    shareRoots.forEach((root) => {
      const nativeBtn = root.querySelector('[data-share-native]');
      const copyBtn = root.querySelector('[data-share-copy]');
      const feedback = root.querySelector('[data-share-feedback]');

      const title = root.getAttribute('data-share-title') || document.title;
      const url = root.getAttribute('data-share-url') || window.location.href;

      // Enhance with native mobile share dialog if supported
      if (navigator.share && nativeBtn) {
        nativeBtn.removeAttribute('hidden');
        nativeBtn.addEventListener('click', async () => {
          try {
            await navigator.share({ title, url });
          } catch {
            // Cancelled or unsupported
          }
        });
      }

      // Copy link to clipboard
      copyBtn?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(url);
          if (feedback) {
            feedback.textContent = 'Copied!';
            feedback.classList.add('c-share__feedback--visible');
            setTimeout(() => {
              feedback.classList.remove('c-share__feedback--visible');
            }, 2000);
          }
        } catch {
          // Fallback if clipboard API blocked
        }
      });
    });
  }

  initSocialShare();
  document.addEventListener('astro:after-swap', initSocialShare);
</script>
```
