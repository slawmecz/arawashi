#!/usr/bin/env node
/**
 * Generates the static brand images in apps/web/public from the club logo:
 * - og-default.png (1200×630) — preview image when a page is shared on Facebook/Messenger;
 * - apple-touch-icon.png (180×180) and icon-512.png — home-screen icons.
 *
 * Run again after replacing the logo: `node scripts/generate-brand-images.mjs`.
 * Uses sharp, which Astro already installs for image optimisation.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// sharp is a dependency of astro (pnpm keeps it out of the web app's own node_modules).
const webRequire = createRequire(new URL('../apps/web/package.json', import.meta.url));
const astroRequire = createRequire(webRequire.resolve('astro/package.json'));
const sharp = astroRequire('sharp');

const root = new URL('../apps/web/', import.meta.url);
const logoPath = fileURLToPath(new URL('src/assets/logos/arawashi-logo.png', root));
const out = (name) => fileURLToPath(new URL(`public/${name}`, root));

/** The square logo cropped to its circular badge. */
async function roundLogo(size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`,
  );
  return sharp(logoPath)
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

const ogText = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="618" width="1200" height="12" fill="#c8102e"/>
  <text x="500" y="230" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700"
        letter-spacing="6" fill="#ff5a5f">KLUB KARATE WKF</text>
  <text x="500" y="320" font-family="Arial, Helvetica, sans-serif" font-size="86" font-weight="800"
        fill="#ffffff">ARAWASHI</text>
  <text x="500" y="400" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#ffffff"
        fill-opacity="0.85">Szacunek, dyscyplina, charakter</text>
  <text x="500" y="450" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#ffffff"
        fill-opacity="0.7">Gmina Siechnice</text>
</svg>`);

await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0b0b0d' } })
  .composite([
    { input: await roundLogo(380), left: 70, top: 125 },
    { input: ogText, left: 0, top: 0 },
  ])
  .png()
  .toFile(out('og-default.png'));

const square = async (size) =>
  sharp({ create: { width: size, height: size, channels: 3, background: '#0b0b0d' } }).composite([
    { input: await roundLogo(Math.round(size * 0.9)), gravity: 'center' },
  ]);

await (await square(180)).png().toFile(out('apple-touch-icon.png'));
await (await square(512)).png().toFile(out('icon-512.png'));
await (await square(64)).png().toFile(out('favicon.png'));

console.log('Generated og-default.png, apple-touch-icon.png, icon-512.png and favicon.png');
