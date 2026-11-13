# Sanity integration

Read this only when Sanity has been explicitly selected. The standard CMS choices and
existing project decisions remain in [git-cms.md](git-cms.md).

## Optional upstream skills

Use the separately installed `sanity-best-practices` skill for implementation, and
`sanity-migration` when importing content. They come from
[Sanity's agent toolkit](https://github.com/sanity-io/agent-toolkit); they are optional
external dependencies, not files bundled with this playbook. If unavailable, report the
missing guidance and use the current official Sanity documentation rather than assuming
an installed path.

## Resolve document identity before import

The upstream guides currently disagree: best practices calls for generated IDs, while
migration defaults to IDs derived from source identities. Preserve the destination's
existing contract. Include the identity strategy, rerun/upsert behaviour and relationship
mapping in the migration plan, and settle any unresolved choice before bulk writes.
Do not silently make either vendor rule an exception to the other. Store legacy IDs in
explicit metadata where required; a source-to-created-ID map can preserve relationships
when the chosen contract uses generated IDs.

## Canonical origin for sitemaps and links

Take the canonical
origin from the destination project's configured public site URL, independently of host.
Do not use `VERCEL_URL` as the only source or silently emit localhost URLs in production
on Cloudflare, Netlify or self-hosted deployments. For Next.js integrations, configure `NEXT_PUBLIC_SITE_URL` per deployment and fail clearly when production
configuration is missing; Astro integrations use their configured `site` origin.
