import type { PublicEntry, PublicationSnapshot } from './index';
import {
  affiliateSeeds,
  affiliateCategories,
  doctorDisplayName,
  type AffiliateSeed,
} from './affiliates.ts';
export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
export function renderEntry(
  entry: PublicEntry,
  snapshot: PublicationSnapshot,
  mediaUrl = (id: string) => `/media/${id}`,
) {
  if (entry.kind === 'affiliate')
    return (
      renderAffiliatePage(`/affiliates/${entry.content.slug}`, {
        ...snapshot,
        entries: [entry, ...snapshot.entries.filter((item) => item.id !== entry.id)],
      })?.html ?? ''
    );
  const c = entry.content,
    esc = escapeHtml;
  const images = c.mediaIds
    .map((id) => snapshot.media.find((media) => media.id === id))
    .filter((media) => !!media && media.mime.startsWith('image/'));
  const imageHtml = images
    .map(
      (media) =>
        `<figure><a href="${esc(mediaUrl(media!.id))}" data-photo="${esc(mediaUrl(media!.id))}" data-caption="${esc(media!.alt)}"><img src="${esc(mediaUrl(media!.id))}" alt="${esc(media!.alt)}" loading="lazy"></a><figcaption>${esc(media!.alt)}</figcaption></figure>`,
    )
    .join('');
  const date = c.date
    ? `<time datetime="${esc(c.date)}">${esc(new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(c.date + 'T12:00:00Z')))}</time>`
    : '';
  const detail =
    entry.kind === 'officer'
      ? `<p class="eyebrow">${esc(c.office)}${c.term ? ' · ' + esc(c.term) : ''}</p>`
      : `<div class="story-meta">${date}${c.author ? `<span>${esc(c.author)}</span>` : ''}${c.venue ? `<span>${esc(c.venue)}</span>` : ''}</div>`;
  const resource =
    entry.kind === 'resource'
      ? snapshot.media.find((media) => media.id === c.mediaIds[0])
      : undefined;
  const download = resource
    ? `<a class="button" href="${esc(mediaUrl(resource.id))}">Download PDF · ${Math.ceil(resource.bytes / 1024)} KiB</a>`
    : '';
  return `${detail}${imageHtml}<div class="prose">${c.paragraphs.map((p) => `<p>${/^https:\/\/[^\s<>"\x27]+$/.test(p) ? `<a href="${esc(p)}" rel="noopener noreferrer">Read the source report ↗</a>` : esc(p)}</p>`).join('')}${download}</div>`;
}
export function entryPath(entry: PublicEntry) {
  return entry.kind === 'affiliate'
    ? `/affiliates/${entry.content.slug}`
    : entry.kind === 'article'
      ? `/news/${entry.content.slug}`
      : entry.kind === 'event'
        ? `/events/${entry.content.slug}`
        : entry.kind === 'gallery'
          ? `/gallery/${entry.content.slug}`
          : entry.kind === 'officer'
            ? `/executives#${entry.content.slug}`
            : `/resources#${entry.content.slug}`;
}
export function renderPublicationPage(
  path: string,
  snapshot: PublicationSnapshot,
): { title: string; description: string; html: string } | null {
  const esc = escapeHtml;
  if (path === '/executives') return renderExecutivePage(snapshot);
  if (path === '/affiliates' || path.startsWith('/affiliates/'))
    return renderAffiliatePage(path, snapshot);
  const hero = (title: string, summary: string, body: string) =>
    `<section class="page-hero container"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">${esc(title)}</span></nav><div class="page-hero-grid"><div><p class="eyebrow">NMA Ogun</p><h1>${esc(title)}</h1></div><p>${esc(summary)}</p></div></section>${body}`;
  const detail = snapshot.entries.find(
    (entry) => ['article', 'event', 'gallery'].includes(entry.kind) && entryPath(entry) === path,
  );
  if (detail) {
    const c = detail.content;
    const parent =
      detail.kind === 'article' ? '/news' : detail.kind === 'event' ? '/programmes' : '/gallery';
    const html = hero(
      c.title,
      c.summary,
      `<article class="container page-section published-detail">${renderEntry(detail, snapshot)}<a class="text-link section-link" href="${parent}">Back to ${detail.kind === 'article' ? 'news' : detail.kind === 'event' ? 'programmes' : 'gallery'} ↗</a></article>`,
    );
    return { title: c.title, description: c.summary, html };
  }
  const listing =
    path === '/news'
      ? {
          kind: 'article',
          title: 'News & media',
          summary: 'Official updates, statements and stories from NMA Ogun.',
        }
      : path === '/programmes'
        ? {
            kind: 'event',
            title: 'Programmes & events',
            summary: 'Professional learning, meetings and association activities.',
          }
        : path === '/gallery'
          ? {
              kind: 'gallery',
              title: 'Our community, in pictures.',
              summary: 'Photographs selected and approved by NMA Ogun.',
            }
          : path === '/leadership'
            ? {
                kind: 'officer',
                title: 'Leadership in service of the profession.',
                summary: 'Meet the officers supporting the work of NMA Ogun.',
              }
            : path === '/resources'
              ? {
                  kind: 'resource',
                  title: 'Publications & resources',
                  summary: 'Documents approved for public access.',
                }
              : null;
  if (!listing) return null;
  const entries = snapshot.entries.filter((entry) => entry.kind === listing.kind);
  if (listing.kind === 'article')
    entries.sort((a, b) => a.content.sortOrder - b.content.sortOrder);
  if (!entries.length) return null;
  const search = listing.kind === 'article'
    ? `<form class="article-search" data-directory-search="article-results" data-result-label="article" role="search" aria-label="Search articles"><label for="article-search">Search articles</label><div class="article-search-controls"><input id="article-search" type="search" placeholder="Search by title, topic or author" aria-controls="article-results" aria-describedby="article-search-help"><button type="button" data-clear-search>Clear</button></div><p id="article-search-help">Search published titles, introductions, authors and article text.</p><p data-result-count role="status" aria-live="polite">${entries.length} ${entries.length === 1 ? 'article' : 'articles'}</p><noscript><p>Use your browser’s Find feature to search titles and introductions below.</p></noscript></form>`
    : '';
  const groups = listing.kind === 'officer' ? ['current', 'past'] : ['all'];
  const body = groups
    .map((group) => {
      const selected =
        group === 'all' ? entries : entries.filter((entry) => entry.content.group === group);
      if (!selected.length) return '';
      return `${group === 'past' ? '<h2>Past leadership</h2>' : ''}<div class="${listing.kind === 'officer' ? 'published-officers' : 'published-list'}"${listing.kind === 'article' ? ' id="article-results"' : ''}>${selected
        .map((entry) => {
          const c = entry.content;
          if (['officer', 'resource'].includes(entry.kind))
            return `<article class="published-profile" id="${esc(c.slug)}"><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p>${renderEntry(entry, snapshot)}</article>`;
          const cover = snapshot.media.find((media) => media.id === c.mediaIds[0]);
          const searchText = listing.kind === 'article'
            ? ` data-search-text="${esc([c.title, c.summary, c.author, ...c.paragraphs].join(' '))}"`
            : '';
          return `<article class="published-card"${searchText}><a href="${esc(entryPath(entry))}">${cover?.mime.startsWith('image/') ? `<img src="/media/${esc(cover.id)}" alt="${esc(cover.alt)}" loading="lazy">` : ''}<h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p><span class="text-link">Read more <span aria-hidden="true">↗</span></span></a></article>`;
        })
        .join('')}</div>`;
    })
    .join('');
  return {
    title: listing.title,
    description: listing.summary,
    html: hero(
      listing.title,
      listing.summary,
      `<section class="container page-section">${search}${body}${listing.kind === 'article' ? '<p data-directory-empty hidden>No articles match your search. Try another title, topic or author.</p>' : ''}${path === '/gallery' ? '<a class="text-link section-link" href="/gallery/meeting-life">Explore meeting life ↗</a>' : ''}</section>`,
    ),
  };
}

export function renderExecutivePage(snapshot: PublicationSnapshot) {
  const officers = snapshot.entries
    .filter((entry) => entry.kind === 'officer')
    .sort((a, b) => a.content.sortOrder - b.content.sortOrder || a.content.title.localeCompare(b.content.title));
  const esc = escapeHtml;
  const terms = [...new Set(officers.map((entry) => entry.content.term).filter(Boolean))];
  const term = terms.length === 1 ? ` · ${esc(terms[0])}` : '';
  const card = (entry: PublicEntry) => {
    const c = entry.content;
    const photo = snapshot.media.find((item) => c.mediaIds.includes(item.id) && item.mime.startsWith('image/'));
    return `<article class="executive-card" id="${esc(c.slug)}">${photo ? `<div class="executive-photo"><img src="/media/${esc(photo.id)}" width="480" height="480" alt="${esc(photo.alt)}" loading="lazy" decoding="async"></div>` : ''}<div class="executive-copy"><p class="eyebrow">${esc(c.office)}</p><h3>${esc(doctorDisplayName(c.title))}</h3><p>${esc(c.summary)}</p>${c.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div></article>`;
  };
  const groups = ['current', 'past'].map(group => {
    const entries = officers.filter(entry => entry.content.group === group);
    return entries.length ? `<section class="container people-section" aria-labelledby="${group}-executives"><div class="people-heading"><p class="eyebrow">${group === 'current' ? 'The people who represent you' : 'Continuity in service'}</p><h2 id="${group}-executives">${group === 'current' ? 'Your executive team' : 'Immediate past officers'}</h2></div><div class="executive-grid">${entries.map(card).join('')}</div></section>` : '';
  }).join('');
  return {
    title: 'NMA Ogun Executives',
    description: 'Meet the published State Officers’ Committee of the Nigerian Medical Association, Ogun State Branch.',
    html: `<section class="people-hero container"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Executives</span></nav><div class="people-intro"><div><p class="eyebrow">State Officers’ Committee${term}</p><h1>Leadership in<br><em>service.</em></h1></div><div><p>Meet the doctors serving the Nigerian Medical Association, Ogun State Branch. Together, the executive team supports professional representation, members’ welfare and the work of the association.</p><a class="text-link" href="/committees">Meet our committee chairmen <span aria-hidden="true">↗</span></a></div></div><div class="people-summary"><span><strong>${officers.length}</strong> published officers</span><span>One shared commitment to a stronger profession.</span></div></section>${groups || '<section class="container people-section"><h2>Executive information is being updated.</h2><p>Published officers will appear here when the next roster is ready.</p></section>'}<section class="people-callout container"><div><p class="eyebrow">The work behind the mission</p><h2>Shared purpose.<br><em>Dedicated committees.</em></h2><p>Our committee chairmen coordinate focused areas of the association’s work, from continuing medical education to doctors’ welfare.</p></div><a class="button" href="/committees">Explore our committees <span aria-hidden="true">↗</span></a></section>`,
  };
}

export function publicAffiliateProfiles(snapshot: PublicationSnapshot) {
  const approved = snapshot.entries.filter(
    (entry) => entry.kind === 'affiliate' && entry.content.affiliate,
  );
  const profiles = affiliateSeeds.map((seed) => {
    const entry = approved.find((entry) => entry.content.slug === seed.slug);
    return entry
      ? {
          ...seed,
          name: entry.content.title,
          summary: entry.content.summary,
          paragraphs: entry.content.paragraphs,
          details: entry.content.affiliate!,
          entry,
        }
      : { ...seed, entry: undefined };
  });
  for (const entry of approved.filter(
    (entry) => !profiles.some((seed) => seed.slug === entry.content.slug),
  )) {
    profiles.push({
      slug: entry.content.slug,
      name: entry.content.title,
      shortName: entry.content.affiliate!.code,
      summary: entry.content.summary,
      paragraphs: entry.content.paragraphs,
      details: entry.content.affiliate!,
      sources: [],
      entry,
    });
  }
  return profiles;
}
export function renderAffiliatePage(
  path: string,
  snapshot: PublicationSnapshot,
): { title: string; description: string; html: string } | null {
  const esc = escapeHtml;
  const profiles = publicAffiliateProfiles(snapshot);
  const logoMarkup = (profile: AffiliateSeed, large = false) => {
    const logo = profile.logo;
    return logo
      ? '<figure class="affiliate-brand-mark' +
          (large ? ' affiliate-brand-mark-large' : '') +
          '"><img src="' +
          esc(logo.src) +
          '" alt="' +
          esc(logo.alt) +
          '" width="144" height="144" ' +
          (large ? 'fetchpriority="high"' : 'loading="lazy"') +
          ' decoding="async"><figcaption>' +
          esc(logo.label) +
          '</figcaption></figure>'
      : '<span class="affiliate-monogram" aria-hidden="true">' +
          esc(profile.details.code.split('-')[0]) +
          '</span>';
  };
  const card = (profile: AffiliateSeed) =>
    `<article class="affiliate-card" data-category="${esc(profile.details.category)}" data-search-text="${esc([profile.name, profile.shortName, profile.details.code, profile.details.location, profile.details.category].join(' '))}"><div class="affiliate-card-top">${logoMarkup(profile)}<span class="affiliate-category">${esc(profile.details.category)}</span></div><p class="eyebrow">${esc(profile.details.location)}</p><h2><a href="/affiliates/${esc(profile.slug)}">${esc(profile.shortName)}</a></h2><p class="affiliate-full-name">${esc(profile.name)}</p><p>${esc(profile.summary)}</p><a class="text-link" href="/affiliates/${esc(profile.slug)}" aria-label="Discover ${esc(profile.shortName)}">Discover this affiliate <span aria-hidden="true">↗</span></a></article>`;
  const breadcrumb = (current: string, detail = false) =>
    `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">NMA Ogun</a><span aria-hidden="true">/</span>${detail ? '<a href="/affiliates">Our affiliates</a><span aria-hidden="true">/</span>' : ''}<span aria-current="page">${esc(current)}</span></nav>`;
  if (path === '/affiliates')
    return {
      title: 'Our affiliates',
      description:
        'Meet the professional associations, consultants, resident doctors and institutional groups that make up the NMA Ogun affiliate family.',
      html: `<section class="page-hero container">${breadcrumb('Our affiliates')}<div class="page-hero-grid"><div><p class="eyebrow">One family. Many contributions.</p><h1>Meet our<br><em>affiliate family.</em></h1></div><p>Every affiliate brings its own community, experience and voice. Together, they form the NMA Ogun family — connected by professional purpose and a commitment to better healthcare.</p></div></section><section class="affiliate-family-strip"><div class="container"><a href="/about">NMA Ogun</a><span aria-hidden="true">→</span><span>${profiles.length} affiliates</span><span aria-hidden="true">→</span><span>A shared professional community</span></div></section><section class="container page-section" aria-label="Affiliate directory"><form class="affiliate-filters" data-directory-search="affiliate-directory" role="search"><label for="affiliate-search">Find your community<input id="affiliate-search" type="search" placeholder="Search by name, institution or location"></label><label for="affiliate-category">Explore by group<select id="affiliate-category" data-category-filter><option value="">All groups</option>${affiliateCategories.map((category) => `<option>${esc(category)}</option>`).join('')}</select></label><p data-result-count role="status">${profiles.length} affiliates</p></form><div class="affiliate-grid" id="affiliate-directory">${profiles.map(card).join('')}</div><p data-directory-empty hidden>No affiliates match your search. Try another name, location or group.</p></section><section class="container affiliate-invitation"><div><p class="eyebrow">Stronger connections</p><h2>Find a community.<br><em>Start a conversation.</em></h2></div><div><p>Explore an affiliate to learn who it connects, the perspective it brings and how to take the next step as a colleague or prospective partner.</p><a class="button" href="/membership">Explore membership <span aria-hidden="true">↗</span></a></div></section>`,
    };
  const profile = profiles.find((profile) => `/affiliates/${profile.slug}` === path);
  if (!profile) return null;
  const d = profile.details;
  const featuredMembers =
    d.memberListingApproved === true ? (d.featuredMembers ?? []).slice(0, 10) : [];
  const memberSection = featuredMembers.length
    ? `<section id="featured-members"><p class="eyebrow">People in our community</p><h2>Meet some of our members.</h2><p>A selection of members of ${esc(profile.shortName)}.</p><ul class="affiliate-member-grid">${featuredMembers
        .map(
          (member) =>
            `<li><span class="affiliate-member-initials" aria-hidden="true">${esc(
              member.name
                .replace(/^(?:Dr\.?|Prof\.?)\s+/i, '')
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join(''),
            )}</span><div><h3>${esc(doctorDisplayName(member.name))}</h3>${member.specialty && member.specialty !== 'Other' ? `<p>${esc(member.specialty)}</p>` : ''}</div></li>`,
        )
        .join('')}</ul></section>`
    : '';
  const related = profiles
    .filter((p) => p.slug !== profile.slug && p.details.category === d.category)
    .slice(0, 3);
  const sections = d.sections.filter((section) => section.paragraphs.length);
  const contact = d.contactEmail || d.contactPhone || d.website || d.address;
  const images = profile.entry
    ? profile.entry.content.mediaIds
        .map((id) => snapshot.media.find((m) => m.id === id))
        .filter((m) => m?.mime.startsWith('image/'))
    : [];
  return {
    title: `${profile.shortName} — Our affiliates`,
    description: profile.summary,
    html: `<section class="container affiliate-profile-hero">${breadcrumb(profile.shortName, true)}<div class="affiliate-profile-heading">${logoMarkup(profile, true)}<div><p class="eyebrow">${esc(d.category)} · ${esc(d.location)}</p><h1>${esc(profile.name)}</h1><p class="affiliate-tagline">${esc(d.tagline)}</p></div></div><div class="affiliate-profile-actions"><a class="button" href="#connect">Connect with this affiliate <span aria-hidden="true">↗</span></a><a class="text-link" href="/affiliates">Explore the family <span aria-hidden="true">↗</span></a></div></section><section class="affiliate-family-strip"><div class="container"><a href="/about">NMA Ogun</a><span aria-hidden="true">→</span><a href="/affiliates">Our affiliates</a><span aria-hidden="true">→</span><span>${esc(profile.shortName)}</span></div></section><div class="container page-section affiliate-profile-layout"><aside class="affiliate-profile-aside"><p class="eyebrow">At a glance</p><dl><dt>Parent association</dt><dd><a href="/about">NMA Ogun</a></dd><dt>Professional community</dt><dd>${esc(d.category)}</dd><dt>Location</dt><dd>${esc(d.location || 'Ogun State')}</dd></dl><h2>Areas of connection</h2><ul>${d.focusAreas.map((area) => `<li>${esc(area)}</li>`).join('')}</ul><nav aria-label="On this page"><a href="#about-affiliate">About this affiliate</a>${sections.map((s, i) => `<a href="#profile-section-${i}">${esc(s.heading)}</a>`).join('')}${featuredMembers.length ? '<a href="#featured-members">Featured members</a>' : ''}<a href="#membership">Membership</a><a href="#partnership">Partnership opportunities</a><a href="#connect">Connect</a></nav></aside><article class="affiliate-story"><section id="about-affiliate"><p class="eyebrow">Part of the NMA Ogun family</p><h2>${esc(d.tagline || 'A shared professional purpose.')}</h2><p class="affiliate-lead">${esc(profile.summary)}</p>${profile.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${images.length ? `<div class="affiliate-media">${images.map((m) => `<figure><img src="/media/${esc(m!.id)}" alt="${esc(m!.alt)}" loading="lazy"><figcaption>${esc(m!.alt)}</figcaption></figure>`).join('')}</div>` : ''}</section>${sections.map((s, i) => `<section id="profile-section-${i}"><h2>${esc(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`).join('')}${memberSection}<section id="membership"><p class="eyebrow">For colleagues</p><h2>Find your place in the community.</h2><p>If this affiliate reflects your professional setting or interests, ask its representatives about eligibility, membership arrangements and opportunities to take part. Affiliate membership and NMA Ogun registration may have separate requirements.</p><p>For your wider association connection, the NMA Ogun member portal is the starting point for registration and member services.</p><a class="text-link" href="/membership">NMA Ogun membership guidance <span aria-hidden="true">↗</span></a></section><section id="partnership"><p class="eyebrow">For prospective partners</p><h2>Explore what we could do together.</h2><p>Professional learning, health education and conversations across institutions are possible starting points for collaboration. Discuss your idea with the affiliate’s representatives to establish its relevance, the right participants and any approvals needed.</p><p>A partnership begins with a conversation about shared goals. Availability, programme commitments and arrangements should be agreed directly with the affiliate.</p></section><section id="connect" class="affiliate-connect"><p class="eyebrow">Take the next step</p><h2>Connect with ${esc(profile.shortName)}.</h2>${contact ? `<address>${d.address ? `<p>${esc(d.address)}</p>` : ''}${d.contactEmail ? `<p><a href="mailto:${esc(d.contactEmail)}">${esc(d.contactEmail)}</a></p>` : ''}${d.contactPhone ? `<p><a href="tel:${esc(d.contactPhone.replace(/[^+\d]/g, ''))}">${esc(d.contactPhone)}</a></p>` : ''}${d.website ? `<p><a href="${esc(d.website)}" rel="noopener noreferrer">Official affiliate website ↗</a></p>` : ''}</address>` : '<p>To request an introduction, use your established NMA Ogun secretariat or affiliate representative contact channel. Public affiliate contact details will appear here when supplied for publication.</p>'}<a class="button" href="https://portal.nmaogun.com.ng/login">Open the member portal <span aria-hidden="true">↗</span></a></section>${profile.sources.length ? `<details class="affiliate-sources"><summary>Background sources</summary><p>These references explain the national association or institutional setting. Local leadership, programme dates and achievements are published separately when supplied and reviewed.</p><ul>${profile.sources.map((source) => `<li><a href="${esc(source.url)}" rel="noopener noreferrer">${esc(source.label)} ↗</a></li>`).join('')}</ul></details>` : ''}</article></div>${related.length ? `<section class="container page-section affiliate-related"><p class="eyebrow">More of the family</p><h2>Continue exploring.</h2><div class="affiliate-grid">${related.map(card).join('')}</div></section>` : ''}`,
  };
}
