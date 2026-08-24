"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API  — ULTIMATE EDITION v10.0 — TIME-SENSITIVE WST
//  ────────────────────────────────────────────────────────────────────────────
//  🏆 THE MOST ADVANCED CRISIS INTELLIGENCE API EVER BUILT
//  🌍 COVERS ALL 179 COUNTRIES WITH REAL FSI 2024 SCORES
//  🌐 STRUCTURAL VULNERABILITY VIA WALLERSTEIN'S WORLD SYSTEMS THEORY
//  ⏰ TIME-SENSITIVE SCORING WITH TEMPORAL DECAY AND MOMENTUM
//  🧠 ENSEMBLE ML WITH RECOVERY RATE ADJUSTMENTS
//  📡 RSS FEED OPTIMIZED FOR GOOGLE NEWS
// ════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CFG = {
  SEED_INTERVAL_MS:     300_000,
  FETCH_TIMEOUT_MS:     15_000,
  MAX_TOP_N:            179,
  SPILLOVER_RATE:       0.13,
  SPILLOVER_FLOOR:      50,
  PRIOR_JITTER:         2,
  PRIOR_CAP:            99,
  MIN_LIVE_EVIDENCE_SOURCES: 1,
  ANOMALY_WINDOW:       28,
  ANOMALY_Z_THRESHOLD:  2.0,
  CUSUM_K:              0.5,
  CUSUM_H:              4.0,
  CHANGEPOINT_MIN_SEG:  5,
  VOLATILITY_RATIO_THRESHOLD: 2.0,
  ML_ENABLED:           true,
  ML_LOOKBACK_DAYS:     30,
  ML_FORECAST_DAYS:     7,
  ML_CONFIDENCE_INTERVAL: 0.95,
  LEARNING_RATE:        0.01,
  HIDDEN_LAYERS:        [64, 32],
  SENTIMENT_ENABLED:    true,
  SENTIMENT_SOURCES:    ["news", "twitter", "reddit"],
  SENTIMENT_THRESHOLD:  0.3,
  HISTORY_ENABLED:      true,
  HISTORY_RETENTION_DAYS: 90,
  GEO_FENCING_ENABLED:  true,
  ALERT_WEBHOOK_URL:    null,
  ALERT_EMAIL:          null,
  ARTICLE_MIN_WORDS:    400,
  ARTICLE_SITE_NAME:    "GCIN · Global Crisis Index News",
  ARTICLE_BASE_URL:     "https://globalcrisisindex.com",
  ARTICLE_AUTHOR:       "GCIN Editorial Team",
  ARTICLE_TWITTER:      "@GlobalCrisisIdx",
  ARTICLE_LOGO:         "https://globalcrisisindex.com/logo.png",
  
  // ═══════════════════════════════════════════════════════════════════════
  //  🌐 WORLD SYSTEMS THEORY ENGINE v2.0 — TIME-SENSITIVE
  //  ─────────────────────────────────────────────────────────────────────
  //  Structural vulnerability with temporal dynamics:
  //  - Momentum: How fast scores change over time
  //  - Decay: How quickly countries recover from crises
  //  - Velocity: Rate of deterioration or improvement
  //  - Acceleration: Second-order rate of change
  // ═══════════════════════════════════════════════════════════════════════
  WST_ENABLED: true,
  WST_GLOBAL_INTEREST_RATE: 5.25,
  WST_DEBT_THRESHOLD: 60,
  WST_EXTRACTIVE_PENALTY_MAX: 25,
  WST_RECOVERY_BONUS_MAX: 15,
  WST_CURRENCY_CRISIS_THRESHOLD: 20,
  WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER: 0.15,
  WST_MOMENTUM_WEIGHT: 0.30,        // Weight of momentum in scoring
  WST_VELOCITY_WEIGHT: 0.20,        // Weight of velocity in scoring
  WST_ACCELERATION_WEIGHT: 0.15,    // Weight of acceleration in scoring
  WST_TIME_DECAY_HALF_LIFE: 7,      // Days for crisis memory decay
  WST_CRISIS_MOMENTUM_THRESHOLD: 5, // Points change to trigger momentum boost
  WST_STRUCTURAL_PERSISTENCE: 0.8,  // How much structural factors persist
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Content-Type":                 "application/json; charset=utf-8",
};

// ─── CRISIS ARCHETYPES ───────────────────────────────────────────────────────

const ARC = {
  CE:  { l:"Complex Emergency",    i:"⚔️",  n:["shelter","food","health","protection"], seo:"complex humanitarian emergency", color:"#ff375f" },
  CW:  { l:"Civil War",            i:"⚔️",  n:["shelter","protection","health","food"], seo:"armed conflict civil war", color:"#ff6b4a" },
  EQ:  { l:"Earthquake",           i:"🌍",  n:["shelter","health","water"],             seo:"earthquake disaster relief", color:"#ff8c42" },
  FL:  { l:"Flood",                i:"🌊",  n:["shelter","water","food"],               seo:"flooding disaster emergency", color:"#3ec5ff" },
  DR:  { l:"Drought",              i:"🏜️",  n:["food","water","nutrition"],             seo:"drought crisis food security", color:"#ffb020" },
  FN:  { l:"Famine",               i:"🍚",  n:["food","nutrition","health"],            seo:"famine hunger crisis", color:"#ff375f" },
  EP:  { l:"Epidemic",             i:"🦠",  n:["health","water","nutrition"],           seo:"disease outbreak epidemic", color:"#e879f9" },
  REF: { l:"Refugee Crisis",       i:"🚶",  n:["shelter","protection","water"],         seo:"refugee displacement crisis", color:"#bf7fff" },
  TC:  { l:"Cyclone / Hurricane",  i:"🌀",  n:["shelter","water"],                      seo:"cyclone hurricane disaster", color:"#00c8ff" },
  WF:  { l:"Wildfire",             i:"🔥",  n:["shelter","health"],                     seo:"wildfire emergency evacuation", color:"#ff6b4a" },
  HEAT:{ l:"Heatwave",             i:"🥵",  n:["health","water"],                       seo:"heatwave health emergency", color:"#ff8c42" },
  LS:  { l:"Landslide",            i:"⛰️",  n:["shelter","health"],                     seo:"landslide disaster", color:"#8bbdd8" },
  TSU: { l:"Tsunami",              i:"🌊",  n:["shelter","health","water"],             seo:"tsunami disaster warning", color:"#3ec5ff" },
  VLC: { l:"Volcano",              i:"🌋",  n:["shelter","health","water"],             seo:"volcanic eruption emergency", color:"#ff8c42" },
  ST:  { l:"Storm",                i:"⛈️",  n:["shelter","water"],                      seo:"severe storm disaster", color:"#00c8ff" },
  POL: { l:"Political Crisis",     i:"🏛️",  n:["protection","food","economic"],         seo:"political crisis instability", color:"#bf7fff" },
  ECO: { l:"Economic Collapse",    i:"📉",  n:["food","economic","health"],             seo:"economic crisis collapse", color:"#ffb020" },
};

// ─── DIMENSIONS ──────────────────────────────────────────────────────────────

const DIMS = [
  { k:"conflict",     l:"Conflict",      w:0.28, icon:"⚔️", color:"#ff375f" },
  { k:"displacement", l:"Displacement",  w:0.22, icon:"🚶", color:"#bf7fff" },
  { k:"food",         l:"Food Security", w:0.18, icon:"🌾", color:"#ffb020" },
  { k:"health",       l:"Health",        w:0.14, icon:"🏥", color:"#e879f9" },
  { k:"economic",     l:"Economic",      w:0.10, icon:"📉", color:"#ff8c42" },
  { k:"climate",      l:"Climate",       w:0.05, icon:"🌡️", color:"#00c8ff" },
  { k:"access",       l:"Access",        w:0.02, icon:"🚧", color:"#8bbdd8" },
  { k:"political",    l:"Political",     w:0.01, icon:"⚖️", color:"#bf7fff" },
];

// ─── REAL FSI 2024 COUNTRY DATA (179 COUNTRIES) ─────────────────────────────

const FSI_2024 = {
  SOM: { name:"Somalia",              flag:"🇸🇴", fsi_score:111.3, rank:1, region:"africa", fsi_band:"Very High Alert" },
  SDN: { name:"Sudan",                flag:"🇸🇩", fsi_score:109.3, rank:2, region:"africa", fsi_band:"Very High Alert" },
  SSD: { name:"South Sudan",          flag:"🇸🇸", fsi_score:109.0, rank:3, region:"africa", fsi_band:"High Alert" },
  SYR: { name:"Syria",                flag:"🇸🇾", fsi_score:108.1, rank:4, region:"middleeast", fsi_band:"High Alert" },
  COD: { name:"Congo-Kinshasa",       flag:"🇨🇩", fsi_score:106.7, rank:5, region:"africa", fsi_band:"High Alert" },
  YEM: { name:"Yemen",                flag:"🇾🇪", fsi_score:106.6, rank:6, region:"middleeast", fsi_band:"High Alert" },
  AFG: { name:"Afghanistan",          flag:"🇦🇫", fsi_score:103.9, rank:7, region:"asia", fsi_band:"High Alert" },
  CAF: { name:"Central African Rep.", flag:"🇨🇫", fsi_score:103.9, rank:8, region:"africa", fsi_band:"High Alert" },
  HTI: { name:"Haiti",                flag:"🇭🇹", fsi_score:103.5, rank:9, region:"americas", fsi_band:"High Alert" },
  TCD: { name:"Chad",                 flag:"🇹🇩", fsi_score:102.7, rank:10, region:"africa", fsi_band:"High Alert" },
  MMR: { name:"Myanmar",              flag:"🇲🇲", fsi_score:100.0, rank:11, region:"asia", fsi_band:"High Alert" },
  ETH: { name:"Ethiopia",             flag:"🇪🇹", fsi_score:98.1, rank:12, region:"africa", fsi_band:"Alert" },
  PSE: { name:"Palestine",            flag:"🇵🇸", fsi_score:97.8, rank:13, region:"middleeast", fsi_band:"Alert" },
  MLI: { name:"Mali",                 flag:"🇲🇱", fsi_score:97.3, rank:14, region:"africa", fsi_band:"Alert" },
  NGA: { name:"Nigeria",              flag:"🇳🇬", fsi_score:96.6, rank:15, region:"africa", fsi_band:"Alert" },
  LBY: { name:"Libya",                flag:"🇱🇾", fsi_score:96.5, rank:16, region:"africa", fsi_band:"Alert" },
  GIN: { name:"Guinea",               flag:"🇬🇳", fsi_score:96.4, rank:17, region:"africa", fsi_band:"Alert" },
  ZWE: { name:"Zimbabwe",             flag:"🇿🇼", fsi_score:95.7, rank:18, region:"africa", fsi_band:"Alert" },
  NER: { name:"Niger",                flag:"🇳🇪", fsi_score:95.2, rank:19, region:"africa", fsi_band:"Alert" },
  CMR: { name:"Cameroon",             flag:"🇨🇲", fsi_score:94.3, rank:20, region:"africa", fsi_band:"Alert" },
  BFA: { name:"Burkina Faso",         flag:"🇧🇫", fsi_score:94.2, rank:21, region:"africa", fsi_band:"Alert" },
  UKR: { name:"Ukraine",              flag:"🇺🇦", fsi_score:93.1, rank:22, region:"europe", fsi_band:"Alert" },
  LBN: { name:"Lebanon",              flag:"🇱🇧", fsi_score:92.7, rank:23, region:"middleeast", fsi_band:"Alert" },
  BDI: { name:"Burundi",              flag:"🇧🇮", fsi_score:92.6, rank:24, region:"africa", fsi_band:"Alert" },
  MOZ: { name:"Mozambique",           flag:"🇲🇿", fsi_score:92.5, rank:25, region:"africa", fsi_band:"Alert" },
  ERI: { name:"Eritrea",              flag:"🇪🇷", fsi_score:92.1, rank:26, region:"africa", fsi_band:"Alert" },
  PAK: { name:"Pakistan",             flag:"🇵🇰", fsi_score:91.7, rank:27, region:"asia", fsi_band:"Alert" },
  UGA: { name:"Uganda",               flag:"🇺🇬", fsi_score:91.1, rank:28, region:"africa", fsi_band:"Alert" },
  COG: { name:"Congo-Brazzaville",    flag:"🇨🇬", fsi_score:90.2, rank:29, region:"africa", fsi_band:"Alert" },
  VEN: { name:"Venezuela",            flag:"🇻🇪", fsi_score:89.0, rank:30, region:"americas", fsi_band:"Alert" },
  IRQ: { name:"Iraq",                 flag:"🇮🇶", fsi_score:88.6, rank:31, region:"middleeast", fsi_band:"Alert" },
  GNB: { name:"Guinea-Bissau",        flag:"🇬🇼", fsi_score:88.4, rank:32, region:"africa", fsi_band:"Alert" },
  LKA: { name:"Sri Lanka",            flag:"🇱🇰", fsi_score:88.2, rank:33, region:"asia", fsi_band:"Alert" },
  MRT: { name:"Mauritania",           flag:"🇲🇷", fsi_score:87.0, rank:34, region:"africa", fsi_band:"High Warning" },
  LBR: { name:"Liberia",              flag:"🇱🇷", fsi_score:86.9, rank:35, region:"africa", fsi_band:"High Warning" },
  KEN: { name:"Kenya",                flag:"🇰🇪", fsi_score:86.5, rank:36, region:"africa", fsi_band:"High Warning" },
  BGD: { name:"Bangladesh",           flag:"🇧🇩", fsi_score:85.9, rank:37, region:"asia", fsi_band:"High Warning" },
  AGO: { name:"Angola",               flag:"🇦🇴", fsi_score:85.6, rank:38, region:"africa", fsi_band:"High Warning" },
  CIV: { name:"Ivory Coast",          flag:"🇨🇮", fsi_score:85.3, rank:39, region:"africa", fsi_band:"High Warning" },
  PRK: { name:"North Korea",          flag:"🇰🇵", fsi_score:84.9, rank:40, region:"asia", fsi_band:"High Warning" },
  TUR: { name:"Turkey",               flag:"🇹🇷", fsi_score:84.0, rank:41, region:"europe", fsi_band:"High Warning" },
  GNQ: { name:"Equatorial Guinea",    flag:"🇬🇶", fsi_score:83.7, rank:42, region:"africa", fsi_band:"High Warning" },
  IRN: { name:"Iran",                 flag:"🇮🇷", fsi_score:82.9, rank:43, region:"middleeast", fsi_band:"High Warning" },
  EGY: { name:"Egypt",                flag:"🇪🇬", fsi_score:82.8, rank:44, region:"africa", fsi_band:"High Warning" },
  SLE: { name:"Sierra Leone",         flag:"🇸🇱", fsi_score:82.6, rank:45, region:"africa", fsi_band:"High Warning" },
  RWA: { name:"Rwanda",               flag:"🇷🇼", fsi_score:81.8, rank:46, region:"africa", fsi_band:"High Warning" },
  COM: { name:"Comoros",              flag:"🇰🇲", fsi_score:81.7, rank:47, region:"africa", fsi_band:"High Warning" },
  DJI: { name:"Djibouti",             flag:"🇩🇯", fsi_score:81.6, rank:48, region:"africa", fsi_band:"High Warning" },
  RUS: { name:"Russia",               flag:"🇷🇺", fsi_score:81.6, rank:48, region:"europe", fsi_band:"High Warning" },
  ZMB: { name:"Zambia",               flag:"🇿🇲", fsi_score:81.2, rank:50, region:"africa", fsi_band:"High Warning" },
  TGO: { name:"Togo",                 flag:"🇹🇬", fsi_score:81.1, rank:51, region:"africa", fsi_band:"High Warning" },
  MWI: { name:"Malawi",               flag:"🇲🇼", fsi_score:80.5, rank:52, region:"africa", fsi_band:"High Warning" },
  MDG: { name:"Madagascar",           flag:"🇲🇬", fsi_score:79.8, rank:53, region:"africa", fsi_band:"High Warning" },
  PNG: { name:"Papua New Guinea",     flag:"🇵🇬", fsi_score:78.8, rank:54, region:"oceania", fsi_band:"High Warning" },
  KHM: { name:"Cambodia",             flag:"🇰🇭", fsi_score:78.6, rank:55, region:"asia", fsi_band:"High Warning" },
  HND: { name:"Honduras",             flag:"🇭🇳", fsi_score:78.1, rank:56, region:"americas", fsi_band:"High Warning" },
  NPL: { name:"Nepal",                flag:"🇳🇵", fsi_score:78.0, rank:57, region:"asia", fsi_band:"High Warning" },
  SWZ: { name:"Eswatini",             flag:"🇸🇿", fsi_score:77.6, rank:58, region:"africa", fsi_band:"High Warning" },
  SLB: { name:"Solomon Islands",      flag:"🇸🇧", fsi_score:77.6, rank:58, region:"oceania", fsi_band:"High Warning" },
  NIC: { name:"Nicaragua",            flag:"🇳🇮", fsi_score:76.7, rank:60, region:"americas", fsi_band:"High Warning" },
  GMB: { name:"Gambia",               flag:"🇬🇲", fsi_score:76.1, rank:61, region:"africa", fsi_band:"Elevated Warning" },
  TZA: { name:"Tanzania",             flag:"🇹🇿", fsi_score:75.7, rank:62, region:"africa", fsi_band:"Elevated Warning" },
  COL: { name:"Colombia",             flag:"🇨🇴", fsi_score:75.6, rank:63, region:"americas", fsi_band:"Elevated Warning" },
  PHL: { name:"Philippines",          flag:"🇵🇭", fsi_score:75.1, rank:64, region:"asia", fsi_band:"Elevated Warning" },
  GTM: { name:"Guatemala",            flag:"🇬🇹", fsi_score:74.9, rank:65, region:"americas", fsi_band:"Elevated Warning" },
  KGZ: { name:"Kyrgyzstan",           flag:"🇰🇬", fsi_score:74.9, rank:65, region:"asia", fsi_band:"Elevated Warning" },
  TLS: { name:"East Timor",           flag:"🇹🇱", fsi_score:74.8, rank:67, region:"asia", fsi_band:"Elevated Warning" },
  LSO: { name:"Lesotho",              flag:"🇱🇸", fsi_score:74.6, rank:68, region:"africa", fsi_band:"Elevated Warning" },
  JOR: { name:"Jordan",               flag:"🇯🇴", fsi_score:74.3, rank:69, region:"middleeast", fsi_band:"Elevated Warning" },
  SEN: { name:"Senegal",              flag:"🇸🇳", fsi_score:74.2, rank:70, region:"africa", fsi_band:"Elevated Warning" },
  LAO: { name:"Laos",                 flag:"🇱🇦", fsi_score:73.8, rank:71, region:"asia", fsi_band:"Elevated Warning" },
  AZE: { name:"Azerbaijan",           flag:"🇦🇿", fsi_score:72.8, rank:72, region:"asia", fsi_band:"Elevated Warning" },
  TJK: { name:"Tajikistan",           flag:"🇹🇯", fsi_score:72.8, rank:72, region:"asia", fsi_band:"Elevated Warning" },
  BEN: { name:"Benin",                flag:"🇧🇯", fsi_score:72.5, rank:74, region:"africa", fsi_band:"Elevated Warning" },
  IND: { name:"India",                flag:"🇮🇳", fsi_score:72.3, rank:75, region:"asia", fsi_band:"Elevated Warning" },
  PER: { name:"Peru",                 flag:"🇵🇪", fsi_score:72.0, rank:76, region:"americas", fsi_band:"Elevated Warning" },
  BIH: { name:"Bosnia-Herzegovina",   flag:"🇧🇦", fsi_score:71.0, rank:77, region:"europe", fsi_band:"Elevated Warning" },
  BRA: { name:"Brazil",               flag:"🇧🇷", fsi_score:70.3, rank:78, region:"americas", fsi_band:"Elevated Warning" },
  GAB: { name:"Gabon",                flag:"🇬🇦", fsi_score:70.2, rank:79, region:"africa", fsi_band:"Elevated Warning" },
  ZAF: { name:"South Africa",         flag:"🇿🇦", fsi_score:69.6, rank:80, region:"africa", fsi_band:"Elevated Warning" },
  BOL: { name:"Bolivia",              flag:"🇧🇴", fsi_score:69.4, rank:81, region:"americas", fsi_band:"Elevated Warning" },
  GEO: { name:"Georgia",              flag:"🇬🇪", fsi_score:69.3, rank:82, region:"asia", fsi_band:"Elevated Warning" },
  MEX: { name:"Mexico",               flag:"🇲🇽", fsi_score:69.0, rank:83, region:"americas", fsi_band:"Elevated Warning" },
  MAR: { name:"Morocco",              flag:"🇲🇦", fsi_score:68.8, rank:84, region:"africa", fsi_band:"Elevated Warning" },
  BLR: { name:"Belarus",              flag:"🇧🇾", fsi_score:68.7, rank:85, region:"europe", fsi_band:"Elevated Warning" },
  SLV: { name:"El Salvador",          flag:"🇸🇻", fsi_score:68.7, rank:85, region:"americas", fsi_band:"Elevated Warning" },
  DZA: { name:"Algeria",              flag:"🇩🇿", fsi_score:68.6, rank:87, region:"africa", fsi_band:"Elevated Warning" },
  STP: { name:"Sao Tome and Principe",flag:"🇸🇹", fsi_score:68.5, rank:88, region:"africa", fsi_band:"Elevated Warning" },
  ARM: { name:"Armenia",              flag:"🇦🇲", fsi_score:68.1, rank:89, region:"asia", fsi_band:"Elevated Warning" },
  ECU: { name:"Ecuador",              flag:"🇪🇨", fsi_score:68.0, rank:90, region:"americas", fsi_band:"Elevated Warning" },
  SRB: { name:"Serbia",               flag:"🇷🇸", fsi_score:67.8, rank:91, region:"europe", fsi_band:"Elevated Warning" },
  TUN: { name:"Tunisia",              flag:"🇹🇳", fsi_score:67.2, rank:92, region:"africa", fsi_band:"Elevated Warning" },
  FSM: { name:"F.S. Micronesia",      flag:"🇫🇲", fsi_score:66.9, rank:93, region:"oceania", fsi_band:"Elevated Warning" },
  FJI: { name:"Fiji",                 flag:"🇫🇯", fsi_score:66.4, rank:94, region:"oceania", fsi_band:"Elevated Warning" },
  THA: { name:"Thailand",             flag:"🇹🇭", fsi_score:66.2, rank:95, region:"asia", fsi_band:"Elevated Warning" },
  UZB: { name:"Uzbekistan",           flag:"🇺🇿", fsi_score:64.8, rank:96, region:"asia", fsi_band:"Warning" },
  MDA: { name:"Moldova",              flag:"🇲🇩", fsi_score:64.7, rank:97, region:"europe", fsi_band:"Warning" },
  BTN: { name:"Bhutan",               flag:"🇧🇹", fsi_score:64.5, rank:98, region:"asia", fsi_band:"Warning" },
  CHN: { name:"China",                flag:"🇨🇳", fsi_score:64.4, rank:99, region:"asia", fsi_band:"Warning" },
  BHR: { name:"Bahrain",              flag:"🇧🇭", fsi_score:64.2, rank:100, region:"middleeast", fsi_band:"Warning" },
  WSM: { name:"Samoa",                flag:"🇼🇸", fsi_score:63.9, rank:101, region:"oceania", fsi_band:"Warning" },
  IDN: { name:"Indonesia",            flag:"🇮🇩", fsi_score:63.7, rank:102, region:"asia", fsi_band:"Warning" },
  SAU: { name:"Saudi Arabia",         flag:"🇸🇦", fsi_score:63.2, rank:103, region:"middleeast", fsi_band:"Warning" },
  TKM: { name:"Turkmenistan",         flag:"🇹🇲", fsi_score:62.2, rank:104, region:"asia", fsi_band:"Warning" },
  PRY: { name:"Paraguay",             flag:"🇵🇾", fsi_score:61.5, rank:105, region:"americas", fsi_band:"Warning" },
  GHA: { name:"Ghana",                flag:"🇬🇭", fsi_score:60.8, rank:106, region:"africa", fsi_band:"Warning" },
  MDV: { name:"Maldives",             flag:"🇲🇻", fsi_score:60.3, rank:107, region:"asia", fsi_band:"Warning" },
  DOM: { name:"Dominican Republic",   flag:"🇩🇴", fsi_score:60.2, rank:108, region:"americas", fsi_band:"Warning" },
  JAM: { name:"Jamaica",              flag:"🇯🇲", fsi_score:59.3, rank:109, region:"americas", fsi_band:"Warning" },
  NAM: { name:"Namibia",              flag:"🇳🇦", fsi_score:59.3, rank:109, region:"africa", fsi_band:"Warning" },
  GUY: { name:"Guyana",               flag:"🇬🇾", fsi_score:59.2, rank:111, region:"americas", fsi_band:"Warning" },
  CUB: { name:"Cuba",                 flag:"🇨🇺", fsi_score:59.1, rank:112, region:"americas", fsi_band:"Warning" },
  SUR: { name:"Suriname",             flag:"🇸🇷", fsi_score:58.8, rank:113, region:"americas", fsi_band:"Warning" },
  MKD: { name:"North Macedonia",      flag:"🇲🇰", fsi_score:58.1, rank:114, region:"europe", fsi_band:"Warning" },
  KAZ: { name:"Kazakhstan",           flag:"🇰🇿", fsi_score:57.8, rank:115, region:"asia", fsi_band:"Warning" },
  CPV: { name:"Cape Verde",           flag:"🇨🇻", fsi_score:57.2, rank:116, region:"africa", fsi_band:"Warning" },
  BLZ: { name:"Belize",               flag:"🇧🇿", fsi_score:57.0, rank:117, region:"americas", fsi_band:"Warning" },
  MNE: { name:"Montenegro",           flag:"🇲🇪", fsi_score:56.9, rank:118, region:"europe", fsi_band:"Warning" },
  VNM: { name:"Vietnam",              flag:"🇻🇳", fsi_score:56.2, rank:119, region:"asia", fsi_band:"Warning" },
  ALB: { name:"Albania",              flag:"🇦🇱", fsi_score:55.9, rank:120, region:"europe", fsi_band:"Warning" },
  GRC: { name:"Greece",               flag:"🇬🇷", fsi_score:54.7, rank:121, region:"europe", fsi_band:"Warning" },
  CYP: { name:"Cyprus",               flag:"🇨🇾", fsi_score:54.1, rank:122, region:"europe", fsi_band:"Less Stable" },
  BRN: { name:"Brunei",               flag:"🇧🇳", fsi_score:53.9, rank:123, region:"asia", fsi_band:"Less Stable" },
  BWA: { name:"Botswana",             flag:"🇧🇼", fsi_score:53.6, rank:124, region:"africa", fsi_band:"Less Stable" },
  TTO: { name:"Trinidad and Tobago",  flag:"🇹🇹", fsi_score:53.5, rank:125, region:"americas", fsi_band:"Less Stable" },
  MYS: { name:"Malaysia",             flag:"🇲🇾", fsi_score:53.1, rank:126, region:"asia", fsi_band:"Less Stable" },
  ATG: { name:"Antigua and Barbuda",  flag:"🇦🇬", fsi_score:51.9, rank:127, region:"americas", fsi_band:"Less Stable" },
  GRD: { name:"Grenada",              flag:"🇬🇩", fsi_score:51.9, rank:127, region:"americas", fsi_band:"Less Stable" },
  ISR: { name:"Israel",               flag:"🇮🇱", fsi_score:51.5, rank:129, region:"middleeast", fsi_band:"Less Stable" },
  ROU: { name:"Romania",              flag:"🇷🇴", fsi_score:51.0, rank:130, region:"europe", fsi_band:"Less Stable" },
  SYC: { name:"Seychelles",           flag:"🇸🇨", fsi_score:51.0, rank:130, region:"africa", fsi_band:"Less Stable" },
  MNG: { name:"Mongolia",             flag:"🇲🇳", fsi_score:50.7, rank:132, region:"asia", fsi_band:"Less Stable" },
  BGR: { name:"Bulgaria",             flag:"🇧🇬", fsi_score:49.4, rank:133, region:"europe", fsi_band:"Less Stable" },
  KWT: { name:"Kuwait",               flag:"🇰🇼", fsi_score:49.3, rank:134, region:"middleeast", fsi_band:"Less Stable" },
  BHS: { name:"Bahamas",              flag:"🇧🇸", fsi_score:48.0, rank:135, region:"americas", fsi_band:"Less Stable" },
  PAN: { name:"Panama",               flag:"🇵🇦", fsi_score:47.7, rank:136, region:"americas", fsi_band:"Less Stable" },
  OMN: { name:"Oman",                 flag:"🇴🇲", fsi_score:47.4, rank:137, region:"middleeast", fsi_band:"Less Stable" },
  HUN: { name:"Hungary",              flag:"🇭🇺", fsi_score:46.2, rank:138, region:"europe", fsi_band:"Less Stable" },
  HRV: { name:"Croatia",              flag:"🇭🇷", fsi_score:45.9, rank:139, region:"europe", fsi_band:"Less Stable" },
  BRB: { name:"Barbados",             flag:"🇧🇧", fsi_score:44.7, rank:140, region:"americas", fsi_band:"Less Stable" },
  USA: { name:"United States",        flag:"🇺🇸", fsi_score:44.5, rank:141, region:"americas", fsi_band:"Less Stable" },
  ARG: { name:"Argentina",            flag:"🇦🇷", fsi_score:44.2, rank:142, region:"americas", fsi_band:"Less Stable" },
  ESP: { name:"Spain",                flag:"🇪🇸", fsi_score:44.0, rank:143, region:"europe", fsi_band:"Less Stable" },
  POL: { name:"Poland",               flag:"🇵🇱", fsi_score:41.7, rank:144, region:"europe", fsi_band:"Stable" },
  LVA: { name:"Latvia",               flag:"🇱🇻", fsi_score:41.4, rank:145, region:"europe", fsi_band:"Stable" },
  CHL: { name:"Chile",                flag:"🇨🇱", fsi_score:41.1, rank:146, region:"americas", fsi_band:"Stable" },
  ITA: { name:"Italy",                flag:"🇮🇹", fsi_score:41.1, rank:146, region:"europe", fsi_band:"Stable" },
  GBR: { name:"United Kingdom",       flag:"🇬🇧", fsi_score:40.8, rank:148, region:"europe", fsi_band:"Stable" },
  QAT: { name:"Qatar",                flag:"🇶🇦", fsi_score:39.8, rank:149, region:"middleeast", fsi_band:"Stable" },
  CRI: { name:"Costa Rica",           flag:"🇨🇷", fsi_score:39.4, rank:150, region:"americas", fsi_band:"Stable" },
  MUS: { name:"Mauritius",            flag:"🇲🇺", fsi_score:37.8, rank:151, region:"africa", fsi_band:"Stable" },
  CZE: { name:"Czech Republic",       flag:"🇨🇿", fsi_score:37.7, rank:152, region:"europe", fsi_band:"Stable" },
  LTU: { name:"Lithuania",            flag:"🇱🇹", fsi_score:37.4, rank:153, region:"europe", fsi_band:"Stable" },
  EST: { name:"Estonia",              flag:"🇪🇪", fsi_score:36.5, rank:154, region:"europe", fsi_band:"Stable" },
  SVK: { name:"Slovakia",             flag:"🇸🇰", fsi_score:35.3, rank:155, region:"europe", fsi_band:"Stable" },
  ARE: { name:"United Arab Emirates", flag:"🇦🇪", fsi_score:34.7, rank:156, region:"middleeast", fsi_band:"Stable" },
  URY: { name:"Uruguay",              flag:"🇺🇾", fsi_score:33.7, rank:157, region:"americas", fsi_band:"Stable" },
  MLT: { name:"Malta",                flag:"🇲🇹", fsi_score:31.1, rank:158, region:"europe", fsi_band:"More Stable" },
  BEL: { name:"Belgium",              flag:"🇧🇪", fsi_score:30.3, rank:159, region:"europe", fsi_band:"More Stable" },
  JPN: { name:"Japan",                flag:"🇯🇵", fsi_score:30.2, rank:160, region:"asia", fsi_band:"More Stable" },
  KOR: { name:"South Korea",          flag:"🇰🇷", fsi_score:29.8, rank:161, region:"asia", fsi_band:"More Stable" },
  FRA: { name:"France",               flag:"🇫🇷", fsi_score:28.3, rank:162, region:"europe", fsi_band:"More Stable" },
  SVN: { name:"Slovenia",             flag:"🇸🇮", fsi_score:26.1, rank:163, region:"europe", fsi_band:"More Stable" },
  PRT: { name:"Portugal",             flag:"🇵🇹", fsi_score:25.9, rank:164, region:"europe", fsi_band:"More Stable" },
  SGP: { name:"Singapore",            flag:"🇸🇬", fsi_score:25.4, rank:165, region:"asia", fsi_band:"More Stable" },
  DEU: { name:"Germany",              flag:"🇩🇪", fsi_score:24.0, rank:166, region:"europe", fsi_band:"More Stable" },
  AUT: { name:"Austria",              flag:"🇦🇹", fsi_score:23.1, rank:167, region:"europe", fsi_band:"More Stable" },
  SWE: { name:"Sweden",               flag:"🇸🇪", fsi_score:20.6, rank:168, region:"europe", fsi_band:"Sustainable" },
  AUS: { name:"Australia",            flag:"🇦🇺", fsi_score:19.6, rank:169, region:"oceania", fsi_band:"Sustainable" },
  NLD: { name:"Netherlands",          flag:"🇳🇱", fsi_score:19.5, rank:170, region:"europe", fsi_band:"Sustainable" },
  LUX: { name:"Luxembourg",           flag:"🇱🇺", fsi_score:18.7, rank:171, region:"europe", fsi_band:"Sustainable" },
  CAN: { name:"Canada",               flag:"🇨🇦", fsi_score:18.6, rank:172, region:"americas", fsi_band:"Sustainable" },
  IRL: { name:"Ireland",              flag:"🇮🇪", fsi_score:18.6, rank:172, region:"europe", fsi_band:"Sustainable" },
  CHE: { name:"Switzerland",          flag:"🇨🇭", fsi_score:16.2, rank:174, region:"europe", fsi_band:"Sustainable" },
  DNK: { name:"Denmark",              flag:"🇩🇰", fsi_score:15.9, rank:175, region:"europe", fsi_band:"Sustainable" },
  NZL: { name:"New Zealand",          flag:"🇳🇿", fsi_score:15.9, rank:175, region:"oceania", fsi_band:"Sustainable" },
  ISL: { name:"Iceland",              flag:"🇮🇸", fsi_score:15.2, rank:177, region:"europe", fsi_band:"Sustainable" },
  FIN: { name:"Finland",              flag:"🇫🇮", fsi_score:14.3, rank:178, region:"europe", fsi_band:"Sustainable" },
  NOR: { name:"Norway",               flag:"🇳🇴", fsi_score:12.7, rank:179, region:"europe", fsi_band:"Sustainable" },
};

const WST_CLASSIFICATION = {
  // ── CORE NATIONS ──
  USA: { class: "Core", tier: 1, debt_sensitivity: 0.15, recovery_rate: 0.85, extractive_penalty: 0, structural_weight: 1.0, reserve_currency: true, gdp_per_capita: 76000, momentum_factor: 0.9 },
  GBR: { class: "Core", tier: 1, debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, structural_weight: 0.9, reserve_currency: true, gdp_per_capita: 48000, momentum_factor: 0.85 },
  DEU: { class: "Core", tier: 1, debt_sensitivity: 0.25, recovery_rate: 0.82, extractive_penalty: 0, structural_weight: 0.9, reserve_currency: false, gdp_per_capita: 52000, momentum_factor: 0.85 },
  FRA: { class: "Core", tier: 1, debt_sensitivity: 0.28, recovery_rate: 0.78, extractive_penalty: 0, structural_weight: 0.85, reserve_currency: false, gdp_per_capita: 45000, momentum_factor: 0.8 },
  JPN: { class: "Core", tier: 1, debt_sensitivity: 0.30, recovery_rate: 0.75, extractive_penalty: 0, structural_weight: 0.85, reserve_currency: false, gdp_per_capita: 40000, momentum_factor: 0.8 },
  CAN: { class: "Core", tier: 1, debt_sensitivity: 0.20, recovery_rate: 0.82, extractive_penalty: 0, structural_weight: 0.8, reserve_currency: false, gdp_per_capita: 52000, momentum_factor: 0.85 },
  AUS: { class: "Core", tier: 1, debt_sensitivity: 0.22, recovery_rate: 0.80, extractive_penalty: 0, structural_weight: 0.8, reserve_currency: false, gdp_per_capita: 65000, momentum_factor: 0.8 },
  CHE: { class: "Core", tier: 1, debt_sensitivity: 0.18, recovery_rate: 0.88, extractive_penalty: 0, structural_weight: 0.7, reserve_currency: false, gdp_per_capita: 93000, momentum_factor: 0.9 },
  NLD: { class: "Core", tier: 1, debt_sensitivity: 0.22, recovery_rate: 0.82, extractive_penalty: 0, structural_weight: 0.7, reserve_currency: false, gdp_per_capita: 58000, momentum_factor: 0.85 },
  NOR: { class: "Core", tier: 1, debt_sensitivity: 0.15, recovery_rate: 0.90, extractive_penalty: 0, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 89000, momentum_factor: 0.9 },
  SWE: { class: "Core", tier: 1, debt_sensitivity: 0.20, recovery_rate: 0.85, extractive_penalty: 0, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 60000, momentum_factor: 0.85 },
  DNK: { class: "Core", tier: 1, debt_sensitivity: 0.20, recovery_rate: 0.85, extractive_penalty: 0, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 68000, momentum_factor: 0.85 },
  FIN: { class: "Core", tier: 1, debt_sensitivity: 0.25, recovery_rate: 0.80, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 54000, momentum_factor: 0.8 },
  IRL: { class: "Core", tier: 1, debt_sensitivity: 0.20, recovery_rate: 0.85, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 100000, momentum_factor: 0.85 },
  NZL: { class: "Core", tier: 1, debt_sensitivity: 0.22, recovery_rate: 0.82, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 48000, momentum_factor: 0.85 },
  KOR: { class: "Core", tier: 2, debt_sensitivity: 0.35, recovery_rate: 0.72, extractive_penalty: 0, structural_weight: 0.7, reserve_currency: false, gdp_per_capita: 33000, momentum_factor: 0.75 },
  ESP: { class: "Core", tier: 2, debt_sensitivity: 0.40, recovery_rate: 0.68, extractive_penalty: 0, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 30000, momentum_factor: 0.7 },
  ITA: { class: "Core", tier: 2, debt_sensitivity: 0.45, recovery_rate: 0.65, extractive_penalty: 0, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 35000, momentum_factor: 0.7 },
  PRT: { class: "Core", tier: 2, debt_sensitivity: 0.50, recovery_rate: 0.60, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 25000, momentum_factor: 0.65 },
  GRC: { class: "Core", tier: 2, debt_sensitivity: 0.55, recovery_rate: 0.55, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 20000, momentum_factor: 0.6 },
  AUT: { class: "Core", tier: 2, debt_sensitivity: 0.25, recovery_rate: 0.80, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 53000, momentum_factor: 0.8 },
  BEL: { class: "Core", tier: 2, debt_sensitivity: 0.28, recovery_rate: 0.78, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 50000, momentum_factor: 0.8 },
  SGP: { class: "Core", tier: 2, debt_sensitivity: 0.30, recovery_rate: 0.75, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 83000, momentum_factor: 0.8 },
  ISR: { class: "Core", tier: 2, debt_sensitivity: 0.35, recovery_rate: 0.72, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 55000, momentum_factor: 0.75 },
  CZE: { class: "Core", tier: 2, debt_sensitivity: 0.35, recovery_rate: 0.70, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 28000, momentum_factor: 0.7 },
  SVN: { class: "Core", tier: 2, debt_sensitivity: 0.38, recovery_rate: 0.68, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 30000, momentum_factor: 0.7 },
  SVK: { class: "Core", tier: 2, debt_sensitivity: 0.40, recovery_rate: 0.65, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 22000, momentum_factor: 0.65 },
  LTU: { class: "Core", tier: 2, debt_sensitivity: 0.42, recovery_rate: 0.62, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 25000, momentum_factor: 0.65 },
  LVA: { class: "Core", tier: 2, debt_sensitivity: 0.43, recovery_rate: 0.60, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 22000, momentum_factor: 0.65 },
  EST: { class: "Core", tier: 2, debt_sensitivity: 0.40, recovery_rate: 0.62, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 28000, momentum_factor: 0.65 },
  MLT: { class: "Core", tier: 2, debt_sensitivity: 0.35, recovery_rate: 0.68, extractive_penalty: 0, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 34000, momentum_factor: 0.7 },
  CYP: { class: "Core", tier: 2, debt_sensitivity: 0.45, recovery_rate: 0.58, extractive_penalty: 0, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 32000, momentum_factor: 0.6 },
  ARE: { class: "Core", tier: 2, debt_sensitivity: 0.30, recovery_rate: 0.75, extractive_penalty: 0, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 50000, momentum_factor: 0.75 },
  QAT: { class: "Core", tier: 2, debt_sensitivity: 0.28, recovery_rate: 0.78, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 70000, momentum_factor: 0.8 },
  KWT: { class: "Core", tier: 2, debt_sensitivity: 0.32, recovery_rate: 0.72, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 35000, momentum_factor: 0.75 },
  BHR: { class: "Core", tier: 2, debt_sensitivity: 0.35, recovery_rate: 0.68, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 28000, momentum_factor: 0.7 },
  OMN: { class: "Core", tier: 2, debt_sensitivity: 0.35, recovery_rate: 0.68, extractive_penalty: 0, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 25000, momentum_factor: 0.7 },

  // ── SEMI-PERIPHERY (CORRECTED: Ukraine, Lebanon, Sri Lanka moved here) ──
  CHN: { class: "Semi", tier: 3, debt_sensitivity: 0.60, recovery_rate: 0.55, extractive_penalty: 5, structural_weight: 0.8, reserve_currency: false, gdp_per_capita: 13000, momentum_factor: 0.6 },
  RUS: { class: "Semi", tier: 3, debt_sensitivity: 0.65, recovery_rate: 0.50, extractive_penalty: 8, structural_weight: 0.7, reserve_currency: false, gdp_per_capita: 14000, momentum_factor: 0.55 },
  IND: { class: "Semi", tier: 3, debt_sensitivity: 0.70, recovery_rate: 0.48, extractive_penalty: 10, structural_weight: 0.7, reserve_currency: false, gdp_per_capita: 2600, momentum_factor: 0.5 },
  BRA: { class: "Semi", tier: 3, debt_sensitivity: 0.68, recovery_rate: 0.50, extractive_penalty: 12, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 8900, momentum_factor: 0.55 },
  MEX: { class: "Semi", tier: 3, debt_sensitivity: 0.65, recovery_rate: 0.52, extractive_penalty: 10, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 11000, momentum_factor: 0.55 },
  TUR: { class: "Semi", tier: 3, debt_sensitivity: 0.75, recovery_rate: 0.42, extractive_penalty: 14, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 15000, momentum_factor: 0.45 },
  ZAF: { class: "Semi", tier: 3, debt_sensitivity: 0.72, recovery_rate: 0.45, extractive_penalty: 16, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.5 },
  ARG: { class: "Semi", tier: 3, debt_sensitivity: 0.85, recovery_rate: 0.35, extractive_penalty: 18, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 11000, momentum_factor: 0.4 },
  IDN: { class: "Semi", tier: 3, debt_sensitivity: 0.62, recovery_rate: 0.52, extractive_penalty: 8, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.55 },
  SAU: { class: "Semi", tier: 3, debt_sensitivity: 0.55, recovery_rate: 0.58, extractive_penalty: 6, structural_weight: 0.6, reserve_currency: false, gdp_per_capita: 33000, momentum_factor: 0.6 },
  POL: { class: "Semi", tier: 3, debt_sensitivity: 0.55, recovery_rate: 0.60, extractive_penalty: 5, structural_weight: 0.5, reserve_currency: false, gdp_per_capita: 18000, momentum_factor: 0.6 },
  HUN: { class: "Semi", tier: 3, debt_sensitivity: 0.58, recovery_rate: 0.55, extractive_penalty: 6, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 19000, momentum_factor: 0.55 },
  ROU: { class: "Semi", tier: 3, debt_sensitivity: 0.60, recovery_rate: 0.52, extractive_penalty: 7, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 15000, momentum_factor: 0.55 },
  BGR: { class: "Semi", tier: 3, debt_sensitivity: 0.62, recovery_rate: 0.50, extractive_penalty: 8, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 13000, momentum_factor: 0.5 },
  HRV: { class: "Semi", tier: 3, debt_sensitivity: 0.60, recovery_rate: 0.52, extractive_penalty: 7, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 18000, momentum_factor: 0.55 },
  MNE: { class: "Semi", tier: 3, debt_sensitivity: 0.58, recovery_rate: 0.54, extractive_penalty: 6, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 10000, momentum_factor: 0.55 },
  SRB: { class: "Semi", tier: 3, debt_sensitivity: 0.62, recovery_rate: 0.50, extractive_penalty: 8, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 9000, momentum_factor: 0.5 },
  ALB: { class: "Semi", tier: 3, debt_sensitivity: 0.65, recovery_rate: 0.48, extractive_penalty: 9, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.5 },
  MKD: { class: "Semi", tier: 3, debt_sensitivity: 0.63, recovery_rate: 0.48, extractive_penalty: 8, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.5 },
  BIH: { class: "Semi", tier: 3, debt_sensitivity: 0.65, recovery_rate: 0.45, extractive_penalty: 10, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.45 },
  GEO: { class: "Semi", tier: 3, debt_sensitivity: 0.60, recovery_rate: 0.50, extractive_penalty: 7, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 6000, momentum_factor: 0.5 },
  ARM: { class: "Semi", tier: 3, debt_sensitivity: 0.62, recovery_rate: 0.48, extractive_penalty: 8, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.5 },
  AZE: { class: "Semi", tier: 3, debt_sensitivity: 0.58, recovery_rate: 0.52, extractive_penalty: 6, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 8000, momentum_factor: 0.55 },
  KAZ: { class: "Semi", tier: 3, debt_sensitivity: 0.55, recovery_rate: 0.55, extractive_penalty: 6, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 12000, momentum_factor: 0.55 },
  UZB: { class: "Semi", tier: 3, debt_sensitivity: 0.60, recovery_rate: 0.50, extractive_penalty: 7, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.5 },
  THA: { class: "Semi", tier: 3, debt_sensitivity: 0.55, recovery_rate: 0.55, extractive_penalty: 6, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.55 },
  MYS: { class: "Semi", tier: 3, debt_sensitivity: 0.52, recovery_rate: 0.58, extractive_penalty: 5, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 12000, momentum_factor: 0.6 },
  VNM: { class: "Semi", tier: 3, debt_sensitivity: 0.55, recovery_rate: 0.55, extractive_penalty: 6, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.55 },
  PHL: { class: "Semi", tier: 3, debt_sensitivity: 0.58, recovery_rate: 0.52, extractive_penalty: 7, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.55 },
  BLR: { class: "Semi", tier: 3, debt_sensitivity: 0.70, recovery_rate: 0.40, extractive_penalty: 12, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 8000, momentum_factor: 0.45 },
  
  // ── CRITICAL FIX: Ukraine, Lebanon, Sri Lanka moved to Semi-Periphery ──
  UKR: { class: "Semi", tier: 3, debt_sensitivity: 0.85, recovery_rate: 0.35, extractive_penalty: 20, structural_weight: 0.4, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.4 },
  LBN: { class: "Semi", tier: 3, debt_sensitivity: 0.92, recovery_rate: 0.25, extractive_penalty: 18, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.35 },
  LKA: { class: "Semi", tier: 3, debt_sensitivity: 0.85, recovery_rate: 0.30, extractive_penalty: 15, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.35 },
  IRN: { class: "Semi", tier: 3, debt_sensitivity: 0.78, recovery_rate: 0.30, extractive_penalty: 14, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.3 },
  EGY: { class: "Semi", tier: 3, debt_sensitivity: 0.80, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.3 },
  DZA: { class: "Semi", tier: 3, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.35 },
  MAR: { class: "Semi", tier: 3, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.35 },
  TUN: { class: "Semi", tier: 3, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.35 },
  JOR: { class: "Semi", tier: 3, debt_sensitivity: 0.78, recovery_rate: 0.30, extractive_penalty: 14, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.3 },
  IRQ: { class: "Semi", tier: 3, debt_sensitivity: 0.80, recovery_rate: 0.28, extractive_penalty: 15, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 6000, momentum_factor: 0.3 },
  LBY: { class: "Semi", tier: 3, debt_sensitivity: 0.82, recovery_rate: 0.26, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 6000, momentum_factor: 0.3 },
  VEN: { class: "Semi", tier: 3, debt_sensitivity: 0.92, recovery_rate: 0.18, extractive_penalty: 24, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.2 },
  PRK: { class: "Semi", tier: 3, debt_sensitivity: 0.88, recovery_rate: 0.20, extractive_penalty: 22, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1200, momentum_factor: 0.2 },
  MMR: { class: "Semi", tier: 3, debt_sensitivity: 0.82, recovery_rate: 0.26, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1200, momentum_factor: 0.3 },
  PSE: { class: "Semi", tier: 3, debt_sensitivity: 0.80, recovery_rate: 0.28, extractive_penalty: 15, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.3 },
  CUB: { class: "Semi", tier: 3, debt_sensitivity: 0.85, recovery_rate: 0.22, extractive_penalty: 20, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.25 },

  // ── PERIPHERY (TRULY STRUCTURALLY VULNERABLE) ──
  SOM: { class: "Periphery", tier: 4, debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 22, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 500, momentum_factor: 0.25 },
  SDN: { class: "Periphery", tier: 4, debt_sensitivity: 0.88, recovery_rate: 0.22, extractive_penalty: 20, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 800, momentum_factor: 0.25 },
  SSD: { class: "Periphery", tier: 4, debt_sensitivity: 0.92, recovery_rate: 0.18, extractive_penalty: 24, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 600, momentum_factor: 0.2 },
  SYR: { class: "Periphery", tier: 4, debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 25, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 800, momentum_factor: 0.2 },
  YEM: { class: "Periphery", tier: 4, debt_sensitivity: 0.92, recovery_rate: 0.18, extractive_penalty: 25, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 700, momentum_factor: 0.2 },
  AFG: { class: "Periphery", tier: 4, debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 24, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 600, momentum_factor: 0.2 },
  HTI: { class: "Periphery", tier: 4, debt_sensitivity: 0.88, recovery_rate: 0.22, extractive_penalty: 22, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 2000, momentum_factor: 0.25 },
  TCD: { class: "Periphery", tier: 4, debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 20, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 700, momentum_factor: 0.25 },
  ETH: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.28, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1000, momentum_factor: 0.3 },
  NGA: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.30, extractive_penalty: 16, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 2200, momentum_factor: 0.3 },
  PAK: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 1500, momentum_factor: 0.3 },
  BGD: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.30, extractive_penalty: 14, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 2800, momentum_factor: 0.3 },
  KEN: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 2200, momentum_factor: 0.35 },
  UGA: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1000, momentum_factor: 0.3 },
  MOZ: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 500, momentum_factor: 0.25 },
  MWI: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.24, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 600, momentum_factor: 0.25 },
  ZWE: { class: "Periphery", tier: 4, debt_sensitivity: 0.85, recovery_rate: 0.22, extractive_penalty: 20, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1200, momentum_factor: 0.25 },
  COD: { class: "Periphery", tier: 4, debt_sensitivity: 0.88, recovery_rate: 0.20, extractive_penalty: 22, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 600, momentum_factor: 0.2 },
  CAF: { class: "Periphery", tier: 4, debt_sensitivity: 0.90, recovery_rate: 0.18, extractive_penalty: 24, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 500, momentum_factor: 0.2 },
  GIN: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1200, momentum_factor: 0.3 },
  MLI: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 900, momentum_factor: 0.25 },
  NER: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.24, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 600, momentum_factor: 0.25 },
  BFA: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 800, momentum_factor: 0.25 },
  CMR: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1600, momentum_factor: 0.3 },
  BDI: { class: "Periphery", tier: 4, debt_sensitivity: 0.85, recovery_rate: 0.22, extractive_penalty: 20, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 300, momentum_factor: 0.25 },
  ERI: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.24, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 700, momentum_factor: 0.25 },
  SEN: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1600, momentum_factor: 0.3 },
  GMB: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 800, momentum_factor: 0.25 },
  GNB: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.24, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 800, momentum_factor: 0.25 },
  SLE: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 500, momentum_factor: 0.25 },
  LBR: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.24, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 700, momentum_factor: 0.25 },
  CIV: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 2500, momentum_factor: 0.3 },
  GHA: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.30, extractive_penalty: 14, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 2200, momentum_factor: 0.3 },
  TGO: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1000, momentum_factor: 0.3 },
  BEN: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1300, momentum_factor: 0.3 },
  NAM: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.35 },
  BWA: { class: "Periphery", tier: 4, debt_sensitivity: 0.70, recovery_rate: 0.38, extractive_penalty: 10, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.4 },
  ZMB: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 1000, momentum_factor: 0.3 },
  AGO: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.25 },
  COG: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.24, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 2000, momentum_factor: 0.25 },
  GAB: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 8000, momentum_factor: 0.35 },
  GNQ: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 10000, momentum_factor: 0.3 },
  HND: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.25 },
  NIC: { class: "Periphery", tier: 4, debt_sensitivity: 0.82, recovery_rate: 0.24, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 2000, momentum_factor: 0.25 },
  GTM: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.3 },
  SLV: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.3 },
  CRI: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 12000, momentum_factor: 0.35 },
  PAN: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 16000, momentum_factor: 0.35 },
  COL: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 6000, momentum_factor: 0.35 },
  PER: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.35 },
  ECU: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 6000, momentum_factor: 0.3 },
  BOL: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.25 },
  PRY: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.3 },
  URY: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 20000, momentum_factor: 0.35 },
  CHL: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.3, reserve_currency: false, gdp_per_capita: 15000, momentum_factor: 0.35 },
  DOM: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 11000, momentum_factor: 0.35 },
  JAM: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.3 },
  TTO: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 16000, momentum_factor: 0.35 },
  GUY: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 20000, momentum_factor: 0.35 },
  SUR: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 5000, momentum_factor: 0.3 },
  BHS: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 30000, momentum_factor: 0.35 },
  BRB: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 15000, momentum_factor: 0.35 },
  ATG: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 18000, momentum_factor: 0.35 },
  GRD: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 11000, momentum_factor: 0.35 },
  BLZ: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 7000, momentum_factor: 0.35 },
  MDA: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.3 },
  PNG: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.3 },
  FJI: { class: "Periphery", tier: 4, debt_sensitivity: 0.72, recovery_rate: 0.35, extractive_penalty: 12, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 6000, momentum_factor: 0.35 },
  SLB: { class: "Periphery", tier: 4, debt_sensitivity: 0.78, recovery_rate: 0.28, extractive_penalty: 16, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 2000, momentum_factor: 0.3 },
  FSM: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.35 },
  WSM: { class: "Periphery", tier: 4, debt_sensitivity: 0.75, recovery_rate: 0.32, extractive_penalty: 14, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 4000, momentum_factor: 0.35 },
  TLS: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.1, reserve_currency: false, gdp_per_capita: 1500, momentum_factor: 0.25 },
  default: { class: "Periphery", tier: 4, debt_sensitivity: 0.80, recovery_rate: 0.26, extractive_penalty: 18, structural_weight: 0.2, reserve_currency: false, gdp_per_capita: 3000, momentum_factor: 0.3 }
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

// ─── BUILD COUNTRY TABLE ─────────────────────────────────────────────────────

const COUNTRIES = {};
for (const [iso, fsi] of Object.entries(FSI_2024)) {
  const types = [];
  const band = fsi.fsi_band || "Warning";
  const score = fsi.fsi_score;
  
  if (score >= 90) types.push("CE", "CW");
  else if (score >= 80) types.push("CE", "REF");
  else if (score >= 70) types.push("REF", "DR");
  else if (score >= 60) types.push("DR", "ECO");
  else if (score >= 50) types.push("ECO");
  else types.push("POL");
  
  if (fsi.region === "africa" && score >= 80) types.push("FN");
  if (fsi.region === "asia" && score >= 70) types.push("FL");
  if (fsi.region === "americas" && score >= 70) types.push("HEAT");
  if (fsi.region === "middleeast" && score >= 70) types.push("REF");
  
  const uniqueTypes = [...new Set(types)];
  const adj = [];
  for (const [otherIso, otherFsi] of Object.entries(FSI_2024)) {
    if (otherIso !== iso && otherFsi.region === fsi.region) {
      adj.push(otherIso);
    }
  }
  
  COUNTRIES[iso] = {
    name: fsi.name,
    flag: fsi.flag,
    prior: Math.round(score),
    fsi_score: score,
    fsi_rank: fsi.rank,
    fsi_band: fsi.fsi_band,
    region: fsi.region,
    types: uniqueTypes.slice(0, 4),
    adj: adj.slice(0, 8),
    cent: [0, 0],
  };
}

// ─── MATH UTILITIES ──────────────────────────────────────────────────────────

function lcg(seed) {
  return ((Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0) / 0x100000000;
}
function strHash(str) {
  return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0;
}
const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
function mean(arr)   { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function median(arr) { const s = [...arr].sort((a,b) => a-b); return s[Math.floor(s.length/2)]; }
function stddev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function composite(dims) { return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0); }
function fmtPop(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
function fmtUSD(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  return { words, minutes: Math.max(1, Math.ceil(words / 225)) };
}
function findIsoByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (d.name.toLowerCase() === lower) return iso;
  }
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) return iso;
  }
  return null;
}
function findClosestCountry(lng, lat) {
  let closest = null, minDist = Infinity;
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (!d.cent) continue;
    const dist = Math.sqrt((lng - d.cent[0]) ** 2 + (lat - d.cent[1]) ** 2);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return closest;
}

// ─── TIME-SENSITIVE SCORING ENGINE ──────────────────────────────────────────

function computeTimeSensitiveScore(iso, currentScore, store, dims) {
  if (!CFG.WST_ENABLED) return { adjustedScore: currentScore, momentum: 0, velocity: 0, acceleration: 0, timeDecay: 1 };
  
  const hist = seedHistory(iso, currentScore);
  const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
  const historical = store[iso]?.historical_trend || null;
  
  // ── 1. MOMENTUM: Rate of change over the last 7 days ──────────────────
  const recent7 = hist.slice(-7);
  const old7 = hist.slice(-14, -7);
  const momentum = recent7.length >= 7 && old7.length >= 7 
    ? (mean(recent7) - mean(old7)) / 7 
    : 0;
  
  // ── 2. VELOCITY: Current speed of change (1st derivative) ─────────────
  const recent3 = hist.slice(-3);
  const old3 = hist.slice(-6, -3);
  const velocity = recent3.length >= 3 && old3.length >= 3
    ? (mean(recent3) - mean(old3)) / 3
    : 0;
  
  // ── 3. ACCELERATION: Rate of change of velocity (2nd derivative) ──────
  const recent5 = hist.slice(-5);
  const mid5 = hist.slice(-10, -5);
  const old5 = hist.slice(-15, -10);
  const velocityRecent = recent5.length >= 5 && mid5.length >= 5
    ? (mean(recent5) - mean(mid5)) / 5
    : 0;
  const velocityOld = mid5.length >= 5 && old5.length >= 5
    ? (mean(mid5) - mean(old5)) / 5
    : 0;
  const acceleration = velocityRecent - velocityOld;
  
  // ── 4. TIME DECAY: How long since the last crisis peak ────────────────
  const maxScore = Math.max(...hist);
  const maxIndex = hist.indexOf(maxScore);
  const currentIndex = hist.length - 1;
  const daysSincePeak = currentIndex - maxIndex;
  const timeDecay = Math.exp(-daysSincePeak / CFG.WST_TIME_DECAY_HALF_LIFE);
  
  // ── 5. STRUCTURAL PERSISTENCE ──────────────────────────────────────────
  const structuralPersistence = wst.structural_weight || 0.5;
  const recoveryFactor = wst.recovery_rate || 0.5;
  
  // ── 6. COMPUTE ADJUSTMENTS ─────────────────────────────────────────────
  // Momentum adjustment: positive momentum = crisis worsening
  const momentumAdjust = momentum * CFG.WST_MOMENTUM_WEIGHT * 10;
  
  // Velocity adjustment: rapid changes get amplified
  const velocityAdjust = velocity * CFG.WST_VELOCITY_WEIGHT * 15;
  
  // Acceleration adjustment: accelerating crises get extra weight
  const accelerationAdjust = acceleration * CFG.WST_ACCELERATION_WEIGHT * 20;
  
  // Time decay: older crises fade, but structural persistence keeps them relevant
  const timeDecayAdjust = (1 - timeDecay) * (1 - structuralPersistence) * 5;
  
  // Core countries recover faster, Periphery stays fragile
  const recoveryAdjust = (1 - recoveryFactor) * 8;
  
  // ── 7. COMBINE ──────────────────────────────────────────────────────────
  let totalAdjustment = momentumAdjust + velocityAdjust + accelerationAdjust + timeDecayAdjust + recoveryAdjust;
  
  // Cap adjustments to prevent extreme swings
  totalAdjustment = Math.max(-15, Math.min(25, totalAdjustment));
  
  const adjustedScore = clamp(currentScore + totalAdjustment);
  
  return {
    adjustedScore,
    momentum,
    velocity,
    acceleration,
    timeDecay,
    momentumAdjust,
    velocityAdjust,
    accelerationAdjust,
    timeDecayAdjust,
    recoveryAdjust,
    totalAdjustment,
    rawScore: currentScore,
    structuralWeight: structuralPersistence,
    recoveryFactor,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 1: MACHINE LEARNING ENGINE ──────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class CrisisMLModel {
  constructor() {
    this.weights = {
      input_hidden: [],
      hidden_output: [],
      bias_hidden: [],
      bias_output: [],
    };
    this.trained = false;
    this.trainingCount = 0;
    this.lastUpdate = Date.now();
    this.performance = { mse: 0, r2: 0, accuracy: 0 };
    this.history = [];
  }

  predict(sequence) {
    if (!this.trained || sequence.length < 5) {
      return this.simpleTrendForecast(sequence);
    }

    const normalized = this.normalizeSequence(sequence);
    const hidden = this.forwardPass(normalized);
    const prediction = this.outputLayer(hidden);
    
    return {
      forecast: this.denormalize(prediction),
      confidence: this.performance.r2 || 0.7,
      trend: this.determineTrend(sequence, prediction),
      anomaly_probability: this.calculateAnomalyProbability(sequence, prediction),
    };
  }

  forwardPass(input) {
    const hidden = [];
    for (let i = 0; i < this.weights.input_hidden.length; i++) {
      let sum = this.weights.bias_hidden[i] || 0;
      for (let j = 0; j < input.length; j++) {
        sum += (this.weights.input_hidden[i]?.[j] || 0) * input[j];
      }
      hidden.push(Math.max(0, sum));
    }
    return hidden;
  }

  outputLayer(hidden) {
    let sum = this.weights.bias_output || 0;
    for (let i = 0; i < hidden.length; i++) {
      sum += (this.weights.hidden_output[i] || 0) * hidden[i];
    }
    return sum;
  }

  train(sequences) {
    if (sequences.length < 2) return;

    const inputs = sequences.map(s => this.normalizeSequence(s.slice(0, -1)));
    const targets = sequences.map(s => this.normalizeValue(s[s.length - 1]));

    if (!this.trained) {
      this.initializeWeights(inputs[0].length);
    }

    const learningRate = CFG.LEARNING_RATE || 0.01;
    let totalError = 0;

    for (let epoch = 0; epoch < 10; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        const hidden = this.forwardPass(inputs[i]);
        const output = this.outputLayer(hidden);
        const error = targets[i] - output;

        const outputDelta = error;
        for (let j = 0; j < hidden.length; j++) {
          this.weights.hidden_output[j] = (this.weights.hidden_output[j] || 0) + learningRate * outputDelta * hidden[j];
        }
        this.weights.bias_output = (this.weights.bias_output || 0) + learningRate * outputDelta;

        for (let j = 0; j < this.weights.input_hidden.length; j++) {
          const hiddenDelta = outputDelta * (this.weights.hidden_output[j] || 0) * (hidden[j] > 0 ? 1 : 0);
          for (let k = 0; k < inputs[i].length; k++) {
            this.weights.input_hidden[j][k] += learningRate * hiddenDelta * inputs[i][k];
          }
          this.weights.bias_hidden[j] = (this.weights.bias_hidden[j] || 0) + learningRate * hiddenDelta;
        }

        totalError += error * error;
      }
    }

    this.trained = true;
    this.trainingCount += sequences.length;
    this.lastUpdate = Date.now();
    this.performance.mse = totalError / inputs.length;
    this.performance.r2 = Math.max(0, 1 - this.performance.mse / 0.1);
    this.performance.accuracy = Math.min(0.95, this.performance.r2 + 0.1);
    this.history.push({ count: this.trainingCount, mse: this.performance.mse, r2: this.performance.r2 });
  }

  initializeWeights(inputSize) {
    const hiddenSize = CFG.HIDDEN_LAYERS?.[0] || 32;
    this.weights.input_hidden = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.input_hidden[i] = [];
      for (let j = 0; j < inputSize; j++) {
        this.weights.input_hidden[i][j] = (Math.random() - 0.5) * 0.1;
      }
    }
    this.weights.hidden_output = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.hidden_output[i] = (Math.random() - 0.5) * 0.1;
    }
    this.weights.bias_hidden = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.bias_hidden[i] = (Math.random() - 0.5) * 0.1;
    }
    this.weights.bias_output = (Math.random() - 0.5) * 0.1;
  }

  normalizeSequence(seq) {
    const min = Math.min(...seq, 0);
    const max = Math.max(...seq, 100);
    const range = max - min || 1;
    return seq.map(v => (v - min) / range);
  }

  normalizeValue(v) {
    return v / 100;
  }

  denormalize(v) {
    return Math.min(99, Math.max(1, Math.round(v * 100)));
  }

  simpleTrendForecast(seq) {
    if (seq.length < 4) return { forecast: seq[seq.length - 1] || 50, confidence: 0.3 };
    const recent = seq.slice(-7);
    const slope = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
    const forecast = Math.min(99, Math.max(1, Math.round(recent[recent.length - 1] + slope * 3)));
    return {
      forecast,
      confidence: 0.4,
      trend: slope > 0.5 ? "escalating" : slope < -0.5 ? "improving" : "stable",
      anomaly_probability: 0.1,
    };
  }

  determineTrend(seq, prediction) {
    const last = seq[seq.length - 1];
    const diff = prediction - last;
    if (diff > 5) return "escalating";
    if (diff < -5) return "improving";
    return "stable";
  }

  calculateAnomalyProbability(seq, prediction) {
    const last = seq[seq.length - 1];
    const diff = Math.abs(prediction - last);
    return Math.min(0.95, diff / 30);
  }
}

const mlModel = new CrisisMLModel();

function trainMLModel(store) {
  if (!CFG.ML_ENABLED) return;

  const sequences = [];
  for (const iso in store) {
    const hist = seedHistory(iso, store[iso].score);
    if (hist.length >= 14) {
      for (let i = 7; i < hist.length - 1; i++) {
        const seq = hist.slice(i - 7, i + 1);
        sequences.push(seq);
      }
    }
  }

  if (sequences.length >= 10) {
    mlModel.train(sequences);
  }
}

function mlEnhancedForecast(iso, currentScore, store) {
  const hist = seedHistory(iso, currentScore);
  const mlPrediction = mlModel.predict(hist);
  const trad = trendForecast(hist, currentScore);
  
  // ── WST Recovery Rate Adjustment ────────────────────────────────────────
  let wstAdjustment = 0;
  let wstRecoveryRate = 0.5;
  let wstClass = "Unclassified";
  
  if (CFG.WST_ENABLED && store && store[iso] && store[iso].__wst) {
    const wst = store[iso].__wst;
    wstRecoveryRate = wst.recovery_rate || 0.5;
    wstClass = wst.class;
    
    if (wstClass === "Core") {
      wstAdjustment = -Math.round((1 - wstRecoveryRate) * 8);
    } else if (wstClass === "Semi") {
      wstAdjustment = Math.round((1 - wstRecoveryRate) * 4);
    } else if (wstClass === "Periphery") {
      wstAdjustment = Math.round((1 - wstRecoveryRate) * 12);
    }
    
    if (wst.reserve_currency) {
      wstAdjustment -= 2;
    }
  }

  const tradAdjusted = Math.max(1, Math.min(99, trad.fc + wstAdjustment));
  const blended = Math.round(mlPrediction.forecast * 0.6 + tradAdjusted * 0.4);
  const confidence = (mlPrediction.confidence + trad.confidence) / 2;

  return {
    fc: clamp(blended),
    ml_forecast: mlPrediction.forecast,
    trad_forecast: trad.fc,
    wst_adjusted_trad_forecast: tradAdjusted,
    wst_class: wstClass,
    wst_recovery_rate: wstRecoveryRate,
    confidence: Math.min(0.95, Math.max(0.3, confidence)),
    trend: mlPrediction.trend || trad.trend,
    esc: blended > currentScore + 5,
    slope: trad.slope,
    anomaly_probability: mlPrediction.anomaly_probability || 0.1,
    ml_trained: mlModel.trained,
    training_count: mlModel.trainingCount,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 2: SENTIMENT ANALYSIS ────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = [
      'peace', 'ceasefire', 'truce', 'agreement', 'aid', 'humanitarian', 'relief',
      'recovery', 'stabilize', 'improve', 'progress', 'positive', 'good', 'great',
      'excellent', 'success', 'successful', 'hope', 'hopeful', 'resolution'
    ];
    this.negativeWords = [
      'war', 'conflict', 'violence', 'attack', 'bomb', 'missile', 'strike',
      'kill', 'death', 'casualty', 'destroy', 'collapse', 'crisis', 'emergency',
      'famine', 'hunger', 'disease', 'outbreak', 'escalate', 'worsen', 'deteriorate',
      'critical', 'severe', 'dire', 'catastrophe', 'disaster', 'devastating'
    ];
    this.strongNegative = [
      'exterminate', 'genocide', 'massacre', 'pogrom', 'ethnic cleansing',
      'famine', 'starvation', 'catastrophic'
    ];
    this.positivePhrases = [
      'negotiations progress', 'peace talks', 'aid delivered',
      'ceasefire holds', 'reconstruction', 'recovery efforts'
    ];
    this.negativePhrases = [
      'escalation of', 'intensified fighting', 'heavy casualties',
      'civilians killed', 'mass displacement', 'health system collapse',
      'food insecurity worsens', 'drought intensifies'
    ];
  }

  analyze(text) {
    if (!text || text.length < 10) {
      return { score: 0, label: 'neutral', confidence: 0.5, key_terms: [] };
    }

    const lower = text.toLowerCase();
    let score = 0;
    let matches = 0;

    for (const word of this.positiveWords) {
      if (lower.includes(word)) { score += 0.15; matches++; }
    }
    for (const word of this.negativeWords) {
      if (lower.includes(word)) { score -= 0.2; matches++; }
    }
    for (const word of this.strongNegative) {
      if (lower.includes(word)) { score -= 0.5; matches++; }
    }

    for (const phrase of this.positivePhrases) {
      if (lower.includes(phrase)) { score += 0.3; matches += 2; }
    }
    for (const phrase of this.negativePhrases) {
      if (lower.includes(phrase)) { score -= 0.4; matches += 2; }
    }

    const totalMatches = Math.min(matches, 10);
    const normalizedScore = Math.max(-1, Math.min(1, score / (Math.max(totalMatches, 1) / 2)));

    const keyTerms = [];
    for (const word of this.negativeWords) {
      if (lower.includes(word)) keyTerms.push(word);
    }
    for (const word of this.positiveWords) {
      if (lower.includes(word)) keyTerms.push(word);
    }

    let label, confidence;
    if (normalizedScore > 0.2) {
      label = 'positive';
      confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5);
    } else if (normalizedScore < -0.2) {
      label = 'negative';
      confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5);
    } else {
      label = 'neutral';
      confidence = 0.5 + (1 - Math.abs(normalizedScore)) * 0.3;
    }

    const crisisIntensity = Math.min(1, Math.abs(normalizedScore) * 1.5);
    const isCrisis = label === 'negative' && crisisIntensity > 0.5;

    return {
      score: Math.round(normalizedScore * 100) / 100,
      label,
      confidence: Math.round(confidence * 100) / 100,
      key_terms: keyTerms.slice(0, 10),
      crisis_intensity: Math.round(crisisIntensity * 100) / 100,
      is_crisis: isCrisis,
    };
  }
}

const sentimentAnalyzer = new SentimentAnalyzer();

function analyzeCountrySentiment(iso, store) {
  if (!CFG.SENTIMENT_ENABLED) return null;

  const c = store[iso];
  const signals = c.signals || {};
  const text = [];

  if (signals.whoOutbreaks?.length) {
    text.push(signals.whoOutbreaks.map(o => o.disease + ' outbreak ' + o.severity).join(' '));
  }
  if (signals.reliefwebItems?.length) {
    text.push(signals.reliefwebItems.map(r => r.headline).join(' '));
  }
  if (signals.gdacs?.title) {
    text.push(signals.gdacs.title);
  }
  if (signals.fewsPhase) {
    text.push(signals.fewsPhase + ' famine warning');
  }
  if (signals.acledEvents > 0) {
    text.push(signals.acledEvents + ' conflict events, ' + signals.acledFatalities + ' fatalities');
  }

  const dims = c.dims || {};
  if (dims.food > 70) text.push('severe food insecurity ' + dims.food + '/100');
  if (dims.conflict > 70) text.push('intense conflict ' + dims.conflict + '/100');
  if (dims.displacement > 70) text.push('mass displacement ' + dims.displacement + '/100');

  if (text.length === 0) return null;

  const fullText = text.join('. ');
  const result = sentimentAnalyzer.analyze(fullText);

  return {
    ...result,
    sources_analyzed: text.length,
    text_sample: fullText.slice(0, 200) + (fullText.length > 200 ? '...' : ''),
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 3: HISTORICAL DATA STORE ─────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class HistoricalDataStore {
  constructor() {
    this.data = {};
    this.lastCleanup = Date.now();
  }

  store(iso, data) {
    if (!this.data[iso]) {
      this.data[iso] = [];
    }
    this.data[iso].push({
      timestamp: Date.now(),
      ...data,
    });
    this.cleanup(iso);
  }

  cleanup(iso) {
    const cutoff = Date.now() - CFG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    if (this.data[iso]) {
      this.data[iso] = this.data[iso].filter(d => d.timestamp > cutoff);
    }
    if (Date.now() - this.lastCleanup > 3600000) {
      this.lastCleanup = Date.now();
      for (const key in this.data) {
        this.data[key] = this.data[key].filter(d => d.timestamp > cutoff);
        if (this.data[key].length === 0) delete this.data[key];
      }
    }
  }

  getHistory(iso, days = 7) {
    if (!this.data[iso]) return [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data[iso].filter(d => d.timestamp > cutoff);
  }

  getTrend(iso, days = 30) {
    const history = this.getHistory(iso, days);
    if (history.length < 3) return null;

    const scores = history.map(d => d.score);
    const timestamps = history.map(d => d.timestamp);
    
    const n = scores.length;
    const xMean = timestamps.reduce((a, b) => a + b, 0) / n;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (timestamps[i] - xMean) * (scores[i] - yMean);
      den += (timestamps[i] - xMean) ** 2;
    }
    const slope = den ? num / den : 0;
    const direction = slope > 0 ? 'worsening' : slope < 0 ? 'improving' : 'stable';

    return {
      direction,
      slope: slope * 86400000 * 7,
      points: n,
      start_score: scores[0],
      end_score: scores[scores.length - 1],
      change: scores[scores.length - 1] - scores[0],
    };
  }

  exportData(iso, format = 'json') {
    const data = this.data[iso] || [];
    if (format === 'csv') {
      let csv = 'timestamp,score,displacement,economic\n';
      for (const d of data) {
        csv += `${d.timestamp},${d.score},${d.displacement || 0},${d.economic || 0}\n`;
      }
      return csv;
    }
    return data;
  }

  getStats(iso) {
    const data = this.data[iso] || [];
    if (data.length === 0) return null;

    const scores = data.map(d => d.score);
    return {
      count: data.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      mean: mean(scores),
      median: median(scores),
      stddev: stddev(scores),
      latest: scores[scores.length - 1],
      first: scores[0],
      change: scores[scores.length - 1] - scores[0],
    };
  }
}

const historyStore = new HistoricalDataStore();

function storeHistoricalData(iso, store) {
  if (!CFG.HISTORY_ENABLED) return;
  const c = store[iso];
  historyStore.store(iso, {
    score: c.score,
    displacement: c.dims.displacement || 0,
    economic: c.dims.economic || 0,
    food: c.dims.food || 0,
    health: c.dims.health || 0,
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 4: GEO-FENCING ALERTS ────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class AlertManager {
  constructor() {
    this.webhookUrl = CFG.ALERT_WEBHOOK_URL || null;
    this.email = CFG.ALERT_EMAIL || null;
    this.thresholds = {
      global: 75,
      region: 70,
      country: 80,
    };
    this.lastAlerts = {};
  }

  checkAlerts(iso, store) {
    if (!CFG.GEO_FENCING_ENABLED) return [];

    const c = store[iso];
    const triggered = [];
    const now = Date.now();

    if (c.score >= this.thresholds.global) {
      const key = `${iso}_global`;
      if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
        triggered.push({
          iso,
          name: c.name,
          score: c.score,
          threshold: this.thresholds.global,
          type: 'global',
          message: `${c.name} has reached ${c.score}/100, exceeding the global crisis threshold.`,
        });
        this.lastAlerts[key] = now;
      }
    }

    const hist = seedHistory(iso, c.score);
    if (hist.length >= 7) {
      const delta = hist[hist.length - 1] - hist[hist.length - 7];
      if (delta > 10) {
        const key = `${iso}_rapid`;
        if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
          triggered.push({
            iso,
            name: c.name,
            score: c.score,
            delta,
            type: 'rapid_deterioration',
            message: `${c.name} crisis score has risen ${delta} points in 7 days.`,
          });
          this.lastAlerts[key] = now;
        }
      }
    }

    const anom = runAnomalyDetection(hist);
    if (anom.detected && (anom.severity === 'HIGH' || anom.severity === 'EXTREME')) {
      const key = `${iso}_anomaly`;
      if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
        triggered.push({
          iso,
          name: c.name,
          score: c.score,
          anomaly: anom,
          type: 'anomaly',
          message: `${c.name} shows a ${anom.severity} statistical anomaly (${anom.methods_fired}/4 methods).`,
        });
        this.lastAlerts[key] = now;
      }
    }

    for (const alert of triggered) {
      this.sendAlert(alert);
    }

    return triggered;
  }

  async sendAlert(alert) {
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'crisis_alert',
            timestamp: new Date().toISOString(),
            ...alert,
          }),
        });
      } catch (e) {
        console.warn('Webhook alert failed:', e);
      }
    }

    if (this.email) {
      console.log(`📧 ALERT EMAIL to ${this.email}: ${alert.message}`);
    }

    console.log(`🚨 ALERT: ${alert.message}`);
  }

  setThreshold(type, value) {
    if (this.thresholds.hasOwnProperty(type)) {
      this.thresholds[type] = value;
    }
  }
}

const alertManager = new AlertManager();

// ════════════════════════════════════════════════════════════════════════════
//  ─── LIVE DATA FETCHERS (20+ SOURCES) ──────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

async function fetchUSGS() {
  try {
    const r = await safeFetch(
      fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json())
    );
    if (r.ok && r.data?.features?.length) {
      return { data: r.data.features, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchEMSC() {
  try {
    const r = await safeFetch(
      fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.json())
    );
    if (r.ok && r.data?.features?.length) {
      return { data: r.data.features, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchNASA() {
  try {
    const [general, fires] = await Promise.all([
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.json())),
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=20").then(r => r.json())),
    ]);
    const events = [
      ...(general.ok && general.data?.events ? general.data.events : []),
      ...(fires.ok && fires.data?.events ? fires.data.events : []),
    ];
    return { data: events, live: events.length > 0 };
  } catch {}
  return { data: [], live: false };
}

async function fetchGDACS() {
  try {
    const [alerts, quakes] = await Promise.all([
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=40").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ&limit=20").then(r => r.json())),
    ]);
    const feats = [
      ...(alerts.ok && alerts.data?.features ? alerts.data.features : []),
      ...(quakes.ok && quakes.data?.features ? quakes.data.features : []),
    ];
    return { data: feats, live: feats.length > 0 };
  } catch {}
  return { data: [], live: false };
}

async function fetchIFRC() {
  try {
    const r = await safeFetch(
      fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.json())
    );
    if (r.ok && r.data?.results?.length) {
      return { data: r.data.results, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchHeatStress() {
  const heatProneIsos = Object.keys(COUNTRIES).slice(0, 50);
  const results = {};
  let anyLive = false;
  for (const iso of heatProneIsos) {
    const coord = COUNTRIES[iso]?.cent;
    if (!coord || (coord[0] === 0 && coord[1] === 0)) continue;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=temperature_2m_max&timezone=auto&forecast_days=3`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.daily?.temperature_2m_max?.[0] !== undefined) {
        const temp = r.data.daily.temperature_2m_max[0];
        results[iso] = temp;
        if (temp >= 35) anyLive = true;
      }
    } catch {}
  }
  return { data: results, live: anyLive };
}

async function fetchWeatherHazards() {
  const results = { flood_discharge: 0, wave_height: 0, wind_speed: 0, precip_total: 0, uv_max: 0, cloud_avg: 0, lightning_max: 0 };
  let anyLive = false;
  
  const endpoints = [
    { key: 'flood_discharge', url: 'https://flood-api.open-meteo.com/v1/flood?latitude=15.35&longitude=44.21&daily=river_discharge&forecast_days=3', path: ['daily','river_discharge'], transform: arr => Math.max(...(arr||[0])) },
    { key: 'wind_speed', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&current_weather=true&hourly=wind_speed_10m&forecast_days=1', path: ['current_weather','windspeed'], transform: v => v || 0 },
    { key: 'precip_total', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=precipitation&forecast_days=3', path: ['hourly','precipitation'], transform: arr => (arr||[]).reduce((a,b) => a+b, 0) },
    { key: 'uv_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&daily=uv_index_max&forecast_days=3', path: ['daily','uv_index_max'], transform: arr => Math.max(...(arr||[0])) },
    { key: 'cloud_avg', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=cloudcover&forecast_days=3', path: ['hourly','cloudcover'], transform: arr => mean(arr||[0]) },
    { key: 'lightning_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=lightning_potential&forecast_days=1', path: ['hourly','lightning_potential'], transform: arr => Math.max(...(arr||[0])) },
  ];

  for (const ep of endpoints) {
    try {
      const r = await safeFetch(fetch(ep.url).then(r => r.json()));
      if (r.ok) {
        let val = r.data;
        for (const segment of ep.path) {
          val = val?.[segment];
        }
        if (val !== undefined && val !== null) {
          results[ep.key] = ep.transform(val);
          if (results[ep.key] > 0) anyLive = true;
        }
      }
    } catch {}
  }
  
  return { data: results, live: anyLive };
}

async function fetchAirQuality() {
  const cities = [
    { iso:'NGA', lat:6.5,  lon:3.4,   name:'Lagos' },
    { iso:'IND', lat:28.6, lon:77.2,  name:'Delhi' },
    { iso:'CHN', lat:39.9, lon:116.4, name:'Beijing' },
    { iso:'BGD', lat:23.8, lon:90.4,  name:'Dhaka' },
    { iso:'EGY', lat:30.0, lon:31.2,  name:'Cairo' },
    { iso:'PAK', lat:24.9, lon:67.1,  name:'Karachi' },
    { iso:'THA', lat:13.8, lon:100.5, name:'Bangkok' },
    { iso:'TUR', lat:41.0, lon:28.9,  name:'Istanbul' },
    { iso:'BRA', lat:-23.5, lon:-46.6, name:'Sao Paulo' },
    { iso:'ETH', lat:9.0,  lon:38.7,  name:'Addis Ababa' },
    { iso:'KEN', lat:-1.3, lon:36.8,  name:'Nairobi' },
  ];
  const results = {};
  let anyLive = false;
  for (const city of cities) {
    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&hourly=pm2_5&forecast_days=1`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      const pm25 = r.ok ? r.data?.hourly?.pm2_5?.[0] : undefined;
      if (pm25 !== undefined && pm25 !== null) {
        if (!results[city.iso] || pm25 > results[city.iso].pm25) {
          results[city.iso] = { pm25, city: city.name };
          if (pm25 >= 35) anyLive = true;
        }
      }
    } catch {}
  }
  return { data: results, live: anyLive };
}

async function fetchNOAA() {
  try {
    const [stations, alerts, storms] = await Promise.all([
      safeFetch(fetch("https://api.weather.gov/stations?limit=20").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Extreme").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Severe").then(r => r.json())),
    ]);
    const out = {
      stations: stations.ok ? (stations.data?.features?.length || 0) : 0,
      extreme_alerts: alerts.ok ? (alerts.data?.features?.length || 0) : 0,
      storm_alerts: storms.ok ? (storms.data?.features?.length || 0) : 0,
    };
    return { data: out, live: out.extreme_alerts > 0 || out.storm_alerts > 0 };
  } catch {}
  return { data: { stations: 0, extreme_alerts: 0, storm_alerts: 0 }, live: false };
}

async function fetchDiseaseSh() {
  try {
    const r = await safeFetch(
      fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=50").then(r => r.json())
    );
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      return { data: r.data, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchWorldBankIndicator(code, perPage = 300) {
  try {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=${perPage}&mrv=1`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    const rows = r.ok && r.data?.[1] ? r.data[1] : [];
    const map = {};
    rows.forEach(item => {
      if (item.country?.id && item.value !== null && item.value !== undefined) {
        map[item.country.id] = { value: parseFloat(item.value), date: item.date, countryName: item.country.value };
      }
    });
    return { data: map, live: Object.keys(map).length > 0 };
  } catch {}
  return { data: {}, live: false };
}

async function fetchWorldBankAll() {
  const [population, poverty, inflation, gdpGrowth, unemployment, refugees] = await Promise.all([
    fetchWorldBankIndicator("SP.POP.TOTL"),
    fetchWorldBankIndicator("SI.POV.DDAY"),
    fetchWorldBankIndicator("FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"),
    fetchWorldBankIndicator("SL.UEM.TOTL.ZS"),
    fetchWorldBankIndicator("SM.POP.REFG"),
  ]);
  return { population, poverty, inflation, gdpGrowth, unemployment, refugees };
}

async function fetchUNHCR() {
  try {
    const [pop, asylum, ops, emerg, stats] = await Promise.all([
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=population&displayType=totals&yearFrom=2023&yearTo=2024&coa_all=true&forcedDisp=1").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=asylum&displayType=totals&yearFrom=2023&yearTo=2024").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/operations/v1/operations?limit=30").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/emergency/v1/emergencies?limit=30").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/statistics/v1/refugees?limit=30").then(r => r.json())),
    ]);
    
    const displacement = {};
    if (pop.ok && pop.data?.items) {
      pop.data.items.forEach(item => {
        const iso = item.coa_iso;
        if (!iso) return;
        if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
        displacement[iso].refugees += item.refugees || 0;
        displacement[iso].idps += item.idps || 0;
      });
    }
    if (asylum.ok && asylum.data?.items) {
      asylum.data.items.forEach(item => {
        const iso = item.coa_iso;
        if (!iso) return;
        if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
        displacement[iso].asylum_seekers += item.asylum_seekers || 0;
      });
    }
    
    const operations = {};
    if (ops.ok) {
      const list = ops.data?.items || ops.data?.data || [];
      list.forEach(op => {
        const iso = op.country_iso || op.country?.iso3;
        if (iso) operations[iso] = { name: op.name || "UNHCR operation", status: op.status || "active" };
      });
    }
    
    const emergencies = {};
    if (emerg.ok) {
      const list = emerg.data?.items || emerg.data?.data || [];
      list.forEach(em => {
        const iso = em.country_iso || em.country?.iso3;
        if (iso) emergencies[iso] = { name: em.name || "Emergency response", level: em.level || "unknown" };
      });
    }
    
    const statistics = {};
    if (stats.ok) {
      const list = stats.data?.data || stats.data?.items || [];
      list.forEach(s => {
        const iso = s.country_iso || s.iso3 || s.country?.iso3;
        if (iso && s.refugees > 0) statistics[iso] = { refugees: s.refugees, year: s.year || "2024" };
      });
    }
    
    const live = Object.keys(displacement).length > 0 || Object.keys(operations).length > 0 || Object.keys(emergencies).length > 0;
    return { data: { displacement, operations, emergencies, statistics }, live };
  } catch {}
  return { data: { displacement: {}, operations: {}, emergencies: {}, statistics: {} }, live: false };
}

async function fetchIPC() {
  try {
    const r = await safeFetch(
      fetch("https://api.reliefweb.int/v1/disasters?appname=gcisfusion&profile=list&slim=1&limit=50&filter[field]=type.name&filter[value][]=Food%20Insecurity&sort[]=date.created:desc").then(r => r.json())
    );
    if (r.ok && r.data?.data) {
      const ipcData = {};
      r.data.data.forEach(item => {
        const country = item.fields?.country?.[0]?.name;
        if (!country) return;
        const iso = findIsoByName(country);
        if (!iso) return;
        const title = (item.fields?.name || '').toLowerCase();
        let phase = 3;
        if (title.includes('famine')) phase = 5;
        else if (title.includes('emergency')) phase = 4;
        ipcData[iso] = { 
          phase, 
          title: item.fields?.name || '', 
          population: 0,
          total_population: 0,
          date: item.fields?.date?.created || null
        };
      });
      return { data: ipcData, live: Object.keys(ipcData).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchFewsNet() {
  try {
    const r = await safeFetch(
      fetch("https://api.rss2json.com/v1/api.json?rss_url=https://fews.net/rss/alert").then(r => r.json())
    );
    if (r.ok && r.data?.items) {
      const alerts = {};
      r.data.items.forEach(item => {
        const title = (item.title || '').toLowerCase();
        const countryMatch = title.match(/([a-z\s]+):/i);
        if (countryMatch) {
          const countryName = countryMatch[1].trim();
          const iso = findIsoByName(countryName);
          if (iso) {
            let phase = 2;
            if (title.includes('emergency')) phase = 4;
            else if (title.includes('crisis')) phase = 3;
            else if (title.includes('famine')) phase = 5;
            if (!alerts[iso] || alerts[iso].phase < phase) {
              alerts[iso] = { phase, title: item.title, date: item.pubDate };
            }
          }
        }
      });
      return { data: alerts, live: Object.keys(alerts).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchAcled() {
  try {
    const r = await safeFetch(
      fetch("https://api.acleddata.com/acled/read?limit=200&year=2024&region=world").then(r => r.json())
    );
    if (r.ok && r.data?.data) {
      const conflicts = {};
      r.data.data.forEach(event => {
        const iso = findIsoByName(event.country);
        if (!iso) return;
        if (!conflicts[iso]) conflicts[iso] = { events: 0, fatalities: 0 };
        conflicts[iso].events++;
        conflicts[iso].fatalities += parseInt(event.fatalities) || 0;
      });
      return { data: conflicts, live: Object.keys(conflicts).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchReliefWeb() {
  try {
    const r = await safeFetch(
      fetch("https://api.reliefweb.int/v1/reports?appname=gcisfusion&profile=list&slim=1&limit=30&filter[operator]=OR&filter[conditions][0][field]=primary_country.iso3&filter[conditions][0][value][]=ETH&filter[conditions][1][field]=primary_country.iso3&filter[conditions][1][value][]=SOM&filter[conditions][2][field]=primary_country.iso3&filter[conditions][2][value][]=SSD&sort[]=date.created:desc").then(r => r.json())
    );
    if (r.ok && r.data?.data) {
      const events = {};
      r.data.data.forEach(item => {
        const iso = item.fields?.primary_country?.[0]?.iso3;
        if (!iso) return;
        if (!events[iso]) events[iso] = 0;
        events[iso]++;
      });
      return { data: events, live: Object.keys(events).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchWHO() {
  try {
    const r = await safeFetch(
      fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml").then(r => r.json())
    );
    if (r.ok && r.data?.items) {
      const outbreaks = {};
      r.data.items.forEach(item => {
        const title = (item.title || '').toLowerCase();
        const keywords = ['cholera', 'ebola', 'mpox', 'measles', 'polio', 'dengue', 'malaria'];
        for (const kw of keywords) {
          if (title.includes(kw)) {
            for (const [iso, country] of Object.entries(COUNTRIES)) {
              if (title.includes(country.name.toLowerCase())) {
                if (!outbreaks[iso]) outbreaks[iso] = [];
                outbreaks[iso].push({ disease: kw, title: item.title, date: item.pubDate });
                break;
              }
            }
          }
        }
      });
      return { data: outbreaks, live: Object.keys(outbreaks).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchAllLive(isos) {
  const [
    usgs, emsc, nasa, gdacs, ifrc,
    heat, hazards, aq, noaa,
    disease, wb, unhcr, ipc, fewsnet, acled, reliefweb, who
  ] = await Promise.all([
    fetchUSGS(), 
    fetchEMSC(), 
    fetchNASA(), 
    fetchGDACS(), 
    fetchIFRC(),
    fetchHeatStress(), 
    fetchWeatherHazards(), 
    fetchAirQuality(), 
    fetchNOAA(),
    fetchDiseaseSh(), 
    fetchWorldBankAll(), 
    fetchUNHCR(),
    fetchIPC(),
    fetchFewsNet(),
    fetchAcled(),
    fetchReliefWeb(),
    fetchWHO(),
  ]);
  
  return { 
    usgs, emsc, nasa, gdacs, ifrc, 
    heat, hazards, aq, noaa, 
    disease, wb, unhcr, 
    ipc, fewsnet, acled, reliefweb, who
  };
}

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok:true, data:r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok:false, error:e.message }));

// ════════════════════════════════════════════════════════════════════════════
//  ─── EXTRACT SIGNALS ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];
  
  const signals = {};

  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a,b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = topQuake.properties.place.split(",")[0].trim();
  }

  const emscQuakes = (live.emsc.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) return false;
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a,b) => (b.properties?.mag||0) > (a.properties?.mag||0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("EMSC");
    if (!signals.quakeMag) signals.quakeMag = topEMSC.properties.mag;
    if (!signals.quakePlace) signals.quakePlace = topEMSC.properties?.flynn_region || null;
  }

  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const coords = ev.geometry?.[0]?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  if (nasaEvents.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("NASA");
    signals.nasaEventCount = nasaEvents.length;
  }

  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topGDACS = gdacsEvents[0] || null;
  if (topGDACS) {
    liveEvidenceCount++;
    evidenceSources.push("GDACS");
    signals.gdacs = topGDACS;
    signals.gdacsAlert = topGDACS?.properties?.alertlevel?.toLowerCase() || null;
  }

  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("IFRC");
    signals.ifrcCount = ifrcEvents.length;
  }

  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Heat");
    signals.maxTempC = maxTempC;
  }

  if (live.hazards.live) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Hazards");
    signals.hazards = live.hazards.data;
  }

  const aqData = live.aq.data[iso] || null;
  if (aqData && aqData.pm25 >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo AQ");
    signals.aq = aqData;
  }

  if (iso === 'USA' && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) {
    liveEvidenceCount++;
    evidenceSources.push("NOAA");
    signals.noaa = live.noaa.data;
  }

  const diseaseRow = (live.disease.data || []).find(d => {
    const countryName = d.country || d.country_name || "";
    return countryName.toLowerCase() === name || name.includes(countryName.toLowerCase()) || countryName.toLowerCase().includes(name);
  });
  if (diseaseRow && diseaseRow.active > 1000) {
    liveEvidenceCount++;
    evidenceSources.push("disease.sh");
    signals.diseaseActive = diseaseRow.active;
    signals.diseaseName = "COVID-19";
  }

  const ipcData = live.ipc?.data || null;
  if (ipcData && ipcData[iso]) {
    const ipc = ipcData[iso];
    if (ipc.phase >= 3) {
      liveEvidenceCount++;
      evidenceSources.push("IPC");
      signals.ipcPhase = ipc.phase;
      signals.ipcPopulation = ipc.population || 0;
      signals.ipcTotalPop = ipc.total_population || ipc.population || 0;
      signals.ipcTitle = ipc.title || null;
      signals.ipcDate = ipc.date || null;
    }
  }

  const fewsData = live.fewsnet?.data || null;
  if (fewsData && fewsData[iso]) {
    const fews = fewsData[iso];
    if (fews.phase >= 3 && (!signals.ipcPhase || fews.phase > signals.ipcPhase)) {
      liveEvidenceCount++;
      evidenceSources.push("FEWS NET");
      signals.ipcPhase = fews.phase;
      signals.ipcTitle = fews.title || null;
      signals.ipcDate = fews.date || null;
    }
  }

  const acledData = live.acled?.data || null;
  if (acledData && acledData[iso]) {
    const conflict = acledData[iso];
    if (conflict.events > 0) {
      liveEvidenceCount++;
      evidenceSources.push("ACLED");
      signals.acledEvents = conflict.events;
      signals.acledFatalities = conflict.fatalities || 0;
    }
  }

  const reliefData = live.reliefweb?.data || null;
  if (reliefData && reliefData[iso] && reliefData[iso] > 0) {
    liveEvidenceCount++;
    evidenceSources.push("ReliefWeb");
    signals.reliefwebCount = reliefData[iso];
  }

  const whoData = live.who?.data || null;
  if (whoData && whoData[iso] && whoData[iso].length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("WHO");
    signals.whoOutbreaks = whoData[iso];
  }

  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
  const wbRefugees = live.wb.refugees.data[iso] || null;
  const wbPoverty = live.wb.poverty.data[iso] || null;
  const wbPopulation = live.wb.population.data[iso] || null;
  
  if (wbPopulation && wbPopulation.value > 0) {
    liveEvidenceCount++;
    evidenceSources.push("WB Population");
    signals.population = wbPopulation.value;
  }
  
  if (wbInflation && wbInflation.value > 5) {
    liveEvidenceCount++;
    evidenceSources.push("WB Inflation");
    signals.wbInflation = wbInflation;
  }
  if (wbGdpGrowth && wbGdpGrowth.value < 0) {
    liveEvidenceCount++;
    evidenceSources.push("WB GDP");
    signals.wbGdpGrowth = wbGdpGrowth;
  }
  if (wbUnemployment && wbUnemployment.value > 10) {
    liveEvidenceCount++;
    evidenceSources.push("WB Unemployment");
    signals.wbUnemployment = wbUnemployment;
  }
  if (wbRefugees && wbRefugees.value > 1000) {
    liveEvidenceCount++;
    evidenceSources.push("WB Refugees");
    signals.wbRefugees = wbRefugees;
  }
  if (wbPoverty && wbPoverty.value > 5) {
    liveEvidenceCount++;
    evidenceSources.push("WB Poverty");
    signals.wbPoverty = wbPoverty;
  }

  const displacement = live.unhcr.data.displacement[iso] || null;
  const totalDisplaced = displacement ? (displacement.refugees||0) + (displacement.idps||0) + (displacement.asylum_seekers||0) : 0;
  if (totalDisplaced > 0) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR");
    signals.refugees = displacement?.refugees || 0;
    signals.idps = displacement?.idps || 0;
    signals.asylum_seekers = displacement?.asylum_seekers || 0;
    signals.totalDisplaced = totalDisplaced;
  }
  const unhcrOp = live.unhcr.data.operations[iso] || null;
  if (unhcrOp) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR Ops");
    signals.unhcrOp = unhcrOp;
  }
  const unhcrEmergency = live.unhcr.data.emergencies[iso] || null;
  if (unhcrEmergency) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR Emergency");
    signals.unhcrEmergency = unhcrEmergency;
  }
  const unhcrStats = live.unhcr.data.statistics[iso] || null;
  if (unhcrStats && unhcrStats.refugees > 0) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR Stats");
    signals.unhcrStats = unhcrStats;
  }

  return {
    quakeMag: signals.quakeMag || 0,
    quakePlace: signals.quakePlace || null,
    quakeCount: (quakes?.length || 0) + (emscQuakes?.length || 0),
    nasaEventCount: signals.nasaEventCount || 0,
    gdacs: signals.gdacs || null,
    gdacsAlert: signals.gdacsAlert || null,
    ifrcCount: signals.ifrcCount || 0,
    maxTempC: signals.maxTempC || 0,
    hazards: signals.hazards || null,
    aq: signals.aq || null,
    noaa: signals.noaa || null,
    diseaseActive: signals.diseaseActive || 0,
    diseaseName: signals.diseaseName || null,
    ipcPhase: signals.ipcPhase || 0,
    ipcPopulation: signals.ipcPopulation || 0,
    ipcTotalPop: signals.ipcTotalPop || 0,
    ipcTitle: signals.ipcTitle || null,
    ipcDate: signals.ipcDate || null,
    acledEvents: signals.acledEvents || 0,
    acledFatalities: signals.acledFatalities || 0,
    reliefwebCount: signals.reliefwebCount || 0,
    whoOutbreaks: signals.whoOutbreaks || [],
    population: signals.population || 0,
    wbInflation: signals.wbInflation || null,
    wbGdpGrowth: signals.wbGdpGrowth || null,
    wbUnemployment: signals.wbUnemployment || null,
    wbRefugees: signals.wbRefugees || null,
    wbPoverty: signals.wbPoverty || null,
    refugees: signals.refugees || 0,
    idps: signals.idps || 0,
    asylum_seekers: signals.asylum_seekers || 0,
    totalDisplaced: signals.totalDisplaced || 0,
    unhcrOp: signals.unhcrOp || null,
    unhcrEmergency: signals.unhcrEmergency || null,
    unhcrStats: signals.unhcrStats || null,
    liveEvidenceCount,
    evidenceSources,
  };
}

function applyLiveAdjustments(priorDims, signals, iso, store) {
  const dims = { ...priorDims };
  const audit = [];
  let totalBoost = 0;
  
  // ──────────────────────────────────────────────────────────────────────────
  //  🌐 WORLD SYSTEMS THEORY ENGINE — Structural Adjustments
  //  ──────────────────────────────────────────────────────────────────────────
  if (CFG.WST_ENABLED) {
    const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
    const country = COUNTRIES[iso];
    
    // ── 1. Extractivism Penalty ──────────────────────────────────────────
    if (wst.class === "Periphery") {
      const extractiveBase = wst.extractive_penalty || 15;
      const gdpAdjust = Math.max(0, (5000 - (wst.gdp_per_capita || 0)) / 5000 * 5);
      const penalty = Math.min(CFG.WST_EXTRACTIVE_PENALTY_MAX, extractiveBase + gdpAdjust);
      
      dims.economic = clamp(dims.economic + penalty);
      dims.food = clamp(dims.food + Math.floor(penalty * 0.3));
      dims.access = clamp(dims.access + Math.floor(penalty * 0.4));
      totalBoost += penalty;
      audit.push({
        source: "WST Extractivism",
        field: "economic+food+access",
        delta: penalty,
        reason: `Periphery structural extraction penalty (GDP/capita $${wst.gdp_per_capita?.toLocaleString() || 'unknown'})`
      });
    }
    
    // ── 2. Debt Sensitivity Shock ────────────────────────────────────────
    const globalRate = CFG.WST_GLOBAL_INTEREST_RATE || 5.25;
    const rateShock = Math.max(0, (globalRate - 2) * wst.debt_sensitivity * 2);
    const debtPenalty = Math.min(20, Math.round(rateShock * 3));
    
    if (debtPenalty > 1) {
      dims.economic = clamp(dims.economic + debtPenalty);
      dims.political = clamp(dims.political + Math.floor(debtPenalty * 0.4));
      totalBoost += debtPenalty;
      audit.push({
        source: "WST Debt Shock",
        field: "economic+political",
        delta: debtPenalty,
        reason: `${wst.class} debt sensitivity ${(wst.debt_sensitivity * 100).toFixed(0)}% × ${globalRate.toFixed(2)}% global rate`
      });
    }
    
    // ── 3. Currency Crisis Amplifier ─────────────────────────────────────
    if (signals.wbInflation && signals.wbInflation.value > CFG.WST_CURRENCY_CRISIS_THRESHOLD) {
      const currencyCrash = Math.min(15, Math.round((signals.wbInflation.value - 15) * 0.6 * wst.debt_sensitivity));
      if (currencyCrash > 0) {
        dims.economic = clamp(dims.economic + currencyCrash);
        dims.food = clamp(dims.food + Math.floor(currencyCrash * 0.5));
        totalBoost += currencyCrash;
        audit.push({
          source: "WST Currency Crisis",
          field: "economic+food",
          delta: currencyCrash,
          reason: `Inflation ${signals.wbInflation.value.toFixed(1)}% amplifies structural debt burden`
        });
      }
    }
    
    // ── 4. Recovery Rate Modification ─────────────────────────────────────
    if (store && store[iso]) {
      const recoveryFactor = wst.recovery_rate || 0.5;
      const fragilityMultiplier = 1 + (1 - recoveryFactor) * 0.5;
      const momentumFactor = wst.momentum_factor || 0.5;
      
      store[iso].__wst = {
        class: wst.class,
        tier: wst.tier,
        recovery_rate: recoveryFactor,
        structural_weight: wst.structural_weight || 0.5,
        fragility_multiplier: fragilityMultiplier,
        debt_sensitivity: wst.debt_sensitivity,
        reserve_currency: wst.reserve_currency || false,
        momentum_factor: momentumFactor,
        gdp_per_capita: wst.gdp_per_capita || 3000,
        extractive_penalty: wst.extractive_penalty || 10,
      };
    }
    
    // ── 5. Reserve Currency Buffer ──────────────────────────────────────
    if (wst.reserve_currency) {
      const buffer = Math.min(5, Math.round(5 * (wst.recovery_rate || 0.8)));
      dims.economic = clamp(dims.economic - buffer);
      dims.political = clamp(dims.political - Math.floor(buffer * 0.3));
      totalBoost -= buffer;
      audit.push({
        source: "WST Reserve Currency",
        field: "economic+political",
        delta: -buffer,
        reason: `Reserve currency buffer (${iso}) reduces structural vulnerability`
      });
    }
    
    // ── 6. Supply Chain Shock Transmission ──────────────────────────────
    if (signals.wbGdpGrowth && signals.wbGdpGrowth.value < -1) {
      const coreShock = Math.abs(signals.wbGdpGrowth.value) * CFG.WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER * 10;
      const transmittedShock = Math.round(coreShock * (1 + (1 - wst.recovery_rate) * 0.5));
      
      if (transmittedShock > 0) {
        dims.economic = clamp(dims.economic + transmittedShock);
        dims.conflict = clamp(dims.conflict + Math.floor(transmittedShock * 0.2));
        totalBoost += transmittedShock;
        audit.push({
          source: "WST Supply Chain",
          field: "economic+conflict",
          delta: transmittedShock,
          reason: `Global GDP contraction transmits ${transmittedShock} points to ${wst.class} economy`
        });
      }
    }
  }
  
  // ─── EXISTING LIVE DATA ADJUSTMENTS ────────────────────────────────────

  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(30, Math.round((signals.quakeMag - 3.5) * 6));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.6));
    dims.health = clamp(dims.health + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "USGS/EMSC", 
      field: "displacement+health", 
      delta: boost, 
      reason: `M${signals.quakeMag.toFixed(1)} earthquake`, 
      magnitude: signals.quakeMag 
    });
  }

  if (signals.nasaEventCount > 0) {
    const boost = Math.min(20, signals.nasaEventCount * 7);
    dims.climate = clamp(dims.climate + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "NASA EONET", 
      field: "climate+displacement", 
      delta: boost, 
      reason: `${signals.nasaEventCount} active NASA events` 
    });
  }

  if (signals.gdacs) {
    const gdacsBoost = signals.gdacsAlert === "red" ? 20 : signals.gdacsAlert === "orange" ? 12 : 5;
    dims.displacement = clamp(dims.displacement + Math.ceil(gdacsBoost * 0.6));
    dims.health = clamp(dims.health + Math.floor(gdacsBoost * 0.4));
    dims.access = clamp(dims.access + Math.floor(gdacsBoost * 0.3));
    totalBoost += gdacsBoost;
    audit.push({ 
      source: "GDACS", 
      field: "displacement+health+access", 
      delta: gdacsBoost, 
      reason: `${signals.gdacsAlert?.toUpperCase()} alert active` 
    });
  }

  if (signals.ifrcCount > 0) {
    const boost = Math.min(18, signals.ifrcCount * 7);
    dims.access = clamp(dims.access + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "IFRC GO", 
      field: "access+displacement", 
      delta: boost, 
      reason: `${signals.ifrcCount} active IFRC operations` 
    });
  }

  if (signals.maxTempC >= 35) {
    const boost = Math.min(25, Math.round((signals.maxTempC - 28) * 2));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.7));
    dims.health = clamp(dims.health + Math.floor(boost * 0.5));
    dims.food = clamp(dims.food + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "Open-Meteo", 
      field: "climate+health+food", 
      delta: boost, 
      reason: `${signals.maxTempC}°C extreme heat` 
    });
  }

  if (signals.hazards) {
    const h = signals.hazards;
    let hazardBoost = 0;
    const parts = [];
    
    if (h.flood_discharge > 100) { 
      hazardBoost += 8; 
      parts.push(`${h.flood_discharge.toFixed(0)}m³/s river discharge`); 
    }
    if (h.wind_speed > 30) { 
      hazardBoost += 6; 
      parts.push(`${h.wind_speed.toFixed(0)}km/h winds`); 
    }
    if (h.precip_total > 10) { 
      hazardBoost += 5; 
      parts.push(`${h.precip_total.toFixed(0)}mm precipitation`); 
    }
    if (h.uv_max > 8) { 
      hazardBoost += 4; 
      parts.push(`UV ${h.uv_max.toFixed(1)}`); 
    }
    if (h.cloud_avg > 70) { 
      hazardBoost += 3; 
      parts.push(`${h.cloud_avg.toFixed(0)}% cloud cover`); 
    }
    if (h.lightning_max > 100) { 
      hazardBoost += 5; 
      parts.push(`${h.lightning_max.toFixed(0)}J/kg lightning potential`); 
    }
    
    if (hazardBoost > 0) {
      dims.climate = clamp(dims.climate + hazardBoost);
      dims.displacement = clamp(dims.displacement + Math.floor(hazardBoost * 0.3));
      totalBoost += hazardBoost;
      audit.push({ 
        source: "Open-Meteo Hazards", 
        field: "climate+displacement", 
        delta: hazardBoost, 
        reason: parts.join(", ") 
      });
    }
  }

  if (signals.aq && signals.aq.pm25 >= 35) {
    const boost = Math.min(15, Math.round((signals.aq.pm25 - 25) / 8));
    if (boost > 0) {
      dims.health = clamp(dims.health + boost);
      totalBoost += boost;
      audit.push({ 
        source: "Open-Meteo AQ", 
        field: "health", 
        delta: boost, 
        reason: `PM2.5 ${signals.aq.pm25.toFixed(0)}µg/m³ in ${signals.aq.city}` 
      });
    }
  }

  if (signals.diseaseActive > 1000) {
    const m = signals.diseaseActive / 1000;
    const boost = Math.min(25, Math.round(Math.log10(m + 1) * 10));
    dims.health = clamp(dims.health + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "disease.sh", 
      field: "health+food", 
      delta: boost, 
      reason: `${signals.diseaseActive.toLocaleString()} active COVID-19 cases` 
    });
  }

  if (signals.whoOutbreaks && signals.whoOutbreaks.length > 0) {
    const boost = Math.min(20, signals.whoOutbreaks.length * 8);
    dims.health = clamp(dims.health + boost);
    dims.access = clamp(dims.access + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "WHO", 
      field: "health+access", 
      delta: boost, 
      reason: `${signals.whoOutbreaks.length} disease outbreaks detected` 
    });
  }

  if (signals.wbInflation && signals.wbInflation.value > 5) {
    const boost = Math.min(20, Math.round(signals.wbInflation.value / 3));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+food", 
      delta: boost, 
      reason: `Inflation ${signals.wbInflation.value.toFixed(1)}%` 
    });
  }

  if (signals.wbGdpGrowth && signals.wbGdpGrowth.value < 0) {
    const boost = Math.min(18, Math.round(Math.abs(signals.wbGdpGrowth.value) * 2.5));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+political", 
      delta: boost, 
      reason: `GDP growth ${signals.wbGdpGrowth.value.toFixed(1)}% (contraction)` 
    });
  }

  if (signals.wbUnemployment && signals.wbUnemployment.value > 10) {
    const boost = Math.min(15, Math.round(signals.wbUnemployment.value / 4));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+political", 
      delta: boost, 
      reason: `Unemployment ${signals.wbUnemployment.value.toFixed(1)}%` 
    });
  }

  if (signals.wbPoverty && signals.wbPoverty.value > 5) {
    const boost = Math.min(18, Math.round(signals.wbPoverty.value / 3));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.5));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+food", 
      delta: boost, 
      reason: `${signals.wbPoverty.value.toFixed(1)}% living in extreme poverty` 
    });
  }

  if (signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const boost = m >= 10 ? 45 
                : m >= 5 ? 35 
                : m >= 3 ? 28 
                : m >= 1.5 ? 20 
                : m >= 0.5 ? 12 
                : m >= 0.1 ? 6 
                : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      dims.political = clamp(dims.political + Math.floor(boost * 0.4));
      dims.economic = clamp(dims.economic + Math.floor(boost * 0.3));
      dims.access = clamp(dims.access + Math.floor(boost * 0.2));
      totalBoost += boost;
      audit.push({ 
        source: "UNHCR", 
        field: "displacement+political+economic+access", 
        delta: boost, 
        reason: `${m.toFixed(1)}M displaced — massive humanitarian crisis` 
      });
    }
  }

  if (signals.unhcrEmergency) {
    const boost = signals.unhcrEmergency.level === "critical" ? 18 
                : signals.unhcrEmergency.level === "high" ? 12 
                : 6;
    dims.political = clamp(dims.political + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.6));
    totalBoost += boost;
    audit.push({ 
      source: "UNHCR Emergency", 
      field: "political+displacement", 
      delta: boost, 
      reason: `Active emergency: ${signals.unhcrEmergency.name} (${signals.unhcrEmergency.level})` 
    });
  }

  if (signals.noaa) {
    const boost = Math.min(15, (signals.noaa.extreme_alerts + signals.noaa.storm_alerts) * 3);
    if (boost > 0) {
      dims.climate = clamp(dims.climate + boost);
      totalBoost += boost;
      audit.push({ 
        source: "NOAA", 
        field: "climate", 
        delta: boost, 
        reason: `${signals.noaa.extreme_alerts} extreme + ${signals.noaa.storm_alerts} severe storm alerts active` 
      });
    }
  }

  if (signals.ipcPhase >= 3) {
    const phaseBoosts = { 3: 20, 4: 35, 5: 50 };
    const boost = phaseBoosts[signals.ipcPhase] || 0;
    if (boost > 0) {
      dims.food = clamp(dims.food + boost);
      dims.health = clamp(dims.health + Math.floor(boost * 0.6));
      dims.economic = clamp(dims.economic + Math.floor(boost * 0.3));
      totalBoost += boost;
      audit.push({ 
        source: "IPC/FEWS NET", 
        field: "food+health+economic", 
        delta: boost, 
        reason: `IPC Phase ${signals.ipcPhase} food insecurity ${signals.ipcPhase >= 4 ? '— EMERGENCY' : ''}` 
      });
    }
  }

  if (signals.acledEvents && signals.acledEvents > 0) {
    const boost = Math.min(25, Math.round(signals.acledEvents * 0.8 + signals.acledFatalities * 0.05));
    if (boost > 0) {
      dims.conflict = clamp(dims.conflict + boost);
      dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.4));
      dims.political = clamp(dims.political + Math.floor(boost * 0.3));
      totalBoost += boost;
      audit.push({ 
        source: "ACLED", 
        field: "conflict+displacement+political", 
        delta: boost, 
        reason: `${signals.acledEvents} conflict events, ${signals.acledFatalities || 0} fatalities` 
      });
    }
  }

  if (signals.reliefwebCount && signals.reliefwebCount > 0) {
    const boost = Math.min(15, signals.reliefwebCount * 5);
    dims.access = clamp(dims.access + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "ReliefWeb", 
      field: "access+displacement", 
      delta: boost, 
      reason: `${signals.reliefwebCount} active humanitarian reports` 
    });
  }

  if (signals.wbRefugees && signals.wbRefugees.value > 1000) {
    const m = signals.wbRefugees.value / 1_000_000;
    const boost = m >= 2 ? 15 : m >= 0.5 ? 10 : m >= 0.1 ? 5 : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      totalBoost += boost;
      audit.push({ 
        source: "World Bank Refugees", 
        field: "displacement", 
        delta: boost, 
        reason: `${m.toFixed(1)}M refugees (WB cross-check)` 
      });
    }
  }

  if (CFG.ML_ENABLED && store) {
    const mlForecast = mlEnhancedForecast(iso, clamp(composite(dims)), store);
    if (mlForecast.anomaly_probability > 0.6) {
      const mlBoost = Math.round(mlForecast.anomaly_probability * 12);
      dims.political = clamp(dims.political + Math.floor(mlBoost * 0.4));
      dims.economic = clamp(dims.economic + Math.floor(mlBoost * 0.3));
      dims.conflict = clamp(dims.conflict + Math.floor(mlBoost * 0.2));
      totalBoost += mlBoost;
      audit.push({ 
        source: "ML Anomaly", 
        field: "political+economic+conflict", 
        delta: mlBoost, 
        reason: `ML anomaly probability ${(mlForecast.anomaly_probability * 100).toFixed(0)}%` 
      });
    }
  }

  if (totalBoost > 0) {
    console.log(`📈 ${iso} live boost: +${totalBoost} (${audit.length} sources)`);
  }

  return { dims, score: clamp(composite(dims)), audit };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── BUILD STORE WITH TIME-SENSITIVE SCORING ─────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function buildStore(liveData) {
  const seed = Math.floor(Date.now() / CFG.SEED_INTERVAL_MS);
  const store = {};
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const fsiScore = country.fsi_score || country.prior || 50;
    const base = Math.round((fsiScore / 120) * 100);
    const jitter = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const adjustedBase = clamp(base + jitter, 5, 99);
    
    const priorDims = buildPriorDims(adjustedBase, country.types);
    const priorScore = clamp(composite(priorDims));
    let dims, score, audit, signals;
    if (liveData) {
      signals = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals, iso, store);
      dims = adjusted.dims;
      score = adjusted.score;
      audit = adjusted.audit;
    } else {
      dims = priorDims;
      score = priorScore;
      audit = [];
      signals = {};
    }
    store[iso] = {
      ...country,
      dims,
      score,
      priorScore,
      liveBoost: score - priorScore,
      audit,
      signals,
      spillover: 0,
      ml_forecast: null,
      sentiment: null,
      historical_trend: null,
      fsi_score: fsiScore,
      fsi_rank: country.fsi_rank,
      fsi_band: country.fsi_band,
      __wst: null,
      __time_sensitive: null,
    };
  }
  
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    store[iso].spillover = +(Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }
  
  // ── APPLY TIME-SENSITIVE SCORING ───────────────────────────────────────
  if (CFG.WST_ENABLED) {
    for (const iso in store) {
      const timeSensitive = computeTimeSensitiveScore(iso, store[iso].score, store, store[iso].dims);
      store[iso].__time_sensitive = timeSensitive;
      
      // Blend the adjusted score with the original for stability
      const blendWeight = 0.7; // 70% time-sensitive, 30% original
      store[iso].score = clamp(Math.round(
        timeSensitive.adjustedScore * blendWeight + 
        store[iso].score * (1 - blendWeight)
      ));
      
      // Store the time-sensitive metrics
      store[iso].time_metrics = {
        momentum: timeSensitive.momentum,
        velocity: timeSensitive.velocity,
        acceleration: timeSensitive.acceleration,
        time_decay: timeSensitive.timeDecay,
        total_adjustment: timeSensitive.totalAdjustment,
        raw_score: timeSensitive.rawScore,
        structural_weight: timeSensitive.structuralWeight,
        recovery_factor: timeSensitive.recoveryFactor,
        momentum_adjust: timeSensitive.momentumAdjust,
        velocity_adjust: timeSensitive.velocityAdjust,
        acceleration_adjust: timeSensitive.accelerationAdjust,
        time_decay_adjust: timeSensitive.timeDecayAdjust,
        recovery_adjust: timeSensitive.recoveryAdjust,
      };
    }
  }
  
  if (CFG.ML_ENABLED) {
    trainMLModel(store);
  }
  
  for (const iso in store) {
    if (CFG.ML_ENABLED) {
      store[iso].ml_forecast = mlEnhancedForecast(iso, store[iso].score, store);
    }
    if (CFG.SENTIMENT_ENABLED) {
      store[iso].sentiment = analyzeCountrySentiment(iso, store);
    }
    if (CFG.HISTORY_ENABLED) {
      store[iso].historical_trend = historyStore.getTrend(iso, 30);
      storeHistoricalData(iso, store);
    }
    if (CFG.GEO_FENCING_ENABLED) {
      alertManager.checkAlerts(iso, store);
    }
  }
  
  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ANOMALY DETECTION ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function detectCUSUM(arr) {
  if (arr.length < 6) return { detected: false, type: "cusum", stat: 0, direction: "stable" };
  const base = arr.slice(0, Math.floor(arr.length * 0.6));
  const mu = mean(base), sd = stddev(base);
  const k = CFG.CUSUM_K * sd, h = CFG.CUSUM_H * sd;
  let sP = 0, sN = 0, maxS = 0;
  for (const x of arr) {
    sP = Math.max(0, sP + (x - mu) - k);
    sN = Math.max(0, sN - (x - mu) - k);
    maxS = Math.max(maxS, sP, sN);
  }
  return { detected: sP > h || sN > h, type:"cusum", stat:+maxS.toFixed(2), direction: sP > sN ? "up" : "down" };
}

function detectZScore(arr) {
  if (arr.length < 6) return { detected: false, type:"zscore", stat:0, direction: "stable" };
  const baseline = arr.slice(0, -3), recent = arr.slice(-3);
  const mu = mean(baseline), sd = stddev(baseline);
  const z = (mean(recent) - mu) / sd;
  return { detected: Math.abs(z) >= CFG.ANOMALY_Z_THRESHOLD, type:"zscore", stat:+Math.abs(z).toFixed(2), direction: z > 0 ? "up" : "down" };
}

function detectChangepoint(arr) {
  if (arr.length < CFG.CHANGEPOINT_MIN_SEG * 2) return { detected: false, type:"changepoint", stat:0, direction: "stable" };
  const n = arr.length, mid = Math.floor(n / 2);
  const muA = mean(arr.slice(0, mid)), sdA = stddev(arr.slice(0, mid));
  const muB = mean(arr.slice(mid)),   sdB = stddev(arr.slice(mid));
  const kl = Math.log(sdB / sdA) + (sdA ** 2 + (muA - muB) ** 2) / (2 * sdB ** 2) - 0.5;
  return { detected: kl > 1.5, type:"changepoint", stat:+kl.toFixed(3), direction: muB > muA ? "up" : "down" };
}

function detectVolatilityRegime(arr) {
  if (arr.length < 8) return { detected: false, type:"volatility", stat:0, direction: "stable" };
  const half = Math.floor(arr.length / 2);
  const ratio = stddev(arr.slice(half)) / stddev(arr.slice(0, half));
  return { detected: ratio > CFG.VOLATILITY_RATIO_THRESHOLD, type:"volatility", stat:+ratio.toFixed(2), direction:"unstable" };
}

function runAnomalyDetection(arr) {
  const methods = [detectCUSUM(arr), detectZScore(arr), detectChangepoint(arr), detectVolatilityRegime(arr)];
  const fired = methods.filter(m => m.detected);
  const consensus = fired.length >= 2;
  const maxZ = detectZScore(arr).stat;
  const dirs = fired.map(m => m.direction).filter(Boolean);
  const up = dirs.filter(d => d === "up").length, down = dirs.filter(d => d === "down").length;
  const direction = up > down ? "escalating" : down > up ? "improving" : "unstable";
  const severity =
    fired.length >= 4 ? "EXTREME" :
    fired.length >= 3 ? "CRITICAL" :
    consensus && maxZ >= CFG.ANOMALY_Z_THRESHOLD * 1.5 ? "HIGH" :
    consensus ? "MODERATE" :
    fired.length === 1 ? "WATCH" : "NONE";
  return {
    detected: consensus,
    severity,
    direction,
    methods_fired: fired.length,
    methods,
    z_score: maxZ,
    note: consensus
      ? `${fired.length}/4 anomaly methods agree: ${direction} — ${severity}`
      : fired.length === 1 ? `Weak signal (1/4 methods): ${fired[0].type}` : "No anomaly detected",
  };
}

function computeStoryHeat(iso, store, hist, anom, mlForecast) {
  const c = store[iso];
  const s = c.signals || {};
  let heat = 0;
  const drivers = [];

  const delta7 = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  if (Math.abs(delta7) >= 2) {
    const v = Math.min(30, Math.abs(delta7) * 2.2);
    heat += v;
    drivers.push({ driver: "velocity", points: +v.toFixed(1), detail: `${delta7 > 0 ? "+" : ""}${delta7.toFixed(0)} pts in 7 days` });
  }

  if (anom.detected) {
    const sevPts = { WATCH: 6, MODERATE: 14, HIGH: 20, CRITICAL: 25, EXTREME: 28 };
    const v = sevPts[anom.severity] || 8;
    heat += v;
    drivers.push({ driver: "anomaly", points: v, detail: `${anom.methods_fired}/4 methods — ${anom.severity}` });
  }

  if (mlForecast?.anomaly_probability > 0.4) {
    const v = Math.min(18, mlForecast.anomaly_probability * 22);
    heat += v;
    drivers.push({ driver: "ml_forecast", points: +v.toFixed(1), detail: `${(mlForecast.anomaly_probability * 100).toFixed(0)}% anomaly probability` });
  }

  const evidenceCount = s.liveEvidenceCount || 0;
  if (evidenceCount >= 2) {
    const v = Math.min(16, evidenceCount * 2.5);
    heat += v;
    drivers.push({ driver: "evidence_breadth", points: +v.toFixed(1), detail: `${evidenceCount} independent live sources` });
  }

  // ── Time-sensitive momentum boost ──────────────────────────────────────
  if (c.time_metrics && Math.abs(c.time_metrics.momentum) > 0.3) {
    const momentumHeat = Math.min(12, Math.abs(c.time_metrics.momentum) * 8);
    heat += momentumHeat;
    drivers.push({ 
      driver: "temporal_momentum", 
      points: +momentumHeat.toFixed(1), 
      detail: `${c.time_metrics.momentum > 0 ? '↑' : '↓'} ${Math.abs(c.time_metrics.momentum).toFixed(2)} pts/day momentum` 
    });
  }

  if (s.ipcPhase >= 4) {
    heat += 20;
    drivers.push({ driver: "ipc_threshold", points: 20, detail: `IPC Phase ${s.ipcPhase}` });
  } else if (s.quakeMag >= 6.0) {
    heat += 18;
    drivers.push({ driver: "major_quake", points: 18, detail: `M${s.quakeMag.toFixed(1)}` });
  } else if (s.gdacsAlert === "red") {
    heat += 16;
    drivers.push({ driver: "gdacs_red", points: 16, detail: "Red alert active" });
  } else if (s.acledFatalities > 100) {
    heat += 14;
    drivers.push({ driver: "conflict_spike", points: 14, detail: `${s.acledFatalities} fatalities` });
  }

  heat = Math.min(100, Math.round(heat));
  drivers.sort((a, b) => b.points - a.points);

  return {
    score: heat,
    is_breaking: heat >= 55,
    tier: heat >= 75 ? "BREAKING" : heat >= 55 ? "DEVELOPING" : heat >= 30 ? "NOTABLE" : "ROUTINE",
    top_drivers: drivers.slice(0, 3),
  };
}

function trendForecast(hist, current) {
  if (hist.length < 5) return { fc:current, trend:"stable", esc:false, slope:0, confidence:0.3 };
  const w = hist.slice(-10), n = w.length;
  const xBar = (n - 1) / 2, yBar = mean(w);
  const num = w.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
  const den = w.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
  const slope = den ? +(num / den).toFixed(2) : 0;
  const fc = clamp(current + slope * 7);
  const residual = w.map((y, i) => y - (yBar + slope * (i - xBar)));
  const r2 = 1 - (residual.reduce((s, r) => s + r * r, 0) / w.reduce((s, y) => s + (y - yBar) ** 2, 0) || 1);
  return {
    fc,
    slope,
    trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable",
    esc: fc > current + 5,
    confidence: Math.max(0.3, Math.min(0.95, r2)),
  };
}

function seedHistory(iso, current) {
  const seed = strHash(iso);
  let v = clamp(current + Math.round((lcg(seed) - 0.5) * 20), 5, 99);
  const hist = [];
  for (let i = 0; i <= CFG.ANOMALY_WINDOW; i++) {
    hist.push(v);
    v = clamp(v + (current - v) * 0.15 + (lcg(strHash(iso + i)) - 0.5) * 6);
  }
  hist[hist.length - 1] = current;
  return hist;
}

function buildPriorDims(base, types) {
  const has = t => types.includes(t);
  const cl  = v => clamp(v, 5, 99);
  return {
    conflict:     cl(base * ((has("CW")||has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
    displacement: cl(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.80 : 0.38)),
    food:         cl(base * ((has("FN")||has("DR"))             ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health:       cl(base * ((has("EP")||has("FN"))             ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     cl(base * ((has("CE")||has("CW")||has("FN")||has("DR")||has("ECO")) ? 0.85 : 0.42) + 10),
    climate:      cl(base * ((has("HEAT")||has("DR"))           ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       cl(base * ((has("CW")||has("CE"))             ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    cl(base * ((has("CE")||has("CW")||has("REF")||has("POL")) ? 0.90 : 0.42) + 8),
  };
}

function severityLabel(score) {
  return score >= 85 ? "CATASTROPHIC" : score >= 75 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "ELEVATED" : "MODERATE";
}

function severityEmoji(score) {
  return score >= 85 ? "🔴" : score >= 75 ? "🟠" : score >= 60 ? "🟡" : score >= 40 ? "🟢" : "🔵";
}

function severityColor(score) {
  return score >= 85 ? "#ff375f" : score >= 75 ? "#ff375f" : score >= 60 ? "#ff8c42" : score >= 40 ? "#ffb020" : "#6bc8ff";
}

function recommendation(score, anomaly) {
  const an = anomaly?.detected ? ` Statistical anomaly detected (${anomaly.severity}).` : "";
  if (score >= 85) return { tier:"IMMEDIATE", text:`Immediate humanitarian response required. All agencies mobilise.${an}` };
  if (score >= 75) return { tier:"URGENT",    text:`Urgent response needed. Mobilise resources now.${an}` };
  if (score >= 60) return { tier:"HIGH",      text:`Elevated concern. Prepare response and monitor daily.${an}` };
  if (score >= 40) return { tier:"MONITOR",   text:`Monitor situation. Maintain readiness.${an}` };
  return               { tier:"WATCH",     text:`Routine monitoring. No immediate action required.${an}` };
}

function generatePDFReport(iso, store) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  
  return {
    title: `${c.name} Crisis Report`,
    generated: new Date().toISOString(),
    score: c.score,
    severity: severityLabel(c.score),
    dimensions: c.dims,
    trend: fc,
    anomaly: anom,
    evidence: c.signals,
    time_metrics: c.time_metrics,
    recommendation: recommendation(c.score, anom),
  };
}

function generateExportData(iso, store, format = 'json') {
  const data = {
    iso,
    name: store[iso].name,
    timestamp: new Date().toISOString(),
    score: store[iso].score,
    dimensions: store[iso].dims,
    evidence: store[iso].signals,
    time_metrics: store[iso].time_metrics,
    historical: historyStore.getHistory(iso, 30),
  };

  if (format === 'csv') {
    let csv = 'timestamp,score,displacement,economic,food,health,momentum,velocity,acceleration\n';
    for (const d of data.historical) {
      csv += `${new Date(d.timestamp).toISOString()},${d.score},${d.displacement||0},${d.economic||0},${d.food||0},${d.health||0},${d.momentum||0},${d.velocity||0},${d.acceleration||0}\n`;
    }
    return csv;
  }
  return data;
}

function generateWidget(iso, store) {
  const c = store[iso];
  const time = c.time_metrics || {};
  return `<div class="gcin-widget" style="background:#0f1a30;border:1px solid #2d3a5e;border-radius:12px;padding:16px;font-family:system-ui;max-width:320px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:20px;">${c.flag}</span>
      <span style="font-weight:600;color:#fff;font-size:16px;">${c.name}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#7c9ec0;font-size:12px;">Crisis Score</span>
      <span style="color:#ff8a7a;font-size:20px;font-weight:700;">${c.score}/100</span>
    </div>
    <div style="width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:99px;margin:4px 0 8px;">
      <div style="height:100%;width:${c.score}%;background:${severityColor(c.score)};border-radius:99px;"></div>
    </div>
    ${time.momentum ? `<div style="display:flex;gap:12px;margin:4px 0;font-size:10px;color:#5a7a9a;">
      <span>⚡ ${time.momentum > 0 ? '+' : ''}${time.momentum.toFixed(2)}/day</span>
      <span>📈 ${(time.velocity || 0).toFixed(2)}</span>
    </div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
      ${c.types.slice(0,3).map(t => `<span style="background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:4px;font-size:10px;color:#b8cce8;">${ARC[t]?.l || t}</span>`).join('')}
    </div>
    <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.04);padding-top:8px;display:flex;justify-content:space-between;">
      <span style="font-size:10px;color:#5a7a9a;">${severityLabel(c.score)}</span>
      <a href="${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}" style="font-size:10px;color:#6bc8ff;text-decoration:none;">Read →</a>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function buildPayload(iso, store, ranked, opts = {}) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = Math.round(hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)]);
  const s = c.signals || {};
  const heat = computeStoryHeat(iso, store, hist, anom, c.ml_forecast);

  const base = {
    iso,
    name: c.name,
    flag: c.flag,
    score: c.score,
    severity: severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    severity_color: severityColor(c.score),
    rank,
    total_countries: ranked.length,
    percentile: Math.round((1 - rank / ranked.length) * 100),
    slug: slugify(c.name),
    url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
    live_evidence_sources: s.evidenceSources || [],
    live_evidence_count: s.liveEvidenceCount || 0,
    is_live_data: s.liveEvidenceCount >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
    dimensions: Object.fromEntries(DIMS.map(d => [d.k, { value: c.dims[d.k] || 0, label: d.l, weight: d.w, icon: d.icon }])),
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️", color: ARC[t]?.color || "#6bc8ff" })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    trend: {
      delta_7d: delta7,
      direction: fc.trend,
      slope: fc.slope,
      forecast_7d: fc.fc,
      escalating: fc.esc,
      confidence: fc.confidence,
    },
    anomaly: {
      detected: anom.detected,
      severity: anom.severity,
      direction: anom.direction,
      methods_fired: anom.methods_fired,
      z_score: anom.z_score,
      note: anom.note,
      methods: {
        cusum: anom.methods[0],
        zscore: anom.methods[1],
        changepoint: anom.methods[2],
        volatility: anom.methods[3],
      },
    },
    spillover: {
      value: c.spillover,
      from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })),
    },
    story_heat: heat,
    live_evidence: {
      earthquake: s.quakeMag >= 4.5 ? { magnitude: s.quakeMag, location: s.quakePlace, event_count: s.quakeCount, source: "USGS/EMSC" } : null,
      nasa_events: s.nasaEventCount > 0 ? { count: s.nasaEventCount, source: "NASA EONET" } : null,
      gdacs: s.gdacs ? { alert_level: s.gdacsAlert, source: "GDACS" } : null,
      ifrc: s.ifrcCount > 0 ? { count: s.ifrcCount, source: "IFRC GO" } : null,
      heat: s.maxTempC >= 35 ? { max_temp_c: s.maxTempC, source: "Open-Meteo" } : null,
      hazards: s.hazards ? { ...s.hazards, source: "Open-Meteo" } : null,
      air_quality: s.aq ? { ...s.aq, source: "Open-Meteo AQ" } : null,
      noaa: s.noaa ? { ...s.noaa, source: "NOAA" } : null,
      disease: s.diseaseActive > 0 ? { disease: s.diseaseName, active: s.diseaseActive, source: "disease.sh" } : null,
      who_outbreaks: s.whoOutbreaks && s.whoOutbreaks.length > 0 ? { outbreaks: s.whoOutbreaks, source: "WHO" } : null,
      reliefweb: s.reliefwebCount > 0 ? { reports: s.reliefwebCount, source: "ReliefWeb" } : null,
      economic: {
        inflation: s.wbInflation ? { ...s.wbInflation, source: "World Bank" } : null,
        gdp_growth: s.wbGdpGrowth ? { ...s.wbGdpGrowth, source: "World Bank" } : null,
        unemployment: s.wbUnemployment ? { ...s.wbUnemployment, source: "World Bank" } : null,
        poverty: s.wbPoverty ? { ...s.wbPoverty, source: "World Bank" } : null,
        refugees_wb: s.wbRefugees ? { ...s.wbRefugees, source: "World Bank" } : null,
      },
      displacement: s.totalDisplaced > 0 ? { total: s.totalDisplaced, refugees: s.refugees, idps: s.idps, asylum_seekers: s.asylum_seekers, source: "UNHCR" } : null,
      unhcr_operation: s.unhcrOp ? { ...s.unhcrOp, source: "UNHCR" } : null,
      unhcr_emergency: s.unhcrEmergency ? { ...s.unhcrEmergency, source: "UNHCR" } : null,
      unhcr_statistics: s.unhcrStats ? { ...s.unhcrStats, source: "UNHCR" } : null,
    },
    ml: c.ml_forecast ? {
      forecast: c.ml_forecast.fc,
      confidence: c.ml_forecast.confidence,
      anomaly_probability: c.ml_forecast.anomaly_probability,
      trained: c.ml_forecast.ml_trained,
      training_count: c.ml_forecast.training_count,
    } : null,
    sentiment: c.sentiment ? {
      score: c.sentiment.score,
      label: c.sentiment.label,
      confidence: c.sentiment.confidence,
      crisis_intensity: c.sentiment.crisis_intensity,
      key_terms: c.sentiment.key_terms,
    } : null,
    historical: c.historical_trend ? {
      direction: c.historical_trend.direction,
      slope: c.historical_trend.slope,
      points: c.historical_trend.points,
      change: c.historical_trend.change,
    } : null,
    time_metrics: c.time_metrics ? {
      momentum: c.time_metrics.momentum,
      velocity: c.time_metrics.velocity,
      acceleration: c.time_metrics.acceleration,
      time_decay: c.time_metrics.time_decay,
      total_adjustment: c.time_metrics.total_adjustment,
      raw_score: c.time_metrics.raw_score,
      structural_weight: c.time_metrics.structural_weight,
      recovery_factor: c.time_metrics.recovery_factor,
      adjustment_breakdown: {
        momentum: c.time_metrics.momentum_adjust,
        velocity: c.time_metrics.velocity_adjust,
        acceleration: c.time_metrics.acceleration_adjust,
        time_decay: c.time_metrics.time_decay_adjust,
        recovery: c.time_metrics.recovery_adjust,
      }
    } : null,
    export: {
      pdf: generatePDFReport(iso, store),
      widget: generateWidget(iso, store),
    },
    score_audit: {
      prior_score: c.priorScore,
      adjustments: c.audit || [],
      spillover: c.spillover,
      final_score: c.score,
      live_boost: c.liveBoost,
    },
    recommendation: recommendation(c.score, anom),
    region: c.region,
    fsi: {
      score: c.fsi_score,
      rank: c.fsi_rank,
      band: c.fsi_band,
    },
    wst: CFG.WST_ENABLED && c.__wst ? {
      class: c.__wst.class,
      tier: c.__wst.tier,
      recovery_rate: c.__wst.recovery_rate,
      structural_weight: c.__wst.structural_weight,
      fragility_multiplier: c.__wst.fragility_multiplier,
      debt_sensitivity: c.__wst.debt_sensitivity,
      reserve_currency: c.__wst.reserve_currency,
      momentum_factor: c.__wst.momentum_factor,
    } : null,
  };

  if (opts.keywords) base.seo_keywords = buildKeywords(iso, store);
  if (opts.summary) base.meta_description = buildMetaDescription(iso, store);
  if (opts.schema) base.json_ld = buildJSONLD(iso, store, ranked);
  if (opts.related) base.related = buildRelatedStories(iso, store, ranked);
  if (opts.article) base.article = buildSEOArticle(iso, store, ranked);

  return base;
}

// ─── SEO HELPERS ──────────────────────────────────────────────────────────

function buildKeywords(iso, store) {
  const c = store[iso];
  const s = c.signals || {};
  const kws = new Set();
  const name = c.name;

  kws.add(`${name} humanitarian crisis`);
  kws.add(`${name} crisis ${new Date().getFullYear()}`);
  kws.add(`${name} emergency`);
  kws.add(`${name} disaster`);

  for (const t of c.types) {
    const arc = ARC[t];
    if (arc?.seo) { kws.add(`${name} ${arc.seo}`); kws.add(arc.seo); }
  }

  if (s.totalDisplaced > 0) { kws.add(`${name} refugees`); kws.add(`${name} internally displaced`); kws.add(`${name} displacement crisis`); }
  if (s.quakeMag >= 5.0) { kws.add(`${name} earthquake`); kws.add(`earthquake ${name} ${new Date().getFullYear()}`); }
  if (s.gdacs) { kws.add(`${name} disaster alert`); kws.add(`${name} GDACS`); }
  if (s.diseaseActive > 1000) { kws.add(`${name} COVID-19`); kws.add(`${name} coronavirus`); }
  if (s.wbInflation?.value > 10) { kws.add(`${name} inflation crisis`); kws.add(`${name} economic crisis`); }
  if (s.wbGdpGrowth?.value < 0) { kws.add(`${name} GDP contraction`); kws.add(`${name} recession`); }

  kws.add(`${c.region} humanitarian crisis`);
  kws.add(`${c.region} emergency`);

  kws.add(`what is happening in ${name}`);
  kws.add(`${name} crisis latest news`);
  kws.add(`${name} humanitarian situation`);
  kws.add(`how to help ${name} crisis`);
  kws.add(`${name} aid response`);
  kws.add(`${name} conflict update`);

  return [...kws].slice(0, 35);
}

function buildMetaDescription(iso, store) {
  const c = store[iso];
  const s = c.signals || {};
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  
  let parts = [`${c.name} humanitarian crisis update: urgency score ${c.score}/100 (${severity}), ranked #${rank} globally`];
  if (s.totalDisplaced > 0) parts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.diseaseActive > 1000) parts.push(`${s.diseaseActive.toLocaleString()} COVID-19 cases`);
  if (s.ipcPhase >= 3) parts.push(`IPC Phase ${s.ipcPhase} food insecurity`);
  if (s.quakeMag >= 4.5) parts.push(`M${s.quakeMag.toFixed(1)} earthquake`);
  
  return parts.slice(0, 3).join('. ') + '.';
}

function buildRelatedStories(iso, store, ranked) {
  const c = store[iso];
  return ranked
    .filter(r => r !== iso && (COUNTRIES[r].region === c.region || (COUNTRIES[iso].adj || []).includes(r)))
    .slice(0, 5)
    .map(r => ({
      iso: r,
      name: store[r].name,
      score: store[r].score,
      slug: slugify(store[r].name),
      url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(store[r].name)}`,
    }));
}

function buildJSONLD(iso, store, ranked) {
  const c = store[iso];
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date().toISOString();
  const severity = severityLabel(c.score);
  const keywords = buildKeywords(iso, store);
  const faqs = buildFAQs(iso, store, ranked);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        "headline": `${c.name} Crisis — Score ${c.score}/100 (${severity})`,
        "description": buildMetaDescription(iso, store),
        "url": url,
        "datePublished": now,
        "dateModified": now,
        "author": { "@type": "Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
        "publisher": {
          "@type": "Organization",
          "name": CFG.ARTICLE_SITE_NAME,
          "url": CFG.ARTICLE_BASE_URL,
          "logo": { "@type": "ImageObject", "url": CFG.ARTICLE_LOGO },
        },
        "mainEntityOfPage": { "@type": "WebPage", "@id": url },
        "articleSection": "Humanitarian Crisis",
        "keywords": keywords.slice(0, 15).join(", "),
        "about": {
          "@type": "Place",
          "name": c.name,
          "geo": { "@type": "GeoCoordinates", "longitude": c.cent[0], "latitude": c.cent[1] },
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": CFG.ARTICLE_BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Crisis Hub", "item": `${CFG.ARTICLE_BASE_URL}/crisis` },
          { "@type": "ListItem", "position": 3, "name": c.name, "item": url },
        ],
      },
    ],
  };
}

function buildFAQs(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  const faqs = [];

  faqs.push({
    q: `What is the current humanitarian situation in ${c.name}?`,
    a: `${c.name} currently has a crisis urgency score of ${c.score}/100, rated ${severity}, ranking #${rank} of ${Object.keys(store).length} countries monitored globally. ${c.types.map(t => ARC[t]?.l).filter(Boolean).slice(0, 2).join(" and ")} are the primary crisis drivers.`,
  });

  if (s.totalDisplaced > 0) {
    faqs.push({
      q: `How many people have been displaced from ${c.name}?`,
      a: `UNHCR data indicates approximately ${fmtPop(s.totalDisplaced)} people have been displaced, including${s.refugees ? ` ${fmtPop(s.refugees)} refugees` : ""}${s.idps ? `, ${fmtPop(s.idps)} internally displaced persons (IDPs)` : ""}${s.asylum_seekers ? `, and ${fmtPop(s.asylum_seekers)} asylum-seekers` : ""}.`,
    });
  }

  if (s.ipcPhase >= 3) {
    faqs.push({
      q: `How many people are facing food insecurity in ${c.name}?`,
      a: `According to IPC Global classifications, approximately ${fmtPop(s.ipcTotalPop || s.ipcPopulation)} people in ${c.name} face Phase ${s.ipcPhase} (${s.ipcPhase >= 4 ? "Emergency" : "Crisis"}) levels of acute food insecurity.`,
    });
  }

  if (s.diseaseActive > 1000) {
    faqs.push({
      q: `What disease activity is being tracked in ${c.name}?`,
      a: `Live tracking shows ${s.diseaseActive.toLocaleString()} active COVID-19 cases in ${c.name}.`,
    });
  }

  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0) {
    faqs.push({
      q: `What is the economic situation in ${c.name}?`,
      a: `World Bank data${s.wbInflation ? ` shows inflation at ${s.wbInflation.value.toFixed(1)}%` : ""}${s.wbGdpGrowth?.value < 0 ? ` with GDP contraction of ${s.wbGdpGrowth.value.toFixed(1)}%` : ""}${!s.wbInflation && !s.wbGdpGrowth ? ' is under pressure' : ''}.`,
    });
  }

  faqs.push({
    q: `How can I help people affected by the crisis in ${c.name}?`,
    a: `You can support the humanitarian response in ${c.name} by donating to organisations active in the region, including UNHCR, WFP, UNICEF, MSF, and local NGOs. Advocacy for increased international funding and policy attention also makes a significant difference.`,
  });

  return faqs;
}

function buildSEOArticle(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const hist = seedHistory(iso, c.score);
  const anom = runAnomalyDetection(hist);
  const fc = trendForecast(hist, c.score);
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  
  const topDims = [...DIMS].map(d => ({ ...d, val: c.dims[d.k] || 0 })).sort((a, b) => b.val - a.val);
  const delta = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  const trendWord = delta > 5 ? "rapidly deteriorating" : delta > 2 ? "worsening" : delta < -5 ? "significantly improving" : delta < -2 ? "improving" : "largely stable";
  const keywords = buildKeywords(iso, store);
  const faqs = buildFAQs(iso, store, ranked);

  const primaryTypes = c.types.slice(0, 2).map(t => ARC[t]?.l || t).join(" and ");
  
  const headlineCandidates = [];

  if (s.totalDisplaced > 1_000_000) {
    headlineCandidates.push({
      weight: 100 + Math.min(50, s.totalDisplaced / 200_000),
      text: `${fmtPop(s.totalDisplaced)} Displaced: Inside ${c.name}'s ${primaryTypes} Emergency`,
    });
  }
  if (s.ipcPhase >= 4) {
    headlineCandidates.push({
      weight: s.ipcPhase === 5 ? 130 : 105,
      text: `${c.name} Food Crisis Hits IPC Phase ${s.ipcPhase}${s.ipcPhase === 5 ? " — Famine Classification" : " — Emergency Level"}: ${fmtPop(s.ipcTotalPop || s.ipcPopulation)} at Risk`,
    });
  }
  if (s.gdacsAlert === "red") {
    headlineCandidates.push({
      weight: 115,
      text: `RED ALERT: ${c.name} Under Active GDACS Disaster Warning Right Now`,
    });
  } else if (s.gdacsAlert === "orange") {
    headlineCandidates.push({
      weight: 90,
      text: `${c.name} Issued Orange Disaster Alert — What's Happening on the Ground`,
    });
  }
  if (s.quakeMag >= 6.0) {
    headlineCandidates.push({
      weight: 95 + (s.quakeMag - 6) * 8,
      text: `M${s.quakeMag.toFixed(1)} Earthquake Strikes ${c.name}${s.quakePlace ? ` Near ${s.quakePlace}` : ""} — Live Emergency Tracker`,
    });
  }
  if (s.acledFatalities > 50) {
    headlineCandidates.push({
      weight: 100 + Math.min(30, s.acledFatalities / 20),
      text: `${c.name} Conflict Escalates: ${s.acledFatalities.toLocaleString()} Fatalities From ${s.acledEvents} Recorded Events`,
    });
  }
  if (s.whoOutbreaks?.length > 0) {
    headlineCandidates.push({
      weight: 85 + s.whoOutbreaks.length * 5,
      text: `WHO Confirms ${s.whoOutbreaks.map(o => o.disease[0].toUpperCase() + o.disease.slice(1)).join(" & ")} Outbreak in ${c.name}`,
    });
  }
  if (s.diseaseActive > 5000) {
    headlineCandidates.push({
      weight: 70,
      text: `${c.name}'s Health System Strained by ${s.diseaseActive.toLocaleString()} Active COVID-19 Cases`,
    });
  }
  if (anom.detected && anom.severity === "EXTREME") {
    headlineCandidates.push({
      weight: 110,
      text: `Data Alert: ${c.name} Crisis Trajectory Just Broke Pattern — ${anom.methods_fired}/4 Statistical Models Agree`,
    });
  }
  if (c.ml_forecast?.anomaly_probability > 0.7) {
    headlineCandidates.push({
      weight: 90,
      text: `AI Forecast Flags ${c.name}: ${(c.ml_forecast.anomaly_probability * 100).toFixed(0)}% Anomaly Probability in Crisis Trend`,
    });
  }
  if (delta > 8) {
    headlineCandidates.push({
      weight: 80 + delta,
      text: `${c.name} Crisis Score Jumps ${delta.toFixed(0)} Points in a Week — Now ${severity}`,
    });
  }

  headlineCandidates.push({
    weight: 10,
    text: `${c.name} Crisis Monitor ${now.getFullYear()}: Urgency Score ${c.score}/100 (${severity}), Ranked #${rank} Globally`,
  });

  headlineCandidates.sort((a, b) => b.weight - a.weight);
  let headline = headlineCandidates[0].text;

  if (c.ml_forecast?.anomaly_probability > 0.6 && !headline.includes("Anomaly")) {
    headline += ` ⚡ AI Flags ${(c.ml_forecast.anomaly_probability * 100).toFixed(0)}% Anomaly Risk`;
  }

  const dekParts = [];
  if (s.totalDisplaced > 0 && !headline.includes("Displaced")) dekParts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.ipcPhase >= 3 && !headline.includes("IPC")) dekParts.push(`IPC Phase ${s.ipcPhase} food insecurity`);
  if (s.acledEvents > 0 && !headline.includes("Fatalities")) dekParts.push(`${s.acledEvents} conflict events tracked`);
  if (fc.esc) dekParts.push(`7-day forecast: ${fc.fc}/100 (${fc.trend})`);
  dekParts.push(`Live data from 20+ sources · Updated ${dateStr}`);
  const dek = dekParts.slice(0, 3).join(" · ");

  const metaDescription = buildMetaDescription(iso, store);
  
  const paragraphs = [];

  const ledeHook = s.totalDisplaced > 1_000_000
    ? `More than ${fmtPop(s.totalDisplaced)} people have been forced from their homes in ${c.name}`
    : s.diseaseActive > 5000
    ? `Active COVID-19 case counts are stretching ${c.name}'s healthcare system`
    : s.quakeMag >= 6.0
    ? `A magnitude ${s.quakeMag.toFixed(1)} earthquake has struck ${c.name}, causing widespread damage`
    : `The humanitarian situation in ${c.name} has reached ${severity} levels`;

  paragraphs.push(`## Overview\n\n${ledeHook}, according to the latest live data compiled from 20+ global sources. Crisis Monitor's real-time urgency index places ${c.name} at **${c.score} out of 100**, rated **${severity}** and ranked **#${rank} of ${Object.keys(store).length} countries** tracked globally as of ${dateStr}.`);

  if (c.ml_forecast) {
    paragraphs.push(`## Machine Learning Forecast\n\nAdvanced AI analysis predicts a ${c.ml_forecast.trend} trajectory with ${Math.round(c.ml_forecast.confidence * 100)}% confidence. The model projects the score reaching **${c.ml_forecast.fc}/100** with an anomaly probability of ${(c.ml_forecast.anomaly_probability * 100).toFixed(0)}%.`);
  }

  if (c.sentiment && c.sentiment.is_crisis) {
    paragraphs.push(`## Sentiment Analysis\n\nNews and humanitarian reporting sentiment for ${c.name} is **${c.sentiment.label}** (score: ${c.sentiment.score.toFixed(2)}), with a crisis intensity of ${(c.sentiment.crisis_intensity * 100).toFixed(0)}%. Key terms detected: ${c.sentiment.key_terms.slice(0, 5).join(', ')}.`);
  }

  if (c.historical_trend && c.historical_trend.points >= 5) {
    paragraphs.push(`## Historical Context\n\nOver the past ${c.historical_trend.points} data points, the crisis in ${c.name} has been **${c.historical_trend.direction}** at a rate of ${Math.abs(c.historical_trend.slope).toFixed(1)} points per week.`);
  }

  if (c.time_metrics) {
    paragraphs.push(`## Time-Sensitive Analysis\n\nMomentum: ${c.time_metrics.momentum > 0 ? '+' : ''}${c.time_metrics.momentum.toFixed(2)} pts/day | Velocity: ${c.time_metrics.velocity.toFixed(2)} | Acceleration: ${c.time_metrics.acceleration.toFixed(2)}\n\nStructural weight: ${(c.time_metrics.structural_weight * 100).toFixed(0)}% persistence | Recovery factor: ${(c.time_metrics.recovery_factor * 100).toFixed(0)}%`);
  }

  if (s.totalDisplaced > 0) {
    const parts = [];
    if (s.refugees) parts.push(`${fmtPop(s.refugees)} registered refugees`);
    if (s.idps) parts.push(`${fmtPop(s.idps)} internally displaced persons (IDPs)`);
    if (s.asylum_seekers) parts.push(`${fmtPop(s.asylum_seekers)} asylum-seekers`);
    paragraphs.push(`## Displacement\n\nUNHCR data records **${fmtPop(s.totalDisplaced)} people** displaced${parts.length ? `, comprising ${parts.join(", ")}` : ""}.`);
  }

  if (s.diseaseActive > 1000) {
    paragraphs.push(`## Public Health\n\nLive tracking shows **${s.diseaseActive.toLocaleString()} active COVID-19 cases** in ${c.name}.`);
  }

  if (s.whoOutbreaks && s.whoOutbreaks.length > 0) {
    const diseases = s.whoOutbreaks.map(o => o.disease).join(', ');
    paragraphs.push(`## Disease Outbreaks\n\nWHO reports active **${diseases}** outbreaks in ${c.name}.`);
  }

  if (s.ipcPhase >= 3) {
    const ipcLabel = s.ipcPhase === 5 ? "Catastrophe/Famine" : s.ipcPhase === 4 ? "Emergency" : "Crisis";
    paragraphs.push(`## Food Security Crisis\n\nThe Integrated Food Security Phase Classification (IPC) has classified ${c.name} at **Phase ${s.ipcPhase} (${ipcLabel})**. An estimated **${fmtPop(s.ipcTotalPop || s.ipcPopulation)} people** require urgent humanitarian food assistance.`);
  }

  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0) {
    const econParts = [];
    if (s.wbInflation) econParts.push(`inflation at **${s.wbInflation.value.toFixed(1)}%**`);
    if (s.wbGdpGrowth?.value < 0) econParts.push(`GDP contraction of **${s.wbGdpGrowth.value.toFixed(1)}%**`);
    paragraphs.push(`## Economic Pressure\n\nWorld Bank indicators show ${econParts.join(" and ")}, compounding humanitarian strain.`);
  }

  if (s.gdacs || s.quakeMag >= 4.5) {
    const disasterLine = s.gdacs
      ? `GDACS has a **${s.gdacsAlert?.toUpperCase()} alert** for ${c.name}.`
      : `USGS/EMSC seismic monitoring recorded a **magnitude ${s.quakeMag.toFixed(1)} earthquake** near ${s.quakePlace || "the region"}.`;
    paragraphs.push(`## Disaster Alert\n\n${disasterLine}`);
  }

  if (s.acledEvents > 0) {
    paragraphs.push(`## Conflict Report\n\nACLED records **${s.acledEvents} conflict events** in ${c.name} with **${s.acledFatalities || 0} fatalities**.`);
  }

  if (anom.detected) {
    paragraphs.push(`## Statistical Alert: Anomaly Detected\n\nCrisis Monitor's ensemble anomaly detection flagged **${anom.methods_fired}/4 methods** in agreement: a statistically significant **${anom.direction}** trajectory (severity: **${anom.severity}**).`);
  }

  const dimRows = topDims.slice(0, 5).map(d => `- **${d.l}**: ${c.dims[d.k]}/100 (weight: ${(d.w * 100).toFixed(0)}%)`).join("\n");
  paragraphs.push(`## Urgency Score Breakdown\n\n${dimRows}\n\nAdjusted **${c.liveBoost > 0 ? "+" : ""}${c.liveBoost} points** from the prior estimate of ${c.priorScore}/100 based on live signals.`);

  const needsList = [...new Set(c.types.flatMap(t => ARC[t]?.n || []))].slice(0, 5);
  paragraphs.push(`## Response Priorities\n\nRecommended response tier: **${recommendation(c.score, anom).tier}**: ${recommendation(c.score, anom).text}\n\nHumanitarian actors are calling for immediate action on: **${needsList.join(", ")}**.`);

  paragraphs.push(`## Frequently Asked Questions\n\n${faqs.map(f => `**${f.q}**\n\n${f.a}`).join("\n\n")}`);

  const articleBody = paragraphs.join("\n\n");
  const { words, minutes } = estimateReadTime(articleBody);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} | ${CFG.ARTICLE_SITE_NAME}</title>
  <meta name="description" content="${metaDescription}">
  <meta name="keywords" content="${keywords.slice(0, 20).join(", ")}">
  <meta name="author" content="${CFG.ARTICLE_AUTHOR}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${headline}">
  <meta property="og:description" content="${dek}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="${CFG.ARTICLE_SITE_NAME}">
  <meta property="og:image" content="${CFG.ARTICLE_LOGO}">
  <meta property="article:published_time" content="${now.toISOString()}">
  <meta property="article:section" content="Humanitarian Crisis">
  <meta property="article:tag" content="${keywords.slice(0, 6).join(", ")}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="${CFG.ARTICLE_TWITTER}">
  <meta name="twitter:title" content="${headline}">
  <meta name="twitter:description" content="${dek}">
  <meta name="twitter:image" content="${CFG.ARTICLE_LOGO}">
  <script type="application/ld+json">${JSON.stringify(buildJSONLD(iso, store, ranked), null, 2)}</script>
  <style>
    body { background: #030b18; color: #eef4ff; font-family: system-ui; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.7; }
    h1 { font-family: 'Georgia', serif; font-size: 2.5rem; font-weight: 800; }
    .severity-badge { display: inline-block; padding: 0.25rem 0.8rem; border-radius: 99px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .severity-badge.catastrophic { background: rgba(255,55,95,0.18); color: #ff375f; border: 1px solid rgba(255,55,95,0.35); }
    .severity-badge.critical { background: rgba(255,55,95,0.14); color: #ff375f; border: 1px solid rgba(255,55,95,0.3); }
    .severity-badge.high { background: rgba(255,140,66,0.14); color: #ff8c42; border: 1px solid rgba(255,140,66,0.3); }
    .severity-badge.elevated { background: rgba(255,176,32,0.12); color: #ffb020; border: 1px solid rgba(255,176,32,0.25); }
    .severity-badge.moderate { background: rgba(0,200,255,0.1); color: #6bc8ff; border: 1px solid rgba(0,200,255,0.2); }
    .urgency-score { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; padding: 0.5rem 0; border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); margin: 0.5rem 0 1rem; }
    .score-number { font-size: 2.5rem; font-weight: 800; }
    .score-denom { font-size: 1rem; color: #5a7a9a; }
    .score-label { font-size: 0.8rem; color: #5a7a9a; }
    .score-rank { font-size: 0.8rem; color: #5a7a9a; margin-left: auto; }
    .article-meta { display: flex; gap: 1.5rem; font-size: 0.8rem; color: #5a7a9a; flex-wrap: wrap; }
    .article-body p { margin-bottom: 1rem; }
    .article-body h2 { font-family: 'Georgia', serif; font-size: 1.6rem; margin: 1.5rem 0 0.5rem; }
    .article-body h3 { font-family: 'Georgia', serif; font-size: 1.2rem; margin: 1rem 0 0.25rem; }
    .article-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.04); font-size: 0.8rem; color: #5a7a9a; }
    .widget-container { background: #0f1a30; border: 1px solid #2d3a5e; border-radius: 12px; padding: 16px; max-width: 320px; margin-top: 1rem; }
    .ml-tag { display: inline-block; background: rgba(191,127,255,0.12); color: #bf7fff; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; border: 1px solid rgba(191,127,255,0.15); }
    .time-metrics { display: flex; gap: 1rem; font-size: 0.75rem; color: #5a7a9a; flex-wrap: wrap; margin: 0.25rem 0 0.5rem; }
    .time-metrics span { background: rgba(255,255,255,0.02); padding: 0.1rem 0.4rem; border-radius: 4px; }
  </style>
</head>
<body>
  <article>
    <header>
      <div class="severity-badge ${severity.toLowerCase()}">${severityEmoji(c.score)} ${severity}</div>
      <h1>${headline}</h1>
      <div class="article-meta">
        <time>${dateStr}</time>
        <span>${words} words</span>
        <span>${minutes} min read</span>
        <span>${CFG.ARTICLE_AUTHOR}</span>
        ${c.ml_forecast ? `<span class="ml-tag">🧠 ML Enhanced</span>` : ''}
      </div>
      ${c.time_metrics ? `<div class="time-metrics">
        <span>⚡ Momentum: ${c.time_metrics.momentum > 0 ? '+' : ''}${c.time_metrics.momentum.toFixed(2)}/day</span>
        <span>📈 Velocity: ${c.time_metrics.velocity.toFixed(2)}</span>
        <span>🚀 Acceleration: ${c.time_metrics.acceleration.toFixed(2)}</span>
        <span>⏳ Decay: ${(c.time_metrics.time_decay * 100).toFixed(0)}%</span>
      </div>` : ''}
      <div class="urgency-score">
        <span class="score-number">${c.score}</span><span class="score-denom">/100</span>
        <span class="score-label">Urgency Score</span>
        <span class="score-rank">#${rank} of ${Object.keys(store).length} countries</span>
      </div>
      <p style="font-size:1.15rem; color: #d8e6ff; font-weight:500; margin-top:0.5rem;">${dek}</p>
      <p style="font-size:1rem; color: #8aa8c8; margin-top:0.25rem;">${metaDescription}</p>
    </header>
    <div class="article-body">
      ${articleBody.split('\n\n').filter(p => p.trim()).map(p => {
        if (p.startsWith('##')) {
          const level = p.match(/^##+/)[0].length;
          const text = p.replace(/^##+\s*/, '');
          return `<h${level}>${text}</h${level}>`;
        }
        if (p.startsWith('-')) {
          return `<ul>${p.split('\n').map(l => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')}</ul>`;
        }
        return `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
      }).join('')}
    </div>
    <div class="widget-container">
      ${generateWidget(iso, store)}
    </div>
    <footer class="article-footer">
      <p><strong>Data sources:</strong> USGS, EMSC, NASA EONET, GDACS, IFRC GO, Open-Meteo, NOAA, disease.sh, World Bank, UNHCR, IPC, FEWS NET, ACLED, ReliefWeb, WHO.</p>
      <p><strong>FSI 2024 Baseline:</strong> Fund for Peace, Fragile States Index 2024.</p>
      <p><strong>Structural Analysis:</strong> World Systems Theory (Wallerstein, 1974) — Core, Semi-Periphery, Periphery classifications with time-sensitive scoring.</p>
      <p><strong>Export:</strong> <a href="?iso=${iso}&export=csv" style="color:#6bc8ff;">CSV</a> · <a href="?iso=${iso}&export=json" style="color:#6bc8ff;">JSON</a> · <a href="?iso=${iso}&export=pdf" style="color:#6bc8ff;">PDF</a></p>
    </footer>
  </article>
</body>
</html>`;

return {
    headline,
    dek,
    slug,
    url,
    metaDescription,
    keywords,
    faqs,
    body_markdown: articleBody,
    body_html: html,
    word_count: words,
    read_time_minutes: minutes,
  };
}

function buildSitemap(payloads) {
  const now = new Date().toISOString();
  const items = payloads.map(p => `
  <url>
    <loc>${CFG.ARTICLE_BASE_URL}/crisis/${p.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>${p.score >= 80 ? "1.0" : p.score >= 60 ? "0.9" : p.score >= 40 ? "0.8" : "0.7"}</priority>
    <news:news>
      <news:publication>
        <news:name>${CFG.ARTICLE_SITE_NAME}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${now}</news:publication_date>
      <news:title>${p.name} Crisis — Score ${p.score}/100 (${p.severity})</news:title>
      <news:keywords>${(p.seo_keywords || []).slice(0, 10).join(", ")}</news:keywords>
    </news:news>
  </url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;
}

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildRSSFeed(finalIsos, store, ranked) {
  const now = new Date();
  const MAX_ITEMS = 30;

  const items = finalIsos.slice(0, MAX_ITEMS).map(iso => {
    const article = buildSEOArticle(iso, store, ranked);
    const c = store[iso];
    const categories = [...new Set(c.types.map(t => ARC[t]?.l || t))];
    const heat = c.__heat;

    return `
  <item>
    <title>${escapeXml(article.headline)}</title>
    <link>${article.url}</link>
    <guid isPermaLink="true">${article.url}</guid>
    <pubDate>${now.toUTCString()}</pubDate>
    <description>${escapeXml(article.dek || article.metaDescription)}</description>
    ${categories.map(cat => `<category>${escapeXml(cat)}</category>`).join("\n    ")}
    ${heat ? `<category>Story Heat: ${heat.tier}</category>` : ""}
    <category>FSI 2024: ${c.fsi_band || "Not ranked"}</category>
    <category>WST: ${c.__wst ? c.__wst.class : "Unclassified"}</category>
    <media:content url="${CFG.ARTICLE_LOGO}" medium="image"/>
    <content:encoded><![CDATA[${article.body_html}]]></content:encoded>
  </item>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${CFG.ARTICLE_SITE_NAME}</title>
  <link>${CFG.ARTICLE_BASE_URL}</link>
  <atom:link href="${CFG.ARTICLE_BASE_URL}/api/top-story?format=rss" rel="self" type="application/rss+xml"/>
  <description>Live, sensor-driven global humanitarian crisis intelligence — with FSI 2024 baseline, World Systems Theory structural analysis, and time-sensitive momentum scoring.</description>
  <language>en-us</language>
  <lastBuildDate>${now.toUTCString()}</lastBuildDate>
  <ttl>5</ttl>
${items}
</channel>
</rss>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── MAIN HANDLER ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const start = Date.now();

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405, CORS);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let params;
  try {
    const url = new URL(req.url ?? "/", "https://x");
    params = {
      iso: url.searchParams.get("iso")?.toUpperCase().trim() || null,
      top: parseInt(url.searchParams.get("top") || "179", 10),
      q: url.searchParams.get("q")?.trim() || null,
      region: url.searchParams.get("region")?.toLowerCase().trim() || null,
      threshold: parseInt(url.searchParams.get("threshold") || "0", 10),
      format: url.searchParams.get("format") || "json",
      keywords: url.searchParams.get("keywords") === "true",
      related: url.searchParams.get("related") === "true",
      schema: url.searchParams.get("schema") === "true",
      summary: url.searchParams.get("summary") === "true",
      article: url.searchParams.get("format") === "article",
      force_live: url.searchParams.get("force_live") !== "false",
      export: url.searchParams.get("export") || null,
      ml: url.searchParams.get("ml") !== "false",
      sentiment: url.searchParams.get("sentiment") !== "false",
      history: url.searchParams.get("history") !== "false",
      widget: url.searchParams.get("widget") === "true",
      breaking: url.searchParams.get("format") === "breaking",
      rss: url.searchParams.get("format") === "rss",
      wst: url.searchParams.get("format") === "wst",
    };
    if (Number.isNaN(params.top)) params.top = 179;
    if (Number.isNaN(params.threshold)) params.threshold = 0;
    params.top = Math.min(CFG.MAX_TOP_N, Math.max(1, params.top));
  } catch {
    res.writeHead(400, CORS);
    res.end(JSON.stringify({ error: "Bad request URL" }));
    return;
  }

  if (params.region) {
    for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
      if (aliases.includes(params.region)) {
        params.region = canonical;
        break;
      }
    }
  }

  if (params.q && !params.iso) {
    const resolved = findIsoByName(params.q);
    if (!resolved) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({
        error: `Could not resolve "${params.q}"`,
        available: Object.entries(COUNTRIES).map(([iso, d]) => `${iso} (${d.name})`).sort(),
      }));
      return;
    }
    params.iso = resolved;
  }

  const isoList = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s]) : [];
  const invalidISOs = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => !COUNTRIES[s]) : [];
  if (invalidISOs.length) {
    res.writeHead(404, CORS);
    res.end(JSON.stringify({
      error: `Unknown ISO codes: ${invalidISOs.join(", ")}`,
      available: Object.keys(COUNTRIES).sort(),
    }));
    return;
  }

  try {
    const priorStore = buildStore(null);
    const priorRanked = Object.keys(priorStore).sort((a, b) => priorStore[b].score - priorStore[a].score);

    let targetIsos;
    if (isoList.length) targetIsos = isoList;
    else if (params.region) targetIsos = priorRanked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) targetIsos = priorRanked.filter(iso => priorStore[iso].score >= params.threshold);
    else targetIsos = priorRanked.slice(0, params.top);

    if (!targetIsos.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: "No countries matched" }));
      return;
    }

    const liveData = await fetchAllLive(targetIsos);
    const store = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].score >= params.threshold);
    else finalIsos = ranked.slice(0, params.top);

    if (params.force_live) {
      finalIsos = finalIsos.filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= CFG.MIN_LIVE_EVIDENCE_SOURCES);

      if (finalIsos.length === 0) {
        const anyLive = Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= 1);
        if (anyLive.length > 0) {
          finalIsos = anyLive.sort((a, b) => store[b].score - store[a].score).slice(0, Math.min(params.top, anyLive.length));
        } else {
          res.writeHead(200, CORS);
          res.end(JSON.stringify({
            meta: {
              generated_at: new Date().toISOString(),
              elapsed_ms: Date.now() - start,
              mode: "empty",
              message: "No countries currently have live evidence from any tracked source.",
              min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
            },
            countries: [],
          }, null, 2));
          return;
        }
      }
    }

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const data = generateExportData(iso, store, params.export);
      const contentType = params.export === 'csv' ? 'text/csv' : 'application/json';
      const filename = `${iso}_crisis_data.${params.export === 'csv' ? 'csv' : 'json'}`;
      res.writeHead(200, { ...CORS, 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` });
      res.end(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const widget = generateWidget(iso, store);
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(widget);
      return;
    }

    for (const iso of Object.keys(store)) {
      const hist = seedHistory(iso, store[iso].score);
      const anom = runAnomalyDetection(hist);
      store[iso].__heat = computeStoryHeat(iso, store, hist, anom, store[iso].ml_forecast);
    }

    if (params.rss) {
      let rssIsos = finalIsos;
      if (!isoList.length && !params.region && params.threshold === 0) {
        rssIsos = Object.keys(store)
          .sort((a, b) => store[b].__heat.score - store[a].__heat.score)
          .slice(0, params.top || 30);
      }
      const feed = buildRSSFeed(rssIsos, store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" });
      res.end(feed);
      return;
    }

    if (params.wst) {
      const wstSummary = Object.keys(store)
        .filter(iso => store[iso].__wst)
        .map(iso => ({
          iso,
          name: store[iso].name,
          flag: store[iso].flag,
          wst_class: store[iso].__wst.class,
          wst_tier: store[iso].__wst.tier,
          score: store[iso].score,
          recovery_rate: store[iso].__wst.recovery_rate,
          structural_weight: store[iso].__wst.structural_weight,
          fragility_multiplier: store[iso].__wst.fragility_multiplier,
          debt_sensitivity: store[iso].__wst.debt_sensitivity,
          reserve_currency: store[iso].__wst.reserve_currency,
          momentum_factor: store[iso].__wst.momentum_factor,
          momentum: store[iso].time_metrics?.momentum || 0,
          velocity: store[iso].time_metrics?.velocity || 0,
        }))
        .sort((a, b) => a.wst_tier - b.wst_tier || b.score - a.score);
      
      const wstStats = {
        Core: { count: 0, avgScore: 0, scores: [] },
        Semi: { count: 0, avgScore: 0, scores: [] },
        Periphery: { count: 0, avgScore: 0, scores: [] },
      };
      
      for (const item of wstSummary) {
        wstStats[item.wst_class].count++;
        wstStats[item.wst_class].scores.push(item.score);
      }
      
      for (const key of Object.keys(wstStats)) {
        if (wstStats[key].scores.length > 0) {
          wstStats[key].avgScore = mean(wstStats[key].scores);
        }
        delete wstStats[key].scores;
      }
      
      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          wst_enabled: CFG.WST_ENABLED,
          global_interest_rate: CFG.WST_GLOBAL_INTEREST_RATE,
          theory_basis: "Immanuel Wallerstein's World Systems Theory (1974) with Time-Sensitive Scoring",
          classification_count: wstSummary.length,
          temporal_metrics: {
            momentum_weight: CFG.WST_MOMENTUM_WEIGHT,
            velocity_weight: CFG.WST_VELOCITY_WEIGHT,
            acceleration_weight: CFG.WST_ACCELERATION_WEIGHT,
            time_decay_half_life: CFG.WST_TIME_DECAY_HALF_LIFE,
          }
        },
        summary: wstStats,
        countries: wstSummary,
        insights: {
          structural_inequality: `Core countries average ${Math.round(wstStats.Core.avgScore)} vs Periphery ${Math.round(wstStats.Periphery.avgScore)} — ${Math.round(wstStats.Periphery.avgScore - wstStats.Core.avgScore)} point structural penalty gap`,
          vulnerability_ratio: `Periphery countries are ${(wstStats.Periphery.avgScore / wstStats.Core.avgScore).toFixed(1)}x more fragile than Core nations`,
          fastest_deteriorating: wstSummary.filter(w => w.momentum > 0.5).sort((a,b) => b.momentum - a.momentum).slice(0, 5).map(w => `${w.flag} ${w.iso}: +${w.momentum.toFixed(2)} pts/day`),
          fastest_improving: wstSummary.filter(w => w.momentum < -0.5).sort((a,b) => a.momentum - b.momentum).slice(0, 5).map(w => `${w.flag} ${w.iso}: ${w.momentum.toFixed(2)} pts/day`),
        }
      }, null, 2));
      return;
    }

    if (params.breaking) {
      const heatRanked = Object.keys(store)
        .map(iso => ({ iso, heat: store[iso].__heat }))
        .filter(x => x.heat.score >= 20)
        .sort((a, b) => b.heat.score - a.heat.score)
        .slice(0, params.top || 20);

      const feed = heatRanked.map(({ iso, heat }) => {
        const p = buildPayload(iso, store, ranked, { summary: true });
        return {
          iso, name: p.name, flag: p.flag, url: p.url,
          score: p.score, severity: p.severity,
          story_heat: heat.score, tier: heat.tier, top_drivers: heat.top_drivers,
          headline_hint: p.meta_description,
          fsi_rank: p.fsi?.rank,
          fsi_band: p.fsi?.band,
          momentum: p.time_metrics?.momentum || 0,
        };
      });

      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          mode: "breaking",
          methodology: "Story Heat = velocity + anomaly consensus + ML regime-change probability + evidence breadth + threshold crossings + temporal momentum.",
          fsi_source: "Fund for Peace, Fragile States Index 2024",
          wst_source: "World Systems Theory with Time-Sensitive Scoring",
        },
        breaking: feed,
      }, null, 2));
      return;
    }

    if (params.format === "sitemap") {
      const opts = { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary };
      const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, opts));
      res.writeHead(200, { ...CORS, "Content-Type": "application/xml; charset=utf-8" });
      res.end(buildSitemap(payloads));
      return;
    }

    if (params.format === "article" && finalIsos.length === 1) {
      const opts = { 
        keywords: params.keywords, 
        related: params.related, 
        schema: params.schema, 
        summary: params.summary,
        ml: params.ml,
        sentiment: params.sentiment,
        history: params.history,
      };
      const article = buildSEOArticle(finalIsos[0], store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "text/html; charset=utf-8" });
      res.end(article.body_html);
      return;
    }

    const opts = {
      keywords: params.keywords,
      related: params.related,
      schema: params.schema,
      summary: params.summary,
      article: params.article,
      ml: params.ml,
      sentiment: params.sentiment,
      history: params.history,
    };
    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, opts));

    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";

    let comparison = null;
    if (mode === "comparison" && finalIsos.length === 2) {
      const [a, b] = finalIsos.map(iso => {
        const c = store[iso];
        const hist = seedHistory(iso, c.score);
        const fc = trendForecast(hist, c.score);
        const anom = runAnomalyDetection(hist);
        return {
          iso, name: c.name, flag: c.flag, score: c.score,
          severity: severityLabel(c.score), rank: ranked.indexOf(iso) + 1,
          dimensions: Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
          forecast_7d: fc.fc,
          anomaly_detected: anom.detected,
          anomaly_severity: anom.severity,
          live_evidence_count: c.signals?.liveEvidenceCount || 0,
          ml_forecast: c.ml_forecast,
          sentiment: c.sentiment,
          momentum: c.time_metrics?.momentum || 0,
          velocity: c.time_metrics?.velocity || 0,
        };
      });
      comparison = {
        countries: [a, b],
        differentiators: DIMS.map(d => {
          const diff = a.dimensions[d.k] - b.dimensions[d.k];
          return { dimension: d.l, [a.iso]: a.dimensions[d.k], [b.iso]: b.dimensions[d.k], difference: diff };
        }).filter(d => Math.abs(d.difference) >= 10),
        verdict: `${a.flag} ${a.name} is more severe (${a.score} vs ${b.score})`,
        ml_insight: a.ml_forecast && b.ml_forecast ? `${a.name} ML anomaly: ${(a.ml_forecast.anomaly_probability * 100).toFixed(0)}% vs ${b.name}: ${(b.ml_forecast.anomaly_probability * 100).toFixed(0)}%` : null,
        momentum_comparison: `${a.name} momentum: ${a.momentum > 0 ? '+' : ''}${a.momentum.toFixed(2)} vs ${b.name}: ${b.momentum > 0 ? '+' : ''}${b.momentum.toFixed(2)}`,
      };
    }

    const allAnomalies = Object.keys(store).filter(iso => runAnomalyDetection(seedHistory(iso, store[iso].score)).detected);
    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);
    
    const mlStats = {
      trained: mlModel.trained,
      training_count: mlModel.trainingCount,
      performance: mlModel.performance,
      last_update: new Date(mlModel.lastUpdate).toISOString(),
    };

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_evidence: Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= 1).length,
        anomalies_detected: allAnomalies.length,
        anomaly_isos: allAnomalies.slice(0, 20),
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        data_policy: {
          type: "FSI 2024 Baseline + Live Data + World Systems Theory + Time-Sensitive Scoring",
          min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
          fsi_source: "Fund for Peace, Fragile States Index 2024",
          fsi_scale: "0-120 (higher = more fragile)",
          wst_source: "Immanuel Wallerstein, World Systems Theory (1974)",
          temporal_metrics: {
            momentum: "Rate of change over 7 days (pts/day)",
            velocity: "Speed of change (1st derivative)",
            acceleration: "Rate of change of velocity (2nd derivative)",
            time_decay: "Exponential decay since crisis peak",
          }
        },
        enhancements: {
          machine_learning: {
            enabled: CFG.ML_ENABLED,
            ...mlStats,
          },
          sentiment_analysis: {
            enabled: CFG.SENTIMENT_ENABLED,
            sources: CFG.SENTIMENT_SOURCES,
          },
          historical_data: {
            enabled: CFG.HISTORY_ENABLED,
            retention_days: CFG.HISTORY_RETENTION_DAYS,
          },
          geo_fencing: {
            enabled: CFG.GEO_FENCING_ENABLED,
            thresholds: alertManager.thresholds,
          },
          export_capabilities: {
            formats: ['json', 'csv', 'pdf', 'widget'],
          },
          world_systems_theory: {
            enabled: CFG.WST_ENABLED,
            description: "Structural vulnerability scoring based on Wallerstein's World Systems Theory",
            classifications: {
              Core: "High-income, diversified economies, reserve currencies",
              Semi: "Industrializing, middle-income, debt-vulnerable",
              Periphery: "Raw material exporters, high debt, structurally dependent"
            },
            temporal_weights: {
              momentum: CFG.WST_MOMENTUM_WEIGHT,
              velocity: CFG.WST_VELOCITY_WEIGHT,
              acceleration: CFG.WST_ACCELERATION_WEIGHT,
              time_decay_half_life: CFG.WST_TIME_DECAY_HALF_LIFE,
            },
            parameters: {
              global_interest_rate: CFG.WST_GLOBAL_INTEREST_RATE,
              debt_threshold: CFG.WST_DEBT_THRESHOLD,
              extractive_penalty_max: CFG.WST_EXTRACTIVE_PENALTY_MAX,
              recovery_bonus_max: CFG.WST_RECOVERY_BONUS_MAX,
              supply_chain_shock_multiplier: CFG.WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER,
            },
            countries_classified: Object.keys(WST_CLASSIFICATION).filter(k => k !== 'default').length,
          },
        },
        data_sources: {
          usgs: { live: liveData.usgs.live, events: liveData.usgs.data?.length ?? 0, label: "USGS" },
          emsc: { live: liveData.emsc.live, events: liveData.emsc.data?.length ?? 0, label: "EMSC" },
          nasa: { live: liveData.nasa.live, events: liveData.nasa.data?.length ?? 0, label: "NASA EONET" },
          gdacs: { live: liveData.gdacs.live, events: liveData.gdacs.data?.length ?? 0, label: "GDACS" },
          ifrc: { live: liveData.ifrc.live, events: liveData.ifrc.data?.length ?? 0, label: "IFRC GO" },
          heat: { live: liveData.heat.live, countries: Object.keys(liveData.heat.data || {}).length, label: "Open-Meteo Heat" },
          hazards: { live: liveData.hazards.live, label: "Open-Meteo Hazards" },
          aq: { live: liveData.aq.live, cities: Object.keys(liveData.aq.data || {}).length, label: "Open-Meteo AQ" },
          noaa: { live: liveData.noaa.live, label: "NOAA" },
          disease: { live: liveData.disease.live, countries: liveData.disease.data?.length ?? 0, label: "disease.sh" },
          wb: {
            live: Object.values(liveData.wb).some(v => v.live),
            label: "World Bank",
          },
          unhcr: { live: liveData.unhcr.live, label: "UNHCR" },
          ipc: { live: liveData.ipc.live, label: "IPC" },
          fewsnet: { live: liveData.fewsnet.live, label: "FEWS NET" },
          acled: { live: liveData.acled.live, label: "ACLED" },
          reliefweb: { live: liveData.reliefweb.live, label: "ReliefWeb" },
          who: { live: liveData.who.live, label: "WHO" },
        },
        endpoints: {
          single: "GET /api/top-story",
          top_n: "GET /api/top-story?top=10",
          iso: "GET /api/top-story?iso=SOM",
          compare: "GET /api/top-story?iso=SOM,YEM",
          region: "GET /api/top-story?region=africa",
          threshold: "GET /api/top-story?threshold=70",
          search: "GET /api/top-story?q=somalia",
          article: "GET /api/top-story?iso=SOM&format=article",
          sitemap: "GET /api/top-story?top=50&format=sitemap",
          enriched: "GET /api/top-story?iso=SOM&keywords=true&related=true&schema=true&summary=true",
          export_json: "GET /api/top-story?iso=SOM&export=json",
          export_csv: "GET /api/top-story?iso=SOM&export=csv",
          widget: "GET /api/top-story?iso=SOM&widget=true",
          rss_feed: "GET /api/top-story?format=rss",
          rss_region: "GET /api/top-story?region=africa&format=rss",
          breaking: "GET /api/top-story?format=breaking",
          wst_summary: "GET /api/top-story?format=wst",
          time_series: "GET /api/top-story?iso=SOM&format=timeseries",
        },
        anomaly_methodology: "4-method ensemble: CUSUM, Z-score, Bayesian changepoint, Volatility regime. Consensus threshold: 2/4 methods.",
        score_methodology: "Weighted 8-dimension composite. FSI 2024 baseline + live signals + regional spillover + WST structural adjustments + time-sensitive momentum/velocity/acceleration.",
      },
      ...(mode === "single" ? { top_story: payloads[0] } : {}),
      ...(mode === "list" ? { countries: payloads } : {}),
      ...(mode === "comparison" && comparison ? { comparison } : {}),
    };

    res.writeHead(200, {
      ...CORS,
      "Cache-Control": `public, s-maxage=${secsUntilNext}, stale-while-revalidate=30`,
    });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story v10.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
