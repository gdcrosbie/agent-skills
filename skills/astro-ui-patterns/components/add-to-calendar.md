## 14. AddToCalendar

A "save the date" link that downloads an iCalendar (`.ics`) file generated at build time.
It is a **link, not a button**: the file is a static asset, so it works without JavaScript,
can be opened in a new tab or copied, and needs no client runtime. It replaces the common
prototype pattern of building a `Blob` in a click handler and simulating a download.

### Contract

- **Static file, same origin.** Serve the `.ics` from the site itself. `download` is ignored
  for cross-origin URLs, and a same-origin static file keeps working with scripts disabled.
- **One source of truth.** Generate the file at build time from the same data the page shows
  (date, time, place), rather than hand-maintaining a second copy in `public/`.
- **Valid iCalendar (RFC 5545):** CRLF line endings; lines folded at 75 octets; TEXT values
  escaped (`\\`, `\;`, `\,`, `\n`); `VERSION`, `PRODID`, a stable `UID` and `DTSTAMP` present;
  times in UTC (`YYYYMMDDTHHMMSSZ`) unless you also ship a `VTIMEZONE`.
- **Accessible name says what and which event:** "Add Riverside Spring Fair to your
  calendar", or a visible short label plus that wording in the accessible name. The icon is
  `aria-hidden`.
- **No overclaiming:** the page can't observe whether a download succeeded. Any confirmation
  message is optional progressive enhancement and should not say "downloaded".
- **Third-party calendar links** (Google Calendar, Outlook on the web) are owner decisions.
  They are plain links that make no request until clicked, but they send event details to
  that provider when used.

### Generator (`src/lib/ics.ts`)

```ts
export interface CalendarEvent {
  uid: string;          // stable, e.g. "riverside-spring-fair-2026@example.com"
  title: string;
  start: Date;          // build from an offset-bearing ISO string: new Date("2026-10-17T10:00:00+01:00")
  end: Date;
  location?: string;
  description?: string;
  url?: string;
  stamp: Date;          // when the event data last changed; keeps builds deterministic
}

const encoder = new TextEncoder();

const utc = (d: Date) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const text = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/* Fold to 75 octets; continuation lines start with a space, which counts. */
function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(e: CalendarEvent, prodId = "-//Site//Events//EN"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${utc(e.stamp)}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${text(e.title)}`,
    ...(e.location ? [`LOCATION:${text(e.location)}`] : []),
    ...(e.description ? [`DESCRIPTION:${text(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
```

### Endpoint (`src/pages/<event-slug>.ics.ts`)

```ts
import type { APIRoute } from "astro";
import { buildIcs } from "../lib/ics";
import event from "../data/event.json";

export const prerender = true; // static file even when the site has a server adapter

export const GET: APIRoute = () =>
  new Response(
    buildIcs({
      uid: event.uid,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      location: event.location,
      description: event.summary,
      stamp: new Date(event.updated),
    }),
    { headers: { "Content-Type": "text/calendar; charset=utf-8" } },
  );
```

In static output the response headers are not kept: the build writes `dist/<event-slug>.ics`
and the host chooses the content type from the extension. A builder-managed project that can't own a `src/pages` endpoint can ship a hand-owned file in `public/`
instead; record that it duplicates the page's date and place.

### Component (`src/components/ui/AddToCalendar.astro`)

```astro
---
interface Props {
  href: string;        // "/riverside-spring-fair.ics"
  label?: string;      // visible text
  eventName: string;   // used in the accessible name
  class?: string;
}

const { href, label = "Save the date", eventName, class: className = "" } = Astro.props;
const filename = href.split("/").pop();
---

<a
  class:list={["c-add-to-calendar", className]}
  href={href}
  download={filename}
  aria-label={`${label}: add ${eventName} to your calendar`}
>
  <span class="c-add-to-calendar__label">{label}</span>
  <svg class="c-add-to-calendar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
      fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</a>

<style>
  .c-add-to-calendar {
    display: inline-flex;
    align-items: center;
    gap: var(--add-to-calendar-gap, 0.625em);
    min-block-size: var(--add-to-calendar-min-size, 2.75rem);
    padding-block: var(--add-to-calendar-padding-block, 0.65em);
    padding-inline: var(--add-to-calendar-padding-inline, 1.1em);
    color: var(--add-to-calendar-color, currentColor);
    font-weight: var(--add-to-calendar-weight, 700);
    text-decoration: none;
    border: var(--add-to-calendar-border, 2px solid currentColor);
    border-radius: var(--add-to-calendar-radius, 0.25rem);
  }

  .c-add-to-calendar:focus-visible {
    outline: var(--add-to-calendar-focus-ring, 3px solid currentColor);
    outline-offset: var(--add-to-calendar-focus-offset, 3px);
  }

  .c-add-to-calendar__icon {
    inline-size: 1.125em;
    block-size: 1.125em;
    flex: none;
  }
</style>
```

The visible label is part of the accessible name (label-in-name), so voice-control users can
say the words they see. In a framework project, render the same link with the project's
button classes instead of these styles.

### Verification

- `curl -sI https://<site>/<event-slug>.ics` returns `200` and `content-type: text/calendar`
  (Workers Static Assets: `text/calendar`, verified 2026-10-16; `wrangler dev` adds
  `; charset=utf-8`).
- The file has CRLF line endings, no line over 75 octets and escaped commas. Count bytes, not
  characters: `LC_ALL=C awk 'length($0) > 76 { print NR }' <file>` (76 allows for the `\r`).
  The generator above was run against a long multi-byte description on 2026-10-16 and produced
  a 75-octet maximum.
- Import it into at least one desktop and one web calendar, with the device set to a
  different time zone from the event, and check the local start and end times.
- With JavaScript disabled, the link still downloads the file.
