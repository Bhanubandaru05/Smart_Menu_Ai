// Generate PNG favicons from SVG logo for MenuAI
// Run: node generate-favicons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  try {
    const svgPath = path.join(__dirname, 'public', 'menuai-logo.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    console.log('🔨 Generating favicon files from menuai-logo.svg...\n');

    // Generate 192x192 PNG
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, 'public', 'menuai-192.png'));
    console.log('✅ Generated menuai-192.png (192x192)');

    // Generate 512x512 PNG
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, 'public', 'menuai-512.png'));
    console.log('✅ Generated menuai-512.png (512x512)');

    // Generate 16x16 for favicon.ico
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(__dirname, 'public', 'favicon-16.png'));
    console.log('✅ Generated favicon-16.png (16x16)');

    // Generate 32x32 for favicon.ico
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, 'public', 'favicon-32.png'));
    console.log('✅ Generated favicon-32.png (32x32)');

    // Generate 48x48 for favicon.ico
    await sharp(svgBuffer)
      .resize(48, 48)
      .png()
      .toFile(path.join(__dirname, 'public', 'favicon-48.png'));
    console.log('✅ Generated favicon-48.png (48x48)');

    console.log('\n🎉 All PNG files generated successfully!');
    console.log('\n📝 Note: To create favicon.ico from PNG files, use:');
    console.log('   - Online tool: https://www.icoconverter.com/');
    console.log('   - Or ImageMagick: convert favicon-*.png favicon.ico');
    console.log('\nFiles created in public/ folder:');
    console.log('   ✓ menuai-192.png');
    console.log('   ✓ menuai-512.png');
    console.log('   ✓ favicon-16.png, favicon-32.png, favicon-48.png');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ Sharp package not installed\n');
      console.log('Install with:');
      console.log('   npm install --save-dev sharp');
      console.log('\nOr use online converter:');
      console.log('   https://cloudconvert.com/svg-to-png');
    } else {
      console.error('❌ Error:', error.message);
      console.log('\nAlternative: Use online converter at https://cloudconvert.com/svg-to-png');
    }
  }
}

generateFavicons();
