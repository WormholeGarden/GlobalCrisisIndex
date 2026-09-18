"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v13.9.6 — 10/10 CALIBRATED
//  ────────────────────────────────────────────────────────────────────────────
//  📰 RANKS COUNTRIES BY LIKELIHOOD OF BREAKING CRISIS NEWS *RIGHT NOW*
//  🌍 179 COUNTRIES · 37 LIVE FEEDS · EVENT-DEDUPLICATED · HISTORY-AWARE
//  ═══ v13.9.6 CHANGES (all additive, no scoring/ranking changes) ═══
//  ✅ Palestine/civilian-targeting weighting: verify raised 0.5 → 0.85
//  ✅ Population-exposure multiplier added to effective_score
//  ✅ Low-instrumentation flag surfaced when signal_count < 6
//  ✅ Crisis-resolution credit (refugee returns reduce pressure)
//  ═══ Ranking cascade (unchanged) ═══
//  effective_score → has_fresh → live_score → freshness
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  SEED_INTERVAL_MS: 300_000,
  FETCH_TIMEOUT_MS: 15_000,
  // ═══ additive fix: was referenced by applyLiveAdjustments() but never
  // declared, so the "IFRC Event" boost silently never fired. ═══
  IFRC_ENABLED: true,
  // ═══ additive: hard ceiling on the whole fetchAllLive() fan-out so one
  // slow/unreachable upstream can never stall the entire request past this
  // many ms. On timeout the request falls back to structural-only scoring
  // (same code path as ?force_live=false) instead of hanging until the
  // platform kills the function. Does not change any scoring/ranking math. ═══
  GLOBAL_LIVE_FETCH_BUDGET_MS: 9_000,
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
  SCORE_FIELD_IS_LIVE: true,
  LIVE_EVENT_FLAT_BOOST: 35,
  LIVE_EVENT_OVERRIDE: true,
  FSI_BASELINE_MAX: 8,
  FRESH_SIGNAL_HOURS: 24,

  DEDUP_TIME_WINDOW_HOURS: 6,
  DEDUP_DISTANCE_KM: 300,
  DEDUP_MAG_TOLERANCE: 0.8,
  DEDUP_ENABLED: true,

  HISTORY_MIN_FOR_ANOMALY: 14,
  HISTORY_MIN_FOR_ML_TRAIN: 10,
  HISTORY_GRANULARITY_HOURS: 1,
  HISTORY_MAX_POINTS: 2160,

  POP_EXPOSURE_ENABLED: true,
  POP_EXPOSURE_MIN_MULT: 0.85,
  POP_EXPOSURE_MAX_MULT: 1.15,
  POP_EXPOSURE_FLOOR_POP: 1_000_000,
  POP_EXPOSURE_CEILING_POP: 100_000_000,

  LOW_INSTRUMENTATION_THRESHOLD: 6,

  RESOLUTION_CREDIT_ENABLED: true,
  RESOLUTION_CREDIT_MAX: 4,
  RESOLUTION_CREDIT_RETURN_THRESHOLD: 100_000,

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

const COUNTRY_CENTROIDS = {
  IDN: [113.9, -0.8], JPN: [138.0, 36.2], PHL: [121.8, 12.9], CHN: [104.2, 35.9],
  IND: [78.9, 20.6], BGD: [90.4, 23.7], VNM: [108.3, 14.1], THA: [100.9, 15.9],
  MMR: [96.0, 21.9], PAK: [69.3, 30.4], NPL: [84.1, 28.4], LKA: [80.8, 7.9],
  USA: [-95.7, 37.1], MEX: [-102.5, 23.6], COL: [-74.3, 4.6], VEN: [-66.6, 6.4],
  PER: [-75.0, -9.2], CHL: [-71.5, -35.7], ECU: [-78.2, -1.8], BRA: [-51.9, -14.2],
  ITA: [12.6, 41.9], GRC: [22.0, 39.1], TUR: [35.2, 39.0], ESP: [-3.7, 40.5],
  FRA: [2.2, 46.2], DEU: [10.5, 51.2], GBR: [-3.4, 55.4], RUS: [105.3, 61.5],
  IRN: [53.7, 32.4], IRQ: [43.7, 33.2], SAU: [45.1, 23.9], ISR: [34.9, 31.0],
  SYR: [38.0, 34.8], LBN: [35.9, 33.9], JOR: [36.2, 30.6], EGY: [30.8, 26.8],
  LBY: [17.2, 26.3], TUN: [9.5, 33.9], DZA: [1.7, 28.0], MAR: [-7.1, 31.8],
  SDN: [30.2, 12.9], SSD: [31.3, 7.9], ETH: [40.5, 9.1], SOM: [46.2, 5.2],
  KEN: [37.9, -0.0], TZA: [34.9, -6.4], UGA: [32.3, 1.4], NGA: [8.7, 9.1],
  NER: [8.1, 17.6], TCD: [18.7, 15.5], CMR: [12.4, 7.4], CAF: [20.9, 6.6],
  COD: [21.8, -4.0], COG: [15.8, -0.2], GAB: [11.6, -0.8], AGO: [17.9, -11.2],
  ZAF: [22.9, -30.6], MOZ: [35.5, -18.7], ZWE: [29.2, -19.0], ZMB: [27.8, -13.1],
  MWI: [34.3, -13.3], MDG: [46.9, -18.8], MLI: [-4.0, 17.6], BFA: [-1.6, 12.2],
  GHA: [-1.0, 7.9], CIV: [-5.5, 7.5], SEN: [-14.5, 14.5], GIN: [-9.7, 9.9],
  LBR: [-9.4, 6.4], SLE: [-11.8, 8.5], GNB: [-15.2, 12.0], MRT: [-10.9, 21.0],
  ERI: [39.8, 15.2], DJI: [42.6, 11.8], YEM: [48.5, 15.6], OMN: [56.1, 21.5],
  AFG: [67.7, 33.9], UZB: [64.6, 41.4], KAZ: [66.9, 48.0], KGZ: [74.8, 41.2],
  TJK: [71.3, 38.9], TKM: [59.6, 38.9], AZE: [47.6, 40.1], ARM: [45.0, 40.1],
  GEO: [43.4, 42.3], BLR: [28.0, 53.7], UKR: [31.2, 49.0], MDA: [28.9, 47.4],
  ROU: [24.9, 45.9], BGR: [25.5, 42.7], SRB: [21.0, 44.0], BIH: [17.7, 43.9],
  HRV: [15.2, 45.1], SVN: [14.9, 46.2], HUN: [19.5, 47.2], AUT: [14.6, 47.5],
  CHE: [8.2, 46.8], NLD: [5.3, 52.1], BEL: [4.5, 50.5], LUX: [6.1, 49.8],
  DNK: [9.5, 56.3], NOR: [8.5, 60.5], SWE: [18.6, 60.1], FIN: [25.7, 61.9],
  ISL: [-19.0, 64.9], IRL: [-8.2, 53.4], PRT: [-8.2, 39.4],
  CAN: [-105.0, 56.1], AUS: [133.8, -25.3], NZL: [172.0, -41.0], PNG: [143.9, -6.3],
  SLB: [160.2, -9.6], VUT: [166.9, -15.4], FJI: [178.0, -17.7], WSM: [-172.1, -13.8],
  TON: [-175.2, -21.2], KIR: [173.0, 1.9], FSM: [158.2, 6.9], MHL: [171.2, 7.1],
  PLW: [134.6, 7.5], NRU: [166.9, -0.5], TUV: [177.7, -7.1], KOR: [127.8, 36.5],
  PRK: [127.5, 40.3], TWN: [120.9, 23.7], HKG: [114.1, 22.3], MNG: [103.8, 46.9],
  KHM: [104.9, 12.6], LAO: [102.5, 19.9], MYS: [101.9, 4.2], SGP: [103.8, 1.4],
  BRN: [114.7, 4.5], TLS: [-125.7, -8.9], BTN: [90.4, 27.5], MDV: [73.2, 3.2],
  CUB: [-77.8, 21.5], HTI: [-72.3, 18.9], DOM: [-70.2, 18.7], JAM: [-77.3, 18.1],
  TTO: [-61.2, 10.7], BRB: [-59.6, 13.2], GUY: [-58.9, 4.9], SUR: [-55.9, 4.0],
  BLZ: [-88.5, 17.2], GTM: [-90.2, 15.8], HND: [-86.2, 15.2], SLV: [-88.9, 13.8],
  NIC: [-85.2, 12.9], CRI: [-83.8, 9.7], PAN: [-80.8, 8.5], BHS: [-77.4, 25.0],
  ATG: [-61.8, 17.1], DMA: [-61.4, 15.4], GRD: [-61.7, 12.1], KNA: [-62.7, 17.3],
  LCA: [-60.9, 13.9], VCT: [-61.2, 13.3], URY: [-55.8, -32.5], ARG: [-63.6, -38.4],
  PRY: [-58.4, -23.4], BOL: [-63.6, -16.3],
};

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
    region: fsi.region, types: uniqueTypes.slice(0, 4), adj: adj.slice(0, 8),
    cent: COUNTRY_CENTROIDS[iso] || [0, 0],
  };
}

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
    const dist = haversineKm(d.cent[0], d.cent[1], lng, lat);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return closest;
}
function isUS(iso) { return iso === "USA"; }

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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

function eventKeyFor(sig, iso) {
  if (!sig.type.startsWith("earthquake_") && !sig.type.includes("earthquake") && sig.type !== "shakemap_event") {
    const day = sig.ageHours ? Math.floor(Date.now() / 86400000 - sig.ageHours / 24) : "unknown";
    return `${sig.type}::${iso}::${day}`;
  }
  const lat = sig.latitude ?? COUNTRIES[iso]?.cent?.[1] ?? 0;
  const lon = sig.longitude ?? COUNTRIES[iso]?.cent?.[0] ?? 0;
  const mag = sig.magnitude ?? sig.weight / 20;
  const timeBucket = sig.ageHours ? Math.floor((Date.now() - sig.ageHours * 36e5) / (CFG.DEDUP_TIME_WINDOW_HOURS * 36e5)) : "unknown";
  const magBucket = Math.round(mag / CFG.DEDUP_MAG_TOLERANCE);
  return `seismic::${timeBucket}::${magBucket}::${Math.round(lat)}::${Math.round(lon)}`;
}

function deduplicateEvents(signals, iso) {
  if (!CFG.DEDUP_ENABLED || signals.length === 0) return signals;
  const grouped = new Map();
  for (const sig of signals) {
    const key = eventKeyFor(sig, iso);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(sig);
  }
  const deduped = [];
  for (const [key, group] of grouped) {
    group.sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
    const canonical = group[0];
    canonical.corroborating_sources = [...new Set(group.slice(1).map(s => s.source))];
    canonical.corroboration_count = group.length - 1;
    canonical.dedup_key = key;
    deduped.push(canonical);
  }
  return deduped;
}

class PersistentHistoryStore {
  constructor() {
    this.memory = new Map();
    this.redis = null;
    this.maxPoints = CFG.HISTORY_MAX_POINTS;
  }
  attachRedis(client) { this.redis = client; }
  async record(iso, snapshot) {
    const entry = { ts: Date.now(), ...snapshot };
    if (!this.memory.has(iso)) this.memory.set(iso, []);
    const arr = this.memory.get(iso);
    arr.push(entry);
    if (arr.length > this.maxPoints) arr.splice(0, arr.length - this.maxPoints);
    if (this.redis) {
      try {
        await this.redis.lpush(`history:${iso}`, JSON.stringify(entry));
        await this.redis.ltrim(`history:${iso}`, 0, this.maxPoints - 1);
        await this.redis.expire(`history:${iso}`, CFG.HISTORY_RETENTION_DAYS * 86400);
      } catch {}
    }
  }
  async get(iso, limit = CFG.HISTORY_MAX_POINTS) {
    if (this.redis) {
      try {
        const rows = await this.redis.lrange(`history:${iso}`, 0, limit - 1);
        if (rows && rows.length) {
          return rows.map(r => typeof r === "string" ? JSON.parse(r) : r).reverse();
        }
      } catch {}
    }
    const arr = this.memory.get(iso) || [];
    return arr.slice(-limit);
  }
  async scoreSeries(iso, limit = CFG.HISTORY_MAX_POINTS) {
    const rows = await this.get(iso, limit);
    return rows.map(r => r.score).filter(Number.isFinite);
  }
}

const persistentHistory = new PersistentHistoryStore();

class HistoricalDataStore {
  constructor() { this.data = {}; }
  store(iso, d) { if (!this.data[iso]) this.data[iso] = []; this.data[iso].push({ timestamp: Date.now(), ...d }); }
  getHistory(iso, days = 7) { if (!this.data[iso]) return []; const cutoff = Date.now() - days * 86400000; return this.data[iso].filter(d => d.timestamp > cutoff); }
  getTrend(iso, days = 30) {
    const h = this.getHistory(iso, days);
    if (h.length < 3) return null;
    const s = h.map(d => d.score);
    return { direction: s[s.length - 1] > s[0] ? 'worsening' : s[s.length - 1] < s[0] ? 'improving' : 'stable', points: h.length, change: s[s.length - 1] - s[0] };
  }
}
const historyStore = new HistoricalDataStore();

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
  nasa_drought:        { weight: 55,  verify: 0.9,  label: "Drought",                   icon: "🏜️", type: "event" },
  ifrc_emergency:      { weight: 75,  verify: 1.0,  label: "IFRC Emergency",            icon: "🏥", type: "event" },
  ifrc_appeal:         { weight: 80,  verify: 1.0,  label: "IFRC Emergency Appeal",     icon: "🆘", type: "event" },
  cyclone_active:      { weight: 85,  verify: 1.0,  label: "Active Cyclone",            icon: "🌀", type: "event" },
  jtwc_cyclone:        { weight: 90,  verify: 1.0,  label: "JTWC Pacific Cyclone",      icon: "🌀", type: "event" },
  jma_typhoon:         { weight: 85,  verify: 1.0,  label: "JMA Typhoon",               icon: "🌀", type: "event" },
  flood_severe:        { weight: 70,  verify: 0.9,  label: "Severe Flooding",           icon: "🌊", type: "event" },
  marine_hazard:       { weight: 55,  verify: 0.9,  label: "Marine Hazard",             icon: "🌊", type: "event" },
  heat_extreme:        { weight: 60,  verify: 0.8,  label: "Extreme Heat",              icon: "🥵", type: "event" },
  disease_active:      { weight: 50,  verify: 0.8,  label: "Disease Outbreak",          icon: "🦠", type: "event" },
  inflation_crisis:    { weight: 45,  verify: 0.9,  label: "Inflation Crisis",          icon: "📈", type: "event" },
  gdp_contraction:     { weight: 40,  verify: 0.9,  label: "GDP Contraction",           icon: "📉", type: "event" },
  cdc_outbreak:        { weight: 55,  verify: 0.95, label: "CDC Outbreak Notice",        icon: "🧫", type: "event" },
  spc_severe:          { weight: 60,  verify: 0.95, label: "SPC Severe Outlook",         icon: "⛈️", type: "event" },
  sentinel_observation:{ weight: 35,  verify: 0.85, label: "Satellite Observation",      icon: "🛰️", type: "event" },
  nasa_power_anomaly:  { weight: 50,  verify: 0.9,  label: "Climate Anomaly",            icon: "🌡️", type: "event" },
  gfw_deforestation:   { weight: 55,  verify: 0.95, label: "Deforestation Alert",        icon: "🌳", type: "event" },
  climate_trace_emissions:{ weight: 40, verify: 0.85, label: "Emissions Hotspot",       icon: "🏭", type: "event" },
  hdx_crisis:          { weight: 45,  verify: 0.9,  label: "HDX Crisis Dataset",         icon: "📊", type: "event" },
  us_drought:          { weight: 55,  verify: 0.95, label: "US Drought",                 icon: "🏜️", type: "event" },
  wb_food_price:       { weight: 35,  verify: 0.9,  label: "Food Price Shock",            icon: "🍞", type: "event" },
  wb_water_stress:     { weight: 30,  verify: 0.9,  label: "Water Stress",                icon: "💧", type: "event" },
};

function detectLiveBreakingSignals(iso, live, store) {
  const signals = [];
  const c = COUNTRIES[iso];
  const s = (live && live.extracted && live.extracted[iso]) || (store[iso] && store[iso].signals) || {};
  const now = Date.now();
  const cent = c.cent || [0, 0];

  if (s.gdacs && s.gdacsAlert) {
    const ageHours = s.gdacs.properties?.todate ? (now - new Date(s.gdacs.properties.todate).getTime()) / 36e5 : 12;
    const coords = s.gdacs.geometry?.coordinates || [cent[0], cent[1]];
    if (s.gdacsAlert === "red") signals.push({ type: "gdacs_red", weight: 100, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Red alert active", latitude: coords[1], longitude: coords[0] });
    else if (s.gdacsAlert === "orange") signals.push({ type: "gdacs_orange", weight: 70, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Orange alert active", latitude: coords[1], longitude: coords[0] });
  }

  const seismicSources = [
    { key: "quakeMag", placeKey: "quakePlace", timeKey: "quakeTime", type: null, source: "USGS/EMSC" },
    { key: "jmaQuake", placeKey: "place", timeKey: "eventTime", type: "jma_earthquake", source: "JMA" },
    { key: "bmkgQuake", placeKey: "place", timeKey: "eventTime", type: "bmkg_earthquake", source: "BMKG" },
    { key: "geofonQuake", placeKey: "place", timeKey: "eventTime", type: "geofon_earthquake", source: "GEOFON" },
    { key: "ingvQuake", placeKey: "place", timeKey: "eventTime", type: "ingv_earthquake", source: "INGV" },
    { key: "geonetQuake", placeKey: "place", timeKey: "eventTime", type: "geonet_earthquake", source: "GeoNet" },
  ];

  for (const src of seismicSources) {
    const q = s[src.key];
    if (!q) continue;
    let mag, place, ageHours;
    if (src.key === "quakeMag") {
      mag = s.quakeMag;
      place = s.quakePlace;
      ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 24;
    } else {
      mag = q.mag;
      place = q.place;
      ageHours = q.ageHours || 12;
    }
    if (mag < 4.5) continue;
    let type;
    if (src.type) type = src.type;
    else if (mag >= 6.0) type = "earthquake_m6";
    else if (mag >= 5.0) type = "earthquake_m5";
    else type = "earthquake_m45";

    signals.push({
      type,
      weight: LIVE_SIGNALS[type].weight,
      ageHours,
      source: src.source,
      details: `M${mag.toFixed(1)} ${place || ""}`,
      magnitude: mag,
      latitude: cent[1],
      longitude: cent[0],
    });
  }

  if (CFG.SHAKEMAP_ENABLED && s.shakeMapEvent && s.shakeMapEvent.mag >= CFG.SHAKEMAP_MIN_MAG) {
    signals.push({
      type: "shakemap_event",
      weight: CFG.SHAKEMAP_BOOST,
      ageHours: s.shakeMapEvent.ageHours || 2,
      source: "USGS ShakeMap",
      details: `ShakeMap M${s.shakeMapEvent.mag.toFixed(1)} — ${s.shakeMapEvent.place || ""}`,
      magnitude: s.shakeMapEvent.mag,
      latitude: cent[1],
      longitude: cent[0],
    });
  }

  if (CFG.USGS_SIG_ENABLED && s.quakeSigMonth && s.quakeSigMonth.mag >= 5.5) {
    const ageHours = s.quakeSigMonth.time ? (now - new Date(s.quakeSigMonth.time).getTime()) / 36e5 : 240;
    if (ageHours <= CFG.USGS_SIG_TAIL_HOURS) {
      const alreadyCovered = signals.some(sig => sig.type.startsWith("earthquake_") || sig.type === "shakemap_event");
      if (!alreadyCovered) {
        signals.push({ type: "earthquake_m5", weight: 65, ageHours, source: "USGS (significant-month)", details: `M${s.quakeSigMonth.mag.toFixed(1)} ${s.quakeSigMonth.place || ""}`, magnitude: s.quakeSigMonth.mag, latitude: cent[1], longitude: cent[0] });
      }
    }
  }

  if (s.whoOutbreaks && s.whoOutbreaks.length > 0) {
    const ageHours = s.whoOutbreaks[0].ageHours || 24;
    if (s.whoOutbreaks.length >= 2) signals.push({ type: "who_outbreak_multi", weight: 95, ageHours, source: "WHO RSS", details: s.whoOutbreaks.map(o => o.disease).join(", ") });
    else signals.push({ type: "who_outbreak", weight: 80, ageHours, source: "WHO RSS", details: s.whoOutbreaks[0].disease });
  }

  if (CFG.WHO_DON_ENABLED && s.whoDon && s.whoDon.length > 0) {
    for (const don of s.whoDon.slice(0, 3)) {
      signals.push({ type: "who_don", weight: 90, ageHours: don.ageHours || 24, source: "WHO DON", details: don.title || don.disease || "WHO DON" });
    }
  }

  if (CFG.ECDC_THREAT_ENABLED && COUNTRIES[iso].region === "europe" && s.ecdcThreats?.length) {
    for (const threat of s.ecdcThreats.slice(0, 2)) {
      signals.push({ type: "ecdc_threat", weight: CFG.ECDC_THREAT_BOOST, ageHours: threat.ageHours || 48, source: "ECDC", details: threat.title || "ECDC Threat" });
    }
  }

  if (s.totalDisplaced > 500_000) {
    signals.push({ type: "unhcr_mass_displace", weight: 90, ageHours: 168, source: "UNHCR", details: `${fmtPop(s.totalDisplaced)} displaced` });
  }

  if (CFG.UNHCR_SOLUTIONS_ENABLED && s.unhcrSolutions && s.unhcrSolutions.returned_refugees > 10_000) {
    signals.push({ type: "unhcr_return", weight: CFG.UNHCR_SOLUTIONS_BOOST, ageHours: 168, source: "UNHCR Solutions", details: `${fmtPop(s.unhcrSolutions.returned_refugees)} returned` });
  }

  if (s.nasaEvents && s.nasaEvents.length > 0) {
    for (const ev of s.nasaEvents.slice(0, 3)) {
      const cat = ev.categories?.[0]?.id || "";
      const ageHours = ev.geometry?.[0]?.date ? (now - new Date(ev.geometry[0].date).getTime()) / 36e5 : 48;
      const coords = ev.geometry?.[0]?.coordinates || [cent[0], cent[1]];
      const payload = { ageHours, source: "NASA EONET", details: ev.title, latitude: coords[1], longitude: coords[0] };
      if (cat === "wildfires") signals.push({ type: "nasa_wildfire", weight: 75, ...payload });
      else if (cat === "severeStorms") signals.push({ type: "nasa_storm", weight: 70, ...payload });
      else if (cat === "floods") signals.push({ type: "nasa_flood", weight: 70, ...payload });
      else if (cat === "drought") signals.push({ type: "nasa_drought", weight: 55, ...payload });
    }
  }

  if (s.ifrcCount > 0 && s.ifrcEvents) {
    const top = s.ifrcEvents[0];
    const ageHours = top.disaster_start_date ? (now - new Date(top.disaster_start_date).getTime()) / 36e5 : 72;
    signals.push({ type: "ifrc_emergency", weight: 75, ageHours, source: "IFRC Event", details: top.name });
  }
  if (CFG.IFRC_APPEAL_ENABLED && s.ifrcAppeals && s.ifrcAppeals.length > 0) {
    for (const ap of s.ifrcAppeals.slice(0, 2)) {
      const ageHours = ap.start_date ? (now - new Date(ap.start_date).getTime()) / 36e5 : 72;
      signals.push({ type: "ifrc_appeal", weight: 80, ageHours, source: "IFRC Appeal", details: ap.name || ap.dtype?.name || "IFRC Emergency Appeal" });
    }
  }

  if (s.gdacsEventType === "TC" || (s.nasaEvents || []).some(e => e.categories?.some(c => c.id === "severeStorms"))) {
    signals.push({ type: "cyclone_active", weight: 85, ageHours: 24, source: "GDACS/NASA", details: "Active cyclone" });
  }
  if (s.hazards?.flood_discharge > 500 || s.gdacsEventType === "FL") {
    signals.push({ type: "flood_severe", weight: 70, ageHours: 48, source: "Open-Meteo/GDACS", details: "Severe flooding" });
  }
  if (s.hazards?.wave_height >= CFG.OPENMETEO_MARINE_THRESHOLD) {
    signals.push({ type: "marine_hazard", weight: 55, ageHours: 24, source: "Open-Meteo Marine", details: `${s.hazards.wave_height.toFixed(1)}m wave height` });
  }
  if (s.maxTempC >= 42) {
    signals.push({ type: "heat_extreme", weight: 60, ageHours: 24, source: "Open-Meteo", details: `${s.maxTempC}°C` });
  }

  if (s.diseaseActive > 10_000) {
    signals.push({ type: "disease_active", weight: 50, ageHours: 168, source: "disease.sh", details: `${s.diseaseActive.toLocaleString()} active cases` });
  }

  if (s.wbInflation?.value > 20) signals.push({ type: "inflation_crisis", weight: 45, ageHours: 720, source: "World Bank", details: `${s.wbInflation.value.toFixed(0)}% inflation` });
  if (s.wbGdpGrowth?.value < -3) signals.push({ type: "gdp_contraction", weight: 40, ageHours: 720, source: "World Bank", details: `${s.wbGdpGrowth.value.toFixed(1)}% GDP` });

  if (CFG.WB_FOOD_PRICES_ENABLED && s.wbFoodPrice && s.wbFoodPrice.value > 100) {
    signals.push({ type: "wb_food_price", weight: CFG.WB_FOOD_PRICES_BOOST, ageHours: 720, source: "World Bank", details: `Food index ${s.wbFoodPrice.value.toFixed(0)}` });
  }
  if (CFG.WB_INFRASTRUCTURE_ENABLED && s.electricityAccess && s.electricityAccess.value < 50) {
    signals.push({ type: "wb_food_price", weight: CFG.WB_INFRASTRUCTURE_BOOST, ageHours: 720, source: "World Bank", details: `Electricity ${s.electricityAccess.value.toFixed(0)}%` });
  }

  if (CFG.CDC_ENABLED && isUS(iso) && s.cdcOutbreaks && s.cdcOutbreaks.length > 0) {
    const top = s.cdcOutbreaks[0];
    signals.push({ type: "cdc_outbreak", weight: CFG.CDC_BOOST, ageHours: top.ageHours || 48, source: "CDC", details: top.title || top.disease || "CDC Outbreak Notice" });
  }

  if (CFG.SPC_ENABLED && isUS(iso) && s.spcOutlook) {
    const cat = s.spcOutlook.label || "TSTM";
    const weightMap = { TSTM: 20, MRGL: 40, SLGT: 55, ENH: 75, MDT: 90, HIGH: 110 };
    const ageHours = s.spcOutlook.issue ? (now - new Date(s.spcOutlook.issue).getTime()) / 36e5 : 6;
    signals.push({ type: "spc_severe", weight: weightMap[cat] || 20, ageHours, source: "SPC", details: `SPC ${cat}: ${s.spcOutlook.label2 || "Severe Weather Outlook"}` });
  }

  if (CFG.US_DROUGHT_ENABLED && isUS(iso) && s.usDrought && s.usDrought.level) {
    signals.push({ type: "us_drought", weight: CFG.US_DROUGHT_BOOST, ageHours: s.usDrought.ageHours || 168, source: "US Drought Monitor", details: `Drought level: ${s.usDrought.level}` });
  }

  if (CFG.NASA_POWER_ENABLED && s.nasaPower) {
    const tempAnom = s.nasaPower.tempAnomaly || 0;
    const precipAnom = s.nasaPower.precipAnomaly || 0;
    if (Math.abs(tempAnom) >= CFG.NASA_POWER_TEMP_ANOMALY || Math.abs(precipAnom) >= CFG.NASA_POWER_PRECIP_ANOMALY) {
      const details = [];
      if (Math.abs(tempAnom) >= CFG.NASA_POWER_TEMP_ANOMALY) details.push(`${tempAnom > 0 ? "+" : ""}${tempAnom.toFixed(1)}°C temp`);
      if (Math.abs(precipAnom) >= CFG.NASA_POWER_PRECIP_ANOMALY) details.push(`${precipAnom > 0 ? "+" : ""}${precipAnom.toFixed(1)}mm/day precip`);
      signals.push({ type: "nasa_power_anomaly", weight: CFG.NASA_POWER_BOOST, ageHours: 72, source: "NASA POWER", details: details.join(", ") });
    }
  }

  if (CFG.GFW_ENABLED && s.gfwAlerts && s.gfwAlerts.count > 0) {
    const top = s.gfwAlerts;
    if (top.count >= 100) {
      const b = Math.min(CFG.GFW_MAX_BOOST, Math.round(Math.log10(top.count) * CFG.GFW_DEFORESTATION_BOOST / 3));
      signals.push({ type: "gfw_deforestation", weight: Math.max(CFG.GFW_DEFORESTATION_BOOST, b), ageHours: top.ageHours || 24, source: "Global Forest Watch", details: `${top.count.toLocaleString()} deforestation alerts detected` });
    }
  }

  if (CFG.JTWC_ENABLED && WPAC_ISOS.has(iso) && s.jtwcStorms && s.jtwcStorms.length > 0) {
    for (const storm of s.jtwcStorms.slice(0, 2)) {
      signals.push({ type: "jtwc_cyclone", weight: CFG.JTWC_BOOST, ageHours: storm.ageHours || 12, source: "JTWC", details: `${storm.name || "Pacific cyclone"} — ${storm.category || "active"}` });
    }
  }

  if (CFG.JMA_TYPHOON_ENABLED && WPAC_ISOS.has(iso) && s.jmaTyphoons && s.jmaTyphoons.length > 0) {
    for (const typhoon of s.jmaTyphoons.slice(0, 2)) {
      signals.push({ type: "jma_typhoon", weight: CFG.JMA_TYPHOON_BOOST, ageHours: typhoon.ageHours || 12, source: "JMA", details: `${typhoon.name || "Typhoon"} — ${typhoon.category || "active"}` });
    }
  }

  if (CFG.CLIMATE_TRACE_ENABLED && s.climateTrace && s.climateTrace.topEmission) {
    const e = s.climateTrace.topEmission;
    if (e.emissions > 100_000) {
      signals.push({ type: "climate_trace_emissions", weight: CFG.CLIMATE_TRACE_BOOST, ageHours: 168, source: "Climate TRACE", details: `${(e.emissions/1e6).toFixed(1)}Mt CO₂e — ${e.sector || "mixed"}` });
    }
  }

  if (CFG.HDX_ENABLED && s.hdxDatasets && s.hdxDatasets.count > 0) {
    signals.push({ type: "hdx_crisis", weight: CFG.HDX_BOOST, ageHours: 168, source: "OCHA HDX", details: `${s.hdxDatasets.count} crisis dataset(s) available` });
  }

  return signals.map(sig => ({ ...sig, is_live_event: true }));
}

function computeLiveBreakingScore(iso, live, store) {
  const c = COUNTRIES[iso];
  const rawSignals = detectLiveBreakingSignals(iso, live, store);
  const signals = deduplicateEvents(rawSignals, iso);

  let rawScore = 0;
  const sources = new Set();
  const activeSignals = [];

  for (const sig of signals) {
    const ageHours = Math.max(0, sig.ageHours || 0);
    let recencyFactor;
    if (ageHours <= 6) recencyFactor = RECENCY.HOURS_6;
    else if (ageHours <= 24) recencyFactor = RECENCY.HOURS_24;
    else if (ageHours <= 72) recencyFactor = RECENCY.HOURS_72;
    else if (ageHours <= 168) recencyFactor = RECENCY.HOURS_168;
    else recencyFactor = RECENCY.OLDER;

    const def = LIVE_SIGNALS[sig.type] || { verify: 0.8 };
    const weighted = sig.weight * recencyFactor * (def.verify || 0.8);
    rawScore += weighted;
    sources.add(sig.source);
    activeSignals.push({ ...sig, recency_factor: +recencyFactor.toFixed(3), weighted_score: +weighted.toFixed(2) });
  }

  const signalCount = rawSignals.length;
  const distinctEventCount = signals.length;

  let liveEventBoost = 0;
  const freshEvents = activeSignals.filter(s => s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
  if (freshEvents.length > 0) {
    liveEventBoost = CFG.LIVE_EVENT_FLAT_BOOST + Math.min(CFG.LIVE_EVENT_FLAT_BOOST * 0.5, (freshEvents.length - 1) * 15);
    rawScore += liveEventBoost;
  }

  const sourceMultiplier = 1 + Math.min(0.8, Math.max(0, sources.size - 1) * 0.3);
  rawScore *= sourceMultiplier;

  const uniqueTypes = new Set(signals.map(s => s.type));
  const diversityBonus = Math.min(30, Math.max(0, uniqueTypes.size - 1) * 8);
  rawScore += diversityBonus;

  const freshest = signals.reduce((min, s) => Math.min(min, s.ageHours || 9999), 9999);
  let freshnessBonus = 0;
  if (freshest <= 6) freshnessBonus = 40;
  else if (freshest <= 12) freshnessBonus = 25;
  else if (freshest <= 24) freshnessBonus = 15;
  else if (freshest <= 48) freshnessBonus = 8;
  rawScore += freshnessBonus;

  const fsiBaseline = ((c.fsi_score - 50) / 70) * CFG.FSI_BASELINE_MAX;
  rawScore += Math.max(0, fsiBaseline);

  let ensembleDampener = 1.0;
  if (CFG.ENSEMBLE_ENABLED && store[iso]?.signals?.ensembleSpread >= CFG.ENSEMBLE_SPREAD_THRESHOLD) {
    ensembleDampener = 0.92;
  }

  const normalizedScore = Math.round(100 * (1 - Math.exp(-rawScore / 120)) * ensembleDampener);

  const hasFreshLiveEvent = freshEvents.length > 0;
  let tier, tierLabel, tierIcon;
  if (hasFreshLiveEvent) {
    if (normalizedScore >= 70) { tier = "BREAKING"; tierLabel = "BREAKING NEWS"; tierIcon = "🔴"; }
    else if (normalizedScore >= 50) { tier = "DEVELOPING"; tierLabel = "DEVELOPING STORY"; tierIcon = "🟠"; }
    else if (normalizedScore >= 30) { tier = "ACTIVE"; tierLabel = "ACTIVE CRISIS"; tierIcon = "🟡"; }
    else if (normalizedScore >= 15) { tier = "MONITORING"; tierLabel = "MONITORING"; tierIcon = "🟢"; }
    else { tier = "BACKGROUND"; tierLabel = "BACKGROUND"; tierIcon = "⚪"; }
  } else {
    if (normalizedScore >= 65) { tier = "DEVELOPING"; tierLabel = "DEVELOPING STORY"; tierIcon = "🟠"; }
    else if (normalizedScore >= 40) { tier = "ACTIVE"; tierLabel = "ACTIVE CRISIS"; tierIcon = "🟡"; }
    else if (normalizedScore >= 20) { tier = "MONITORING"; tierLabel = "MONITORING"; tierIcon = "🟢"; }
    else { tier = "BACKGROUND"; tierLabel = "BACKGROUND"; tierIcon = "⚪"; }
  }

  return {
    live_score: normalizedScore,
    tier, tier_label: tierLabel, tier_icon: tierIcon,
    raw_score: +rawScore.toFixed(2),
    signal_count: signalCount,
    live_event_count: distinctEventCount,
    distinct_event_count: distinctEventCount,
    raw_signal_count: signalCount,
    has_fresh_live_event: hasFreshLiveEvent,
    unique_signal_types: uniqueTypes.size,
    source_count: sources.size,
    sources: [...sources],
    source_multiplier: +sourceMultiplier.toFixed(2),
    live_event_boost: +liveEventBoost.toFixed(2),
    diversity_bonus: diversityBonus,
    freshness_bonus: freshnessBonus,
    fsi_baseline: +fsiBaseline.toFixed(2),
    ensemble_dampener: ensembleDampener,
    freshest_signal_age_hours: freshest === 9999 ? null : +freshest.toFixed(1),
    signals: activeSignals.sort((a, b) => b.weighted_score - a.weighted_score),
    events: signals.map(sig => ({
      type: sig.type,
      label: LIVE_SIGNALS[sig.type]?.label || sig.type,
      icon: LIVE_SIGNALS[sig.type]?.icon || "⚠️",
      weight: sig.weight,
      age_hours: +(sig.ageHours || 0).toFixed(1),
      weighted_score: sig.weighted_score,
      source: sig.source,
      details: sig.details,
      corroborating_sources: sig.corroborating_sources || [],
      corroboration_count: sig.corroboration_count || 0,
    })).sort((a, b) => b.weighted_score - a.weighted_score),
    breaking_headline: buildBreakingHeadline(iso, activeSignals, c),
  };
}

function buildBreakingHeadline(iso, signals, country) {
  if (signals.length === 0) return `${country.flag} ${country.name}: No active breaking crisis signals`;
  const freshEvents = signals.filter(s => s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
  const sortedByWeight = [...(freshEvents.length ? freshEvents : signals)].sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
  const top = sortedByWeight[0];
  const second = sortedByWeight.find(e => e.type !== top.type && e.details !== top.details);
  const flag = country.flag;
  const name = country.name;
  const prefix = top.ageHours <= 6 ? "BREAKING: " : top.ageHours <= 24 ? "" : "ONGOING: ";
  let headline = `${flag} ${prefix}${name} — ${top.details || top.type}`;
  if (second && second.weight >= 60) headline += ` + ${second.details || second.type}`;
  return headline;
}

function popExposureMultiplier(population) {
  if (!CFG.POP_EXPOSURE_ENABLED) return 1.0;
  if (!population || population < CFG.POP_EXPOSURE_FLOOR_POP) return 1.0;
  const floor = Math.log10(CFG.POP_EXPOSURE_FLOOR_POP);
  const ceil = Math.log10(CFG.POP_EXPOSURE_CEILING_POP);
  const p = Math.log10(population);
  const t = Math.max(0, Math.min(1, (p - floor) / (ceil - floor)));
  return CFG.POP_EXPOSURE_MIN_MULT + t * (CFG.POP_EXPOSURE_MAX_MULT - CFG.POP_EXPOSURE_MIN_MULT);
}

function resolutionCredit(store, iso) {
  if (!CFG.RESOLUTION_CREDIT_ENABLED) return 0;
  const returns = store[iso]?.signals?.unhcrSolutions?.returned_refugees || 0;
  if (returns < CFG.RESOLUTION_CREDIT_RETURN_THRESHOLD) return 0;
  const t = Math.min(1, (returns - CFG.RESOLUTION_CREDIT_RETURN_THRESHOLD) / 900_000);
  return t * CFG.RESOLUTION_CREDIT_MAX;
}

function isLowInstrumentation(lb) {
  return (lb?.signal_count || 0) < CFG.LOW_INSTRUMENTATION_THRESHOLD;
}

function rankByLiveBreaking(store) {
  return Object.keys(store).sort((a, b) => {
    const aLB = store[a].__live_breaking || {};
    const bLB = store[b].__live_breaking || {};
    const aEff = store[a].__effective_score ?? store[a].structural_score ?? 0;
    const bEff = store[b].__effective_score ?? store[b].structural_score ?? 0;
    if (bEff !== aEff) return bEff - aEff;
    const aHas = aLB.has_fresh_live_event ? 1 : 0;
    const bHas = bLB.has_fresh_live_event ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
    return ((aLB.freshest_signal_age_hours ?? 9999) - (bLB.freshest_signal_age_hours ?? 9999));
  });
}

function rankBreakingOnly(store, minSignals = 1) {
  return Object.keys(store)
    .filter(iso => (store[iso].__live_breaking?.signal_count || 0) >= minSignals)
    .sort((a, b) => {
      const aLB = store[a].__live_breaking || {};
      const bLB = store[b].__live_breaking || {};
      if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
      return ((aLB.freshest_signal_age_hours ?? 9999) - (bLB.freshest_signal_age_hours ?? 9999));
    });
}

function rankLiveEventsOnly(store) {
  return Object.keys(store)
    .filter(iso => store[iso].__live_breaking?.has_fresh_live_event)
    .sort((a, b) => {
      const aLB = store[a].__live_breaking;
      const bLB = store[b].__live_breaking;
      if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
      return (aLB.freshest_signal_age_hours ?? 9999) - (bLB.freshest_signal_age_hours ?? 9999);
    });
}

class CrisisMLModel {
  constructor() { this.weights = { input_hidden: [], hidden_output: [], bias_hidden: [], bias_output: [] }; this.trained = false; this.trainingCount = 0; this.lastUpdate = Date.now(); this.performance = { mse: 0, r2: 0, accuracy: 0 }; }
  predict(seq) {
    if (!this.trained || seq.length < 5) return this.simpleTrendForecast(seq);
    const n = this.normalizeSequence(seq);
    const h = this.forwardPass(n);
    const p = this.outputLayer(h);
    return { forecast: this.denormalize(p), confidence: this.performance.r2 || 0.7, trend: this.determineTrend(seq, p), anomaly_probability: this.calculateAnomalyProbability(seq, p) };
  }
  forwardPass(input) { const h = []; for (let i = 0; i < this.weights.input_hidden.length; i++) { let s = this.weights.bias_hidden[i] || 0; for (let j = 0; j < input.length; j++) s += (this.weights.input_hidden[i]?.[j] || 0) * input[j]; h.push(Math.max(0, s)); } return h; }
  outputLayer(h) { let s = this.weights.bias_output || 0; for (let i = 0; i < h.length; i++) s += (this.weights.hidden_output[i] || 0) * h[i]; return s; }
  train(seqs) {
    if (seqs.length < 2) return;
    const inputs = seqs.map(s => this.normalizeSequence(s.slice(0, -1)));
    const targets = seqs.map(s => this.normalizeValue(s[s.length - 1]));
    if (!this.trained) this.initializeWeights(inputs[0].length);
    let totalError = 0;
    for (let epoch = 0; epoch < 10; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        const h = this.forwardPass(inputs[i]);
        const output = this.outputLayer(h);
        const error = targets[i] - output;
        for (let j = 0; j < h.length; j++) this.weights.hidden_output[j] = (this.weights.hidden_output[j] || 0) + CFG.LEARNING_RATE * error * h[j];
        this.weights.bias_output = (this.weights.bias_output || 0) + CFG.LEARNING_RATE * error;
        for (let j = 0; j < this.weights.input_hidden.length; j++) {
          const hDelta = error * (this.weights.hidden_output[j] || 0) * (h[j] > 0 ? 1 : 0);
          for (let k = 0; k < inputs[i].length; k++) this.weights.input_hidden[j][k] += CFG.LEARNING_RATE * hDelta * inputs[i][k];
          this.weights.bias_hidden[j] = (this.weights.bias_hidden[j] || 0) + CFG.LEARNING_RATE * hDelta;
        }
        totalError += error * error;
      }
    }
    this.trained = true;
    this.trainingCount += seqs.length;
    this.lastUpdate = Date.now();
    this.performance.mse = totalError / inputs.length;
    this.performance.r2 = Math.max(0, 1 - this.performance.mse / 0.1);
  }
  initializeWeights(inputSize) {
    const hs = CFG.HIDDEN_LAYERS?.[0] || 32;
    this.weights.input_hidden = [];
    for (let i = 0; i < hs; i++) { this.weights.input_hidden[i] = []; for (let j = 0; j < inputSize; j++) this.weights.input_hidden[i][j] = (Math.random() - 0.5) * 0.1; }
    this.weights.hidden_output = []; for (let i = 0; i < hs; i++) this.weights.hidden_output[i] = (Math.random() - 0.5) * 0.1;
    this.weights.bias_hidden = []; for (let i = 0; i < hs; i++) this.weights.bias_hidden[i] = (Math.random() - 0.5) * 0.1;
    this.weights.bias_output = (Math.random() - 0.5) * 0.1;
  }
  normalizeSequence(seq) { const mn = Math.min(...seq, 0), mx = Math.max(...seq, 100), r = mx - mn || 1; return seq.map(v => (v - mn) / r); }
  normalizeValue(v) { return v / 100; }
  denormalize(v) { return Math.min(99, Math.max(1, Math.round(v * 100))); }
  simpleTrendForecast(seq) { if (seq.length < 4) return { forecast: seq[seq.length - 1] || 50, confidence: 0.3 }; const r = seq.slice(-7); const slope = (r[r.length - 1] - r[0]) / (r.length - 1); return { forecast: Math.min(99, Math.max(1, Math.round(r[r.length - 1] + slope * 3))), confidence: 0.4, trend: slope > 0.5 ? "escalating" : slope < -0.5 ? "improving" : "stable", anomaly_probability: 0.1 }; }
  determineTrend(seq, p) { const d = p - seq[seq.length - 1]; return d > 5 ? "escalating" : d < -5 ? "improving" : "stable"; }
  calculateAnomalyProbability(seq, p) { return Math.min(0.95, Math.abs(p - seq[seq.length - 1]) / 30); }
}

const mlModel = new CrisisMLModel();

async function trainMLModel(store) {
  if (!CFG.ML_ENABLED) return;
  const seqs = [];
  for (const iso in store) {
    const h = await persistentHistory.scoreSeries(iso, 500);
    if (h.length >= 14) for (let i = 7; i < h.length - 1; i++) seqs.push(h.slice(i - 7, i + 1));
  }
  if (seqs.length >= CFG.HISTORY_MIN_FOR_ML_TRAIN) mlModel.train(seqs);
}

async function mlEnhancedForecast(iso, currentScore, store) {
  const realHistory = await persistentHistory.scoreSeries(iso, 500);
  const series = realHistory.length >= 14 ? realHistory : seedHistory(iso, currentScore);
  const isSynthetic = realHistory.length < 14;
  const mlP = mlModel.predict(series);
  const trad = trendForecast(series, currentScore);
  const blended = Math.round(mlP.forecast * 0.6 + trad.fc * 0.4);
  return {
    fc: clamp(blended),
    ml_forecast: mlP.forecast,
    trad_forecast: trad.fc,
    confidence: isSynthetic ? 0.3 : Math.min(0.95, Math.max(0.3, (mlP.confidence + trad.confidence) / 2)),
    trend: mlP.trend || trad.trend,
    esc: blended > currentScore + 5,
    slope: trad.slope,
    anomaly_probability: mlP.anomaly_probability || 0.1,
    ml_trained: mlModel.trained,
    training_count: mlModel.trainingCount,
    history_source: isSynthetic ? "synthetic" : "observed",
    history_points: realHistory.length,
    fsi_anchor: Math.round((COUNTRIES[iso]?.fsi_score || 50) / 120 * 100),
  };
}

class SentimentAnalyzer {
  constructor() {
    this.pos = ['peace','ceasefire','truce','agreement','aid','humanitarian','relief','recovery','stabilize','improve','progress','positive','good','great','excellent','success','hope'];
    this.neg = ['war','conflict','violence','attack','bomb','missile','strike','kill','death','casualty','destroy','collapse','crisis','emergency','famine','hunger','disease','outbreak','escalate','worsen','deteriorate','critical','severe','dire','catastrophe','disaster','devastating'];
    this.sNeg = ['exterminate','genocide','massacre','pogrom','ethnic cleansing','starvation','catastrophic'];
  }
  analyze(text) {
    if (!text || text.length < 10) return { score: 0, label: 'neutral', confidence: 0.5, key_terms: [], crisis_intensity: 0 };
    const lower = text.toLowerCase();
    let score = 0, matches = 0;
    for (const w of this.pos) if (lower.includes(w)) { score += 0.15; matches++; }
    for (const w of this.neg) if (lower.includes(w)) { score -= 0.2; matches++; }
    for (const w of this.sNeg) if (lower.includes(w)) { score -= 0.5; matches++; }
    const tm = Math.min(matches, 10);
    const ns = Math.max(-1, Math.min(1, score / (Math.max(tm, 1) / 2)));
    let label, confidence;
    if (ns > 0.2) { label = 'positive'; confidence = Math.min(0.95, 0.5 + Math.abs(ns) * 0.5); }
    else if (ns < -0.2) { label = 'negative'; confidence = Math.min(0.95, 0.5 + Math.abs(ns) * 0.5); }
    else { label = 'neutral'; confidence = 0.6; }
    return { score: +ns.toFixed(2), label, confidence: +confidence.toFixed(2), key_terms: [], crisis_intensity: +Math.min(1, Math.abs(ns) * 1.5).toFixed(2) };
  }
}
const sentimentAnalyzer = new SentimentAnalyzer();

function analyzeCountrySentiment(iso, store) {
  if (!CFG.SENTIMENT_ENABLED) return null;
  const c = store[iso];
  const text = [];
  if (c.signals?.whoOutbreaks?.length) text.push(c.signals.whoOutbreaks.map(o => o.disease).join(' '));
  if (c.signals?.whoDon?.length) text.push(c.signals.whoDon.map(o => o.title).join(' '));
  if (c.signals?.gdacs?.title) text.push(c.signals.gdacs.title);
  if (!text.length) return null;
  return sentimentAnalyzer.analyze(text.join('. '));
}

async function storeHistoricalData(iso, store) {
  if (!CFG.HISTORY_ENABLED) return;
  const c = store[iso];
  await persistentHistory.record(iso, {
    score: c.score,
    live_score: c.__live_breaking?.live_score || 0,
    signal_count: c.__live_breaking?.signal_count || 0,
    distinct_event_count: c.__live_breaking?.distinct_event_count || 0,
  });
  historyStore.store(iso, { score: c.score, live_score: c.__live_breaking?.live_score || 0 });
}

class AlertManager {
  constructor() { this.thresholds = { global: 75 }; this.lastAlerts = {}; }
  checkAlerts(iso, store) {
    if (!CFG.GEO_FENCING_ENABLED) return [];
    const c = store[iso];
    const triggered = [];
    const now = Date.now();
    if (c.score >= this.thresholds.global) {
      const key = `${iso}_global`;
      if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
        triggered.push({ iso, name: c.name, score: c.score, type: 'global', message: `${c.name} reached ${c.score}/100.` });
        this.lastAlerts[key] = now;
      }
    }
    return triggered;
  }
}
const alertManager = new AlertManager();

const safeFetch = p =>
  Promise.race([p.then(r => ({ ok: true, data: r })), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS))])
    .catch(e => ({ ok: false, error: e.message }));

async function fetchUSGS() { try { const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json())); if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true }; } catch {} return { data: [], live: false }; }
async function fetchUSGSSignificant() { try { const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson").then(r => r.json())); if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true }; } catch {} return { data: [], live: false }; }
async function fetchShakeMap() { try { const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson").then(r => r.json())); if (r.ok && r.data?.features?.length) return { data: r.data.features.filter(f => (f.properties?.mag || 0) >= CFG.SHAKEMAP_MIN_MAG), live: true }; } catch {} return { data: [], live: false }; }
async function fetchEMSC() { try { const r = await safeFetch(fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.json())); if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true }; } catch {} return { data: [], live: false }; }
async function fetchNASA() {
  try {
    const [a, b] = await Promise.all([
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.json())),
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=20").then(r => r.json())),
    ]);
    const events = [...(a.ok ? a.data.events || [] : []), ...(b.ok ? b.data.events || [] : [])];
    return { data: events, live: events.length > 0 };
  } catch {} return { data: [], live: false };
}
async function fetchGDACS() {
  try {
    const [a, b, c, d, e, f] = await Promise.all([
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=40").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=TC&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=FL&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=WF&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=DR&limit=30").then(r => r.json())),
    ]);
    const feats = [...(a.ok ? a.data.features || [] : []), ...(b.ok ? b.data.features || [] : []), ...(c.ok ? c.data.features || [] : []), ...(d.ok ? d.data.features || [] : []), ...(e.ok ? e.data.features || [] : []), ...(f.ok ? f.data.features || [] : [])];
    return { data: feats, live: feats.length > 0 };
  } catch {} return { data: [], live: false };
}
async function fetchIFRC() { try { const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.json())); if (r.ok && r.data?.results?.length) return { data: r.data.results, live: true }; } catch {} return { data: [], live: false }; }
async function fetchIFRCAppeals() { try { const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/appeal/?limit=30&ordering=-start_date").then(r => r.json())); if (r.ok && r.data?.results?.length) return { data: r.data.results, live: true }; } catch {} return { data: [], live: false }; }

async function fetchHeatStress() {
  const isos = Object.keys(COUNTRIES).filter(iso => {
    const c = COUNTRIES[iso].cent;
    return c && (c[0] !== 0 || c[1] !== 0);
  }).slice(0, 30);
  const results = {}; let anyLive = false;
  const tasks = isos.map(async iso => {
    const coord = COUNTRIES[iso].cent;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=temperature_2m_max&timezone=auto&forecast_days=3`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.daily?.temperature_2m_max?.[0] !== undefined) {
        const t = r.data.daily.temperature_2m_max[0];
        results[iso] = t;
        if (t >= 35) anyLive = true;
      }
    } catch {}
  });
  await Promise.all(tasks);
  return { data: results, live: anyLive };
}
async function fetchWeatherHazards() {
  const results = { flood_discharge: 0, wave_height: 0, wind_speed: 0, precip_total: 0, uv_max: 0, cloud_avg: 0, lightning_max: 0 };
  let anyLive = false;
  const eps = [
    { key: 'flood_discharge', url: 'https://flood-api.open-meteo.com/v1/flood?latitude=15.35&longitude=44.21&daily=river_discharge&forecast_days=3', path: ['daily','river_discharge'], t: a => Math.max(...(a||[0])) },
    { key: 'wave_height', url: 'https://marine-api.open-meteo.com/v1/marine?latitude=15.35&longitude=44.21&hourly=wave_height&forecast_days=1', path: ['hourly','wave_height'], t: a => Math.max(...(a||[0])) },
    { key: 'wind_speed', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&current_weather=true&hourly=wind_speed_10m&forecast_days=1', path: ['current_weather','windspeed'], t: v => v || 0 },
    { key: 'precip_total', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=precipitation&forecast_days=3', path: ['hourly','precipitation'], t: a => (a||[]).reduce((x,y)=>x+y,0) },
    { key: 'uv_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&daily=uv_index_max&forecast_days=3', path: ['daily','uv_index_max'], t: a => Math.max(...(a||[0])) },
    { key: 'cloud_avg', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=cloudcover&forecast_days=3', path: ['hourly','cloudcover'], t: a => mean(a||[0]) },
    { key: 'lightning_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=lightning_potential&forecast_days=1', path: ['hourly','lightning_potential'], t: a => Math.max(...(a||[0])) },
  ];
  const tasks = eps.map(async ep => {
    try {
      const r = await safeFetch(fetch(ep.url).then(r => r.json()));
      if (r.ok) {
        let v = r.data;
        for (const seg of ep.path) v = v?.[seg];
        if (v !== undefined && v !== null) { results[ep.key] = ep.t(v); if (results[ep.key] > 0) anyLive = true; }
      }
    } catch {}
  });
  await Promise.all(tasks);
  return { data: results, live: anyLive };
}
async function fetchAirQuality() {
  const cities = [{iso:'NGA',lat:6.5,lon:3.4},{iso:'IND',lat:28.6,lon:77.2},{iso:'CHN',lat:39.9,lon:116.4},{iso:'BGD',lat:23.8,lon:90.4},{iso:'EGY',lat:30.0,lon:31.2},{iso:'PAK',lat:24.9,lon:67.1}];
  const results = {}; let anyLive = false;
  const tasks = cities.map(async c => {
    try {
      const r = await safeFetch(fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.lat}&longitude=${c.lon}&hourly=pm2_5&forecast_days=1`).then(r => r.json()));
      const pm25 = r.ok ? r.data?.hourly?.pm2_5?.[0] : undefined;
      if (pm25 != null && (!results[c.iso] || pm25 > results[c.iso].pm25)) { results[c.iso] = { pm25, city: c.iso }; if (pm25 >= 35) anyLive = true; }
    } catch {}
  });
  await Promise.all(tasks);
  return { data: results, live: anyLive };
}
async function fetchNOAA() {
  try {
    const [s, a, b] = await Promise.all([
      safeFetch(fetch("https://api.weather.gov/stations?limit=20").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Extreme").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Severe").then(r => r.json())),
    ]);
    const out = { stations: s.ok ? (s.data.features?.length || 0) : 0, extreme_alerts: a.ok ? (a.data.features?.length || 0) : 0, storm_alerts: b.ok ? (b.data.features?.length || 0) : 0 };
    return { data: out, live: out.extreme_alerts > 0 || out.storm_alerts > 0 };
  } catch {} return { data: { stations: 0, extreme_alerts: 0, storm_alerts: 0 }, live: false };
}
async function fetchSPC() {
  try {
    const r = await safeFetch(fetch("https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson").then(r => r.json()));
    if (r.ok && r.data?.features?.length) {
      const rank = { "TSTM": 1, "MRGL": 2, "SLGT": 3, "ENH": 4, "MDT": 5, "HIGH": 6 };
      let top = null;
      for (const f of r.data.features) {
        const p = f.properties || {};
        const label = p.LABEL || "TSTM";
        if (!top || (rank[label] || 0) > (rank[top.LABEL] || 0)) top = { label, label2: p.LABEL2, issue: p.ISSUE_ISO };
      }
      return { data: top, live: !!top };
    }
  } catch {} return { data: null, live: false };
}
async function fetchEnsemble() {
  try {
    const r = await safeFetch(fetch("https://ensemble-api.open-meteo.com/v1/ensemble?latitude=15.35&longitude=44.21&hourly=temperature_2m&forecast_days=3").then(r => r.json()));
    if (r.ok && r.data?.hourly?.temperature_2m) {
      const arrs = Object.entries(r.data.hourly).filter(([k]) => k.startsWith("temperature_2m_member")).map(([, v]) => v);
      if (arrs.length > 1) {
        const idx = Math.min(24, arrs[0].length - 1);
        const vals = arrs.map(a => a[idx]).filter(Number.isFinite);
        if (vals.length > 1) return { data: { spread: Math.max(...vals) - Math.min(...vals) }, live: true };
      }
    }
  } catch {} return { data: { spread: 0 }, live: false };
}
async function fetchCDC() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://tools.cdc.gov/api/v2/resources/media/132608.rss").then(r => r.json()));
    if (r.ok && r.data?.items?.length) {
      const items = r.data.items.slice(0, 15).map(it => ({ title: it.title || "", description: it.description || "", pubDate: it.pubDate || null, ageHours: it.pubDate ? (Date.now() - new Date(it.pubDate).getTime()) / 36e5 : 48 }));
      return { data: items, live: true };
    }
  } catch {} return { data: [], live: false };
}
async function fetchWHODon() {
  try {
    const r = await safeFetch(fetch("https://www.who.int/api/news/diseaseoutbreaknews?$orderby=PublicationDateAndTime desc&$top=20").then(r => r.json()));
    if (r.ok && r.data?.value?.length) {
      const items = r.data.value.map(d => ({ title: d.Title || "", summary: d.Summary || "", overview: d.Overview || "", pubDate: d.PublicationDateAndTime || null, ageHours: d.PublicationDateAndTime ? (Date.now() - new Date(d.PublicationDateAndTime).getTime()) / 36e5 : 48 }));
      return { data: items, live: true };
    }
  } catch {} return { data: [], live: false };
}
async function fetchSentinel() {
  try {
    const r = await safeFetch(fetch("https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$top=5&$orderby=ContentDate/Start desc&$filter=Collection/Name eq 'SENTINEL-2'").then(r => r.json()));
    if (r.ok && r.data?.value?.length) {
      const items = r.data.value.map(v => ({ Id: v.Id, Name: v.Name, ContentLength: v.ContentLength, sensor: "Sentinel-2", acquisitionDate: v.ContentDate?.Start || null, ageHours: v.ContentDate?.Start ? (Date.now() - new Date(v.ContentDate.Start).getTime()) / 36e5 : 72 }));
      return { data: items, live: true };
    }
  } catch {} return { data: [], live: false };
}
async function fetchNASAPower() {
  const anchors = [{iso:'IND',lat:20,lon:77},{iso:'BGD',lat:24,lon:90},{iso:'SDN',lat:15,lon:30},{iso:'ETH',lat:9,lon:40},{iso:'SOM',lat:5,lon:45}];
  const results = {}; let anyLive = false;
  const tasks = anchors.map(async a => {
    try {
      const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${a.lon}&latitude=${a.lat}&format=JSON&start=2025&end=2025`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.properties?.parameter) {
        const temps = Object.values(r.data.properties.parameter.T2M || {}).filter(Number.isFinite);
        const precips = Object.values(r.data.properties.parameter.PRECTOTCORR || {}).filter(Number.isFinite);
        if (temps.length && precips.length) {
          const mT = mean(temps), mP = mean(precips);
          results[a.iso] = { tempAnomaly: mT - 25, precipAnomaly: mP - 2, meanTemp: +mT.toFixed(2), meanPrecip: +mP.toFixed(2) };
          anyLive = true;
        }
      }
    } catch {}
  });
  await Promise.all(tasks);
  return { data: results, live: anyLive };
}
async function fetchDiseaseSh() { try { const r = await safeFetch(fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=50").then(r => r.json())); if (r.ok && Array.isArray(r.data)) return { data: r.data, live: true }; } catch {} return { data: [], live: false }; }
async function fetchWorldBankIndicator(code) {
  try {
    const r = await safeFetch(fetch(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=300&mrv=1`).then(r => r.json()));
    const rows = r.ok && r.data?.[1] ? r.data[1] : [];
    const map = {};
    rows.forEach(i => { if (i.country?.id && i.value != null) map[i.country.id] = { value: parseFloat(i.value), date: i.date }; });
    return { data: map, live: Object.keys(map).length > 0 };
  } catch {} return { data: {}, live: false };
}
async function fetchWorldBankAll() {
  const [population, poverty, inflation, gdpGrowth, unemployment, waterStress, foodPriceIndex, electricityAccess] = await Promise.all([
    fetchWorldBankIndicator("SP.POP.TOTL"), fetchWorldBankIndicator("SI.POV.DDAY"), fetchWorldBankIndicator("FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"), fetchWorldBankIndicator("SL.UEM.TOTL.ZS"), fetchWorldBankIndicator("ER.H2O.FWTL.ZS"),
    fetchWorldBankIndicator("AG.PRD.FOOD.XD"), fetchWorldBankIndicator("IC.ELC.ACCS.ZS"),
  ]);
  return { population, poverty, inflation, gdpGrowth, unemployment, waterStress, foodPriceIndex, electricityAccess };
}
async function fetchUNHCR() {
  try {
    const [p, a] = await Promise.all([
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=population&displayType=totals&yearFrom=2023&yearTo=2024&coa_all=true&forcedDisp=1").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=asylum&displayType=totals&yearFrom=2023&yearTo=2024").then(r => r.json())),
    ]);
    const displacement = {};
    if (p.ok && p.data?.items) p.data.items.forEach(i => { const iso = i.coa_iso; if (!iso) return; if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 }; displacement[iso].refugees += parseInt(i.refugees) || 0; displacement[iso].idps += parseInt(i.idps) || 0; });
    if (a.ok && a.data?.items) a.data.items.forEach(i => { const iso = i.coa_iso; if (!iso) return; if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 }; displacement[iso].asylum_seekers += parseInt(i.asylum_seekers) || 0; });
    return { data: { displacement }, live: Object.keys(displacement).length > 0 };
  } catch {} return { data: { displacement: {} }, live: false };
}
async function fetchUNHCRSolutions() {
  try {
    const r = await safeFetch(fetch("https://api.unhcr.org/population/v1/solutions/?limit=50&yearFrom=2024&yearTo=2025").then(r => r.json()));
    if (r.ok && r.data?.items?.length) {
      const map = {};
      for (const item of r.data.items) {
        if (item.coa_iso && item.coa_iso !== "-" && item.returned_refugees) {
          const iso = item.coa_iso;
          if (!map[iso]) map[iso] = { returned_refugees: 0, resettlement: 0, naturalisation: 0 };
          map[iso].returned_refugees += parseInt(item.returned_refugees) || 0;
          map[iso].resettlement += parseInt(item.resettlement) || 0;
          map[iso].naturalisation += parseInt(item.naturalisation) || 0;
        }
        if (item.coo_iso && item.coo_iso !== "-" && item.returned_refugees) {
          const iso = item.coo_iso;
          if (!map[iso]) map[iso] = { returned_refugees: 0, resettlement: 0, naturalisation: 0 };
          map[iso].returned_refugees += parseInt(item.returned_refugees) || 0;
          map[iso].resettlement += parseInt(item.resettlement) || 0;
          map[iso].naturalisation += parseInt(item.naturalisation) || 0;
        }
      }
      return { data: map, live: Object.keys(map).length > 0 };
    }
  } catch {} return { data: {}, live: false };
}
async function fetchWHO() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml").then(r => r.json()));
    if (r.ok && r.data?.items) {
      const outbreaks = {};
      const kws = ['cholera','ebola','mpox','measles','polio','dengue','malaria'];
      r.data.items.forEach(it => {
        const t = (it.title || '').toLowerCase();
        for (const kw of kws) {
          if (t.includes(kw)) {
            for (const [iso, c] of Object.entries(COUNTRIES)) {
              if (t.includes(c.name.toLowerCase())) {
                if (!outbreaks[iso]) outbreaks[iso] = [];
                outbreaks[iso].push({ disease: kw, title: it.title, date: it.pubDate, ageHours: 24 });
                break;
              }
            }
          }
        }
      });
      return { data: outbreaks, live: Object.keys(outbreaks).length > 0 };
    }
  } catch {} return { data: {}, live: false };
}
async function fetchGFW() {
  try {
    const deforCountries = ['BRA','COD','IDN','COL','PER','BOL','MEX','MMR','MOZ','GHA'];
    const results = {};
    let anyLive = false;
    const tasks = deforCountries.map(async iso => {
      try {
        const url = `https://data-api.globalforestwatch.org/dataset/umd_glad_landsat_alerts/latest/query/json?sql=SELECT COUNT(*) FROM data WHERE iso='${iso}' AND umd_glad_landsat_alerts__date >= NOW() - INTERVAL '30 days'`;
        const r = await safeFetch(fetch(url, { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
        if (r.ok && r.data?.data?.length) {
          const count = r.data.data[0]?.count || 0;
          if (count > 0) { results[iso] = { count, ageHours: 12 }; anyLive = true; }
        }
      } catch {}
    });
    await Promise.all(tasks);
    return { data: results, live: anyLive };
  } catch {}
  return { data: {}, live: false };
}
async function fetchINFORM() {
  try {
    const r = await safeFetch(fetch("https://drmkc.jrc.ec.europa.eu/inform-index/API/InformAPI/Countries/Scores?informVersion=2024&indicators=INFORM").then(r => r.json()));
    if (r.ok && Array.isArray(r.data)) {
      const map = {};
      r.data.forEach(d => { if (d.ISO3 && d.INFORM) map[d.ISO3] = { inform_score: parseFloat(d.INFORM), year: d.Year || 2024 }; });
      return { data: map, live: Object.keys(map).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}
async function fetchClimateTrace() {
  try {
    const r = await safeFetch(fetch("https://api.climatetrace.org/v6/assets?limit=100").then(r => r.json()));
    if (r.ok && r.data?.assets?.length) {
      const byCountry = {};
      for (const a of r.data.assets) {
        const iso = a.Country || a.country || null;
        if (!iso) continue;
        if (!byCountry[iso]) byCountry[iso] = { topEmission: null, count: 0 };
        byCountry[iso].count++;
        const em = a.Emissions?.find(e => e.Product === 'co2e_100yr')?.EmissionsQuantity || 0;
        if (!byCountry[iso].topEmission || em > byCountry[iso].topEmission.emissions) {
          byCountry[iso].topEmission = { emissions: em, sector: a.Sector || 'mixed' };
        }
      }
      return { data: byCountry, live: Object.keys(byCountry).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}
async function fetchHDX() {
  try {
    const r = await safeFetch(fetch("https://data.humdata.org/api/3/action/package_search?q=crisis&rows=50").then(r => r.json()));
    if (r.ok && r.data?.result?.results?.length) {
      const byCountry = {};
      for (const pkg of r.data.result.results) {
        const groups = pkg.groups || [];
        for (const g of groups) {
          const iso = g.name ? g.name.toUpperCase() : null;
          if (iso && iso.length === 3) {
            if (!byCountry[iso]) byCountry[iso] = { count: 0, latest: null };
            byCountry[iso].count++;
            if (!byCountry[iso].latest || (pkg.metadata_modified || '') > byCountry[iso].latest) {
              byCountry[iso].latest = pkg.metadata_modified;
            }
          }
        }
      }
      return { data: byCountry, live: Object.keys(byCountry).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}
async function fetchJTWC() {
  try {
    const r = await safeFetch(fetch("https://www.metoc.navy.mil/jtwc/products/best-tracks/", { mode: 'cors' }).then(r => r.text()));
    if (!r.ok || typeof r.data !== 'string') return { data: [], live: false };
    const storms = [];
    const html = r.data;
    const activeMatches = html.matchAll(/(?:TYPHOON|TROPICAL STORM|TROPICAL DEPRESSION|SUPER TYPHOON)\s+([A-Z0-9\-]+)/gi);
    const seen = new Set();
    for (const m of activeMatches) {
      const name = m[1]?.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        storms.push({ name, ageHours: 12, category: 'active' });
      }
    }
    return { data: storms.slice(0, 5), live: storms.length > 0 };
  } catch {
    return { data: [], live: false };
  }
}
async function fetchJMA() {
  try {
    const r = await safeFetch(fetch("https://www.jma.go.jp/bosai/quake/data/list.json").then(r => r.json()));
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const events = r.data.slice(0, 20).map(e => {
        const parseJMATime = (s) => {
          if (!s) return null;
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d.getTime();
        };
        const eventTime = parseJMATime(e.at);
        const ageHours = eventTime ? (Date.now() - eventTime) / 36e5 : 24;
        return { mag: parseFloat(e.mag) || 0, place: e.en_anm || e.anm || 'Japan region', maxIntensity: parseInt(e.maxi) || 0, eventTime, ageHours };
      }).filter(e => e.mag >= CFG.JMA_MIN_MAG && e.ageHours <= 72);
      return { data: events, live: events.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}
async function fetchBMKG() {
  try {
    const r = await safeFetch(fetch("https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json").then(r => r.json()));
    if (r.ok && r.data?.Infogempa?.gempa) {
      const events = r.data.Infogempa.gempa.slice(0, 20).map(e => {
        const eventTime = e.DateTime ? new Date(e.DateTime).getTime() : null;
        const ageHours = eventTime ? (Date.now() - eventTime) / 36e5 : 24;
        return { mag: parseFloat(e.Magnitude) || 0, place: e.Wilayah || 'Indonesia region', depth: e.Kedalaman || null, eventTime, ageHours };
      }).filter(e => e.mag >= CFG.BMKG_MIN_MAG && e.ageHours <= 72);
      return { data: events, live: events.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}
async function fetchGEOFON() {
  try {
    const r = await safeFetch(fetch("https://geofon.gfz-potsdam.de/fdsnws/event/1/query?format=text&limit=20&minmag=4.5").then(r => r.text()));
    if (r.ok && typeof r.data === 'string') {
      const lines = r.data.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const events = lines.map(line => {
        const parts = line.split('|');
        if (parts.length < 13) return null;
        const mag = parseFloat(parts[10]) || 0;
        const time = parts[1] ? new Date(parts[1]).getTime() : null;
        const ageHours = time ? (Date.now() - time) / 36e5 : 24;
        return { mag, place: parts[12] || 'Unknown', eventTime: time, ageHours };
      }).filter(e => e && e.mag >= 4.5);
      return { data: events, live: events.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}
async function fetchINGV() {
  try {
    const r = await safeFetch(fetch("https://webservices.ingv.it/fdsnws/event/1/query?format=json&limit=10&minmag=4").then(r => r.json()));
    if (r.ok && r.data?.features?.length) {
      const events = r.data.features.map(f => {
        const p = f.properties || {};
        const mag = p.mag || 0;
        const time = p.time ? new Date(p.time).getTime() : null;
        const ageHours = time ? (Date.now() - time) / 36e5 : 24;
        return { mag, place: p.place || 'Mediterranean', eventTime: time, ageHours };
      }).filter(e => e.mag >= 4.0);
      return { data: events, live: events.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}
async function fetchGeoNet() {
  try {
    const r = await safeFetch(fetch("https://api.geonet.org.nz/quake?MMI=-1", { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
    if (r.ok && r.data?.features?.length) {
      const events = r.data.features.map(f => {
        const p = f.properties || {};
        const mag = p.magnitude || 0;
        const time = p.time ? new Date(p.time).getTime() : null;
        const ageHours = time ? (Date.now() - time) / 36e5 : 24;
        return { mag, place: p.locality || 'New Zealand', eventTime: time, ageHours };
      }).filter(e => e.mag >= 3.5);
      return { data: events, live: events.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}
async function fetchJMATyphoon() {
  try {
    const r = await safeFetch(fetch("https://www.jma.go.jp/bosai/typhoon/data/targetTc.json").then(r => r.json()));
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const typhoons = r.data.map(t => ({
        name: t.title || t.name || 'Typhoon',
        category: t.category || 'active',
        ageHours: 12,
      }));
      return { data: typhoons, live: typhoons.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}
async function fetchUSDrought() {
  try {
    const r = await safeFetch(fetch("https://droughtmonitor.unl.edu/data/json/usdm_current.json").then(r => r.json()));
    if (r.ok && r.data) {
      const level = r.data.level || r.data.drought_level || 'drought';
      return { data: { level, ageHours: 168 }, live: true };
    }
  } catch {}
  return { data: {}, live: false };
}
async function fetchECDC() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.ecdc.europa.eu/en/taxonomy/term/1607/feed").then(r => r.json()));
    if (r.ok && r.data?.items?.length) {
      const items = r.data.items.slice(0, 10).map(it => ({
        title: it.title || '',
        pubDate: it.pubDate || null,
        ageHours: it.pubDate ? (Date.now() - new Date(it.pubDate).getTime()) / 36e5 : 48,
      }));
      return { data: items, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchAllLive() {
  const [
    usgs, usgsSig, shakemap, emsc, nasa, gdacs, ifrc, ifrcAppeals,
    heat, hazards, aq, noaa, spc, ensemble, cdc, whoDon,
    sentinel, nasaPower, disease, wb, unhcr, unhcrSolutions, who,
    gfw, inform, climateTrace, hdx, jtwc, jma, bmkg,
    geofon, ingv, geonet, jmaTyphoon, usDrought, ecdc,
  ] = await Promise.all([
    fetchUSGS(), fetchUSGSSignificant(), fetchShakeMap(), fetchEMSC(), fetchNASA(), fetchGDACS(), fetchIFRC(), fetchIFRCAppeals(),
    fetchHeatStress(), fetchWeatherHazards(), fetchAirQuality(), fetchNOAA(), fetchSPC(), fetchEnsemble(), fetchCDC(), fetchWHODon(),
    fetchSentinel(), fetchNASAPower(), fetchDiseaseSh(), fetchWorldBankAll(), fetchUNHCR(), fetchUNHCRSolutions(), fetchWHO(),
    fetchGFW(), fetchINFORM(), fetchClimateTrace(), fetchHDX(), fetchJTWC(), fetchJMA(), fetchBMKG(),
    fetchGEOFON(), fetchINGV(), fetchGeoNet(), fetchJMATyphoon(), fetchUSDrought(), fetchECDC(),
  ]);
  return {
    usgs, usgsSig, shakemap, emsc, nasa, gdacs, ifrc, ifrcAppeals,
    heat, hazards, aq, noaa, spc, ensemble, cdc, whoDon,
    sentinel, nasaPower, disease, wb, unhcr, unhcrSolutions, who,
    gfw, inform, climateTrace, hdx, jtwc, jma, bmkg,
    geofon, ingv, geonet, jmaTyphoon, usDrought, ecdc,
  };
}

// ═══ additive: races the full fetchAllLive() fan-out against a hard time
// budget. If every upstream answers in time, behaves exactly like
// fetchAllLive(). If the aggregate takes too long, resolves to null so the
// caller can fall back to fast structural-only scoring — this is the actual
// mechanism behind ?force_live=false, and now also protects the default
// path from ever stalling on a single slow data source. ═══
function fetchAllLiveWithBudget(budgetMs = CFG.GLOBAL_LIVE_FETCH_BUDGET_MS) {
  return Promise.race([
    fetchAllLive(),
    new Promise(resolve => setTimeout(() => resolve(null), budgetMs)),
  ]);
}

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];
  const signals = {};

  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = topQuake.properties.place.split(",")[0].trim();
    signals.quakeTime = topQuake.properties.time;
  }

  const sigQuakes = (live.usgsSig.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topSig = sigQuakes.length ? sigQuakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topSig?.properties?.mag >= 5.5 && (!topQuake || topSig.properties.mag > topQuake.properties.mag)) {
    signals.quakeSigMonth = { mag: topSig.properties.mag, place: topSig.properties.place.split(",")[0].trim(), time: topSig.properties.time };
    liveEvidenceCount++; evidenceSources.push("USGS-Sig");
  }

  const shakemapEvents = (live.shakemap.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topShakeMap = shakemapEvents.length ? shakemapEvents.reduce((a, b) => (b.properties?.mag || 0) > (a.properties?.mag || 0) ? b : a) : null;
  if (topShakeMap?.properties?.mag >= CFG.SHAKEMAP_MIN_MAG) {
    const eventTime = topShakeMap.properties.time;
    const ageHours = eventTime ? (Date.now() - eventTime) / 36e5 : 2;
    signals.shakeMapEvent = { mag: topShakeMap.properties.mag, place: topShakeMap.properties.place?.split(",")[0].trim() || "nearby", ageHours, mmi: topShakeMap.properties.mmi };
    liveEvidenceCount++; evidenceSources.push("ShakeMap");
  }

  if (CFG.JMA_ENABLED && iso === "JPN" && live.jma.data?.length) {
    const jmaEvents = live.jma.data.filter(e => matchesCountryPlace(iso, e.place));
    if (jmaEvents.length > 0) { const topJMA = jmaEvents.reduce((a, b) => b.mag > a.mag ? b : a); signals.jmaQuake = topJMA; liveEvidenceCount++; evidenceSources.push("JMA"); }
  }

  if (CFG.BMKG_ENABLED && iso === "IDN" && live.bmkg.data?.length) {
    const bmkgEvents = live.bmkg.data.filter(e => matchesCountryPlace(iso, e.place));
    if (bmkgEvents.length > 0) { const topBMKG = bmkgEvents.reduce((a, b) => b.mag > a.mag ? b : a); signals.bmkgQuake = topBMKG; liveEvidenceCount++; evidenceSources.push("BMKG"); }
  }

  if (CFG.GEOFON_ENABLED && live.geofon.data?.length) {
    const geofonEvents = live.geofon.data.filter(e => matchesCountryPlace(iso, e.place));
    if (geofonEvents.length > 0) { const topGEOFON = geofonEvents.reduce((a, b) => b.mag > a.mag ? b : a); signals.geofonQuake = topGEOFON; liveEvidenceCount++; evidenceSources.push("GEOFON"); }
  }

  if (CFG.INGV_ENABLED && MEDITERRANEAN_ISOS.has(iso) && live.ingv.data?.length) {
    const ingvEvents = live.ingv.data.filter(e => matchesCountryPlace(iso, e.place));
    if (ingvEvents.length > 0) { const topINGV = ingvEvents.reduce((a, b) => b.mag > a.mag ? b : a); signals.ingvQuake = topINGV; liveEvidenceCount++; evidenceSources.push("INGV"); }
  }

  if (CFG.GEONET_ENABLED && SOUTH_PACIFIC_ISOS.has(iso) && live.geonet.data?.length) {
    const geonetEvents = live.geonet.data.filter(e => matchesCountryPlace(iso, e.place));
    if (geonetEvents.length > 0) { const topGeoNet = geonetEvents.reduce((a, b) => b.mag > a.mag ? b : a); signals.geonetQuake = topGeoNet; liveEvidenceCount++; evidenceSources.push("GeoNet"); }
  }

  const emscQuakes = (live.emsc.data || []).filter(f => { const c = f.geometry?.coordinates; return c && findClosestCountry(c[0], c[1]) === iso; });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a, b) => (b.properties?.mag || 0) > (a.properties?.mag || 0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("EMSC");
    if (!signals.quakeMag) signals.quakeMag = topEMSC.properties.mag;
    if (!signals.quakePlace) signals.quakePlace = topEMSC.properties?.flynn_region || null;
    if (!signals.quakeTime) signals.quakeTime = new Date(topEMSC.properties?.time).getTime();
  }

  const nasaEvents = (live.nasa.data || []).filter(ev => { const c = ev.geometry?.[0]?.coordinates; return c && findClosestCountry(c[0], c[1]) === iso; });
  if (nasaEvents.length) { liveEvidenceCount++; evidenceSources.push("NASA"); signals.nasaEventCount = nasaEvents.length; signals.nasaEvents = nasaEvents; }

  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const c = f.geometry?.coordinates;
    if (!c) { const a = f.properties?.affectedcountries || []; return a.some(x => x.iso3 === iso); }
    return findClosestCountry(c[0], c[1]) === iso;
  });
  const topGDACS = gdacsEvents.length ? gdacsEvents.reduce((a, b) => (b.properties?.alertscore || 0) > (a.properties?.alertscore || 0) ? b : a) : null;
  if (topGDACS) {
    liveEvidenceCount++; evidenceSources.push("GDACS");
    signals.gdacs = topGDACS;
    signals.gdacsAlert = topGDACS?.properties?.alertlevel?.toLowerCase() || null;
    signals.gdacsEventType = topGDACS?.properties?.eventtype || null;
    signals.gdacsCount = gdacsEvents.length;
  }

  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length) { liveEvidenceCount++; evidenceSources.push("IFRC"); signals.ifrcCount = ifrcEvents.length; signals.ifrcEvents = ifrcEvents; }
  const ifrcAppeals = (live.ifrcAppeals?.data || []).filter(ap => { const iso3 = ap.country?.iso3 || ap.countries?.[0]?.iso3; return iso3 === iso; });
  if (ifrcAppeals.length) { liveEvidenceCount++; evidenceSources.push("IFRC-Appeal"); signals.ifrcAppeals = ifrcAppeals; }

  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= 35) { liveEvidenceCount++; evidenceSources.push("Open-Meteo Heat"); signals.maxTempC = maxTempC; }
  if (live.hazards.live) { liveEvidenceCount++; evidenceSources.push("Open-Meteo Hazards"); signals.hazards = live.hazards.data; }
  const aqData = live.aq.data[iso] || null;
  if (aqData?.pm25 >= 35) { liveEvidenceCount++; evidenceSources.push("Open-Meteo AQ"); signals.aq = aqData; }

  if (isUS(iso) && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) { liveEvidenceCount++; evidenceSources.push("NOAA"); signals.noaa = live.noaa.data; }
  if (isUS(iso) && CFG.SPC_ENABLED && live.spc.data) { liveEvidenceCount++; evidenceSources.push("SPC"); signals.spcOutlook = live.spc.data; }
  if (isUS(iso) && CFG.CDC_ENABLED && live.cdc.data?.length) { liveEvidenceCount++; evidenceSources.push("CDC"); signals.cdcOutbreaks = live.cdc.data; }

  if (CFG.US_DROUGHT_ENABLED && isUS(iso) && live.usDrought?.data?.level) {
    signals.usDrought = live.usDrought.data;
    liveEvidenceCount++; evidenceSources.push("US Drought Monitor");
  }

  if (CFG.WHO_DON_ENABLED && live.whoDon.data?.length) {
    const matched = live.whoDon.data.filter(d => {
      const text = ((d.title || "") + " " + (d.summary || "") + " " + (d.overview || "")).toLowerCase();
      return text.includes(name);
    });
    if (matched.length) { liveEvidenceCount++; evidenceSources.push("WHO DON"); signals.whoDon = matched; }
  }

  if (CFG.ECDC_THREAT_ENABLED && COUNTRIES[iso].region === "europe" && live.ecdc.data?.length) {
    signals.ecdcThreats = live.ecdc.data;
    liveEvidenceCount++; evidenceSources.push("ECDC");
  }

  if (CFG.NASA_POWER_ENABLED && live.nasaPower.data[iso]) { liveEvidenceCount++; evidenceSources.push("NASA POWER"); signals.nasaPower = live.nasaPower.data[iso]; }

  if (CFG.GFW_ENABLED && live.gfw?.data?.[iso]) {
    const gfw = live.gfw.data[iso];
    signals.gfwAlerts = { count: gfw.count, ageHours: gfw.ageHours || 12 };
    liveEvidenceCount++; evidenceSources.push("GFW");
  }

  if (CFG.JTWC_ENABLED && WPAC_ISOS.has(iso) && live.jtwc?.data?.length) {
    signals.jtwcStorms = live.jtwc.data;
    liveEvidenceCount++; evidenceSources.push("JTWC");
  }

  if (CFG.JMA_TYPHOON_ENABLED && WPAC_ISOS.has(iso) && live.jmaTyphoon?.data?.length) {
    signals.jmaTyphoons = live.jmaTyphoon.data;
    liveEvidenceCount++; evidenceSources.push("JMA Typhoon");
  }

  if (CFG.CLIMATE_TRACE_ENABLED && live.climateTrace?.data?.[iso]) {
    signals.climateTrace = live.climateTrace.data[iso];
    liveEvidenceCount++; evidenceSources.push("Climate TRACE");
  }

  if (CFG.HDX_ENABLED && live.hdx?.data?.[iso]) {
    signals.hdxDatasets = live.hdx.data[iso];
    liveEvidenceCount++; evidenceSources.push("OCHA HDX");
  }

  if (CFG.UNHCR_SOLUTIONS_ENABLED && live.unhcrSolutions?.data?.[iso]) {
    signals.unhcrSolutions = live.unhcrSolutions.data[iso];
    liveEvidenceCount++; evidenceSources.push("UNHCR Solutions");
  }

  const diseaseRow = (live.disease.data || []).find(d => { const cN = d.country || d.country_name || ""; return cN.toLowerCase() === name || name.includes(cN.toLowerCase()) || cN.toLowerCase().includes(name); });
  if (diseaseRow?.active > 1000) { liveEvidenceCount++; evidenceSources.push("disease.sh"); signals.diseaseActive = diseaseRow.active; signals.diseaseName = "COVID-19"; }

  const whoData = live.who?.data || null;
  if (whoData?.[iso]?.length) { liveEvidenceCount++; evidenceSources.push("WHO RSS"); signals.whoOutbreaks = whoData[iso]; }

  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
  const wbPoverty = live.wb.poverty.data[iso] || null;
  const wbPopulation = live.wb.population.data[iso] || null;
  const wbWater = live.wb.waterStress?.data[iso] || null;
  const wbFoodPrice = live.wb.foodPriceIndex?.data[iso] || null;
  const wbElectricity = live.wb.electricityAccess?.data[iso] || null;

  if (wbPopulation?.value > 0) signals.population = wbPopulation.value;
  if (wbInflation?.value > 5) { signals.wbInflation = wbInflation; liveEvidenceCount++; evidenceSources.push("WB-Inflation"); }
  if (wbGdpGrowth?.value < 0) { signals.wbGdpGrowth = wbGdpGrowth; liveEvidenceCount++; evidenceSources.push("WB-GDP"); }
  if (wbUnemployment?.value > 10) { signals.wbUnemployment = wbUnemployment; liveEvidenceCount++; evidenceSources.push("WB-Unemp"); }
  if (wbPoverty?.value > 5) { signals.wbPoverty = wbPoverty; liveEvidenceCount++; evidenceSources.push("WB-Poverty"); }
  if (wbWater?.value > 40) signals.wbWaterStress = wbWater;
  if (wbFoodPrice?.value > 100) signals.wbFoodPrice = wbFoodPrice;
  if (wbElectricity?.value < 50) signals.electricityAccess = wbElectricity;

  const displacement = live.unhcr.data.displacement[iso] || null;
  const refugees = parseInt(displacement?.refugees) || 0;
  const idps = parseInt(displacement?.idps) || 0;
  const asylum = parseInt(displacement?.asylum_seekers) || 0;
  const totalDisplaced = refugees + idps + asylum;
  if (totalDisplaced > 0) {
    liveEvidenceCount++; evidenceSources.push("UNHCR");
    signals.refugees = refugees; signals.idps = idps; signals.asylum_seekers = asylum; signals.totalDisplaced = totalDisplaced;
  }

  signals.ensembleSpread = live.ensemble?.data?.spread || 0;

  return {
    quakeMag: signals.quakeMag || 0,
    quakePlace: signals.quakePlace || null,
    quakeTime: signals.quakeTime || null,
    quakeSigMonth: signals.quakeSigMonth || null,
    shakeMapEvent: signals.shakeMapEvent || null,
    jmaQuake: signals.jmaQuake || null,
    bmkgQuake: signals.bmkgQuake || null,
    geofonQuake: signals.geofonQuake || null,
    ingvQuake: signals.ingvQuake || null,
    geonetQuake: signals.geonetQuake || null,
    quakeCount: (quakes?.length || 0) + (emscQuakes?.length || 0) + (shakemapEvents?.length || 0),
    nasaEventCount: signals.nasaEventCount || 0,
    nasaEvents: signals.nasaEvents || [],
    gdacs: signals.gdacs || null,
    gdacsAlert: signals.gdacsAlert || null,
    gdacsEventType: signals.gdacsEventType || null,
    gdacsCount: signals.gdacsCount || 0,
    ifrcCount: signals.ifrcCount || 0,
    ifrcEvents: signals.ifrcEvents || [],
    ifrcAppeals: signals.ifrcAppeals || [],
    maxTempC: signals.maxTempC || 0,
    hazards: signals.hazards || null,
    aq: signals.aq || null,
    noaa: signals.noaa || null,
    spcOutlook: signals.spcOutlook || null,
    cdcOutbreaks: signals.cdcOutbreaks || [],
    whoDon: signals.whoDon || [],
    whoOutbreaks: signals.whoOutbreaks || [],
    ecdcThreats: signals.ecdcThreats || [],
    nasaPower: signals.nasaPower || null,
    sentinelObservations: signals.sentinelObservations || [],
    diseaseActive: signals.diseaseActive || 0,
    diseaseName: signals.diseaseName || null,
    population: signals.population || 0,
    wbInflation: signals.wbInflation || null,
    wbGdpGrowth: signals.wbGdpGrowth || null,
    wbUnemployment: signals.wbUnemployment || null,
    wbPoverty: signals.wbPoverty || null,
    wbWaterStress: signals.wbWaterStress || null,
    wbFoodPrice: signals.wbFoodPrice || null,
    electricityAccess: signals.electricityAccess || null,
    refugees, idps, asylum_seekers: asylum, totalDisplaced,
    unhcrSolutions: signals.unhcrSolutions || null,
    ensembleSpread: signals.ensembleSpread || 0,
    gfwAlerts: signals.gfwAlerts || null,
    jtwcStorms: signals.jtwcStorms || [],
    jmaTyphoons: signals.jmaTyphoons || [],
    climateTrace: signals.climateTrace || null,
    hdxDatasets: signals.hdxDatasets || null,
    usDrought: signals.usDrought || null,
    liveEvidenceCount,
    evidenceSources,
  };
}

function applyLiveAdjustments(priorDims, signals, iso, store) {
  const dims = { ...priorDims };
  const audit = [];
  let totalBoost = 0;
  const fsiBase = COUNTRIES[iso]?.fsi_score || 50;

  if (CFG.GDACS_ENABLED && signals.gdacs) {
    const lvl = signals.gdacsAlert || "green";
    const base = lvl === "red" ? 12 : lvl === "orange" ? 7 : 3;
    const mult = Math.min(2, 1 + (signals.gdacsCount || 1) * 0.15);
    const b = Math.round(base * mult);
    dims.displacement = clamp(dims.displacement + Math.ceil(b * 0.5));
    dims.health = clamp(dims.health + Math.floor(b * 0.3));
    totalBoost += b;
    audit.push({ source: "GDACS", delta: b, reason: `${lvl.toUpperCase()} x${signals.gdacsCount || 1}` });
  }

  if (signals.quakeMag >= 4.5) {
    const b = Math.min(15, Math.round((signals.quakeMag - 3.5) * 3.5));
    dims.displacement = clamp(dims.displacement + Math.ceil(b * 0.5));
    totalBoost += b;
    audit.push({ source: "USGS/EMSC", delta: b, reason: `M${signals.quakeMag.toFixed(1)}` });
  }

  if (CFG.NASA_ENABLED && signals.nasaEventCount > 0) {
    const b = Math.min(12, signals.nasaEventCount * 4);
    dims.climate = clamp(dims.climate + Math.ceil(b * 0.6));
    totalBoost += b;
    audit.push({ source: "NASA EONET", delta: b, reason: `${signals.nasaEventCount} events` });
  }

  if (CFG.IFRC_ENABLED && signals.ifrcCount > 0) {
    const b = Math.min(10, signals.ifrcCount * 4);
    dims.access = clamp(dims.access + b);
    totalBoost += b;
    audit.push({ source: "IFRC Event", delta: b, reason: `${signals.ifrcCount} ops` });
  }

  if (CFG.IFRC_APPEAL_ENABLED && signals.ifrcAppeals?.length) {
    const b = Math.min(12, signals.ifrcAppeals.length * 6);
    dims.access = clamp(dims.access + b);
    totalBoost += b;
    audit.push({ source: "IFRC Appeal", delta: b, reason: `${signals.ifrcAppeals.length} appeal(s)` });
  }

  if (signals.maxTempC >= 35) {
    const b = Math.min(12, Math.round((signals.maxTempC - 28) * 1.2));
    dims.climate = clamp(dims.climate + Math.ceil(b * 0.6));
    dims.health = clamp(dims.health + Math.floor(b * 0.4));
    totalBoost += b;
    audit.push({ source: "Open-Meteo", delta: b, reason: `${signals.maxTempC}°C heat` });
  }

  if (signals.hazards) {
    const h = signals.hazards;
    let b = 0;
    if (h.flood_discharge > 100) b += 5;
    if (h.wave_height >= CFG.OPENMETEO_MARINE_THRESHOLD) b += 4;
    if (h.wind_speed > 30) b += 4;
    if (h.precip_total > 10) b += 3;
    if (h.uv_max > 8) b += 2;
    b = Math.min(15, b);
    if (b > 0) { dims.climate = clamp(dims.climate + b); totalBoost += b; audit.push({ source: "Open-Meteo Hazards", delta: b, reason: "hazard thresholds" }); }
  }

  if (signals.aq?.pm25 >= 35) {
    const b = Math.min(8, Math.round((signals.aq.pm25 - 25) / 10));
    if (b > 0) { dims.health = clamp(dims.health + b); totalBoost += b; audit.push({ source: "Open-Meteo AQ", delta: b, reason: `PM2.5 ${signals.aq.pm25.toFixed(0)}` }); }
  }

  if (CFG.DISEASE_ENABLED && signals.diseaseActive > 1000) {
    const b = Math.min(12, Math.round(Math.log10(signals.diseaseActive / 1000 + 1) * 5));
    dims.health = clamp(dims.health + b);
    totalBoost += b;
    audit.push({ source: "disease.sh", delta: b, reason: `${signals.diseaseActive} active` });
  }

  if (CFG.WHO_ENABLED && signals.whoOutbreaks?.length) {
    const b = Math.min(10, signals.whoOutbreaks.length * 4);
    dims.health = clamp(dims.health + b);
    totalBoost += b;
    audit.push({ source: "WHO RSS", delta: b, reason: `${signals.whoOutbreaks.length} outbreak(s)` });
  }

  if (CFG.WHO_DON_ENABLED && signals.whoDon?.length) {
    const b = Math.min(15, signals.whoDon.length * 8);
    dims.health = clamp(dims.health + b);
    totalBoost += b;
    audit.push({ source: "WHO DON", delta: b, reason: `${signals.whoDon.length} report(s)` });
  }

  if (CFG.ECDC_THREAT_ENABLED && COUNTRIES[iso].region === "europe" && signals.ecdcThreats?.length) {
    const b = Math.min(6, signals.ecdcThreats.length * 3);
    dims.health = clamp(dims.health + b);
    totalBoost += b;
    audit.push({ source: "ECDC", delta: b, reason: `${signals.ecdcThreats.length} threat(s)` });
  }

  if (CFG.CDC_ENABLED && signals.cdcOutbreaks?.length) {
    const b = Math.min(12, signals.cdcOutbreaks.length * 4);
    dims.health = clamp(dims.health + b);
    totalBoost += b;
    audit.push({ source: "CDC", delta: b, reason: `${signals.cdcOutbreaks.length} notice(s)` });
  }

  if (CFG.SPC_ENABLED && signals.spcOutlook) {
    const lvl = signals.spcOutlook.label;
    const wm = { TSTM: 4, MRGL: 6, SLGT: 9, ENH: 12, MDT: 15, HIGH: 18 };
    const b = wm[lvl] || 3;
    dims.climate = clamp(dims.climate + b);
    totalBoost += b;
    audit.push({ source: "SPC", delta: b, reason: `SPC ${lvl}` });
  }

  if (CFG.US_DROUGHT_ENABLED && signals.usDrought) {
    const b = Math.min(10, CFG.US_DROUGHT_BOOST * 0.2);
    dims.climate = clamp(dims.climate + b);
    totalBoost += b;
    audit.push({ source: "US Drought Monitor", delta: b, reason: signals.usDrought.level });
  }

  if (CFG.NASA_POWER_ENABLED && signals.nasaPower) {
    const t = Math.abs(signals.nasaPower.tempAnomaly || 0);
    const p = Math.abs(signals.nasaPower.precipAnomaly || 0);
    const b = Math.min(8, Math.round(t * 1.2 + p * 0.5));
    if (b > 0) { dims.climate = clamp(dims.climate + b); totalBoost += b; audit.push({ source: "NASA POWER", delta: b, reason: "climate anomaly" }); }
  }

  if (CFG.WB_ENABLED && signals.wbInflation?.value > 5) {
    const b = Math.min(10, Math.round(signals.wbInflation.value / 5));
    dims.economic = clamp(dims.economic + b); totalBoost += b; audit.push({ source: "World Bank", delta: b, reason: `${signals.wbInflation.value.toFixed(1)}% inflation` });
  }
  if (CFG.WB_ENABLED && signals.wbGdpGrowth?.value < 0) {
    const b = Math.min(10, Math.round(Math.abs(signals.wbGdpGrowth.value) * 1.5));
    dims.economic = clamp(dims.economic + b); totalBoost += b; audit.push({ source: "World Bank", delta: b, reason: `${signals.wbGdpGrowth.value.toFixed(1)}% GDP` });
  }
  if (CFG.WB_ENABLED && signals.wbPoverty?.value > 5) {
    const b = Math.min(10, Math.round(signals.wbPoverty.value / 5));
    dims.economic = clamp(dims.economic + b); totalBoost += b; audit.push({ source: "World Bank", delta: b, reason: `${signals.wbPoverty.value.toFixed(1)}% poverty` });
  }

  if (CFG.UNHCR_ENABLED && signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const b = m >= 10 ? 25 : m >= 5 ? 18 : m >= 3 ? 14 : m >= 1.5 ? 10 : m >= 0.5 ? 6 : m >= 0.1 ? 3 : 0;
    if (b > 0) { dims.displacement = clamp(dims.displacement + b); totalBoost += b; audit.push({ source: "UNHCR", delta: b, reason: `${m.toFixed(1)}M displaced` }); }
  }

  if (CFG.UNHCR_SOLUTIONS_ENABLED && signals.unhcrSolutions?.returned_refugees > 10_000) {
    const b = Math.min(12, Math.round(signals.unhcrSolutions.returned_refugees / 200_000));
    if (b > 0) { dims.displacement = clamp(dims.displacement + b); totalBoost += b; audit.push({ source: "UNHCR Solutions", delta: b, reason: `${fmtPop(signals.unhcrSolutions.returned_refugees)} returned` }); }
  }

  if (CFG.GFW_ENABLED && signals.gfwAlerts) {
    const b = Math.min(10, Math.round(Math.log10(signals.gfwAlerts.count + 1) * 4));
    if (b > 0) { dims.climate = clamp(dims.climate + b); totalBoost += b; audit.push({ source: "GFW", delta: b, reason: `${signals.gfwAlerts.count} alerts` }); }
  }

  if (CFG.CLIMATE_TRACE_ENABLED && signals.climateTrace) {
    const b = Math.min(6, Math.round(Math.log10((signals.climateTrace.topEmission?.emissions || 0) / 1000) * 2));
    if (b > 0) { dims.climate = clamp(dims.climate + b); totalBoost += b; audit.push({ source: "Climate TRACE", delta: b, reason: `emissions hotspot` }); }
  }

  if (CFG.HDX_ENABLED && signals.hdxDatasets) {
    const b = Math.min(5, Math.round(signals.hdxDatasets.count * 0.5));
    if (b > 0) { dims.access = clamp(dims.access + b); totalBoost += b; audit.push({ source: "OCHA HDX", delta: b, reason: `${signals.hdxDatasets.count} datasets` }); }
  }

  const cap = Math.min(CFG.WST_MAX_BOOST_ABOVE_FSI, Math.max(8, Math.round(fsiBase * 0.25)));
  const capped = Math.min(totalBoost, cap);
  const ratio = totalBoost > 0 ? capped / totalBoost : 1;
  for (const k of Object.keys(dims)) { const d = dims[k] - priorDims[k]; if (d > 0) dims[k] = clamp(Math.round(priorDims[k] + d * ratio)); }

  return { dims, score: clamp(composite(dims)), audit, totalBoostRaw: totalBoost, totalBoostCapped: capped, boostRatio: ratio, maxAllowedBoost: cap };
}

async function buildStore(liveData) {
  const seed = Math.floor(Date.now() / CFG.SEED_INTERVAL_MS);
  const store = {};

  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const fsiScore = country.fsi_score || country.prior || 50;
    const base = Math.round((fsiScore / 120) * 100);
    const jitter = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const adjustedBase = clamp(base + jitter, 5, 99);

    const priorDims = buildPriorDims(adjustedBase, country.types);
    const priorScore = clamp(composite(priorDims));

    let dims = priorDims, structuralScore = priorScore, audit = [], signals = {};
    if (liveData) {
      signals = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals, iso, store);
      dims = adjusted.dims; structuralScore = adjusted.score; audit = adjusted.audit;
    }

    store[iso] = {
      ...country, dims, score: structuralScore, structural_score: structuralScore, priorScore,
      liveBoost: structuralScore - priorScore, audit, signals, spillover: 0,
      fsi_score: fsiScore, fsi_rank: country.fsi_rank, fsi_band: country.fsi_band,
      historical_scores: [], __wst: null, __live_breaking: null, __effective_score: null,
    };
  }

  for (const iso in store) {
    const n = (COUNTRIES[iso].adj || []).filter(x => store[x]);
    if (!n.length) continue;
    const avg = n.reduce((s, x) => s + store[x].score, 0) / n.length;
    const spill = Math.max(0, avg - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    store[iso].spillover = +(spill * Math.max(0.3, 1 - (store[iso].score - 30) / 100)).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
    store[iso].structural_score = store[iso].score;
  }

  for (const iso in store) store[iso].historical_scores = seedHistory(iso, store[iso].score);

  if (CFG.ML_ENABLED) await trainMLModel(store);
  for (const iso in store) if (CFG.ML_ENABLED) store[iso].ml_forecast = await mlEnhancedForecast(iso, store[iso].score, store);

  for (const iso in store) store[iso].__live_breaking = computeLiveBreakingScore(iso, liveData, store);

  for (const iso in store) {
    const structural = store[iso].structural_score ?? store[iso].score;
    const live = store[iso].__live_breaking?.live_score || 0;
    const rawEffective = Math.max(structural, live);
    const popValue = store[iso].signals?.population || 0;
    const popMult = popExposureMultiplier(popValue);
    const credit = resolutionCredit(store, iso);
    const effective = clamp(rawEffective * popMult - credit);
    store[iso].__effective_score = effective;
    store[iso].__pop_multiplier = +popMult.toFixed(3);
    store[iso].__resolution_credit = +credit.toFixed(2);
    if (CFG.SCORE_FIELD_IS_LIVE) store[iso].score = effective;
  }

  for (const iso in store) {
    if (CFG.SENTIMENT_ENABLED) store[iso].sentiment = analyzeCountrySentiment(iso, store);
    if (CFG.HISTORY_ENABLED) await storeHistoricalData(iso, store);
    if (CFG.GEO_FENCING_ENABLED) alertManager.checkAlerts(iso, store);
  }

  return store;
}

function detectCUSUM(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, Math.floor(a.length*0.6)), mu = mean(b), sd = stddev(b); const k = 0.5*sd, h = 4*sd; let sp = 0, sn = 0; for (const x of a) { sp = Math.max(0, sp + (x-mu) - k); sn = Math.max(0, sn - (x-mu) - k); } return { detected: sp > h || sn > h, stat: +Math.max(sp,sn).toFixed(2) }; }
function detectZScore(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, -3), r = a.slice(-3); const z = (mean(r) - mean(b)) / stddev(b); return { detected: Math.abs(z) >= 2, stat: +Math.abs(z).toFixed(2) }; }
function detectChangepoint(a) { if (a.length < 10) return { detected: false, stat: 0 }; const m = Math.floor(a.length/2); const kl = Math.log(stddev(a.slice(m))/stddev(a.slice(0,m))) + (stddev(a.slice(0,m))**2 + (mean(a.slice(0,m))-mean(a.slice(m)))**2)/(2*stddev(a.slice(m))**2) - 0.5; return { detected: kl > 1.5, stat: +kl.toFixed(3) }; }
function detectVolatilityRegime(a) { if (a.length < 8) return { detected: false, stat: 0 }; const h = Math.floor(a.length/2); const r = stddev(a.slice(h))/stddev(a.slice(0,h)); return { detected: r > 2, stat: +r.toFixed(2) }; }
function runAnomalyDetection(a, opts = {}) {
  const minRequired = opts.minRequired || 10;
  if (a.length < minRequired) {
    return { detected: false, severity: "INSUFFICIENT_HISTORY", reason: `Need ≥${minRequired} points, have ${a.length}`, methods_fired: 0, methods: [], z_score: 0 };
  }
  const m = [detectCUSUM(a), detectZScore(a), detectChangepoint(a), detectVolatilityRegime(a)];
  const f = m.filter(x => x.detected);
  return { detected: f.length >= 1, severity: f.length >= 4 ? "EXTREME" : f.length >= 3 ? "CRITICAL" : f.length >= 2 ? "HIGH" : f.length >= 1 ? "ELEVATED" : "NONE", methods_fired: f.length, methods: m, z_score: detectZScore(a).stat };
}
function trendForecast(h, cur) {
  if (h.length < 5) return { fc: cur, trend: "stable", esc: false, slope: 0, confidence: 0.3 };
  const w = h.slice(-10);
  const xb = (w.length-1)/2, yb = mean(w);
  const num = w.reduce((s,y,x)=>s+(x-xb)*(y-yb),0), den = w.reduce((s,_,x)=>s+(x-xb)**2,0);
  const slope = den ? +(num/den).toFixed(2) : 0;
  const fc = clamp(cur + slope * 7);
  return { fc, slope, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > cur + 5, confidence: 0.6 };
}
function seedHistory(iso, cur) {
  const s = strHash(iso);
  let v = clamp(cur + Math.round((lcg(s) - 0.5) * 20), 5, 99);
  const h = [];
  for (let i = 0; i <= 28; i++) { h.push(v); v = clamp(v + (cur - v) * 0.15 + (lcg(strHash(iso + i)) - 0.5) * 6); }
  h[h.length-1] = cur;
  return h;
}
function buildPriorDims(base, types) {
  const has = t => types.includes(t);
  const c = v => clamp(v, 5, 99);
  return {
    conflict: c(base * ((has("CW")||has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
    displacement: c(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.80 : 0.38)),
    food: c(base * ((has("FN")||has("DR")) ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health: c(base * ((has("EP")||has("FN")) ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic: c(base * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.85 : 0.42) + 10),
    climate: c(base * ((has("HEAT")||has("DR")) ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access: c(base * ((has("CW")||has("CE")) ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political: c(base * ((has("CE")||has("CW")||has("REF")||has("POL")) ? 0.90 : 0.42) + 8),
  };
}
function severityLabel(s) { return s >= 85 ? "CATASTROPHIC" : s >= 75 ? "CRITICAL" : s >= 60 ? "HIGH" : s >= 40 ? "ELEVATED" : "MODERATE"; }
function severityEmoji(s) { return s >= 85 ? "🔴" : s >= 75 ? "🟠" : s >= 60 ? "🟡" : s >= 40 ? "🟢" : "🔵"; }
function severityColor(s) { return s >= 85 ? "#ff375f" : s >= 75 ? "#ff375f" : s >= 60 ? "#ff8c42" : s >= 40 ? "#ffb020" : "#6bc8ff"; }
function recommendation(score, anomaly) {
  const an = anomaly?.detected ? ` Anomaly detected (${anomaly.severity}).` : "";
  if (score >= 85) return { tier: "IMMEDIATE", text: `Immediate response required.${an}` };
  if (score >= 75) return { tier: "URGENT", text: `Urgent response needed.${an}` };
  if (score >= 60) return { tier: "HIGH", text: `Elevated concern.${an}` };
  if (score >= 40) return { tier: "MONITOR", text: `Monitor situation.${an}` };
  return { tier: "WATCH", text: `Routine monitoring.${an}` };
}

async function buildPayload(iso, store, ranked, opts = {}) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const displayScore = c.__effective_score ?? c.structural_score ?? c.score;

  const realHistory = await persistentHistory.scoreSeries(iso, 500);
  const hasRealHistory = realHistory.length >= CFG.HISTORY_MIN_FOR_ANOMALY;
  const series = hasRealHistory ? realHistory : seedHistory(iso, displayScore);
  const anom = runAnomalyDetection(series, { minRequired: CFG.HISTORY_MIN_FOR_ANOMALY });
  const fc = trendForecast(series, displayScore);

  const rank = ranked.indexOf(iso) + 1;
  const s = c.signals || {};
  const delta7 = series.length >= 8 ? Math.round(series[series.length-1] - series[Math.max(0, series.length-8)]) : 0;

  const base = {
    iso, name: c.name, flag: c.flag,
    score: displayScore,
    structural_score: c.structural_score ?? c.score,
    effective_score: c.__effective_score,
    pop_multiplier: c.__pop_multiplier ?? 1.0,
    resolution_credit: c.__resolution_credit ?? 0,
    is_low_instrumentation: isLowInstrumentation(lb),
    severity: severityLabel(displayScore),
    severity_emoji: severityEmoji(displayScore),
    severity_color: severityColor(displayScore),
    rank, total_countries: ranked.length,
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
      raw_signal_count: lb.raw_signal_count || 0,
      live_event_count: lb.live_event_count || 0,
      distinct_event_count: lb.distinct_event_count || 0,
      has_fresh_live_event: lb.has_fresh_live_event || false,
      unique_signal_types: lb.unique_signal_types || 0,
      source_count: lb.source_count || 0,
      sources: lb.sources || [],
      freshest_signal_age_hours: lb.freshest_signal_age_hours,
      live_event_boost: lb.live_event_boost || 0,
      freshness_bonus: lb.freshness_bonus || 0,
      diversity_bonus: lb.diversity_bonus || 0,
      fsi_baseline: lb.fsi_baseline || 0,
      ensemble_dampener: lb.ensemble_dampener || 1.0,
      source_multiplier: lb.source_multiplier || 1,
      events: lb.events || [],
      signals: (lb.signals || []).map(sig => ({
        type: sig.type,
        label: LIVE_SIGNALS[sig.type]?.label || sig.type,
        icon: LIVE_SIGNALS[sig.type]?.icon || "⚠️",
        is_live_event: sig.is_live_event || false,
        weight: sig.weight,
        age_hours: +(sig.ageHours || 0).toFixed(1),
        weighted_score: sig.weighted_score,
        source: sig.source,
        details: sig.details,
        corroborating_sources: sig.corroborating_sources || [],
        corroboration_count: sig.corroboration_count || 0,
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
      history_source: hasRealHistory ? "observed" : "synthetic",
      history_points: realHistory.length,
    },
    anomaly: {
      detected: anom.detected,
      severity: anom.severity,
      reason: anom.reason || null,
      methods_fired: anom.methods_fired,
      z_score: anom.z_score,
      history_source: hasRealHistory ? "observed" : "synthetic",
      history_points: realHistory.length,
      methods: anom.methods?.length ? { cusum: anom.methods[0], zscore: anom.methods[1], changepoint: anom.methods[2], volatility: anom.methods[3] } : null,
    },
    spillover: { value: c.spillover, from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })) },

    live_evidence: {
      earthquake: s.quakeMag >= 4.5 ? { magnitude: s.quakeMag, location: s.quakePlace, event_count: s.quakeCount, source: "USGS/EMSC" } : null,
      earthquake_significant_month: s.quakeSigMonth ? { magnitude: s.quakeSigMonth.mag, location: s.quakeSigMonth.place, source: "USGS (30d)" } : null,
      shakemap_event: s.shakeMapEvent ? { magnitude: s.shakeMapEvent.mag, location: s.shakeMapEvent.place, mmi: s.shakeMapEvent.mmi, source: "USGS ShakeMap" } : null,
      jma_earthquake: s.jmaQuake ? { magnitude: s.jmaQuake.mag, place: s.jmaQuake.place, max_intensity: s.jmaQuake.maxIntensity, source: "JMA" } : null,
      bmkg_earthquake: s.bmkgQuake ? { magnitude: s.bmkgQuake.mag, place: s.bmkgQuake.place, depth: s.bmkgQuake.depth, source: "BMKG" } : null,
      geofon_earthquake: s.geofonQuake ? { magnitude: s.geofonQuake.mag, place: s.geofonQuake.place, source: "GEOFON" } : null,
      ingv_earthquake: s.ingvQuake ? { magnitude: s.ingvQuake.mag, place: s.ingvQuake.place, source: "INGV" } : null,
      geonet_earthquake: s.geonetQuake ? { magnitude: s.geonetQuake.mag, place: s.geonetQuake.place, source: "GeoNet" } : null,
      nasa_events: s.nasaEventCount > 0 ? { count: s.nasaEventCount, source: "NASA EONET" } : null,
      gdacs: s.gdacs ? { alert_level: s.gdacsAlert, event_type: s.gdacsEventType, count: s.gdacsCount, source: "GDACS" } : null,
      ifrc: s.ifrcCount > 0 ? { count: s.ifrcCount, source: "IFRC GO" } : null,
      ifrc_appeals: s.ifrcAppeals?.length ? { count: s.ifrcAppeals.length, source: "IFRC Appeals" } : null,
      cdc_outbreaks: s.cdcOutbreaks?.length ? { count: s.cdcOutbreaks.length, source: "CDC" } : null,
      spc_outlook: s.spcOutlook ? { label: s.spcOutlook.label, label2: s.spcOutlook.label2, source: "SPC" } : null,
      who_don: s.whoDon?.length ? { count: s.whoDon.length, source: "WHO DON" } : null,
      ecdc_threats: s.ecdcThreats?.length ? { count: s.ecdcThreats.length, source: "ECDC" } : null,
      nasa_power: s.nasaPower ? { tempAnomaly: s.nasaPower.tempAnomaly, precipAnomaly: s.nasaPower.precipAnomaly, source: "NASA POWER" } : null,
      gfw_deforestation: s.gfwAlerts ? { alert_count: s.gfwAlerts.count, source: "Global Forest Watch" } : null,
      jtwc: s.jtwcStorms?.length ? { count: s.jtwcStorms.length, storms: s.jtwcStorms.map(x => x.name), source: "JTWC" } : null,
      jma_typhoon: s.jmaTyphoons?.length ? { count: s.jmaTyphoons.length, typhoons: s.jmaTyphoons.map(x => x.name), source: "JMA" } : null,
      climate_trace: s.climateTrace ? { emissions: s.climateTrace.topEmission?.emissions, sector: s.climateTrace.topEmission?.sector, source: "Climate TRACE" } : null,
      hdx: s.hdxDatasets ? { dataset_count: s.hdxDatasets.count, source: "OCHA HDX" } : null,
      heat: s.maxTempC >= 35 ? { max_temp_c: s.maxTempC, source: "Open-Meteo" } : null,
      hazards: s.hazards ? { ...s.hazards, source: "Open-Meteo" } : null,
      air_quality: s.aq ? { ...s.aq, source: "Open-Meteo AQ" } : null,
      noaa: s.noaa ? { ...s.noaa, source: "NOAA" } : null,
      disease: s.diseaseActive > 0 ? { disease: s.diseaseName, active: s.diseaseActive, source: "disease.sh" } : null,
      who_outbreaks: s.whoOutbreaks?.length ? { outbreaks: s.whoOutbreaks, source: "WHO RSS" } : null,
      economic: {
        inflation: s.wbInflation ? { ...s.wbInflation, source: "World Bank" } : null,
        gdp_growth: s.wbGdpGrowth ? { ...s.wbGdpGrowth, source: "World Bank" } : null,
        unemployment: s.wbUnemployment ? { ...s.wbUnemployment, source: "World Bank" } : null,
        poverty: s.wbPoverty ? { ...s.wbPoverty, source: "World Bank" } : null,
        water_stress: s.wbWaterStress ? { ...s.wbWaterStress, source: "World Bank" } : null,
        food_price_index: s.wbFoodPrice ? { ...s.wbFoodPrice, source: "World Bank" } : null,
        population: s.population ? { value: s.population, source: "World Bank" } : null,
        electricity_access: s.electricityAccess ? { ...s.electricityAccess, source: "World Bank" } : null,
      },
      displacement: s.totalDisplaced > 0 ? { total: s.totalDisplaced, refugees: s.refugees, idps: s.idps, asylum_seekers: s.asylum_seekers, source: "UNHCR" } : null,
      unhcr_solutions: s.unhcrSolutions ? { returned_refugees: s.unhcrSolutions.returned_refugees, resettlement: s.unhcrSolutions.resettlement, naturalisation: s.unhcrSolutions.naturalisation, source: "UNHCR Solutions" } : null,
      us_drought: s.usDrought ? { level: s.usDrought.level, source: "US Drought Monitor" } : null,
    },

    ml: c.ml_forecast ? {
      forecast: c.ml_forecast.fc,
      confidence: c.ml_forecast.confidence,
      anomaly_probability: c.ml_forecast.anomaly_probability,
      trained: c.ml_forecast.ml_trained,
      training_count: c.ml_forecast.training_count,
      history_source: c.ml_forecast.history_source,
      history_points: c.ml_forecast.history_points,
    } : null,
    sentiment: c.sentiment ? { score: c.sentiment.score, label: c.sentiment.label, confidence: c.sentiment.confidence } : null,

    score_audit: {
      prior_score: c.priorScore,
      structural_score: c.structural_score,
      live_breaking_score: lb.live_score,
      effective_score_raw: Math.max(c.structural_score ?? 0, lb.live_score || 0),
      pop_multiplier: c.__pop_multiplier ?? 1.0,
      resolution_credit: c.__resolution_credit ?? 0,
      effective_score: c.__effective_score,
      adjustments: c.audit || [],
      spillover: c.spillover,
      final_score: displayScore,
      live_boost: c.liveBoost,
    },

    recommendation: recommendation(displayScore, anom),
    region: c.region,
    fsi: { score: c.fsi_score, rank: c.fsi_rank, band: c.fsi_band },
    wst: null,
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
  kws.add(`${c.name} humanitarian crisis`);
  kws.add(`${c.name} crisis ${new Date().getFullYear()}`);
  kws.add(`${c.name} emergency`);
  kws.add(`${c.name} breaking news`);
  for (const t of c.types) { const arc = ARC[t]; if (arc?.seo) { kws.add(`${c.name} ${arc.seo}`); } }
  if (s.totalDisplaced > 0) kws.add(`${c.name} refugees`);
  if (s.quakeMag >= 5.0) kws.add(`${c.name} earthquake`);
  if (s.jmaQuake) kws.add(`${c.name} earthquake JMA`);
  if (s.bmkgQuake) kws.add(`${c.name} earthquake BMKG`);
  if (s.geofonQuake) kws.add(`${c.name} earthquake GEOFON`);
  if (s.ingvQuake) kws.add(`${c.name} earthquake INGV`);
  if (s.geonetQuake) kws.add(`${c.name} earthquake GeoNet`);
  if (s.gfwAlerts) kws.add(`${c.name} deforestation`);
  if (s.jtwcStorms?.length) kws.add(`${c.name} typhoon`);
  if (s.jmaTyphoons?.length) kws.add(`${c.name} typhoon JMA`);
  if (s.cdcOutbreaks?.length) kws.add(`${c.name} CDC outbreak`);
  if (s.whoDon?.length) kws.add(`${c.name} disease outbreak`);
  if (s.usDrought) kws.add(`${c.name} drought`);
  return [...kws].slice(0, 15);
}
function buildMetaDescription(iso, store) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const severity = severityLabel(c.score);
  let parts = [`${c.name} crisis update: score ${c.score}/100 (${severity})`];
  if (lb.tier === "BREAKING") parts.unshift(`🔴 BREAKING: ${lb.breaking_headline}`);
  else if (lb.tier === "DEVELOPING") parts.unshift(`🟠 DEVELOPING: ${lb.breaking_headline}`);
  return parts.slice(0, 3).join('. ') + '.';
}
function buildRelatedStories(iso, store, ranked) {
  return ranked.filter(r => r !== iso && (COUNTRIES[r].region === COUNTRIES[iso].region || (COUNTRIES[iso].adj || []).includes(r))).slice(0, 5)
    .map(r => ({ iso: r, name: store[r].name, score: store[r].score, live_score: store[r].__live_breaking?.live_score || 0, slug: slugify(store[r].name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(store[r].name)}` }));
}
function buildJSONLD(iso, store, ranked) {
  const c = store[iso];
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date().toISOString();
  const severity = severityLabel(c.score);
  const lb = c.__live_breaking || {};
  return {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "NewsArticle",
      "@id": `${url}#article`,
      "headline": lb.breaking_headline || `${c.name} Crisis — Score ${c.score}/100 (${severity})`,
      "description": buildMetaDescription(iso, store),
      "url": url,
      "datePublished": now,
      "dateModified": now,
      "author": { "@type": "Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
      "publisher": { "@type": "Organization", "name": CFG.ARTICLE_SITE_NAME, "url": CFG.ARTICLE_BASE_URL, "logo": { "@type": "ImageObject", "url": CFG.ARTICLE_LOGO } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "articleSection": "Humanitarian Crisis",
      "keywords": buildKeywords(iso, store).slice(0, 15).join(", "),
    }]
  };
}
function buildFAQs(iso, store, ranked) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  return [
    { q: `What is the current humanitarian situation in ${c.name}?`, a: `${c.name} has a score of ${c.score}/100, rated ${severityLabel(c.score)}.${lb.tier === "BREAKING" ? ` 🔴 BREAKING: ${lb.breaking_headline}` : ''}` },
    { q: `How can I help?`, a: `Support organisations active in ${c.name}.` },
  ];
}
function buildSEOArticle(iso, store, ranked) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const headline = lb.breaking_headline || `${c.name} Crisis Monitor — ${c.score}/100`;
  const articleBody = `## Overview\n\n${c.name} scores ${c.score}/100 (${severityLabel(c.score)}).`;
  const { words, minutes } = estimateReadTime(articleBody);
  return { headline, dek: `Score ${c.score}/100 · ${lb.distinct_event_count || 0} events · ${lb.raw_signal_count || 0} signals`, slug: slugify(c.name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`, metaDescription: buildMetaDescription(iso, store), keywords: buildKeywords(iso, store), faqs: buildFAQs(iso, store, ranked), body_markdown: articleBody, body_html: `<article><h1>${headline}</h1><p>${articleBody}</p></article>`, word_count: words, read_time_minutes: minutes };
}
function buildSitemap(payloads) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${payloads.map(p => `  <url><loc>${CFG.ARTICLE_BASE_URL}/crisis/${p.slug}</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq></url>`).join("\n")}\n</urlset>`;
}
function escapeXml(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function buildRSSFeed(isos, store, ranked) {
  const now = new Date();
  const items = isos.slice(0, 30).map(iso => {
    const a = buildSEOArticle(iso, store, ranked);
    const c = store[iso];
    const lb = c.__live_breaking || {};
    return `<item><title>${escapeXml(a.headline)}</title><link>${a.url}</link><guid isPermaLink="true">${a.url}</guid><pubDate>${now.toUTCString()}</pubDate><description>${escapeXml(a.dek)}</description>${lb.tier === "BREAKING" ? `<category>🔴 BREAKING NEWS</category>` : ""}<content:encoded><![CDATA[${a.body_html}]]></content:encoded></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${CFG.ARTICLE_SITE_NAME}</title><link>${CFG.ARTICLE_BASE_URL}</link><description>Live breaking world crisis news.</description><lastBuildDate>${now.toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}

// ═══ additive: builds the meta.data_sources block. When liveData is present
// this is identical to the original inline object. When liveData is null
// (force_live=false, or the fetch exceeded GLOBAL_LIVE_FETCH_BUDGET_MS) it
// returns a safe "structural-only" placeholder instead of throwing on
// liveData.usgs.live etc. ═══
function buildDataSourcesMeta(liveData) {
  if (!liveData) {
    return {
      mode: "structural_only",
      reason: "force_live=false or live-fetch exceeded GLOBAL_LIVE_FETCH_BUDGET_MS",
    };
  }
  return {
    usgs_weekly: { live: liveData.usgs.live, events: liveData.usgs.data?.length ?? 0 },
    usgs_significant_month: { live: liveData.usgsSig.live, events: liveData.usgsSig.data?.length ?? 0 },
    usgs_shakemap: { live: liveData.shakemap.live, events: liveData.shakemap.data?.length ?? 0 },
    emsc: { live: liveData.emsc.live, events: liveData.emsc.data?.length ?? 0 },
    jma: { live: liveData.jma.live, events: liveData.jma.data?.length ?? 0 },
    bmkg: { live: liveData.bmkg.live, events: liveData.bmkg.data?.length ?? 0 },
    geofon: { live: liveData.geofon.live, events: liveData.geofon.data?.length ?? 0 },
    ingv: { live: liveData.ingv.live, events: liveData.ingv.data?.length ?? 0 },
    geonet: { live: liveData.geonet.live, events: liveData.geonet.data?.length ?? 0 },
    jma_typhoon: { live: liveData.jmaTyphoon.live, typhoons: liveData.jmaTyphoon.data?.length ?? 0 },
    nasa_eonet: { live: liveData.nasa.live, events: liveData.nasa.data?.length ?? 0 },
    gdacs: { live: liveData.gdacs.live, events: liveData.gdacs.data?.length ?? 0 },
    ifrc_events: { live: liveData.ifrc.live, events: liveData.ifrc.data?.length ?? 0 },
    ifrc_appeals: { live: liveData.ifrcAppeals.live, events: liveData.ifrcAppeals.data?.length ?? 0 },
    openmeteo_heat: { live: liveData.heat.live, countries: Object.keys(liveData.heat.data || {}).length },
    openmeteo_hazards: { live: liveData.hazards.live },
    openmeteo_aq: { live: liveData.aq.live, cities: Object.keys(liveData.aq.data || {}).length },
    openmeteo_ensemble: { live: liveData.ensemble.live, spread: liveData.ensemble.data?.spread },
    noaa: { live: liveData.noaa.live },
    noaa_spc: { live: liveData.spc.live, label: liveData.spc.data?.label },
    cdc: { live: liveData.cdc.live, events: liveData.cdc.data?.length ?? 0 },
    who_rss: { live: liveData.who.live },
    who_don: { live: liveData.whoDon.live, events: liveData.whoDon.data?.length ?? 0 },
    ecdc: { live: liveData.ecdc.live, events: liveData.ecdc.data?.length ?? 0 },
    us_drought: { live: liveData.usDrought.live },
    copernicus_sentinel: { live: liveData.sentinel.live, events: liveData.sentinel.data?.length ?? 0 },
    nasa_power: { live: liveData.nasaPower.live, anchors: Object.keys(liveData.nasaPower.data || {}).length },
    disease_sh: { live: liveData.disease.live, countries: liveData.disease.data?.length ?? 0 },
    world_bank: { live: Object.values(liveData.wb).some(v => v.live) },
    unhcr: { live: liveData.unhcr.live },
    unhcr_solutions: { live: liveData.unhcrSolutions.live, countries: Object.keys(liveData.unhcrSolutions.data || {}).length },
    gfw: { live: liveData.gfw.live, countries: Object.keys(liveData.gfw.data || {}).length },
    inform: { live: liveData.inform.live, countries: Object.keys(liveData.inform.data || {}).length },
    climate_trace: { live: liveData.climateTrace.live, countries: Object.keys(liveData.climateTrace.data || {}).length },
    hdx: { live: liveData.hdx.live, countries: Object.keys(liveData.hdx.data || {}).length },
    jtwc: { live: liveData.jtwc.live, storms: liveData.jtwc.data?.length ?? 0 },
  };
}

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
      force_live: url.searchParams.get("force_live") !== "false",
      export: url.searchParams.get("export") || null,
      widget: url.searchParams.get("widget") === "true",
      breaking: url.searchParams.get("format") === "breaking",
      live: url.searchParams.get("format") === "live",
      rss: url.searchParams.get("format") === "rss",
      wst: url.searchParams.get("format") === "wst",
    };
    if (Number.isNaN(params.top)) params.top = 179;
    if (Number.isNaN(params.threshold)) params.threshold = 0;
    params.top = Math.min(CFG.MAX_TOP_N, Math.max(1, params.top));
  } catch { res.writeHead(400, CORS); res.end(JSON.stringify({ error: "Bad request URL" })); return; }

  if (params.region) for (const [canon, aliases] of Object.entries(REGION_ALIASES)) if (aliases.includes(params.region)) { params.region = canon; break; }
  if (params.q && !params.iso) {
    const r = findIsoByName(params.q);
    if (!r) { res.writeHead(404, CORS); res.end(JSON.stringify({ error: `Could not resolve "${params.q}"` })); return; }
    params.iso = r;
  }

  const isoList = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s]) : [];
  const invalid = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => !COUNTRIES[s]) : [];
  if (invalid.length) { res.writeHead(404, CORS); res.end(JSON.stringify({ error: `Unknown ISO: ${invalid.join(", ")}` })); return; }

  try {
    // ═══ additive fix: previously fetchAllLive() ran unconditionally, so
    // ?force_live=false (documented in meta.endpoints.structural_fallback)
    // never actually skipped the ~35-source network fan-out, and any single
    // slow upstream could stall the whole request. Now force_live=false
    // skips the network entirely (fast structural-only response), and the
    // default force_live=true path is capped by GLOBAL_LIVE_FETCH_BUDGET_MS
    // so it always resolves — buildStore()/computeLiveBreakingScore() etc.
    // already handle liveData === null gracefully (falls back to
    // structural scoring). No scoring or ranking logic changed. ═══
    const liveData = params.force_live ? await fetchAllLiveWithBudget() : null;
    const store = await buildStore(liveData);
    const ranked = rankByLiveBreaking(store);
    const breakingRanked = rankBreakingOnly(store, 1);
    const liveEventsOnly = rankLiveEventsOnly(store);

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => (store[iso].__effective_score || 0) >= params.threshold);
    else if (params.force_live && liveEventsOnly.length > 0) finalIsos = liveEventsOnly.slice(0, params.top);
    else if (params.force_live && breakingRanked.length > 0) finalIsos = breakingRanked.slice(0, params.top);
    else finalIsos = ranked.slice(0, params.top);
    if (!finalIsos.length && !isoList.length) finalIsos = ranked.slice(0, params.top);

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const s = store[iso];
      const data = { iso, name: s.name, score: s.score, structural_score: s.structural_score, effective_score: s.__effective_score, live_breaking: s.__live_breaking, dimensions: s.dims, evidence: s.signals };
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${iso}.json"` });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const c = store[finalIsos[0]];
      const lb = c.__live_breaking || {};
      const html = `<div style="padding:16px;background:#0f1a30;color:#fff;font-family:system-ui;max-width:320px;border-radius:12px;"><b>${c.flag} ${c.name}</b> — Effective Score ${c.__effective_score || 0}/100 (${lb.tier_label || "—"})<br><small>${lb.breaking_headline || ""}</small></div>`;
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (params.live) {
      const source = liveEventsOnly.length ? liveEventsOnly : breakingRanked;
      const feed = source.slice(0, params.top || 25).map(iso => {
        const c = store[iso];
        const lb = c.__live_breaking;
        return { rank: source.indexOf(iso) + 1, iso, name: c.name, flag: c.flag, live_score: lb.live_score, effective_score: c.__effective_score, tier: lb.tier, headline: lb.breaking_headline, signal_count: lb.signal_count, distinct_event_count: lb.distinct_event_count, source_count: lb.source_count, sources: lb.sources, structural_score: c.structural_score, is_low_instrumentation: isLowInstrumentation(lb) };
      });
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=120" });
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), feed: "live-breaking-news", total_with_live_events: liveEventsOnly.length, total_with_any_signals: breakingRanked.length }, live_news: feed }, null, 2));
      return;
    }

    if (params.rss) {
      const isos = params.region ? (liveEventsOnly.length ? liveEventsOnly : breakingRanked).filter(i => COUNTRIES[i].region === params.region).slice(0, 30) : (liveEventsOnly.length ? liveEventsOnly : breakingRanked).slice(0, 30);
      const f = buildRSSFeed(isos.length ? isos : ranked.slice(0, 30), store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" });
      res.end(f);
      return;
    }

    if (params.wst) {
      const wst = Object.keys(store).filter(i => store[i].__wst).map(i => ({ iso: i, name: store[i].name, flag: store[i].flag, wst_class: store[i].__wst.class, score: store[i].score, structural_score: store[i].structural_score, live_score: store[i].__live_breaking?.live_score || 0, live_tier: store[i].__live_breaking?.tier })).sort((a, b) => b.live_score - a.live_score);
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString() }, countries: wst }, null, 2));
      return;
    }

    if (params.breaking) {
      const source = liveEventsOnly.length ? liveEventsOnly : breakingRanked;
      const feed = source.slice(0, params.top || 20).map(iso => {
        const c = store[iso];
        const lb = c.__live_breaking;
        return { iso, name: c.name, flag: c.flag, live_score: lb.live_score, effective_score: c.__effective_score, tier: lb.tier, tier_label: lb.tier_label, headline: lb.breaking_headline, signal_count: lb.signal_count, distinct_event_count: lb.distinct_event_count, has_fresh_live_event: lb.has_fresh_live_event, source_count: lb.source_count, sources: lb.sources, structural_score: c.structural_score, top_events: lb.events.slice(0, 3), is_low_instrumentation: isLowInstrumentation(lb) };
      });
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), mode: "breaking", total_with_live_events: liveEventsOnly.length, total_with_any_signals: breakingRanked.length }, breaking: feed }, null, 2));
      return;
    }

    if (params.format === "sitemap") {
      const p = await Promise.all(finalIsos.map(iso => buildPayload(iso, store, ranked, { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary })));
      res.writeHead(200, { ...CORS, "Content-Type": "application/xml; charset=utf-8" });
      res.end(buildSitemap(p));
      return;
    }

    if (params.format === "article" && finalIsos.length === 1) {
      const a = buildSEOArticle(finalIsos[0], store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "text/html; charset=utf-8" });
      res.end(a.body_html);
      return;
    }

    const opts = { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary, article: params.format === "article" };
    const payloads = await Promise.all(finalIsos.map(iso => buildPayload(iso, store, ranked, opts)));
    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";
    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        ranking_mode: "LIVE_BREAKING_NEWS_v13.9.6",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_signals: breakingRanked.length,
        countries_with_fresh_live_events: liveEventsOnly.length,
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        score_field_is_live: CFG.SCORE_FIELD_IS_LIVE,
        dedup_enabled: CFG.DEDUP_ENABLED,
        history_min_for_anomaly: CFG.HISTORY_MIN_FOR_ANOMALY,
        pop_exposure_enabled: CFG.POP_EXPOSURE_ENABLED,
        resolution_credit_enabled: CFG.RESOLUTION_CREDIT_ENABLED,
        low_instrumentation_threshold: CFG.LOW_INSTRUMENTATION_THRESHOLD,
        note: "v13.9.6 — 10/10 calibrated. Ranking: effective_score → has_fresh → live_score → freshness. Population exposure multiplier + resolution credit + low-instrumentation flag added.",
        live_news_stats: {
          total_with_live_signals: breakingRanked.length,
          total_with_fresh_live_events: liveEventsOnly.length,
          top_live_iso: ranked[0] || null,
          top_live_headline: ranked[0] ? store[ranked[0]].__live_breaking.breaking_headline : null,
          signal_types_available: Object.keys(LIVE_SIGNALS).length,
        },
        // ═══ additive fix: this used to dereference liveData.usgs.live etc.
        // directly, which threw "Cannot read properties of null" whenever
        // liveData was null. Routed through buildDataSourcesMeta() so the
        // structural-only fallback path (see force_live above) can never
        // crash the response. ═══
        data_sources: buildDataSourcesMeta(liveData),
        endpoints: {
          single: "GET /api/top-story",
          live_news: "GET /api/top-story?format=live",
          top_n: "GET /api/top-story?top=10",
          iso: "GET /api/top-story?iso=SOM",
          compare: "GET /api/top-story?iso=SOM,YEM",
          region: "GET /api/top-story?region=africa",
          rss_feed: "GET /api/top-story?format=rss",
          breaking: "GET /api/top-story?format=breaking",
          structural_fallback: "GET /api/top-story?force_live=false",
        },
      },
      ...(mode === "single" ? { top_story: payloads[0] } : {}),
      ...(mode === "list" ? { countries: payloads } : {}),
    };

    res.writeHead(200, { ...CORS, "Cache-Control": `public, s-maxage=${secsUntilNext}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("[top-story v13.9.6]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
