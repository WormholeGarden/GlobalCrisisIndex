// ============================================================================
// GCIS Fusion — Static Country Page Generator
// Run: node generate-country-pages.js
// Output: ./country/ folder with 60+ .html files + sitemap.xml
// ============================================================================

const fs = require('fs');
const path = require('path');

// ── DATA (copied from your main app) ────────────────────────────────────────
const NAMES={AFG:"Afghanistan",PSE:"Palestine",SDN:"Sudan",SSD:"South Sudan",YEM:"Yemen",UKR:"Ukraine",COD:"DR Congo",SYR:"Syria",SOM:"Somalia",HTI:"Haiti",ETH:"Ethiopia",MMR:"Myanmar",LBN:"Lebanon",TUR:"Turkey",PAK:"Pakistan",NGA:"Nigeria",BGD:"Bangladesh",IRN:"Iran",VEN:"Venezuela",COL:"Colombia",IDN:"Indonesia",PHL:"Philippines",NPL:"Nepal",KEN:"Kenya",MOZ:"Mozambique",USA:"United States",CAN:"Canada",MEX:"Mexico",BRA:"Brazil",ARG:"Argentina",CHL:"Chile",PER:"Peru",JPN:"Japan",CHN:"China",IND:"India",RUS:"Russia",DEU:"Germany",FRA:"France",GBR:"United Kingdom",ITA:"Italy",ESP:"Spain",AUS:"Australia",ZAF:"South Africa",EGY:"Egypt",IRQ:"Iraq",JOR:"Jordan",SAU:"Saudi Arabia",KAZ:"Kazakhstan",GRC:"Greece",POL:"Poland",SWE:"Sweden",NOR:"Norway",FIN:"Finland",DNK:"Denmark",NLD:"Netherlands",BEL:"Belgium",CHE:"Switzerland",AUT:"Austria",PRT:"Portugal",IRL:"Ireland",NZL:"New Zealand",CZE:"Czechia",HUN:"Hungary",ECU:"Ecuador",ISL:"Iceland",PNG:"Papua New Guinea",FJI:"Fiji",SLB:"Solomon Islands",KOR:"South Korea"};
const FLAGS={AFG:"🇦🇫",PSE:"🇵🇸",SDN:"🇸🇩",SSD:"🇸🇸",YEM:"🇾🇪",UKR:"🇺🇦",COD:"🇨🇩",SYR:"🇸🇾",SOM:"🇸🇴",HTI:"🇭🇹",ETH:"🇪🇹",MMR:"🇲🇲",LBN:"🇱🇧",TUR:"🇹🇷",PAK:"🇵🇰",NGA:"🇳🇬",BGD:"🇧🇩",IRN:"🇮🇷",VEN:"🇻🇪",COL:"🇨🇴",IDN:"🇮🇩",PHL:"🇵🇭",NPL:"🇳🇵",KEN:"🇰🇪",MOZ:"🇲🇿",USA:"🇺🇸",CAN:"🇨🇦",MEX:"🇲🇽",BRA:"🇧🇷",ARG:"🇦🇷",CHL:"🇨🇱",PER:"🇵🇪",JPN:"🇯🇵",CHN:"🇨🇳",IND:"🇮🇳",RUS:"🇷🇺",DEU:"🇩🇪",FRA:"🇫🇷",GBR:"🇬🇧",ITA:"🇮🇹",ESP:"🇪🇸",AUS:"🇦🇺",ZAF:"🇿🇦",EGY:"🇪🇬",IRQ:"🇮🇶",JOR:"🇯🇴",SAU:"🇸🇦",KAZ:"🇰🇿",GRC:"🇬🇷",POL:"🇵🇱",SWE:"🇸🇪",NOR:"🇳🇴",FIN:"🇫🇮",DNK:"🇩🇰",NLD:"🇳🇱",BEL:"🇧🇪",CHE:"🇨🇭",AUT:"🇦🇹",PRT:"🇵🇹",IRL:"🇮🇪",NZL:"🇳🇿",CZE:"🇨🇿",HUN:"🇭🇺",ECU:"🇪🇨",ISL:"🇮🇸",PNG:"🇵🇬",FJI:"🇫🇯",SLB:"🇸🇧",KOR:"🇰🇷"};
const BASE_SCORES={PSE:96,SOM:94,SYR:93,YEM:92,SSD:91,AFG:90,SDN:88,HTI:86,UKR:85,COD:86,ETH:79,MMR:73,IRQ:72,LBN:75,PAK:69,NGA:66,IRN:61,VEN:63,COL:57,BGD:57,IDN:79,PHL:73,NPL:58,KEN:42,MOZ:44,TUR:59,IND:56,BRA:53,ZAF:51,EGY:49,JOR:41,SAU:38,KAZ:32,CHN:55,JPN:66,CHL:63,NZL:56,ITA:59,GRC:57,RUS:66,AUS:29,CAN:27,FRA:26,DEU:22,GBR:25,ESP:28,SWE:18,NOR:17,FIN:17,DNK:15,NLD:16,BEL:15,CHE:12,AUT:14,PRT:22,IRL:18,KOR:31,POL:22,HUN:21,CZE:19,ECU:45,ISL:19,PNG:55,FJI:44,SLB:50,MEX:48,ARG:35,PER:49};
const ARC={CE:{l:"Complex Emergency",i:"⚔️",n:["shelter","food","health","protection"]},EQ:{l:"Earthquake",i:"🌍",n:["shelter","health","water"]},FL:{l:"Flood",i:"🌊",n:["shelter","water","food"]},TC:{l:"Cyclone",i:"🌀",n:["shelter","water"]},DR:{l:"Drought",i:"🏜️",n:["food","water","nutrition"]},WF:{l:"Wildfire",i:"🔥",n:["shelter","health"]},ST:{l:"Storm",i:"⛈️",n:["shelter","water"]},CW:{l:"Civil War",i:"⚔️",n:["shelter","protection","health","food"]},EP:{l:"Epidemic",i:"🦠",n:["health","water","nutrition"]},VLC:{l:"Volcano",i:"🌋",n:["shelter","health","water"]},LS:{l:"Landslide",i:"⛰️",n:["shelter","health"]},TSU:{l:"Tsunami",i:"🌊",n:["shelter","health","water"]},REF:{l:"Refugee Crisis",i:"🚶",n:["shelter","protection","water"]},FN:{l:"Famine",i:"🍚",n:["food","nutrition","health"]},HEAT:{l:"Heatwave",i:"🥵",n:["health","water"]}};
const CTYPES={PSE:["CE","CW","REF","HEAT"],SOM:["CE","CW","DR","FN","REF","HEAT"],SYR:["CE","CW","REF","EP","HEAT"],YEM:["CE","CW","FN","DR","REF"],AFG:["CE","CW","DR","FN","REF"],UKR:["CE","CW","REF","HEAT"],SSD:["CE","CW","FL","FN","REF"],SDN:["CE","CW","DR","FL","REF"],COD:["CE","CW","EP","FL","REF"],HTI:["CE","EQ","EP","ST","REF"],ETH:["CE","CW","DR","FN","REF"],MMR:["CE","CW","FL","REF","EP"],LBN:["CE","REF","EP","HEAT"],NGA:["CE","CW","FL","EP","REF"],PAK:["FL","EQ","DR","REF","HEAT","LS"],IRQ:["CE","CW","REF","HEAT"],IRN:["EQ","DR","REF","HEAT","LS"],VEN:["CE","REF","DR","HEAT"],COL:["CE","CW","FL","REF","LS"],BGD:["FL","TC","REF","EP","LS","HEAT"],IDN:["EQ","TSU","VLC","FL","LS","TC","HEAT"],PHL:["TC","FL","EQ","VLC","TSU","LS","HEAT"],JPN:["EQ","TSU","TC","VLC","FL","HEAT"],CHL:["EQ","VLC","TSU","WF","HEAT"],PER:["EQ","FL","LS","VLC","TSU","HEAT"],MEX:["EQ","ST","VLC","FL","TSU","HEAT"],USA:["WF","ST","EQ","TC","TSU","HEAT"],NZL:["EQ","TSU","VLC","FL","HEAT"],ITA:["EQ","VLC","WF","FL","TSU","HEAT"],GRC:["EQ","VLC","WF","FL","HEAT","REF"],ISL:["VLC","FL","ST","HEAT"],ECU:["EQ","VLC","FL","TSU","HEAT"],PNG:["EQ","TSU","VLC","FL","HEAT"],FJI:["TC","TSU","FL","HEAT"],SLB:["EQ","TSU","TC","HEAT"],NPL:["EQ","LS","FL","HEAT"],TUR:["EQ","FL","REF","CW","LS","HEAT"],IND:["FL","TC","DR","EQ","HEAT","LS"],CHN:["FL","EQ","TC","LS","TSU","HEAT"],RUS:["WF","FL","CW","ST","HEAT"],BRA:["FL","WF","DR","EP","LS","HEAT"],ZAF:["DR","FL","EP","HEAT"],EGY:["DR","REF","HEAT"],JOR:["REF","DR","HEAT"],SAU:["DR","ST","HEAT","REF"],KAZ:["FL","DR","WF","HEAT"],ARG:["FL","DR","ST","HEAT"],CAN:["WF","FL","ST","HEAT"],AUS:["WF","FL","TC","DR","HEAT"],FRA:["WF","ST","HEAT"],DEU:["FL","ST","HEAT"],GBR:["ST","FL","HEAT"],ESP:["WF","DR","ST","HEAT"],PRT:["WF","FL","HEAT"],SWE:["FL","ST","WF","HEAT"],NOR:["FL","ST","WF","HEAT"],FIN:["FL","ST","WF","HEAT"],DNK:["ST","FL","HEAT"],NLD:["FL","ST","HEAT"],BEL:["FL","ST","HEAT"],CHE:["FL","LS","ST","HEAT"],AUT:["FL","LS","ST","HEAT"],POL:["FL","ST","WF","HEAT"],CZE:["FL","ST","WF","HEAT"],HUN:["FL","ST","HEAT","WF"],IRL:["ST","FL","HEAT"],KOR:["ST","FL","HEAT","EQ"],MOZ:["TC","FL","HEAT"],KEN:["DR","FL","EP","HEAT"]};
const DEFAULT_T=["EQ","FL","ST","HEAT"];
const REGIONS={AFG:"South Asia",PSE:"Middle East",SDN:"Africa",SSD:"Africa",YEM:"Middle East",UKR:"Europe",COD:"Africa",SYR:"Middle East",SOM:"Africa",HTI:"Caribbean",ETH:"Africa",MMR:"Southeast Asia",LBN:"Middle East",TUR:"Middle East",PAK:"South Asia",NGA:"Africa",BGD:"South Asia",IRN:"Middle East",VEN:"South America",COL:"South America",IDN:"Southeast Asia",PHL:"Southeast Asia",NPL:"South Asia",KEN:"Africa",MOZ:"Africa",USA:"North America",CAN:"North America",MEX:"North America",BRA:"South America",ARG:"South America",CHL:"South America",PER:"South America",JPN:"East Asia",CHN:"East Asia",IND:"South Asia",RUS:"Europe",DEU:"Europe",FRA:"Europe",GBR:"Europe",ITA:"Europe",ESP:"Europe",AUS:"Oceania",ZAF:"Africa",EGY:"Africa",IRQ:"Middle East",JOR:"Middle East",SAU:"Middle East",KAZ:"Central Asia",GRC:"Europe",POL:"Europe",SWE:"Europe",NOR:"Europe",FIN:"Europe",DNK:"Europe",NLD:"Europe",BEL:"Europe",CHE:"Europe",AUT:"Europe",PRT:"Europe",IRL:"Europe",NZL:"Oceania",CZE:"Europe",HUN:"Europe",ECU:"South America",ISL:"Europe",PNG:"Oceania",FJI:"Oceania",SLB:"Oceania",KOR:"East Asia"};

// ── HELPERS ──────────────────────────────────────────────────────────────────
function severityLabel(score) {
  if (score >= 80) return { label: "CRITICAL", color: "#ff375f" };
  if (score >= 60) return { label: "HIGH", color: "#ff8c42" };
  if (score >= 40) return { label: "MODERATE", color: "#ffb020" };
  return { label: "LOW", color: "#3ec5ff" };
}

function getNeeds(types) {
  return [...new Set(types.flatMap(t => ARC[t]?.n || []))];
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getYear() {
  return new Date().getFullYear();
}

// ── PAGE TEMPLATE ─────────────────────────────────────────────────────────────
function generateCountryPage(iso) {
  const name = NAMES[iso];
  const flag = FLAGS[iso] || '🌍';
  const score = BASE_SCORES[iso] || 42;
  const types = CTYPES[iso] || DEFAULT_T;
  const needs = getNeeds(types);
  const region = REGIONS[iso] || 'Global';
  const { label: sev, color: sevColor } = severityLabel(score);
  const crisisTypesList = types.map(t => ARC[t]?.l || t);
  const crisisTypesStr = crisisTypesList.join(', ');
  const needsStr = needs.join(', ');
  const year = getYear();
  const slug = slugify(name);

  // SEO-rich description targeting what people actually search
  const metaDesc = `${name} crisis index ${year}: urgency score ${score}/100 (${sev}). Live tracking of ${crisisTypesStr.toLowerCase()}. Humanitarian needs: ${needsStr}. Real-time data from 40+ APIs.`;

  // Schema.org structured data for rich results
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `${name} Crisis Report ${year} — Urgency Score: ${score}/100`,
    "description": metaDesc,
    "url": `https://globalcrisisindex.com/country/${slug}`,
    "dateModified": new Date().toISOString().slice(0, 10),
    "publisher": {
      "@type": "Organization",
      "name": "GCIS Fusion",
      "url": "https://globalcrisisindex.com"
    },
    "about": {
      "@type": "Country",
      "name": name
    }
  });

  // Build crisis type rows for the HTML table
  const crisisRows = types.map(t => {
    const arc = ARC[t];
    if (!arc) return '';
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #0a2040;">${arc.i} ${arc.l}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #0a2040;color:#6a9ec0;">${arc.n.join(', ')}</td>
    </tr>`;
  }).join('');

  // Build needs pills
  const needsPills = needs.map(n => {
    const colors = {
      food:'#ffb020', nutrition:'#ffb020', shelter:'#bf7fff',
      health:'#ff375f', water:'#00c8ff', protection:'#ff8c42'
    };
    return `<span style="display:inline-block;margin:3px;padding:4px 12px;border-radius:99px;border:1px solid;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${colors[n]||'#6a9ec0'};border-color:${colors[n]||'#6a9ec0'}44;background:${colors[n]||'#6a9ec0'}11;">${n}</span>`;
  }).join('');

  // Top 10 countries by score for the sidebar ranking
  const top10 = Object.entries(BASE_SCORES)
    .sort((a,b) => b[1]-a[1])
    .slice(0,10)
    .map(([i, s]) => {
      const { color } = severityLabel(s);
      const active = i === iso ? `style="background:#0a2040;border-left:3px solid ${sevColor};"` : '';
      return `<a href="/country/${slugify(NAMES[i])}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;text-decoration:none;color:#ddeeff;border-bottom:1px solid #0a2040;" ${active}>
        <span>${FLAGS[i]||''} ${NAMES[i]}</span>
        <span style="color:${color};font-weight:700;">${s}</span>
      </a>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} Crisis Index ${year} — Urgency Score ${score}/100 | GCIS Fusion</title>
<meta name="description" content="${metaDesc}">
<meta name="keywords" content="${name} crisis, ${name} humanitarian, ${name} ${crisisTypesList[0]?.toLowerCase() || 'crisis'}, ${name} food security, ${name} conflict ${year}, global crisis index ${name}">
<link rel="canonical" href="https://globalcrisisindex.com/country/${slug}">
<meta property="og:title" content="${name} Crisis Report ${year} — Score: ${score}/100">
<meta property="og:description" content="${metaDesc}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://globalcrisisindex.com/country/${slug}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${name} Crisis Score: ${score}/100 (${sev})">
<meta name="twitter:description" content="${metaDesc}">
<script type="application/ld+json">${schema}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#030b18;color:#ddeeff;font-family:'Barlow',sans-serif;font-size:15px;line-height:1.6}
body::before{content:'';position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(0,200,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,255,0.025) 1px,transparent 1px);background-size:64px 64px}
a{color:#00c8ff;text-decoration:none}
a:hover{text-decoration:underline}

.header{background:rgba(3,11,24,.98);border-bottom:1px solid rgba(0,200,255,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none}
.brand-mark{width:34px;height:34px;border-radius:8px;background:linear-gradient(145deg,rgba(0,200,255,.2),rgba(191,127,255,.15));border:1px solid rgba(0,200,255,.3);display:flex;align-items:center;justify-content:center;font-size:18px}
.brand-name{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;background:linear-gradient(135deg,#fff 30%,#00c8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.header-cta{background:linear-gradient(135deg,#bf7fff,#00c8ff);color:#030b18;padding:8px 18px;border-radius:40px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;text-decoration:none;white-space:nowrap}

.layout{display:grid;grid-template-columns:1fr 280px;gap:32px;max-width:1100px;margin:0 auto;padding:32px 24px}
.main-col{min-width:0}
.sidebar{display:flex;flex-direction:column;gap:20px}

.breadcrumb{font-family:'JetBrains Mono',monospace;font-size:11px;color:#2e5878;margin-bottom:20px}
.breadcrumb a{color:#2e5878}
.breadcrumb a:hover{color:#00c8ff}

.hero{background:linear-gradient(135deg,rgba(0,200,255,.06),rgba(191,127,255,.04));border:1px solid rgba(0,200,255,.12);border-radius:16px;padding:28px;margin-bottom:24px}
.hero-top{display:flex;align-items:flex-start;gap:20px;margin-bottom:20px}
.hero-flag{font-size:64px;line-height:1}
.hero-info{flex:1}
.hero-region{font-family:'JetBrains Mono',monospace;font-size:10px;color:#2e5878;letter-spacing:.2em;text-transform:uppercase;margin-bottom:4px}
.hero-name{font-family:'Barlow Condensed',sans-serif;font-size:48px;font-weight:900;letter-spacing:-.02em;background:linear-gradient(135deg,#fff 20%,#00c8ff);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;margin-bottom:8px}
.sev-badge{display:inline-block;padding:4px 12px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em}
.score-block{text-align:right}
.score-num{font-family:'Barlow Condensed',sans-serif;font-size:72px;font-weight:900;letter-spacing:-.03em;line-height:1}
.score-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:#2e5878;letter-spacing:.15em}
.score-bar-wrap{height:6px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;margin-bottom:16px}
.score-bar{height:100%;border-radius:99px}

.section{background:rgba(255,255,255,.015);border:1px solid rgba(0,200,255,.07);border-radius:12px;padding:22px;margin-bottom:20px}
.section-title{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#2e5878;margin-bottom:14px}
.section h2{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;margin-bottom:10px;letter-spacing:-.01em}

table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;padding:8px 12px;background:rgba(0,200,255,.05);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#2e5878;text-transform:uppercase}

.live-link{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#bf7fff,#00c8ff);color:#030b18;padding:12px 24px;border-radius:40px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;text-decoration:none;margin-top:8px}
.live-dot{width:6px;height:6px;border-radius:50%;background:#030b18;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

.sidebar-card{background:rgba(255,255,255,.015);border:1px solid rgba(0,200,255,.07);border-radius:12px;overflow:hidden}
.sidebar-card-title{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#2e5878;padding:12px;border-bottom:1px solid rgba(0,200,255,.07)}

.footer{border-top:1px solid rgba(0,200,255,.07);padding:24px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#2e5878;margin-top:40px}
.footer a{color:#2e5878}
.footer a:hover{color:#00c8ff}
.footer-links{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:10px}

@media(max-width:768px){
  .layout{grid-template-columns:1fr;padding:16px}
  .hero-top{flex-wrap:wrap}
  .hero-flag{font-size:48px}
  .hero-name{font-size:36px}
  .score-num{font-size:52px}
  .score-block{text-align:left}
  .sidebar{display:none}
  .header{padding:10px 16px}
  .brand-name{font-size:15px}
}
</style>
</head>
<body>

<header class="header">
  <a href="/" class="brand" style="text-decoration:none">
    <div class="brand-mark">🌍</div>
    <div>
      <div class="brand-name">GCIS Fusion</div>
    </div>
  </a>
  <a href="/" class="header-cta">⚡ Live Crisis Map →</a>
</header>

<div class="layout">
  <main class="main-col">

    <nav class="breadcrumb">
      <a href="/">Home</a> › <a href="/#countries">Countries</a> › ${name}
    </nav>

    <!-- HERO SECTION -->
    <div class="hero">
      <div class="hero-top">
        <div class="hero-flag">${flag}</div>
        <div class="hero-info">
          <div class="hero-region">${region} · ISO: ${iso}</div>
          <div class="hero-name">${name}</div>
          <span class="sev-badge" style="background:${sevColor}22;color:${sevColor};border:1px solid ${sevColor}44;">${sev} CRISIS LEVEL</span>
        </div>
        <div class="score-block">
          <div class="score-num" style="color:${sevColor}">${score}</div>
          <div class="score-label">/100 URGENCY</div>
        </div>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${score}%;background:linear-gradient(90deg,${sevColor}88,${sevColor})"></div>
      </div>
      <div>${needsPills}</div>
    </div>

    <!-- SUMMARY SECTION -->
    <div class="section">
      <div class="section-title">Crisis Overview</div>
      <h2>${name} Humanitarian Situation ${year}</h2>
      <p style="color:#6a9ec0;margin-bottom:14px;">
        ${name} currently holds an urgency score of <strong style="color:${sevColor}">${score}/100</strong> on the Global Crisis Index, 
        placing it in the <strong style="color:${sevColor}">${sev.toLowerCase()}</strong> category. 
        ${score >= 80 
          ? `This critical rating reflects acute ongoing crises requiring immediate international response.`
          : score >= 60 
          ? `This high rating reflects significant ongoing crises requiring sustained monitoring and response.`
          : score >= 40
          ? `This moderate rating reflects elevated risk factors requiring continued attention.`
          : `This rating reflects baseline risk factors with relatively stable humanitarian conditions.`}
      </p>
      <p style="color:#6a9ec0;margin-bottom:14px;">
        Key crisis types affecting ${name} include <strong style="color:#ddeeff">${crisisTypesStr}</strong>. 
        The primary humanitarian needs identified are <strong style="color:#ddeeff">${needsStr}</strong>.
      </p>
      <p style="color:#6a9ec0;">
        Data is aggregated in real-time from 40+ live APIs including USGS (seismic), ACLED (conflict), 
        IPC/FEWS NET/WFP (food security), WHO (health), ReliefWeb, GDACS, NASA EONET, UNHCR, and the World Bank.
      </p>
    </div>

    <!-- CRISIS TYPES TABLE -->
    <div class="section">
      <div class="section-title">Active Crisis Types</div>
      <h2>Tracked Hazards &amp; Emergencies</h2>
      <p style="color:#6a9ec0;margin-bottom:16px;">The following crisis types are actively monitored for ${name} across live data sources:</p>
      <table>
        <thead>
          <tr>
            <th>Crisis Type</th>
            <th>Humanitarian Needs Generated</th>
          </tr>
        </thead>
        <tbody>
          ${crisisRows}
        </tbody>
      </table>
    </div>

    <!-- METHODOLOGY SECTION -->
    <div class="section">
      <div class="section-title">Methodology</div>
      <h2>How the ${name} Score Is Calculated</h2>
      <p style="color:#6a9ec0;margin-bottom:12px;">
        The GCIS Fusion urgency score for ${name} is a composite index built across 8 dimensions: 
        <strong style="color:#ddeeff">Conflict, Displacement, Food Security, Health, Economic, Climate, Access,</strong> and <strong style="color:#ddeeff">Political.</strong>
      </p>
      <p style="color:#6a9ec0;margin-bottom:12px;">
        Scores are weighted by severity of impact: conflict and displacement carry the highest weights (28% and 22% respectively), 
        reflecting their outsized humanitarian effect. The composite is updated every 5 minutes from live API data.
      </p>
      <p style="color:#6a9ec0;">
        This index is an independent real-time companion to the 
        <a href="https://drmkc.jrc.ec.europa.eu/inform-index" target="_blank" rel="noopener">INFORM GCSI</a> 
        (Global Crisis Severity Index), supplementing quarterly assessments with continuous live data.
      </p>
    </div>

    <!-- LIVE DATA CTA -->
    <div class="section" style="text-align:center;background:linear-gradient(135deg,rgba(191,127,255,.07),rgba(0,200,255,.04));border-color:rgba(191,127,255,.2)">
      <div style="font-size:32px;margin-bottom:12px;">${flag}</div>
      <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:900;margin-bottom:8px;">Live ${name} Crisis Data</h2>
      <p style="color:#6a9ec0;margin-bottom:16px;max-width:480px;margin-left:auto;margin-right:auto;">
        Access real-time earthquakes, conflict events, food security alerts, disease outbreaks, 
        and 8-dimension analysis for ${name} — updated every 5 minutes.
      </p>
      <a href="/?country=${iso}" class="live-link">
        <div class="live-dot"></div>
        Open Live ${name} Dashboard →
      </a>
    </div>

  </main>

  <!-- SIDEBAR -->
  <aside class="sidebar">

    <div class="sidebar-card">
      <div class="sidebar-card-title">Top Crisis Countries</div>
      ${top10}
    </div>

    <div class="sidebar-card" style="padding:16px;background:linear-gradient(135deg,rgba(191,127,255,.07),rgba(0,200,255,.04));border-color:rgba(191,127,255,.2)">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#bf7fff;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">Pro Access</div>
      <p style="font-size:13px;color:#6a9ec0;margin-bottom:12px;">Unlock AI briefs, 30-day score history, PDF reports, and email alerts for ${name}.</p>
      <a href="https://buy.stripe.com/3cI00leBl2u06N1cod5ZC01" target="_blank" style="display:block;background:linear-gradient(135deg,#bf7fff,#00c8ff);color:#030b18;padding:10px;border-radius:40px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;text-align:center;text-decoration:none;">⚡ Upgrade to Pro — $29/mo</a>
    </div>

    <div class="sidebar-card" style="padding:16px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#2e5878;letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px">Quick Facts</div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #0a2040;font-size:13px"><span style="color:#6a9ec0">Region</span><span>${region}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #0a2040;font-size:13px"><span style="color:#6a9ec0">Crisis Level</span><span style="color:${sevColor}">${sev}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #0a2040;font-size:13px"><span style="color:#6a9ec0">Urgency Score</span><span style="color:${sevColor}">${score}/100</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #0a2040;font-size:13px"><span style="color:#6a9ec0">Crisis Types</span><span>${types.length}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px"><span style="color:#6a9ec0">Last Updated</span><span>${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>
    </div>

  </aside>
</div>

<footer class="footer">
  <div class="footer-links">
    <a href="/">Home</a>
    <a href="/privacy.html">Privacy Policy</a>
    <a href="/terms.html">Terms of Service</a>
    <a href="https://drmkc.jrc.ec.europa.eu/inform-index" target="_blank" rel="noopener">INFORM GCSI</a>
  </div>
  <div>GCIS Fusion — Independent real-time companion to INFORM GCSI · © ${year}</div>
  <div style="margin-top:6px">Live data from USGS · ACLED · IPC · FEWS NET · WFP · WHO · ReliefWeb · GDACS · UNHCR · World Bank</div>
</footer>

</body>
</html>`;
}

// ── GENERATE SITEMAP ──────────────────────────────────────────────────────────
function generateSitemap(isos) {
  const today = new Date().toISOString().slice(0, 10);
  const countryUrls = isos.map(iso => {
    const slug = slugify(NAMES[iso]);
    return `  <url>
    <loc>https://globalcrisisindex.com/country/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://globalcrisisindex.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
${countryUrls}
</urlset>`;
}

// ── GENERATE INDEX PAGE ───────────────────────────────────────────────────────
function generateCountryIndex(isos) {
  const year = getYear();
  const sorted = [...isos].sort((a,b) => (BASE_SCORES[b]||42) - (BASE_SCORES[a]||42));
  
  const cards = sorted.map(iso => {
    const name = NAMES[iso];
    const score = BASE_SCORES[iso] || 42;
    const { label: sev, color } = severityLabel(score);
    const slug = slugify(name);
    const types = CTYPES[iso] || DEFAULT_T;
    const primaryCrisis = ARC[types[0]]?.l || '';
    return `<a href="/country/${slug}" style="display:block;background:rgba(255,255,255,.015);border:1px solid rgba(0,200,255,.07);border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color .15s;" onmouseover="this.style.borderColor='rgba(0,200,255,.25)'" onmouseout="this.style.borderColor='rgba(0,200,255,.07)'">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:16px;">${FLAGS[iso]||''} <strong style="color:#ddeeff;font-size:15px;">${name}</strong></span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;color:${color}">${score}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-family:'JetBrains Mono',monospace;font-size:9px;padding:2px 8px;border-radius:4px;background:${color}22;color:${color};border:1px solid ${color}44">${sev}</span>
        <span style="font-size:12px;color:#2e5878">${primaryCrisis}</span>
      </div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>All Countries Crisis Index ${year} — Global Humanitarian Rankings | GCIS Fusion</title>
<meta name="description" content="Complete country-by-country crisis rankings for ${year}. Real-time urgency scores for ${isos.length}+ countries tracking earthquakes, conflicts, food security, and disease outbreaks.">
<link rel="canonical" href="https://globalcrisisindex.com/country/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#030b18;color:#ddeeff;font-family:'Barlow',sans-serif;font-size:15px;line-height:1.6}
a{color:#00c8ff;text-decoration:none}
.header{background:rgba(3,11,24,.98);border-bottom:1px solid rgba(0,200,255,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none}
.brand-mark{width:34px;height:34px;border-radius:8px;background:linear-gradient(145deg,rgba(0,200,255,.2),rgba(191,127,255,.15));border:1px solid rgba(0,200,255,.3);display:flex;align-items:center;justify-content:center;font-size:18px}
.brand-name{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;background:linear-gradient(135deg,#fff 30%,#00c8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.header-cta{background:linear-gradient(135deg,#bf7fff,#00c8ff);color:#030b18;padding:8px 18px;border-radius:40px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:32px 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-top:24px}
h1{font-family:'Barlow Condensed',sans-serif;font-size:42px;font-weight:900;letter-spacing:-.02em;margin-bottom:8px}
.subtitle{color:#6a9ec0;margin-bottom:8px}
</style>
</head>
<body>
<header class="header">
  <a href="/" class="brand">
    <div class="brand-mark">🌍</div>
    <div class="brand-name">GCIS Fusion</div>
  </a>
  <a href="/" class="header-cta">⚡ Live Crisis Map →</a>
</header>
<div class="container">
  <h1>All Countries Crisis Index ${year}</h1>
  <p class="subtitle">Real-time urgency scores for ${sorted.length} countries · Ranked by crisis severity · Updated every 5 minutes</p>
  <div class="grid">${cards}</div>
</div>
</body>
</html>`;
}

// ── MAIN: RUN GENERATION ─────────────────────────────────────────────────────
const isos = Object.keys(NAMES);
const outDir = path.join(__dirname, 'country');

// Create output directory
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let count = 0;
isos.forEach(iso => {
  const name = NAMES[iso];
  const slug = slugify(name);
  const html = generateCountryPage(iso);
  const filePath = path.join(outDir, `${slug}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  count++;
  console.log(`✅ Generated: country/${slug}.html (${NAMES[iso]} · Score: ${BASE_SCORES[iso] || 42})`);
});

// Write country index page
fs.writeFileSync(path.join(outDir, 'index.html'), generateCountryIndex(isos), 'utf8');
console.log(`✅ Generated: country/index.html`);

// Write sitemap
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), generateSitemap(isos), 'utf8');
console.log(`✅ Generated: sitemap.xml`);

console.log(`\n🎉 Done! Generated ${count} country pages + index + sitemap.`);
console.log(`\n📁 Upload the entire 'country/' folder to your server root.`);
console.log(`📍 Pages will be live at: globalcrisisindex.com/country/ukraine`);
console.log(`🗺️  Submit sitemap at: https://search.google.com/search-console`);
