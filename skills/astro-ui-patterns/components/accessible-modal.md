## 6. AccessibleModal (`<dialog>`)

Accessible dialog overlay built on native HTML5 `<dialog>`. Renders in browser top-layer, native `::backdrop` styling, traps focus automatically, handles Escape key with focus restoration, and backdrop click-outside dismissal.

### Component Code (`src/components/AccessibleModal.astro`)

```astro
---
interface Props {
  id: string;
  title: string;
  class?: string;
}

const { id, title, class: className = '' } = Astro.props;
---

<dialog id={id} class:list={['c-modal', className]} aria-labelledby={`${id}-title`} data-modal>
  <div class="c-modal__inner">
    <header class="c-modal__header">
      <h2 id={`${id}-title`} class="c-modal__title">{title}</h2>
      <button
        type="button"
        class="c-modal__close-btn"
        aria-label="Close dialog"
        data-modal-close
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <div class="c-modal__body">
      <slot />
    </div>
  </div>
</dialog>

<style>
  .c-modal {
    margin: auto;
    padding: 0;
    background: transparent;
    border: none;
    max-inline-size: var(--modal-max-width, min(90vw, 36rem));
    inline-size: 100%;
    color: var(--modal-text, currentColor);
  }

  .c-modal::backdrop {
    background: var(--modal-backdrop-bg, rgba(0, 0, 0, 0.6));
    backdrop-filter: var(--modal-backdrop-blur, blur(4px));
  }

  .c-modal[open] {
    display: flex;
    flex-direction: column;
  }

  .c-modal__inner {
    background: var(--modal-surface, #ffffff);
    border: var(--modal-border, 1px solid rgba(0, 0, 0, 0.1));
    border-radius: var(--modal-radius, 0.75rem);
    box-shadow: var(--modal-shadow, 0 20px 25px -5px rgba(0, 0, 0, 0.2));
    overflow: hidden;
  }

  .c-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-block: 1.25rem;
    padding-inline: 1.5rem;
    border-block-end: 1px solid var(--modal-divider, rgba(0, 0, 0, 0.08));
  }

  .c-modal__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .c-modal__close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 2.75rem; /* 44px target */
    min-block-size: 2.75rem;
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: inherit;
    cursor: pointer;
  }

  .c-modal__close-btn:focus-visible {
    outline: 2px solid var(--modal-focus, currentColor);
    outline-offset: 2px;
  }

  .c-modal__close-btn svg {
    inline-size: 1.25rem;
    block-size: 1.25rem;
  }

  .c-modal__body {
    padding-block: 1.5rem;
    padding-inline: 1.5rem;
    max-block-size: 70vh;
    overflow-y: auto;
  }
</style>

<script>
  function initModals() {
    document.querySelectorAll<HTMLDialogElement>('dialog[data-modal]').forEach((modal) => {
      if (modal.dataset.modalInitialized) return;
      modal.dataset.modalInitialized = 'true';
      let triggerElement: HTMLElement | null = null;
      let previousOverflow = '';

      modal.querySelector('[data-modal-close]')?.addEventListener('click', () => modal.close());
      modal.addEventListener('click', (event) => {
        if (event.target !== modal) return;
        const rect = modal.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
      });
      modal.addEventListener('close', () => {
        document.body.style.overflow = previousOverflow;
        if (triggerElement?.isConnected) triggerElement.focus();
      });

      document.querySelectorAll<HTMLElement>('[data-modal-trigger]').forEach((trigger) => {
        if (trigger.dataset.modalTrigger !== modal.id || trigger.dataset.modalBound) return;
        trigger.dataset.modalBound = 'true';
        trigger.addEventListener('click', (event) => {
          if (!modal.isConnected || typeof modal.showModal !== 'function') return;
          event.preventDefault();
          if (modal.open) return;
          triggerElement = trigger;
          previousOverflow = document.body.style.overflow;
          modal.showModal();
          document.body.style.overflow = 'hidden';
          modal.dispatchEvent(new CustomEvent('modal:open'));
        });
      });
    });
  }

  initModals();
  document.addEventListener('astro:after-swap', initModals);
</script>
```


### Triggers, fallback and verification

Use `data-modal-trigger="modal-id"` on a button or a real fallback link, such as
`<a href="/contact/" data-modal-trigger="contact-modal">Enquire</a>`. The enhanced
handler prevents link navigation only when its dialog exists and can open. Without
JavaScript the link should reach a usable full-page alternative; if Turnstile is
required, explain that its security check requires JavaScript and offer the approved
contact alternative rather than promising no-JavaScript submission.

For forms inside a hidden dialog, initialise timing and security verification on
`modal:open`; follow the Turnstile skill's explicit widget lifecycle. Keep entered
values when closing/reopening or after failed submissions. Test close, Escape and
backdrop dismissal, restored trigger focus, repeated initialisation, and long/mobile
content without clipped fields or horizontal overflow. Native `showModal()` provides
background inertness and focus containment; do not replace it with a styled `div`.


- If using `AccessibleModal`, wire up open triggers with `data-modal-trigger="modal-id"`.
