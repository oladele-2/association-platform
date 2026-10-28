// Export only the public website source into its separate Git repository.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const app = resolve(import.meta.dirname, '..');
const target = resolve(process.argv[2]);
if (target === app || target.startsWith(app + '/')) throw new Error('Use a separate repository.');
const write = (name, content) => writeFile(join(target, name), content);
await mkdir(target, { recursive: true });
await cp(join(app, 'src'), join(target, 'src'), {
  recursive: true,
  filter: (path) =>
    !/(?:^|[\\/])portraits(?:[\\/]|$)|portraits\.review\.ts$|[\\/]review\.ts$|\[\.\.\.review\]\.astro$/.test(
      path,
    ),
});
for (const name of ['public', 'content/release'])
  await cp(join(app, name), join(target, name), { recursive: true });
for (const name of ['worker.ts', 'tsconfig.json', 'astro.config.mjs', '.gitignore'])
  await cp(join(app, name), join(target, name));
await cp(resolve(app, '../../packages/website-content'), join(target, 'vendor/website-content'), {
  recursive: true,
});
await mkdir(join(target, 'scripts'), { recursive: true });
for (const name of [
  'build-social-image.mjs',
  'site.test.mjs',
  'publication-release.mjs',
  'publication-release.test.mjs',
  'export-publication.mjs',
  'test-standalone.mjs',
  'verify-launch.mjs',
  'check-fetch.mjs',
  'verify-public.mjs',
  'verify-social.mjs',
]) {
  let code = await readFile(join(app, 'scripts', name), 'utf8');
  code = code
    .replaceAll('../../../packages/website-content/', '../vendor/website-content/')
    .replaceAll('../../tmp/website-worker-bundle/', 'tmp/website-worker-bundle/')
    .replaceAll('../../tmp/website-phase5', 'tmp/website-launch');
  await write('scripts/' + name, code);
}
let editorial = await readFile(join(app, 'src/data/editorial.ts'), 'utf8');
editorial = editorial
  .replace("import { reviewMode } from './site';", '')
  .replace(/\/\/ Clearly identified[\s\S]*?(?=export const longDate)/, '');
await write('src/data/editorial.ts', editorial);
let site = await readFile(join(app, 'src/data/site.ts'), 'utf8');
site = site.replace(
  "export const reviewMode = import.meta.env.MODE === 'review';",
  'export const reviewMode = false;',
);
await write('src/data/site.ts', site);
await cp(join(app, 'wrangler.launch.jsonc'), join(target, 'wrangler.jsonc'));
const pkg = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
pkg.name = 'nma-ogun-website';
pkg.version = '1.0.0';
pkg.packageManager = 'pnpm@9.15.0';
pkg.dependencies['../vendor/website-content/index.ts'] = 'file:vendor/website-content';
pkg.scripts = {
  dev: 'astro dev --host 127.0.0.1 --port 4322',
  build:
    'node scripts/build-social-image.mjs && node --experimental-strip-types scripts/publication-release.mjs check && astro build && node --experimental-strip-types scripts/publication-release.mjs assemble',
  typecheck: 'astro check && tsc --noEmit',
  test: 'node --test scripts/site.test.mjs',
  'test:release': 'node --experimental-strip-types --test scripts/publication-release.test.mjs',
  'test:standalone':
    'pnpm build && wrangler deploy --dry-run --outdir tmp/website-worker-bundle && node scripts/test-standalone.mjs',
  'verify:launch': 'node scripts/verify-launch.mjs',
  'dev:worker': 'wrangler dev --local --host localhost --port 4325',
  'verify:public': 'node scripts/verify-public.mjs',
  'verify:social': 'node scripts/verify-social.mjs',
  deploy: 'pnpm build && wrangler deploy',
  'cf-types': 'wrangler types',
  'publication:import': 'node --experimental-strip-types scripts/publication-release.mjs import',
  'publication:export': 'node --experimental-strip-types scripts/export-publication.mjs',
};
await write('package.json', JSON.stringify(pkg, null, 2) + '\n');
await write(
  '.gitignore',
  (await readFile(join(app, '.gitignore'), 'utf8')) + '\ntmp/\n.env\n.env.*\n*.log\n',
);
console.log(
  'Exported standalone source to ' +
    target +
    '. No portal source, private content pack, portraits, credentials or database included.',
);
