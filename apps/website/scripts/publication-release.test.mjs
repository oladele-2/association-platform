import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { importRelease, readRelease, assembleRelease } from './publication-release.mjs';
import { exportPublication } from './export-publication.mjs';

test('operator export authenticates, detects concurrent changes, and preserves existing exports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'website-export-'));
  const secret = 'local-export-test-secret-at-least-32-characters';
  const snapshot = { schemaVersion: 1, tenant: 'nmaogun', generation: '1', entries: [], media: [] };
  const target = join(root, 'export');
  let calls = 0;
  const fetchFixture = async (url, options) => {
    assert.equal(url, 'https://portal.nmaogun.com.ng/api/website/export');
    assert.equal(options.headers.Authorization, 'Bearer ' + secret);
    assert.equal(options.redirect, 'error');
    calls++;
    return Response.json(snapshot);
  };
  try {
    await exportPublication(target, secret, fetchFixture);
    assert.equal(calls, 2);
    const before = await readFile(join(target, 'snapshot.json'), 'utf8');
    await assert.rejects(exportPublication(target, secret, fetchFixture), { code: 'EEXIST' });
    assert.equal(await readFile(join(target, 'snapshot.json'), 'utf8'), before);
    calls = 0;
    const next = join(root, 'changed');
    await assert.rejects(
      exportPublication(next, secret, async () =>
        Response.json({ ...snapshot, generation: String(++calls) }),
      ),
      /changed during export/,
    );
    await assert.rejects(readFile(join(next, 'snapshot.json')), { code: 'ENOENT' });
    await assert.rejects(
      exportPublication(
        join(root, 'failure'),
        secret,
        async () => new Response('Unavailable', { status: 503 }),
      ),
      /503/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('standalone imports preserve the previous snapshot on failure and remove withdrawn media', async () => {
  const root = await mkdtemp(join(tmpdir(), 'website-release-'));
  const source = join(root, 'source'),
    target = join(root, 'release'),
    dist = join(root, 'dist');
  const mediaId = randomUUID();
  const bytes = Buffer.from('%PDF-1.4\nlocal fixture');
  const snapshot = {
    schemaVersion: 1,
    tenant: 'nmaogun',
    generation: '1',
    entries: [
      {
        id: randomUUID(),
        kind: 'resource',
        revision: 1,
        publishedAt: '2026-01-01T00:00:00Z',
        content: {
          slug: 'fixture',
          title: 'Fixture',
          summary: 'Fixture PDF',
          paragraphs: [],
          mediaIds: [mediaId],
        },
      },
    ],
    media: [
      {
        id: mediaId,
        mime: 'application/pdf',
        alt: 'Fixture document',
        filename: 'fixture.pdf',
        bytes: bytes.length,
      },
    ],
  };
  async function save(value) {
    await writeFile(join(source, 'snapshot.json'), JSON.stringify(value));
  }
  try {
    await mkdir(join(source, 'media'), { recursive: true });
    await writeFile(join(source, 'media', mediaId), bytes);
    await save(snapshot);
    await importRelease(source, target);
    const before = await readFile(join(target, 'snapshot.json'), 'utf8');
    for (const invalid of [
      { ...snapshot, tenant: 'other' },
      { ...snapshot, privateContacts: ['secret'] },
    ]) {
      await save(invalid);
      await assert.rejects(importRelease(source, target));
      assert.equal(await readFile(join(target, 'snapshot.json'), 'utf8'), before);
    }
    await save(snapshot);
    await writeFile(join(source, 'media', mediaId), Buffer.alloc(bytes.length));
    await assert.rejects(importRelease(source, target), /type mismatch/);
    assert.equal(await readFile(join(target, 'snapshot.json'), 'utf8'), before);
    await assembleRelease(target, dist);
    assert.deepEqual(await readFile(join(dist, '_publication', mediaId)), bytes);
    await save({ ...snapshot, generation: '2', entries: [] });
    await importRelease(source, target);
    assert.deepEqual((await readRelease(target)).media, []);
    await assembleRelease(target, dist);
    await assert.rejects(readFile(join(dist, '_publication', mediaId)), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
