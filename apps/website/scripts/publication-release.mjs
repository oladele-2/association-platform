import { readFile, writeFile, mkdir, rename, cp, rm, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateSnapshot } from '../../../packages/website-content/index.ts';

const app = resolve(import.meta.dirname, '..');
export async function readRelease(directory) {
  const raw = await readFile(join(directory, 'snapshot.json'));
  if (raw.byteLength > 3 * 1024 * 1024) throw new Error('Snapshot exceeds 3 MiB.');
  const snapshot = validateSnapshot(JSON.parse(raw.toString()));
  const used = new Set(snapshot.entries.flatMap((entry) => entry.content.mediaIds));
  // Never package orphaned or withdrawn media, even if present in the export.
  snapshot.media = snapshot.media.filter((media) => used.has(media.id));
  for (const media of snapshot.media) {
    const file = join(directory, 'media', media.id);
    if (!(await stat(file)).isFile() || (await stat(file)).size !== media.bytes)
      throw new Error(`Missing or incomplete publication media: ${media.id}`);
    const bytes = await readFile(file);
    const text = bytes.subarray(0, 16).toString();
    const mime =
      bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? 'image/jpeg'
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP'
            ? 'image/webp'
            : text.startsWith('%PDF-')
              ? 'application/pdf'
              : '';
    if (mime !== media.mime) throw new Error(`Media type mismatch: ${media.id}`);
  }
  return snapshot;
}

export async function importRelease(source, target = join(app, 'content/release')) {
  const snapshot = await readRelease(source);
  const stage = target + '.stage-' + randomUUID();
  const backup = target + '.previous-' + randomUUID();
  let previous = false;
  try {
    await mkdir(join(stage, 'media'), { recursive: true });
    for (const media of snapshot.media)
      await cp(join(source, 'media', media.id), join(stage, 'media', media.id));
    await writeFile(join(stage, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
    await readRelease(stage);
    try {
      await rename(target, backup);
      previous = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await rename(stage, target);
    } catch (error) {
      if (previous) await rename(backup, target);
      throw error;
    }
    // Keep the previous release for local recovery; never deploy this directory.
    return snapshot;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

export async function assembleRelease(
  source = join(app, 'content/release'),
  dist = join(app, 'dist'),
) {
  const snapshot = await readRelease(source);
  const output = join(dist, '_publication');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const media of snapshot.media)
    await cp(join(source, 'media', media.id), join(output, media.id));
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, source] = process.argv.slice(2);
  if (command === 'import' && source) {
    const snapshot = await importRelease(resolve(source));
    console.log(
      `Imported NMA Ogun generation ${snapshot.generation}; rebuild and deploy to publish.`,
    );
  } else if (command === 'assemble') await assembleRelease();
  else if (command === 'check') await readRelease(join(app, 'content/release'));
  else throw new Error('Use publication-release.mjs check | assemble | import <release-directory>');
}
