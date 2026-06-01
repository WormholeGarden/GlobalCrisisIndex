// generate-country-pages.js (Place this in your project ROOT, next to index.html)
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting country page generation...');

// List your main countries (Add all the countries you have data for!)
const countries = [
  { code: 'AFG', name: 'Afghanistan' }, { code: 'BRA', name: 'Brazil' },
  { code: 'CAN', name: 'Canada' }, { code: 'CHN', name: 'China' },
  { code: 'IND', name: 'India' }, { code: 'MEX', name: 'Mexico' },
  { code: 'RUS', name: 'Russia' }, { code: 'USA', name: 'United States' },
  { code: 'GBR', name: 'United Kingdom' }, { code: 'FRA', name: 'France' },
  { code: 'DEU', name: 'Germany' }, { code: 'JPN', name: 'Japan' },
  { code: 'AUS', name: 'Australia' }, { code: 'ZAF', name: 'South Africa' },
  { code: 'EGY', name: 'Egypt' }, { code: 'ISR', name: 'Israel' },
  { code: 'SAU', name: 'Saudi Arabia' }, { code: 'TUR', name: 'Turkey' },
  { code: 'UKR', name: 'Ukraine' }, { code: 'SYR', name: 'Syria' },
  { code: 'YEM', name: 'Yemen' }, { code: 'SOM', name: 'Somalia' },
  { code: 'PAK', name: 'Pakistan' }, { code: 'IRQ', name: 'Iraq' },
  { code: 'IRN', name: 'Iran' }, { code: 'LBN', name: 'Lebanon' },
  { code: 'JOR', name: 'Jordan' }, { code: 'KWT', name: 'Kuwait' }
];

// Define the output directory (relative to the script's location)
// This will create a 'country-pages' folder right next to your index.html
const outputDir = path.join(__dirname, 'country-pages');

// Create the directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created folder: ${outputDir}`);
}

let generatedCount = 0;
countries.forEach(country => {
  const lowerCode = country.code.toLowerCase();
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${country.name} Crisis Report | Global Crisis Index</title>
  <meta name="description" content="Real-time crisis intelligence for ${country.name}. Live data from 40+ sources.">
  <meta http-equiv="refresh" content="0; url=https://globalcrisisindex.com/#country=${country.code}">
  <link rel="canonical" href="https://globalcrisisindex.com/country/${lowerCode}">
</head>
<body>
  <p>Redirecting to <a href="https://globalcrisisindex.com/?country=${country.code}">${country.name} crisis report</a>...</p>
</body>
</html>`;
  
  const filePath = path.join(outputDir, `${lowerCode}.html`);
  fs.writeFileSync(filePath, html);
  generatedCount++;
  console.log(`✅ Created: ${lowerCode}.html`);
});

console.log(`🎉 SUCCESS! Generated ${generatedCount} country pages in the 'country-pages' folder.`);
