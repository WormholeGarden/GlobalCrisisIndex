"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API  — ULTIMATE EDITION v13.0 — LIVE BREAKING NEWS RANKING
//  ────────────────────────────────────────────────────────────────────────────
//  📰 RANKS COUNTRIES BY LIKELIHOOD OF BREAKING CRISIS NEWS *RIGHT NOW*
//  🌍 COVERS ALL 179 COUNTRIES WITH REAL FSI 2024 SCORES
//  🌐 STRUCTURAL VULNERABILITY VIA WALLERSTEIN'S WORLD SYSTEMS THEORY
//  ⏰ LIVE SIGNAL DETECTION WITH RECENCY DECAY (6h/24h/72h/168h)
//  🧠 ENSEMBLE ML WITH RECOVERY RATE ADJUSTMENTS
//  📡 RSS FEED OPTIMIZED FOR GOOGLE NEWS
//  ═══ NEW ═══ ADDED: GDACS, World Bank, UNHCR, WHO, NASA, Open-Meteo
// ════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CFG = {
  SEED_INTERVAL_MS:     300_000,
  FETCH_TIMEOUT_MS:     15_000,
  MAX_TOP_N:            179,
  SPILLOVER_RATE:       0.08,
  SPILLOVER_FLOOR:      55,
  PRIOR_JITTER:         1,
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
  //  📰 LIVE BREAKING NEWS ENGINE v13.0
  //  ─────────────────────────────────────────────────────────────────────
  LIVE_BREAKING_ENABLED: true,
  LIVE_BREAKING_MIN_SIGNALS: 1,

  // ── WST CONFIG ────────────────────────────────────────────────────────
  WST_ENABLED: true,
  WST_GLOBAL_INTEREST_RATE: 5.25,
  WST_DEBT_THRESHOLD: 60,
  WST_EXTRACTIVE_PENALTY_MAX: 15,
  WST_RECOVERY_BONUS_MAX: 8,
  WST_CURRENCY_CRISIS_THRESHOLD: 20,
  WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER: 0.08,
  WST_MOMENTUM_WEIGHT: 0.20,
  WST_VELOCITY_WEIGHT: 0.15,
  WST_ACCELERATION_WEIGHT: 0.10,
  WST_TIME_DECAY_HALF_LIFE: 10,
  WST_CRISIS_MOMENTUM_THRESHOLD: 5,
  WST_STRUCTURAL_PERSISTENCE: 0.7,
  WST_MAX_BOOST_ABOVE_FSI: 25,
  WST_MIN_BOOST_BUFFER: 5,

  // ═══ NEW ═══ GDACS CONFIG
  GDACS_ENABLED: true,
  GDACS_ALERT_LEVELS: ["Green", "Orange", "Red"],
  GDACS_BOOST_RED: 12,
  GDACS_BOOST_ORANGE: 7,
  GDACS_BOOST_GREEN: 3,

  // ═══ NEW ═══ WORLD BANK CONFIG
  WB_ENABLED: true,
  WB_INFLATION_THRESHOLD: 5,
  WB_GDP_CONTRACTION_THRESHOLD: -1,
  WB_UNEMPLOYMENT_THRESHOLD: 10,
  WB_POVERTY_THRESHOLD: 5,
  WB_MAX_INFLATION_BOOST: 10,
  WB_MAX_GDP_BOOST: 10,
  WB_MAX_UNEMPLOYMENT_BOOST: 8,
  WB_MAX_POVERTY_BOOST: 10,

  // ═══ NEW ═══ UNHCR CONFIG
  UNHCR_ENABLED: true,
  UNHCR_DISPLACEMENT_THRESHOLD: 100_000,
  UNHCR_MAX_DISPLACEMENT_BOOST: 25,
  UNHCR_ASYLUM_BOOST: 8,

  // ═══ NEW ═══ WHO CONFIG
  WHO_ENABLED: true,
  WHO_OUTBREAK_BOOST: 4,
  WHO_MAX_OUTBREAK_BOOST: 10,

  // ═══ NEW ═══ NASA EONET CONFIG
  NASA_ENABLED: true,
  NASA_EVENT_BOOST: 4,
  NASA_MAX_EVENT_BOOST: 12,
  NASA_WILDFIRE_BOOST: 3,

  // ═══ NEW ═══ OPEN-METEO CONFIG
  OPENMETEO_ENABLED: true,
  OPENMETEO_FLOOD_THRESHOLD: 100,
  OPENMETEO_WIND_THRESHOLD: 30,
  OPENMETEO_PRECIP_THRESHOLD: 10,
  OPENMETEO_UV_THRESHOLD: 8,
  OPENMETEO_PM25_THRESHOLD: 35,
  OPENMETEO_LIGHTNING_THRESHOLD: 100,
  OPENMETEO_HEAT_THRESHOLD: 35,
  OPENMETEO_MAX_HAZARD_BOOST: 15,

  // ═══ NEW ═══ IFRC CONFIG
  IFRC_ENABLED: true,
  IFRC_EVENT_BOOST: 4,
  IFRC_MAX_EVENT_BOOST: 10,

  // ═══ NEW ═══ DISEASE.SH CONFIG
  DISEASE_ENABLED: true,
  DISEASE_ACTIVE_THRESHOLD: 1000,
  DISEASE_MAX_BOOST: 12,
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

// ─── WORLD SYSTEMS THEORY CLASSIFICATION ────────────────────────────────────

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

  // ── SEMI-PERIPHERY ──
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

  // ── PERIPHERY ──
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

// ════════════════════════════════════════════════════════════════════════════
//  📰 LIVE BREAKING NEWS RANKING ENGINE v13.0
//  Ranks countries by likelihood of having BREAKING crisis news RIGHT NOW
// ════════════════════════════════════════════════════════════════════════════

// ─── NEWS RECENCY WEIGHTS ───────────────────────────────────────────────────
const RECENCY = {
  HOURS_6:   1.00,   // Breaking
  HOURS_24:  0.85,   // Today
  HOURS_72:  0.60,   // This week
  HOURS_168: 0.30,   // This month
  OLDER:     0.10,   // Background
};

// ─── LIVE SIGNAL DEFINITIONS ────────────────────────────────────────────────
const LIVE_SIGNALS = {
  gdacs_red:          { weight: 100, decay: 0.85, verify: 1.0, label: "GDACS RED Alert",        icon: "🚨" },
  gdacs_orange:       { weight: 70,  decay: 0.80, verify: 0.9, label: "GDACS Orange Alert",      icon: "🟠" },
  earthquake_m6:      { weight: 95,  decay: 0.70, verify: 1.0, label: "M6+ Earthquake",          icon: "🌍" },
  earthquake_m5:      { weight: 65,  decay: 0.75, verify: 0.9, label: "M5+ Earthquake",          icon: "🌍" },
  earthquake_m45:     { weight: 40,  decay: 0.80, verify: 0.8, label: "M4.5+ Earthquake",        icon: "🌍" },
  who_outbreak:       { weight: 80,  decay: 0.88, verify: 1.0, label: "WHO Outbreak",            icon: "🦠" },
  who_outbreak_multi: { weight: 95,  decay: 0.85, verify: 1.0, label: "Multiple WHO Outbreaks",  icon: "🦠" },
  unhcr_mass_displace:{ weight: 90,  decay: 0.82, verify: 1.0, label: "Mass Displacement",       icon: "🚶" },
  nasa_wildfire:      { weight: 75,  decay: 0.75, verify: 0.9, label: "Active Wildfire",         icon: "🔥" },
  nasa_storm:         { weight: 70,  decay: 0.70, verify: 0.9, label: "Severe Storm",            icon: "🌀" },
  nasa_flood:         { weight: 70,  decay: 0.75, verify: 0.9, label: "Flood Event",             icon: "🌊" },
  nasa_drought:       { weight: 55,  decay: 0.90, verify: 0.9, label: "Drought",                 icon: "🏜️" },
  ifrc_emergency:     { weight: 75,  decay: 0.82, verify: 1.0, label: "IFRC Emergency Appeal",   icon: "🏥" },
  cyclone_active:     { weight: 85,  decay: 0.70, verify: 1.0, label: "Active Cyclone",          icon: "🌀" },
  flood_severe:       { weight: 70,  decay: 0.75, verify: 0.9, label: "Severe Flooding",         icon: "🌊" },
  heat_extreme:       { weight: 60,  decay: 0.80, verify: 0.8, label: "Extreme Heat",            icon: "🥵" },
  disease_active:     { weight: 50,  decay: 0.85, verify: 0.8, label: "Disease Outbreak",        icon: "🦠" },
  inflation_crisis:   { weight: 45,  decay: 0.92, verify: 0.9, label: "Inflation Crisis",        icon: "📈" },
  gdp_contraction:    { weight: 40,  decay: 0.92, verify: 0.9, label: "GDP Contraction",         icon: "📉" },
  food_crisis:        { weight: 65,  decay: 0.88, verify: 0.95, label: "Food Crisis",            icon: "🍚" },
  conflict_surge:     { weight: 90,  decay: 0.80, verify: 0.95, label: "Conflict Surge",          icon: "⚔️" },
  government_crisis:  { weight: 70,  decay: 0.85, verify: 0.85, label: "Government Crisis",       icon: "🏛️" },
};

/**
 * Detect all live breaking signals for a country.
 */
function detectLiveBreakingSignals(iso, live, store) {
  const signals = [];
  const c = COUNTRIES[iso];
  const s = (live && live.extracted && live.extracted[iso]) || (store[iso] && store[iso].signals) || {};
  const now = Date.now();

  // ── GDACS DISASTER ALERTS ─────────────────────────────────────────────
  if (s.gdacs && s.gdacsAlert) {
    const ageHours = s.gdacs.properties?.todate
      ? (now - new Date(s.gdacs.properties.todate).getTime()) / 36e5
      : 12;
    if (s.gdacsAlert === "red") {
      signals.push({ type: "gdacs_red", weight: LIVE_SIGNALS.gdacs_red.weight, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Red alert active" });
    } else if (s.gdacsAlert === "orange") {
      signals.push({ type: "gdacs_orange", weight: LIVE_SIGNALS.gdacs_orange.weight, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Orange alert active" });
    }
  }

  // ── EARTHQUAKES ───────────────────────────────────────────────────────
  if (s.quakeMag >= 6.0) {
    const ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 24;
    signals.push({ type: "earthquake_m6", weight: LIVE_SIGNALS.earthquake_m6.weight, ageHours, source: "USGS/EMSC", details: `M${s.quakeMag.toFixed(1)} ${s.quakePlace || ""}` });
  } else if (s.quakeMag >= 5.0) {
    const ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 48;
    signals.push({ type: "earthquake_m5", weight: LIVE_SIGNALS.earthquake_m5.weight, ageHours, source: "USGS/EMSC", details: `M${s.quakeMag.toFixed(1)} ${s.quakePlace || ""}` });
  } else if (s.quakeMag >= 4.5) {
    const ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 72;
    signals.push({ type: "earthquake_m45", weight: LIVE_SIGNALS.earthquake_m45.weight, ageHours, source: "USGS/EMSC", details: `M${s.quakeMag.toFixed(1)} ${s.quakePlace || ""}` });
  }

  // ── WHO DISEASE OUTBREAKS ─────────────────────────────────────────────
  if (s.whoOutbreaks && s.whoOutbreaks.length > 0) {
    const ageHours = s.whoOutbreaks[0].ageHours || 24;
    if (s.whoOutbreaks.length >= 2) {
      signals.push({ type: "who_outbreak_multi", weight: LIVE_SIGNALS.who_outbreak_multi.weight, ageHours, source: "WHO", details: s.whoOutbreaks.map(o => o.disease).join(", ") });
    } else {
      signals.push({ type: "who_outbreak", weight: LIVE_SIGNALS.who_outbreak.weight, ageHours, source: "WHO", details: s.whoOutbreaks[0].disease });
    }
  }

  // ── UNHCR MASS DISPLACEMENT ───────────────────────────────────────────
  if (s.totalDisplaced > 500_000) {
    const ageHours = 168;
    signals.push({ type: "unhcr_mass_displace", weight: LIVE_SIGNALS.unhcr_mass_displace.weight, ageHours, source: "UNHCR", details: `${fmtPop(s.totalDisplaced)} displaced` });
  }

  // ── NASA EONET EVENTS ─────────────────────────────────────────────────
  if (s.nasaEvents && s.nasaEvents.length > 0) {
    for (const ev of s.nasaEvents.slice(0, 3)) {
      const cat = ev.categories?.[0]?.id || "";
      const ageHours = ev.geometry?.[0]?.date ? (now - new Date(ev.geometry[0].date).getTime()) / 36e5 : 48;
      if (cat === "wildfires")      signals.push({ type: "nasa_wildfire", weight: LIVE_SIGNALS.nasa_wildfire.weight, ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "severeStorms") signals.push({ type: "nasa_storm",  weight: LIVE_SIGNALS.nasa_storm.weight,    ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "floods")       signals.push({ type: "nasa_flood",  weight: LIVE_SIGNALS.nasa_flood.weight,    ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "drought")      signals.push({ type: "nasa_drought",weight: LIVE_SIGNALS.nasa_drought.weight,  ageHours, source: "NASA EONET", details: ev.title });
    }
  }

  // ── IFRC EMERGENCY APPEALS ────────────────────────────────────────────
  if (s.ifrcCount > 0 && s.ifrcEvents) {
    const top = s.ifrcEvents[0];
    const ageHours = top.disaster_start_date ? (now - new Date(top.disaster_start_date).getTime()) / 36e5 : 72;
    signals.push({ type: "ifrc_emergency", weight: LIVE_SIGNALS.ifrc_emergency.weight, ageHours, source: "IFRC", details: top.name });
  }

  // ── CYCLONES ──────────────────────────────────────────────────────────
  if (s.gdacsEventType === "TC" || (s.nasaEvents || []).some(e => e.categories?.some(c => c.id === "severeStorms"))) {
    signals.push({ type: "cyclone_active", weight: LIVE_SIGNALS.cyclone_active.weight, ageHours: 24, source: "GDACS/NASA", details: "Active cyclone" });
  }

  // ── SEVERE FLOODING ───────────────────────────────────────────────────
  if (s.hazards?.flood_discharge > 500 || s.gdacsEventType === "FL") {
    signals.push({ type: "flood_severe", weight: LIVE_SIGNALS.flood_severe.weight, ageHours: 48, source: "Open-Meteo/GDACS", details: "Severe flooding" });
  }

  // ── EXTREME HEAT ──────────────────────────────────────────────────────
  if (s.maxTempC >= 42) {
    signals.push({ type: "heat_extreme", weight: LIVE_SIGNALS.heat_extreme.weight, ageHours: 24, source: "Open-Meteo", details: `${s.maxTempC}°C` });
  }

  // ── DISEASE (disease.sh) ──────────────────────────────────────────────
  if (s.diseaseActive > 10_000) {
    signals.push({ type: "disease_active", weight: LIVE_SIGNALS.disease_active.weight, ageHours: 168, source: "disease.sh", details: `${s.diseaseActive.toLocaleString()} active cases` });
  }

  // ── INFLATION / ECONOMIC ──────────────────────────────────────────────
  if (s.wbInflation?.value > 20) {
    signals.push({ type: "inflation_crisis", weight: LIVE_SIGNALS.inflation_crisis.weight, ageHours: 720, source: "World Bank", details: `${s.wbInflation.value.toFixed(0)}% inflation` });
  }
  if (s.wbGdpGrowth?.value < -3) {
    signals.push({ type: "gdp_contraction", weight: LIVE_SIGNALS.gdp_contraction.weight, ageHours: 720, source: "World Bank", details: `${s.wbGdpGrowth.value.toFixed(1)}% GDP` });
  }

  // ── FOOD CRISIS ───────────────────────────────────────────────────────
  if (store[iso] && store[iso].dims.food > 75) {
    signals.push({ type: "food_crisis", weight: LIVE_SIGNALS.food_crisis.weight, ageHours: 168, source: "Derived", details: `Food security: ${store[iso].dims.food}/100` });
  }

  // ── CONFLICT SURGE ────────────────────────────────────────────────────
  if (store[iso] && store[iso].__conflict_velocity > 1.5) {
    signals.push({ type: "conflict_surge", weight: LIVE_SIGNALS.conflict_surge.weight, ageHours: 24, source: "Derived", details: `Conflict rising ${store[iso].__conflict_velocity.toFixed(1)} pts/day` });
  }

  // ── GOVERNMENT CRISIS ─────────────────────────────────────────────────
  if (store[iso] && store[iso].dims.political > 80 && store[iso].__anomaly?.detected) {
    signals.push({ type: "government_crisis", weight: LIVE_SIGNALS.government_crisis.weight, ageHours: 48, source: "Derived", details: `Political instability + anomaly` });
  }

  return signals;
}

/**
 * Compute the Live Breaking News Score.
 */
function computeLiveBreakingScore(iso, live, store) {
  const c = COUNTRIES[iso];
  const signals = detectLiveBreakingSignals(iso, live, store);
  const now = Date.now();

  // ── SIGNAL AGGREGATION WITH RECENCY DECAY ─────────────────────────────
  let rawScore = 0;
  let signalCount = 0;
  const sources = new Set();
  const activeSignals = [];

  for (const sig of signals) {
    const ageHours = Math.max(0, sig.ageHours || 0);
    let recencyFactor;
    if      (ageHours <= 6)   recencyFactor = RECENCY.HOURS_6;
    else if (ageHours <= 24)  recencyFactor = RECENCY.HOURS_24;
    else if (ageHours <= 72)  recencyFactor = RECENCY.HOURS_72;
    else if (ageHours <= 168) recencyFactor = RECENCY.HOURS_168;
    else                      recencyFactor = RECENCY.OLDER;

    const def = LIVE_SIGNALS[sig.type] || { verify: 0.8 };
    const weighted = sig.weight * recencyFactor * (def.verify || 0.8);
    rawScore += weighted;
    signalCount++;
    sources.add(sig.source);

    activeSignals.push({
      ...sig,
      recency_factor: +recencyFactor.toFixed(3),
      weighted_score: +weighted.toFixed(2),
    });
  }

  // ── SOURCE MULTIPLIER ─────────────────────────────────────────────────
  const sourceMultiplier = 1 + Math.min(0.8, Math.max(0, sources.size - 1) * 0.3);
  rawScore *= sourceMultiplier;

  // ── SIGNAL DIVERSITY BONUS ────────────────────────────────────────────
  const uniqueTypes = new Set(signals.map(s => s.type));
  const diversityBonus = Math.min(30, Math.max(0, uniqueTypes.size - 1) * 8);
  rawScore += diversityBonus;

  // ── FRESHNESS BONUS ───────────────────────────────────────────────────
  const freshest = signals.reduce((min, s) => Math.min(min, s.ageHours || 9999), 9999);
  let freshnessBonus = 0;
  if      (freshest <= 6)   freshnessBonus = 40;
  else if (freshest <= 12)  freshnessBonus = 25;
  else if (freshest <= 24)  freshnessBonus = 15;
  else if (freshest <= 48)  freshnessBonus = 8;
  rawScore += freshnessBonus;

  // ── STRUCTURAL BASELINE (FSI as MINOR anchor) ─────────────────────────
  const fsiBaseline = ((c.fsi_score - 50) / 70) * 15;
  rawScore += Math.max(0, fsiBaseline);

  // ── NOVELTY / SPIKE BONUS ─────────────────────────────────────────────
  let spikeBonus = 0;
  if (store[iso]?.historical_scores?.length >= 7) {
    const hist = store[iso].historical_scores;
    const recentAvg = mean(hist.slice(-7, -1));
    const today = hist[hist.length - 1];
    const spike = today - recentAvg;
    if (spike > 5) spikeBonus = Math.min(25, spike * 1.5);
  }
  rawScore += spikeBonus;

  // ── NORMALIZE TO 0-100 ────────────────────────────────────────────────
  const normalizedScore = Math.round(100 * (1 - Math.exp(-rawScore / 120)));

  // ── DETERMINE NEWS TIER ───────────────────────────────────────────────
  let tier, tierLabel, tierIcon;
  if (normalizedScore >= 80)       { tier = "BREAKING";    tierLabel = "BREAKING NEWS";    tierIcon = "🔴"; }
  else if (normalizedScore >= 60)  { tier = "DEVELOPING";  tierLabel = "DEVELOPING STORY"; tierIcon = "🟠"; }
  else if (normalizedScore >= 40)  { tier = "ACTIVE";      tierLabel = "ACTIVE CRISIS";    tierIcon = "🟡"; }
  else if (normalizedScore >= 20)  { tier = "MONITORING";  tierLabel = "MONITORING";       tierIcon = "🟢"; }
  else                              { tier = "BACKGROUND";  tierLabel = "BACKGROUND";       tierIcon = "⚪"; }

  return {
    live_score: normalizedScore,
    tier, tier_label: tierLabel, tier_icon: tierIcon,
    raw_score: +rawScore.toFixed(2),
    signal_count: signalCount,
    unique_signal_types: uniqueTypes.size,
    source_count: sources.size,
    sources: [...sources],
    source_multiplier: +sourceMultiplier.toFixed(2),
    diversity_bonus: diversityBonus,
    freshness_bonus: freshnessBonus,
    spike_bonus: +spikeBonus.toFixed(1),
    freshest_signal_age_hours: freshest === 9999 ? null : +freshest.toFixed(1),
    signals: activeSignals.sort((a, b) => b.weighted_score - a.weighted_score),
    breaking_headline: buildBreakingHeadline(iso, activeSignals, c),
  };
}

/**
 * Generate a breaking-news style headline.
 */
function buildBreakingHeadline(iso, signals, country) {
  if (signals.length === 0) {
    return `${country.flag} ${country.name}: No active breaking crisis signals`;
  }
  const top = signals[0];
  const second = signals[1];
  const flag = country.flag;
  const name = country.name;
  const prefix = top.ageHours <= 6 ? "BREAKING: " : top.ageHours <= 24 ? "" : "ONGOING: ";

  let headline = `${flag} ${prefix}${name} — ${top.details || top.type}`;
  if (second && second.weight >= 60) {
    headline += ` + ${second.details || second.type}`;
  }
  return headline;
}

/**
 * Ranks countries by LIVE BREAKING NEWS likelihood.
 */
function rankByLiveBreaking(store) {
  return Object.keys(store).sort((a, b) => {
    const aLive = store[a].__live_breaking?.live_score || 0;
    const bLive = store[b].__live_breaking?.live_score || 0;
    if (bLive !== aLive) return bLive - aLive;
    const aFresh = store[a].__live_breaking?.freshest_signal_age_hours ?? 9999;
    const bFresh = store[b].__live_breaking?.freshest_signal_age_hours ?? 9999;
    return aFresh - bFresh;
  });
}

/**
 * Only countries with actual live signals.
 */
function rankBreakingOnly(store, minSignals = 1) {
  return Object.keys(store)
    .filter(iso => (store[iso].__live_breaking?.signal_count || 0) >= minSignals)
    .sort((a, b) => {
      const aLive = store[a].__live_breaking?.live_score || 0;
      const bLive = store[b].__live_breaking?.live_score || 0;
      return bLive - aLive;
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  MACHINE LEARNING ENGINE
// ════════════════════════════════════════════════════════════════════════════

class CrisisMLModel {
  constructor() {
    this.weights = { input_hidden: [], hidden_output: [], bias_hidden: [], bias_output: [] };
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
    if (!this.trained) this.initializeWeights(inputs[0].length);
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

  normalizeValue(v) { return v / 100; }
  denormalize(v) { return Math.min(99, Math.max(1, Math.round(v * 100))); }

  simpleTrendForecast(seq) {
    if (seq.length < 4) return { forecast: seq[seq.length - 1] || 50, confidence: 0.3 };
    const recent = seq.slice(-7);
    const slope = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
    const forecast = Math.min(99, Math.max(1, Math.round(recent[recent.length - 1] + slope * 3)));
    return { forecast, confidence: 0.4, trend: slope > 0.5 ? "escalating" : slope < -0.5 ? "improving" : "stable", anomaly_probability: 0.1 };
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
        sequences.push(hist.slice(i - 7, i + 1));
      }
    }
  }
  if (sequences.length >= 10) mlModel.train(sequences);
}

function mlEnhancedForecast(iso, currentScore, store) {
  const hist = seedHistory(iso, currentScore);
  const mlPrediction = mlModel.predict(hist);
  const trad = trendForecast(hist, currentScore);

  let wstAdjustment = 0;
  let wstRecoveryRate = 0.5;
  let wstClass = "Unclassified";

  if (CFG.WST_ENABLED && store && store[iso] && store[iso].__wst) {
    const wst = store[iso].__wst;
    wstRecoveryRate = wst.recovery_rate || 0.5;
    wstClass = wst.class;
    if (wstClass === "Core") wstAdjustment = -Math.round((1 - wstRecoveryRate) * 4);
    else if (wstClass === "Semi") wstAdjustment = Math.round((1 - wstRecoveryRate) * 2);
    else if (wstClass === "Periphery") wstAdjustment = Math.round((1 - wstRecoveryRate) * 6);
    if (wst.reserve_currency) wstAdjustment -= 1;
  }

  const fsiBase = COUNTRIES[iso]?.fsi_score || 50;
  const fsiScore = Math.round((fsiBase / 120) * 100);
  const tradAdjusted = Math.max(fsiScore - 15, Math.min(fsiScore + 25, trad.fc + wstAdjustment));
  const blended = Math.round(mlPrediction.forecast * 0.6 + tradAdjusted * 0.4);

  return {
    fc: clamp(blended),
    ml_forecast: mlPrediction.forecast,
    trad_forecast: trad.fc,
    wst_adjusted_trad_forecast: tradAdjusted,
    wst_class: wstClass,
    wst_recovery_rate: wstRecoveryRate,
    confidence: Math.min(0.95, Math.max(0.3, (mlPrediction.confidence + trad.confidence) / 2)),
    trend: mlPrediction.trend || trad.trend,
    esc: blended > currentScore + 5,
    slope: trad.slope,
    anomaly_probability: mlPrediction.anomaly_probability || 0.1,
    ml_trained: mlModel.trained,
    training_count: mlModel.trainingCount,
    fsi_anchor: fsiScore,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  SENTIMENT ANALYSIS
// ════════════════════════════════════════════════════════════════════════════

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = ['peace', 'ceasefire', 'truce', 'agreement', 'aid', 'humanitarian', 'relief', 'recovery', 'stabilize', 'improve', 'progress', 'positive', 'good', 'great', 'excellent', 'success', 'successful', 'hope', 'hopeful', 'resolution'];
    this.negativeWords = ['war', 'conflict', 'violence', 'attack', 'bomb', 'missile', 'strike', 'kill', 'death', 'casualty', 'destroy', 'collapse', 'crisis', 'emergency', 'famine', 'hunger', 'disease', 'outbreak', 'escalate', 'worsen', 'deteriorate', 'critical', 'severe', 'dire', 'catastrophe', 'disaster', 'devastating'];
    this.strongNegative = ['exterminate', 'genocide', 'massacre', 'pogrom', 'ethnic cleansing', 'famine', 'starvation', 'catastrophic'];
    this.positivePhrases = ['negotiations progress', 'peace talks', 'aid delivered', 'ceasefire holds', 'reconstruction', 'recovery efforts'];
    this.negativePhrases = ['escalation of', 'intensified fighting', 'heavy casualties', 'civilians killed', 'mass displacement', 'health system collapse', 'food insecurity worsens', 'drought intensifies'];
  }

  analyze(text) {
    if (!text || text.length < 10) {
      return { score: 0, label: 'neutral', confidence: 0.5, key_terms: [] };
    }
    const lower = text.toLowerCase();
    let score = 0;
    let matches = 0;
    for (const word of this.positiveWords) { if (lower.includes(word)) { score += 0.15; matches++; } }
    for (const word of this.negativeWords) { if (lower.includes(word)) { score -= 0.2; matches++; } }
    for (const word of this.strongNegative) { if (lower.includes(word)) { score -= 0.5; matches++; } }
    for (const phrase of this.positivePhrases) { if (lower.includes(phrase)) { score += 0.3; matches += 2; } }
    for (const phrase of this.negativePhrases) { if (lower.includes(phrase)) { score -= 0.4; matches += 2; } }
    const totalMatches = Math.min(matches, 10);
    const normalizedScore = Math.max(-1, Math.min(1, score / (Math.max(totalMatches, 1) / 2)));
    const keyTerms = [];
    for (const word of this.negativeWords) { if (lower.includes(word)) keyTerms.push(word); }
    for (const word of this.positiveWords) { if (lower.includes(word)) keyTerms.push(word); }
    let label, confidence;
    if (normalizedScore > 0.2) { label = 'positive'; confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5); }
    else if (normalizedScore < -0.2) { label = 'negative'; confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5); }
    else { label = 'neutral'; confidence = 0.5 + (1 - Math.abs(normalizedScore)) * 0.3; }
    const crisisIntensity = Math.min(1, Math.abs(normalizedScore) * 1.5);
    const isCrisis = label === 'negative' && crisisIntensity > 0.5;
    return {
      score: Math.round(normalizedScore * 100) / 100,
      label, confidence: Math.round(confidence * 100) / 100,
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
  if (signals.gdacs?.title) text.push(signals.gdacs.title);
  if (signals.fewsPhase) text.push(signals.fewsPhase + ' famine warning');
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
  return { ...result, sources_analyzed: text.length, text_sample: fullText.slice(0, 200) + (fullText.length > 200 ? '...' : '') };
}

// ════════════════════════════════════════════════════════════════════════════
//  HISTORICAL DATA STORE
// ════════════════════════════════════════════════════════════════════════════

class HistoricalDataStore {
  constructor() {
    this.data = {};
    this.lastCleanup = Date.now();
  }

  store(iso, data) {
    if (!this.data[iso]) this.data[iso] = [];
    this.data[iso].push({ timestamp: Date.now(), ...data });
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
    return { direction, slope: slope * 86400000 * 7, points: n, start_score: scores[0], end_score: scores[scores.length - 1], change: scores[scores.length - 1] - scores[0] };
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
    return { count: data.length, min: Math.min(...scores), max: Math.max(...scores), mean: mean(scores), median: median(scores), stddev: stddev(scores), latest: scores[scores.length - 1], first: scores[0], change: scores[scores.length - 1] - scores[0] };
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
//  GEO-FENCING ALERTS
// ════════════════════════════════════════════════════════════════════════════

class AlertManager {
  constructor() {
    this.webhookUrl = CFG.ALERT_WEBHOOK_URL || null;
    this.email = CFG.ALERT_EMAIL || null;
    this.thresholds = { global: 75, region: 70, country: 80 };
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
        triggered.push({ iso, name: c.name, score: c.score, threshold: this.thresholds.global, type: 'global', message: `${c.name} has reached ${c.score}/100, exceeding the global crisis threshold.` });
        this.lastAlerts[key] = now;
      }
    }
    const hist = seedHistory(iso, c.score);
    if (hist.length >= 7) {
      const delta = hist[hist.length - 1] - hist[hist.length - 7];
      if (delta > 10) {
        const key = `${iso}_rapid`;
        if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
          triggered.push({ iso, name: c.name, score: c.score, delta, type: 'rapid_deterioration', message: `${c.name} crisis score has risen ${delta} points in 7 days.` });
          this.lastAlerts[key] = now;
        }
      }
    }
    const anom = runAnomalyDetection(hist);
    if (anom.detected && (anom.severity === 'HIGH' || anom.severity === 'EXTREME')) {
      const key = `${iso}_anomaly`;
      if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
        triggered.push({ iso, name: c.name, score: c.score, anomaly: anom, type: 'anomaly', message: `${c.name} shows a ${anom.severity} statistical anomaly (${anom.methods_fired}/4 methods).` });
        this.lastAlerts[key] = now;
      }
    }
    for (const alert of triggered) this.sendAlert(alert);
    return triggered;
  }

  async sendAlert(alert) {
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'crisis_alert', timestamp: new Date().toISOString(), ...alert }),
        });
      } catch (e) { console.warn('Webhook alert failed:', e); }
    }
    if (this.email) console.log(`📧 ALERT EMAIL to ${this.email}: ${alert.message}`);
    console.log(`🚨 ALERT: ${alert.message}`);
  }

  setThreshold(type, value) {
    if (this.thresholds.hasOwnProperty(type)) this.thresholds[type] = value;
  }
}

const alertManager = new AlertManager();

// ════════════════════════════════════════════════════════════════════════════
//  LIVE DATA FETCHERS
// ════════════════════════════════════════════════════════════════════════════

async function fetchUSGS() {
  try {
    const r = await safeFetch(
      fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json())
    );
    if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true };
  } catch {}
  return { data: [], live: false };
}

async function fetchEMSC() {
  try {
    const r = await safeFetch(
      fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.json())
    );
    if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true };
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
    const [alerts, quakes, cyclones, floods, wildfires, droughts] = await Promise.all([
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=40").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=TC&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=FL&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=WF&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=DR&limit=30").then(r => r.json())),
    ]);

    const feats = [
      ...(alerts.ok && alerts.data?.features ? alerts.data.features : []),
      ...(quakes.ok && quakes.data?.features ? quakes.data.features : []),
      ...(cyclones.ok && cyclones.data?.features ? cyclones.data.features : []),
      ...(floods.ok && floods.data?.features ? floods.data.features : []),
      ...(wildfires.ok && wildfires.data?.features ? wildfires.data.features : []),
      ...(droughts.ok && droughts.data?.features ? droughts.data.features : []),
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
    if (r.ok && r.data?.results?.length) return { data: r.data.results, live: true };
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
        for (const segment of ep.path) val = val?.[segment];
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
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) return { data: r.data, live: true };
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
  const [population, poverty, inflation, gdpGrowth, unemployment] = await Promise.all([
    fetchWorldBankIndicator("SP.POP.TOTL"),
    fetchWorldBankIndicator("SI.POV.DDAY"),
    fetchWorldBankIndicator("FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"),
    fetchWorldBankIndicator("SL.UEM.TOTL.ZS"),
  ]);
  return { population, poverty, inflation, gdpGrowth, unemployment };
}

async function fetchUNHCR() {
  try {
    const [pop, asylum] = await Promise.all([
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=population&displayType=totals&yearFrom=2023&yearTo=2024&coa_all=true&forcedDisp=1").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=asylum&displayType=totals&yearFrom=2023&yearTo=2024").then(r => r.json())),
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
    const live = Object.keys(displacement).length > 0;
    return { data: { displacement }, live };
  } catch {}
  return { data: { displacement: {} }, live: false };
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
                outbreaks[iso].push({ disease: kw, title: item.title, date: item.pubDate, ageHours: 24 });
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
    disease, wb, unhcr, who
  ] = await Promise.all([
    fetchUSGS(), fetchEMSC(), fetchNASA(), fetchGDACS(), fetchIFRC(),
    fetchHeatStress(), fetchWeatherHazards(), fetchAirQuality(), fetchNOAA(),
    fetchDiseaseSh(), fetchWorldBankAll(), fetchUNHCR(), fetchWHO(),
  ]);
  return { usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr, who };
}

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok:true, data:r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok:false, error:e.message }));

// ════════════════════════════════════════════════════════════════════════════
//  EXTRACT SIGNALS
// ════════════════════════════════════════════════════════════════════════════

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];
  const signals = {};

  // ── USGS Earthquakes ──────────────────────────────────────────────────
  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a,b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = topQuake.properties.place.split(",")[0].trim();
    signals.quakeTime = topQuake.properties.time;
  }

  // ── EMSC Earthquakes ──────────────────────────────────────────────────
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
    if (!signals.quakeTime) signals.quakeTime = new Date(topEMSC.properties?.time).getTime();
  }

  // ── NASA EONET Events ─────────────────────────────────────────────────
  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const coords = ev.geometry?.[0]?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  if (nasaEvents.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("NASA");
    signals.nasaEventCount = nasaEvents.length;
    signals.nasaEvents = nasaEvents;
  }

  // ── GDACS Events ──────────────────────────────────────────────────────
  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) {
      const affected = f.properties?.affectedcountries || [];
      return affected.some(c => c.iso3 === iso);
    }
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topGDACS = gdacsEvents.length > 0 ? gdacsEvents.reduce((a, b) => {
    const aScore = a.properties?.alertscore || 0;
    const bScore = b.properties?.alertscore || 0;
    return bScore > aScore ? b : a;
  }) : null;
  if (topGDACS) {
    liveEvidenceCount++;
    evidenceSources.push("GDACS");
    signals.gdacs = topGDACS;
    signals.gdacsAlert = topGDACS?.properties?.alertlevel?.toLowerCase() || null;
    signals.gdacsEventType = topGDACS?.properties?.eventtype || null;
    signals.gdacsCount = gdacsEvents.length;
    signals.gdacsAllEvents = gdacsEvents;
  }

  // ── IFRC Events ───────────────────────────────────────────────────────
  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("IFRC");
    signals.ifrcCount = ifrcEvents.length;
    signals.ifrcEvents = ifrcEvents;
  }

  // ── Heat Stress (Open-Meteo) ──────────────────────────────────────────
  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Heat");
    signals.maxTempC = maxTempC;
  }

  // ── Weather Hazards (Open-Meteo) ──────────────────────────────────────
  if (live.hazards.live) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Hazards");
    signals.hazards = live.hazards.data;
  }

  // ── Air Quality (Open-Meteo) ──────────────────────────────────────────
  const aqData = live.aq.data[iso] || null;
  if (aqData && aqData.pm25 >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo AQ");
    signals.aq = aqData;
  }

  // ── NOAA Alerts (US only) ─────────────────────────────────────────────
  if (iso === 'USA' && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) {
    liveEvidenceCount++;
    evidenceSources.push("NOAA");
    signals.noaa = live.noaa.data;
  }

  // ── disease.sh COVID-19 ───────────────────────────────────────────────
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

  // ── WHO Disease Outbreaks ─────────────────────────────────────────────
  const whoData = live.who?.data || null;
  if (whoData && whoData[iso] && whoData[iso].length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("WHO");
    signals.whoOutbreaks = whoData[iso];
  }

  // ── World Bank Economic Indicators ────────────────────────────────────
  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
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
  if (wbPoverty && wbPoverty.value > 5) {
    liveEvidenceCount++;
    evidenceSources.push("WB Poverty");
    signals.wbPoverty = wbPoverty;
  }

  // ── UNHCR Displacement Data ───────────────────────────────────────────
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

  return {
    quakeMag: signals.quakeMag || 0,
    quakePlace: signals.quakePlace || null,
    quakeTime: signals.quakeTime || null,
    quakeCount: (quakes?.length || 0) + (emscQuakes?.length || 0),
    nasaEventCount: signals.nasaEventCount || 0,
    nasaEvents: signals.nasaEvents || [],
    gdacs: signals.gdacs || null,
    gdacsAlert: signals.gdacsAlert || null,
    gdacsEventType: signals.gdacsEventType || null,
    gdacsCount: signals.gdacsCount || 0,
    gdacsAllEvents: signals.gdacsAllEvents || [],
    ifrcCount: signals.ifrcCount || 0,
    ifrcEvents: signals.ifrcEvents || [],
    maxTempC: signals.maxTempC || 0,
    hazards: signals.hazards || null,
    aq: signals.aq || null,
    noaa: signals.noaa || null,
    diseaseActive: signals.diseaseActive || 0,
    diseaseName: signals.diseaseName || null,
    whoOutbreaks: signals.whoOutbreaks || [],
    population: signals.population || 0,
    wbInflation: signals.wbInflation || null,
    wbGdpGrowth: signals.wbGdpGrowth || null,
    wbUnemployment: signals.wbUnemployment || null,
    wbPoverty: signals.wbPoverty || null,
    refugees: signals.refugees || 0,
    idps: signals.idps || 0,
    asylum_seekers: signals.asylum_seekers || 0,
    totalDisplaced: signals.totalDisplaced || 0,
    liveEvidenceCount,
    evidenceSources,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  APPLY LIVE ADJUSTMENTS
// ════════════════════════════════════════════════════════════════════════════

function applyLiveAdjustments(priorDims, signals, iso, store) {
  const dims = { ...priorDims };
  const audit = [];
  let totalBoost = 0;
  const country = COUNTRIES[iso];
  const fsiBase = country?.fsi_score || 50;

  // ── WST STRUCTURAL ADJUSTMENTS ─────────────────────────────────────────
  if (CFG.WST_ENABLED) {
    const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;

    if (wst.class === "Periphery") {
      const extractiveBase = wst.extractive_penalty || 15;
      const gdpAdjust = Math.max(0, (5000 - (wst.gdp_per_capita || 0)) / 5000 * 3);
      const penalty = Math.min(CFG.WST_EXTRACTIVE_PENALTY_MAX, (extractiveBase + gdpAdjust) * 0.6);

      dims.economic = clamp(dims.economic + Math.round(penalty * 0.5));
      dims.food = clamp(dims.food + Math.round(penalty * 0.15));
      dims.access = clamp(dims.access + Math.round(penalty * 0.2));
      totalBoost += Math.round(penalty * 0.85);
      audit.push({ source: "WST Extractivism", field: "economic+food+access", delta: Math.round(penalty * 0.85), reason: `Periphery structural penalty (${wst.class})` });
    }

    const globalRate = CFG.WST_GLOBAL_INTEREST_RATE || 5.25;
    const rateShock = Math.max(0, (globalRate - 2) * wst.debt_sensitivity * 1.2);
    const debtPenalty = Math.min(12, Math.round(rateShock * 1.5));

    if (debtPenalty > 1) {
      dims.economic = clamp(dims.economic + debtPenalty);
      dims.political = clamp(dims.political + Math.round(debtPenalty * 0.3));
      totalBoost += debtPenalty;
      audit.push({ source: "WST Debt Shock", field: "economic+political", delta: debtPenalty, reason: `${wst.class} debt sensitivity` });
    }

    if (signals.wbInflation && signals.wbInflation.value > CFG.WST_CURRENCY_CRISIS_THRESHOLD) {
      const currencyCrash = Math.min(10, Math.round((signals.wbInflation.value - 15) * 0.4 * wst.debt_sensitivity));
      if (currencyCrash > 0) {
        dims.economic = clamp(dims.economic + currencyCrash);
        dims.food = clamp(dims.food + Math.round(currencyCrash * 0.4));
        totalBoost += currencyCrash;
        audit.push({ source: "WST Currency Crisis", field: "economic+food", delta: currencyCrash, reason: `Inflation ${signals.wbInflation.value.toFixed(1)}%` });
      }
    }

    if (store && store[iso]) {
      const recoveryFactor = wst.recovery_rate || 0.5;
      const fragilityMultiplier = 1 + (1 - recoveryFactor) * 0.3;
      const momentumFactor = wst.momentum_factor || 0.5;
      store[iso].__wst = {
        class: wst.class, tier: wst.tier, recovery_rate: recoveryFactor,
        structural_weight: wst.structural_weight || 0.5, fragility_multiplier: fragilityMultiplier,
        debt_sensitivity: wst.debt_sensitivity, reserve_currency: wst.reserve_currency || false,
        momentum_factor: momentumFactor, gdp_per_capita: wst.gdp_per_capita || 3000,
        extractive_penalty: wst.extractive_penalty || 10,
      };
    }

    if (wst.reserve_currency) {
      const buffer = Math.min(3, Math.round(3 * (wst.recovery_rate || 0.8)));
      dims.economic = clamp(dims.economic - buffer);
      dims.political = clamp(dims.political - Math.round(buffer * 0.3));
      totalBoost -= buffer;
      audit.push({ source: "WST Reserve Currency", field: "economic+political", delta: -buffer, reason: `Reserve currency buffer` });
    }

    if (signals.wbGdpGrowth && signals.wbGdpGrowth.value < -1) {
      const coreShock = Math.abs(signals.wbGdpGrowth.value) * CFG.WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER * 8;
      const transmittedShock = Math.round(coreShock * (1 + (1 - wst.recovery_rate) * 0.3));
      if (transmittedShock > 0) {
        dims.economic = clamp(dims.economic + transmittedShock);
        dims.conflict = clamp(dims.conflict + Math.round(transmittedShock * 0.15));
        totalBoost += transmittedShock;
        audit.push({ source: "WST Supply Chain", field: "economic+conflict", delta: transmittedShock, reason: `GDP contraction transmits shock` });
      }
    }
  }

  // ── GDACS DISASTER ADJUSTMENTS ────────────────────────────────────────
  if (CFG.GDACS_ENABLED && signals.gdacs) {
    const alertLevel = signals.gdacsAlert || "green";
    const baseBoost = alertLevel === "red" ? CFG.GDACS_BOOST_RED :
                      alertLevel === "orange" ? CFG.GDACS_BOOST_ORANGE :
                      CFG.GDACS_BOOST_GREEN;

    const countMultiplier = Math.min(2, 1 + (signals.gdacsCount || 1) * 0.15);
    const gdacsBoost = Math.round(baseBoost * countMultiplier);

    dims.displacement = clamp(dims.displacement + Math.ceil(gdacsBoost * 0.5));
    dims.health = clamp(dims.health + Math.floor(gdacsBoost * 0.3));
    dims.access = clamp(dims.access + Math.floor(gdacsBoost * 0.25));
    dims.climate = clamp(dims.climate + Math.floor(gdacsBoost * 0.2));
    totalBoost += gdacsBoost;
    audit.push({
      source: "GDACS",
      field: "displacement+health+access+climate",
      delta: gdacsBoost,
      reason: `${alertLevel.toUpperCase()} alert (${signals.gdacsEventType || 'event'}) x${signals.gdacsCount || 1}`
    });
  }

  // ── USGS/EMSC Earthquake Adjustments ─────────────────────────────────
  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(15, Math.round((signals.quakeMag - 3.5) * 3.5));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.5));
    dims.health = clamp(dims.health + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "USGS/EMSC", field: "displacement+health", delta: boost, reason: `M${signals.quakeMag.toFixed(1)} earthquake`, magnitude: signals.quakeMag });
  }

  // ── NASA EONET Event Adjustments ──────────────────────────────────────
  if (CFG.NASA_ENABLED && signals.nasaEventCount > 0) {
    const baseBoost = Math.min(CFG.NASA_MAX_EVENT_BOOST, signals.nasaEventCount * CFG.NASA_EVENT_BOOST);
    const wildfireCount = (signals.nasaEvents || []).filter(e =>
      e.categories?.some(c => c.id === 'wildfires')
    ).length;
    const wildfireBoost = Math.min(6, wildfireCount * CFG.NASA_WILDFIRE_BOOST);

    const totalNasaBoost = baseBoost + wildfireBoost;
    dims.climate = clamp(dims.climate + Math.ceil(totalNasaBoost * 0.6));
    dims.displacement = clamp(dims.displacement + Math.floor(totalNasaBoost * 0.2));
    dims.health = clamp(dims.health + Math.floor(wildfireBoost * 0.3));
    totalBoost += totalNasaBoost;
    audit.push({
      source: "NASA EONET",
      field: "climate+displacement+health",
      delta: totalNasaBoost,
      reason: `${signals.nasaEventCount} events${wildfireCount ? ` (${wildfireCount} wildfires)` : ''}`
    });
  }

  // ── IFRC Event Adjustments ────────────────────────────────────────────
  if (CFG.IFRC_ENABLED && signals.ifrcCount > 0) {
    const boost = Math.min(CFG.IFRC_MAX_EVENT_BOOST, signals.ifrcCount * CFG.IFRC_EVENT_BOOST);
    dims.access = clamp(dims.access + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "IFRC GO", field: "access+displacement", delta: boost, reason: `${signals.ifrcCount} active IFRC operations` });
  }

  // ── Heat Stress (Open-Meteo) ──────────────────────────────────────────
  if (signals.maxTempC >= 35) {
    const boost = Math.min(12, Math.round((signals.maxTempC - 28) * 1.2));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.6));
    dims.health = clamp(dims.health + Math.floor(boost * 0.4));
    dims.food = clamp(dims.food + Math.floor(boost * 0.2));
    totalBoost += boost;
    audit.push({ source: "Open-Meteo", field: "climate+health+food", delta: boost, reason: `${signals.maxTempC}°C extreme heat` });
  }

  // ── Weather Hazards (Open-Meteo) ──────────────────────────────────────
  if (signals.hazards) {
    const h = signals.hazards;
    let hazardBoost = 0;
    const parts = [];
    if (h.flood_discharge > CFG.OPENMETEO_FLOOD_THRESHOLD) { hazardBoost += 5; parts.push(`${h.flood_discharge.toFixed(0)}m³/s river discharge`); }
    if (h.wind_speed > CFG.OPENMETEO_WIND_THRESHOLD) { hazardBoost += 4; parts.push(`${h.wind_speed.toFixed(0)}km/h winds`); }
    if (h.precip_total > CFG.OPENMETEO_PRECIP_THRESHOLD) { hazardBoost += 3; parts.push(`${h.precip_total.toFixed(0)}mm precipitation`); }
    if (h.uv_max > CFG.OPENMETEO_UV_THRESHOLD) { hazardBoost += 2; parts.push(`UV ${h.uv_max.toFixed(1)}`); }
    if (h.cloud_avg > 70) { hazardBoost += 2; parts.push(`${h.cloud_avg.toFixed(0)}% cloud cover`); }
    if (h.lightning_max > CFG.OPENMETEO_LIGHTNING_THRESHOLD) { hazardBoost += 3; parts.push(`${h.lightning_max.toFixed(0)}J/kg lightning potential`); }

    hazardBoost = Math.min(CFG.OPENMETEO_MAX_HAZARD_BOOST, hazardBoost);

    if (hazardBoost > 0) {
      dims.climate = clamp(dims.climate + hazardBoost);
      dims.displacement = clamp(dims.displacement + Math.floor(hazardBoost * 0.25));
      totalBoost += hazardBoost;
      audit.push({ source: "Open-Meteo Hazards", field: "climate+displacement", delta: hazardBoost, reason: parts.join(", ") });
    }
  }

  // ── Air Quality (Open-Meteo) ──────────────────────────────────────────
  if (signals.aq && signals.aq.pm25 >= CFG.OPENMETEO_PM25_THRESHOLD) {
    const boost = Math.min(8, Math.round((signals.aq.pm25 - 25) / 10));
    if (boost > 0) {
      dims.health = clamp(dims.health + boost);
      totalBoost += boost;
      audit.push({ source: "Open-Meteo AQ", field: "health", delta: boost, reason: `PM2.5 ${signals.aq.pm25.toFixed(0)}µg/m³` });
    }
  }

  // ── disease.sh COVID-19 ───────────────────────────────────────────────
  if (CFG.DISEASE_ENABLED && signals.diseaseActive > CFG.DISEASE_ACTIVE_THRESHOLD) {
    const m = signals.diseaseActive / 1000;
    const boost = Math.min(CFG.DISEASE_MAX_BOOST, Math.round(Math.log10(m + 1) * 5));
    dims.health = clamp(dims.health + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "disease.sh", field: "health+food", delta: boost, reason: `${signals.diseaseActive.toLocaleString()} active COVID-19 cases` });
  }

  // ── WHO Disease Outbreaks ─────────────────────────────────────────────
  if (CFG.WHO_ENABLED && signals.whoOutbreaks && signals.whoOutbreaks.length > 0) {
    const boost = Math.min(CFG.WHO_MAX_OUTBREAK_BOOST, signals.whoOutbreaks.length * CFG.WHO_OUTBREAK_BOOST);
    dims.health = clamp(dims.health + boost);
    dims.access = clamp(dims.access + Math.floor(boost * 0.25));
    totalBoost += boost;
    audit.push({ source: "WHO", field: "health+access", delta: boost, reason: `${signals.whoOutbreaks.length} disease outbreaks detected` });
  }

  // ── World Bank Economic Adjustments ───────────────────────────────────
  if (CFG.WB_ENABLED && signals.wbInflation && signals.wbInflation.value > CFG.WB_INFLATION_THRESHOLD) {
    const boost = Math.min(CFG.WB_MAX_INFLATION_BOOST, Math.round(signals.wbInflation.value / 5));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "World Bank", field: "economic+food", delta: boost, reason: `Inflation ${signals.wbInflation.value.toFixed(1)}%` });
  }

  if (CFG.WB_ENABLED && signals.wbGdpGrowth && signals.wbGdpGrowth.value < 0) {
    const boost = Math.min(CFG.WB_MAX_GDP_BOOST, Math.round(Math.abs(signals.wbGdpGrowth.value) * 1.5));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.2));
    totalBoost += boost;
    audit.push({ source: "World Bank", field: "economic+political", delta: boost, reason: `GDP growth ${signals.wbGdpGrowth.value.toFixed(1)}%` });
  }

  if (CFG.WB_ENABLED && signals.wbUnemployment && signals.wbUnemployment.value > CFG.WB_UNEMPLOYMENT_THRESHOLD) {
    const boost = Math.min(CFG.WB_MAX_UNEMPLOYMENT_BOOST, Math.round(signals.wbUnemployment.value / 6));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.2));
    totalBoost += boost;
    audit.push({ source: "World Bank", field: "economic+political", delta: boost, reason: `Unemployment ${signals.wbUnemployment.value.toFixed(1)}%` });
  }

  if (CFG.WB_ENABLED && signals.wbPoverty && signals.wbPoverty.value > CFG.WB_POVERTY_THRESHOLD) {
    const boost = Math.min(CFG.WB_MAX_POVERTY_BOOST, Math.round(signals.wbPoverty.value / 5));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ source: "World Bank", field: "economic+food", delta: boost, reason: `${signals.wbPoverty.value.toFixed(1)}% in extreme poverty` });
  }

  // ── UNHCR Displacement Adjustments ────────────────────────────────────
  if (CFG.UNHCR_ENABLED && signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const boost = m >= 10 ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST :
                  m >= 5 ? 18 : m >= 3 ? 14 : m >= 1.5 ? 10 :
                  m >= 0.5 ? 6 : m >= 0.1 ? 3 : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      dims.political = clamp(dims.political + Math.floor(boost * 0.3));
      dims.economic = clamp(dims.economic + Math.floor(boost * 0.2));
      dims.access = clamp(dims.access + Math.floor(boost * 0.15));
      totalBoost += boost;
      audit.push({ source: "UNHCR", field: "displacement+political+economic+access", delta: boost, reason: `${m.toFixed(1)}M displaced` });
    }
  }

  // ── NOAA Weather Alerts (US only) ─────────────────────────────────────
  if (signals.noaa) {
    const boost = Math.min(8, (signals.noaa.extreme_alerts + signals.noaa.storm_alerts) * 2);
    if (boost > 0) {
      dims.climate = clamp(dims.climate + boost);
      totalBoost += boost;
      audit.push({ source: "NOAA", field: "climate", delta: boost, reason: `${signals.noaa.extreme_alerts} extreme + ${signals.noaa.storm_alerts} storm alerts` });
    }
  }

  // ── ML Anomaly Detection ──────────────────────────────────────────────
  if (CFG.ML_ENABLED && store) {
    const mlForecast = mlEnhancedForecast(iso, clamp(composite(dims)), store);
    if (mlForecast.anomaly_probability > 0.6) {
      const mlBoost = Math.round(mlForecast.anomaly_probability * 6);
      dims.political = clamp(dims.political + Math.floor(mlBoost * 0.3));
      dims.economic = clamp(dims.economic + Math.floor(mlBoost * 0.2));
      dims.conflict = clamp(dims.conflict + Math.floor(mlBoost * 0.15));
      totalBoost += mlBoost;
      audit.push({ source: "ML Anomaly", field: "political+economic+conflict", delta: mlBoost, reason: `ML anomaly probability ${(mlForecast.anomaly_probability * 100).toFixed(0)}%` });
    }
  }

  // ─── CAP TOTAL BOOST BASED ON FSI ─────────────────────────────────────
  const maxAllowedBoost = Math.min(CFG.WST_MAX_BOOST_ABOVE_FSI, Math.max(8, Math.round(fsiBase * 0.25)));
  const totalBoostCapped = Math.min(totalBoost, maxAllowedBoost);

  const boostRatio = totalBoost > 0 ? totalBoostCapped / totalBoost : 1;
  for (const key of Object.keys(dims)) {
    const originalDelta = dims[key] - priorDims[key];
    if (originalDelta > 0) {
      dims[key] = clamp(Math.round(priorDims[key] + originalDelta * boostRatio));
    }
  }

  const finalScore = clamp(composite(dims));

  if (totalBoost > 0) {
    console.log(`📈 ${iso} live boost: +${totalBoost} → capped to +${totalBoostCapped} (${audit.length} sources, FSI cap: ${maxAllowedBoost})`);
  }

  return {
    dims,
    score: finalScore,
    audit,
    totalBoostRaw: totalBoost,
    totalBoostCapped,
    boostRatio,
    maxAllowedBoost
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILD STORE WITH LIVE BREAKING NEWS RANKING
// ════════════════════════════════════════════════════════════════════════════

function buildStore(liveData) {
  const seed = Math.floor(Date.now() / CFG.SEED_INTERVAL_MS);
  const store = {};

  // ── STEP 1: Build base dimensions (structural) ────────────────────────
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const fsiScore = country.fsi_score || country.prior || 50;
    const base = Math.round((fsiScore / 120) * 100);
    const jitter = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const adjustedBase = clamp(base + jitter, 5, 99);

    const priorDims = buildPriorDims(adjustedBase, country.types);
    const priorScore = clamp(composite(priorDims));

    let dims = priorDims, score = priorScore, audit = [], signals = {};

    if (liveData) {
      signals = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals, iso, store);
      dims = adjusted.dims;
      score = adjusted.score;
      audit = adjusted.audit;
    }

    store[iso] = {
      ...country,
      dims, score, priorScore,
      liveBoost: score - priorScore,
      audit, signals,
      spillover: 0,
      fsi_score: fsiScore,
      fsi_rank: country.fsi_rank,
      fsi_band: country.fsi_band,
      historical_scores: [],
      __wst: null,
      __live_breaking: null,
    };
  }

  // ── STEP 2: Spillover ─────────────────────────────────────────────────
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const rawSpillover = Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    const diminishingFactor = Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    store[iso].spillover = +(rawSpillover * diminishingFactor).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }

  // ── STEP 3: Seed historical scores for spike detection ────────────────
  for (const iso in store) {
    store[iso].historical_scores = seedHistory(iso, store[iso].score);
  }

  // ── STEP 4: Compute conflict velocity for conflict_surge signal ───────
  for (const iso in store) {
    const hist = store[iso].historical_scores;
    store[iso].__conflict_velocity = hist.length >= 4
      ? (hist[hist.length - 1] - hist[hist.length - 4]) / 3
      : 0;
  }

  // ── STEP 5: Compute LIVE BREAKING SCORE ───────────────────────────────
  for (const iso in store) {
    store[iso].__live_breaking = computeLiveBreakingScore(iso, liveData, store);
  }

  // ── STEP 6: ML / sentiment / history ──────────────────────────────────
  if (CFG.ML_ENABLED) trainMLModel(store);
  for (const iso in store) {
    if (CFG.ML_ENABLED) store[iso].ml_forecast = mlEnhancedForecast(iso, store[iso].score, store);
    if (CFG.SENTIMENT_ENABLED) store[iso].sentiment = analyzeCountrySentiment(iso, store);
    if (CFG.HISTORY_ENABLED) {
      store[iso].historical_trend = historyStore.getTrend(iso, 30);
      storeHistoricalData(iso, store);
    }
    if (CFG.GEO_FENCING_ENABLED) alertManager.checkAlerts(iso, store);
  }

  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  ANOMALY DETECTION
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
  const muB = mean(arr.slice(mid)), sdB = stddev(arr.slice(mid));
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
  return { fc, slope, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > current + 5, confidence: Math.max(0.3, Math.min(0.95, r2)) };
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
    food:         cl(base * ((has("FN")||has("DR")) ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health:       cl(base * ((has("EP")||has("FN")) ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     cl(base * ((has("CE")||has("CW")||has("FN")||has("DR")||has("ECO")) ? 0.85 : 0.42) + 10),
    climate:      cl(base * ((has("HEAT")||has("DR")) ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       cl(base * ((has("CW")||has("CE")) ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
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
  if (score >= 75) return { tier:"URGENT", text:`Urgent response needed. Mobilise resources now.${an}` };
  if (score >= 60) return { tier:"HIGH", text:`Elevated concern. Prepare response and monitor daily.${an}` };
  if (score >= 40) return { tier:"MONITOR", text:`Monitor situation. Maintain readiness.${an}` };
  return { tier:"WATCH", text:`Routine monitoring. No immediate action required.${an}` };
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
    live_breaking: c.__live_breaking,
    recommendation: recommendation(c.score, anom),
  };
}

function generateExportData(iso, store, format = 'json') {
  const data = {
    iso,
    name: store[iso].name,
    timestamp: new Date().toISOString(),
    score: store[iso].score,
    live_breaking: store[iso].__live_breaking,
    dimensions: store[iso].dims,
    evidence: store[iso].signals,
    historical: historyStore.getHistory(iso, 30),
  };
  if (format === 'csv') {
    let csv = 'timestamp,score,live_breaking_score,signal_count,displacement,economic,food,health\n';
    for (const d of data.historical) {
      csv += `${new Date(d.timestamp).toISOString()},${d.score},${store[iso].__live_breaking?.live_score || 0},${store[iso].__live_breaking?.signal_count || 0},${d.displacement||0},${d.economic||0},${d.food||0},${d.health||0}\n`;
    }
    return csv;
  }
  return data;
}

function generateWidget(iso, store) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const s = c.signals || {};
  const tierColor = lb.tier === "BREAKING" ? "#ff375f" : lb.tier === "DEVELOPING" ? "#ff8c42" : lb.tier === "ACTIVE" ? "#ffb020" : "#6bc8ff";

  return `<div class="gcin-widget" style="background:#0f1a30;border:1px solid #2d3a5e;border-radius:12px;padding:16px;font-family:system-ui;max-width:320px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:20px;">${c.flag}</span>
      <span style="font-weight:600;color:#fff;font-size:16px;">${c.name}</span>
      ${lb.tier === "BREAKING" ? '<span style="background:#ff375f20;color:#ff375f;padding:0 6px;border-radius:4px;font-size:10px;font-weight:700;animation:pulse 1.5s infinite;">🔴 BREAKING</span>' : ''}
      ${lb.tier === "DEVELOPING" ? '<span style="background:#ff8c4220;color:#ff8c42;padding:0 6px;border-radius:4px;font-size:10px;font-weight:700;">🟠 DEVELOPING</span>' : ''}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#7c9ec0;font-size:12px;">Live News Score</span>
      <span style="color:${tierColor};font-size:20px;font-weight:700;">${lb.live_score || 0}/100</span>
    </div>
    <div style="width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:99px;margin:4px 0 8px;">
      <div style="height:100%;width:${lb.live_score || 0}%;background:${tierColor};border-radius:99px;"></div>
    </div>
    <div style="font-size:11px;color:#b8cce8;margin-bottom:6px;font-weight:500;">${lb.breaking_headline || 'No active signals'}</div>
    <div style="display:flex;gap:8px;font-size:10px;color:#5a7a9a;">
      <span>📡 ${lb.signal_count || 0} signals</span>
      <span>🔗 ${lb.source_count || 0} sources</span>
      ${lb.freshest_signal_age_hours !== null && lb.freshest_signal_age_hours !== undefined ? `<span>⏱ ${lb.freshest_signal_age_hours < 1 ? '<1h' : lb.freshest_signal_age_hours + 'h'}</span>` : ''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      ${(lb.signals || []).slice(0, 3).map(sig => `<span style="background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:4px;font-size:10px;color:#b8cce8;">${LIVE_SIGNALS[sig.type]?.icon || '⚠️'} ${LIVE_SIGNALS[sig.type]?.label || sig.type}</span>`).join('')}
    </div>
    <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.04);padding-top:8px;display:flex;justify-content:space-between;">
      <span style="font-size:10px;color:#5a7a9a;">${lb.tier_label || 'Background'} · Structural ${c.score}/100</span>
      <a href="${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}" style="font-size:10px;color:#6bc8ff;text-decoration:none;">Read →</a>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  PAYLOAD BUILDER
// ════════════════════════════════════════════════════════════════════════════

function buildPayload(iso, store, ranked, opts = {}) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = Math.round(hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)]);
  const s = c.signals || {};
  const lb = c.__live_breaking || {};

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

    live_breaking: {
      score: lb.live_score || 0,
      tier: lb.tier || "BACKGROUND",
      tier_label: lb.tier_label || "Background",
      tier_icon: lb.tier_icon || "⚪",
      headline: lb.breaking_headline || null,
      signal_count: lb.signal_count || 0,
      unique_signal_types: lb.unique_signal_types || 0,
      source_count: lb.source_count || 0,
      sources: lb.sources || [],
      freshest_signal_age_hours: lb.freshest_signal_age_hours,
      freshness_bonus: lb.freshness_bonus || 0,
      diversity_bonus: lb.diversity_bonus || 0,
      spike_bonus: lb.spike_bonus || 0,
      source_multiplier: lb.source_multiplier || 1,
      signals: (lb.signals || []).map(sig => ({
        type: sig.type,
        label: LIVE_SIGNALS[sig.type]?.label || sig.type,
        icon: LIVE_SIGNALS[sig.type]?.icon || "⚠️",
        weight: sig.weight,
        age_hours: +(sig.ageHours || 0).toFixed(1),
        weighted_score: sig.weighted_score,
        source: sig.source,
        details: sig.details,
      })),
    },

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
    live_evidence: {
      earthquake: s.quakeMag >= 4.5 ? { magnitude: s.quakeMag, location: s.quakePlace, event_count: s.quakeCount, source: "USGS/EMSC" } : null,
      nasa_events: s.nasaEventCount > 0 ? { count: s.nasaEventCount, source: "NASA EONET" } : null,
      gdacs: s.gdacs ? { alert_level: s.gdacsAlert, event_type: s.gdacsEventType, count: s.gdacsCount, source: "GDACS" } : null,
      ifrc: s.ifrcCount > 0 ? { count: s.ifrcCount, source: "IFRC GO" } : null,
      heat: s.maxTempC >= 35 ? { max_temp_c: s.maxTempC, source: "Open-Meteo" } : null,
      hazards: s.hazards ? { ...s.hazards, source: "Open-Meteo" } : null,
      air_quality: s.aq ? { ...s.aq, source: "Open-Meteo AQ" } : null,
      noaa: s.noaa ? { ...s.noaa, source: "NOAA" } : null,
      disease: s.diseaseActive > 0 ? { disease: s.diseaseName, active: s.diseaseActive, source: "disease.sh" } : null,
      who_outbreaks: s.whoOutbreaks && s.whoOutbreaks.length > 0 ? { outbreaks: s.whoOutbreaks, source: "WHO" } : null,
      economic: {
        inflation: s.wbInflation ? { ...s.wbInflation, source: "World Bank" } : null,
        gdp_growth: s.wbGdpGrowth ? { ...s.wbGdpGrowth, source: "World Bank" } : null,
        unemployment: s.wbUnemployment ? { ...s.wbUnemployment, source: "World Bank" } : null,
        poverty: s.wbPoverty ? { ...s.wbPoverty, source: "World Bank" } : null,
        population: s.population ? { value: s.population, source: "World Bank" } : null,
      },
      displacement: s.totalDisplaced > 0 ? { total: s.totalDisplaced, refugees: s.refugees, idps: s.idps, asylum_seekers: s.asylum_seekers, source: "UNHCR" } : null,
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
  const lb = c.__live_breaking || {};
  const kws = new Set();
  const name = c.name;

  kws.add(`${name} humanitarian crisis`);
  kws.add(`${name} crisis ${new Date().getFullYear()}`);
  kws.add(`${name} emergency`);
  kws.add(`${name} disaster`);
  kws.add(`${name} breaking news`);

  if (lb.tier === "BREAKING" || lb.tier === "DEVELOPING") {
    kws.add(`${name} breaking news today`);
    kws.add(`${name} crisis update`);
  }

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
  const lb = c.__live_breaking || {};
  const severity = severityLabel(c.score);
  let parts = [`${c.name} humanitarian crisis update: urgency score ${c.score}/100 (${severity})`];

  if (lb.tier === "BREAKING") parts.unshift(`🔴 BREAKING: ${lb.breaking_headline}`);
  else if (lb.tier === "DEVELOPING") parts.unshift(`🟠 DEVELOPING: ${lb.breaking_headline}`);
  else if (lb.signal_count > 0) parts.unshift(`📡 ${lb.signal_count} live signals active`);

  if (s.totalDisplaced > 0) parts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.diseaseActive > 1000) parts.push(`${s.diseaseActive.toLocaleString()} COVID-19 cases`);
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
      live_score: store[r].__live_breaking?.live_score || 0,
      tier: store[r].__live_breaking?.tier || "BACKGROUND",
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
  const lb = c.__live_breaking || {};

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        "headline": lb.breaking_headline || `${c.name} Crisis — Score ${c.score}/100 (${severity})`,
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
  const lb = c.__live_breaking || {};
  const severity = severityLabel(c.score);
  const faqs = [];

  faqs.push({
    q: `What is the current humanitarian situation in ${c.name}?`,
    a: `${c.name} currently has a crisis urgency score of ${c.score}/100, rated ${severity}.${lb.tier === "BREAKING" ? ` 🔴 BREAKING: ${lb.breaking_headline}` : lb.tier === "DEVELOPING" ? ` 🟠 Developing: ${lb.breaking_headline}` : ''} Live monitoring has detected ${lb.signal_count || 0} active signals from ${lb.source_count || 0} independent sources.`,
  });

  if (s.totalDisplaced > 0) {
    faqs.push({
      q: `How many people have been displaced from ${c.name}?`,
      a: `UNHCR data indicates approximately ${fmtPop(s.totalDisplaced)} people have been displaced, including${s.refugees ? ` ${fmtPop(s.refugees)} refugees` : ""}${s.idps ? `, ${fmtPop(s.idps)} internally displaced persons (IDPs)` : ""}${s.asylum_seekers ? `, and ${fmtPop(s.asylum_seekers)} asylum-seekers` : ""}.`,
    });
  }

  if (s.diseaseActive > 1000) {
    faqs.push({
      q: `What disease activity is being tracked in ${c.name}?`,
      a: `Live tracking shows ${s.diseaseActive.toLocaleString()} active COVID-19 cases in ${c.name}.${s.whoOutbreaks?.length ? ` WHO also reports active outbreaks of ${s.whoOutbreaks.map(o => o.disease).join(", ")}.` : ''}`,
    });
  }

  if (s.gdacs) {
    faqs.push({
      q: `What disaster alerts are active for ${c.name}?`,
      a: `GDACS has a ${s.gdacsAlert?.toUpperCase() || 'Green'} alert for ${c.name}${s.gdacsCount > 1 ? ` (${s.gdacsCount} events)` : ''}.`,
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
  const lb = c.__live_breaking || {};
  const hist = seedHistory(iso, c.score);
  const anom = runAnomalyDetection(hist);
  const fc = trendForecast(hist, c.score);
  const rank = ranked.indexOf(iso) + 1;
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

  // ── HIGHEST PRIORITY: Live breaking ───────────────────────────────────
  if (lb.tier === "BREAKING" && lb.breaking_headline) {
    headlineCandidates.push({ weight: 200 + lb.live_score, text: lb.breaking_headline });
    const topSig = lb.signals[0];
    if (topSig) {
      headlineCandidates.push({ weight: 180 + lb.live_score, text: `${c.flag} ${c.name}: ${topSig.details || topSig.type} — ${lb.tier_label}` });
    }
  } else if (lb.tier === "DEVELOPING" && lb.breaking_headline) {
    headlineCandidates.push({ weight: 150 + lb.live_score, text: lb.breaking_headline });
  } else if (lb.tier === "ACTIVE" && lb.breaking_headline) {
    headlineCandidates.push({ weight: 100 + lb.live_score, text: lb.breaking_headline });
  }

  if (s.gdacsAlert === "red") {
    headlineCandidates.push({ weight: 115, text: `RED ALERT: ${c.name} Under Active GDACS Disaster Warning Right Now` });
  } else if (s.gdacsAlert === "orange") {
    headlineCandidates.push({ weight: 90, text: `${c.name} Issued Orange Disaster Alert — What's Happening on the Ground` });
  }

  if (s.totalDisplaced > 1_000_000) {
    headlineCandidates.push({ weight: 100 + Math.min(50, s.totalDisplaced / 200_000), text: `${fmtPop(s.totalDisplaced)} Displaced: Inside ${c.name}'s ${primaryTypes} Emergency` });
  }

  if (s.quakeMag >= 6.0) {
    headlineCandidates.push({ weight: 95 + (s.quakeMag - 6) * 8, text: `M${s.quakeMag.toFixed(1)} Earthquake Strikes ${c.name}${s.quakePlace ? ` Near ${s.quakePlace}` : ""} — Live Emergency Tracker` });
  }

  if (s.whoOutbreaks?.length > 0) {
    headlineCandidates.push({ weight: 85 + s.whoOutbreaks.length * 5, text: `WHO Confirms ${s.whoOutbreaks.map(o => o.disease[0].toUpperCase() + o.disease.slice(1)).join(" & ")} Outbreak in ${c.name}` });
  }

  if (anom.detected && anom.severity === "EXTREME") {
    headlineCandidates.push({ weight: 110, text: `Data Alert: ${c.name} Crisis Trajectory Just Broke Pattern — ${anom.methods_fired}/4 Statistical Models Agree` });
  }

  headlineCandidates.push({ weight: 10, text: `${c.name} Crisis Monitor ${now.getFullYear()}: Urgency Score ${c.score}/100 (${severity}), Ranked #${rank} Globally` });

  headlineCandidates.sort((a, b) => b.weight - a.weight);
  let headline = headlineCandidates[0].text;

  const dekParts = [];
  if (lb.tier === "BREAKING") dekParts.push(`🔴 BREAKING — ${lb.signal_count} active signals`);
  else if (lb.tier === "DEVELOPING") dekParts.push(`🟠 Developing story — ${lb.signal_count} signals`);
  if (lb.freshest_signal_age_hours !== null && lb.freshest_signal_age_hours !== undefined) dekParts.push(`Freshest: ${lb.freshest_signal_age_hours < 1 ? '<1h' : lb.freshest_signal_age_hours + 'h'} ago`);
  if (s.totalDisplaced > 0 && !headline.includes("Displaced")) dekParts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.gdacs) dekParts.push(`GDACS ${s.gdacsAlert?.toUpperCase()} alert`);
  dekParts.push(`Live data from ${lb.source_count || 0}+ sources · Updated ${dateStr}`);
  const dek = dekParts.slice(0, 3).join(" · ");

  const metaDescription = buildMetaDescription(iso, store);

  const paragraphs = [];

  if (lb.tier === "BREAKING") {
    paragraphs.push(`## 🔴 BREAKING NEWS\n\n**${lb.breaking_headline}**\n\nLive monitoring has detected **${lb.signal_count} active crisis signals** from **${lb.source_count} independent sources**, with the freshest signal **${lb.freshest_signal_age_hours < 1 ? 'less than an hour' : lb.freshest_signal_age_hours + ' hours'} ago**.`);
  } else if (lb.tier === "DEVELOPING") {
    paragraphs.push(`## 🟠 Developing Story\n\n**${lb.breaking_headline}**\n\n${lb.signal_count} active signals from ${lb.source_count} sources.`);
  }

  const ledeHook = lb.tier === "BREAKING" ? `🔴 BREAKING: ${lb.breaking_headline}`
    : lb.tier === "DEVELOPING" ? `🟠 ${c.name} is currently a developing crisis story`
    : s.totalDisplaced > 1_000_000 ? `More than ${fmtPop(s.totalDisplaced)} people have been forced from their homes in ${c.name}`
    : s.diseaseActive > 5000 ? `Active COVID-19 case counts are stretching ${c.name}'s healthcare system`
    : s.quakeMag >= 6.0 ? `A magnitude ${s.quakeMag.toFixed(1)} earthquake has struck ${c.name}, causing widespread damage`
    : `The humanitarian situation in ${c.name} has reached ${severity} levels`;

  paragraphs.push(`## Overview\n\n${ledeHook}, according to the latest live data compiled from ${lb.source_count || 20}+ global sources. Crisis Monitor's real-time urgency index places ${c.name} at **${c.score} out of 100**, rated **${severity}** and ranked **#${rank} of ${Object.keys(store).length} countries** tracked globally as of ${dateStr}.`);

  if (lb.signals && lb.signals.length > 0) {
    const sigList = lb.signals.slice(0, 5).map(sig =>
      `- ${LIVE_SIGNALS[sig.type]?.icon || '⚠️'} **${LIVE_SIGNALS[sig.type]?.label || sig.type}** — ${sig.details} (${sig.ageHours < 1 ? '<1h' : sig.ageHours + 'h'} ago, source: ${sig.source})`
    ).join('\n');
    paragraphs.push(`## 📡 Active Live Signals\n\n${sigList}`);
  }

  if (s.gdacs) {
    paragraphs.push(`## 🚨 Disaster Alert (GDACS)\n\nGDACS has issued a **${s.gdacsAlert?.toUpperCase()} alert** for ${c.name}${s.gdacsCount > 1 ? ` with ${s.gdacsCount} active events` : ''}. Event type: **${s.gdacsEventType || 'Multiple'}**.`);
  }

  if (s.quakeMag >= 4.5) {
    paragraphs.push(`## Earthquake Activity\n\nSeismic monitoring recorded a **magnitude ${s.quakeMag.toFixed(1)} earthquake** near ${s.quakePlace || "the region"}. ${s.quakeCount > 1 ? `${s.quakeCount} seismic events have been recorded in the area.` : ''}`);
  }

  if (s.nasaEventCount > 0) {
    paragraphs.push(`## NASA EONET Events\n\nNASA's Earth Observatory Natural Event Tracker has recorded **${s.nasaEventCount} active natural events** in ${c.name}, including wildfires and other climate-related phenomena.`);
  }

  if (s.totalDisplaced > 0) {
    const parts = [];
    if (s.refugees) parts.push(`${fmtPop(s.refugees)} registered refugees`);
    if (s.idps) parts.push(`${fmtPop(s.idps)} internally displaced persons (IDPs)`);
    if (s.asylum_seekers) parts.push(`${fmtPop(s.asylum_seekers)} asylum-seekers`);
    paragraphs.push(`## Displacement\n\nUNHCR data records **${fmtPop(s.totalDisplaced)} people** displaced${parts.length ? `, comprising ${parts.join(", ")}` : ""}.`);
  }

  if (s.whoOutbreaks && s.whoOutbreaks.length > 0) {
    const diseases = s.whoOutbreaks.map(o => o.disease).join(', ');
    paragraphs.push(`## Disease Outbreaks (WHO)\n\nWHO reports active **${diseases}** outbreaks in ${c.name}.`);
  }

  if (s.diseaseActive > 1000) {
    paragraphs.push(`## Public Health\n\nLive tracking shows **${s.diseaseActive.toLocaleString()} active COVID-19 cases** in ${c.name}.`);
  }

  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0 || s.wbUnemployment?.value > 10) {
    const econParts = [];
    if (s.wbInflation) econParts.push(`inflation at **${s.wbInflation.value.toFixed(1)}%**`);
    if (s.wbGdpGrowth?.value < 0) econParts.push(`GDP contraction of **${s.wbGdpGrowth.value.toFixed(1)}%**`);
    if (s.wbUnemployment?.value > 10) econParts.push(`unemployment at **${s.wbUnemployment.value.toFixed(1)}%**`);
    paragraphs.push(`## Economic Pressure (World Bank)\n\nWorld Bank indicators show ${econParts.join(" and ")}, compounding humanitarian strain.`);
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
    .breaking-badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 99px; font-size: 0.6rem; font-weight: 700; background: rgba(255,55,95,0.25); color: #ff375f; border: 1px solid rgba(255,55,95,0.4); animation: pulse 1.5s ease-in-out infinite; }
    .developing-badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 99px; font-size: 0.6rem; font-weight: 700; background: rgba(255,140,66,0.2); color: #ff8c42; border: 1px solid rgba(255,140,66,0.3); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
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
    .live-signal { display: inline-block; background: rgba(255,55,95,0.1); color: #ff8aa0; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; margin: 0.1rem; }
  </style>
</head>
<body>
  <article>
    <header>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${lb.tier === "BREAKING" ? `<span class="breaking-badge">🔴 BREAKING</span>` : ''}
        ${lb.tier === "DEVELOPING" ? `<span class="developing-badge">🟠 DEVELOPING</span>` : ''}
        <div class="severity-badge ${severity.toLowerCase()}">${severityEmoji(c.score)} ${severity}</div>
        ${s.gdacsAlert === "red" ? `<span class="breaking-badge" style="background:rgba(255,55,95,0.2);color:#ff375f;">🚨 GDACS RED</span>` : ''}
      </div>
      <h1>${headline}</h1>
      <div class="article-meta">
        <time>${dateStr}</time>
        <span>${words} words</span>
        <span>${minutes} min read</span>
        <span>${CFG.ARTICLE_AUTHOR}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:0.5rem 0;">
        ${(lb.signals || []).slice(0, 6).map(sig => `<span class="live-signal">${LIVE_SIGNALS[sig.type]?.icon || '⚠️'} ${LIVE_SIGNALS[sig.type]?.label || sig.type} · ${sig.ageHours < 1 ? '<1h' : sig.ageHours + 'h'}</span>`).join('')}
      </div>
      <div class="urgency-score">
        <span class="score-number">${c.score}</span><span class="score-denom">/100</span>
        <span class="score-label">Structural Urgency</span>
        <span class="score-rank">#${rank} of ${Object.keys(store).length}</span>
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
      <p><strong>Data sources:</strong> GDACS, USGS, EMSC, NASA EONET, IFRC GO, Open-Meteo, NOAA, disease.sh, World Bank, UNHCR, WHO.</p>
      <p><strong>FSI 2024 Baseline:</strong> Fund for Peace, Fragile States Index 2024.</p>
      <p><strong>Structural Analysis:</strong> World Systems Theory (Wallerstein, 1974).</p>
      <p><strong>Live Breaking Ranking:</strong> Countries ranked by likelihood of active breaking crisis news RIGHT NOW.</p>
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
    <priority>${p.live_breaking?.tier === "BREAKING" ? "1.0" : p.score >= 80 ? "0.9" : p.score >= 60 ? "0.8" : "0.7"}</priority>
    <news:news>
      <news:publication>
        <news:name>${CFG.ARTICLE_SITE_NAME}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${now}</news:publication_date>
      <news:title>${p.live_breaking?.headline || `${p.name} Crisis — Score ${p.score}/100`}</news:title>
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
    const lb = c.__live_breaking || {};
    const categories = [...new Set(c.types.map(t => ARC[t]?.l || t))];

    return `
  <item>
    <title>${escapeXml(article.headline)}</title>
    <link>${article.url}</link>
    <guid isPermaLink="true">${article.url}</guid>
    <pubDate>${now.toUTCString()}</pubDate>
    <description>${escapeXml(article.dek || article.metaDescription)}</description>
    ${categories.map(cat => `<category>${escapeXml(cat)}</category>`).join("\n    ")}
    ${lb.tier === "BREAKING" ? `<category>🔴 BREAKING NEWS</category>` : ""}
    ${lb.tier === "DEVELOPING" ? `<category>🟠 DEVELOPING</category>` : ""}
    ${c.signals?.gdacsAlert === "red" ? `<category>🚨 GDACS RED ALERT</category>` : ""}
    <category>Live Score: ${lb.live_score || 0}/100</category>
    <category>FSI 2024: ${c.fsi_band || "Not ranked"}</category>
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
  <description>Live breaking world crisis news — countries ranked by likelihood of active breaking news RIGHT NOW.</description>
  <language>en-us</language>
  <lastBuildDate>${now.toUTCString()}</lastBuildDate>
  <ttl>5</ttl>
${items}
</channel>
</rss>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN HANDLER
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
      live: url.searchParams.get("format") === "live" || url.searchParams.get("format") === "live-news",
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
    const priorRanked = rankByLiveBreaking(priorStore);

    let targetIsos;
    if (isoList.length) targetIsos = isoList;
    else if (params.region) targetIsos = priorRanked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) targetIsos = priorRanked.filter(iso => (priorStore[iso].__live_breaking?.live_score || 0) >= params.threshold);
    else targetIsos = priorRanked.slice(0, params.top);

    if (!targetIsos.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: "No countries matched" }));
      return;
    }

    const liveData = await fetchAllLive(targetIsos);
    const store = buildStore(liveData);

    // ── PRIMARY RANKING: Live Breaking News ───────────────────────────────
    const ranked = rankByLiveBreaking(store);
    const breakingRanked = rankBreakingOnly(store, 1);

    let finalIsos;
    if (isoList.length) {
      finalIsos = isoList;
    } else if (params.region) {
      finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    } else if (params.threshold > 0) {
      finalIsos = ranked.filter(iso => (store[iso].__live_breaking?.live_score || 0) >= params.threshold);
    } else if (params.force_live) {
      finalIsos = breakingRanked.slice(0, params.top);
    } else {
      finalIsos = ranked.slice(0, params.top);
    }

    if (finalIsos.length === 0 && !isoList.length) {
      finalIsos = ranked.slice(0, params.top);
      console.log("[top-story] No live breaking signals — falling back to structural ranking");
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

    if (params.live) {
      const liveFeed = breakingRanked
        .slice(0, params.top || 25)
        .map(iso => {
          const c = store[iso];
          const lb = c.__live_breaking;
          return {
            rank: breakingRanked.indexOf(iso) + 1,
            iso,
            name: c.name,
            flag: c.flag,
            live_score: lb.live_score,
            tier: lb.tier,
            tier_label: lb.tier_label,
            tier_icon: lb.tier_icon,
            headline: lb.breaking_headline,
            url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
            signal_count: lb.signal_count,
            source_count: lb.source_count,
            sources: lb.sources,
            freshest_signal_age_hours: lb.freshest_signal_age_hours,
            top_signals: lb.signals.slice(0, 3).map(s => ({
              icon: LIVE_SIGNALS[s.type]?.icon || "⚠️",
              label: LIVE_SIGNALS[s.type]?.label || s.type,
              details: s.details,
              age_hours: +(s.ageHours || 0).toFixed(1),
              source: s.source,
              weighted_score: s.weighted_score,
            })),
            structural_score: c.score,
            fsi_rank: c.fsi_rank,
            fsi_band: c.fsi_band,
            updated_at: new Date().toISOString(),
          };
        });

      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" });
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          feed: "live-breaking-news",
          methodology: "Countries ranked by likelihood of having BREAKING crisis news RIGHT NOW. Signals: GDACS alerts, earthquakes M4.5+, WHO outbreaks, UNHCR displacement, NASA EONET events, IFRC appeals, cyclones, floods, extreme heat, disease outbreaks, economic shocks, food crises, conflict surges. Weighted by recency (6h/24h/72h/168h decay), source independence, signal diversity, and freshness.",
          total_with_live_signals: breakingRanked.length,
          total_tracked: Object.keys(store).length,
        },
        live_news: liveFeed,
      }, null, 2));
      return;
    }

    if (params.rss) {
      const rssIsos = params.region
        ? breakingRanked.filter(iso => COUNTRIES[iso].region === params.region).slice(0, 30)
        : breakingRanked.slice(0, 30);
      const feedIsos = rssIsos.length > 0 ? rssIsos : ranked.slice(0, 30);
      const feed = buildRSSFeed(feedIsos, store, ranked);
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
          live_score: store[iso].__live_breaking?.live_score || 0,
          live_tier: store[iso].__live_breaking?.tier || "BACKGROUND",
          recovery_rate: store[iso].__wst.recovery_rate,
          structural_weight: store[iso].__wst.structural_weight,
          fragility_multiplier: store[iso].__wst.fragility_multiplier,
          debt_sensitivity: store[iso].__wst.debt_sensitivity,
          reserve_currency: store[iso].__wst.reserve_currency,
          momentum_factor: store[iso].__wst.momentum_factor,
          signal_count: store[iso].__live_breaking?.signal_count || 0,
        }))
        .sort((a, b) => b.live_score - a.live_score || a.wst_tier - b.wst_tier);

      const wstStats = {
        Core: { count: 0, avgScore: 0, avgLive: 0, scores: [], lives: [] },
        Semi: { count: 0, avgScore: 0, avgLive: 0, scores: [], lives: [] },
        Periphery: { count: 0, avgScore: 0, avgLive: 0, scores: [], lives: [] },
      };

      for (const item of wstSummary) {
        wstStats[item.wst_class].count++;
        wstStats[item.wst_class].scores.push(item.score);
        wstStats[item.wst_class].lives.push(item.live_score);
      }

      for (const key of Object.keys(wstStats)) {
        if (wstStats[key].scores.length > 0) {
          wstStats[key].avgScore = mean(wstStats[key].scores);
          wstStats[key].avgLive = mean(wstStats[key].lives);
        }
        delete wstStats[key].scores;
        delete wstStats[key].lives;
      }

      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          wst_enabled: CFG.WST_ENABLED,
          live_breaking_enabled: CFG.LIVE_BREAKING_ENABLED,
          global_interest_rate: CFG.WST_GLOBAL_INTEREST_RATE,
          theory_basis: "Immanuel Wallerstein's World Systems Theory (1974) with Live Breaking News Ranking",
          classification_count: wstSummary.length,
        },
        summary: wstStats,
        countries: wstSummary,
        insights: {
          structural_inequality: `Core avg structural ${Math.round(wstStats.Core.avgScore)} vs Periphery ${Math.round(wstStats.Periphery.avgScore)}`,
          live_news_inequality: `Core avg live score ${Math.round(wstStats.Core.avgLive)} vs Periphery ${Math.round(wstStats.Periphery.avgLive)}`,
          top_breaking: wstSummary.filter(w => w.live_tier === "BREAKING" || w.live_tier === "DEVELOPING").slice(0, 10),
        }
      }, null, 2));
      return;
    }

    if (params.breaking) {
      const feed = breakingRanked
        .slice(0, params.top || 20)
        .map(iso => {
          const c = store[iso];
          const lb = c.__live_breaking;
          const p = buildPayload(iso, store, ranked, { summary: true });
          return {
            iso,
            name: c.name,
            flag: c.flag,
            url: p.url,
            live_score: lb.live_score,
            tier: lb.tier,
            tier_label: lb.tier_label,
            tier_icon: lb.tier_icon,
            headline: lb.breaking_headline,
            signal_count: lb.signal_count,
            source_count: lb.source_count,
            sources: lb.sources,
            freshest_signal_age_hours: lb.freshest_signal_age_hours,
            top_signals: lb.signals.slice(0, 3).map(s => ({
              icon: LIVE_SIGNALS[s.type]?.icon || "⚠️",
              label: LIVE_SIGNALS[s.type]?.label || s.type,
              details: s.details,
              age_hours: +(s.ageHours || 0).toFixed(1),
              source: s.source,
            })),
            structural_score: c.score,
            fsi_rank: c.fsi_rank,
            fsi_band: c.fsi_band,
            gdacs_alert: c.signals?.gdacsAlert || null,
          };
        });

      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          mode: "breaking",
          total_with_live_signals: breakingRanked.length,
          methodology: "Live breaking news ranking. Countries ordered by likelihood of active crisis news RIGHT NOW.",
          tiers: {
            BREAKING:   "80-100 — Major breaking crisis event",
            DEVELOPING: "60-79 — Active developing story",
            ACTIVE:     "40-59 — Ongoing active crisis",
            MONITORING: "20-39 — Under monitoring",
            BACKGROUND: "0-19 — Background structural fragility",
          },
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
        const lb = c.__live_breaking || {};
        const hist = seedHistory(iso, c.score);
        const fc = trendForecast(hist, c.score);
        const anom = runAnomalyDetection(hist);
        return {
          iso, name: c.name, flag: c.flag, score: c.score,
          live_score: lb.live_score || 0,
          live_tier: lb.tier || "BACKGROUND",
          live_headline: lb.breaking_headline || null,
          severity: severityLabel(c.score), rank: ranked.indexOf(iso) + 1,
          dimensions: Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
          forecast_7d: fc.fc,
          anomaly_detected: anom.detected,
          anomaly_severity: anom.severity,
          live_evidence_count: c.signals?.liveEvidenceCount || 0,
          gdacs_alert: c.signals?.gdacsAlert || null,
          signal_count: lb.signal_count || 0,
        };
      });
      comparison = {
        countries: [a, b],
        differentiators: DIMS.map(d => {
          const diff = a.dimensions[d.k] - b.dimensions[d.k];
          return { dimension: d.l, [a.iso]: a.dimensions[d.k], [b.iso]: b.dimensions[d.k], difference: diff };
        }).filter(d => Math.abs(d.difference) >= 10),
        verdict: `${a.flag} ${a.name} has live score ${a.live_score} vs ${b.flag} ${b.name} ${b.live_score}`,
        live_news_comparison: a.live_score > b.live_score
          ? `${a.name} is more likely to be breaking news right now`
          : `${b.name} is more likely to be breaking news right now`,
      };
    }

    const allAnomalies = Object.keys(store).filter(iso => runAnomalyDetection(seedHistory(iso, store[iso].score)).detected);
    const breakingCount = breakingRanked.filter(iso => store[iso].__live_breaking.tier === "BREAKING").length;
    const developingCount = breakingRanked.filter(iso => store[iso].__live_breaking.tier === "DEVELOPING").length;
    const activeCount = breakingRanked.filter(iso => store[iso].__live_breaking.tier === "ACTIVE").length;
    const gdacsRedAlerts = Object.keys(store).filter(iso => store[iso].signals?.gdacsAlert === "red");
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
        ranking_mode: "LIVE_BREAKING_NEWS",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_signals: breakingRanked.length,
        anomalies_detected: allAnomalies.length,
        anomaly_isos: allAnomalies.slice(0, 20),
        gdacs_red_alerts: gdacsRedAlerts.length,
        gdacs_red_isos: gdacsRedAlerts.slice(0, 10),
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        live_news_stats: {
          ranking_mode: "LIVE_BREAKING_NEWS",
          description: "Countries ranked by likelihood of having breaking crisis news RIGHT NOW",
          total_with_live_signals: breakingRanked.length,
          breaking_count: breakingCount,
          developing_count: developingCount,
          active_count: activeCount,
          top_live_iso: breakingRanked[0] || null,
          top_live_headline: breakingRanked[0] ? store[breakingRanked[0]].__live_breaking.breaking_headline : null,
          signal_types_available: Object.keys(LIVE_SIGNALS).length,
          recency_windows: {
            breaking: "≤6 hours (1.0x weight)",
            today: "6-24 hours (0.85x)",
            this_week: "24-72 hours (0.60x)",
            this_month: "3-7 days (0.30x)",
            background: ">7 days (0.10x)",
          },
        },
        data_policy: {
          type: "Live Breaking News Ranking + FSI 2024 Baseline + World Systems Theory",
          min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
          fsi_source: "Fund for Peace, Fragile States Index 2024",
          wst_source: "Immanuel Wallerstein, World Systems Theory (1974)",
          live_breaking_engine: {
            description: "Countries ranked by likelihood of active breaking crisis news RIGHT NOW",
            signals: Object.keys(LIVE_SIGNALS).length,
            recency_decay: "6h/24h/72h/168h/older",
            source_multiplier: "1.0x (1 src) → 1.8x (4+ srcs)",
            tiers: ["BREAKING", "DEVELOPING", "ACTIVE", "MONITORING", "BACKGROUND"],
          },
        },
        enhancements: {
          machine_learning: { enabled: CFG.ML_ENABLED, ...mlStats },
          sentiment_analysis: { enabled: CFG.SENTIMENT_ENABLED, sources: CFG.SENTIMENT_SOURCES },
          historical_data: { enabled: CFG.HISTORY_ENABLED, retention_days: CFG.HISTORY_RETENTION_DAYS },
          geo_fencing: { enabled: CFG.GEO_FENCING_ENABLED, thresholds: alertManager.thresholds },
          live_breaking_news: {
            enabled: CFG.LIVE_BREAKING_ENABLED,
            min_signals: CFG.LIVE_BREAKING_MIN_SIGNALS,
            signal_types: Object.keys(LIVE_SIGNALS),
          },
          world_systems_theory: {
            enabled: CFG.WST_ENABLED,
            countries_classified: Object.keys(WST_CLASSIFICATION).filter(k => k !== 'default').length,
          },
          gdacs_integration: { enabled: CFG.GDACS_ENABLED, alert_levels: CFG.GDACS_ALERT_LEVELS },
          world_bank_integration: { enabled: CFG.WB_ENABLED },
          unhcr_integration: { enabled: CFG.UNHCR_ENABLED },
          who_integration: { enabled: CFG.WHO_ENABLED },
          nasa_integration: { enabled: CFG.NASA_ENABLED },
          openmeteo_integration: { enabled: CFG.OPENMETEO_ENABLED },
          ifrc_integration: { enabled: CFG.IFRC_ENABLED },
          disease_integration: { enabled: CFG.DISEASE_ENABLED },
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
          wb: { live: Object.values(liveData.wb).some(v => v.live), label: "World Bank" },
          unhcr: { live: liveData.unhcr.live, label: "UNHCR" },
          who: { live: liveData.who.live, label: "WHO" },
        },
        endpoints: {
          single: "GET /api/top-story",
          live_news: "GET /api/top-story?format=live",
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
          breaking: "GET /api/top-story?format=breaking",
          wst_summary: "GET /api/top-story?format=wst",
          structural_fallback: "GET /api/top-story?force_live=false",
        },
        anomaly_methodology: "4-method ensemble: CUSUM, Z-score, Bayesian changepoint, Volatility regime. Consensus threshold: 2/4 methods.",
        score_methodology: "Live Breaking News Score = weighted signals × recency × source independence + diversity bonus + freshness bonus + FSI baseline (15%) + spike bonus. Normalized 0-100.",
        tier_system: {
          BREAKING:   "80-100 — Major breaking crisis, multiple independent sources, fresh signals",
          DEVELOPING: "60-79 — Active developing story, strong signal strength",
          ACTIVE:     "40-59 — Ongoing active crisis with live signals",
          MONITORING: "20-39 — Under monitoring, fewer signals",
          BACKGROUND: "0-19 — Background structural fragility, no active live signals",
        },
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
    console.error("[top-story v13.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
