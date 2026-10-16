import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const app = resolve(import.meta.dirname, '..');
await mkdir(resolve(app, 'public/social'), { recursive: true });
// Keep the approved portal logo intact, with room for social-card cropping.
const logo = await sharp(resolve(app, 'src/assets/nma-ogun-logo.png'))
  .resize(1050, 520, { fit: 'inside' })
  .png()
  .toBuffer();
const metadata = await sharp(logo).metadata();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#ffffff' } })
  .composite([
    {
      input: logo,
      left: Math.round((1200 - metadata.width) / 2),
      top: Math.round((630 - metadata.height) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(resolve(app, 'public/social/nma-ogun-share.png'));
console.log('Created 1200×630 PNG social card from the approved NMA Ogun portal logo.');
