import type { PublicationSnapshot } from '../../vendor/website-content/index.ts';
import issue from './newsletter-2026.json';
import interview from './newsletter-interview-2026.json';
export { issue, interview };
export const issuePath = '/newsletter/2026-third-edition';
export function newsletterEdition(publication: PublicationSnapshot) {
  const entry = publication.entries.find(item => item.kind === 'resource' && item.content.slug === issue.resourceSlug);
  const pdf = entry && publication.media.find(item => item.mime === 'application/pdf' && entry.content.mediaIds.includes(item.id));
  return entry && pdf ? { entry, pdf, href: '/media/' + pdf.id, megabytes: (pdf.bytes / 1_000_000).toFixed(1) } : undefined;
}
