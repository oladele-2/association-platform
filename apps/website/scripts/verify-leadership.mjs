import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { committees } from '../src/data/leadership.ts';
import { readRelease } from './publication-release.mjs';
import { doctorDisplayName } from '../vendor/website-content/affiliates.ts';

const dist = resolve(import.meta.dirname, '../dist');
const snapshot = await readRelease(resolve(import.meta.dirname, '../content/release'));
const executives = snapshot.entries.filter(entry => entry.kind === 'officer');
assert.equal(committees.length, 19);
assert.equal(new Set(executives.map(person => person.content.slug)).size, executives.length);
assert.equal(new Set(committees.map(item => item.name)).size, 19);
assert.ok(committees.every(item => /^Dr\s/.test(item.chairman)));
const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
for (const page of ['executives', 'committees']) {
  const html = await readFile(resolve(dist, page, 'index.html'), 'utf8');
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, page);
  assert.match(html, new RegExp(`rel="canonical" href="https://nmaogun.com.ng/${page}"`));
  assert.ok(sitemap.includes(`https://nmaogun.com.ng/${page}</loc>`));
  assert.ok(html.includes('href="/executives"'));
  assert.ok(html.includes('href="/committees"'));
  assert.doesNotMatch(html, /(?:tel:|wa\.me\/|Website preview)/);
  if (page === 'executives') {
    assert.equal((html.match(/class="executive-card"/g) ?? []).length, executives.length);
    for (const person of executives) {
      assert.ok(html.includes(doctorDisplayName(person.content.title)));
      for (const id of person.content.mediaIds) {
        assert.ok(html.includes(`/media/${id}`));
        assert.ok((await stat(resolve(dist, `_publication/${id}`))).size > 0);
      }
    }
  } else {
    assert.equal((html.match(/class="committee-chair"/g) ?? []).length, 19);
    for (const item of committees) assert.ok(html.includes(item.chairman));
  }
}
console.log(`Leadership verification passed: ${executives.length} published officers, protected release media, 19 committee chairmen, canonical URLs, sitemap, navigation and public fields.`);
