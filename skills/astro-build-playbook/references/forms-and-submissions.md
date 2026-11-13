# Forms & Submissions Guide (Static Astro)

In a performance-first static Astro architecture (`output: 'static'`), there is no persistent origin server or PHP backend (`wp_mail()`). Form submissions require an explicit, intentional architectural pattern.

This guide defines the submission contract for static Astro forms. When Cloudflare Workers and a transactional email provider are selected, use a Worker endpoint with server-side Turnstile verification before email dispatch. The email provider is the user's choice; the [contact form recipe](recipe-contact-form.md) uses Mailgun as its worked example and lists what to change for another provider. Prefer Workers with Static Assets for new Cloudflare projects; Pages remains supported for existing deployments. Confirm any new provider adoption independently of the hosting choice.

> [!NOTE]
> **Confirm the host first** ([`hosting-and-indexing.md`](hosting-and-indexing.md) §1). The endpoint contract below (validation, server-side Turnstile verification and supplementary heuristics, dual 303/JSON response, accessible errors) is host-independent. On another host, implement the same handler in that host's function convention with its runtime environment variables. Don't add a Cloudflare `functions/` directory to a site deployed elsewhere. When the frontend host is decoupled from Cloudflare, a standalone cross-origin Worker can host the same handler; add CORS limited to the site's origin.

---

## 1. Submission Architecture Patterns

| Pattern | Hosting / Infrastructure | When to Use | Key Benefits |
| :--- | :--- | :--- | :--- |
| **Pattern 1: Host-native endpoint + email provider** | Workers entrypoint; Pages Functions for existing Pages deployments; equivalent host-native endpoints elsewhere | Production client websites, marketing sites, lead-generation forms. | Zero SSR overhead (Astro remains 100% static), avoids a separate hosted form service; provider usage charges may apply, full control over email formatting and reply-to routing, server-side Turnstile verification. |
| **Pattern 2: Hosted Endpoint (Formspree / Web3Forms / Basin)** | Any static host (GitHub Pages, S3, Netlify) | Rapid prototypes, simple personal landing pages, or when no transactional email account exists. | Pure HTML `<form action="https://...">`, zero backend code or API keys required on the host. |
| **Pattern 3: Webhook / Automation Forwarder** | Host-native endpoint or an explicitly approved browser-safe destination | Sites where leads must route directly to a CRM (HubSpot, ActiveCampaign) or automation tool (n8n, Make, Zapier). | Direct ingestion into sales workflows without intermediate email processing. |

---

## 2. Submission Destination Decision Gate

When a form appears and its handling requirements are unresolved, ask the user to choose the destination and required providers. Preserve host/provider choices already authorised; do not ask again merely because another form appears. Reusing content or assets does not authorise adopting its hosting or email infrastructure.

> *"I detected a [Contact Form] in the design. How would you like submissions handled?*
> 1. *(Recommended)* **Serverless Function on the site's host + transactional email**: a Worker handler (Cloudflare Workers), `functions/api/contact.ts` (existing Cloudflare Pages) or the host's own function convention, with required Turnstile verification, optional supplementary heuristics, and your email provider's API (which provider do you use: Mailgun, Postmark, Resend, Amazon SES or another?).
> 2. **Hosted Static Endpoint**: Formspree / Web3Forms / Basin (zero backend code, pure static HTML).
> 3. **Webhook to CRM / Automation**: Forward payload to a Make/Zapier/n8n/HubSpot webhook URL.
> 4. **UI-Only / Mock**: Accessible frontend form with simulated submission states for design verification."*

Where relevant, also confirm the data destination, retention, consent, expected response and operational ownership. Whichever option is chosen, keep abuse protection proportionate and avoid inaccessible challenges, and document the configuration, failure behaviour and owner in `docs/project.md`.

---

## 3. Keep Astro Static; Handle Submissions in the Host Runtime

Keep `output: 'static'` for sites whose pages do not require server rendering. A contact endpoint alone does not require an Astro SSR adapter. On Workers Static Assets, add a Worker entrypoint and route `/api/contact` to the handler; a `functions/` directory is not automatically routed. On existing Pages deployments, use the Pages Functions wrapper. Preserve an existing server-rendered architecture when it is required by other features.

---

## 4. Turnstile Verification and Supplementary Heuristics

Turnstile is the authoritative bot-verification gate for this recipe. Timestamp and honeypot checks are supplementary heuristics; they must not silently discard legitimate submissions through client-side interception or ordinary autofill fields. Do not make blanket legal claims about CAPTCHA providers.

### Layer 1: The Hidden Honeypot (`_hp`)
A fake text input hidden visually and from assistive screen readers. Automated bots fill every input field they find.
- **Rule**: A honeypot is optional. Use an obscure name such as `_hp`, never a real company/address/phone field. Check it only on the server and return a recoverable error if filled; never claim an email was accepted when it was discarded. `autocomplete="off"` does not guarantee autofill avoidance.

### Layer 2: The Timestamp Heuristic (`_timestamp`)
Initialise the hidden Unix timestamp when the form becomes usable in the browser,
or when its modal opens; a build-time timestamp measures deployment age, not form
completion time. Treat it as a heuristic, not authoritative bot verification: client
values can be forged and autofill can be fast. Reject missing, non-finite or future
values with a recoverable error; if using a minimum completion time, allow a retry
instead of falsely claiming a legitimate message was sent.

`form.reset()` restores defaults **after** dispatching its `reset` event. Update the
live timestamp in a microtask, otherwise the browser overwrites the new value:

```javascript
const refreshTimestamp = () => {
  form.elements.namedItem('_timestamp').value = String(Math.floor(Date.now() / 1000));
};
refreshTimestamp(); // or on modal:open
form.addEventListener('reset', () => queueMicrotask(refreshTimestamp));
```

### Layer 3: Cloudflare Turnstile (`cf-turnstile-response`)
A privacy-first, non-intrusive CAPTCHA alternative. It requires no interactive puzzles for normal users and loads without tracking cookies.
- **Rule**: The edge function posts `secret` and `response` to `https://challenges.cloudflare.com/turnstile/v0/siteverify`. If verification fails, reject with `400` or redirect to `/contact/error`.
- **Protocol & Lifecycle**: Follow Cloudflare's current [Turnstile documentation](https://developers.cloudflare.com/turnstile/) for the widget lifecycle and Siteverify contract (check `success`, the expected `action` and the site's `hostname`), explicit rendering for dynamic forms, container dimension guards (`min-block-size: 65px`), action matching (`data-action="contact"`), and Wrangler secret binding (`TURNSTILE_SECRET_KEY`).

---

## 5. Dual Response (Progressive Enhancement)

The handler supports native HTML submission and enhanced fetch submission. Turnstile and browser-initialised timing still require JavaScript; a 303 response is not proof of JavaScript-free submission. Include a `<noscript>` alternative with the project's approved contact address or telephone number.

The edge function inspects the `Accept` header:
```typescript
const wantsJson = request.headers.get('Accept')?.includes('application/json');
```
1. **Native HTML submission without the fetch enhancement**:
   - `<form method="POST" action="/api/contact">` submits normally.
   - The edge function responds with a `303 See Other` redirect to `/contact/success` or `/contact/error`.
2. **Progressive Enhancement (Client-Side JS)**:
   - JavaScript intercepts `submit`, adds `headers: { 'Accept': 'application/json' }`, and sends via `fetch()`.
   - The edge function returns JSON: `{ success: true }` or `{ success: false, error: "..." }`.
   - The UI updates in place with accessible announcements (`role="status" aria-live="polite"`).

---

## 6. Complete Implementation

The complete, tested implementation — shared validation (`src/lib/contact-validation.ts`), the
result and form components, native outcome pages, the shared `src/contact.ts` handler with the
`src/worker.ts` router or the `functions/api/contact.ts` wrapper for existing Pages deployments,
the optional sitemap filter, and `test:forms` (`<project>/scripts/test-contact-form.mjs`) — is in
[`recipe-contact-form.md`](recipe-contact-form.md). Use it for new forms; it supersedes the
condensed blueprints this section used to carry.

For a site hosted on **Workers Static Assets**, `functions/api/contact.ts` is not a routable Pages
Function. Keep Astro `output: 'static'`, handle submissions in a Worker entrypoint, and reuse an
existing authorised Worker (for example a CMS OAuth handler) rather than replacing its routes.
Static asset `_headers` rules do not configure responses generated by the handler: set API
response headers in code, including `Cache-Control: no-store`, and verify both asset and API
responses.

When moving a site from Pages to Workers Static Assets, delete the Pages-only files: `functions/`
and `public/_routes.json`. Workers ignores both, and `_routes.json` is published as a public file.
`_headers` and `_redirects` still apply to static assets, so keep them.

**Forms inside a modal** (see §10): set the timestamp when the modal opens, not at page load, and
keep initialisation idempotent across Astro view transitions:

```ts
function initContactTiming() {
  document.querySelectorAll<HTMLFormElement>('.c-form').forEach((form) => {
    if (form.dataset.timingInitialized) return;
    form.dataset.timingInitialized = 'true';
    const timestamp = form.elements.namedItem('_timestamp') as HTMLInputElement;
    const refresh = () => { timestamp.value = String(Math.floor(Date.now() / 1000)); };
    if (!form.closest('dialog')) refresh();
    form.closest('dialog')?.addEventListener('modal:open', refresh);
    form.addEventListener('reset', () => queueMicrotask(refresh));
  });
}
initContactTiming();
document.addEventListener('astro:after-swap', initContactTiming);
```

## 7. Runtime Configuration

Set the following variables in the **Cloudflare Dashboard** under:
`Workers & Pages` $\rightarrow$ `[Your Site]` $\rightarrow$ `Settings` $\rightarrow$ `Environment Variables`:

| Variable | Description | Example |
| :--- | :--- | :--- |
| Provider API key | The email provider's sending credential (Secret), e.g. `MAILGUN_API_KEY` | `key-xxxxxxxxxxxx` |
| Provider sending settings | Verified sending domain and, where the provider has one, region, e.g. `MAILGUN_DOMAIN`, `MAILGUN_REGION` | `mg.yourdomain.com`, `eu` |
| `CONTACT_TO_EMAIL` | Destination mailbox for submissions | `hello@yourdomain.com` |
| `TURNSTILE_SECRET_KEY` | Required Cloudflare Turnstile Secret Key for this recipe | `0x4AAAAAA...` |


### Runtime bindings versus build variables

Email and Turnstile server verification need runtime configuration. Build-environment variables alone do not provide the function/Worker's email-provider key or `env.TURNSTILE_SECRET_KEY` bindings. For Cloudflare Workers, configure those as runtime **Secrets** on the Worker (for example with `wrangler secret put`); put non-sensitive domain/region/destination settings in its runtime variables. For Pages Functions, use that project's runtime bindings and the intended production/preview environment. Never commit secret values into Wrangler configuration or browser code. Verify the selected host's runtime bindings rather than assuming its build settings supply them.

---

## 8. Demo / Staging Form Disclaimer (`role="note"`)

When deploying a live demo, showcase, or staging site with a working form, place an accessible callout banner as the **first child inside `<form>`** (above the input fields) so visitors know not to enter real personal data:

```html
<p class="c-form__notice" role="note">
  <strong>Demo form — for testing purposes only.</strong> Please do not submit real personal or sensitive information.
</p>
```



## 9. Operational Checks

Use runtime Secrets for the email provider's API key and `TURNSTILE_SECRET_KEY`; public
`TURNSTILE_SITE_KEY`, the provider's verified sending domain and region, and recipient
`CONTACT_TO_EMAIL` can be runtime variables. The optional public config endpoint
allows a modal to load its site key without rebuilding HTML. Load/render its explicit
widget when opened, retaining its ID and resetting on retry.

Use the narrowest sending credential the provider offers (with Mailgun, a **Domain Sending
Key** restricted to the chosen domain). Confirm the verified sending domain and any region
independently of the recipient's address; never infer either from that address. Keep sender and recipient server-controlled,
set the validated visitor address as `Reply-To`, and disable tracking unless requested.
Check these against the provider's current documentation; for the Mailgun example, see
[Mailgun sending keys](https://documentation.mailgun.com/docs/mailgun/user-manual/api-key-mgmt/rbac-mgmt)
and [HTTP sending/region](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-http).

For related selections (location/treatment, product/variant), validate IDs and valid
pairs against the canonical data **on the server** as well as filtering browser
options. Bound request bytes while streaming, before parsing; `Content-Length` alone
is insufficient. Keep fields on failure, focus the first invalid field and announce
errors; clear fields only after provider acceptance. Avoid logging bodies, secrets or
provider responses that may contain personal data. Explicitly output `type="submit"`
when selecting a component's button by that attribute—HTML's default submit behaviour
does not create a matching DOM attribute.

**Reaching the success state without sending.** A local preview often has the real provider key,
so a test send emails a real inbox. To exercise the browser's success path (form hidden, thanks
shown, focus moved), let the page load normally, then replace `window.fetch` in the page for the
form endpoint only, returning the handler's success JSON (for example
`{ success: true, name: "Sam", shift: null }`), fill the fields and call `form.requestSubmit()`.
With Turnstile's always-pass test site key (`1x00000000000000000000AA`) the widget still issues a
real token, so client validation runs unchanged. Check the computed `display` of the form and
the thanks panel, not just their `hidden` attributes.

Verification should cover mocked provider success/failure, missing configuration,
malformed/oversized input, origin checks, forged relations, failed/expired Turnstile,
and UI value retention/reset. Inspect the opened modal on desktop and the framework's
minimum viewport, including child bounds and keyboard dismissal/focus restoration.
After authorised deployment through the project's **one** deploy path, verify routes,
assets, headers, 404s and an authorised real submission. Record separately:

1. Browser success and email-provider acceptance.
2. Provider delivery event, if available.
3. Recipient confirmation of inbox delivery.

A successful email-provider API response establishes acceptance, not inbox delivery. Do not
invent delivery confirmation or trigger repeated test emails when a result is uncertain.


## 10. Contextual enquiry actions from cards and filtered lists

For an enquiry about a specific treatment/product, carry canonical IDs in a real
fallback link, for example `/enquiry/?service=signature-facial&location=city-centre`. Read the
same URL parameters when opening the modal and when initialising the full-page form;
avoid a second, divergent source of prefill state. Query initialisation still needs
JavaScript on a static form; keep the no-script security/contact alternative honest.
Do not put visitor contact details or message text in URLs.

Use the card's entity ID and the context actually established by the page: a fixed
location on a location page, or the current location filter in its own list. Without
location context, leave that selection empty. Update action URLs when filters change
**and when reset clears them**; do not accidentally read a select in the enquiry
modal or another list on the page. Keep initialisation idempotent.

On opening, validate the requested IDs against the available options and check their
relationship against canonical availability data. Apply compatible selections; clear
an incompatible location instead of leaving an invalid pair or silently choosing
another location. Opening a different card must replace its contextual fields while
preserving visitor-entered contact details and message. A generic enquiry trigger
without entity context may retain the existing draft. Browser prefilling does not
replace server-side ID/pair validation before dispatch.

Regression checks should cover fixed page context, current filter context, filter
reset, treatment-only context, a different card opened after a previous selection,
invalid IDs/pairs and the full-page query path. Verify the selected control values in
the browser, not just the link URL. If the card has an existing detail link, also
verify that the new action has not stretched over it. Inspect the project's own card
implementation against the `ClickableParent` contract in the `astro-ui-patterns` skill
([spec](../../astro-ui-patterns/components/clickable-parent.md), if installed).
