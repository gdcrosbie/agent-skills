# CMS Choices for Astro and the Sveltia Recipe

Surface **no CMS, Sveltia and EmDash** at the start of an Astro build, before content and hosting configuration. Preserve an explicit existing choice. No CMS is the baseline when editing is unnecessary; do not silently add a CMS, service or paid plan. CMS selection does not select the visual design or component framework.

---

## 1. CMS Decision Matrix

Use these options to settle editing, publishing and runtime requirements:

| Option | Best For | Architecture & Trade-offs |
| :--- | :--- | :--- |
| **1. No CMS (Default)** | Developer- or agent-maintained sites, static demos, or teams comfortable editing JSON/YAML/Markdown in Git | Zero extra routes, zero OAuth configuration. Keep content separate from presentation; moving to EmDash later requires a schema/data migration and live query adapter, while approved components can be retained. |
| **2. Sveltia CMS (Recommended Git CMS)** | Client-editable marketing sites, landing pages, blogs, and documentation hosted on Cloudflare Workers/Pages, Vercel, or Netlify | Self-hosted single-page app at `/admin/` (standalone shell + `public/admin/config.yml`; see §2.1). Zero external SaaS uptime dependency; works locally in `astro dev` via the browser **File System Access API**; commits via GitHub's GraphQL API (signing commits and batching multi-file/asset changes into a single commit). |
| **3. EmDash** | Database-backed content, relational editing and an integrated CMS admin | Live content and database schema; server-rendered Astro with an adapter and media storage. Admin at `/_emdash/admin`. A combined frontend/CMS Astro app is suitable when it serves one site; a separate frontend is a project decision, not a requirement. Publishing changes the live data rather than committing content files. Read [emdash.md](emdash.md) for the implementation branch. |
| **Other: Pages CMS (`.pages.yml`)** | Projects specifically requesting Pages CMS (ideally against a self-hosted Pages CMS deployment) | Configured via a single `.pages.yml` at the repo root. **Caveat:** the free hosted `app.pagescms.org` service can be flaky / fail to connect; prefer Sveltia CMS unless Pages CMS is explicitly requested. |
| **Other: Headless API CMS (Sanity, Payload, etc.)** | Multi-user real-time collaboration, editorial workflows decoupled from Git commits, or large relational datasets | Uses API loaders/webhooks rather than Git commits. When Sanity is chosen, read [Sanity integration](sanity-integration.md) and use its optional upstream skills. |
| **Other: Keystatic** | An embedded Astro integration with bespoke React fields | Adds an Astro integration and React to the project; consider it only when those custom fields are required. |

---

## 2. Sveltia CMS Recipe for Astro

### 2.1 Admin shell, local routing and self-hosted assets

Prefer a standalone `public/admin/index.html` when local CMS saves must preserve editor state. An Astro page also emits the correct production route, but its development HMR can reload the CMS after a content save. On one build (2026-10-03, Astro 7.3.3, Sveltia 0.227.3), a static shell avoided that reload; `/admin/` still needed explicit development routing to the public HTML file.

Add this Vite plugin to the existing `astro.config.mjs` configuration, preserving other plugins:

```js
{
  name: 'local-cms-directory-index',
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      if (request.url === '/admin' || request.url === '/admin/') {
        request.url = '/admin/index.html';
      }
      next();
    });
  },
}
```

Verify `/admin/` in development, particularly with a root catch-all Astro route, and verify `dist/admin/index.html` on the selected static host. Do not keep an Astro admin page and a public admin HTML file that both emit the same production path. An Astro route remains an alternative when HMR behaviour is acceptable or separately controlled.

Pin the chosen Sveltia npm version and self-host its application assets. Copy the package's complete `dist/` tree and licence into an ignored `public/admin/vendor/` directory during **both** predev and prebuild; retaining chunks matters for lazy-loaded editor features. Exclude generated `public/admin/vendor/` files from TypeScript checking in `tsconfig.json`, alongside existing exclusions. Scanning the bundle caused an out-of-memory failure in the tested project; check the project after adding the exclusion.

The static shell needs a viewport, language, title, `noindex` metadata, an absolute CMS config link and a fallback main landmark/heading for static accessibility checks. Use a classic script, not `type="module"`; Sveltia includes its styles. Remove the fallback once the CMS script loads successfully via an external `/admin/cms-init.js` file rather than an inline `<script>` (an inline `<script>` in `dist/admin/index.html` fails `npm run test:csp` and is blocked when the site serves `Content-Security-Policy: script-src 'self'`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Content Manager</title>
    <link href="/admin/config.yml" type="application/yaml" rel="cms-config-url" />
  </head>
  <body>
    <main id="cms-fallback"><h1>Loading Content Manager…</h1></main>
    <script src="/admin/cms-init.js"></script>
    <script src="/admin/vendor/sveltia-cms.js"></script>
  </body>
</html>
```

And in `public/admin/cms-init.js`:

```js
window.addEventListener('load', () => {
  if (window.CMS) {
    document.getElementById('cms-fallback')?.remove();
  }
});
```

**Keep `/admin` out of discovery.** If `@astrojs/sitemap` is enabled in `astro.config.mjs`, exclude `/admin` from the generated sitemap:

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});
```

Add an explicit `X-Robots-Tag` header for `/admin/*` in `public/_headers` (or the equivalent host configuration in [`hosting-and-indexing.md`](hosting-and-indexing.md)):

```text
/admin/*
  X-Robots-Tag: noindex, nofollow
```

---

### 2.2 Configuration (`public/admin/config.yml`)

1. **Always include the YAML schema header** on line 1 for IDE validation:
   ```yaml
   # yaml-language-server: $schema=https://unpkg.com/@sveltia/cms/schema/sveltia-cms.json
   ```
2. **Configure clean JSON/YAML output (`output:`):**
   Set `omit_empty_optional_fields: true` so unfilled optional fields (`required: false`) are omitted rather than written as `""` or `null`, ensuring Astro's Zod `.optional()` schemas pass without errors:
   ```yaml
   output:
     omit_empty_optional_fields: true
     json:
       indent_style: space
       indent_size: 2
   ```
3. **Mapping the 4-Tier Content Layer:**
   - **Pattern A (`src/content/posts/*.md`) & Pattern B (`src/content/services/*.yaml`):** Use standard folder **Entry Collections** (`folder: src/content/posts`, `extension: md` or `yaml`).
   - **Pattern C (`src/content/<name>.json` via `file()`) & Pattern D (`src/data/*.json`):** Group related files into **File Collections** (`files:`) with `editor: { preview: false }`. For top-level JSON arrays (`src/content/faq.json`, `src/data/placeholder-pages.json`), use a single `widget: list` field with **`root: true`** and **`collapsed: auto`**:
     ```yaml
     collections:
       - name: social_proof
         label: Voices & FAQ
         icon: forum
         editor:
           preview: false
         files:
           - name: faq
             label: Frequently Asked Questions
             icon: help
             file: src/content/faq.json
             fields:
               - name: items
                 label: FAQ Items
                 label_singular: Question
                 widget: list
                 root: true
                 collapsed: auto
                 summary: '{{q}}'
                 fields:
                   - { name: id, label: ID, widget: string }
                   - { name: q, label: Question, widget: string }
                   - { name: a, label: Answer, widget: text }
                   - { name: order, label: Display Order, widget: number, value_type: int, min: 1 }
     ```
   - **Why `files:` + `root: true` list is preferred over a Single-File Entry Collection for Pattern C:** Sveltia's Single-File Entry Collection (`file:` directly on an entry collection) does not currently support drag-and-drop reordering in the UI, whereas a File Collection with `widget: list` + `root: true` provides drag-and-drop handles, collapsible `summary:` headers, `thumbnail:` previews, and item count locks.
4. **Locking Fixed-Count or 3D/Layout-Bound Repeaters:**
   When a repeater is bound to fixed 3D scene anchors or fixed bento grid slots, lock the list count and technical keys so editors can safely edit copy without breaking the runtime:
   ```yaml
   widget: list
   root: true
   collapsed: auto
   allow_add: false
   allow_remove: false
   allow_duplicate: false
   min: 3
   max: 3
   ```
   And set `readonly: true` on `id`, `anchor`, or `scene` subfields.

### Editorial terminology without a data migration

When a request changes how collections appear to editors, use Sveltia's `label` and
`label_singular` rather than renaming internal collections. For example, keep
`name: services` and its existing file path while displaying `label: Treatments`
and `label_singular: Treatment`. Update related field labels too (for example,
“Service types” → “Treatment types” and “Service” → “Treatment” in price records).
Preserve collection/field `name` values, file paths, relation `collection` targets
and stored IDs unless a structural migration is explicitly requested. Verify that
only the intended display labels changed, and check the CMS listing/editor wording.

Website labels are separate: CMS configuration does not automatically change public
filters, navigation, headings or table captions. Inspect those independently and
update them only within the requested scope.

---

### 2.3 Bridging `astro:assets` (`<Image />`) with CMS Image Pickers

When a Pattern C/B collection renders optimised images through Astro's `<Image />` component (`src/assets/images/*`), bridge the path between the CMS and `import.meta.glob`:

1. **In `public/admin/config.yml`** (on the file, collection, or image field):
   ```yaml
   media_folder: /src/assets/images
   public_folder: /assets/images
   ```
   (And set `thumbnail: photo` on the parent `widget: list` so the CMS displays the portrait next to each collapsed item.)
2. **In the JSON/YAML data file (`src/content/voices.json`):**
   Store the `public_folder` path (`"/assets/images/portrait-1.webp"`).
3. **In the `.astro` component:**
   Match by filename (`photo.split('/').pop()`) against `import.meta.glob` so both bare filenames and `/assets/images/...` paths resolve through Sharp at build time:
   ```astro
   ---
   import { Image } from 'astro:assets';
   import type { ImageMetadata } from 'astro';

   const images = import.meta.glob<{ default: ImageMetadata }>(
     '../assets/images/*.{webp,jpg,jpeg,png}',
     { eager: true },
   );
   const filename = photo.split('/').pop() ?? photo;
   const imageModule = images[`../assets/images/${filename}`];
   if (!imageModule) {
     throw new Error(`Missing image in src/assets/images/: ${filename} (from "${photo}")`);
   }
   ---
   <Image src={imageModule.default} alt={alt} width={88} height={88} />
   ```

### Sveltia observations

Observed on 2026-10-17 with Sveltia 0.227.3 in local repository mode.

- Sveltia keeps keys it is not configured for, moved to the end of the entry, so configured
  fields can stay limited to what editors change.
- It reformats what it saves: unquoted YAML, its own key order, and a `files:` JSON file
  re-serialised whole, including entries nobody edited. Expect formatting-only diffs.
- Use `select` with the type's options and `number` with `value_type: int` to keep invalid
  values out of fields that the site's schema constrains.
- Media: with `media_folder: public/media/<dir>` and `public_folder: /media/<dir>`,
  uploads kept their original filenames (spaces and capitals) and the entry stored the
  public path. Model alt text as a separate `<key>_alt` string field. Decide a filename
  convention for editors; spaced names built, but as URL-encoded paths.
- **Close stale tabs.** In local repository mode, a tab left open while files
  changed on disk showed a deleted entry and an old config. Saving recreated the
  deleted file and wrote old field values back over the rewritten one. A new tab
  picked up the new config, but cached values for unconfigured keys persisted.
  Reload Sveltia after builder edits or pulls, and don't keep it open across
  them. The GitHub backend was not tested for the same behaviour.
- Production (GitHub backend, §3.3 Worker): one save made one commit holding the
  entry and its upload, authored by the signed-in user. The default commit
  message repeats the collection label, so `label_singular: Update` gave
  "Update Update …". Choose labels with that in mind or set `backend.commit_messages`.

---

## 3. Authentication Workflows (Local & Production)

### 3.1 Local Development (Zero Auth Setup)
In Chromium-based browsers (Chrome, Brave, Edge, Arc), open `http://localhost:4321/admin/` while `npm run dev` is running and click **"Work with Local Repository"**. Sveltia CMS uses the browser's native **File System Access API** to read and write `src/content/*` and `src/data/*` directly on disk — no OAuth app or local proxy server needed.

### 3.2 Production Option A: Personal Access Token ("Sign In with Token")
If only the developer or a technical editor uses `/admin/` on the live site, no OAuth server is needed. Click **"Sign In with GitHub Using Token"** on `/admin/` and supply a Fine-Grained PAT scoped to the repository with **`Contents: Read and write`** (plus `Pull requests: Read and write` if Editorial Workflow is enabled).

### 3.3 Production Option B: One-Click GitHub OAuth via Cloudflare Workers
By default, clicking the primary **"Sign In with GitHub"** button hits `https://api.netlify.com/auth` (inherited from Netlify/Decap CMS). To authenticate via your own Cloudflare Worker without Netlify:

1. **Set `backend.base_url` in `public/admin/config.yml`:**
   ```yaml
   backend:
     name: github
     repo: <owner>/<repo>
     branch: main
     base_url: https://<your-worker-or-custom-domain>
   ```
2. **Route `/auth` and `/callback` to a Worker handler (`src/worker.js`):**
   On a Cloudflare Worker with Static Assets, keep all static page requests at the edge and invoke the Worker **only** for the OAuth endpoints using `assets.run_worker_first` in `wrangler.jsonc`:
   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "<project-name>",
     "compatibility_date": "2026-09-30",
     "main": "./src/worker.js",
     "workers_dev": true,
     "assets": {
       "directory": "./dist",
       "binding": "ASSETS",
       "not_found_handling": "404-page",
       "html_handling": "auto-trailing-slash",
       "run_worker_first": ["/auth", "/callback", "/oauth/*"]
     }
   }
   ```
   *(Alternatively, deploy [`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) once as a standalone shared Worker on your Cloudflare account and point `base_url` across multiple sites to that single Worker URL.)*

   A self-contained reference handler for `src/worker.js` (state cookie, token exchange, popup
   `postMessage` handshake, everything else delegated to `env.ASSETS`):

   ```javascript
   const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
   const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

   function randomHex(bytes = 16) {
     const array = new Uint8Array(bytes);
     crypto.getRandomValues(array);
     return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
   }

   function parseCookies(header) {
     const out = {};
     if (!header) return out;
     for (const part of header.split(';')) {
       const idx = part.indexOf('=');
       if (idx === -1) continue;
       out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
     }
     return out;
   }

   function renderPopupPage(provider, status, content) {
     const message = `authorization:${provider}:${status}:${JSON.stringify(content)}`;
     const safeMessageLiteral = JSON.stringify(message);
     const safeProviderLiteral = JSON.stringify(provider);

     const html = `<!doctype html>
   <html lang="en">
     <head>
       <meta charset="utf-8" />
       <meta name="robots" content="noindex, nofollow" />
       <title>Authorizing…</title>
     </head>
     <body>
       <p>Completing sign-in…</p>
       <script>
         (function () {
           const message = ${safeMessageLiteral};
           const provider = ${safeProviderLiteral};
           function sendMessage(e) {
             window.opener.postMessage(message, e.origin);
             window.removeEventListener('message', sendMessage, false);
           }
           window.addEventListener('message', sendMessage, false);
           window.opener.postMessage('authorizing:' + provider, '*');
         })();
       </script>
     </body>
   </html>`;

     return new Response(html, {
       status: status === 'success' ? 200 : 400,
       headers: {
         'Content-Type': 'text/html; charset=utf-8',
         'Cache-Control': 'no-store',
         'Set-Cookie': 'cms_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
       },
     });
   }

   async function handleAuth(request, env) {
     const url = new URL(request.url);
     const provider = url.searchParams.get('provider') || 'github';
     if (provider !== 'github') {
       return new Response('Unsupported OAuth provider.', { status: 400 });
     }
     if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
       return new Response(
         'OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Cloudflare Worker secrets.',
         { status: 500 },
       );
     }

     const state = randomHex(16);
     const scope = url.searchParams.get('scope') || 'repo,user';
     const redirectUri = `${url.origin}/callback`;

     const authUrl = new URL(GITHUB_AUTHORIZE_URL);
     authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
     authUrl.searchParams.set('redirect_uri', redirectUri);
     authUrl.searchParams.set('scope', scope);
     authUrl.searchParams.set('state', state);

     return new Response(null, {
       status: 302,
       headers: {
         Location: authUrl.toString(),
         'Cache-Control': 'no-store',
         'Set-Cookie': `cms_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
       },
     });
   }

   async function handleCallback(request, env) {
     const url = new URL(request.url);
     const code = url.searchParams.get('code');
     const state = url.searchParams.get('state');
     const error = url.searchParams.get('error');

     if (error) {
       return renderPopupPage('github', 'error', {
         error,
         error_description: url.searchParams.get('error_description') || 'OAuth authorization failed.',
       });
     }

     const cookies = parseCookies(request.headers.get('Cookie') || '');
     if (!code || !state || !cookies.cms_oauth_state || cookies.cms_oauth_state !== state) {
       return renderPopupPage('github', 'error', {
         error: 'invalid_state',
         error_description: 'Missing or invalid OAuth state cookie. Please try signing in again.',
       });
     }

     const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
       method: 'POST',
       headers: {
         Accept: 'application/json',
         'Content-Type': 'application/json',
         'User-Agent': 'sveltia-cms-oauth-worker',
       },
       body: JSON.stringify({
         client_id: env.GITHUB_CLIENT_ID,
         client_secret: env.GITHUB_CLIENT_SECRET,
         code,
         redirect_uri: `${url.origin}/callback`,
         state,
       }),
     });

     const data = await tokenResponse.json();
     if (!tokenResponse.ok || data.error || !data.access_token) {
       return renderPopupPage('github', 'error', {
         error: data.error || 'token_exchange_failed',
         error_description: data.error_description || 'Failed to exchange authorization code.',
       });
     }

     return renderPopupPage('github', 'success', {
       token: data.access_token,
       provider: 'github',
     });
   }

   export default {
     async fetch(request, env) {
       const url = new URL(request.url);
       if (url.pathname === '/auth' || url.pathname === '/oauth/authorize') {
         return handleAuth(request, env);
       }
       if (url.pathname === '/callback' || url.pathname === '/oauth/redirect') {
         return handleCallback(request, env);
       }
       return env.ASSETS.fetch(request);
     },
   };
   ```
3. **Register a GitHub OAuth App (Not a GitHub App):**
   - Go to **GitHub Settings → Developer settings → OAuth Apps → New OAuth App** for this authenticator recipe. Use an exact callback and leave wildcard matching disabled unless explicitly required. Do not assume OAuth Apps have non-expiring tokens; see below.
   - **Homepage URL:** `https://<your-worker-or-custom-domain>`
   - **Authorization callback URL (Redirect URI):** `https://<your-worker-or-custom-domain>/callback`
4. **Add Worker Secrets:**
   Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (and optionally `ALLOWED_DOMAINS`) in Cloudflare Workers (**Settings → Variables and Secrets** or via `npx wrangler secret put GITHUB_CLIENT_ID` / `npx wrangler secret put GITHUB_CLIENT_SECRET`).
   - Note when verifying `/auth` with `curl`: use a `GET` request (`curl -sD - -o /dev/null "https://<domain>/auth?provider=github&site_id=<domain>"`), not `curl -I` (`HEAD`), because the OAuth handler only matches `method === 'GET'` and delegates `HEAD` to `env.ASSETS` (`404`).

### 3.4 GitHub OAuth scope and token lifetime

For a private GitHub repository, OAuth `repo` scope covers the editor's accessible private repositories, even though the CMS configuration targets one repository. Explain that scope when choosing OAuth; a fine-grained repository-scoped PAT remains an alternative. `ALLOWED_DOMAINS` restricts which site receives the token, not the GitHub repositories that token can access.

GitHub added expiring OAuth App tokens on [2026-08-14](https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps/); new apps default to eight-hour access tokens plus a refresh token. Review the deployed authenticator's actual refresh support before promising persistent sign-in. The official Sveltia authenticator at commit `95733a9811c7601c117a64c44395109bd1291a73`, tested with Sveltia 0.227.3 on 2026-10-03, forwards the access token but not refresh-token/expiry data and has no refresh endpoint. With expiry enabled, editors must sign in again after expiration. Keep expiry enabled unless the user explicitly chooses otherwise; do not silently disable it to hide missing refresh support. Recheck newer releases rather than generalising this limitation to all Sveltia versions.
