## 15. SelfHostedMap

Interactive map of a list's places, drawn with MapLibre GL from a self-hosted Protomaps
PMTiles extract: no tile CDN, no fonts or sprites from a third party, no API key. The list
beside it stays the accessible version; the map is a visual enhancement that loads only when
it's shown. Proven on a reference build (Astro 7 on Cloudflare Workers, 2026-10-31).

### Dependencies (owner approval first)

This is the one catalogued pattern that needs npm packages: a vector map can't reasonably be
hand-written. Present them and their sizes to the owner before installing, per the
catalogue's stop-and-ask rule. Versions verified on the reference build:

| Package | Version | Role |
|---|---|---|
| `maplibre-gl` | 6.16.0 | Renderer (WebGL). Loaded lazily; about 1 MB of JS in its own chunks, plus its worker. |
| `pmtiles` | 4.5.0 | `pmtiles://` protocol: reads tiles from one archive with HTTP Range requests. |
| `@protomaps/basemaps` | 5.7.2 | Style layers and the `light`/`dark` flavours for the Protomaps schema. |

The tile extract is a file download (the Protomaps daily build, cut to a bounding box with
the `pmtiles` CLI), so it also needs sign-off. Record its build date, bbox, zoom range and
size in the project record.

### State and host contract

- **The list is the accessible version.** The canvas is `aria-hidden="true"`; the canvas,
  zoom buttons and pins are taken out of the tab order (`tabIndex = -1`), because focus inside
  `aria-hidden` content is an axe failure. Pins are links (so a pointer user can click
  through) but not keyboard stops.
- **Numbered pins match the list.** Pin `n` is row `n` of the rendered list, in the same
  order. If the map also shows places the list leaves out (for example, places that match the
  other filters but aren't open in the chosen time window), draw them as small unnumbered pins
  under the numbered ones, and name them in text beside the list ("Not open today, grey on the
  map: …"): the map adds information, so it needs a text equivalent.
- **Lazy and conditional.** Without JavaScript the panel stays `hidden`. On wide screens it
  shows beside the list; on narrow screens a `Show map` / `Hide map` button with
  `aria-expanded` and `aria-controls` reveals it. MapLibre is imported only on the first show,
  so no tile or library request happens on pages where nobody opens the map.
- **Follows the theme toggle.** The map watches the root `data-theme` attribute (set by
  [ThemeToggle](theme-toggle.md)) and calls `map.setStyle()`; DOM markers survive a restyle.
  A map that reads the theme only at load keeps the old basemap after a toggle.
- **No labels by default.** Protomaps' label layers need glyph and sprite files; without
  self-hosting those, drop every `symbol` layer. If street names are required, ask before
  adding self-hosted glyphs and sprites (more files to serve and licence).
- **Attribution:** "© OpenStreetMap contributors" stays visible on the map (ODbL).
- **Repeated initialisation** is safe: `data-mounted` guards the map, `data-ready` the toggle,
  and the observer tears the map down when the panel leaves the document.

### Tile hosting

PMTiles needs **206 Partial Content** responses. Check the host before choosing it:

```bash
curl -s -o /dev/null -D - -r 0-1023 https://example.com/tiles/area.pmtiles | grep -iE '^HTTP|content-range'
```

Expect `206` and `Content-Range: bytes 0-1023/<size>`. A `200` with the whole file means the
host ignores Range, and the map will fail or download everything. On Cloudflare Workers,
Range support for static assets isn't documented, so the reference build serves the archive from R2
through a route (below). Any static host with Range support can serve the file directly.

Cut the extract (zoom 15 covers street level for a town; the reference build's town was 5.6 MB):

```bash
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles data/tiles/area.pmtiles \
  --bbox=<minLng>,<minLat>,<maxLng>,<maxLat> --maxzoom=15
```

Keep `data/tiles/` out of Git and upload the file to the bucket as part of the deploy
procedure.

#### R2 route with Range support (`src/pages/tiles/[file].ts`, Cloudflare)

```ts
/** Serves allow-listed PMTiles archives from R2 (binding MEDIA, key tiles/<file>) with
 *  HTTP Range support: PMTiles reads byte ranges, so partial requests must answer 206. */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const ALLOWED = new Set(["area.pmtiles"]);

type R2Range = { offset: number; length?: number } | { suffix: number };

function parseRange(header: string | null, size?: number): R2Range | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const [, start, end] = match;
  if (start === "" && end !== "") return { suffix: Number(end) };
  const offset = Number(start);
  if (end === "") return { offset };
  const last = size !== undefined ? Math.min(Number(end), size - 1) : Number(end);
  return { offset, length: last - offset + 1 };
}

export const GET: APIRoute = async ({ params, request }) => {
  const file = params.file ?? "";
  if (!ALLOWED.has(file)) return new Response("Not found", { status: 404 });
  const bucket = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!bucket) return new Response("Tile storage unavailable", { status: 503 });

  const key = `tiles/${file}`;
  const rangeHeader = request.headers.get("Range");
  const head = rangeHeader ? await bucket.head(key) : null;
  if (rangeHeader && !head) return new Response("Not found", { status: 404 });
  const range = rangeHeader ? parseRange(rangeHeader, head!.size) : null;
  if (rangeHeader && !range) return new Response("Bad range", { status: 416 });

  const object = await bucket.get(key, range ? { range } : undefined);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    ETag: object.httpEtag,
  });
  if (range && "range" in object && object.range) {
    const r = object.range as { offset?: number; length?: number; suffix?: number };
    const size = object.size;
    const offset = r.suffix !== undefined ? size - r.suffix : (r.offset ?? 0);
    const length = r.suffix !== undefined ? r.suffix : (r.length ?? size - offset);
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${size}`);
    headers.set("Content-Length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
};
```

### Component Code (`src/components/SelfHostedMap.astro`)

```astro
---
// Map of the listed places. An enhancement: the list carries everything, so without JS the
// panel stays hidden. MapLibre loads on first show. Tiles come from a self-hosted PMTiles
// archive; no symbol layers, so no fonts or sprites load from a third party.
export interface MapPoint {
  /** List number; null draws a small unnumbered pin for a place the list leaves out. */
  n: number | null;
  name: string;
  lat: number;
  lng: number;
  /** Pin variant, e.g. "open", "closed"; "off" for unlisted places. */
  tone: string;
  href: string;
}
interface Props {
  id: string;
  points: MapPoint[];
  /** Same-origin path to the archive, e.g. "/tiles/area.pmtiles". */
  tiles: string;
  /** [lng, lat] used before the pins are fitted. */
  center: [number, number];
  /** [[minLng, minLat], [maxLng, maxLat]]: keep panning inside the extract. */
  bounds: [[number, number], [number, number]];
  origin?: { lat: number; lng: number; label: string } | null;
}
const { id, points, tiles, center, bounds, origin = null } = Astro.props;
---

<div
  class="c-map"
  id={id}
  data-map
  data-points={JSON.stringify(points)}
  data-origin={origin ? JSON.stringify(origin) : ""}
  data-tiles={tiles}
  data-center={JSON.stringify(center)}
  data-bounds={JSON.stringify(bounds)}
  hidden
>
  <div class="c-map__canvas" data-map-canvas aria-hidden="true"></div>
  <p class="c-map__credit">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors</p>
</div>

<style>
  .c-map {
    position: relative;
    block-size: var(--c-map-block-size, clamp(22rem, 60vh, 36rem));
    border: var(--c-map-border, 4px solid currentColor);
    background: var(--c-map-placeholder, #f2f2f2);
  }
  .c-map[hidden] {
    display: none;
  }
  .c-map__canvas {
    position: absolute;
    inset: 0;
  }
  .c-map__credit {
    position: absolute;
    inset-inline-end: 0;
    inset-block-end: 0;
    padding: 0.15rem 0.4rem;
    background: var(--c-map-credit-bg, #fff);
    color: var(--c-map-credit-color, #5a5a5a);
    font-size: 0.8125rem;
  }
  .c-map__credit a {
    color: inherit;
  }
  .c-map :global(.c-map-pin) {
    display: grid;
    place-items: center;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    border: 3px solid var(--c-map-pin-border, #111);
    border-radius: 50%;
    background: var(--c-map-pin-bg, #fff);
    color: var(--c-map-pin-color, #111);
    font: 700 1rem/1 var(--c-map-pin-font, inherit);
    text-decoration: none;
  }
  .c-map :global(.c-map-pin--open) {
    background: var(--c-map-pin-open-bg, #ffd400);
  }
  /* Unlisted places: small, unnumbered, dashed. Measure the ring against BOTH basemaps; a
     disabled grey that passes on paper can fail on the map ground (2.1:1 on the reference build). */
  .c-map :global(.c-map-pin--off) {
    inline-size: 1.25rem;
    block-size: 1.25rem;
    border: 3px dashed var(--c-map-pin-off-ring, #5a5a5a);
    background: var(--c-map-pin-off-bg, #f2f2f2);
  }
  .c-map :global(.c-map-you) {
    inline-size: 1.125rem;
    block-size: 1.125rem;
    border: 4px solid var(--c-map-you-ring, #fff);
    border-radius: 50%;
    background: var(--c-map-you-fill, #111);
    box-shadow: 0 0 0 2px var(--c-map-you-fill, #111);
  }
</style>

<script>
  type Point = { n: number | null; name: string; lat: number; lng: number; tone: string; href: string };

  // Dark basemap overrides, read from custom properties on the panel so the design's colours
  // stay in tokens. MapLibre needs hex or rgb() here, not oklch().
  function darkOverrides(panel: HTMLElement) {
    const css = getComputedStyle(panel);
    const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const ground = get("--c-map-dark-ground", "#1e1e1e");
    const road = get("--c-map-dark-road", "#3a3a3a");
    const water = get("--c-map-dark-water", "#2c4656");
    const roads = ["other", "minor_service", "minor_a", "minor_b", "link", "major", "highway",
      "bridges_other", "bridges_minor", "bridges_link", "bridges_major", "bridges_highway"];
    return { background: ground, earth: ground, water, ...Object.fromEntries(roads.map((k) => [k, road])) };
  }

  async function mount(panel: HTMLElement) {
    if (panel.dataset.mounted) return;
    panel.dataset.mounted = "true";
    const [maplibregl, { default: workerUrl }, { Protocol }, { layers, namedFlavor }] = await Promise.all([
      import("maplibre-gl"),
      // MapLibre 6 ships its worker separately; bundlers move it, so point at it explicitly.
      import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
      import("pmtiles"),
      import("@protomaps/basemaps"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ]);
    maplibregl.setWorkerUrl(workerUrl);
    maplibregl.addProtocol("pmtiles", new Protocol().tile);

    const darkFlavor = { ...namedFlavor("dark"), ...darkOverrides(panel) };
    const isDark = () => document.documentElement.dataset.theme === "dark";
    const styleFor = (dark: boolean) => ({
      version: 8 as const,
      sources: {
        protomaps: { type: "vector" as const, url: `pmtiles://${location.origin}${panel.dataset.tiles}`, attribution: "" },
      },
      // No symbol layers: labels and icons would need glyphs and sprites from elsewhere.
      layers: layers("protomaps", dark ? darkFlavor : namedFlavor("light"), { lang: "en" }).filter((l) => l.type !== "symbol"),
    });
    let dark = isDark();

    const points: Point[] = JSON.parse(panel.dataset.points || "[]");
    const origin = panel.dataset.origin ? JSON.parse(panel.dataset.origin) : null;
    const map = new maplibregl.Map({
      container: panel.querySelector<HTMLElement>("[data-map-canvas]")!,
      style: styleFor(dark),
      center: JSON.parse(panel.dataset.center!),
      zoom: 13,
      minZoom: 11,
      maxZoom: 16,
      maxBounds: JSON.parse(panel.dataset.bounds!),
      attributionControl: false,
      keyboard: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    map.on("error", (e) => console.error("[map]", e.error?.message ?? e));
    // aria-hidden map: nothing inside it may take focus.
    map.getCanvas().tabIndex = -1;
    for (const button of panel.querySelectorAll<HTMLButtonElement>(".maplibregl-ctrl button")) button.tabIndex = -1;

    const fit = new maplibregl.LngLatBounds();
    // Unlisted ("off") pins first, so numbered pins are added later and sit on top.
    for (const p of [...points.filter((q) => q.n === null), ...points.filter((q) => q.n !== null)]) {
      const el = document.createElement("a");
      el.href = p.href;
      el.className = `c-map-pin c-map-pin--${p.tone}`;
      el.textContent = p.n === null ? "" : String(p.n);
      el.title = p.name;
      el.tabIndex = -1;
      new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      fit.extend([p.lng, p.lat]);
    }
    if (origin) {
      const you = document.createElement("div");
      you.className = "c-map-you";
      you.title = origin.label;
      new maplibregl.Marker({ element: you }).setLngLat([origin.lng, origin.lat]).addTo(map);
      fit.extend([origin.lng, origin.lat]);
    }
    if (!fit.isEmpty()) map.fitBounds(fit, { padding: 48, maxZoom: 15, duration: 0 });

    // Follow the theme toggle; tear down when the panel leaves the document.
    const themeWatch = new MutationObserver(() => {
      if (!panel.isConnected) {
        themeWatch.disconnect();
        map.remove();
        return;
      }
      if (isDark() === dark) return;
      dark = isDark();
      map.setStyle(styleFor(dark));
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function initMaps() {
    for (const panel of document.querySelectorAll<HTMLElement>("[data-map]")) {
      const toggle = document.querySelector<HTMLButtonElement>(`[data-map-toggle="${panel.id}"]`);
      const wide = matchMedia("(width >= 64rem)");
      const sync = () => {
        const show = wide.matches || toggle?.getAttribute("aria-expanded") === "true";
        panel.hidden = !show;
        if (show) void mount(panel);
      };
      if (toggle && !toggle.dataset.ready) {
        toggle.dataset.ready = "true";
        toggle.hidden = false;
        toggle.addEventListener("click", () => {
          const open = toggle.getAttribute("aria-expanded") !== "true";
          toggle.setAttribute("aria-expanded", String(open));
          toggle.querySelector("[data-map-toggle-label]")!.textContent = open ? "Hide map" : "Show map";
          sync();
        });
      }
      wide.addEventListener("change", sync);
      sync();
    }
  }
  initMaps();
  document.addEventListener("astro:after-swap", initMaps);
</script>
```

The narrow-screen toggle lives beside the list, outside the component, so the page decides
where it sits:

```html
<button class="c-button" type="button" aria-expanded="false" aria-controls="find-map"
  data-map-toggle="find-map" hidden>
  <span data-map-toggle-label>Show map</span>
</button>
```

Its pressed state needs `[hidden] { display: none }` to win over the button's own `display`
(the baseline reset has a global guard).

### Host Site Contract

1. **Token mapping.** Map the `--c-map-*` properties to the site's semantic tokens on a
   wrapper or in `tokens.css`, per theme. Pin colours can use any CSS colour; the
   `--c-map-dark-*` basemap overrides must be hex or `rgb()` values, because MapLibre parses
   them. Take them from the design's dark map if it has one.
2. **Pin data.** Build `points` from the same array that renders the list, so numbering can't
   drift. For unlisted pins, put the reason in `name` (it becomes the tooltip) and list the
   same places in text beside the list.
3. **Page layout.** The component is sized by `--c-map-block-size`; on a wide layout give it
   a fixed height beside the list (reference build: 560px, sticky). Hide the toggle at the width
   where the map always shows.

### Verification

- `curl -r 0-1023` on the deployed tile URL returns `206` with `Content-Range`.
- The network panel shows no third-party requests when the map opens, and none at all on
  narrow screens until **Show map** is pressed.
- Pin count = list rows (+ unlisted pins); numbers match row order across filter states.
- Switch theme after the map renders, both directions, at desktop and phone widths: the
  basemap restyles and every pin remains.
- Pin and marker contrast measured against the map ground in each basemap (light earth
  `#e2dfda` in Protomaps' light flavour; the dark ground you set).
- axe: no focusable element inside the `aria-hidden` canvas; the toggle has `aria-expanded`
  and `aria-controls`; attribution visible.
- Check the **built preview**, not only `astro dev`: on the reference build the dev server once left
  the basemap blank (Vite's HMR client injected into MapLibre's worker) while pins still
  rendered. The production build was unaffected.
