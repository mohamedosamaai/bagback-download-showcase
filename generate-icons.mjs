import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const publicDir = 'C:\\Users\\DELL\\bagback-download\\apps\\web\\public';
const appleIcon = path.join(publicDir, 'apple-icon.png');
const icon512 = path.join(publicDir, 'icon-512.png');
const logoSymbol = path.join(publicDir, 'logo-symbol.png');

async function generateIcons() {
  try {
    if (fs.existsSync(appleIcon)) {
      await sharp(appleIcon)
        .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toFile(icon512);
      console.log('Generated icon-512.png');

      await sharp(appleIcon)
        .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toFile(logoSymbol);
      console.log('Generated logo-symbol.png');
    } else {
      console.error('apple-icon.png not found');
    }
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generateIcons();
