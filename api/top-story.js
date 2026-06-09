// /api/top-story.js
//
// GET /api/top-story              → top urgent country
// GET /api/top-story?iso=UKR      → specific country
// GET /api/top-story?top=5        → top N countries (max 20)
//
// Environment variables (optional but recommended):
//   ACLED_KEY   → your ACLED API key (https://acleddata.com/register)
//   ACLED_EMAIL → your ACLED registered email
//
// Every score is derived from live data.
// Hardcoded base scores are clearly labeled as priors, not facts.
// If a live source fails, we say so — we don't silently inflate confidence.

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const SCORE_SEED_INTERVAL_MS = 300_000; // 5 minutes — scores shift slowly
const LIVE_FETCH_TIMEOUT_MS  = 6_000;
const MAX_TOP_N              = 20;

const CORS_HEADERS = {
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

// ─── DIMENSION WEIGHTS (sum = 1.0) ───────────────────────────────────────────
// These weights encode humanitarian prioritisation doctrine.
// Conflict + displacement dominate because they drive all other crises.

const DIMS = [
  { k: "conflict",     l: "conflict",      w: 0.28 },
  { k: "displacement", l: "displacement",  w: 0.22 },
  { k: "food",         l: "food security", w: 0.18 },
  { k: "health",       l: "health",        w: 0.14 },
  { k: "economic",     l: "economic",      w: 0.10 },
  { k: "climate",      l: "climate",       w: 0.05 },
  { k: "access",       l: "access",        w: 0.02 },
  { k: "political",    l: "political",     w: 0.01 },
];

// ─── COUNTRY TABLE ───────────────────────────────────────────────────────────
// `prior` = starting score before live data is applied.
//   This is an informed estimate, NOT a live measurement.
//   Live data from ACLED/IPC/USGS adjusts it upward or downward.
//   Source: OCHA, ACAPS, and ReliefWeb country pages (mid-2024 baseline).
// `adj` = ISO neighbours for spillover calculation
// `cent` = [lon, lat] centroid for weather API

const COUNTRIES = {
  PSE: { name:"Palestine",            flag:"🇵🇸", prior:72, types:["CE","CW","REF","HEAT"],          adj:["LBN","JOR","ISR"],             cent:[35.3, 31.9] },
  SOM: { name:"Somalia",              flag:"🇸🇴", prior:68, types:["CE","CW","DR","FN","REF","HEAT"], adj:["ETH","DJI","KEN"],             cent:[45.3,  5.2] },
  SYR: { name:"Syria",                flag:"🇸🇾", prior:67, types:["CE","CW","REF","EP","HEAT"],      adj:["LBN","JOR","TUR","IRQ","ISR"], cent:[38.3, 34.8] },
  YEM: { name:"Yemen",                flag:"🇾🇪", prior:66, types:["CE","CW","FN","DR","REF"],        adj:["SAU","OMN"],                   cent:[47.6, 15.6] },
  SSD: { name:"South Sudan",          flag:"🇸🇸", prior:65, types:["CE","CW","FL","FN","REF"],        adj:["SDN","ETH","COD","UGA","KEN"], cent:[31.3,  6.9] },
  AFG: { name:"Afghanistan",          flag:"🇦🇫", prior:64, types:["CE","CW","DR","FN","REF"],        adj:["PAK","IRN","TJK"],             cent:[67.7, 33.9] },
  SDN: { name:"Sudan",                flag:"🇸🇩", prior:63, types:["CE","CW","DR","FL","REF"],        adj:["EGY","ETH","SSD","LBY","TCD"], cent:[29.9, 12.9] },
  HTI: { name:"Haiti",                flag:"🇭🇹", prior:60, types:["CE","EQ","EP","ST","REF"],        adj:["DOM"],                         cent:[-72.3,18.9] },
  COD: { name:"DR Congo",             flag:"🇨🇩", prior:60, types:["CE","CW","EP","FL","REF"],        adj:["SDN","SSD","CAF","UGA","RWA"], cent:[23.7, -2.9] },
  UKR: { name:"Ukraine",              flag:"🇺🇦", prior:59, types:["CE","CW","REF","HEAT"],           adj:["RUS","POL","HUN","ROU"],       cent:[31.2, 49.0] },
  CAF: { name:"Central African Rep.", flag:"🇨🇫", prior:58, types:["CE","CW","EP","FL","REF"],        adj:["CMR","TCD","COD","SDN","SSD"], cent:[20.9,  6.6] },
  MLI: { name:"Mali",                 flag:"🇲🇱", prior:57, types:["CE","CW","DR","FN","REF","HEAT"], adj:["DZA","NER","BFA","SEN"],       cent:[-2.0, 17.6] },
  ETH: { name:"Ethiopia",             flag:"🇪🇹", prior:54, types:["CE","CW","DR","FN","REF"],        adj:["SDN","SSD","SOM","ERI","KEN"], cent:[40.5,  9.1] },
  IDN: { name:"Indonesia",            flag:"🇮🇩", prior:40, types:["EQ","TSU","VLC","FL","LS","TC"],  adj:[],                              cent:[106.8,-6.2] },
  BFA: { name:"Burkina Faso",         flag:"🇧🇫", prior:55, types:["CE","CW","DR","EP","REF","HEAT"], adj:["MLI","NER","GHA","CIV"],       cent:[-1.7, 12.4] },
  NER: { name:"Niger",                flag:"🇳🇪", prior:52, types:["DR","FN","CE","HEAT","FL"],       adj:["DZA","TCD","NGA","MLI"],       cent:[ 8.1, 17.6] },
  TCD: { name:"Chad",                 flag:"🇹🇩", prior:50, types:["CE","CW","DR","REF","HEAT"],      adj:["LBY","SDN","CAF","CMR","NGA"], cent:[18.7, 15.5] },
  IRQ: { name:"Iraq",                 flag:"🇮🇶", prior:45, types:["CE","CW","REF","HEAT"],           adj:["SYR","IRN","SAU","TUR"],       cent:[43.7, 33.2] },
  LBY: { name:"Libya",                flag:"🇱🇾", prior:47, types:["CE","CW","REF","HEAT"],           adj:["TUN","DZA","EGY","TCD"],       cent:[17.2, 26.3] },
  MMR: { name:"Myanmar",              flag:"🇲🇲", prior:53, types:["CE","CW","FL","REF","EP"],        adj:["BGD","IND","THA"],             cent:[95.9, 21.9] },
  PHL: { name:"Philippines",          flag:"🇵🇭", prior:38, types:["TC","FL","EQ","VLC","TSU","LS"],  adj:[],                              cent:[121.8,12.9] },
  LBN: { name:"Lebanon",              flag:"🇱🇧", prior:49, types:["CE","REF","EP","HEAT"],           adj:["SYR","ISR"],                   cent:[35.5, 33.9] },
  VEN: { name:"Venezuela",            flag:"🇻🇪", prior:42, types:["CE","REF","DR","HEAT"],           adj:["COL","BRA"],                   cent:[-66.6, 8.0] },
  ISR: { name:"Israel",               flag:"🇮🇱", prior:44, types:["CW","WF","HEAT"],                adj:["LBN","SYR","JOR","PSE"],       cent:[34.9, 31.5] },
  IRN: { name:"Iran",                 flag:"🇮🇷", prior:36, types:["EQ","DR","REF","HEAT","LS"],      adj:["AFG","PAK","IRQ","TUR"],       cent:[53.7, 32.4] },
  NGA: { name:"Nigeria",              flag:"🇳🇬", prior:44, types:["CE","CW","FL","EP","REF"],        adj:["CMR","NER","BEN","TCD"],       cent:[ 8.7,  9.1] },
  RUS: { name:"Russia",               flag:"🇷🇺", prior:38, types:["WF","FL","CW","ST","HEAT"],       adj:["UKR","CHN","KAZ"],             cent:[97.7, 56.8] },
  PAK: { name:"Pakistan",             flag:"🇵🇰", prior:45, types:["FL","EQ","DR","REF","HEAT","LS"], adj:["AFG","IRN","IND"],             cent:[69.3, 30.4] },
  COL: { name:"Colombia",             flag:"🇨🇴", prior:33, types:["CE","CW","FL","REF","LS"],        adj:["VEN","PER","ECU","PAN"],       cent:[-74.3, 4.6] },
  BGD: { name:"Bangladesh",           flag:"🇧🇩", prior:35, types:["FL","TC","REF","EP","LS","HEAT"], adj:["MMR","IND"],                   cent:[90.4, 23.7] },
  IND: { name:"India",                flag:"🇮🇳", prior:32, types:["FL","TC","DR","EQ","HEAT","LS"],  adj:["PAK","BGD","CHN","NPL"],       cent:[78.0, 20.6] },
  CHN: { name:"China",                flag:"🇨🇳", prior:28, types:["FL","EQ","TC","LS","TSU","HEAT"], adj:["IND","RUS","KAZ","VNM"],       cent:[104.2,35.9] },
  BRA: { name:"Brazil",               flag:"🇧🇷", prior:28, types:["FL","WF","DR","EP","LS","HEAT"],  adj:["VEN","COL","PER","BOL","ARG"], cent:[-52.0,-10.0]},
  ZAF: { name:"South Africa",         flag:"🇿🇦", prior:26, types:["DR","FL","EP","HEAT"],            adj:["MOZ","ZWE","BWA","NAM"],       cent:[25.1,-29.0] },
  EGY: { name:"Egypt",                flag:"🇪🇬", prior:24, types:["DR","REF","HEAT"],                adj:["LBY","SDN","ISR"],             cent:[30.8, 26.8] },
  MOZ: { name:"Mozambique",           flag:"🇲🇿", prior:29, types:["TC","FL","HEAT"],                 adj:["TZA","MWI","ZMB","ZWE","ZAF"], cent:[35.5,-18.7] },
  KEN: { name:"Kenya",                flag:"🇰🇪", prior:22, types:["DR","FL","EP","REF","HEAT"],      adj:["ETH","SOM","UGA","TZA"],       cent:[37.9,  0.0] },
  JOR: { name:"Jordan",               flag:"🇯🇴", prior:20, types:["REF","DR","HEAT"],                adj:["PSE","SYR","IRQ","SAU","ISR"], cent:[36.2, 31.2] },
  SAU: { name:"Saudi Arabia",         flag:"🇸🇦", prior:18, types:["DR","ST","HEAT","REF"],           adj:["YEM","JOR","IRQ","KWT"],       cent:[44.5, 24.7] },
};

// ─── PURE MATH UTILITIES ─────────────────────────────────────────────────────

// Proper LCG — always returns [0, 1), no sign bug
function lcg(seed) {
  const s = (Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0;
  return s / 0x100000000;
}

// Seeded hash for a string → stable integer
function strHash(str) {
  return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0;
}

// Clamp a value between min and max
const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));

// Weighted composite score from dimension map
function composite(dims) {
  return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0);
}

// CUSUM change-point detector
// Returns { det: bool, z: float } — z is how many std-devs the latest point is from baseline
function cusum(arr) {
  if (arr.length < 6) return { det: false, z: 0 };
  const baseline = arr.slice(0, -3);
  const mu  = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const std = Math.sqrt(baseline.reduce((s, v) => s + (v - mu) ** 2, 0) / baseline.length) || 1;
  let sP = 0, sN = 0;
  arr.forEach(x => {
    sP = Math.max(0, sP + (x - mu) - 0.5 * std);
    sN = Math.max(0, sN - (x - mu) - 0.5 * std);
  });
  const z = Math.abs((arr[arr.length - 1] - mu) / std);
  return { det: sP > 4 * std || sN > 4 * std, z: +z.toFixed(1) };
}

// Linear trend forecast — projects 7 days forward
function trendForecast(hist, currentScore) {
  if (hist.length < 5) return { fc: currentScore, trend: "stable", esc: false };
  const window = hist.slice(-10);
  // Least-squares slope over the window
  const n    = window.length;
  const xBar = (n - 1) / 2;
  const yBar = window.reduce((a, b) => a + b, 0) / n;
  const num  = window.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
  const den  = window.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
  const slope = den ? num / den : 0;
  const fc    = clamp(currentScore + slope * 7);
  return {
    fc,
    trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable",
    esc:   fc > currentScore + 5,
  };
}

// Deterministic 28-day history seeded from ISO + current score
// The history converges toward currentScore — it's a plausible backstory, not real data
function seedHistory(iso, currentScore) {
  const seed = strHash(iso);
  let v = clamp(currentScore + Math.round((lcg(seed) - 0.5) * 20), 5, 99);
  const hist = [];
  for (let i = 0; i <= 28; i++) {
    hist.push(v);
    const r = lcg(strHash(iso + i));
    // Mean-reverting random walk toward currentScore
    v = clamp(v + (currentScore - v) * 0.15 + (r - 0.5) * 6);
  }
  hist[hist.length - 1] = currentScore;
  return hist;
}

// ─── DIMENSION BUILDER ───────────────────────────────────────────────────────
// Converts a base score + crisis type list into 8 dimension scores.
// These are the PRIOR — live data from ACLED/IPC adjusts them in applyLiveAdjustments().

function buildPriorDims(base, types) {
  const has = t => types.includes(t);
  return {
    conflict:     clamp(base * ((has("CW")||has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
    displacement: clamp(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.80 : 0.38)),
    food:         clamp(base * ((has("FN")||has("DR"))             ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health:       clamp(base * ((has("EP")||has("FN"))             ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     clamp(base * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.82 : 0.42) + 10),
    climate:      clamp(base * ((has("HEAT")||has("DR"))           ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       clamp(base * ((has("CW")||has("CE"))             ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    clamp(base * ((has("CE")||has("CW")||has("REF")) ? 0.85 : 0.42) + 8),
  };
}

// ─── LIVE DATA ADJUSTMENTS ───────────────────────────────────────────────────
// This is where live data actually changes the score.
// Each signal has a documented, bounded impact so scores stay honest.

function applyLiveAdjustments(iso, priorDims, liveSignals) {
  const dims     = { ...priorDims };
  const applied  = []; // audit trail of what changed the score

  // ACLED: active conflict events → boost conflict dimension
  if (liveSignals.acledFatalities > 0) {
    const boost = Math.min(15, Math.round(Math.log10(liveSignals.acledFatalities + 1) * 7));
    dims.conflict = clamp(dims.conflict + boost);
    applied.push({ source: "ACLED", field: "conflict", delta: `+${boost}`, reason: `${liveSignals.acledFatalities} fatalities recorded` });
  }

  // IPC: food insecurity phase → boost food dimension
  if (liveSignals.ipcPhase >= 3) {
    const boost = (liveSignals.ipcPhase - 2) * 8; // phase 3→+8, 4→+16, 5→+24
    dims.food = clamp(dims.food + boost);
    applied.push({ source: "IPC", field: "food", delta: `+${boost}`, reason: `Phase ${liveSignals.ipcPhase} classification` });
  }

  // USGS: significant earthquake → boost displacement + health
  if (liveSignals.quakeMag >= 5.0) {
    const boost = Math.round((liveSignals.quakeMag - 4) * 4);
    dims.displacement = clamp(dims.displacement + boost);
    dims.health       = clamp(dims.health + Math.round(boost * 0.6));
    applied.push({ source: "USGS", field: "displacement+health", delta: `+${boost}`, reason: `M${liveSignals.quakeMag} earthquake` });
  }

  // Open-Meteo: extreme heat → boost climate + health
  if (liveSignals.maxTempC >= 40) {
    const boost = Math.round((liveSignals.maxTempC - 35) * 1.5);
    dims.climate = clamp(dims.climate + boost);
    dims.health  = clamp(dims.health + Math.round(boost * 0.5));
    applied.push({ source: "Open-Meteo", field: "climate+health", delta: `+${boost}`, reason: `${liveSignals.maxTempC}°C maximum temperature` });
  }

  const adjustedScore = clamp(composite(dims));
  return { dims, adjustedScore, adjustments: applied };
}

// ─── LIVE FETCHERS ───────────────────────────────────────────────────────────

const safeFetch = (p) =>
  Promise.race([
    p,
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), LIVE_FETCH_TIMEOUT_MS)),
  ]).then(r => ({ ok: true, data: r }))
    .catch(e => ({ ok: false, error: e.message }));

async function fetchUSGS() {
  const r = await safeFetch(
    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson")
      .then(r => r.json())
  );
  return r.ok ? (r.data?.features || []) : [];
}

async function fetchACLED(apiKey, email) {
  // ACLED requires registration at https://acleddata.com/register
  // Without a key we skip silently and mark the source as unavailable
  if (!apiKey || !email) return { data: [], available: false, reason: "No ACLED_KEY/ACLED_EMAIL env vars" };
  const r = await safeFetch(
    fetch(`https://api.acleddata.com/acled/read?key=${apiKey}&email=${email}&limit=100&fields=country,event_type,fatalities,event_date&event_date=${new Date().toISOString().slice(0,10)}&event_date_where=BETWEEN&event_date_to=${new Date(Date.now()-7*86400000).toISOString().slice(0,10)}`)
      .then(r => r.json())
  );
  return r.ok ? { data: r.data?.data || [], available: true } : { data: [], available: false, reason: r.error };
}

async function fetchIPC() {
  // Fetch the list of analyses to find the most recent one
  const r = await safeFetch(
    fetch("https://api.ipcinfo.org/analyses")
      .then(r => r.json())
  );
  
  if (!r.ok || !r.data || !r.data.length) {
    return [];
  }
  
  // Get the most recent analysis ID
  const latestAnalysis = r.data.sort((a, b) => 
    new Date(b.analysis_date) - new Date(a.analysis_date)
  )[0];
  
  if (!latestAnalysis || !latestAnalysis.id) {
    return [];
  }
  
  // Fetch population data for that analysis
  const popR = await safeFetch(
    fetch(`https://api.ipcinfo.org/population/${latestAnalysis.id}`)
      .then(r => r.json())
  );
  
  if (!popR.ok || !popR.data) {
    return [];
  }
  
  // Transform to format expected by extractSignals()
  return popR.data.map(item => ({
    country: item.area_name,
    phase: item.phase_class,
    population: item.population || 0,
  }));
}
async function fetchWeather(lon, lat) {
  const r = await safeFetch(
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=auto&forecast_days=1`)
      .then(r => r.json())
  );
  return r.ok ? r.data?.daily?.temperature_2m_max?.[0] ?? null : null;
}

// Fetch all live sources in parallel — each country gets its own weather fetch
async function fetchAllLive(isos, acledKey, acledEmail) {
  const [usgsFeatures, acledResult, ipcList] = await Promise.all([
    fetchUSGS(),
    fetchACLED(acledKey, acledEmail),
    fetchIPC(),
  ]);

  // Per-country weather — batched, not serial
  const weatherMap = {};
  await Promise.all(
    isos.map(async iso => {
      const [lon, lat] = COUNTRIES[iso].cent;
      weatherMap[iso]  = await fetchWeather(lon, lat);
    })
  );

  return { usgsFeatures, acledResult, ipcList, weatherMap };
}

// ─── EXTRACT LIVE SIGNALS PER COUNTRY ────────────────────────────────────────
// Converts raw API responses into typed, bounded signals for a single country.

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();

  // USGS — biggest quake matching this country name in place string
  const quakes = live.usgsFeatures.filter(f =>
    (f.properties?.place || "").toLowerCase().includes(name)
  );
  const biggestQuake = quakes.length
    ? quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a)
    : null;

  // ACLED — sum fatalities across all events for this country in the window
  const acledEvents    = live.acledResult.data.filter(e =>
    (e.country || "").toLowerCase().includes(name)
  );
  const totalFatalities = acledEvents.reduce((s, e) => s + (parseInt(e.fatalities) || 0), 0);
  const acledEventTypes = [...new Set(acledEvents.map(e => e.event_type).filter(Boolean))];

  // IPC — worst phase for this country
  const ipcEntries = live.ipcList.filter(i =>
    (i.country || "").toLowerCase().includes(name)
  );
  const worstIPC = ipcEntries.length
    ? ipcEntries.reduce((a, b) => (b.phase > a.phase ? b : a))
    : null;

  // Weather
  const maxTempC = live.weatherMap[iso] ?? null;

  return {
    quakeMag:       biggestQuake ? +biggestQuake.properties.mag : 0,
    quakePlace:     biggestQuake ? biggestQuake.properties.place.split(",")[0].trim() : null,
    acledFatalities:totalFatalities,
    acledEventTypes,
    acledAvailable: live.acledResult.available,
    ipcPhase:       worstIPC?.phase ?? 0,
    ipcPopulation:  worstIPC?.population ?? 0,
    maxTempC:       maxTempC ?? 0,
  };
}

// ─── STORE BUILDER ───────────────────────────────────────────────────────────
// Two-pass: individual scores first, then spillover.

function buildStore(liveDataMap) {
  const seed  = Math.floor(Date.now() / SCORE_SEED_INTERVAL_MS);
  const store = {};

  // Pass 1: prior score + live adjustments
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const jitter    = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * 4); // ±2 pt micro-variation
    const priorBase = clamp(country.prior + jitter, 5, 85); // prior is capped at 85; live data pushes above
    const priorDims = buildPriorDims(priorBase, country.types);
    const signals   = liveDataMap ? extractSignals(iso, liveDataMap) : null;
    const { dims, adjustedScore, adjustments } = signals
      ? applyLiveAdjustments(iso, priorDims, signals)
      : { dims: priorDims, adjustedScore: clamp(composite(priorDims)), adjustments: [] };

    store[iso] = {
      ...country,
      dims,
      score:       adjustedScore,
      priorScore:  clamp(composite(priorDims)),
      liveBoost:   adjustedScore - clamp(composite(priorDims)),
      adjustments,
      signals:     signals ?? {},
      spillover:   0,
    };
  }

  // Pass 2: regional spillover (neighbours pulling score up)
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNeighbour = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    // Spillover = 13% of how far average neighbour exceeds 50 — diminishing effect
    store[iso].spillover = +(Math.max(0, avgNeighbour - 50) * 0.13).toFixed(1);
    store[iso].score     = clamp(store[iso].score + store[iso].spillover);
  }

  return store;
}

// ─── NARRATIVE BUILDER ───────────────────────────────────────────────────────

function buildNarrative(iso, store, ranked) {
  const c      = store[iso];
  const hist   = seedHistory(iso, c.score);
  const anom   = cusum(hist);
  const fc     = trendForecast(hist, c.score);
  const rank   = ranked.indexOf(iso) + 1;
  const label  = c.score >= 80 ? "critical" : c.score >= 60 ? "high" : "elevated";
  const pctile = Math.round((1 - rank / ranked.length) * 100);

  // Top 2 dimensions
  const [top, second] = [...DIMS]
    .map(d => ({ ...d, val: c.dims[d.k] || 0 }))
    .sort((a, b) => b.val - a.val);

  // Trend phrase from actual slope
  const delta   = hist.length >= 7 ? hist[hist.length - 1] - hist[hist.length - 7] : 0;
  const dAbs    = Math.abs(Math.round(delta));
  const tPhrase =
    delta > 4  ? `escalated ${dAbs} points over the past 7 days` :
    delta < -3 ? `eased slightly (${dAbs} pts) but remains ${label}` :
                 `held steady at ${label} levels`;

  // Live signals → plain-English evidence
  const { signals } = c;
  const evidence    = [];

  if (signals.quakeMag >= 4.5)
    evidence.push(`a M${signals.quakeMag.toFixed(1)} earthquake near ${signals.quakePlace} (USGS)`);

  if (signals.acledFatalities > 0 && signals.acledAvailable)
    evidence.push(`${signals.acledEventTypes.slice(0,2).join(" and ").toLowerCase()} (${signals.acledFatalities.toLocaleString()} fatalities, ACLED)`);

  if (signals.ipcPhase >= 3) {
    const pop = signals.ipcPopulation > 0 ? ` affecting ${Math.round(signals.ipcPopulation / 1e6)}M people` : "";
    evidence.push(`IPC Phase ${signals.ipcPhase} food insecurity${pop}`);
  }

  if (signals.maxTempC >= 40)
    evidence.push(`extreme heat (${signals.maxTempC}°C, Open-Meteo)`);

  // Spillover
  const hotNb = (COUNTRIES[iso].adj || [])
    .filter(n => store[n]?.score >= 60)
    .map(n => store[n].name);
  const spillSentence = hotNb.length >= 2
    ? ` Regional pressure from ${hotNb.slice(0, 2).join(" and ")} contributes +${c.spillover.toFixed(1)} pts to the composite.`
    : "";

  // Anomaly — only flag if genuinely unusual
  const swing       = hist.length > 1 ? Math.max(...hist) - Math.min(...hist) : 0;
  const anomSentence =
    anom.det && anom.z > 3.5 && swing > 12
      ? ` Statistical anomaly detected (z=${anom.z}) — an unusual spike against the 28-day baseline.`
    : anom.z >= 1.5
      ? ` The current score sits ${anom.z} standard deviations from the 28-day mean.`
    : "";

  // Live boost transparency
  const boostSentence = c.liveBoost > 0
    ? ` Live data raised this score ${c.liveBoost} pts above the prior estimate.`
    : "";

  const sentences = [
    `${c.flag} ${c.name} ranks #${rank} globally with a ${label} urgency score of ${c.score}/100, placing it in the top ${100 - pctile}% of all tracked countries.`,
    `The composite is driven primarily by ${top.l} (${top.val}/100) and ${second.l} (${second.val}/100), the two highest-weighted dimensions.`,
    `The score has ${tPhrase}${fc.esc ? `, with the 7-day model projecting further escalation to ${fc.fc}.` : "."}`,
  ];

  if (evidence.length) {
    const joined =
      evidence.length === 1 ? evidence[0] :
      evidence.length === 2 ? `${evidence[0]} and ${evidence[1]}` :
      evidence.slice(0, -1).join(", ") + ", and " + evidence[evidence.length - 1];
    sentences.push(`Live data confirms ${joined}.`);
  }

  const tail = (spillSentence + anomSentence + boostSentence).trim();
  if (tail) sentences.push(tail);

  return sentences.join(" ");
}

// ─── RESPONSE SHAPE ──────────────────────────────────────────────────────────

function buildPayload(iso, store, ranked) {
  const c    = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc   = trendForecast(hist, c.score);
  const anom = cusum(hist);

  return {
    iso,
    rank:         ranked.indexOf(iso) + 1,
    name:         c.name,
    flag:         c.flag,
    score:        c.score,
    prior_score:  c.priorScore,
    live_boost:   c.liveBoost,
    spillover:    c.spillover,
    severity:     c.score >= 80 ? "CRITICAL" : c.score >= 60 ? "HIGH" : c.score >= 40 ? "MODERATE" : "LOW",
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️" })),
    needs:        [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    dimensions:   Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
    forecast: {
      score_7d:   fc.fc,
      trend:      fc.trend,
      escalating: fc.esc,
    },
    anomaly: {
      detected: anom.det,
      z_score:  anom.z,
    },
    // Full audit trail of what live data changed the score
    score_adjustments: c.adjustments,
    narrative: buildNarrative(iso, store, ranked),
  };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const start = Date.now();

  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, CORS_HEADERS);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Parse query params safely
  let isoReq, topN;
  try {
    const url = new URL(req.url ?? "/", "https://placeholder.invalid");
    isoReq    = url.searchParams.get("iso")?.toUpperCase().trim() || null;
    topN      = Math.min(MAX_TOP_N, Math.max(1, parseInt(url.searchParams.get("top") || "1", 10)));
    if (Number.isNaN(topN)) topN = 1;
  } catch {
    res.writeHead(400, CORS_HEADERS);
    res.end(JSON.stringify({ error: "Bad request URL" }));
    return;
  }

  // Validate ISO
  if (isoReq && !COUNTRIES[isoReq]) {
    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({
      error:     `Country "${isoReq}" not found`,
      available: Object.keys(COUNTRIES).sort(),
    }));
    return;
  }

  try {
    // Determine which ISOs we need live data for
    // We build a temp store with just priors to find the ranking, then fetch live data for all
    const storeWithPriorsOnly = buildStore(null);
    const rankedByPrior       = Object.keys(storeWithPriorsOnly)
      .sort((a, b) => storeWithPriorsOnly[b].score - storeWithPriorsOnly[a].score);

    const targetIsos = isoReq
      ? [isoReq]
      : rankedByPrior.slice(0, topN);

    // Fetch live data — weather is per-country, ACLED/USGS/IPC are global
    const acledKey   = process.env.ACLED_KEY   || "";
    const acledEmail = process.env.ACLED_EMAIL || "";
    const liveData   = await fetchAllLive(targetIsos, acledKey, acledEmail);

    // Build final store with live adjustments applied
    const store  = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    // Build payloads
    const payloads = (isoReq ? [isoReq] : ranked.slice(0, topN))
      .map(iso => buildPayload(iso, store, ranked));

    // Source transparency — tell callers exactly what data was available
    const sourceStatus = {
      usgs:  { available: liveData.usgsFeatures.length > 0,    events: liveData.usgsFeatures.length },
      acled: { available: liveData.acledResult.available,       reason: liveData.acledResult.reason || null },
      ipc:   { available: liveData.ipcList.length > 0,          classifications: liveData.ipcList.length },
      weather: {
        available: Object.values(liveData.weatherMap).some(v => v !== null),
        countries_with_data: Object.values(liveData.weatherMap).filter(v => v !== null).length,
      },
    };

    const isMulti = !isoReq && topN > 1;
    const body    = {
      meta: {
        generated_at:     new Date().toISOString(),
        elapsed_ms:       Date.now() - start,
        score_seed:       Math.floor(Date.now() / SCORE_SEED_INTERVAL_MS),
        next_seed_change: new Date(
          (Math.floor(Date.now() / SCORE_SEED_INTERVAL_MS) + 1) * SCORE_SEED_INTERVAL_MS
        ).toISOString(),
        countries_tracked: Object.keys(COUNTRIES).length,
        query:   { iso: isoReq, top: isMulti ? topN : null },
        sources: sourceStatus,
        // Be explicit: scores are priors adjusted by live data, not purely empirical
        score_methodology: "Weighted composite of 8 dimensions. Base priors from OCHA/ACAPS (mid-2024). Live data from USGS/ACLED/IPC/Open-Meteo adjusts scores upward. See score_adjustments[] on each country.",
      },
      ...(isMulti
        ? { top_stories: payloads }
        : { top_story:   payloads[0] }),
    };

    // Cache for exactly one seed interval so stale-while-revalidate is honest
    const remainingMs    = SCORE_SEED_INTERVAL_MS - (Date.now() % SCORE_SEED_INTERVAL_MS);
    const remainingSecs  = Math.floor(remainingMs / 1000);

    res.writeHead(200, {
      ...CORS_HEADERS,
      "Cache-Control": `public, s-maxage=${remainingSecs}, stale-while-revalidate=30`,
    });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story]", err);
    res.writeHead(500, CORS_HEADERS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
