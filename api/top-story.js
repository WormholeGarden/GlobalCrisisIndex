"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v16.0 — ORTHOGONAL AXES MODEL
//  ────────────────────────────────────────────────────────────────────────────
//  Three independent axes, combined through gated max:
//
//    SCALE      — how many people are affected (population mass)
//    INTENSITY  — how severe per-capita / per-territory (famine phase, INFORM)
//    VOLATILITY — how fast things are changing (surge, acceleration)
//
//  Formula:
//    base        = max(SCALE, INTENSITY)
//    gated       = INTENSITY >= GATE ? base : base * 0.7     // no famine/severe
//                                                             //   → dampened
//    final       = clamp( gated + VOLATILITY_MODIFIER )
//
//  VOLATILITY is bounded ±12 so a spike can shift rank but not flip it.
//  FSI is a hard floor. NO source can contribute more than its axis allows.
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  FETCH_TIMEOUT_MS: 15_000,
  MAX_TOP_N: 179,

  // ── SCALE: population mass normalizers ────────────────────────────────
  // Each component is normalized 0..100. The axis is the max of components,
  // weighted by the source's humanitarian scope.
  SCALE_COMPONENTS: {
    displaced:        { cap: 12_000_000, weight: 1.00 },  // UNHCR total
    famine_affected:  { cap: 20_000_000, weight: 0.95 },  // IPC Phase 3+
    conflict_affected:{ cap: 30_000_000, weight: 0.85 },  // ACLED est.
    disaster_affected:{ cap: 15_000_000, weight: 0.70 },  // GDACS population
    population_at_risk:{ cap: 40_000_000, weight: 0.60 }, // INFORM est.
  },

  // ── INTENSITY: severity per unit ──────────────────────────────────────
  // Highest-weighted because it encodes famine and state collapse.
  INTENSITY_COMPONENTS: {
    ipc_phase5:        { weight: 1.00, cap: 500_000 },    // Catastrophe pop
    ipc_phase4:        { weight: 0.85, cap: 3_000_000 },  // Emergency pop
    inform_severity:   { weight: 0.90, cap: 5.0 },        // INFORM 0–5
    acled_fatalities:  { weight: 0.75, cap: 8_000 },      // 90-day deaths
    gdacs_red:         { weight: 0.80, cap: 3 },          // # of Red alerts
    who_epidemic:      { weight: 0.60, cap: 3 },          // outbreak count
    acled_intensity:   { weight: 0.55, cap: 50 },         // fatalities/event
    displacement_rate: { weight: 0.50, cap: 0.15 },       // displaced/pop
  },

  // ── VOLATILITY: bounded ±12 modifier ──────────────────────────────────
  VOLATILITY_MAX_POS: 12,
  VOLATILITY_MAX_NEG: -12,
  VOLATILITY_SURGE_THRESHOLD: 0.25,  // 25% above own rolling baseline

  // ── GATING ────────────────────────────────────────────────────────────
  // If INTENSITY is below this, the base score is dampened.
  INTENSITY_GATE: 30,
  INTENSITY_DAMPEN: 0.65,

  // ── FSI FLOOR ─────────────────────────────────────────────────────────
  FSI_FLOOR_FRACTION: 0.60,
  FSI_FLOOR_CAP: 85,
  NO_EVIDENCE_FLOOR: 22,

  // ── SPILLOVER ─────────────────────────────────────────────────────────
  SPILLOVER_RATE: 0.04,
  SPILLOVER_FLOOR: 55,

  // ── SEO ───────────────────────────────────────────────────────────────
  ARTICLE_SITE_NAME: "GCIN · Global Crisis Index News",
  ARTICLE_BASE_URL: "https://globalcrisisindex.com",
  ARTICLE_AUTHOR: "GCIN Editorial Team",
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Content-Type":                 "application/json; charset=utf-8",
};

// ─── CRISIS ARCHETYPES ───────────────────────────────────────────────────────
const ARC = {
  CE:  { l:"Complex Emergency",    i:"⚔️", n:["shelter","food","health","protection"], color:"#ff375f" },
  CW:  { l:"Civil War",            i:"⚔️", n:["shelter","protection","health","food"], color:"#ff6b4a" },
  EQ:  { l:"Earthquake",           i:"🌍", n:["shelter","health","water"],             color:"#ff8c42" },
  FL:  { l:"Flood",                i:"🌊", n:["shelter","water","food"],               color:"#3ec5ff" },
  DR:  { l:"Drought",              i:"🏜️", n:["food","water","nutrition"],             color:"#ffb020" },
  FN:  { l:"Famine",               i:"🍚", n:["food","nutrition","health"],            color:"#ff375f" },
  EP:  { l:"Epidemic",             i:"🦠", n:["health","water","nutrition"],           color:"#e879f9" },
  REF: { l:"Refugee Crisis",       i:"🚶", n:["shelter","protection","water"],         color:"#bf7fff" },
  TC:  { l:"Cyclone / Hurricane",  i:"🌀", n:["shelter","water"],                      color:"#00c8ff" },
  WF:  { l:"Wildfire",             i:"🔥", n:["shelter","health"],                     color:"#ff6b4a" },
  HEAT:{ l:"Heatwave",             i:"🥵", n:["health","water"],                       color:"#ff8c42" },
  POL: { l:"Political Crisis",     i:"🏛️", n:["protection","food","economic"],         color:"#bf7fff" },
  ECO: { l:"Economic Collapse",    i:"📉", n:["food","economic","health"],             color:"#ffb020" },
};

const DIMS = [
  { k:"conflict",     l:"Conflict",      w:0.30, icon:"⚔️" },
  { k:"displacement", l:"Displacement",  w:0.24, icon:"🚶" },
  { k:"food",         l:"Food Security", w:0.20, icon:"🌾" },
  { k:"health",       l:"Health",        w:0.12, icon:"🏥" },
  { k:"economic",     l:"Economic",      w:0.08, icon:"📉" },
  { k:"climate",      l:"Climate",       w:0.04, icon:"🌡️" },
  { k:"access",       l:"Access",        w:0.01, icon:"🚧" },
  { k:"political",    l:"Political",     w:0.01, icon:"⚖️" },
];

// ─── FSI 2024 (abbreviated — full 179-country table retained in production) ─
const FSI_2024 = {
  SOM:{name:"Somalia",flag:"🇸🇴",fsi_score:111.3,rank:1,region:"africa",fsi_band:"Very High Alert"},
  SDN:{name:"Sudan",flag:"🇸🇩",fsi_score:109.3,rank:2,region:"africa",fsi_band:"Very High Alert"},
  SSD:{name:"South Sudan",flag:"🇸🇸",fsi_score:109.0,rank:3,region:"africa",fsi_band:"High Alert"},
  SYR:{name:"Syria",flag:"🇸🇾",fsi_score:108.1,rank:4,region:"middleeast",fsi_band:"High Alert"},
  COD:{name:"Congo-Kinshasa",flag:"🇨🇩",fsi_score:106.7,rank:5,region:"africa",fsi_band:"High Alert"},
  YEM:{name:"Yemen",flag:"🇾🇪",fsi_score:106.6,rank:6,region:"middleeast",fsi_band:"High Alert"},
  AFG:{name:"Afghanistan",flag:"🇦🇫",fsi_score:103.9,rank:7,region:"asia",fsi_band:"High Alert"},
  CAF:{name:"Central African Rep.",flag:"🇨🇫",fsi_score:103.9,rank:8,region:"africa",fsi_band:"High Alert"},
  HTI:{name:"Haiti",flag:"🇭🇹",fsi_score:103.5,rank:9,region:"americas",fsi_band:"High Alert"},
  TCD:{name:"Chad",flag:"🇹🇩",fsi_score:102.7,rank:10,region:"africa",fsi_band:"High Alert"},
  MMR:{name:"Myanmar",flag:"🇲🇲",fsi_score:100.0,rank:11,region:"asia",fsi_band:"High Alert"},
  ETH:{name:"Ethiopia",flag:"🇪🇹",fsi_score:98.1,rank:12,region:"africa",fsi_band:"Alert"},
  PSE:{name:"Palestine",flag:"🇵🇸",fsi_score:97.8,rank:13,region:"middleeast",fsi_band:"Alert"},
  MLI:{name:"Mali",flag:"🇲🇱",fsi_score:97.3,rank:14,region:"africa",fsi_band:"Alert"},
  NGA:{name:"Nigeria",flag:"🇳🇬",fsi_score:96.6,rank:15,region:"africa",fsi_band:"Alert"},
  LBY:{name:"Libya",flag:"🇱🇾",fsi_score:96.5,rank:16,region:"africa",fsi_band:"Alert"},
  GIN:{name:"Guinea",flag:"🇬🇳",fsi_score:96.4,rank:17,region:"africa",fsi_band:"Alert"},
  ZWE:{name:"Zimbabwe",flag:"🇿🇼",fsi_score:95.7,rank:18,region:"africa",fsi_band:"Alert"},
  NER:{name:"Niger",flag:"🇳🇪",fsi_score:95.2,rank:19,region:"africa",fsi_band:"Alert"},
  CMR:{name:"Cameroon",flag:"🇨🇲",fsi_score:94.3,rank:20,region:"africa",fsi_band:"Alert"},
  BFA:{name:"Burkina Faso",flag:"🇧🇫",fsi_score:94.2,rank:21,region:"africa",fsi_band:"Alert"},
  UKR:{name:"Ukraine",flag:"🇺🇦",fsi_score:93.1,rank:22,region:"europe",fsi_band:"Alert"},
  LBN:{name:"Lebanon",flag:"🇱🇧",fsi_score:92.7,rank:23,region:"middleeast",fsi_band:"Alert"},
  BDI:{name:"Burundi",flag:"🇧🇮",fsi_score:92.6,rank:24,region:"africa",fsi_band:"Alert"},
  MOZ:{name:"Mozambique",flag:"🇲🇿",fsi_score:92.5,rank:25,region:"africa",fsi_band:"Alert"},
  ERI:{name:"Eritrea",flag:"🇪🇷",fsi_score:92.1,rank:26,region:"africa",fsi_band:"Alert"},
  PAK:{name:"Pakistan",flag:"🇵🇰",fsi_score:91.7,rank:27,region:"asia",fsi_band:"Alert"},
  UGA:{name:"Uganda",flag:"🇺🇬",fsi_score:91.1,rank:28,region:"africa",fsi_band:"Alert"},
  COG:{name:"Congo-Brazzaville",flag:"🇨🇬",fsi_score:90.2,rank:29,region:"africa",fsi_band:"Alert"},
  VEN:{name:"Venezuela",flag:"🇻🇪",fsi_score:89.0,rank:30,region:"americas",fsi_band:"Alert"},
  IRQ:{name:"Iraq",flag:"🇮🇶",fsi_score:88.6,rank:31,region:"middleeast",fsi_band:"Alert"},
  GNB:{name:"Guinea-Bissau",flag:"🇬🇼",fsi_score:88.4,rank:32,region:"africa",fsi_band:"Alert"},
  LKA:{name:"Sri Lanka",flag:"🇱🇰",fsi_score:88.2,rank:33,region:"asia",fsi_band:"Alert"},
  MRT:{name:"Mauritania",flag:"🇲🇷",fsi_score:87.0,rank:34,region:"africa",fsi_band:"High Warning"},
  LBR:{name:"Liberia",flag:"🇱🇷",fsi_score:86.9,rank:35,region:"africa",fsi_band:"High Warning"},
  KEN:{name:"Kenya",flag:"🇰🇪",fsi_score:86.5,rank:36,region:"africa",fsi_band:"High Warning"},
  BGD:{name:"Bangladesh",flag:"🇧🇩",fsi_score:85.9,rank:37,region:"asia",fsi_band:"High Warning"},
  AGO:{name:"Angola",flag:"🇦🇴",fsi_score:85.6,rank:38,region:"africa",fsi_band:"High Warning"},
  CIV:{name:"Ivory Coast",flag:"🇨🇮",fsi_score:85.3,rank:39,region:"africa",fsi_band:"High Warning"},
  PRK:{name:"North Korea",flag:"🇰🇵",fsi_score:84.9,rank:40,region:"asia",fsi_band:"High Warning"},
  TUR:{name:"Turkey",flag:"🇹🇷",fsi_score:84.0,rank:41,region:"europe",fsi_band:"High Warning"},
  GNQ:{name:"Equatorial Guinea",flag:"🇬🇶",fsi_score:83.7,rank:42,region:"africa",fsi_band:"High Warning"},
  IRN:{name:"Iran",flag:"🇮🇷",fsi_score:82.9,rank:43,region:"middleeast",fsi_band:"High Warning"},
  EGY:{name:"Egypt",flag:"🇪🇬",fsi_score:82.8,rank:44,region:"africa",fsi_band:"High Warning"},
  SLE:{name:"Sierra Leone",flag:"🇸🇱",fsi_score:82.6,rank:45,region:"africa",fsi_band:"High Warning"},
  RWA:{name:"Rwanda",flag:"🇷🇼",fsi_score:81.8,rank:46,region:"africa",fsi_band:"High Warning"},
  COM:{name:"Comoros",flag:"🇰🇲",fsi_score:81.7,rank:47,region:"africa",fsi_band:"High Warning"},
  DJI:{name:"Djibouti",flag:"🇩🇯",fsi_score:81.6,rank:48,region:"africa",fsi_band:"High Warning"},
  RUS:{name:"Russia",flag:"🇷🇺",fsi_score:81.6,rank:48,region:"europe",fsi_band:"High Warning"},
  ZMB:{name:"Zambia",flag:"🇿🇲",fsi_score:81.2,rank:50,region:"africa",fsi_band:"High Warning"},
  TGO:{name:"Togo",flag:"🇹🇬",fsi_score:81.1,rank:51,region:"africa",fsi_band:"High Warning"},
  MWI:{name:"Malawi",flag:"🇲🇼",fsi_score:80.5,rank:52,region:"africa",fsi_band:"High Warning"},
  MDG:{name:"Madagascar",flag:"🇲🇬",fsi_score:79.8,rank:53,region:"africa",fsi_band:"High Warning"},
  PNG:{name:"Papua New Guinea",flag:"🇵🇬",fsi_score:78.8,rank:54,region:"oceania",fsi_band:"High Warning"},
  KHM:{name:"Cambodia",flag:"🇰🇭",fsi_score:78.6,rank:55,region:"asia",fsi_band:"High Warning"},
  HND:{name:"Honduras",flag:"🇭🇳",fsi_score:78.1,rank:56,region:"americas",fsi_band:"High Warning"},
  NPL:{name:"Nepal",flag:"🇳🇵",fsi_score:78.0,rank:57,region:"asia",fsi_band:"High Warning"},
  SWZ:{name:"Eswatini",flag:"🇸🇿",fsi_score:77.6,rank:58,region:"africa",fsi_band:"High Warning"},
  SLB:{name:"Solomon Islands",flag:"🇸🇧",fsi_score:77.6,rank:58,region:"oceania",fsi_band:"High Warning"},
  NIC:{name:"Nicaragua",flag:"🇳🇮",fsi_score:76.7,rank:60,region:"americas",fsi_band:"High Warning"},
  GMB:{name:"Gambia",flag:"🇬🇲",fsi_score:76.1,rank:61,region:"africa",fsi_band:"Elevated Warning"},
  TZA:{name:"Tanzania",flag:"🇹🇿",fsi_score:75.7,rank:62,region:"africa",fsi_band:"Elevated Warning"},
  COL:{name:"Colombia",flag:"🇨🇴",fsi_score:75.6,rank:63,region:"americas",fsi_band:"Elevated Warning"},
  PHL:{name:"Philippines",flag:"🇵🇭",fsi_score:75.1,rank:64,region:"asia",fsi_band:"Elevated Warning"},
  GTM:{name:"Guatemala",flag:"🇬🇹",fsi_score:74.9,rank:65,region:"americas",fsi_band:"Elevated Warning"},
  KGZ:{name:"Kyrgyzstan",flag:"🇰🇬",fsi_score:74.9,rank:65,region:"asia",fsi_band:"Elevated Warning"},
  TLS:{name:"East Timor",flag:"🇹🇱",fsi_score:74.8,rank:67,region:"asia",fsi_band:"Elevated Warning"},
  LSO:{name:"Lesotho",flag:"🇱🇸",fsi_score:74.6,rank:68,region:"africa",fsi_band:"Elevated Warning"},
  JOR:{name:"Jordan",flag:"🇯🇴",fsi_score:74.3,rank:69,region:"middleeast",fsi_band:"Elevated Warning"},
  SEN:{name:"Senegal",flag:"🇸🇳",fsi_score:74.2,rank:70,region:"africa",fsi_band:"Elevated Warning"},
  LAO:{name:"Laos",flag:"🇱🇦",fsi_score:73.8,rank:71,region:"asia",fsi_band:"Elevated Warning"},
  AZE:{name:"Azerbaijan",flag:"🇦🇿",fsi_score:72.8,rank:72,region:"asia",fsi_band:"Elevated Warning"},
  TJK:{name:"Tajikistan",flag:"🇹🇯",fsi_score:72.8,rank:72,region:"asia",fsi_band:"Elevated Warning"},
  BEN:{name:"Benin",flag:"🇧🇯",fsi_score:72.5,rank:74,region:"africa",fsi_band:"Elevated Warning"},
  IND:{name:"India",flag:"🇮🇳",fsi_score:72.3,rank:75,region:"asia",fsi_band:"Elevated Warning"},
  PER:{name:"Peru",flag:"🇵🇪",fsi_score:72.0,rank:76,region:"americas",fsi_band:"Elevated Warning"},
  BIH:{name:"Bosnia-Herzegovina",flag:"🇧🇦",fsi_score:71.0,rank:77,region:"europe",fsi_band:"Elevated Warning"},
  BRA:{name:"Brazil",flag:"🇧🇷",fsi_score:70.3,rank:78,region:"americas",fsi_band:"Elevated Warning"},
  GAB:{name:"Gabon",flag:"🇬🇦",fsi_score:70.2,rank:79,region:"africa",fsi_band:"Elevated Warning"},
  ZAF:{name:"South Africa",flag:"🇿🇦",fsi_score:69.6,rank:80,region:"africa",fsi_band:"Elevated Warning"},
  BOL:{name:"Bolivia",flag:"🇧🇴",fsi_score:69.4,rank:81,region:"americas",fsi_band:"Elevated Warning"},
  GEO:{name:"Georgia",flag:"🇬🇪",fsi_score:69.3,rank:82,region:"asia",fsi_band:"Elevated Warning"},
  MEX:{name:"Mexico",flag:"🇲🇽",fsi_score:69.0,rank:83,region:"americas",fsi_band:"Elevated Warning"},
  MAR:{name:"Morocco",flag:"🇲🇦",fsi_score:68.8,rank:84,region:"africa",fsi_band:"Elevated Warning"},
  BLR:{name:"Belarus",flag:"🇧🇾",fsi_score:68.7,rank:85,region:"europe",fsi_band:"Elevated Warning"},
  SLV:{name:"El Salvador",flag:"🇸🇻",fsi_score:68.7,rank:85,region:"americas",fsi_band:"Elevated Warning"},
  DZA:{name:"Algeria",flag:"🇩🇿",fsi_score:68.6,rank:87,region:"africa",fsi_band:"Elevated Warning"},
  ARM:{name:"Armenia",flag:"🇦🇲",fsi_score:68.1,rank:89,region:"asia",fsi_band:"Elevated Warning"},
  ECU:{name:"Ecuador",flag:"🇪🇨",fsi_score:68.0,rank:90,region:"americas",fsi_band:"Elevated Warning"},
  SRB:{name:"Serbia",flag:"🇷🇸",fsi_score:67.8,rank:91,region:"europe",fsi_band:"Elevated Warning"},
  TUN:{name:"Tunisia",flag:"🇹🇳",fsi_score:67.2,rank:92,region:"africa",fsi_band:"Elevated Warning"},
  FJI:{name:"Fiji",flag:"🇫🇯",fsi_score:66.4,rank:94,region:"oceania",fsi_band:"Elevated Warning"},
  THA:{name:"Thailand",flag:"🇹🇭",fsi_score:66.2,rank:95,region:"asia",fsi_band:"Elevated Warning"},
  UZB:{name:"Uzbekistan",flag:"🇺🇿",fsi_score:64.8,rank:96,region:"asia",fsi_band:"Warning"},
  MDA:{name:"Moldova",flag:"🇲🇩",fsi_score:64.7,rank:97,region:"europe",fsi_band:"Warning"},
  CHN:{name:"China",flag:"🇨🇳",fsi_score:64.4,rank:99,region:"asia",fsi_band:"Warning"},
  IDN:{name:"Indonesia",flag:"🇮🇩",fsi_score:63.7,rank:102,region:"asia",fsi_band:"Warning"},
  SAU:{name:"Saudi Arabia",flag:"🇸🇦",fsi_score:63.2,rank:103,region:"middleeast",fsi_band:"Warning"},
  GHA:{name:"Ghana",flag:"🇬🇭",fsi_score:60.8,rank:106,region:"africa",fsi_band:"Warning"},
  DOM:{name:"Dominican Republic",flag:"🇩🇴",fsi_score:60.2,rank:108,region:"americas",fsi_band:"Warning"},
  JAM:{name:"Jamaica",flag:"🇯🇲",fsi_score:59.3,rank:109,region:"americas",fsi_band:"Warning"},
  NAM:{name:"Namibia",flag:"🇳🇦",fsi_score:59.3,rank:109,region:"africa",fsi_band:"Warning"},
  CUB:{name:"Cuba",flag:"🇨🇺",fsi_score:59.1,rank:112,region:"americas",fsi_band:"Warning"},
  MKD:{name:"North Macedonia",flag:"🇲🇰",fsi_score:58.1,rank:114,region:"europe",fsi_band:"Warning"},
  KAZ:{name:"Kazakhstan",flag:"🇰🇿",fsi_score:57.8,rank:115,region:"asia",fsi_band:"Warning"},
  VNM:{name:"Vietnam",flag:"🇻🇳",fsi_score:56.2,rank:119,region:"asia",fsi_band:"Warning"},
  GRC:{name:"Greece",flag:"🇬🇷",fsi_score:54.7,rank:121,region:"europe",fsi_band:"Warning"},
  MYS:{name:"Malaysia",flag:"🇲🇾",fsi_score:53.1,rank:126,region:"asia",fsi_band:"Less Stable"},
  ISR:{name:"Israel",flag:"🇮🇱",fsi_score:51.5,rank:129,region:"middleeast",fsi_band:"Less Stable"},
  ROU:{name:"Romania",flag:"🇷🇴",fsi_score:51.0,rank:130,region:"europe",fsi_band:"Less Stable"},
  BGR:{name:"Bulgaria",flag:"🇧🇬",fsi_score:49.4,rank:133,region:"europe",fsi_band:"Less Stable"},
  PAN:{name:"Panama",flag:"🇵🇦",fsi_score:47.7,rank:136,region:"americas",fsi_band:"Less Stable"},
  HUN:{name:"Hungary",flag:"🇭🇺",fsi_score:46.2,rank:138,region:"europe",fsi_band:"Less Stable"},
  USA:{name:"United States",flag:"🇺🇸",fsi_score:44.5,rank:141,region:"americas",fsi_band:"Less Stable"},
  ARG:{name:"Argentina",flag:"🇦🇷",fsi_score:44.2,rank:142,region:"americas",fsi_band:"Less Stable"},
  ESP:{name:"Spain",flag:"🇪🇸",fsi_score:44.0,rank:143,region:"europe",fsi_band:"Less Stable"},
  POL:{name:"Poland",flag:"🇵🇱",fsi_score:41.7,rank:144,region:"europe",fsi_band:"Stable"},
  CHL:{name:"Chile",flag:"🇨🇱",fsi_score:41.1,rank:146,region:"americas",fsi_band:"Stable"},
  ITA:{name:"Italy",flag:"🇮🇹",fsi_score:41.1,rank:146,region:"europe",fsi_band:"Stable"},
  GBR:{name:"United Kingdom",flag:"🇬🇧",fsi_score:40.8,rank:148,region:"europe",fsi_band:"Stable"},
  QAT:{name:"Qatar",flag:"🇶🇦",fsi_score:39.8,rank:149,region:"middleeast",fsi_band:"Stable"},
  CRI:{name:"Costa Rica",flag:"🇨🇷",fsi_score:39.4,rank:150,region:"americas",fsi_band:"Stable"},
  CZE:{name:"Czech Republic",flag:"🇨🇿",fsi_score:37.7,rank:152,region:"europe",fsi_band:"Stable"},
  EST:{name:"Estonia",flag:"🇪🇪",fsi_score:36.5,rank:154,region:"europe",fsi_band:"Stable"},
  SVK:{name:"Slovakia",flag:"🇸🇰",fsi_score:35.3,rank:155,region:"europe",fsi_band:"Stable"},
  ARE:{name:"United Arab Emirates",flag:"🇦🇪",fsi_score:34.7,rank:156,region:"middleeast",fsi_band:"Stable"},
  URY:{name:"Uruguay",flag:"🇺🇾",fsi_score:33.7,rank:157,region:"americas",fsi_band:"Stable"},
  MLT:{name:"Malta",flag:"🇲🇹",fsi_score:31.1,rank:158,region:"europe",fsi_band:"More Stable"},
  BEL:{name:"Belgium",flag:"🇧🇪",fsi_score:30.3,rank:159,region:"europe",fsi_band:"More Stable"},
  JPN:{name:"Japan",flag:"🇯🇵",fsi_score:30.2,rank:160,region:"asia",fsi_band:"More Stable"},
  KOR:{name:"South Korea",flag:"🇰🇷",fsi_score:29.8,rank:161,region:"asia",fsi_band:"More Stable"},
  FRA:{name:"France",flag:"🇫🇷",fsi_score:28.3,rank:162,region:"europe",fsi_band:"More Stable"},
  PRT:{name:"Portugal",flag:"🇵🇹",fsi_score:25.9,rank:164,region:"europe",fsi_band:"More Stable"},
  SGP:{name:"Singapore",flag:"🇸🇬",fsi_score:25.4,rank:165,region:"asia",fsi_band:"More Stable"},
  DEU:{name:"Germany",flag:"🇩🇪",fsi_score:24.0,rank:166,region:"europe",fsi_band:"More Stable"},
  AUT:{name:"Austria",flag:"🇦🇹",fsi_score:23.1,rank:167,region:"europe",fsi_band:"More Stable"},
  SWE:{name:"Sweden",flag:"🇸🇪",fsi_score:20.6,rank:168,region:"europe",fsi_band:"Sustainable"},
  AUS:{name:"Australia",flag:"🇦🇺",fsi_score:19.6,rank:169,region:"oceania",fsi_band:"Sustainable"},
  NLD:{name:"Netherlands",flag:"🇳🇱",fsi_score:19.5,rank:170,region:"europe",fsi_band:"Sustainable"},
  CAN:{name:"Canada",flag:"🇨🇦",fsi_score:18.6,rank:172,region:"americas",fsi_band:"Sustainable"},
  CHE:{name:"Switzerland",flag:"🇨🇭",fsi_score:16.2,rank:174,region:"europe",fsi_band:"Sustainable"},
  DNK:{name:"Denmark",flag:"🇩🇰",fsi_score:15.9,rank:175,region:"europe",fsi_band:"Sustainable"},
  NZL:{name:"New Zealand",flag:"🇳🇿",fsi_score:15.9,rank:175,region:"oceania",fsi_band:"Sustainable"},
  ISL:{name:"Iceland",flag:"🇮🇸",fsi_score:15.2,rank:177,region:"europe",fsi_band:"Sustainable"},
  FIN:{name:"Finland",flag:"🇫🇮",fsi_score:14.3,rank:178,region:"europe",fsi_band:"Sustainable"},
  NOR:{name:"Norway",flag:"🇳🇴",fsi_score:12.7,rank:179,region:"europe",fsi_band:"Sustainable"},
};

// ─── COUNTRIES ──────────────────────────────────────────────────────────────
const COUNTRIES = {};
for (const [iso, fsi] of Object.entries(FSI_2024)) {
  const types = [];
  const s = fsi.fsi_score;
  if (s >= 90) types.push("CE","CW");
  else if (s >= 80) types.push("CE","REF");
  else if (s >= 70) types.push("REF","DR");
  else if (s >= 60) types.push("DR","ECO");
  else if (s >= 50) types.push("ECO");
  else types.push("POL");
  if (fsi.region === "africa" && s >= 80) types.push("FN");
  if (fsi.region === "asia" && s >= 70) types.push("FL");
  const adj = [];
  for (const [o, of] of Object.entries(FSI_2024)) {
    if (o !== iso && of.region === fsi.region) adj.push(o);
  }
  COUNTRIES[iso] = {
    name: fsi.name, flag: fsi.flag,
    fsi_score: s, fsi_rank: fsi.rank, fsi_band: fsi.fsi_band,
    region: fsi.region,
    types: [...new Set(types)].slice(0, 4),
    adj: adj.slice(0, 8),
    cent: [0, 0],
  };
}

// ─── UTILITIES ──────────────────────────────────────────────────────────────
const clamp = (v, lo = 0, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
const clampF = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const stddev = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) || 1; };
function fmtPop(n) { if (!n) return null; if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return `${n}`; }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function findIsoByName(name) {
  if (!name) return null;
  const l = name.toLowerCase().trim();
  for (const [iso, d] of Object.entries(COUNTRIES)) if (d.name.toLowerCase() === l) return iso;
  for (const [iso, d] of Object.entries(COUNTRIES)) if (d.name.toLowerCase().includes(l)) return iso;
  return null;
}

// ─── PERSISTENT RING BUFFER (real history) ──────────────────────────────────
const LIVE_HISTORY = (() => {
  const mem = new Map();
  const RING = 240;
  return {
    push(iso, sample) {
      if (!mem.has(iso)) mem.set(iso, []);
      const a = mem.get(iso);
      a.push({ t: Date.now(), ...sample });
      if (a.length > RING) a.splice(0, a.length - RING);
    },
    get(iso, n = 60) { return (mem.get(iso) || []).slice(-n); },
  };
})();

// ─── FETCHERS ───────────────────────────────────────────────────────────────
const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok: true, data: r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok: false, error: e.message }));

async function fetchACLED() {
  const email = process.env.ACLED_EMAIL;
  const key = process.env.ACLED_API_KEY;
  if (!email || !key) return { data: {}, live: false };
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 86400000);
    const fmt = d => d.toISOString().slice(0, 10);
    const url = `https://api.acleddata.com/acled/read?key=${key}&email=${email}` +
      `&event_date=${fmt(start)}|${fmt(end)}&event_date_where=BETWEEN&limit=0`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.data) return { data: {}, live: false };
    const by = {};
    for (const ev of r.data.data) {
      const iso = ev.iso3;
      if (!iso) continue;
      if (!by[iso]) by[iso] = { events: 0, fatalities: 0 };
      by[iso].events++;
      by[iso].fatalities += parseInt(ev.fatalities || 0, 10);
    }
    return { data: by, live: true };
  } catch { return { data: {}, live: false }; }
}

async function fetchFEWSNET() {
  try {
    const url = "https://fdw.fews.net/api/ipcphase.csv?scenario=CS&format=json";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !Array.isArray(r.data)) return { data: {}, live: false };
    const by = {};
    for (const row of r.data) {
      const iso = row.country_code;
      if (!iso) continue;
      if (!by[iso]) by[iso] = { phase3plus: 0, phase4plus: 0, phase5: 0 };
      const pop = parseInt(row.population || 0, 10);
      const phase = parseInt(row.ipc_phase || 0, 10);
      if (phase >= 3) by[iso].phase3plus += pop;
      if (phase >= 4) by[iso].phase4plus += pop;
      if (phase >= 5) by[iso].phase5 += pop;
    }
    return { data: by, live: true };
  } catch { return { data: {}, live: false }; }
}

async function fetchUNHCR() {
  try {
    const year = new Date().getFullYear();
    const url = `https://api.unhcr.org/population/v1/population/?limit=200&dataset=population` +
      `&displayType=totals&yearFrom=${year-1}&yearTo=${year}&coa_all=true&cfType=ISO`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.items) return { data: {}, live: false };
    const by = {};
    for (const item of r.data.items) {
      const iso = item.coa_iso;
      if (!iso) continue;
      if (!by[iso]) by[iso] = { refugees: 0, idps: 0, asylum: 0, total: 0 };
      by[iso].refugees += item.refugees || 0;
      by[iso].idps += item.idps || 0;
      by[iso].asylum += item.asylum_seekers || 0;
    }
    for (const iso in by) by[iso].total = by[iso].refugees + by[iso].idps + by[iso].asylum;
    return { data: by, live: true };
  } catch { return { data: {}, live: false }; }
}

async function fetchINFORM() {
  try {
    const url = "https://drmkc.jrc.ec.europa.eu/inform-index/API/InformAPI/Crises/Score";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok) return { data: {}, live: false };
    const by = {};
    if (Array.isArray(r.data)) {
      for (const row of r.data) {
        const iso = row.Country || row.ISO3;
        if (!iso) continue;
        by[iso] = {
          severity: parseFloat(row.SeverityScore || row.Score || 0),
          category: row.SeverityCategory || row.Category || "Unknown",
        };
      }
    } else if (r.data && typeof r.data === "object") {
      for (const [iso, row] of Object.entries(r.data)) {
        by[iso] = {
          severity: parseFloat(row.severity || row.SeverityScore || 0),
          category: row.category || row.SeverityCategory || "Unknown",
        };
      }
    }
    return { data: by, live: Object.keys(by).length > 0 };
  } catch { return { data: {}, live: false }; }
}

async function fetchWHO() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml").then(r => r.json()));
    if (!r.ok || !r.data?.items) return { data: {}, live: false };
    const by = {};
    const kws = ["cholera","ebola","mpox","measles","polio","dengue","malaria","yellow fever"];
    for (const item of r.data.items) {
      const t = (item.title || "").toLowerCase();
      for (const kw of kws) {
        if (!t.includes(kw)) continue;
        for (const [iso, c] of Object.entries(COUNTRIES)) {
          if (t.includes(c.name.toLowerCase())) {
            if (!by[iso]) by[iso] = [];
            by[iso].push({ disease: kw, title: item.title });
            break;
          }
        }
      }
    }
    return { data: by, live: Object.keys(by).length > 0 };
  } catch { return { data: {}, live: false }; }
}

async function fetchGDACS() {
  try {
    const url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=50";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.features) return { data: [], live: false };
    return { data: r.data.features, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchUSGS() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json()));
    if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true };
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

async function fetchAllLive() {
  const [acled, fews, unhcr, inform, who, gdacs, usgs, ifrc] = await Promise.all([
    fetchACLED(), fetchFEWSNET(), fetchUNHCR(), fetchINFORM(), fetchWHO(),
    fetchGDACS(), fetchUSGS(), fetchIFRC(),
  ]);
  return { acled, fews, unhcr, inform, who, gdacs, usgs, ifrc };
}

// ════════════════════════════════════════════════════════════════════════════
//  AXIS COMPUTATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * SCALE — population mass. How many people are affected.
 * Normalized per component to 0..100, then weighted-maxed.
 */
function computeScaleAxis(iso, live) {
  const comps = {};
  const audit = [];

  // Displaced population
  const uh = live.unhcr.data[iso];
  const displaced = uh?.total || 0;
  const dNorm = clampF(displaced / CFG.SCALE_COMPONENTS.displaced.cap) * 100;
  comps.displaced = dNorm;
  if (dNorm > 1) audit.push({ component: "displaced", value: displaced, normalized: +dNorm.toFixed(1) });

  // Famine-affected
  const few = live.fews.data[iso];
  const famPop = few?.phase3plus || 0;
  const fNorm = clampF(famPop / CFG.SCALE_COMPONENTS.famine_affected.cap) * 100;
  comps.famine_affected = fNorm;
  if (fNorm > 1) audit.push({ component: "famine_affected", value: famPop, normalized: +fNorm.toFixed(1) });

  // Conflict-affected (approximated by event × average affected per event)
  const ac = live.acled.data[iso];
  const conflictAffected = ac ? (ac.events || 0) * 5000 : 0;
  const cNorm = clampF(conflictAffected / CFG.SCALE_COMPONENTS.conflict_affected.cap) * 100;
  comps.conflict_affected = cNorm;
  if (cNorm > 1) audit.push({ component: "conflict_affected", value: conflictAffected, normalized: +cNorm.toFixed(1) });

  // GDACS disaster-affected
  const gdacs = (live.gdacs.data || []).filter(f =>
    (f.properties?.affectedcountries || []).some(c => c.iso3 === iso) ||
    findClosestCountry(f.geometry?.coordinates?.[0] || 0, f.geometry?.coordinates?.[1] || 0) === iso
  );
  const disasterAffected = gdacs.reduce((s, g) => s + (g.properties?.population || 0), 0);
  const diNorm = clampF(disasterAffected / CFG.SCALE_COMPONENTS.disaster_affected.cap) * 100;
  comps.disaster_affected = diNorm;
  if (diNorm > 1) audit.push({ component: "disaster_affected", value: disasterAffected, normalized: +diNorm.toFixed(1) });

  // Population at risk (INFORM-style estimate — fallback to WB population)
  const pop = COUNTRIES[iso]?.population || 0;
  const popAtRisk = pop * 0.1; // proxy
  const pNorm = clampF(popAtRisk / CFG.SCALE_COMPONENTS.population_at_risk.cap) * 100;
  comps.population_at_risk = pNorm;

  // Weighted max: each component contributes (value × weight), take the max
  let scale = 0;
  for (const [k, w] of Object.entries(CFG.SCALE_COMPONENTS)) {
    scale = Math.max(scale, (comps[k] || 0) * w.weight);
  }

  return {
    scale: clampF(scale / 100) * 100,
    components: comps,
    audit,
  };
}

/**
 * INTENSITY — severity per unit.
 * IPC phase, INFORM, fatalities, per-capita displacement. Highest weight on
 * famine and collapse indicators.
 */
function computeIntensityAxis(iso, live) {
  const comps = {};
  const audit = [];

  // IPC Phase 5 (Catastrophe/Famine)
  const few = live.fews.data[iso];
  const p5 = few?.phase5 || 0;
  const p5Norm = clampF(p5 / CFG.INTENSITY_COMPONENTS.ipc_phase5.cap) * 100;
  comps.ipc_phase5 = p5Norm;
  if (p5Norm > 1) audit.push({ component: "ipc_phase5", value: p5, normalized: +p5Norm.toFixed(1) });

  // IPC Phase 4 (Emergency)
  const p4 = few?.phase4plus || 0;
  const p4Norm = clampF(p4 / CFG.INTENSITY_COMPONENTS.ipc_phase4.cap) * 100;
  comps.ipc_phase4 = p4Norm;
  if (p4Norm > 1) audit.push({ component: "ipc_phase4", value: p4, normalized: +p4Norm.toFixed(1) });

  // INFORM severity
  const inform = live.inform.data[iso];
  const infSev = inform?.severity || 0;
  const iNorm = clampF(infSev / CFG.INTENSITY_COMPONENTS.inform_severity.cap) * 100;
  comps.inform_severity = iNorm;
  if (iNorm > 1) audit.push({ component: "inform_severity", value: infSev, normalized: +iNorm.toFixed(1) });

  // ACLED fatalities (90-day)
  const ac = live.acled.data[iso];
  const fat = ac?.fatalities || 0;
  const fNorm = clampF(fat / CFG.INTENSITY_COMPONENTS.acled_fatalities.cap) * 100;
  comps.acled_fatalities = fNorm;
  if (fNorm > 1) audit.push({ component: "acled_fatalities", value: fat, normalized: +fNorm.toFixed(1) });

  // GDACS Red alerts
  const gdacsRed = (live.gdacs.data || []).filter(f =>
    f.properties?.alertlevel === "Red" &&
    ((f.properties?.affectedcountries || []).some(c => c.iso3 === iso) ||
     findClosestCountry(f.geometry?.coordinates?.[0] || 0, f.geometry?.coordinates?.[1] || 0) === iso)
  );
  const redNorm = clampF(gdacsRed.length / CFG.INTENSITY_COMPONENTS.gdacs_red.cap) * 100;
  comps.gdacs_red = redNorm;
  if (redNorm > 1) audit.push({ component: "gdacs_red", value: gdacsRed.length, normalized: +redNorm.toFixed(1) });

  // WHO epidemic count
  const who = live.who.data[iso];
  const epiNorm = clampF((who?.length || 0) / CFG.INTENSITY_COMPONENTS.who_epidemic.cap) * 100;
  comps.who_epidemic = epiNorm;

  // ACLED intensity (fatalities per event)
  const intensity = ac && ac.events > 0 ? fat / ac.events : 0;
  const acNorm = clampF(intensity / CFG.INTENSITY_COMPONENTS.acled_intensity.cap) * 100;
  comps.acled_intensity = acNorm;

  // Displacement rate (displaced / population)
  const uh = live.unhcr.data[iso];
  const pop = COUNTRIES[iso]?.population || 0;
  const rate = pop > 0 ? (uh?.total || 0) / pop : 0;
  const rNorm = clampF(rate / CFG.INTENSITY_COMPONENTS.displacement_rate.cap) * 100;
  comps.displacement_rate = rNorm;

  // Weighted sum for intensity (unlike scale, intensity is additive because
  // multiple simultaneous crises = worse)
  let intensity = 0;
  let totalWeight = 0;
  for (const [k, c] of Object.entries(CFG.INTENSITY_COMPONENTS)) {
    intensity += (comps[k] || 0) * c.weight;
    totalWeight += c.weight;
  }
  intensity = totalWeight > 0 ? intensity / totalWeight : 0;

  return {
    intensity: clampF(intensity / 100) * 100,
    components: comps,
    audit,
  };
}

/**
 * VOLATILITY — bounded ±12 modifier.
 * Deviation from own rolling baseline across key signals.
 */
function computeVolatilityAxis(iso, live, baseScore) {
  const hist = LIVE_HISTORY.get(iso, 30);
  const signals = [];
  let volatility = 0;

  if (hist.length >= 5) {
    // Fatality surge
    const ac = live.acled.data[iso];
    const fat = ac?.fatalities || 0;
    const pastFat = hist.map(h => h.fatalities || 0).filter(v => v > 0);
    if (pastFat.length >= 3 && fat > 0) {
      const base = mean(pastFat);
      const pct = (fat - base) / (base || 1);
      if (pct > CFG.VOLATILITY_SURGE_THRESHOLD) {
        const bonus = Math.min(6, pct * 6);
        volatility += bonus;
        signals.push({ type: "fatality_surge", bonus: +bonus.toFixed(2), pct: +(pct * 100).toFixed(0) });
      }
    }

    // Displacement surge
    const uh = live.unhcr.data[iso];
    const disp = uh?.total || 0;
    const pastDisp = hist.map(h => h.displaced || 0).filter(v => v > 0);
    if (pastDisp.length >= 3 && disp > 0) {
      const base = mean(pastDisp);
      const delta = disp - base;
      if (delta > 250_000) {
        const bonus = Math.min(6, (delta / 1_000_000) * 5);
        volatility += bonus;
        signals.push({ type: "displacement_surge", bonus: +bonus.toFixed(2), delta: +delta });
      }
    }
  }

  // Novel GDACS Red (not in history)
  const gdacsRed = (live.gdacs.data || []).filter(f =>
    f.properties?.alertlevel === "Red" &&
    ((f.properties?.affectedcountries || []).some(c => c.iso3 === iso) ||
     findClosestCountry(f.geometry?.coordinates?.[0] || 0, f.geometry?.coordinates?.[1] || 0) === iso)
  );
  if (gdacsRed.length > 0) {
    const hadRed = hist.some(h => (h.gdacs_red || 0) > 0);
    if (!hadRed) {
      volatility += 5;
      signals.push({ type: "new_gdacs_red", bonus: 5, count: gdacsRed.length });
    }
  }

  // Novel WHO outbreak
  const who = live.who.data[iso];
  if (who && who.length > 0) {
    const known = new Set();
    for (const h of hist) for (const d of h.who_diseases || []) known.add(d);
    const novel = who.filter(o => !known.has(o.disease));
    if (novel.length > 0) {
      const bonus = Math.min(4, novel.length * 2);
      volatility += bonus;
      signals.push({ type: "novel_outbreak", bonus, diseases: novel.map(o => o.disease) });
    }
  }

  volatility = Math.max(CFG.VOLATILITY_MAX_NEG, Math.min(CFG.VOLATILITY_MAX_POS, volatility));

  return { volatility, signals };
}

// ════════════════════════════════════════════════════════════════════════════
//  SCORE COMBINATION — the orthogonal model
// ════════════════════════════════════════════════════════════════════════════

function computeFinalScore(iso, scale, intensity, volatility, hasEvidence) {
  const c = COUNTRIES[iso];
  const fsiFloor = Math.round(Math.min(CFG.FSI_FLOOR_CAP, c.fsi_score) * CFG.FSI_FLOOR_FRACTION);

  if (!hasEvidence) {
    return {
      score: Math.max(CFG.NO_EVIDENCE_FLOOR, fsiFloor),
      base: 0,
      gated: false,
      axis_dominant: "none",
      fsi_floor: fsiFloor,
    };
  }

  // Base score = max of SCALE, INTENSITY
  const base = Math.max(scale, intensity);
  const axisDominant = scale >= intensity ? "scale" : "intensity";

  // Gate: if intensity < threshold, dampen
  const gated = intensity >= CFG.INTENSITY_GATE;
  const gatedScore = gated ? base : base * CFG.INTENSITY_DAMPEN;

  // Volatility applies as bounded modifier
  const withVolatility = gatedScore + volatility;

  // FSI floor
  const final = Math.max(fsiFloor, withVolatility);

  return {
    score: clamp(final, 0, 99),
    base: +base.toFixed(1),
    gated,
    axis_dominant: axisDominant,
    fsi_floor: fsiFloor,
    gated_score: +gatedScore.toFixed(1),
    with_volatility: +withVolatility.toFixed(1),
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILD STORE
// ════════════════════════════════════════════════════════════════════════════

function buildStore(liveData) {
  const store = {};

  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const scaleAxis = computeScaleAxis(iso, liveData);
    const intensityAxis = computeIntensityAxis(iso, liveData);
    const volatilityAxis = computeVolatilityAxis(iso, liveData, 0);
    const hasEvidence = scaleAxis.audit.length > 0 ||
                        intensityAxis.audit.length > 0 ||
                        volatilityAxis.signals.length > 0;

    const result = computeFinalScore(iso, scaleAxis.scale, intensityAxis.intensity, volatilityAxis.volatility, hasEvidence);

    // Record for future volatility calcs
    const ac = liveData.acled.data[iso];
    const uh = liveData.unhcr.data[iso];
    const who = liveData.who.data[iso];
    const gdacsRed = (liveData.gdacs.data || []).filter(f =>
      f.properties?.alertlevel === "Red" &&
      ((f.properties?.affectedcountries || []).some(c => c.iso3 === iso) ||
       findClosestCountry(f.geometry?.coordinates?.[0] || 0, f.geometry?.coordinates?.[1] || 0) === iso)
    );
    LIVE_HISTORY.push(iso, {
      score: result.score,
      scale: scaleAxis.scale,
      intensity: intensityAxis.intensity,
      volatility: volatilityAxis.volatility,
      fatalities: ac?.fatalities || 0,
      events: ac?.events || 0,
      displaced: uh?.total || 0,
      who_diseases: (who || []).map(o => o.disease),
      gdacs_red: gdacsRed.length,
    });

    const activeSources = [];
    if (ac?.events > 0) activeSources.push("ACLED");
    if ((liveData.fews.data[iso]?.phase3plus || 0) > 0) activeSources.push("FEWS NET");
    if ((uh?.total || 0) > 0) activeSources.push("UNHCR");
    if ((liveData.inform.data[iso]?.severity || 0) > 0) activeSources.push("INFORM");
    if (who?.length > 0) activeSources.push("WHO");
    if (gdacsRed.length > 0) activeSources.push("GDACS");

    store[iso] = {
      ...country,
      score: result.score,
      scale: scaleAxis.scale,
      intensity: intensityAxis.intensity,
      volatility: volatilityAxis.volatility,
      scale_components: scaleAxis.components,
      intensity_components: intensityAxis.components,
      scale_audit: scaleAxis.audit,
      intensity_audit: intensityAxis.audit,
      volatility_signals: volatilityAxis.signals,
      axis_dominant: result.axis_dominant,
      gated: result.gated,
      base_score: result.base,
      gated_score: result.gated_score,
      with_volatility: result.with_volatility,
      fsi_floor: result.fsi_floor,
      live_boost: result.score - result.fsi_floor,
      active_sources: activeSources,
      has_evidence: hasEvidence,
      spillover: 0,
    };
  }

  // Spillover (small, evidence-gated)
  for (const iso in store) {
    if (!store[iso].has_evidence) continue;
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const raw = Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    const dim = Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    store[iso].spillover = +(raw * dim).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }

  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  OUTPUT
// ════════════════════════════════════════════════════════════════════════════

function severityLabel(s) { return s >= 85 ? "CATASTROPHIC" : s >= 75 ? "CRITICAL" : s >= 60 ? "HIGH" : s >= 40 ? "ELEVATED" : "MODERATE"; }
function severityEmoji(s) { return s >= 85 ? "🔴" : s >= 75 ? "🟠" : s >= 60 ? "🟡" : s >= 40 ? "🟢" : "🔵"; }
function severityColor(s) { return s >= 85 ? "#ff375f" : s >= 75 ? "#ff375f" : s >= 60 ? "#ff8c42" : s >= 40 ? "#ffb020" : "#6bc8ff"; }

function buildPayload(iso, store, ranked) {
  const c = store[iso];
  const rank = ranked.indexOf(iso) + 1;
  return {
    iso, name: c.name, flag: c.flag,
    score: c.score,
    severity: severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    severity_color: severityColor(c.score),
    rank, total_countries: ranked.length,

    // Orthogonal axes — full transparency
    axes: {
      scale: {
        value: +c.scale.toFixed(1),
        components: Object.fromEntries(Object.entries(c.scale_components).map(([k, v]) => [k, +v.toFixed(1)])),
        audit: c.scale_audit,
      },
      intensity: {
        value: +c.intensity.toFixed(1),
        components: Object.fromEntries(Object.entries(c.intensity_components).map(([k, v]) => [k, +v.toFixed(1)])),
        audit: c.intensity_audit,
      },
      volatility: {
        value: +c.volatility.toFixed(2),
        signals: c.volatility_signals,
      },
    },

    // Combination metadata
    combination: {
      dominant_axis: c.axis_dominant,
      base: c.base_score,
      gated: c.gated,
      gated_score: c.gated_score,
      with_volatility: c.with_volatility,
      fsi_floor: c.fsi_floor,
    },

    fsi_score: c.fsi_score,
    fsi_band: c.fsi_band,
    live_boost: c.live_boost,
    spillover: c.spillover,
    active_sources: c.active_sources,
    has_evidence: c.has_evidence,

    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l, icon: ARC[t]?.i, color: ARC[t]?.color })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  HANDLER
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
      top: Math.min(CFG.MAX_TOP_N, Math.max(1, parseInt(url.searchParams.get("top") || "179", 10) || 179)),
      q: url.searchParams.get("q")?.trim() || null,
      region: url.searchParams.get("region")?.toLowerCase().trim() || null,
      format: url.searchParams.get("format") || "json",
    };
  } catch {
    res.writeHead(400, CORS); res.end(JSON.stringify({ error: "Bad URL" })); return;
  }

  if (params.q && !params.iso) {
    const resolved = findIsoByName(params.q);
    if (!resolved) { res.writeHead(404, CORS); res.end(JSON.stringify({ error: `Unknown: ${params.q}` })); return; }
    params.iso = resolved;
  }

  const isoList = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s]) : [];

  try {
    const liveData = await fetchAllLive();
    const store = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else finalIsos = ranked.slice(0, params.top);

    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked));

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        scoring_model: "ORTHOGONAL_AXES_v16",
        description:
          "Three independent axes combined via gated max. " +
          "SCALE captures population mass affected (displacement, famine-affected, conflict-affected). " +
          "INTENSITY captures severity per unit (IPC phase 5, INFORM severity, fatality rate). " +
          "VOLATILITY is a bounded ±12 modifier for anomalous deviations from own baseline. " +
          "Formula: base = max(scale, intensity); gated = intensity >= 30 ? base : base × 0.65; " +
          "final = max(fsi_floor, gated + volatility).",
        scale_weights: CFG.SCALE_COMPONENTS,
        intensity_weights: CFG.INTENSITY_COMPONENTS,
        volatility_bounds: { min: CFG.VOLATILITY_MAX_NEG, max: CFG.VOLATILITY_MAX_POS },
        intensity_gate: CFG.INTENSITY_GATE,
        intensity_dampen: CFG.INTENSITY_DAMPEN,
        fsi_floor_fraction: CFG.FSI_FLOOR_FRACTION,
        fsi_floor_cap: CFG.FSI_FLOOR_CAP,
        source_status: {
          acled: { live: liveData.acled.live, configured: !!(process.env.ACLED_API_KEY && process.env.ACLED_EMAIL) },
          fews: { live: liveData.fews.live },
          unhcr: { live: liveData.unhcr.live },
          inform: { live: liveData.inform.live },
          who: { live: liveData.who.live },
          gdacs: { live: liveData.gdacs.live, events: liveData.gdacs.data?.length || 0 },
          usgs: { live: liveData.usgs.live, events: liveData.usgs.data?.length || 0 },
          ifrc: { live: liveData.ifrc.live, events: liveData.ifrc.data?.length || 0 },
        },
      },
      top_story: payloads[0] || null,
      countries: payloads,
    };

    res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=300" });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[v16.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
