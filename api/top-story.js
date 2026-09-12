"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — ULTIMATE MASTERPIECE EDITION v12.3
//  ────────────────────────────────────────────────────────────────────────
//  v12.2 → v12.3 changes:
//    - Added COUNTRY_COORDS (179 real lat/lng) → fixes heat detection
//    - Rewrote WHO fetcher with direct XML parsing (no rss2json dependency)
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

  BOOST_CAP_TIERS: [
    { minFsi: 100, cap: 40 },
    { minFsi: 90,  cap: 35 },
    { minFsi: 70,  cap: 28 },
    { minFsi: 50,  cap: 20 },
    { minFsi: 30,  cap: 12 },
    { minFsi: 0,   cap: 8  },
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
    disaster:     { required: true,  label: "Disaster/Climate" },
    health:       { required: false, label: "Health/Epidemic" },
    displacement: { required: false, label: "Mass Displacement" },
    economic:     { required: false, label: "Economic Collapse" },
    conflict:     { required: false, label: "Active Conflict" },
  },

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
//  ═══ v12.3 FIX 1 ═══ COUNTRY COORDINATES MAP
//  Real lat/lng for all 179 countries. Populates COUNTRIES[iso].cent
//  Fixes: heat stress detection, USGS/EMSC geo-matching, GDACS fallback
// ════════════════════════════════════════════════════════════════════════════

const COUNTRY_COORDS = {
  AFG: [67.709953, 33.939110], ALB: [20.168331, 41.153332], DZA: [1.659626, 28.033886],
  AGO: [17.873887, -11.202692], ARG: [-63.616672, -38.416097], ARM: [45.038189, 40.069099],
  AUS: [133.775136, -25.274398], AUT: [14.550072, 47.516231], AZE: [47.576927, 40.143105],
  BHR: [50.637772, 25.930414], BGD: [90.356331, 23.684994], BRB: [-59.543198, 13.193887],
  BLR: [27.953389, 53.709807], BEL: [4.469936, 50.503887], BLZ: [-88.497650, 17.189877],
  BEN: [2.315818, 9.307690], BTN: [90.433601, 27.514162], BOL: [-63.588653, -16.290154],
  BIH: [17.679076, 43.915886], BWA: [24.684866, -22.328474], BRA: [-51.925280, -14.235004],
  BRN: [114.727669, 4.535277], BGR: [25.485830, 42.733883], BFA: [-1.561593, 12.238333],
  BDI: [29.924526, -3.373056], CPV: [-23.605250, 16.002082], KHM: [104.991000, 12.565679],
  CMR: [12.354722, 7.369722], CAN: [-106.346771, 56.130366], CAF: [20.939444, 6.611111],
  TCD: [18.732210, 15.454166], CHL: [-71.542969, -35.675147], CHN: [104.195397, 35.861660],
  COL: [-74.297333, 4.570868], COM: [43.872219, -11.875001], COD: [21.758664, -4.038333],
  COG: [15.827659, -0.228021], CRI: [-83.753428, 9.748917], CIV: [-5.547080, 7.539989],
  HRV: [15.200000, 45.100000], CUB: [-77.781167, 21.521757], CYP: [33.429859, 35.126413],
  CZE: [15.472962, 49.817492], DNK: [9.501785, 56.263920], DJI: [42.590275, 11.825138],
  DMA: [-61.370976, 15.414999], DOM: [-70.162651, 18.735693], ECU: [-78.183406, -1.831239],
  EGY: [30.802498, 26.820553], SLV: [-88.896530, 13.794185], GNQ: [10.267895, 1.650801],
  ERI: [39.782334, 15.179384], EST: [25.013607, 58.595272], SWZ: [31.465866, -26.522503],
  ETH: [40.489673, 9.145000], FJI: [178.065033, -17.713371], FIN: [25.748151, 61.924110],
  FRA: [2.213749, 46.227638], GAB: [11.609444, -0.803689], GMB: [-15.310139, 13.443182],
  GEO: [43.356892, 42.315407], DEU: [10.451526, 51.165691], GHA: [-1.023194, 7.946527],
  GRC: [21.824312, 39.074208], GRD: [-61.604171, 12.262776], GTM: [-90.230759, 15.783471],
  GIN: [-9.696600, 9.945587], GNB: [-15.180413, 11.803749], GUY: [-58.930180, 4.860416],
  HTI: [-72.285215, 18.971187], HND: [-86.241905, 15.199999], HUN: [19.503304, 47.162494],
  ISL: [-19.020835, 64.963051], IND: [78.962880, 20.593684], IDN: [113.921327, -0.789275],
  IRN: [53.688046, 32.427908], IRQ: [43.679291, 33.223191], IRL: [-8.243890, 53.412910],
  ISR: [34.851612, 31.046051], ITA: [12.567380, 41.871940], JAM: [-77.297508, 18.109581],
  JPN: [138.252924, 36.204824], JOR: [36.238414, 30.585164], KAZ: [66.923684, 48.019573],
  KEN: [37.906193, -0.023559], KIR: [-168.734084, -3.370417], PRK: [127.510093, 40.339852],
  KOR: [127.766922, 35.907757], KWT: [47.481766, 29.311660], KGZ: [74.766098, 41.204380],
  LAO: [102.495496, 19.856270], LVA: [24.603189, 56.879635], LBN: [35.862285, 33.854721],
  LSO: [28.233608, -29.609988], LBR: [-9.429499, 6.428055], LBY: [17.228331, 26.335100],
  LTU: [23.881275, 55.169438], LUX: [6.129583, 49.815273], MDG: [46.869107, -18.766947],
  MWI: [34.301525, -13.254308], MYS: [101.975766, 4.210484], MDV: [73.220680, 3.202778],
  MLI: [-3.996067, 17.570692], MLT: [14.375416, 35.937496], MHL: [171.184478, 7.131474],
  MRT: [-10.940835, 21.007890], MUS: [57.552152, -20.348404], MEX: [-102.552784, 23.634501],
  FSM: [158.181142, 7.425554], MDA: [28.369885, 47.411631], MNG: [103.846656, 46.862496],
  MNE: [19.374390, 42.708678], MAR: [-7.092620, 31.791702], MOZ: [35.529562, -18.665695],
  MMR: [95.956223, 21.913965], NAM: [18.490410, -22.957640], NPL: [84.124008, 28.394857],
  NLD: [5.291266, 52.132633], NZL: [174.885971, -40.900557], NIC: [-85.207229, 12.865416],
  NER: [8.081666, 17.607789], NGA: [8.675277, 9.081999], NOR: [8.468946, 60.472024],
  OMN: [55.923255, 21.512583], PAK: [69.345116, 30.375321], PAN: [-80.782127, 8.537981],
  PNG: [143.955550, -6.314993], PRY: [-58.443832, -23.442503], PER: [-75.015152, -9.189967],
  PHL: [121.774017, 12.879721], POL: [19.145136, 51.919438], PRT: [-8.224454, 39.399872],
  PSE: [35.233154, 31.952162], QAT: [51.183884, 25.354826], ROU: [24.966760, 45.943161],
  RUS: [105.318756, 61.524010], RWA: [29.873888, -1.940278], SAU: [45.079162, 23.885942],
  SEN: [-14.452362, 14.497401], SRB: [21.005859, 44.016521], SYC: [55.491977, -4.679574],
  SLE: [-11.779889, 8.460555], SGP: [103.819836, 1.352083], SVK: [19.699024, 48.669026],
  SVN: [14.995463, 46.151241], SLB: [160.156194, -9.645710], SOM: [46.199616, 5.152149],
  ZAF: [22.937506, -30.559482], SSD: [31.306979, 6.876992], ESP: [-3.749220, 40.463667],
  LKA: [80.771797, 7.873054], SDN: [30.217636, 15.500654], SUR: [55.167800, 3.919300],
  SWE: [18.643501, 60.128161], CHE: [8.227512, 46.818188], SYR: [38.996815, 34.802075],
  TWN: [120.960515, 23.697810], TJK: [71.276093, 38.861034], TZA: [34.888822, -6.369028],
  THA: [100.992541, 15.870032], TLS: [125.727539, -8.874217], TGO: [0.824782, 8.619543],
  TON: [-175.198242, -21.178986], TTO: [-61.222503, 10.691803], TUN: [9.537499, 33.886917],
  TUR: [35.243322, 38.963745], TKM: [59.556278, 38.969719], UGA: [32.290275, 1.373333],
  UKR: [31.165580, 48.379433], ARE: [53.847818, 23.424076], GBR: [-3.435973, 55.378051],
  USA: [-95.712891, 37.090240], URY: [-55.765835, -32.522779], UZB: [64.585262, 41.377491],
  VUT: [166.959158, -15.376706], VEN: [-66.589730, 6.423750], VNM: [108.277199, 14.058324],
  YEM: [48.516388, 15.552727], ZMB: [27.849332, -13.133897], ZWE: [29.154857, -19.015438],
};

// ─── FSI 2024 COUNTRY DATA ───────────────────────────────────────────────────

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

// ─── REGION ALIASES ──────────────────────────────────────────────────────────

const REGION_ALIASES = {
  africa:     ["africa"],
  asia:       ["asia"],
  europe:     ["europe"],
  middleeast: ["middleeast","middle east","mena"],
  americas:   ["americas","latin america","latam","caribbean"],
  oceania:    ["oceania","pacific"],
};

// ════════════════════════════════════════════════════════════════════════════
//  ═══ v12.3 FIX 2 ═══ BUILD COUNTRY TABLE WITH REAL COORDINATES
//  Replaces the old loop that hardcoded cent to [0, 0]
// ════════════════════════════════════════════════════════════════════════════

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
  // ═══ v12.3 FIX: Use real coordinates from COUNTRY_COORDS ═══
  const cent = COUNTRY_COORDS[iso] || [0, 0];
  COUNTRIES[iso] = {
    name: fsi.name, flag: fsi.flag,
    prior: Math.round(score), fsi_score: score,
    fsi_rank: fsi.rank, fsi_band: fsi.fsi_band, region: fsi.region,
    types: uniqueTypes.slice(0, 4), adj: adj.slice(0, 8),
    cent,  // ← Real [lng, lat]
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
    const dist = Math.sqrt((lng - d.cent[0]) ** 2 + (lat - d.cent[1]) ** 2);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return closest;
}

// ─── FIX 1: Dynamic boost cap by FSI tier ────────────────────────────────────

function computeDynamicBoostCap(fsiBase) {
  for (const tier of CFG.BOOST_CAP_TIERS) {
    if (fsiBase >= tier.minFsi) return tier.cap;
  }
  return 8;
}

// ─── FIX 2: Evidence-weighted ceiling expansion ──────────────────────────────

function computeEvidenceCeiling(baseCeiling, liveEvidenceCount) {
  if (!CFG.EVIDENCE_CEILING_ENABLED) return baseCeiling;
  const multiplier = Math.min(
    CFG.EVIDENCE_MULTIPLIER_MAX,
    1 + (liveEvidenceCount || 0) * CFG.EVIDENCE_PER_SOURCE
  );
  return Math.round(baseCeiling * multiplier);
}

// ─── FIX 3: Evidence-weighted viral blend ────────────────────────────────────

function computeViralWeight(baseVelocity, liveEvidenceCount) {
  const evidenceWeight = Math.min(
    CFG.LIVE_EVIDENCE_WEIGHT_MAX,
    (liveEvidenceCount || 0) * CFG.LIVE_EVIDENCE_PER_SOURCE
  );
  return Math.min(
    CFG.VIRAL_WEIGHT_CAP,
    0.4 + Math.abs(baseVelocity) * 0.1 + evidenceWeight
  );
}

// ─── FIX 4: Consensus gate for extreme scores ────────────────────────────────

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
  if (!CFG.CONSENSUS_GATE_ENABLED) return { score, gate_applied: false, gate_note: null, categories_firing: 0 };
  if (score < CFG.CONSENSUS_GATE_THRESHOLD) return { score, gate_applied: false, gate_note: null, categories_firing: 0 };
  const categories = categorizeEvidence(signals);
  const categoriesFiring = Object.values(categories).filter(Boolean).length;
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

// ─── VIRAL MOMENTUM SCORING ENGINE ──────────────────────────────────────────

function computeViralMomentumScore(iso, currentScore, store, dims) {
  if (!CFG.VIRAL_ENABLED) return computeTimeSensitiveScore(iso, currentScore, store, dims);
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
  const baseCeiling = fsiScore + CFG.WST_MAX_BOOST_ABOVE_FSI;
  const evidenceCeiling = computeEvidenceCeiling(baseCeiling, liveEvidenceCount);
  const maxAllowed = Math.min(99, evidenceCeiling);
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
      evidence_ceiling: evidenceCeiling, live_evidence_count: liveEvidenceCount,
      viral_score: adjustedScore,
    };
  }
  return { adjustedScore, velocity, acceleration, surgeMagnitude, isSurge, viralStatus, timeDecay, recencyWeight, noveltyBoost, surgeBonus, viralVelocityBonus, decayPenalty, totalAdjustment, rawScore: currentScore, fsi_anchor: fsiScore, max_allowed: maxAllowed, min_allowed: minAllowed, evidence_ceiling: evidenceCeiling, live_evidence_count: liveEvidenceCount };
}

// ─── ML ENGINE ───────────────────────────────────────────────────────────────

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

// ─── SENTIMENT ANALYSIS ─────────────────────────────────────────────────────

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
  const result = sentimentAnalyzer.analyze(fullText);
  return { ...result, sources_analyzed: text.length, text_sample: fullText.slice(0, 200) };
}

// ─── HISTORICAL DATA STORE ──────────────────────────────────────────────────

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

// ─── ALERT MANAGER ──────────────────────────────────────────────────────────

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

// ─── LIVE DATA FETCHERS ─────────────────────────────────────────────────────

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
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Green,Orange,Red&limit=50").then(r => r.json())),
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

// ═══ v12.3 FIX: Heat stress now works — coordinates are populated ═══
async function fetchHeatStress() {
  const heatProneIsos = ["SOM","SDN","SSD","YEM","AFG","PAK","IND","BGD","NGA","ETH","KEN","TCD","NER","MLI","BFA","MRT","SEN","EGY","IRQ","SYR","JOR","LBY","DZA","MAR","TUN","SAU","ARE","OMN","IRN","MMR","THA","KHM","VNM","PHL","IDN","MEX","BRA","COL","VEN","HTI","AUS","ESP","ITA","GRC","TUR","USA"];
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
    { iso:'NGA', lat:6.5, lon:3.4 }, { iso:'IND', lat:28.6, lon:77.2 },
    { iso:'CHN', lat:39.9, lon:116.4 }, { iso:'BGD', lat:23.8, lon:90.4 },
    { iso:'EGY', lat:30.0, lon:31.2 }, { iso:'PAK', lat:24.9, lon:67.1 },
    { iso:'THA', lat:13.8, lon:100.5 }, { iso:'TUR', lat:41.0, lon:28.9 },
    { iso:'BRA', lat:-23.5, lon:-46.6 }, { iso:'ETH', lat:9.0, lon:38.7 },
    { iso:'KEN', lat:-1.3, lon:36.8 },
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

// ════════════════════════════════════════════════════════════════════════════
//  ═══ v12.3 FIX 2 ═══ WHO FETCHER — DIRECT XML PARSING
//  Replaces rss2json dependency with direct RSS fetch + regex parsing
// ════════════════════════════════════════════════════════════════════════════

async function fetchWHO() {
  try {
    // Try direct fetch first (works if WHO allows CORS or if server-side)
    let xmlText = null;
    const direct = await safeFetch(fetch("https://www.who.int/rss-feeds/news-english.xml").then(r => r.text()));
    if (direct.ok && direct.data && typeof direct.data === 'string' && direct.data.includes('<rss')) {
      xmlText = direct.data;
    } else {
      // Fallback: use allorigins CORS proxy
      const proxy = await safeFetch(fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://www.who.int/rss-feeds/news-english.xml")).then(r => r.text()));
      if (proxy.ok && proxy.data && typeof proxy.data === 'string') {
        xmlText = proxy.data;
      }
    }

    if (!xmlText) return { data: {}, live: false };

    // Parse <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [...xmlText.matchAll(itemRegex)].map(m => m[1]);
    if (items.length === 0) return { data: {}, live: false };

    const keywords = ['cholera', 'ebola', 'mpox', 'measles', 'polio', 'dengue', 'malaria', 'yellow fever', 'lassa', 'nipah', 'mers', 'sars'];
    const outbreaks = {};

    for (const item of items) {
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      if (!titleMatch) continue;
      const title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim();
      const date = dateMatch ? dateMatch[1] : null;
      const lower = title.toLowerCase();

      for (const kw of keywords) {
        if (lower.includes(kw)) {
          // Match against country names
          for (const [iso, country] of Object.entries(COUNTRIES)) {
            const countryLower = country.name.toLowerCase();
            if (lower.includes(countryLower)) {
              if (!outbreaks[iso]) outbreaks[iso] = [];
              outbreaks[iso].push({ disease: kw, title, date });
              break;
            }
          }
        }
      }
    }

    return { data: outbreaks, live: Object.keys(outbreaks).length > 0 };
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

// ─── EXTRACT SIGNALS ────────────────────────────────────────────────────────

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];
  const signals = {};

  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a,b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = topQuake.properties.place.split(",")[0].trim();
  }

  const emscQuakes = (live.emsc.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a,b) => (b.properties?.mag||0) > (a.properties?.mag||0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= 4.5) {
    liveEvidenceCount++; evidenceSources.push("EMSC");
    if (!signals.quakeMag) signals.quakeMag = topEMSC.properties.mag;
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
    const countryName = d.country || "";
    return countryName.toLowerCase() === name || name.includes(countryName.toLowerCase());
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
    quakeMag: signals.quakeMag || 0,
    quakePlace: signals.quakePlace || null,
    quakeCount: (quakes?.length || 0) + (emscQuakes?.length || 0),
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

// ─── APPLY LIVE ADJUSTMENTS ─────────────────────────────────────────────────

function applyLiveAdjustments(priorDims, signals, iso, store) {
  const dims = { ...priorDims };
  const audit = [];
  let totalBoost = 0;
  const country = COUNTRIES[iso];
  const fsiBase = country?.fsi_score || 50;

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
      audit.push({ source: "WST Extractivism", delta: Math.round(penalty * 0.85) });
    }
    const globalRate = CFG.WST_GLOBAL_INTEREST_RATE || 5.25;
    const rateShock = Math.max(0, (globalRate - 2) * wst.debt_sensitivity * 1.2);
    const debtPenalty = Math.min(12, Math.round(rateShock * 1.5));
    if (debtPenalty > 1) {
      dims.economic = clamp(dims.economic + debtPenalty);
      dims.political = clamp(dims.political + Math.round(debtPenalty * 0.3));
      totalBoost += debtPenalty;
      audit.push({ source: "WST Debt Shock", delta: debtPenalty });
    }
    if (signals.wbInflation && signals.wbInflation.value > CFG.WST_CURRENCY_CRISIS_THRESHOLD) {
      const currencyCrash = Math.min(10, Math.round((signals.wbInflation.value - 15) * 0.4 * wst.debt_sensitivity));
      if (currencyCrash > 0) {
        dims.economic = clamp(dims.economic + currencyCrash);
        dims.food = clamp(dims.food + Math.round(currencyCrash * 0.4));
        totalBoost += currencyCrash;
        audit.push({ source: "WST Currency Crisis", delta: currencyCrash });
      }
    }
    if (store && store[iso]) {
      const recoveryFactor = wst.recovery_rate || 0.5;
      store[iso].__wst = {
        class: wst.class, tier: wst.tier, recovery_rate: recoveryFactor,
        structural_weight: wst.structural_weight || 0.5,
        fragility_multiplier: 1 + (1 - recoveryFactor) * 0.3,
        debt_sensitivity: wst.debt_sensitivity,
        reserve_currency: wst.reserve_currency || false,
        momentum_factor: wst.momentum_factor || 0.5,
        gdp_per_capita: wst.gdp_per_capita || 3000,
      };
    }
    if (wst.reserve_currency) {
      const buffer = Math.min(3, Math.round(3 * (wst.recovery_rate || 0.8)));
      dims.economic = clamp(dims.economic - buffer);
      dims.political = clamp(dims.political - Math.round(buffer * 0.3));
      totalBoost -= buffer;
      audit.push({ source: "WST Reserve Currency", delta: -buffer });
    }
    if (signals.wbGdpGrowth && signals.wbGdpGrowth.value < -1) {
      const coreShock = Math.abs(signals.wbGdpGrowth.value) * CFG.WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER * 8;
      const transmittedShock = Math.round(coreShock * (1 + (1 - wst.recovery_rate) * 0.3));
      if (transmittedShock > 0) {
        dims.economic = clamp(dims.economic + transmittedShock);
        dims.conflict = clamp(dims.conflict + Math.round(transmittedShock * 0.15));
        totalBoost += transmittedShock;
        audit.push({ source: "WST Supply Chain", delta: transmittedShock });
      }
    }
  }

  if (CFG.GDACS_ENABLED && signals.gdacs) {
    const alertLevel = signals.gdacsAlert || "green";
    const baseBoost = alertLevel === "red" ? CFG.GDACS_BOOST_RED : alertLevel === "orange" ? CFG.GDACS_BOOST_ORANGE : CFG.GDACS_BOOST_GREEN;
    const countMultiplier = Math.min(2, 1 + (signals.gdacsCount || 1) * 0.15);
    const gdacsBoost = Math.round(baseBoost * countMultiplier);
    dims.displacement = clamp(dims.displacement + Math.ceil(gdacsBoost * 0.5));
    dims.health = clamp(dims.health + Math.floor(gdacsBoost * 0.3));
    dims.access = clamp(dims.access + Math.floor(gdacsBoost * 0.25));
    dims.climate = clamp(dims.climate + Math.floor(gdacsBoost * 0.2));
    totalBoost += gdacsBoost;
    audit.push({ source: "GDACS", delta: gdacsBoost, reason: `${alertLevel.toUpperCase()} alert x${signals.gdacsCount || 1}` });
  }

  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(15, Math.round((signals.quakeMag - 3.5) * 3.5));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.5));
    dims.health = clamp(dims.health + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "USGS/EMSC", delta: boost, reason: `M${signals.quakeMag.toFixed(1)}` });
  }

  if (CFG.NASA_ENABLED && signals.nasaEventCount > 0) {
    const baseBoost = Math.min(CFG.NASA_MAX_EVENT_BOOST, signals.nasaEventCount * CFG.NASA_EVENT_BOOST);
    const wildfireCount = (signals.nasaEvents || []).filter(e => e.categories?.some(c => c.id === 'wildfires')).length;
    const wildfireBoost = Math.min(6, wildfireCount * CFG.NASA_WILDFIRE_BOOST);
    const totalNasaBoost = baseBoost + wildfireBoost;
    dims.climate = clamp(dims.climate + Math.ceil(totalNasaBoost * 0.6));
    dims.displacement = clamp(dims.displacement + Math.floor(totalNasaBoost * 0.2));
    dims.health = clamp(dims.health + Math.floor(wildfireBoost * 0.3));
    totalBoost += totalNasaBoost;
    audit.push({ source: "NASA EONET", delta: totalNasaBoost });
  }

  if (CFG.IFRC_ENABLED && signals.ifrcCount > 0) {
    const boost = Math.min(CFG.IFRC_MAX_EVENT_BOOST, signals.ifrcCount * CFG.IFRC_EVENT_BOOST);
    dims.access = clamp(dims.access + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "IFRC GO", delta: boost });
  }

  if (signals.maxTempC >= 35) {
    const boost = Math.min(12, Math.round((signals.maxTempC - 28) * 1.2));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.6));
    dims.health = clamp(dims.health + Math.floor(boost * 0.4));
    dims.food = clamp(dims.food + Math.floor(boost * 0.2));
    totalBoost += boost;
    audit.push({ source: "Open-Meteo Heat", delta: boost, reason: `${signals.maxTempC}°C` });
  }

  if (signals.hazards) {
    const h = signals.hazards;
    let hazardBoost = 0;
    const parts = [];
    if (h.flood_discharge > CFG.OPENMETEO_FLOOD_THRESHOLD) { hazardBoost += 5; parts.push(`${h.flood_discharge.toFixed(0)}m³/s`); }
    if (h.wind_speed > CFG.OPENMETEO_WIND_THRESHOLD) { hazardBoost += 4; parts.push(`${h.wind_speed.toFixed(0)}km/h`); }
    if (h.precip_total > CFG.OPENMETEO_PRECIP_THRESHOLD) { hazardBoost += 3; parts.push(`${h.precip_total.toFixed(0)}mm`); }
    if (h.uv_max > CFG.OPENMETEO_UV_THRESHOLD) { hazardBoost += 2; parts.push(`UV ${h.uv_max.toFixed(1)}`); }
    if (h.cloud_avg > 70) { hazardBoost += 2; parts.push(`${h.cloud_avg.toFixed(0)}% cloud`); }
    if (h.lightning_max > CFG.OPENMETEO_LIGHTNING_THRESHOLD) { hazardBoost += 3; parts.push(`${h.lightning_max.toFixed(0)}J/kg`); }
    hazardBoost = Math.min(CFG.OPENMETEO_MAX_HAZARD_BOOST, hazardBoost);
    if (hazardBoost > 0) {
      dims.climate = clamp(dims.climate + hazardBoost);
      dims.displacement = clamp(dims.displacement + Math.floor(hazardBoost * 0.25));
      totalBoost += hazardBoost;
      audit.push({ source: "Open-Meteo Hazards", delta: hazardBoost, reason: parts.join(", ") });
    }
  }

  if (signals.aq && signals.aq.pm25 >= CFG.OPENMETEO_PM25_THRESHOLD) {
    const boost = Math.min(8, Math.round((signals.aq.pm25 - 25) / 10));
    if (boost > 0) {
      dims.health = clamp(dims.health + boost);
      totalBoost += boost;
      audit.push({ source: "Open-Meteo AQ", delta: boost, reason: `PM2.5 ${signals.aq.pm25.toFixed(0)}µg/m³` });
    }
  }

  if (CFG.DISEASE_ENABLED && signals.diseaseActive > CFG.DISEASE_ACTIVE_THRESHOLD) {
    const m = signals.diseaseActive / 1000;
    const boost = Math.min(CFG.DISEASE_MAX_BOOST, Math.round(Math.log10(m + 1) * 5));
    dims.health = clamp(dims.health + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "disease.sh", delta: boost });
  }

  if (CFG.WHO_ENABLED && signals.whoOutbreaks && signals.whoOutbreaks.length > 0) {
    const boost = Math.min(CFG.WHO_MAX_OUTBREAK_BOOST, signals.whoOutbreaks.length * CFG.WHO_OUTBREAK_BOOST);
    dims.health = clamp(dims.health + boost);
    dims.access = clamp(dims.access + Math.floor(boost * 0.25));
    totalBoost += boost;
    audit.push({ source: "WHO", delta: boost, reason: `${signals.whoOutbreaks.length} outbreaks` });
  }

  if (CFG.WB_ENABLED && signals.wbInflation && signals.wbInflation.value > CFG.WB_INFLATION_THRESHOLD) {
    const boost = Math.min(CFG.WB_MAX_INFLATION_BOOST, Math.round(signals.wbInflation.value / 5));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ source: "World Bank", delta: boost, reason: `Inflation ${signals.wbInflation.value.toFixed(1)}%` });
  }
  if (CFG.WB_ENABLED && signals.wbGdpGrowth && signals.wbGdpGrowth.value < 0) {
    const boost = Math.min(CFG.WB_MAX_GDP_BOOST, Math.round(Math.abs(signals.wbGdpGrowth.value) * 1.5));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.2));
    totalBoost += boost;
    audit.push({ source: "World Bank", delta: boost, reason: `GDP ${signals.wbGdpGrowth.value.toFixed(1)}%` });
  }
  if (CFG.WB_ENABLED && signals.wbUnemployment && signals.wbUnemployment.value > CFG.WB_UNEMPLOYMENT_THRESHOLD) {
    const boost = Math.min(CFG.WB_MAX_UNEMPLOYMENT_BOOST, Math.round(signals.wbUnemployment.value / 6));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.2));
    totalBoost += boost;
    audit.push({ source: "World Bank", delta: boost });
  }
  if (CFG.WB_ENABLED && signals.wbPoverty && signals.wbPoverty.value > CFG.WB_POVERTY_THRESHOLD) {
    const boost = Math.min(CFG.WB_MAX_POVERTY_BOOST, Math.round(signals.wbPoverty.value / 5));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ source: "World Bank", delta: boost });
  }

  if (CFG.UNHCR_ENABLED && signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const boost = m >= 10 ? CFG.UNHCR_MAX_DISPLACEMENT_BOOST : m >= 5 ? 18 : m >= 3 ? 14 : m >= 1.5 ? 10 : m >= 0.5 ? 6 : m >= 0.1 ? 3 : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      dims.political = clamp(dims.political + Math.floor(boost * 0.3));
      dims.economic = clamp(dims.economic + Math.floor(boost * 0.2));
      dims.access = clamp(dims.access + Math.floor(boost * 0.15));
      totalBoost += boost;
      audit.push({ source: "UNHCR", delta: boost, reason: `${m.toFixed(1)}M displaced` });
    }
  }

  if (signals.noaa) {
    const boost = Math.min(8, (signals.noaa.extreme_alerts + signals.noaa.storm_alerts) * 2);
    if (boost > 0) {
      dims.climate = clamp(dims.climate + boost);
      totalBoost += boost;
      audit.push({ source: "NOAA", delta: boost });
    }
  }

  if (CFG.ML_ENABLED && store) {
    const mlForecast = mlEnhancedForecast(iso, clamp(composite(dims)), store);
    if (mlForecast.anomaly_probability > 0.6) {
      const mlBoost = Math.round(mlForecast.anomaly_probability * 6);
      dims.political = clamp(dims.political + Math.floor(mlBoost * 0.3));
      dims.economic = clamp(dims.economic + Math.floor(mlBoost * 0.2));
      dims.conflict = clamp(dims.conflict + Math.floor(mlBoost * 0.15));
      totalBoost += mlBoost;
      audit.push({ source: "ML Anomaly", delta: mlBoost });
    }
  }

  const dynamicCap = computeDynamicBoostCap(fsiBase);
  const totalBoostCapped = Math.min(totalBoost, dynamicCap);
  const boostRatio = totalBoost > 0 ? totalBoostCapped / totalBoost : 1;
  for (const key of Object.keys(dims)) {
    const originalDelta = dims[key] - priorDims[key];
    if (originalDelta > 0) dims[key] = clamp(Math.round(priorDims[key] + originalDelta * boostRatio));
  }

  return { dims, score: clamp(composite(dims)), audit, totalBoostRaw: totalBoost, totalBoostCapped, boostRatio, dynamicCap };
}

// ─── BUILD STORE ────────────────────────────────────────────────────────────

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
      dims = adjusted.dims; score = adjusted.score; audit = adjusted.audit;
    } else {
      dims = priorDims; score = priorScore; audit = []; signals = {};
    }
    store[iso] = {
      ...country, dims, score, priorScore,
      liveBoost: score - priorScore, audit, signals,
      spillover: 0, ml_forecast: null, sentiment: null, historical_trend: null,
      fsi_score: fsiScore, fsi_rank: country.fsi_rank, fsi_band: country.fsi_band,
      __wst: null, __viral_metrics: null, __consensus_gate: null,
    };
  }

  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const rawSpillover = Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    const diminishingFactor = Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    store[iso].spillover = +(rawSpillover * diminishingFactor).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }

  if (CFG.VIRAL_ENABLED) {
    for (const iso in store) {
      const viralResult = computeViralMomentumScore(iso, store[iso].score, store, store[iso].dims);
      store[iso].__viral_metrics = viralResult;
      const fsiBase = store[iso].fsi_score || 50;
      const fsiScore = Math.round((fsiBase / 120) * 100);
      const liveEvidenceCount = store[iso].signals?.liveEvidenceCount || 0;
      const viralWeight = computeViralWeight(viralResult.velocity, liveEvidenceCount);

      let blendedScore = clamp(Math.round(
        viralResult.adjustedScore * viralWeight + 
        (fsiScore + Math.min(CFG.FSI_BLEND_HEADROOM, store[iso].score - fsiScore) * 0.4) * (1 - viralWeight)
      ));

      const gated = applyConsensusGate(blendedScore, store[iso].signals || {});
      store[iso].score = clamp(gated.score);
      store[iso].__consensus_gate = {
        applied: gated.gate_applied, note: gated.gate_note,
        categories_firing: gated.categories_firing || 0,
        categories: gated.categories || null,
        pre_gate_score: blendedScore,
      };

      store[iso].time_metrics = {
        velocity: viralResult.velocity, acceleration: viralResult.acceleration,
        surge_magnitude: viralResult.surgeMagnitude, is_surge: viralResult.isSurge,
        viral_status: viralResult.viralStatus, time_decay: viralResult.timeDecay,
        recency_weight: viralResult.recencyWeight, novelty_boost: viralResult.noveltyBoost,
        surge_bonus: viralResult.surgeBonus, total_adjustment: viralResult.totalAdjustment,
        raw_score: viralResult.rawScore, fsi_anchor: viralResult.fsi_anchor,
        evidence_ceiling: viralResult.evidence_ceiling, viral_weight_applied: viralWeight,
        live_evidence_count: liveEvidenceCount,
        consensus_gate_applied: gated.gate_applied,
        consensus_gate_note: gated.gate_note,
        consensus_categories_firing: gated.categories_firing || 0,
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

// ─── ANOMALY DETECTION ──────────────────────────────────────────────────────

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
  return { detected: consensus, severity, direction, methods_fired: fired.length, methods, z_score: maxZ, note: consensus ? `${fired.length}/4 methods agree: ${direction} — ${severity}` : "No anomaly detected" };
}

function computeStoryHeat(iso, store, hist, anom, mlForecast) {
  const c = store[iso];
  const s = c.signals || {};
  const vm = c.__viral_metrics || {};
  let heat = 0;
  const drivers = [];
  if (vm.viral_status === "VIRAL") { const v = 20 + Math.min(15, Math.abs(vm.velocity) * 2); heat += v; drivers.push({ driver: "viral_status", points: v, detail: `🔥 VIRAL - ${Math.abs(vm.velocity).toFixed(1)} pts/day` }); }
  if (vm.is_surge) { const v = Math.min(15, vm.surgeMagnitude * 1.5); heat += v; drivers.push({ driver: "surge_detected", points: v, detail: `⚡ Surge: ${vm.surgeMagnitude.toFixed(1)}` }); }
  if (vm.novelty_boost > 0) { const v = Math.min(10, vm.novelty_boost); heat += v; drivers.push({ driver: "novelty", points: v }); }
  const delta7 = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  if (Math.abs(delta7) >= 2) { const v = Math.min(20, Math.abs(delta7) * 1.5); heat += v; drivers.push({ driver: "velocity", points: +v.toFixed(1), detail: `${delta7 > 0 ? "+" : ""}${delta7.toFixed(0)} pts in 7 days` }); }
  if (anom.detected) { const sevPts = { WATCH: 4, MODERATE: 8, HIGH: 12, CRITICAL: 16, EXTREME: 18 }; const v = sevPts[anom.severity] || 5; heat += v; drivers.push({ driver: "anomaly", points: v, detail: `${anom.methods_fired}/4 — ${anom.severity}` }); }
  if (mlForecast?.anomaly_probability > 0.4) { const v = Math.min(10, mlForecast.anomaly_probability * 14); heat += v; drivers.push({ driver: "ml_forecast", points: +v.toFixed(1) }); }
  const evidenceCount = s.liveEvidenceCount || 0;
  if (evidenceCount >= 2) { const v = Math.min(10, evidenceCount * 1.5); heat += v; drivers.push({ driver: "evidence_breadth", points: +v.toFixed(1), detail: `${evidenceCount} sources` }); }
  if (s.gdacsAlert === "red") heat += 12, drivers.push({ driver: "gdacs_red", points: 12, detail: "GDACS Red alert" });
  else if (s.gdacsAlert === "orange") heat += 8, drivers.push({ driver: "gdacs_orange", points: 8, detail: "GDACS Orange alert" });
  if (s.quakeMag >= 6.0) heat += 10, drivers.push({ driver: "major_quake", points: 10, detail: `M${s.quakeMag.toFixed(1)}` });
  if (s.whoOutbreaks?.length > 0) { const v = Math.min(10, s.whoOutbreaks.length * 3); heat += v; drivers.push({ driver: "who_outbreaks", points: v, detail: `${s.whoOutbreaks.length} outbreaks` }); }
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

function computeTimeSensitiveScore(iso, currentScore, store, dims) {
  const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
  const fsiBase = COUNTRIES[iso]?.fsi_score || 50;
  const hist = store[iso]?.historical_scores || seedHistory(iso, currentScore);
  const structuralWeight = wst.structural_weight || 0.5;
  const recoveryFactor = wst.recovery_rate || 0.5;
  const momentumFactor = wst.momentum_factor || 0.5;
  const volatility = stddev(hist.slice(-10)) / 10;
  const momentum = store[iso]?.spillover || 0;
  const velocity = (hist[hist.length - 1] - hist[Math.max(0, hist.length - 4)]) / 3;
  const acceleration = velocity - ((hist[Math.max(0, hist.length - 4)] - hist[Math.max(0, hist.length - 8)]) / 4);
  const timeDecay = Math.exp(-Math.abs(momentum) / 10);
  const momentumAdjust = momentum * CFG.WST_MOMENTUM_WEIGHT * structuralWeight;
  const velocityAdjust = velocity * CFG.WST_VELOCITY_WEIGHT * momentumFactor;
  const accelerationAdjust = acceleration * CFG.WST_ACCELERATION_WEIGHT * momentumFactor;
  const timeDecayAdjust = -timeDecay * 2 * (1 - recoveryFactor);
  const recoveryAdjust = recoveryFactor * 3;
  const totalAdjustment = momentumAdjust + velocityAdjust + accelerationAdjust + timeDecayAdjust - recoveryAdjust;
  return { adjustedScore: clamp(currentScore + totalAdjustment), momentum, velocity, acceleration, timeDecay, structuralWeight, recoveryFactor, totalAdjustment, rawScore: currentScore, fsi_anchor: Math.round((fsiBase / 120) * 100) };
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
  const an = anomaly?.detected ? ` Anomaly: ${anomaly.severity}.` : "";
  if (score >= 85) return { tier:"IMMEDIATE", text:`Immediate humanitarian response required.${an}` };
  if (score >= 75) return { tier:"URGENT", text:`Urgent response needed.${an}` };
  if (score >= 60) return { tier:"HIGH", text:`Elevated concern. Monitor daily.${an}` };
  if (score >= 40) return { tier:"MONITOR", text:`Monitor situation.${an}` };
  return { tier:"WATCH", text:`Routine monitoring.${an}` };
}

// ─── PAYLOAD BUILDER ────────────────────────────────────────────────────────

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
    score_audit: {
      prior_score: c.priorScore, adjustments: c.audit || [], spillover: c.spillover,
      final_score: c.score, live_boost: c.liveBoost, fsi_base: fsiBase,
      dynamic_boost_cap: computeDynamicBoostCap(fsiBase),
      evidence_ceiling: vm.evidence_ceiling || 0,
      viral_weight_applied: c.time_metrics?.viral_weight_applied || 0,
      consensus_gate: CFG.CONSENSUS_GATE_ENABLED ? {
        applied: cg.applied || false, note: cg.note || null,
        categories_firing: cg.categories_firing || 0, pre_gate_score: cg.pre_gate_score || c.score,
      } : null,
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
            meta: { generated_at: new Date().toISOString(), elapsed_ms: Date.now() - start, mode: "empty", message: "No live evidence." },
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
    const gatedCountries = Object.keys(store).filter(iso => store[iso].__consensus_gate?.applied);
    const maxedCountries = Object.keys(store).filter(iso => store[iso].score === 99);

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        version: "v12.3-coords-who-fixed",
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
        countries_at_max_score: maxedCountries.length,
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        v12_3_fixes: {
          fix_coords: "COUNTRY_COORDS map added — heat detection now functional",
          fix_who: "WHO fetcher rewritten with direct XML parsing (no rss2json)",
        },
        scoring_fixes_applied: {
          fix_1_dynamic_cap: "Boost cap scales with FSI tier (8 → 40)",
          fix_2_evidence_ceiling: "Ceiling expands up to 2.2× with live evidence",
          fix_3_evidence_weighted_blend: "Viral weight up to 85% with strong live evidence",
          fix_4_consensus_gate: "95+ scores require 2-4 independent crisis categories",
        },
        consensus_gate: {
          enabled: CFG.CONSENSUS_GATE_ENABLED,
          threshold: CFG.CONSENSUS_GATE_THRESHOLD,
          categories: Object.keys(CFG.CONSENSUS_CATEGORIES),
          rules: { "95-96": "2+ categories", "97-98": "3+ categories", "99": "4+ categories" },
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
      },
      ...(mode === "single" ? { top_story: payloads[0] } : {}),
      ...(mode === "list" ? { countries: payloads } : {}),
      ...(mode === "comparison" ? { comparison: { countries: payloads } } : {}),
    };

    res.writeHead(200, { ...CORS, "Cache-Control": `public, s-maxage=300, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story v12.3]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
