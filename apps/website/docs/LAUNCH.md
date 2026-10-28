# Launch record — 16 October 2026

Production website: https://nmaogun.com.ng. Repository: https://github.com/oladele-2/nma-ogun-website.

The user instructed Phase 6 launch and repository publication on 16 October 2026, supplied the new GitHub destination, confirmed the official hostname and identified the existing NMA Ogun portal logo as approved. The core-only release preserves all earlier holds on disputed leadership, event dates, documents and contacts. No new editorial record or media-rights certification is invented by this technical release record.

## Deployment

- Worker: `nma-ogun-website`.
- Version: `5e91d029-5bca-414f-888e-87ad73e5aba3`.
- Hosts: exact `nmaogun.com.ng` and `www.nmaogun.com.ng` custom domains; www redirects to apex.
- Runtime resources: own ASSETS binding and nonsecret PUBLIC_RELEASE flag only. No database, portal service binding, bucket or application credential.
- Worker request logging, workers.dev and public preview URLs disabled.
- Website HTML uses no-store and no-transform. The latter prevents Cloudflare's automatic Web Analytics beacon from being injected, as verified on the live response. This leaves the portal's own settings unchanged.
- Indexing enabled for approved public pages; private/missing/review routes remain unavailable and nonindexable. Public robots allow crawling and point to the sitemap.

An initial asset-transfer connection failure was resolved by retrying with IPv4-preferred DNS. Cloudflare successfully provisioned the domains without a manual DNS-record deletion. Public DNS from 1.1.1.1 and 8.8.8.8 returned Cloudflare addresses and the expected authoritative nameservers. This workstation/browser initially retained negative DNS responses; production checks used public DNS with normal TLS certificate validation. No hosts-file edit, TLS bypass or operating-system DNS change was used.

## Validation

- Separate clean repository install with committed frozen pnpm lockfile passed; no monorepo source is required.
- Astro/TypeScript: 40 files, zero errors/warnings/hints.
- Five publication-selector tests and two authenticated export/import/recovery tests passed.
- Actual compiled standalone Worker and publication fixtures passed: scope, private paths, media, withdrawal, errors, metadata, sitemap, HEAD, canonical redirects and public robots/indexing.
- Local real Worker/ASSETS: all core routes and redirects passed; compressed HTML/font/JavaScript budgets passed. The local dev host is explicitly localhost to avoid production-host HTTPS redirects in an HTTP preview.
- Desktop visual review confirmed approved logo, core layout and photographs after removing the preview banner. Earlier Phase 5 automated accessibility scores were 100 on nine core mobile pages; those prior scores are not represented as a new production field measurement.
- Live smoke tests passed for nine pages, referenced logo assets, headers/cache policy, HTTP→HTTPS, www→apex, `/home`, trailing slashes, custom 404, held/private routes, sitemap, HEAD and rejected POST.
- Existing portal login, registration and recovery pages still returned 200. No authenticated account actions, registrations, passwords or member records were submitted.
- Live technical social check passed using Facebook's crawler user agent: page metadata/canonical URLs/indexing and public 1200×630 PNG, 471,352 bytes. Actual branded social card also inspected visually.

Machine-readable results: [public smoke](evidence/public-check.json), [social metadata](evidence/social-check.json), [local budgets](evidence/http-budget-check.json). These are deployment-time checks, not continuous monitoring or field-user measurements.

## Facebook Sharing Debugger — pending login

The actual [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/?q=https%3A%2F%2Fnmaogun.com.ng%2F) was opened before and after launch. It displays **“Log into Facebook to use this tool.”** The available browser has no authenticated Facebook session. No debugger result, screenshot approval or successful Meta scrape is claimed.

The association account holder must sign in, run Debug/Scrape Again and verify final response, title, description and branded image. Record the result here afterward. The separate crawler/metadata check has passed but does not replace Meta's debugger. No fabricated Facebook app ID was added to silence optional warnings.

## Handover items

- Provide the official privacy/accessibility feedback contact. Until then, no unverified email/phone or enquiry form is published; the pages direct existing members to their established secretariat channel.
- Appoint named editorial/publishing and operational owners, agree review frequency and urgent withdrawal response, and set an external uptime monitor. GitHub contains source checks and a manually triggered public smoke workflow; it has no automatic deployment credentials.
- Use an authorised member test account to verify authenticated portal journeys; the public website did not change portal authentication.
- Old-domain redirects require separate control of `nmaogun.org.ng`; the old host was not modified. Only the new apex/www canonicalisation is deployed.
- Preserve withdrawal decisions independently of code rollback. Re-import an approved complete snapshot, build and deploy to update public content. The current publication generation 0 contains no managed entries.
- First production version was `e5eea0ef-2913-4c3b-92c1-3d3a721dd8f9`; it predates the no-transform fix. Prefer rebuilding the known safe current source rather than restoring that earlier analytics-injected response. Never roll back the existing member portal to recover this website.

Cloudflare reference for preventing injected analytics: [Web Analytics setup, no-transform behaviour](https://developers.cloudflare.com/web-analytics/get-started/).
