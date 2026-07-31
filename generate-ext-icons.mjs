import sharp from 'sharp';
import path from 'path';

const srcIcon = 'C:\\Users\\DELL\\bagback-download\\apps\\web\\public\\apple-icon.png';
const outDir = 'C:\\Users\\DELL\\bagback-download\\apps\\extension\\icons';

async function generate() {
  await sharp(srcIcon).resize(16, 16).toFile(path.join(outDir, 'icon-16.png'));
  await sharp(srcIcon).resize(48, 48).toFile(path.join(outDir, 'icon-48.png'));
  await sharp(srcIcon).resize(128, 128).toFile(path.join(outDir, 'icon-128.png'));
  console.log('Extension icons generated.');
}
generate();
