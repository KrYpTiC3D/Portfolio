const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imageDir = './assets';

// Recursively find all images
function findImages(dir, ext = ['.png', '.jpg', '.jpeg']) {
  let images = [];
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      images = images.concat(findImages(filePath, ext));
    } else if (ext.some(e => file.toLowerCase().endsWith(e))) {
      images.push(filePath);
    }
  });
  return images;
}

async function convertToWebP() {
  const images = findImages(imageDir);
  console.log(`Found ${images.length} images to convert\n`);
  
  for (const imagePath of images) {
    const ext = path.extname(imagePath);
    // Skip SVG files
    if (ext.toLowerCase() === '.svg') {
      console.log(`Skipping SVG: ${imagePath}`);
      continue;
    }

    const webpPath = imagePath.replace(/\.[^/.]+$/, '.webp');
    
    try {
      await sharp(imagePath)
        .webp({ quality: 80 })
        .toFile(webpPath);
      console.log(`✓ Converted: ${imagePath} → ${webpPath}`);
    } catch (error) {
      console.error(`✗ Error converting ${imagePath}:`, error.message);
    }
  }
  
  console.log('\nConversion complete!');
}

convertToWebP();
