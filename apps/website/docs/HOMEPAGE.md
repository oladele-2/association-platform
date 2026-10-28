# Homepage, October 2026

The homepage uses the same approved `content/release/snapshot.json` that the automatic publication workflow packages. News cards, the current chairman and the next published event are selected from that release at build time. After publishing or withdrawing portal content, manually run the website deployment workflow to start the export/build/deployment process; no separate homepage edit is required for those sections.

The first three articles are sorted by publication date, display order and approval timestamp. The programme feature shows the earliest published event dated today or later in Africa/Lagos, or the proposed October 2026–September 2027 programme when none is available. The full proposal lives at `/programmes/year-ahead`. Topic articles are linked only while included in the approved release.

## Resource-backed additions

- Physicians’ Week uses the supplied `resources/physicianwee.jpeg` poster and its seven-day agenda, 18–24 October 2026. The scientific conference/OGM follows the poster's **22 October** date, rather than conflicting older seed data. No time, venue, fee, accreditation or registration link is invented. The prominent homepage feature ends after 24 October; `/physicians-week-2026` then becomes a programme archive.
- Affiliate cards reuse the existing supplied BUTH ARD, ARD FMC Abeokuta and NDA Ogun logos and profile routes. Committee spotlights use the existing public committee list, with anchors for Training & CME, Health Policy & Doctors Welfare, and Research and Publications.
- `/history` is a public HTML selection of twenty complete recorded terms from the existing `docs/website-content/leadership.md` transcription in the platform repository. Only names and terms are copied. The incomplete 1985 and ambiguous 2008–2010 rows remain excluded; the uncertain 2006–2008 secretary is not asserted. All phone columns, private workbooks and the original source PDF remain outside the website assets. Abbreviated names remain as recorded; no founding date or continuous sequence is inferred.
- `/newsletter` shows approved public PDF resources whose titles contain “Newsletter” or “Bulletin”. Publish such an edition through the portal's public content workflow to populate the page and homepage automatically. The Third Edition, 2026 now has a complete 52-page biannual PDF, an issue hub and credited web adaptations. The September 4–30 call is transcribed as a **closed historical call**, not an invitation currently accepting submissions. Enquiries use the owner-confirmed Secretariat address, not a newly adopted personal/editorial contact from the screenshot.
- The member-benefits guide links to existing profile, dues/payment-evidence, CME and ID-card routes. Capabilities were checked against the portal source; automatic credits, awards, handbooks and guaranteed certificates are not promised from aspirational screenshots.
- September 2027 is a **proposed hybrid workshop**, as specified in the supplied CME planning DOCX.

Publication checks and daily rebuilds are not scheduled. Run the deployment workflow manually to refresh approved content and date-dependent homepage selections, including next events and expired programme features.

Only the supplied public Secretariat email is published: nmaogunstate@gmail.com. A street address, telephone number, office hours, unverified impact figures and a personal statement attributed to the chairman have not been invented. The welcome uses association editorial text alongside the officer’s published profile.

## Slideshow and church-service photography

The homepage has seven slides: the original three supplied association photographs and four real photographs from resources/church-service, identified by the owner as the Physicians’ Week opening church service on 18 October 2026. The previous AI hall illustration has been removed from the site and assets. People and scenes in the new photographs are unchanged; Astro produces responsive WebP versions.

Source filenames, in slide order:
- WhatsApp Image 2026-10-18 at 3.3.jpeg
- WhatsApp Image 2026-10-18 at 3.32.56.jpeg
- WhatsApp Image 2026-10-18 at 3.32.59 PMjjj.jpeg
- WhatsApp Image 2026.jpeg

The same event has a four-photo gallery album, three-photo section on the Physicians’ Week page, two photographs in the homepage gallery and an About panorama with a dated caption. Inner page headers alternate four decorative photo backgrounds by page family, including Worker-rendered news, officers and affiliate pages. Photographs occupy their own banner below the title and description, keeping long titles readable without placing text over faces. Banners crop responsively; the album provides full images and the service context. No church photograph is presented as an affiliate activity, clinical setting or outreach achievement.

The WhatsApp draft and three original photographs are in docs/communications/website-launch. The draft is for the General Secretary to review and send; it is not sent automatically or inserted as a portal publication.

## Verification

`pnpm test` exercises carousel navigation, wrapping, pause behaviour, reduced motion and search query handling. `pnpm test:standalone` verifies the actual Worker bundle, new public routes, twelve proposed programme months, the seven-slide structure, contact links, publication withdrawals and navigation without duplicated news links. Public-page and social checks include Contact and the year-ahead programme. Browser visual checking requires a connected browser; no browser was available during initial implementation.
