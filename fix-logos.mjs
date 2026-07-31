import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = 'C:\\Users\\DELL\\bagback-download\\apps\\web\\public';
const srcDir = 'D:\\لوجوهات\\BAGBACK DON';

async function removeWhiteBackground(inputPath, outputPath) {
  try {
    const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
    
    // Process pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      // If pixel is near white, make it transparent
      if (r > 240 && g > 240 && b > 240) {
        data[i+3] = 0; // alpha = 0
      } else if (r > 200 && g > 200 && b > 200) {
        // Semi-transparent for antialiased edges
        const avg = (r+g+b)/3;
        const alpha = Math.max(0, 255 - (avg - 200) * 4); // simplistic feathering
        data[i+3] = Math.min(data[i+3], alpha);
      }
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(outputPath);
    console.log(`Processed ${path.basename(outputPath)}`);
  } catch (err) {
    console.error('Error processing:', inputPath, err);
  }
}

async function main() {
  await removeWhiteBackground(path.join(srcDir, 'logo-landscape.png'), path.join(publicDir, 'logo-landscape.png'));
  await removeWhiteBackground(path.join(srcDir, 'apple-icon.png'), path.join(publicDir, 'apple-icon.png'));
  
  // Re-generate other icons
  const appleIcon = path.join(publicDir, 'apple-icon.png');
  await sharp(appleIcon).resize(512, 512, { fit: 'contain' }).toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(appleIcon).resize(192, 192, { fit: 'contain' }).toFile(path.join(publicDir, 'logo-symbol.png'));
  
  console.log('All icons generated successfully!');
}

main();
