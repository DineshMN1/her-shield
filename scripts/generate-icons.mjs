import sharp from '../node_modules/sharp/lib/index.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgBuffer = readFileSync(resolve(root, 'public/icons/icon.svg'));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(root, `public/icons/icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

// Maskable icon (slightly smaller content with padding)
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(resolve(root, 'public/icons/maskable-icon-512x512.png'));
console.log('✓ maskable-icon-512x512.png');

// Apple touch icon (180x180)
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(resolve(root, 'public/apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

console.log('\nAll icons generated!');
