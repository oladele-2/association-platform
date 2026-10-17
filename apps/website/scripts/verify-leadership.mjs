import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { executives, committees } from '../src/data/leadership.ts';

const dist = resolve(import.meta.dirname, '../dist');
assert.equal(executives.length, 12);
assert.equal(committees.length, 19);
assert.equal(new Set(executives.map(person => person.name)).size, 12);
assert.equal(new Set(committees.map(item => item.name)).size, 19);
assert.ok(executives.every(person => /^Dr\s/.test(person.name)));
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
    assert.equal((html.match(/class="executive-card"/g) ?? []).length, 12);
    for (const person of executives) {
      assert.ok(html.includes(person.name));
      assert.ok(html.includes(`/images/executives/${person.file}.webp`));
      assert.ok((await stat(resolve(dist, `images/executives/${person.file}.webp`))).size > 0);
    }
    assert.match(html, /Editor-in-Chief/);
    assert.doesNotMatch(html, />Auditor</);
  } else {
    assert.equal((html.match(/class="committee-chair"/g) ?? []).length, 19);
    for (const item of committees) assert.ok(html.includes(item.chairman));
  }
}
console.log('Leadership verification passed: 12 officers, 12 portraits, 19 committee chairmen, canonical URLs, sitemap, navigation and public fields.');
