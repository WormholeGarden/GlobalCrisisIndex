// generate-crisis-pages.js
// Place in your project ROOT, next to index.html and generate-country-pages.js
// Run: node generate-crisis-pages.js
// Output: /crisis-pages/ folder with one HTML file per crisis event

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting crisis page generation...');

// ============================================================================
// CRISIS EVENT DEFINITIONS
// Mirrors the ARC / CTYPES data in index.html.
// Each entry becomes:  /crisis/<slug>.html  →  /?crisis=<slug>
// ============================================================================

const CRISIS_TYPES = {
  CE:   { label: 'Complex Emergency',  icon: '⚔️' },
  EQ:   { label: 'Earthquake',         icon: '🌍' },
  FL:   { label: 'Flood',              icon: '🌊' },
  TC:   { label: 'Cyclone',            icon: '🌀' },
  DR:   { label: 'Drought',            icon: '🏜️' },
  WF:   { label: 'Wildfire',           icon: '🔥' },
  ST:   { label: 'Storm',              icon: '⛈️' },
  CW:   { label: 'Civil War',          icon: '⚔️' },
  EP:   { label: 'Epidemic',           icon: '🦠' },
  VLC:  { label: 'Volcano',            icon: '🌋' },
  LS:   { label: 'Landslide',          icon: '⛰️' },
  TSU:  { label: 'Tsunami',            icon: '🌊' },
  REF:  { label: 'Refugee Crisis',     icon: '🚶' },
  FN:   { label: 'Famine',             icon: '🍚' },
  HEAT: { label: 'Heatwave',           icon: '🥵' },
};

// country code → [crisis type codes]
const COUNTRY_CRISES = {
  PSE: ['CE','CW','REF','HEAT'],
  SOM: ['CE','CW','DR','FN','REF','HEAT'],
  SYR: ['CE','CW','REF','EP','HEAT'],
  YEM: ['CE','CW','FN','DR','REF'],
  AFG: ['CE','CW','DR','FN','REF'],
  UKR: ['CE','CW','REF','HEAT'],
  SSD: ['CE','CW','FL','FN','REF'],
  SDN: ['CE','CW','DR','FL','REF'],
  COD: ['CE','CW','EP','FL','REF'],
  HTI: ['CE','EQ','EP','ST','REF'],
  ETH: ['CE','CW','DR','FN','REF'],
  MMR: ['CE','CW','FL','REF','EP'],
  LBN: ['CE','REF','EP','HEAT'],
  NGA: ['CE','CW','FL','EP','REF'],
  PAK: ['FL','EQ','DR','REF','HEAT','LS'],
  IRQ: ['CE','CW','REF','HEAT'],
  IRN: ['EQ','DR','REF','HEAT','LS'],
  VEN: ['CE','REF','DR','HEAT'],
  COL: ['CE','CW','FL','REF','LS'],
  BGD: ['FL','TC','REF','EP','LS','HEAT'],
  IDN: ['EQ','TSU','VLC','FL','LS','TC','HEAT'],
  PHL: ['TC','FL','EQ','VLC','TSU','LS','HEAT'],
  JPN: ['EQ','TSU','TC','VLC','FL','HEAT'],
  CHL: ['EQ','VLC','TSU','WF','HEAT'],
  PER: ['EQ','FL','LS','VLC','TSU','HEAT'],
  MEX: ['EQ','ST','VLC','FL','TSU','HEAT'],
  USA: ['WF','ST','EQ','TC','TSU','HEAT'],
  NZL: ['EQ','TSU','VLC','FL','HEAT'],
  ITA: ['EQ','VLC','WF','FL','TSU','HEAT'],
  GRC: ['EQ','VLC','WF','FL','HEAT','REF'],
  ISL: ['VLC','FL','ST','HEAT'],
  ECU: ['EQ','VLC','FL','TSU','HEAT'],
  PNG: ['EQ','TSU','VLC','FL','HEAT'],
  FJI: ['TC','TSU','FL','HEAT'],
  SLB: ['EQ','TSU','TC','HEAT'],
  NPL: ['EQ','LS','FL','HEAT'],
  TUR: ['EQ','FL','REF','CW','LS','HEAT'],
  IND: ['FL','TC','DR','EQ','HEAT','LS'],
  CHN: ['FL','EQ','TC','LS','TSU','HEAT'],
  RUS: ['WF','FL','CW','ST','HEAT'],
  BRA: ['FL','WF','DR','EP','LS','HEAT'],
  ZAF: ['DR','FL','EP','HEAT'],
  EGY: ['DR','REF','HEAT'],
  JOR: ['REF','DR','HEAT'],
  SAU: ['DR','ST','HEAT','REF'],
  KAZ: ['FL','DR','WF','HEAT'],
  ARG: ['FL','DR','ST','HEAT'],
  CAN: ['WF','FL','ST','HEAT'],
  AUS: ['WF','FL','TC','DR','HEAT'],
  FRA: ['WF','ST','HEAT'],
  DEU: ['FL','ST','HEAT'],
  GBR: ['ST','FL','HEAT'],
  ESP: ['WF','DR','ST','HEAT'],
  PRT: ['WF','FL','HEAT'],
  MOZ: ['TC','FL','HEAT'],
  KEN: ['DR','FL','EP','REF','HEAT'],
  TZA: ['FL','DR','EP','HEAT'],
  UGA: ['FL','EP','REF','LS'],
  ETH: ['CE','CW','DR','FN','REF'],
  MLI: ['CE','CW','DR','FN','REF','HEAT'],
  BFA: ['CE','CW','DR','EP','REF','HEAT'],
  NER: ['DR','FN','CE','HEAT','FL'],
  TCD: ['CE','CW','DR','REF','HEAT'],
  CAF: ['CE','CW','EP','FL','REF'],
  CMR: ['CE','CW','FL','EP','REF'],
  LBY: ['CE','CW','REF','HEAT'],
  DZA: ['DR','WF','HEAT','EP'],
  MAR: ['EQ','DR','HEAT','FL'],
  SDN: ['CE','CW','DR','FL','REF'],
  SEN: ['DR','FL','EP','HEAT'],
  GHA: ['FL','DR','EP','HEAT'],
  CIV: ['FL','EP','CE','HEAT'],
  VNM: ['FL','TC','DR','LS','HEAT','EP'],
  THA: ['FL','DR','HEAT','EP'],
  KHM: ['FL','DR','HEAT','EP'],
  BGD: ['FL','TC','REF','EP','LS','HEAT'],
  LKA: ['FL','TC','DR','EP','HEAT'],
  VUT: ['TC','EQ','TSU','VLC','FL','HEAT'],
  TON: ['TC','TSU','FL','HEAT'],
  WSM: ['TC','TSU','FL','HEAT'],
};

// country code → full display name
const COUNTRY_NAMES = {
  PSE:'Palestine', SOM:'Somalia', SYR:'Syria', YEM:'Yemen', AFG:'Afghanistan',
  UKR:'Ukraine', SSD:'South Sudan', SDN:'Sudan', COD:'DR Congo', HTI:'Haiti',
  ETH:'Ethiopia', MMR:'Myanmar', LBN:'Lebanon', NGA:'Nigeria', PAK:'Pakistan',
  IRQ:'Iraq', IRN:'Iran', VEN:'Venezuela', COL:'Colombia', BGD:'Bangladesh',
  IDN:'Indonesia', PHL:'Philippines', JPN:'Japan', CHL:'Chile', PER:'Peru',
  MEX:'Mexico', USA:'United States', NZL:'New Zealand', ITA:'Italy', GRC:'Greece',
  ISL:'Iceland', ECU:'Ecuador', PNG:'Papua New Guinea', FJI:'Fiji', SLB:'Solomon Islands',
  NPL:'Nepal', TUR:'Turkey', IND:'India', CHN:'China', RUS:'Russia', BRA:'Brazil',
  ZAF:'South Africa', EGY:'Egypt', JOR:'Jordan', SAU:'Saudi Arabia', KAZ:'Kazakhstan',
  ARG:'Argentina', CAN:'Canada', AUS:'Australia', FRA:'France', DEU:'Germany',
  GBR:'United Kingdom', ESP:'Spain', PRT:'Portugal', MOZ:'Mozambique', KEN:'Kenya',
  TZA:'Tanzania', UGA:'Uganda', MLI:'Mali', BFA:'Burkina Faso', NER:'Niger',
  TCD:'Chad', CAF:'Central African Republic', CMR:'Cameroon', LBY:'Libya',
  DZA:'Algeria', MAR:'Morocco', SEN:'Senegal', GHA:'Ghana', CIV:"Côte d'Ivoire",
  VNM:'Vietnam', THA:'Thailand', KHM:'Cambodia', LKA:'Sri Lanka',
  VUT:'Vanuatu', TON:'Tonga', WSM:'Samoa',
};

// ============================================================================
// SLUG HELPERS
// ============================================================================
function toSlug(countryName, crisisLabel) {
  return `${countryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crisisLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

// Human-readable search keywords for each crisis type
const CRISIS_KEYWORDS = {
  CE:   ['complex emergency', 'humanitarian crisis', 'armed conflict humanitarian'],
  EQ:   ['earthquake', 'seismic activity', 'quake', 'tremor'],
  FL:   ['flood', 'flooding', 'flash flood', 'inundation'],
  TC:   ['cyclone', 'typhoon', 'hurricane', 'tropical storm'],
  DR:   ['drought', 'water scarcity', 'dry season crisis'],
  WF:   ['wildfire', 'forest fire', 'bushfire'],
  ST:   ['storm', 'severe weather', 'extreme weather'],
  CW:   ['civil war', 'armed conflict', 'war', 'military conflict'],
  EP:   ['epidemic', 'disease outbreak', 'health emergency', 'cholera', 'dengue'],
  VLC:  ['volcano', 'volcanic eruption', 'lava'],
  LS:   ['landslide', 'mudslide', 'rockslide'],
  TSU:  ['tsunami', 'tidal wave'],
  REF:  ['refugee crisis', 'displacement', 'internally displaced', 'refugees'],
  FN:   ['famine', 'food crisis', 'starvation', 'food insecurity'],
  HEAT: ['heatwave', 'extreme heat', 'heat emergency'],
};

// ============================================================================
// PAGE GENERATOR
// ============================================================================
function generateCrisisPageHTML(iso, countryName, crisisCode, crisisInfo) {
  const slug = toSlug(countryName, crisisInfo.label);
  const keywords = CRISIS_KEYWORDS[crisisCode] || [crisisInfo.label.toLowerCase()];
  const primaryKeyword = `${countryName} ${crisisInfo.label.toLowerCase()}`;
  const allKeywords = [
    primaryKeyword,
    `${countryName} ${keywords[0]}`,
    `${countryName} crisis ${new Date().getFullYear()}`,
    `${countryName} humanitarian ${keywords[0]}`,
    ...keywords.map(k => `${countryName} ${k}`),
    `${keywords[0]} ${countryName}`,
    `live ${primaryKeyword} data`,
    `${primaryKeyword} map`,
    `${primaryKeyword} relief`,
    `${primaryKeyword} update`,
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

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${crisisInfo.icon} ${countryName} ${crisisInfo.label} Crisis — Live Severity Score">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://globalcrisisindex.com/crisis/${slug}">
  <meta property="og:site_name" content="Global Crisis Index">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${crisisInfo.icon} ${countryName} ${crisisInfo.label} | Live Crisis Data">
  <meta name="twitter:description" content="${description}">

  <!-- Redirect to app with crisis pre-selected -->
  <meta http-equiv="refresh" content="0; url=https://globalcrisisindex.com/?country=${iso}&crisis=${crisisCode}">

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${countryName} ${crisisInfo.label} Crisis — Live Severity Tracking",
    "description": "${description}",
    "url": "https://globalcrisisindex.com/crisis/${slug}",
    "dateModified": "${new Date().toISOString()}",
    "publisher": {
      "@type": "Organization",
      "name": "Global Crisis Index",
      "url": "https://globalcrisisindex.com"
    },
    "about": {
      "@type": "Event",
      "name": "${countryName} ${crisisInfo.label}",
      "location": {
        "@type": "Country",
        "name": "${countryName}"
      },
      "eventStatus": "https://schema.org/EventScheduled"
    },
    "keywords": "${allKeywords}"
  }
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #030b18;
      color: #ddeeff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: clamp(22px, 5vw, 36px); font-weight: 900; margin-bottom: 10px; color: #fff; }
    .badge {
      display: inline-block;
      background: rgba(255,55,95,.15);
      border: 1px solid rgba(255,55,95,.35);
      color: #ff375f;
      border-radius: 40px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    p { color: #6a9ec0; font-size: 15px; line-height: 1.6; max-width: 520px; margin-bottom: 24px; }
    .spinner {
      width: 36px; height: 36px;
      border: 2px solid rgba(0,200,255,.1);
      border-top-color: #00c8ff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .redirect-note { font-size: 12px; color: #2e5878; }
    a { color: #00c8ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <!-- SEO-readable content (crawled before JS redirect) -->
  <noscript>
    <h2>${crisisInfo.icon} ${countryName} ${crisisInfo.label} Crisis</h2>
    <p>${description}</p>
    <p><a href="https://globalcrisisindex.com/?country=${iso}&crisis=${crisisCode}">View live crisis data →</a></p>
  </noscript>

  <!-- Visible while redirecting -->
  <div class="icon">${crisisInfo.icon}</div>
  <div class="badge">LIVE CRISIS DATA</div>
  <h1>${countryName} ${crisisInfo.label}</h1>
  <p>${description}</p>
  <div class="spinner"></div>
  <p class="redirect-note">Loading live data from 40+ APIs…<br>
    <a href="https://globalcrisisindex.com/?country=${iso}&crisis=${crisisCode}">Click here if not redirected</a>
  </p>
</body>
</html>`;
}

// ============================================================================
// MAIN — build pages + sitemap
// ============================================================================
const outputDir = path.join(__dirname, 'crisis-pages');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created folder: ${outputDir}`);
}

const sitemapUrls = [];
const indexRows = [];
let generatedCount = 0;

for (const [iso, crisesArr] of Object.entries(COUNTRY_CRISES)) {
  const countryName = COUNTRY_NAMES[iso];
  if (!countryName) {
    console.warn(`⚠️  No name for ISO: ${iso} — skipping`);
    continue;
  }

  for (const crisisCode of crisesArr) {
    const crisisInfo = CRISIS_TYPES[crisisCode];
    if (!crisisInfo) continue;

    const slug = toSlug(countryName, crisisInfo.label);
    const html = generateCrisisPageHTML(iso, countryName, crisisCode, crisisInfo);

    const filePath = path.join(outputDir, `${slug}.html`);
    fs.writeFileSync(filePath, html);
    generatedCount++;

    sitemapUrls.push(`  <url>
    <loc>https://globalcrisisindex.com/crisis/${slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);

    indexRows.push({ slug, countryName, iso, crisisCode, label: crisisInfo.label, icon: crisisInfo.icon });

    if (generatedCount % 30 === 0) console.log(`📄 Generated ${generatedCount} pages…`);
  }
}

// ── Sitemap ──────────────────────────────────────────────────────────────────
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>`;

fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap);
console.log(`🗺️  sitemap.xml written with ${generatedCount} URLs`);

// ── Human-readable index page ─────────────────────────────────────────────────
const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>All Active Crisis Events | Global Crisis Index</title>
  <meta name="description" content="Browse all active global crisis events tracked in real time by the Global Crisis Index — earthquakes, floods, famines, civil wars, epidemics and more.">
  <link rel="canonical" href="https://globalcrisisindex.com/crisis/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; background: #030b18; color: #ddeeff; padding: 40px 20px; max-width: 960px; margin: 0 auto; }
    h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
    p  { color: #6a9ec0; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    a.card {
      display: block;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(0,200,255,.1);
      border-radius: 10px;
      padding: 12px 14px;
      text-decoration: none;
      color: inherit;
      transition: background .15s, border-color .15s;
    }
    a.card:hover { background: rgba(0,200,255,.07); border-color: rgba(0,200,255,.3); }
    .card-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
    .card-meta  { font-size: 11px; color: #6a9ec0; }
  </style>
</head>
<body>
  <h1>🌍 Active Crisis Events</h1>
  <p>${generatedCount} events tracked in real time · Updated ${new Date().toDateString()}</p>
  <div class="grid">
    ${indexRows.map(r => `<a class="card" href="/crisis/${r.slug}.html">
      <div class="card-title">${r.icon} ${r.countryName} — ${r.label}</div>
      <div class="card-meta">${r.iso} · /crisis/${r.slug}</div>
    </a>`).join('\n    ')}
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 'index.html'), indexHTML);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`
✅  Done!
   📄  ${generatedCount} crisis pages  →  ./crisis-pages/
   🗺️   sitemap.xml
   📋  index.html  (human-readable directory)

Next steps:
  1. Copy ./crisis-pages/ to your web root.
  2. Add /crisis-pages/sitemap.xml to your main sitemap index.
  3. In Netlify/Vercel/Nginx: route /crisis/:slug  →  /crisis-pages/:slug.html
  4. Pass ?crisis=EQ in the app URL so index.html can highlight the right event.
`);
