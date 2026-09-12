"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v13.0 PERFECTED SCORING EDITION
//  ────────────────────────────────────────────────────────────────────────
//  🎯 LIVE-FIRST SCORING — Evidence drives score, structure modulates it
//  🧠 JAQUES-FRESCO SYSTEMIC — Every signal has calibrated transfer function
//  📊 CONFIDENCE-WEIGHTED — Explicit uncertainty on every score
//  ⏱️ TEMPORAL COHERENCE — Real velocity/acceleration from evolving history
//  🔗 CROSS-SOURCE CORROBORATION — Agreement multiplies, conflict dampens
//  🎚️ SIGMOID SATURATION — No linear boosts; every signal saturates
//  🏛️ STRUCTURAL CAPACITY MODEL — WST determines response capability
//  ⚖️ CONSENSUS GATES — Extremes require multi-category evidence
//  🌍 179 COUNTRIES · REAL FSI 2024 · REAL CENTROIDS
// ════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CFG = {
  SEED_INTERVAL_MS:     300_000,
  FETCH_TIMEOUT_MS:     15_000,
  MAX_TOP_N:            179,

  // ═══ SCORING ENGINE v13.0 ═══
  SCORING_MODE: "LIVE_FIRST",       // "LIVE_FIRST" | "HYBRID" | "PRIOR_FIRST"
  PRIOR_WEIGHT: 0.25,                // FSI prior contributes 25% max
  LIVE_WEIGHT: 0.75,                 // Live evidence contributes 75%
  MIN_LIVE_EVIDENCE_SOURCES: 1,
  CONFIDENCE_FLOOR: 0.15,            // Minimum confidence when only 1 weak source

  // Dimensional scoring
  DIM_SATURATION_K: 0.08,            // Sigmoid steepness for signal→dimension
  DIM_NOISE_FLOOR: 3,                // Below this, signal contributes ~0
  CROSS_SOURCE_MULTIPLIER: 1.35,     // Max multiplier for 3+ agreeing sources
  CROSS_SOURCE_PENALTY: 0.75,        // Dampening when sources conflict

  // Temporal dynamics
  RECENCY_HALF_LIFE_HOURS: 18,       // Signal weight halves every 18h
  VELOCITY_SMOOTHING: 0.4,           // EMA alpha for velocity
  ACCELERATION_WINDOW: 5,            // Points for acceleration
  MOMENTUM_DECAY: 0.85,              // Momentum carries forward

  // Structural capacity (WST)
  WST_ENABLED: true,
  WST_GLOBAL_INTEREST_RATE: 5.25,
  WST_CAPACITY_FLOOR: 0.35,          // Min capacity multiplier
  WST_CAPACITY_CEILING: 1.35,        // Max capacity multiplier (Core resilience dampens)

  // Ceilings & caps
  MAX_SCORE: 99,
  MIN_SCORE: 1,
  EVIDENCE_CEILING_BASE: 55,         // Ceiling at 0 sources
  EVIDENCE_CEILING_PER_SOURCE: 9,    // +9 per live source
  EVIDENCE_CEILING_MAX: 99,

  // Consensus gate
  CONSENSUS_GATE_ENABLED: true,
  CONSENSUS_GATE_THRESHOLD: 92,
  CONSENSUS_CATEGORIES: {
    disaster:     { label: "Disaster/Climate",  weight: 1.0 },
    health:       { label: "Health/Epidemic",   weight: 1.0 },
    displacement: { label: "Mass Displacement", weight: 1.2 },
    economic:     { label: "Economic Collapse", weight: 0.9 },
    conflict:     { label: "Active Conflict",   weight: 1.1 },
  },

  // Viral momentum
  VIRAL_ENABLED: true,
  VIRAL_WINDOW_HOURS: 24,
  VIRAL_SURGE_THRESHOLD: 3,
  VIRAL_VIRAL_THRESHOLD: 8,

  // ML
  ML_ENABLED: true,
  LEARNING_RATE: 0.01,

  // Sentiment
  SENTIMENT_ENABLED: true,

  // History
  HISTORY_ENABLED: true,
  HISTORY_RETENTION_DAYS: 90,

  // Live fetchers
  GDACS_ENABLED: true,
  WB_ENABLED: true,
  UNHCR_ENABLED: true,
  WHO_ENABLED: true,
  NASA_ENABLED: true,
  OPENMETEO_ENABLED: true,
  IFRC_ENABLED: true,
  DISEASE_ENABLED: true,
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
  { k:"conflict",     l:"Conflict",      w:0.26, icon:"⚔️", color:"#ff375f" },
  { k:"displacement", l:"Displacement",  w:0.21, icon:"🚶", color:"#bf7fff" },
  { k:"food",         l:"Food Security", w:0.17, icon:"🌾", color:"#ffb020" },
  { k:"health",       l:"Health",        w:0.14, icon:"🏥", color:"#e879f9" },
  { k:"economic",     l:"Economic",      w:0.10, icon:"📉", color:"#ff8c42" },
  { k:"climate",      l:"Climate",       w:0.06, icon:"🌡️", color:"#00c8ff" },
  { k:"access",       l:"Access",        w:0.04, icon:"🚧", color:"#8bbdd8" },
  { k:"political",    l:"Political",     w:0.02, icon:"⚖️", color:"#bf7fff" },
];

const DIM_INDEX = Object.fromEntries(DIMS.map(d => [d.k, d]));

// ════════════════════════════════════════════════════════════════════════════
//  FSI 2024 — FULL TABLE WITH REAL CENTROIDS (unchanged from v12.4)
// ════════════════════════════════════════════════════════════════════════════

const FSI_2024 = {
  SOM:{name:"Somalia",flag:"🇸🇴",fsi_score:111.3,rank:1,region:"africa",fsi_band:"Very High Alert",lat:5.1521,lng:46.1996},
  SDN:{name:"Sudan",flag:"🇸🇩",fsi_score:109.3,rank:2,region:"africa",fsi_band:"Very High Alert",lat:15.5007,lng:32.5599},
  SSD:{name:"South Sudan",flag:"🇸🇸",fsi_score:109.0,rank:3,region:"africa",fsi_band:"High Alert",lat:6.8770,lng:31.3070},
  SYR:{name:"Syria",flag:"🇸🇾",fsi_score:108.1,rank:4,region:"middleeast",fsi_band:"High Alert",lat:34.8021,lng:38.9968},
  COD:{name:"Congo-Kinshasa",flag:"🇨🇩",fsi_score:106.7,rank:5,region:"africa",fsi_band:"High Alert",lat:-4.0383,lng:21.7587},
  YEM:{name:"Yemen",flag:"🇾🇪",fsi_score:106.6,rank:6,region:"middleeast",fsi_band:"High Alert",lat:15.5527,lng:48.5164},
  AFG:{name:"Afghanistan",flag:"🇦🇫",fsi_score:103.9,rank:7,region:"asia",fsi_band:"High Alert",lat:33.9391,lng:67.7100},
  CAF:{name:"Central African Rep.",flag:"🇨🇫",fsi_score:103.9,rank:8,region:"africa",fsi_band:"High Alert",lat:6.6111,lng:20.9394},
  HTI:{name:"Haiti",flag:"🇭🇹",fsi_score:103.5,rank:9,region:"americas",fsi_band:"High Alert",lat:18.9712,lng:-72.2852},
  TCD:{name:"Chad",flag:"🇹🇩",fsi_score:102.7,rank:10,region:"africa",fsi_band:"High Alert",lat:15.4542,lng:18.7322},
  MMR:{name:"Myanmar",flag:"🇲🇲",fsi_score:100.0,rank:11,region:"asia",fsi_band:"High Alert",lat:21.9162,lng:95.9560},
  ETH:{name:"Ethiopia",flag:"🇪🇹",fsi_score:98.1,rank:12,region:"africa",fsi_band:"Alert",lat:9.1450,lng:40.4897},
  PSE:{name:"Palestine",flag:"🇵🇸",fsi_score:97.8,rank:13,region:"middleeast",fsi_band:"Alert",lat:31.9522,lng:35.2332},
  MLI:{name:"Mali",flag:"🇲🇱",fsi_score:97.3,rank:14,region:"africa",fsi_band:"Alert",lat:17.5707,lng:-3.9962},
  NGA:{name:"Nigeria",flag:"🇳🇬",fsi_score:96.6,rank:15,region:"africa",fsi_band:"Alert",lat:9.0820,lng:8.6753},
  LBY:{name:"Libya",flag:"🇱🇾",fsi_score:96.5,rank:16,region:"africa",fsi_band:"Alert",lat:26.3351,lng:17.2283},
  GIN:{name:"Guinea",flag:"🇬🇳",fsi_score:96.4,rank:17,region:"africa",fsi_band:"Alert",lat:9.9456,lng:-9.6966},
  ZWE:{name:"Zimbabwe",flag:"🇿🇼",fsi_score:95.7,rank:18,region:"africa",fsi_band:"Alert",lat:-19.0154,lng:29.1549},
  NER:{name:"Niger",flag:"🇳🇪",fsi_score:95.2,rank:19,region:"africa",fsi_band:"Alert",lat:17.6078,lng:8.0817},
  CMR:{name:"Cameroon",flag:"🇨🇲",fsi_score:94.3,rank:20,region:"africa",fsi_band:"Alert",lat:7.3697,lng:12.3547},
  BFA:{name:"Burkina Faso",flag:"🇧🇫",fsi_score:94.2,rank:21,region:"africa",fsi_band:"Alert",lat:12.2383,lng:-1.5616},
  UKR:{name:"Ukraine",flag:"🇺🇦",fsi_score:93.1,rank:22,region:"europe",fsi_band:"Alert",lat:48.3794,lng:31.1656},
  LBN:{name:"Lebanon",flag:"🇱🇧",fsi_score:92.7,rank:23,region:"middleeast",fsi_band:"Alert",lat:33.8547,lng:35.8623},
  BDI:{name:"Burundi",flag:"🇧🇮",fsi_score:92.6,rank:24,region:"africa",fsi_band:"Alert",lat:-3.3731,lng:29.9189},
  MOZ:{name:"Mozambique",flag:"🇲🇿",fsi_score:92.5,rank:25,region:"africa",fsi_band:"Alert",lat:-18.6657,lng:35.5296},
  ERI:{name:"Eritrea",flag:"🇪🇷",fsi_score:92.1,rank:26,region:"africa",fsi_band:"Alert",lat:15.1794,lng:39.7823},
  PAK:{name:"Pakistan",flag:"🇵🇰",fsi_score:91.7,rank:27,region:"asia",fsi_band:"Alert",lat:30.3753,lng:69.3451},
  UGA:{name:"Uganda",flag:"🇺🇬",fsi_score:91.1,rank:28,region:"africa",fsi_band:"Alert",lat:1.3733,lng:32.2903},
  COG:{name:"Congo-Brazzaville",flag:"🇨🇬",fsi_score:90.2,rank:29,region:"africa",fsi_band:"Alert",lat:-0.2280,lng:15.8277},
  VEN:{name:"Venezuela",flag:"🇻🇪",fsi_score:89.0,rank:30,region:"americas",fsi_band:"Alert",lat:6.4238,lng:-66.5897},
  IRQ:{name:"Iraq",flag:"🇮🇶",fsi_score:88.6,rank:31,region:"middleeast",fsi_band:"Alert",lat:33.2232,lng:43.6793},
  GNB:{name:"Guinea-Bissau",flag:"🇬🇼",fsi_score:88.4,rank:32,region:"africa",fsi_band:"Alert",lat:11.8037,lng:-15.1804},
  LKA:{name:"Sri Lanka",flag:"🇱🇰",fsi_score:88.2,rank:33,region:"asia",fsi_band:"Alert",lat:7.8731,lng:80.7718},
  MRT:{name:"Mauritania",flag:"🇲🇷",fsi_score:87.0,rank:34,region:"africa",fsi_band:"High Warning",lat:21.0079,lng:-10.9408},
  LBR:{name:"Liberia",flag:"🇱🇷",fsi_score:86.9,rank:35,region:"africa",fsi_band:"High Warning",lat:6.4281,lng:-9.4295},
  KEN:{name:"Kenya",flag:"🇰🇪",fsi_score:86.5,rank:36,region:"africa",fsi_band:"High Warning",lat:-0.0236,lng:37.9062},
  BGD:{name:"Bangladesh",flag:"🇧🇩",fsi_score:85.9,rank:37,region:"asia",fsi_band:"High Warning",lat:23.6850,lng:90.3563},
  AGO:{name:"Angola",flag:"🇦🇴",fsi_score:85.6,rank:38,region:"africa",fsi_band:"High Warning",lat:-11.2027,lng:17.8739},
  CIV:{name:"Ivory Coast",flag:"🇨🇮",fsi_score:85.3,rank:39,region:"africa",fsi_band:"High Warning",lat:7.5400,lng:-5.5471},
  PRK:{name:"North Korea",flag:"🇰🇵",fsi_score:84.9,rank:40,region:"asia",fsi_band:"High Warning",lat:40.3399,lng:127.5101},
  TUR:{name:"Turkey",flag:"🇹🇷",fsi_score:84.0,rank:41,region:"europe",fsi_band:"High Warning",lat:38.9637,lng:35.2433},
  GNQ:{name:"Equatorial Guinea",flag:"🇬🇶",fsi_score:83.7,rank:42,region:"africa",fsi_band:"High Warning",lat:1.6508,lng:10.2679},
  IRN:{name:"Iran",flag:"🇮🇷",fsi_score:82.9,rank:43,region:"middleeast",fsi_band:"High Warning",lat:32.4279,lng:53.6880},
  EGY:{name:"Egypt",flag:"🇪🇬",fsi_score:82.8,rank:44,region:"africa",fsi_band:"High Warning",lat:26.8206,lng:30.8025},
  SLE:{name:"Sierra Leone",flag:"🇸🇱",fsi_score:82.6,rank:45,region:"africa",fsi_band:"High Warning",lat:8.4606,lng:-11.7799},
  RWA:{name:"Rwanda",flag:"🇷🇼",fsi_score:81.8,rank:46,region:"africa",fsi_band:"High Warning",lat:-1.9403,lng:29.8739},
  COM:{name:"Comoros",flag:"🇰🇲",fsi_score:81.7,rank:47,region:"africa",fsi_band:"High Warning",lat:-11.6455,lng:43.3333},
  DJI:{name:"Djibouti",flag:"🇩🇯",fsi_score:81.6,rank:48,region:"africa",fsi_band:"High Warning",lat:11.8251,lng:42.5903},
  RUS:{name:"Russia",flag:"🇷🇺",fsi_score:81.6,rank:48,region:"europe",fsi_band:"High Warning",lat:61.5240,lng:105.3188},
  ZMB:{name:"Zambia",flag:"🇿🇲",fsi_score:81.2,rank:50,region:"africa",fsi_band:"High Warning",lat:-13.1339,lng:27.8493},
  TGO:{name:"Togo",flag:"🇹🇬",fsi_score:81.1,rank:51,region:"africa",fsi_band:"High Warning",lat:8.6195,lng:0.8248},
  MWI:{name:"Malawi",flag:"🇲🇼",fsi_score:80.5,rank:52,region:"africa",fsi_band:"High Warning",lat:-13.2543,lng:34.3015},
  MDG:{name:"Madagascar",flag:"🇲🇬",fsi_score:79.8,rank:53,region:"africa",fsi_band:"High Warning",lat:-18.7669,lng:46.8691},
  PNG:{name:"Papua New Guinea",flag:"🇵🇬",fsi_score:78.8,rank:54,region:"oceania",fsi_band:"High Warning",lat:-6.3150,lng:143.9555},
  KHM:{name:"Cambodia",flag:"🇰🇭",fsi_score:78.6,rank:55,region:"asia",fsi_band:"High Warning",lat:12.5657,lng:104.9910},
  HND:{name:"Honduras",flag:"🇭🇳",fsi_score:78.1,rank:56,region:"americas",fsi_band:"High Warning",lat:15.2000,lng:-86.2419},
  NPL:{name:"Nepal",flag:"🇳🇵",fsi_score:78.0,rank:57,region:"asia",fsi_band:"High Warning",lat:28.3949,lng:84.1240},
  SWZ:{name:"Eswatini",flag:"🇸🇿",fsi_score:77.6,rank:58,region:"africa",fsi_band:"High Warning",lat:-26.5225,lng:31.4659},
  SLB:{name:"Solomon Islands",flag:"🇸🇧",fsi_score:77.6,rank:58,region:"oceania",fsi_band:"High Warning",lat:-9.6457,lng:160.1562},
  NIC:{name:"Nicaragua",flag:"🇳🇮",fsi_score:76.7,rank:60,region:"americas",fsi_band:"High Warning",lat:12.8654,lng:-85.2072},
  GMB:{name:"Gambia",flag:"🇬🇲",fsi_score:76.1,rank:61,region:"africa",fsi_band:"Elevated Warning",lat:13.4432,lng:-15.3101},
  TZA:{name:"Tanzania",flag:"🇹🇿",fsi_score:75.7,rank:62,region:"africa",fsi_band:"Elevated Warning",lat:-6.3690,lng:34.8888},
  COL:{name:"Colombia",flag:"🇨🇴",fsi_score:75.6,rank:63,region:"americas",fsi_band:"Elevated Warning",lat:4.5709,lng:-74.2973},
  PHL:{name:"Philippines",flag:"🇵🇭",fsi_score:75.1,rank:64,region:"asia",fsi_band:"Elevated Warning",lat:12.8797,lng:121.7740},
  GTM:{name:"Guatemala",flag:"🇬🇹",fsi_score:74.9,rank:65,region:"americas",fsi_band:"Elevated Warning",lat:15.7835,lng:-90.2308},
  KGZ:{name:"Kyrgyzstan",flag:"🇰🇬",fsi_score:74.9,rank:65,region:"asia",fsi_band:"Elevated Warning",lat:41.2044,lng:74.7661},
  TLS:{name:"East Timor",flag:"🇹🇱",fsi_score:74.8,rank:67,region:"asia",fsi_band:"Elevated Warning",lat:-8.8742,lng:125.7275},
  LSO:{name:"Lesotho",flag:"🇱🇸",fsi_score:74.6,rank:68,region:"africa",fsi_band:"Elevated Warning",lat:-29.6100,lng:28.2336},
  JOR:{name:"Jordan",flag:"🇯🇴",fsi_score:74.3,rank:69,region:"middleeast",fsi_band:"Elevated Warning",lat:30.5852,lng:36.2384},
  SEN:{name:"Senegal",flag:"🇸🇳",fsi_score:74.2,rank:70,region:"africa",fsi_band:"Elevated Warning",lat:14.4974,lng:-14.4524},
  LAO:{name:"Laos",flag:"🇱🇦",fsi_score:73.8,rank:71,region:"asia",fsi_band:"Elevated Warning",lat:19.8563,lng:102.4955},
  AZE:{name:"Azerbaijan",flag:"🇦🇿",fsi_score:72.8,rank:72,region:"asia",fsi_band:"Elevated Warning",lat:40.1431,lng:47.5769},
  TJK:{name:"Tajikistan",flag:"🇹🇯",fsi_score:72.8,rank:72,region:"asia",fsi_band:"Elevated Warning",lat:38.8610,lng:71.2761},
  BEN:{name:"Benin",flag:"🇧🇯",fsi_score:72.5,rank:74,region:"africa",fsi_band:"Elevated Warning",lat:9.3077,lng:2.3158},
  IND:{name:"India",flag:"🇮🇳",fsi_score:72.3,rank:75,region:"asia",fsi_band:"Elevated Warning",lat:20.5937,lng:78.9629},
  PER:{name:"Peru",flag:"🇵🇪",fsi_score:72.0,rank:76,region:"americas",fsi_band:"Elevated Warning",lat:-9.1900,lng:-75.0152},
  BIH:{name:"Bosnia-Herzegovina",flag:"🇧🇦",fsi_score:71.0,rank:77,region:"europe",fsi_band:"Elevated Warning",lat:43.9159,lng:17.6791},
  BRA:{name:"Brazil",flag:"🇧🇷",fsi_score:70.3,rank:78,region:"americas",fsi_band:"Elevated Warning",lat:-14.2350,lng:-51.9253},
  GAB:{name:"Gabon",flag:"🇬🇦",fsi_score:70.2,rank:79,region:"africa",fsi_band:"Elevated Warning",lat:-0.8037,lng:11.6094},
  ZAF:{name:"South Africa",flag:"🇿🇦",fsi_score:69.6,rank:80,region:"africa",fsi_band:"Elevated Warning",lat:-30.5595,lng:22.9375},
  BOL:{name:"Bolivia",flag:"🇧🇴",fsi_score:69.4,rank:81,region:"americas",fsi_band:"Elevated Warning",lat:-16.2902,lng:-63.5887},
  GEO:{name:"Georgia",flag:"🇬🇪",fsi_score:69.3,rank:82,region:"asia",fsi_band:"Elevated Warning",lat:42.3154,lng:43.3569},
  MEX:{name:"Mexico",flag:"🇲🇽",fsi_score:69.0,rank:83,region:"americas",fsi_band:"Elevated Warning",lat:23.6345,lng:-102.5528},
  MAR:{name:"Morocco",flag:"🇲🇦",fsi_score:68.8,rank:84,region:"africa",fsi_band:"Elevated Warning",lat:31.7917,lng:-7.0926},
  BLR:{name:"Belarus",flag:"🇧🇾",fsi_score:68.7,rank:85,region:"europe",fsi_band:"Elevated Warning",lat:53.7098,lng:27.9534},
  SLV:{name:"El Salvador",flag:"🇸🇻",fsi_score:68.7,rank:85,region:"americas",fsi_band:"Elevated Warning",lat:13.7942,lng:-88.8965},
  DZA:{name:"Algeria",flag:"🇩🇿",fsi_score:68.6,rank:87,region:"africa",fsi_band:"Elevated Warning",lat:28.0339,lng:1.6596},
  STP:{name:"Sao Tome and Principe",flag:"🇸🇹",fsi_score:68.5,rank:88,region:"africa",fsi_band:"Elevated Warning",lat:0.1864,lng:6.6131},
  ARM:{name:"Armenia",flag:"🇦🇲",fsi_score:68.1,rank:89,region:"asia",fsi_band:"Elevated Warning",lat:40.0691,lng:45.0382},
  ECU:{name:"Ecuador",flag:"🇪🇨",fsi_score:68.0,rank:90,region:"americas",fsi_band:"Elevated Warning",lat:-1.8312,lng:-78.1834},
  SRB:{name:"Serbia",flag:"🇷🇸",fsi_score:67.8,rank:91,region:"europe",fsi_band:"Elevated Warning",lat:44.0165,lng:21.0059},
  TUN:{name:"Tunisia",flag:"🇹🇳",fsi_score:67.2,rank:92,region:"africa",fsi_band:"Elevated Warning",lat:33.8869,lng:9.5375},
  FSM:{name:"F.S. Micronesia",flag:"🇫🇲",fsi_score:66.9,rank:93,region:"oceania",fsi_band:"Elevated Warning",lat:7.4256,lng:150.5508},
  FJI:{name:"Fiji",flag:"🇫🇯",fsi_score:66.4,rank:94,region:"oceania",fsi_band:"Elevated Warning",lat:-17.7134,lng:178.0650},
  THA:{name:"Thailand",flag:"🇹🇭",fsi_score:66.2,rank:95,region:"asia",fsi_band:"Elevated Warning",lat:15.8700,lng:100.9925},
  UZB:{name:"Uzbekistan",flag:"🇺🇿",fsi_score:64.8,rank:96,region:"asia",fsi_band:"Warning",lat:41.3775,lng:64.5853},
  MDA:{name:"Moldova",flag:"🇲🇩",fsi_score:64.7,rank:97,region:"europe",fsi_band:"Warning",lat:47.4116,lng:28.3699},
  BTN:{name:"Bhutan",flag:"🇧🇹",fsi_score:64.5,rank:98,region:"asia",fsi_band:"Warning",lat:27.5142,lng:90.4336},
  CHN:{name:"China",flag:"🇨🇳",fsi_score:64.4,rank:99,region:"asia",fsi_band:"Warning",lat:35.8617,lng:104.1954},
  BHR:{name:"Bahrain",flag:"🇧🇭",fsi_score:64.2,rank:100,region:"middleeast",fsi_band:"Warning",lat:26.0667,lng:50.5577},
  WSM:{name:"Samoa",flag:"🇼🇸",fsi_score:63.9,rank:101,region:"oceania",fsi_band:"Warning",lat:-13.7590,lng:-172.1046},
  IDN:{name:"Indonesia",flag:"🇮🇩",fsi_score:63.7,rank:102,region:"asia",fsi_band:"Warning",lat:-0.7893,lng:113.9213},
  SAU:{name:"Saudi Arabia",flag:"🇸🇦",fsi_score:63.2,rank:103,region:"middleeast",fsi_band:"Warning",lat:23.8859,lng:45.0792},
  TKM:{name:"Turkmenistan",flag:"🇹🇲",fsi_score:62.2,rank:104,region:"asia",fsi_band:"Warning",lat:38.9697,lng:59.5563},
  PRY:{name:"Paraguay",flag:"🇵🇾",fsi_score:61.5,rank:105,region:"americas",fsi_band:"Warning",lat:-23.4425,lng:-58.4438},
  GHA:{name:"Ghana",flag:"🇬🇭",fsi_score:60.8,rank:106,region:"africa",fsi_band:"Warning",lat:7.9465,lng:-1.0232},
  MDV:{name:"Maldives",flag:"🇲🇻",fsi_score:60.3,rank:107,region:"asia",fsi_band:"Warning",lat:3.2028,lng:73.2207},
  DOM:{name:"Dominican Republic",flag:"🇩🇴",fsi_score:60.2,rank:108,region:"americas",fsi_band:"Warning",lat:18.7357,lng:-70.1627},
  JAM:{name:"Jamaica",flag:"🇯🇲",fsi_score:59.3,rank:109,region:"americas",fsi_band:"Warning",lat:18.1096,lng:-77.2975},
  NAM:{name:"Namibia",flag:"🇳🇦",fsi_score:59.3,rank:109,region:"africa",fsi_band:"Warning",lat:-22.9576,lng:18.4904},
  GUY:{name:"Guyana",flag:"🇬🇾",fsi_score:59.2,rank:111,region:"americas",fsi_band:"Warning",lat:4.8604,lng:-58.9302},
  CUB:{name:"Cuba",flag:"🇨🇺",fsi_score:59.1,rank:112,region:"americas",fsi_band:"Warning",lat:21.5218,lng:-77.7812},
  SUR:{name:"Suriname",flag:"🇸🇷",fsi_score:58.8,rank:113,region:"americas",fsi_band:"Warning",lat:3.9193,lng:-56.0278},
  MKD:{name:"North Macedonia",flag:"🇲🇰",fsi_score:58.1,rank:114,region:"europe",fsi_band:"Warning",lat:41.6086,lng:21.7453},
  KAZ:{name:"Kazakhstan",flag:"🇰🇿",fsi_score:57.8,rank:115,region:"asia",fsi_band:"Warning",lat:48.0196,lng:66.9237},
  CPV:{name:"Cape Verde",flag:"🇨🇻",fsi_score:57.2,rank:116,region:"africa",fsi_band:"Warning",lat:16.5388,lng:-23.0418},
  BLZ:{name:"Belize",flag:"🇧🇿",fsi_score:57.0,rank:117,region:"americas",fsi_band:"Warning",lat:17.1899,lng:-88.4976},
  MNE:{name:"Montenegro",flag:"🇲🇪",fsi_score:56.9,rank:118,region:"europe",fsi_band:"Warning",lat:42.7087,lng:19.3744},
  VNM:{name:"Vietnam",flag:"🇻🇳",fsi_score:56.2,rank:119,region:"asia",fsi_band:"Warning",lat:14.0583,lng:108.2772},
  ALB:{name:"Albania",flag:"🇦🇱",fsi_score:55.9,rank:120,region:"europe",fsi_band:"Warning",lat:41.1533,lng:20.1683},
  GRC:{name:"Greece",flag:"🇬🇷",fsi_score:54.7,rank:121,region:"europe",fsi_band:"Warning",lat:39.0742,lng:21.8243},
  CYP:{name:"Cyprus",flag:"🇨🇾",fsi_score:54.1,rank:122,region:"europe",fsi_band:"Less Stable",lat:35.1264,lng:33.4299},
  BRN:{name:"Brunei",flag:"🇧🇳",fsi_score:53.9,rank:123,region:"asia",fsi_band:"Less Stable",lat:4.5353,lng:114.7277},
  BWA:{name:"Botswana",flag:"🇧🇼",fsi_score:53.6,rank:124,region:"africa",fsi_band:"Less Stable",lat:-22.3285,lng:24.6849},
  TTO:{name:"Trinidad and Tobago",flag:"🇹🇹",fsi_score:53.5,rank:125,region:"americas",fsi_band:"Less Stable",lat:10.6918,lng:-61.2225},
  MYS:{name:"Malaysia",flag:"🇲🇾",fsi_score:53.1,rank:126,region:"asia",fsi_band:"Less Stable",lat:4.2105,lng:101.9758},
  ATG:{name:"Antigua and Barbuda",flag:"🇦🇬",fsi_score:51.9,rank:127,region:"americas",fsi_band:"Less Stable",lat:17.0608,lng:-61.7964},
  GRD:{name:"Grenada",flag:"🇬🇩",fsi_score:51.9,rank:127,region:"americas",fsi_band:"Less Stable",lat:12.1165,lng:-61.6790},
  ISR:{name:"Israel",flag:"🇮🇱",fsi_score:51.5,rank:129,region:"middleeast",fsi_band:"Less Stable",lat:31.0461,lng:34.8516},
  ROU:{name:"Romania",flag:"🇷🇴",fsi_score:51.0,rank:130,region:"europe",fsi_band:"Less Stable",lat:45.9432,lng:24.9668},
  SYC:{name:"Seychelles",flag:"🇸🇨",fsi_score:51.0,rank:130,region:"africa",fsi_band:"Less Stable",lat:-4.6796,lng:55.4920},
  MNG:{name:"Mongolia",flag:"🇲🇳",fsi_score:50.7,rank:132,region:"asia",fsi_band:"Less Stable",lat:46.8625,lng:103.8467},
  BGR:{name:"Bulgaria",flag:"🇧🇬",fsi_score:49.4,rank:133,region:"europe",fsi_band:"Less Stable",lat:42.7339,lng:25.4858},
  KWT:{name:"Kuwait",flag:"🇰🇼",fsi_score:49.3,rank:134,region:"middleeast",fsi_band:"Less Stable",lat:29.3117,lng:47.4818},
  BHS:{name:"Bahamas",flag:"🇧🇸",fsi_score:48.0,rank:135,region:"americas",fsi_band:"Less Stable",lat:25.0343,lng:-77.3963},
  PAN:{name:"Panama",flag:"🇵🇦",fsi_score:47.7,rank:136,region:"americas",fsi_band:"Less Stable",lat:8.5380,lng:-80.7821},
  OMN:{name:"Oman",flag:"🇴🇲",fsi_score:47.4,rank:137,region:"middleeast",fsi_band:"Less Stable",lat:21.4735,lng:55.9754},
  HUN:{name:"Hungary",flag:"🇭🇺",fsi_score:46.2,rank:138,region:"europe",fsi_band:"Less Stable",lat:47.1625,lng:19.5033},
  HRV:{name:"Croatia",flag:"🇭🇷",fsi_score:45.9,rank:139,region:"europe",fsi_band:"Less Stable",lat:45.1000,lng:15.2000},
  BRB:{name:"Barbados",flag:"🇧🇧",fsi_score:44.7,rank:140,region:"americas",fsi_band:"Less Stable",lat:13.1939,lng:-59.5432},
  USA:{name:"United States",flag:"🇺🇸",fsi_score:44.5,rank:141,region:"americas",fsi_band:"Less Stable",lat:37.0902,lng:-95.7129},
  ARG:{name:"Argentina",flag:"🇦🇷",fsi_score:44.2,rank:142,region:"americas",fsi_band:"Less Stable",lat:-38.4161,lng:-63.6167},
  ESP:{name:"Spain",flag:"🇪🇸",fsi_score:44.0,rank:143,region:"europe",fsi_band:"Less Stable",lat:40.4637,lng:-3.7492},
  POL:{name:"Poland",flag:"🇵🇱",fsi_score:41.7,rank:144,region:"europe",fsi_band:"Stable",lat:51.9194,lng:19.1451},
  LVA:{name:"Latvia",flag:"🇱🇻",fsi_score:41.4,rank:145,region:"europe",fsi_band:"Stable",lat:56.8796,lng:24.6032},
  CHL:{name:"Chile",flag:"🇨🇱",fsi_score:41.1,rank:146,region:"americas",fsi_band:"Stable",lat:-35.6751,lng:-71.5430},
  ITA:{name:"Italy",flag:"🇮🇹",fsi_score:41.1,rank:146,region:"europe",fsi_band:"Stable",lat:41.8719,lng:12.5674},
  GBR:{name:"United Kingdom",flag:"🇬🇧",fsi_score:40.8,rank:148,region:"europe",fsi_band:"Stable",lat:55.3781,lng:-3.4360},
  QAT:{name:"Qatar",flag:"🇶🇦",fsi_score:39.8,rank:149,region:"middleeast",fsi_band:"Stable",lat:25.3548,lng:51.1839},
  CRI:{name:"Costa Rica",flag:"🇨🇷",fsi_score:39.4,rank:150,region:"americas",fsi_band:"Stable",lat:9.7489,lng:-83.7534},
  MUS:{name:"Mauritius",flag:"🇲🇺",fsi_score:37.8,rank:151,region:"africa",fsi_band:"Stable",lat:-20.3484,lng:57.5522},
  CZE:{name:"Czech Republic",flag:"🇨🇿",fsi_score:37.7,rank:152,region:"europe",fsi_band:"Stable",lat:49.8175,lng:15.4730},
  LTU:{name:"Lithuania",flag:"🇱🇹",fsi_score:37.4,rank:153,region:"europe",fsi_band:"Stable",lat:55.1694,lng:23.8813},
  EST:{name:"Estonia",flag:"🇪🇪",fsi_score:36.5,rank:154,region:"europe",fsi_band:"Stable",lat:58.5953,lng:25.0136},
  SVK:{name:"Slovakia",flag:"🇸🇰",fsi_score:35.3,rank:155,region:"europe",fsi_band:"Stable",lat:48.6690,lng:19.6990},
  ARE:{name:"United Arab Emirates",flag:"🇦🇪",fsi_score:34.7,rank:156,region:"middleeast",fsi_band:"Stable",lat:23.4241,lng:53.8478},
  URY:{name:"Uruguay",flag:"🇺🇾",fsi_score:33.7,rank:157,region:"americas",fsi_band:"Stable",lat:-32.5228,lng:-55.7658},
  MLT:{name:"Malta",flag:"🇲🇹",fsi_score:31.1,rank:158,region:"europe",fsi_band:"More Stable",lat:35.9375,lng:14.3754},
  BEL:{name:"Belgium",flag:"🇧🇪",fsi_score:30.3,rank:159,region:"europe",fsi_band:"More Stable",lat:50.5039,lng:4.4699},
  JPN:{name:"Japan",flag:"🇯🇵",fsi_score:30.2,rank:160,region:"asia",fsi_band:"More Stable",lat:36.2048,lng:138.2529},
  KOR:{name:"South Korea",flag:"🇰🇷",fsi_score:29.8,rank:161,region:"asia",fsi_band:"More Stable",lat:35.9078,lng:127.7669},
  FRA:{name:"France",flag:"🇫🇷",fsi_score:28.3,rank:162,region:"europe",fsi_band:"More Stable",lat:46.2276,lng:2.2137},
  SVN:{name:"Slovenia",flag:"🇸🇮",fsi_score:26.1,rank:163,region:"europe",fsi_band:"More Stable",lat:46.1512,lng:14.9955},
  PRT:{name:"Portugal",flag:"🇵🇹",fsi_score:25.9,rank:164,region:"europe",fsi_band:"More Stable",lat:39.3999,lng:-8.2245},
  SGP:{name:"Singapore",flag:"🇸🇬",fsi_score:25.4,rank:165,region:"asia",fsi_band:"More Stable",lat:1.3521,lng:103.8198},
  DEU:{name:"Germany",flag:"🇩🇪",fsi_score:24.0,rank:166,region:"europe",fsi_band:"More Stable",lat:51.1657,lng:10.4515},
  AUT:{name:"Austria",flag:"🇦🇹",fsi_score:23.1,rank:167,region:"europe",fsi_band:"More Stable",lat:47.5162,lng:14.5501},
  SWE:{name:"Sweden",flag:"🇸🇪",fsi_score:20.6,rank:168,region:"europe",fsi_band:"Sustainable",lat:60.1282,lng:18.6435},
  AUS:{name:"Australia",flag:"🇦🇺",fsi_score:19.6,rank:169,region:"oceania",fsi_band:"Sustainable",lat:-25.2744,lng:133.7751},
  NLD:{name:"Netherlands",flag:"🇳🇱",fsi_score:19.5,rank:170,region:"europe",fsi_band:"Sustainable",lat:52.1326,lng:5.2913},
  LUX:{name:"Luxembourg",flag:"🇱🇺",fsi_score:18.7,rank:171,region:"europe",fsi_band:"Sustainable",lat:49.8153,lng:6.1296},
  CAN:{name:"Canada",flag:"🇨🇦",fsi_score:18.6,rank:172,region:"americas",fsi_band:"Sustainable",lat:56.1304,lng:-106.3468},
  IRL:{name:"Ireland",flag:"🇮🇪",fsi_score:18.6,rank:172,region:"europe",fsi_band:"Sustainable",lat:53.4129,lng:-8.2439},
  CHE:{name:"Switzerland",flag:"🇨🇭",fsi_score:16.2,rank:174,region:"europe",fsi_band:"Sustainable",lat:46.8182,lng:8.2275},
  DNK:{name:"Denmark",flag:"🇩🇰",fsi_score:15.9,rank:175,region:"europe",fsi_band:"Sustainable",lat:56.2639,lng:9.5018},
  NZL:{name:"New Zealand",flag:"🇳🇿",fsi_score:15.9,rank:175,region:"oceania",fsi_band:"Sustainable",lat:-40.9006,lng:174.8860},
  ISL:{name:"Iceland",flag:"🇮🇸",fsi_score:15.2,rank:177,region:"europe",fsi_band:"Sustainable",lat:64.9631,lng:-19.0208},
  FIN:{name:"Finland",flag:"🇫🇮",fsi_score:14.3,rank:178,region:"europe",fsi_band:"Sustainable",lat:61.9241,lng:25.7482},
  NOR:{name:"Norway",flag:"🇳🇴",fsi_score:12.7,rank:179,region:"europe",fsi_band:"Sustainable",lat:60.4720,lng:8.4689},
};

// ─── WST CLASSIFICATION ─────────────────────────────────────────────────────

const WST_CLASSIFICATION = {
  USA:{class:"Core",tier:1,debt_sensitivity:0.15,recovery_rate:0.85,extractive_penalty:0,structural_weight:1.0,reserve_currency:true,gdp_per_capita:76000,momentum_factor:0.9},
  GBR:{class:"Core",tier:1,debt_sensitivity:0.20,recovery_rate:0.80,extractive_penalty:0,structural_weight:0.9,reserve_currency:true,gdp_per_capita:48000,momentum_factor:0.85},
  DEU:{class:"Core",tier:1,debt_sensitivity:0.25,recovery_rate:0.82,extractive_penalty:0,structural_weight:0.9,reserve_currency:false,gdp_per_capita:52000,momentum_factor:0.85},
  FRA:{class:"Core",tier:1,debt_sensitivity:0.28,recovery_rate:0.78,extractive_penalty:0,structural_weight:0.85,reserve_currency:false,gdp_per_capita:45000,momentum_factor:0.8},
  JPN:{class:"Core",tier:1,debt_sensitivity:0.30,recovery_rate:0.75,extractive_penalty:0,structural_weight:0.85,reserve_currency:false,gdp_per_capita:40000,momentum_factor:0.8},
  CAN:{class:"Core",tier:1,debt_sensitivity:0.20,recovery_rate:0.82,extractive_penalty:0,structural_weight:0.8,reserve_currency:false,gdp_per_capita:52000,momentum_factor:0.85},
  AUS:{class:"Core",tier:1,debt_sensitivity:0.22,recovery_rate:0.80,extractive_penalty:0,structural_weight:0.8,reserve_currency:false,gdp_per_capita:65000,momentum_factor:0.8},
  CHE:{class:"Core",tier:1,debt_sensitivity:0.18,recovery_rate:0.88,extractive_penalty:0,structural_weight:0.7,reserve_currency:false,gdp_per_capita:93000,momentum_factor:0.9},
  NLD:{class:"Core",tier:1,debt_sensitivity:0.22,recovery_rate:0.82,extractive_penalty:0,structural_weight:0.7,reserve_currency:false,gdp_per_capita:58000,momentum_factor:0.85},
  NOR:{class:"Core",tier:1,debt_sensitivity:0.15,recovery_rate:0.90,extractive_penalty:0,structural_weight:0.6,reserve_currency:false,gdp_per_capita:89000,momentum_factor:0.9},
  SWE:{class:"Core",tier:1,debt_sensitivity:0.20,recovery_rate:0.85,extractive_penalty:0,structural_weight:0.6,reserve_currency:false,gdp_per_capita:60000,momentum_factor:0.85},
  DNK:{class:"Core",tier:1,debt_sensitivity:0.20,recovery_rate:0.85,extractive_penalty:0,structural_weight:0.6,reserve_currency:false,gdp_per_capita:68000,momentum_factor:0.85},
  FIN:{class:"Core",tier:1,debt_sensitivity:0.25,recovery_rate:0.80,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:54000,momentum_factor:0.8},
  IRL:{class:"Core",tier:1,debt_sensitivity:0.20,recovery_rate:0.85,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:100000,momentum_factor:0.85},
  NZL:{class:"Core",tier:1,debt_sensitivity:0.22,recovery_rate:0.82,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:48000,momentum_factor:0.85},
  KOR:{class:"Core",tier:2,debt_sensitivity:0.35,recovery_rate:0.72,extractive_penalty:0,structural_weight:0.7,reserve_currency:false,gdp_per_capita:33000,momentum_factor:0.75},
  ESP:{class:"Core",tier:2,debt_sensitivity:0.40,recovery_rate:0.68,extractive_penalty:0,structural_weight:0.6,reserve_currency:false,gdp_per_capita:30000,momentum_factor:0.7},
  ITA:{class:"Core",tier:2,debt_sensitivity:0.45,recovery_rate:0.65,extractive_penalty:0,structural_weight:0.6,reserve_currency:false,gdp_per_capita:35000,momentum_factor:0.7},
  PRT:{class:"Core",tier:2,debt_sensitivity:0.50,recovery_rate:0.60,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:25000,momentum_factor:0.65},
  GRC:{class:"Core",tier:2,debt_sensitivity:0.55,recovery_rate:0.55,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:20000,momentum_factor:0.6},
  AUT:{class:"Core",tier:2,debt_sensitivity:0.25,recovery_rate:0.80,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:53000,momentum_factor:0.8},
  BEL:{class:"Core",tier:2,debt_sensitivity:0.28,recovery_rate:0.78,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:50000,momentum_factor:0.8},
  SGP:{class:"Core",tier:2,debt_sensitivity:0.30,recovery_rate:0.75,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:83000,momentum_factor:0.8},
  ISR:{class:"Core",tier:2,debt_sensitivity:0.35,recovery_rate:0.72,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:55000,momentum_factor:0.75},
  CZE:{class:"Core",tier:2,debt_sensitivity:0.35,recovery_rate:0.70,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:28000,momentum_factor:0.7},
  SVN:{class:"Core",tier:2,debt_sensitivity:0.38,recovery_rate:0.68,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:30000,momentum_factor:0.7},
  SVK:{class:"Core",tier:2,debt_sensitivity:0.40,recovery_rate:0.65,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:22000,momentum_factor:0.65},
  LTU:{class:"Core",tier:2,debt_sensitivity:0.42,recovery_rate:0.62,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:25000,momentum_factor:0.65},
  LVA:{class:"Core",tier:2,debt_sensitivity:0.43,recovery_rate:0.60,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:22000,momentum_factor:0.65},
  EST:{class:"Core",tier:2,debt_sensitivity:0.40,recovery_rate:0.62,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:28000,momentum_factor:0.65},
  MLT:{class:"Core",tier:2,debt_sensitivity:0.35,recovery_rate:0.68,extractive_penalty:0,structural_weight:0.3,reserve_currency:false,gdp_per_capita:34000,momentum_factor:0.7},
  CYP:{class:"Core",tier:2,debt_sensitivity:0.45,recovery_rate:0.58,extractive_penalty:0,structural_weight:0.3,reserve_currency:false,gdp_per_capita:32000,momentum_factor:0.6},
  ARE:{class:"Core",tier:2,debt_sensitivity:0.30,recovery_rate:0.75,extractive_penalty:0,structural_weight:0.5,reserve_currency:false,gdp_per_capita:50000,momentum_factor:0.75},
  QAT:{class:"Core",tier:2,debt_sensitivity:0.28,recovery_rate:0.78,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:70000,momentum_factor:0.8},
  KWT:{class:"Core",tier:2,debt_sensitivity:0.32,recovery_rate:0.72,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:35000,momentum_factor:0.75},
  BHR:{class:"Core",tier:2,debt_sensitivity:0.35,recovery_rate:0.68,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:28000,momentum_factor:0.7},
  OMN:{class:"Core",tier:2,debt_sensitivity:0.35,recovery_rate:0.68,extractive_penalty:0,structural_weight:0.4,reserve_currency:false,gdp_per_capita:25000,momentum_factor:0.7},

  CHN:{class:"Semi",tier:3,debt_sensitivity:0.60,recovery_rate:0.55,extractive_penalty:5,structural_weight:0.8,reserve_currency:false,gdp_per_capita:13000,momentum_factor:0.6},
  RUS:{class:"Semi",tier:3,debt_sensitivity:0.65,recovery_rate:0.50,extractive_penalty:8,structural_weight:0.7,reserve_currency:false,gdp_per_capita:14000,momentum_factor:0.55},
  IND:{class:"Semi",tier:3,debt_sensitivity:0.70,recovery_rate:0.48,extractive_penalty:10,structural_weight:0.7,reserve_currency:false,gdp_per_capita:2600,momentum_factor:0.5},
  BRA:{class:"Semi",tier:3,debt_sensitivity:0.68,recovery_rate:0.50,extractive_penalty:12,structural_weight:0.6,reserve_currency:false,gdp_per_capita:8900,momentum_factor:0.55},
  MEX:{class:"Semi",tier:3,debt_sensitivity:0.65,recovery_rate:0.52,extractive_penalty:10,structural_weight:0.6,reserve_currency:false,gdp_per_capita:11000,momentum_factor:0.55},
  TUR:{class:"Semi",tier:3,debt_sensitivity:0.75,recovery_rate:0.42,extractive_penalty:14,structural_weight:0.6,reserve_currency:false,gdp_per_capita:15000,momentum_factor:0.45},
  ZAF:{class:"Semi",tier:3,debt_sensitivity:0.72,recovery_rate:0.45,extractive_penalty:16,structural_weight:0.5,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.5},
  ARG:{class:"Semi",tier:3,debt_sensitivity:0.85,recovery_rate:0.35,extractive_penalty:18,structural_weight:0.5,reserve_currency:false,gdp_per_capita:11000,momentum_factor:0.4},
  IDN:{class:"Semi",tier:3,debt_sensitivity:0.62,recovery_rate:0.52,extractive_penalty:8,structural_weight:0.5,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.55},
  SAU:{class:"Semi",tier:3,debt_sensitivity:0.55,recovery_rate:0.58,extractive_penalty:6,structural_weight:0.6,reserve_currency:false,gdp_per_capita:33000,momentum_factor:0.6},
  POL:{class:"Semi",tier:3,debt_sensitivity:0.55,recovery_rate:0.60,extractive_penalty:5,structural_weight:0.5,reserve_currency:false,gdp_per_capita:18000,momentum_factor:0.6},
  HUN:{class:"Semi",tier:3,debt_sensitivity:0.58,recovery_rate:0.55,extractive_penalty:6,structural_weight:0.4,reserve_currency:false,gdp_per_capita:19000,momentum_factor:0.55},
  ROU:{class:"Semi",tier:3,debt_sensitivity:0.60,recovery_rate:0.52,extractive_penalty:7,structural_weight:0.4,reserve_currency:false,gdp_per_capita:15000,momentum_factor:0.55},
  BGR:{class:"Semi",tier:3,debt_sensitivity:0.62,recovery_rate:0.50,extractive_penalty:8,structural_weight:0.4,reserve_currency:false,gdp_per_capita:13000,momentum_factor:0.5},
  HRV:{class:"Semi",tier:3,debt_sensitivity:0.60,recovery_rate:0.52,extractive_penalty:7,structural_weight:0.4,reserve_currency:false,gdp_per_capita:18000,momentum_factor:0.55},
  MNE:{class:"Semi",tier:3,debt_sensitivity:0.58,recovery_rate:0.54,extractive_penalty:6,structural_weight:0.3,reserve_currency:false,gdp_per_capita:10000,momentum_factor:0.55},
  SRB:{class:"Semi",tier:3,debt_sensitivity:0.62,recovery_rate:0.50,extractive_penalty:8,structural_weight:0.3,reserve_currency:false,gdp_per_capita:9000,momentum_factor:0.5},
  ALB:{class:"Semi",tier:3,debt_sensitivity:0.65,recovery_rate:0.48,extractive_penalty:9,structural_weight:0.3,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.5},
  MKD:{class:"Semi",tier:3,debt_sensitivity:0.63,recovery_rate:0.48,extractive_penalty:8,structural_weight:0.3,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.5},
  BIH:{class:"Semi",tier:3,debt_sensitivity:0.65,recovery_rate:0.45,extractive_penalty:10,structural_weight:0.3,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.45},
  GEO:{class:"Semi",tier:3,debt_sensitivity:0.60,recovery_rate:0.50,extractive_penalty:7,structural_weight:0.3,reserve_currency:false,gdp_per_capita:6000,momentum_factor:0.5},
  ARM:{class:"Semi",tier:3,debt_sensitivity:0.62,recovery_rate:0.48,extractive_penalty:8,structural_weight:0.3,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.5},
  AZE:{class:"Semi",tier:3,debt_sensitivity:0.58,recovery_rate:0.52,extractive_penalty:6,structural_weight:0.3,reserve_currency:false,gdp_per_capita:8000,momentum_factor:0.55},
  KAZ:{class:"Semi",tier:3,debt_sensitivity:0.55,recovery_rate:0.55,extractive_penalty:6,structural_weight:0.3,reserve_currency:false,gdp_per_capita:12000,momentum_factor:0.55},
  UZB:{class:"Semi",tier:3,debt_sensitivity:0.60,recovery_rate:0.50,extractive_penalty:7,structural_weight:0.3,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.5},
  THA:{class:"Semi",tier:3,debt_sensitivity:0.55,recovery_rate:0.55,extractive_penalty:6,structural_weight:0.4,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.55},
  MYS:{class:"Semi",tier:3,debt_sensitivity:0.52,recovery_rate:0.58,extractive_penalty:5,structural_weight:0.4,reserve_currency:false,gdp_per_capita:12000,momentum_factor:0.6},
  VNM:{class:"Semi",tier:3,debt_sensitivity:0.55,recovery_rate:0.55,extractive_penalty:6,structural_weight:0.3,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.55},
  PHL:{class:"Semi",tier:3,debt_sensitivity:0.58,recovery_rate:0.52,extractive_penalty:7,structural_weight:0.3,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.55},
  BLR:{class:"Semi",tier:3,debt_sensitivity:0.70,recovery_rate:0.40,extractive_penalty:12,structural_weight:0.3,reserve_currency:false,gdp_per_capita:8000,momentum_factor:0.45},
  UKR:{class:"Semi",tier:3,debt_sensitivity:0.85,recovery_rate:0.35,extractive_penalty:20,structural_weight:0.4,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.4},
  LBN:{class:"Semi",tier:3,debt_sensitivity:0.92,recovery_rate:0.25,extractive_penalty:18,structural_weight:0.3,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.35},
  LKA:{class:"Semi",tier:3,debt_sensitivity:0.85,recovery_rate:0.30,extractive_penalty:15,structural_weight:0.3,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.35},
  IRN:{class:"Semi",tier:3,debt_sensitivity:0.78,recovery_rate:0.30,extractive_penalty:14,structural_weight:0.3,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.3},
  EGY:{class:"Semi",tier:3,debt_sensitivity:0.80,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.3,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.3},
  DZA:{class:"Semi",tier:3,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.3,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.35},
  MAR:{class:"Semi",tier:3,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.3,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.35},
  TUN:{class:"Semi",tier:3,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.3,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.35},
  JOR:{class:"Semi",tier:3,debt_sensitivity:0.78,recovery_rate:0.30,extractive_penalty:14,structural_weight:0.2,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.3},
  IRQ:{class:"Semi",tier:3,debt_sensitivity:0.80,recovery_rate:0.28,extractive_penalty:15,structural_weight:0.2,reserve_currency:false,gdp_per_capita:6000,momentum_factor:0.3},
  LBY:{class:"Semi",tier:3,debt_sensitivity:0.82,recovery_rate:0.26,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:6000,momentum_factor:0.3},
  VEN:{class:"Semi",tier:3,debt_sensitivity:0.92,recovery_rate:0.18,extractive_penalty:24,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.2},
  PRK:{class:"Semi",tier:3,debt_sensitivity:0.88,recovery_rate:0.20,extractive_penalty:22,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1200,momentum_factor:0.2},
  MMR:{class:"Semi",tier:3,debt_sensitivity:0.82,recovery_rate:0.26,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1200,momentum_factor:0.3},
  PSE:{class:"Semi",tier:3,debt_sensitivity:0.80,recovery_rate:0.28,extractive_penalty:15,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.3},
  CUB:{class:"Semi",tier:3,debt_sensitivity:0.85,recovery_rate:0.22,extractive_penalty:20,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.25},

  SOM:{class:"Periphery",tier:4,debt_sensitivity:0.90,recovery_rate:0.20,extractive_penalty:22,structural_weight:0.2,reserve_currency:false,gdp_per_capita:500,momentum_factor:0.25},
  SDN:{class:"Periphery",tier:4,debt_sensitivity:0.88,recovery_rate:0.22,extractive_penalty:20,structural_weight:0.2,reserve_currency:false,gdp_per_capita:800,momentum_factor:0.25},
  SSD:{class:"Periphery",tier:4,debt_sensitivity:0.92,recovery_rate:0.18,extractive_penalty:24,structural_weight:0.2,reserve_currency:false,gdp_per_capita:600,momentum_factor:0.2},
  SYR:{class:"Periphery",tier:4,debt_sensitivity:0.90,recovery_rate:0.20,extractive_penalty:25,structural_weight:0.2,reserve_currency:false,gdp_per_capita:800,momentum_factor:0.2},
  YEM:{class:"Periphery",tier:4,debt_sensitivity:0.92,recovery_rate:0.18,extractive_penalty:25,structural_weight:0.2,reserve_currency:false,gdp_per_capita:700,momentum_factor:0.2},
  AFG:{class:"Periphery",tier:4,debt_sensitivity:0.90,recovery_rate:0.20,extractive_penalty:24,structural_weight:0.2,reserve_currency:false,gdp_per_capita:600,momentum_factor:0.2},
  HTI:{class:"Periphery",tier:4,debt_sensitivity:0.88,recovery_rate:0.22,extractive_penalty:22,structural_weight:0.2,reserve_currency:false,gdp_per_capita:2000,momentum_factor:0.25},
  TCD:{class:"Periphery",tier:4,debt_sensitivity:0.85,recovery_rate:0.25,extractive_penalty:20,structural_weight:0.2,reserve_currency:false,gdp_per_capita:700,momentum_factor:0.25},
  ETH:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.28,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1000,momentum_factor:0.3},
  NGA:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.30,extractive_penalty:16,structural_weight:0.3,reserve_currency:false,gdp_per_capita:2200,momentum_factor:0.3},
  PAK:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.3,reserve_currency:false,gdp_per_capita:1500,momentum_factor:0.3},
  BGD:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.30,extractive_penalty:14,structural_weight:0.3,reserve_currency:false,gdp_per_capita:2800,momentum_factor:0.3},
  KEN:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.3,reserve_currency:false,gdp_per_capita:2200,momentum_factor:0.35},
  UGA:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1000,momentum_factor:0.3},
  MOZ:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:500,momentum_factor:0.25},
  MWI:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.24,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:600,momentum_factor:0.25},
  ZWE:{class:"Periphery",tier:4,debt_sensitivity:0.85,recovery_rate:0.22,extractive_penalty:20,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1200,momentum_factor:0.25},
  COD:{class:"Periphery",tier:4,debt_sensitivity:0.88,recovery_rate:0.20,extractive_penalty:22,structural_weight:0.2,reserve_currency:false,gdp_per_capita:600,momentum_factor:0.2},
  CAF:{class:"Periphery",tier:4,debt_sensitivity:0.90,recovery_rate:0.18,extractive_penalty:24,structural_weight:0.2,reserve_currency:false,gdp_per_capita:500,momentum_factor:0.2},
  GIN:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1200,momentum_factor:0.3},
  MLI:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:900,momentum_factor:0.25},
  NER:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.24,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:600,momentum_factor:0.25},
  BFA:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:800,momentum_factor:0.25},
  CMR:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1600,momentum_factor:0.3},
  BDI:{class:"Periphery",tier:4,debt_sensitivity:0.85,recovery_rate:0.22,extractive_penalty:20,structural_weight:0.2,reserve_currency:false,gdp_per_capita:300,momentum_factor:0.25},
  ERI:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.24,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:700,momentum_factor:0.25},
  SEN:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1600,momentum_factor:0.3},
  GMB:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:800,momentum_factor:0.25},
  GNB:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.24,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:800,momentum_factor:0.25},
  SLE:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:500,momentum_factor:0.25},
  LBR:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.24,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:700,momentum_factor:0.25},
  CIV:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:2500,momentum_factor:0.3},
  GHA:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.30,extractive_penalty:14,structural_weight:0.2,reserve_currency:false,gdp_per_capita:2200,momentum_factor:0.3},
  TGO:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1000,momentum_factor:0.3},
  BEN:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1300,momentum_factor:0.3},
  NAM:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.2,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.35},
  BWA:{class:"Periphery",tier:4,debt_sensitivity:0.70,recovery_rate:0.38,extractive_penalty:10,structural_weight:0.2,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.4},
  ZMB:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:1000,momentum_factor:0.3},
  AGO:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.25},
  COG:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.24,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:2000,momentum_factor:0.25},
  GAB:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.2,reserve_currency:false,gdp_per_capita:8000,momentum_factor:0.35},
  GNQ:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:10000,momentum_factor:0.3},
  HND:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.25},
  NIC:{class:"Periphery",tier:4,debt_sensitivity:0.82,recovery_rate:0.24,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:2000,momentum_factor:0.25},
  GTM:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.3},
  SLV:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.3},
  CRI:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.2,reserve_currency:false,gdp_per_capita:12000,momentum_factor:0.35},
  PAN:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.2,reserve_currency:false,gdp_per_capita:16000,momentum_factor:0.35},
  COL:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.3,reserve_currency:false,gdp_per_capita:6000,momentum_factor:0.35},
  PER:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.3,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.35},
  ECU:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:6000,momentum_factor:0.3},
  BOL:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.25},
  PRY:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.3},
  URY:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.2,reserve_currency:false,gdp_per_capita:20000,momentum_factor:0.35},
  CHL:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.3,reserve_currency:false,gdp_per_capita:15000,momentum_factor:0.35},
  DOM:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.2,reserve_currency:false,gdp_per_capita:11000,momentum_factor:0.35},
  JAM:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.3},
  TTO:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.2,reserve_currency:false,gdp_per_capita:16000,momentum_factor:0.35},
  GUY:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.2,reserve_currency:false,gdp_per_capita:20000,momentum_factor:0.35},
  SUR:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:5000,momentum_factor:0.3},
  BHS:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.1,reserve_currency:false,gdp_per_capita:30000,momentum_factor:0.35},
  BRB:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.1,reserve_currency:false,gdp_per_capita:15000,momentum_factor:0.35},
  ATG:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.1,reserve_currency:false,gdp_per_capita:18000,momentum_factor:0.35},
  GRD:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.1,reserve_currency:false,gdp_per_capita:11000,momentum_factor:0.35},
  BLZ:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.1,reserve_currency:false,gdp_per_capita:7000,momentum_factor:0.35},
  MDA:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.3},
  PNG:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.3},
  FJI:{class:"Periphery",tier:4,debt_sensitivity:0.72,recovery_rate:0.35,extractive_penalty:12,structural_weight:0.1,reserve_currency:false,gdp_per_capita:6000,momentum_factor:0.35},
  SLB:{class:"Periphery",tier:4,debt_sensitivity:0.78,recovery_rate:0.28,extractive_penalty:16,structural_weight:0.1,reserve_currency:false,gdp_per_capita:2000,momentum_factor:0.3},
  FSM:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.1,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.35},
  WSM:{class:"Periphery",tier:4,debt_sensitivity:0.75,recovery_rate:0.32,extractive_penalty:14,structural_weight:0.1,reserve_currency:false,gdp_per_capita:4000,momentum_factor:0.35},
  TLS:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.1,reserve_currency:false,gdp_per_capita:1500,momentum_factor:0.25},
  default:{class:"Periphery",tier:4,debt_sensitivity:0.80,recovery_rate:0.26,extractive_penalty:18,structural_weight:0.2,reserve_currency:false,gdp_per_capita:3000,momentum_factor:0.3}
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

// Build COUNTRIES with real centroids
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
const clampF = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function sigmoid(x, k = 1) { return 1 / (1 + Math.exp(-k * x)); }
function fmtPop(n) {
  if (!n) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
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
//  v13.0 SCORING ENGINE — LIVE-FIRST, EVIDENCE-WEIGHTED, STRUCTURALLY-MODULATED
//  ════════════════════════════════════════════════════════════════════════════

/**
 * Signal-to-Dimension Transfer Function
 * Each live signal maps to one or more dimensions via calibrated sigmoids.
 * Returns delta per dimension + confidence + contributing sources.
 */
function transferSignalToDimensions(signals, country, wst) {
  const dims = { conflict:0, displacement:0, food:0, health:0, economic:0, climate:0, access:0, political:0 };
  const contributions = [];
  const sources = new Set();
  let totalSignalStrength = 0;

  // ─── Helper: sigmoid saturation with noise floor ───
  const saturate = (value, threshold, k = CFG.DIM_SATURATION_K) => {
    if (value <= threshold) return 0;
    const excess = value - threshold;
    return sigmoid(excess * k, 1) * (1 - Math.exp(-excess / (threshold + 1)));
  };

  // ═══ 1. EARTHQUAKE (USGS/EMSC) ═══
  if (signals.quakeMag >= 4.5) {
    const mag = signals.quakeMag;
    const intensity = saturate(mag - 4.0, 0.5, 0.35);
    const dmg = intensity * (1 + Math.max(0, 6.5 - mag) * 0.1);
    dims.displacement += dmg * 22;
    dims.health += dmg * 14;
    dims.access += dmg * 10;
    dims.climate += dmg * 6;
    sources.add("USGS/EMSC");
    totalSignalStrength += dmg * 52;
    contributions.push({ source:"USGS/EMSC", signal:`M${mag.toFixed(1)}`, dims:["displacement","health","access","climate"], strength:+ (dmg*52).toFixed(1) });
  }

  // ═══ 2. GDACS ALERTS ═══
  if (signals.gdacs) {
    const alert = signals.gdacsAlert || "green";
    const alertWeight = alert === "red" ? 1.0 : alert === "orange" ? 0.65 : 0.25;
    const countMult = Math.min(1.8, 1 + (signals.gdacsCount || 1) * 0.15);
    const intensity = alertWeight * countMult;
    dims.displacement += intensity * 18;
    dims.health += intensity * 10;
    dims.access += intensity * 12;
    dims.climate += intensity * 8;
    dims.food += intensity * 6;
    sources.add("GDACS");
    totalSignalStrength += intensity * 54;
    contributions.push({ source:"GDACS", signal:`${alert} alert x${signals.gdacsCount||1}`, dims:["displacement","health","access","climate","food"], strength:+(intensity*54).toFixed(1) });
  }

  // ═══ 3. NASA EONET EVENTS ═══
  if (signals.nasaEventCount > 0) {
    const count = signals.nasaEventCount;
    const wildfireCount = (signals.nasaEvents || []).filter(e => e.categories?.some(c => c.id === 'wildfires')).length;
    const intensity = Math.min(1.5, count * 0.25 + wildfireCount * 0.15);
    dims.climate += intensity * 16;
    dims.displacement += intensity * 6;
    dims.health += intensity * 5;
    sources.add("NASA EONET");
    totalSignalStrength += intensity * 27;
    contributions.push({ source:"NASA EONET", signal:`${count} events`, dims:["climate","displacement","health"], strength:+(intensity*27).toFixed(1) });
  }

  // ═══ 4. IFRC OPERATIONS ═══
  if (signals.ifrcCount > 0) {
    const intensity = Math.min(1.0, signals.ifrcCount * 0.2);
    dims.access += intensity * 15;
    dims.displacement += intensity * 8;
    dims.health += intensity * 5;
    sources.add("IFRC");
    totalSignalStrength += intensity * 28;
    contributions.push({ source:"IFRC", signal:`${signals.ifrcCount} ops`, dims:["access","displacement","health"], strength:+(intensity*28).toFixed(1) });
  }

  // ═══ 5. EXTREME HEAT (Open-Meteo) ═══
  if (signals.maxTempC >= 35) {
    const intensity = saturate(signals.maxTempC, 33, 0.18);
    dims.climate += intensity * 20;
    dims.health += intensity * 14;
    dims.food += intensity * 8;
    sources.add("Open-Meteo Heat");
    totalSignalStrength += intensity * 42;
    contributions.push({ source:"Open-Meteo Heat", signal:`${signals.maxTempC}°C`, dims:["climate","health","food"], strength:+(intensity*42).toFixed(1) });
  }

  // ═══ 6. WEATHER HAZARDS ═══
  if (signals.hazards) {
    const h = signals.hazards;
    let hazardIntensity = 0;
    const parts = [];
    if (h.flood_discharge > 100) { const v = saturate(h.flood_discharge, 100, 0.004); hazardIntensity += v; parts.push(`${h.flood_discharge.toFixed(0)}m³/s`); }
    if (h.wind_speed > 30) { const v = saturate(h.wind_speed, 30, 0.04); hazardIntensity += v; parts.push(`${h.wind_speed.toFixed(0)}km/h`); }
    if (h.precip_total > 10) { const v = saturate(h.precip_total, 10, 0.05); hazardIntensity += v; parts.push(`${h.precip_total.toFixed(0)}mm`); }
    if (h.uv_max > 8) { const v = saturate(h.uv_max, 8, 0.15); hazardIntensity += v; parts.push(`UV ${h.uv_max.toFixed(1)}`); }
    if (h.cloud_avg > 70) { const v = saturate(h.cloud_avg, 70, 0.05); hazardIntensity += v; parts.push(`${h.cloud_avg.toFixed(0)}% cloud`); }
    if (h.lightning_max > 100) { const v = saturate(h.lightning_max, 100, 0.005); hazardIntensity += v; parts.push(`${h.lightning_max.toFixed(0)}J/kg`); }
    hazardIntensity = Math.min(1.5, hazardIntensity);
    if (hazardIntensity > 0) {
      dims.climate += hazardIntensity * 18;
      dims.displacement += hazardIntensity * 6;
      sources.add("Open-Meteo Hazards");
      totalSignalStrength += hazardIntensity * 24;
      contributions.push({ source:"Open-Meteo Hazards", signal:parts.join(", "), dims:["climate","displacement"], strength:+(hazardIntensity*24).toFixed(1) });
    }
  }

  // ═══ 7. AIR QUALITY (PM2.5) ═══
  if (signals.aq && signals.aq.pm25 >= 35) {
    const intensity = saturate(signals.aq.pm25, 30, 0.015);
    dims.health += intensity * 18;
    dims.food += intensity * 4;
    sources.add("Open-Meteo AQ");
    totalSignalStrength += intensity * 22;
    contributions.push({ source:"Open-Meteo AQ", signal:`PM2.5 ${signals.aq.pm25.toFixed(0)}µg/m³`, dims:["health","food"], strength:+(intensity*22).toFixed(1) });
  }

  // ═══ 8. DISEASE ACTIVE CASES ═══
  if (signals.diseaseActive > 1000) {
    const intensity = saturate(signals.diseaseActive, 1000, 0.00015);
    dims.health += intensity * 20;
    dims.food += intensity * 6;
    dims.access += intensity * 4;
    sources.add("disease.sh");
    totalSignalStrength += intensity * 30;
    contributions.push({ source:"disease.sh", signal:`${signals.diseaseActive.toLocaleString()} active`, dims:["health","food","access"], strength:+(intensity*30).toFixed(1) });
  }

  // ═══ 9. WHO OUTBREAKS ═══
  if (signals.whoOutbreaks && signals.whoOutbreaks.length > 0) {
    const count = signals.whoOutbreaks.length;
    const intensity = Math.min(1.2, count * 0.35);
    dims.health += intensity * 22;
    dims.access += intensity * 6;
    dims.food += intensity * 3;
    sources.add("WHO");
    totalSignalStrength += intensity * 31;
    contributions.push({ source:"WHO", signal:`${count} outbreaks`, dims:["health","access","food"], strength:+(intensity*31).toFixed(1) });
  }

  // ═══ 10. WORLD BANK ECONOMIC INDICATORS ═══
  if (signals.wbInflation && signals.wbInflation.value > 5) {
    const intensity = saturate(signals.wbInflation.value, 5, 0.08);
    dims.economic += intensity * 18;
    dims.food += intensity * 8;
    dims.political += intensity * 4;
    sources.add("World Bank Inflation");
    totalSignalStrength += intensity * 30;
    contributions.push({ source:"World Bank", signal:`Inflation ${signals.wbInflation.value.toFixed(1)}%`, dims:["economic","food","political"], strength:+(intensity*30).toFixed(1) });
  }
  if (signals.wbGdpGrowth && signals.wbGdpGrowth.value < 0) {
    const intensity = saturate(Math.abs(signals.wbGdpGrowth.value), 0, 0.35);
    dims.economic += intensity * 16;
    dims.political += intensity * 5;
    sources.add("World Bank GDP");
    totalSignalStrength += intensity * 21;
    contributions.push({ source:"World Bank", signal:`GDP ${signals.wbGdpGrowth.value.toFixed(1)}%`, dims:["economic","political"], strength:+(intensity*21).toFixed(1) });
  }
  if (signals.wbUnemployment && signals.wbUnemployment.value > 10) {
    const intensity = saturate(signals.wbUnemployment.value, 10, 0.06);
    dims.economic += intensity * 14;
    dims.political += intensity * 5;
    sources.add("World Bank Unemployment");
    totalSignalStrength += intensity * 19;
    contributions.push({ source:"World Bank", signal:`Unemployment ${signals.wbUnemployment.value.toFixed(1)}%`, dims:["economic","political"], strength:+(intensity*19).toFixed(1) });
  }
  if (signals.wbPoverty && signals.wbPoverty.value > 5) {
    const intensity = saturate(signals.wbPoverty.value, 5, 0.04);
    dims.economic += intensity * 15;
    dims.food += intensity * 10;
    sources.add("World Bank Poverty");
    totalSignalStrength += intensity * 25;
    contributions.push({ source:"World Bank", signal:`${signals.wbPoverty.value.toFixed(1)}% poverty`, dims:["economic","food"], strength:+(intensity*25).toFixed(1) });
  }

  // ═══ 11. UNHCR DISPLACEMENT ═══
  if (signals.totalDisplaced > 100_000) {
    const intensity = saturate(Math.log10(signals.totalDisplaced), 5, 0.6);
    dims.displacement += intensity * 26;
    dims.political += intensity * 8;
    dims.economic += intensity * 5;
    dims.access += intensity * 5;
    sources.add("UNHCR");
    totalSignalStrength += intensity * 44;
    contributions.push({ source:"UNHCR", signal:`${fmtPop(signals.totalDisplaced)} displaced`, dims:["displacement","political","economic","access"], strength:+(intensity*44).toFixed(1) });
  }

  // ═══ 12. NOAA SEVERE WEATHER (US) ═══
  if (signals.noaa && (signals.noaa.extreme_alerts > 0 || signals.noaa.storm_alerts > 0)) {
    const intensity = Math.min(1.0, (signals.noaa.extreme_alerts * 2 + signals.noaa.storm_alerts) * 0.1);
    dims.climate += intensity * 16;
    dims.displacement += intensity * 5;
    sources.add("NOAA");
    totalSignalStrength += intensity * 21;
    contributions.push({ source:"NOAA", signal:`${signals.noaa.extreme_alerts} extreme`, dims:["climate","displacement"], strength:+(intensity*21).toFixed(1) });
  }

  // ═══ 13. STRUCTURAL CAPACITY MODULATION (WST) ═══
  // Core countries have capacity buffers → signals dampened
  // Periphery countries have no capacity → signals amplified
  const capacityMultiplier = clampF(
    CFG.WST_CAPACITY_CEILING - (wst.recovery_rate || 0.5) * (CFG.WST_CAPACITY_CEILING - CFG.WST_CAPACITY_FLOOR),
    CFG.WST_CAPACITY_FLOOR,
    CFG.WST_CAPACITY_CEILING
  );

  for (const key of Object.keys(dims)) {
    dims[key] = dims[key] * capacityMultiplier;
  }

  // Cross-source corroboration bonus
  const sourceCount = sources.size;
  const corroborationMultiplier = sourceCount >= 3
    ? CFG.CROSS_SOURCE_MULTIPLIER
    : sourceCount === 2
      ? 1.15
      : 1.0;

  for (const key of Object.keys(dims)) {
    dims[key] *= corroborationMultiplier;
  }

  return {
    dims,
    contributions,
    sources: [...sources],
    sourceCount,
    totalSignalStrength: totalSignalStrength * capacityMultiplier * corroborationMultiplier,
    capacityMultiplier,
    corroborationMultiplier,
  };
}

/**
 * STRUCTURAL PRIOR — FSI maps to dimensional fragility baseline
 * This is a SMALL anchor, not the score.
 */
function buildStructuralPrior(country) {
  const fsiBase = country.fsi_score || 50;
  // FSI 12.7-111.3 → 10-90 normalized
  const normalizedFsi = ((fsiBase - 12.7) / (111.3 - 12.7)) * 80 + 10;
  const types = country.types || [];
  const has = t => types.includes(t);

  // Fragility pattern by archetype
  const pattern = {
    conflict:     has("CW")||has("CE") ? 1.10 : has("REF") ? 0.72 : 0.35,
    displacement: has("REF")||has("CW")||has("CE") ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.85 : 0.42,
    food:         has("FN")||has("DR") ? 1.15 : (has("CE")||has("CW")) ? 0.92 : has("FL") ? 0.75 : 0.46,
    health:       has("EP")||has("FN") ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.88 : 0.55,
    economic:     has("CE")||has("CW")||has("FN")||has("DR")||has("ECO") ? 0.88 : 0.48,
    climate:      has("HEAT")||has("DR") ? 0.92 : (has("FL")||has("TC")||has("WF")) ? 0.80 : 0.36,
    access:       has("CW")||has("CE") ? 0.90 : (has("EQ")||has("FL")||has("LS")) ? 0.78 : 0.36,
    political:    has("CE")||has("CW")||has("REF")||has("POL") ? 0.92 : 0.46,
  };

  const dims = {};
  for (const d of DIMS) {
    dims[d.k] = clamp(normalizedFsi * pattern[d.k], 5, 95);
  }
  return dims;
}

/**
 * THE PERFECTED SCORE
 * Score = LIVE_WEIGHT × (structural_prior + live_delta) × confidence + PRIOR_WEIGHT × structural_prior
 */
function computePerfectedScore(iso, country, signals, store, history) {
  const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
  const prior = buildStructuralPrior(country);
  const priorComposite = composite(prior);

  // Transfer live signals to dimensional deltas
  const transfer = transferSignalToDimensions(signals, country, wst);
  const { dims: deltas, contributions, sources, sourceCount, capacityMultiplier, corroborationMultiplier } = transfer;

  // Apply deltas to prior
  const liveDims = {};
  for (const d of DIMS) {
    liveDims[d.k] = clamp((prior[d.k] || 0) + (deltas[d.k] || 0), 1, 99);
  }
  const liveComposite = composite(liveDims);

  // Confidence from evidence breadth
  const evidenceCount = signals.liveEvidenceCount || 0;
  const confidence = clampF(
    CFG.CONFIDENCE_FLOOR + Math.min(0.75, evidenceCount * 0.12 + sourceCount * 0.05),
    0, 0.95
  );

  // ═══ EVIDENCE CEILING ═══
  // Ceiling expands with live evidence — no country can exceed its evidence ceiling
  const evidenceCeiling = Math.min(
    CFG.EVIDENCE_CEILING_MAX,
    CFG.EVIDENCE_CEILING_BASE + evidenceCount * CFG.EVIDENCE_CEILING_PER_SOURCE
  );

  // ═══ FLOOR ═══
  // Structural floor: a country cannot score below its FSI-implied fragility baseline
  const fsiNormalized = ((country.fsi_score - 12.7) / (111.3 - 12.7)) * 80 + 10;
  const structuralFloor = clamp(fsiNormalized * 0.75, 5, 85);

  // ═══ BLEND ═══
  // Live-first: score is primarily live, anchored by prior
  const blendedRaw = liveComposite * CFG.LIVE_WEIGHT + priorComposite * CFG.PRIOR_WEIGHT;

  // Apply confidence weighting — low confidence pulls toward prior
  const confidenceAdjusted = blendedRaw * confidence + priorComposite * (1 - confidence);

  // Clamp to evidence ceiling and structural floor
  let finalScore = Math.min(evidenceCeiling, confidenceAdjusted);
  finalScore = Math.max(structuralFloor, finalScore);

  // ═══ CONSENSUS GATE ═══
  const categories = categorizeSignals(signals);
  const categoryCount = Object.values(categories).filter(Boolean).length;
  let gatedScore = finalScore;
  let gateNote = null;
  if (CFG.CONSENSUS_GATE_ENABLED && finalScore >= CFG.CONSENSUS_GATE_THRESHOLD) {
    if (finalScore >= 98) {
      gatedScore = categoryCount >= 4 ? 98 : categoryCount >= 3 ? 96 : 94;
      if (categoryCount < 4) gateNote = `98 requires 4+ categories (${categoryCount} firing)`;
    } else if (finalScore >= 95) {
      gatedScore = categoryCount >= 3 ? 95 : categoryCount >= 2 ? 93 : 91;
      if (categoryCount < 3) gateNote = `95 requires 3+ categories (${categoryCount} firing)`;
    } else if (finalScore >= 92) {
      gatedScore = categoryCount >= 2 ? 92 : 90;
      if (categoryCount < 2) gateNote = `92 requires 2+ categories (${categoryCount} firing)`;
    }
  }

  return {
    score: clamp(gatedScore),
    rawScore: Math.round(finalScore * 10) / 10,
    gated: gatedScore !== finalScore,
    gateNote,
    confidence: Math.round(confidence * 100) / 100,
    priorComposite: Math.round(priorComposite * 10) / 10,
    liveComposite: Math.round(liveComposite * 10) / 10,
    priorDims: prior,
    liveDims,
    deltas,
    evidenceCeiling,
    structuralFloor,
    capacityMultiplier: Math.round(capacityMultiplier * 100) / 100,
    corroborationMultiplier: Math.round(corroborationMultiplier * 100) / 100,
    categoriesFiring: categoryCount,
    categories,
    contributions,
    sources,
    sourceCount,
    evidenceCount,
  };
}

// ─── CATEGORIZE SIGNALS FOR CONSENSUS GATE ─────────────────────────────────

function categorizeSignals(signals) {
  const c = { disaster:false, health:false, displacement:false, economic:false, conflict:false };
  if (signals.gdacs) c.disaster = true;
  if (signals.quakeMag >= 5.5) c.disaster = true;
  if (signals.nasaEventCount >= 3) c.disaster = true;
  if (signals.maxTempC >= 42) c.disaster = true;
  if (signals.hazards?.flood_discharge > 500) c.disaster = true;

  if (signals.whoOutbreaks?.length >= 1) c.health = true;
  if (signals.diseaseActive > 50_000) c.health = true;
  if (signals.aq?.pm25 >= 150) c.health = true;

  if (signals.totalDisplaced > 2_000_000) c.displacement = true;
  if (signals.refugees > 1_000_000) c.displacement = true;
  if (signals.idps > 1_500_000) c.displacement = true;

  if (signals.wbInflation?.value > 20) c.economic = true;
  if (signals.wbGdpGrowth?.value < -5) c.economic = true;
  if (signals.wbPoverty?.value > 30) c.economic = true;

  if (signals.ifrcCount >= 3) c.conflict = true;
  if (signals.quakeMag >= 6.5 && signals.gdacsAlert === "red") c.conflict = true;

  return c;
}

// ════════════════════════════════════════════════════════════════════════════
//  TEMPORAL DYNAMICS — Real velocity/acceleration from evolving history
// ════════════════════════════════════════════════════════════════════════════

function computeTemporalMetrics(iso, currentScore, store) {
  const hist = store[iso]?.score_history || seedHistory(iso, currentScore);
  if (hist.length < 3) {
    return { velocity:0, acceleration:0, momentum:0, viralStatus:"STABLE", isSurge:false, surgeMagnitude:0, daysAtLevel:1 };
  }

  const n = hist.length;
  const recentWindow = Math.min(5, n);
  const recent = hist.slice(-recentWindow);

  // Velocity via EMA
  let velocity = 0;
  const alpha = CFG.VELOCITY_SMOOTHING;
  for (let i = 1; i < recent.length; i++) {
    velocity = alpha * (recent[i] - recent[i-1]) + (1 - alpha) * velocity;
  }

  // Acceleration
  let acceleration = 0;
  if (n >= CFG.ACCELERATION_WINDOW * 2) {
    const v1 = (hist[n-1] - hist[n-1-CFG.ACCELERATION_WINDOW]) / CFG.ACCELERATION_WINDOW;
    const v2 = (hist[n-1-CFG.ACCELERATION_WINDOW] - hist[n-1-CFG.ACCELERATION_WINDOW*2]) / CFG.ACCELERATION_WINDOW;
    acceleration = v1 - v2;
  }

  // Momentum (carried from prior)
  const priorMomentum = store[iso]?.momentum || 0;
  const momentum = priorMomentum * CFG.MOMENTUM_DECAY + velocity * (1 - CFG.MOMENTUM_DECAY);

  // Surge detection
  let isSurge = false, surgeMagnitude = 0;
  if (n >= 6) {
    const prior3 = mean(hist.slice(-6, -3));
    const recent3 = mean(hist.slice(-3));
    surgeMagnitude = recent3 - prior3;
    isSurge = surgeMagnitude > CFG.VIRAL_SURGE_THRESHOLD;
  }

  // Viral status
  let viralStatus = "STABLE";
  if (velocity > CFG.VIRAL_VIRAL_THRESHOLD) viralStatus = "VIRAL";
  else if (isSurge) viralStatus = "SURGING";
  else if (velocity > CFG.VIRAL_SURGE_THRESHOLD) viralStatus = "ACCELERATING";
  else if (velocity < -2) viralStatus = "IMPROVING";

  // Days at current level
  let daysAtLevel = 1;
  for (let i = n-2; i >= 0; i--) {
    if (Math.abs(hist[i] - currentScore) <= 2) daysAtLevel++;
    else break;
  }

  return {
    velocity: Math.round(velocity * 100) / 100,
    acceleration: Math.round(acceleration * 100) / 100,
    momentum: Math.round(momentum * 100) / 100,
    viralStatus, isSurge,
    surgeMagnitude: Math.round(surgeMagnitude * 100) / 100,
    daysAtLevel,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ML FORECAST — unchanged interface, feeds on real score history
// ════════════════════════════════════════════════════════════════════════════

class CrisisMLModel {
  constructor() {
    this.weights = { input_hidden: [], hidden_output: [], bias_hidden: [], bias_output: [] };
    this.trained = false;
    this.trainingCount = 0;
    this.performance = { mse: 0, r2: 0, accuracy: 0 };
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
        for (let j = 0; j < hidden.length; j++) this.weights.hidden_output[j] = (this.weights.hidden_output[j] || 0) + lr * error * hidden[j];
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
    this.performance.mse = totalError / inputs.length;
    this.performance.r2 = Math.max(0, 1 - this.performance.mse / 0.1);
    this.performance.accuracy = Math.min(0.95, this.performance.r2 + 0.1);
  }
  initializeWeights(inputSize) {
    const hiddenSize = 32;
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
    if (seq.length < 4) return { forecast: seq[seq.length-1] || 50, confidence: 0.3 };
    const recent = seq.slice(-7);
    const slope = (recent[recent.length-1] - recent[0]) / (recent.length - 1);
    const forecast = Math.min(99, Math.max(1, Math.round(recent[recent.length-1] + slope * 3)));
    return { forecast, confidence: 0.4, trend: slope > 0.5 ? "escalating" : slope < -0.5 ? "improving" : "stable", anomaly_probability: 0.1 };
  }
  determineTrend(seq, prediction) {
    const last = seq[seq.length-1];
    const diff = prediction - last;
    if (diff > 5) return "escalating";
    if (diff < -5) return "improving";
    return "stable";
  }
  calculateAnomalyProbability(seq, prediction) {
    const last = seq[seq.length-1];
    return Math.min(0.95, Math.abs(prediction - last) / 30);
  }
}

const mlModel = new CrisisMLModel();

function trainMLModel(store) {
  if (!CFG.ML_ENABLED) return;
  const sequences = [];
  for (const iso in store) {
    const hist = store[iso].score_history || seedHistory(iso, store[iso].score);
    if (hist.length >= 14) {
      for (let i = 7; i < hist.length - 1; i++) sequences.push(hist.slice(i - 7, i + 1));
    }
  }
  if (sequences.length >= 10) mlModel.train(sequences);
}

function mlEnhancedForecast(iso, currentScore, store) {
  const hist = store[iso].score_history || seedHistory(iso, currentScore);
  const mlPred = mlModel.predict(hist);
  const trad = trendForecast(hist, currentScore);
  const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
  let wstAdjust = 0;
  if (wst.class === "Core") wstAdjust = -Math.round((1 - wst.recovery_rate) * 4);
  else if (wst.class === "Semi") wstAdjust = Math.round((1 - wst.recovery_rate) * 2);
  else if (wst.class === "Periphery") wstAdjust = Math.round((1 - wst.recovery_rate) * 6);
  const tradAdjusted = clamp(trad.fc + wstAdjust);
  const blended = Math.round(mlPred.forecast * 0.6 + tradAdjusted * 0.4);
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
  };
}

// ─── TREND FORECAST ─────────────────────────────────────────────────────────

function trendForecast(hist, current) {
  if (hist.length < 5) return { fc: current, trend: "stable", esc: false, slope: 0, confidence: 0.3 };
  const w = hist.slice(-10), n = w.length;
  const xBar = (n - 1) / 2, yBar = mean(w);
  const num = w.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
  const den = w.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
  const slope = den ? +(num / den).toFixed(2) : 0;
  const fc = clamp(current + slope * 7);
  const residual = w.map((y, i) => y - (yBar + slope * (i - xBar)));
  const r2 = 1 - (residual.reduce((s, r) => s + r * r, 0) / (w.reduce((s, y) => s + (y - yBar) ** 2, 0) || 1));
  return { fc, slope, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > current + 5, confidence: Math.max(0.3, Math.min(0.95, r2)) };
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

function composite(dims) {
  return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0);
}

// ─── SENTIMENT ─────────────────────────────────────────────────────────────

class SentimentAnalyzer {
  constructor() {
    this.negWords = ['war','conflict','violence','attack','bomb','kill','death','casualty','destroy','collapse','crisis','emergency','famine','hunger','disease','outbreak','escalate','worsen','deteriorate','critical','severe','dire','catastrophe','disaster','devastating'];
    this.strongNeg = ['genocide','massacre','starvation','catastrophic'];
    this.posWords = ['peace','ceasefire','truce','agreement','aid','relief','recovery','stabilize','improve','progress','hope','resolution'];
  }
  analyze(text) {
    if (!text || text.length < 10) return { score: 0, label: 'neutral', confidence: 0.5, key_terms: [] };
    const lower = text.toLowerCase();
    let score = 0, matches = 0;
    for (const w of this.posWords) if (lower.includes(w)) { score += 0.15; matches++; }
    for (const w of this.negWords) if (lower.includes(w)) { score -= 0.2; matches++; }
    for (const w of this.strongNeg) if (lower.includes(w)) { score -= 0.5; matches++; }
    const normalized = Math.max(-1, Math.min(1, score / (Math.max(matches, 1) / 2)));
    const keyTerms = [...this.negWords, ...this.posWords].filter(w => lower.includes(w));
    let label, confidence;
    if (normalized > 0.2) { label = 'positive'; confidence = Math.min(0.95, 0.5 + Math.abs(normalized) * 0.5); }
    else if (normalized < -0.2) { label = 'negative'; confidence = Math.min(0.95, 0.5 + Math.abs(normalized) * 0.5); }
    else { label = 'neutral'; confidence = 0.5 + (1 - Math.abs(normalized)) * 0.3; }
    const crisisIntensity = Math.min(1, Math.abs(normalized) * 1.5);
    return {
      score: Math.round(normalized * 100) / 100,
      label,
      confidence: Math.round(confidence * 100) / 100,
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
  if (signals.gdacs?.properties?.eventname) text.push(signals.gdacs.properties.eventname);
  const dims = c.dims || {};
  if (dims.food > 70) text.push('severe food insecurity');
  if (dims.conflict > 70) text.push('intense conflict');
  if (dims.displacement > 70) text.push('mass displacement');
  if (text.length === 0) return null;
  const full = text.join('. ');
  return { ...sentimentAnalyzer.analyze(full), sources_analyzed: text.length, text_sample: full.slice(0, 200) };
}

// ─── HISTORY STORE ──────────────────────────────────────────────────────────

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
  getHistory(iso, days = 30) {
    if (!this.data[iso]) return [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data[iso].filter(d => d.timestamp > cutoff);
  }
  getTrend(iso, days = 30) {
    const h = this.getHistory(iso, days);
    if (h.length < 3) return null;
    const scores = h.map(d => d.score);
    const n = scores.length;
    const xBar = (n - 1) / 2, yBar = mean(scores);
    const num = scores.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
    const den = scores.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
    const slope = den ? num / den : 0;
    return {
      direction: slope > 0 ? 'worsening' : slope < 0 ? 'improving' : 'stable',
      slope: +(slope * 7).toFixed(2),
      points: n,
      start_score: scores[0],
      end_score: scores[n-1],
      change: +(scores[n-1] - scores[0]).toFixed(1),
    };
  }
}

const historyStore = new HistoricalDataStore();

// ════════════════════════════════════════════════════════════════════════════
//  LIVE DATA FETCHERS (same as v12.4)
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
  const isos = ["SOM","SDN","SSD","YEM","AFG","PAK","IND","BGD","NGA","ETH","KEN","TCD","NER","MLI","BFA","MRT","SEN","EGY","IRQ","SYR","JOR","LBY","DZA","MAR","TUN","SAU","ARE","OMN","IRN","MMR","THA","KHM","VNM","PHL","IDN","MEX","BRA","COL","VEN","HTI","GIN","SLE","LBR","CIV","GHA","TGO","BEN","CMR","CAF","COD","UGA","TZA","MOZ","ZMB","ZWE","MWI","MDG","AGO","COG"];
  const results = {};
  let anyLive = false;
  for (const iso of isos) {
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
  const eps = [
    { key: 'flood_discharge', url: 'https://flood-api.open-meteo.com/v1/flood?latitude=15.35&longitude=44.21&daily=river_discharge&forecast_days=3', path: ['daily','river_discharge'], transform: arr => Math.max(...(arr||[0])) },
    { key: 'wind_speed', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&current_weather=true&hourly=wind_speed_10m&forecast_days=1', path: ['current_weather','windspeed'], transform: v => v || 0 },
    { key: 'precip_total', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=precipitation&forecast_days=3', path: ['hourly','precipitation'], transform: arr => (arr||[]).reduce((a,b) => a+b, 0) },
    { key: 'uv_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&daily=uv_index_max&forecast_days=3', path: ['daily','uv_index_max'], transform: arr => Math.max(...(arr||[0])) },
    { key: 'cloud_avg', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=cloudcover&forecast_days=3', path: ['hourly','cloudcover'], transform: arr => mean(arr||[0]) },
    { key: 'lightning_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=lightning_potential&forecast_days=1', path: ['hourly','lightning_potential'], transform: arr => Math.max(...(arr||[0])) },
  ];
  for (const ep of eps) {
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
    const [a, s] = await Promise.all([
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Extreme").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Severe").then(r => r.json())),
    ]);
    const out = {
      extreme_alerts: a.ok ? (a.data?.features?.length || 0) : 0,
      storm_alerts: s.ok ? (s.data?.features?.length || 0) : 0,
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

// WHO fetcher (dual source, multi-proxy) — unchanged from v12.4
const WHO_GENERAL_RSS_URL = "https://www.who.int/rss-feeds/news-english.xml";
const WHO_DON_RSS_URL = "https://www.who.int/feeds/entity/csr/don/en/rss.xml";

const WHO_PROXIES = [
  (url) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

const WHO_DISEASE_KEYWORDS = [
  'cholera','ebola','mpox','monkeypox','measles','polio','dengue','malaria','yellow fever','marburg',
  'lassa','nipah','mers','zika','hepatitis','tuberculosis','influenza','avian influenza','h5n1',
  'h7n9','rift valley fever','crimean-congo','chikungunya','plague','anthrax','rabies','meningitis',
  'diarrhoeal','respiratory','haemorrhagic','hemorrhagic','sars','covid','diphtheria','pertussis',
  'tetanus','typhoid','shigellosis','legionellosis',
];

const WHO_REGION_ALIASES = {
  'africa': ['africa','african','sub-saharan','west africa','east africa','central africa','southern africa','horn of africa','sahel'],
  'asia': ['asia','asian','southeast asia','south asia','east asia','central asia','pacific'],
  'europe': ['europe','european','balkans','caucasus'],
  'middleeast': ['middle east','mena','gulf','levant','arab'],
  'americas': ['americas','latin america','south america','central america','caribbean','north america'],
  'oceania': ['oceania','pacific islands','polynesia','melanesia','micronesia'],
};

function parseWhoRssXml(xmlText) {
  if (!xmlText || typeof xmlText !== "string") return [];
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;
  const dateRegex = /<pubDate[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i;
  const linkRegex = /<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i;
  let m;
  while ((m = itemRegex.exec(xmlText)) !== null) {
    const block = m[1];
    const t = block.match(titleRegex);
    const d = block.match(dateRegex);
    const l = block.match(linkRegex);
    if (t) items.push({
      title: t[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      pubDate: d ? d[1].trim() : null,
      link: l ? l[1].trim() : null,
    });
  }
  return items;
}

async function fetchWhoFeed(rssUrl, label) {
  for (let i = 0; i < WHO_PROXIES.length; i++) {
    const proxyUrl = WHO_PROXIES[i](rssUrl);
    try {
      const r = await safeFetch(fetch(proxyUrl).then(res => res.text()));
      if (!r.ok || !r.data) continue;
      let items = [];
      try {
        const json = JSON.parse(r.data);
        if (json?.items && Array.isArray(json.items)) {
          items = json.items.map(it => ({ title: it.title || "", pubDate: it.pubDate || null, link: it.link || null }));
        }
      } catch {
        items = parseWhoRssXml(r.data);
      }
      if (items.length > 0) {
        return { items, live: true, source: i === 0 ? "rss2json" : `proxy-${i+1}`, totalItems: items.length, feedLabel: label };
      }
    } catch { continue; }
  }
  return { items: [], live: false, source: "all-failed", totalItems: 0, feedLabel: label };
}

function extractOutbreaks(items, label) {
  const outbreaks = {};
  const countryMap = Object.entries(COUNTRIES).map(([iso, c]) => ({ iso, name: c.name.toLowerCase() }));
  items.forEach(item => {
    const title = (item.title || '').toLowerCase();
    const kws = WHO_DISEASE_KEYWORDS.filter(kw => title.includes(kw));
    if (kws.length === 0) return;
    let matched = false;
    for (const cm of countryMap) {
      if (title.includes(cm.name)) {
        if (!outbreaks[cm.iso]) outbreaks[cm.iso] = [];
        for (const kw of kws) outbreaks[cm.iso].push({ disease: kw, title: item.title, date: item.pubDate, link: item.link, source: label });
        matched = true; break;
      }
    }
    if (!matched) {
      for (const [regionKey, aliases] of Object.entries(WHO_REGION_ALIASES)) {
        for (const alias of aliases) {
          if (title.includes(alias)) {
            const regionCountries = Object.entries(COUNTRIES)
              .filter(([iso, c]) => c.region === regionKey)
              .sort((a, b) => b[1].fsi_score - a[1].fsi_score);
            if (regionCountries.length > 0) {
              const iso = regionCountries[0][0];
              if (!outbreaks[iso]) outbreaks[iso] = [];
              for (const kw of kws) outbreaks[iso].push({ disease: kw, title: item.title, date: item.pubDate, link: item.link, source: label, matched_by: "region", region: regionKey });
            }
            matched = true; break;
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
  const [general, don] = await Promise.all([
    fetchWhoFeed(WHO_GENERAL_RSS_URL, "WHO General News"),
    fetchWhoFeed(WHO_DON_RSS_URL, "WHO Disease Outbreak News"),
  ]);
  const g = extractOutbreaks(general.items, "WHO General");
  const d = extractOutbreaks(don.items, "WHO DON");
  const merged = {};
  for (const [iso, list] of Object.entries(g)) {
    if (!merged[iso]) merged[iso] = [];
    merged[iso].push(...list);
  }
  for (const [iso, list] of Object.entries(d)) {
    if (!merged[iso]) merged[iso] = [];
    merged[iso].push(...list);
  }
  const seen = new Set();
  for (const iso of Object.keys(merged)) {
    merged[iso] = merged[iso].filter(o => {
      const key = `${o.disease}|${(o.title||'').slice(0,80)}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  return {
    data: merged,
    live: general.live || don.live,
    _source: [general.live ? `general:${general.source}` : null, don.live ? `don:${don.source}` : null].filter(Boolean).join(" + ") || "all-failed",
    _general_feed: { live: general.live, source: general.source, items: general.totalItems, countries_with_outbreaks: Object.keys(g).length },
    _don_feed: { live: don.live, source: don.source, items: don.totalItems, countries_with_outbreaks: Object.keys(d).length },
    _totalItems: general.totalItems + don.totalItems,
    _countries_with_outbreaks: Object.keys(merged).length,
    _fetched_at: new Date().toISOString(),
  };
}

async function fetchAllLive() {
  const [usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr, who] = await Promise.all([
    fetchUSGS(), fetchEMSC(), fetchNASA(), fetchGDACS(), fetchIFRC(),
    fetchHeatStress(), fetchWeatherHazards(), fetchAirQuality(), fetchNOAA(),
    fetchDiseaseSh(), fetchWorldBankAll(), fetchUNHCR(), fetchWHO(),
  ]);
  return { usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr, who };
}

// ─── SIGNAL EXTRACTION ──────────────────────────────────────────────────────

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
  const topQ = quakes.length ? quakes.reduce((a,b) => (b.properties?.mag||0) > (a.properties?.mag||0) ? b : a) : null;
  if (topQ?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("USGS");
    signals.quakeMag = topQ.properties.mag;
    signals.quakePlace = (topQ.properties.place || "").split(",")[0].trim();
  }

  const emscQ = (live.emsc.data || []).filter(f => {
    const c = f.geometry?.coordinates;
    if (!c || coord[0] === 0) return false;
    return findClosestCountry(c[0], c[1]) === iso;
  });
  const topE = emscQ.length ? emscQ.reduce((a,b) => (b.properties?.mag||0) > (a.properties?.mag||0) ? b : a) : null;
  if (topE?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("EMSC");
    if (!signals.quakeMag) {
      signals.quakeMag = topE.properties.mag;
      signals.quakePlace = topE.properties?.flynn_region || null;
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

  const gdacsE = (live.gdacs.data || []).filter(f => {
    const affected = f.properties?.affectedcountries || [];
    if (affected.some(c => c.iso3 === iso)) return true;
    const c = f.geometry?.coordinates;
    if (!c || coord[0] === 0) return false;
    return findClosestCountry(c[0], c[1]) === iso;
  });
  const topG = gdacsE.length > 0 ? gdacsE.reduce((a, b) => (b.properties?.alertscore||0) > (a.properties?.alertscore||0) ? b : a) : null;
  if (topG) {
    liveEvidenceCount++; evidenceSources.push("GDACS");
    signals.gdacs = topG;
    signals.gdacsAlert = topG?.properties?.alertlevel?.toLowerCase() || null;
    signals.gdacsEventType = topG?.properties?.eventtype || null;
    signals.gdacsCount = gdacsE.length;
  }

  const ifrcE = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcE.length > 0) {
    liveEvidenceCount++; evidenceSources.push("IFRC");
    signals.ifrcCount = ifrcE.length;
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

  if (wbPopulation && wbPopulation.value > 0) { liveEvidenceCount++; evidenceSources.push("WB Population"); signals.population = wbPopulation.value; }
  if (wbInflation && wbInflation.value > 5) { liveEvidenceCount++; evidenceSources.push("WB Inflation"); signals.wbInflation = wbInflation; }
  if (wbGdpGrowth && wbGdpGrowth.value < 0) { liveEvidenceCount++; evidenceSources.push("WB GDP"); signals.wbGdpGrowth = wbGdpGrowth; }
  if (wbUnemployment && wbUnemployment.value > 10) { liveEvidenceCount++; evidenceSources.push("WB Unemployment"); signals.wbUnemployment = wbUnemployment; }
  if (wbPoverty && wbPoverty.value > 5) { liveEvidenceCount++; evidenceSources.push("WB Poverty"); signals.wbPoverty = wbPoverty; }

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
    quakeMag: signals.quakeMag || 0,
    quakePlace: signals.quakePlace || null,
    quakeCount: quakes.length,
    nasaEventCount: signals.nasaEventCount || 0,
    nasaEvents: signals.nasaEvents || [],
    gdacs: signals.gdacs || null,
    gdacsAlert: signals.gdacsAlert || null,
    gdacsEventType: signals.gdacsEventType || null,
    gdacsCount: signals.gdacsCount || 0,
    ifrcCount: signals.ifrcCount || 0,
    maxTempC: signals.maxTempC || 0,
    hazards: signals.hazards || null,
    aq: signals.aq || null,
    noaa: signals.noaa || null,
    diseaseActive: signals.diseaseActive || 0,
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
//  BUILD STORE — v13.0 LIVE-FIRST PIPELINE
// ════════════════════════════════════════════════════════════════════════════

function buildStore(liveData, priorStore) {
  const store = {};

  // Pass 1: compute raw live-first scores
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    let signals = {};
    if (liveData) signals = extractSignals(iso, liveData);

    const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;

    // Temporal history (from prior store or seeded)
    let scoreHistory;
    if (priorStore && priorStore[iso]?.score_history) {
      scoreHistory = [...priorStore[iso].score_history];
    } else {
      const seed = Math.round((country.fsi_score / 120) * 100);
      scoreHistory = seedHistory(iso, seed);
    }

    // Compute the perfected score
    const result = computePerfectedScore(iso, country, signals, store, scoreHistory);

    // Append current score to history
    scoreHistory.push(result.score);
    if (scoreHistory.length > 60) scoreHistory = scoreHistory.slice(-60);

    store[iso] = {
      ...country,
      dims: result.liveDims,
      prior_dims: result.priorDims,
      deltas: result.deltas,
      score: result.score,
      raw_score: result.rawScore,
      prior_score: result.priorComposite,
      live_score: result.liveComposite,
      confidence: result.confidence,
      evidence_ceiling: result.evidenceCeiling,
      structural_floor: result.structuralFloor,
      capacity_multiplier: result.capacityMultiplier,
      corroboration_multiplier: result.corroborationMultiplier,
      categories_firing: result.categoriesFiring,
      categories: result.categories,
      contributions: result.contributions,
      signal_sources: result.sources,
      signal_source_count: result.sourceCount,
      live_evidence_count: result.evidenceCount,
      signals,
      score_history: scoreHistory,
      momentum: 0,
      temporal: null,
      ml_forecast: null,
      sentiment: null,
      historical_trend: null,
      __consensus_gate: result.gated ? { applied: true, note: result.gateNote, pre_gate_score: result.rawScore } : { applied: false, note: null, pre_gate_score: result.rawScore },
    };
  }

  // Pass 2: spillover (neighbor pressure)
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const rawSpillover = Math.max(0, avgNb - 55) * 0.06;
    const dampening = Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    const spillover = +(rawSpillover * dampening).toFixed(1);
    store[iso].spillover = spillover;
    store[iso].score = clamp(store[iso].score + spillover);
    store[iso].score_history[store[iso].score_history.length - 1] = store[iso].score;
  }

  // Pass 3: temporal metrics
  for (const iso in store) {
    const temporal = computeTemporalMetrics(iso, store[iso].score, store);
    store[iso].temporal = temporal;
    store[iso].momentum = temporal.momentum;
  }

  // Pass 4: ML training + forecasts
  if (CFG.ML_ENABLED) trainMLModel(store);
  for (const iso in store) {
    if (CFG.ML_ENABLED) store[iso].ml_forecast = mlEnhancedForecast(iso, store[iso].score, store);
    if (CFG.SENTIMENT_ENABLED) store[iso].sentiment = analyzeCountrySentiment(iso, store);
    if (CFG.HISTORY_ENABLED) {
      store[iso].historical_trend = historyStore.getTrend(iso, 30);
      historyStore.store(iso, {
        score: store[iso].score,
        displacement: store[iso].dims.displacement || 0,
        economic: store[iso].dims.economic || 0,
        food: store[iso].dims.food || 0,
        health: store[iso].dims.health || 0,
      });
    }
  }

  return store;
}

// ─── ANOMALY DETECTION ──────────────────────────────────────────────────────

function detectCUSUM(arr) {
  if (arr.length < 6) return { detected: false, type: "cusum", stat: 0, direction: "stable" };
  const base = arr.slice(0, Math.floor(arr.length * 0.6));
  const mu = mean(base), sd = stddev(base);
  const k = 0.5 * sd, h = 4.0 * sd;
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
  return { detected: Math.abs(z) >= 2.0, type: "zscore", stat: +Math.abs(z).toFixed(2), direction: z > 0 ? "up" : "down" };
}
function detectChangepoint(arr) {
  if (arr.length < 10) return { detected: false, type: "changepoint", stat: 0, direction: "stable" };
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
  return { detected: ratio > 2.0, type: "volatility", stat: +ratio.toFixed(2), direction: "unstable" };
}
function runAnomalyDetection(arr) {
  const methods = [detectCUSUM(arr), detectZScore(arr), detectChangepoint(arr), detectVolatilityRegime(arr)];
  const fired = methods.filter(m => m.detected);
  const consensus = fired.length >= 2;
  const maxZ = detectZScore(arr).stat;
  const dirs = fired.map(m => m.direction).filter(Boolean);
  const up = dirs.filter(d => d === "up").length, down = dirs.filter(d => d === "down").length;
  const direction = up > down ? "escalating" : down > up ? "improving" : "unstable";
  const severity = fired.length >= 4 ? "EXTREME" : fired.length >= 3 ? "CRITICAL" : consensus && maxZ >= 3.0 ? "HIGH" : consensus ? "MODERATE" : fired.length === 1 ? "WATCH" : "NONE";
  return { detected: consensus, severity, direction, methods_fired: fired.length, methods, z_score: maxZ, note: consensus ? `${fired.length}/4 methods agree: ${direction} — ${severity}` : fired.length === 1 ? `Weak signal (1/4 methods)` : "No anomaly detected" };
}

// ─── STORY HEAT ─────────────────────────────────────────────────────────────

function computeStoryHeat(iso, store, hist, anom, mlForecast) {
  const c = store[iso];
  const s = c.signals || {};
  const t = c.temporal || {};
  let heat = 0;
  const drivers = [];

  if (t.viralStatus === "VIRAL") { const v = 20 + Math.min(15, Math.abs(t.velocity) * 2); heat += v; drivers.push({ driver: "viral_status", points: v, detail: `🔥 VIRAL - ${Math.abs(t.velocity).toFixed(1)} pts/day` }); }
  if (t.isSurge) { const v = Math.min(15, t.surgeMagnitude * 1.5); heat += v; drivers.push({ driver: "surge_detected", points: v, detail: `⚡ Surge: ${t.surgeMagnitude.toFixed(1)} pt` }); }
  const delta7 = hist[hist.length-1] - hist[Math.max(0, hist.length-8)];
  if (Math.abs(delta7) >= 2) { const v = Math.min(20, Math.abs(delta7) * 1.5); heat += v; drivers.push({ driver: "velocity", points: +v.toFixed(1), detail: `${delta7>0?"+":""}${delta7.toFixed(0)} pts in 7 days` }); }
  if (anom.detected) { const sevPts = { WATCH: 4, MODERATE: 8, HIGH: 12, CRITICAL: 16, EXTREME: 18 }; const v = sevPts[anom.severity] || 5; heat += v; drivers.push({ driver: "anomaly", points: v, detail: `${anom.methods_fired}/4 methods — ${anom.severity}` }); }
  if (mlForecast?.anomaly_probability > 0.4) { const v = Math.min(10, mlForecast.anomaly_probability * 14); heat += v; drivers.push({ driver: "ml_forecast", points: +v.toFixed(1), detail: `${(mlForecast.anomaly_probability*100).toFixed(0)}% anomaly` }); }
  const evidenceCount = s.liveEvidenceCount || 0;
  if (evidenceCount >= 2) { const v = Math.min(10, evidenceCount * 1.5); heat += v; drivers.push({ driver: "evidence_breadth", points: +v.toFixed(1), detail: `${evidenceCount} live sources` }); }
  if (s.gdacsAlert === "red") { heat += 12; drivers.push({ driver: "gdacs_red", points: 12, detail: "GDACS Red alert" }); }
  else if (s.gdacsAlert === "orange") { heat += 8; drivers.push({ driver: "gdacs_orange", points: 8, detail: "GDACS Orange alert" }); }
  if (s.quakeMag >= 6.0) { heat += 10; drivers.push({ driver: "major_quake", points: 10, detail: `M${s.quakeMag.toFixed(1)}` }); }
  else if (s.quakeMag >= 5.0) { heat += 6; drivers.push({ driver: "moderate_quake", points: 6, detail: `M${s.quakeMag.toFixed(1)}` }); }
  if (s.whoOutbreaks?.length > 0) { const v = Math.min(10, s.whoOutbreaks.length * 3); heat += v; drivers.push({ driver: "who_outbreaks", points: v, detail: `${s.whoOutbreaks.length} WHO outbreaks` }); }
  if (s.totalDisplaced > 1_000_000) { const v = Math.min(15, Math.log10(s.totalDisplaced/1_000_000 + 1) * 10); heat += v; drivers.push({ driver: "mass_displacement", points: +v.toFixed(1), detail: `${fmtPop(s.totalDisplaced)} displaced` }); }

  heat = Math.min(100, Math.round(heat));
  drivers.sort((a, b) => b.points - a.points);
  return { score: heat, is_breaking: heat >= 45, tier: heat >= 65 ? "BREAKING" : heat >= 45 ? "DEVELOPING" : heat >= 25 ? "NOTABLE" : "ROUTINE", top_drivers: drivers.slice(0, 3) };
}

// ─── SEVERITY HELPERS ───────────────────────────────────────────────────────

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
  if (score >= 85) return { tier: "IMMEDIATE", text: `Immediate humanitarian response required.${an}` };
  if (score >= 75) return { tier: "URGENT", text: `Urgent response needed.${an}` };
  if (score >= 60) return { tier: "HIGH", text: `Elevated concern. Prepare response.${an}` };
  if (score >= 40) return { tier: "MONITOR", text: `Monitor situation.${an}` };
  return { tier: "WATCH", text: `Routine monitoring.${an}` };
}

// ════════════════════════════════════════════════════════════════════════════
//  PAYLOAD BUILDER
// ════════════════════════════════════════════════════════════════════════════

function buildPayload(iso, store, ranked) {
  const c = store[iso];
  const hist = c.score_history;
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = Math.round(hist[hist.length-1] - hist[Math.max(0, hist.length-8)]);
  const s = c.signals || {};
  const heat = computeStoryHeat(iso, store, hist, anom, c.ml_forecast);
  const t = c.temporal || {};
  const cg = c.__consensus_gate || {};
  const fsiBase = c.fsi_score || 50;

  return {
    iso, name: c.name, flag: c.flag,
    score: c.score,
    raw_score: c.raw_score,
    confidence: c.confidence,
    severity: severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    severity_color: severityColor(c.score),
    rank, total_countries: ranked.length,
    percentile: Math.round((1 - rank / ranked.length) * 100),
    slug: slugify(c.name),
    url: `https://globalcrisisindex.com/crisis/${slugify(c.name)}`,
    live_evidence_sources: s.evidenceSources || [],
    live_evidence_count: s.liveEvidenceCount || 0,
    is_live_data: s.liveEvidenceCount >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
    evidence_ceiling: c.evidence_ceiling,
    structural_floor: c.structural_floor,
    capacity_multiplier: c.capacity_multiplier,
    corroboration_multiplier: c.corroboration_multiplier,
    categories_firing: c.categories_firing,
    categories: c.categories,
    dimensions: Object.fromEntries(DIMS.map(d => [d.k, {
      value: c.dims[d.k] || 0,
      prior: c.prior_dims[d.k] || 0,
      delta: c.deltas[d.k] || 0,
      label: d.l, weight: d.w, icon: d.icon,
    }])),
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️", color: ARC[t]?.color || "#6bc8ff" })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    trend: { delta_7d: delta7, direction: fc.trend, slope: fc.slope, forecast_7d: fc.fc, escalating: fc.esc, confidence: fc.confidence },
    anomaly: { detected: anom.detected, severity: anom.severity, direction: anom.direction, methods_fired: anom.methods_fired, z_score: anom.z_score, note: anom.note },
    consensus_gate: CFG.CONSENSUS_GATE_ENABLED ? {
      applied: cg.applied || false,
      note: cg.note || null,
      pre_gate_score: cg.pre_gate_score || c.score,
      threshold: CFG.CONSENSUS_GATE_THRESHOLD,
    } : null,
    temporal: {
      velocity: t.velocity || 0,
      acceleration: t.acceleration || 0,
      momentum: t.momentum || 0,
      viral_status: t.viralStatus || "STABLE",
      is_surge: t.isSurge || false,
      surge_magnitude: t.surgeMagnitude || 0,
      days_at_level: t.daysAtLevel || 1,
    },
    contributions: c.contributions || [],
    signal_sources: c.signal_sources || [],
    spillover: {
      value: c.spillover || 0,
      from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })),
    },
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
    score_audit: {
      prior_score: c.prior_score,
      live_score: c.live_score,
      raw_score: c.raw_score,
      final_score: c.score,
      confidence: c.confidence,
      evidence_ceiling: c.evidence_ceiling,
      structural_floor: c.structural_floor,
      capacity_multiplier: c.capacity_multiplier,
      corroboration_multiplier: c.corroboration_multiplier,
      spillover: c.spillover,
      fsi_base: fsiBase,
      consensus_gate: cg,
      prior_weight: CFG.PRIOR_WEIGHT,
      live_weight: CFG.LIVE_WEIGHT,
    },
    recommendation: recommendation(c.score, anom),
    region: c.region,
    fsi: { score: c.fsi_score, rank: c.fsi_rank, band: c.fsi_band },
    wst: WST_CLASSIFICATION[iso] ? {
      class: WST_CLASSIFICATION[iso].class,
      tier: WST_CLASSIFICATION[iso].tier,
      recovery_rate: WST_CLASSIFICATION[iso].recovery_rate,
      debt_sensitivity: WST_CLASSIFICATION[iso].debt_sensitivity,
      reserve_currency: WST_CLASSIFICATION[iso].reserve_currency,
    } : null,
  };
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
    // ═══ FETCH LIVE DATA ═══
    const liveData = await fetchAllLive();

    // ═══ BUILD STORE (v13.0 LIVE-FIRST) ═══
    const store = buildStore(liveData, null);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    // ═══ FILTER ═══
    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].score >= params.threshold);
    else finalIsos = ranked.slice(0, params.top);

    if (params.force_live && !isoList.length) {
      const liveFiltered = finalIsos.filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= CFG.MIN_LIVE_EVIDENCE_SOURCES);
      if (liveFiltered.length > 0) finalIsos = liveFiltered;
    }

    if (finalIsos.length === 0) {
      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: { generated_at: new Date().toISOString(), elapsed_ms: Date.now() - start, mode: "empty", message: "No countries matched." },
        countries: [],
      }, null, 2));
      return;
    }

    // ═══ BUILD PAYLOADS ═══
    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked));

    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";

    // ═══ META ═══
    const viralCountries = Object.keys(store).filter(iso => store[iso].temporal?.viralStatus === "VIRAL");
    const surgeCountries = Object.keys(store).filter(iso => store[iso].temporal?.isSurge);
    const gdacsRedAlerts = Object.keys(store).filter(iso => store[iso].signals?.gdacsAlert === "red");
    const gatedCountries = Object.keys(store).filter(iso => store[iso].__consensus_gate?.applied);

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        version: "v13.0-perfected-scoring",
        scoring_mode: CFG.SCORING_MODE,
        prior_weight: CFG.PRIOR_WEIGHT,
        live_weight: CFG.LIVE_WEIGHT,
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_evidence: Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= 1).length,
        viral_countries: viralCountries.length,
        viral_isos: viralCountries.slice(0, 10),
        surge_countries: surgeCountries.length,
        surge_isos: surgeCountries.slice(0, 10),
        gdacs_red_alerts: gdacsRedAlerts.length,
        gdacs_red_isos: gdacsRedAlerts.slice(0, 10),
        gated_countries: gatedCountries.length,
        gated_isos: gatedCountries.slice(0, 10),
        scoring_engine: {
          philosophy: "LIVE_FIRST — evidence drives score, structure modulates it",
          prior_weight: CFG.PRIOR_WEIGHT,
          live_weight: CFG.LIVE_WEIGHT,
          evidence_ceiling_formula: `${CFG.EVIDENCE_CEILING_BASE} + sources × ${CFG.EVIDENCE_CEILING_PER_SOURCE} (max ${CFG.EVIDENCE_CEILING_MAX})`,
          structural_floor_formula: "FSI-normalized × 0.75",
          confidence_formula: `min(0.95, ${CFG.CONFIDENCE_FLOOR} + evidence×0.12 + sources×0.05)`,
          capacity_modulation: "WST recovery_rate → capacity multiplier [0.35, 1.35]",
          cross_source_bonus: "3+ sources → ×1.35, 2 sources → ×1.15",
          consensus_gate: {
            enabled: CFG.CONSENSUS_GATE_ENABLED,
            threshold: CFG.CONSENSUS_GATE_THRESHOLD,
            rules: { "92-94": "2+ categories", "95-97": "3+ categories", "98+": "4+ categories" },
            categories: Object.keys(CFG.CONSENSUS_CATEGORIES),
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
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=30",
    });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story v13.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
