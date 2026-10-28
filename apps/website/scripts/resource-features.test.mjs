import test from 'node:test';
import assert from 'node:assert/strict';
import { lagosDay, physiciansWeek, physiciansWeekState, selectNewsletterEditions, pastLeadership, memberBenefits } from '../src/data/resource-features.mjs';

test('Physicians’ Week features follow the poster and Lagos date boundaries', () => {
  assert.equal(lagosDay('2026-10-17T23:00:00Z'), '2026-10-18');
  assert.equal(physiciansWeekState('2026-10-17T22:59:59Z'), 'upcoming');
  assert.equal(physiciansWeekState('2026-10-17T23:00:00Z'), 'current');
  assert.equal(physiciansWeekState('2026-10-24T22:59:59Z'), 'current');
  assert.equal(physiciansWeekState('2026-10-24T23:00:00Z'), 'past');
  assert.equal(physiciansWeek.agenda.length, 7);
  assert.equal(physiciansWeek.agenda.find(item => /Ordinary General Meeting/.test(item.title)).date, '2026-10-22');
});
test('newsletter editions require a public release PDF and disappear after withdrawal', () => {
  const entry = (title, id, date = '2026-10-18') => ({ kind: 'resource', publishedAt: date + 'T12:00:00Z', content: { title, date, mediaIds: [id] } });
  const pdf = entry('NMA Ogun Newsletter', 'pdf');
  const latest = entry('November bulletin', 'pdf2', '2026-11-01');
  const snapshot = { entries: [pdf, latest, entry('Annual report', 'pdf'), entry('Newsletter image', 'image')], media: [{ id: 'pdf', mime: 'application/pdf' }, { id: 'pdf2', mime: 'application/pdf' }, { id: 'image', mime: 'image/jpeg' }] };
  assert.deepEqual(selectNewsletterEditions(snapshot), [latest, pdf]);
  assert.deepEqual(selectNewsletterEditions({ ...snapshot, entries: [] }), []);
  assert.deepEqual(selectNewsletterEditions({ ...snapshot, media: [] }), []);
});
test('leadership archive contains only public names and complete term labels', () => {
  assert.equal(pastLeadership.length, 20);
  for (const record of pastLeadership) {
    assert.match(record.term, /^\d{4}–\d{4}$/);
    assert.ok(Object.keys(record).every(key => ['term', 'chairman', 'secretary'].includes(key)));
    assert.doesNotMatch(JSON.stringify(record), /(?:\+234|\b0[789]\d{9}\b|@|https?:)/);
  }
  assert.equal(pastLeadership.some(record => /^1985|^2008/.test(record.term)), false);
  for (const service of memberBenefits) assert.match(service.href, /^\/portal\/(profile|dues|cme|id-card)$/);
});
