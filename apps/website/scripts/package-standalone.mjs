import { cp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const app = resolve(import.meta.dirname, '..');
const output = join(app, '.standalone');
await rm(join(output, 'dist'), { recursive: true, force: true });
await cp(join(app, 'dist'), join(output, 'dist'), { recursive: true, force: true });
const config = (await readFile(join(app, 'wrangler.jsonc'), 'utf8'))
  .replace('"$schema": "node_modules/wrangler/config-schema.json",', '')
  .replace('"main": "worker.ts"', '"main": "worker.js"');
await writeFile(join(output, 'wrangler.jsonc'), config);
console.log(
  'Standalone artifact: apps/website/.standalone (Worker bundle, assets and config). Deploy this directory with Wrangler; no workspace packages, portal, secrets or database are needed.',
);
