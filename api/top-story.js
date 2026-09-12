"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v13.0 "FRESCO" SCORING ENGINE
//  ────────────────────────────────────────────────────────────────────────
//  🏆 EIGHT-LAYER EVIDENCE-WEIGHTED BAYESIAN SCORING PIPELINE
//  🌍 179 COUNTRIES · REAL FSI 2024 PRIORS · WST STRUCTURAL ANALYSIS
//  ⏰ HALF-LIFE DECAY · CORROBORATION · COVERAGE ENTROPY · CONSENSUS GATE v2
//  🧠 KALMAN-SMOOTHED MOMENTUM · ENSEMBLE ML · SENTIMENT · HISTORY
//  📡 28+ LIVE APIS · RSS · SEO ARTICLES · JSON-LD
//
//  SCORING LAYERS (L1..L8):
//    L1 Evidence Ledger     — typed, weighted, time-stamped evidence
//    L2 Bayesian Posterior  — FSI as prior, evidence as Gaussian update
//    L3 Freshness Kernel    — per-source exponential decay (τ per source)
//    L4 Corroboration       — super-linear reinforcement for independent sources
//    L5 Coverage Entropy    — Shannon-style breadth across crisis categories
//    L6 Dynamic Ceiling     — ceiling = f(FSI tier, coverage, corroboration)
//    L7 Temporal Fusion     — Kalman-smoothed velocity + acceleration
//    L8 Consensus Gate v2   — 95/97/99 require 2/3/4 categories + Tier-A source
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

  // ═══ v13.0 FRESCO SCORING ENGINE ═══
  FRESCO: {
    ENABLED: true,
    // L2 — Bayesian prior variance (in score-points²) by FSI band
    PRIOR_SIGMA_BY_BAND: {
      "Very High Alert":  8,
      "High Alert":       9,
      "Alert":            10,
      "High Warning":     11,
      "Elevated Warning": 12,
      "Warning":          13,
      "Less Stable":      14,
      "Stable":           15,
      "More Stable":      16,
      "Sustainable":      18,
    },
    // L3 — half-life (hours) per source family. Annual series = 90 days.
    HALF_LIFE_HOURS: {
      "USGS":              6,
      "EMSC":              6,
      "NASA":              12,
      "GDACS":             12,
      "IFRC":              24,
      "WHO":               48,
      "WHO DON":           24,
      "Open-Meteo Heat":   12,
      "Open-Meteo Hazards":12,
      "Open-Meteo AQ":     18,
      "NOAA":              12,
      "disease.sh":        24,
      "UNHCR":             168,   // 7 days
      "WB Population":     8760,  // 1 year
      "WB Inflation":      2160,  // 90 days
      "WB GDP":            2160,
      "WB Unemployment":   2160,
      "WB Poverty":        2160,
      "WST Extractivism":  8760,
      "WST Debt Shock":    2160,
      "WST Currency":      720,
      "WST Supply Chain":  720,
      "ML Anomaly":        48,
      "Spillover":         72,
    },
    DEFAULT_HALF_LIFE_HOURS: 48,
    // L1 — per-source base weight and credibility
    SOURCE_WEIGHT: {
      "USGS": 1.00, "EMSC": 0.85, "NASA": 0.90, "GDACS": 1.00, "IFRC": 0.80,
      "WHO": 0.95, "WHO DON": 1.00, "Open-Meteo Heat": 0.70,
      "Open-Meteo Hazards": 0.65, "Open-Meteo AQ": 0.60, "NOAA": 0.90,
      "disease.sh": 0.55, "UNHCR": 0.95,
      "WB Population": 0.40, "WB Inflation": 0.75, "WB GDP": 0.75,
      "WB Unemployment": 0.70, "WB Poverty": 0.75,
      "WST Extractivism": 0.60, "WST Debt Shock": 0.70,
      "WST Currency": 0.85, "WST Supply Chain": 0.80,
      "ML Anomaly": 0.50, "Spillover": 0.45,
    },
    DEFAULT_SOURCE_WEIGHT: 0.50,
    // L4 — corroboration: independent sources in same category reinforce
    CORROBORATION_ENABLED: true,
    CORROBORATION_BOOST_MAX: 1.6,     // max ×1.6 multiplier for fully corroborated category
    CORROBORATION_HALF_SAT: 2.0,      // sources needed for 50% of boost
    // L5 — coverage entropy weights across categories
    CATEGORIES: ["conflict","disaster","health","displacement","economic","climate"],
    COVERAGE_BOOST_MAX: 12,           // max +12 pts for full multi-domain coverage
    // L6 — dynamic ceiling
    CEILING_TIER_CAP: [
      { minFsi: 100, cap: 40 },
      { minFsi: 90,  cap: 35 },
      { minFsi: 70,  cap: 28 },
      { minFsi: 50,  cap: 20 },
      { minFsi: 30,  cap: 12 },
      { minFsi: 0,   cap: 8  },
    ],
    CEILING_EVIDENCE_MULT_MAX: 1.8,
    CEILING_HARD_MAX: 99,
    // L7 — temporal fusion
    KALMAN_PROCESS_NOISE: 1.5,
    KALMAN_OBS_NOISE: 4.0,
    VELOCITY_WINDOW: 5,
    VELOCITY_WEIGHT: 0.35,
    ACCELERATION_WEIGHT: 0.15,
    MOMENTUM_CAP: 12,
    DIMINISHING_NEAR_99: 0.55,
    // L8 — consensus gate v2
    GATE_ENABLED: true,
    GATE_TIER_A_SOURCES: ["GDACS","USGS","WHO DON","UNHCR","WST Currency"],
    GATE_REQUIREMENTS: {
      95: { minCategories: 2, requireTierA: true  },
      97: { minCategories: 3, requireTierA: true  },
      99: { minCategories: 4, requireTierA: true  },
    },
  },

  // ─── legacy flags kept for API compatibility ───
  BOOST_CAP_TIERS: [
    { minFsi: 100, cap: 40 }, { minFsi: 90, cap: 35 }, { minFsi: 70, cap: 28 },
    { minFsi: 50, cap: 20 },  { minFsi: 30, cap: 12 }, { minFsi: 0, cap: 8 },
  ],
  EVIDENCE_CEILING_ENABLED: true,
  EVIDENCE_MULTIPLIER_MAX: 2.2,
  EVIDENCE_PER_SOURCE: 0.12,
  LIVE_EVIDENCE_WEIGHT_MAX: 0.5,
  LIVE_EVIDENCE_PER_SOURCE: 0.08,
  VIRAL_WEIGHT_CAP: 0.85,
  FSI_BLEND_HEADROOM: 20,
  CONSENSUS_GATE_ENABLED: true,
  CONSENSUS_GATE_THRESHOLD: 95,
  CONSENSUS_CATEGORIES: {
    disaster: { required: true, label: "Disaster/Climate" },
    health: { required: false, label: "Health/Epidemic" },
    displacement: { required: false, label: "Mass Displacement" },
    economic: { required: false, label: "Economic Collapse" },
    conflict: { required: false, label: "Active Conflict" },
  },

  VIRAL_ENABLED: true,
  VIRAL_WINDOW_HOURS: 24,
  VIRAL_ACCELERATION_WEIGHT: 2.5,
  VIRAL_MOMENTUM_DECAY: 0.3,
  VIRAL_NOVELTY_BONUS: 5,
  VIRAL_RECENCY_WEIGHT: 0.4,
  VIRAL_SURGE_THRESHOLD: 3,
  VIRAL_VIRAL_THRESHOLD: 8,
  VIRAL_DIMINISHING_RETURNS: 0.7,

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

  GDACS_ENABLED: true,
  GDACS_ALERT_LEVELS: ["Green", "Orange", "Red"],
  GDACS_BOOST_RED: 12,
  GDACS_BOOST_ORANGE: 7,
  GDACS_BOOST_GREEN: 3,

  WB_ENABLED: true,
  WB_INFLATION_THRESHOLD: 5,
  WB_GDP_CONTRACTION_THRESHOLD: -1,
  WB_UNEMPLOYMENT_THRESHOLD: 10,
  WB_POVERTY_THRESHOLD: 5,
  WB_MAX_INFLATION_BOOST: 10,
  WB_MAX_GDP_BOOST: 10,
  WB_MAX_UNEMPLOYMENT_BOOST: 8,
  WB_MAX_POVERTY_BOOST: 10,

  UNHCR_ENABLED: true,
  UNHCR_DISPLACEMENT_THRESHOLD: 100_000,
  UNHCR_MAX_DISPLACEMENT_BOOST: 25,

  WHO_ENABLED: true,
  WHO_OUTBREAK_BOOST: 4,
  WHO_MAX_OUTBREAK_BOOST: 10,

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
  OPENMETEO_HEAT_THRESHOLD: 35,
  OPENMETEO_MAX_HAZARD_BOOST: 15,

  IFRC_ENABLED: true,
  IFRC_EVENT_BOOST: 4,
  IFRC_MAX_EVENT_BOOST: 10,

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

// ════════════════════════════════════════════════════════════════════════════
//  FSI 2024 WITH REAL LAT/LNG CENTROIDS  (unchanged from v12.4)
// ════════════════════════════════════════════════════════════════════════════

const FSI_2024 = {
  SOM: { name:"Somalia",              flag:"🇸🇴", fsi_score:111.3, rank:1, region:"africa", fsi_band:"Very High Alert", lat: 5.1521, lng: 46.1996 },
  SDN: { name:"Sudan",                flag:"🇸🇩", fsi_score:109.3, rank:2, region:"africa", fsi_band:"Very High Alert", lat: 15.5007, lng: 32.5599 },
  SSD: { name:"South Sudan",          flag:"🇸🇸", fsi_score:109.0, rank:3, region:"africa", fsi_band:"High Alert", lat: 6.8770, lng: 31.3070 },
  SYR: { name:"Syria",                flag:"🇸🇾", fsi_score:108.1, rank:4, region:"middleeast", fsi_band:"High Alert", lat: 34.8021, lng: 38.9968 },
  COD: { name:"Congo-Kinshasa",       flag:"🇨🇩", fsi_score:106.7, rank:5, region:"africa", fsi_band:"High Alert", lat: -4.0383, lng: 21.7587 },
  YEM: { name:"Yemen",                flag:"🇾🇪", fsi_score:106.6, rank:6, region:"middleeast", fsi_band:"High Alert", lat: 15.5527, lng: 48.5164 },
  AFG: { name:"Afghanistan",          flag:"🇦🇫", fsi_score:103.9, rank:7, region:"asia", fsi_band:"High Alert", lat: 33.9391, lng: 67.7100 },
  CAF: { name:"Central African Rep.", flag:"🇨🇫", fsi_score:103.9, rank:8, region:"africa", fsi_band:"High Alert", lat: 6.6111, lng: 20.9394 },
  HTI: { name:"Haiti",                flag:"🇭🇹", fsi_score:103.5, rank:9, region:"americas", fsi_band:"High Alert", lat: 18.9712, lng: -72.2852 },
  TCD: { name:"Chad",                 flag:"🇹🇩", fsi_score:102.7, rank:10, region:"africa", fsi_band:"High Alert", lat: 15.4542, lng: 18.7322 },
  MMR: { name:"Myanmar",              flag:"🇲🇲", fsi_score:100.0, rank:11, region:"asia", fsi_band:"High Alert", lat: 21.9162, lng: 95.9560 },
  ETH: { name:"Ethiopia",             flag:"🇪🇹", fsi_score:98.1, rank:12, region:"africa", fsi_band:"Alert", lat: 9.1450, lng: 40.4897 },
  PSE: { name:"Palestine",            flag:"🇵🇸", fsi_score:97.8, rank:13, region:"middleeast", fsi_band:"Alert", lat: 31.9522, lng: 35.2332 },
  MLI: { name:"Mali",                 flag:"🇲🇱", fsi_score:97.3, rank:14, region:"africa", fsi_band:"Alert", lat: 17.5707, lng: -3.9962 },
  NGA: { name:"Nigeria",              flag:"🇳🇬", fsi_score:96.6, rank:15, region:"africa", fsi_band:"Alert", lat: 9.0820, lng: 8.6753 },
  LBY: { name:"Libya",                flag:"🇱🇾", fsi_score:96.5, rank:16, region:"africa", fsi_band:"Alert", lat: 26.3351, lng: 17.2283 },
  GIN: { name:"Guinea",               flag:"🇬🇳", fsi_score:96.4, rank:17, region:"africa", fsi_band:"Alert", lat: 9.9456, lng: -9.6966 },
  ZWE: { name:"Zimbabwe",             flag:"🇿🇼", fsi_score:95.7, rank:18, region:"africa", fsi_band:"Alert", lat: -19.0154, lng: 29.1549 },
  NER: { name:"Niger",                flag:"🇳🇪", fsi_score:95.2, rank:19, region:"africa", fsi_band:"Alert", lat: 17.6078, lng: 8.0817 },
  CMR: { name:"Cameroon",             flag:"🇨🇲", fsi_score:94.3, rank:20, region:"africa", fsi_band:"Alert", lat: 7.3697, lng: 12.3547 },
  BFA: { name:"Burkina Faso",         flag:"🇧🇫", fsi_score:94.2, rank:21, region:"africa", fsi_band:"Alert", lat: 12.2383, lng: -1.5616 },
  UKR: { name:"Ukraine",              flag:"🇺🇦", fsi_score:93.1, rank:22, region:"europe", fsi_band:"Alert", lat: 48.3794, lng: 31.1656 },
  LBN: { name:"Lebanon",              flag:"🇱🇧", fsi_score:92.7, rank:23, region:"middleeast", fsi_band:"Alert", lat: 33.8547, lng: 35.8623 },
  BDI: { name:"Burundi",              flag:"🇧🇮", fsi_score:92.6, rank:24, region:"africa", fsi_band:"Alert", lat: -3.3731, lng: 29.9189 },
  MOZ: { name:"Mozambique",           flag:"🇲🇿", fsi_score:92.5, rank:25, region:"africa", fsi_band:"Alert", lat: -18.6657, lng: 35.5296 },
  ERI: { name:"Eritrea",              flag:"🇪🇷", fsi_score:92.1, rank:26, region:"africa", fsi_band:"Alert", lat: 15.1794, lng: 39.7823 },
  PAK: { name:"Pakistan",             flag:"🇵🇰", fsi_score:91.7, rank:27, region:"asia", fsi_band:"Alert", lat: 30.3753, lng: 69.3451 },
  UGA: { name:"Uganda",               flag:"🇺🇬", fsi_score:91.1, rank:28, region:"africa", fsi_band:"Alert", lat: 1.3733, lng: 32.2903 },
  COG: { name:"Congo-Brazzaville",    flag:"🇨🇬", fsi_score:90.2, rank:29, region:"africa", fsi_band:"Alert", lat: -0.2280, lng: 15.8277 },
  VEN: { name:"Venezuela",            flag:"🇻🇪", fsi_score:89.0, rank:30, region:"americas", fsi_band:"Alert", lat: 6.4238, lng: -66.5897 },
  IRQ: { name:"Iraq",                 flag:"🇮🇶", fsi_score:88.6, rank:31, region:"middleeast", fsi_band:"Alert", lat: 33.2232, lng: 43.6793 },
  GNB: { name:"Guinea-Bissau",        flag:"🇬🇼", fsi_score:88.4, rank:32, region:"africa", fsi_band:"Alert", lat: 11.8037, lng: -15.1804 },
  LKA: { name:"Sri Lanka",            flag:"🇱🇰", fsi_score:88.2, rank:33, region:"asia", fsi_band:"Alert", lat: 7.8731, lng: 80.7718 },
  MRT: { name:"Mauritania",           flag:"🇲🇷", fsi_score:87.0, rank:34, region:"africa", fsi_band:"High Warning", lat: 21.0079, lng: -10.9408 },
  LBR: { name:"Liberia",              flag:"🇱🇷", fsi_score:86.9, rank:35, region:"africa", fsi_band:"High Warning", lat: 6.4281, lng: -9.4295 },
  KEN: { name:"Kenya",                flag:"🇰🇪", fsi_score:86.5, rank:36, region:"africa", fsi_band:"High Warning", lat: -0.0236, lng: 37.9062 },
  BGD: { name:"Bangladesh",           flag:"🇧🇩", fsi_score:85.9, rank:37, region:"asia", fsi_band:"High Warning", lat: 23.6850, lng: 90.3563 },
  AGO: { name:"Angola",               flag:"🇦🇴", fsi_score:85.6, rank:38, region:"africa", fsi_band:"High Warning", lat: -11.2027, lng: 17.8739 },
  CIV: { name:"Ivory Coast",          flag:"🇨🇮", fsi_score:85.3, rank:39, region:"africa", fsi_band:"High Warning", lat: 7.5400, lng: -5.5471 },
  PRK: { name:"North Korea",          flag:"🇰🇵", fsi_score:84.9, rank:40, region:"asia", fsi_band:"High Warning", lat: 40.3399, lng: 127.5101 },
  TUR: { name:"Turkey",               flag:"🇹🇷", fsi_score:84.0, rank:41, region:"europe", fsi_band:"High Warning", lat: 38.9637, lng: 35.2433 },
  GNQ: { name:"Equatorial Guinea",    flag:"🇬🇶", fsi_score:83.7, rank:42, region:"africa", fsi_band:"High Warning", lat: 1.6508, lng: 10.2679 },
  IRN: { name:"Iran",                 flag:"🇮🇷", fsi_score:82.9, rank:43, region:"middleeast", fsi_band:"High Warning", lat: 32.4279, lng: 53.6880 },
  EGY: { name:"Egypt",                flag:"🇪🇬", fsi_score:82.8, rank:44, region:"africa", fsi_band:"High Warning", lat: 26.8206, lng: 30.8025 },
  SLE: { name:"Sierra Leone",         flag:"🇸🇱", fsi_score:82.6, rank:45, region:"africa", fsi_band:"High Warning", lat: 8.4606, lng: -11.7799 },
  RWA: { name:"Rwanda",               flag:"🇷🇼", fsi_score:81.8, rank:46, region:"africa", fsi_band:"High Warning", lat: -1.9403, lng: 29.8739 },
  COM: { name:"Comoros",              flag:"🇰🇲", fsi_score:81.7, rank:47, region:"africa", fsi_band:"High Warning", lat: -11.6455, lng: 43.3333 },
  DJI: { name:"Djibouti",             flag:"🇩🇯", fsi_score:81.6, rank:48, region:"africa", fsi_band:"High Warning", lat: 11.8251, lng: 42.5903 },
  RUS: { name:"Russia",               flag:"🇷🇺", fsi_score:81.6, rank:48, region:"europe", fsi_band:"High Warning", lat: 61.5240, lng: 105.3188 },
  ZMB: { name:"Zambia",               flag:"🇿🇲", fsi_score:81.2, rank:50, region:"africa", fsi_band:"High Warning", lat: -13.1339, lng: 27.8493 },
  TGO: { name:"Togo",                 flag:"🇹🇬", fsi_score:81.1, rank:51, region:"africa", fsi_band:"High Warning", lat: 8.6195, lng: 0.8248 },
  MWI: { name:"Malawi",               flag:"🇲🇼", fsi_score:80.5, rank:52, region:"africa", fsi_band:"High Warning", lat: -13.2543, lng: 34.3015 },
  MDG: { name:"Madagascar",           flag:"🇲🇬", fsi_score:79.8, rank:53, region:"africa", fsi_band:"High Warning", lat: -18.7669, lng: 46.8691 },
  PNG: { name:"Papua New Guinea",     flag:"🇵🇬", fsi_score:78.8, rank:54, region:"oceania", fsi_band:"High Warning", lat: -6.3150, lng: 143.9555 },
  KHM: { name:"Cambodia",             flag:"🇰🇭", fsi_score:78.6, rank:55, region:"asia", fsi_band:"High Warning", lat: 12.5657, lng: 104.9910 },
  HND: { name:"Honduras",             flag:"🇭🇳", fsi_score:78.1, rank:56, region:"americas", fsi_band:"High Warning", lat: 15.2000, lng: -86.2419 },
  NPL: { name:"Nepal",                flag:"🇳🇵", fsi_score:78.0, rank:57, region:"asia", fsi_band:"High Warning", lat: 28.3949, lng: 84.1240 },
  SWZ: { name:"Eswatini",             flag:"🇸🇿", fsi_score:77.6, rank:58, region:"africa", fsi_band:"High Warning", lat: -26.5225, lng: 31.4659 },
  SLB: { name:"Solomon Islands",      flag:"🇸🇧", fsi_score:77.6, rank:58, region:"oceania", fsi_band:"High Warning", lat: -9.6457, lng: 160.1562 },
  NIC: { name:"Nicaragua",            flag:"🇳🇮", fsi_score:76.7, rank:60, region:"americas", fsi_band:"High Warning", lat: 12.8654, lng: -85.2072 },
  GMB: { name:"Gambia",               flag:"🇬🇲", fsi_score:76.1, rank:61, region:"africa", fsi_band:"Elevated Warning", lat: 13.4432, lng: -15.3101 },
  TZA: { name:"Tanzania",             flag:"🇹🇿", fsi_score:75.7, rank:62, region:"africa", fsi_band:"Elevated Warning", lat: -6.3690, lng: 34.8888 },
  COL: { name:"Colombia",             flag:"🇨🇴", fsi_score:75.6, rank:63, region:"americas", fsi_band:"Elevated Warning", lat: 4.5709, lng: -74.2973 },
  PHL: { name:"Philippines",          flag:"🇵🇭", fsi_score:75.1, rank:64, region:"asia", fsi_band:"Elevated Warning", lat: 12.8797, lng: 121.7740 },
  GTM: { name:"Guatemala",            flag:"🇬🇹", fsi_score:74.9, rank:65, region:"americas", fsi_band:"Elevated Warning", lat: 15.7835, lng: -90.2308 },
  KGZ: { name:"Kyrgyzstan",           flag:"🇰🇬", fsi_score:74.9, rank:65, region:"asia", fsi_band:"Elevated Warning", lat: 41.2044, lng: 74.7661 },
  TLS: { name:"East Timor",           flag:"🇹🇱", fsi_score:74.8, rank:67, region:"asia", fsi_band:"Elevated Warning", lat: -8.8742, lng: 125.7275 },
  LSO: { name:"Lesotho",              flag:"🇱🇸", fsi_score:74.6, rank:68, region:"africa", fsi_band:"Elevated Warning", lat: -29.6100, lng: 28.2336 },
  JOR: { name:"Jordan",               flag:"🇯🇴", fsi_score:74.3, rank:69, region:"middleeast", fsi_band:"Elevated Warning", lat: 30.5852, lng: 36.2384 },
  SEN: { name:"Senegal",              flag:"🇸🇳", fsi_score:74.2, rank:70, region:"africa", fsi_band:"Elevated Warning", lat: 14.4974, lng: -14.4524 },
  LAO: { name:"Laos",                 flag:"🇱🇦", fsi_score:73.8, rank:71, region:"asia", fsi_band:"Elevated Warning", lat: 19.8563, lng: 102.4955 },
  AZE: { name:"Azerbaijan",           flag:"🇦🇿", fsi_score:72.8, rank:72, region:"asia", fsi_band:"Elevated Warning", lat: 40.1431, lng: 47.5769 },
  TJK: { name:"Tajikistan",           flag:"🇹🇯", fsi_score:72.8, rank:72, region:"asia", fsi_band:"Elevated Warning", lat: 38.8610, lng: 71.2761 },
  BEN: { name:"Benin",                flag:"🇧🇯", fsi_score:72.5, rank:74, region:"africa", fsi_band:"Elevated Warning", lat: 9.3077, lng: 2.3158 },
  IND: { name:"India",                flag:"🇮🇳", fsi_score:72.3, rank:75, region:"asia", fsi_band:"Elevated Warning", lat: 20.5937, lng: 78.9629 },
  PER: { name:"Peru",                 flag:"🇵🇪", fsi_score:72.0, rank:76, region:"americas", fsi_band:"Elevated Warning", lat: -9.1900, lng: -75.0152 },
  BIH: { name:"Bosnia-Herzegovina",   flag:"🇧🇦", fsi_score:71.0, rank:77, region:"europe", fsi_band:"Elevated Warning", lat: 43.9159, lng: 17.6791 },
  BRA: { name:"Brazil",               flag:"🇧🇷", fsi_score:70.3, rank:78, region:"americas", fsi_band:"Elevated Warning", lat: -14.2350, lng: -51.9253 },
  GAB: { name:"Gabon",                flag:"🇬🇦", fsi_score:70.2, rank:79, region:"africa", fsi_band:"Elevated Warning", lat: -0.8037, lng: 11.6094 },
  ZAF: { name:"South Africa",         flag:"🇿🇦", fsi_score:69.6, rank:80, region:"africa", fsi_band:"Elevated Warning", lat: -30.5595, lng: 22.9375 },
  BOL: { name:"Bolivia",              flag:"🇧🇴", fsi_score:69.4, rank:81, region:"americas", fsi_band:"Elevated Warning", lat: -16.2902, lng: -63.5887 },
  GEO: { name:"Georgia",              flag:"🇬🇪", fsi_score:69.3, rank:82, region:"asia", fsi_band:"Elevated Warning", lat: 42.3154, lng: 43.3569 },
  MEX: { name:"Mexico",               flag:"🇲🇽", fsi_score:69.0, rank:83, region:"americas", fsi_band:"Elevated Warning", lat: 23.6345, lng: -102.5528 },
  MAR: { name:"Morocco",              flag:"🇲🇦", fsi_score:68.8, rank:84, region:"africa", fsi_band:"Elevated Warning", lat: 31.7917, lng: -7.0926 },
  BLR: { name:"Belarus",              flag:"🇧🇾", fsi_score:68.7, rank:85, region:"europe", fsi_band:"Elevated Warning", lat: 53.7098, lng: 27.9534 },
  SLV: { name:"El Salvador",          flag:"🇸🇻", fsi_score:68.7, rank:85, region:"americas", fsi_band:"Elevated Warning", lat: 13.7942, lng: -88.8965 },
  DZA: { name:"Algeria",              flag:"🇩🇿", fsi_score:68.6, rank:87, region:"africa", fsi_band:"Elevated Warning", lat: 28.0339, lng: 1.6596 },
  STP: { name:"Sao Tome and Principe",flag:"🇸🇹", fsi_score:68.5, rank:88, region:"africa", fsi_band:"Elevated Warning", lat: 0.1864, lng: 6.6131 },
  ARM: { name:"Armenia",              flag:"🇦🇲", fsi_score:68.1, rank:89, region:"asia", fsi_band:"Elevated Warning", lat: 40.0691, lng: 45.0382 },
  ECU: { name:"Ecuador",              flag:"🇪🇨", fsi_score:68.0, rank:90, region:"americas", fsi_band:"Elevated Warning", lat: -1.8312, lng: -78.1834 },
  SRB: { name:"Serbia",               flag:"🇷🇸", fsi_score:67.8, rank:91, region:"europe", fsi_band:"Elevated Warning", lat: 44.0165, lng: 21.0059 },
  TUN: { name:"Tunisia",              flag:"🇹🇳", fsi_score:67.2, rank:92, region:"africa", fsi_band:"Elevated Warning", lat: 33.8869, lng: 9.5375 },
  FSM: { name:"F.S. Micronesia",      flag:"🇫🇲", fsi_score:66.9, rank:93, region:"oceania", fsi_band:"Elevated Warning", lat: 7.4256, lng: 150.5508 },
  FJI: { name:"Fiji",                 flag:"🇫🇯", fsi_score:66.4, rank:94, region:"oceania", fsi_band:"Elevated Warning", lat: -17.7134, lng: 178.0650 },
  THA: { name:"Thailand",             flag:"🇹🇭", fsi_score:66.2, rank:95, region:"asia", fsi_band:"Elevated Warning", lat: 15.8700, lng: 100.9925 },
  UZB: { name:"Uzbekistan",           flag:"🇺🇿", fsi_score:64.8, rank:96, region:"asia", fsi_band:"Warning", lat: 41.3775, lng: 64.5853 },
  MDA: { name:"Moldova",              flag:"🇲🇩", fsi_score:64.7, rank:97, region:"europe", fsi_band:"Warning", lat: 47.4116, lng: 28.3699 },
  BTN: { name:"Bhutan",               flag:"🇧🇹", fsi_score:64.5, rank:98, region:"asia", fsi_band:"Warning", lat: 27.5142, lng: 90.4336 },
  CHN: { name:"China",                flag:"🇨🇳", fsi_score:64.4, rank:99, region:"asia", fsi_band:"Warning", lat: 35.8617, lng: 104.1954 },
  BHR: { name:"Bahrain",              flag:"🇧🇭", fsi_score:64.2, rank:100, region:"middleeast", fsi_band:"Warning", lat: 26.0667, lng: 50.5577 },
  WSM: { name:"Samoa",                flag:"🇼🇸", fsi_score:63.9, rank:101, region:"oceania", fsi_band:"Warning", lat: -13.7590, lng: -172.1046 },
  IDN: { name:"Indonesia",            flag:"🇮🇩", fsi_score:63.7, rank:102, region:"asia", fsi_band:"Warning", lat: -0.7893, lng: 113.9213 },
  SAU: { name:"Saudi Arabia",         flag:"🇸🇦", fsi_score:63.2, rank:103, region:"middleeast", fsi_band:"Warning", lat: 23.8859, lng: 45.0792 },
  TKM: { name:"Turkmenistan",         flag:"🇹🇲", fsi_score:62.2, rank:104, region:"asia", fsi_band:"Warning", lat: 38.9697, lng: 59.5563 },
  PRY: { name:"Paraguay",             flag:"🇵🇾", fsi_score:61.5, rank:105, region:"americas", fsi_band:"Warning", lat: -23.4425, lng: -58.4438 },
  GHA: { name:"Ghana",                flag:"🇬🇭", fsi_score:60.8, rank:106, region:"africa", fsi_band:"Warning", lat: 7.9465, lng: -1.0232 },
  MDV: { name:"Maldives",             flag:"🇲🇻", fsi_score:60.3, rank:107, region:"asia", fsi_band:"Warning", lat: 3.2028, lng: 73.2207 },
  DOM: { name:"Dominican Republic",   flag:"🇩🇴", fsi_score:60.2, rank:108, region:"americas", fsi_band:"Warning", lat: 18.7357, lng: -70.1627 },
  JAM: { name:"Jamaica",              flag:"🇯🇲", fsi_score:59.3, rank:109, region:"americas", fsi_band:"Warning", lat: 18.1096, lng: -77.2975 },
  NAM: { name:"Namibia",              flag:"🇳🇦", fsi_score:59.3, rank:109, region:"africa", fsi_band:"Warning", lat: -22.9576, lng: 18.4904 },
  GUY: { name:"Guyana",               flag:"🇬🇾", fsi_score:59.2, rank:111, region:"americas", fsi_band:"Warning", lat: 4.8604, lng: -58.9302 },
  CUB: { name:"Cuba",                 flag:"🇨🇺", fsi_score:59.1, rank:112, region:"americas", fsi_band:"Warning", lat: 21.5218, lng: -77.7812 },
  SUR: { name:"Suriname",             flag:"🇸🇷", fsi_score:58.8, rank:113, region:"americas", fsi_band:"Warning", lat: 3.9193, lng: -56.0278 },
  MKD: { name:"North Macedonia",      flag:"🇲🇰", fsi_score:58.1, rank:114, region:"europe", fsi_band:"Warning", lat: 41.6086, lng: 21.7453 },
  KAZ: { name:"Kazakhstan",           flag:"🇰🇿", fsi_score:57.8, rank:115, region:"asia", fsi_band:"Warning", lat: 48.0196, lng: 66.9237 },
  CPV: { name:"Cape Verde",           flag:"🇨🇻", fsi_score:57.2, rank:116, region:"africa", fsi_band:"Warning", lat: 16.5388, lng: -23.0418 },
  BLZ: { name:"Belize",               flag:"🇧🇿", fsi_score:57.0, rank:117, region:"americas", fsi_band:"Warning", lat: 17.1899, lng: -88.4976 },
  MNE: { name:"Montenegro",           flag:"🇲🇪", fsi_score:56.9, rank:118, region:"europe", fsi_band:"Warning", lat: 42.7087, lng: 19.3744 },
  VNM: { name:"Vietnam",              flag:"🇻🇳", fsi_score:56.2, rank:119, region:"asia", fsi_band:"Warning", lat: 14.0583, lng: 108.2772 },
  ALB: { name:"Albania",              flag:"🇦🇱", fsi_score:55.9, rank:120, region:"europe", fsi_band:"Warning", lat: 41.1533, lng: 20.1683 },
  GRC: { name:"Greece",               flag:"🇬🇷", fsi_score:54.7, rank:121, region:"europe", fsi_band:"Warning", lat: 39.0742, lng: 21.8243 },
  CYP: { name:"Cyprus",               flag:"🇨🇾", fsi_score:54.1, rank:122, region:"europe", fsi_band:"Less Stable", lat: 35.1264, lng: 33.4299 },
  BRN: { name:"Brunei",               flag:"🇧🇳", fsi_score:53.9, rank:123, region:"asia", fsi_band:"Less Stable", lat: 4.5353, lng: 114.7277 },
  BWA: { name:"Botswana",             flag:"🇧🇼", fsi_score:53.6, rank:124, region:"africa", fsi_band:"Less Stable", lat: -22.3285, lng: 24.6849 },
  TTO: { name:"Trinidad and Tobago",  flag:"🇹🇹", fsi_score:53.5, rank:125, region:"americas", fsi_band:"Less Stable", lat: 10.6918, lng: -61.2225 },
  MYS: { name:"Malaysia",             flag:"🇲🇾", fsi_score:53.1, rank:126, region:"asia", fsi_band:"Less Stable", lat: 4.2105, lng: 101.9758 },
  ATG: { name:"Antigua and Barbuda",  flag:"🇦🇬", fsi_score:51.9, rank:127, region:"americas", fsi_band:"Less Stable", lat: 17.0608, lng: -61.7964 },
  GRD: { name:"Grenada",              flag:"🇬🇩", fsi_score:51.9, rank:127, region:"americas", fsi_band:"Less Stable", lat: 12.1165, lng: -61.6790 },
  ISR: { name:"Israel",               flag:"🇮🇱", fsi_score:51.5, rank:129, region:"middleeast", fsi_band:"Less Stable", lat: 31.0461, lng: 34.8516 },
  ROU: { name:"Romania",              flag:"🇷🇴", fsi_score:51.0, rank:130, region:"europe", fsi_band:"Less Stable", lat: 45.9432, lng: 24.9668 },
  SYC: { name:"Seychelles",           flag:"🇸🇨", fsi_score:51.0, rank:130, region:"africa", fsi_band:"Less Stable", lat: -4.6796, lng: 55.4920 },
  MNG: { name:"Mongolia",             flag:"🇲🇳", fsi_score:50.7, rank:132, region:"asia", fsi_band:"Less Stable", lat: 46.8625, lng: 103.8467 },
  BGR: { name:"Bulgaria",             flag:"🇧🇬", fsi_score:49.4, rank:133, region:"europe", fsi_band:"Less Stable", lat: 42.7339, lng: 25.4858 },
  KWT: { name:"Kuwait",               flag:"🇰🇼", fsi_score:49.3, rank:134, region:"middleeast", fsi_band:"Less Stable", lat: 29.3117, lng: 47.4818 },
  BHS: { name:"Bahamas",              flag:"🇧🇸", fsi_score:48.0, rank:135, region:"americas", fsi_band:"Less Stable", lat: 25.0343, lng: -77.3963 },
  PAN: { name:"Panama",               flag:"🇵🇦", fsi_score:47.7, rank:136, region:"americas", fsi_band:"Less Stable", lat: 8.5380, lng: -80.7821 },
  OMN: { name:"Oman",                 flag:"🇴🇲", fsi_score:47.4, rank:137, region:"middleeast", fsi_band:"Less Stable", lat: 21.4735, lng: 55.9754 },
  HUN: { name:"Hungary",              flag:"🇭🇺", fsi_score:46.2, rank:138, region:"europe", fsi_band:"Less Stable", lat: 47.1625, lng: 19.5033 },
  HRV: { name:"Croatia",              flag:"🇭🇷", fsi_score:45.9, rank:139, region:"europe", fsi_band:"Less Stable", lat: 45.1000, lng: 15.2000 },
  BRB: { name:"Barbados",             flag:"🇧🇧", fsi_score:44.7, rank:140, region:"americas", fsi_band:"Less Stable", lat: 13.1939, lng: -59.5432 },
  USA: { name:"United States",        flag:"🇺🇸", fsi_score:44.5, rank:141, region:"americas", fsi_band:"Less Stable", lat: 37.0902, lng: -95.7129 },
  ARG: { name:"Argentina",            flag:"🇦🇷", fsi_score:44.2, rank:142, region:"americas", fsi_band:"Less Stable", lat: -38.4161, lng: -63.6167 },
  ESP: { name:"Spain",                flag:"🇪🇸", fsi_score:44.0, rank:143, region:"europe", fsi_band:"Less Stable", lat: 40.4637, lng: -3.7492 },
  POL: { name:"Poland",               flag:"🇵🇱", fsi_score:41.7, rank:144, region:"europe", fsi_band:"Stable", lat: 51.9194, lng: 19.1451 },
  LVA: { name:"Latvia",               flag:"🇱🇻", fsi_score:41.4, rank:145, region:"europe", fsi_band:"Stable", lat: 56.8796, lng: 24.6032 },
  CHL: { name:"Chile",                flag:"🇨🇱", fsi_score:41.1, rank:146, region:"americas", fsi_band:"Stable", lat: -35.6751, lng: -71.5430 },
  ITA: { name:"Italy",                flag:"🇮🇹", fsi_score:41.1, rank:146, region:"europe", fsi_band:"Stable", lat: 41.8719, lng: 12.5674 },
  GBR: { name:"United Kingdom",       flag:"🇬🇧", fsi_score:40.8, rank:148, region:"europe", fsi_band:"Stable", lat: 55.3781, lng: -3.4360 },
  QAT: { name:"Qatar",                flag:"🇶🇦", fsi_score:39.8, rank:149, region:"middleeast", fsi_band:"Stable", lat: 25.3548, lng: 51.1839 },
  CRI: { name:"Costa Rica",           flag:"🇨🇷", fsi_score:39.4, rank:150, region:"americas", fsi_band:"Stable", lat: 9.7489, lng: -83.7534 },
  MUS: { name:"Mauritius",            flag:"🇲🇺", fsi_score:37.8, rank:151, region:"africa", fsi_band:"Stable", lat: -20.3484, lng: 57.5522 },
  CZE: { name:"Czech Republic",       flag:"🇨🇿", fsi_score:37.7, rank:152, region:"europe", fsi_band:"Stable", lat: 49.8175, lng: 15.4730 },
  LTU: { name:"Lithuania",            flag:"🇱🇹", fsi_score:37.4, rank:153, region:"europe", fsi_band:"Stable", lat: 55.1694, lng: 23.8813 },
  EST: { name:"Estonia",              flag:"🇪🇪", fsi_score:36.5, rank:154, region:"europe", fsi_band:"Stable", lat: 58.5953, lng: 25.0136 },
  SVK: { name:"Slovakia",             flag:"🇸🇰", fsi_score:35.3, rank:155, region:"europe", fsi_band:"Stable", lat: 48.6690, lng: 19.6990 },
  ARE: { name:"United Arab Emirates", flag:"🇦🇪", fsi_score:34.7, rank:156, region:"middleeast", fsi_band:"Stable", lat: 23.4241, lng: 53.8478 },
  URY: { name:"Uruguay",              flag:"🇺🇾", fsi_score:33.7, rank:157, region:"americas", fsi_band:"Stable", lat: -32.5228, lng: -55.7658 },
  MLT: { name:"Malta",                flag:"🇲🇹", fsi_score:31.1, rank:158, region:"europe", fsi_band:"More Stable", lat: 35.9375, lng: 14.3754 },
  BEL: { name:"Belgium",              flag:"🇧🇪", fsi_score:30.3, rank:159, region:"europe", fsi_band:"More Stable", lat: 50.5039, lng: 4.4699 },
  JPN: { name:"Japan",                flag:"🇯🇵", fsi_score:30.2, rank:160, region:"asia", fsi_band:"More Stable", lat: 36.2048, lng: 138.2529 },
  KOR: { name:"South Korea",          flag:"🇰🇷", fsi_score:29.8, rank:161, region:"asia", fsi_band:"More Stable", lat: 35.9078, lng: 127.7669 },
  FRA: { name:"France",               flag:"🇫🇷", fsi_score:28.3, rank:162, region:"europe", fsi_band:"More Stable", lat: 46.2276, lng: 2.2137 },
  SVN: { name:"Slovenia",             flag:"🇸🇮", fsi_score:26.1, rank:163, region:"europe", fsi_band:"More Stable", lat: 46.1512, lng: 14.9955 },
  PRT: { name:"Portugal",             flag:"🇵🇹", fsi_score:25.9, rank:164, region:"europe", fsi_band:"More Stable", lat: 39.3999, lng: -8.2245 },
  SGP: { name:"Singapore",            flag:"🇸🇬", fsi_score:25.4, rank:165, region:"asia", fsi_band:"More Stable", lat: 1.3521, lng: 103.8198 },
  DEU: { name:"Germany",              flag:"🇩🇪", fsi_score:24.0, rank:166, region:"europe", fsi_band:"More Stable", lat: 51.1657, lng: 10.4515 },
  AUT: { name:"Austria",              flag:"🇦🇹", fsi_score:23.1, rank:167, region:"europe", fsi_band:"More Stable", lat: 47.5162, lng: 14.5501 },
  SWE: { name:"Sweden",               flag:"🇸🇪", fsi_score:20.6, rank:168, region:"europe", fsi_band:"Sustainable", lat: 60.1282, lng: 18.6435 },
  AUS: { name:"Australia",            flag:"🇦🇺", fsi_score:19.6, rank:169, region:"oceania", fsi_band:"Sustainable", lat: -25.2744, lng: 133.7751 },
  NLD: { name:"Netherlands",          flag:"🇳🇱", fsi_score:19.5, rank:170, region:"europe", fsi_band:"Sustainable", lat: 52.1326, lng: 5.2913 },
  LUX: { name:"Luxembourg",           flag:"🇱🇺", fsi_score:18.7, rank:171, region:"europe", fsi_band:"Sustainable", lat: 49.8153, lng: 6.1296 },
  CAN: { name:"Canada",               flag:"🇨🇦", fsi_score:18.6, rank:172, region:"americas", fsi_band:"Sustainable", lat: 56.1304, lng: -106.3468 },
  IRL: { name:"Ireland",              flag:"🇮🇪", fsi_score:18.6, rank:172, region:"europe", fsi_band:"Sustainable", lat: 53.4129, lng: -8.2439 },
  CHE: { name:"Switzerland",          flag:"🇨🇭", fsi_score:16.2, rank:174, region:"europe", fsi_band:"Sustainable", lat: 46.8182, lng: 8.2275 },
  DNK: { name:"Denmark",              flag:"🇩🇰", fsi_score:15.9, rank:175, region:"europe", fsi_band:"Sustainable", lat: 56.2639, lng: 9.5018 },
  NZL: { name:"New Zealand",          flag:"🇳🇿", fsi_score:15.9, rank:175, region:"oceania", fsi_band:"Sustainable", lat: -40.9006, lng: 174.8860 },
  ISL: { name:"Iceland",              flag:"🇮🇸", fsi_score:15.2, rank:177, region:"europe", fsi_band:"Sustainable", lat: 64.9631, lng: -19.0208 },
  FIN: { name:"Finland",              flag:"🇫🇮", fsi_score:14.3, rank:178, region:"europe", fsi_band:"Sustainable", lat: 61.9241, lng: 25.7482 },
  NOR: { name:"Norway",               flag:"🇳🇴", fsi_score:12.7, rank:179, region:"europe", fsi_band:"Sustainable", lat: 60.4720, lng: 8.4689 },
};

// ─── WST CLASSIFICATION (unchanged) ─────────────────────────────────────────

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

// ─── REGION ALIASES ──────────────────────────────────────────────────────────

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
    name: fsi.name, flag: fsi.flag,
    prior: Math.round(score), fsi_score: score,
    fsi_rank: fsi.rank, fsi_band: fsi.fsi_band, region: fsi.region,
    types: uniqueTypes.slice(0, 4), adj: adj.slice(0, 8),
    cent: [fsi.lng, fsi.lat],
  };
}

// ─── MATH UTILITIES ──────────────────────────────────────────────────────────

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
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  return { words, minutes: Math.max(1, Math.ceil(words / 225)) };
}
function findIsoByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const [iso, d] of Object.entries(COUNTRIES)) if (d.name.toLowerCase() === lower) return iso;
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) return iso;
  }
  return null;
}

function findClosestCountry(lng, lat) {
  let closest = null, minDist = Infinity;
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (!d.cent || (d.cent[0] === 0 && d.cent[1] === 0)) continue;
    const dLng = Math.abs(lng - d.cent[0]);
    const dLat = Math.abs(lat - d.cent[1]);
    if (dLng > 40 || dLat > 40) continue;
    const dist = Math.sqrt(dLng ** 2 + dLat ** 2);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return minDist < 15 ? closest : null;
}

// ════════════════════════════════════════════════════════════════════════════
//  ═══ v13.0 FRESCO SCORING ENGINE ═══
//  L1 Evidence Ledger · L2 Bayesian Posterior · L3 Freshness · L4 Corroboration
//  L5 Coverage Entropy · L6 Dynamic Ceiling · L7 Temporal Fusion · L8 Gate v2
// ════════════════════════════════════════════════════════════════════════════

// ─── L1 — EVIDENCE LEDGER ───────────────────────────────────────────────────

/**
 * Create a typed, weighted, freshness-tagged evidence record.
 * @param {object} args
 *   source      {string}  e.g. "USGS", "WHO DON"
 *   category    {string}  one of FRESCO.CATEGORIES
 *   rawPoints   {number}  base score contribution before weight
 *   observed_at {number}  epoch ms (defaults to now)
 *   meta        {object}  free-form (magnitude, alert level, etc.)
 *   geo_conf    {number}  0..1 — how confident we are this evidence belongs to this ISO
 *   polarity    {+1|-1}   positive = increases crisis score
 */
function makeEvidence({ source, category, rawPoints, observed_at, meta, geo_conf, polarity }) {
  const w = CFG.FRESCO.SOURCE_WEIGHT[source] ?? CFG.FRESCO.DEFAULT_SOURCE_WEIGHT;
  const hl = CFG.FRESCO.HALF_LIFE_HOURS[source] ?? CFG.FRESCO.DEFAULT_HALF_LIFE_HOURS;
  return {
    source,
    category,
    raw_points: rawPoints,
    source_weight: w,
    geo_confidence: geo_conf ?? 1.0,
    polarity: polarity ?? 1,
    observed_at: observed_at ?? Date.now(),
    half_life_hours: hl,
    meta: meta || {},
  };
}

// ─── L3 — FRESHNESS KERNEL ──────────────────────────────────────────────────

function freshnessFactor(evidence, now = Date.now()) {
  const ageHours = Math.max(0, (now - evidence.observed_at) / 3_600_000);
  return Math.pow(0.5, ageHours / evidence.half_life_hours);
}

// ─── L4 — CORROBORATION ─────────────────────────────────────────────────────

/**
 * Given a list of evidence in the same category, compute a corroboration
 * multiplier. Uses a saturating Michaelis–Menten-style curve so that the
 * 2nd independent source adds a lot, the 5th adds little.
 */
function corroborationMultiplier(evidenceList) {
  if (!CFG.FRESCO.CORROBORATION_ENABLED) return 1;
  // Collapse same-source duplicates (e.g. two USGS events) — they don't
  // count as independent corroboration.
  const uniqueSources = new Set(evidenceList.map(e => e.source));
  const n = uniqueSources.size;
  if (n <= 1) return 1;
  const halfSat = CFG.FRESCO.CORROBORATION_HALF_SAT;
  const maxBoost = CFG.FRESCO.CORROBORATION_BOOST_MAX;
  return 1 + (maxBoost - 1) * (n - 1) / (n - 1 + halfSat);
}

// ─── L5 — COVERAGE ENTROPY ──────────────────────────────────────────────────

/**
 * Multi-domain coverage bonus. A country with conflict + disaster + health
 * + displacement firing simultaneously gets a bigger bonus than one with
 * five signals all in the same category.
 */
function coverageBonus(categoryPointMap) {
  const cats = CFG.FRESCO.CATEGORIES;
  const firing = cats.filter(c => (categoryPointMap[c] || 0) > 0.5);
  if (firing.length === 0) return { bonus: 0, coverage: 0, firing };
  // Shannon-like: H = -Σ p ln p, normalized by ln(N)
  const total = firing.reduce((s, c) => s + (categoryPointMap[c] || 0), 0);
  let H = 0;
  for (const c of firing) {
    const p = (categoryPointMap[c] || 0) / total;
    if (p > 0) H -= p * Math.log(p);
  }
  const Hmax = Math.log(cats.length);
  const coverage = Math.min(1, H / Hmax); // 0..1
  const breadth = Math.min(1, firing.length / cats.length);
  const combined = 0.55 * coverage + 0.45 * breadth;
  return {
    bonus: +(CFG.FRESCO.COVERAGE_BOOST_MAX * combined).toFixed(2),
    coverage: +coverage.toFixed(3),
    breadth: +breadth.toFixed(3),
    firing,
  };
}

// ─── L2 — BAYESIAN POSTERIOR ────────────────────────────────────────────────

/**
 * Gaussian conjugate update. Prior N(μ0, σ0²), likelihood N(Σ evidence,
 * σE²) — we treat each evidence's weighted contribution as an observation
 * with variance derived from its source weight (heavier = lower variance).
 */
function bayesianPosterior(priorMean, priorSigma, evidenceList, now) {
  if (evidenceList.length === 0) {
    return {
      mean: priorMean,
      sigma: priorSigma,
      observations: 0,
      evidence_sum: 0,
      precision_before: 1 / (priorSigma * priorSigma),
      precision_after: 1 / (priorSigma * priorSigma),
      trace: [],
    };
  }
  const priorVar = priorSigma * priorSigma;
  let precision = 1 / priorVar;
  let weightedSum = priorMean / priorVar;
  const trace = [];

  // Group by category for corroboration
  const byCategory = {};
  for (const e of evidenceList) {
    (byCategory[e.category] ||= []).push(e);
  }

  for (const [category, group] of Object.entries(byCategory)) {
    const corr = corroborationMultiplier(group);
    // Sum freshness × polarity × weight × geo_conf × raw_points
    let catObs = 0, catPrecision = 0;
    for (const e of group) {
      const fresh = freshnessFactor(e, now);
      const v = e.polarity * e.raw_points * e.source_weight * e.geo_confidence * fresh;
      catObs += v;
      // Observation variance: inversely proportional to source weight × freshness
      const obsVar = 1 / Math.max(0.01, e.source_weight * fresh);
      catPrecision += 1 / obsVar;
    }
    // Apply corroboration multiplier to the *observation magnitude*, not precision
    const corroborated = catObs * corr;
    precision += catPrecision;
    weightedSum += corroborated * (catPrecision / Math.max(catPrecision, 1e-9));
    trace.push({
      category,
      raw_obs: +catObs.toFixed(2),
      corroboration: +corr.toFixed(2),
      weighted_obs: +corroborated.toFixed(2),
      precision_added: +catPrecision.toFixed(3),
      sources: [...new Set(group.map(e => e.source))],
    });
  }

  const mean = weightedSum / precision;
  const sigma = Math.sqrt(1 / precision);
  return {
    mean: +mean.toFixed(3),
    sigma: +sigma.toFixed(3),
    observations: evidenceList.length,
    evidence_sum: +(weightedSum - priorMean / priorVar).toFixed(2),
    precision_before: +(1 / priorVar).toFixed(4),
    precision_after: +precision.toFixed(4),
    trace,
  };
}

// ─── L6 — DYNAMIC CEILING ───────────────────────────────────────────────────

function dynamicCeiling(fsiBase, coverage, corroborationLevel) {
  let tierCap = 8;
  for (const t of CFG.FRESCO.CEILING_TIER_CAP) {
    if (fsiBase >= t.minFsi) { tierCap = t.cap; break; }
  }
  // Evidence multiplier: more coverage × stronger corroboration → higher ceiling
  const mult = Math.min(
    CFG.FRESCO.CEILING_EVIDENCE_MULT_MAX,
    1 + 0.4 * coverage + 0.25 * Math.min(1, corroborationLevel / 3)
  );
  const fsiScore = (fsiBase / 120) * 100;
  return Math.min(CFG.FRESCO.CEILING_HARD_MAX, Math.round(fsiScore + tierCap * mult));
}

// ─── L7 — TEMPORAL FUSION (Kalman-smoothed momentum) ────────────────────────

class KalmanState {
  constructor(initialValue, processNoise, obsNoise) {
    this.x = initialValue;
    this.P = 4; // initial variance
    this.Q = processNoise;
    this.R = obsNoise;
  }
  update(measurement) {
    // Predict
    this.P = this.P + this.Q;
    // Update
    const K = this.P / (this.P + this.R);
    this.x = this.x + K * (measurement - this.x);
    this.P = (1 - K) * this.P;
    return this.x;
  }
}

function temporalFusion(hist, current, iso) {
  if (hist.length < 3) {
    return { smoothed: current, velocity: 0, acceleration: 0, momentum: 0 };
  }
  const kf = new KalmanState(hist[0], CFG.FRESCO.KALMAN_PROCESS_NOISE, CFG.FRESCO.KALMAN_OBS_NOISE);
  let prevSmoothed = hist[0];
  for (let i = 1; i < hist.length; i++) {
    const s = kf.update(hist[i]);
    if (i === hist.length - 1) prevSmoothed = s;
  }
  const w = Math.min(CFG.FRESCO.VELOCITY_WINDOW, Math.max(2, Math.floor(hist.length / 3)));
  const recent = hist.slice(-w);
  const older  = hist.slice(-2 * w, -w);
  const vRecent = recent.length >= 2 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
  const vOlder  = older.length  >= 2 ? (older[older.length - 1]  - older[0])  / (older.length - 1)  : 0;
  const velocity = +vRecent.toFixed(3);
  const acceleration = +(vRecent - vOlder).toFixed(3);
  const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
  const momentumFactor = wst.momentum_factor || 0.5;
  let momentum =
    CFG.FRESCO.VELOCITY_WEIGHT * velocity +
    CFG.FRESCO.ACCELERATION_WEIGHT * acceleration;
  momentum = Math.max(-CFG.FRESCO.MOMENTUM_CAP, Math.min(CFG.FRESCO.MOMENTUM_CAP, momentum * momentumFactor));
  return { smoothed: +prevSmoothed.toFixed(3), velocity, acceleration, momentum: +momentum.toFixed(3) };
}

// ─── L8 — CONSENSUS GATE v2 ─────────────────────────────────────────────────

function evaluateGate(score, categoryPointMap, tierASourcesPresent) {
  const cfg = CFG.FRESCO;
  if (!cfg.GATE_ENABLED) return { applied: false, score, reason: null };
  const tier = score >= 99 ? 99 : score >= 97 ? 97 : score >= 95 ? 95 : null;
  if (!tier) return { applied: false, score, reason: null };
  const req = cfg.GATE_REQUIREMENTS[tier];
  const firing = Object.entries(categoryPointMap).filter(([, v]) => v > 0.5).map(([k]) => k);
  const hasEnoughCats = firing.length >= req.minCategories;
  const hasTierA = !req.requireTierA || tierASourcesPresent;
  if (hasEnoughCats && hasTierA) {
    return { applied: false, score, reason: null, categories_firing: firing.length, tier_a: tierASourcesPresent };
  }
  // Downgrade to the highest tier whose requirements ARE met
  let fallback = 94;
  if (firing.length >= 3 && hasTierA) fallback = 96;
  else if (firing.length >= 2 && hasTierA) fallback = 95;
  else if (firing.length >= 3) fallback = 94;
  const reason = !hasEnoughCats
    ? `Gate ${tier}: ${firing.length}/${req.minCategories} categories firing`
    : `Gate ${tier}: no Tier-A source (${cfg.GATE_TIER_A_SOURCES.join(", ")})`;
  return { applied: true, score: Math.min(score, fallback), reason, categories_firing: firing.length, tier_a: tierASourcesPresent };
}

// ─── FRESCO CORE — orchestrates L1..L8 ──────────────────────────────────────

function frescoScore(iso, country, categoryPointMap, priorDims, evidenceList, hist, tierASourcesPresent) {
  const cfg = CFG.FRESCO;
  const priorSigma = cfg.PRIOR_SIGMA_BY_BAND[country.fsi_band] ?? 12;

  // L2 — Bayesian posterior over the *composite* score
  const categorySum = Object.values(categoryPointMap).reduce((a, b) => a + b, 0);
  const priorMean = clamp(composite(priorDims));
  const posterior = bayesianPosterior(priorMean, priorSigma, evidenceList, Date.now());

  // L5 — coverage entropy
  const cov = coverageBonus(categoryPointMap);

  // L6 — dynamic ceiling
  const corroborationLevel = evidenceList.length > 0
    ? mean(Object.values(categoryPointMap).filter(v => v > 0.5).map(() => 1)) * Object.keys(categoryPointMap).length
    : 0;
  const ceiling = dynamicCeiling(country.fsi_score, cov.coverage, corroborationLevel);

  // L7 — temporal fusion
  const tf = temporalFusion(hist, posterior.mean, iso);

  // Base posterior score + coverage bonus + momentum, then clamp
  let raw = posterior.mean + cov.bonus + tf.momentum;

  // Diminishing returns near 99
  if (raw > 90) {
    const over = raw - 90;
    raw = 90 + over * cfg.DIMINISHING_NEAR_99;
  }

  let score = clamp(raw, Math.max(1, Math.round((country.fsi_score / 120) * 100) - 20), ceiling);
  score = Math.min(score, ceiling);

  // L8 — consensus gate
  const gate = evaluateGate(score, categoryPointMap, tierASourcesPresent);
  score = gate.applied ? clamp(gate.score, 1, 99) : score;

  return {
    score,
    posterior,
    coverage: cov,
    ceiling,
    temporal: tf,
    gate,
    prior_mean: priorMean,
    prior_sigma: priorSigma,
    score_sigma: posterior.sigma,
  };
}

// ─── MAPPING: SIGNALS → CATEGORY POINTS (L1 evidence generation) ────────────

/**
 * Convert the rich `signals` object (from extractSignals) into:
 *   - categoryPointMap: { conflict, disaster, health, displacement, economic, climate }
 *   - evidenceList:     [ makeEvidence(...), ... ]
 *   - tierASourcesPresent: boolean
 * This is the bridge between fetchers and the FRESCO engine.
 */
function signalsToEvidence(iso, signals, store) {
  const now = Date.now();
  const evidence = [];
  const categoryPointMap = {
    conflict: 0, disaster: 0, health: 0, displacement: 0, economic: 0, climate: 0,
  };
  const tierASources = new Set();
  const s = signals || {};

  const add = (source, category, rawPoints, meta, geo_conf = 1, polarity = 1) => {
    if (!rawPoints || rawPoints <= 0) return;
    const e = makeEvidence({ source, category, rawPoints, observed_at: now, meta, geo_conf, polarity });
    evidence.push(e);
    categoryPointMap[category] += rawPoints * e.source_weight;
  };

  // ── Earthquakes (USGS + EMSC are distinct sources; corroboration applies)
  if (s.quakeMag >= 4.5) {
    const pts = Math.min(18, (s.quakeMag - 4.0) * 4);
    // We don't know which specific feed matched — attribute to both if magnitude high
    add("USGS", "disaster", pts * 0.85, { mag: s.quakeMag, place: s.quakePlace });
    if (s.quakeMag >= 5.5) add("EMSC", "disaster", pts * 0.7, { mag: s.quakeMag });
    if (s.quakeMag >= 6.5) tierASources.add("USGS");
  }

  // ── GDACS
  if (s.gdacs) {
    const level = (s.gdacsAlert || "green").toLowerCase();
    const pts = level === "red" ? 14 : level === "orange" ? 9 : 4;
    const cat = s.gdacsEventType === "DR" ? "climate"
              : s.gdacsEventType === "EQ" ? "disaster"
              : "disaster";
    add("GDACS", cat, pts, { level, type: s.gdacsEventType, count: s.gdacsCount });
    if (level === "red") tierASources.add("GDACS");
  }

  // ── NASA EONET
  if (s.nasaEventCount > 0) {
    add("NASA", "climate", Math.min(10, s.nasaEventCount * 2), { count: s.nasaEventCount });
  }

  // ── IFRC
  if (s.ifrcCount > 0) {
    add("IFRC", "conflict", Math.min(8, s.ifrcCount * 2), { count: s.ifrcCount });
  }

  // ── Heat / hazards / AQ
  if (s.maxTempC >= 35) {
    add("Open-Meteo Heat", "climate", Math.min(10, (s.maxTempC - 32) * 1.5), { tempC: s.maxTempC });
  }
  if (s.hazards) {
    const h = s.hazards;
    let pts = 0;
    if (h.flood_discharge > CFG.OPENMETEO_FLOOD_THRESHOLD) pts += 4;
    if (h.wind_speed > CFG.OPENMETEO_WIND_THRESHOLD)       pts += 3;
    if (h.precip_total > CFG.OPENMETEO_PRECIP_THRESHOLD)   pts += 2;
    if (h.lightning_max > CFG.OPENMETEO_LIGHTNING_THRESHOLD) pts += 2;
    if (pts > 0) add("Open-Meteo Hazards", "climate", Math.min(10, pts), h);
  }
  if (s.aq && s.aq.pm25 >= CFG.OPENMETEO_PM25_THRESHOLD) {
    add("Open-Meteo AQ", "health", Math.min(6, (s.aq.pm25 - 25) / 8), { pm25: s.aq.pm25 });
  }

  // ── NOAA
  if (s.noaa) {
    const pts = Math.min(8, (s.noaa.extreme_alerts * 2) + s.noaa.storm_alerts);
    if (pts > 0) add("NOAA", "climate", pts, s.noaa);
  }

  // ── disease.sh
  if (s.diseaseActive > CFG.DISEASE_ACTIVE_THRESHOLD) {
    add("disease.sh", "health", Math.min(10, Math.log10(s.diseaseActive / 1000 + 1) * 6), { active: s.diseaseActive });
  }

  // ── WHO (merged general + DON)
  if (s.whoOutbreaks?.length) {
    // DON-sourced outbreaks get higher weight than general news
    const donCount = s.whoOutbreaks.filter(o => (o.source || "").includes("DON")).length;
    const genCount = s.whoOutbreaks.length - donCount;
    if (donCount > 0) {
      add("WHO DON", "health", Math.min(12, donCount * 5), { count: donCount, diseases: s.whoOutbreaks.filter(o => (o.source || "").includes("DON")).map(o => o.disease) });
      tierASources.add("WHO DON");
    }
    if (genCount > 0) {
      add("WHO", "health", Math.min(8, genCount * 3), { count: genCount });
    }
  }

  // ── World Bank
  if (s.population > 0) {
    add("WB Population", "economic", 0.5, { value: s.population }, 1, 1);
  }
  if (s.wbInflation && s.wbInflation.value > CFG.WB_INFLATION_THRESHOLD) {
    add("WB Inflation", "economic", Math.min(9, s.wbInflation.value / 6), s.wbInflation);
  }
  if (s.wbGdpGrowth && s.wbGdpGrowth.value < CFG.WB_GDP_CONTRACTION_THRESHOLD) {
    add("WB GDP", "economic", Math.min(9, Math.abs(s.wbGdpGrowth.value) * 1.5), s.wbGdpGrowth);
  }
  if (s.wbUnemployment && s.wbUnemployment.value > CFG.WB_UNEMPLOYMENT_THRESHOLD) {
    add("WB Unemployment", "economic", Math.min(7, s.wbUnemployment.value / 6), s.wbUnemployment);
  }
  if (s.wbPoverty && s.wbPoverty.value > CFG.WB_POVERTY_THRESHOLD) {
    add("WB Poverty", "economic", Math.min(9, s.wbPoverty.value / 5), s.wbPoverty);
  }

  // ── UNHCR
  if (s.totalDisplaced > 0) {
    const m = s.totalDisplaced / 1_000_000;
    const pts = m >= 10 ? 22 : m >= 5 ? 16 : m >= 3 ? 12 : m >= 1.5 ? 9 : m >= 0.5 ? 5 : m >= 0.1 ? 2.5 : 0;
    if (pts > 0) {
      add("UNHCR", "displacement", pts, { total: s.totalDisplaced, refugees: s.refugees, idps: s.idps });
      if (m >= 2) tierASources.add("UNHCR");
    }
  }

  // ── WST structural (drives economic/conflict/category points)
  const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
  if (wst.class === "Periphery") {
    const extractive = Math.min(12, (wst.extractive_penalty || 15) * 0.5);
    add("WST Extractivism", "economic", extractive, { class: wst.class });
  }
  const globalRate = CFG.WST_GLOBAL_INTEREST_RATE || 5.25;
  const rateShock = Math.max(0, (globalRate - 2) * wst.debt_sensitivity);
  if (rateShock > 0.5) {
    add("WST Debt Shock", "economic", Math.min(10, rateShock * 1.5), { class: wst.class });
  }
  if (s.wbInflation && s.wbInflation.value > CFG.WST_CURRENCY_CRISIS_THRESHOLD) {
    const cc = Math.min(10, (s.wbInflation.value - 15) * 0.4 * wst.debt_sensitivity);
    if (cc > 0) {
      add("WST Currency", "economic", cc, { inflation: s.wbInflation.value });
      if (cc >= 5) tierASources.add("WST Currency");
    }
  }
  if (s.wbGdpGrowth && s.wbGdpGrowth.value < -1) {
    const sc = Math.abs(s.wbGdpGrowth.value) * CFG.WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER * 6;
    if (sc > 0) add("WST Supply Chain", "economic", Math.min(8, sc), { gdp: s.wbGdpGrowth.value });
  }

  // ── Spillover (already computed on store) — contributes to conflict/economic
  if (store && store[iso] && store[iso].spillover > 0) {
    add("Spillover", "conflict", Math.min(6, store[iso].spillover * 0.6), { value: store[iso].spillover });
    add("Spillover", "economic", Math.min(4, store[iso].spillover * 0.4), { value: store[iso].spillover });
  }

  // ── ML anomaly (only if forecast says so)
  if (store && store[iso] && store[iso].ml_forecast && store[iso].ml_forecast.anomaly_probability > 0.55) {
    const ap = store[iso].ml_forecast.anomaly_probability;
    add("ML Anomaly", "conflict", ap * 6, { anomaly_probability: ap });
  }

  return { categoryPointMap, evidenceList: evidence, tierASourcesPresent: tierASources.size > 0, tierASources: [...tierASources] };
}

// ─── LEGACY COMPAT: keep old functions that may be referenced ───────────────

function computeDynamicBoostCap(fsiBase) {
  for (const tier of CFG.BOOST_CAP_TIERS) {
    if (fsiBase >= tier.minFsi) return tier.cap;
  }
  return 8;
}
function computeEvidenceCeiling(baseCeiling, liveEvidenceCount) {
  if (!CFG.EVIDENCE_CEILING_ENABLED) return baseCeiling;
  const multiplier = Math.min(CFG.EVIDENCE_MULTIPLIER_MAX, 1 + (liveEvidenceCount || 0) * CFG.EVIDENCE_PER_SOURCE);
  return Math.round(baseCeiling * multiplier);
}
function computeViralWeight(baseVelocity, liveEvidenceCount) {
  const evidenceWeight = Math.min(CFG.LIVE_EVIDENCE_WEIGHT_MAX, (liveEvidenceCount || 0) * CFG.LIVE_EVIDENCE_PER_SOURCE);
  return Math.min(CFG.VIRAL_WEIGHT_CAP, 0.4 + Math.abs(baseVelocity) * 0.1 + evidenceWeight);
}
function categorizeEvidence(signals) {
  const categories = { disaster: false, health: false, displacement: false, economic: false, conflict: false };
  if (signals.gdacs) categories.disaster = true;
  if (signals.quakeMag >= 5.5) categories.disaster = true;
  if (signals.nasaEventCount >= 3) categories.disaster = true;
  if (signals.maxTempC >= 42) categories.disaster = true;
  if (signals.hazards?.flood_discharge > 500) categories.disaster = true;
  if (signals.whoOutbreaks?.length >= 1) categories.health = true;
  if (signals.diseaseActive > 50_000) categories.health = true;
  if (signals.aq?.pm25 >= 150) categories.health = true;
  if (signals.totalDisplaced > 2_000_000) categories.displacement = true;
  if (signals.refugees > 1_000_000) categories.displacement = true;
  if (signals.idps > 1_500_000) categories.displacement = true;
  if (signals.wbInflation?.value > 20) categories.economic = true;
  if (signals.wbGdpGrowth?.value < -5) categories.economic = true;
  if (signals.wbPoverty?.value > 30) categories.economic = true;
  if (signals.ifrcCount >= 3) categories.conflict = true;
  if (signals.quakeMag >= 6.5 && signals.gdacsAlert === "red") categories.conflict = true;
  return categories;
}
function applyConsensusGate(score, signals) {
  const categories = categorizeEvidence(signals);
  const categoriesFiring = Object.values(categories).filter(Boolean).length;
  if (score < CFG.CONSENSUS_GATE_THRESHOLD) return { score, gate_applied: false, gate_note: null, categories_firing: categoriesFiring, categories };
  let gatedScore = score;
  let gateNote = null;
  if (score >= 99) {
    gatedScore = categoriesFiring >= 4 ? 99 : 97;
    if (categoriesFiring < 4) gateNote = `99 requires 4+ evidence categories (${categoriesFiring} firing)`;
  } else if (score >= 97) {
    gatedScore = categoriesFiring >= 3 ? Math.min(score, 98) : 96;
    if (categoriesFiring < 3) gateNote = `97+ requires 3+ evidence categories (${categoriesFiring} firing)`;
  } else if (score >= 95) {
    gatedScore = categoriesFiring >= 2 ? score : 94;
    if (categoriesFiring < 2) gateNote = `95+ requires 2+ evidence categories (${categoriesFiring} firing)`;
  }
  return { score: gatedScore, gate_applied: gatedScore !== score, gate_note: gateNote, categories_firing: categoriesFiring, categories };
}

// ─── ML ENGINE (unchanged) ──────────────────────────────────────────────────

class CrisisMLModel {
  constructor() {
    this.weights = { input_hidden: [], hidden_output: [], bias_hidden: [], bias_output: [] };
    this.trained = false;
    this.trainingCount = 0;
    this.lastUpdate = Date.now();
    this.performance = { mse: 0, r2: 0, accuracy: 0 };
  }
  predict(sequence) {
    if (!this.trained || sequence.length < 5) return this.simpleTrendForecast(sequence);
    const normalized = this.normalizeSequence(sequence);
    const hidden = this.forwardPass(normalized);
    const prediction = this.outputLayer(hidden);
    return { forecast: this.denormalize(prediction), confidence: this.performance.r2 || 0.7, trend: this.determineTrend(sequence, prediction), anomaly_probability: this.calculateAnomalyProbability(sequence, prediction) };
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
    const learningRate = CFG.LEARNING_RATE || 0.01;
    let totalError = 0;
    for (let epoch = 0; epoch < 10; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        const hidden = this.forwardPass(inputs[i]);
        const output = this.outputLayer(hidden);
        const error = targets[i] - output;
        const outputDelta = error;
        for (let j = 0; j < hidden.length; j++) this.weights.hidden_output[j] = (this.weights.hidden_output[j] || 0) + learningRate * outputDelta * hidden[j];
        this.weights.bias_output = (this.weights.bias_output || 0) + learningRate * outputDelta;
        for (let j = 0; j < this.weights.input_hidden.length; j++) {
          const hiddenDelta = outputDelta * (this.weights.hidden_output[j] || 0) * (hidden[j] > 0 ? 1 : 0);
          for (let k = 0; k < inputs[i].length; k++) this.weights.input_hidden[j][k] += learningRate * hiddenDelta * inputs[i][k];
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
  }
  initializeWeights(inputSize) {
    const hiddenSize = CFG.HIDDEN_LAYERS?.[0] || 32;
    this.weights.input_hidden = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.input_hidden[i] = [];
      for (let j = 0; j < inputSize; j++) this.weights.input_hidden[i][j] = (Math.random() - 0.5) * 0.1;
    }
    this.weights.hidden_output = [];
    for (let i = 0; i < hiddenSize; i++) this.weights.hidden_output[i] = (Math.random() - 0.5) * 0.1;
    this.weights.bias_hidden = [];
    for (let i = 0; i < hiddenSize; i++) this.weights.bias_hidden[i] = (Math.random() - 0.5) * 0.1;
    this.weights.bias_output = (Math.random() - 0.5) * 0.1;
  }
  normalizeSequence(seq) {
    const min = Math.min(...seq, 0), max = Math.max(...seq, 100);
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
    return Math.min(0.95, Math.abs(prediction - last) / 30);
  }
}

const mlModel = new CrisisMLModel();

function trainMLModel(store) {
  if (!CFG.ML_ENABLED) return;
  const sequences = [];
  for (const iso in store) {
    const hist = seedHistory(iso, store[iso].score);
    if (hist.length >= 14) {
      for (let i = 7; i < hist.length - 1; i++) sequences.push(hist.slice(i - 7, i + 1));
    }
  }
  if (sequences.length >= 10) mlModel.train(sequences);
}

function mlEnhancedForecast(iso, currentScore, store) {
  const hist = seedHistory(iso, currentScore);
  const mlPrediction = mlModel.predict(hist);
  const trad = trendForecast(hist, currentScore);
  let wstAdjustment = 0, wstRecoveryRate = 0.5, wstClass = "Unclassified";
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
    fc: clamp(blended), ml_forecast: mlPrediction.forecast, trad_forecast: trad.fc,
    wst_adjusted_trad_forecast: tradAdjusted, wst_class: wstClass, wst_recovery_rate: wstRecoveryRate,
    confidence: Math.min(0.95, Math.max(0.3, (mlPrediction.confidence + trad.confidence) / 2)),
    trend: mlPrediction.trend || trad.trend, esc: blended > currentScore + 5,
    slope: trad.slope, anomaly_probability: mlPrediction.anomaly_probability || 0.1,
    ml_trained: mlModel.trained, training_count: mlModel.trainingCount, fsi_anchor: fsiScore,
  };
}

// ─── SENTIMENT (unchanged) ──────────────────────────────────────────────────

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = ['peace', 'ceasefire', 'truce', 'agreement', 'aid', 'humanitarian', 'relief', 'recovery', 'stabilize', 'improve', 'progress', 'positive', 'good', 'great', 'excellent', 'success', 'successful', 'hope', 'hopeful', 'resolution'];
    this.negativeWords = ['war', 'conflict', 'violence', 'attack', 'bomb', 'missile', 'strike', 'kill', 'death', 'casualty', 'destroy', 'collapse', 'crisis', 'emergency', 'famine', 'hunger', 'disease', 'outbreak', 'escalate', 'worsen', 'deteriorate', 'critical', 'severe', 'dire', 'catastrophe', 'disaster', 'devastating'];
    this.strongNegative = ['exterminate', 'genocide', 'massacre', 'pogrom', 'ethnic cleansing', 'famine', 'starvation', 'catastrophic'];
    this.positivePhrases = ['negotiations progress', 'peace talks', 'aid delivered', 'ceasefire holds', 'reconstruction', 'recovery efforts'];
    this.negativePhrases = ['escalation of', 'intensified fighting', 'heavy casualties', 'civilians killed', 'mass displacement', 'health system collapse', 'food insecurity worsens', 'drought intensifies'];
  }
  analyze(text) {
    if (!text || text.length < 10) return { score: 0, label: 'neutral', confidence: 0.5, key_terms: [] };
    const lower = text.toLowerCase();
    let score = 0, matches = 0;
    for (const word of this.positiveWords) if (lower.includes(word)) { score += 0.15; matches++; }
    for (const word of this.negativeWords) if (lower.includes(word)) { score -= 0.2; matches++; }
    for (const word of this.strongNegative) if (lower.includes(word)) { score -= 0.5; matches++; }
    for (const phrase of this.positivePhrases) if (lower.includes(phrase)) { score += 0.3; matches += 2; }
    for (const phrase of this.negativePhrases) if (lower.includes(phrase)) { score -= 0.4; matches += 2; }
    const totalMatches = Math.min(matches, 10);
    const normalizedScore = Math.max(-1, Math.min(1, score / (Math.max(totalMatches, 1) / 2)));
    const keyTerms = [];
    for (const word of this.negativeWords) if (lower.includes(word)) keyTerms.push(word);
    for (const word of this.positiveWords) if (lower.includes(word)) keyTerms.push(word);
    let label, confidence;
    if (normalizedScore > 0.2) { label = 'positive'; confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5); }
    else if (normalizedScore < -0.2) { label = 'negative'; confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5); }
    else { label = 'neutral'; confidence = 0.5 + (1 - Math.abs(normalizedScore)) * 0.3; }
    const crisisIntensity = Math.min(1, Math.abs(normalizedScore) * 1.5);
    return {
      score: Math.round(normalizedScore * 100) / 100,
      label, confidence: Math.round(confidence * 100) / 100,
      key_terms: keyTerms.slice(0, 10),
      crisis_intensity: Math.round(crisisIntensity * 100) / 100,
      is_crisis: label === 'negative' && crisisIntensity > 0.5,
    };
  }
}

const sentimentAnalyzer = new SentimentAnalyzer();

function analyzeCountrySentiment(iso, store) {
  if (!CFG.SENTIMENT_ENABLED) return null;
  const c = store[iso];
  const signals = c.signals || {};
  const text = [];
  if (signals.whoOutbreaks?.length) text.push(signals.whoOutbreaks.map(o => o.disease + ' outbreak').join(' '));
  if (signals.gdacs?.title) text.push(signals.gdacs.title);
  const dims = c.dims || {};
  if (dims.food > 70) text.push('severe food insecurity');
  if (dims.conflict > 70) text.push('intense conflict');
  if (dims.displacement > 70) text.push('mass displacement');
  if (text.length === 0) return null;
  const fullText = text.join('. ');
  return { ...sentimentAnalyzer.analyze(fullText), sources_analyzed: text.length, text_sample: fullText.slice(0, 200) };
}

// ─── HISTORICAL DATA STORE (unchanged) ──────────────────────────────────────

class HistoricalDataStore {
  constructor() { this.data = {}; this.lastCleanup = Date.now(); }
  store(iso, data) {
    if (!this.data[iso]) this.data[iso] = [];
    this.data[iso].push({ timestamp: Date.now(), ...data });
    this.cleanup(iso);
  }
  cleanup(iso) {
    const cutoff = Date.now() - CFG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    if (this.data[iso]) this.data[iso] = this.data[iso].filter(d => d.timestamp > cutoff);
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
}

const historyStore = new HistoricalDataStore();

function storeHistoricalData(iso, store) {
  if (!CFG.HISTORY_ENABLED) return;
  const c = store[iso];
  historyStore.store(iso, {
    score: c.score, displacement: c.dims.displacement || 0,
    economic: c.dims.economic || 0, food: c.dims.food || 0, health: c.dims.health || 0,
  });
}

// ─── ALERT MANAGER (unchanged) ──────────────────────────────────────────────

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
        triggered.push({ iso, name: c.name, score: c.score, type: 'global', message: `${c.name} has reached ${c.score}/100.` });
        this.lastAlerts[key] = now;
      }
    }
    return triggered;
  }
}

const alertManager = new AlertManager();

// ─── LIVE DATA FETCHERS (unchanged from v12.4) ──────────────────────────────

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok:true, data:r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok:false, error:e.message }));

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
  const heatProneIsos = ["SOM","SDN","SSD","YEM","AFG","PAK","IND","BGD","NGA","ETH","KEN","TCD","NER","MLI","BFA","MRT","SEN","EGY","IRQ","SYR","JOR","LBY","DZA","MAR","TUN","SAU","ARE","OMN","IRN","MMR","THA","KHM","VNM","PHL","IDN","MEX","BRA","COL","VEN","HTI","GIN","SLE","LBR","CIV","GHA","TGO","BEN","CMR","CAF","COD","UGA","TZA","MOZ","ZMB","ZWE","MWI","MDG","AGO","COG"];
  const results = {};
  let anyLive = false;
  for (const iso of heatProneIsos) {
    const coord = COUNTRIES[iso]?.cent;
    if (!coord || coord[0] === 0 || coord[1] === 0) continue;
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
  const results = { flood_discharge: 0, wind_speed: 0, precip_total: 0, uv_max: 0, cloud_avg: 0, lightning_max: 0 };
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
    { iso:'NGA', lat:6.5, lon:3.4 }, { iso:'IND', lat:28.6, lon:77.2 }, { iso:'CHN', lat:39.9, lon:116.4 },
    { iso:'BGD', lat:23.8, lon:90.4 }, { iso:'EGY', lat:30.0, lon:31.2 }, { iso:'PAK', lat:24.9, lon:67.1 },
    { iso:'THA', lat:13.8, lon:100.5 }, { iso:'TUR', lat:41.0, lon:28.9 }, { iso:'BRA', lat:-23.5, lon:-46.6 },
    { iso:'ETH', lat:9.0, lon:38.7 }, { iso:'KEN', lat:-1.3, lon:36.8 },
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
          results[city.iso] = { pm25 };
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
        map[item.country.id] = { value: parseFloat(item.value), date: item.date };
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

// ─── WHO fetcher (unchanged from v12.4) ─────────────────────────────────────

const WHO_GENERAL_RSS_URL = "https://www.who.int/rss-feeds/news-english.xml";
const WHO_DON_RSS_URL = "https://www.who.int/feeds/entity/csr/don/en/rss.xml";

const WHO_PROXIES = [
  (url) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

const WHO_DISEASE_KEYWORDS = [
  'cholera', 'ebola', 'mpox', 'monkeypox', 'measles', 'polio', 'dengue',
  'malaria', 'yellow fever', 'marburg', 'lassa', 'nipah', 'mers', 'zika',
  'hepatitis', 'tuberculosis', 'influenza', 'avian influenza', 'h5n1',
  'h7n9', 'rift valley fever', 'crimean-congo', 'chikungunya', 'plague',
  'anthrax', 'rabies', 'meningitis', 'diarrhoeal', 'respiratory',
  'haemorrhagic', 'hemorrhagic', 'sars', 'covid', 'diphtheria',
  'pertussis', 'tetanus', 'typhoid', 'shigellosis', 'legionellosis',
];

const WHO_REGION_ALIASES = {
  'africa': ['africa', 'african', 'sub-saharan', 'west africa', 'east africa', 'central africa', 'southern africa', 'horn of africa', 'sahel'],
  'asia': ['asia', 'asian', 'southeast asia', 'south asia', 'east asia', 'central asia', 'pacific'],
  'europe': ['europe', 'european', 'balkans', 'caucasus'],
  'middleeast': ['middle east', 'mena', 'gulf', 'levant', 'arab'],
  'americas': ['americas', 'latin america', 'south america', 'central america', 'caribbean', 'north america'],
  'oceania': ['oceania', 'pacific islands', 'polynesia', 'melanesia', 'micronesia'],
};

function parseWhoRssXml(xmlText) {
  if (!xmlText || typeof xmlText !== "string") return [];
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;
  const dateRegex = /<pubDate[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i;
  const linkRegex = /<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i;

  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[1];
    const titleMatch = block.match(titleRegex);
    const dateMatch = block.match(dateRegex);
    const linkMatch = block.match(linkRegex);
    if (titleMatch) {
      items.push({
        title: titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        pubDate: dateMatch ? dateMatch[1].trim() : null,
        link: linkMatch ? linkMatch[1].trim() : null,
      });
    }
  }
  return items;
}

async function fetchWhoFeed(rssUrl, sourceLabel) {
  for (let i = 0; i < WHO_PROXIES.length; i++) {
    const proxyFn = WHO_PROXIES[i];
    const proxyUrl = proxyFn(rssUrl);
    try {
      const r = await safeFetch(fetch(proxyUrl).then(res => res.text()));
      if (!r.ok || !r.data) continue;
      let items = [];
      try {
        const json = JSON.parse(r.data);
        if (json?.items && Array.isArray(json.items)) {
          items = json.items.map(it => ({
            title: it.title || "",
            pubDate: it.pubDate || null,
            link: it.link || null,
          }));
        }
      } catch {
        items = parseWhoRssXml(r.data);
      }
      if (items.length > 0) {
        return { items, live: true, source: i === 0 ? "rss2json" : `proxy-${i + 1}`, totalItems: items.length, feedLabel: sourceLabel };
      }
    } catch { continue; }
  }
  return { items: [], live: false, source: "all-failed", totalItems: 0, feedLabel: sourceLabel };
}

function extractOutbreaksFromItems(items, sourceLabel) {
  const outbreaks = {};
  const countryMap = Object.entries(COUNTRIES).map(([iso, c]) => ({ iso, name: c.name.toLowerCase(), aliases: [c.name.toLowerCase()] }));

  items.forEach(item => {
    const title = (item.title || '').toLowerCase();
    const matchedKeywords = WHO_DISEASE_KEYWORDS.filter(kw => title.includes(kw));
    if (matchedKeywords.length === 0) return;
    let matched = false;
    for (const cm of countryMap) {
      if (title.includes(cm.name)) {
        if (!outbreaks[cm.iso]) outbreaks[cm.iso] = [];
        for (const kw of matchedKeywords) outbreaks[cm.iso].push({ disease: kw, title: item.title, date: item.pubDate, link: item.link, source: sourceLabel });
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (const [regionKey, aliases] of Object.entries(WHO_REGION_ALIASES)) {
        for (const alias of aliases) {
          if (title.includes(alias)) {
            const regionCountries = Object.entries(COUNTRIES).filter(([iso, c]) => c.region === regionKey).sort((a, b) => b[1].fsi_score - a[1].fsi_score);
            if (regionCountries.length > 0) {
              const iso = regionCountries[0][0];
              if (!outbreaks[iso]) outbreaks[iso] = [];
              for (const kw of matchedKeywords) outbreaks[iso].push({ disease: kw, title: item.title, date: item.pubDate, link: item.link, source: sourceLabel, matched_by: "region", region: regionKey });
            }
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
  });
  return outbreaks;
}

async function fetchWHO() {
  if (!CFG.WHO_ENABLED) return { data: {}, live: false, _source: "disabled" };
  const [generalResult, donResult] = await Promise.all([
    fetchWhoFeed(WHO_GENERAL_RSS_URL, "WHO General News"),
    fetchWhoFeed(WHO_DON_RSS_URL, "WHO Disease Outbreak News"),
  ]);
  const generalOutbreaks = extractOutbreaksFromItems(generalResult.items, "WHO General");
  const donOutbreaks = extractOutbreaksFromItems(donResult.items, "WHO DON");
  const mergedOutbreaks = {};
  for (const [iso, list] of Object.entries(generalOutbreaks)) { (mergedOutbreaks[iso] ||= []).push(...list); }
  for (const [iso, list] of Object.entries(donOutbreaks))    { (mergedOutbreaks[iso] ||= []).push(...list); }
  const seen = new Set();
  for (const iso of Object.keys(mergedOutbreaks)) {
    mergedOutbreaks[iso] = mergedOutbreaks[iso].filter(o => {
      const key = `${o.disease}|${(o.title || '').slice(0, 80)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const totalItems = generalResult.totalItems + donResult.totalItems;
  const anyLive = generalResult.live || donResult.live;
  return {
    data: mergedOutbreaks,
    live: anyLive,
    _source: [
      generalResult.live ? `general:${generalResult.source}` : null,
      donResult.live ? `don:${donResult.source}` : null,
    ].filter(Boolean).join(" + ") || "all-failed",
    _general_feed: { live: generalResult.live, source: generalResult.source, items: generalResult.totalItems, countries_with_outbreaks: Object.keys(generalOutbreaks).length },
    _don_feed: { live: donResult.live, source: donResult.source, items: donResult.totalItems, countries_with_outbreaks: Object.keys(donOutbreaks).length },
    _totalItems: totalItems,
    _countries_with_outbreaks: Object.keys(mergedOutbreaks).length,
    _fetched_at: new Date().toISOString(),
  };
}

async function fetchAllLive(isos) {
  const [usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr, who] = await Promise.all([
    fetchUSGS(), fetchEMSC(), fetchNASA(), fetchGDACS(), fetchIFRC(),
    fetchHeatStress(), fetchWeatherHazards(), fetchAirQuality(), fetchNOAA(),
    fetchDiseaseSh(), fetchWorldBankAll(), fetchUNHCR(), fetchWHO(),
  ]);
  return { usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr, who };
}

// ─── EXTRACT SIGNALS (unchanged) ────────────────────────────────────────────

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  const coord = COUNTRIES[iso].cent || [0, 0];
  let liveEvidenceCount = 0;
  const evidenceSources = [];
  const signals = {};

  const quakesByName = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const quakesByGeo = (live.usgs.data || []).filter(f => {
    const c = f.geometry?.coordinates;
    if (!c || coord[0] === 0) return false;
    return findClosestCountry(c[0], c[1]) === iso;
  });
  const quakes = [...new Set([...quakesByName, ...quakesByGeo])];
  const topQuake = quakes.length ? quakes.reduce((a,b) => (b.properties?.mag || 0) > (a.properties?.mag || 0) ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = (topQuake.properties.place || "").split(",")[0].trim();
  }

  const emscQuakes = (live.emsc.data || []).filter(f => {
    const c = f.geometry?.coordinates;
    if (!c || coord[0] === 0) return false;
    return findClosestCountry(c[0], c[1]) === iso;
  });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a,b) => (b.properties?.mag || 0) > (a.properties?.mag || 0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("EMSC");
    if (!signals.quakeMag) {
      signals.quakeMag = topEMSC.properties.mag;
      signals.quakePlace = topEMSC.properties?.flynn_region || null;
    }
  }

  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const c = ev.geometry?.[0]?.coordinates;
    if (!c || coord[0] === 0) return false;
    return findClosestCountry(c[0], c[1]) === iso;
  });
  if (nasaEvents.length > 0) {
    liveEvidenceCount++; evidenceSources.push("NASA");
    signals.nasaEventCount = nasaEvents.length;
    signals.nasaEvents = nasaEvents;
  }

  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const affected = f.properties?.affectedcountries || [];
    if (affected.some(c => c.iso3 === iso)) return true;
    const c = f.geometry?.coordinates;
    if (!c || coord[0] === 0) return false;
    return findClosestCountry(c[0], c[1]) === iso;
  });
  const topGDACS = gdacsEvents.length > 0 ? gdacsEvents.reduce((a, b) => (b.properties?.alertscore || 0) > (a.properties?.alertscore || 0) ? b : a) : null;
  if (topGDACS) {
    liveEvidenceCount++; evidenceSources.push("GDACS");
    signals.gdacs = topGDACS;
    signals.gdacsAlert = topGDACS?.properties?.alertlevel?.toLowerCase() || null;
    signals.gdacsEventType = topGDACS?.properties?.eventtype || null;
    signals.gdacsCount = gdacsEvents.length;
  }

  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length > 0) {
    liveEvidenceCount++; evidenceSources.push("IFRC");
    signals.ifrcCount = ifrcEvents.length;
  }

  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= 35) {
    liveEvidenceCount++; evidenceSources.push("Open-Meteo Heat");
    signals.maxTempC = maxTempC;
  }

  if (live.hazards.live) {
    liveEvidenceCount++; evidenceSources.push("Open-Meteo Hazards");
    signals.hazards = live.hazards.data;
  }

  const aqData = live.aq.data[iso] || null;
  if (aqData && aqData.pm25 >= 35) {
    liveEvidenceCount++; evidenceSources.push("Open-Meteo AQ");
    signals.aq = aqData;
  }

  if (iso === 'USA' && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) {
    liveEvidenceCount++; evidenceSources.push("NOAA");
    signals.noaa = live.noaa.data;
  }

  const diseaseRow = (live.disease.data || []).find(d => {
    const cn = d.country || "";
    return cn.toLowerCase() === name || name.includes(cn.toLowerCase());
  });
  if (diseaseRow && diseaseRow.active > 1000) {
    liveEvidenceCount++; evidenceSources.push("disease.sh");
    signals.diseaseActive = diseaseRow.active;
  }

  const whoData = live.who?.data || null;
  if (whoData && whoData[iso] && whoData[iso].length > 0) {
    liveEvidenceCount++; evidenceSources.push("WHO");
    signals.whoOutbreaks = whoData[iso];
  }

  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
  const wbPoverty = live.wb.poverty.data[iso] || null;
  const wbPopulation = live.wb.population.data[iso] || null;

  if (wbPopulation && wbPopulation.value > 0) {
    liveEvidenceCount++; evidenceSources.push("WB Population");
    signals.population = wbPopulation.value;
  }
  if (wbInflation && wbInflation.value > 5) {
    liveEvidenceCount++; evidenceSources.push("WB Inflation");
    signals.wbInflation = wbInflation;
  }
  if (wbGdpGrowth && wbGdpGrowth.value < 0) {
    liveEvidenceCount++; evidenceSources.push("WB GDP");
    signals.wbGdpGrowth = wbGdpGrowth;
  }
  if (wbUnemployment && wbUnemployment.value > 10) {
    liveEvidenceCount++; evidenceSources.push("WB Unemployment");
    signals.wbUnemployment = wbUnemployment;
  }
  if (wbPoverty && wbPoverty.value > 5) {
    liveEvidenceCount++; evidenceSources.push("WB Poverty");
    signals.wbPoverty = wbPoverty;
  }

  const displacement = live.unhcr.data.displacement[iso] || null;
  const totalDisplaced = displacement ? (displacement.refugees||0) + (displacement.idps||0) + (displacement.asylum_seekers||0) : 0;
  if (totalDisplaced > 0) {
    liveEvidenceCount++; evidenceSources.push("UNHCR");
    signals.refugees = displacement?.refugees || 0;
    signals.idps = displacement?.idps || 0;
    signals.asylum_seekers = displacement?.asylum_seekers || 0;
    signals.totalDisplaced = totalDisplaced;
  }

  return {
    quakeMag: signals.quakeMag || 0, quakePlace: signals.quakePlace || null, quakeCount: quakes.length,
    nasaEventCount: signals.nasaEventCount || 0, nasaEvents: signals.nasaEvents || [],
    gdacs: signals.gdacs || null, gdacsAlert: signals.gdacsAlert || null,
    gdacsEventType: signals.gdacsEventType || null, gdacsCount: signals.gdacsCount || 0,
    ifrcCount: signals.ifrcCount || 0, maxTempC: signals.maxTempC || 0,
    hazards: signals.hazards || null, aq: signals.aq || null, noaa: signals.noaa || null,
    diseaseActive: signals.diseaseActive || 0, whoOutbreaks: signals.whoOutbreaks || [],
    population: signals.population || 0,
    wbInflation: signals.wbInflation || null, wbGdpGrowth: signals.wbGdpGrowth || null,
    wbUnemployment: signals.wbUnemployment || null, wbPoverty: signals.wbPoverty || null,
    refugees: signals.refugees || 0, idps: signals.idps || 0,
    asylum_seekers: signals.asylum_seekers || 0, totalDisplaced: signals.totalDisplaced || 0,
    liveEvidenceCount, evidenceSources,
  };
}

// ─── APPLY LIVE ADJUSTMENTS — now a thin wrapper around FRESCO ──────────────

/**
 * In v13.0, `applyLiveAdjustments` no longer does ad-hoc additive boosts.
 * It calls `signalsToEvidence` (L1) and then `frescoScore` (L2..L8).
 * The `dims` returned are the FRESCO-derived dimension values, kept for
 * backward compatibility with the payload builder.
 */
function applyLiveAdjustments(priorDims, signals, iso, store) {
  const country = COUNTRIES[iso];
  const { categoryPointMap, evidenceList, tierASourcesPresent, tierASources } = signalsToEvidence(iso, signals, store);

  // Build a WST-aware prior for the Bayesian step
  const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
  if (store && store[iso]) {
    store[iso].__wst = {
      class: wst.class, tier: wst.tier, recovery_rate: wst.recovery_rate,
      structural_weight: wst.structural_weight,
      fragility_multiplier: 1 + (1 - wst.recovery_rate) * 0.3,
      debt_sensitivity: wst.debt_sensitivity,
      reserve_currency: wst.reserve_currency || false,
      momentum_factor: wst.momentum_factor || 0.5,
      gdp_per_capita: wst.gdp_per_capita || 3000,
      extractive_penalty: wst.extractive_penalty || 10,
    };
  }

  // Historical series (seeded if empty) for L7
  const hist = store?.[iso]?.historical_scores || seedHistory(iso, clamp(composite(priorDims)));

  // Map category points → dimension nudges so the payload still shows dims
  const dims = { ...priorDims };
  const catToDim = {
    conflict: "conflict", disaster: "climate", health: "health",
    displacement: "displacement", economic: "economic", climate: "climate",
  };
  for (const [cat, pts] of Object.entries(categoryPointMap)) {
    const dim = catToDim[cat] || "economic";
    // Category points are small (0..~20). Scale into dimension space.
    dims[dim] = clamp((dims[dim] || 0) + pts * 0.35);
  }

  // Run FRESCO
  const fresco = frescoScore(iso, country, categoryPointMap, priorDims, evidenceList, hist, tierASourcesPresent);

  // Build audit trail
  const audit = [];
  for (const t of fresco.posterior.trace) {
    audit.push({
      source: t.sources.join("+"),
      field: t.category,
      delta: +t.weighted_obs.toFixed(2),
      reason: `FRESCO L1-L4 (corr ×${t.corroboration})`,
    });
  }
  if (fresco.coverage.bonus > 0) {
    audit.push({ source: "Coverage Entropy (L5)", field: "score", delta: +fresco.coverage.bonus.toFixed(2), reason: `${fresco.coverage.firing.length} categories firing` });
  }
  if (Math.abs(fresco.temporal.momentum) > 0.05) {
    audit.push({ source: "Temporal Fusion (L7)", field: "score", delta: fresco.temporal.momentum, reason: `v=${fresco.temporal.velocity}, a=${fresco.temporal.acceleration}` });
  }
  if (fresco.gate.applied) {
    audit.push({ source: "Consensus Gate v2 (L8)", field: "score", delta: fresco.gate.score - fresco.score, reason: fresco.gate.reason });
  }

  return {
    dims,
    score: fresco.score,
    audit,
    totalBoostRaw: fresco.posterior.evidence_sum,
    totalBoostCapped: fresco.posterior.evidence_sum,
    boostRatio: 1,
    dynamicCap: fresco.ceiling,
    // ── FRESCO diagnostics exposed for the payload ──
    fresco: {
      prior_mean: fresco.prior_mean,
      prior_sigma: fresco.prior_sigma,
      posterior_mean: fresco.posterior.mean,
      posterior_sigma: fresco.posterior.sigma,
      score_sigma: fresco.score_sigma,
      coverage: fresco.coverage,
      ceiling: fresco.ceiling,
      temporal: fresco.temporal,
      gate: fresco.gate,
      category_points: categoryPointMap,
      evidence_count: evidenceList.length,
      tier_a_sources: tierASources,
      evidence_trace: evidenceList.map(e => ({
        source: e.source, category: e.category, raw_points: +e.raw_points.toFixed(2),
        weight: e.source_weight, freshness: +freshnessFactor(e).toFixed(3),
        half_life_hours: e.half_life_hours, geo_confidence: e.geo_confidence,
      })),
    },
  };
}

// ─── BUILD STORE (updated to use FRESCO) ────────────────────────────────────

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
    let dims, score, audit, signals, fresco;
    if (liveData) {
      signals = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals, iso, store);
      dims = adjusted.dims; score = adjusted.score; audit = adjusted.audit;
      fresco = adjusted.fresco;
    } else {
      dims = priorDims; score = priorScore; audit = []; signals = {};
      fresco = null;
    }
    store[iso] = {
      ...country, dims, score, priorScore,
      liveBoost: score - priorScore, audit, signals,
      spillover: 0, ml_forecast: null, sentiment: null, historical_trend: null,
      fsi_score: fsiScore, fsi_rank: country.fsi_rank, fsi_band: country.fsi_band,
      __wst: null, __viral_metrics: null, __consensus_gate: null, __fresco: fresco,
    };
  }

  // Spillover — now modest and only applied to prior; FRESCO handles live evidence
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const rawSpillover = Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    const diminishingFactor = Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    store[iso].spillover = +(rawSpillover * diminishingFactor).toFixed(1);
    // Spillover is recorded; it influences the *next* build via signalsToEvidence
    // but is not blindly added here anymore.
  }

  // Legacy viral metrics — kept for payload compat, but no longer drive score.
  if (CFG.VIRAL_ENABLED) {
    for (const iso in store) {
      const vm = computeViralMomentumScore(iso, store[iso].score, store, store[iso].dims);
      store[iso].__viral_metrics = vm;
      store[iso].time_metrics = {
        velocity: vm.velocity, acceleration: vm.acceleration,
        surge_magnitude: vm.surgeMagnitude, is_surge: vm.isSurge,
        viral_status: vm.viralStatus, time_decay: vm.timeDecay,
        recency_weight: vm.recencyWeight, novelty_boost: vm.noveltyBoost,
        surge_bonus: vm.surgeBonus, viral_velocity_bonus: vm.viralVelocityBonus,
        decay_penalty: vm.decayPenalty, total_adjustment: vm.totalAdjustment,
        raw_score: vm.rawScore, fsi_anchor: vm.fsi_anchor,
        max_allowed: vm.max_allowed, min_allowed: vm.min_allowed,
        evidence_ceiling: store[iso].__fresco?.ceiling || vm.evidence_ceiling,
        viral_weight_applied: 0,
        live_evidence_count: store[iso].signals?.liveEvidenceCount || 0,
        consensus_gate_applied: store[iso].__fresco?.gate?.applied || false,
        consensus_categories_firing: store[iso].__fresco?.coverage?.firing?.length || 0,
      };
      store[iso].__consensus_gate = {
        applied: store[iso].__fresco?.gate?.applied || false,
        note: store[iso].__fresco?.gate?.reason || null,
        categories_firing: store[iso].__fresco?.coverage?.firing?.length || 0,
        categories: store[iso].__fresco?.coverage?.firing || null,
        pre_gate_score: vm.viral_score || store[iso].score,
      };
    }
  }

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

// ─── ANOMALY DETECTION (unchanged) ──────────────────────────────────────────

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
  const severity = fired.length >= 4 ? "EXTREME" : fired.length >= 3 ? "CRITICAL" : consensus && maxZ >= CFG.ANOMALY_Z_THRESHOLD * 1.5 ? "HIGH" : consensus ? "MODERATE" : fired.length === 1 ? "WATCH" : "NONE";
  return { detected: consensus, severity, direction, methods_fired: fired.length, methods, z_score: maxZ, note: consensus ? `${fired.length}/4 methods agree: ${direction} — ${severity}` : fired.length === 1 ? `Weak signal (1/4 methods)` : "No anomaly detected" };
}

function computeStoryHeat(iso, store, hist, anom, mlForecast) {
  const c = store[iso];
  const s = c.signals || {};
  const vm = c.__viral_metrics || {};
  let heat = 0;
  const drivers = [];
  if (vm.viral_status === "VIRAL") { const v = 20 + Math.min(15, Math.abs(vm.velocity) * 2); heat += v; drivers.push({ driver: "viral_status", points: v, detail: `🔥 VIRAL - ${Math.abs(vm.velocity).toFixed(1)} pts/day` }); }
  if (vm.is_surge) { const v = Math.min(15, vm.surgeMagnitude * 1.5); heat += v; drivers.push({ driver: "surge_detected", points: v, detail: `⚡ Surge: ${vm.surgeMagnitude.toFixed(1)} pt` }); }
  if (vm.novelty_boost > 0) { const v = Math.min(10, vm.novelty_boost); heat += v; drivers.push({ driver: "novelty", points: v, detail: `🆕 New crisis` }); }
  const delta7 = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  if (Math.abs(delta7) >= 2) { const v = Math.min(20, Math.abs(delta7) * 1.5); heat += v; drivers.push({ driver: "velocity", points: +v.toFixed(1), detail: `${delta7 > 0 ? "+" : ""}${delta7.toFixed(0)} pts in 7 days` }); }
  if (anom.detected) { const sevPts = { WATCH: 4, MODERATE: 8, HIGH: 12, CRITICAL: 16, EXTREME: 18 }; const v = sevPts[anom.severity] || 5; heat += v; drivers.push({ driver: "anomaly", points: v, detail: `${anom.methods_fired}/4 methods — ${anom.severity}` }); }
  if (mlForecast?.anomaly_probability > 0.4) { const v = Math.min(10, mlForecast.anomaly_probability * 14); heat += v; drivers.push({ driver: "ml_forecast", points: +v.toFixed(1), detail: `${(mlForecast.anomaly_probability * 100).toFixed(0)}% anomaly` }); }
  const evidenceCount = s.liveEvidenceCount || 0;
  if (evidenceCount >= 2) { const v = Math.min(10, evidenceCount * 1.5); heat += v; drivers.push({ driver: "evidence_breadth", points: +v.toFixed(1), detail: `${evidenceCount} live sources` }); }
  if (s.gdacsAlert === "red") heat += 12, drivers.push({ driver: "gdacs_red", points: 12, detail: "GDACS Red alert" });
  else if (s.gdacsAlert === "orange") heat += 8, drivers.push({ driver: "gdacs_orange", points: 8, detail: "GDACS Orange alert" });
  if (s.quakeMag >= 6.0) heat += 10, drivers.push({ driver: "major_quake", points: 10, detail: `M${s.quakeMag.toFixed(1)}` });
  else if (s.quakeMag >= 5.0) heat += 6, drivers.push({ driver: "moderate_quake", points: 6, detail: `M${s.quakeMag.toFixed(1)}` });
  if (s.whoOutbreaks?.length > 0) { const v = Math.min(10, s.whoOutbreaks.length * 3); heat += v; drivers.push({ driver: "who_outbreaks", points: v, detail: `${s.whoOutbreaks.length} WHO outbreaks` }); }
  if (s.totalDisplaced > 1_000_000) { const v = Math.min(15, Math.log10(s.totalDisplaced / 1_000_000 + 1) * 10); heat += v; drivers.push({ driver: "mass_displacement", points: +v.toFixed(1), detail: `${fmtPop(s.totalDisplaced)} displaced` }); }
  heat = Math.min(100, Math.round(heat));
  drivers.sort((a, b) => b.points - a.points);
  return { score: heat, is_breaking: heat >= 45, tier: heat >= 65 ? "BREAKING" : heat >= 45 ? "DEVELOPING" : heat >= 25 ? "NOTABLE" : "ROUTINE", top_drivers: drivers.slice(0, 3) };
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

// ─── Legacy viral momentum (kept for payload compat; does NOT drive score) ──

function computeViralMomentumScore(iso, currentScore, store, dims) {
  let hist = [];
  if (store && store[iso] && store[iso].historical_scores) {
    hist = store[iso].historical_scores;
  } else if (historyStore && historyStore.data && historyStore.data[iso]) {
    const rawHistory = historyStore.getHistory(iso, 30);
    if (rawHistory && rawHistory.length > 0) hist = rawHistory.map(d => d.score);
  }
  if (hist.length < 14) {
    hist = seedHistory(iso, currentScore);
    if (store && store[iso]) {
      if (!store[iso].historical_scores) store[iso].historical_scores = [];
      store[iso].historical_scores = hist;
    }
  }
  if (hist.length > 0 && hist[hist.length - 1] !== currentScore) {
    hist.push(currentScore);
    if (hist.length > 60) hist = hist.slice(-60);
  }
  const recent3 = hist.slice(-3), old3 = hist.slice(-6, -3);
  const velocity = recent3.length >= 3 && old3.length >= 3 ? (mean(recent3) - mean(old3)) / 3 : 0;
  const recent5 = hist.slice(-5), mid5 = hist.slice(-10, -5), old5 = hist.slice(-15, -10);
  const velocityRecent = recent5.length >= 5 && mid5.length >= 5 ? (mean(recent5) - mean(mid5)) / 5 : 0;
  const velocityOld = mid5.length >= 5 && old5.length >= 5 ? (mean(mid5) - mean(old5)) / 5 : 0;
  const acceleration = velocityRecent - velocityOld;
  const surgeWindow = Math.min(3, hist.length);
  const recentWindow = hist.slice(-surgeWindow);
  const priorWindow = hist.slice(-surgeWindow * 2, -surgeWindow);
  let surgeMagnitude = 0, isSurge = false;
  if (recentWindow.length >= 2 && priorWindow.length >= 2) {
    const spike = mean(recentWindow) - mean(priorWindow);
    if (spike > CFG.VIRAL_SURGE_THRESHOLD) { surgeMagnitude = spike; isSurge = true; }
  }
  const baselineMean = hist.length > 10 ? mean(hist.slice(0, -3)) : 50;
  const noveltyScore = Math.max(0, currentScore - baselineMean * 0.5);
  const noveltyBoost = noveltyScore > 15 ? CFG.VIRAL_NOVELTY_BONUS * 0.8 : 0;
  const maxScore = Math.max(...hist);
  const maxIndex = hist.indexOf(maxScore);
  const daysSincePeak = hist.length - 1 - maxIndex;
  const timeDecay = Math.exp(-daysSincePeak / CFG.VIRAL_MOMENTUM_DECAY);
  const accelBoost = acceleration > 0.5 ? acceleration * CFG.VIRAL_ACCELERATION_WEIGHT : 0;
  const viralStatus = velocity > CFG.VIRAL_VIRAL_THRESHOLD ? "VIRAL" : isSurge ? "SURGING" : velocity > CFG.VIRAL_SURGE_THRESHOLD ? "ACCELERATING" : "STABLE";
  const recencyWeight = CFG.VIRAL_RECENCY_WEIGHT * (1 + (hist.length > 7 ? 0.5 : 0));
  const diminishingFactor = currentScore > 70 ? CFG.VIRAL_DIMINISHING_RETURNS + (1 - CFG.VIRAL_DIMINISHING_RETURNS) * (90 - currentScore) / 20 : 1;
  const baseAdjustment = (accelBoost * recencyWeight) + noveltyBoost;
  const surgeBonus = isSurge ? Math.min(10, surgeMagnitude * 0.8) : 0;
  const viralVelocityBonus = velocity > 2 ? Math.min(8, velocity * 0.5) : 0;
  const decayPenalty = (1 - timeDecay) * 3;
  let totalAdjustment = (baseAdjustment + surgeBonus + viralVelocityBonus) * diminishingFactor - decayPenalty;
  totalAdjustment = Math.max(-15, Math.min(25, totalAdjustment));
  const liveEvidenceCount = store?.[iso]?.signals?.liveEvidenceCount || 0;
  const fsiBase = COUNTRIES[iso]?.fsi_score || 50;
  const fsiScore = Math.round((fsiBase / 120) * 100);
  const maxAllowed = Math.min(99, store?.[iso]?.__fresco?.ceiling || fsiScore + CFG.WST_MAX_BOOST_ABOVE_FSI);
  const minAllowed = Math.max(1, fsiScore - 20);
  let adjustedScore = clamp(currentScore + totalAdjustment);
  adjustedScore = Math.max(minAllowed, Math.min(maxAllowed, adjustedScore));
  if (store && store[iso]) {
    if (!store[iso].historical_scores) store[iso].historical_scores = [];
    if (store[iso].historical_scores.length === 0 || store[iso].historical_scores[store[iso].historical_scores.length - 1] !== currentScore) {
      store[iso].historical_scores.push(currentScore);
      if (store[iso].historical_scores.length > 60) store[iso].historical_scores = store[iso].historical_scores.slice(-60);
    }
    store[iso].__viral_metrics = {
      velocity, acceleration, surge_magnitude: surgeMagnitude, is_surge: isSurge,
      viral_status: viralStatus, time_decay: timeDecay, recency_weight: recencyWeight,
      novelty_boost: noveltyBoost, surge_bonus: surgeBonus,
      viral_velocity_bonus: viralVelocityBonus, decay_penalty: decayPenalty,
      base_adjustment: baseAdjustment, total_adjustment: totalAdjustment,
      diminishing_factor: diminishingFactor, raw_score: currentScore,
      fsi_anchor: fsiScore, max_allowed: maxAllowed, min_allowed: minAllowed,
      evidence_ceiling: maxAllowed, live_evidence_count: liveEvidenceCount,
      viral_score: adjustedScore,
    };
  }
  return store[iso]?.__viral_metrics || { velocity, acceleration, surgeMagnitude, isSurge, viralStatus, timeDecay, recencyWeight, noveltyBoost, surgeBonus, viralVelocityBonus, decayPenalty, totalAdjustment, rawScore: currentScore, fsi_anchor: fsiScore, max_allowed: maxAllowed, min_allowed: minAllowed, evidence_ceiling: maxAllowed, live_evidence_count: liveEvidenceCount };
}

// ─── PAYLOAD BUILDER (updated to expose FRESCO diagnostics) ─────────────────

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
  if (score >= 85) return { tier:"IMMEDIATE", text:`Immediate humanitarian response required.${an}` };
  if (score >= 75) return { tier:"URGENT", text:`Urgent response needed.${an}` };
  if (score >= 60) return { tier:"HIGH", text:`Elevated concern. Prepare response.${an}` };
  if (score >= 40) return { tier:"MONITOR", text:`Monitor situation.${an}` };
  return { tier:"WATCH", text:`Routine monitoring.${an}` };
}

function buildPayload(iso, store, ranked, opts = {}) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = Math.round(hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)]);
  const s = c.signals || {};
  const heat = computeStoryHeat(iso, store, hist, anom, c.ml_forecast);
  const vm = c.__viral_metrics || {};
  const cg = c.__consensus_gate || {};
  const fr = c.__fresco || {};
  const fsiBase = c.fsi_score || 50;

  return {
    iso, name: c.name, flag: c.flag, score: c.score,
    severity: severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    severity_color: severityColor(c.score),
    rank, total_countries: ranked.length,
    percentile: Math.round((1 - rank / ranked.length) * 100),
    slug: slugify(c.name),
    url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
    live_evidence_sources: s.evidenceSources || [],
    live_evidence_count: s.liveEvidenceCount || 0,
    is_live_data: s.liveEvidenceCount >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
    dimensions: Object.fromEntries(DIMS.map(d => [d.k, { value: c.dims[d.k] || 0, label: d.l, weight: d.w, icon: d.icon }])),
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️", color: ARC[t]?.color || "#6bc8ff" })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    trend: { delta_7d: delta7, direction: fc.trend, slope: fc.slope, forecast_7d: fc.fc, escalating: fc.esc, confidence: fc.confidence },
    anomaly: { detected: anom.detected, severity: anom.severity, direction: anom.direction, methods_fired: anom.methods_fired, z_score: anom.z_score, note: anom.note },
    consensus_gate: CFG.CONSENSUS_GATE_ENABLED ? {
      applied: cg.applied || false, note: cg.note || null,
      categories_firing: cg.categories_firing || 0, categories: cg.categories || null,
      pre_gate_score: cg.pre_gate_score || c.score, threshold: CFG.CONSENSUS_GATE_THRESHOLD,
    } : null,
    viral_momentum: CFG.VIRAL_ENABLED ? {
      velocity: vm.velocity || 0, acceleration: vm.acceleration || 0,
      surge_magnitude: vm.surgeMagnitude || 0, is_surge: vm.is_surge || false,
      viral_status: vm.viralStatus || "STABLE",
      time_decay: vm.timeDecay || 1, recency_weight: vm.recencyWeight || 0.4,
      novelty_boost: vm.noveltyBoost || 0, surge_bonus: vm.surgeBonus || 0,
      total_adjustment: vm.totalAdjustment || 0,
      evidence_ceiling: vm.evidence_ceiling || 0, live_evidence_count: vm.live_evidence_count || 0,
    } : null,
    spillover: { value: c.spillover, from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })) },
    story_heat: heat,
    live_evidence: {
      earthquake: s.quakeMag >= 4.5 ? { magnitude: s.quakeMag, location: s.quakePlace, event_count: s.quakeCount, source: "USGS/EMSC" } : null,
      nasa_events: s.nasaEventCount > 0 ? { count: s.nasaEventCount, source: "NASA EONET" } : null,
      gdacs: s.gdacs ? { alert_level: s.gdacsAlert, event_type: s.gdacsEventType, count: s.gdacsCount, source: "GDACS" } : null,
      ifrc: s.ifrcCount > 0 ? { count: s.ifrcCount, source: "IFRC GO" } : null,
      heat: s.maxTempC >= 35 ? { max_temp_c: s.maxTempC, source: "Open-Meteo" } : null,
      hazards: s.hazards ? { ...s.hazards, source: "Open-Meteo" } : null,
      air_quality: s.aq ? { ...s.aq, source: "Open-Meteo AQ" } : null,
      noaa: s.noaa ? { ...s.noaa, source: "NOAA" } : null,
      disease: s.diseaseActive > 0 ? { active: s.diseaseActive, source: "disease.sh" } : null,
      who_outbreaks: s.whoOutbreaks && s.whoOutbreaks.length > 0 ? { outbreaks: s.whoOutbreaks, source: "WHO (general + DON)" } : null,
      economic: {
        inflation: s.wbInflation ? { ...s.wbInflation, source: "World Bank" } : null,
        gdp_growth: s.wbGdpGrowth ? { ...s.wbGdpGrowth, source: "World Bank" } : null,
        unemployment: s.wbUnemployment ? { ...s.wbUnemployment, source: "World Bank" } : null,
        poverty: s.wbPoverty ? { ...s.wbPoverty, source: "World Bank" } : null,
        population: s.population ? { value: s.population, source: "World Bank" } : null,
      },
      displacement: s.totalDisplaced > 0 ? { total: s.totalDisplaced, refugees: s.refugees, idps: s.idps, asylum_seekers: s.asylum_seekers, source: "UNHCR" } : null,
    },
    ml: c.ml_forecast ? { forecast: c.ml_forecast.fc, confidence: c.ml_forecast.confidence, anomaly_probability: c.ml_forecast.anomaly_probability, trained: c.ml_forecast.ml_trained, training_count: c.ml_forecast.training_count } : null,
    sentiment: c.sentiment ? { score: c.sentiment.score, label: c.sentiment.label, confidence: c.sentiment.confidence, crisis_intensity: c.sentiment.crisis_intensity, key_terms: c.sentiment.key_terms } : null,
    historical: c.historical_trend ? { direction: c.historical_trend.direction, slope: c.historical_trend.slope, points: c.historical_trend.points, change: c.historical_trend.change } : null,
    time_metrics: c.time_metrics ? {
      velocity: c.time_metrics.velocity || 0, acceleration: c.time_metrics.acceleration || 0,
      total_adjustment: c.time_metrics.total_adjustment || 0, raw_score: c.time_metrics.raw_score || c.score,
      evidence_ceiling: c.time_metrics.evidence_ceiling || 0,
      viral_weight_applied: c.time_metrics.viral_weight_applied || 0,
      live_evidence_count: c.time_metrics.live_evidence_count || 0,
      consensus_gate_applied: c.time_metrics.consensus_gate_applied || false,
      consensus_categories_firing: c.time_metrics.consensus_categories_firing || 0,
    } : null,
    // ═══ v13.0 FRESCO DIAGNOSTICS ═══
    fresco: fr.posterior_mean !== undefined ? {
      prior_mean: fr.prior_mean,
      prior_sigma: fr.prior_sigma,
      posterior_mean: fr.posterior_mean,
      posterior_sigma: fr.posterior_sigma,
      score_sigma: fr.score_sigma,
      coverage: fr.coverage,
      ceiling: fr.ceiling,
      temporal: fr.temporal,
      gate: fr.gate,
      category_points: fr.category_points,
      evidence_count: fr.evidence_count,
      tier_a_sources: fr.tier_a_sources,
      evidence_trace: fr.evidence_trace,
    } : null,
    score_audit: {
      prior_score: c.priorScore, adjustments: c.audit || [], spillover: c.spillover,
      final_score: c.score, live_boost: c.liveBoost, fsi_base: fsiBase,
      dynamic_boost_cap: fr.ceiling || computeDynamicBoostCap(fsiBase),
      evidence_ceiling: fr.ceiling || 0,
      viral_weight_applied: 0,
      consensus_gate: CFG.CONSENSUS_GATE_ENABLED ? {
        applied: cg.applied || false, note: cg.note || null,
        categories_firing: cg.categories_firing || 0, pre_gate_score: cg.pre_gate_score || c.score,
      } : null,
      fresco_trace: (c.audit || []).map(a => ({ source: a.source, field: a.field, delta: a.delta, reason: a.reason })),
    },
    recommendation: recommendation(c.score, anom),
    region: c.region,
    fsi: { score: c.fsi_score, rank: c.fsi_rank, band: c.fsi_band },
    wst: CFG.WST_ENABLED && c.__wst ? {
      class: c.__wst.class, tier: c.__wst.tier,
      recovery_rate: c.__wst.recovery_rate, structural_weight: c.__wst.structural_weight,
      fragility_multiplier: c.__wst.fragility_multiplier,
      debt_sensitivity: c.__wst.debt_sensitivity,
      reserve_currency: c.__wst.reserve_currency,
      momentum_factor: c.__wst.momentum_factor,
    } : null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN HANDLER (unchanged API surface)
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
      force_live: url.searchParams.get("force_live") !== "false",
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
      if (aliases.includes(params.region)) { params.region = canonical; break; }
    }
  }

  if (params.q && !params.iso) {
    const resolved = findIsoByName(params.q);
    if (!resolved) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: `Could not resolve "${params.q}"` }));
      return;
    }
    params.iso = resolved;
  }

  const isoList = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s]) : [];
  const invalidISOs = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => !COUNTRIES[s]) : [];
  if (invalidISOs.length) {
    res.writeHead(404, CORS);
    res.end(JSON.stringify({ error: `Unknown ISO codes: ${invalidISOs.join(", ")}` }));
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

    if (!targetIsos.length) { res.writeHead(404, CORS); res.end(JSON.stringify({ error: "No countries matched" })); return; }

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
            meta: { generated_at: new Date().toISOString(), elapsed_ms: Date.now() - start, mode: "empty", message: "No countries currently have live evidence." },
            countries: [],
          }, null, 2));
          return;
        }
      }
    }

    for (const iso of Object.keys(store)) {
      const hist = seedHistory(iso, store[iso].score);
      const anom = runAnomalyDetection(hist);
      store[iso].__heat = computeStoryHeat(iso, store, hist, anom, store[iso].ml_forecast);
    }

    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, {}));

    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";

    const viralCountries = Object.keys(store).filter(iso => store[iso].__viral_metrics?.viralStatus === "VIRAL");
    const surgeCountries = Object.keys(store).filter(iso => store[iso].__viral_metrics?.is_surge);
    const gdacsRedAlerts = Object.keys(store).filter(iso => store[iso].signals?.gdacsAlert === "red");
    const gatedCountries = Object.keys(store).filter(iso => store[iso].__fresco?.gate?.applied);
    const maxedCountries = Object.keys(store).filter(iso => store[iso].score === 99);
    const heatProneWithData = Object.keys(store).filter(iso => (store[iso].signals?.maxTempC || 0) >= 35);
    const whoOutbreakCountries = Object.keys(store).filter(iso => (store[iso].signals?.whoOutbreaks || []).length > 0);
    const highUncertainty = Object.keys(store).filter(iso => (store[iso].__fresco?.score_sigma || 0) > 6);

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        version: "v13.0-fresco",
        scoring_engine: "FRESCO (L1-L8)",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_evidence: Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= 1).length,
        countries_with_heat_data: heatProneWithData.length,
        countries_with_who_outbreaks: whoOutbreakCountries.length,
        viral_countries: viralCountries.length,
        viral_isos: viralCountries.slice(0, 10),
        surge_countries: surgeCountries.length,
        surge_isos: surgeCountries.slice(0, 10),
        gdacs_red_alerts: gdacsRedAlerts.length,
        gdacs_red_isos: gdacsRedAlerts.slice(0, 10),
        gated_countries: gatedCountries.length,
        gated_isos: gatedCountries.slice(0, 10),
        high_uncertainty_countries: highUncertainty.length,
        countries_at_max_score: maxedCountries.length,
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        scoring_layers: {
          L1_evidence_ledger: "Typed, weighted, freshness-tagged evidence records",
          L2_bayesian_posterior: "FSI prior → Gaussian conjugate update with evidence",
          L3_freshness_kernel: "Per-source exponential decay (USGS τ=6h, WHO DON τ=24h, WB τ=2160h)",
          L4_corroboration: "Super-linear reinforcement for independent sources in same category",
          L5_coverage_entropy: "Shannon-style breadth bonus across 6 crisis categories",
          L6_dynamic_ceiling: "Ceiling = f(FSI tier, coverage, corroboration) capped at 99",
          L7_temporal_fusion: "Kalman-smoothed velocity + acceleration with diminishing returns",
          L8_consensus_gate_v2: "95/97/99 require 2/3/4 categories + ≥1 Tier-A source",
        },
        consensus_gate_v2: {
          enabled: CFG.FRESCO.GATE_ENABLED,
          tier_a_sources: CFG.FRESCO.GATE_TIER_A_SOURCES,
          requirements: CFG.FRESCO.GATE_REQUIREMENTS,
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
          who: {
            live: liveData.who.live,
            source: liveData.who._source || "unknown",
            total_items: liveData.who._totalItems || 0,
            countries_with_outbreaks: liveData.who._countries_with_outbreaks || 0,
            general_feed: liveData.who._general_feed || null,
            don_feed: liveData.who._don_feed || null,
          },
        },
      },
      ...(mode === "single" ? { top_story: payloads[0] } : {}),
      ...(mode === "list" ? { countries: payloads } : {}),
    };

    res.writeHead(200, {
      ...CORS,
      "Cache-Control": `public, s-maxage=300, stale-while-revalidate=30`,
    });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story v13.0-fresco]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
