"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v13.9.4 — v13.9.3 RANKING + RSS/LIVE EVIDENCE
//  ────────────────────────────────────────────────────────────────────────────
//  📰 RANKS COUNTRIES BY LIKELIHOOD OF BREAKING CRISIS NEWS *RIGHT NOW*
//  🌍 179 COUNTRIES · 37 LIVE FEEDS · RECENCY-WEIGHTED · SOURCE-COMPOUNDED
//  ═══ v13.9.4 CHANGES ═══
//  ✅ Ranking algorithm = v13.9.3 EXACTLY:
//       rankByLiveBreaking:   effective_score → has_fresh → live_score → freshness
//       rankBreakingOnly:     live_score → freshness
//       rankLiveEventsOnly:   live_score → freshness
//  ✅ Threshold filter uses effective_score (v13.9.3)
//  ✅ RSS feed branch preserved
//  ✅ Live evidence feed branch preserved (format=live)
//  ✅ All v13.9.3 signal/scoring logic preserved unchanged
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  SEED_INTERVAL_MS: 300_000,
  FETCH_TIMEOUT_MS: 15_000,
  MAX_TOP_N: 179,
  SPILLOVER_RATE: 0.08,
  SPILLOVER_FLOOR: 55,
  PRIOR_JITTER: 1,
  MIN_LIVE_EVIDENCE_SOURCES: 1,
  ANOMALY_WINDOW: 28,
  ANOMALY_Z_THRESHOLD: 2.0,
  CUSUM_K: 0.5,
  CUSUM_H: 4.0,
  CHANGEPOINT_MIN_SEG: 5,
  VOLATILITY_RATIO_THRESHOLD: 2.0,
  ML_ENABLED: true,
  LEARNING_RATE: 0.01,
  HIDDEN_LAYERS: [64, 32],
  SENTIMENT_ENABLED: true,
  HISTORY_ENABLED: true,
  HISTORY_RETENTION_DAYS: 90,
  HISTORY_MIN_FOR_ANOMALY: 14,
  GEO_FENCING_ENABLED: true,
  ALERT_WEBHOOK_URL: null,
  ALERT_EMAIL: null,
  ARTICLE_SITE_NAME: "GCIN · Global Crisis Index News",
  ARTICLE_BASE_URL: "https://globalcrisisindex.com",
  ARTICLE_AUTHOR: "GCIN Editorial Team",
  ARTICLE_TWITTER: "@GlobalCrisisIdx",
  ARTICLE_LOGO: "https://globalcrisisindex.com/logo.png",

  LIVE_BREAKING_ENABLED: true,
  LIVE_BREAKING_MIN_SIGNALS: 1,
  SCORE_FIELD_IS_LIVE: false,
  RANKING_USES_EFFECTIVE_SCORE: true,
  EFFECTIVE_SCORE_MODE: "max",

  LIVE_EVENT_FLAT_BOOST: 35,
  LIVE_EVENT_OVERRIDE: false,
  FSI_BASELINE_MAX: 8,
  FRESH_SIGNAL_HOURS: 24,

  EVENT_SIGNAL_MAX_AGE_HOURS: 168,
  STATE_SIGNAL_MAX_AGE_HOURS: 720,

  FSI_BOOST_CAP_VERY_HIGH: 40,
  FSI_BOOST_CAP_HIGH: 30,
  FSI_BOOST_CAP_MODERATE: 20,
  FSI_BOOST_CAP_LOW: 10,

  WST_ENABLED: true,
  WST_GLOBAL_INTEREST_RATE: 5.25,
  WST_CURRENCY_CRISIS_THRESHOLD: 20,
  WST_MAX_BOOST_ABOVE_FSI: 25,

  GDACS_ENABLED: true,
  GDACS_BOOST_RED: 12,
  GDACS_BOOST_ORANGE: 7,
  GDACS_BOOST_GREEN: 3,

  WB_ENABLED: true,
  WB_INFLATION_THRESHOLD: 5,
  WB_UNEMPLOYMENT_THRESHOLD: 10,
  WB_POVERTY_THRESHOLD: 5,
  WB_MAX_INFLATION_BOOST: 10,
  WB_MAX_GDP_BOOST: 10,
  WB_MAX_UNEMPLOYMENT_BOOST: 8,
  WB_MAX_POVERTY_BOOST: 10,

  UNHCR_ENABLED: true,
  UNHCR_MAX_DISPLACEMENT_BOOST: 25,
  UNHCR_SOLUTIONS_ENABLED: true,
  UNHCR_SOLUTIONS_BOOST: 40,

  WHO_ENABLED: true,
  WHO_OUTBREAK_BOOST: 4,
  WHO_MAX_OUTBREAK_BOOST: 10,

  ECDC_ENABLED: true,
  ECDC_BOOST: 55,

  CDC_ENABLED: true,
  CDC_BOOST: 35,

  SPC_ENABLED: true,
  SPC_TSTM_BOOST: 20,
  SPC_MRGL_BOOST: 40,
  SPC_SLGT_BOOST: 55,
  SPC_ENH_BOOST: 75,
  SPC_MDT_BOOST: 90,
  SPC_HIGH_BOOST: 110,

  IFRC_APPEAL_ENABLED: true,
  IFRC_APPEAL_BOOST: 65,

  WHO_DON_ENABLED: true,
  WHO_DON_BOOST: 85,

  SENTINEL_ENABLED: true,
  SENTINEL_BOOST: 30,

  NASA_POWER_ENABLED: true,
  NASA_POWER_TEMP_ANOMALY: 5,
  NASA_POWER_PRECIP_ANOMALY: 5,
  NASA_POWER_BOOST: 25,

  USGS_SIG_ENABLED: true,
  USGS_SIG_TAIL_HOURS: 720,

  ENSEMBLE_ENABLED: true,
  ENSEMBLE_SPREAD_THRESHOLD: 3,

  NASA_ENABLED: true,
  NASA_EVENT_BOOST: 4,
  NASA_MAX_EVENT_BOOST: 12,
  NASA_WILDFIRE_BOOST: 3,

  OPENMETEO_ENABLED: true,
  OPENMETEO_FLOOD_THRESHOLD: 100,
  OPENMETEO_WIND_THRESHOLD: 30,
  OPENMETEO_PRECIP_THRESHOLD: 10,
  OPENMETEO_UV_THRESHOLD: 8,
  OPENMETEO_PM25_THRESHOLD: 35,
  OPENMETEO_LIGHTNING_THRESHOLD: 100,
  OPENMETEO_MARINE_THRESHOLD: 3,
  OPENMETEO_MAX_HAZARD_BOOST: 15,

  DISEASE_ENABLED: true,
  DISEASE_ACTIVE_THRESHOLD: 1000,
  DISEASE_MAX_BOOST: 12,

  GFW_ENABLED: true,
  GFW_DEFORESTATION_BOOST: 45,
  GFW_MAX_BOOST: 60,

  SHAKEMAP_ENABLED: true,
  SHAKEMAP_MIN_MAG: 4.5,
  SHAKEMAP_BOOST: 70,

  INFORM_ENABLED: true,
  INFORM_MIN_SCORE: 5.0,
  INFORM_MAX_BOOST: 8,

  CLIMATE_TRACE_ENABLED: true,
  CLIMATE_TRACE_BOOST: 20,

  HDX_ENABLED: true,
  HDX_BOOST: 15,

  JTWC_ENABLED: true,
  JTWC_BOOST: 75,

  JMA_ENABLED: true,
  JMA_MIN_MAG: 4.0,
  JMA_BOOST: 60,
  JMA_MAX_INTENSITY_BOOST: 15,

  BMKG_ENABLED: true,
  BMKG_MIN_MAG: 4.5,
  BMKG_BOOST: 60,

  GEOFON_ENABLED: true,
  GEOFON_BOOST: 55,

  INGV_ENABLED: true,
  INGV_BOOST: 55,

  GEONET_ENABLED: true,
  GEONET_BOOST: 50,

  JMA_TYPHOON_ENABLED: true,
  JMA_TYPHOON_BOOST: 85,

  ECDC_THREAT_ENABLED: true,
  ECDC_THREAT_BOOST: 55,

  US_DROUGHT_ENABLED: true,
  US_DROUGHT_BOOST: 55,

  WB_FOOD_PRICES_ENABLED: true,
  WB_FOOD_PRICES_BOOST: 35,

  WB_INFRASTRUCTURE_ENABLED: true,
  WB_INFRASTRUCTURE_BOOST: 30,
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Content-Type": "application/json; charset=utf-8",
};

// ─── Regional ISO scoping sets ───────────────────────────────────────────────
const WPAC_ISOS = new Set([
  'PHL', 'TWN', 'JPN', 'CHN', 'VNM', 'KOR', 'PRK', 'IDN',
  'MYS', 'THA', 'KHM', 'LAO', 'MMR', 'BGD', 'IND', 'LKA', 'MDV',
]);

const MEDITERRANEAN_ISOS = new Set([
  'ITA', 'GRC', 'TUR', 'ESP', 'FRA', 'HRV', 'ALB', 'MNE', 'LBY', 'TUN', 'DZA', 'MAR', 'EGY', 'ISR', 'LBN', 'SYR', 'CYP', 'MLT',
]);

const SOUTH_PACIFIC_ISOS = new Set([
  'NZL', 'FJI', 'WSM', 'TON', 'VUT', 'SLB', 'PNG', 'NCL', 'PYF', 'COK', 'NIU', 'TKL', 'KIR', 'TUV', 'FSM', 'MHL', 'PLW',
]);

const EVENT_SIGNAL_TYPES = new Set([
  "gdacs_red", "gdacs_orange",
  "earthquake_m6", "earthquake_m5", "earthquake_m45",
  "jma_earthquake", "bmkg_earthquake",
  "geofon_earthquake", "ingv_earthquake", "geonet_earthquake",
  "shakemap_event",
  "who_outbreak", "who_outbreak_multi", "who_don", "ecdc_threat",
  "unhcr_mass_displace", "unhcr_return",
  "nasa_wildfire", "nasa_storm", "nasa_flood",
  "ifrc_emergency", "ifrc_appeal",
  "cyclone_active", "jtwc_cyclone", "jma_typhoon",
  "flood_severe", "marine_hazard",
  "heat_extreme",
  "cdc_outbreak", "spc_severe",
  "us_drought",
]);

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

// ─── FSI 2024 — 179 COUNTRIES ───────────────────────────────────────────────
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

const REGION_ALIASES = {
  africa:     ["africa"],
  asia:       ["asia"],
  europe:     ["europe"],
  middleeast: ["middleeast","middle east","mena"],
  americas:   ["americas","latin america","latam","caribbean"],
  oceania:    ["oceania","pacific"],
};

const COUNTRIES = {};
for (const [iso, fsi] of Object.entries(FSI_2024)) {
  const types = [];
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
    if (otherIso !== iso && otherFsi.region === fsi.region) adj.push(otherIso);
  }
  COUNTRIES[iso] = {
    name: fsi.name, flag: fsi.flag, prior: Math.round(score),
    fsi_score: score, fsi_rank: fsi.rank, fsi_band: fsi.fsi_band,
    region: fsi.region, types: uniqueTypes.slice(0, 4), adj: adj.slice(0, 8), cent: [0, 0],
  };
}

// ─── MATH UTILITIES ──────────────────────────────────────────────────────────
function lcg(seed) { return ((Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0) / 0x100000000; }
function strHash(str) { return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0; }
const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function median(arr) { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }
function stddev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function composite(dims) { return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0); }
function fmtPop(n) { if (!n) return null; if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return `${n}`; }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function estimateReadTime(text) { const words = text.trim().split(/\s+/).length; return { words, minutes: Math.max(1, Math.ceil(words / 225)) }; }
function findIsoByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const [iso, d] of Object.entries(COUNTRIES)) if (d.name.toLowerCase() === lower) return iso;
  for (const [iso, d] of Object.entries(COUNTRIES)) if (d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) return iso;
  return null;
}
function findClosestCountry(lng, lat) {
  let closest = null, minDist = Infinity;
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (!d.cent || (d.cent[0] === 0 && d.cent[1] === 0)) continue;
    const dist = Math.sqrt((lng - d.cent[0]) ** 2 + (lat - d.cent[1]) ** 2);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return closest;
}
function isUS(iso) { return iso === "USA"; }

// ─── Place-name matching ─────────────────────────────────────────────────────
const REGION_KEYWORDS = {
  IDN: ['indonesia','sumatra','java','sulawesi','borneo','papua','bali','flores','maluku','timor','lombok','sumbawa','halmahera','seram','sunda','banda sea','banda'],
  JPN: ['japan','honshu','hokkaido','kyushu','shikoku','ryukyu','bonin','izu','tokyo','osaka','nagoya','sea of japan','okinawa','kanto','kansai'],
  NZL: ['new zealand','kermadec','te araroa','auckland','wellington','christchurch','canterbury','fiordland','north island','south island','taupo','taupō'],
  PHL: ['philippines','luzon','mindanao','visayas','manila','cebu','davao','bohol','leyte','samar','mindoro','palawan'],
  CHL: ['chile','valparaiso','santiago','atacama','antofagasta','coquimbo','bio-bio','araucania','los lagos'],
  ITA: ['italy','sicily','sardinia','naples','rome','milan','turin','florence','venice','calabria','puglia','lazio','tuscany','etna','vesuvius','stromboli'],
  GRC: ['greece','crete','athens','aegean','ionian','peloponnese','thessaly','epirus','rhodes','santorini','cyclades'],
  TUR: ['turkey','anatolia','istanbul','ankara','izmir','aegean','marmara','black sea','antalya','bursa'],
  IRN: ['iran','tehran','tabriz','shiraz','isfahan','kerman','zagros','alborz','persian gulf'],
  MEX: ['mexico','oaxaca','chiapas','guerrero','michoacan','jalisco','puebla','veracruz','baja california','sonora','sinaloa'],
  USA: ['california','alaska','hawaii','puerto rico','nevada','washington','oregon','oklahoma','texas','utah','montana','idaho','wyoming'],
  TWN: ['taiwan','taipei','kaohsiung','tainan','taichung','hualien','taitung'],
  PNG: ['papua new guinea','new britain','new ireland','bougainville','solomon sea','bismarck'],
  SLB: ['solomon islands','guadalcanal','santa cruz','malaita','choiseul','isabel'],
  VUT: ['vanuatu','espiritu santo','efate','tanna','pentecost'],
  FJI: ['fiji','viti levu','vanua levu','suva','lautoka'],
  TON: ['tonga','tongatapu','haapai','vavau'],
  WSM: ['samoa','savaii','upolu','apia'],
  ISL: ['iceland','reykjanes','katla','bardarbunga','hekla','askja'],
  NOR: ['norway','oslo','bergen','trondheim','tromso'],
  RUS: ['russia','kamchatka','kuril','sakhalin','siberia','caucasus','baikal','ural','kola','chukotka'],
};

function matchesCountryPlace(iso, place) {
  if (!place) return false;
  const p = place.toLowerCase();
  const c = COUNTRIES[iso];
  if (!c) return false;
  if (p.includes(c.name.toLowerCase())) return true;
  const kws = REGION_KEYWORDS[iso];
  if (kws) for (const kw of kws) if (p.includes(kw)) return true;
  return false;
}

// ════════════════════════════════════════════════════════════════════════════
//  HISTORY PERSISTENCE
// ════════════════════════════════════════════════════════════════════════════

class InMemoryHistoryStore {
  constructor() {
    this.data = new Map();
    this.maxPerIso = 180;
  }
  async recordObservation(iso, obs) {
    if (!this.data.has(iso)) this.data.set(iso, []);
    const arr = this.data.get(iso);
    arr.push({ ts: Date.now(), ...obs });
    if (arr.length > this.maxPerIso) arr.splice(0, arr.length - this.maxPerIso);
  }
  async getObservations(iso, limit = 90) {
    const arr = this.data.get(iso) || [];
    return arr.slice(-limit);
  }
  async flush(iso, beforeTs) {
    if (!this.data.has(iso)) return;
    const arr = this.data.get(iso).filter(o => o.ts >= beforeTs);
    this.data.set(iso, arr);
  }
}

const historyStore = new InMemoryHistoryStore();

async function getRealHistory(iso, limit = 90) {
  const obs = await historyStore.getObservations(iso, limit);
  return obs.map(o => o.score);
}

async function recordHistory(iso, displayScore, liveScore) {
  await historyStore.recordObservation(iso, { score: displayScore, live_score: liveScore });
}

// ─── SIGNAL AGE-OUT ─────────────────────────────────────────────────────────
function isSignalFresh(sig) {
  const age = sig.ageHours || 0;
  const maxAge = EVENT_SIGNAL_TYPES.has(sig.type)
    ? CFG.EVENT_SIGNAL_MAX_AGE_HOURS
    : CFG.STATE_SIGNAL_MAX_AGE_HOURS;
  return age <= maxAge;
}

// ─── FSI-CAPPED BOOSTS ──────────────────────────────────────────────────────
function maxBoostForFSI(fsiScore) {
  if (fsiScore >= 80) return CFG.FSI_BOOST_CAP_VERY_HIGH;
  if (fsiScore >= 60) return CFG.FSI_BOOST_CAP_HIGH;
  if (fsiScore >= 40) return CFG.FSI_BOOST_CAP_MODERATE;
  return CFG.FSI_BOOST_CAP_LOW;
}

// ─── EFFECTIVE SCORE ────────────────────────────────────────────────────────
function computeEffectiveScore(structuralScore, liveScore, mode = CFG.EFFECTIVE_SCORE_MODE) {
  if (mode === "live") return liveScore;
  if (mode === "structural") return structuralScore;
  return Math.max(structuralScore, liveScore);
}

// ════════════════════════════════════════════════════════════════════════════
//  LIVE BREAKING ENGINE
// ════════════════════════════════════════════════════════════════════════════

const RECENCY = { HOURS_6: 1.00, HOURS_24: 0.85, HOURS_72: 0.60, HOURS_168: 0.30, OLDER: 0.10 };

const LIVE_SIGNALS = {
  gdacs_red:           { weight: 100, verify: 1.0,  label: "GDACS RED Alert",           icon: "🚨", type: "event" },
  gdacs_orange:        { weight: 70,  verify: 0.9,  label: "GDACS Orange Alert",        icon: "🟠", type: "event" },
  earthquake_m6:       { weight: 95,  verify: 1.0,  label: "M6+ Earthquake",            icon: "🌍", type: "event" },
  earthquake_m5:       { weight: 65,  verify: 0.9,  label: "M5+ Earthquake",            icon: "🌍", type: "event" },
  earthquake_m45:      { weight: 40,  verify: 0.8,  label: "M4.5+ Earthquake",          icon: "🌍", type: "event" },
  jma_earthquake:      { weight: 60,  verify: 0.95, label: "JMA Earthquake",            icon: "🌏", type: "event" },
  bmkg_earthquake:     { weight: 60,  verify: 0.95, label: "BMKG Earthquake",           icon: "🌏", type: "event" },
  geofon_earthquake:   { weight: 55,  verify: 0.95, label: "GEOFON Earthquake",         icon: "🌍", type: "event" },
  ingv_earthquake:     { weight: 55,  verify: 0.95, label: "INGV Earthquake",           icon: "🌍", type: "event" },
  geonet_earthquake:   { weight: 50,  verify: 0.95, label: "GeoNet Earthquake",         icon: "🌏", type: "event" },
  shakemap_event:      { weight: 70,  verify: 0.95, label: "ShakeMap Event",            icon: "🌍", type: "event" },
  who_outbreak:        { weight: 80,  verify: 1.0,  label: "WHO Outbreak",              icon: "🦠", type: "event" },
  who_outbreak_multi:  { weight: 95,  verify: 1.0,  label: "Multiple WHO Outbreaks",    icon: "🦠", type: "event" },
  who_don:             { weight: 90,  verify: 1.0,  label: "WHO Disease Outbreak",      icon: "🦠", type: "event" },
  ecdc_threat:         { weight: 55,  verify: 0.85, label: "ECDC Threat",               icon: "🧫", type: "event" },
  unhcr_mass_displace: { weight: 90,  verify: 1.0,  label: "Mass Displacement",         icon: "🚶", type: "event" },
  unhcr_return:        { weight: 40,  verify: 0.95, label: "Refugee Returns",           icon: "🏠", type: "event" },
  nasa_wildfire:       { weight: 75,  verify: 0.9,  label: "Active Wildfire",           icon: "🔥", type: "event" },
  nasa_storm:          { weight: 70,  verify: 0.9,  label: "Severe Storm",              icon: "🌀", type: "event" },
  nasa_flood:          { weight: 70,  verify: 0.9,  label: "Flood Event",               icon: "🌊", type: "event" },
  nasa_drought:        { weight: 55,  verify: 0.9,  label: "Drought",                   icon: "🏜️", type: "state" },
  ifrc_emergency:      { weight: 75,  verify: 1.0,  label: "IFRC Emergency",            icon: "🏥", type: "event" },
  ifrc_appeal:         { weight: 80,  verify: 1.0,  label: "IFRC Emergency Appeal",     icon: "🆘", type: "event" },
  cyclone_active:      { weight: 85,  verify: 1.0,  label: "Active Cyclone",            icon: "🌀", type: "event" },
  jtwc_cyclone:        { weight: 90,  verify: 1.0,  label: "JTWC Pacific Cyclone",      icon: "🌀", type: "event" },
  jma_typhoon:         { weight: 85,  verify: 1.0,  label: "JMA Typhoon",               icon: "🌀", type: "event" },
  flood_severe:        { weight: 70,  verify: 0.9,  label: "Severe Flooding",           icon: "🌊", type: "event" },
  marine_hazard:       { weight: 55,  verify: 0.9,  label: "Marine Hazard",             icon: "🌊", type: "event" },
  heat_extreme:        { weight: 60,  verify: 0.8,  label: "Extreme Heat",              icon: "🥵", type: "event" },
  disease_active:      { weight: 50,  verify: 0.8,  label: "Disease Outbreak",          icon: "🦠", type: "state" },
  inflation_crisis:    { weight: 45,  verify: 0.9,  label: "Inflation Crisis",          icon: "📈", type: "state" },
  gdp_contraction:     { weight: 40,  verify: 0.9,  label: "GDP Contraction",           icon: "📉", type: "state" },
  cdc_outbreak:        { weight: 55,  verify: 0.95, label: "CDC Outbreak Notice",        icon: "🧫", type: "event" },
  spc_severe:          { weight: 60,  verify: 0.95, label: "SPC Severe Outlook",         icon: "⛈️", type: "event" },
  sentinel_observation:{ weight: 35,  verify: 0.85, label: "Satellite Observation",      icon: "🛰️", type: "state" },
  nasa_power_anomaly:  { weight: 50,  verify: 0.9,  label: "Climate Anomaly",            icon: "🌡️", type: "state" },
  gfw_deforestation:   { weight: 55,  verify: 0.95, label: "Deforestation Alert",        icon: "🌳", type: "state" },
  climate_trace_emissions:{ weight: 40, verify: 0.85, label: "Emissions Hotspot",       icon: "🏭", type: "state" },
  hdx_crisis:          { weight: 45,  verify: 0.9,  label: "HDX Crisis Dataset",         icon: "📊", type: "state" },
  us_drought:          { weight: 55,  verify: 0.95, label: "US Drought",                 icon: "🏜️", type: "event" },
  wb_food_price:       { weight: 35,  verify: 0.9,  label: "Food Price Shock",            icon: "🍞", type: "state" },
  wb_water_stress:     { weight: 30,  verify: 0.9,  label: "Water Stress",                icon: "💧", type: "state" },
};

function detectLiveBreakingSignals(iso, live, store) {
  const signals = [];
  const c = COUNTRIES[iso];
  const s = (live && live.extracted && live.extracted[iso]) || (store[iso] && store
