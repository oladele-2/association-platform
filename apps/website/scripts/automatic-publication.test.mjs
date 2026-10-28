import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mergePublication, needsPublicationBuild } from './automatic-publication.mjs';
const content = { slug: 'legacy-story', title: 'Legacy story', summary: 'Approved text.', paragraphs: ['Public text.'], author: 'NMA Ogun', date: '2026-01-01', mediaIds: [] };
const entry = { id: randomUUID(), kind: 'article', revision: 1, publishedAt: '2026-01-01T00:00:00Z', content };
const baseline = { schemaVersion: 1, tenant: 'nmaogun', generation: '0', entries: [entry], media: [] };
const feed = (entries, managedRoutes = []) => ({ snapshot: { ...baseline, generation: '5', entries, media: [] }, managedRoutes });
test('scheduled releases refresh on Lagos day changes and skip unchanged same-day builds', () => {
  const live = { portalGeneration: '5', sourceSha: 'sha', builtAt: '2026-10-17T23:05:00Z' };
  assert.equal(needsPublicationBuild('schedule', live, '5', 'sha', '2026-10-18T21:59:00Z'), false);
  assert.equal(needsPublicationBuild('schedule', live, '5', 'sha', '2026-10-18T23:00:00Z'), true);
  assert.equal(needsPublicationBuild('schedule', live, '6', 'sha'), true);
  assert.equal(needsPublicationBuild('schedule', live, '5', 'new-sha'), true);
  assert.equal(needsPublicationBuild('workflow_dispatch', live, '5', 'sha'), true);
  assert.equal(needsPublicationBuild('schedule', { ...live, builtAt: 'invalid' }, '5', 'sha'), true);
});
test('automatic releases retain legacy content until the portal takes ownership, and never resurrect withdrawn content', () => {
  assert.equal(mergePublication(baseline, feed([])).entries.length, 1);
  const replacement = { ...entry, id: randomUUID(), revision: 3, content: { ...content, title: 'Approved replacement' } };
  assert.equal(mergePublication(baseline, feed([replacement], ['article:legacy-story'])).entries[0].content.title, 'Approved replacement');
  assert.equal(mergePublication(baseline, feed([], ['article:legacy-story'])).entries.length, 0);
  assert.throws(() => mergePublication(baseline, feed([replacement])), /ownership/);
  assert.throws(() => mergePublication(baseline, feed([], ['article:../../private'])), /ownership/);
});
test('held media never enter an automatic release, while approved article text remains available', () => {
  const id = randomUUID();
  const incoming = feed([{ ...entry, content: { ...content, mediaIds: [id] } }], ['article:legacy-story']);
  incoming.snapshot.media = [{ id, mime: 'image/png', filename: 'account.png', alt: 'Account screenshot', bytes: 10 }];
  const result = mergePublication(baseline, incoming, [id]);
  assert.deepEqual(result.entries[0].content.mediaIds, []);
  assert.deepEqual(result.media, []);
});
