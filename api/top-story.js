"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v13.0 — PURE LIVE CRISIS FEED
//  ────────────────────────────────────────────────────────────────────────────
//  Live evidence is the PRIMARY driver. FSI is a structural prior/floor only.
//  Scores reflect what is happening NOW, not a 2024 annual report.
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  SEED_INTERVAL_MS:     300_000,
  FETCH_TIMEOUT_MS:     15_000,
  MAX_TOP_N:            179,
  SPILLOVER_RATE:       0.08,
  SPILLOVER_FLOOR:      55,
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

  // ═══ PURE LIVE FEED CONFIG ═══════════════════════════════════════════════
  // These control how live evidence dominates the final score.
  LIVE_PRIMARY: true,               // Live evidence is the primary driver
  EVIDENCE_WEIGHT: 0.75,            // 75% of score from live evidence
  STRUCTURAL_FLOOR_WEIGHT: 0.25,    // 25% from FSI structural floor
  MIN_CONFIDENCE_FOR_RANKING: 0.20, // Below this, country is "no live data"
  NO_LIVE_DATA_SCORE: 20,           // Score shown when no live evidence at all
  MAX_LIVE_BOOST_ABOVE_FSI: 999,    // Effectively uncapped
  EVIDENCE_SATURATION: 12,          // # of sources where evidence-driven score saturates
  EVIDENCE_PER_SOURCE: 6.5,         // Score points per independent evidence source
  EVIDENCE_MAGNITUDE_WEIGHT: 1.4,   // Multiplier for severity of evidence
  VIRAL_PRIMARY: true,              // Viral momentum output IS the score
  FSI_FLOOR_FRACTION: 0.35,         // FSI acts as a floor at 35% of its value
  FSI_CEILING_FOR_FLOOR: 60,        // FSI above this doesn't raise the floor further

  // ── VIRAL MOMENTUM ──────────────────────────────────────────────────────
  VIRAL_ENABLED: true,
  VIRAL_WINDOW_HOURS: 24,
  VIRAL_ACCELERATION_WEIGHT: 2.5,
  VIRAL_MOMENTUM_DECAY: 0.3,
  VIRAL_NOVELTY_BONUS: 5,
  VIRAL_RECENCY_WEIGHT: 0.4,
  VIRAL_SURGE_THRESHOLD: 3,
  VIRAL_VIRAL_THRESHOLD: 8,
  VIRAL_DIMINISHING_RETURNS: 0.7,

  // ── WST ─────────────────────────────────────────────────────────────────
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
  WST_MAX_BOOST_ABOVE_FSI: 999,
  WST_MIN_BOOST_BUFFER: 0,

  // ── GDACS ───────────────────────────────────────────────────────────────
  GDACS_ENABLED: true,
  GDACS_ALERT_LEVELS: ["Green", "Orange", "Red"],
  GDACS_BOOST_RED: 22,
  GDACS_BOOST_ORANGE: 13,
  GDACS_BOOST_GREEN: 5,

  // ── WORLD BANK ──────────────────────────────────────────────────────────
  WB_ENABLED: true,
  WB_INFLATION_THRESHOLD: 5,
  WB_GDP_CONTRACTION_THRESHOLD: -1,
  WB_UNEMPLOYMENT_THRESHOLD: 10,
  WB_POVERTY_THRESHOLD: 5,
  WB_MAX_INFLATION_BOOST: 18,
  WB_MAX_GDP_BOOST: 18,
  WB_MAX_UNEMPLOYMENT_BOOST: 14,
  WB_MAX_POVERTY_BOOST: 18,

  // ── UNHCR ───────────────────────────────────────────────────────────────
  UNHCR_ENABLED: true,
  UNHCR_DISPLACEMENT_THRESHOLD: 100_000,
  UNHCR_MAX_DISPLACEMENT_BOOST: 40,
  UNHCR_ASYLUM_BOOST: 12,

  // ── WHO ─────────────────────────────────────────────────────────────────
  WHO_ENABLED: true,
  WHO_OUTBREAK_BOOST: 7,
  WHO_MAX_OUTBREAK_BOOST: 20,

  // ── NASA ────────────────────────────────────────────────────────────────
  NASA_ENABLED: true,
  NASA_EVENT_BOOST: 7,
  NASA_MAX_EVENT_BOOST: 22,
  NASA_WILDFIRE_BOOST: 5,

  // ── OPEN-METEO ──────────────────────────────────────────────────────────
  OPENMETEO_ENABLED: true,
  OPENMETEO_FLOOD_THRESHOLD: 100,
  OPENMETEO_WIND_THRESHOLD: 30,
  OPENMETEO_PRECIP_THRESHOLD: 10,
  OPENMETEO_UV_THRESHOLD: 8,
  OPENMETEO_PM25_THRESHOLD: 35,
  OPENMETEO_LIGHTNING_THRESHOLD: 100,
  OPENMETEO_HEAT_THRESHOLD: 35,
  OPENMETEO_MAX_HAZARD_BOOST: 28,

  // ── IFRC ────────────────────────────────────────────────────────────────
  IFRC_ENABLED: true,
  IFRC_EVENT_BOOST: 7,
  IFRC_MAX_EVENT_BOOST: 18,

  // ── DISEASE.SH ──────────────────────────────────────────────────────────
  DISEASE_ENABLED: true,
  DISEASE_ACTIVE_THRESHOLD: 1000,
  DISEASE_MAX_BOOST: 20,

  // ── USGS / EMSC ─────────────────────────────────────────────────────────
  QUAKE_MAG_THRESHOLD: 4.5,
  QUAKE_MAX_BOOST: 30,

  // ── NOAA ────────────────────────────────────────────────────────────────
  NOAA_MAX_BOOST: 15,
};

// ── Persistence for real historical data across warm invocations ─────────
// If the runtime provides a persistent store (Vercel KV, Redis, etc.), plug it
// in here. Otherwise we fall back to an in-memory buffer that survives between
// warm invocations in the same process.
const LIVE_HISTORY = (() => {
  const mem = new Map();
  const RING_SIZE = 240; // ~20 days at 2h intervals, or 240 samples
  return {
    push(iso, sample) {
      if (!mem.has(iso)) mem.set(iso, []);
      const arr = mem.get(iso);
      arr.push({ t: Date.now(), ...sample });
      if (arr.length > RING_SIZE) arr.splice(0, arr.length - RING_SIZE);
    },
    get(iso, n = 60) {
      const arr = mem.get(iso) || [];
      return arr.slice(-n);
    },
    all() { return mem; },
    size(iso) { return (mem.get(iso) || []).length; },
  };
})();

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

// ─── REAL FSI 2024 (structural prior only) ──────────────────────────────────
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

// ─── WST CLASSIFICATION ─────────────────────────────────────────────────────
const WST_CLASSIFICATION = {
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

const REGION_ALIASES = {
  africa:     ["africa"],
  asia:       ["asia"],
  europe:     ["europe"],
  middleeast: ["middleeast","middle east","mena"],
  americas:   ["americas","latin america","latam","caribbean"],
  oceania:    ["oceania","pacific"],
};

// ─── BUILD COUNTRY TABLE ────────────────────────────────────────────────────
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
    name: fsi.name, flag: fsi.flag,
    prior: Math.round(score), fsi_score: score, fsi_rank: fsi.rank,
    fsi_band: fsi.fsi_band, region: fsi.region,
    types: uniqueTypes.slice(0, 4), adj: adj.slice(0, 8),
    cent: [0, 0],
  };
}

// ─── MATH UTILITIES ─────────────────────────────────────────────────────────
function lcg(seed) { return ((Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0) / 0x100000000; }
function strHash(str) { return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0; }
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
    if (!d.cent) continue;
    const dist = Math.sqrt((lng - d.cent[0]) ** 2 + (lat - d.cent[1]) ** 2);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return closest;
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── LIVE-EVIDENCE-DRIVEN SCORING ────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
//
//  The score is now computed as:
//
//    liveScore = min(99, Σ evidence_points)   // primary driver
//    fsiFloor  = FSI_score * FSI_FLOOR_FRACTION (structural floor only)
//    score     = max(fsiFloor, liveScore)
//
//  If there is NO live evidence, score = NO_LIVE_DATA_SCORE (20).
//  Evidence points scale with source count AND magnitude.
//
//  Viral momentum is computed on REAL recorded history (LIVE_HISTORY ring
//  buffer), and its output IS the liveScore boost — not a re-weighted blend.
// ════════════════════════════════════════════════════════════════════════════

function fsiFloor(iso) {
  const c = COUNTRIES[iso];
  if (!c) return 0;
  const capped = Math.min(CFG.FSI_CEILING_FOR_FLOOR, c.fsi_score);
  return Math.round(capped * CFG.FSI_FLOOR_FRACTION);
}

/**
 * Compute an evidence-driven crisis score from live signals.
 * Returns { score, confidence, sources, points, dimensions, audit }
 */
function computeLiveScore(iso, signals, priorDims) {
  const dims = { ...priorDims };
  const audit = [];
  let points = 0;
  const sources = new Set();

  // Helper: add points and record the source
  const add = (src, field, delta, reason) => {
    if (delta <= 0) return;
    points += delta;
    sources.add(src);
    audit.push({ source: src, field, delta, reason });
  };

  // ── Seismic ────────────────────────────────────────────────────────────
  if (signals.quakeMag >= CFG.QUAKE_MAG_THRESHOLD) {
    const p = Math.min(CFG.QUAKE_MAX_BOOST, (signals.quakeMag - 3.5) ** 1.6 * 2.2);
    add("USGS/EMSC", "displacement+health", p, `M${signals.quakeMag.toFixed(1)} earthquake`);
    dims.displacement = clamp(dims.displacement + Math.ceil(p * 0.5));
    dims.health = clamp(dims.health + Math.floor(p * 0.3));
    dims.access = clamp(dims.access + Math.floor(p * 0.2));
  }

  // ── GDACS ──────────────────────────────────────────────────────────────
  if (CFG.GDACS_ENABLED && signals.gdacs) {
    const lvl = signals.gdacsAlert || "green";
    const base = lvl === "red" ? CFG.GDACS_BOOST_RED
              : lvl === "orange" ? CFG.GDACS_BOOST_ORANGE
              : CFG.GDACS_BOOST_GREEN;
    const mult = Math.min(2, 1 + (signals.gdacsCount || 1) * 0.15);
    const p = base * mult;
    add("GDACS", "multi", p, `${lvl.toUpperCase()} alert (${signals.gdacsEventType || "event"}) x${signals.gdacsCount || 1}`);
    dims.displacement = clamp(dims.displacement + Math.ceil(p * 0.4));
    dims.health       = clamp(dims.health + Math.floor(p * 0.25));
    dims.access       = clamp(dims.access + Math.floor(p * 0.2));
    dims.climate      = clamp(dims.climate + Math.floor(p * 0.15));
  }

  // ── NASA EONET ─────────────────────────────────────────────────────────
  if (CFG.NASA_ENABLED && signals.nasaEventCount > 0) {
    const base = Math.min(CFG.NASA_MAX_EVENT_BOOST, signals.nasaEventCount * CFG.NASA_EVENT_BOOST);
    const wf = (signals.nasaEvents || []).filter(e => e.categories?.some(c => c.id === "wildfires")).length;
    const wfB = Math.min(10, wf * CFG.NASA_WILDFIRE_BOOST);
    const p = base + wfB;
    add("NASA EONET", "climate+displacement+health", p, `${signals.nasaEventCount} events${wf ? ` (${wf} wildfires)` : ""}`);
    dims.climate      = clamp(dims.climate + Math.ceil(p * 0.5));
    dims.displacement = clamp(dims.displacement + Math.floor(p * 0.25));
    dims.health       = clamp(dims.health + Math.floor(wfB * 0.3));
  }

  // ── IFRC ───────────────────────────────────────────────────────────────
  if (CFG.IFRC_ENABLED && signals.ifrcCount > 0) {
    const p = Math.min(CFG.IFRC_MAX_EVENT_BOOST, signals.ifrcCount * CFG.IFRC_EVENT_BOOST);
    add("IFRC GO", "access+displacement", p, `${signals.ifrcCount} active operations`);
    dims.access       = clamp(dims.access + Math.ceil(p * 0.6));
    dims.displacement = clamp(dims.displacement + Math.floor(p * 0.3));
  }

  // ── Heat ───────────────────────────────────────────────────────────────
  if (signals.maxTempC >= CFG.OPENMETEO_HEAT_THRESHOLD) {
    const p = Math.min(20, (signals.maxTempC - 28) * 1.8);
    add("Open-Meteo Heat", "climate+health+food", p, `${signals.maxTempC}°C extreme heat`);
    dims.climate = clamp(dims.climate + Math.ceil(p * 0.5));
    dims.health  = clamp(dims.health + Math.floor(p * 0.35));
    dims.food    = clamp(dims.food + Math.floor(p * 0.15));
  }

  // ── Weather Hazards ────────────────────────────────────────────────────
  if (signals.hazards) {
    const h = signals.hazards;
    let p = 0; const parts = [];
    if (h.flood_discharge > CFG.OPENMETEO_FLOOD_THRESHOLD) { p += 8; parts.push(`${h.flood_discharge.toFixed(0)}m³/s discharge`); }
    if (h.wind_speed > CFG.OPENMETEO_WIND_THRESHOLD)      { p += 6; parts.push(`${h.wind_speed.toFixed(0)}km/h winds`); }
    if (h.precip_total > CFG.OPENMETEO_PRECIP_THRESHOLD)  { p += 5; parts.push(`${h.precip_total.toFixed(0)}mm precip`); }
    if (h.uv_max > CFG.OPENMETEO_UV_THRESHOLD)            { p += 3; parts.push(`UV ${h.uv_max.toFixed(1)}`); }
    if (h.cloud_avg > 70)                                 { p += 3; parts.push(`${h.cloud_avg.toFixed(0)}% cloud`); }
    if (h.lightning_max > CFG.OPENMETEO_LIGHTNING_THRESHOLD) { p += 5; parts.push(`${h.lightning_max.toFixed(0)}J/kg lightning`); }
    p = Math.min(CFG.OPENMETEO_MAX_HAZARD_BOOST, p);
    if (p > 0) {
      add("Open-Meteo Hazards", "climate+displacement", p, parts.join(", "));
      dims.climate      = clamp(dims.climate + p);
      dims.displacement = clamp(dims.displacement + Math.floor(p * 0.25));
    }
  }

  // ── Air quality ────────────────────────────────────────────────────────
  if (signals.aq && signals.aq.pm25 >= CFG.OPENMETEO_PM25_THRESHOLD) {
    const p = Math.min(14, (signals.aq.pm25 - 25) / 6);
    if (p > 0) {
      add("Open-Meteo AQ", "health", p, `PM2.5 ${signals.aq.pm25.toFixed(0)}µg/m³`);
      dims.health = clamp(dims.health + p);
    }
  }

  // ── disease.sh ─────────────────────────────────────────────────────────
  if (CFG.DISEASE_ENABLED && signals.diseaseActive > CFG.DISEASE_ACTIVE_THRESHOLD) {
    const m = signals.diseaseActive / 1000;
    const p = Math.min(CFG.DISEASE_MAX_BOOST, Math.log10(m + 1) * 8);
    add("disease.sh", "health+food", p, `${signals.diseaseActive.toLocaleString()} active COVID cases`);
    dims.health = clamp(dims.health + p);
    dims.food   = clamp(dims.food + Math.floor(p * 0.3));
  }

  // ── WHO ────────────────────────────────────────────────────────────────
  if (CFG.WHO_ENABLED && signals.whoOutbreaks?.length > 0) {
    const p = Math.min(CFG.WHO_MAX_OUTBREAK_BOOST, signals.whoOutbreaks.length * CFG.WHO_OUTBREAK_BOOST);
    add("WHO", "health+access", p, `${signals.whoOutbreaks.length} outbreaks: ${signals.whoOutbreaks.map(o => o.disease).join(", ")}`);
    dims.health = clamp(dims.health + p);
    dims.access = clamp(dims.access + Math.floor(p * 0.25));
  }

  // ── World Bank ─────────────────────────────────────────────────────────
  if (CFG.WB_ENABLED && signals.wbInflation?.value > CFG.WB_INFLATION_THRESHOLD) {
    const p = Math.min(CFG.WB_MAX_INFLATION_BOOST, signals.wbInflation.value / 4);
    add("World Bank", "economic+food", p, `Inflation ${signals.wbInflation.value.toFixed(1)}%`);
    dims.economic = clamp(dims.economic + p);
    dims.food     = clamp(dims.food + Math.floor(p * 0.3));
  }
  if (CFG.WB_ENABLED && signals.wbGdpGrowth?.value < 0) {
    const p = Math.min(CFG.WB_MAX_GDP_BOOST, Math.abs(signals.wbGdpGrowth.value) * 2);
    add("World Bank", "economic+political", p, `GDP growth ${signals.wbGdpGrowth.value.toFixed(1)}%`);
    dims.economic  = clamp(dims.economic + p);
    dims.political = clamp(dims.political + Math.floor(p * 0.2));
  }
  if (CFG.WB_ENABLED && signals.wbUnemployment?.value > CFG.WB_UNEMPLOYMENT_THRESHOLD) {
    const p = Math.min(CFG.WB_MAX_UNEMPLOYMENT_BOOST, signals.wbUnemployment.value / 5);
    add("World Bank", "economic+political", p, `Unemployment ${signals.wbUnemployment.value.toFixed(1)}%`);
    dims.economic  = clamp(dims.economic + p);
    dims.political = clamp(dims.political + Math.floor(p * 0.2));
  }
  if (CFG.WB_ENABLED && signals.wbPoverty?.value > CFG.WB_POVERTY_THRESHOLD) {
    const p = Math.min(CFG.WB_MAX_POVERTY_BOOST, signals.wbPoverty.value / 4);
    add("World Bank", "economic+food", p, `${signals.wbPoverty.value.toFixed(1)}% extreme poverty`);
    dims.economic = clamp(dims.economic + p);
    dims.food     = clamp(dims.food + Math.floor(p * 0.4));
  }

  // ── UNHCR ──────────────────────────────────────────────────────────────
  if (CFG.UNHCR_ENABLED && signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const p = m >= 10 ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST
            : m >= 5  ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST * 0.85
            : m >= 3  ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST * 0.65
            : m >= 1.5 ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST * 0.45
            : m >= 0.5 ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST * 0.25
            : m >= 0.1 ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST * 0.12
            : 0;
    if (p > 0) {
      add("UNHCR", "displacement+political+economic+access", p, `${m.toFixed(1)}M displaced`);
      dims.displacement = clamp(dims.displacement + p);
      dims.political    = clamp(dims.political + Math.floor(p * 0.3));
      dims.economic     = clamp(dims.economic + Math.floor(p * 0.2));
      dims.access       = clamp(dims.access + Math.floor(p * 0.15));
    }
  }

  // ── NOAA ───────────────────────────────────────────────────────────────
  if (signals.noaa) {
    const p = Math.min(CFG.NOAA_MAX_BOOST, (signals.noaa.extreme_alerts + signals.noaa.storm_alerts) * 2);
    if (p > 0) {
      add("NOAA", "climate", p, `${signals.noaa.extreme_alerts} extreme + ${signals.noaa.storm_alerts} storm alerts`);
      dims.climate = clamp(dims.climate + p);
    }
  }

  // ── WST structural amplification (only amplifies live evidence) ───────
  if (CFG.WST_ENABLED && points > 0) {
    const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
    const fragility = 1 - (wst.recovery_rate || 0.5);
    const amp = points * fragility * 0.15;
    if (amp > 0.5) {
      add("WST Amplifier", "all", amp, `${wst.class} fragility amplifies live evidence`);
      points += amp;
    }
  }

  const liveScore = Math.min(99, Math.round(points));

  // Evidence confidence = how saturated the evidence is (0..1)
  const srcCount = sources.size;
  const confidence = Math.min(1, srcCount / CFG.EVIDENCE_SATURATION);

  return {
    score: liveScore,
    confidence,
    source_count: srcCount,
    sources: [...sources],
    raw_points: points,
    dimensions: dims,
    audit,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── VIRAL MOMENTUM (operates on REAL history) ───────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function computeViralMomentum(iso, currentLiveScore) {
  // Pull real recorded history. If empty, this is the first run for this iso.
  const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
  const haveHistory = hist.length >= 3;

  if (!haveHistory) {
    // Cold start: record this sample and report neutral momentum
    LIVE_HISTORY.push(iso, { score: currentLiveScore });
    return {
      velocity: 0, acceleration: 0, surgeMagnitude: 0, isSurge: false,
      viralStatus: "STABLE", timeDecay: 1, recencyWeight: 0,
      noveltyBoost: 0, surgeBonus: 0, viralVelocityBonus: 0, decayPenalty: 0,
      totalAdjustment: 0, history_points: hist.length, cold_start: true,
    };
  }

  const recent3 = hist.slice(-3);
  const old3 = hist.slice(-6, -3);
  const velocity = recent3.length >= 3 && old3.length >= 3
    ? (mean(recent3) - mean(old3)) / 3 : 0;

  const recent5 = hist.slice(-5);
  const mid5 = hist.slice(-10, -5);
  const old5 = hist.slice(-15, -10);
  const vRecent = recent5.length >= 5 && mid5.length >= 5 ? (mean(recent5) - mean(mid5)) / 5 : 0;
  const vOld = mid5.length >= 5 && old5.length >= 5 ? (mean(mid5) - mean(old5)) / 5 : 0;
  const acceleration = vRecent - vOld;

  const surgeWindow = Math.min(3, hist.length);
  const rw = hist.slice(-surgeWindow);
  const pw = hist.slice(-surgeWindow * 2, -surgeWindow);
  let surgeMagnitude = 0, isSurge = false;
  if (rw.length >= 2 && pw.length >= 2) {
    const spike = mean(rw) - mean(pw);
    if (spike > CFG.VIRAL_SURGE_THRESHOLD) { surgeMagnitude = spike; isSurge = true; }
  }

  const baselineMean = hist.length > 10 ? mean(hist.slice(0, -3)) : 50;
  const noveltyScore = Math.max(0, currentLiveScore - baselineMean * 0.5);
  const noveltyBoost = noveltyScore > 15 ? CFG.VIRAL_NOVELTY_BONUS * 0.8 : 0;

  const maxScore = Math.max(...hist);
  const maxIndex = hist.indexOf(maxScore);
  const daysSincePeak = (hist.length - 1) - maxIndex;
  const timeDecay = Math.exp(-daysSincePeak / CFG.VIRAL_MOMENTUM_DECAY);

  const accelBoost = acceleration > 0.5 ? acceleration * CFG.VIRAL_ACCELERATION_WEIGHT : 0;

  const viralStatus =
    velocity > CFG.VIRAL_VIRAL_THRESHOLD ? "VIRAL"
    : isSurge ? "SURGING"
    : velocity > CFG.VIRAL_SURGE_THRESHOLD ? "ACCELERATING"
    : "STABLE";

  const recencyWeight = CFG.VIRAL_RECENCY_WEIGHT * (hist.length > 7 ? 1.5 : 1);

  const diminishingFactor = currentLiveScore > 70
    ? CFG.VIRAL_DIMINISHING_RETURNS + (1 - CFG.VIRAL_DIMINISHING_RETURNS) * (90 - currentLiveScore) / 20
    : 1;

  const baseAdjustment = accelBoost * recencyWeight + noveltyBoost;
  const surgeBonus = isSurge ? Math.min(15, surgeMagnitude * 1.2) : 0;
  const viralVelocityBonus = velocity > 2 ? Math.min(12, velocity * 0.8) : 0;
  const decayPenalty = (1 - timeDecay) * 3;

  let totalAdjustment = (baseAdjustment + surgeBonus + viralVelocityBonus) * diminishingFactor - decayPenalty;
  totalAdjustment = Math.max(-20, Math.min(35, totalAdjustment));

  // Record this sample AFTER computing momentum
  LIVE_HISTORY.push(iso, { score: currentLiveScore });

  return {
    velocity, acceleration, surgeMagnitude, isSurge, viralStatus,
    timeDecay, recencyWeight, noveltyBoost, surgeBonus, viralVelocityBonus,
    decayPenalty, totalAdjustment, history_points: hist.length, cold_start: false,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ML / SENTIMENT / HISTORY / ALERTS (unchanged from v12 but adjusted)
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
    if (!this.trained || sequence.length < 5) return this.simpleTrendForecast(sequence);
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
      for (let j = 0; j < input.length; j++) sum += (this.weights.input_hidden[i]?.[j] || 0) * input[j];
      hidden.push(Math.max(0, sum));
    }
    return hidden;
  }
  outputLayer(hidden) {
    let sum = this.weights.bias_output || 0;
    for (let i = 0; i < hidden.length; i++) sum += (this.weights.hidden_output[i] || 0) * hidden[i];
    return sum;
  }
  train(sequences) {
    if (sequences.length < 2) return;
    const inputs = sequences.map(s => this.normalizeSequence(s.slice(0, -1)));
    const targets = sequences.map(s => this.normalizeValue(s[s.length - 1]));
    if (!this.trained) this.initializeWeights(inputs[0].length);
    const lr = CFG.LEARNING_RATE || 0.01;
    let totalError = 0;
    for (let epoch = 0; epoch < 10; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        const hidden = this.forwardPass(inputs[i]);
        const output = this.outputLayer(hidden);
        const error = targets[i] - output;
        for (let j = 0; j < hidden.length; j++) {
          this.weights.hidden_output[j] = (this.weights.hidden_output[j] || 0) + lr * error * hidden[j];
        }
        this.weights.bias_output = (this.weights.bias_output || 0) + lr * error;
        for (let j = 0; j < this.weights.input_hidden.length; j++) {
          const hd = error * (this.weights.hidden_output[j] || 0) * (hidden[j] > 0 ? 1 : 0);
          for (let k = 0; k < inputs[i].length; k++) this.weights.input_hidden[j][k] += lr * hd * inputs[i][k];
          this.weights.bias_hidden[j] = (this.weights.bias_hidden[j] || 0) + lr * hd;
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
  }
  initializeWeights(inputSize) {
    const hiddenSize = CFG.HIDDEN_LAYERS?.[0] || 32;
    this.weights.input_hidden = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.input_hidden[i] = [];
      for (let j = 0; j < inputSize; j++) this.weights.input_hidden[i][j] = (Math.random() - 0.5) * 0.1;
    }
    this.weights.hidden_output = Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * 0.1);
    this.weights.bias_hidden = Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * 0.1);
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
    if (seq.length < 4) return { forecast: seq[seq.length - 1] || 0, confidence: 0.3 };
    const recent = seq.slice(-7);
    const slope = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
    const forecast = Math.min(99, Math.max(0, Math.round(recent[recent.length - 1] + slope * 3)));
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
    return Math.min(0.95, Math.abs(prediction - last) / 30);
  }
}

const mlModel = new CrisisMLModel();

function trainMLModel(store) {
  if (!CFG.ML_ENABLED) return;
  const sequences = [];
  for (const iso in store) {
    const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
    if (hist.length >= 8) {
      for (let i = 5; i < hist.length - 1; i++) sequences.push(hist.slice(i - 5, i + 1));
    }
  }
  if (sequences.length >= 10) mlModel.train(sequences);
}

function mlEnhancedForecast(iso, currentScore) {
  const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
  if (hist.length < 5) {
    return {
      fc: currentScore, ml_forecast: currentScore, trad_forecast: currentScore,
      confidence: 0.2, trend: "insufficient_data", esc: false, slope: 0,
      anomaly_probability: 0, ml_trained: mlModel.trained,
      training_count: mlModel.trainingCount, history_points: hist.length,
    };
  }
  const mlPred = mlModel.predict(hist);
  const trad = trendForecast(hist, currentScore);
  const blended = Math.round(mlPred.forecast * 0.6 + trad.fc * 0.4);
  return {
    fc: clamp(blended),
    ml_forecast: mlPred.forecast,
    trad_forecast: trad.fc,
    confidence: Math.min(0.95, Math.max(0.3, (mlPred.confidence + trad.confidence) / 2)),
    trend: mlPred.trend || trad.trend,
    esc: blended > currentScore + 5,
    slope: trad.slope,
    anomaly_probability: mlPred.anomaly_probability || 0.1,
    ml_trained: mlModel.trained,
    training_count: mlModel.trainingCount,
    history_points: hist.length,
  };
}

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = ['peace','ceasefire','truce','agreement','aid','humanitarian','relief','recovery','stabilize','improve','progress','positive','good','great','excellent','success','successful','hope','hopeful','resolution'];
    this.negativeWords = ['war','conflict','violence','attack','bomb','missile','strike','kill','death','casualty','destroy','collapse','crisis','emergency','famine','hunger','disease','outbreak','escalate','worsen','deteriorate','critical','severe','dire','catastrophe','disaster','devastating'];
    this.strongNegative = ['exterminate','genocide','massacre','pogrom','ethnic cleansing','starvation','catastrophic'];
    this.positivePhrases = ['negotiations progress','peace talks','aid delivered','ceasefire holds','reconstruction','recovery efforts'];
    this.negativePhrases = ['escalation of','intensified fighting','heavy casualties','civilians killed','mass displacement','health system collapse','food insecurity worsens','drought intensifies'];
  }
  analyze(text) {
    if (!text || text.length < 10) return { score: 0, label: "neutral", confidence: 0.5, key_terms: [] };
    const lower = text.toLowerCase();
    let score = 0, matches = 0;
    for (const w of this.positiveWords) if (lower.includes(w)) { score += 0.15; matches++; }
    for (const w of this.negativeWords) if (lower.includes(w)) { score -= 0.2; matches++; }
    for (const w of this.strongNegative) if (lower.includes(w)) { score -= 0.5; matches++; }
    for (const p of this.positivePhrases) if (lower.includes(p)) { score += 0.3; matches += 2; }
    for (const p of this.negativePhrases) if (lower.includes(p)) { score -= 0.4; matches += 2; }
    const totalMatches = Math.min(matches, 10);
    const normalized = Math.max(-1, Math.min(1, score / (Math.max(totalMatches, 1) / 2)));
    const keyTerms = [];
    for (const w of this.negativeWords) if (lower.includes(w)) keyTerms.push(w);
    for (const w of this.positiveWords) if (lower.includes(w)) keyTerms.push(w);
    let label, confidence;
    if (normalized > 0.2) { label = "positive"; confidence = Math.min(0.95, 0.5 + Math.abs(normalized) * 0.5); }
    else if (normalized < -0.2) { label = "negative"; confidence = Math.min(0.95, 0.5 + Math.abs(normalized) * 0.5); }
    else { label = "neutral"; confidence = 0.5 + (1 - Math.abs(normalized)) * 0.3; }
    const crisisIntensity = Math.min(1, Math.abs(normalized) * 1.5);
    return {
      score: Math.round(normalized * 100) / 100,
      label, confidence: Math.round(confidence * 100) / 100,
      key_terms: keyTerms.slice(0, 10),
      crisis_intensity: Math.round(crisisIntensity * 100) / 100,
      is_crisis: label === "negative" && crisisIntensity > 0.5,
    };
  }
}
const sentimentAnalyzer = new SentimentAnalyzer();

function analyzeCountrySentiment(iso, store) {
  if (!CFG.SENTIMENT_ENABLED) return null;
  const c = store[iso];
  const signals = c.signals || {};
  const text = [];
  if (signals.whoOutbreaks?.length) text.push(signals.whoOutbreaks.map(o => o.disease + " outbreak " + o.severity).join(" "));
  if (signals.gdacs?.title) text.push(signals.gdacs.title);
  if (signals.acledEvents > 0) text.push(signals.acledEvents + " conflict events, " + signals.acledFatalities + " fatalities");
  const dims = c.dims || {};
  if (dims.food > 70) text.push("severe food insecurity " + dims.food + "/100");
  if (dims.conflict > 70) text.push("intense conflict " + dims.conflict + "/100");
  if (dims.displacement > 70) text.push("mass displacement " + dims.displacement + "/100");
  if (text.length === 0) return null;
  const fullText = text.join(". ");
  return { ...sentimentAnalyzer.analyze(fullText), sources_analyzed: text.length, text_sample: fullText.slice(0, 200) };
}

class HistoricalDataStore {
  constructor() { this.data = {}; this.lastCleanup = Date.now(); }
  store(iso, data) {
    if (!this.data[iso]) this.data[iso] = [];
    this.data[iso].push({ timestamp: Date.now(), ...data });
    const cutoff = Date.now() - CFG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    this.data[iso] = this.data[iso].filter(d => d.timestamp > cutoff);
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
    const xMean = mean(timestamps), yMean = mean(scores);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (timestamps[i] - xMean) * (scores[i] - yMean);
      den += (timestamps[i] - xMean) ** 2;
    }
    const slope = den ? num / den : 0;
    return {
      direction: slope > 0 ? "worsening" : slope < 0 ? "improving" : "stable",
      slope: slope * 86400000 * 7,
      points: n, start_score: scores[0], end_score: scores[scores.length - 1],
      change: scores[scores.length - 1] - scores[0],
    };
  }
  exportData(iso, format = "json") {
    const data = this.data[iso] || [];
    if (format === "csv") {
      let csv = "timestamp,score,displacement,economic\n";
      for (const d of data) csv += `${d.timestamp},${d.score},${d.displacement || 0},${d.economic || 0}\n`;
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
        triggered.push({ iso, name: c.name, score: c.score, threshold: this.thresholds.global, type: "global", message: `${c.name} has reached ${c.score}/100.` });
        this.lastAlerts[key] = now;
      }
    }
    const hist = LIVE_HISTORY.get(iso, 30).map(s => s.score);
    if (hist.length >= 7) {
      const delta = hist[hist.length - 1] - hist[hist.length - 7];
      if (delta > 10) {
        const key = `${iso}_rapid`;
        if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
          triggered.push({ iso, name: c.name, score: c.score, delta, type: "rapid_deterioration", message: `${c.name} score rose ${delta} points in recorded window.` });
          this.lastAlerts[key] = now;
        }
      }
    }
    for (const a of triggered) this.sendAlert(a);
    return triggered;
  }
  async sendAlert(alert) {
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "crisis_alert", timestamp: new Date().toISOString(), ...alert }) });
      } catch (e) { console.warn("Webhook failed:", e); }
    }
    if (this.email) console.log(`📧 ALERT to ${this.email}: ${alert.message}`);
    console.log(`🚨 ALERT: ${alert.message}`);
  }
  setThreshold(type, value) { if (this.thresholds.hasOwnProperty(type)) this.thresholds[type] = value; }
}
const alertManager = new AlertManager();

// ════════════════════════════════════════════════════════════════════════════
//  LIVE DATA FETCHERS
// ════════════════════════════════════════════════════════════════════════════

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok: true, data: r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok: false, error: e.message }));

async function fetchUSGS() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json()));
    if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true };
  } catch {}
  return { data: [], live: false };
}
async function fetchEMSC() {
  try {
    const r = await safeFetch(fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.json()));
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
    const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.json()));
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
    { key: "flood_discharge", url: "https://flood-api.open-meteo.com/v1/flood?latitude=15.35&longitude=44.21&daily=river_discharge&forecast_days=3", path: ["daily","river_discharge"], transform: arr => Math.max(...(arr || [0])) },
    { key: "wind_speed", url: "https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&current_weather=true&hourly=wind_speed_10m&forecast_days=1", path: ["current_weather","windspeed"], transform: v => v || 0 },
    { key: "precip_total", url: "https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=precipitation&forecast_days=3", path: ["hourly","precipitation"], transform: arr => (arr || []).reduce((a, b) => a + b, 0) },
    { key: "uv_max", url: "https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&daily=uv_index_max&forecast_days=3", path: ["daily","uv_index_max"], transform: arr => Math.max(...(arr || [0])) },
    { key: "cloud_avg", url: "https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=cloudcover&forecast_days=3", path: ["hourly","cloudcover"], transform: arr => mean(arr || [0]) },
    { key: "lightning_max", url: "https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=lightning_potential&forecast_days=1", path: ["hourly","lightning_potential"], transform: arr => Math.max(...(arr || [0])) },
  ];
  for (const ep of endpoints) {
    try {
      const r = await safeFetch(fetch(ep.url).then(r => r.json()));
      if (r.ok) {
        let val = r.data;
        for (const seg of ep.path) val = val?.[seg];
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
    { iso: "NGA", lat: 6.5, lon: 3.4, name: "Lagos" },
    { iso: "IND", lat: 28.6, lon: 77.2, name: "Delhi" },
    { iso: "CHN", lat: 39.9, lon: 116.4, name: "Beijing" },
    { iso: "BGD", lat: 23.8, lon: 90.4, name: "Dhaka" },
    { iso: "EGY", lat: 30.0, lon: 31.2, name: "Cairo" },
    { iso: "PAK", lat: 24.9, lon: 67.1, name: "Karachi" },
    { iso: "THA", lat: 13.8, lon: 100.5, name: "Bangkok" },
    { iso: "TUR", lat: 41.0, lon: 28.9, name: "Istanbul" },
    { iso: "BRA", lat: -23.5, lon: -46.6, name: "Sao Paulo" },
    { iso: "ETH", lat: 9.0, lon: 38.7, name: "Addis Ababa" },
    { iso: "KEN", lat: -1.3, lon: 36.8, name: "Nairobi" },
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
    const [alerts, storms] = await Promise.all([
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Extreme").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Severe").then(r => r.json())),
    ]);
    const out = {
      extreme_alerts: alerts.ok ? (alerts.data?.features?.length || 0) : 0,
      storm_alerts: storms.ok ? (storms.data?.features?.length || 0) : 0,
    };
    return { data: out, live: out.extreme_alerts > 0 || out.storm_alerts > 0 };
  } catch {}
  return { data: { extreme_alerts: 0, storm_alerts: 0 }, live: false };
}
async function fetchDiseaseSh() {
  try {
    const r = await safeFetch(fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=50").then(r => r.json()));
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
    return { data: { displacement }, live: Object.keys(displacement).length > 0 };
  } catch {}
  return { data: { displacement: {} }, live: false };
}
async function fetchWHO() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml").then(r => r.json()));
    if (r.ok && r.data?.items) {
      const outbreaks = {};
      r.data.items.forEach(item => {
        const title = (item.title || "").toLowerCase();
        const kws = ["cholera","ebola","mpox","measles","polio","dengue","malaria"];
        for (const kw of kws) {
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
  const [usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr, who] = await Promise.all([
    fetchUSGS(), fetchEMSC(), fetchNASA(), fetchGDACS(), fetchIFRC(),
    fetchHeatStress(), fetchWeatherHazards(), fetchAirQuality(), fetchNOAA(),
    fetchDiseaseSh(), fetchWorldBankAll(), fetchUNHCR(), fetchWHO(),
  ]);
  return { usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr, who };
}

// ════════════════════════════════════════════════════════════════════════════
//  EXTRACT SIGNALS
// ════════════════════════════════════════════════════════════════════════════

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  const signals = {};
  let liveEvidenceCount = 0;
  const evidenceSources = [];

  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= CFG.QUAKE_MAG_THRESHOLD) {
    liveEvidenceCount++; evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = topQuake.properties.place.split(",")[0].trim();
  }

  const emscQuakes = (live.emsc.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) return false;
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a, b) => (b.properties?.mag || 0) > (a.properties?.mag || 0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= CFG.QUAKE_MAG_THRESHOLD) {
    liveEvidenceCount++; evidenceSources.push("EMSC");
    if (!signals.quakeMag) signals.quakeMag = topEMSC.properties.mag;
    if (!signals.quakePlace) signals.quakePlace = topEMSC.properties?.flynn_region || null;
  }

  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const coords = ev.geometry?.[0]?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  if (nasaEvents.length > 0) {
    liveEvidenceCount++; evidenceSources.push("NASA");
    signals.nasaEventCount = nasaEvents.length;
    signals.nasaEvents = nasaEvents;
  }

  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) {
      const affected = f.properties?.affectedcountries || [];
      return affected.some(c => c.iso3 === iso);
    }
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topGDACS = gdacsEvents.length > 0 ? gdacsEvents.reduce((a, b) => {
    const aS = a.properties?.alertscore || 0;
    const bS = b.properties?.alertscore || 0;
    return bS > aS ? b : a;
  }) : null;
  if (topGDACS) {
    liveEvidenceCount++; evidenceSources.push("GDACS");
    signals.gdacs = topGDACS;
    signals.gdacsAlert = topGDACS?.properties?.alertlevel?.toLowerCase() || null;
    signals.gdacsEventType = topGDACS?.properties?.eventtype || null;
    signals.gdacsCount = gdacsEvents.length;
    signals.gdacsAllEvents = gdacsEvents;
  }

  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length > 0) {
    liveEvidenceCount++; evidenceSources.push("IFRC");
    signals.ifrcCount = ifrcEvents.length;
    signals.ifrcEvents = ifrcEvents;
  }

  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= CFG.OPENMETEO_HEAT_THRESHOLD) {
    liveEvidenceCount++; evidenceSources.push("Open-Meteo Heat");
    signals.maxTempC = maxTempC;
  }

  if (live.hazards.live) {
    liveEvidenceCount++; evidenceSources.push("Open-Meteo Hazards");
    signals.hazards = live.hazards.data;
  }

  const aqData = live.aq.data[iso] || null;
  if (aqData && aqData.pm25 >= CFG.OPENMETEO_PM25_THRESHOLD) {
    liveEvidenceCount++; evidenceSources.push("Open-Meteo AQ");
    signals.aq = aqData;
  }

  if (iso === "USA" && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) {
    liveEvidenceCount++; evidenceSources.push("NOAA");
    signals.noaa = live.noaa.data;
  }

  const diseaseRow = (live.disease.data || []).find(d => {
    const cn = d.country || d.country_name || "";
    return cn.toLowerCase() === name || name.includes(cn.toLowerCase()) || cn.toLowerCase().includes(name);
  });
  if (diseaseRow && diseaseRow.active > CFG.DISEASE_ACTIVE_THRESHOLD) {
    liveEvidenceCount++; evidenceSources.push("disease.sh");
    signals.diseaseActive = diseaseRow.active;
    signals.diseaseName = "COVID-19";
  }

  const whoData = live.who?.data || null;
  if (whoData && whoData[iso]?.length > 0) {
    liveEvidenceCount++; evidenceSources.push("WHO");
    signals.whoOutbreaks = whoData[iso];
  }

  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
  const wbPoverty = live.wb.poverty.data[iso] || null;
  const wbPopulation = live.wb.population.data[iso] || null;

  if (wbPopulation && wbPopulation.value > 0) { liveEvidenceCount++; evidenceSources.push("WB Population"); signals.population = wbPopulation.value; }
  if (wbInflation && wbInflation.value > CFG.WB_INFLATION_THRESHOLD) { liveEvidenceCount++; evidenceSources.push("WB Inflation"); signals.wbInflation = wbInflation; }
  if (wbGdpGrowth && wbGdpGrowth.value < 0) { liveEvidenceCount++; evidenceSources.push("WB GDP"); signals.wbGdpGrowth = wbGdpGrowth; }
  if (wbUnemployment && wbUnemployment.value > CFG.WB_UNEMPLOYMENT_THRESHOLD) { liveEvidenceCount++; evidenceSources.push("WB Unemployment"); signals.wbUnemployment = wbUnemployment; }
  if (wbPoverty && wbPoverty.value > CFG.WB_POVERTY_THRESHOLD) { liveEvidenceCount++; evidenceSources.push("WB Poverty"); signals.wbPoverty = wbPoverty; }

  const displacement = live.unhcr.data.displacement[iso] || null;
  const totalDisplaced = displacement ? (displacement.refugees || 0) + (displacement.idps || 0) + (displacement.asylum_seekers || 0) : 0;
  if (totalDisplaced > 0) {
    liveEvidenceCount++; evidenceSources.push("UNHCR");
    signals.refugees = displacement?.refugees || 0;
    signals.idps = displacement?.idps || 0;
    signals.asylum_seekers = displacement?.asylum_seekers || 0;
    signals.totalDisplaced = totalDisplaced;
  }

  signals.liveEvidenceCount = liveEvidenceCount;
  signals.evidenceSources = [...new Set(evidenceSources)];
  return signals;
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILD STORE — Pure Live Scoring
// ════════════════════════════════════════════════════════════════════════════

function buildStore(liveData) {
  const store = {};

  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const priorDims = buildPriorDims(Math.round((country.fsi_score / 120) * 100), country.types);
    const floor = fsiFloor(iso);

    let signals = {};
    let dims = priorDims;
    let liveScore = 0;
    let confidence = 0;
    let audit = [];
    let sources = [];

    if (liveData) {
      signals = extractSignals(iso, liveData);
      const live = computeLiveScore(iso, signals, priorDims);
      dims = live.dimensions;
      liveScore = live.score;
      confidence = live.confidence;
      audit = live.audit;
      sources = live.sources;
    }

    // ── VIRAL MOMENTUM on real recorded history ─────────────────────────
    const viral = computeViralMomentum(iso, liveScore);

    // ── FINAL SCORE ─────────────────────────────────────────────────────
    // liveScore is the primary driver. FSI floor only applies when there
    // IS live evidence — otherwise the country is explicitly "no live data".
    let finalScore;
    if (sources.length === 0) {
      finalScore = CFG.NO_LIVE_DATA_SCORE;
    } else {
      const viralAdjusted = Math.max(0, liveScore + viral.totalAdjustment);
      finalScore = Math.max(floor, Math.min(99, Math.round(viralAdjusted)));
    }

    store[iso] = {
      ...country,
      dims,
      score: finalScore,
      priorScore: floor,
      liveBoost: finalScore - floor,
      audit,
      signals,
      sources,
      evidence_confidence: confidence,
      spillover: 0,
      ml_forecast: null,
      sentiment: null,
      historical_trend: null,
      fsi_score: country.fsi_score,
      fsi_rank: country.fsi_rank,
      fsi_band: country.fsi_band,
      __wst: null,
      __viral_metrics: viral,
      time_metrics: {
        velocity: viral.velocity,
        acceleration: viral.acceleration,
        surge_magnitude: viral.surgeMagnitude,
        is_surge: viral.isSurge,
        viral_status: viral.viralStatus,
        time_decay: viral.timeDecay,
        recency_weight: viral.recencyWeight,
        novelty_boost: viral.noveltyBoost,
        surge_bonus: viral.surgeBonus,
        viral_velocity_bonus: viral.viralVelocityBonus,
        decay_penalty: viral.decayPenalty,
        total_adjustment: viral.totalAdjustment,
        history_points: viral.history_points,
        cold_start: viral.cold_start,
      },
    };
  }

  // ── SPILLOVER (only amplifies countries that already have live evidence) ─
  for (const iso in store) {
    if (store[iso].sources.length === 0) continue; // no live evidence = no spillover
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const raw = Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    const diminishing = Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    store[iso].spillover = +(raw * diminishing).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }

  // ── WST metadata (for output, not scoring) ────────────────────────────
  for (const iso in store) {
    const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
    store[iso].__wst = {
      class: wst.class, tier: wst.tier,
      recovery_rate: wst.recovery_rate,
      structural_weight: wst.structural_weight || 0.5,
      fragility_multiplier: 1 + (1 - wst.recovery_rate) * 0.3,
      debt_sensitivity: wst.debt_sensitivity,
      reserve_currency: wst.reserve_currency || false,
      momentum_factor: wst.momentum_factor || 0.5,
      gdp_per_capita: wst.gdp_per_capita || 3000,
      extractive_penalty: wst.extractive_penalty || 10,
    };
  }

  if (CFG.ML_ENABLED) trainMLModel(store);

  for (const iso in store) {
    if (CFG.ML_ENABLED) store[iso].ml_forecast = mlEnhancedForecast(iso, store[iso].score);
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
//  PRIOR DIMS (structural, used as neutral starting point)
// ════════════════════════════════════════════════════════════════════════════

function buildPriorDims(base, types) {
  const has = t => types.includes(t);
  const cl = v => clamp(v, 0, 99);
  return {
    conflict:     cl(base * ((has("CW") || has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
    displacement: cl(base * ((has("REF") || has("CW") || has("CE")) ? 1.05 : (has("EQ") || has("FL") || has("TC")) ? 0.80 : 0.38)),
    food:         cl(base * ((has("FN") || has("DR")) ? 1.15 : (has("CE") || has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health:       cl(base * ((has("EP") || has("FN")) ? 1.10 : (has("CE") || has("CW") || has("EQ")) ? 0.85 : 0.52)),
    economic:     cl(base * ((has("CE") || has("CW") || has("FN") || has("DR") || has("ECO")) ? 0.85 : 0.42) + 10),
    climate:      cl(base * ((has("HEAT") || has("DR")) ? 0.88 : (has("FL") || has("TC") || has("WF")) ? 0.75 : 0.32) + 12),
    access:       cl(base * ((has("CW") || has("CE")) ? 0.88 : (has("EQ") || has("FL") || has("LS")) ? 0.72 : 0.32) + 8),
    political:    cl(base * ((has("CE") || has("CW") || has("REF") || has("POL")) ? 0.90 : 0.42) + 8),
  };
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
  return { detected: sP > h || sN > h, type: "cusum", stat: +maxS.toFixed(2), direction: sP > sN ? "up" : "down" };
}
function detectZScore(arr) {
  if (arr.length < 6) return { detected: false, type: "zscore", stat: 0, direction: "stable" };
  const baseline = arr.slice(0, -3), recent = arr.slice(-3);
  const mu = mean(baseline), sd = stddev(baseline);
  const z = (mean(recent) - mu) / sd;
  return { detected: Math.abs(z) >= CFG.ANOMALY_Z_THRESHOLD, type: "zscore", stat: +Math.abs(z).toFixed(2), direction: z > 0 ? "up" : "down" };
}
function detectChangepoint(arr) {
  if (arr.length < CFG.CHANGEPOINT_MIN_SEG * 2) return { detected: false, type: "changepoint", stat: 0, direction: "stable" };
  const n = arr.length, mid = Math.floor(n / 2);
  const muA = mean(arr.slice(0, mid)), sdA = stddev(arr.slice(0, mid));
  const muB = mean(arr.slice(mid)), sdB = stddev(arr.slice(mid));
  const kl = Math.log(sdB / sdA) + (sdA ** 2 + (muA - muB) ** 2) / (2 * sdB ** 2) - 0.5;
  return { detected: kl > 1.5, type: "changepoint", stat: +kl.toFixed(3), direction: muB > muA ? "up" : "down" };
}
function detectVolatilityRegime(arr) {
  if (arr.length < 8) return { detected: false, type: "volatility", stat: 0, direction: "stable" };
  const half = Math.floor(arr.length / 2);
  const ratio = stddev(arr.slice(half)) / stddev(arr.slice(0, half));
  return { detected: ratio > CFG.VOLATILITY_RATIO_THRESHOLD, type: "volatility", stat: +ratio.toFixed(2), direction: "unstable" };
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
    detected: consensus, severity, direction,
    methods_fired: fired.length, methods, z_score: maxZ,
    note: consensus ? `${fired.length}/4 anomaly methods agree: ${direction} — ${severity}`
          : fired.length === 1 ? `Weak signal (1/4 methods): ${fired[0].type}`
          : "No anomaly detected",
  };
}

function computeStoryHeat(iso, store, anom, mlForecast) {
  const c = store[iso];
  const s = c.signals || {};
  const vm = c.__viral_metrics || {};
  let heat = 0;
  const drivers = [];

  if (vm.viralStatus === "VIRAL") { const v = 20 + Math.min(15, Math.abs(vm.velocity) * 2); heat += v; drivers.push({ driver: "viral_status", points: v, detail: `🔥 VIRAL - ${Math.abs(vm.velocity).toFixed(1)} pts/day` }); }
  if (vm.isSurge) { const v = Math.min(15, vm.surgeMagnitude * 1.5); heat += v; drivers.push({ driver: "surge_detected", points: v, detail: `⚡ Surge: ${vm.surgeMagnitude.toFixed(1)} pt spike` }); }
  if (vm.noveltyBoost > 0) { const v = Math.min(10, vm.noveltyBoost); heat += v; drivers.push({ driver: "novelty", points: v, detail: "🆕 New crisis emergence" }); }
  if (anom.detected) {
    const sevPts = { WATCH: 4, MODERATE: 8, HIGH: 12, CRITICAL: 16, EXTREME: 18 };
    const v = sevPts[anom.severity] || 5;
    heat += v;
    drivers.push({ driver: "anomaly", points: v, detail: `${anom.methods_fired}/4 methods — ${anom.severity}` });
  }
  if (mlForecast?.anomaly_probability > 0.4) {
    const v = Math.min(10, mlForecast.anomaly_probability * 14);
    heat += v;
    drivers.push({ driver: "ml_forecast", points: +v.toFixed(1), detail: `${(mlForecast.anomaly_probability * 100).toFixed(0)}% anomaly probability` });
  }
  const ec = s.liveEvidenceCount || 0;
  if (ec >= 2) { const v = Math.min(15, ec * 2); heat += v; drivers.push({ driver: "evidence_breadth", points: v, detail: `${ec} independent live sources` }); }

  if (s.gdacsAlert === "red") { heat += 12; drivers.push({ driver: "gdacs_red", points: 12, detail: "GDACS Red alert active" }); }
  else if (s.gdacsAlert === "orange") { heat += 8; drivers.push({ driver: "gdacs_orange", points: 8, detail: "GDACS Orange alert active" }); }
  if (s.quakeMag >= 6.0) { heat += 10; drivers.push({ driver: "major_quake", points: 10, detail: `M${s.quakeMag.toFixed(1)}` }); }
  else if (s.quakeMag >= 5.0) { heat += 6; drivers.push({ driver: "moderate_quake", points: 6, detail: `M${s.quakeMag.toFixed(1)}` }); }
  if (s.whoOutbreaks?.length > 0) { const v = Math.min(10, s.whoOutbreaks.length * 3); heat += v; drivers.push({ driver: "who_outbreaks", points: v, detail: `${s.whoOutbreaks.length} WHO outbreaks` }); }
  if (s.totalDisplaced > 1_000_000) { const v = Math.min(15, Math.log10(s.totalDisplaced / 1_000_000 + 1) * 10); heat += v; drivers.push({ driver: "mass_displacement", points: +v.toFixed(1), detail: `${fmtPop(s.totalDisplaced)} displaced` }); }

  heat = Math.min(100, Math.round(heat));
  drivers.sort((a, b) => b.points - a.points);

  return {
    score: heat,
    is_breaking: heat >= 45,
    tier: heat >= 65 ? "BREAKING" : heat >= 45 ? "DEVELOPING" : heat >= 25 ? "NOTABLE" : "ROUTINE",
    top_drivers: drivers.slice(0, 3),
  };
}

function trendForecast(hist, current) {
  if (hist.length < 5) return { fc: current, trend: "stable", esc: false, slope: 0, confidence: 0.3 };
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
  if (score >= 85) return { tier: "IMMEDIATE", text: `Immediate humanitarian response required. All agencies mobilise.${an}` };
  if (score >= 75) return { tier: "URGENT", text: `Urgent response needed. Mobilise resources now.${an}` };
  if (score >= 60) return { tier: "HIGH", text: `Elevated concern. Prepare response and monitor daily.${an}` };
  if (score >= 40) return { tier: "MONITOR", text: `Monitor situation. Maintain readiness.${an}` };
  return { tier: "WATCH", text: `Routine monitoring. No immediate action required.${an}` };
}

function generatePDFReport(iso, store) {
  const c = store[iso];
  const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  return {
    title: `${c.name} Crisis Report`,
    generated: new Date().toISOString(),
    score: c.score,
    severity: severityLabel(c.score),
    evidence_confidence: c.evidence_confidence,
    sources: c.sources,
    dimensions: c.dims,
    trend: fc,
    anomaly: anom,
    evidence: c.signals,
    time_metrics: c.time_metrics,
    recommendation: recommendation(c.score, anom),
  };
}

function generateExportData(iso, store, format = "json") {
  const data = {
    iso, name: store[iso].name,
    timestamp: new Date().toISOString(),
    score: store[iso].score,
    evidence_confidence: store[iso].evidence_confidence,
    sources: store[iso].sources,
    dimensions: store[iso].dims,
    evidence: store[iso].signals,
    time_metrics: store[iso].time_metrics,
    historical: historyStore.getHistory(iso, 30),
  };
  if (format === "csv") {
    let csv = "timestamp,score,displacement,economic,food,health,momentum,velocity,acceleration\n";
    for (const d of data.historical) csv += `${new Date(d.timestamp).toISOString()},${d.score},${d.displacement || 0},${d.economic || 0},${d.food || 0},${d.health || 0},${d.momentum || 0},${d.velocity || 0},${d.acceleration || 0}\n`;
    return csv;
  }
  return data;
}

function generateWidget(iso, store) {
  const c = store[iso];
  const time = c.time_metrics || {};
  const vm = c.__viral_metrics || {};
  const s = c.signals || {};
  return `<div class="gcin-widget" style="background:#0f1a30;border:1px solid #2d3a5e;border-radius:12px;padding:16px;font-family:system-ui;max-width:320px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:20px;">${c.flag}</span>
      <span style="font-weight:600;color:#fff;font-size:16px;">${c.name}</span>
      ${vm.viralStatus === "VIRAL" ? '<span style="background:#ff375f20;color:#ff375f;padding:0 6px;border-radius:4px;font-size:10px;font-weight:700;">🔥 VIRAL</span>' : ""}
      ${vm.isSurge ? '<span style="background:#ff8c4220;color:#ff8c42;padding:0 6px;border-radius:4px;font-size:10px;font-weight:700;">⚡ SURGE</span>' : ""}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#7c9ec0;font-size:12px;">Live Crisis Score</span>
      <span style="color:#ff8a7a;font-size:20px;font-weight:700;">${c.score}/100</span>
    </div>
    <div style="width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:99px;margin:4px 0 8px;">
      <div style="height:100%;width:${c.score}%;background:${severityColor(c.score)};border-radius:99px;"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0;font-size:10px;color:#5a7a9a;">
      <span>Confidence: ${(c.evidence_confidence * 100).toFixed(0)}%</span>
      <span>Sources: ${c.sources.length}</span>
    </div>
    ${time.velocity !== undefined ? `<div style="display:flex;gap:12px;margin:4px 0;font-size:10px;color:#5a7a9a;">
      <span>📈 ${time.velocity > 0 ? "+" : ""}${time.velocity.toFixed(2)}/day</span>
      <span>🚀 ${(time.acceleration || 0).toFixed(2)}</span>
      ${time.viral_status ? `<span>🔥 ${time.viral_status}</span>` : ""}
    </div>` : ""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
      ${c.types.slice(0, 3).map(t => `<span style="background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:4px;font-size:10px;color:#b8cce8;">${ARC[t]?.l || t}</span>`).join("")}
    </div>
    ${s.gdacsAlert ? `<div style="margin-top:4px;font-size:10px;color:${s.gdacsAlert === "red" ? "#ff375f" : s.gdacsAlert === "orange" ? "#ff8c42" : "#6bc8ff"};">GDACS: ${s.gdacsAlert.toUpperCase()}</div>` : ""}
    <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.04);padding-top:8px;display:flex;justify-content:space-between;">
      <span style="font-size:10px;color:#5a7a9a;">${severityLabel(c.score)}</span>
      <a href="${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}" style="font-size:10px;color:#6bc8ff;text-decoration:none;">Read →</a>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  PAYLOAD BUILDER
// ════════════════════════════════════════════════════════════════════════════

function buildPayload(iso, store, ranked, opts = {}) {
  const c = store[iso];
  const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = hist.length >= 8 ? Math.round(hist[hist.length - 1] - hist[hist.length - 8]) : 0;
  const s = c.signals || {};
  const heat = computeStoryHeat(iso, store, anom, c.ml_forecast);
  const vm = c.__viral_metrics || {};

  const base = {
    iso, name: c.name, flag: c.flag,
    score: c.score,
    severity: severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    severity_color: severityColor(c.score),
    rank, total_countries: ranked.length,
    percentile: Math.round((1 - rank / ranked.length) * 100),
    slug: slugify(c.name),
    url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
    is_live: c.sources.length > 0,
    evidence_confidence: c.evidence_confidence,
    evidence_sources: c.sources,
    evidence_source_count: c.sources.length,
    no_live_data: c.sources.length === 0,
    fsi_floor_applied: Math.round(Math.min(CFG.FSI_CEILING_FOR_FLOOR, c.fsi_score) * CFG.FSI_FLOOR_FRACTION),
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
      history_points: hist.length,
    },
    anomaly: {
      detected: anom.detected, severity: anom.severity, direction: anom.direction,
      methods_fired: anom.methods_fired, z_score: anom.z_score, note: anom.note,
      methods: { cusum: anom.methods[0], zscore: anom.methods[1], changepoint: anom.methods[2], volatility: anom.methods[3] },
    },
    viral_momentum: CFG.VIRAL_ENABLED ? {
      velocity: vm.velocity || 0,
      acceleration: vm.acceleration || 0,
      surge_magnitude: vm.surgeMagnitude || 0,
      is_surge: vm.isSurge || false,
      viral_status: vm.viralStatus || "STABLE",
      total_adjustment: vm.totalAdjustment || 0,
      history_points: vm.history_points || 0,
      cold_start: vm.cold_start || false,
    } : null,
    spillover: {
      value: c.spillover,
      from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })),
    },
    story_heat: heat,
    live_evidence: {
      earthquake: s.quakeMag >= CFG.QUAKE_MAG_THRESHOLD ? { magnitude: s.quakeMag, location: s.quakePlace, source: "USGS/EMSC" } : null,
      nasa_events: s.nasaEventCount > 0 ? { count: s.nasaEventCount, source: "NASA EONET" } : null,
      gdacs: s.gdacs ? { alert_level: s.gdacsAlert, event_type: s.gdacsEventType, count: s.gdacsCount, source: "GDACS" } : null,
      ifrc: s.ifrcCount > 0 ? { count: s.ifrcCount, source: "IFRC GO" } : null,
      heat: s.maxTempC >= CFG.OPENMETEO_HEAT_THRESHOLD ? { max_temp_c: s.maxTempC, source: "Open-Meteo" } : null,
      hazards: s.hazards ? { ...s.hazards, source: "Open-Meteo" } : null,
      air_quality: s.aq ? { ...s.aq, source: "Open-Meteo AQ" } : null,
      noaa: s.noaa ? { ...s.noaa, source: "NOAA" } : null,
      disease: s.diseaseActive > 0 ? { disease: s.diseaseName, active: s.diseaseActive, source: "disease.sh" } : null,
      who_outbreaks: s.whoOutbreaks?.length > 0 ? { outbreaks: s.whoOutbreaks, source: "WHO" } : null,
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
      history_points: c.ml_forecast.history_points,
    } : null,
    sentiment: c.sentiment ? {
      score: c.sentiment.score, label: c.sentiment.label,
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
    time_metrics: c.time_metrics,
    export: {
      pdf: generatePDFReport(iso, store),
      widget: generateWidget(iso, store),
    },
    score_audit: {
      fsi_floor: c.priorScore,
      live_score: c.sources.length > 0 ? c.score - c.spillover : 0,
      adjustments: c.audit || [],
      spillover: c.spillover,
      final_score: c.score,
      methodology: "liveScore (from evidence) max'd with FSI structural floor; viral momentum applied on real history",
    },
    recommendation: recommendation(c.score, anom),
    region: c.region,
    fsi: { score: c.fsi_score, rank: c.fsi_rank, band: c.fsi_band },
    wst: c.__wst ? {
      class: c.__wst.class, tier: c.__wst.tier,
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
  if (s.totalDisplaced > 0) { kws.add(`${name} refugees`); kws.add(`${name} internally displaced`); }
  if (s.quakeMag >= 5.0) { kws.add(`${name} earthquake`); }
  if (s.gdacs) { kws.add(`${name} disaster alert`); kws.add(`${name} GDACS`); }
  if (s.diseaseActive > 1000) { kws.add(`${name} COVID-19`); }
  if (s.wbInflation?.value > 10) { kws.add(`${name} inflation crisis`); }
  kws.add(`${c.region} humanitarian crisis`);
  kws.add(`what is happening in ${name}`);
  kws.add(`${name} crisis latest news`);
  kws.add(`how to help ${name} crisis`);
  return [...kws].slice(0, 35);
}

function buildMetaDescription(iso, store) {
  const c = store[iso];
  const s = c.signals || {};
  const vm = c.__viral_metrics || {};
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  let parts = [`${c.name} LIVE crisis: score ${c.score}/100 (${severity}), #${rank} globally, ${c.sources.length} live sources`];
  if (vm.viralStatus === "VIRAL") parts.push(`🔥 VIRAL momentum: ${Math.abs(vm.velocity).toFixed(1)} pts/day`);
  else if (vm.isSurge) parts.push(`⚡ SURGE: ${vm.surgeMagnitude.toFixed(1)} pt spike`);
  if (s.totalDisplaced > 0) parts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.diseaseActive > 1000) parts.push(`${s.diseaseActive.toLocaleString()} COVID-19 cases`);
  if (s.quakeMag >= 4.5) parts.push(`M${s.quakeMag.toFixed(1)} earthquake`);
  return parts.slice(0, 3).join(". ") + ".";
}

function buildRelatedStories(iso, store, ranked) {
  const c = store[iso];
  return ranked.filter(r => r !== iso && (COUNTRIES[r].region === c.region || (COUNTRIES[iso].adj || []).includes(r))).slice(0, 5).map(r => ({
    iso: r, name: store[r].name, score: store[r].score,
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
        "headline": `${c.name} Crisis — Live Score ${c.score}/100 (${severity})`,
        "description": buildMetaDescription(iso, store),
        "url": url, "datePublished": now, "dateModified": now,
        "author": { "@type": "Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
        "publisher": { "@type": "Organization", "name": CFG.ARTICLE_SITE_NAME, "url": CFG.ARTICLE_BASE_URL,
          "logo": { "@type": "ImageObject", "url": CFG.ARTICLE_LOGO } },
        "mainEntityOfPage": { "@type": "WebPage", "@id": url },
        "articleSection": "Humanitarian Crisis",
        "keywords": keywords.slice(0, 15).join(", "),
        "about": { "@type": "Place", "name": c.name,
          "geo": { "@type": "GeoCoordinates", "longitude": c.cent[0], "latitude": c.cent[1] } },
      },
      { "@type": "FAQPage", "@id": `${url}#faq`, "mainEntity": faqs.map(f => ({
        "@type": "Question", "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a },
      })) },
      { "@type": "BreadcrumbList", "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": CFG.ARTICLE_BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "Crisis Hub", "item": `${CFG.ARTICLE_BASE_URL}/crisis` },
        { "@type": "ListItem", "position": 3, "name": c.name, "item": url },
      ] },
    ],
  };
}

function buildFAQs(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const vm = c.__viral_metrics || {};
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  const faqs = [];

  faqs.push({
    q: `What is the current humanitarian situation in ${c.name}?`,
    a: `${c.name} currently has a LIVE crisis score of ${c.score}/100, rated ${severity}, ranking #${rank} of ${Object.keys(store).length} countries monitored. This score is driven by ${c.sources.length} live evidence sources (${c.sources.join(", ") || "none"}).${vm.viralStatus === "VIRAL" ? ` The situation is VIRAL with ${Math.abs(vm.velocity).toFixed(1)} pts/day momentum.` : vm.isSurge ? ` A surge of ${vm.surgeMagnitude.toFixed(1)} points has been detected.` : ""}`,
  });

  if (s.totalDisplaced > 0) {
    faqs.push({
      q: `How many people have been displaced from ${c.name}?`,
      a: `UNHCR data indicates approximately ${fmtPop(s.totalDisplaced)} people have been displaced, including${s.refugees ? ` ${fmtPop(s.refugees)} refugees` : ""}${s.idps ? `, ${fmtPop(s.idps)} internally displaced persons (IDPs)` : ""}${s.asylum_seekers ? `, and ${fmtPop(s.asylum_seekers)} asylum-seekers` : ""}.`,
    });
  }
  if (s.diseaseActive > 1000) {
    faqs.push({ q: `What disease activity is being tracked in ${c.name}?`,
      a: `Live tracking shows ${s.diseaseActive.toLocaleString()} active COVID-19 cases.${s.whoOutbreaks?.length ? ` WHO also reports active outbreaks of ${s.whoOutbreaks.map(o => o.disease).join(", ")}.` : ""}` });
  }
  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0) {
    faqs.push({ q: `What is the economic situation in ${c.name}?`,
      a: `World Bank data${s.wbInflation ? ` shows inflation at ${s.wbInflation.value.toFixed(1)}%` : ""}${s.wbGdpGrowth?.value < 0 ? ` with GDP contraction of ${s.wbGdpGrowth.value.toFixed(1)}%` : ""}.` });
  }
  if (s.gdacs) {
    faqs.push({ q: `What disaster alerts are active for ${c.name}?`,
      a: `GDACS has a ${s.gdacsAlert?.toUpperCase() || "Green"} alert for ${c.name}${s.gdacsCount > 1 ? ` (${s.gdacsCount} events)` : ""}.` });
  }
  faqs.push({ q: `How can I help people affected by the crisis in ${c.name}?`,
    a: `You can support the humanitarian response in ${c.name} by donating to organisations active in the region, including UNHCR, WFP, UNICEF, MSF, and local NGOs.` });
  return faqs;
}

function buildSEOArticle(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const vm = c.__viral_metrics || {};
  const hist = LIVE_HISTORY.get(iso, 60).map(x => x.score);
  const anom = runAnomalyDetection(hist);
  const fc = trendForecast(hist, c.score);
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const topDims = [...DIMS].map(d => ({ ...d, val: c.dims[d.k] || 0 })).sort((a, b) => b.val - a.val);
  const delta = hist.length >= 8 ? hist[hist.length - 1] - hist[hist.length - 8] : 0;
  const keywords = buildKeywords(iso, store);
  const faqs = buildFAQs(iso, store, ranked);
  const primaryTypes = c.types.slice(0, 2).map(t => ARC[t]?.l || t).join(" and ");

  const headlineCandidates = [];
  if (vm.viralStatus === "VIRAL") headlineCandidates.push({ weight: 150 + Math.min(50, Math.abs(vm.velocity) * 3), text: `🔥 VIRAL CRISIS: ${c.name} Escalating at ${Math.abs(vm.velocity).toFixed(1)} Points/Day — ${severity} Alert` });
  if (vm.isSurge) headlineCandidates.push({ weight: 130 + Math.min(30, vm.surgeMagnitude * 2), text: `⚡ SURGE ALERT: ${c.name} Crisis Spikes ${vm.surgeMagnitude.toFixed(1)} Points` });
  if (s.gdacsAlert === "red") headlineCandidates.push({ weight: 115, text: `RED ALERT: ${c.name} Under Active GDACS Disaster Warning` });
  else if (s.gdacsAlert === "orange") headlineCandidates.push({ weight: 90, text: `${c.name} Issued Orange Disaster Alert` });
  if (s.totalDisplaced > 1_000_000) headlineCandidates.push({ weight: 100 + Math.min(50, s.totalDisplaced / 200_000), text: `${fmtPop(s.totalDisplaced)} Displaced: Inside ${c.name}'s ${primaryTypes} Emergency` });
  if (s.quakeMag >= 6.0) headlineCandidates.push({ weight: 95 + (s.quakeMag - 6) * 8, text: `M${s.quakeMag.toFixed(1)} Earthquake Strikes ${c.name}${s.quakePlace ? ` Near ${s.quakePlace}` : ""}` });
  if (s.whoOutbreaks?.length > 0) headlineCandidates.push({ weight: 85 + s.whoOutbreaks.length * 5, text: `WHO Confirms ${s.whoOutbreaks.map(o => o.disease[0].toUpperCase() + o.disease.slice(1)).join(" & ")} Outbreak in ${c.name}` });
  if (anom.detected && anom.severity === "EXTREME") headlineCandidates.push({ weight: 110, text: `Data Alert: ${c.name} Crisis Trajectory Just Broke Pattern — ${anom.methods_fired}/4 Models Agree` });
  headlineCandidates.push({ weight: 10, text: `${c.name} LIVE Crisis Score ${c.score}/100 (${severity}), Ranked #${rank} Globally` });

  headlineCandidates.sort((a, b) => b.weight - a.weight);
  const headline = headlineCandidates[0].text;

  const dekParts = [];
  if (vm.viralStatus === "VIRAL") dekParts.push(`🔥 VIRAL: ${Math.abs(vm.velocity).toFixed(1)} pts/day`);
  else if (vm.isSurge) dekParts.push(`⚡ SURGE: ${vm.surgeMagnitude.toFixed(1)} pt spike`);
  if (s.totalDisplaced > 0 && !headline.includes("Displaced")) dekParts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.gdacs) dekParts.push(`GDACS ${s.gdacsAlert?.toUpperCase()} alert`);
  dekParts.push(`LIVE · ${c.sources.length} sources · ${dateStr}`);
  const dek = dekParts.slice(0, 3).join(" · ");

  const metaDescription = buildMetaDescription(iso, store);

  const paragraphs = [];
  const ledeHook = vm.viralStatus === "VIRAL"
    ? `🔥 ${c.name} is experiencing a VIRAL crisis escalation with ${Math.abs(vm.velocity).toFixed(1)} points/day momentum`
    : vm.isSurge
    ? `⚡ A ${vm.surgeMagnitude.toFixed(1)}-point surge has been detected in ${c.name}'s crisis trajectory`
    : s.totalDisplaced > 1_000_000
    ? `More than ${fmtPop(s.totalDisplaced)} people have been forced from their homes in ${c.name}`
    : s.diseaseActive > 5000
    ? `Active COVID-19 case counts are stretching ${c.name}'s healthcare system`
    : s.quakeMag >= 6.0
    ? `A magnitude ${s.quakeMag.toFixed(1)} earthquake has struck ${c.name}`
    : c.sources.length > 0
    ? `Live evidence from ${c.sources.length} independent sources places ${c.name} at ${severity}`
    : `${c.name} currently has no active live crisis evidence`;

  paragraphs.push(`## Overview\n\n${ledeHook}, according to LIVE data compiled from 20+ global sources. The live crisis index places ${c.name} at **${c.score} out of 100**, rated **${severity}**, ranked **#${rank} of ${Object.keys(store).length} countries** as of ${dateStr}. Evidence confidence: **${(c.evidence_confidence * 100).toFixed(0)}%** from ${c.sources.length} sources.`);

  if (c.sources.length > 0) paragraphs.push(`## Live Evidence Sources\n\nThis score is driven by: **${c.sources.join(", ")}**.`);
  if (vm.viralStatus || vm.isSurge) paragraphs.push(`## 🔥 Viral Momentum\n\nVelocity: **${Math.abs(vm.velocity).toFixed(2)} pts/day**, acceleration: **${vm.acceleration.toFixed(2)}**. Status: **${vm.viralStatus}**. ${vm.isSurge ? `Surge of ${vm.surgeMagnitude.toFixed(1)} points detected.` : ""} Recorded history: ${vm.history_points} samples.`);
  if (s.gdacs) paragraphs.push(`## 🚨 Disaster Alert (GDACS)\n\n**${s.gdacsAlert?.toUpperCase()} alert** active${s.gdacsCount > 1 ? ` (${s.gdacsCount} events)` : ""}. Event type: **${s.gdacsEventType || "Multiple"}**.`);
  if (s.quakeMag >= 4.5) paragraphs.push(`## Earthquake Activity\n\n**Magnitude ${s.quakeMag.toFixed(1)} earthquake** near ${s.quakePlace || "region"}.`);
  if (s.nasaEventCount > 0) paragraphs.push(`## NASA EONET\n\n**${s.nasaEventCount} active natural events** recorded.`);
  if (s.totalDisplaced > 0) {
    const parts = [];
    if (s.refugees) parts.push(`${fmtPop(s.refugees)} refugees`);
    if (s.idps) parts.push(`${fmtPop(s.idps)} IDPs`);
    if (s.asylum_seekers) parts.push(`${fmtPop(s.asylum_seekers)} asylum-seekers`);
    paragraphs.push(`## Displacement\n\nUNHCR: **${fmtPop(s.totalDisplaced)} people** displaced${parts.length ? ` (${parts.join(", ")})` : ""}.`);
  }
  if (s.whoOutbreaks?.length > 0) paragraphs.push(`## Disease Outbreaks (WHO)\n\nActive: **${s.whoOutbreaks.map(o => o.disease).join(", ")}**.`);
  if (s.diseaseActive > 1000) paragraphs.push(`## Public Health\n\n**${s.diseaseActive.toLocaleString()} active COVID-19 cases** tracked live.`);
  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0 || s.wbUnemployment?.value > 10) {
    const parts = [];
    if (s.wbInflation) parts.push(`inflation **${s.wbInflation.value.toFixed(1)}%**`);
    if (s.wbGdpGrowth?.value < 0) parts.push(`GDP contraction **${s.wbGdpGrowth.value.toFixed(1)}%**`);
    if (s.wbUnemployment?.value > 10) parts.push(`unemployment **${s.wbUnemployment.value.toFixed(1)}%**`);
    paragraphs.push(`## Economic Pressure (World Bank)\n\n${parts.join(" and ")}.`);
  }
  if (anom.detected) paragraphs.push(`## Statistical Anomaly\n\n**${anom.methods_fired}/4** methods agree: **${anom.direction}** (severity: **${anom.severity}**).`);
  const dimRows = topDims.slice(0, 5).map(d => `- **${d.l}**: ${c.dims[d.k]}/100 (weight: ${(d.w * 100).toFixed(0)}%)`).join("\n");
  paragraphs.push(`## Score Breakdown\n\n${dimRows}\n\nFSI structural floor: **${c.priorScore}** · Live score contribution: **${c.score - c.spillover}** · Spillover: **${c.spillover}**`);
  paragraphs.push(`## Response Priorities\n\nTier: **${recommendation(c.score, anom).tier}** — ${recommendation(c.score, anom).text}`);
  paragraphs.push(`## FAQ\n\n${faqs.map(f => `**${f.q}**\n\n${f.a}`).join("\n\n")}`);

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
  <link rel="canonical" href="${url}">
  <script type="application/ld+json">${JSON.stringify(buildJSONLD(iso, store, ranked))}</script>
  <style>
    body { background:#030b18; color:#eef4ff; font-family:system-ui; max-width:900px; margin:0 auto; padding:2rem; line-height:1.7; }
    h1 { font-family:Georgia,serif; font-size:2.5rem; }
    .live-badge { display:inline-block; padding:0.2rem 0.7rem; border-radius:99px; font-size:0.65rem; font-weight:700; background:rgba(107,200,255,0.15); color:#6bc8ff; border:1px solid rgba(107,200,255,0.3); }
    .sev-badge { display:inline-block; padding:0.2rem 0.7rem; border-radius:99px; font-size:0.65rem; font-weight:700; }
    .viral-badge { display:inline-block; padding:0.2rem 0.6rem; border-radius:99px; font-size:0.6rem; font-weight:700; background:rgba(255,55,95,0.2); color:#ff375f; animation:pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
    .score-num { font-size:3rem; font-weight:800; }
    .metric { display:inline-block; background:rgba(255,255,255,0.03); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem; color:#8aa8c8; margin-right:0.4rem; }
    h2 { font-family:Georgia,serif; font-size:1.5rem; margin:1.5rem 0 0.5rem; }
  </style>
</head>
<body>
  <article>
    <header>
      <div>
        <span class="live-badge">● LIVE · ${c.sources.length} sources</span>
        <span class="sev-badge" style="background:${severityColor(c.score)}22;color:${severityColor(c.score)};border:1px solid ${severityColor(c.score)}55;">${severityEmoji(c.score)} ${severity}</span>
        ${vm.viralStatus === "VIRAL" ? `<span class="viral-badge">🔥 VIRAL</span>` : ""}
        ${vm.isSurge ? `<span class="viral-badge" style="background:rgba(255,140,66,0.2);color:#ff8c42;">⚡ SURGE</span>` : ""}
      </div>
      <h1>${headline}</h1>
      <p style="font-size:1.1rem;color:#d8e6ff;">${dek}</p>
      <div style="display:flex;gap:1rem;align-items:baseline;">
        <span class="score-num" style="color:${severityColor(c.score)};">${c.score}</span>
        <span style="color:#5a7a9a;">/100 · Ranked #${rank}</span>
      </div>
      <div style="margin:0.5rem 0;">
        <span class="metric">Confidence: ${(c.evidence_confidence * 100).toFixed(0)}%</span>
        ${vm.velocity !== undefined ? `<span class="metric">📈 ${vm.velocity > 0 ? "+" : ""}${vm.velocity.toFixed(2)}/day</span>` : ""}
        ${vm.acceleration !== undefined ? `<span class="metric">🚀 ${vm.acceleration.toFixed(2)}</span>` : ""}
        <span class="metric">🧠 ML: ${c.ml_forecast ? (c.ml_forecast.anomaly_probability * 100).toFixed(0) + "%" : "—"}</span>
      </div>
      <p style="color:#8aa8c8;">${metaDescription}</p>
    </header>
    <div>
      ${articleBody.split("\n\n").filter(p => p.trim()).map(p => {
        if (p.startsWith("##")) return `<h2>${p.replace(/^##+\s*/, "")}</h2>`;
        if (p.startsWith("-")) return `<ul>${p.split("\n").map(l => `<li>${l.replace(/^-\s*/, "")}</li>`).join("")}</ul>`;
        return `<p>${p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
      }).join("")}
    </div>
    <div style="margin-top:2rem;border-top:1px solid rgba(255,255,255,0.05);padding-top:1rem;font-size:0.8rem;color:#5a7a9a;">
      <p><strong>Live sources active:</strong> ${c.sources.join(", ") || "none"}</p>
      <p><strong>FSI 2024 structural floor:</strong> ${c.priorScore}/100 (${c.fsi_band})</p>
      <p><strong>Methodology:</strong> Live evidence points drive the score; FSI is a structural floor only. Viral momentum computed on real recorded history.</p>
    </div>
  </article>
</body>
</html>`;

  return { headline, dek, slug, url, metaDescription, keywords, faqs, body_markdown: articleBody, body_html: html, word_count: words, read_time_minutes: minutes };
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
      <news:publication><news:name>${CFG.ARTICLE_SITE_NAME}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${now}</news:publication_date>
      <news:title>${p.name} LIVE Crisis Score ${p.score}/100 (${p.severity})</news:title>
      <news:keywords>${(p.seo_keywords || []).slice(0, 10).join(", ")}</news:keywords>
    </news:news>
  </url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;
}

function escapeXml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildRSSFeed(finalIsos, store, ranked) {
  const now = new Date();
  const MAX_ITEMS = 30;
  const items = finalIsos.slice(0, MAX_ITEMS).map(iso => {
    const article = buildSEOArticle(iso, store, ranked);
    const c = store[iso];
    const vm = c.__viral_metrics || {};
    const categories = [...new Set(c.types.map(t => ARC[t]?.l || t))];
    return `
  <item>
    <title>${escapeXml(article.headline)}</title>
    <link>${article.url}</link>
    <guid isPermaLink="true">${article.url}</guid>
    <pubDate>${now.toUTCString()}</pubDate>
    <description>${escapeXml(article.dek)}</description>
    ${categories.map(cat => `<category>${escapeXml(cat)}</category>`).join("\n    ")}
    ${vm.viralStatus === "VIRAL" ? `<category>🔥 VIRAL CRISIS</category>` : ""}
    ${vm.isSurge ? `<category>⚡ SURGE DETECTED</category>` : ""}
    ${c.signals?.gdacsAlert === "red" ? `<category>🚨 GDACS RED ALERT</category>` : ""}
    <category>Sources: ${c.sources.length}</category>
    <category>Confidence: ${(c.evidence_confidence * 100).toFixed(0)}%</category>
    <content:encoded><![CDATA[${article.body_html}]]></content:encoded>
  </item>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${CFG.ARTICLE_SITE_NAME}</title>
  <link>${CFG.ARTICLE_BASE_URL}</link>
  <atom:link href="${CFG.ARTICLE_BASE_URL}/api/top-story?format=rss" rel="self" type="application/rss+xml"/>
  <description>LIVE sensor-driven global humanitarian crisis intelligence. Scores are driven by live evidence, not annual reports.</description>
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

  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
  if (req.method !== "GET") { res.writeHead(405, CORS); res.end(JSON.stringify({ error: "Method not allowed" })); return; }

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
      min_confidence: parseFloat(url.searchParams.get("min_confidence") || "0"),
    };
    if (Number.isNaN(params.top)) params.top = 179;
    if (Number.isNaN(params.threshold)) params.threshold = 0;
    if (Number.isNaN(params.min_confidence)) params.min_confidence = 0;
    params.top = Math.min(CFG.MAX_TOP_N, Math.max(1, params.top));
  } catch {
    res.writeHead(400, CORS); res.end(JSON.stringify({ error: "Bad request URL" })); return;
  }

  if (params.region) {
    for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
      if (aliases.includes(params.region)) { params.region = canonical; break; }
    }
  }

  if (params.q && !params.iso) {
    const resolved = findIsoByName(params.q);
    if (!resolved) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: `Could not resolve "${params.q}"`, available: Object.entries(COUNTRIES).map(([iso, d]) => `${iso} (${d.name})`).sort() }));
      return;
    }
    params.iso = resolved;
  }

  const isoList = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s]) : [];
  const invalidISOs = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => !COUNTRIES[s]) : [];
  if (invalidISOs.length) {
    res.writeHead(404, CORS);
    res.end(JSON.stringify({ error: `Unknown ISO codes: ${invalidISOs.join(", ")}`, available: Object.keys(COUNTRIES).sort() }));
    return;
  }

  try {
    const liveData = await fetchAllLive(isoList.length ? isoList : Object.keys(COUNTRIES));
    const store = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].score >= params.threshold);
    else finalIsos = ranked.slice(0, params.top);

    // ── PURE LIVE MODE: gate by evidence ─────────────────────────────────
    if (params.force_live) {
      finalIsos = finalIsos.filter(iso =>
        store[iso].sources.length >= CFG.MIN_LIVE_EVIDENCE_SOURCES &&
        store[iso].evidence_confidence >= params.min_confidence
      );

      if (finalIsos.length === 0) {
        res.writeHead(200, CORS);
        res.end(JSON.stringify({
          meta: {
            generated_at: new Date().toISOString(),
            elapsed_ms: Date.now() - start,
            mode: "empty",
            message: "No countries currently have qualifying live evidence.",
            min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
            min_confidence: params.min_confidence,
          },
          countries: [],
        }, null, 2));
        return;
      }
    }

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const data = generateExportData(iso, store, params.export);
      const ct = params.export === "csv" ? "text/csv" : "application/json";
      const filename = `${iso}_live_crisis_data.${params.export === "csv" ? "csv" : "json"}`;
      res.writeHead(200, { ...CORS, "Content-Type": ct, "Content-Disposition": `attachment; filename="${filename}"` });
      res.end(typeof data === "string" ? data : JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const widget = generateWidget(finalIsos[0], store);
      res.writeHead(200, { ...CORS, "Content-Type": "text/html; charset=utf-8" });
      res.end(widget);
      return;
    }

    for (const iso of Object.keys(store)) {
      const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
      const anom = runAnomalyDetection(hist);
      store[iso].__heat = computeStoryHeat(iso, store, anom, store[iso].ml_forecast);
    }

    if (params.rss) {
      let rssIsos = finalIsos;
      if (!isoList.length && !params.region && params.threshold === 0) {
        rssIsos = Object.keys(store)
          .filter(iso => store[iso].sources.length > 0)
          .sort((a, b) => store[b].__heat.score - store[a].__heat.score)
          .slice(0, params.top || 30);
      }
      const feed = buildRSSFeed(rssIsos, store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" });
      res.end(feed);
      return;
    }

    if (params.wst) {
      const wstSummary = Object.keys(store).filter(iso => store[iso].sources.length > 0).map(iso => ({
        iso, name: store[iso].name, flag: store[iso].flag,
        wst_class: store[iso].__wst.class,
        wst_tier: store[iso].__wst.tier,
        score: store[iso].score,
        evidence_confidence: store[iso].evidence_confidence,
        sources: store[iso].sources,
        recovery_rate: store[iso].__wst.recovery_rate,
        velocity: store[iso].time_metrics?.velocity || 0,
        viral_status: store[iso].__viral_metrics?.viralStatus || "STABLE",
      })).sort((a, b) => a.wst_tier - b.wst_tier || b.score - a.score);

      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          mode: "pure_live_wst",
          countries_with_live_evidence: wstSummary.length,
        },
        countries: wstSummary,
      }, null, 2));
      return;
    }

    if (params.breaking) {
      const heatRanked = Object.keys(store)
        .filter(iso => store[iso].sources.length > 0)
        .map(iso => ({ iso, heat: store[iso].__heat }))
        .filter(x => x.heat.score >= 20)
        .sort((a, b) => b.heat.score - a.heat.score)
        .slice(0, params.top || 20);

      const feed = heatRanked.map(({ iso, heat }) => {
        const p = buildPayload(iso, store, ranked, { summary: true });
        const vm = store[iso].__viral_metrics || {};
        const s = store[iso].signals || {};
        return {
          iso, name: p.name, flag: p.flag, url: p.url,
          score: p.score, severity: p.severity,
          evidence_confidence: p.evidence_confidence,
          evidence_sources: p.evidence_sources,
          story_heat: heat.score, tier: heat.tier, top_drivers: heat.top_drivers,
          headline_hint: p.meta_description,
          velocity: p.time_metrics?.velocity || 0,
          viral_status: vm.viralStatus || "STABLE",
          is_surge: vm.isSurge || false,
          gdacs_alert: s.gdacsAlert || null,
        };
      });

      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          mode: "breaking_live",
          methodology: "Pure live story heat from viral momentum + anomaly consensus + evidence breadth.",
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
      keywords: params.keywords, related: params.related, schema: params.schema,
      summary: params.summary, article: params.article, ml: params.ml,
      sentiment: params.sentiment, history: params.history,
    };
    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, opts));

    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";

    let comparison = null;
    if (mode === "comparison" && finalIsos.length === 2) {
      const [a, b] = finalIsos.map(iso => {
        const c = store[iso];
        const vm = c.__viral_metrics || {};
        const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
        const fc = trendForecast(hist, c.score);
        const anom = runAnomalyDetection(hist);
        return {
          iso, name: c.name, flag: c.flag, score: c.score,
          severity: severityLabel(c.score), rank: ranked.indexOf(iso) + 1,
          evidence_confidence: c.evidence_confidence,
          sources: c.sources,
          dimensions: Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
          forecast_7d: fc.fc,
          anomaly_detected: anom.detected, anomaly_severity: anom.severity,
          velocity: c.time_metrics?.velocity || 0,
          viral_status: vm.viralStatus || "STABLE",
          is_surge: vm.isSurge || false,
        };
      });
      comparison = {
        countries: [a, b],
        differentiators: DIMS.map(d => {
          const diff = a.dimensions[d.k] - b.dimensions[d.k];
          return { dimension: d.l, [a.iso]: a.dimensions[d.k], [b.iso]: b.dimensions[d.k], difference: diff };
        }).filter(d => Math.abs(d.difference) >= 10),
        verdict: `${a.flag} ${a.name} (${a.score}) vs ${b.flag} ${b.name} (${b.score})`,
        evidence_comparison: `${a.name}: ${a.evidence_confidence.toFixed(2)} confidence from ${a.sources.length} sources; ${b.name}: ${b.evidence_confidence.toFixed(2)} from ${b.sources.length} sources`,
      };
    }

    const allAnomalies = Object.keys(store).filter(iso => runAnomalyDetection(LIVE_HISTORY.get(iso, 60).map(s => s.score)).detected);
    const viralCountries = Object.keys(store).filter(iso => store[iso].__viral_metrics?.viralStatus === "VIRAL");
    const surgeCountries = Object.keys(store).filter(iso => store[iso].__viral_metrics?.isSurge);
    const gdacsRedAlerts = Object.keys(store).filter(iso => store[iso].signals?.gdacsAlert === "red");
    const liveCountries = Object.keys(store).filter(iso => store[iso].sources.length > 0);
    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        scoring_model: "PURE_LIVE_v13",
        description: "Live evidence is the primary driver. FSI is a structural floor only. Countries with no live evidence score 0 and are excluded when force_live=true.",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_evidence: liveCountries.length,
        live_countries: liveCountries.slice(0, 30),
        anomalies_detected: allAnomalies.length,
        viral_countries: viralCountries.length,
        viral_isos: viralCountries.slice(0, 10),
        surge_countries: surgeCountries.length,
        surge_isos: surgeCountries.slice(0, 10),
        gdacs_red_alerts: gdacsRedAlerts.length,
        gdacs_red_isos: gdacsRedAlerts.slice(0, 10),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        data_policy: {
          type: "Pure live evidence + structural floor",
          min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
          fsi_role: "structural floor only (multiplied by " + CFG.FSI_FLOOR_FRACTION + ")",
          no_live_data_score: CFG.NO_LIVE_DATA_SCORE,
          evidence_saturation: CFG.EVIDENCE_SATURATION,
          viral_momentum: {
            description: "Computed on REAL recorded history (LIVE_HISTORY ring buffer). Not synthetic.",
            thresholds: { surge: CFG.VIRAL_SURGE_THRESHOLD, viral: CFG.VIRAL_VIRAL_THRESHOLD },
          },
        },
        data_sources: {
          usgs: { live: liveData.usgs.live, events: liveData.usgs.data?.length ?? 0 },
          emsc: { live: liveData.emsc.live, events: liveData.emsc.data?.length ?? 0 },
          nasa: { live: liveData.nasa.live, events: liveData.nasa.data?.length ?? 0 },
          gdacs: { live: liveData.gdacs.live, events: liveData.gdacs.data?.length ?? 0 },
          ifrc: { live: liveData.ifrc.live, events: liveData.ifrc.data?.length ?? 0 },
          heat: { live: liveData.heat.live, countries: Object.keys(liveData.heat.data || {}).length },
          hazards: { live: liveData.hazards.live },
          aq: { live: liveData.aq.live, cities: Object.keys(liveData.aq.data || {}).length },
          noaa: { live: liveData.noaa.live },
          disease: { live: liveData.disease.live, countries: liveData.disease.data?.length ?? 0 },
          wb: { live: Object.values(liveData.wb).some(v => v.live) },
          unhcr: { live: liveData.unhcr.live },
          who: { live: liveData.who.live },
        },
        endpoints: {
          single: "GET /api/top-story",
          top_n: "GET /api/top-story?top=10",
          iso: "GET /api/top-story?iso=SOM",
          compare: "GET /api/top-story?iso=SOM,YEM",
          min_confidence: "GET /api/top-story?min_confidence=0.5",
          live_only: "GET /api/top-story?force_live=true (default)",
          include_no_live: "GET /api/top-story?force_live=false",
          breaking: "GET /api/top-story?format=breaking",
          rss: "GET /api/top-story?format=rss",
          article: "GET /api/top-story?iso=SOM&format=article",
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
