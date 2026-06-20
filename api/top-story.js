// /api/top-story.js
//
// The data layer behind CRYS — returns everything the UI needs to answer
// any crisis question a user might type.
//
// ── ENDPOINTS ────────────────────────────────────────────────────────────────
//
//  GET /api/top-story
//      → top urgent country, full payload
//
//  GET /api/top-story?iso=SOM
//      → one country by ISO code
//
//  GET /api/top-story?iso=SOM,YEM
//      → comparison payload (two or more countries, side-by-side diff)
//
//  GET /api/top-story?top=5
//      → top N countries (max 50)
//
//  GET /api/top-story?q=somalia
//      → fuzzy name search → resolves to ISO, returns that country
//
//  GET /api/top-story?region=africa
//      → all tracked countries in a region, ranked
//
//  GET /api/top-story?threshold=90
//      → all countries at or above a score threshold
//
// ── RESPONSE CONTRACT ────────────────────────────────────────────────────────
//  Every country payload contains:
//    score, severity, rank, percentile
//    dimensions (8 drivers with values + labels)
//    trend (7-day delta, direction, forecast)
//    live_evidence (typed signals from USGS/IPC/WHO/UNHCR/weather)
//    narrative (plain-English, CRYS-voice ready)
//    comparison (only when 2+ ISOs requested — diff table)
//    recommendation (action tier + plain-English)
//    sources (exactly what data was used, with availability flags)
//    score_audit (prior → adjustments → final, fully transparent)
//
// ── DATA SOURCES (all open, no keys required) ────────────────────────────────
//  USGS     earthquakes ≥4.5, last 7 days
//  IPC      food security phases 1–5 (live API + curated fallback)
//  WHO      disease outbreak news (open RSS)
//  UNHCR    displacement figures (open stats API + curated fallback)
//  Open-Meteo  forecast temperatures (no key)

"use strict";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CFG = {
  SEED_INTERVAL_MS:  300_000,   // scores drift every 5 min (matches front-end)
  FETCH_TIMEOUT_MS:  7_000,
  MAX_TOP_N:         50,
  SPILLOVER_RATE:    0.13,
  SPILLOVER_FLOOR:   50,
  PRIOR_JITTER:      4,
  PRIOR_CAP:         85,
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json; charset=utf-8",
};

// ─── CRISIS ARCHETYPES ───────────────────────────────────────────────────────

const ARC = {
  CE:  { l: "Complex Emergency", i: "⚔️",  n: ["shelter","food","health","protection"] },
  CW:  { l: "Civil War",         i: "⚔️",  n: ["shelter","protection","health","food"] },
  EQ:  { l: "Earthquake",        i: "🌍",  n: ["shelter","health","water"] },
  FL:  { l: "Flood",             i: "🌊",  n: ["shelter","water","food"] },
  DR:  { l: "Drought",           i: "🏜️",  n: ["food","water","nutrition"] },
  FN:  { l: "Famine",            i: "🍚",  n: ["food","nutrition","health"] },
  EP:  { l: "Epidemic",          i: "🦠",  n: ["health","water","nutrition"] },
  REF: { l: "Refugee Crisis",    i: "🚶",  n: ["shelter","protection","water"] },
  TC:  { l: "Cyclone",           i: "🌀",  n: ["shelter","water"] },
  WF:  { l: "Wildfire",          i: "🔥",  n: ["shelter","health"] },
  HEAT:{ l: "Heatwave",          i: "🥵",  n: ["health","water"] },
  LS:  { l: "Landslide",         i: "⛰️",  n: ["shelter","health"] },
  TSU: { l: "Tsunami",           i: "🌊",  n: ["shelter","health","water"] },
  VLC: { l: "Volcano",           i: "🌋",  n: ["shelter","health","water"] },
  ST:  { l: "Storm",             i: "⛈️",  n: ["shelter","water"] },
};

// ─── DIMENSION WEIGHTS ───────────────────────────────────────────────────────

const DIMS = [
  { k: "conflict",     l: "Conflict",      w: 0.28 },
  { k: "displacement", l: "Displacement",  w: 0.22 },
  { k: "food",         l: "Food security", w: 0.18 },
  { k: "health",       l: "Health",        w: 0.14 },
  { k: "economic",     l: "Economic",      w: 0.10 },
  { k: "climate",      l: "Climate",       w: 0.05 },
  { k: "access",       l: "Access",        w: 0.02 },
  { k: "political",    l: "Political",     w: 0.01 },
];

// ─── COUNTRY TABLE ───────────────────────────────────────────────────────────
// All countries from the GCIS Fusion front-end, with matching priors,
// crisis types, adjacency lists, centroids, and region tags.

const COUNTRIES = {

  // ══ MIDDLE EAST / LEVANT ═══════════════════════════════════════════════════
  PSE: { name:"Palestine",            flag:"🇵🇸", prior:65, region:"middleeast",
         types:["CE","CW","REF","HEAT"],
         adj:["LBN","JOR","ISR"],                                           cent:[35.3, 31.9] },
  SYR: { name:"Syria",                flag:"🇸🇾", prior:66, region:"middleeast",
         types:["CE","CW","REF","EP","HEAT"],
         adj:["LBN","JOR","TUR","IRQ","ISR"],                              cent:[38.3, 34.8] },
  YEM: { name:"Yemen",                flag:"🇾🇪", prior:68, region:"middleeast",
         types:["CE","CW","FN","DR","REF"],
         adj:["SAU","OMN"],                                                 cent:[47.6, 15.6] },
  IRQ: { name:"Iraq",                 flag:"🇮🇶", prior:46, region:"middleeast",
         types:["CE","CW","REF","HEAT"],
         adj:["SYR","IRN","SAU","TUR","JOR","KWT"],                        cent:[43.7, 33.2] },
  IRN: { name:"Iran",                 flag:"🇮🇷", prior:38, region:"middleeast",
         types:["EQ","DR","REF","HEAT","LS"],
         adj:["AFG","PAK","IRQ","TUR","AZE","TKM"],                        cent:[53.7, 32.4] },
  LBN: { name:"Lebanon",              flag:"🇱🇧", prior:47, region:"middleeast",
         types:["CE","REF","EP","HEAT"],
         adj:["SYR","ISR"],                                                 cent:[35.5, 33.9] },
  JOR: { name:"Jordan",               flag:"🇯🇴", prior:28, region:"middleeast",
         types:["REF","DR","HEAT"],
         adj:["PSE","SYR","IRQ","SAU","ISR"],                              cent:[36.2, 31.2] },
  ISR: { name:"Israel",               flag:"🇮🇱", prior:44, region:"middleeast",
         types:["CW","WF","HEAT"],
         adj:["LBN","SYR","JOR","PSE"],                                    cent:[34.9, 31.5] },
  SAU: { name:"Saudi Arabia",         flag:"🇸🇦", prior:22, region:"middleeast",
         types:["DR","ST","HEAT","REF"],
         adj:["YEM","JOR","IRQ","KWT","QAT","ARE","OMN"],                  cent:[44.5, 24.7] },
  KWT: { name:"Kuwait",               flag:"🇰🇼", prior:18, region:"middleeast",
         types:["DR","HEAT","ST"],
         adj:["IRQ","SAU"],                                                 cent:[47.5, 29.3] },
  OMN: { name:"Oman",                 flag:"🇴🇲", prior:15, region:"middleeast",
         types:["TC","DR","HEAT","ST"],
         adj:["SAU","ARE","YEM"],                                           cent:[57.6, 21.5] },
  ARE: { name:"United Arab Emirates", flag:"🇦🇪", prior:14, region:"middleeast",
         types:["DR","HEAT","ST"],
         adj:["SAU","OMN","QAT"],                                           cent:[53.8, 23.4] },
  QAT: { name:"Qatar",                flag:"🇶🇦", prior:12, region:"middleeast",
         types:["DR","HEAT"],
         adj:["SAU","ARE"],                                                 cent:[51.2, 25.4] },
  BHR: { name:"Bahrain",              flag:"🇧🇭", prior:22, region:"middleeast",
         types:["DR","HEAT"],
         adj:["SAU"],                                                        cent:[50.6, 26.0] },
  CYP: { name:"Cyprus",               flag:"🇨🇾", prior:19, region:"middleeast",
         types:["DR","WF","HEAT"],
         adj:[],                                                              cent:[33.1, 35.1] },

  // ══ CENTRAL ASIA ══════════════════════════════════════════════════════════
  AFG: { name:"Afghanistan",          flag:"🇦🇫", prior:67, region:"asia",
         types:["CE","CW","DR","FN","REF"],
         adj:["PAK","IRN","TJK","UZB","TKM"],                              cent:[67.7, 33.9] },
  PAK: { name:"Pakistan",             flag:"🇵🇰", prior:48, region:"asia",
         types:["FL","EQ","DR","REF","HEAT","LS"],
         adj:["AFG","IRN","IND","CHN"],                                    cent:[69.3, 30.4] },
  TJK: { name:"Tajikistan",           flag:"🇹🇯", prior:42, region:"asia",
         types:["EQ","FL","LS","DR","HEAT"],
         adj:["UZB","KGZ","CHN","AFG"],                                    cent:[71.3, 38.8] },
  UZB: { name:"Uzbekistan",           flag:"🇺🇿", prior:32, region:"asia",
         types:["DR","HEAT","FL","EQ"],
         adj:["KAZ","KGZ","TJK","AFG","TKM"],                             cent:[63.1, 41.4] },
  TKM: { name:"Turkmenistan",         flag:"🇹🇲", prior:38, region:"asia",
         types:["DR","HEAT","FL"],
         adj:["KAZ","UZB","AFG","IRN"],                                    cent:[59.6, 40.5] },
  KGZ: { name:"Kyrgyzstan",           flag:"🇰🇬", prior:34, region:"asia",
         types:["EQ","FL","LS","DR","HEAT"],
         adj:["KAZ","CHN","TJK","UZB"],                                    cent:[74.6, 41.2] },
  KAZ: { name:"Kazakhstan",           flag:"🇰🇿", prior:22, region:"asia",
         types:["FL","DR","WF","HEAT"],
         adj:["RUS","CHN","KGZ","UZB","TKM"],                             cent:[66.9, 48.0] },
  MNG: { name:"Mongolia",             flag:"🇲🇳", prior:18, region:"asia",
         types:["DR","ST","HEAT","FL"],
         adj:["RUS","CHN"],                                                 cent:[103.8,46.9] },

  // ══ SOUTH ASIA ════════════════════════════════════════════════════════════
  IND: { name:"India",                flag:"🇮🇳", prior:35, region:"asia",
         types:["FL","TC","DR","EQ","HEAT","LS"],
         adj:["PAK","BGD","CHN","NPL","MMR","BTN"],                        cent:[78.0, 20.6] },
  BGD: { name:"Bangladesh",           flag:"🇧🇩", prior:42, region:"asia",
         types:["FL","TC","REF","EP","LS","HEAT"],
         adj:["MMR","IND"],                                                 cent:[90.4, 23.7] },
  NPL: { name:"Nepal",                flag:"🇳🇵", prior:38, region:"asia",
         types:["EQ","LS","FL","HEAT"],
         adj:["IND","CHN"],                                                 cent:[84.2, 28.4] },
  LKA: { name:"Sri Lanka",            flag:"🇱🇰", prior:34, region:"asia",
         types:["FL","TC","DR","EP","HEAT"],
         adj:["IND"],                                                        cent:[80.7,  7.9] },
  BTN: { name:"Bhutan",               flag:"🇧🇹", prior:14, region:"asia",
         types:["FL","LS","EQ","HEAT"],
         adj:["IND","CHN"],                                                 cent:[90.4, 27.5] },
  MDV: { name:"Maldives",             flag:"🇲🇻", prior:12, region:"asia",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[73.2,  3.2] },

  // ══ EAST / SOUTHEAST ASIA ════════════════════════════════════════════════
  CHN: { name:"China",                flag:"🇨🇳", prior:32, region:"asia",
         types:["FL","EQ","TC","LS","TSU","HEAT"],
         adj:["IND","RUS","KAZ","VNM","PRK","MNG","NPL","MMR"],            cent:[104.2,35.9] },
  JPN: { name:"Japan",                flag:"🇯🇵", prior:46, region:"asia",
         types:["EQ","TSU","TC","VLC","FL","HEAT"],
         adj:[],                                                              cent:[138.3,36.2] },
  KOR: { name:"South Korea",          flag:"🇰🇷", prior:22, region:"asia",
         types:["ST","FL","HEAT","EQ"],
         adj:["PRK"],                                                         cent:[127.8,36.5] },
  PRK: { name:"North Korea",          flag:"🇰🇵", prior:52, region:"asia",
         types:["DR","FL","HEAT","ST"],
         adj:["CHN","RUS","KOR"],                                            cent:[127.5,40.3] },
  TWN: { name:"Taiwan",               flag:"🇹🇼", prior:24, region:"asia",
         types:["TC","EQ","TSU","FL","HEAT"],
         adj:[],                                                              cent:[120.9,23.7] },
  HKG: { name:"Hong Kong",            flag:"🇭🇰", prior:12, region:"asia",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[114.2,22.3] },
  MAC: { name:"Macau",                flag:"🇲🇴", prior:10, region:"asia",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[113.5,22.2] },
  MMR: { name:"Myanmar",              flag:"🇲🇲", prior:53, region:"asia",
         types:["CE","CW","FL","REF","EP"],
         adj:["BGD","IND","THA","CHN","LAO"],                              cent:[95.9, 21.9] },
  THA: { name:"Thailand",             flag:"🇹🇭", prior:29, region:"asia",
         types:["FL","DR","HEAT","EP"],
         adj:["MMR","LAO","KHM","MYS"],                                    cent:[101.0,15.9] },
  VNM: { name:"Vietnam",              flag:"🇻🇳", prior:26, region:"asia",
         types:["FL","TC","DR","LS","HEAT","EP"],
         adj:["CHN","LAO","KHM"],                                           cent:[108.3,14.1] },
  LAO: { name:"Laos",                 flag:"🇱🇦", prior:28, region:"asia",
         types:["FL","DR","LS","HEAT"],
         adj:["CHN","VNM","KHM","THA","MMR"],                             cent:[102.5,17.9] },
  KHM: { name:"Cambodia",             flag:"🇰🇭", prior:32, region:"asia",
         types:["FL","DR","HEAT","EP"],
         adj:["THA","LAO","VNM"],                                           cent:[104.9,12.6] },
  MYS: { name:"Malaysia",             flag:"🇲🇾", prior:18, region:"asia",
         types:["FL","LS","HEAT","EP"],
         adj:["THA","IDN","BRN"],                                           cent:[109.7, 3.8] },
  SGP: { name:"Singapore",            flag:"🇸🇬", prior:9,  region:"asia",
         types:["HEAT","FL"],
         adj:[],                                                              cent:[103.8, 1.4] },
  IDN: { name:"Indonesia",            flag:"🇮🇩", prior:50, region:"asia",
         types:["EQ","TSU","VLC","FL","LS","TC","HEAT"],
         adj:[],                                                              cent:[106.8,-6.2] },
  PHL: { name:"Philippines",          flag:"🇵🇭", prior:48, region:"asia",
         types:["TC","FL","EQ","VLC","TSU","LS","HEAT"],
         adj:[],                                                              cent:[121.8,12.9] },
  TLS: { name:"Timor-Leste",          flag:"🇹🇱", prior:38, region:"asia",
         types:["FL","DR","EP","HEAT"],
         adj:[],                                                              cent:[125.7,-8.9] },
  BRN: { name:"Brunei",               flag:"🇧🇳", prior:10, region:"asia",
         types:["FL","HEAT"],
         adj:["MYS"],                                                         cent:[114.7, 4.5] },
  ARM: { name:"Armenia",              flag:"🇦🇲", prior:38, region:"asia",
         types:["EQ","DR","CW","HEAT"],
         adj:["TUR","GEO","AZE","IRN"],                                    cent:[44.9, 40.1] },
  AZE: { name:"Azerbaijan",           flag:"🇦🇿", prior:32, region:"asia",
         types:["EQ","FL","CW","HEAT"],
         adj:["RUS","GEO","ARM","IRN","TUR"],                              cent:[47.6, 40.1] },
  GEO: { name:"Georgia",              flag:"🇬🇪", prior:30, region:"asia",
         types:["EQ","FL","LS","CW","HEAT"],
         adj:["RUS","TUR","ARM","AZE"],                                    cent:[43.4, 42.3] },

  // ══ AFRICA — HORN / EAST ══════════════════════════════════════════════════
  SOM: { name:"Somalia",              flag:"🇸🇴", prior:72, region:"africa",
         types:["CE","CW","DR","FN","REF","HEAT"],
         adj:["ETH","KEN","DJI"],                                           cent:[45.3,  5.2] },
  ETH: { name:"Ethiopia",             flag:"🇪🇹", prior:57, region:"africa",
         types:["CE","CW","DR","FN","REF"],
         adj:["SDN","SSD","SOM","ERI","DJI","KEN"],                        cent:[40.5,  9.1] },
  SSD: { name:"South Sudan",          flag:"🇸🇸", prior:70, region:"africa",
         types:["CE","CW","FL","FN","REF"],
         adj:["SDN","ETH","UGA","KEN","COD","CAF"],                        cent:[31.3,  6.9] },
  SDN: { name:"Sudan",                flag:"🇸🇩", prior:68, region:"africa",
         types:["CE","CW","DR","FL","REF"],
         adj:["EGY","ETH","SSD","LBY","TCD","ERI","CAF"],                 cent:[29.9, 12.9] },
  ERI: { name:"Eritrea",              flag:"🇪🇷", prior:48, region:"africa",
         types:["CE","DR","REF","HEAT"],
         adj:["ETH","SDN","DJI"],                                           cent:[39.5, 15.2] },
  DJI: { name:"Djibouti",             flag:"🇩🇯", prior:38, region:"africa",
         types:["DR","HEAT","REF","FL"],
         adj:["ERI","ETH","SOM"],                                           cent:[42.6, 11.8] },
  KEN: { name:"Kenya",                flag:"🇰🇪", prior:32, region:"africa",
         types:["DR","FL","EP","REF","HEAT"],
         adj:["ETH","SOM","UGA","TZA","SSD"],                              cent:[37.9,  0.0] },
  UGA: { name:"Uganda",               flag:"🇺🇬", prior:38, region:"africa",
         types:["FL","EP","REF","LS"],
         adj:["KEN","TZA","RWA","BDI","COD","SSD"],                        cent:[32.3,  1.4] },
  TZA: { name:"Tanzania",             flag:"🇹🇿", prior:32, region:"africa",
         types:["FL","DR","EP","HEAT"],
         adj:["KEN","UGA","RWA","BDI","MOZ","ZMB","MWI","COD"],           cent:[34.9, -6.4] },
  RWA: { name:"Rwanda",               flag:"🇷🇼", prior:32, region:"africa",
         types:["FL","LS","EP","REF"],
         adj:["BDI","COD","UGA","TZA"],                                    cent:[29.9, -1.9] },
  BDI: { name:"Burundi",              flag:"🇧🇮", prior:52, region:"africa",
         types:["CE","CW","EP","FL","REF"],
         adj:["RWA","COD","TZA"],                                           cent:[29.9, -3.4] },
  MDG: { name:"Madagascar",           flag:"🇲🇬", prior:44, region:"africa",
         types:["TC","FL","DR","EP","HEAT"],
         adj:[],                                                              cent:[46.9,-20.3] },
  COM: { name:"Comoros",              flag:"🇰🇲", prior:30, region:"africa",
         types:["TC","FL","EP","HEAT"],
         adj:[],                                                              cent:[43.9,-11.6] },
  MUS: { name:"Mauritius",            flag:"🇲🇺", prior:12, region:"africa",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[57.6,-20.3] },
  SYC: { name:"Seychelles",           flag:"🇸🇨", prior:10, region:"africa",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[55.5, -4.6] },
  MOZ: { name:"Mozambique",           flag:"🇲🇿", prior:34, region:"africa",
         types:["TC","FL","HEAT"],
         adj:["TZA","MWI","ZMB","ZWE","ZAF","SWZ"],                       cent:[35.5,-18.7] },
  MWI: { name:"Malawi",               flag:"🇲🇼", prior:40, region:"africa",
         types:["FL","DR","EP","HEAT"],
         adj:["TZA","MOZ","ZMB"],                                           cent:[34.3,-13.3] },
  ZMB: { name:"Zambia",               flag:"🇿🇲", prior:36, region:"africa",
         types:["FL","DR","EP","HEAT"],
         adj:["COD","TZA","MWI","MOZ","ZWE","BWA","NAM","AGO"],           cent:[27.8,-13.1] },
  ZWE: { name:"Zimbabwe",             flag:"🇿🇼", prior:46, region:"africa",
         types:["DR","FL","EP","HEAT"],
         adj:["MOZ","ZMB","BWA","ZAF"],                                    cent:[29.9,-19.0] },
  AGO: { name:"Angola",               flag:"🇦🇴", prior:36, region:"africa",
         types:["FL","DR","EP","HEAT"],
         adj:["COD","ZMB","NAM"],                                           cent:[17.9,-11.2] },
  BWA: { name:"Botswana",             flag:"🇧🇼", prior:16, region:"africa",
         types:["DR","HEAT","FL"],
         adj:["ZAF","ZMB","NAM","ZWE"],                                    cent:[24.7,-22.3] },
  NAM: { name:"Namibia",              flag:"🇳🇦", prior:18, region:"africa",
         types:["DR","HEAT","FL"],
         adj:["ZAF","BWA","ZMB","AGO"],                                    cent:[18.5,-22.0] },
  ZAF: { name:"South Africa",         flag:"🇿🇦", prior:28, region:"africa",
         types:["DR","FL","EP","HEAT"],
         adj:["MOZ","ZWE","BWA","NAM","LSO","SWZ"],                        cent:[25.1,-29.0] },
  LSO: { name:"Lesotho",              flag:"🇱🇸", prior:28, region:"africa",
         types:["DR","FL","HEAT"],
         adj:["ZAF"],                                                         cent:[28.2,-29.6] },
  SWZ: { name:"Eswatini",             flag:"🇸🇿", prior:26, region:"africa",
         types:["DR","FL","EP","HEAT"],
         adj:["ZAF","MOZ"],                                                  cent:[31.5,-26.5] },

  // ══ AFRICA — WEST ═════════════════════════════════════════════════════════
  NGA: { name:"Nigeria",              flag:"🇳🇬", prior:51, region:"africa",
         types:["CE","CW","FL","EP","REF"],
         adj:["CMR","NER","BEN","TCD"],                                    cent:[ 8.7,  9.1] },
  NER: { name:"Niger",                flag:"🇳🇪", prior:56, region:"africa",
         types:["DR","FN","CE","HEAT","FL"],
         adj:["DZA","TCD","NGA","MLI","BFA"],                              cent:[ 8.1, 17.6] },
  MLI: { name:"Mali",                 flag:"🇲🇱", prior:62, region:"africa",
         types:["CE","CW","DR","FN","REF","HEAT"],
         adj:["DZA","NER","BFA","SEN","CIV","GIN","MRT"],                 cent:[-2.0, 17.6] },
  BFA: { name:"Burkina Faso",         flag:"🇧🇫", prior:60, region:"africa",
         types:["CE","CW","DR","EP","REF","HEAT"],
         adj:["MLI","NER","GHA","CIV","BEN","TGO"],                       cent:[-1.7, 12.4] },
  MRT: { name:"Mauritania",           flag:"🇲🇷", prior:42, region:"africa",
         types:["DR","FN","HEAT","FL"],
         adj:["DZA","MAR","MLI","SEN"],                                    cent:[-10.9,20.3] },
  SEN: { name:"Senegal",              flag:"🇸🇳", prior:28, region:"africa",
         types:["DR","FL","EP","HEAT"],
         adj:["MRT","MLI","GIN","GNB","GMB"],                             cent:[-14.5,14.5] },
  GMB: { name:"Gambia",               flag:"🇬🇲", prior:28, region:"africa",
         types:["DR","HEAT","FL"],
         adj:["SEN"],                                                         cent:[-15.3,13.4] },
  GNB: { name:"Guinea-Bissau",        flag:"🇬🇼", prior:42, region:"africa",
         types:["FL","EP","DR","HEAT"],
         adj:["SEN","GIN"],                                                 cent:[-15.2,12.0] },
  GIN: { name:"Guinea",               flag:"🇬🇳", prior:42, region:"africa",
         types:["FL","EP","LS","HEAT"],
         adj:["GNB","SEN","MLI","CIV","LBR","SLE"],                       cent:[-11.8,11.0] },
  SLE: { name:"Sierra Leone",         flag:"🇸🇱", prior:40, region:"africa",
         types:["FL","EP","LS","HEAT"],
         adj:["GIN","LBR"],                                                 cent:[-11.8, 8.6] },
  LBR: { name:"Liberia",              flag:"🇱🇷", prior:40, region:"africa",
         types:["FL","EP","CE","HEAT"],
         adj:["SLE","GIN","CIV"],                                           cent:[-9.5,  6.4] },
  CIV: { name:"Côte d'Ivoire",        flag:"🇨🇮", prior:42, region:"africa",
         types:["FL","EP","CE","HEAT"],
         adj:["LBR","GIN","MLI","BFA","GHA"],                             cent:[-5.5,  7.5] },
  GHA: { name:"Ghana",                flag:"🇬🇭", prior:26, region:"africa",
         types:["FL","DR","EP","HEAT"],
         adj:["CIV","BFA","TGO"],                                           cent:[-1.0,  7.9] },
  TGO: { name:"Togo",                 flag:"🇹🇬", prior:34, region:"africa",
         types:["FL","DR","EP","HEAT"],
         adj:["GHA","BFA","BEN"],                                           cent:[ 1.2,  8.6] },
  BEN: { name:"Benin",                flag:"🇧🇯", prior:34, region:"africa",
         types:["FL","DR","EP","HEAT"],
         adj:["TGO","NGA","BFA","NER"],                                    cent:[ 2.3,  9.3] },
  CPV: { name:"Cape Verde",           flag:"🇨🇻", prior:12, region:"africa",
         types:["DR","HEAT","ST"],
         adj:[],                                                              cent:[-24.0,16.0] },

  // ══ AFRICA — CENTRAL ══════════════════════════════════════════════════════
  COD: { name:"DR Congo",             flag:"🇨🇩", prior:59, region:"africa",
         types:["CE","CW","EP","FL","REF"],
         adj:["SDN","SSD","CAF","UGA","RWA","BDI","TZA","ZMB","COG","AGO"],cent:[23.7,-2.9] },
  CAF: { name:"Central African Rep.", flag:"🇨🇫", prior:54, region:"africa",
         types:["CE","CW","EP","FL","REF"],
         adj:["CMR","TCD","COD","SDN","SSD","COG"],                        cent:[20.9,  6.6] },
  TCD: { name:"Chad",                 flag:"🇹🇩", prior:55, region:"africa",
         types:["CE","CW","DR","REF","HEAT"],
         adj:["LBY","SDN","CAF","CMR","NGA","NER"],                        cent:[18.7, 15.5] },
  CMR: { name:"Cameroon",             flag:"🇨🇲", prior:46, region:"africa",
         types:["CE","CW","FL","EP","REF"],
         adj:["NGA","TCD","CAF","COG","GNQ","GAB"],                        cent:[12.3,  5.7] },
  COG: { name:"Republic of Congo",    flag:"🇨🇬", prior:36, region:"africa",
         types:["FL","EP","CE","HEAT"],
         adj:["COD","GAB","CMR","CAF"],                                    cent:[15.2, -0.2] },
  GAB: { name:"Gabon",                flag:"🇬🇦", prior:22, region:"africa",
         types:["FL","EP","HEAT"],
         adj:["CMR","COG","GNQ"],                                           cent:[11.6, -0.8] },
  GNQ: { name:"Equatorial Guinea",    flag:"🇬🇶", prior:26, region:"africa",
         types:["FL","EP","HEAT"],
         adj:["CMR","GAB"],                                                  cent:[10.3,  1.7] },
  STP: { name:"São Tomé and Príncipe",flag:"🇸🇹", prior:14, region:"africa",
         types:["FL","EP","HEAT"],
         adj:[],                                                              cent:[ 6.6,  0.2] },

  // ══ AFRICA — NORTH ════════════════════════════════════════════════════════
  EGY: { name:"Egypt",                flag:"🇪🇬", prior:34, region:"africa",
         types:["DR","REF","HEAT"],
         adj:["LBY","SDN","ISR","PSE"],                                    cent:[30.8, 26.8] },
  LBY: { name:"Libya",                flag:"🇱🇾", prior:54, region:"africa",
         types:["CE","CW","REF","HEAT"],
         adj:["TUN","DZA","NER","SDN","EGY","TCD"],                        cent:[17.2, 26.3] },
  DZA: { name:"Algeria",              flag:"🇩🇿", prior:28, region:"africa",
         types:["DR","WF","HEAT","EP"],
         adj:["MAR","TUN","LBY","NER","MLI","MRT"],                        cent:[ 2.6, 28.0] },
  MAR: { name:"Morocco",              flag:"🇲🇦", prior:24, region:"africa",
         types:["EQ","DR","HEAT","FL"],
         adj:["DZA","MRT"],                                                  cent:[-7.1, 31.8] },
  TUN: { name:"Tunisia",              flag:"🇹🇳", prior:30, region:"africa",
         types:["DR","HEAT","FL"],
         adj:["DZA","LBY"],                                                  cent:[ 9.5, 33.9] },

  // ══ EUROPE ════════════════════════════════════════════════════════════════
  UKR: { name:"Ukraine",              flag:"🇺🇦", prior:52, region:"europe",
         types:["CE","CW","REF","HEAT"],
         adj:["RUS","POL","HUN","ROU","SVK","BLR","MDA"],                  cent:[31.2, 49.0] },
  RUS: { name:"Russia",               flag:"🇷🇺", prior:34, region:"europe",
         types:["WF","FL","CW","ST","HEAT"],
         adj:["UKR","CHN","KAZ","BLR","FIN","NOR","EST","LVA","LTU","POL"],cent:[97.7,56.8] },
  TUR: { name:"Turkey",               flag:"🇹🇷", prior:42, region:"europe",
         types:["EQ","FL","REF","CW","LS","HEAT"],
         adj:["SYR","IRQ","IRN","ARM","GEO","AZE","BGR","GRC"],            cent:[35.2, 38.9] },
  GRC: { name:"Greece",               flag:"🇬🇷", prior:36, region:"europe",
         types:["EQ","VLC","WF","FL","HEAT","REF"],
         adj:["BGR","MKD","ALB","TUR"],                                    cent:[21.8, 39.1] },
  ITA: { name:"Italy",                flag:"🇮🇹", prior:32, region:"europe",
         types:["EQ","VLC","WF","FL","TSU","HEAT"],
         adj:["FRA","CHE","AUT","SVN"],                                    cent:[12.6, 42.5] },
  ESP: { name:"Spain",                flag:"🇪🇸", prior:20, region:"europe",
         types:["WF","DR","ST","HEAT"],
         adj:["PRT","FRA","AND"],                                           cent:[-3.7, 40.5] },
  PRT: { name:"Portugal",             flag:"🇵🇹", prior:16, region:"europe",
         types:["WF","FL","HEAT"],
         adj:["ESP"],                                                         cent:[-8.2, 39.6] },
  FRA: { name:"France",               flag:"🇫🇷", prior:18, region:"europe",
         types:["WF","ST","HEAT"],
         adj:["ESP","ITA","CHE","BEL","LUX","DEU","AND","MCO"],            cent:[ 2.2, 46.2] },
  DEU: { name:"Germany",              flag:"🇩🇪", prior:15, region:"europe",
         types:["FL","ST","HEAT"],
         adj:["FRA","CHE","AUT","CZE","POL","NLD","BEL","LUX","DNK"],     cent:[10.0, 51.2] },
  GBR: { name:"United Kingdom",       flag:"🇬🇧", prior:16, region:"europe",
         types:["ST","FL","HEAT"],
         adj:[],                                                              cent:[-3.4, 55.4] },
  IRL: { name:"Ireland",              flag:"🇮🇪", prior:12, region:"europe",
         types:["ST","FL","HEAT"],
         adj:[],                                                              cent:[-8.2, 53.2] },
  NLD: { name:"Netherlands",          flag:"🇳🇱", prior:10, region:"europe",
         types:["FL","ST","HEAT"],
         adj:["DEU","BEL"],                                                  cent:[ 5.3, 52.1] },
  BEL: { name:"Belgium",              flag:"🇧🇪", prior:9,  region:"europe",
         types:["FL","ST","HEAT"],
         adj:["FRA","NLD","DEU","LUX"],                                    cent:[ 4.5, 50.5] },
  CHE: { name:"Switzerland",          flag:"🇨🇭", prior:8,  region:"europe",
         types:["FL","LS","ST","HEAT"],
         adj:["DEU","FRA","ITA","AUT","LIE"],                              cent:[ 8.2, 46.8] },
  AUT: { name:"Austria",              flag:"🇦🇹", prior:9,  region:"europe",
         types:["FL","LS","ST","HEAT"],
         adj:["DEU","CHE","ITA","SVN","HUN","SVK","CZE"],                  cent:[13.2, 47.6] },
  POL: { name:"Poland",               flag:"🇵🇱", prior:16, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["DEU","CZE","SVK","UKR","BLR","RUS","LTU"],                  cent:[19.1, 51.9] },
  CZE: { name:"Czechia",              flag:"🇨🇿", prior:12, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["DEU","AUT","SVK","POL"],                                    cent:[15.5, 49.8] },
  SVK: { name:"Slovakia",             flag:"🇸🇰", prior:12, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["CZE","POL","UKR","HUN","AUT"],                              cent:[19.5, 48.7] },
  HUN: { name:"Hungary",              flag:"🇭🇺", prior:15, region:"europe",
         types:["FL","ST","HEAT","WF"],
         adj:["AUT","SVK","UKR","ROU","SRB","HRV","SVN"],                  cent:[19.5, 47.2] },
  SWE: { name:"Sweden",               flag:"🇸🇪", prior:12, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["NOR","FIN","DNK"],                                           cent:[15.5, 60.1] },
  NOR: { name:"Norway",               flag:"🇳🇴", prior:11, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["SWE","FIN","RUS"],                                           cent:[10.5, 59.9] },
  FIN: { name:"Finland",              flag:"🇫🇮", prior:10, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["SWE","NOR","RUS"],                                           cent:[26.1, 62.0] },
  DNK: { name:"Denmark",              flag:"🇩🇰", prior:9,  region:"europe",
         types:["ST","FL","HEAT"],
         adj:["DEU","SWE"],                                                  cent:[ 9.6, 55.7] },
  ISL: { name:"Iceland",              flag:"🇮🇸", prior:14, region:"europe",
         types:["VLC","FL","ST","HEAT"],
         adj:[],                                                              cent:[-18.5,64.9] },
  BLR: { name:"Belarus",              flag:"🇧🇾", prior:42, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["RUS","UKR","POL","LTU","LVA"],                              cent:[28.0, 53.5] },
  MDA: { name:"Moldova",              flag:"🇲🇩", prior:34, region:"europe",
         types:["FL","DR","HEAT"],
         adj:["ROU","UKR"],                                                  cent:[28.4, 47.0] },
  ROU: { name:"Romania",              flag:"🇷🇴", prior:24, region:"europe",
         types:["EQ","FL","DR","HEAT"],
         adj:["UKR","MDA","BGR","SRB","HUN"],                              cent:[24.9, 45.9] },
  BGR: { name:"Bulgaria",             flag:"🇧🇬", prior:20, region:"europe",
         types:["FL","WF","ST","HEAT"],
         adj:["ROU","SRB","MKD","GRC","TUR"],                              cent:[25.5, 42.7] },
  SRB: { name:"Serbia",               flag:"🇷🇸", prior:24, region:"europe",
         types:["FL","ST","WF","HEAT"],
         adj:["HUN","ROU","BGR","MKD","MNE","BIH","HRV","XKX"],           cent:[21.0, 44.0] },
  HRV: { name:"Croatia",              flag:"🇭🇷", prior:16, region:"europe",
         types:["EQ","FL","ST","HEAT"],
         adj:["SVN","HUN","SRB","BIH","MNE"],                              cent:[15.2, 45.1] },
  BIH: { name:"Bosnia and Herzegovina",flag:"🇧🇦", prior:30, region:"europe",
         types:["FL","LS","ST","HEAT"],
         adj:["HRV","SRB","MNE"],                                           cent:[17.7, 44.2] },
  MNE: { name:"Montenegro",           flag:"🇲🇪", prior:20, region:"europe",
         types:["EQ","FL","WF","HEAT"],
         adj:["HRV","BIH","SRB","ALB","XKX"],                             cent:[19.3, 42.8] },
  ALB: { name:"Albania",              flag:"🇦🇱", prior:28, region:"europe",
         types:["EQ","FL","LS","HEAT"],
         adj:["MNE","SRB","MKD","GRC","XKX"],                             cent:[20.2, 41.2] },
  MKD: { name:"North Macedonia",      flag:"🇲🇰", prior:26, region:"europe",
         types:["EQ","FL","WF","HEAT"],
         adj:["SRB","BGR","GRC","ALB","XKX"],                             cent:[21.7, 41.6] },
  XKX: { name:"Kosovo",               flag:"🇽🇰", prior:34, region:"europe",
         types:["FL","ST","HEAT"],
         adj:["SRB","MKD","ALB","MNE"],                                    cent:[20.9, 42.6] },
  SVN: { name:"Slovenia",             flag:"🇸🇮", prior:10, region:"europe",
         types:["EQ","FL","LS","HEAT"],
         adj:["ITA","AUT","HUN","HRV"],                                    cent:[14.8, 46.1] },
  EST: { name:"Estonia",              flag:"🇪🇪", prior:12, region:"europe",
         types:["ST","FL","HEAT"],
         adj:["RUS","LVA"],                                                  cent:[25.0, 58.6] },
  LVA: { name:"Latvia",               flag:"🇱🇻", prior:12, region:"europe",
         types:["ST","FL","HEAT"],
         adj:["RUS","EST","BLR","LTU"],                                    cent:[24.9, 56.9] },
  LTU: { name:"Lithuania",            flag:"🇱🇹", prior:12, region:"europe",
         types:["ST","FL","HEAT"],
         adj:["RUS","LVA","BLR","POL"],                                    cent:[23.9, 55.9] },
  LUX: { name:"Luxembourg",           flag:"🇱🇺", prior:6,  region:"europe",
         types:["FL","ST","HEAT"],
         adj:["FRA","DEU","BEL"],                                           cent:[ 6.1, 49.8] },
  LIE: { name:"Liechtenstein",        flag:"🇱🇮", prior:6,  region:"europe",
         types:["FL","LS","HEAT"],
         adj:["CHE","AUT"],                                                  cent:[ 9.5, 47.2] },
  MLT: { name:"Malta",                flag:"🇲🇹", prior:10, region:"europe",
         types:["DR","HEAT","ST"],
         adj:[],                                                              cent:[14.4, 35.9] },
  AND: { name:"Andorra",              flag:"🇦🇩", prior:6,  region:"europe",
         types:["LS","HEAT"],
         adj:["ESP","FRA"],                                                  cent:[ 1.6, 42.5] },
  SMR: { name:"San Marino",           flag:"🇸🇲", prior:6,  region:"europe",
         types:["HEAT","FL"],
         adj:["ITA"],                                                         cent:[12.4, 43.9] },
  GRL: { name:"Greenland",            flag:"🇬🇱", prior:10, region:"europe",
         types:["ST","FL","HEAT"],
         adj:[],                                                              cent:[-42.0,72.0] },

  // ══ AMERICAS — NORTH ══════════════════════════════════════════════════════
  USA: { name:"United States",        flag:"🇺🇸", prior:18, region:"americas",
         types:["WF","ST","EQ","TC","TSU","HEAT"],
         adj:["CAN","MEX"],                                                  cent:[-95.7,37.1] },
  CAN: { name:"Canada",               flag:"🇨🇦", prior:12, region:"americas",
         types:["WF","FL","ST","HEAT"],
         adj:["USA"],                                                         cent:[-96.0,55.0] },
  MEX: { name:"Mexico",               flag:"🇲🇽", prior:36, region:"americas",
         types:["EQ","ST","VLC","FL","TSU","HEAT"],
         adj:["USA","GTM","BLZ"],                                           cent:[-102.5,23.0]},

  // ══ AMERICAS — CENTRAL ════════════════════════════════════════════════════
  GTM: { name:"Guatemala",            flag:"🇬🇹", prior:46, region:"americas",
         types:["EQ","FL","LS","ST","DR","HEAT"],
         adj:["MEX","BLZ","HND","SLV"],                                    cent:[-90.2,15.8] },
  BLZ: { name:"Belize",               flag:"🇧🇿", prior:28, region:"americas",
         types:["TC","FL","ST","HEAT"],
         adj:["MEX","GTM"],                                                  cent:[-88.5,17.2] },
  HND: { name:"Honduras",             flag:"🇭🇳", prior:48, region:"americas",
         types:["ST","FL","DR","LS","HEAT"],
         adj:["GTM","SLV","NIC"],                                           cent:[-86.6,15.0] },
  SLV: { name:"El Salvador",          flag:"🇸🇻", prior:44, region:"americas",
         types:["EQ","FL","DR","ST","HEAT"],
         adj:["GTM","HND"],                                                  cent:[-88.9,13.8] },
  NIC: { name:"Nicaragua",            flag:"🇳🇮", prior:38, region:"americas",
         types:["ST","FL","DR","EQ","HEAT"],
         adj:["HND","CRI"],                                                  cent:[-85.0,12.9] },
  CRI: { name:"Costa Rica",           flag:"🇨🇷", prior:16, region:"americas",
         types:["EQ","FL","LS","TC","HEAT"],
         adj:["NIC","PAN"],                                                  cent:[-84.0, 9.9] },
  PAN: { name:"Panama",               flag:"🇵🇦", prior:24, region:"americas",
         types:["FL","LS","ST","HEAT"],
         adj:["CRI","COL"],                                                  cent:[-80.0, 8.6] },

  // ══ AMERICAS — CARIBBEAN ══════════════════════════════════════════════════
  HTI: { name:"Haiti",                flag:"🇭🇹", prior:58, region:"americas",
         types:["CE","EQ","EP","ST","REF"],
         adj:["DOM"],                                                         cent:[-72.3,18.9] },
  DOM: { name:"Dominican Republic",   flag:"🇩🇴", prior:34, region:"americas",
         types:["TC","FL","EQ","ST","HEAT"],
         adj:["HTI"],                                                         cent:[-70.2,18.7] },
  CUB: { name:"Cuba",                 flag:"🇨🇺", prior:38, region:"americas",
         types:["TC","FL","ST","HEAT"],
         adj:["HTI"],                                                         cent:[-79.5,21.5] },
  JAM: { name:"Jamaica",              flag:"🇯🇲", prior:32, region:"americas",
         types:["TC","FL","ST","HEAT"],
         adj:[],                                                              cent:[-77.3,18.1] },
  ATG: { name:"Antigua and Barbuda",  flag:"🇦🇬", prior:12, region:"americas",
         types:["TC","ST","HEAT"],
         adj:[],                                                              cent:[-61.8,17.1] },
  BHS: { name:"Bahamas",              flag:"🇧🇸", prior:16, region:"americas",
         types:["TC","ST","FL","HEAT"],
         adj:[],                                                              cent:[-77.4,25.0] },
  BRB: { name:"Barbados",             flag:"🇧🇧", prior:10, region:"americas",
         types:["TC","ST","HEAT"],
         adj:[],                                                              cent:[-59.6,13.2] },
  DMA: { name:"Dominica",             flag:"🇩🇲", prior:16, region:"americas",
         types:["TC","VLC","ST","HEAT"],
         adj:[],                                                              cent:[-61.4,15.4] },
  GRD: { name:"Grenada",              flag:"🇬🇩", prior:12, region:"americas",
         types:["TC","ST","HEAT"],
         adj:[],                                                              cent:[-61.7,12.1] },
  KNA: { name:"Saint Kitts and Nevis",flag:"🇰🇳", prior:10, region:"americas",
         types:["TC","VLC","ST","HEAT"],
         adj:[],                                                              cent:[-62.7,17.3] },
  LCA: { name:"Saint Lucia",          flag:"🇱🇨", prior:12, region:"americas",
         types:["TC","VLC","ST","HEAT"],
         adj:[],                                                              cent:[-60.9,13.9] },
  VCT: { name:"Saint Vincent and the Grenadines",flag:"🇻🇨", prior:14, region:"americas",
         types:["TC","VLC","FL","HEAT"],
         adj:[],                                                              cent:[-61.2,13.3] },
  TTO: { name:"Trinidad and Tobago",  flag:"🇹🇹", prior:26, region:"americas",
         types:["FL","ST","HEAT"],
         adj:[],                                                              cent:[-61.2,10.7] },

  // ══ AMERICAS — SOUTH ══════════════════════════════════════════════════════
  COL: { name:"Colombia",             flag:"🇨🇴", prior:43, region:"americas",
         types:["CE","CW","FL","REF","LS"],
         adj:["VEN","PER","ECU","PAN","BRA"],                              cent:[-74.3, 4.6] },
  VEN: { name:"Venezuela",            flag:"🇻🇪", prior:44, region:"americas",
         types:["CE","REF","DR","HEAT"],
         adj:["COL","BRA","GUY"],                                           cent:[-66.6, 8.0] },
  BRA: { name:"Brazil",               flag:"🇧🇷", prior:40, region:"americas",
         types:["FL","WF","DR","EP","LS","HEAT"],
         adj:["VEN","COL","PER","BOL","ARG","GUY","SUR","PRY","URY"],      cent:[-52.0,-10.0]},
  ARG: { name:"Argentina",            flag:"🇦🇷", prior:28, region:"americas",
         types:["FL","DR","ST","HEAT"],
         adj:["CHL","BOL","PRY","BRA","URY"],                              cent:[-64.0,-34.0]},
  CHL: { name:"Chile",                flag:"🇨🇱", prior:46, region:"americas",
         types:["EQ","VLC","TSU","WF","HEAT"],
         adj:["PER","BOL","ARG"],                                           cent:[-71.5,-35.7]},
  PER: { name:"Peru",                 flag:"🇵🇪", prior:36, region:"americas",
         types:["EQ","FL","LS","VLC","TSU","HEAT"],
         adj:["ECU","COL","BRA","BOL","CHL"],                              cent:[-76.0,-10.0]},
  ECU: { name:"Ecuador",              flag:"🇪🇨", prior:36, region:"americas",
         types:["EQ","VLC","FL","TSU","HEAT"],
         adj:["COL","PER"],                                                  cent:[-77.8, -1.8]},
  BOL: { name:"Bolivia",              flag:"🇧🇴", prior:36, region:"americas",
         types:["FL","DR","LS","HEAT"],
         adj:["PER","BRA","PRY","ARG","CHL"],                              cent:[-64.9,-16.3]},
  PRY: { name:"Paraguay",             flag:"🇵🇾", prior:30, region:"americas",
         types:["FL","DR","HEAT"],
         adj:["BOL","BRA","ARG"],                                           cent:[-58.4,-23.4]},
  URY: { name:"Uruguay",              flag:"🇺🇾", prior:14, region:"americas",
         types:["FL","DR","ST","HEAT"],
         adj:["BRA","ARG"],                                                  cent:[-56.0,-33.0]},
  GUY: { name:"Guyana",               flag:"🇬🇾", prior:28, region:"americas",
         types:["FL","ST","HEAT"],
         adj:["VEN","BRA","SUR"],                                           cent:[-59.0, 4.9] },
  SUR: { name:"Suriname",             flag:"🇸🇷", prior:24, region:"americas",
         types:["FL","ST","HEAT"],
         adj:["GUY","BRA"],                                                  cent:[-56.0, 4.0] },

  // ══ OCEANIA ═══════════════════════════════════════════════════════════════
  AUS: { name:"Australia",            flag:"🇦🇺", prior:22, region:"oceania",
         types:["WF","FL","TC","DR","HEAT"],
         adj:[],                                                              cent:[134.5,-25.0]},
  NZL: { name:"New Zealand",          flag:"🇳🇿", prior:40, region:"oceania",
         types:["EQ","TSU","VLC","FL","HEAT"],
         adj:[],                                                              cent:[172.5,-41.3]},
  PNG: { name:"Papua New Guinea",     flag:"🇵🇬", prior:44, region:"oceania",
         types:["EQ","TSU","VLC","FL","HEAT"],
         adj:[],                                                              cent:[143.9, -6.3]},
  FJI: { name:"Fiji",                 flag:"🇫🇯", prior:34, region:"oceania",
         types:["TC","TSU","FL","HEAT"],
         adj:[],                                                              cent:[178.1,-17.7]},
  SLB: { name:"Solomon Islands",      flag:"🇸🇧", prior:40, region:"oceania",
         types:["EQ","TSU","TC","HEAT"],
         adj:[],                                                              cent:[160.2, -9.0]},
  VUT: { name:"Vanuatu",              flag:"🇻🇺", prior:28, region:"oceania",
         types:["TC","EQ","TSU","VLC","FL","HEAT"],
         adj:[],                                                              cent:[166.6,-15.4]},
  TON: { name:"Tonga",                flag:"🇹🇴", prior:22, region:"oceania",
         types:["TC","TSU","FL","HEAT"],
         adj:[],                                                              cent:[-175.2,-21.2]},
  WSM: { name:"Samoa",                flag:"🇼🇸", prior:20, region:"oceania",
         types:["TC","TSU","FL","HEAT"],
         adj:[],                                                              cent:[-172.1,-13.8]},
  KIR: { name:"Kiribati",             flag:"🇰🇮", prior:32, region:"oceania",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[-157.4, 1.9]},
  FSM: { name:"Micronesia",           flag:"🇫🇲", prior:24, region:"oceania",
         types:["TC","TSU","FL","HEAT"],
         adj:[],                                                              cent:[158.2, 6.9]},
  MHL: { name:"Marshall Islands",     flag:"🇲🇭", prior:28, region:"oceania",
         types:["TC","TSU","FL","HEAT"],
         adj:[],                                                              cent:[171.2, 7.1]},
  PLW: { name:"Palau",                flag:"🇵🇼", prior:16, region:"oceania",
         types:["TC","TSU","FL","HEAT"],
         adj:[],                                                              cent:[134.5, 7.5]},
  NRU: { name:"Nauru",                flag:"🇳🇷", prior:18, region:"oceania",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[166.9, -0.5]},
  TUV: { name:"Tuvalu",               flag:"🇹🇻", prior:30, region:"oceania",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[179.2, -8.5]},
  COK: { name:"Cook Islands",         flag:"🇨🇰", prior:16, region:"oceania",
         types:["TC","FL","HEAT"],
         adj:[],                                                              cent:[-159.8,-21.2]},
  ESH: { name:"Western Sahara",       flag:"🇪🇭", prior:28, region:"africa",
         types:["DR","HEAT","CE"],
         adj:["MAR","DZA","MRT"],                                           cent:[-13.0,24.2] },
};

// ─── CURATED FALLBACK DATA ────────────────────────────────────────────────────

const FALLBACK = {
  ipc: [
    { country:"Somalia",              phase:4, population:3800000 },
    { country:"South Sudan",          phase:4, population:7100000 },
    { country:"Sudan",                phase:4, population:4500000 },
    { country:"Yemen",                phase:4, population:1800000 },
    { country:"Palestine",            phase:4, population:2200000 },
    { country:"Yemen",                phase:3, population:15200000 },
    { country:"Sudan",                phase:3, population:13300000 },
    { country:"Afghanistan",          phase:3, population:15400000 },
    { country:"Syria",                phase:3, population:12400000 },
    { country:"Mali",                 phase:3, population:1200000 },
    { country:"Burkina Faso",         phase:3, population:2100000 },
    { country:"DR Congo",             phase:3, population:23400000 },
    { country:"Ethiopia",             phase:3, population:20000000 },
    { country:"Niger",                phase:3, population:2000000 },
    { country:"Chad",                 phase:3, population:1500000 },
    { country:"Central African Rep.", phase:3, population:800000 },
    { country:"Myanmar",              phase:3, population:3200000 },
    { country:"Nigeria",              phase:3, population:25000000 },
    { country:"Haiti",                phase:3, population:4500000 },
    { country:"Kenya",                phase:2, population:4200000 },
    { country:"Pakistan",             phase:2, population:8000000 },
    { country:"Libya",                phase:2, population:800000 },
    { country:"Venezuela",            phase:2, population:5000000 },
    { country:"Colombia",             phase:2, population:3000000 },
    { country:"Mozambique",           phase:2, population:2100000 },
    { country:"Zimbabwe",             phase:2, population:3800000 },
  ],

  who: [
    { country:"DR Congo",       disease:"mpox",        cases:20000,  deaths:500, severity:"critical" },
    { country:"DR Congo",       disease:"Ebola",       cases:15,     deaths:8,   severity:"critical" },
    { country:"Haiti",          disease:"cholera",     cases:50000,  deaths:800, severity:"high"     },
    { country:"Somalia",        disease:"cholera",     cases:5000,   deaths:80,  severity:"high"     },
    { country:"Nigeria",        disease:"Lassa fever", cases:1000,   deaths:150, severity:"high"     },
    { country:"Sudan",          disease:"dengue",      cases:3000,   deaths:50,  severity:"medium"   },
    { country:"Ethiopia",       disease:"measles",     cases:8000,   deaths:100, severity:"medium"   },
    { country:"Myanmar",        disease:"malaria",     cases:150000, deaths:500, severity:"medium"   },
    { country:"Burkina Faso",   disease:"dengue",      cases:2000,   deaths:30,  severity:"medium"   },
    { country:"Pakistan",       disease:"polio",       cases:10,     deaths:0,   severity:"low"      },
    { country:"Yemen",          disease:"cholera",     cases:12000,  deaths:220, severity:"high"     },
    { country:"South Sudan",    disease:"cholera",     cases:8000,   deaths:130, severity:"high"     },
    { country:"Central African Rep.", disease:"measles",cases:3000,  deaths:40,  severity:"medium"   },
    { country:"Cameroon",       disease:"polio",       cases:20,     deaths:1,   severity:"low"      },
    { country:"Uganda",         disease:"Ebola",       cases:8,      deaths:4,   severity:"critical" },
  ],

  unhcr: {
    "Somalia":              { refugees:1100000,  idps:3900000, asylum_seekers:50000  },
    "South Sudan":          { refugees:2300000,  idps:4200000, asylum_seekers:300000 },
    "Sudan":                { refugees:1200000,  idps:3700000, asylum_seekers:800000 },
    "Syria":                { refugees:6500000,  idps:6800000, asylum_seekers:150000 },
    "Afghanistan":          { refugees:6100000,  idps:4400000, asylum_seekers:200000 },
    "Yemen":                { refugees:200000,   idps:4500000, asylum_seekers:50000  },
    "Palestine":            { refugees:5900000,  idps:0,       asylum_seekers:0      },
    "Ukraine":              { refugees:6000000,  idps:3700000, asylum_seekers:50000  },
    "DR Congo":             { refugees:900000,   idps:5200000, asylum_seekers:200000 },
    "Myanmar":              { refugees:1300000,  idps:1500000, asylum_seekers:50000  },
    "Nigeria":              { refugees:300000,   idps:3200000, asylum_seekers:100000 },
    "Ethiopia":             { refugees:900000,   idps:4300000, asylum_seekers:150000 },
    "Mali":                 { refugees:200000,   idps:400000,  asylum_seekers:50000  },
    "Burkina Faso":         { refugees:50000,    idps:2000000, asylum_seekers:20000  },
    "Niger":                { refugees:200000,   idps:300000,  asylum_seekers:50000  },
    "Chad":                 { refugees:500000,   idps:400000,  asylum_seekers:50000  },
    "Central African Rep.": { refugees:200000,   idps:700000,  asylum_seekers:50000  },
    "Haiti":                { refugees:50000,    idps:600000,  asylum_seekers:50000  },
    "Colombia":             { refugees:100000,   idps:4900000, asylum_seekers:30000  },
    "Iraq":                 { refugees:300000,   idps:1200000, asylum_seekers:40000  },
    "Lebanon":              { refugees:1500000,  idps:300000,  asylum_seekers:20000  },
    "Libya":                { refugees:200000,   idps:100000,  asylum_seekers:50000  },
    "Venezuela":            { refugees:100000,   idps:100000,  asylum_seekers:50000  },
    "Pakistan":             { refugees:1400000,  idps:500000,  asylum_seekers:50000  },
    "Bangladesh":           { refugees:900000,   idps:50000,   asylum_seekers:10000  },
    "Iran":                 { refugees:800000,   idps:0,       asylum_seekers:20000  },
    "Turkey":               { refugees:3500000,  idps:0,       asylum_seekers:100000 },
    "Jordan":               { refugees:700000,   idps:0,       asylum_seekers:50000  },
    "Uganda":               { refugees:1500000,  idps:50000,   asylum_seekers:30000  },
    "Kenya":                { refugees:500000,   idps:100000,  asylum_seekers:30000  },
    "Mozambique":           { refugees:50000,    idps:700000,  asylum_seekers:10000  },
    "Cameroon":             { refugees:400000,   idps:500000,  asylum_seekers:20000  },
    "North Korea":          { refugees:0,        idps:100000,  asylum_seekers:0      },
    "Myanmar":              { refugees:1300000,  idps:1500000, asylum_seekers:50000  },
  },
};

// ─── REGION ALIASES ──────────────────────────────────────────────────────────

const REGION_ALIASES = {
  africa:     ["africa"],
  asia:       ["asia"],
  europe:     ["europe"],
  middleeast: ["middleeast","middle east","mena"],
  americas:   ["americas","latin america","latam","caribbean"],
  oceania:    ["oceania","pacific"],
};

// ─── MATH UTILITIES ──────────────────────────────────────────────────────────

function lcg(seed) {
  return ((Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0) / 0x100000000;
}

function strHash(str) {
  return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0;
}

const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));

function composite(dims) {
  return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0);
}

function cusum(arr) {
  if (arr.length < 6) return { det: false, z: 0 };
  const base = arr.slice(0, -3);
  const mu   = base.reduce((a, b) => a + b, 0) / base.length;
  const std  = Math.sqrt(base.reduce((s, v) => s + (v - mu) ** 2, 0) / base.length) || 1;
  let sP = 0, sN = 0;
  arr.forEach(x => {
    sP = Math.max(0, sP + (x - mu) - 0.5 * std);
    sN = Math.max(0, sN - (x - mu) - 0.5 * std);
  });
  return {
    det: sP > 4 * std || sN > 4 * std,
    z:   +Math.abs((arr[arr.length - 1] - mu) / std).toFixed(1),
  };
}

function trendForecast(hist, current) {
  if (hist.length < 5) return { fc: current, trend: "stable", esc: false, slope: 0 };
  const w    = hist.slice(-10);
  const n    = w.length;
  const xBar = (n - 1) / 2;
  const yBar = w.reduce((a, b) => a + b, 0) / n;
  const num  = w.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
  const den  = w.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
  const slope = den ? +(num / den).toFixed(2) : 0;
  const fc    = clamp(current + slope * 7);
  return {
    fc,
    slope,
    trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable",
    esc:   fc > current + 5,
  };
}

function seedHistory(iso, current) {
  const seed = strHash(iso);
  let v = clamp(current + Math.round((lcg(seed) - 0.5) * 20), 5, 99);
  const hist = [];
  for (let i = 0; i <= 28; i++) {
    hist.push(v);
    v = clamp(v + (current - v) * 0.15 + (lcg(strHash(iso + i)) - 0.5) * 6);
  }
  hist[hist.length - 1] = current;
  return hist;
}

// ─── PRIOR DIMENSION BUILDER ─────────────────────────────────────────────────

function buildPriorDims(base, types) {
  const has = t => types.includes(t);
  const cl  = v => clamp(v, 5, 99);
  return {
    conflict:     cl(base * ((has("CW")||has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
    displacement: cl(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.80 : 0.38)),
    food:         cl(base * ((has("FN")||has("DR"))             ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health:       cl(base * ((has("EP")||has("FN"))             ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     cl(base * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.82 : 0.42) + 10),
    climate:      cl(base * ((has("HEAT")||has("DR"))           ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       cl(base * ((has("CW")||has("CE"))             ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    cl(base * ((has("CE")||has("CW")||has("REF")) ? 0.85 : 0.42) + 8),
  };
}

// ─── LIVE ADJUSTMENTS ────────────────────────────────────────────────────────

function applyLiveAdjustments(priorDims, signals) {
  const dims  = { ...priorDims };
  const audit = [];

  if (signals.ipcPhase >= 2) {
    const boost = Math.min(32, (signals.ipcPhase - 1) * 8);
    dims.food = clamp(dims.food + boost);
    audit.push({ source:"IPC", field:"food", delta:boost,
      reason:`Phase ${signals.ipcPhase} food insecurity`,
      population_affected: signals.ipcPopulation });
  }

  if (signals.whoOutbreaks.length > 0) {
    const SEVERITY_BOOST = { critical:20, high:12, medium:6, low:2 };
    let total = 0;
    const detail = [];
    for (const ob of signals.whoOutbreaks) {
      const b = SEVERITY_BOOST[ob.severity] || 3;
      total += b;
      detail.push(`${ob.disease} (${ob.severity})`);
    }
    const boost = Math.min(30, total);
    dims.health = clamp(dims.health + boost);
    audit.push({ source:"WHO", field:"health", delta:boost,
      reason:`Active outbreaks: ${detail.join(", ")}`,
      outbreaks: signals.whoOutbreaks });
  }

  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(25, Math.round((signals.quakeMag - 4.0) * 5));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.6));
    dims.health       = clamp(dims.health       + Math.floor(boost * 0.4));
    audit.push({ source:"USGS", field:"displacement+health", delta:boost,
      reason:`M${signals.quakeMag.toFixed(1)} earthquake near ${signals.quakePlace}`,
      magnitude: signals.quakeMag });
  }

  if (signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const boost = m >= 10 ? 30 : m >= 5 ? 25 : m >= 3 ? 20 : m >= 1.5 ? 15 : m >= 0.5 ? 10 : m >= 0.1 ? 5 : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      audit.push({ source:"UNHCR", field:"displacement", delta:boost,
        reason:`${m.toFixed(1)}M displaced (refugees + IDPs + asylum-seekers)`,
        breakdown: { refugees:signals.refugees, idps:signals.idps, asylum_seekers:signals.asylum_seekers } });
    }
  }

  if (signals.maxTempC >= 35) {
    const boost = Math.min(20, Math.round((signals.maxTempC - 30) * 1.5));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.6));
    dims.health  = clamp(dims.health  + Math.floor(boost * 0.4));
    audit.push({ source:"Open-Meteo", field:"climate+health", delta:boost,
      reason:`${signals.maxTempC}°C (${signals.maxTempC >= 42 ? "extreme heatwave" : signals.maxTempC >= 38 ? "severe heat" : "significant heat"})` });
  }

  return { dims, score: clamp(composite(dims)), audit };
}

// ─── SAFE FETCH ───────────────────────────────────────────────────────────────

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok: true, data: r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok: false, error: e.message }));

// ─── LIVE DATA FETCHERS ───────────────────────────────────────────────────────

async function fetchUSGS() {
  const r = await safeFetch(
    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson")
      .then(r => r.json())
  );
  return { data: r.ok ? (r.data?.features || []) : [], live: r.ok };
}

async function fetchIPC() {
  try {
    const analyses = await safeFetch(fetch("https://api.ipcinfo.org/analyses").then(r => r.json()));
    if (analyses.ok && analyses.data?.length) {
      const latest = analyses.data.sort((a, b) => new Date(b.analysis_date) - new Date(a.analysis_date))[0];
      if (latest?.id) {
        const pop = await safeFetch(fetch(`https://api.ipcinfo.org/population/${latest.id}`).then(r => r.json()));
        if (pop.ok && pop.data?.length) {
          return {
            data: pop.data.map(i => ({ country: i.area_name || i.country, phase: i.phase_class || i.phase || 0, population: i.population || 0 })),
            live: true,
          };
        }
      }
    }
  } catch {}
  return { data: FALLBACK.ipc, live: false };
}

async function fetchWHO() {
  try {
    const r = await safeFetch(
      fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/api/news/rss/en")
        .then(r => r.json())
    );
    if (r.ok && r.data?.items) {
      const KEYWORDS = ["outbreak","disease","ebola","mpox","cholera","dengue","polio","measles","lassa","marburg","influenza"];
      const parsed = [];
      for (const item of r.data.items) {
        const text = ((item.title || "") + " " + (item.description || "")).toLowerCase();
        if (!KEYWORDS.some(k => text.includes(k))) continue;
        let country = "Unknown";
        for (const [, d] of Object.entries(COUNTRIES)) {
          if (item.title.toLowerCase().includes(d.name.toLowerCase())) { country = d.name; break; }
        }
        const severity =
          text.includes("public health emergency") || text.includes("pandemic") ? "critical" :
          text.includes("death") || text.includes("fatal") ? "high" : "medium";
        parsed.push({ country, disease: item.title.split("—")[0].trim().slice(0, 50), severity, date: item.pubDate, cases: 0, deaths: 0 });
      }
      const seen = new Set();
      const unique = parsed.filter(o => { const k = `${o.country}|${o.disease}`; if (seen.has(k)) return false; seen.add(k); return true; });
      return { data: unique.slice(0, 20), live: true };
    }
  } catch {}
  return { data: FALLBACK.who, live: false };
}

async function fetchUNHCR() {
  try {
    const r = await safeFetch(
      fetch("https://api.unhcr.org/refugee-statistics/v1/population?year=2024&limit=300").then(r => r.json())
    );
    if (r.ok && r.data?.data?.length) {
      const map = {};
      for (const item of r.data.data) {
        const key = item.country_of_asylum || item.country_of_origin;
        if (!key) continue;
        if (!map[key]) map[key] = { refugees: 0, idps: 0, asylum_seekers: 0 };
        map[key].refugees      += item.refugee_population || 0;
        map[key].idps          += item.idp_population || 0;
        map[key].asylum_seekers+= item.asylum_seekers_population || 0;
      }
      return { data: map, live: true };
    }
  } catch {}
  return { data: FALLBACK.unhcr, live: false };
}

async function fetchWeatherBatch(isos) {
  const results = {};
  await Promise.all(
    isos.map(async iso => {
      const [lon, lat] = COUNTRIES[iso].cent;
      const r = await safeFetch(
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=auto&forecast_days=1`)
          .then(r => r.json())
      );
      results[iso] = r.ok ? (r.data?.daily?.temperature_2m_max?.[0] ?? null) : null;
    })
  );
  return results;
}

async function fetchAllLive(isos) {
  const [usgs, ipc, who, unhcr, weatherMap] = await Promise.all([
    fetchUSGS(),
    fetchIPC(),
    fetchWHO(),
    fetchUNHCR(),
    fetchWeatherBatch(isos),
  ]);
  return { usgs, ipc, who, unhcr, weatherMap };
}

// ─── SIGNAL EXTRACTION ────────────────────────────────────────────────────────

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();

  const quakes = (live.usgs.data || []).filter(f =>
    (f.properties?.place || "").toLowerCase().includes(name)
  );
  const topQuake = quakes.length ? quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a) : null;

  const ipcRows  = (live.ipc.data || []).filter(i => (i.country || "").toLowerCase().includes(name));
  const topIPC   = ipcRows.length ? ipcRows.reduce((a, b) => b.phase > a.phase ? b : a) : null;

  const whoRows  = (live.who.data || []).filter(o => o.country.toLowerCase().includes(name));

  const unhcrMap = live.unhcr.data || {};
  let displacement = unhcrMap[COUNTRIES[iso].name]
    || Object.entries(unhcrMap).find(([k]) => k.toLowerCase().includes(name) || name.includes(k.toLowerCase()))?.[1]
    || null;

  const totalDisplaced = displacement
    ? (displacement.refugees || 0) + (displacement.idps || 0) + (displacement.asylum_seekers || 0)
    : 0;

  return {
    quakeMag:      topQuake ? +topQuake.properties.mag : 0,
    quakePlace:    topQuake ? topQuake.properties.place.split(",")[0].trim() : null,
    ipcPhase:      topIPC?.phase ?? 0,
    ipcPopulation: topIPC?.population ?? 0,
    whoOutbreaks:  whoRows,
    refugees:      displacement?.refugees || 0,
    idps:          displacement?.idps || 0,
    asylum_seekers:displacement?.asylum_seekers || 0,
    totalDisplaced,
    maxTempC:      live.weatherMap[iso] ?? 0,
  };
}

// ─── STORE BUILDER ────────────────────────────────────────────────────────────

function buildStore(liveData) {
  const seed  = Math.floor(Date.now() / CFG.SEED_INTERVAL_MS);
  const store = {};

  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const jitter     = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const base       = clamp(country.prior + jitter, 5, CFG.PRIOR_CAP);
    const priorDims  = buildPriorDims(base, country.types);
    const priorScore = clamp(composite(priorDims));

    let dims, score, audit;
    if (liveData) {
      const signals  = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals);
      dims  = adjusted.dims;
      score = adjusted.score;
      audit = adjusted.audit;
      store[iso] = { ...country, dims, score, priorScore, liveBoost: score - priorScore, audit, signals, spillover: 0 };
    } else {
      dims  = priorDims;
      score = priorScore;
      store[iso] = { ...country, dims, score, priorScore, liveBoost: 0, audit: [], signals: {}, spillover: 0 };
    }
  }

  // Regional spillover pass
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    store[iso].spillover = +(Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE).toFixed(1);
    store[iso].score     = clamp(store[iso].score + store[iso].spillover);
  }

  return store;
}

// ─── NAME RESOLUTION ─────────────────────────────────────────────────────────

const NAME_ALIASES = {
  "us": "USA", "united states": "USA", "america": "USA",
  "uk": "GBR", "britain": "GBR", "england": "GBR", "great britain": "GBR",
  "dr congo": "COD", "drc": "COD", "congo": "COD", "democratic republic of congo": "COD",
  "central african republic": "CAF", "car": "CAF",
  "south sudan": "SSD",
  "myanmar": "MMR", "burma": "MMR",
  "iran": "IRN", "persia": "IRN",
  "north korea": "PRK", "nk": "PRK", "dprk": "PRK",
  "south korea": "KOR", "sk": "KOR", "republic of korea": "KOR",
  "uae": "ARE", "emirates": "ARE", "united arab emirates": "ARE",
  "russia": "RUS",
  "czechia": "CZE", "czech republic": "CZE",
  "eswatini": "SWZ", "swaziland": "SWZ",
  "east timor": "TLS", "timor leste": "TLS",
  "ivory coast": "CIV", "cote d ivoire": "CIV",
  "republic of congo": "COG", "congo republic": "COG",
  "sao tome": "STP",
  "northern ireland": "GBR",
  "taiwan": "TWN",
  "hong kong": "HKG",
  "macau": "MAC",
  "kosovo": "XKX",
  "western sahara": "ESH",
  "palestine": "PSE", "west bank": "PSE", "gaza": "PSE",
  "kyrgyzstan": "KGZ", "kirghizstan": "KGZ",
  "turkey": "TUR", "turkiye": "TUR",
  "north macedonia": "MKD", "macedonia": "MKD",
};

function resolveQuery(q) {
  if (!q) return null;
  const lower = q.toLowerCase().trim();
  // Alias lookup
  if (NAME_ALIASES[lower]) return NAME_ALIASES[lower];
  // Exact ISO match
  const exact = Object.keys(COUNTRIES).find(iso => iso.toLowerCase() === lower);
  if (exact) return exact;
  // Exact name match
  const byName = Object.entries(COUNTRIES).find(([, d]) => d.name.toLowerCase() === lower);
  if (byName) return byName[0];
  // Partial name match
  const partial = Object.entries(COUNTRIES).find(([, d]) =>
    d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())
  );
  return partial ? partial[0] : null;
}

// ─── SEVERITY HELPERS ────────────────────────────────────────────────────────

function severityLabel(score) {
  return score >= 85 ? "CATASTROPHIC" : score >= 75 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "ELEVATED" : "MODERATE";
}

function severityEmoji(score) {
  return score >= 85 ? "🔴" : score >= 75 ? "🟠" : score >= 60 ? "🟡" : score >= 40 ? "🟢" : "🔵";
}

function recommendation(score) {
  if (score >= 85) return { tier: "IMMEDIATE", text: "IMMEDIATE ACTION REQUIRED. Humanitarian response critical." };
  if (score >= 75) return { tier: "URGENT",    text: "Urgent response needed. Mobilise resources now." };
  if (score >= 60) return { tier: "HIGH",      text: "Elevated concern. Prepare response and monitor daily." };
  if (score >= 40) return { tier: "MONITOR",   text: "Monitor situation. Maintain readiness." };
  return                 { tier: "WATCH",      text: "Routine monitoring. No immediate action required." };
}

// ─── NARRATIVE BUILDER ────────────────────────────────────────────────────────

function buildDimContext(iso, dimKey, val, signals) {
  if (!signals) return "";
  if (dimKey === "displacement" && signals.totalDisplaced > 0)
    return ` (${(signals.totalDisplaced/1e6).toFixed(1)}M people — refugees, IDPs, asylum-seekers)`;
  if (dimKey === "food" && signals.ipcPhase >= 3)
    return ` (IPC Phase ${signals.ipcPhase}${signals.ipcPopulation > 0 ? `, ${(signals.ipcPopulation/1e6).toFixed(1)}M people` : ""})`;
  if (dimKey === "health" && signals.whoOutbreaks?.length)
    return ` (${signals.whoOutbreaks[0].disease} outbreak${signals.whoOutbreaks.length > 1 ? `, +${signals.whoOutbreaks.length - 1} more` : ""})`;
  if (dimKey === "conflict" && val >= 70)
    return ` (active conflict)`;
  return "";
}

function buildNarrative(iso, store, ranked) {
  const c     = store[iso];
  const hist  = seedHistory(iso, c.score);
  const anom  = cusum(hist);
  const fc    = trendForecast(hist, c.score);
  const rank  = ranked.indexOf(iso) + 1;
  const pct   = Math.round((1 - rank / ranked.length) * 100);
  const sev   = severityLabel(c.score);
  const sEmoji= severityEmoji(c.score);

  const topDims = [...DIMS]
    .map(d => ({ ...d, val: c.dims[d.k] || 0 }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 3);

  const delta  = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  const dAbs   = Math.abs(Math.round(delta));
  const trendPhrase =
    delta > 5  ? `Escalating rapidly (+${dAbs} pts in 7 days)` :
    delta > 2  ? `Escalating (+${dAbs} pts)` :
    delta < -5 ? `Improving significantly (−${dAbs} pts)` :
    delta < -2 ? `Improving slightly (−${dAbs} pts)` :
                 `Stable (±${dAbs} pts)`;

  const evidence = [];
  const s = c.signals || {};

  if (s.quakeMag >= 4.5)
    evidence.push(`🌍 M${s.quakeMag.toFixed(1)} earthquake near ${s.quakePlace} (USGS)`);
  if (s.ipcPhase >= 3)
    evidence.push(`🍚 IPC Phase ${s.ipcPhase} food insecurity${s.ipcPopulation > 0 ? ` — ${(s.ipcPopulation/1e6).toFixed(1)}M people` : ""}`);
  else if (s.ipcPhase === 2)
    evidence.push(`🌾 IPC Phase 2 (Stressed) food situation`);
  for (const ob of (s.whoOutbreaks || []).slice(0, 2))
    evidence.push(`🦠 ${ob.disease} outbreak — ${ob.severity} severity (WHO)`);
  if (s.totalDisplaced > 0)
    evidence.push(`🚶 ${(s.totalDisplaced/1e6).toFixed(1)}M displaced (UNHCR)`);
  if (s.maxTempC >= 42) evidence.push(`🥵 Extreme heatwave — ${s.maxTempC}°C (Open-Meteo)`);
  else if (s.maxTempC >= 38) evidence.push(`🌡️ Severe heat — ${s.maxTempC}°C (Open-Meteo)`);

  const hotNb = (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 60).map(n => store[n].name);
  const spillLine = hotNb.length >= 1
    ? `🌐 Regional pressure from ${hotNb.slice(0, 2).join(" and ")} adds +${c.spillover.toFixed(1)} pts.`
    : null;

  const anomLine = anom.z >= 1.5
    ? `⚠️ Score is ${anom.z}σ from 28-day baseline${anom.det ? " — STATISTICAL ANOMALY DETECTED" : ""}.`
    : null;

  const fcLine = fc.esc
    ? `📈 Forecast: ${fc.fc}/100 in 7 days (escalating).`
    : `📊 Forecast: ${fc.fc}/100 in 7 days (${fc.trend}).`;

  const parts = [];
  parts.push(`${c.flag} **${c.name}** is at **${c.score}/100** — ${sEmoji} **${sev}**`);
  parts.push(`Ranks #${rank} of ${ranked.length} tracked countries (top ${pct}%).`);
  parts.push(`\n**What's driving this:**`);
  for (const d of topDims)
    parts.push(`• ${d.l}: ${d.val}/100${buildDimContext(iso, d.k, d.val, c.signals)}`);
  parts.push(`\n**Trend:** ${trendPhrase}`);
  if (evidence.length) {
    parts.push(`\n**Live evidence:**`);
    evidence.forEach(e => parts.push(`• ${e}`));
  }
  if (spillLine) parts.push(`\n${spillLine}`);
  if (anomLine)  parts.push(anomLine);
  parts.push(`\n${fcLine}`);
  if (c.liveBoost !== 0)
    parts.push(`\n📊 Live data adjusted this score ${c.liveBoost > 0 ? `+${c.liveBoost}` : c.liveBoost} pts from the prior estimate of ${c.priorScore}/100.`);
  parts.push(`\n**Recommendation:** ${recommendation(c.score).text}`);

  return parts.join("\n");
}

// ─── COMPARISON BUILDER ───────────────────────────────────────────────────────

function buildComparison(isos, store, ranked) {
  const rows = isos.map(iso => {
    const c    = store[iso];
    const hist = seedHistory(iso, c.score);
    const fc   = trendForecast(hist, c.score);
    const delta = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
    return {
      iso, name: c.name, flag: c.flag,
      score: c.score, severity: severityLabel(c.score),
      rank: ranked.indexOf(iso) + 1,
      dimensions: Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
      trend_7d: Math.round(delta),
      forecast_7d: fc.fc,
    };
  });

  const differentiators = [];
  if (rows.length === 2) {
    const [a, b] = rows;
    for (const d of DIMS) {
      const diff = (a.dimensions[d.k] || 0) - (b.dimensions[d.k] || 0);
      if (Math.abs(diff) >= 10) {
        differentiators.push({
          dimension: d.l,
          [`${a.iso}_higher_by`]: diff > 0 ? diff : undefined,
          [`${b.iso}_higher_by`]: diff < 0 ? -diff : undefined,
        });
      }
    }
    differentiators.sort((a, b) => {
      const va = Object.values(a).find(v => typeof v === "number") || 0;
      const vb = Object.values(b).find(v => typeof v === "number") || 0;
      return vb - va;
    });
  }

  const sorted  = [...rows].sort((a, b) => b.score - a.score);
  const verdict = rows.length === 2
    ? `${sorted[0].flag} ${sorted[0].name} is more severe overall (${sorted[0].score} vs ${sorted[1].score}). Key difference: ${differentiators[0] ? `${sorted[0].name} is higher on ${differentiators[0].dimension}` : "scores are broadly similar"}.`
    : `${sorted[0].flag} ${sorted[0].name} ranks highest of the ${rows.length} countries compared.`;

  return { countries: rows, differentiators, verdict };
}

// ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────

function buildPayload(iso, store, ranked) {
  const c    = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc   = trendForecast(hist, c.score);
  const anom = cusum(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = Math.round(hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)]);

  return {
    iso,
    name:           c.name,
    flag:           c.flag,
    score:          c.score,
    severity:       severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    rank,
    total_countries: ranked.length,
    percentile:     Math.round((1 - rank / ranked.length) * 100),

    dimensions: Object.fromEntries(
      DIMS.map(d => [d.k, {
        value:   c.dims[d.k] || 0,
        label:   d.l,
        weight:  d.w,
        context: buildDimContext(iso, d.k, c.dims[d.k] || 0, c.signals),
      }])
    ),

    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️" })),
    needs:        [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],

    trend: {
      delta_7d:    delta7,
      direction:   fc.trend,
      slope:       fc.slope,
      forecast_7d: fc.fc,
      escalating:  fc.esc,
    },

    anomaly: {
      detected: anom.det,
      z_score:  anom.z,
      note:     anom.z >= 1.5 ? "Score deviates from 28-day simulated baseline" : null,
    },

    spillover: {
      value: c.spillover,
      from:  (COUNTRIES[iso].adj || [])
        .filter(n => store[n]?.score >= CFG.SPILLOVER_FLOOR)
        .map(n => ({ iso: n, name: store[n].name, score: store[n].score })),
    },

    live_evidence: {
      earthquake:    c.signals?.quakeMag >= 4.5
        ? { magnitude: c.signals.quakeMag, location: c.signals.quakePlace, source: "USGS" }
        : null,
      food_security: c.signals?.ipcPhase >= 1
        ? { phase: c.signals.ipcPhase, population_affected: c.signals.ipcPopulation, source: "IPC" }
        : null,
      disease_outbreaks: (c.signals?.whoOutbreaks || []).map(o => ({ ...o, source: "WHO" })),
      displacement:  c.signals?.totalDisplaced > 0
        ? { total: c.signals.totalDisplaced, refugees: c.signals.refugees, idps: c.signals.idps, asylum_seekers: c.signals.asylum_seekers, source: "UNHCR" }
        : null,
      heat:          c.signals?.maxTempC >= 35
        ? { max_temp_c: c.signals.maxTempC, source: "Open-Meteo" }
        : null,
    },

    score_audit: {
      prior_score: c.priorScore,
      adjustments: c.audit || [],
      spillover:   c.spillover,
      final_score: c.score,
      live_boost:  c.liveBoost,
    },

    recommendation: recommendation(c.score),
    region: c.region,
    narrative: buildNarrative(iso, store, ranked),
  };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const start = Date.now();

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS); res.end(); return;
  }
  if (req.method !== "GET") {
    res.writeHead(405, CORS); res.end(JSON.stringify({ error: "Method not allowed" })); return;
  }

  let params;
  try {
    const url = new URL(req.url ?? "/", "https://x");
    params = {
      iso:       url.searchParams.get("iso")?.toUpperCase().trim() || null,
      top:       parseInt(url.searchParams.get("top") || "1", 10),
      q:         url.searchParams.get("q")?.trim() || null,
      region:    url.searchParams.get("region")?.toLowerCase().trim() || null,
      threshold: parseInt(url.searchParams.get("threshold") || "0", 10),
    };
    if (Number.isNaN(params.top))       params.top = 1;
    if (Number.isNaN(params.threshold)) params.threshold = 0;
    params.top = Math.min(CFG.MAX_TOP_N, Math.max(1, params.top));
  } catch {
    res.writeHead(400, CORS); res.end(JSON.stringify({ error: "Bad request URL" })); return;
  }

  // Resolve ?region= alias
  if (params.region) {
    for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
      if (aliases.includes(params.region)) { params.region = canonical; break; }
    }
  }

  // Resolve ?q= fuzzy search
  if (params.q && !params.iso) {
    const resolved = resolveQuery(params.q);
    if (!resolved) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({
        error: `Could not resolve "${params.q}" to a tracked country`,
        hint:  "Try the ISO-3166-1 alpha-3 code (e.g. SOM, YEM) or full country name",
        available: Object.entries(COUNTRIES).map(([iso, d]) => `${iso} (${d.name})`).sort(),
      }));
      return;
    }
    params.iso = resolved;
  }

  const isoList = params.iso
    ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s])
    : [];

  const invalidISOs = params.iso
    ? params.iso.split(",").map(s => s.trim()).filter(s => !COUNTRIES[s])
    : [];
  if (invalidISOs.length) {
    res.writeHead(404, CORS);
    res.end(JSON.stringify({
      error:     `Unknown ISO codes: ${invalidISOs.join(", ")}`,
      available: Object.keys(COUNTRIES).sort(),
    }));
    return;
  }

  try {
    // Build prior store to determine targets
    const priorStore  = buildStore(null);
    const priorRanked = Object.keys(priorStore).sort((a, b) => priorStore[b].score - priorStore[a].score);

    let targetIsos;
    if (isoList.length)       targetIsos = isoList;
    else if (params.region)   targetIsos = priorRanked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) targetIsos = priorRanked.filter(iso => priorStore[iso].score >= params.threshold);
    else                      targetIsos = priorRanked.slice(0, params.top);

    if (!targetIsos.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: "No countries matched the query" }));
      return;
    }

    const liveData = await fetchAllLive(targetIsos);
    const store    = buildStore(liveData);
    const ranked   = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    let finalIsos;
    if (isoList.length)       finalIsos = isoList;
    else if (params.region)   finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].score >= params.threshold);
    else                      finalIsos = ranked.slice(0, params.top);

    const payloads    = finalIsos.map(iso => buildPayload(iso, store, ranked));
    const comparison  = finalIsos.length >= 2 ? buildComparison(finalIsos, store, ranked) : null;

    const sources = {
      usgs:    { live: liveData.usgs.live,  events:          liveData.usgs.data?.length ?? 0,  label: "USGS Earthquake Hazards Program" },
      ipc:     { live: liveData.ipc.live,   classifications: liveData.ipc.data?.length ?? 0,   label: "IPC Global — Food Security Phases" },
      who:     { live: liveData.who.live,   outbreaks:       liveData.who.data?.length ?? 0,   label: "WHO Disease Outbreak News" },
      unhcr:   { live: liveData.unhcr.live, countries:       Object.keys(liveData.unhcr.data || {}).length, label: "UNHCR Global Refugee Statistics" },
      weather: { live: Object.values(liveData.weatherMap).some(v => v !== null), label: "Open-Meteo Weather Forecast" },
    };

    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";

    const body = {
      meta: {
        generated_at:      new Date().toISOString(),
        elapsed_ms:        Date.now() - start,
        mode,
        countries_tracked: Object.keys(COUNTRIES).length,
        score_seed:        Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update:       new Date(
          (Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS
        ).toISOString(),
        sources,
        methodology: "Weighted 8-dimension composite. Priors from OCHA/ACAPS. Live data from USGS/IPC/WHO/UNHCR/Open-Meteo adjusts scores. See score_audit on each country.",
      },
      ...(mode === "single"     ? { top_story:  payloads[0] } : {}),
      ...(mode === "list"       ? { countries:  payloads    } : {}),
      ...(mode === "comparison" ? { comparison, countries: payloads } : {}),
    };

    const secsUntilNextSeed = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);
    res.writeHead(200, { ...CORS, "Cache-Control": `public, s-maxage=${secsUntilNextSeed}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
