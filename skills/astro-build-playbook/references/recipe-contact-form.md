# Contact forms with Cloudflare Workers, Turnstile and an email provider

> A complete implementation, with Mailgun as the worked email-provider example; [`forms-and-submissions.md`](forms-and-submissions.md) holds the decision gate and the host-independent contract. For another provider, see [Using another email provider](#using-another-email-provider).

This recipe is an implementation of the provider-independent contract in [Forms and submissions](forms-and-submissions.md). It provides an accessible, progressively enhanced contact form with server-side validation, server-side Turnstile verification, native HTML outcome pages, and Mailgun dispatch on Workers with Static Assets. Turnstile needs JavaScript; provide a useful contact alternative when JavaScript is unavailable. The 303 response path works without the fetch enhancement, but is not a JavaScript-free verification path.

## Choose this recipe when

- the site is deployed to Workers with Static Assets (preferred for new Cloudflare projects), or is an existing supported Pages deployment;
- submissions should arrive by email through a transactional email provider (Mailgun in the code below);
- a small host-native endpoint is preferable to a separate application server;
- the project accepts Cloudflare and the chosen email provider as explicit runtime data processors.

Choose another option when the deployment host, data destination, retention requirements, or operational ownership point elsewhere (see the decision gate in [Forms and submissions](forms-and-submissions.md)).

## Implementation

To add this contact form to your site, create the following files in your repository.

### 1. Shared validation logic

Create `src/lib/contact-validation.ts` to share field limits and validation rules between browser JavaScript and the Worker handler:

```typescript
export interface ContactFields {
  name: string;
  email: string;
  message: string;
}

export type ContactField = keyof ContactFields;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINE_BREAK_PATTERN = /[\r\n]/;

export const CONTACT_FIELD_LIMITS = {
  name: 100,
  email: 254,
  message: 5000,
} as const;

export function validateContactFields(fields: ContactFields): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  const name = fields.name.trim();
  if (!name) {
    errors.name = 'Enter your name.';
  } else if (name.length > CONTACT_FIELD_LIMITS.name) {
    errors.name = `Name must be ${CONTACT_FIELD_LIMITS.name} characters or fewer.`;
  } else if (LINE_BREAK_PATTERN.test(name)) {
    errors.name = 'Enter your name without line breaks.';
  }

  const email = fields.email.trim();
  if (!email) {
    errors.email = 'Enter your email address.';
  } else if (email.length > CONTACT_FIELD_LIMITS.email) {
    errors.email = `Email must be ${CONTACT_FIELD_LIMITS.email} characters or fewer.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  const message = fields.message.trim();
  if (!message) {
    errors.message = 'Enter a message.';
  } else if (message.length > CONTACT_FIELD_LIMITS.message) {
    errors.message = `Message must be ${CONTACT_FIELD_LIMITS.message} characters or fewer.`;
  }

  return errors;
}
```

### 2. Form result component

Create `src/components/FormResult.astro` for rendering native HTML submission outcome pages:

```astro
---
interface Props {
  eyebrow: string;
  title: string;
  message: string;
  linkText: string;
  linkHref: string;
}

const { eyebrow, title, message, linkText, linkHref } = Astro.props;
---

<main id="main-content" class="l-section c-form-result">
  <div class="l-container l-container--narrow c-form-result__container">
    <p class="c-form-result__eyebrow">{eyebrow}</p>
    <h1 class="c-form-result__title">{title}</h1>
    <p class="c-form-result__message">{message}</p>
    <a class="c-form-result__link" href={linkHref}>{linkText}</a>
  </div>
</main>

<style>
  .c-form-result {
    min-block-size: 70vh;
    display: flex;
    align-items: center;
  }

  .c-form-result__container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .c-form-result__eyebrow {
    margin-block-end: var(--space-s);
    color: var(--color-accent);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .c-form-result__title {
    margin-block-end: var(--space-m);
    color: var(--color-primary);
    font-family: var(--font-display);
    font-size: var(--h1);
    line-height: 1.1;
  }

  .c-form-result__message {
    max-inline-size: 48ch;
    margin-block-end: var(--space-xl);
    color: var(--color-muted);
    font-size: var(--text-l);
    line-height: 1.6;
  }

  .c-form-result__link {
    display: inline-flex;
    padding-block: var(--space-s);
    padding-inline: var(--space-l);
    border-radius: var(--radius-m);
    background-color: var(--color-primary);
    color: var(--color-bg);
    font-weight: 500;
    text-decoration: none;
  }

  .c-form-result__link:hover {
    opacity: 0.9;
  }
</style>
```

### 3. Contact form component

Create `src/components/ContactForm.astro`. It renders semantic HTML controls, links labels and errors with ARIA, includes honeypot and timestamp inputs, and progressively enhances with `fetch()` when JavaScript is enabled:

```astro
---
import { CONTACT_FIELD_LIMITS } from '../lib/contact-validation';

interface Props {
  action?: string;
  turnstileSiteKey: string;
  contactEmail: string; // Approved alternative for visitors without JavaScript
}

const { action = '/api/contact', turnstileSiteKey, contactEmail } = Astro.props;
---

<form class="c-contact-form" method="POST" action={action}>
  <noscript>This form requires JavaScript for security verification. <a href={`mailto:${contactEmail}`}>Email us instead</a>.</noscript>
  <!-- Anti-spam: Honeypot & Timestamp -->
  <div class="c-contact-form__honey" aria-hidden="true">
    <label for="contact-form-hp">Do not fill this out if human</label>
    <input type="text" id="contact-form-hp" name="_hp" tabindex="-1" autocomplete="off" />
    <input type="hidden" name="_timestamp" value="" />
  </div>

  <div class="c-contact-form__field">
    <label for="contact-form-name" class="c-contact-form__label">
      Name <span class="c-contact-form__required" aria-hidden="true">*</span>
    </label>
    <input
      type="text"
      id="contact-form-name"
      name="name"
      required
      maxlength={CONTACT_FIELD_LIMITS.name}
      aria-required="true"
      aria-describedby="name-error"
      autocomplete="name"
      class="c-contact-form__input"
    />
    <span class="c-contact-form__error" id="name-error"></span>
  </div>

  <div class="c-contact-form__field">
    <label for="contact-form-email" class="c-contact-form__label">
      Email <span class="c-contact-form__required" aria-hidden="true">*</span>
    </label>
    <input
      type="email"
      id="contact-form-email"
      name="email"
      required
      maxlength={CONTACT_FIELD_LIMITS.email}
      aria-required="true"
      aria-describedby="email-error"
      autocomplete="email"
      class="c-contact-form__input"
    />
    <span class="c-contact-form__error" id="email-error"></span>
  </div>

  <div class="c-contact-form__field">
    <label for="contact-form-message" class="c-contact-form__label">
      Message <span class="c-contact-form__required" aria-hidden="true">*</span>
    </label>
    <textarea
      id="contact-form-message"
      name="message"
      rows="5"
      required
      maxlength={CONTACT_FIELD_LIMITS.message}
      aria-required="true"
      aria-describedby="message-error"
      class="c-contact-form__textarea"
    ></textarea>
    <span class="c-contact-form__error" id="message-error"></span>
  </div>

  {turnstileSiteKey && (
    <div class="c-contact-form__turnstile">
      <div class="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" data-action="contact"></div>
    </div>
  )}

  <div class="c-contact-form__actions">
    <button type="submit" class="c-contact-form__submit">
      <span class="c-contact-form__submit-text">Send Message</span>
    </button>
  </div>

  <div class="c-contact-form__status" role="status" aria-live="polite" aria-atomic="true"></div>
</form>

{turnstileSiteKey && (
  <script is:inline src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
)}

<script>
  import {
    validateContactFields,
    type ContactField,
    type ContactFieldErrors,
  } from '../lib/contact-validation';

  function initContactForm() {
    const forms = document.querySelectorAll<HTMLFormElement>('.c-contact-form');

    forms.forEach((form) => {
      if (form.dataset.initialized === 'true') return;
      form.dataset.initialized = 'true';
      form.noValidate = true;

      const submitBtn = form.querySelector<HTMLButtonElement>('.c-contact-form__submit');
      const submitText = form.querySelector<HTMLElement>('.c-contact-form__submit-text');
      const statusEl = form.querySelector<HTMLElement>('.c-contact-form__status');
      const fields = {
        name: form.elements.namedItem('name') as HTMLInputElement | null,
        email: form.elements.namedItem('email') as HTMLInputElement | null,
        message: form.elements.namedItem('message') as HTMLTextAreaElement | null,
      };

      const setFieldError = (field: ContactField, message?: string) => {
        const input = fields[field];
        const error = form.querySelector<HTMLElement>(`#${field}-error`);
        if (!input || !error) return;

        if (message) {
          input.setAttribute('aria-invalid', 'true');
          error.textContent = message;
        } else {
          input.removeAttribute('aria-invalid');
          error.textContent = '';
        }
      };

      const renderFieldErrors = (errors: ContactFieldErrors) => {
        (Object.keys(fields) as ContactField[]).forEach((field) => {
          setFieldError(field, errors[field]);
        });
      };

      (Object.keys(fields) as ContactField[]).forEach((field) => {
        fields[field]?.addEventListener('input', () => setFieldError(field));
      });

      const timestampInput = form.elements.namedItem('_timestamp') as HTMLInputElement;
      const refreshTimestamp = () => { timestampInput.value = String(Math.floor(Date.now() / 1000)); };
      refreshTimestamp(); // For modal forms, initialise when the modal opens.
      form.addEventListener('reset', () => queueMicrotask(refreshTimestamp));
      const resetTurnstile = () => {
        const api = (window as Window & { turnstile?: { reset: (container: HTMLElement) => void } }).turnstile;
        const widget = form.querySelector<HTMLElement>('.cf-turnstile');
        if (widget) api?.reset(widget);
      };

      form.addEventListener('submit', async (e) => {
        const fieldErrors = validateContactFields({
          name: fields.name?.value ?? '',
          email: fields.email?.value ?? '',
          message: fields.message?.value ?? '',
        });
        renderFieldErrors(fieldErrors);

        if (Object.keys(fieldErrors).length > 0) {
          e.preventDefault();
          if (statusEl) {
            statusEl.textContent = 'Check the highlighted fields and try again.';
            statusEl.className = 'c-contact-form__status c-contact-form__status--error';
          }
          const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
          firstInvalid?.focus();
          return;
        }

        // Progressive enhancement: submit via fetch
        e.preventDefault();

        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Sending...';
        form.setAttribute('aria-busy', 'true');

        if (statusEl) {
          statusEl.textContent = 'Sending message...';
          statusEl.className = 'c-contact-form__status c-contact-form__status--pending';
        }

        try {
          const formData = new FormData(form);
          const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'application/json',
            },
          });

          const data = (await response.json().catch(() => null)) as {
            success?: boolean;
            error?: string;
            fieldErrors?: ContactFieldErrors;
          } | null;

          if (response.ok && data?.success !== false) {
            form.reset();
            resetTurnstile();
            if (statusEl) {
              statusEl.textContent = 'Thank you! Your message has been sent successfully.';
              statusEl.className = 'c-contact-form__status c-contact-form__status--success';
            }
          } else {
            resetTurnstile();
            refreshTimestamp();
            if (data?.fieldErrors) {
              renderFieldErrors(data.fieldErrors);
              const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
              firstInvalid?.focus();
            }
            const errorMsg = data?.error || 'Unable to send your message. Please try again later.';
            if (statusEl) {
              statusEl.textContent = errorMsg;
              statusEl.className = 'c-contact-form__status c-contact-form__status--error';
            }
          }
        } catch {
          resetTurnstile();
          refreshTimestamp();
          if (statusEl) {
            statusEl.textContent = 'Network error. Please check your connection and try again.';
            statusEl.className = 'c-contact-form__status c-contact-form__status--error';
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
          if (submitText) submitText.textContent = 'Send Message';
          form.removeAttribute('aria-busy');
        }
      });
    });
  }

  initContactForm();
  document.addEventListener('astro:page-load', initContactForm);
</script>

<style>
  .c-contact-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    max-inline-size: 600px;
    inline-size: 100%;
  }

  .c-contact-form__honey {
    position: absolute;
    inset-inline-start: -9999px;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
  }

  .c-contact-form__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  .c-contact-form__label {
    font-size: var(--text-s);
    font-weight: 500;
    color: var(--color-text);
  }

  .c-contact-form__required {
    color: var(--color-primary);
  }

  .c-contact-form__input,
  .c-contact-form__textarea {
    font-family: inherit;
    font-size: var(--text-base);
    color: var(--color-text);
    background: var(--color-surface);
    border: var(--border-subtle);
    border-radius: var(--radius-s);
    padding-block: var(--space-2xs);
    padding-inline: var(--space-xs);
    inline-size: 100%;
    box-sizing: border-box;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  .c-contact-form__input:focus-visible,
  .c-contact-form__textarea:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 3px;
    border-color: var(--color-primary);
  }

  .c-contact-form__input[aria-invalid="true"],
  .c-contact-form__textarea[aria-invalid="true"] {
    border-color: var(--color-error-border);
  }

  .c-contact-form__textarea {
    resize: vertical;
    min-block-size: 130px;
  }

  .c-contact-form__turnstile {
    min-block-size: 65px;
  }

  .c-contact-form__actions {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  .c-contact-form__submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding-block: var(--space-2xs);
    padding-inline: var(--space-m);
    font-family: inherit;
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--color-surface);
    background: var(--color-primary);
    border: none;
    border-radius: var(--radius-s);
    cursor: pointer;
    transition: opacity 140ms ease, transform 140ms ease;
  }

  .c-contact-form__submit:hover:not(:disabled) {
    opacity: 0.92;
  }

  .c-contact-form__submit:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 3px;
  }

  .c-contact-form__submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .c-contact-form__status {
    font-size: var(--text-s);
    line-height: 1.5;
    padding-block: var(--space-2xs);
    padding-inline: var(--space-xs);
    border-radius: var(--radius-s);
    empty-cells: hide;
  }

  .c-contact-form__status:empty {
    display: none;
  }

  .c-contact-form__status--pending {
    color: var(--color-muted);
    background: var(--color-bg);
  }

  .c-contact-form__status--success {
    color: var(--color-success);
    background: var(--color-success-surface);
    border: 1px solid var(--color-success-border);
  }

  .c-contact-form__status--error {
    color: var(--color-error);
    background: var(--color-error-surface);
    border: 1px solid var(--color-error-border);
  }

  .c-contact-form__error {
    font-size: var(--text-xs);
    color: var(--color-error);
  }

  .c-contact-form__error:empty {
    display: none;
  }
</style>
```

### 4. Native HTML outcome pages

Create `src/pages/contact/success.astro`:

```astro
---
import FormResult from '../../components/FormResult.astro';
import BaseLayout from '../../layouts/BaseLayout.astro';
---

<BaseLayout
  title="Message sent — Site name"
  description="Your message was sent successfully."
  noindex={true}
>
  <FormResult
    eyebrow="Message sent"
    title="Thank you"
    message="Your message has been sent successfully."
    linkText="Return home"
    linkHref="/"
  />
</BaseLayout>
```

Create `src/pages/contact/error.astro`:

```astro
---
import FormResult from '../../components/FormResult.astro';
import BaseLayout from '../../layouts/BaseLayout.astro';
---

<BaseLayout
  title="Message not sent — Site name"
  description="Your message could not be sent."
  noindex={true}
>
  <FormResult
    eyebrow="Message not sent"
    title="Please try again"
    message="We could not send your message. Your details have not been saved, so please return to the form and try again."
    linkText="Return to the form"
    linkHref="/#contact"
  />
</BaseLayout>
```

### 5. Shared submission handler and host routing

Create `src/contact.ts`. The handler validates requests, verifies Turnstile, then dispatches through Mailgun. Astro keeps `output: 'static'`.

```typescript
import { validateContactFields } from './lib/contact-validation.ts';

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  MAILGUN_API_KEY?: string;
  MAILGUN_DOMAIN?: string;
  MAILGUN_REGION?: string; // 'us' or 'eu'
  CONTACT_TO_EMAIL?: string;
}

async function readBoundedForm(request: Request): Promise<FormData> {
  if (!/^(multipart\/form-data|application\/x-www-form-urlencoded)\b/i.test(
      request.headers.get('Content-Type') || '')) throw new Error('Unsupported format');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) { reader.releaseLock(); throw new Error('Body too large'); }
    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    chunks.push(copy.buffer);
  }
  const body = await new Blob(chunks).text();
  return new Request(request.url, { method: 'POST', headers: request.headers, body }).formData();
}

export async function handleContact(request: Request, env: Env): Promise<Response> {
  const wantsJson = request.headers.get('Accept')?.includes('application/json');

  const redirectOrJson = (path: string, status = 303, jsonError?: string) => {
    if (wantsJson) {
      if (jsonError) {
        return new Response(JSON.stringify({ success: false, error: jsonError }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    }
    return new Response(null, { status, headers: { Location: new URL(path, request.url).toString(), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  };

  try {
    if (request.headers.get('Origin') !== new URL(request.url).origin) {
      return redirectOrJson('/contact/error', 303, 'Please submit from this website');
    }
    const formData = await readBoundedForm(request);

    // 1. Optional server-side honeypot heuristic
    const honeypot = formData.get('_hp');
    if (honeypot && String(honeypot).trim() !== '') {
      return redirectOrJson('/contact/error', 303, 'Please clear the hidden field and try again');
    }

    // 2. Timestamp heuristic: allow a recoverable retry
    const timestampStr = formData.get('_timestamp');
    const formTime = Number(timestampStr);
    const age = Math.floor(Date.now() / 1000) - formTime;
    if (!timestampStr || !Number.isFinite(age) || age < 2) {
      return redirectOrJson('/contact/error', 303, 'Please reopen the form and try again');
    }

    // 4. Input validation
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const fieldErrors = validateContactFields({ name, email, message });
    if (Object.keys(fieldErrors).length > 0) {
      if (wantsJson) return Response.json({ success: false, error: 'Check the highlighted fields and try again.', fieldErrors }, {
        status: 400, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
      return redirectOrJson('/contact/error', 303, 'Check the highlighted fields and try again.');
    }

    // 3. Fail closed when the selected Turnstile integration is unconfigured
    if (!env.TURNSTILE_SECRET_KEY) {
      return redirectOrJson('/contact/error', 303, 'Security verification unavailable');
    }
    {
      const turnstileToken = formData.get('cf-turnstile-response');
      if (!turnstileToken || String(turnstileToken).trim() === '' || String(turnstileToken).length > 2048) {
        return redirectOrJson('/contact/error', 303, 'Turnstile verification token missing');
      }

      const clientIp = request.headers.get('CF-Connecting-IP') || '';
      const verifyFormData = new FormData();
      verifyFormData.append('secret', env.TURNSTILE_SECRET_KEY);
      verifyFormData.append('response', String(turnstileToken));
      if (clientIp) verifyFormData.append('remoteip', clientIp);

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: verifyFormData,
        signal: AbortSignal.timeout(10_000),
      });

      const verifyData = verifyRes.ok ? await verifyRes.json() : {};
      if (verifyData.success !== true || verifyData.action !== 'contact' ||
          verifyData.hostname !== new URL(request.url).hostname) {
        return redirectOrJson('/contact/error', 303, 'Turnstile verification failed');
      }
    }

    // 5. Dispatch via Mailgun REST API
    if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
      console.error('Missing Mailgun configuration (MAILGUN_API_KEY or MAILGUN_DOMAIN)');
      return redirectOrJson('/contact/error', 303, 'Email service not configured');
    }

    const isEu = env.MAILGUN_REGION?.toLowerCase() === 'eu';
    const mailgunHost = isEu ? 'api.eu.mailgun.net' : 'api.mailgun.net';
    const mailgunUrl = `https://${mailgunHost}/v3/${env.MAILGUN_DOMAIN}/messages`;

    const recipient = env.CONTACT_TO_EMAIL;
    if (!recipient) return redirectOrJson('/contact/error', 303, 'Recipient not configured');
    const sender = `Website Enquiry <mailgun@${env.MAILGUN_DOMAIN}>`;
    const subject = `Website enquiry from ${name}`;

    const textBody = [
      `Name: ${name}`,
      `Email: ${email}`,
      ``,
      `Message:`,
      message,
      ``,
      `---`,
      `Submitted at: ${new Date().toISOString()}`,
    ].join('\n');

    const mailgunData = new FormData();
    mailgunData.append('from', sender);
    mailgunData.append('to', recipient);
    mailgunData.append('h:Reply-To', email);
    mailgunData.append('o:tracking', 'no');
    mailgunData.append('subject', subject);
    mailgunData.append('text', textBody);

    const mailgunRes = await fetch(mailgunUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`api:${env.MAILGUN_API_KEY}`),
      },
      body: mailgunData,
      signal: AbortSignal.timeout(10_000),
    });

    if (!mailgunRes.ok) {
      console.error('Mailgun send failed:', mailgunRes.status);
      return redirectOrJson('/contact/error', 303, 'Failed to dispatch email');
    }

    return redirectOrJson('/contact/success');
  } catch (error) {
    // Error type and message only: never form data, and never in the redirect URL.
    console.error('Contact function failed:', error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error');
    return redirectOrJson('/contact/error', 303, 'Server error');
  }
}
```



For a site hosted on **Workers Static Assets**, `functions/api/contact.ts` is not a
routable Pages Function. Keep Astro `output: 'static'` and handle submissions in a
Worker entrypoint; do not add an SSR adapter solely for forms. Reuse an existing
Worker when appropriate (for example a separately authorised CMS OAuth handler),
preserving its routes and bindings. Add only the independently required runtime code.

(When the project already uses `output: 'server'` — such as an EmDash CMS build — expose the handler as an Astro server endpoint at `src/pages/api/contact.ts` calling `handleContact(request, env)` with `import { env } from 'cloudflare:workers'`, and read `env.TURNSTILE_SITE_KEY` at request time in `src/pages/contact/index.astro` so setting `TURNSTILE_SITE_KEY` via `wrangler secret put` takes effect without a rebuild.)

```jsonc
{
  "name": "your-project",
  "compatibility_date": "2026-10-07",
  "main": "./src/worker.ts",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "html_handling": "auto-trailing-slash",
    "run_worker_first": ["/api/contact", "/api/contact-config"]
  },
  "observability": { "enabled": true },
  "workers_dev": true
}
```

`observability.enabled` turns on Workers Logs, so the handler's `console.error` output is kept and
searchable in the dashboard (**Worker → Logs**) instead of being visible only through a live
`wrangler tail`. Diagnose failures there; keep the redirect to `/contact/error` free of exception
text, reason codes built from it, or other diagnostics.

Use the shared `handleContact(request, env)` handler in `src/worker.ts`;
the Pages wrapper and Worker router are host-specific, not interchangeable:

```typescript
import { handleContact } from './contact.ts';
export default {
  async fetch(request: Request, env: Parameters<typeof handleContact>[1] & { TURNSTILE_SITE_KEY?: string; ASSETS: { fetch(request: Request): Promise<Response> } }) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      }
      return handleContact(request, env);
    }
    if (pathname === '/api/contact-config' && request.method === 'GET') {
      return Response.json({ sitekey: env.TURNSTILE_SITE_KEY || '' },
        { headers: { 'Cache-Control': 'no-store' } });
    }
    // Preserve any existing authorized runtime routes before delegating assets.
    return env.ASSETS.fetch(request);
  },
};
```

For an existing Pages deployment, create `functions/api/contact.ts` instead of the Worker router:

```typescript
import { handleContact } from '../../src/contact.ts';
export const onRequestPost = ({ request, env }: { request: Request; env: Parameters<typeof handleContact>[1] }) => handleContact(request, env);
export const onRequestGet = ({ request }: { request: Request }) =>
  Response.redirect(new URL('/#contact', request.url).toString(), 302);
```

Static asset `_headers` rules do not configure responses generated by the handler. Set API response headers in code, including `Cache-Control: no-store`, and verify both asset and API responses.

### 6. Sitemap filter (optional)

If you don't want the `/contact/success` and `/contact/error` outcome pages included in your XML sitemap, update `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  integrations: [sitemap({
    filter: (page) => !page.includes('/contact/success/') && !page.includes('/contact/error/'),
  })],
});
```

### 7. Automated tests (optional)

Create `<project>/scripts/test-contact-form.mjs` to test the built HTML accessibility and endpoint contract with a mocked provider:

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { handleContact } from '../src/contact.ts';
import worker from '../src/worker.ts';
import { CONTACT_FIELD_LIMITS } from '../src/lib/contact-validation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function builtDocument(relativePath) {
  const file = path.join(root, 'dist', relativePath);
  assert.ok(fs.existsSync(file), `Expected built page: ${relativePath}`);
  return new JSDOM(fs.readFileSync(file, 'utf8')).window.document;
}

const validFields = { name: 'Ada', email: 'ada@example.com', message: 'Hello',
  _timestamp: Math.floor(Date.now() / 1000) - 5, 'cf-turnstile-response': 'test-token' };
const configuredEnv = { TURNSTILE_SECRET_KEY: 'test-secret', MAILGUN_API_KEY: 'test-key',
  MAILGUN_DOMAIN: 'mg.example.com', MAILGUN_REGION: 'eu', CONTACT_TO_EMAIL: 'team@example.com' };
function postRequest(fields = {}, { acceptJson = true, env = configuredEnv, origin = 'https://example.com' } = {}) {
  const body = new FormData();
  Object.entries({ ...validFields, ...fields }).forEach(([name, value]) => body.set(name, String(value)));
  return handleContact(new Request('https://example.com/api/contact', {
    method: 'POST', headers: { Origin: origin, ...(acceptJson ? { Accept: 'application/json' } : {}) }, body,
  }), env);
}

test('built form exposes labels, requirements, descriptions, and status semantics', () => {
  const document = builtDocument('index.html');
  const form = document.querySelector('.c-contact-form');
  assert.ok(form);
  assert.equal(form.getAttribute('method'), 'POST');
  assert.equal(form.getAttribute('action'), '/api/contact');
  assert.equal(form.noValidate, false, 'Expected native validation without JavaScript');

  for (const field of ['name', 'email', 'message']) {
    const input = form.elements.namedItem(field);
    assert.ok(input, `Expected ${field} field`);
    assert.ok(document.querySelector(`label[for="${input.id}"]`), `Expected label for ${field}`);
    assert.ok(input.hasAttribute('required'), `Expected ${field} to be required`);
    assert.equal(input.getAttribute('aria-required'), 'true');
    assert.equal(Number(input.getAttribute('maxlength')), CONTACT_FIELD_LIMITS[field]);

    const descriptionId = input.getAttribute('aria-describedby');
    assert.ok(descriptionId, `Expected ${field} error relationship`);
    assert.ok(document.getElementById(descriptionId), `Expected ${descriptionId} error container`);
  }

  assert.ok(form.querySelector('noscript a[href^="mailto:"]'), 'Expected a contact alternative without JavaScript');
  assert.equal(form.elements.namedItem('email').getAttribute('type'), 'email');
  const status = form.querySelector('[role="status"]');
  assert.ok(status);
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.equal(status.getAttribute('aria-atomic'), 'true');

  const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
  assert.equal(new Set(ids).size, ids.length, 'Expected unique IDs in the built page');
});

test('built success and error destinations provide one heading and a recovery link', () => {
  for (const relativePath of ['contact/success/index.html', 'contact/error/index.html']) {
    const document = builtDocument(relativePath);
    assert.equal(document.querySelectorAll('main').length, 1);
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.ok(document.querySelector('main a[href]'));
  }
});

test('invalid input returns accessible field errors before provider requests', async () => {
  const response = await postRequest({ email: 'invalid' });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).fieldErrors.email);
  const native = await postRequest({ email: 'invalid' }, { acceptJson: false });
  assert.equal(native.status, 303);
  assert.equal(native.headers.get('Location'), 'https://example.com/contact/error');
  assert.equal(native.headers.get('Cache-Control'), 'no-store');
});

test('heuristics and origin failures are recoverable errors, never fake success', async () => {
  for (const fields of [{ _hp: 'autofill' }, { _timestamp: Math.floor(Date.now() / 1000) }, { _timestamp: 'NaN' }]) {
    const response = await postRequest(fields);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
  }
  assert.equal((await postRequest({}, { origin: 'https://other.example' })).status, 400);
  assert.equal((await postRequest({}, { env: {} })).status, 400);
});

test('Turnstile gates delivery; Mailgun uses the configured domain, region and recipient', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let verified = true;
  let providerOk = true;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/siteverify')) return Response.json({ success: verified, action: 'contact', hostname: 'example.com' });
    return new Response('queued', { status: providerOk ? 200 : 503 });
  };
  try {
    const response = await postRequest();
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'https://api.eu.mailgun.net/v3/mg.example.com/messages');
    assert.equal(calls[1].init.body.get('to'), 'team@example.com');
    assert.equal(calls[1].init.body.get('h:Reply-To'), 'ada@example.com');
    assert.equal(calls[1].init.body.get('o:tracking'), 'no');
    calls.length = 0; verified = false;
    assert.equal((await postRequest()).status, 400);
    assert.equal(calls.length, 1, 'Rejected tokens must not dispatch email');
    verified = true; providerOk = false;
    assert.equal((await postRequest()).status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test('bounded parsing and invalid verification metadata cannot dispatch email', async () => {
  const huge = await postRequest({ message: 'x'.repeat(20_000) });
  assert.equal(huge.status, 400);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ success: true, action: 'other', hostname: 'example.com' }); };
  try {
    assert.equal((await postRequest()).status, 400);
    assert.equal(calls, 1);
    globalThis.fetch = async () => Response.json({ success: true, action: 'contact', hostname: 'other.example' });
    assert.equal((await postRequest()).status, 400);
    globalThis.fetch = async () => Response.json({ success: true, action: 'contact', hostname: 'example.com' });
    assert.equal((await postRequest({}, { env: { TURNSTILE_SECRET_KEY: 'secret' } })).status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test('Worker routes contact requests and delegates static assets', async () => {
  const env = { ASSETS: { fetch: async () => new Response('asset') } };
  assert.equal((await worker.fetch(new Request('https://example.com/api/contact'), env)).status, 405);
  assert.equal(await (await worker.fetch(new Request('https://example.com/about/'), env)).text(), 'asset');
});
```

Add the script to `package.json`:

```json
"scripts": {
  "test:forms": "node --experimental-strip-types --test scripts/test-contact-form.mjs"
}
```

## Required configuration

Configure runtime secrets and variables on the selected Worker (or the production/preview bindings of an existing Pages deployment), never in committed files:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MAILGUN_API_KEY` | Yes | Mailgun sending credential. |
| `MAILGUN_DOMAIN` | Yes | Verified sending domain. |
| `CONTACT_TO_EMAIL` | Yes | Destination mailbox. |
| `MAILGUN_REGION` | No | Set to `eu` for the EU API; otherwise the US API is used. |
| `TURNSTILE_SECRET_KEY` | Yes for this recipe | Server-side challenge verification secret. |

Pass the matching public site key to `<ContactForm turnstileSiteKey="0x4AAAAAA..." contactEmail="<approved-contact-address>" />`. The site key may be present in browser-rendered markup; the secret key must never be.

## Behaviour

The baseline form posts to `/api/contact`. Standard HTML submissions receive a `303` redirect to a success or error page. Browser JavaScript enhances the same form with in-place status messaging and field-specific errors.

Abuse protection is layered:

1. a visually hidden honeypot;
2. an elapsed-time heuristic;
3. required server-side Cloudflare Turnstile verification.

The endpoint validates all trusted inputs again before contacting Mailgun. Turnstile is the authoritative bot gate. Honeypot and timestamp checks are supplementary and return recoverable errors, preserving entered values rather than pretending an email was accepted. Never intercept submissions using client-side honeypots or ordinary autofill fields. Mailgun acceptance does not establish inbox delivery.

## Using another email provider

Mailgun is the worked example, not a requirement. Ask which provider the site owner uses and
keep everything else in this recipe (validation, Turnstile, honeypot and timestamp, dual
303/JSON response, outcome pages, routing). To switch:

1. **Environment:** replace `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` and `MAILGUN_REGION` in the `Env`
   interface, the configuration check and the tables with the provider's own settings (API key as
   a runtime Secret; verified sender domain or address; region or endpoint if it has one).
2. **Dispatch block:** in `handleContact`, replace the Mailgun `FormData` request with the
   provider's send API, checked against its current documentation. Keep sender and recipient
   server-controlled, set Reply-To to the submitter's address only after validation, disable link
   and open tracking where the provider allows it, and keep the 10-second timeout and the generic
   error redirect.
3. **Tests:** point the mocked `fetch` in `scripts/test-contact-form.mjs` at the provider's
   endpoint and assert its request shape.
4. **Records:** list the provider as a data processor in the privacy notice and the project record.

A provider's success response means it accepted the message, not that it reached the inbox.

## Pre-production checklist

1. Configure the email provider's credentials, verified sending domain (and region, if any), and destination for preview and production environments on the selected Worker or existing Pages deployment.
2. Configure the required Turnstile widget and secret, allowed hostname and contact action. Use a sending key restricted to the chosen domain where the provider supports one.
   Then confirm the deployed version carries the secrets, not just the Worker's secret list ([runtime bindings](forms-and-submissions.md#runtime-bindings-versus-build-variables)).
3. Customise the fields, consent copy, success page, error page, sender identity, and operational alerts.
4. Test valid, invalid, provider-failure, native HTML response, JavaScript-disabled contact alternative, keyboard, and abuse-protection paths in the deployed environment.
5. Run `npm run test:forms` to exercise the local contract with a mocked provider. Astro's static preview does not reproduce host-native function routing, so it is not a substitute for a deployed integration test.


Use implicit Turnstile rendering for a static form present at page load. For modals or dynamic insertion, use explicit rendering, retain the widget ID, reset on retry and remove on teardown. Merge runtime routes into an existing authorised Worker instead of replacing unrelated CMS/OAuth routes.
