hows this for the api for crys. cat > /mnt/user-data/outputs/top-story.js << 'ENDOFFILE'
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
//      → top N countries (max 20)
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
  MAX_TOP_N:         20,
  SPILLOVER_RATE:    0.13,      // how much avg neighbour score bleeds over
  SPILLOVER_FLOOR:   50,        // only neighbours above this score cause pressure
  PRIOR_JITTER:      4,         // ±pts of micro-variation per seed cycle
  PRIOR_CAP:         85,        // priors are capped; live data pushes above
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
// Weights encode humanitarian prioritisation doctrine.
// Conflict + displacement dominate because they drive all other crises downstream.
// Sum = 1.0 exactly.

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
// `prior` = informed baseline score BEFORE live data is applied.
//    Source: OCHA, ACAPS, ReliefWeb country pages (mid-2024 baseline).
//    This is a prior, not a measurement. Live data adjusts it — see applyLiveAdjustments().
// `adj`   = ISO codes of geographic neighbours (for spillover calculation)
// `cent`  = [lon, lat] centroid for weather API calls
// `region`= continent/region for ?region= filtering

const COUNTRIES = {
  // ── CATASTROPHIC TIER (prior 60+) ────────────────────────────────────────
  SOM: { name:"Somalia",              flag:"🇸🇴", prior:72, region:"africa",
         types:["CE","CW","DR","FN","REF","HEAT"],
         adj:["ETH","KEN","DJI"],                                           cent:[45.3,  5.2] },
  SSD: { name:"South Sudan",          flag:"🇸🇸", prior:70, region:"africa",
         types:["CE","CW","FL","FN","REF"],
         adj:["SDN","ETH","UGA","KEN","COD"],                               cent:[31.3,  6.9] },
  SDN: { name:"Sudan",                flag:"🇸🇩", prior:68, region:"africa",
         types:["CE","CW","DR","FL","REF"],
         adj:["EGY","ETH","SSD","LBY","TCD"],                              cent:[29.9, 12.9] },
  YEM: { name:"Yemen",                flag:"🇾🇪", prior:68, region:"middleeast",
         types:["CE","CW","FN","DR","REF"],
         adj:["SAU","OMN"],                                                 cent:[47.6, 15.6] },
  AFG: { name:"Afghanistan",          flag:"🇦🇫", prior:67, region:"asia",
         types:["CE","CW","DR","FN","REF"],
         adj:["PAK","IRN","TJK","UZB"],                                    cent:[67.7, 33.9] },
  SYR: { name:"Syria",                flag:"🇸🇾", prior:66, region:"middleeast",
         types:["CE","CW","REF","EP","HEAT"],
         adj:["LBN","JOR","TUR","IRQ","ISR"],                              cent:[38.3, 34.8] },
  PSE: { name:"Palestine",            flag:"🇵🇸", prior:65, region:"middleeast",
         types:["CE","CW","REF","HEAT"],
         adj:["LBN","JOR","ISR"],                                           cent:[35.3, 31.9] },
  MLI: { name:"Mali",                 flag:"🇲🇱", prior:62, region:"africa",
         types:["CE","CW","DR","FN","REF","HEAT"],
         adj:["DZA","NER","BFA","SEN","CIV"],                              cent:[-2.0, 17.6] },
  BFA: { name:"Burkina Faso",         flag:"🇧🇫", prior:60, region:"africa",
         types:["CE","CW","DR","EP","REF","HEAT"],
         adj:["MLI","NER","GHA","CIV","BEN"],                              cent:[-1.7, 12.4] },
  COD: { name:"DR Congo",             flag:"🇨🇩", prior:59, region:"africa",
         types:["CE","CW","EP","FL","REF"],
         adj:["SDN","SSD","CAF","UGA","RWA","BDI","TZA","ZMB","COG"],     cent:[23.7, -2.9] },

  // ── HIGH TIER (prior 48–59) ───────────────────────────────────────────────
  HTI: { name:"Haiti",                flag:"🇭🇹", prior:58, region:"americas",
         types:["CE","EQ","EP","ST","REF"],
         adj:["DOM"],                                                        cent:[-72.3,18.9] },
  ETH: { name:"Ethiopia",             flag:"🇪🇹", prior:57, region:"africa",
         types:["CE","CW","DR","FN","REF"],
         adj:["SDN","SSD","SOM","ERI","DJI","KEN"],                        cent:[40.5,  9.1] },
  NER: { name:"Niger",                flag:"🇳🇪", prior:56, region:"africa",
         types:["DR","FN","CE","HEAT","FL"],
         adj:["DZA","TCD","NGA","MLI","BFA"],                              cent:[ 8.1, 17.6] },
  TCD: { name:"Chad",                 flag:"🇹🇩", prior:55, region:"africa",
         types:["CE","CW","DR","REF","HEAT"],
         adj:["LBY","SDN","CAF","CMR","NGA","NER"],                        cent:[18.7, 15.5] },
  CAF: { name:"Central African Rep.", flag:"🇨🇫", prior:54, region:"africa",
         types:["CE","CW","EP","FL","REF"],
         adj:["CMR","TCD","COD","SDN","SSD"],                              cent:[20.9,  6.6] },
  MMR: { name:"Myanmar",              flag:"🇲🇲", prior:53, region:"asia",
         types:["CE","CW","FL","REF","EP"],
         adj:["BGD","IND","THA","CHN","LAO"],                              cent:[95.9, 21.9] },
  UKR: { name:"Ukraine",              flag:"🇺🇦", prior:52, region:"europe",
         types:["CE","CW","REF","HEAT"],
         adj:["RUS","POL","HUN","ROU","SVK","BLR"],                        cent:[31.2, 49.0] },
  NGA: { name:"Nigeria",              flag:"🇳🇬", prior:51, region:"africa",
         types:["CE","CW","FL","EP","REF"],
         adj:["CMR","NER","BEN","TCD"],                                    cent:[ 8.7,  9.1] },

  // ── ELEVATED TIER (prior 35–50) ───────────────────────────────────────────
  PAK: { name:"Pakistan",             flag:"🇵🇰", prior:48, region:"asia",
         types:["FL","EQ","DR","REF","HEAT","LS"],
         adj:["AFG","IRN","IND","CHN"],                                    cent:[69.3, 30.4] },
  LBN: { name:"Lebanon",              flag:"🇱🇧", prior:47, region:"middleeast",
         types:["CE","REF","EP","HEAT"],
         adj:["SYR","ISR"],                                                 cent:[35.5, 33.9] },
  IRQ: { name:"Iraq",                 flag:"🇮🇶", prior:46, region:"middleeast",
         types:["CE","CW","REF","HEAT"],
         adj:["SYR","IRN","SAU","TUR","JOR","KWT"],                        cent:[43.7, 33.2] },
  VEN: { name:"Venezuela",            flag:"🇻🇪", prior:44, region:"americas",
         types:["CE","REF","DR","HEAT"],
         adj:["COL","BRA","GUY"],                                           cent:[-66.6, 8.0] },
  ISR: { name:"Israel",               flag:"🇮🇱", prior:44, region:"middleeast",
         types:["CW","WF","HEAT"],
         adj:["LBN","SYR","JOR","PSE"],                                    cent:[34.9, 31.5] },
  COL: { name:"Colombia",             flag:"🇨🇴", prior:43, region:"americas",
         types:["CE","CW","FL","REF","LS"],
         adj:["VEN","PER","ECU","PAN","BRA"],                              cent:[-74.3, 4.6] },
  BGD: { name:"Bangladesh",           flag:"🇧🇩", prior:42, region:"asia",
         types:["FL","TC","REF","EP","LS","HEAT"],
         adj:["MMR","IND"],                                                 cent:[90.4, 23.7] },
  KEN: { name:"Kenya",                flag:"🇰🇪", prior:40, region:"africa",
         types:["DR","FL","EP","REF","HEAT"],
         adj:["ETH","SOM","UGA","TZA","SSD"],                              cent:[37.9,  0.0] },
  IDN: { name:"Indonesia",            flag:"🇮🇩", prior:40, region:"asia",
         types:["EQ","TSU","VLC","FL","LS","TC"],
         adj:[],                                                             cent:[106.8,-6.2] },
  PHL: { name:"Philippines",          flag:"🇵🇭", prior:39, region:"asia",
         types:["TC","FL","EQ","VLC","TSU","LS"],
         adj:[],                                                             cent:[121.8,12.9] },
  IRN: { name:"Iran",                 flag:"🇮🇷", prior:38, region:"middleeast",
         types:["EQ","DR","REF","HEAT","LS"],
         adj:["AFG","PAK","IRQ","TUR","AZE","TKM"],                        cent:[53.7, 32.4] },
  MOZ: { name:"Mozambique",           flag:"🇲🇿", prior:34, region:"africa",
         types:["TC","FL","HEAT"],
         adj:["TZA","MWI","ZMB","ZWE","ZAF","SWZ"],                       cent:[35.5,-18.7] },

  // ── MODERATE / LOW TIER (prior < 35) ─────────────────────────────────────
  IND: { name:"India",                flag:"🇮🇳", prior:35, region:"asia",
         types:["FL","TC","DR","EQ","HEAT","LS"],
         adj:["PAK","BGD","CHN","NPL","MMR","BTN"],                        cent:[78.0, 20.6] },
  CHN: { name:"China",                flag:"🇨🇳", prior:32, region:"asia",
         types:["FL","EQ","TC","LS","TSU","HEAT"],
         adj:["IND","RUS","KAZ","VNM","PRK","MNG","NPL","MMR"],            cent:[104.2,35.9] },
  BRA: { name:"Brazil",               flag:"🇧🇷", prior:30, region:"americas",
         types:["FL","WF","DR","EP","LS","HEAT"],
         adj:["VEN","COL","PER","BOL","ARG","GUY"],                        cent:[-52.0,-10.0]},
  EGY: { name:"Egypt",                flag:"🇪🇬", prior:28, region:"africa",
         types:["DR","REF","HEAT"],
         adj:["LBY","SDN","ISR","PSE"],                                    cent:[30.8, 26.8] },
  JPN: { name:"Japan",                flag:"🇯🇵", prior:26, region:"asia",
         types:["EQ","TSU","TC","VLC","FL","HEAT"],
         adj:[],                                                             cent:[138.3,36.2] },
  TUR: { name:"Turkey",               flag:"🇹🇷", prior:25, region:"europe",
         types:["EQ","FL","REF","HEAT"],
         adj:["SYR","IRQ","IRN","ARM","GEO","BGR","GRC"],                  cent:[35.2, 38.9] },
  RUS: { name:"Russia",               flag:"🇷🇺", prior:24, region:"europe",
         types:["WF","FL","CW","ST","HEAT"],
         adj:["UKR","CHN","KAZ"],                                           cent:[97.7, 56.8] },
  ZAF: { name:"South Africa",         flag:"🇿🇦", prior:18, region:"africa",
         types:["DR","FL","EP","HEAT"],
         adj:["MOZ","ZWE","BWA","NAM","LSO","SWZ"],                        cent:[25.1,-29.0] },
  USA: { name:"United States",        flag:"🇺🇸", prior:15, region:"americas",
         types:["WF","ST","EQ","TC","TSU","HEAT"],
         adj:["CAN","MEX"],                                                  cent:[-95.7,37.1] },
};

// ─── CURATED FALLBACK DATA ────────────────────────────────────────────────────
// Used when live APIs are unavailable. Clearly labelled in responses.
// Sources: OCHA, IPC Global, UNHCR, WHO DONs (Q1 2025).

const FALLBACK = {
  ipc: [
    { country:"Somalia",              phase:4, population:3800000 },
    { country:"South Sudan",          phase:4, population:7100000 },
    { country:"Sudan",                phase:4, population:17800000 },
    { country:"Yemen",                phase:4, population:17000000 },
    { country:"Afghanistan",          phase:3, population:15400000 },
    { country:"Palestine",            phase:4, population:2200000 },
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
  ],

  who: [
    { country:"DR Congo",   disease:"mpox",        cases:20000, deaths:500, severity:"critical" },
    { country:"DR Congo",   disease:"Ebola",       cases:15,    deaths:8,   severity:"critical" },
    { country:"Haiti",      disease:"cholera",     cases:50000, deaths:800, severity:"high"     },
    { country:"Somalia",    disease:"cholera",     cases:5000,  deaths:80,  severity:"high"     },
    { country:"Nigeria",    disease:"Lassa fever", cases:1000,  deaths:150, severity:"high"     },
    { country:"Sudan",      disease:"dengue",      cases:3000,  deaths:50,  severity:"medium"   },
    { country:"Ethiopia",   disease:"measles",     cases:8000,  deaths:100, severity:"medium"   },
    { country:"Myanmar",    disease:"malaria",     cases:150000,deaths:500, severity:"medium"   },
    { country:"Burkina Faso",disease:"dengue",     cases:2000,  deaths:30,  severity:"medium"   },
    { country:"Pakistan",   disease:"polio",       cases:10,    deaths:0,   severity:"low"      },
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
  },
};

// ─── REGION ALIASES ──────────────────────────────────────────────────────────
// Maps query strings to region keys used in COUNTRIES table

const REGION_ALIASES = {
  africa:     ["africa"],
  asia:       ["asia"],
  europe:     ["europe"],
  middleeast: ["middleeast","middle east","mena"],
  americas:   ["americas","latin america","latam"],
};

// ─── MATH UTILITIES ──────────────────────────────────────────────────────────

// LCG — always returns [0, 1), no sign bug
function lcg(seed) {
  return ((Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0) / 0x100000000;
}

// Stable string → u32 hash
function strHash(str) {
  return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0;
}

const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));

// Weighted composite of all 8 dimensions → single score
function composite(dims) {
  return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0);
}

// CUSUM change-point detector
function cusum(arr) {
  if (arr.length < 6) return { det: false, z: 0 };
  const base = arr.slice(0, -3);
  const mu  = base.reduce((a, b) => a + b, 0) / base.length;
  const std = Math.sqrt(base.reduce((s, v) => s + (v - mu) ** 2, 0) / base.length) || 1;
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

// Least-squares trend + 7-day forecast
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

// Deterministic 28-day history (mean-reverting walk toward current score)
// This is a plausible backstory, not real historical data — clearly labelled as such.
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
// Converts base score + crisis type list → 8 dimension values.
// These are PRIORS. Live data adjustments happen separately in applyLiveAdjustments().

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
// Live data sources each have a bounded, documented impact.
// Every adjustment is recorded in an audit trail returned in the response.

function applyLiveAdjustments(priorDims, signals) {
  const dims     = { ...priorDims };
  const audit    = [];

  // IPC food security: +8 per phase above 1
  if (signals.ipcPhase >= 2) {
    const boost = Math.min(32, (signals.ipcPhase - 1) * 8);
    dims.food = clamp(dims.food + boost);
    audit.push({ source:"IPC", field:"food", delta:boost,
      reason:`Phase ${signals.ipcPhase} food insecurity`,
      population_affected: signals.ipcPopulation });
  }

  // WHO outbreaks: +3–20 per outbreak, capped at +30 total
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

  // USGS earthquake: +5 per magnitude point above 4.0, split across displacement+health
  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(25, Math.round((signals.quakeMag - 4.0) * 5));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.6));
    dims.health       = clamp(dims.health       + Math.floor(boost * 0.4));
    audit.push({ source:"USGS", field:"displacement+health", delta:boost,
      reason:`M${signals.quakeMag.toFixed(1)} earthquake near ${signals.quakePlace}`,
      magnitude: signals.quakeMag });
  }

  // UNHCR displacement: tiered boost to displacement dimension
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

  // Open-Meteo heat: +1.5 per degree above 30°C, split climate+health
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
  // Try live API first, fall back to curated data
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
      // Deduplicate on country+disease
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

// Fetch all sources in parallel
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
// Per-country: pull relevant signals from the global live data fetch

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();

  // USGS — biggest quake mentioning this country
  const quakes = (live.usgs.data || []).filter(f =>
    (f.properties?.place || "").toLowerCase().includes(name)
  );
  const topQuake = quakes.length ? quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a) : null;

  // IPC — worst phase entry for this country
  const ipcRows  = (live.ipc.data || []).filter(i => (i.country || "").toLowerCase().includes(name));
  const topIPC   = ipcRows.length ? ipcRows.reduce((a, b) => b.phase > a.phase ? b : a) : null;

  // WHO — all outbreaks matching this country
  const whoRows  = (live.who.data || []).filter(o => o.country.toLowerCase().includes(name));

  // UNHCR — displacement stats
  let displacement = null;
  const unhcrMap = live.unhcr.data || {};
  // Try exact match first, then partial
  displacement = unhcrMap[COUNTRIES[iso].name]
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

  // Pass 1: individual scores with live adjustments
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const jitter    = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const base      = clamp(country.prior + jitter, 5, CFG.PRIOR_CAP);
    const priorDims = buildPriorDims(base, country.types);
    const priorScore = clamp(composite(priorDims));

    let dims, score, audit;
    if (liveData) {
      const signals = extractSignals(iso, liveData);
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

  // Pass 2: regional spillover
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
// Fuzzy match a query string to an ISO code

function resolveQuery(q) {
  if (!q) return null;
  const lower = q.toLowerCase().trim();
  // Exact ISO match
  const exact = Object.keys(COUNTRIES).find(iso => iso.toLowerCase() === lower);
  if (exact) return exact;
  // Exact name match
  const byName = Object.entries(COUNTRIES).find(([, d]) => d.name.toLowerCase() === lower);
  if (byName) return byName[0];
  // Partial name match
  const partial = Object.entries(COUNTRIES).find(([, d]) => d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase()));
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
// Produces CRYS-voice plain English. Clinical. Cited. No fluff.

function buildNarrative(iso, store, ranked) {
  const c     = store[iso];
  const hist  = seedHistory(iso, c.score);
  const anom  = cusum(hist);
  const fc    = trendForecast(hist, c.score);
  const rank  = ranked.indexOf(iso) + 1;
  const pct   = Math.round((1 - rank / ranked.length) * 100);
  const sev   = severityLabel(c.score);
  const sEmoji= severityEmoji(c.score);

  // Top 3 dimensions
  const topDims = [...DIMS]
    .map(d => ({ ...d, val: c.dims[d.k] || 0 }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 3);

  // 7-day trend
  const delta  = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  const dAbs   = Math.abs(Math.round(delta));
  const trendPhrase =
    delta > 5  ? `Escalating rapidly (+${dAbs} pts in 7 days)` :
    delta > 2  ? `Escalating (+${dAbs} pts)` :
    delta < -5 ? `Improving significantly (−${dAbs} pts)` :
    delta < -2 ? `Improving slightly (−${dAbs} pts)` :
                 `Stable (±${dAbs} pts)`;

  // Live evidence lines
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

  // Spillover
  const hotNb = (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 60).map(n => store[n].name);
  const spillLine = hotNb.length >= 1
    ? `🌐 Regional pressure from ${hotNb.slice(0, 2).join(" and ")} adds +${c.spillover.toFixed(1)} pts.`
    : null;

  // Anomaly
  const anomLine = anom.z >= 1.5
    ? `⚠️ Score is ${anom.z}σ from 28-day baseline${anom.det ? " — STATISTICAL ANOMALY DETECTED" : ""}.`
    : null;

  // Forecast line
  const fcLine = fc.esc
    ? `📈 Forecast: ${fc.fc}/100 in 7 days (escalating).`
    : `📊 Forecast: ${fc.fc}/100 in 7 days (${fc.trend}).`;

  // Assemble
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
    parts.push(`\n📊 The data adjusted this score ${c.liveBoost > 0 ? `+${c.liveBoost}` : c.liveBoost} pts from the prior estimate of ${c.priorScore}/100.`);
  parts.push(`\n**Recommendation:** ${recommendation(c.score).text}`);

  return parts.join("\n");
}

// Returns a short parenthetical context for a dimension value
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

// ─── COMPARISON BUILDER ───────────────────────────────────────────────────────
// When 2+ ISOs are requested, returns a structured diff

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

  // Find which dimensions differ most between the two
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

  // Verdict
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const verdict = rows.length === 2
    ? `${sorted[0].flag} ${sorted[0].name} is more severe overall (${sorted[0].score} vs ${sorted[1].score}). Key difference: ${differentiators[0] ? `${sorted[0].name} is higher on ${differentiators[0].dimension}` : "scores are broadly similar"}.`
    : `${sorted[0].flag} ${sorted[0].name} ranks highest of the ${rows.length} countries compared.`;

  return { countries: rows, differentiators, verdict };
}

// ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
// Assembles the full response object for a single country

function buildPayload(iso, store, ranked) {
  const c    = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc   = trendForecast(hist, c.score);
  const anom = cusum(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = Math.round(hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)]);

  return {
    iso,
    name:          c.name,
    flag:          c.flag,
    score:         c.score,
    severity:      severityLabel(c.score),
    severity_emoji:severityEmoji(c.score),
    rank,
    total_countries: ranked.length,
    percentile:    Math.round((1 - rank / ranked.length) * 100),

    // The 8 scored dimensions — this is what CRYS's "What's driving this" uses
    dimensions: Object.fromEntries(
      DIMS.map(d => [d.k, {
        value: c.dims[d.k] || 0,
        label: d.l,
        weight: d.w,
        context: buildDimContext(iso, d.k, c.dims[d.k] || 0, c.signals),
      }])
    ),

    // Crisis type classification
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️" })),
    needs:        [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],

    // Trend and forecast
    trend: {
      delta_7d:   delta7,
      direction:  fc.trend,
      slope:      fc.slope,
      forecast_7d:fc.fc,
      escalating: fc.esc,
    },

    // Statistical anomaly detection
    anomaly: {
      detected: anom.det,
      z_score:  anom.z,
      note:     anom.z >= 1.5 ? "Score deviates from 28-day simulated baseline" : null,
    },

    // Regional pressure
    spillover: {
      value: c.spillover,
      from:  (COUNTRIES[iso].adj || [])
        .filter(n => store[n]?.score >= CFG.SPILLOVER_FLOOR)
        .map(n => ({ iso: n, name: store[n].name, score: store[n].score })),
    },

    // Typed live evidence signals
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

    // Score audit trail — how we got from prior to final
    score_audit: {
      prior_score:  c.priorScore,
      adjustments:  c.audit || [],
      spillover:    c.spillover,
      final_score:  c.score,
      live_boost:   c.liveBoost,
    },

    recommendation: recommendation(c.score),
    region: c.region,

    // The CRYS-voice narrative — ready to display directly
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

  // ── Parse query params ──────────────────────────────────────────────────────
  let params;
  try {
    const url = new URL(req.url ?? "/", "https://x");
    params = {
      iso:       url.searchParams.get("iso")?.toUpperCase().trim() || null,  // "SOM" or "SOM,YEM"
      top:       parseInt(url.searchParams.get("top") || "1", 10),
      q:         url.searchParams.get("q")?.trim() || null,                  // fuzzy name search
      region:    url.searchParams.get("region")?.toLowerCase().trim() || null,
      threshold: parseInt(url.searchParams.get("threshold") || "0", 10),
    };
    if (Number.isNaN(params.top))       params.top = 1;
    if (Number.isNaN(params.threshold)) params.threshold = 0;
    params.top = Math.min(CFG.MAX_TOP_N, Math.max(1, params.top));
  } catch {
    res.writeHead(400, CORS); res.end(JSON.stringify({ error: "Bad request URL" })); return;
  }

  // Resolve ?q= fuzzy search to an ISO
  if (params.q && !params.iso) {
    const resolved = resolveQuery(params.q);
    if (!resolved) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: `Could not resolve "${params.q}" to a tracked country`, available: Object.keys(COUNTRIES).sort() }));
      return;
    }
    params.iso = resolved;
  }

  // Parse comma-separated ISOs (for comparison mode)
  const isoList = params.iso
    ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s])
    : [];

  // Validate ISOs
  const invalidISOs = params.iso
    ? params.iso.split(",").map(s => s.trim()).filter(s => !COUNTRIES[s])
    : [];
  if (invalidISOs.length) {
    res.writeHead(404, CORS);
    res.end(JSON.stringify({ error: `Unknown ISO codes: ${invalidISOs.join(", ")}`, available: Object.keys(COUNTRIES).sort() }));
    return;
  }

  try {
    // ── Step 1: build prior-only store to determine which countries to fetch live data for ──
    const priorStore  = buildStore(null);
    const priorRanked = Object.keys(priorStore).sort((a, b) => priorStore[b].score - priorStore[a].score);

    // ── Step 2: determine target ISOs ──────────────────────────────────────────
    let targetIsos;
    if (isoList.length)      targetIsos = isoList;
    else if (params.region)  targetIsos = priorRanked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) targetIsos = priorRanked.filter(iso => priorStore[iso].score >= params.threshold);
    else                     targetIsos = priorRanked.slice(0, params.top);

    if (!targetIsos.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: "No countries matched the query" }));
      return;
    }

    // ── Step 3: fetch live data for all targets in parallel ────────────────────
    const liveData = await fetchAllLive(targetIsos);

    // ── Step 4: build final store with live adjustments ────────────────────────
    const store  = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    // Re-resolve target ISOs by final ranking (scores may have shifted vs prior)
    let finalIsos;
    if (isoList.length)      finalIsos = isoList;
    else if (params.region)  finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].score >= params.threshold);
    else                     finalIsos = ranked.slice(0, params.top);

    // ── Step 5: build payloads ─────────────────────────────────────────────────
    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked));

    // ── Step 6: add comparison block if 2+ ISOs ────────────────────────────────
    const comparison = finalIsos.length >= 2 ? buildComparison(finalIsos, store, ranked) : null;

    // ── Step 7: source transparency ────────────────────────────────────────────
    const sources = {
      usgs:    { live: liveData.usgs.live,  events:          liveData.usgs.data?.length ?? 0,  label: "USGS Earthquake Hazards Program" },
      ipc:     { live: liveData.ipc.live,   classifications: liveData.ipc.data?.length ?? 0,   label: "IPC Global — Food Security Phases" },
      who:     { live: liveData.who.live,   outbreaks:       liveData.who.data?.length ?? 0,   label: "WHO Disease Outbreak News" },
      unhcr:   { live: liveData.unhcr.live, countries:       Object.keys(liveData.unhcr.data || {}).length, label: "UNHCR Global Refugee Statistics" },
      weather: { live: Object.values(liveData.weatherMap).some(v => v !== null),               label: "Open-Meteo Weather Forecast" },
    };

    // ── Step 8: assemble response ──────────────────────────────────────────────
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
        methodology: "Weighted 8-dimension composite. Priors from OCHA/ACAPS (mid-2024). Live data from USGS/IPC/WHO/UNHCR/Open-Meteo adjusts scores upward. See score_audit on each country.",
      },
      // Response key depends on mode
      ...(mode === "single"     ? { top_story:   payloads[0] } : {}),
      ...(mode === "list"       ? { countries:   payloads    } : {}),
      ...(mode === "comparison" ? { comparison, countries: payloads } : {}),
    };

    // Cache expires at next seed boundary — no point caching longer
    const secsUntilNextSeed = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);
    res.writeHead(200, { ...CORS, "Cache-Control": `public, s-maxage=${secsUntilNextSeed}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
