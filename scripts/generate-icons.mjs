/**
 * Generate platform icons from the single SVG source (`resources/icon.svg`).
 *
 * This script exists so releases are reproducible: we derive all platform icon
 * formats from the same vector source instead of editing binaries by hand.
 *
 * - macOS: .icns (requires `iconutil`, only available on macOS)
 * - Windows: .ico (via png-to-ico)
 * - Linux: PNG sizes in resources/icons/
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const resourcesDir = path.join(rootDir, 'resources');
const svgPath = path.join(resourcesDir, 'icon.svg');

// macOS .icns is built from an "iconset" folder with a fixed set of PNG sizes.
// We also reuse this set to derive the Linux PNG sizes so all platforms stay
// aligned on the same base dimensions.
const ICONSET_SIZES = [16, 32, 64, 128, 256, 512, 1024];

async function main() {
  // Dynamic import for sharp (ESM)
  const sharp = (await import('sharp')).default;

  const svgBuffer = await fs.readFile(svgPath);

  console.log('Generating PNGs from SVG...');

  // 1) Generate base 1024x1024 PNG
  const png1024Path = path.join(resourcesDir, 'icon.png');
  await sharp(svgBuffer).resize(1024, 1024).png().toFile(png1024Path);
  console.log('  → icon.png (1024x1024)');

  // 2) macOS .icns via iconutil (macOS only)
  if (process.platform === 'darwin') {
    console.log('Creating macOS .icns...');
    const iconsetDir = path.join(resourcesDir, 'icon.iconset');
    await fs.mkdir(iconsetDir, { recursive: true });

    // `iconutil` expects a very specific iconset layout and naming convention.
    // The "@2x" files are retina variants (double the pixel dimensions).
    const iconsetFiles = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' }
    ];

    for (const { size, name } of iconsetFiles) {
      const outPath = path.join(iconsetDir, name);
      await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    }

    // Run iconutil to create .icns
    const icnsPath = path.join(resourcesDir, 'icon.icns');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
    console.log('  → icon.icns');

    // Clean up iconset directory
    await fs.rm(iconsetDir, { recursive: true, force: true });
  } else {
    console.log('  (Skipping .icns generation - not on macOS)');
  }

  // 3) Windows .ico via png-to-ico
  console.log('Creating Windows .ico...');
  const pngToIco = (await import('png-to-ico')).default;

  // Create multi-size PNGs for ICO (256, 128, 64, 48, 32, 16)
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoPngs = [];

  for (const size of icoSizes) {
    const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    icoPngs.push(buf);
  }

  const icoBuffer = await pngToIco(icoPngs);
  const icoPath = path.join(resourcesDir, 'icon.ico');
  await fs.writeFile(icoPath, icoBuffer);
  console.log('  → icon.ico');

  // 4) Linux icon sizes (put in resources/icons/)
  console.log('Creating Linux PNGs...');
  const linuxIconsDir = path.join(resourcesDir, 'icons');
  await fs.mkdir(linuxIconsDir, { recursive: true });

  const linuxSizes = Array.from(
    new Set<number>([
      // Keep parity with the base iconset sizes (excluding 1024 which is not
      // commonly used as a desktop icon size on Linux).
      ...ICONSET_SIZES.filter((s) => s <= 512),
      // Also include common intermediate sizes expected by some Linux desktops.
      24,
      48
    ])
  ).sort((a, b) => a - b);
  for (const size of linuxSizes) {
    const outPath = path.join(linuxIconsDir, `${size}x${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
  }
  console.log('  → icons/*.png');

  console.log('Done!');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
