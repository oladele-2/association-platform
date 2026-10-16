import snapshot from './publications.json';
import { selectPublications, type Publication } from './publication.mjs';
import { reviewMode } from './site';

export interface Story extends Publication {
  reviewOnly?: boolean;
}
export const articles: Story[] = selectPublications(snapshot, 'articles');
export const events: Story[] = selectPublications(snapshot, 'events');

// Clearly identified layout specimens, never official announcements. Included
// only in the local review build; there are no invented dates or attribution.
if (reviewMode) {
  articles.push({
    slug: 'article-layout',
    title: 'A shared professional purpose',
    summary: 'An article layout using the association’s source-supported purpose and values.',
    paragraphs: [
      'NMA Ogun is the Ogun State Branch of the Nigerian Medical Association. Its mission brings together professional development, advocacy, knowledge sharing and public education.',
      'High ethical standards, members’ welfare, compassionate service, integrity, professionalism and excellence form the association’s stated core values.',
      'This text demonstrates the article layout. It is not an issued statement or a dated news report. An approved article, author and publication date are required before the news section can be released.',
    ],
    reviewOnly: true,
  });
  events.push({
    slug: 'programme-layout',
    title: 'Physicians’ Week',
    summary:
      'Programme candidate from the supplied content pack. Dates, venues and public participation remain unconfirmed.',
    paragraphs: [
      'The source programme brings together professional learning, association activities and community engagement.',
      'This page demonstrates the event detail layout. Conflicting meeting dates and unconfirmed logistics are deliberately omitted. No registration, fee, accreditation or attendance claim is made.',
    ],
    reviewOnly: true,
  });
}

export const longDate = (value: string) =>
  new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(`${value}T12:00:00Z`));
