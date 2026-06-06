// generate-all-pages.js (Place this in your project ROOT, next to index.html)
// Run: node generate-all-pages.js
// Output: /country-pages/ AND /crisis-pages/ folders

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting ALL page generation (countries + crises)...');

// ============================================================================
// PART 1: COUNTRY PAGES
// ============================================================================

// Complete list of ALL countries with their correct ISO codes
const countries = [
  { code: 'AFG', name: 'Afghanistan' }, { code: 'ALB', name: 'Albania' }, { code: 'DZA', name: 'Algeria' },
  { code: 'AGO', name: 'Angola' }, { code: 'AND', name: 'Andorra' }, { code: 'ARG', name: 'Argentina' },
  { code: 'ARM', name: 'Armenia' }, { code: 'AUS', name: 'Australia' }, { code: 'AUT', name: 'Austria' },
  { code: 'AZE', name: 'Azerbaijan' }, { code: 'BGD', name: 'Bangladesh' }, { code: 'BLR', name: 'Belarus' },
  { code: 'BEL', name: 'Belgium' }, { code: 'BEN', name: 'Benin' }, { code: 'BTN', name: 'Bhutan' },
  { code: 'BOL', name: 'Bolivia' }, { code: 'BIH', name: 'Bosnia and Herzegovina' }, { code: 'BWA', name: 'Botswana' },
  { code: 'BRA', name: 'Brazil' }, { code: 'BRN', name: 'Brunei' }, { code: 'BGR', name: 'Bulgaria' },
  { code: 'BFA', name: 'Burkina Faso' }, { code: 'BDI', name: 'Burundi' }, { code: 'KHM', name: 'Cambodia' },
  { code: 'CMR', name: 'Cameroon' }, { code: 'CAN', name: 'Canada' }, { code: 'CPV', name: 'Cape Verde' },
  { code: 'CAF', name: 'Central African Republic' }, { code: 'TCD', name: 'Chad' }, { code: 'CHL', name: 'Chile' },
  { code: 'CHN', name: 'China' }, { code: 'COL', name: 'Colombia' }, { code: 'COM', name: 'Comoros' },
  { code: 'COG', name: 'Republic of Congo' }, { code: 'COD', name: 'DR Congo' }, { code: 'CRI', name: 'Costa Rica' },
  { code: 'CIV', name: "Côte d'Ivoire" }, { code: 'HRV', name: 'Croatia' }, { code: 'CUB', name: 'Cuba' },
  { code: 'CYP', name: 'Cyprus' }, { code: 'CZE', name: 'Czechia' }, { code: 'DNK', name: 'Denmark' },
  { code: 'DJI', name: 'Djibouti' }, { code: 'DMA', name: 'Dominica' }, { code: 'DOM', name: 'Dominican Republic' },
  { code: 'ECU', name: 'Ecuador' }, { code: 'EGY', name: 'Egypt' }, { code: 'SLV', name: 'El Salvador' },
  { code: 'GNQ', name: 'Equatorial Guinea' }, { code: 'ERI', name: 'Eritrea' }, { code: 'EST', name: 'Estonia' },
  { code: 'SWZ', name: 'Eswatini' }, { code: 'ETH', name: 'Ethiopia' }, { code: 'FJI', name: 'Fiji' },
  { code: 'FIN', name: 'Finland' }, { code: 'FRA', name: 'France' }, { code: 'GAB', name: 'Gabon' },
  { code: 'GMB', name: 'Gambia' }, { code: 'GEO', name: 'Georgia' }, { code: 'DEU', name: 'Germany' },
  { code: 'GHA', name: 'Ghana' }, { code: 'GRC', name: 'Greece' }, { code: 'GRD', name: 'Grenada' },
  { code: 'GRL', name: 'Greenland' }, { code: 'GTM', name: 'Guatemala' }, { code: 'GIN', name: 'Guinea' },
  { code: 'GNB', name: 'Guinea-Bissau' }, { code: 'GUY', name: 'Guyana' }, { code: 'HTI', name: 'Haiti' },
  { code: 'HND', name: 'Honduras' }, { code: 'HUN', name: 'Hungary' }, { code: 'ISL', name: 'Iceland' },
  { code: 'IND', name: 'India' }, { code: 'IDN', name: 'Indonesia' }, { code: 'IRN', name: 'Iran' },
  { code: 'IRQ', name: 'Iraq' }, { code: 'IRL', name: 'Ireland' }, { code: 'ISR', name: 'Israel' },
  { code: 'ITA', name: 'Italy' }, { code: 'JAM', name: 'Jamaica' }, { code: 'JPN', name: 'Japan' },
  { code: 'JOR', name: 'Jordan' }, { code: 'KAZ', name: 'Kazakhstan' }, { code: 'KEN', name: 'Kenya' },
  { code: 'KIR', name: 'Kiribati' }, { code: 'PRK', name: 'North Korea' }, { code: 'KOR', name: 'South Korea' },
  { code: 'KWT', name: 'Kuwait' }, { code: 'KGZ', name: 'Kyrgyzstan' }, { code: 'LAO', name: 'Laos' },
  { code: 'LVA', name: 'Latvia' }, { code: 'LBN', name: 'Lebanon' }, { code: 'LSO', name: 'Lesotho' },
  { code: 'LBR', name: 'Liberia' }, { code: 'LBY', name: 'Libya' }, { code: 'LIE', name: 'Liechtenstein' },
  { code: 'LTU', name: 'Lithuania' }, { code: 'LUX', name: 'Luxembourg' }, { code: 'MDG', name: 'Madagascar' },
  { code: 'MWI', name: 'Malawi' }, { code: 'MYS', name: 'Malaysia' }, { code: 'MDV', name: 'Maldives' },
  { code: 'MLI', name: 'Mali' }, { code: 'MLT', name: 'Malta' }, { code: 'MHL', name: 'Marshall Islands' },
  { code: 'MRT', name: 'Mauritania' }, { code: 'MUS', name: 'Mauritius' }, { code: 'MEX', name: 'Mexico' },
  { code: 'FSM', name: 'Micronesia' }, { code: 'MDA', name: 'Moldova' }, { code: 'MCO', name: 'Monaco' },
  { code: 'MNG', name: 'Mongolia' }, { code: 'MNE', name: 'Montenegro' }, { code: 'MAR', name: 'Morocco' },
  { code: 'MOZ', name: 'Mozambique' }, { code: 'MMR', name: 'Myanmar' }, { code: 'NAM', name: 'Namibia' },
  { code: 'NRU', name: 'Nauru' }, { code: 'NPL', name: 'Nepal' }, { code: 'NLD', name: 'Netherlands' },
  { code: 'NZL', name: 'New Zealand' }, { code: 'NIC', name: 'Nicaragua' }, { code: 'NER', name: 'Niger' },
  { code: 'NGA', name: 'Nigeria' }, { code: 'MKD', name: 'North Macedonia' }, { code: 'NOR', name: 'Norway' },
  { code: 'OMN', name: 'Oman' }, { code: 'PAK', name: 'Pakistan' }, { code: 'PLW', name: 'Palau' },
  { code: 'PSE', name: 'Palestine' }, { code: 'PAN', name: 'Panama' }, { code: 'PNG', name: 'Papua New Guinea' },
  { code: 'PRY', name: 'Paraguay' }, { code: 'PER', name: 'Peru' }, { code: 'PHL', name: 'Philippines' },
  { code: 'POL', name: 'Poland' }, { code: 'PRT', name: 'Portugal' }, { code: 'QAT', name: 'Qatar' },
  { code: 'ROU', name: 'Romania' }, { code: 'RUS', name: 'Russia' }, { code: 'RWA', name: 'Rwanda' },
  { code: 'KNA', name: 'Saint Kitts and Nevis' }, { code: 'LCA', name: 'Saint Lucia' },
  { code: 'VCT', name: 'Saint Vincent and the Grenadines' }, { code: 'WSM', name: 'Samoa' },
  { code: 'SMR', name: 'San Marino' }, { code: 'STP', name: 'Sao Tome and Principe' },
  { code: 'SAU', name: 'Saudi Arabia' }, { code: 'SEN', name: 'Senegal' }, { code: 'SRB', name: 'Serbia' },
  { code: 'SYC', name: 'Seychelles' }, { code: 'SLE', name: 'Sierra Leone' }, { code: 'SGP', name: 'Singapore' },
  { code: 'SVK', name: 'Slovakia' }, { code: 'SVN', name: 'Slovenia' }, { code: 'SLB', name: 'Solomon Islands' },
  { code: 'SOM', name: 'Somalia' }, { code: 'ZAF', name: 'South Africa' }, { code: 'SSD', name: 'South Sudan' },
  { code: 'ESP', name: 'Spain' }, { code: 'LKA', name: 'Sri Lanka' }, { code: 'SDN', name: 'Sudan' },
  { code: 'SUR', name: 'Suriname' }, { code: 'SWE', name: 'Sweden' }, { code: 'CHE', name: 'Switzerland' },
  { code: 'SYR', name: 'Syria' }, { code: 'TWN', name: 'Taiwan' }, { code: 'TJK', name: 'Tajikistan' },
  { code: 'TZA', name: 'Tanzania' }, { code: 'THA', name: 'Thailand' }, { code: 'TLS', name: 'Timor-Leste' },
  { code: 'TGO', name: 'Togo' }, { code: 'TON', name: 'Tonga' }, { code: 'TTO', name: 'Trinidad and Tobago' },
  { code: 'TUN', name: 'Tunisia' }, { code: 'TUR', name: 'Turkey' }, { code: 'TKM', name: 'Turkmenistan' },
  { code: 'TUV', name: 'Tuvalu' }, { code: 'UGA', name: 'Uganda' }, { code: 'UKR', name: 'Ukraine' },
  { code: 'ARE', name: 'United Arab Emirates' }, { code: 'GBR', name: 'United Kingdom' },
  { code: 'USA', name: 'United States' }, { code: 'URY', name: 'Uruguay' }, { code: 'UZB', name: 'Uzbekistan' },
  { code: 'VUT', name: 'Vanuatu' }, { code: 'VAT', name: 'Vatican City' }, { code: 'VEN', name: 'Venezuela' },
  { code: 'VNM', name: 'Vietnam' }, { code: 'YEM', name: 'Yemen' }, { code: 'ZMB', name: 'Zambia' },
  { code: 'ZWE', name: 'Zimbabwe' }, { code: 'ATG', name: 'Antigua and Barbuda' }, { code: 'BHS', name: 'Bahamas' },
  { code: 'BRB', name: 'Barbados' }, { code: 'BLZ', name: 'Belize' }, { code: 'XKX', name: 'Kosovo' },
  { code: 'COK', name: 'Cook Islands' }, { code: 'ESH', name: 'Western Sahara' }, { code: 'HKG', name: 'Hong Kong' },
  { code: 'MAC', name: 'Macau' }, { code: 'BHR', name: 'Bahrain' },
];

// Deduplicate by code
const seen = new Set();
const uniqueCountries = countries.filter(c => {
  if (seen.has(c.code)) return false;
  seen.add(c.code);
  return true;
});

// Create country-pages folder
const countryOutputDir = path.join(__dirname, 'country-pages');
if (!fs.existsSync(countryOutputDir)) fs.mkdirSync(countryOutputDir, { recursive: true });

const countrySitemapUrls = [];
let countryCount = 0;

uniqueCountries.forEach(country => {
  const lowerCode = country.code.toLowerCase();
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${country.name} Crisis Report | Global Crisis Index</title>
  <meta name="description" content="Real-time crisis intelligence for ${country.name}. Live data from 40+ sources: earthquakes, conflicts, food security, disease outbreaks.">
  <meta http-equiv="refresh" content="0; url=/?country=${country.code}">
  <link rel="canonical" href="https://globalcrisisindex.com/country/${lowerCode}">
  <meta property="og:title" content="${country.name} Crisis Report">
  <meta property="og:description" content="Live crisis intelligence for ${country.name}">
  <meta property="og:url" content="https://globalcrisisindex.com/country/${lowerCode}">
  <meta name="twitter:card" content="summary">
</head>
<body>
  <p>Redirecting to <a href="/?country=${country.code}">${country.name} crisis report</a>...</p>
</body>
</html>`;

  fs.writeFileSync(path.join(countryOutputDir, `${lowerCode}.html`), html);
  countryCount++;

  countrySitemapUrls.push(`  <url>
    <loc>https://globalcrisisindex.com/country/${lowerCode}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);

  if (countryCount % 50 === 0) console.log(`📄 Generated ${countryCount} country pages...`);
});

// Country sitemap
const countrySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${countrySitemapUrls.join('\n')}
</urlset>`;
fs.writeFileSync(path.join(countryOutputDir, 'sitemap.xml'), countrySitemap);
console.log(`✅ Generated ${countryCount} country pages + sitemap.xml`);

// ============================================================================
// PART 2: CRISIS PAGES
// ============================================================================

console.log('\n🔧 Generating crisis pages...');

const CRISIS_TYPES = {
  CE:   { label: 'Complex Emergency',  icon: '⚔️' }, EQ:   { label: 'Earthquake', icon: '🌍' },
  FL:   { label: 'Flood', icon: '🌊' }, TC:   { label: 'Cyclone', icon: '🌀' },
  DR:   { label: 'Drought', icon: '🏜️' }, WF:   { label: 'Wildfire', icon: '🔥' },
  ST:   { label: 'Storm', icon: '⛈️' }, CW:   { label: 'Civil War', icon: '⚔️' },
  EP:   { label: 'Epidemic', icon: '🦠' }, VLC:  { label: 'Volcano', icon: '🌋' },
  LS:   { label: 'Landslide', icon: '⛰️' }, TSU:  { label: 'Tsunami', icon: '🌊' },
  REF:  { label: 'Refugee Crisis', icon: '🚶' }, FN:   { label: 'Famine', icon: '🍚' },
  HEAT: { label: 'Heatwave', icon: '🥵' },
};

const COUNTRY_CRISES = {
  PSE: ['CE','CW','REF','HEAT'], SOM: ['CE','CW','DR','FN','REF','HEAT'],
  SYR: ['CE','CW','REF','EP','HEAT'], YEM: ['CE','CW','FN','DR','REF'],
  AFG: ['CE','CW','DR','FN','REF'], UKR: ['CE','CW','REF','HEAT'],
  SSD: ['CE','CW','FL','FN','REF'], SDN: ['CE','CW','DR','FL','REF'],
  COD: ['CE','CW','EP','FL','REF'], HTI: ['CE','EQ','EP','ST','REF'],
  ETH: ['CE','CW','DR','FN','REF'], MMR: ['CE','CW','FL','REF','EP'],
  LBN: ['CE','REF','EP','HEAT'], NGA: ['CE','CW','FL','EP','REF'],
  PAK: ['FL','EQ','DR','REF','HEAT','LS'], IRQ: ['CE','CW','REF','HEAT'],
  IRN: ['EQ','DR','REF','HEAT','LS'], VEN: ['CE','REF','DR','HEAT'],
  COL: ['CE','CW','FL','REF','LS'], BGD: ['FL','TC','REF','EP','LS','HEAT'],
  IDN: ['EQ','TSU','VLC','FL','LS','TC','HEAT'], PHL: ['TC','FL','EQ','VLC','TSU','LS','HEAT'],
  JPN: ['EQ','TSU','TC','VLC','FL','HEAT'], CHL: ['EQ','VLC','TSU','WF','HEAT'],
  PER: ['EQ','FL','LS','VLC','TSU','HEAT'], MEX: ['EQ','ST','VLC','FL','TSU','HEAT'],
  USA: ['WF','ST','EQ','TC','TSU','HEAT'], NZL: ['EQ','TSU','VLC','FL','HEAT'],
  ITA: ['EQ','VLC','WF','FL','TSU','HEAT'], GRC: ['EQ','VLC','WF','FL','HEAT','REF'],
  ISL: ['VLC','FL','ST','HEAT'], ECU: ['EQ','VLC','FL','TSU','HEAT'],
  PNG: ['EQ','TSU','VLC','FL','HEAT'], FJI: ['TC','TSU','FL','HEAT'],
  SLB: ['EQ','TSU','TC','HEAT'], NPL: ['EQ','LS','FL','HEAT'],
  TUR: ['EQ','FL','REF','CW','LS','HEAT'], IND: ['FL','TC','DR','EQ','HEAT','LS'],
  CHN: ['FL','EQ','TC','LS','TSU','HEAT'], RUS: ['WF','FL','CW','ST','HEAT'],
  BRA: ['FL','WF','DR','EP','LS','HEAT'], ZAF: ['DR','FL','EP','HEAT'],
  EGY: ['DR','REF','HEAT'], JOR: ['REF','DR','HEAT'], SAU: ['DR','ST','HEAT','REF'],
  KAZ: ['FL','DR','WF','HEAT'], ARG: ['FL','DR','ST','HEAT'], CAN: ['WF','FL','ST','HEAT'],
  AUS: ['WF','FL','TC','DR','HEAT'], FRA: ['WF','ST','HEAT'], DEU: ['FL','ST','HEAT'],
  GBR: ['ST','FL','HEAT'], ESP: ['WF','DR','ST','HEAT'], PRT: ['WF','FL','HEAT'],
  MOZ: ['TC','FL','HEAT'], KEN: ['DR','FL','EP','REF','HEAT'], TZA: ['FL','DR','EP','HEAT'],
  UGA: ['FL','EP','REF','LS'], MLI: ['CE','CW','DR','FN','REF','HEAT'],
  BFA: ['CE','CW','DR','EP','REF','HEAT'], NER: ['DR','FN','CE','HEAT','FL'],
  TCD: ['CE','CW','DR','REF','HEAT'], CAF: ['CE','CW','EP','FL','REF'],
  CMR: ['CE','CW','FL','EP','REF'], LBY: ['CE','CW','REF','HEAT'],
  DZA: ['DR','WF','HEAT','EP'], MAR: ['EQ','DR','HEAT','FL'], SEN: ['DR','FL','EP','HEAT'],
  GHA: ['FL','DR','EP','HEAT'], CIV: ['FL','EP','CE','HEAT'], VNM: ['FL','TC','DR','LS','HEAT','EP'],
  THA: ['FL','DR','HEAT','EP'], KHM: ['FL','DR','HEAT','EP'], LKA: ['FL','TC','DR','EP','HEAT'],
  VUT: ['TC','EQ','TSU','VLC','FL','HEAT'], TON: ['TC','TSU','FL','HEAT'], WSM: ['TC','TSU','FL','HEAT'],
};

const COUNTRY_NAMES = {
  PSE:'Palestine', SOM:'Somalia', SYR:'Syria', YEM:'Yemen', AFG:'Afghanistan', UKR:'Ukraine',
  SSD:'South Sudan', SDN:'Sudan', COD:'DR Congo', HTI:'Haiti', ETH:'Ethiopia', MMR:'Myanmar',
  LBN:'Lebanon', NGA:'Nigeria', PAK:'Pakistan', IRQ:'Iraq', IRN:'Iran', VEN:'Venezuela',
  COL:'Colombia', BGD:'Bangladesh', IDN:'Indonesia', PHL:'Philippines', JPN:'Japan',
  CHL:'Chile', PER:'Peru', MEX:'Mexico', USA:'United States', NZL:'New Zealand', ITA:'Italy',
  GRC:'Greece', ISL:'Iceland', ECU:'Ecuador', PNG:'Papua New Guinea', FJI:'Fiji', SLB:'Solomon Islands',
  NPL:'Nepal', TUR:'Turkey', IND:'India', CHN:'China', RUS:'Russia', BRA:'Brazil', ZAF:'South Africa',
  EGY:'Egypt', JOR:'Jordan', SAU:'Saudi Arabia', KAZ:'Kazakhstan', ARG:'Argentina', CAN:'Canada',
  AUS:'Australia', FRA:'France', DEU:'Germany', GBR:'United Kingdom', ESP:'Spain', PRT:'Portugal',
  MOZ:'Mozambique', KEN:'Kenya', TZA:'Tanzania', UGA:'Uganda', MLI:'Mali', BFA:'Burkina Faso',
  NER:'Niger', TCD:'Chad', CAF:'Central African Republic', CMR:'Cameroon', LBY:'Libya',
  DZA:'Algeria', MAR:'Morocco', SEN:'Senegal', GHA:'Ghana', CIV:"Côte d'Ivoire", VNM:'Vietnam',
  THA:'Thailand', KHM:'Cambodia', LKA:'Sri Lanka', VUT:'Vanuatu', TON:'Tonga', WSM:'Samoa',
};

const CRISIS_KEYWORDS = {
  CE: ['complex emergency', 'humanitarian crisis'], EQ: ['earthquake', 'seismic activity', 'quake'],
  FL: ['flood', 'flooding'], TC: ['cyclone', 'typhoon', 'hurricane'], DR: ['drought', 'water scarcity'],
  WF: ['wildfire', 'forest fire'], ST: ['storm', 'severe weather'], CW: ['civil war', 'armed conflict'],
  EP: ['epidemic', 'disease outbreak'], VLC: ['volcano', 'volcanic eruption'], LS: ['landslide', 'mudslide'],
  TSU: ['tsunami', 'tidal wave'], REF: ['refugee crisis', 'displacement'], FN: ['famine', 'food crisis', 'starvation'],
  HEAT: ['heatwave', 'extreme heat'],
};

function toSlug(countryName, crisisLabel) {
  return `${countryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crisisLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function generateCrisisPageHTML(iso, countryName, crisisCode, crisisInfo) {
  const slug = toSlug(countryName, crisisInfo.label);
  const keywords = CRISIS_KEYWORDS[crisisCode] || [crisisInfo.label.toLowerCase()];
  const primaryKeyword = `${countryName} ${crisisInfo.label.toLowerCase()}`;
  const allKeywords = [
    primaryKeyword, `${countryName} ${keywords[0]}`, `${countryName} crisis ${new Date().getFullYear()}`,
    `${countryName} humanitarian ${keywords[0]}`, ...keywords.map(k => `${countryName} ${k}`),
    `${keywords[0]} ${countryName}`, `live ${primaryKeyword} data`, `${primaryKeyword} map`,
  ].join(', ');

  const description = `Live real-time data on the ${countryName} ${crisisInfo.label.toLowerCase()} crisis. Track severity scores, affected populations, humanitarian needs and donate to verified relief organizations. Updated from 40+ live APIs.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${countryName} ${crisisInfo.label} Crisis ${new Date().getFullYear()} | Live Data | Global Crisis Index</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${allKeywords}">
  <link rel="canonical" href="https://globalcrisisindex.com/crisis/${slug}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${crisisInfo.icon} ${countryName} ${crisisInfo.label} Crisis — Live Severity Score">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://globalcrisisindex.com/crisis/${slug}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${crisisInfo.icon} ${countryName} ${crisisInfo.label} | Live Crisis Data">
  <meta name="twitter:description" content="${description}">
  <meta http-equiv="refresh" content="0; url=/?country=${iso}&crisis=${crisisCode}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${countryName} ${crisisInfo.label} Crisis — Live Severity Tracking",
    "description": "${description}",
    "url": "https://globalcrisisindex.com/crisis/${slug}",
    "dateModified": "${new Date().toISOString()}",
    "publisher": { "@type": "Organization", "name": "Global Crisis Index", "url": "https://globalcrisisindex.com" },
    "about": { "@type": "Event", "name": "${countryName} ${crisisInfo.label}", "location": { "@type": "Country", "name": "${countryName}" }, "eventStatus": "https://schema.org/EventScheduled" },
    "keywords": "${allKeywords}"
  }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #030b18; color: #ddeeff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 20px; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: clamp(22px, 5vw, 36px); font-weight: 900; margin-bottom: 10px; color: #fff; }
    .badge { display: inline-block; background: rgba(255,55,95,.15); border: 1px solid rgba(255,55,95,.35); color: #ff375f; border-radius: 40px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 14px; }
    p { color: #6a9ec0; font-size: 15px; line-height: 1.6; max-width: 520px; margin-bottom: 24px; }
    .spinner { width: 36px; height: 36px; border: 2px solid rgba(0,200,255,.1); border-top-color: #00c8ff; border-radius: 50%; animation: spin .7s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .redirect-note { font-size: 12px; color: #2e5878; }
    a { color: #00c8ff; text-decoration: none; }
  </style>
</head>
<body>
  <noscript>
    <h2>${crisisInfo.icon} ${countryName} ${crisisInfo.label} Crisis</h2>
    <p>${description}</p>
    <p><a href="/?country=${iso}&crisis=${crisisCode}">View live crisis data →</a></p>
  </noscript>
  <div class="icon">${crisisInfo.icon}</div>
  <div class="badge">LIVE CRISIS DATA</div>
  <h1>${countryName} ${crisisInfo.label}</h1>
  <p>${description}</p>
  <div class="spinner"></div>
  <p class="redirect-note">Loading live data from 40+ APIs…<br><a href="/?country=${iso}&crisis=${crisisCode}">Click here if not redirected</a></p>
</body>
</html>`;
}

// Create crisis-pages folder
const crisisOutputDir = path.join(__dirname, 'crisis-pages');
if (!fs.existsSync(crisisOutputDir)) fs.mkdirSync(crisisOutputDir, { recursive: true });

const crisisSitemapUrls = [];
const indexRows = [];
let crisisCount = 0;

for (const [iso, crisesArr] of Object.entries(COUNTRY_CRISES)) {
  const countryName = COUNTRY_NAMES[iso];
  if (!countryName) { console.warn(`⚠️ No name for ISO: ${iso} — skipping`); continue; }

  for (const crisisCode of crisesArr) {
    const crisisInfo = CRISIS_TYPES[crisisCode];
    if (!crisisInfo) continue;

    const slug = toSlug(countryName, crisisInfo.label);
    const html = generateCrisisPageHTML(iso, countryName, crisisCode, crisisInfo);
    fs.writeFileSync(path.join(crisisOutputDir, `${slug}.html`), html);
    crisisCount++;

    crisisSitemapUrls.push(`  <url>
    <loc>https://globalcrisisindex.com/crisis/${slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);

    indexRows.push({ slug, countryName, iso, crisisCode, label: crisisInfo.label, icon: crisisInfo.icon });

    if (crisisCount % 30 === 0) console.log(`📄 Generated ${crisisCount} crisis pages…`);
  }
}

// Crisis sitemap
const crisisSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${crisisSitemapUrls.join('\n')}
</urlset>`;
fs.writeFileSync(path.join(crisisOutputDir, 'sitemap.xml'), crisisSitemap);

// Crisis index page
const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>All Active Crisis Events | Global Crisis Index</title>
  <meta name="description" content="Browse all active global crisis events tracked in real time by the Global Crisis Index — earthquakes, floods, famines, civil wars, epidemics and more.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; background: #030b18; color: #ddeeff; padding: 40px 20px; max-width: 960px; margin: 0 auto; }
    h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
    p { color: #6a9ec0; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    a.card { display: block; background: rgba(255,255,255,.03); border: 1px solid rgba(0,200,255,.1); border-radius: 10px; padding: 12px 14px; text-decoration: none; color: inherit; }
    a.card:hover { background: rgba(0,200,255,.07); border-color: rgba(0,200,255,.3); }
    .card-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
    .card-meta { font-size: 11px; color: #6a9ec0; }
  </style>
</head>
<body>
  <h1>🌍 Active Crisis Events</h1>
  <p>${crisisCount} events tracked in real time · Updated ${new Date().toDateString()}</p>
  <div class="grid">
    ${indexRows.map(r => `<a class="card" href="/crisis/${r.slug}.html">
      <div class="card-title">${r.icon} ${r.countryName} — ${r.label}</div>
      <div class="card-meta">${r.iso} · /crisis/${r.slug}</div>
    </a>`).join('\n    ')}
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(crisisOutputDir, 'index.html'), indexHTML);

console.log(`✅ Generated ${crisisCount} crisis pages + sitemap.xml + index.html`);

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ ALL PAGES GENERATED SUCCESSFULLY!                         ║
╠═══════════════════════════════════════════════════════════════╣
║  📁 country-pages/  → ${countryCount} HTML files + sitemap.xml      ║
║  📁 crisis-pages/   → ${crisisCount} HTML files + sitemap.xml + index.html ║
╠═══════════════════════════════════════════════════════════════╣
║  🌍 Example: /country/usa.html → ?country=USA                 ║
║  🔥 Example: /crisis/yemen-famine.html → ?country=YEM&crisis=FN ║
╠═══════════════════════════════════════════════════════════════╣
║  📤 Deploy these folders to your web root                     ║
║  🔗 Add both sitemaps to Google Search Console                ║
╚═══════════════════════════════════════════════════════════════╝
`);
