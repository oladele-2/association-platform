import { affiliateCategories, doctorDisplayName, type AffiliateDetails } from './affiliates.ts';
export const kinds = ['article', 'event', 'officer', 'gallery', 'resource', 'affiliate'] as const;
export class ContentValidationError extends Error {}
export type ContentKind = (typeof kinds)[number];
export type ContentStatus = 'draft' | 'review' | 'published' | 'withdrawn' | 'archived';
export type WebsiteContent = {
  slug: string;
  title: string;
  summary: string;
  paragraphs: string[];
  author: string;
  date: string;
  venue: string;
  office: string;
  term: string;
  group: 'current' | 'past';
  mediaIds: string[];
  sortOrder: number;
  affiliate?: AffiliateDetails;
};
export type PublicEntry = {
  id: string;
  kind: ContentKind;
  revision: number;
  publishedAt: string;
  content: WebsiteContent;
};
export type PublicMedia = {
  id: string;
  mime: string;
  alt: string;
  filename: string;
  bytes: number;
};
export type PublicationSnapshot = {
  schemaVersion: 1;
  tenant: 'nmaogun';
  generation: string;
  entries: PublicEntry[];
  media: PublicMedia[];
};
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const mediaTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ContentValidationError('Expected an object.');
  return value as Record<string, unknown>;
}
export function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw new ContentValidationError('Unexpected fields in website content.');
}
export function shortText(value: unknown, label: string, max: number, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') throw new ContentValidationError(`${label} must be text.`);
  const text = value.trim();
  if (
    (required && !text) ||
    text.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
  )
    throw new ContentValidationError(`Check ${label} (maximum ${max} characters).`);
  return text;
}
export function calendarDate(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new ContentValidationError('Enter a valid calendar date.');
  return value;
}
export function contentKind(value: unknown): ContentKind {
  if (!kinds.includes(value as ContentKind))
    throw new ContentValidationError('Choose a supported content type.');
  return value as ContentKind;
}
export function parseContent(kind: ContentKind, value: unknown): WebsiteContent {
  const input = object(value);
  onlyKeys(input, [
    'slug',
    'title',
    'summary',
    'paragraphs',
    'author',
    'date',
    'venue',
    'office',
    'term',
    'group',
    'mediaIds',
    'sortOrder',
    'affiliate',
  ]);
  const slug = shortText(input.slug, 'slug', 80, true);
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    ['article-layout', 'programme-layout'].includes(slug) ||
    (kind === 'gallery' && ['meeting-life', 'doctors-house'].includes(slug))
  )
    throw new ContentValidationError(
      'Use a unique lowercase slug with words separated by hyphens.',
    );
  if (!Array.isArray(input.paragraphs) || input.paragraphs.length > 30)
    throw new ContentValidationError('Use up to 30 paragraphs.');
  const paragraphs = input.paragraphs.map((p) => shortText(p, 'paragraph', 2000, true));
  if (paragraphs.join('\n').length > 10000)
    throw new ContentValidationError('Body text is limited to 10,000 characters.');
  if (
    !Array.isArray(input.mediaIds) ||
    input.mediaIds.length > 16 ||
    input.mediaIds.some((id) => typeof id !== 'string' || !uuidPattern.test(id)) ||
    new Set(input.mediaIds).size !== input.mediaIds.length
  )
    throw new ContentValidationError('Choose up to 16 distinct website media files.');
  if (kind === 'gallery' && !input.mediaIds.length)
    throw new ContentValidationError('A gallery needs at least one photograph.');
  if (kind === 'resource' && input.mediaIds.length !== 1)
    throw new ContentValidationError('A resource needs one document.');
  const order = input.sortOrder ?? 0;
  if (!Number.isInteger(order) || Number(order) < 0 || Number(order) > 9999)
    throw new ContentValidationError('Display order must be an integer from 0 to 9999.');
  const date = kind === 'article' || kind === 'event' ? calendarDate(input.date) : '';
  const affiliate = kind === 'affiliate' ? parseAffiliate(input.affiliate) : undefined;
  if (affiliate && slug !== affiliate.code.toLowerCase())
    throw new ContentValidationError('Affiliate address must match its lowercase public code.');
  return {
    slug,
    title: shortText(input.title, 'title', 160, true),
    summary: shortText(input.summary, 'summary', 600, true),
    paragraphs,
    author: shortText(input.author, 'public author', 160, kind === 'article'),
    date,
    venue: shortText(input.venue, 'venue', 240, kind === 'event'),
    office: shortText(input.office, 'office', 160, kind === 'officer'),
    term: shortText(input.term, 'term', 80),
    group: input.group === 'past' ? 'past' : 'current',
    mediaIds: input.mediaIds as string[],
    sortOrder: Number(order),
    ...(affiliate ? { affiliate } : {}),
  };
}
export function parseAffiliate(value: unknown): AffiliateDetails {
  const input = object(value);
  onlyKeys(input, [
    'code',
    'category',
    'location',
    'tagline',
    'focusAreas',
    'sections',
    'contactEmail',
    'contactPhone',
    'address',
    'website',
    'featuredMembers',
    'memberListingApproved',
  ]);
  const code = shortText(input.code, 'affiliate code', 50, true);
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code) || code === 'OTHER')
    throw new ContentValidationError('Choose a public affiliate code.');
  const category = shortText(input.category, 'category', 80, true);
  if (!affiliateCategories.includes(category as (typeof affiliateCategories)[number]))
    throw new ContentValidationError('Choose an affiliate category.');
  if (
    !Array.isArray(input.focusAreas) ||
    input.focusAreas.length > 8 ||
    !Array.isArray(input.sections) ||
    input.sections.length > 8
  )
    throw new ContentValidationError('Use up to eight focus areas and profile sections.');
  const sections = input.sections.map((value) => {
    const section = object(value);
    onlyKeys(section, ['heading', 'paragraphs']);
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length > 8)
      throw new ContentValidationError('Use up to eight paragraphs per section.');
    return {
      heading: shortText(section.heading, 'section heading', 100, true),
      paragraphs: section.paragraphs.flatMap((p) =>
        shortText(p, 'section paragraph', 8000, true)
          .split(/\n\s*\n/)
          .map((p) => shortText(p, 'section paragraph', 2000, true)),
      ),
    };
  });
  const memberInput = input.featuredMembers ?? [];
  if (!Array.isArray(memberInput) || memberInput.length > 10)
    throw new ContentValidationError('Feature up to 10 members per affiliate.');
  const featuredMembers = memberInput.flatMap((value) => {
    const member = object(value);
    onlyKeys(member, ['name', 'specialty']);
    const name = shortText(
      doctorDisplayName(shortText(member.name, 'member name', 200)),
      'member name',
      200,
    );
    const specialty = shortText(member.specialty, 'member specialty', 200);
    if (!name && !specialty) return [];
    if (!name) throw new ContentValidationError('Enter the name of each featured member.');
    return [{ name, specialty }];
  });
  if (
    new Set(featuredMembers.map((member) => member.name.toLocaleLowerCase())).size !==
    featuredMembers.length
  )
    throw new ContentValidationError('Feature each member only once.');
  if (input.memberListingApproved !== undefined && typeof input.memberListingApproved !== 'boolean')
    throw new ContentValidationError('Confirm public member-listing permission.');
  if (sections.flatMap((s) => s.paragraphs).join('').length > 16000)
    throw new ContentValidationError('Profile sections are limited to 16,000 characters.');
  const contactEmail = shortText(input.contactEmail, 'public email', 254);
  const contactPhone = shortText(input.contactPhone, 'public phone', 80);
  const website = shortText(input.website, 'official website', 500);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
    throw new ContentValidationError('Enter a valid public email.');
  if (contactPhone && !/^\+?[\d\s().-]{5,80}$/.test(contactPhone))
    throw new ContentValidationError('Enter a valid public phone.');
  if (website) {
    try {
      const url = new URL(website);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {
      throw new ContentValidationError(
        'Official websites must use HTTPS without embedded credentials.',
      );
    }
  }
  return {
    code,
    category,
    location: shortText(input.location, 'location', 120),
    tagline: shortText(input.tagline, 'tagline', 180),
    focusAreas: input.focusAreas
      .filter((v) => typeof v !== 'string' || v.trim())
      .map((v) => shortText(v, 'focus area', 100, true)),
    sections,
    contactEmail,
    contactPhone,
    address: shortText(input.address, 'public address', 500),
    website,
    featuredMembers,
    memberListingApproved: input.memberListingApproved === true,
  };
}
export function validateSnapshot(value: unknown): PublicationSnapshot {
  const input = object(value);
  onlyKeys(input, ['schemaVersion', 'tenant', 'generation', 'entries', 'media']);
  if (
    input.schemaVersion !== 1 ||
    input.tenant !== 'nmaogun' ||
    typeof input.generation !== 'string' ||
    !/^\d+$/.test(input.generation)
  )
    throw new ContentValidationError('Invalid website publication scope.');
  if (
    !Array.isArray(input.entries) ||
    input.entries.length > 200 ||
    !Array.isArray(input.media) ||
    input.media.length > 1000
  )
    throw new ContentValidationError('Invalid publication limits.');
  const media = input.media.map((value) => {
    const row = object(value);
    onlyKeys(row, ['id', 'mime', 'alt', 'filename', 'bytes']);
    if (
      typeof row.id !== 'string' ||
      !uuidPattern.test(row.id) ||
      !mediaTypes.includes(row.mime as (typeof mediaTypes)[number]) ||
      !Number.isSafeInteger(row.bytes) ||
      Number(row.bytes) < 1 ||
      Number(row.bytes) > 8 * 1024 * 1024
    )
      throw new ContentValidationError('Invalid website media.');
    return {
      id: row.id,
      mime: String(row.mime),
      alt: shortText(row.alt, 'media description', 300, true),
      filename: shortText(row.filename, 'download name', 100, true),
      bytes: Number(row.bytes),
    };
  });
  const mediaById = new Map(media.map((item) => [item.id, item]));
  if (mediaById.size !== media.length) throw new ContentValidationError('Duplicate website media.');
  const ids = new Set<string>(),
    routes = new Set<string>();
  const entries = input.entries.map((value) => {
    const row = object(value);
    onlyKeys(row, ['id', 'kind', 'revision', 'publishedAt', 'content']);
    if (
      typeof row.id !== 'string' ||
      !uuidPattern.test(row.id) ||
      ids.has(row.id) ||
      !Number.isSafeInteger(row.revision) ||
      Number(row.revision) < 1 ||
      typeof row.publishedAt !== 'string' ||
      !Number.isFinite(Date.parse(row.publishedAt))
    )
      throw new ContentValidationError('Invalid published revision.');
    ids.add(row.id);
    const kind = contentKind(row.kind),
      content = parseContent(kind, row.content);
    if (
      content.affiliate?.featuredMembers?.length &&
      content.affiliate.memberListingApproved !== true
    )
      throw new ContentValidationError(
        'Public member-listing permission must be confirmed before export.',
      );
    const route = `${kind}/${content.slug}`;
    if (routes.has(route)) throw new ContentValidationError('Duplicate publication route.');
    routes.add(route);
    for (const id of content.mediaIds) {
      const item = mediaById.get(id);
      if (
        !item ||
        (kind !== 'resource' && !item.mime.startsWith('image/')) ||
        (kind === 'resource' && item.mime !== 'application/pdf')
      )
        throw new ContentValidationError('Unapproved or unsuitable media reference.');
    }
    return {
      id: row.id,
      kind,
      revision: Number(row.revision),
      publishedAt: row.publishedAt,
      content,
    };
  });
  return { schemaVersion: 1, tenant: 'nmaogun', generation: input.generation, entries, media };
}
