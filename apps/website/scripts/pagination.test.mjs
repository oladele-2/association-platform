import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPublicationPage } from '../vendor/website-content/render.ts';
const entries = Array.from({ length: 23 }, (_, i) => ({
  id: String(i), kind: 'article', content: {
    slug: `story-${i}`, title: `Story ${i}`, summary: 'Community news',
    date: `2026-10-${String(i + 1).padStart(2, '0')}`, author: 'NMA Ogun',
    paragraphs: [i % 2 ? 'Health education' : 'Member update'], mediaIds: [],
  },
}));
const snapshot = { entries, media: [] };
const render = query => renderPublicationPage('/news', snapshot, new URLSearchParams(query)).html;
const cards = html => [...html.matchAll(/<article class="published-card"/g)].length;
test('archive pages show nine newest stories with distinct next and previous links', () => {
  const first = render('');
  assert.equal(cards(first), 9);
  assert.ok(first.indexOf('Story 22') < first.indexOf('Story 21'));
  assert.match(first, /href="\/news\?page=2" rel="next"/);
  assert.doesNotMatch(first, /<h2>Story 13<\/h2>/);
  const second = render('page=2');
  assert.equal(cards(second), 9);
  assert.match(second, /<h2>Story 13<\/h2>/);
  assert.match(second, /href="\/news" rel="prev"/);
  assert.equal(cards(render('page=3')), 5);
});
test('search covers the full archive and persists across pagination', () => {
  const html = render('q=Health&page=2');
  assert.equal(cards(html), 2);
  assert.match(html, /11 articles/);
  assert.match(html, /href="\/news\?q=Health" rel="prev"/);
  assert.equal(cards(render('q=nonexistent')), 0);
  assert.match(render('q=nonexistent'), /No articles match/);
});
test('invalid pages recover safely and search text is escaped', () => {
  for (const page of ['0', '-1', 'abc', '1.5', 'Infinity']) assert.equal(cards(render(`page=${page}`)), 9);
  assert.equal(cards(render('page=999')), 5);
  assert.match(render('q=%22%3E%3Cscript%3E'), /value="&quot;&gt;&lt;script&gt;"/);
  assert.equal(renderPublicationPage('/news', { entries: [], media: [] }), null);
});
