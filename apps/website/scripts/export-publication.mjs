import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validateSnapshot } from '../vendor/website-content/index.ts';
import { readRelease } from './publication-release.mjs';

// Run only in an operator's shell or CI. No credential is needed by the website.
export async function exportPublication(targetDirectory, secret, fetchPublication = fetch) {
  if (!secret || secret.length < 32)
    throw new Error('Set WEBSITE_EXPORT_SECRET in the export environment.');
  if (!targetDirectory) throw new Error('Supply a new output directory.');
  const target = resolve(targetDirectory);
  const stage = target + '.stage-' + randomUUID();
  async function download(path, maximum) {
    const response = await fetchPublication('https://portal.nmaogun.com.ng/api/website/' + path, {
      headers: { Authorization: 'Bearer ' + secret },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok || !response.body)
      throw new Error(`Publication export failed (${response.status}).`);
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maximum) {
          await reader.cancel();
          throw new Error('Export exceeds size limit.');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks);
  }
  try {
    const snapshot = validateSnapshot(
      JSON.parse((await download('export', 3 * 1024 * 1024)).toString()),
    );
    const used = new Set(snapshot.entries.flatMap((entry) => entry.content.mediaIds));
    snapshot.media = snapshot.media.filter((media) => used.has(media.id));
    await mkdir(join(stage, 'media'), { recursive: true });
    for (const media of snapshot.media)
      await writeFile(
        join(stage, 'media', media.id),
        await download('media/' + media.id, media.bytes),
      );
    await writeFile(join(stage, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
    await readRelease(stage);
    const latest = validateSnapshot(
      JSON.parse((await download('export', 3 * 1024 * 1024)).toString()),
    );
    if (latest.generation !== snapshot.generation)
      throw new Error('Publication changed during export. Retry.');
    // mkdir reserves the destination and prevents overwriting any existing export.
    await mkdir(target);
    try {
      await cp(stage, target, { recursive: true });
    } catch (error) {
      await rm(target, { recursive: true, force: true });
      throw error;
    }
    console.log(
      `Exported NMA Ogun generation ${snapshot.generation}. Import this directory to prepare the website.`,
    );
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await exportPublication(process.argv[2], process.env.WEBSITE_EXPORT_SECRET);
