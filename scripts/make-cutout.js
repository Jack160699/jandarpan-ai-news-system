const sharp = require('sharp');
const fs = require('fs');

const imgPath = 'C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/50e7bc10-7e9a-4ba6-af91-1935a0e83997/newsroom_75pct_screen_1790278848181.jpg';

const width = 1376;
const height = 768;
const sx = 62;
const sy = 91;
const sw = 880;
const sh = 588;
const rx = 6;

const maskSvg = Buffer.from(`
<svg width="${width}" height="${height}">
  <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${rx}" fill="white" />
</svg>
`);

sharp(imgPath)
  .ensureAlpha()
  .composite([{
    input: maskSvg,
    blend: 'dest-out'
  }])
  .png({ quality: 90 })
  .toFile('public/jd-live/studio-plate-cutout.png')
  .then(() => {
    console.log('Successfully created public/jd-live/studio-plate-cutout.png');
    // Also save optimized JPEG of the full plate
    return sharp(imgPath)
      .jpeg({ quality: 92 })
      .toFile('public/jd-live/master-studio-v2.jpg');
  })
  .then(() => {
    console.log('Successfully created public/jd-live/master-studio-v2.jpg');
  })
  .catch(err => console.error(err));
