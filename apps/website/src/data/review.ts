// Server/build-only adapter. Never hand the entire content pack to the browser.
import pack from '../../../../docs/website-content/content.json';
import { reviewMode } from './site';

export const reviewSections = [
  'review',
  'leadership',
  'leadership/past',
  'committees',
  'affiliates',
  'resources',
  'contact',
] as const;
export const officers = reviewMode
  ? pack.leadership.officers
      .filter((person) => person.publicOffice && person.status !== 'conflicted')
      .map((person) => ({
        name: person.name,
        office: person.publicOffice!,
        portrait: person.portrait.split('/').pop()!,
      }))
  : [];
export const committees = reviewMode
  ? pack.leadership.committees.map((item) => ({
      name: item.name,
      chair: item.chair,
      sequence: item.sequence,
    }))
  : [];
export const affiliates = reviewMode
  ? pack.affiliateCandidates
      .filter((item) => item.code !== 'OTHER')
      .map((item) => ({ name: item.name, code: item.code }))
  : [];
export const history = reviewMode
  ? pack.leadership.historical
      .filter(
        (item) =>
          item.status !== 'conflicted' &&
          !/HOLD|missing|Full name|full name|clipped|verify/i.test(item.note ?? ''),
      )
      .map((item) => ({
        years: item.sourceYears,
        chairman: item.chairman,
        secretary: item.secretary,
      }))
  : [];
