# NMA Ogun public website — Phase 6

The production website is deployed at https://nmaogun.com.ng. Its independent repository is https://github.com/oladele-2/nma-ogun-website, checked out locally at `C:/wamp64/www/nma-ogun-website`. Continue production maintenance there. See the [Phase 6 launch record](../../docs/website-implementation/PHASE-6.md) for deployment/GitHub evidence and the pending Facebook-debugger login and operational handover actions. The historical Phase 4/5 `.standalone` artifact in this directory is a preview, not the current production release.

The default Cloudflare deployment is a standalone Worker and static assets, with no portal, database, bucket or secret dependency at runtime. Existing portal publishing work is retained as an optional authoring/export source. See the [Phase 4 handoff](../../docs/website-implementation/PHASE-4.md) for editorial access, export/import, withdrawal and recovery.

```powershell
pnpm --dir apps/website test:release
pnpm --dir apps/website test:standalone
pnpm --dir apps/website package:standalone
pnpm --dir apps/website dev:standalone
```

The portable `.standalone/` directory includes the bundled Worker, static assets and deployment config. Build tools and workspace imports are resolved before deployment. Publication changes require importing an approved release and rebuilding/deploying. The checked-in approved snapshot is empty; no pending content approvals were changed. `wrangler.launch.jsonc` prepares exact apex/www custom domains for Phase 6; it has not been deployed and does not resolve the pending release decisions.

The following describes the retained Phase 3 static pages and local design review.

Static Astro implementation of the reviewed Phase 2 design. Requirements: Node.js 22.12+ and pnpm 9. The member portal remains a separate application.

## Local preview

From the repository root, run:

```powershell
pnpm --filter @association/website dev
```

Open http://localhost:4322/ or http://localhost:4322/review for the page directory. The dev script selects review mode and binds to loopback. Stop with Ctrl+C. The original design remains under design/; preview:design serves that historical reference.

## Builds and checks

```powershell
pnpm --filter @association/website typecheck
pnpm --filter @association/website test
pnpm --filter @association/website build
pnpm --filter @association/website build:review
pnpm --filter @association/website verify
pnpm --filter @association/website preview
```

The normal build writes dist/. The review build writes dist-review/. The preview command serves the built review site on loopback at port 4322. verify requires both builds and checks local links, anchors, metadata, review exclusions and asset boundaries. Both outputs retain noindex/nofollow, robots exclusions and static-host header rules. They are previews, not approved releases. Do not upload dist-review/ to public hosting: noindex is not access control.

## Implemented pages

The normal build includes Home, About, Membership, Programmes, Gallery, two album pages, Privacy, Accessibility and a custom 404. Shared components provide responsive navigation, footer, photographs, metadata, canonical URLs, social previews and a core sitemap. Gallery links work without JavaScript; JavaScript adds the dialog viewer. Mobile navigation remains visible without JavaScript.

Review mode additionally generates /review, /leadership, /leadership/past, /committees, /affiliates, /resources, /contact, /news, /news/article-layout and /events/programme-layout. These pages contain clearly labelled review material, searchable directories and article/event specimens. The disputed officer, filename-only assistant appointments, unresolved historical rows, source event dates, private contacts and unapproved documents are omitted. Specimens have no invented dates or attribution.

## Source guide

- src/data/site.ts: fixed NMA Ogun brand, portal links and navigation.
- src/data/media.ts: selected photographs, captions and albums.
- src/data/publications.json: local publication snapshot; empty until articles/events are approved.
- src/data/publication.mjs: allowlisted selection of approved, explicitly public NMA Ogun records. Tests cover tenant scope, editorial holds, invalid dates, private-field exclusion and duplicate routes.
- src/data/editorial.ts: snapshot selection plus review-only specimens.
- src/data/review.ts: build-only selection of safe review fields from the source pack. The full content JSON is never a public asset.
- astro.review.config.mjs: review configuration; only this configuration imports candidate portraits. The normal configuration resolves an empty portrait map, preventing raw portrait assets from leaking into the normal build.
- src/pages/news/[slug].astro and src/pages/events/[slug].astro: working static detail templates.
- src/scripts/site.ts: menu, photo dialog and directory filtering.

Publication records require tenant=nmaogun, publish=true, status=approved, visibility=public, approvedBy, reviewedAt (YYYY-MM-DD), a safe unique slug, title, summary and nonempty paragraphs. Articles also require author and publishedAt; events require startDate and venue. Private metadata and arbitrary registration links are not exported. Approval fields must reflect a real editorial decision. Empty normal news archives are not generated or linked. Review mode is a build-time choice, never a URL query flag.

## Media provenance

Four photographs and the logo in src/assets/ are copies of the Phase 2 selections. Their mappings remain in docs/website-design/README.md and docs/website-content/asset-selection.md. Eight non-conflicted portraits were copied from apps/webapp/public/images/excos/ into src/assets/portraits/ for review only. Originals remain untouched. Astro/Sharp produces responsive WebP derivatives. Noto Sans WOFF2 subsets derive from the Phase 2 TTFs; the original OFL license remains in public/fonts/OFL.txt.

## Remaining delivery

The website has no database connection, authentication, analytics or enquiry submission. Phase 4 supplies the optional portal editor/export workflow and standalone snapshot delivery described above. Contact submission awaits verified contacts, delivery, spam handling and privacy decisions. Phase 5 technical checks are recorded; association sign-off and DNS conflict inspection remain open. Phase 6 covers production launch and handover.
