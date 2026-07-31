import sharp from 'sharp';
import path from 'path';

const publicDir = 'C:\\Users\\DELL\\bagback-download\\apps\\web\\public';

async function generate() {
  const appleIcon = path.join(publicDir, 'apple-icon.png');
  await sharp(appleIcon).resize(512, 512, { fit: 'contain' }).toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(appleIcon).resize(192, 192, { fit: 'contain' }).toFile(path.join(publicDir, 'logo-symbol.png'));
  console.log('Icons resized successfully');
}
generate();
