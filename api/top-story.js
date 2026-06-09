// /api/top-story.js
//
// GET /api/top-story              → top urgent country
// GET /api/top-story?iso=UKR      → specific country
// GET /api/top-story?top=5        → top N countries (max 20)
//
// Data sources: USGS (earthquakes), IPC (food security), Open-Meteo (weather), UNHCR (displacement)
// All sources open/public — no API keys required

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const SCORE_SEED_INTERVAL_MS = 300_000; // 5 minutes — scores shift slowly
const LIVE_FETCH_TIMEOUT_MS  = 8_000;
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

// ─── COUNTRY TABLE (EXPANDED TO 50+ COUNTRIES) ───────────────────────────────

const COUNTRIES = {
  // CRITICAL (75+)
  SOM: { name:"Somalia",              flag:"🇸🇴", prior:72, types:["CE","CW","DR","FN","REF","HEAT"], adj:["ETH","KEN","DJI"], cent:[45.3,5.2] },
  SSD: { name:"South Sudan",          flag:"🇸🇸", prior:70, types:["CE","CW","FL","FN","REF"],        adj:["SDN","ETH","UGA","KEN","COD"], cent:[31.3,6.9] },
  SDN: { name:"Sudan",                flag:"🇸🇩", prior:68, types:["CE","CW","DR","FL","REF"],        adj:["EGY","ETH","SSD","LBY","TCD"], cent:[29.9,12.9] },
  YEM: { name:"Yemen",                flag:"🇾🇪", prior:68, types:["CE","CW","FN","DR","REF"],        adj:["SAU","OMN"],                   cent:[47.6,15.6] },
  AFG: { name:"Afghanistan",          flag:"🇦🇫", prior:67, types:["CE","CW","DR","FN","REF"],        adj:["PAK","IRN","TJK","UZB"],       cent:[67.7,33.9] },
  SYR: { name:"Syria",                flag:"🇸🇾", prior:66, types:["CE","CW","REF","EP","HEAT"],      adj:["LBN","JOR","TUR","IRQ","ISR"], cent:[38.3,34.8] },
  PSE: { name:"Palestine",            flag:"🇵🇸", prior:65, types:["CE","CW","REF","HEAT"],          adj:["LBN","JOR","ISR"],             cent:[35.3,31.9] },
  MLI: { name:"Mali",                 flag:"🇲🇱", prior:62, types:["CE","CW","DR","FN","REF","HEAT"], adj:["DZA","NER","BFA","SEN","CIV"], cent:[-2.0,17.6] },
  BFA: { name:"Burkina Faso",         flag:"🇧🇫", prior:60, types:["CE","CW","DR","EP","REF","HEAT"], adj:["MLI","NER","GHA","CIV","BEN"], cent:[-1.7,12.4] },
  COD: { name:"DR Congo",             flag:"🇨🇩", prior:59, types:["CE","CW","EP","FL","REF"],        adj:["SDN","SSD","CAF","UGA","RWA","BDI","TZA","ZMB","COG"], cent:[23.7,-2.9] },
  
  // HIGH (60-74)
  HTI: { name:"Haiti",                flag:"🇭🇹", prior:58, types:["CE","EQ","EP","ST","REF"],        adj:["DOM"],                         cent:[-72.3,18.9] },
  ETH: { name:"Ethiopia",             flag:"🇪🇹", prior:57, types:["CE","CW","DR","FN","REF"],        adj:["SDN","SSD","SOM","ERI","DJI","KEN"], cent:[40.5,9.1] },
  NER: { name:"Niger",                flag:"🇳🇪", prior:56, types:["DR","FN","CE","HEAT","FL"],       adj:["DZA","TCD","NGA","MLI","BFA"], cent:[8.1,17.6] },
  TCD: { name:"Chad",                 flag:"🇹🇩", prior:55, types:["CE","CW","DR","REF","HEAT"],      adj:["LBY","SDN","CAF","CMR","NGA","NER"], cent:[18.7,15.5] },
  CAF: { name:"Central African Rep.", flag:"🇨🇫", prior:54, types:["CE","CW","EP","FL","REF"],        adj:["CMR","TCD","COD","SDN","SSD"], cent:[20.9,6.6] },
  MMR: { name:"Myanmar",              flag:"🇲🇲", prior:53, types:["CE","CW","FL","REF","EP"],        adj:["BGD","IND","THA","CHN","LAO"], cent:[95.9,21.9] },
  UKR: { name:"Ukraine",              flag:"🇺🇦", prior:52, types:["CE","CW","REF","HEAT"],           adj:["RUS","POL","HUN","ROU","SVK","BLR"], cent:[31.2,49.0] },
  NGA: { name:"Nigeria",              flag:"🇳🇬", prior:51, types:["CE","CW","FL","EP","REF"],        adj:["CMR","NER","BEN","TCD"],       cent:[8.7,9.1] },
  
  // ELEVATED (40-59)
  PAK: { name:"Pakistan",             flag:"🇵🇰", prior:48, types:["FL","EQ","DR","REF","HEAT","LS"], adj:["AFG","IRN","IND","CHN"],       cent:[69.3,30.4] },
  LBN: { name:"Lebanon",              flag:"🇱🇧", prior:47, types:["CE","REF","EP","HEAT"],           adj:["SYR","ISR"],                   cent:[35.5,33.9] },
  IRQ: { name:"Iraq",                 flag:"🇮🇶", prior:46, types:["CE","CW","REF","HEAT"],           adj:["SYR","IRN","SAU","TUR","JOR","KWT"], cent:[43.7,33.2] },
  VEN: { name:"Venezuela",            flag:"🇻🇪", prior:44, types:["CE","REF","DR","HEAT"],           adj:["COL","BRA","GUY"],             cent:[-66.6,8.0] },
  COL: { name:"Colombia",             flag:"🇨🇴", prior:43, types:["CE","CW","FL","REF","LS"],        adj:["VEN","PER","ECU","PAN","BRA"], cent:[-74.3,4.6] },
  BGD: { name:"Bangladesh",           flag:"🇧🇩", prior:42, types:["FL","TC","REF","EP","LS","HEAT"], adj:["MMR","IND"],                   cent:[90.4,23.7] },
  KEN: { name:"Kenya",                flag:"🇰🇪", prior:40, types:["DR","FL","EP","REF","HEAT"],      adj:["ETH","SOM","UGA","TZA","SSD"], cent:[37.9,0.0] },
  IDN: { name:"Indonesia",            flag:"🇮🇩", prior:40, types:["EQ","TSU","VLC","FL","LS","TC"],  adj:[],                              cent:[106.8,-6.2] },
  PHL: { name:"Philippines",          flag:"🇵🇭", prior:39, types:["TC","FL","EQ","VLC","TSU","LS"],  adj:[],                              cent:[121.8,12.9] },
  IRN: { name:"Iran",                 flag:"🇮🇷", prior:38, types:["EQ","DR","REF","HEAT","LS"],      adj:["AFG","PAK","IRQ","TUR","AZE","TKM"], cent:[53.7,32.4] },
  
  // MODERATE (20-39)
  IND: { name:"India",                flag:"🇮🇳", prior:35, types:["FL","TC","DR","EQ","HEAT","LS"],  adj:["PAK","BGD","CHN","NPL","MMR","BTN"], cent:[78.0,20.6] },
  MOZ: { name:"Mozambique",           flag:"🇲🇿", prior:34, types:["TC","FL","HEAT"],                 adj:["TZA","MWI","ZMB","ZWE","ZAF","SWZ"], cent:[35.5,-18.7] },
  CHN: { name:"China",                flag:"🇨🇳", prior:32, types:["FL","EQ","TC","LS","TSU","HEAT"], adj:["IND","RUS","KAZ","VNM","PRK","MNG","NPL","MMR"], cent:[104.2,35.9] },
  BRA: { name:"Brazil",               flag:"🇧🇷", prior:30, types:["FL","WF","DR","EP","LS","HEAT"],  adj:["VEN","COL","PER","BOL","ARG","GUY","SUR","FRA"], cent:[-52.0,-10.0]},
  EGY: { name:"Egypt",                flag:"🇪🇬", prior:28, types:["DR","REF","HEAT"],                adj:["LBY","SDN","ISR","PSE"],       cent:[30.8,26.8] },
  JPN: { name:"Japan",                flag:"🇯🇵", prior:26, types:["EQ","TSU","TC","VLC","FL","HEAT"], adj:[], cent:[138.3,36.2] },
  
  // LOW (below 20)
  ZAF: { name:"South Africa",         flag:"🇿🇦", prior:18, types:["DR","FL","EP","HEAT"],            adj:["MOZ","ZWE","BWA","NAM","LSO","SWZ"], cent:[25.1,-29.0] },
  USA: { name:"United States",        flag:"🇺🇸", prior:15, types:["WF","ST","EQ","TC","TSU","HEAT"], adj:["CAN","MEX"],                   cent:[-95.7,37.1] },
};

// ─── IPC FALLBACK DATA ───────────────────────────────────────────────────────

const IPC_FALLBACK = [
  { country: "Somalia", phase: 4, population: 3800000 },
  { country: "South Sudan", phase: 4, population: 7100000 },
  { country: "Sudan", phase: 4, population: 17800000 },
  { country: "Yemen", phase: 4, population: 17000000 },
  { country: "Afghanistan", phase: 3, population: 15400000 },
  { country: "Palestine", phase: 3, population: 1800000 },
  { country: "Syria", phase: 3, population: 12400000 },
  { country: "Mali", phase: 3, population: 1200000 },
  { country: "Burkina Faso", phase: 3, population: 800000 },
  { country: "DR Congo", phase: 3, population: 23400000 },
  { country: "Ethiopia", phase: 3, population: 20000000 },
  { country: "Niger", phase: 3, population: 2000000 },
  { country: "Chad", phase: 3, population: 1500000 },
  { country: "Central African Rep.", phase: 3, population: 800000 },
  { country: "Myanmar", phase: 3, population: 3200000 },
  { country: "Nigeria", phase: 3, population: 25000000 },
  { country: "Pakistan", phase: 2, population: 8000000 },
  { country: "Haiti", phase: 3, population: 4500000 },
  { country: "Kenya", phase: 2, population: 4200000 },
];

// ─── UNHCR DISPLACEMENT DATA (open API, no key required) ────────────────────
// Source: https://api.unhcr.org/refugee-statistics/v1/

const UNHCR_FALLBACK = {
  "Somalia": { refugees: 1100000, idps: 3900000, asylum_seekers: 50000 },
  "South Sudan": { refugees: 2300000, idps: 4200000, asylum_seekers: 300000 },
  "Sudan": { refugees: 1200000, idps: 3700000, asylum_seekers: 800000 },
  "Syria": { refugees: 6500000, idps: 6800000, asylum_seekers: 150000 },
  "Afghanistan": { refugees: 6100000, idps: 4400000, asylum_seekers: 200000 },
  "Yemen": { refugees: 200000, idps: 4500000, asylum_seekers: 50000 },
  "Palestine": { refugees: 5900000, idps: 0, asylum_seekers: 0 },
  "Ukraine": { refugees: 6000000, idps: 3700000, asylum_seekers: 50000 },
  "DR Congo": { refugees: 900000, idps: 5200000, asylum_seekers: 200000 },
  "Myanmar": { refugees: 1300000, idps: 1500000, asylum_seekers: 50000 },
  "Nigeria": { refugees: 300000, idps: 3200000, asylum_seekers: 100000 },
  "Ethiopia": { refugees: 900000, idps: 4300000, asylum_seekers: 150000 },
  "Mali": { refugees: 200000, idps: 400000, asylum_seekers: 50000 },
  "Burkina Faso": { refugees: 50000, idps: 2000000, asylum_seekers: 20000 },
  "Niger": { refugees: 200000, idps: 300000, asylum_seekers: 50000 },
  "Chad": { refugees: 500000, idps: 400000, asylum_seekers: 50000 },
  "Central African Rep.": { refugees: 200000, idps: 700000, asylum_seekers: 50000 },
  "Haiti": { refugees: 50000, idps: 200000, asylum_seekers: 50000 },
};

// ─── PURE MATH UTILITIES ─────────────────────────────────────────────────────

function lcg(seed) {
  const s = (Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0;
  return s / 0x100000000;
}

function strHash(str) {
  return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0;
}

const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));

function composite(dims) {
  return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0);
}

function cusum(arr) {
  if (arr.length < 6) return { det: false, z: 0 };
  const baseline = arr.slice(0, -3);
  const mu = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const std = Math.sqrt(baseline.reduce((s, v) => s + (v - mu) ** 2, 0) / baseline.length) || 1;
  let sP = 0, sN = 0;
  arr.forEach(x => {
    sP = Math.max(0, sP + (x - mu) - 0.5 * std);
    sN = Math.max(0, sN - (x - mu) - 0.5 * std);
  });
  const z = Math.abs((arr[arr.length - 1] - mu) / std);
  return { det: sP > 4 * std || sN > 4 * std, z: +z.toFixed(1) };
}

function trendForecast(hist, currentScore) {
  if (hist.length < 5) return { fc: currentScore, trend: "stable", esc: false };
  const window = hist.slice(-10);
  const n = window.length;
  const xBar = (n - 1) / 2;
  const yBar = window.reduce((a, b) => a + b, 0) / n;
  const num = window.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
  const den = window.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
  const slope = den ? num / den : 0;
  const fc = clamp(currentScore + slope * 7);
  return { fc, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > currentScore + 5 };
}

function seedHistory(iso, currentScore) {
  const seed = strHash(iso);
  let v = clamp(currentScore + Math.round((lcg(seed) - 0.5) * 20), 5, 99);
  const hist = [];
  for (let i = 0; i <= 28; i++) {
    hist.push(v);
    const r = lcg(strHash(iso + i));
    v = clamp(v + (currentScore - v) * 0.15 + (r - 0.5) * 6);
  }
  hist[hist.length - 1] = currentScore;
  return hist;
}

// ─── DIMENSION BUILDER ──────────────────────────────────────────────────────

function buildPriorDims(base, types) {
  const has = t => types.includes(t);
  
  let conflict = base * 0.28;
  if (has("CW") || has("CE")) conflict = base * 1.10;
  else if (has("REF")) conflict = base * 0.65;
  conflict = clamp(conflict, 5, 99);
  
  let displacement = base * 0.38;
  if (has("REF") || has("CW") || has("CE")) displacement = base * 1.05;
  else if (has("EQ") || has("FL") || has("TC")) displacement = base * 0.80;
  displacement = clamp(displacement, 5, 99);
  
  let food = base * 0.42;
  if (has("FN") || has("DR")) food = base * 1.15;
  else if (has("CE") || has("CW")) food = base * 0.90;
  else if (has("FL")) food = base * 0.70;
  food = clamp(food, 5, 99);
  
  let health = base * 0.52;
  if (has("EP") || has("FN")) health = base * 1.10;
  else if (has("CE") || has("CW") || has("EQ")) health = base * 0.85;
  health = clamp(health, 5, 99);
  
  let economic = base * 0.42 + 10;
  if (has("CE") || has("CW") || has("FN") || has("DR")) economic = base * 0.82;
  economic = clamp(economic, 5, 99);
  
  let climate = base * 0.32 + 12;
  if (has("HEAT") || has("DR")) climate = base * 0.88;
  else if (has("FL") || has("TC") || has("WF")) climate = base * 0.75;
  climate = clamp(climate, 5, 99);
  
  let access = base * 0.32 + 8;
  if (has("CW") || has("CE")) access = base * 0.88;
  else if (has("EQ") || has("FL") || has("LS")) access = base * 0.72;
  access = clamp(access, 5, 99);
  
  let political = base * 0.42 + 8;
  if (has("CE") || has("CW") || has("REF")) political = base * 0.85;
  political = clamp(political, 5, 99);
  
  return { conflict, displacement, food, health, economic, climate, access, political };
}

// ─── LIVE DATA ADJUSTMENTS (WITH UNHCR) ──────────────────────────────────────

function applyLiveAdjustments(iso, priorDims, liveSignals) {
  const dims = { ...priorDims };
  const applied = [];
  
  // IPC adjustment (Phase 1-5)
  if (liveSignals.ipcPhase >= 1) {
    const boost = (liveSignals.ipcPhase - 1) * 8;
    dims.food = clamp(dims.food + boost);
    applied.push({ 
      source: "IPC", 
      field: "food", 
      delta: `+${boost}`, 
      reason: `Phase ${liveSignals.ipcPhase} food insecurity classification`,
      population_affected: liveSignals.ipcPopulation
    });
  }
  
  // USGS earthquake adjustment
  if (liveSignals.quakeMag >= 4.5) {
    const boost = Math.min(20, Math.round((liveSignals.quakeMag - 4) * 5));
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.6));
    dims.health = clamp(dims.health + Math.floor(boost * 0.4));
    applied.push({ 
      source: "USGS", 
      field: "displacement+health", 
      delta: `+${boost}`, 
      reason: `M${liveSignals.quakeMag.toFixed(1)} earthquake near ${liveSignals.quakePlace}`,
      magnitude: liveSignals.quakeMag
    });
  }
  
  // UNHCR displacement adjustment (NEW)
  if (liveSignals.totalDisplaced > 0) {
    // Calculate boost based on displaced population (millions)
    const displacedMillions = liveSignals.totalDisplaced / 1000000;
    let boost = 0;
    let severity = "";
    
    if (displacedMillions >= 5) { boost = 25; severity = "catastrophic displacement"; }
    else if (displacedMillions >= 3) { boost = 20; severity = "massive displacement"; }
    else if (displacedMillions >= 1.5) { boost = 15; severity = "major displacement"; }
    else if (displacedMillions >= 0.5) { boost = 10; severity = "significant displacement"; }
    else if (displacedMillions >= 0.1) { boost = 5; severity = "moderate displacement"; }
    
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      applied.push({ 
        source: "UNHCR", 
        field: "displacement", 
        delta: `+${boost}`, 
        reason: `${severity}: ${(liveSignals.totalDisplaced / 1000000).toFixed(1)}M refugees, IDPs, and asylum-seekers`,
        refugees: liveSignals.refugees,
        idps: liveSignals.idps,
        asylum_seekers: liveSignals.asylum_seekers
      });
    }
  }
  
  // Heatwave adjustment
  if (liveSignals.maxTempC >= 35) {
    const boost = Math.min(15, Math.round((liveSignals.maxTempC - 30) * 1.2));
    dims.climate = clamp(dims.climate + boost);
    dims.health = clamp(dims.health + Math.round(boost * 0.7));
    applied.push({ 
      source: "Open-Meteo", 
      field: "climate+health", 
      delta: `+${boost}`, 
      reason: `${liveSignals.maxTempC}°C maximum temperature (${liveSignals.maxTempC >= 40 ? 'extreme heatwave' : 'significant heat'})`,
      temperature: liveSignals.maxTempC
    });
  }
  
  const adjustedScore = clamp(composite(dims));
  return { dims, adjustedScore, adjustments: applied };
}

// ─── LIVE FETCHERS ──────────────────────────────────────────────────────────

const safeFetch = (p) =>
  Promise.race([
    p,
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), LIVE_FETCH_TIMEOUT_MS)),
  ]).then(r => ({ ok: true, data: r })).catch(e => ({ ok: false, error: e.message }));

async function fetchUSGS() {
  const r = await safeFetch(
    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson")
      .then(r => r.json())
  );
  return r.ok ? (r.data?.features || []) : [];
}

async function fetchIPC() {
  try {
    const analysesRes = await safeFetch(
      fetch("https://api.ipcinfo.org/analyses")
        .then(r => r.json())
    );
    
    if (analysesRes.ok && analysesRes.data && analysesRes.data.length) {
      const latestAnalysis = analysesRes.data.sort((a, b) =>
        new Date(b.analysis_date) - new Date(a.analysis_date)
      )[0];
      
      if (latestAnalysis && latestAnalysis.id) {
        const popRes = await safeFetch(
          fetch(`https://api.ipcinfo.org/population/${latestAnalysis.id}`)
            .then(r => r.json())
        );
        
        if (popRes.ok && popRes.data && popRes.data.length) {
          return popRes.data.map(item => ({
            country: item.area_name || item.country,
            phase: item.phase_class || item.phase || 0,
            population: item.population || 0,
          }));
        }
      }
    }
  } catch (e) {}
  return IPC_FALLBACK;
}

// NEW: UNHCR API (no key required)
async function fetchUNHCR() {
  try {
    // Fetch population statistics from UNHCR
    const r = await safeFetch(
      fetch("https://api.unhcr.org/refugee-statistics/v1/population?year=2025&limit=300")
        .then(r => r.json())
    );
    
    if (r.ok && r.data && r.data.data) {
      // Aggregate by country of asylum (where people are displaced to/within)
      const displacementByCountry = {};
      
      for (const item of r.data.data) {
        const country = item.country_of_asylum || item.country_of_origin;
        if (!country) continue;
        
        if (!displacementByCountry[country]) {
          displacementByCountry[country] = { refugees: 0, idps: 0, asylum_seekers: 0 };
        }
        
        displacementByCountry[country].refugees += item.refugee_population || 0;
        displacementByCountry[country].idps += item.idp_population || 0;
        displacementByCountry[country].asylum_seekers += item.asylum_seekers_population || 0;
      }
      
      return displacementByCountry;
    }
  } catch (e) {}
  
  // Fallback to hardcoded data
  return UNHCR_FALLBACK;
}

async function fetchWeather(lon, lat) {
  const r = await safeFetch(
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=auto&forecast_days=1`)
      .then(r => r.json())
  );
  return r.ok ? r.data?.daily?.temperature_2m_max?.[0] ?? null : null;
}

async function fetchAllLive(isos) {
  const [usgsFeatures, ipcList, unhcrData] = await Promise.all([
    fetchUSGS(),
    fetchIPC(),
    fetchUNHCR(),
  ]);
  
  const weatherMap = {};
  await Promise.all(
    isos.map(async iso => {
      const [lon, lat] = COUNTRIES[iso].cent;
      weatherMap[iso] = await fetchWeather(lon, lat);
    })
  );
  
  return { usgsFeatures, ipcList, unhcrData, weatherMap };
}

// ─── EXTRACT LIVE SIGNALS (WITH UNHCR) ───────────────────────────────────────

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  
  // USGS earthquake
  const quakes = live.usgsFeatures.filter(f =>
    (f.properties?.place || "").toLowerCase().includes(name)
  );
  const biggestQuake = quakes.length
    ? quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a)
    : null;
  
  // IPC food security
  const ipcEntries = live.ipcList.filter(i =>
    (i.country || "").toLowerCase().includes(name)
  );
  const worstIPC = ipcEntries.length
    ? ipcEntries.reduce((a, b) => (b.phase > a.phase ? b : a))
    : null;
  
  // UNHCR displacement (NEW)
  let unhcrStats = null;
  if (live.unhcrData) {
    // Try exact match first
    unhcrStats = live.unhcrData[name];
    
    // Try fuzzy match if exact fails
    if (!unhcrStats) {
      for (const [key, value] of Object.entries(live.unhcrData)) {
        if (key.toLowerCase().includes(name) || name.includes(key.toLowerCase())) {
          unhcrStats = value;
          break;
        }
      }
    }
  }
  
  const totalDisplaced = unhcrStats 
    ? (unhcrStats.refugees || 0) + (unhcrStats.idps || 0) + (unhcrStats.asylum_seekers || 0)
    : 0;
  
  // Weather
  const maxTempC = live.weatherMap[iso] ?? null;
  
  return {
    quakeMag: biggestQuake ? +biggestQuake.properties.mag : 0,
    quakePlace: biggestQuake ? biggestQuake.properties.place.split(",")[0].trim() : null,
    ipcPhase: worstIPC?.phase ?? 0,
    ipcPopulation: worstIPC?.population ?? 0,
    maxTempC: maxTempC ?? 0,
    // UNHCR fields
    refugees: unhcrStats?.refugees || 0,
    idps: unhcrStats?.idps || 0,
    asylum_seekers: unhcrStats?.asylum_seekers || 0,
    totalDisplaced: totalDisplaced,
  };
}

// ─── STORE BUILDER ──────────────────────────────────────────────────────────

function buildStore(liveDataMap) {
  const seed = Math.floor(Date.now() / SCORE_SEED_INTERVAL_MS);
  const store = {};
  
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const jitter = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * 4);
    const priorBase = clamp(country.prior + jitter, 5, 85);
    const priorDims = buildPriorDims(priorBase, country.types);
    const signals = liveDataMap ? extractSignals(iso, liveDataMap) : null;
    const { dims, adjustedScore, adjustments } = signals
      ? applyLiveAdjustments(iso, priorDims, signals)
      : { dims: priorDims, adjustedScore: clamp(composite(priorDims)), adjustments: [] };
    
    store[iso] = {
      ...country,
      dims,
      score: adjustedScore,
      priorScore: clamp(composite(priorDims)),
      liveBoost: adjustedScore - clamp(composite(priorDims)),
      adjustments,
      signals: signals ?? {},
      spillover: 0,
    };
  }
  
  // Regional spillover
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNeighbour = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    store[iso].spillover = +(Math.max(0, avgNeighbour - 50) * 0.13).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }
  
  return store;
}

// ─── NARRATIVE BUILDER (WITH UNHCR) ─────────────────────────────────────────

function buildNarrative(iso, store, ranked) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const anom = cusum(hist);
  const fc = trendForecast(hist, c.score);
  const rank = ranked.indexOf(iso) + 1;
  const total = ranked.length;
  const percentile = Math.round((1 - rank / total) * 100);
  
  let severityLabel = "";
  let severityEmoji = "";
  if (c.score >= 85) { severityLabel = "CATASTROPHIC"; severityEmoji = "🔴"; }
  else if (c.score >= 75) { severityLabel = "CRITICAL"; severityEmoji = "🟠"; }
  else if (c.score >= 60) { severityLabel = "HIGH"; severityEmoji = "🟡"; }
  else if (c.score >= 40) { severityLabel = "ELEVATED"; severityEmoji = "🟢"; }
  else { severityLabel = "MODERATE"; severityEmoji = "🔵"; }
  
  const sortedDims = [...DIMS]
    .map(d => ({ ...d, val: c.dims[d.k] || 0 }))
    .sort((a, b) => b.val - a.val);
  const top = sortedDims[0];
  const second = sortedDims[1];
  const third = sortedDims[2];
  
  const delta = hist.length >= 7 ? hist[hist.length - 1] - hist[hist.length - 7] : 0;
  const dAbs = Math.abs(Math.round(delta));
  let trendDesc = "";
  if (delta > 5) trendDesc = `🔴 ESCALATING RAPIDLY (+${dAbs} pts in 7 days)`;
  else if (delta > 2) trendDesc = `🟠 Escalating (+${dAbs} pts in 7 days)`;
  else if (delta < -5) trendDesc = `🟢 Improving significantly (${dAbs} pts decrease)`;
  else if (delta < -2) trendDesc = `🟡 Improving slightly (${dAbs} pts decrease)`;
  else trendDesc = `⚪ Stable (${dAbs} pt change)`;
  
  const evidence = [];
  if (c.signals.quakeMag >= 4.5)
    evidence.push(`🌍 M${c.signals.quakeMag.toFixed(1)} earthquake near ${c.signals.quakePlace}`);
  if (c.signals.ipcPhase >= 3) {
    const popText = c.signals.ipcPopulation > 0 ? ` (${Math.round(c.signals.ipcPopulation / 1e6)}M people)` : "";
    evidence.push(`🍚 IPC Phase ${c.signals.ipcPhase} food insecurity${popText}`);
  }
  if (c.signals.totalDisplaced > 0) {
    const displacedMillions = (c.signals.totalDisplaced / 1e6).toFixed(1);
    evidence.push(`🚶 ${displacedMillions}M displaced (refugees + IDPs + asylum-seekers) — UNHCR`);
  }
  if (c.signals.maxTempC >= 40)
    evidence.push(`🥵 Extreme heatwave (${c.signals.maxTempC}°C)`);
  else if (c.signals.maxTempC >= 35)
    evidence.push(`🌡️ Significant heat (${c.signals.maxTempC}°C)`);
  
  const hotNeighbours = (COUNTRIES[iso].adj || [])
    .filter(n => store[n]?.score >= 60)
    .map(n => store[n].name);
  const spilloverText = hotNeighbours.length >= 2
    ? ` 🌐 Regional pressure from ${hotNeighbours.slice(0, 2).join(" and ")} adds +${c.spillover.toFixed(1)} pts.`
    : hotNeighbours.length === 1
    ? ` 🌐 Regional pressure from ${hotNeighbours[0]} adds +${c.spillover.toFixed(1)} pts.`
    : "";
  
  const anomalyText = anom.det && anom.z > 2.5
    ? ` ⚠️ STATISTICAL ANOMALY: Score is ${anom.z} standard deviations from 28-day baseline.`
    : "";
  
  const forecastText = fc.esc
    ? ` 📈 Forecast: ${fc.fc}/100 in 7 days (${fc.trend}).`
    : ` 📊 Forecast: ${fc.fc}/100 in 7 days (${fc.trend}).`;
  
  const narrative = `${c.flag} ${c.name} ranks #${rank} of ${total} (top ${percentile}%) with a ${severityEmoji} ${severityLabel} urgency score of ${c.score}/100.

🔍 KEY DRIVERS:
• ${top.l.toUpperCase()}: ${top.val}/100
• ${second.l.toUpperCase()}: ${second.val}/100
• ${third.l.toUpperCase()}: ${third.val}/100

📈 TREND: ${trendDesc}

${evidence.length > 0 ? `📡 LIVE EVIDENCE:\n${evidence.map(e => `  • ${e}`).join("\n")}\n` : ""}${spilloverText}${anomalyText}${forecastText}

${c.liveBoost !== 0 ? `📊 Live data adjusted this score by ${c.liveBoost > 0 ? `+${c.liveBoost}` : c.liveBoost} points from the prior estimate of ${c.priorScore}/100.` : ""}

💡 Recommendation: ${c.score >= 80 ? "IMMEDIATE ACTION REQUIRED. Humanitarian response critical." : c.score >= 60 ? "Urgent monitoring needed. Prepare response." : "Monitor situation. No immediate action required."}`;
  
  return narrative;
}

// ─── RESPONSE SHAPE ──────────────────────────────────────────────────────────

function buildPayload(iso, store, ranked) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = cusum(hist);
  
  return {
    iso,
    rank: ranked.indexOf(iso) + 1,
    total_countries: ranked.length,
    percentile: Math.round((1 - (ranked.indexOf(iso) + 1) / ranked.length) * 100),
    name: c.name,
    flag: c.flag,
    score: c.score,
    prior_score: c.priorScore,
    live_boost: c.liveBoost,
    spillover: c.spillover,
    severity: c.score >= 85 ? "CATASTROPHIC" : c.score >= 75 ? "CRITICAL" : c.score >= 60 ? "HIGH" : c.score >= 40 ? "ELEVATED" : "MODERATE",
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️" })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    dimensions: Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
    forecast: {
      score_7d: fc.fc,
      trend: fc.trend,
      escalating: fc.esc,
    },
    anomaly: {
      detected: anom.det,
      z_score: anom.z,
    },
    score_adjustments: c.adjustments,
    narrative: buildNarrative(iso, store, ranked),
  };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const start = Date.now();
  
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
  
  let isoReq, topN;
  try {
    const url = new URL(req.url ?? "/", "https://placeholder.invalid");
    isoReq = url.searchParams.get("iso")?.toUpperCase().trim() || null;
    topN = Math.min(MAX_TOP_N, Math.max(1, parseInt(url.searchParams.get("top") || "1", 10)));
    if (Number.isNaN(topN)) topN = 1;
  } catch {
    res.writeHead(400, CORS_HEADERS);
    res.end(JSON.stringify({ error: "Bad request URL" }));
    return;
  }
  
  if (isoReq && !COUNTRIES[isoReq]) {
    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({
      error: `Country "${isoReq}" not found`,
      available: Object.keys(COUNTRIES).sort(),
    }));
    return;
  }
  
  try {
    const storeWithPriorsOnly = buildStore(null);
    const rankedByPrior = Object.keys(storeWithPriorsOnly)
      .sort((a, b) => storeWithPriorsOnly[b].score - storeWithPriorsOnly[a].score);
    
    const targetIsos = isoReq
      ? [isoReq]
      : rankedByPrior.slice(0, topN);
    
    const liveData = await fetchAllLive(targetIsos);
    const store = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);
    
    const payloads = (isoReq ? [isoReq] : ranked.slice(0, topN))
      .map(iso => buildPayload(iso, store, ranked));
    
    const sourceStatus = {
      usgs: { 
        available: liveData.usgsFeatures.length > 0, 
        events: liveData.usgsFeatures.length,
        time_window: "last 7 days",
        magnitude_threshold: "4.5+"
      },
      ipc: { 
        available: liveData.ipcList.length > 0, 
        classifications: liveData.ipcList.length,
        phases: "Phase 1-5 (Minimal to Catastrophe)"
      },
      unhcr: {
        available: Object.keys(liveData.unhcrData || {}).length > 0,
        countries_with_data: Object.keys(liveData.unhcrData || {}).length,
        source: "UNHCR Refugee Statistics API (open, no key required)",
        data_type: "Refugees, IDPs, asylum-seekers"
      },
      weather: {
        available: Object.values(liveData.weatherMap).some(v => v !== null),
        countries_with_data: Object.values(liveData.weatherMap).filter(v => v !== null).length,
        source: "Open-Meteo (forecast)"
      }
    };
    
    const isMulti = !isoReq && topN > 1;
    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        score_seed: Math.floor(Date.now() / SCORE_SEED_INTERVAL_MS),
        next_seed_change: new Date(
          (Math.floor(Date.now() / SCORE_SEED_INTERVAL_MS) + 1) * SCORE_SEED_INTERVAL_MS
        ).toISOString(),
        countries_tracked: Object.keys(COUNTRIES).length,
        query: { iso: isoReq, top: isMulti ? topN : null },
        sources: sourceStatus,
        methodology: {
          dimensions: DIMS.map(d => ({ name: d.l, weight: d.w })),
          prior_source: "OCHA/ACAPS/ReliefWeb (mid-2024 baseline)",
          live_sources: "USGS (earthquakes), IPC (food security), UNHCR (displacement), Open-Meteo (weather)",
          adjustment_logic: "IPC: +8 per phase, Earthquakes: +5 per magnitude point over 4.5, UNHCR: +5-25 based on displaced population (0.1M to 5M+), Heat: +1.2 per °C over 30"
        }
      },
      ...(isMulti ? { top_stories: payloads } : { top_story: payloads[0] })
    };
    
    const remainingMs = SCORE_SEED_INTERVAL_MS - (Date.now() % SCORE_SEED_INTERVAL_MS);
    const remainingSecs = Math.floor(remainingMs / 1000);
    
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
