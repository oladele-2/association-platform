import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicCrawlingAllowed } from './robots-check.mjs';
test('search indexing remains allowed alongside managed training-crawler blocks', () => {
  assert.doesNotThrow(() => assertPublicCrawlingAllowed('User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /\nUser-agent: *\nAllow: /\n'));
});
test('a wildcard or explicit search-engine root block fails validation', () => {
  assert.throws(() => assertPublicCrawlingAllowed('User-agent: *\nDisallow: /\n'));
  assert.throws(() => assertPublicCrawlingAllowed('User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /\n'));
});
