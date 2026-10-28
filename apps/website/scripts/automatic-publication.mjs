import { readFile, mkdir, writeFile, copyFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateSnapshot } from '../vendor/website-content/index.ts';
import { readRelease, importRelease } from './publication-release.mjs';
import { lagosDay } from '../src/data/resource-features.mjs';

const root = resolve(import.meta.dirname, '..');
const portal = 'https://portal.nmaogun.com.ng/api/website/';
export function needsPublicationBuild(event, live, generation, sha, now = new Date()) {
  if (event !== 'schedule' || live?.portalGeneration !== generation || live?.sourceSha !== sha) return true;
  // Refresh dated homepage features once per Lagos calendar day, even when no
  // editor has published another revision. Missing/invalid timestamps rebuild.
  if (typeof live?.builtAt !== 'string' || !Number.isFinite(Date.parse(live.builtAt))) return true;
  return lagosDay(live.builtAt) !== lagosDay(now);
}
async function download(path, secret, maximum, authenticated = true) {
  const response = await fetch(authenticated ? portal + path : path, {
    headers: authenticated ? { Authorization: 'Bearer ' + secret } : {},
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || !response.body) throw new Error(`Website publication request failed (${response.status}).`);
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) { await reader.cancel(); throw new Error('Publication response exceeds its limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export function mergePublication(baseline, envelope, heldMediaIds = []) {
  const incoming = validateSnapshot(envelope.snapshot);
  if (!Array.isArray(envelope.managedRoutes) || envelope.managedRoutes.length > 10000 || envelope.managedRoutes.some(key => typeof key !== 'string' || !/^(article|event|officer|gallery|resource|affiliate):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)))
    throw new Error('Invalid portal publication ownership list.');
  const managed = new Set(envelope.managedRoutes);
  for (const entry of incoming.entries)
    if (!managed.has(entry.kind + ':' + entry.content.slug)) throw new Error('Published entry is missing portal ownership.');
  const held = new Set(heldMediaIds);
  const entries = [
    ...incoming.entries.map(entry => ({ ...entry, content: { ...entry.content, mediaIds: entry.content.mediaIds.filter(id => !held.has(id)) } })),
    ...baseline.entries.filter(entry => !managed.has(entry.kind + ':' + entry.content.slug)),
  ];
  // A held required document/gallery cannot be published in a broken shape.
  const filtered = entries.filter(entry => !(entry.kind === 'gallery' && !entry.content.mediaIds.length) && !(entry.kind === 'resource' && entry.content.mediaIds.length !== 1));
  const used = new Set(filtered.flatMap(entry => entry.content.mediaIds));
  const media = [...incoming.media, ...baseline.media.filter(m => !incoming.media.some(n => n.id === m.id))].filter(m => used.has(m.id) && !held.has(m.id));
  return validateSnapshot({ ...incoming, entries: filtered, media });
}
export async function reportDeployment(phase, generation, secret = process.env.WEBSITE_EXPORT_SECRET) {
  if (!secret || secret.length < 32) throw new Error('Website export credential is missing.');
  const response = await fetch(portal + 'deployment', {
    method: 'POST', headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase, generation, runId: process.env.GITHUB_RUN_ID, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1) }),
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Website deployment callback failed (${response.status}).`);
  await response.body?.cancel();
}
export async function preparePublication(secret = process.env.WEBSITE_EXPORT_SECRET) {
  if (!secret || secret.length < 32) throw new Error('Set WEBSITE_EXPORT_SECRET in GitHub Actions.');
  const envelope = JSON.parse((await download('release', secret, 4 * 1024 * 1024)).toString());
  const baseline = await readRelease(join(root, 'content/baseline'));
  const policy = JSON.parse(await readFile(join(root, 'content/publication-policy.json'), 'utf8'));
  const snapshot = mergePublication(baseline, envelope, policy.heldMediaIds);
  const generation = snapshot.generation;
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `generation=${generation}\n`);
  let live = null;
  try { live = JSON.parse((await download('https://nmaogun.com.ng/publication-status.json', '', 65536, false)).toString()); } catch { /* First automated release has no manifest yet. */ }
  const changed = needsPublicationBuild(process.env.GITHUB_EVENT_NAME, live, generation, process.env.GITHUB_SHA);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  if (!changed) { console.log('Approved website publication is already live.'); return; }
  await reportDeployment('deploying', generation, secret);
  const stage = join(root, 'tmp/automatic-release-' + randomUUID());
  await mkdir(join(stage, 'media'), { recursive: true });
  for (const media of snapshot.media) {
    if (envelope.snapshot.media.some(item => item.id === media.id))
      await writeFile(join(stage, 'media', media.id), await download('media/' + media.id, secret, media.bytes));
    else await copyFile(join(root, 'content/baseline/media', media.id), join(stage, 'media', media.id));
  }
  await writeFile(join(stage, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
  await readRelease(stage);
  const latest = JSON.parse((await download('release', secret, 4 * 1024 * 1024)).toString());
  if (latest.snapshot.generation !== generation) throw new Error('Publication changed during export; the next automatic run will retry.');
  await importRelease(stage);
  await writeFile(join(root, 'content/release/source.json'), JSON.stringify({ portalGeneration: generation, sourceSha: process.env.GITHUB_SHA ?? null }) + '\n');
  console.log(`Prepared approved publication generation ${generation}.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv[2] === 'prepare') await preparePublication();
  else if (['live', 'failed'].includes(process.argv[2])) await reportDeployment(process.argv[2], process.argv[3]);
  else throw new Error('Use automatic-publication.mjs prepare | live <generation> | failed <generation>');
}
