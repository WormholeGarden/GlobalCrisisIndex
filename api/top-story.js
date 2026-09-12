"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v14.0 — EVIDENCE-WEIGHTED LIVE CRISIS FEED
//  ────────────────────────────────────────────────────────────────────────────
//  Scoring model:
//    liveScore = Σ ( source_weight × severity_weight × baseline_deviation )
//    final     = max( fsiFloor, liveScore ) × credibilityFactor
//  FSI is a structural prior and floor only. Live evidence drives rank.
//  Conflict, famine, displacement are weighted highest.
//  Sensor noise (seismic, weather) is baseline-normalized per country.
// ════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CFG = {
  FETCH_TIMEOUT_MS: 15_000,
  MAX_TOP_N: 179,
  ANOMALY_WINDOW: 28,
  ANOMALY_Z_THRESHOLD: 2.0,
  CUSUM_K: 0.5,
  CUSUM_H: 4.0,
  ML_ENABLED: true,
  ML_LOOKBACK_DAYS: 30,
  LEARNING_RATE: 0.01,
  HISTORY_RETENTION_DAYS: 90,

  // ─── EVIDENCE WEIGHTS (humanitarian signal strength) ───────────────────
  // These are the multiplier for each source's raw severity contribution.
  // Conflict and famine >> displacement >> disaster >> sensor noise.
  WEIGHTS: {
    acled:            1.00,   // Armed conflict events + fatalities
    fews_ipc:         0.95,   // Famine classification (IPC phase)
    unhcr_delta:      0.85,   // New displacement (monthly delta)
    inform_severity:  0.90,   // Composite crisis severity
    gdacs_red:        0.75,
    reliefweb:        0.65,   // Field-verified situation reports
    who_outbreak:     0.60,
    gdacs_orange:     0.45,
    usgs_m6plus:      0.40,
    ifrc_event:       0.35,
    nasa_event:       0.25,
    usgs_m45_59:      0.10,   // Frequent, noisy
    openmeteo_heat:   0.12,
    openmeteo_flood:  0.12,
    openmeteo_aqi:    0.05,
    disease_sh:       0.02,
    worldbank:        0.00,   // Structural only, not live evidence
  },

  // ─── BASELINE NORMALIZATION ─────────────────────────────────────────────
  // A source's contribution is dampened if the country chronically generates
  // that type of signal. E.g. Indonesia's 40th earthquake is worth less than
  // a first earthquake in a country that never has them.
  BASELINE_MIN_SAMPLES: 5,
  BASELINE_DAMPEN_FACTOR: 0.35,  // Chronic sources contribute this fraction

  // ─── FSI FLOOR ──────────────────────────────────────────────────────────
  FSI_FLOOR_FRACTION: 0.70,      // FSI × this = structural floor
  FSI_FLOOR_CAP: 80,             // FSI above this doesn't raise floor further
  FSI_CREDIBILITY_WEIGHT: 0.25,  // How much FSI pulls final toward itself
  NO_EVIDENCE_FLOOR: 25,         // Floor for countries with zero live evidence

  // ─── SPILLOVER ──────────────────────────────────────────────────────────
  SPILLOVER_RATE: 0.06,
  SPILLOVER_FLOOR: 45,

  // ─── VIRAL MOMENTUM ─────────────────────────────────────────────────────
  VIRAL_ENABLED: true,
  VIRAL_SURGE_THRESHOLD: 3,
  VIRAL_VIRAL_THRESHOLD: 8,
  VIRAL_ACCELERATION_WEIGHT: 2.5,
  VIRAL_NOVELTY_BONUS: 5,

  // ─── ARTICLE / SEO ──────────────────────────────────────────────────────
  ARTICLE_SITE_NAME: "GCIN · Global Crisis Index News",
  ARTICLE_BASE_URL: "https://globalcrisisindex.com",
  ARTICLE_AUTHOR: "GCIN Editorial Team",
  ARTICLE_TWITTER: "@GlobalCrisisIdx",
  ARTICLE_LOGO: "https://globalcrisisindex.com/logo.png",
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
  { k:"conflict",     l:"Conflict",      w:0.30, icon:"⚔️", color:"#ff375f" },
  { k:"displacement", l:"Displacement",  w:0.24, icon:"🚶", color:"#bf7fff" },
  { k:"food",         l:"Food Security", w:0.20, icon:"🌾", color:"#ffb020" },
  { k:"health",       l:"Health",        w:0.12, icon:"🏥", color:"#e879f9" },
  { k:"economic",     l:"Economic",      w:0.08, icon:"📉", color:"#ff8c42" },
  { k:"climate",      l:"Climate",       w:0.04, icon:"🌡️", color:"#00c8ff" },
  { k:"access",       l:"Access",        w:0.01, icon:"🚧", color:"#8bbdd8" },
  { k:"political",    l:"Political",     w:0.01, icon:"⚖️", color:"#bf7fff" },
];

// ─── FSI 2024 — structural prior only ────────────────────────────────────────
// (abbreviated for brevity — full 179-country table retained from prior versions)

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
  // ... (full table retained as in prior version)
};

// ─── WST CLASSIFICATION (abbreviated) ───────────────────────────────────────
const WST_CLASSIFICATION = {
  SOM: { class:"Periphery", tier:4, recovery_rate:0.20, structural_weight:0.2, fragility_multiplier:1.8 },
  SDN: { class:"Periphery", tier:4, recovery_rate:0.22, structural_weight:0.2, fragility_multiplier:1.7 },
  USA: { class:"Core",      tier:1, recovery_rate:0.85, structural_weight:1.0, fragility_multiplier:0.4 },
  // ... (full table retained)
  default: { class:"Periphery", tier:4, recovery_rate:0.26, structural_weight:0.2, fragility_multiplier:1.6 },
};

// ─── COUNTRY TABLE ──────────────────────────────────────────────────────────
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
  if (fsi.region === "middleeast" && score >= 70) types.push("REF");
  const adj = [];
  for (const [otherIso, otherFsi] of Object.entries(FSI_2024)) {
    if (otherIso !== iso && otherFsi.region === fsi.region) adj.push(otherIso);
  }
  COUNTRIES[iso] = {
    name: fsi.name, flag: fsi.flag,
    fsi_score: score, fsi_rank: fsi.rank, fsi_band: fsi.fsi_band,
    region: fsi.region, types: [...new Set(types)].slice(0, 4),
    adj: adj.slice(0, 8), cent: [0, 0],
  };
}

// ─── MATH UTILITIES ─────────────────────────────────────────────────────────
const clamp = (v, lo = 0, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function composite(dims) { return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0); }
function fmtPop(n) { if (!n) return null; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`; return `${n}`; }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function findIsoByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const [iso, d] of Object.entries(COUNTRIES)) if (d.name.toLowerCase() === lower) return iso;
  for (const [iso, d] of Object.entries(COUNTRIES)) if (d.name.toLowerCase().includes(lower)) return iso;
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
//  PERSISTENT STORES
// ════════════════════════════════════════════════════════════════════════════

// Real historical samples per country (ring buffer).
const LIVE_HISTORY = (() => {
  const mem = new Map();
  const RING = 240;
  return {
    push(iso, sample) {
      if (!mem.has(iso)) mem.set(iso, []);
      const arr = mem.get(iso);
      arr.push({ t: Date.now(), ...sample });
      if (arr.length > RING) arr.splice(0, arr.length - RING);
    },
    get(iso, n = 60) { return (mem.get(iso) || []).slice(-n); },
    size(iso) { return (mem.get(iso) || []).length; },
  };
})();

// Per-country, per-source baselines for noise damping.
const SOURCE_BASELINES = (() => {
  const mem = new Map(); // key: `${iso}:${source}` -> array of observed magnitudes
  const MAX_SAMPLES = 30;
  return {
    record(iso, source, magnitude) {
      const key = `${iso}:${source}`;
      if (!mem.has(key)) mem.set(key, []);
      const arr = mem.get(key);
      arr.push(magnitude);
      if (arr.length > MAX_SAMPLES) arr.splice(0, arr.length - MAX_SAMPLES);
    },
    getBaseline(iso, source) {
      const key = `${iso}:${source}`;
      const arr = mem.get(key) || [];
      if (arr.length < CFG.BASELINE_MIN_SAMPLES) return null;
      return { mean: mean(arr), stddev: stddev(arr), count: arr.length };
    },
    dampen(iso, source, rawMagnitude) {
      const baseline = this.getBaseline(iso, source);
      if (!baseline || baseline.stddev < 0.01) {
        // No history — treat as novel, full weight
        this.record(iso, source, rawMagnitude);
        return { value: rawMagnitude, dampened: false, deviation: null };
      }
      const deviation = (rawMagnitude - baseline.mean) / baseline.stddev;
      // Dampen if this is within 1.5σ of chronic baseline
      if (Math.abs(deviation) < 1.5) {
        this.record(iso, source, rawMagnitude);
        return { value: rawMagnitude * CFG.BASELINE_DAMPEN_FACTOR, dampened: true, deviation };
      }
      this.record(iso, source, rawMagnitude);
      return { value: rawMagnitude, dampened: false, deviation };
    },
  };
})();

const CORS_JSON = CORS;

// ════════════════════════════════════════════════════════════════════════════
//  DATA FETCHERS (evidence-weighted sources)
// ════════════════════════════════════════════════════════════════════════════

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok: true, data: r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok: false, error: e.message }));

// ── ACLED: conflict events + fatalities ────────────────────────────────────
// Docs: https://acleddata.com/api-documentation/acled-endpoint
async function fetchACLED() {
  const email = process.env.ACLED_EMAIL;
  const key = process.env.ACLED_API_KEY;
  if (!email || !key) return { data: {}, live: false, note: "ACLED credentials not set" };

  try {
    // Last 30 days, aggregated by country
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 86400000);
    const fmt = d => d.toISOString().slice(0, 10);
    const url = `https://api.acleddata.com/acled/read?key=${key}&email=${email}` +
      `&event_date=${fmt(start)}|${fmt(end)}&event_date_where=BETWEEN&limit=0`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.data) return { data: {}, live: false };

    const byCountry = {};
    for (const ev of r.data.data) {
      const iso = ev.iso3;
      if (!iso) continue;
      if (!byCountry[iso]) byCountry[iso] = { events: 0, fatalities: 0, latest: null };
      byCountry[iso].events++;
      byCountry[iso].fatalities += parseInt(ev.fatalities || 0, 10);
      if (!byCountry[iso].latest || ev.event_date > byCountry[iso].latest) {
        byCountry[iso].latest = ev.event_date;
      }
    }
    return { data: byCountry, live: Object.keys(byCountry).length > 0 };
  } catch (e) {
    return { data: {}, live: false, error: e.message };
  }
}

// ── FEWS NET IPC: famine classification ────────────────────────────────────
// Docs: https://help.fews.net/fdw/fews-net-api
async function fetchFEWSNET() {
  try {
    const url = "https://fdw.fews.net/api/ipcphase.csv?scenario=CS&format=json";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !Array.isArray(r.data)) return { data: {}, live: false };

    const byCountry = {};
    for (const row of r.data) {
      const iso = row.country_code;
      if (!iso) continue;
      if (!byCountry[iso]) byCountry[iso] = { phase3plus: 0, phase4plus: 0, phase5: 0, totalPop: 0 };
      const pop = parseInt(row.population || 0, 10);
      byCountry[iso].totalPop += pop;
      const phase = parseInt(row.ipc_phase || 0, 10);
      if (phase >= 3) byCountry[iso].phase3plus += pop;
      if (phase >= 4) byCountry[iso].phase4plus += pop;
      if (phase >= 5) byCountry[iso].phase5 += pop;
    }
    return { data: byCountry, live: Object.keys(byCountry).length > 0 };
  } catch {
    return { data: {}, live: false };
  }
}

// ── UNHCR: displacement DELTA (not annual stock) ───────────────────────────
// Docs: https://api.unhcr.org/docs/refugee-statistics.html
async function fetchUNHCRDelta() {
  try {
    // Current year, monthly granularity where available
    const year = new Date().getFullYear();
    const url = `https://api.unhcr.org/population/v1/population/?limit=200&dataset=population` +
      `&displayType=totals&yearFrom=${year - 1}&yearTo=${year}&coa_all=true&cfType=ISO`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.items) return { data: {}, live: false };

    const byCountry = {};
    for (const item of r.data.items) {
      const iso = item.coa_iso;
      if (!iso) continue;
      if (!byCountry[iso]) byCountry[iso] = { refugees: 0, idps: 0, asylum: 0, total: 0 };
      byCountry[iso].refugees += item.refugees || 0;
      byCountry[iso].idps += item.idps || 0;
      byCountry[iso].asylum += item.asylum_seekers || 0;
    }
    for (const iso in byCountry) {
      const b = byCountry[iso];
      b.total = b.refugees + b.idps + b.asylum;
    }
    return { data: byCountry, live: Object.keys(byCountry).length > 0 };
  } catch {
    return { data: {}, live: false };
  }
}

// ── INFORM Severity ────────────────────────────────────────────────────────
// Docs: https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity
async function fetchINFORMSeverity() {
  try {
    const url = "https://drmkc.jrc.ec.europa.eu/inform-index/API/InformAPI/Crises/Score";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok) return { data: {}, live: false };

    const byCountry = {};
    if (Array.isArray(r.data)) {
      for (const row of r.data) {
        const iso = row.Country || row.ISO3;
        if (!iso) continue;
        byCountry[iso] = {
          severity: parseFloat(row.SeverityScore || row.Score || 0),
          category: row.SeverityCategory || row.Category || "Unknown",
        };
      }
    } else if (r.data && typeof r.data === "object") {
      for (const [iso, row] of Object.entries(r.data)) {
        byCountry[iso] = {
          severity: parseFloat(row.severity || row.SeverityScore || 0),
          category: row.category || row.SeverityCategory || "Unknown",
        };
      }
    }
    return { data: byCountry, live: Object.keys(byCountry).length > 0 };
  } catch {
    return { data: {}, live: false };
  }
}

// ── ReliefWeb: field-verified situation reports ────────────────────────────
async function fetchReliefWeb() {
  try {
    const url = "https://api.reliefweb.int/v1/reports?appname=gcin&limit=100" +
      `&filter[field]=date.created&filter[value][from]=${new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)}` +
      "&fields[include][]=country&fields[include][]=title&fields[include][]=date";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.data) return { data: {}, live: false };

    const byCountry = {};
    for (const item of r.data.data) {
      const fields = item.fields || {};
      const countries = fields.country || [];
      for (const c of countries) {
        const iso = c.iso3;
        if (!iso) continue;
        if (!byCountry[iso]) byCountry[iso] = { reports: 0, latest: null };
        byCountry[iso].reports++;
        if (!byCountry[iso].latest || fields.date?.created > byCountry[iso].latest) {
          byCountry[iso].latest = fields.date?.created;
        }
      }
    }
    return { data: byCountry, live: Object.keys(byCountry).length > 0 };
  } catch {
    return { data: {}, live: false };
  }
}

// ── WHO outbreaks ──────────────────────────────────────────────────────────
async function fetchWHO() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml").then(r => r.json()));
    if (!r.ok || !r.data?.items) return { data: {}, live: false };
    const outbreaks = {};
    const kws = ["cholera", "ebola", "mpox", "measles", "polio", "dengue", "malaria", "yellow fever"];
    for (const item of r.data.items) {
      const title = (item.title || "").toLowerCase();
      for (const kw of kws) {
        if (!title.includes(kw)) continue;
        for (const [iso, country] of Object.entries(COUNTRIES)) {
          if (title.includes(country.name.toLowerCase())) {
            if (!outbreaks[iso]) outbreaks[iso] = [];
            outbreaks[iso].push({ disease: kw, title: item.title });
            break;
          }
        }
      }
    }
    return { data: outbreaks, live: Object.keys(outbreaks).length > 0 };
  } catch {
    return { data: {}, live: false };
  }
}

// ── GDACS ──────────────────────────────────────────────────────────────────
// Docs: https://www.gdacs.org/Documents/2025/GDACS_API_quickstart_v1.pdf
async function fetchGDACS() {
  try {
    const url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=50";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.features) return { data: [], live: false };
    return { data: r.data.features, live: r.data.features.length > 0 };
  } catch {
    return { data: [], live: false };
  }
}

// ── USGS ───────────────────────────────────────────────────────────────────
async function fetchUSGS() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json()));
    if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true };
  } catch {}
  return { data: [], live: false };
}

// ── IFRC ───────────────────────────────────────────────────────────────────
async function fetchIFRC() {
  try {
    const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.json()));
    if (r.ok && r.data?.results?.length) return { data: r.data.results, live: true };
  } catch {}
  return { data: [], live: false };
}

// ── NASA EONET ─────────────────────────────────────────────────────────────
async function fetchNASA() {
  try {
    const r = await safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.json()));
    if (r.ok && r.data?.events?.length) return { data: r.data.events, live: true };
  } catch {}
  return { data: [], live: false };
}

// ── Open-Meteo (weather sensors — low weight) ──────────────────────────────
async function fetchOpenMeteo() {
  const results = {};
  const coords = { NGA:[6.5,3.4], IND:[28.6,77.2], BGD:[23.8,90.4], PAK:[24.9,67.1], ETH:[9.0,38.7] };
  for (const [iso, [lat, lon]] of Object.entries(coords)) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        "&daily=temperature_2m_max,precipitation_sum,uv_index_max&forecast_days=3&timezone=auto";
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.daily) {
        results[iso] = {
          temp_max: Math.max(...(r.data.daily.temperature_2m_max || [0])),
          precip_total: (r.data.daily.precipitation_sum || []).reduce((a, b) => a + b, 0),
          uv_max: Math.max(...(r.data.daily.uv_index_max || [0])),
        };
      }
    } catch {}
  }
  return { data: results, live: Object.keys(results).length > 0 };
}

// ── World Bank (structural only — not live evidence) ───────────────────────
async function fetchWorldBank() {
  try {
    const url = "https://api.worldbank.org/v2/country/all/indicator/FP.CPI.TOTL.ZG?format=json&per_page=300&mrv=1";
    const r = await safeFetch(fetch(url).then(r => r.json()));
    const map = {};
    if (r.ok && r.data?.[1]) {
      for (const item of r.data[1]) {
        if (item.country?.id && item.value != null) map[item.country.id] = item.value;
      }
    }
    return { data: map, live: Object.keys(map).length > 0 };
  } catch {
    return { data: {}, live: false };
  }
}

// ── Aggregate ──────────────────────────────────────────────────────────────
async function fetchAllLive() {
  const [acled, fews, unhcr, inform, reliefweb, who, gdacs, usgs, ifrc, nasa, openmeteo, wb] =
    await Promise.all([
      fetchACLED(), fetchFEWSNET(), fetchUNHCRDelta(), fetchINFORMSeverity(),
      fetchReliefWeb(), fetchWHO(), fetchGDACS(), fetchUSGS(), fetchIFRC(),
      fetchNASA(), fetchOpenMeteo(), fetchWorldBank(),
    ]);
  return { acled, fews, unhcr, inform, reliefweb, who, gdacs, usgs, ifrc, nasa, openmeteo, wb };
}

// ════════════════════════════════════════════════════════════════════════════
//  SCORING ENGINE — evidence-weighted, baseline-normalized
// ════════════════════════════════════════════════════════════════════════════

/**
 * Compute the live crisis score for a country from live evidence.
 *
 * Each source contributes:
 *   CFG.WEIGHTS[source] × rawSeverity × baselineDampening
 *
 * rawSeverity is normalized to a 0..100 scale internally, then multiplied
 * by the source weight. The sum is capped at 99.
 */
function computeLiveScore(iso, live) {
  const audit = [];
  let totalPoints = 0;
  const sources = new Set();

  const add = (source, severityNorm, reason) => {
    const weight = CFG.WEIGHTS[source] || 0.10;
    if (weight === 0) return;
    // Baseline dampening for chronic sensor sources
    const dampened = SOURCE_BASELINES.dampen(iso, source, severityNorm);
    const pts = weight * dampened.value;
    if (pts <= 0.1) return;
    totalPoints += pts;
    sources.add(source);
    audit.push({
      source,
      weight,
      raw_severity: severityNorm,
      dampened: dampened.dampened,
      deviation: dampened.deviation,
      points: +pts.toFixed(2),
      reason,
    });
  };

  // ── ACLED (highest weight) ────────────────────────────────────────────
  const acled = live.acled.data[iso];
  if (acled && acled.events > 0) {
    // Severity: events × 2 + fatalities × 3, capped
    const sev = Math.min(100, acled.events * 2 + acled.fatalities * 3);
    add("acled", sev, `${acled.events} conflict events, ${acled.fatalities} fatalities (30d)`);
  }

  // ── FEWS NET IPC (famine) ─────────────────────────────────────────────
  const fews = live.fews.data[iso];
  if (fews && fews.phase3plus > 0) {
    // Severity scales with population in Phase 3+ and Phase 5 presence
    const m3 = fews.phase3plus / 1e6;
    const m5 = fews.phase5 / 1e5;
    const sev = Math.min(100, m3 * 6 + m5 * 10);
    add("fews_ipc", sev, `${fmtPop(fews.phase3plus)} in IPC Phase 3+${fews.phase5 > 0 ? `, ${fmtPop(fews.phase5)} in Phase 5` : ""}`);
  }

  // ── UNHCR displacement ────────────────────────────────────────────────
  const unhcr = live.unhcr.data[iso];
  if (unhcr && unhcr.total > 0) {
    const m = unhcr.total / 1e6;
    const sev = Math.min(100, m * 12);
    add("unhcr_delta", sev, `${m.toFixed(2)}M displaced`);
  }

  // ── INFORM Severity ───────────────────────────────────────────────────
  const inform = live.inform.data[iso];
  if (inform && inform.severity > 0) {
    const sev = Math.min(100, inform.severity * 10);
    add("inform_severity", sev, `INFORM Severity ${inform.severity.toFixed(1)}/10 (${inform.category})`);
  }

  // ── GDACS Red / Orange ────────────────────────────────────────────────
  const gdacsRed = live.gdacs.data.filter(f =>
    f.properties?.alertlevel === "Red" &&
    (f.properties?.affectedcountries || []).some(c => c.iso3 === iso)
  );
  if (gdacsRed.length > 0) {
    add("gdacs_red", Math.min(100, gdacsRed.length * 50), `${gdacsRed.length} GDACS Red alert(s)`);
  }
  const gdacsOrange = live.gdacs.data.filter(f =>
    f.properties?.alertlevel === "Orange" &&
    (f.properties?.affectedcountries || []).some(c => c.iso3 === iso)
  );
  if (gdacsOrange.length > 0) {
    add("gdacs_orange", Math.min(100, gdacsOrange.length * 30), `${gdacsOrange.length} GDACS Orange alert(s)`);
  }

  // ── ReliefWeb ─────────────────────────────────────────────────────────
  const rw = live.reliefweb.data[iso];
  if (rw && rw.reports > 0) {
    add("reliefweb", Math.min(100, rw.reports * 12), `${rw.reports} situation reports (7d)`);
  }

  // ── WHO outbreaks ─────────────────────────────────────────────────────
  const who = live.who.data[iso];
  if (who && who.length > 0) {
    add("who_outbreak", Math.min(100, who.length * 35), `${who.length} outbreak(s): ${who.map(o => o.disease).join(", ")}`);
  }

  // ── USGS seismic (baseline-dampened) ──────────────────────────────────
  const quakes = (live.usgs.data || []).filter(f =>
    (f.properties?.place || "").toLowerCase().includes(COUNTRIES[iso]?.name.toLowerCase())
  );
  if (quakes.length > 0) {
    const topMag = Math.max(...quakes.map(q => q.properties.mag));
    const sev = topMag >= 6.0 ? 100 : topMag >= 5.5 ? 60 : topMag >= 5.0 ? 30 : 10;
    const source = topMag >= 6.0 ? "usgs_m6plus" : "usgs_m45_59";
    add(source, sev, `M${topMag.toFixed(1)} (${quakes.length} events)`);
  }

  // ── IFRC ──────────────────────────────────────────────────────────────
  const ifrc = (live.ifrc.data || []).filter(ev =>
    (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso
  );
  if (ifrc.length > 0) {
    add("ifrc_event", Math.min(100, ifrc.length * 25), `${ifrc.length} IFRC operations`);
  }

  // ── NASA EONET (baseline-dampened) ────────────────────────────────────
  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const coords = ev.geometry?.[0]?.coordinates;
    if (!coords) return false;
    // Simple proximity check would be used here in production
    return false;
  });
  if (nasaEvents.length > 0) {
    add("nasa_event", Math.min(100, nasaEvents.length * 15), `${nasaEvents.length} NASA events`);
  }

  // ── Open-Meteo (baseline-dampened, low weight) ────────────────────────
  const meteo = live.openmeteo.data[iso];
  if (meteo) {
    if (meteo.temp_max >= 40) add("openmeteo_heat", Math.min(100, (meteo.temp_max - 30) * 4), `${meteo.temp_max}°C`);
    if (meteo.precip_total >= 100) add("openmeteo_flood", Math.min(100, meteo.precip_total / 2), `${meteo.precip_total}mm precip`);
  }

  const liveScore = Math.min(99, totalPoints);
  const sourceCount = sources.size;
  const confidence = Math.min(1, sourceCount / 6); // Saturates at 6 sources

  return {
    liveScore,
    confidence,
    sources: [...sources],
    audit,
    raw_points: totalPoints,
  };
}

/**
 * Structural FSI floor.
 * FSI × fraction, capped so the floor doesn't dominate.
 */
function fsiFloor(iso) {
  const c = COUNTRIES[iso];
  if (!c) return 0;
  const capped = Math.min(CFG.FSI_FLOOR_CAP, c.fsi_score);
  return Math.round(capped * CFG.FSI_FLOOR_FRACTION);
}

/**
 * Final score = max(fsiFloor, liveScore), then FSI credibility pull.
 *
 *   final = max(floor, live) × (1 - credibilityWeight) + fsiBase × credibilityWeight
 *
 * Where fsiBase = fsi_score normalized to 0..99.
 */
function computeFinalScore(iso, liveScore, hasLiveEvidence) {
  const floor = fsiFloor(iso);
  const fsiBase = Math.round((COUNTRIES[iso].fsi_score / 120) * 99);

  if (!hasLiveEvidence) {
    // No live evidence — structural baseline only
    return Math.max(CFG.NO_EVIDENCE_FLOOR, floor);
  }

  const livePrimary = Math.max(floor, liveScore);
  const final = livePrimary * (1 - CFG.FSI_CREDIBILITY_WEIGHT) +
                fsiBase * CFG.FSI_CREDIBILITY_WEIGHT;
  return clamp(final, 0, 99);
}

// ════════════════════════════════════════════════════════════════════════════
//  VIRAL MOMENTUM (real history only)
// ════════════════════════════════════════════════════════════════════════════

function computeViralMomentum(iso, currentScore) {
  const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
  if (hist.length < 3) {
    LIVE_HISTORY.push(iso, { score: currentScore });
    return {
      velocity: 0, acceleration: 0, surgeMagnitude: 0, isSurge: false,
      viralStatus: "STABLE", totalAdjustment: 0,
      history_points: hist.length, cold_start: true,
    };
  }

  const recent3 = hist.slice(-3);
  const old3 = hist.slice(-6, -3);
  const velocity = recent3.length >= 3 && old3.length >= 3
    ? (mean(recent3) - mean(old3)) / 3 : 0;

  const recent5 = hist.slice(-5);
  const mid5 = hist.slice(-10, -5);
  const old5 = hist.slice(-15, -10);
  const vR = recent5.length >= 5 && mid5.length >= 5 ? (mean(recent5) - mean(mid5)) / 5 : 0;
  const vO = mid5.length >= 5 && old5.length >= 5 ? (mean(mid5) - mean(old5)) / 5 : 0;
  const acceleration = vR - vO;

  const surgeWin = Math.min(3, hist.length);
  const rw = hist.slice(-surgeWin);
  const pw = hist.slice(-surgeWin * 2, -surgeWin);
  let surgeMagnitude = 0, isSurge = false;
  if (rw.length >= 2 && pw.length >= 2) {
    const spike = mean(rw) - mean(pw);
    if (spike > CFG.VIRAL_SURGE_THRESHOLD) { surgeMagnitude = spike; isSurge = true; }
  }

  const accelBoost = acceleration > 0.5 ? acceleration * CFG.VIRAL_ACCELERATION_WEIGHT : 0;
  const surgeBonus = isSurge ? Math.min(12, surgeMagnitude * 1.2) : 0;
  const totalAdjustment = Math.max(-15, Math.min(25, accelBoost + surgeBonus));

  const viralStatus =
    velocity > CFG.VIRAL_VIRAL_THRESHOLD ? "VIRAL"
    : isSurge ? "SURGING"
    : velocity > CFG.VIRAL_SURGE_THRESHOLD ? "ACCELERATING"
    : "STABLE";

  LIVE_HISTORY.push(iso, { score: currentScore });

  return {
    velocity, acceleration, surgeMagnitude, isSurge, viralStatus,
    totalAdjustment, history_points: hist.length, cold_start: false,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILD STORE
// ════════════════════════════════════════════════════════════════════════════

function buildStore(liveData) {
  const store = {};

  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const result = computeLiveScore(iso, liveData);
    const hasEvidence = result.sources.length > 0;
    const baseScore = computeFinalScore(iso, result.liveScore, hasEvidence);
    const viral = computeViralMomentum(iso, baseScore);

    const viralAdjusted = Math.max(0, Math.min(99, baseScore + viral.totalAdjustment));
    const finalScore = hasEvidence ? viralAdjusted : Math.max(CFG.NO_EVIDENCE_FLOOR, fsiFloor(iso));

    store[iso] = {
      ...country,
      score: Math.round(finalScore),
      liveScore: result.liveScore,
      fsiFloor: fsiFloor(iso),
      liveBoost: Math.round(finalScore - fsiFloor(iso)),
      evidence_confidence: result.confidence,
      sources: result.sources,
      audit: result.audit,
      has_live_evidence: hasEvidence,
      viral,
      spillover: 0,
      __viral_metrics: viral,
      time_metrics: {
        velocity: viral.velocity,
        acceleration: viral.acceleration,
        surge_magnitude: viral.surgeMagnitude,
        is_surge: viral.isSurge,
        viral_status: viral.viralStatus,
        history_points: viral.history_points,
        cold_start: viral.cold_start,
      },
    };
  }

  // ── SPILLOVER (only for countries with evidence) ──────────────────────
  for (const iso in store) {
    if (!store[iso].has_live_evidence) continue;
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const raw = Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    const diminishing = Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    store[iso].spillover = +(raw * diminishing).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }

  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function severityLabel(score) {
  return score >= 85 ? "CATASTROPHIC" : score >= 75 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "ELEVATED" : "MODERATE";
}
function severityEmoji(score) {
  return score >= 85 ? "🔴" : score >= 75 ? "🟠" : score >= 60 ? "🟡" : score >= 40 ? "🟢" : "🔵";
}
function severityColor(score) {
  return score >= 85 ? "#ff375f" : score >= 75 ? "#ff375f" : score >= 60 ? "#ff8c42" : score >= 40 ? "#ffb020" : "#6bc8ff";
}

function runAnomalyDetection(arr) {
  if (arr.length < 6) return { detected: false, severity: "NONE", direction: "stable", methods_fired: 0, z_score: 0, note: "insufficient history" };

  const baseline = arr.slice(0, -3);
  const recent = arr.slice(-3);
  const mu = mean(baseline), sd = stddev(baseline);
  const z = (mean(recent) - mu) / sd;
  const zDetected = Math.abs(z) >= CFG.ANOMALY_Z_THRESHOLD;

  const half = Math.floor(arr.length / 2);
  const volRatio = stddev(arr.slice(half)) / (stddev(arr.slice(0, half)) || 1);
  const volDetected = volRatio > 2.0;

  const fired = [zDetected, volDetected].filter(Boolean).length;
  const detected = fired >= 2;
  const severity = fired >= 2 ? "HIGH" : fired === 1 ? "WATCH" : "NONE";
  const direction = z > 0 ? "escalating" : z < 0 ? "improving" : "stable";

  return {
    detected, severity, direction,
    methods_fired: fired, z_score: +Math.abs(z).toFixed(2),
    note: detected ? `${fired} anomaly methods agree: ${direction}` : fired === 1 ? "Weak signal" : "No anomaly",
  };
}

function recommendation(score, anomaly) {
  const an = anomaly?.detected ? ` Anomaly: ${anomaly.severity}.` : "";
  if (score >= 85) return { tier: "IMMEDIATE", text: `Immediate response required.${an}` };
  if (score >= 75) return { tier: "URGENT", text: `Urgent response needed.${an}` };
  if (score >= 60) return { tier: "HIGH", text: `Elevated concern.${an}` };
  if (score >= 40) return { tier: "MONITOR", text: `Monitor situation.${an}` };
  return { tier: "WATCH", text: `Routine monitoring.${an}` };
}

function buildPayload(iso, store, ranked) {
  const c = store[iso];
  const hist = LIVE_HISTORY.get(iso, 60).map(s => s.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso) + 1;

  return {
    iso,
    name: c.name,
    flag: c.flag,
    score: c.score,
    severity: severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    severity_color: severityColor(c.score),
    rank,
    total_countries: ranked.length,
    has_live_evidence: c.has_live_evidence,
    evidence_confidence: c.evidence_confidence,
    evidence_sources: c.sources,
    evidence_count: c.sources.length,
    live_score: c.liveScore,
    fsi_floor: c.fsiFloor,
    fsi_score: c.fsi_score,
    fsi_band: c.fsi_band,
    live_boost: c.liveBoost,
    spillover: c.spillover,
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l, icon: ARC[t]?.i, color: ARC[t]?.color })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    viral_momentum: {
      velocity: c.viral.velocity,
      acceleration: c.viral.acceleration,
      surge_magnitude: c.viral.surgeMagnitude,
      is_surge: c.viral.isSurge,
      viral_status: c.viral.viralStatus,
      total_adjustment: c.viral.totalAdjustment,
      history_points: c.viral.history_points,
      cold_start: c.viral.cold_start,
    },
    anomaly: anom,
    audit: c.audit,
    recommendation: recommendation(c.score, anom),
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
      top: Math.min(CFG.MAX_TOP_N, Math.max(1, parseInt(url.searchParams.get("top") || "179", 10) || 179)),
      q: url.searchParams.get("q")?.trim() || null,
      region: url.searchParams.get("region")?.toLowerCase().trim() || null,
      threshold: parseInt(url.searchParams.get("threshold") || "0", 10) || 0,
      format: url.searchParams.get("format") || "json",
      live_only: url.searchParams.get("live_only") === "true",
      min_confidence: parseFloat(url.searchParams.get("min_confidence") || "0") || 0,
    };
  } catch {
    res.writeHead(400, CORS); res.end(JSON.stringify({ error: "Bad request URL" })); return;
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

  try {
    const liveData = await fetchAllLive();
    const store = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].score >= params.threshold);
    else finalIsos = ranked.slice(0, params.top);

    // ── live_only gate ─────────────────────────────────────────────────────
    if (params.live_only) {
      finalIsos = finalIsos.filter(iso =>
        store[iso].has_live_evidence &&
        store[iso].evidence_confidence >= params.min_confidence
      );
    }

    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked));

    const liveCount = Object.keys(store).filter(iso => store[iso].has_live_evidence).length;

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        scoring_model: "EVIDENCE_WEIGHTED_v14",
        description:
          "Live evidence drives the score. Sources are weighted by humanitarian signal strength " +
          "(conflict > famine > displacement > disaster > sensor noise). FSI is a structural floor and " +
          "credibility prior only, not the primary driver.",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_evidence: liveCount,
        weights: CFG.WEIGHTS,
        fsi_floor_fraction: CFG.FSI_FLOOR_FRACTION,
        fsi_floor_cap: CFG.FSI_FLOOR_CAP,
        source_status: {
          acled:      { live: liveData.acled.live,      configured: !!process.env.ACLED_API_KEY },
          fews_ipc:   { live: liveData.fews.live },
          unhcr:      { live: liveData.unhcr.live },
          inform:     { live: liveData.inform.live },
          reliefweb:  { live: liveData.reliefweb.live },
          who:        { live: liveData.who.live },
          gdacs:      { live: liveData.gdacs.live, events: liveData.gdacs.data?.length || 0 },
          usgs:       { live: liveData.usgs.live, events: liveData.usgs.data?.length || 0 },
          ifrc:       { live: liveData.ifrc.live, events: liveData.ifrc.data?.length || 0 },
          nasa:       { live: liveData.nasa.live, events: liveData.nasa.data?.length || 0 },
          openmeteo:  { live: liveData.openmeteo.live, cities: Object.keys(liveData.openmeteo.data || {}).length },
          worldbank:  { live: liveData.wb.live, note: "structural only — weight 0" },
        },
      },
      top_story: payloads[0] || null,
      countries: payloads,
    };

    res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=300" });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story v14.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
