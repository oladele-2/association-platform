import snapshot from './publications.json';
import { selectPublications, type Publication } from './publication.mjs';


export interface Story extends Publication {
  reviewOnly?: boolean;
}
export const articles: Story[] = selectPublications(snapshot, 'articles');
export const events: Story[] = selectPublications(snapshot, 'events');

export const longDate = (value: string) =>
  new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(`${value}T12:00:00Z`));
