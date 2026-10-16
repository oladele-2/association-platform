import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const workspace = resolve(import.meta.dirname, '../../..');
const evidence = join(workspace, 'docs/website-implementation/phase5');
const raw = join(workspace, 'tmp/website-phase5/lighthouse');
await mkdir(evidence, { recursive: true });
await mkdir(raw, { recursive: true });
const latest = new Map();
for (const name of await readdir(tmpdir())) {
  if (!name.startsWith('chrome-devtools-mcp-')) continue;
  const path = join(tmpdir(), name, 'report.json');
  let report;
  try {
    report = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    continue;
  }
  if (!String(report.requestedUrl).startsWith('http://127.0.0.1:4325')) continue;
  const route = new URL(report.requestedUrl).pathname.replace(/\/$/, '') || '/';
  const device = report.configSettings.formFactor;
  const key = device + ':' + route;
  const previous = latest.get(key);
  if (!previous || report.fetchTime > previous.report.fetchTime)
    latest.set(key, { report, path, route, device });
}
const summaries = [];
for (const { report, path, route, device } of latest.values()) {
  const name =
    device + '-' + (route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')) + '.json';
  await cp(path, join(raw, name));
  summaries.push({
    route,
    device,
    checkedAt: report.fetchTime,
    lighthouseVersion: report.lighthouseVersion,
    scores: Object.fromEntries(
      Object.values(report.categories).map((c) => [
        c.id,
        c.score === null ? null : Math.round(c.score * 100),
      ]),
    ),
    failures: Object.values(report.audits)
      .filter((a) => a.score === 0)
      .map((a) => ({ id: a.id, title: a.title })),
    runtimeError: report.runtimeError ?? null,
    rawReport: 'tmp/website-phase5/lighthouse/' + name,
  });
}
summaries.sort((a, b) => a.route.localeCompare(b.route) || a.device.localeCompare(b.device));
await writeFile(
  join(evidence, 'lighthouse-summary.json'),
  JSON.stringify(summaries, null, 2) + '\n',
);
for (const name of ['infrastructure.json', 'http-budget-check.json'])
  await cp(join(workspace, 'tmp/website-phase5', name), join(evidence, name));
console.log(
  `Saved ${summaries.length} Lighthouse summaries and the read-only infrastructure/HTTP checks.`,
);
