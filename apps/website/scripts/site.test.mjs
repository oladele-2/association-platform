import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPublications } from '../src/data/publication.mjs';

const article = {
  tenant: 'nmaogun',
  status: 'approved',
  publish: true,
  visibility: 'public',
  slug: 'reviewed-article',
  title: 'Reviewed article',
  summary: 'A reviewed summary.',
  approvedBy: 'Editorial reviewer',
  reviewedAt: '2026-10-15',
  publishedAt: '2026-10-15',
  author: 'NMA Ogun',
  paragraphs: ['Reviewed public text.'],
};
const select = (records, tenant = 'nmaogun') =>
  selectPublications({ tenant, articles: records, events: [] }, 'articles');

test('held, private, other-tenant and unapproved records never enter the public shape', () => {
  for (const override of [
    { publish: false },
    { status: 'conflicted' },
    { status: 'needs-editorial-review' },
    { visibility: 'members' },
    { tenant: 'another-association' },
    { approvedBy: '' },
    { reviewedAt: null },
  ]) {
    assert.deepEqual(select([{ ...article, ...override }]), []);
  }
  assert.deepEqual(select([article], 'another-association'), []);
});

test('only explicitly allowlisted article fields are exported', () => {
  const [output] = select([
    {
      ...article,
      email: 'private@example.test',
      phone: 'private phone',
      source: 'private source',
      storageKey: 'private object',
      bankDetails: 'private bank',
    },
  ]);
  assert.deepEqual(
    Object.keys(output).sort(),
    ['slug', 'title', 'summary', 'paragraphs', 'publishedAt', 'author'].sort(),
  );
  assert.deepEqual(output.paragraphs, article.paragraphs);
  assert.notEqual(output.paragraphs, article.paragraphs);
});

test('invalid dates, unsafe slugs and incomplete articles are excluded', () => {
  for (const override of [
    { slug: '../../private' },
    { slug: 'unsafe?query' },
    { publishedAt: '2026-02-30' },
    { publishedAt: '2026-99-99' },
    { paragraphs: [] },
    { paragraphs: [''] },
    { author: '' },
  ]) {
    assert.deepEqual(select([{ ...article, ...override }]), []);
  }
});

test('duplicate public slugs fail instead of silently overwriting a route', () => {
  assert.throws(() => select([article, article]), /Duplicate articles slug/);
});

test('events require reviewed dates and venues and exclude registration/private metadata', () => {
  const event = {
    ...article,
    startDate: '2026-10-15',
    venue: 'Reviewed venue',
    registrationUrl: 'https://unreviewed.example.test',
  };
  const snapshot = { tenant: 'nmaogun', articles: [], events: [event] };
  const [output] = selectPublications(snapshot, 'events');
  assert.deepEqual(
    Object.keys(output).sort(),
    ['slug', 'title', 'summary', 'paragraphs', 'startDate', 'venue'].sort(),
  );
  assert.deepEqual(
    selectPublications({ ...snapshot, events: [{ ...event, venue: '' }] }, 'events'),
    [],
  );
  assert.deepEqual(
    selectPublications({ ...snapshot, events: [{ ...event, startDate: null }] }, 'events'),
    [],
  );
});
