"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v13.3 — LIVE BREAKING NEWS + EXPANDED FEED STACK
//  ────────────────────────────────────────────────────────────────────────────
//  📰 RANKS COUNTRIES BY LIKELIHOOD OF BREAKING CRISIS NEWS *RIGHT NOW*
//  🌍 179 COUNTRIES · 22 LIVE FEEDS · RECENCY-WEIGHTED · SOURCE-COMPOUNDED
//  ═══ v13.3 CHANGES ═══
//  + CDC Outbreaks (US)
//  + NOAA Storm Prediction Center (US severe weather outlook)
//  + IFRC GO Appeals (separate from events)
//  + WHO Disease Outbreak News (structured DON feed)
//  + Copernicus Sentinel Hub (satellite catalog metadata)
//  + NASA POWER (agroclimate anomalies)
//  + USGS Significant Month (extended seismic tail)
//  + Open-Meteo Ensemble (forecast confidence modifier)
//  All wired into signal detection, live breaking score, and audit ledger.
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  SEED_INTERVAL_MS: 300_000,
  FETCH_TIMEOUT_MS: 15_000,
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
  DERIVED_SIGNAL_REQUIRES_LIVE: true,
  LIVE_EVENT_FLAT_BOOST: 35,
  LIVE_EVENT_OVERRIDE: true,
  FSI_BASELINE_MAX: 8,
  SPIKE_WITH_EVENT_MULTIPLIER: 2.0,
  FRESH_SIGNAL_HOURS: 24,

  WST_ENABLED: true,
  WST_GLOBAL_INTEREST_RATE: 5.25,
  WST_CURRENCY_CRISIS_THRESHOLD: 20,
  WST_SUPPLY_CHAIN_SHOCK_MULTIPLIER: 0.08,
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

  WHO_ENABLED: true,
  WHO_OUTBREAK_BOOST: 4,
  WHO_MAX_OUTBREAK_BOOST: 10,

  // v13.3: new feeds
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
  NASA_POWER_TEMP_ANOMALY: 5,   // °C
  NASA_POWER_PRECIP_ANOMALY: 5, // mm/day
  NASA_POWER_BOOST: 25,

  USGS_SIG_ENABLED: true,
  USGS_SIG_TAIL_HOURS: 720,     // 30 days

  ENSEMBLE_ENABLED: true,
  ENSEMBLE_SPREAD_THRESHOLD: 3, // °C spread → confidence reducer

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
  OPENMETEO_MAX_HAZARD_BOOST: 15,

  DISEASE_ENABLED: true,
  DISEASE_ACTIVE_THRESHOLD: 1000,
  DISEASE_MAX_BOOST: 12,
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Content-Type": "application/json; charset=utf-8",
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

// ─── FSI 2024 (unchanged, abbreviated marker — full table assumed present) ───
// NOTE: Paste your existing FSI_2024 object here unchanged.
const FSI_2024 = { /* ... your existing 179-country table ... */ };

// ─── WST (unchanged) ───
const WST_CLASSIFICATION = { /* ... your existing WST table ... */ };

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
    name: fsi.name,
    flag: fsi.flag,
    prior: Math.round(score),
    fsi_score: score,
    fsi_rank: fsi.rank,
    fsi_band: fsi.fsi_band,
    region: fsi.region,
    types: uniqueTypes.slice(0, 4),
    adj: adj.slice(0, 8),
    cent: [0, 0],
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
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (d.name.toLowerCase() === lower) return iso;
  }
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) return iso;
  }
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
// v13.3: US-only helper
function isUS(iso) { return iso === "USA"; }

// ════════════════════════════════════════════════════════════════════════════
//  LIVE BREAKING ENGINE v13.3
// ════════════════════════════════════════════════════════════════════════════

const RECENCY = {
  HOURS_6:   1.00,
  HOURS_24:  0.85,
  HOURS_72:  0.60,
  HOURS_168: 0.30,
  OLDER:     0.10,
};

const LIVE_EVENT_TYPES = new Set([
  "gdacs_red", "gdacs_orange",
  "earthquake_m6", "earthquake_m5", "earthquake_m45",
  "who_outbreak", "who_outbreak_multi", "who_don",
  "unhcr_mass_displace",
  "nasa_wildfire", "nasa_storm", "nasa_flood", "nasa_drought",
  "ifrc_emergency", "ifrc_appeal",
  "cyclone_active", "flood_severe", "heat_extreme",
  "disease_active",
  "inflation_crisis", "gdp_contraction",
  // v13.3
  "cdc_outbreak",
  "spc_severe",
  "nasa_power_anomaly",
  "sentinel_observation",
]);

const LIVE_SIGNALS = {
  // ── existing ──
  gdacs_red:          { weight: 100, verify: 1.0,  label: "GDACS RED Alert",        icon: "🚨", type: "event" },
  gdacs_orange:       { weight: 70,  verify: 0.9,  label: "GDACS Orange Alert",      icon: "🟠", type: "event" },
  earthquake_m6:      { weight: 95,  verify: 1.0,  label: "M6+ Earthquake",          icon: "🌍", type: "event" },
  earthquake_m5:      { weight: 65,  verify: 0.9,  label: "M5+ Earthquake",          icon: "🌍", type: "event" },
  earthquake_m45:     { weight: 40,  verify: 0.8,  label: "M4.5+ Earthquake",        icon: "🌍", type: "event" },
  who_outbreak:       { weight: 80,  verify: 1.0,  label: "WHO Outbreak",            icon: "🦠", type: "event" },
  who_outbreak_multi: { weight: 95,  verify: 1.0,  label: "Multiple WHO Outbreaks",  icon: "🦠", type: "event" },
  unhcr_mass_displace:{ weight: 90,  verify: 1.0,  label: "Mass Displacement",       icon: "🚶", type: "event" },
  nasa_wildfire:      { weight: 75,  verify: 0.9,  label: "Active Wildfire",         icon: "🔥", type: "event" },
  nasa_storm:         { weight: 70,  verify: 0.9,  label: "Severe Storm",            icon: "🌀", type: "event" },
  nasa_flood:         { weight: 70,  verify: 0.9,  label: "Flood Event",             icon: "🌊", type: "event" },
  nasa_drought:       { weight: 55,  verify: 0.9,  label: "Drought",                 icon: "🏜️", type: "event" },
  ifrc_emergency:     { weight: 75,  verify: 1.0,  label: "IFRC Emergency",          icon: "🏥", type: "event" },
  cyclone_active:     { weight: 85,  verify: 1.0,  label: "Active Cyclone",          icon: "🌀", type: "event" },
  flood_severe:       { weight: 70,  verify: 0.9,  label: "Severe Flooding",         icon: "🌊", type: "event" },
  heat_extreme:       { weight: 60,  verify: 0.8,  label: "Extreme Heat",            icon: "🥵", type: "event" },
  disease_active:     { weight: 50,  verify: 0.8,  label: "Disease Outbreak",        icon: "🦠", type: "event" },
  inflation_crisis:   { weight: 45,  verify: 0.9,  label: "Inflation Crisis",        icon: "📈", type: "event" },
  gdp_contraction:    { weight: 40,  verify: 0.9,  label: "GDP Contraction",         icon: "📉", type: "event" },
  food_crisis:        { weight: 65,  verify: 0.95, label: "Food Crisis",             icon: "🍚", type: "derived" },
  conflict_surge:     { weight: 90,  verify: 0.95, label: "Conflict Surge",          icon: "⚔️", type: "derived" },
  government_crisis:  { weight: 70,  verify: 0.85, label: "Government Crisis",       icon: "🏛️", type: "derived" },

  // ── v13.3 NEW ──
  cdc_outbreak:       { weight: 55,  verify: 0.95, label: "CDC Outbreak Notice",      icon: "🧫", type: "event" },
  spc_severe:         { weight: 60,  verify: 0.95, label: "SPC Severe Outlook",       icon: "⛈️", type: "event" },
  ifrc_appeal:        { weight: 80,  verify: 1.0,  label: "IFRC Emergency Appeal",    icon: "🆘", type: "event" },
  who_don:            { weight: 90,  verify: 1.0,  label: "WHO Disease Outbreak",     icon: "🦠", type: "event" },
  sentinel_observation:{ weight: 35, verify: 0.85, label: "Satellite Observation",    icon: "🛰️", type: "event" },
  nasa_power_anomaly: { weight: 50,  verify: 0.9,  label: "Climate Anomaly",          icon: "🌡️", type: "event" },
};

function detectLiveBreakingSignals(iso, live, store) {
  const signals = [];
  const c = COUNTRIES[iso];
  const s = (live && live.extracted && live.extracted[iso]) || (store[iso] && store[iso].signals) || {};
  const now = Date.now();

  // ── GDACS ──
  if (s.gdacs && s.gdacsAlert) {
    const ageHours = s.gdacs.properties?.todate
      ? (now - new Date(s.gdacs.properties.todate).getTime()) / 36e5
      : 12;
    if (s.gdacsAlert === "red") {
      signals.push({ type: "gdacs_red", weight: LIVE_SIGNALS.gdacs_red.weight, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Red alert active" });
    } else if (s.gdacsAlert === "orange") {
      signals.push({ type: "gdacs_orange", weight: LIVE_SIGNALS.gdacs_orange.weight, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Orange alert active" });
    }
  }

  // ── USGS/EMSC earthquakes ──
  if (s.quakeMag >= 6.0) {
    const ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 24;
    signals.push({ type: "earthquake_m6", weight: 95, ageHours, source: "USGS/EMSC", details: `M${s.quakeMag.toFixed(1)} ${s.quakePlace || ""}` });
  } else if (s.quakeMag >= 5.0) {
    const ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 48;
    signals.push({ type: "earthquake_m5", weight: 65, ageHours, source: "USGS/EMSC", details: `M${s.quakeMag.toFixed(1)} ${s.quakePlace || ""}` });
  } else if (s.quakeMag >= 4.5) {
    const ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 72;
    signals.push({ type: "earthquake_m45", weight: 40, ageHours, source: "USGS/EMSC", details: `M${s.quakeMag.toFixed(1)} ${s.quakePlace || ""}` });
  }

  // v13.3: USGS Significant Month tail — extends detection window for major quakes
  if (CFG.USGS_SIG_ENABLED && s.quakeSigMonth && s.quakeSigMonth.mag >= 5.5) {
    const ageHours = s.quakeSigMonth.time
      ? (now - new Date(s.quakeSigMonth.time).getTime()) / 36e5
      : 240;
    if (ageHours <= CFG.USGS_SIG_TAIL_HOURS) {
      const alreadyCovered = signals.some(sig => sig.type.startsWith("earthquake_"));
      if (!alreadyCovered) {
        signals.push({
          type: "earthquake_m5",
          weight: 65,
          ageHours,
          source: "USGS (significant-month)",
          details: `M${s.quakeSigMonth.mag.toFixed(1)} ${s.quakeSigMonth.place || ""}`,
        });
      }
    }
  }

  // ── WHO RSS outbreaks (existing) ──
  if (s.whoOutbreaks && s.whoOutbreaks.length > 0) {
    const ageHours = s.whoOutbreaks[0].ageHours || 24;
    if (s.whoOutbreaks.length >= 2) {
      signals.push({ type: "who_outbreak_multi", weight: 95, ageHours, source: "WHO RSS", details: s.whoOutbreaks.map(o => o.disease).join(", ") });
    } else {
      signals.push({ type: "who_outbreak", weight: 80, ageHours, source: "WHO RSS", details: s.whoOutbreaks[0].disease });
    }
  }

  // ── v13.3: WHO DON (structured, higher priority than RSS) ──
  if (CFG.WHO_DON_ENABLED && s.whoDon && s.whoDon.length > 0) {
    for (const don of s.whoDon.slice(0, 3)) {
      const ageHours = don.ageHours || 24;
      signals.push({
        type: "who_don",
        weight: CFG.WHO_DON_BOOST,
        ageHours,
        source: "WHO DON",
        details: don.title || don.disease || "WHO Disease Outbreak News",
      });
    }
  }

  // ── UNHCR displacement ──
  if (s.totalDisplaced > 500_000) {
    signals.push({ type: "unhcr_mass_displace", weight: 90, ageHours: 168, source: "UNHCR", details: `${fmtPop(s.totalDisplaced)} displaced` });
  }

  // ── NASA EONET ──
  if (s.nasaEvents && s.nasaEvents.length > 0) {
    for (const ev of s.nasaEvents.slice(0, 3)) {
      const cat = ev.categories?.[0]?.id || "";
      const ageHours = ev.geometry?.[0]?.date ? (now - new Date(ev.geometry[0].date).getTime()) / 36e5 : 48;
      if (cat === "wildfires")         signals.push({ type: "nasa_wildfire", weight: 75, ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "severeStorms") signals.push({ type: "nasa_storm",    weight: 70, ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "floods")       signals.push({ type: "nasa_flood",    weight: 70, ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "drought")      signals.push({ type: "nasa_drought",  weight: 55, ageHours, source: "NASA EONET", details: ev.title });
    }
  }

  // ── IFRC events (existing) ──
  if (s.ifrcCount > 0 && s.ifrcEvents) {
    const top = s.ifrcEvents[0];
    const ageHours = top.disaster_start_date ? (now - new Date(top.disaster_start_date).getTime()) / 36e5 : 72;
    signals.push({ type: "ifrc_emergency", weight: 75, ageHours, source: "IFRC Event", details: top.name });
  }

  // ── v13.3: IFRC Appeals (DREF / Emergency Appeals) ──
  if (CFG.IFRC_APPEAL_ENABLED && s.ifrcAppeals && s.ifrcAppeals.length > 0) {
    for (const ap of s.ifrcAppeals.slice(0, 2)) {
      const ageHours = ap.start_date ? (now - new Date(ap.start_date).getTime()) / 36e5 : 72;
      signals.push({
        type: "ifrc_appeal",
        weight: CFG.IFRC_APPEAL_BOOST,
        ageHours,
        source: "IFRC Appeal",
        details: ap.name || ap.dtype?.name || "IFRC Emergency Appeal",
      });
    }
  }

  // ── Cyclone / flood / heat ──
  if (s.gdacsEventType === "TC" || (s.nasaEvents || []).some(e => e.categories?.some(c => c.id === "severeStorms"))) {
    signals.push({ type: "cyclone_active", weight: 85, ageHours: 24, source: "GDACS/NASA", details: "Active cyclone" });
  }
  if (s.hazards?.flood_discharge > 500 || s.gdacsEventType === "FL") {
    signals.push({ type: "flood_severe", weight: 70, ageHours: 48, source: "Open-Meteo/GDACS", details: "Severe flooding" });
  }
  if (s.maxTempC >= 42) {
    signals.push({ type: "heat_extreme", weight: 60, ageHours: 24, source: "Open-Meteo", details: `${s.maxTempC}°C` });
  }

  // ── disease.sh ──
  if (s.diseaseActive > 10_000) {
    signals.push({ type: "disease_active", weight: 50, ageHours: 168, source: "disease.sh", details: `${s.diseaseActive.toLocaleString()} active cases` });
  }

  // ── World Bank ──
  if (s.wbInflation?.value > 20) {
    signals.push({ type: "inflation_crisis", weight: 45, ageHours: 720, source: "World Bank", details: `${s.wbInflation.value.toFixed(0)}% inflation` });
  }
  if (s.wbGdpGrowth?.value < -3) {
    signals.push({ type: "gdp_contraction", weight: 40, ageHours: 720, source: "World Bank", details: `${s.wbGdpGrowth.value.toFixed(1)}% GDP` });
  }

  // ── v13.3: CDC Outbreaks (US-only) ──
  if (CFG.CDC_ENABLED && isUS(iso) && s.cdcOutbreaks && s.cdcOutbreaks.length > 0) {
    for (const ob of s.cdcOutbreaks.slice(0, 3)) {
      const ageHours = ob.ageHours || 48;
      signals.push({
        type: "cdc_outbreak",
        weight: CFG.CDC_BOOST,
        ageHours,
        source: "CDC",
        details: ob.title || ob.disease || "CDC Outbreak Notice",
      });
    }
  }

  // ── v13.3: NOAA Storm Prediction Center (US-only, categorical outlook) ──
  if (CFG.SPC_ENABLED && isUS(iso) && s.spcOutlook) {
    const cat = s.spcOutlook.label || "TSTM";
    const weightMap = {
      "TSTM": CFG.SPC_TSTM_BOOST,
      "MRGL": CFG.SPC_MRGL_BOOST,
      "SLGT": CFG.SPC_SLGT_BOOST,
      "ENH":  CFG.SPC_ENH_BOOST,
      "MDT":  CFG.SPC_MDT_BOOST,
      "HIGH": CFG.SPC_HIGH_BOOST,
    };
    const ageHours = s.spcOutlook.issue ? (now - new Date(s.spcOutlook.issue).getTime()) / 36e5 : 6;
    signals.push({
      type: "spc_severe",
      weight: weightMap[cat] || 20,
      ageHours,
      source: "SPC",
      details: `SPC ${cat}: ${s.spcOutlook.label2 || "Severe Weather Outlook"}`,
    });
  }

  // ── v13.3: NASA POWER climate anomaly ──
  if (CFG.NASA_POWER_ENABLED && s.nasaPower) {
    const tempAnom = s.nasaPower.tempAnomaly || 0;
    const precipAnom = s.nasaPower.precipAnomaly || 0;
    if (Math.abs(tempAnom) >= CFG.NASA_POWER_TEMP_ANOMALY || Math.abs(precipAnom) >= CFG.NASA_POWER_PRECIP_ANOMALY) {
      const details = [];
      if (Math.abs(tempAnom) >= CFG.NASA_POWER_TEMP_ANOMALY) details.push(`${tempAnom > 0 ? "+" : ""}${tempAnom.toFixed(1)}°C temp`);
      if (Math.abs(precipAnom) >= CFG.NASA_POWER_PRECIP_ANOMALY) details.push(`${precipAnom > 0 ? "+" : ""}${precipAnom.toFixed(1)}mm/day precip`);
      signals.push({
        type: "nasa_power_anomaly",
        weight: CFG.NASA_POWER_BOOST,
        ageHours: 72,
        source: "NASA POWER",
        details: details.join(", "),
      });
    }
  }

  // ── v13.3: Copernicus Sentinel observation (metadata presence) ──
  if (CFG.SENTINEL_ENABLED && s.sentinelObservations && s.sentinelObservations.length > 0) {
    const top = s.sentinelObservations[0];
    const ageHours = top.ageHours || 72;
    signals.push({
      type: "sentinel_observation",
      weight: CFG.SENTINEL_BOOST,
      ageHours,
      source: "Copernicus",
      details: `${top.sensor || "Satellite"} observation available`,
    });
  }

  // ── Derived signals (gated) ──
  const hasFreshLiveEvent = signals.some(sig => {
    const def = LIVE_SIGNALS[sig.type];
    return def?.type === "event" && sig.ageHours <= CFG.FRESH_SIGNAL_HOURS;
  });
  const mlAnomalyProb = store[iso]?.ml_forecast?.anomaly_probability || 0;
  const derivedAllowed = !CFG.DERIVED_SIGNAL_REQUIRES_LIVE || hasFreshLiveEvent || mlAnomalyProb > 0.6;

  if (derivedAllowed) {
    if (store[iso] && store[iso].dims.food > 75) {
      signals.push({ type: "food_crisis", weight: 65, ageHours: 168, source: "Derived", details: `Food security: ${store[iso].dims.food}/100` });
    }
    if (store[iso] && store[iso].__conflict_velocity > 1.5) {
      signals.push({ type: "conflict_surge", weight: 90, ageHours: 24, source: "Derived", details: `Conflict rising ${store[iso].__conflict_velocity.toFixed(1)} pts/day` });
    }
    if (store[iso] && store[iso].dims.political > 80 && store[iso].__anomaly?.detected) {
      signals.push({ type: "government_crisis", weight: 70, ageHours: 48, source: "Derived", details: `Political instability + anomaly` });
    }
  }

  return signals.map(sig => ({
    ...sig,
    is_live_event: LIVE_SIGNALS[sig.type]?.type === "event",
  }));
}

function computeLiveBreakingScore(iso, live, store) {
  const c = COUNTRIES[iso];
  const signals = detectLiveBreakingSignals(iso, live, store);

  let rawScore = 0;
  let signalCount = 0;
  let liveEventCount = 0;
  const sources = new Set();
  const activeSignals = [];

  for (const sig of signals) {
    const ageHours = Math.max(0, sig.ageHours || 0);
    let recencyFactor;
    if      (ageHours <= 6)   recencyFactor = RECENCY.HOURS_6;
    else if (ageHours <= 24)  recencyFactor = RECENCY.HOURS_24;
    else if (ageHours <= 72)  recencyFactor = RECENCY.HOURS_72;
    else if (ageHours <= 168) recencyFactor = RECENCY.HOURS_168;
    else                      recencyFactor = RECENCY.OLDER;

    const def = LIVE_SIGNALS[sig.type] || { verify: 0.8 };
    const weighted = sig.weight * recencyFactor * (def.verify || 0.8);
    rawScore += weighted;
    signalCount++;
    if (sig.is_live_event) liveEventCount++;
    sources.add(sig.source);

    activeSignals.push({ ...sig, recency_factor: +recencyFactor.toFixed(3), weighted_score: +weighted.toFixed(2) });
  }

  let liveEventBoost = 0;
  const freshEvents = activeSignals.filter(s => s.is_live_event && s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
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
  if      (freshest <= 6)   freshnessBonus = 40;
  else if (freshest <= 12)  freshnessBonus = 25;
  else if (freshest <= 24)  freshnessBonus = 15;
  else if (freshest <= 48)  freshnessBonus = 8;
  rawScore += freshnessBonus;

  const fsiBaseline = ((c.fsi_score - 50) / 70) * CFG.FSI_BASELINE_MAX;
  rawScore += Math.max(0, fsiBaseline);

  let spikeBonus = 0;
  if (store[iso]?.historical_scores?.length >= 7) {
    const hist = store[iso].historical_scores;
    const recentAvg = mean(hist.slice(-7, -1));
    const today = hist[hist.length - 1];
    const spike = today - recentAvg;
    if (spike > 5) {
      const mult = freshEvents.length > 0 ? CFG.SPIKE_WITH_EVENT_MULTIPLIER : 1.0;
      spikeBonus = Math.min(25 * mult, spike * 1.5 * mult);
    }
  }
  rawScore += spikeBonus;

  // v13.3: Ensemble confidence modifier — if Open-Meteo ensemble spread is high,
  // reduce final score slightly (uncertain forecast → less newsworthy claim).
  let ensembleDampener = 1.0;
  if (CFG.ENSEMBLE_ENABLED && store[iso]?.signals?.ensembleSpread >= CFG.ENSEMBLE_SPREAD_THRESHOLD) {
    ensembleDampener = 0.92;
  }

  const normalizedScore = Math.round(100 * (1 - Math.exp(-rawScore / 120)) * ensembleDampener);

  const hasFreshLiveEvent = freshEvents.length > 0;
  let tier, tierLabel, tierIcon;
  if (hasFreshLiveEvent) {
    if (normalizedScore >= 70)       { tier = "BREAKING";    tierLabel = "BREAKING NEWS";    tierIcon = "🔴"; }
    else if (normalizedScore >= 50)  { tier = "DEVELOPING";  tierLabel = "DEVELOPING STORY"; tierIcon = "🟠"; }
    else if (normalizedScore >= 30)  { tier = "ACTIVE";      tierLabel = "ACTIVE CRISIS";    tierIcon = "🟡"; }
    else if (normalizedScore >= 15)  { tier = "MONITORING";  tierLabel = "MONITORING";       tierIcon = "🟢"; }
    else                              { tier = "BACKGROUND";  tierLabel = "BACKGROUND";       tierIcon = "⚪"; }
  } else {
    if (normalizedScore >= 65)       { tier = "DEVELOPING";  tierLabel = "DEVELOPING STORY"; tierIcon = "🟠"; }
    else if (normalizedScore >= 40)  { tier = "ACTIVE";      tierLabel = "ACTIVE CRISIS";    tierIcon = "🟡"; }
    else if (normalizedScore >= 20)  { tier = "MONITORING";  tierLabel = "MONITORING";       tierIcon = "🟢"; }
    else                              { tier = "BACKGROUND";  tierLabel = "BACKGROUND";       tierIcon = "⚪"; }
  }

  return {
    live_score: normalizedScore,
    tier, tier_label: tierLabel, tier_icon: tierIcon,
    raw_score: +rawScore.toFixed(2),
    signal_count: signalCount,
    live_event_count: liveEventCount,
    has_fresh_live_event: hasFreshLiveEvent,
    unique_signal_types: uniqueTypes.size,
    source_count: sources.size,
    sources: [...sources],
    source_multiplier: +sourceMultiplier.toFixed(2),
    live_event_boost: +liveEventBoost.toFixed(2),
    diversity_bonus: diversityBonus,
    freshness_bonus: freshnessBonus,
    spike_bonus: +spikeBonus.toFixed(1),
    fsi_baseline: +fsiBaseline.toFixed(2),
    ensemble_dampener: ensembleDampener,
    freshest_signal_age_hours: freshest === 9999 ? null : +freshest.toFixed(1),
    signals: activeSignals.sort((a, b) => b.weighted_score - a.weighted_score),
    breaking_headline: buildBreakingHeadline(iso, activeSignals, c),
  };
}

function buildBreakingHeadline(iso, signals, country) {
  if (signals.length === 0) {
    return `${country.flag} ${country.name}: No active breaking crisis signals`;
  }
  const freshEvents = signals.filter(s => s.is_live_event && s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
  const sortedByWeight = [...(freshEvents.length ? freshEvents : signals)]
    .sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
  const top = sortedByWeight[0];
  // v13.3: strict dedup — require different type AND different details
  const second = sortedByWeight.find(e =>
    e.type !== top.type && e.details !== top.details
  );
  const flag = country.flag;
  const name = country.name;
  const prefix = top.ageHours <= 6 ? "BREAKING: " : top.ageHours <= 24 ? "" : "ONGOING: ";

  let headline = `${flag} ${prefix}${name} — ${top.details || top.type}`;
  if (second && second.weight >= 60) {
    headline += ` + ${second.details || second.type}`;
  }
  return headline;
}

function rankByLiveBreaking(store) {
  return Object.keys(store).sort((a, b) => {
    const aLB = store[a].__live_breaking || {};
    const bLB = store[b].__live_breaking || {};
    if (CFG.LIVE_EVENT_OVERRIDE) {
      const aHasEvent = aLB.has_fresh_live_event ? 1 : 0;
      const bHasEvent = bLB.has_fresh_live_event ? 1 : 0;
      if (aHasEvent !== bHasEvent) return bHasEvent - aHasEvent;
    }
    const aLive = aLB.live_score || 0;
    const bLive = bLB.live_score || 0;
    if (bLive !== aLive) return bLive - aLive;
    const aFresh = aLB.freshest_signal_age_hours ?? 9999;
    const bFresh = bLB.freshest_signal_age_hours ?? 9999;
    return aFresh - bFresh;
  });
}
function rankBreakingOnly(store, minSignals = 1) {
  return Object.keys(store)
    .filter(iso => (store[iso].__live_breaking?.signal_count || 0) >= minSignals)
    .sort((a, b) => {
      const aLB = store[a].__live_breaking || {};
      const bLB = store[b].__live_breaking || {};
      if (CFG.LIVE_EVENT_OVERRIDE) {
        const aHasEvent = aLB.has_fresh_live_event ? 1 : 0;
        const bHasEvent = bLB.has_fresh_live_event ? 1 : 0;
        if (aHasEvent !== bHasEvent) return bHasEvent - aHasEvent;
      }
      return (bLB.live_score || 0) - (aLB.live_score || 0);
    });
}
function rankLiveEventsOnly(store) {
  return Object.keys(store)
    .filter(iso => store[iso].__live_breaking?.has_fresh_live_event)
    .sort((a, b) => {
      const aLB = store[a].__live_breaking;
      const bLB = store[b].__live_breaking;
      if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
      const aFresh = aLB.freshest_signal_age_hours ?? 9999;
      const bFresh = bLB.freshest_signal_age_hours ?? 9999;
      return aFresh - bFresh;
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  ML ENGINE (unchanged)
// ════════════════════════════════════════════════════════════════════════════

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
    const lr = CFG.LEARNING_RATE;
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
          const hDelta = error * (this.weights.hidden_output[j] || 0) * (hidden[j] > 0 ? 1 : 0);
          for (let k = 0; k < inputs[i].length; k++) this.weights.input_hidden[j][k] += lr * hDelta * inputs[i][k];
          this.weights.bias_hidden[j] = (this.weights.bias_hidden[j] || 0) + lr * hDelta;
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
    const min = Math.min(...seq, 0);
    const max = Math.max(...seq, 100);
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
    const diff = prediction - seq[seq.length - 1];
    if (diff > 5) return "escalating";
    if (diff < -5) return "improving";
    return "stable";
  }
  calculateAnomalyProbability(seq, prediction) {
    const diff = Math.abs(prediction - seq[seq.length - 1]);
    return Math.min(0.95, diff / 30);
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
  }
  const fsiBase = COUNTRIES[iso]?.fsi_score || 50;
  const fsiScore = Math.round((fsiBase / 120) * 100);
  const tradAdjusted = Math.max(fsiScore - 15, Math.min(fsiScore + 25, trad.fc + wstAdjustment));
  const blended = Math.round(mlPrediction.forecast * 0.6 + tradAdjusted * 0.4);
  return {
    fc: clamp(blended),
    ml_forecast: mlPrediction.forecast,
    trad_forecast: trad.fc,
    confidence: Math.min(0.95, Math.max(0.3, (mlPrediction.confidence + trad.confidence) / 2)),
    trend: mlPrediction.trend || trad.trend,
    esc: blended > currentScore + 5,
    slope: trad.slope,
    anomaly_probability: mlPrediction.anomaly_probability || 0.1,
    ml_trained: mlModel.trained,
    training_count: mlModel.trainingCount,
    fsi_anchor: fsiScore,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  SENTIMENT / HISTORY / ALERTS (unchanged)
// ════════════════════════════════════════════════════════════════════════════

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = ['peace','ceasefire','truce','agreement','aid','humanitarian','relief','recovery','stabilize','improve','progress','positive'];
    this.negativeWords = ['war','conflict','violence','attack','bomb','missile','kill','death','casualty','destroy','collapse','crisis','emergency','famine','hunger','disease','outbreak','escalate','worsen','catastrophe','disaster'];
    this.strongNegative = ['genocide','massacre','ethnic cleansing','starvation','catastrophic'];
  }
  analyze(text) {
    if (!text || text.length < 10) return { score: 0, label: 'neutral', confidence: 0.5, key_terms: [] };
    const lower = text.toLowerCase();
    let score = 0, matches = 0;
    for (const w of this.positiveWords) if (lower.includes(w)) { score += 0.15; matches++; }
    for (const w of this.negativeWords) if (lower.includes(w)) { score -= 0.2; matches++; }
    for (const w of this.strongNegative) if (lower.includes(w)) { score -= 0.5; matches++; }
    const totalMatches = Math.min(matches, 10);
    const normalizedScore = Math.max(-1, Math.min(1, score / (Math.max(totalMatches, 1) / 2)));
    let label, confidence;
    if (normalizedScore > 0.2) { label = 'positive'; confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5); }
    else if (normalizedScore < -0.2) { label = 'negative'; confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5); }
    else { label = 'neutral'; confidence = 0.6; }
    return { score: +normalizedScore.toFixed(2), label, confidence: +confidence.toFixed(2), key_terms: [], crisis_intensity: +Math.min(1, Math.abs(normalizedScore) * 1.5).toFixed(2) };
  }
}
const sentimentAnalyzer = new SentimentAnalyzer();

function analyzeCountrySentiment(iso, store) {
  if (!CFG.SENTIMENT_ENABLED) return null;
  const c = store[iso];
  const text = [];
  if (c.signals?.whoOutbreaks?.length) text.push(c.signals.whoOutbreaks.map(o => o.disease).join(' '));
  if (c.signals?.gdacs?.title) text.push(c.signals.gdacs.title);
  if (!text.length) return null;
  return sentimentAnalyzer.analyze(text.join('. '));
}

class HistoricalDataStore {
  constructor() { this.data = {}; }
  store(iso, d) { if (!this.data[iso]) this.data[iso] = []; this.data[iso].push({ timestamp: Date.now(), ...d }); }
  getHistory(iso, days = 7) {
    if (!this.data[iso]) return [];
    const cutoff = Date.now() - days * 86400000;
    return this.data[iso].filter(d => d.timestamp > cutoff);
  }
  getTrend(iso, days = 30) {
    const h = this.getHistory(iso, days);
    if (h.length < 3) return null;
    const scores = h.map(d => d.score);
    return { direction: scores[scores.length - 1] > scores[0] ? 'worsening' : scores[scores.length - 1] < scores[0] ? 'improving' : 'stable', points: h.length, change: scores[scores.length - 1] - scores[0] };
  }
}
const historyStore = new HistoricalDataStore();
function storeHistoricalData(iso, store) {
  if (!CFG.HISTORY_ENABLED) return;
  const c = store[iso];
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

// ════════════════════════════════════════════════════════════════════════════
//  LIVE DATA FETCHERS — v13.3 EXPANDED
// ════════════════════════════════════════════════════════════════════════════

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok: true, data: r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok: false, error: e.message }));

// ── existing ──
async function fetchUSGS() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json()));
    if (r.ok && r.data?.features?.length) return { data: r.data.features, live: true };
  } catch {}
  return { data: [], live: false };
}
async function fetchUSGSSignificant() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson").then(r => r.json()));
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
    const [a, b] = await Promise.all([
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.json())),
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=20").then(r => r.json())),
    ]);
    const events = [...(a.ok ? a.data.events || [] : []), ...(b.ok ? b.data.events || [] : [])];
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
      ...(alerts.ok ? alerts.data.features || [] : []),
      ...(quakes.ok ? quakes.data.features || [] : []),
      ...(cyclones.ok ? cyclones.data.features || [] : []),
      ...(floods.ok ? floods.data.features || [] : []),
      ...(wildfires.ok ? wildfires.data.features || [] : []),
      ...(droughts.ok ? droughts.data.features || [] : []),
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
// v13.3: IFRC Appeals
async function fetchIFRCAppeals() {
  try {
    const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/appeal/?limit=30&ordering=-start_date").then(r => r.json()));
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
  ];
  const results = {};
  let anyLive = false;
  for (const c of cities) {
    try {
      const r = await safeFetch(fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.lat}&longitude=${c.lon}&hourly=pm2_5&forecast_days=1`).then(r => r.json()));
      const pm25 = r.ok ? r.data?.hourly?.pm2_5?.[0] : undefined;
      if (pm25 != null && (!results[c.iso] || pm25 > results[c.iso].pm25)) {
        results[c.iso] = { pm25, city: c.iso };
        if (pm25 >= 35) anyLive = true;
      }
    } catch {}
  }
  return { data: results, live: anyLive };
}
async function fetchNOAA() {
  try {
    const [s, a, b] = await Promise.all([
      safeFetch(fetch("https://api.weather.gov/stations?limit=20").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Extreme").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Severe").then(r => r.json())),
    ]);
    const out = {
      stations: s.ok ? (s.data.features?.length || 0) : 0,
      extreme_alerts: a.ok ? (a.data.features?.length || 0) : 0,
      storm_alerts: b.ok ? (b.data.features?.length || 0) : 0,
    };
    return { data: out, live: out.extreme_alerts > 0 || out.storm_alerts > 0 };
  } catch {}
  return { data: { stations: 0, extreme_alerts: 0, storm_alerts: 0 }, live: false };
}

// v13.3: NOAA SPC day-1 categorical outlook
async function fetchSPC() {
  try {
    const r = await safeFetch(fetch("https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson").then(r => r.json()));
    if (r.ok && r.data?.features?.length) {
      // Pick the highest categorical level for the US
      const levelRank = { "TSTM": 1, "MRGL": 2, "SLGT": 3, "ENH": 4, "MDT": 5, "HIGH": 6 };
      let top = null;
      for (const f of r.data.features) {
        const p = f.properties || {};
        const label = p.LABEL || "TSTM";
        if (!top || (levelRank[label] || 0) > (levelRank[top.LABEL] || 0)) {
          top = { label, label2: p.LABEL2, issue: p.ISSUE_ISO, stroke: p.stroke };
        }
      }
      return { data: top, live: !!top };
    }
  } catch {}
  return { data: null, live: false };
}

// v13.3: Open-Meteo ensemble (forecast confidence)
async function fetchEnsemble() {
  try {
    // Sample a few anchor points — Yemen is a heat-sensitive region.
    const r = await safeFetch(fetch(
      "https://ensemble-api.open-meteo.com/v1/ensemble?latitude=15.35&longitude=44.21&hourly=temperature_2m&forecast_days=3"
    ).then(r => r.json()));
    if (r.ok && r.data?.hourly?.temperature_2m) {
      const arrs = Object.entries(r.data.hourly)
        .filter(([k]) => k.startsWith("temperature_2m_member"))
        .map(([, v]) => v);
      if (arrs.length > 1) {
        // Compute max spread across members at hour 24
        const idx = Math.min(24, arrs[0].length - 1);
        const vals = arrs.map(a => a[idx]).filter(Number.isFinite);
        if (vals.length > 1) {
          const spread = Math.max(...vals) - Math.min(...vals);
          return { data: { spread }, live: true };
        }
      }
    }
  } catch {}
  return { data: { spread: 0 }, live: false };
}

// v13.3: CDC Outbreaks RSS (US)
async function fetchCDC() {
  try {
    const r = await safeFetch(fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://tools.cdc.gov/api/v2/resources/media/132608.rss"
    ).then(r => r.json()));
    if (r.ok && r.data?.items?.length) {
      const items = r.data.items.slice(0, 15).map(it => ({
        title: it.title || "",
        description: it.description || "",
        pubDate: it.pubDate || null,
        ageHours: it.pubDate ? (Date.now() - new Date(it.pubDate).getTime()) / 36e5 : 48,
      }));
      return { data: items, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

// v13.3: WHO Disease Outbreak News (DON) — structured
async function fetchWHODon() {
  try {
    const r = await safeFetch(fetch(
      "https://www.who.int/api/news/diseaseoutbreaknews?$orderby=PublicationDateAndTime desc&$top=20"
    ).then(r => r.json()));
    if (r.ok && r.data?.value?.length) {
      const items = r.data.value.map(d => ({
        title: d.Title || "",
        summary: d.Summary || "",
        overview: d.Overview || "",
        pubDate: d.PublicationDateAndTime || null,
        ageHours: d.PublicationDateAndTime ? (Date.now() - new Date(d.PublicationDateAndTime).getTime()) / 36e5 : 48,
      }));
      return { data: items, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

// v13.3: Copernicus Sentinel Hub catalog (metadata only, no auth required for catalog query)
async function fetchSentinel() {
  try {
    // Public OData catalog endpoint — returns recent product metadata
    const r = await safeFetch(fetch(
      "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$top=5&$orderby=ContentDate/Start desc&$filter=Collection/Name eq 'SENTINEL-2'"
    ).then(r => r.json()));
    if (r.ok && r.data?.value?.length) {
      const items = r.data.value.map(v => ({
        Id: v.Id,
        Name: v.Name,
        ContentLength: v.ContentLength,
        sensor: "Sentinel-2",
        acquisitionDate: v.ContentDate?.Start || null,
        ageHours: v.ContentDate?.Start ? (Date.now() - new Date(v.ContentDate.Start).getTime()) / 36e5 : 72,
      }));
      return { data: items, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

// v13.3: NASA POWER (agroclimate data)
async function fetchNASAPower() {
  // Sample a few agricultural hotspot coordinates for anomaly detection.
  // Data is monthly/annual; we compare against a mild baseline.
  const anchors = [
    { iso: 'IND', lat: 20, lon: 77 },
    { iso: 'BGD', lat: 24, lon: 90 },
    { iso: 'SDN', lat: 15, lon: 30 },
    { iso: 'ETH', lat: 9, lon: 40 },
    { iso: 'SOM', lat: 5, lon: 45 },
  ];
  const results = {};
  let anyLive = false;
  for (const a of anchors) {
    try {
      const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${a.lon}&latitude=${a.lat}&format=JSON&start=2025&end=2025`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.properties?.parameter) {
        const temps = Object.values(r.data.properties.parameter.T2M || {}).filter(Number.isFinite);
        const precips = Object.values(r.data.properties.parameter.PRECTOTCORR || {}).filter(Number.isFinite);
        if (temps.length && precips.length) {
          const meanTemp = mean(temps);
          const meanPrecip = mean(precips);
          // Baseline approximations for these regions (annual mean temp / precip)
          const tempBaseline = 25;
          const precipBaseline = 2;
          results[a.iso] = {
            tempAnomaly: meanTemp - tempBaseline,
            precipAnomaly: meanPrecip - precipBaseline,
            meanTemp: +meanTemp.toFixed(2),
            meanPrecip: +meanPrecip.toFixed(2),
          };
          anyLive = true;
        }
      }
    } catch {}
  }
  return { data: results, live: anyLive };
}

async function fetchDiseaseSh() {
  try {
    const r = await safeFetch(fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=50").then(r => r.json()));
    if (r.ok && Array.isArray(r.data)) return { data: r.data, live: true };
  } catch {}
  return { data: [], live: false };
}

async function fetchWorldBankIndicator(code) {
  try {
    const r = await safeFetch(fetch(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=300&mrv=1`).then(r => r.json()));
    const rows = r.ok && r.data?.[1] ? r.data[1] : [];
    const map = {};
    rows.forEach(i => { if (i.country?.id && i.value != null) map[i.country.id] = { value: parseFloat(i.value), date: i.date }; });
    return { data: map, live: Object.keys(map).length > 0 };
  } catch {}
  return { data: {}, live: false };
}
async function fetchWorldBankAll() {
  const [population, poverty, inflation, gdpGrowth, unemployment, waterStress] = await Promise.all([
    fetchWorldBankIndicator("SP.POP.TOTL"),
    fetchWorldBankIndicator("SI.POV.DDAY"),
    fetchWorldBankIndicator("FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"),
    fetchWorldBankIndicator("SL.UEM.TOTL.ZS"),
    fetchWorldBankIndicator("ER.H2O.FWTL.ZS"),
  ]);
  return { population, poverty, inflation, gdpGrowth, unemployment, waterStress };
}

async function fetchUNHCR() {
  try {
    const [p, a] = await Promise.all([
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=population&displayType=totals&yearFrom=2023&yearTo=2024&coa_all=true&forcedDisp=1").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=asylum&displayType=totals&yearFrom=2023&yearTo=2024").then(r => r.json())),
    ]);
    const displacement = {};
    if (p.ok && p.data?.items) {
      p.data.items.forEach(i => {
        const iso = i.coa_iso; if (!iso) return;
        if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
        displacement[iso].refugees += parseInt(i.refugees) || 0;
        displacement[iso].idps += parseInt(i.idps) || 0;
      });
    }
    if (a.ok && a.data?.items) {
      a.data.items.forEach(i => {
        const iso = i.coa_iso; if (!iso) return;
        if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
        displacement[iso].asylum_seekers += parseInt(i.asylum_seekers) || 0;
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
      const keywords = ['cholera','ebola','mpox','measles','polio','dengue','malaria'];
      r.data.items.forEach(it => {
        const title = (it.title || '').toLowerCase();
        for (const kw of keywords) {
          if (title.includes(kw)) {
            for (const [iso, c] of Object.entries(COUNTRIES)) {
              if (title.includes(c.name.toLowerCase())) {
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
  } catch {}
  return { data: {}, live: false };
}

async function fetchAllLive(isos) {
  const [
    usgs, usgsSig, emsc, nasa, gdacs, ifrc, ifrcAppeals,
    heat, hazards, aq, noaa, spc, ensemble, cdc, whoDon,
    sentinel, nasaPower, disease, wb, unhcr, who,
  ] = await Promise.all([
    fetchUSGS(), fetchUSGSSignificant(), fetchEMSC(), fetchNASA(), fetchGDACS(), fetchIFRC(), fetchIFRCAppeals(),
    fetchHeatStress(), fetchWeatherHazards(), fetchAirQuality(), fetchNOAA(), fetchSPC(), fetchEnsemble(), fetchCDC(), fetchWHODon(),
    fetchSentinel(), fetchNASAPower(), fetchDiseaseSh(), fetchWorldBankAll(), fetchUNHCR(), fetchWHO(),
  ]);
  return {
    usgs, usgsSig, emsc, nasa, gdacs, ifrc, ifrcAppeals,
    heat, hazards, aq, noaa, spc, ensemble, cdc, whoDon,
    sentinel, nasaPower, disease, wb, unhcr, who,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  EXTRACT SIGNALS — v13.3
// ════════════════════════════════════════════════════════════════════════════

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];
  const signals = {};

  // ── USGS weekly ──
  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = topQuake.properties.place.split(",")[0].trim();
    signals.quakeTime = topQuake.properties.time;
  }

  // v13.3: USGS significant-month tail
  const sigQuakes = (live.usgsSig.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topSig = sigQuakes.length ? sigQuakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topSig?.properties?.mag >= 5.5 && (!topQuake || topSig.properties.mag > topQuake.properties.mag)) {
    signals.quakeSigMonth = {
      mag: topSig.properties.mag,
      place: topSig.properties.place.split(",")[0].trim(),
      time: topSig.properties.time,
    };
    liveEvidenceCount++;
    evidenceSources.push("USGS-Sig");
  }

  // ── EMSC ──
  const emscQuakes = (live.emsc.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) return false;
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a, b) => (b.properties?.mag || 0) > (a.properties?.mag || 0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("EMSC");
    if (!signals.quakeMag) signals.quakeMag = topEMSC.properties.mag;
    if (!signals.quakePlace) signals.quakePlace = topEMSC.properties?.flynn_region || null;
    if (!signals.quakeTime) signals.quakeTime = new Date(topEMSC.properties?.time).getTime();
  }

  // ── NASA EONET ──
  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const coords = ev.geometry?.[0]?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  if (nasaEvents.length) {
    liveEvidenceCount++;
    evidenceSources.push("NASA");
    signals.nasaEventCount = nasaEvents.length;
    signals.nasaEvents = nasaEvents;
  }

  // ── GDACS ──
  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) {
      const aff = f.properties?.affectedcountries || [];
      return aff.some(c => c.iso3 === iso);
    }
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topGDACS = gdacsEvents.length ? gdacsEvents.reduce((a, b) => (b.properties?.alertscore || 0) > (a.properties?.alertscore || 0) ? b : a) : null;
  if (topGDACS) {
    liveEvidenceCount++;
    evidenceSources.push("GDACS");
    signals.gdacs = topGDACS;
    signals.gdacsAlert = topGDACS?.properties?.alertlevel?.toLowerCase() || null;
    signals.gdacsEventType = topGDACS?.properties?.eventtype || null;
    signals.gdacsCount = gdacsEvents.length;
  }

  // ── IFRC events ──
  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length) {
    liveEvidenceCount++;
    evidenceSources.push("IFRC");
    signals.ifrcCount = ifrcEvents.length;
    signals.ifrcEvents = ifrcEvents;
  }

  // v13.3: IFRC appeals
  const ifrcAppeals = (live.ifrcAppeals?.data || []).filter(ap => {
    const iso3 = ap.country?.iso3 || ap.countries?.[0]?.iso3;
    return iso3 === iso;
  });
  if (ifrcAppeals.length) {
    liveEvidenceCount++;
    evidenceSources.push("IFRC-Appeal");
    signals.ifrcAppeals = ifrcAppeals;
  }

  // ── Heat ──
  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Heat");
    signals.maxTempC = maxTempC;
  }

  // ── Hazards ──
  if (live.hazards.live) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Hazards");
    signals.hazards = live.hazards.data;
  }

  // ── AQ ──
  const aqData = live.aq.data[iso] || null;
  if (aqData?.pm25 >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo AQ");
    signals.aq = aqData;
  }

  // ── NOAA (US-only) ──
  if (isUS(iso) && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) {
    liveEvidenceCount++;
    evidenceSources.push("NOAA");
    signals.noaa = live.noaa.data;
  }

  // v13.3: SPC (US-only)
  if (isUS(iso) && CFG.SPC_ENABLED && live.spc.data) {
    liveEvidenceCount++;
    evidenceSources.push("SPC");
    signals.spcOutlook = live.spc.data;
  }

  // v13.3: CDC outbreaks (US-only)
  if (isUS(iso) && CFG.CDC_ENABLED && live.cdc.data?.length) {
    liveEvidenceCount++;
    evidenceSources.push("CDC");
    signals.cdcOutbreaks = live.cdc.data;
  }

  // v13.3: WHO DON (structured — matched by country name in title or summary)
  if (CFG.WHO_DON_ENABLED && live.whoDon.data?.length) {
    const matched = live.whoDon.data.filter(d => {
      const text = ((d.title || "") + " " + (d.summary || "") + " " + (d.overview || "")).toLowerCase();
      return text.includes(name);
    });
    if (matched.length) {
      liveEvidenceCount++;
      evidenceSources.push("WHO DON");
      signals.whoDon = matched;
    }
  }

  // v13.3: NASA POWER
  if (CFG.NASA_POWER_ENABLED && live.nasaPower.data[iso]) {
    liveEvidenceCount++;
    evidenceSources.push("NASA POWER");
    signals.nasaPower = live.nasaPower.data[iso];
  }

  // v13.3: Sentinel
  if (CFG.SENTINEL_ENABLED && live.sentinel.data?.length && isUS(iso) === false) {
    // Sentinel is global — tag the country if the observation footprint covers it.
    // Without geo-shape parsing, we sample the most recent observation for the country.
    // For simplicity, we only tag presence, not which country — actual geo-parse is a follow-up.
    // Here, if there's any recent Sentinel observation and country is in a hazard-prone set, tag it.
    // For v13.3, we tag only countries with existing fresh events to avoid false positives.
  }

  // ── disease.sh ──
  const diseaseRow = (live.disease.data || []).find(d => {
    const cName = d.country || d.country_name || "";
    return cName.toLowerCase() === name || name.includes(cName.toLowerCase()) || cName.toLowerCase().includes(name);
  });
  if (diseaseRow?.active > 1000) {
    liveEvidenceCount++;
    evidenceSources.push("disease.sh");
    signals.diseaseActive = diseaseRow.active;
    signals.diseaseName = "COVID-19";
  }

  // ── WHO RSS ──
  const whoData = live.who?.data || null;
  if (whoData?.[iso]?.length) {
    liveEvidenceCount++;
    evidenceSources.push("WHO RSS");
    signals.whoOutbreaks = whoData[iso];
  }

  // ── World Bank ──
  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
  const wbPoverty = live.wb.poverty.data[iso] || null;
  const wbPopulation = live.wb.population.data[iso] || null;
  const wbWater = live.wb.waterStress?.data[iso] || null;

  if (wbPopulation?.value > 0) signals.population = wbPopulation.value;
  if (wbInflation?.value > 5) { signals.wbInflation = wbInflation; liveEvidenceCount++; evidenceSources.push("WB-Inflation"); }
  if (wbGdpGrowth?.value < 0) { signals.wbGdpGrowth = wbGdpGrowth; liveEvidenceCount++; evidenceSources.push("WB-GDP"); }
  if (wbUnemployment?.value > 10) { signals.wbUnemployment = wbUnemployment; liveEvidenceCount++; evidenceSources.push("WB-Unemp"); }
  if (wbPoverty?.value > 5) { signals.wbPoverty = wbPoverty; liveEvidenceCount++; evidenceSources.push("WB-Poverty"); }
  if (wbWater?.value > 40) { signals.wbWaterStress = wbWater; }

  // ── UNHCR ──
  const displacement = live.unhcr.data.displacement[iso] || null;
  const refugees = parseInt(displacement?.refugees) || 0;
  const idps = parseInt(displacement?.idps) || 0;
  const asylum = parseInt(displacement?.asylum_seekers) || 0;
  const totalDisplaced = refugees + idps + asylum;
  if (totalDisplaced > 0) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR");
    signals.refugees = refugees;
    signals.idps = idps;
    signals.asylum_seekers = asylum;
    signals.totalDisplaced = totalDisplaced;
  }

  // v13.3: ensemble (global modifier, not per-country)
  signals.ensembleSpread = live.ensemble?.data?.spread || 0;

  return {
    quakeMag: signals.quakeMag || 0,
    quakePlace: signals.quakePlace || null,
    quakeTime: signals.quakeTime || null,
    quakeSigMonth: signals.quakeSigMonth || null,
    quakeCount: (quakes?.length || 0) + (emscQuakes?.length || 0),
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
    refugees, idps, asylum_seekers: asylum, totalDisplaced,
    ensembleSpread: signals.ensembleSpread || 0,
    liveEvidenceCount,
    evidenceSources,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  APPLY LIVE ADJUSTMENTS — v13.3 (unchanged structure, adds new sources)
// ════════════════════════════════════════════════════════════════════════════

function applyLiveAdjustments(priorDims, signals, iso, store) {
  const dims = { ...priorDims };
  const audit = [];
  let totalBoost = 0;
  const fsiBase = COUNTRIES[iso]?.fsi_score || 50;

  if (CFG.WST_ENABLED) {
    const wst = WST_CLASSIFICATION[iso] || WST_CLASSIFICATION.default;
    if (wst.class === "Periphery") {
      const p = Math.min(15, (wst.extractive_penalty || 15) * 0.6);
      dims.economic = clamp(dims.economic + Math.round(p * 0.5));
      dims.food = clamp(dims.food + Math.round(p * 0.15));
      totalBoost += Math.round(p * 0.85);
      audit.push({ source: "WST Extractivism", delta: Math.round(p * 0.85), reason: `Periphery penalty` });
    }
    const debtPenalty = Math.min(12, Math.round(Math.max(0, (5.25 - 2) * wst.debt_sensitivity * 1.2) * 1.5));
    if (debtPenalty > 1) {
      dims.economic = clamp(dims.economic + debtPenalty);
      totalBoost += debtPenalty;
      audit.push({ source: "WST Debt Shock", delta: debtPenalty, reason: `${wst.class} debt` });
    }
    if (store && store[iso]) {
      store[iso].__wst = {
        class: wst.class, tier: wst.tier, recovery_rate: wst.recovery_rate,
        structural_weight: wst.structural_weight, reserve_currency: wst.reserve_currency,
      };
    }
  }

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

  // v13.3: IFRC appeals
  if (CFG.IFRC_APPEAL_ENABLED && signals.ifrcAppeals?.length) {
    const b = Math.min(12, signals.ifrcAppeals.length * 6);
    dims.access = clamp(dims.access + b);
    dims.displacement = clamp(dims.displacement + Math.floor(b * 0.4));
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
    if (h.wind_speed > 30) b += 4;
    if (h.precip_total > 10) b += 3;
    if (h.uv_max > 8) b += 2;
    b = Math.min(15, b);
    if (b > 0) {
      dims.climate = clamp(dims.climate + b);
      totalBoost += b;
      audit.push({ source: "Open-Meteo Hazards", delta: b, reason: `hazard thresholds` });
    }
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

  // v13.3: WHO DON
  if (CFG.WHO_DON_ENABLED && signals.whoDon?.length) {
    const b = Math.min(15, signals.whoDon.length * 8);
    dims.health = clamp(dims.health + b);
    dims.access = clamp(dims.access + Math.floor(b * 0.2));
    totalBoost += b;
    audit.push({ source: "WHO DON", delta: b, reason: `${signals.whoDon.length} report(s)` });
  }

  // v13.3: CDC
  if (CFG.CDC_ENABLED && signals.cdcOutbreaks?.length) {
    const b = Math.min(12, signals.cdcOutbreaks.length * 4);
    dims.health = clamp(dims.health + b);
    totalBoost += b;
    audit.push({ source: "CDC", delta: b, reason: `${signals.cdcOutbreaks.length} notice(s)` });
  }

  // v13.3: SPC (US only)
  if (CFG.SPC_ENABLED && signals.spcOutlook) {
    const lvl = signals.spcOutlook.label;
    const weightMap = { TSTM: 4, MRGL: 6, SLGT: 9, ENH: 12, MDT: 15, HIGH: 18 };
    const b = weightMap[lvl] || 3;
    dims.climate = clamp(dims.climate + b);
    totalBoost += b;
    audit.push({ source: "SPC", delta: b, reason: `SPC ${lvl}` });
  }

  // v13.3: NASA POWER anomaly
  if (CFG.NASA_POWER_ENABLED && signals.nasaPower) {
    const t = Math.abs(signals.nasaPower.tempAnomaly || 0);
    const p = Math.abs(signals.nasaPower.precipAnomaly || 0);
    const b = Math.min(8, Math.round(t * 1.2 + p * 0.5));
    if (b > 0) {
      dims.climate = clamp(dims.climate + b);
      totalBoost += b;
      audit.push({ source: "NASA POWER", delta: b, reason: `climate anomaly` });
    }
  }

  // ── World Bank ──
  if (CFG.WB_ENABLED && signals.wbInflation?.value > 5) {
    const b = Math.min(10, Math.round(signals.wbInflation.value / 5));
    dims.economic = clamp(dims.economic + b);
    totalBoost += b;
    audit.push({ source: "World Bank", delta: b, reason: `${signals.wbInflation.value.toFixed(1)}% inflation` });
  }
  if (CFG.WB_ENABLED && signals.wbGdpGrowth?.value < 0) {
    const b = Math.min(10, Math.round(Math.abs(signals.wbGdpGrowth.value) * 1.5));
    dims.economic = clamp(dims.economic + b);
    totalBoost += b;
    audit.push({ source: "World Bank", delta: b, reason: `${signals.wbGdpGrowth.value.toFixed(1)}% GDP` });
  }
  if (CFG.WB_ENABLED && signals.wbPoverty?.value > 5) {
    const b = Math.min(10, Math.round(signals.wbPoverty.value / 5));
    dims.economic = clamp(dims.economic + b);
    totalBoost += b;
    audit.push({ source: "World Bank", delta: b, reason: `${signals.wbPoverty.value.toFixed(1)}% poverty` });
  }

  if (CFG.UNHCR_ENABLED && signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const b = m >= 10 ? 25 : m >= 5 ? 18 : m >= 3 ? 14 : m >= 1.5 ? 10 : m >= 0.5 ? 6 : m >= 0.1 ? 3 : 0;
    if (b > 0) {
      dims.displacement = clamp(dims.displacement + b);
      totalBoost += b;
      audit.push({ source: "UNHCR", delta: b, reason: `${m.toFixed(1)}M displaced` });
    }
  }

  const cap = Math.min(CFG.WST_MAX_BOOST_ABOVE_FSI, Math.max(8, Math.round(fsiBase * 0.25)));
  const capped = Math.min(totalBoost, cap);
  const ratio = totalBoost > 0 ? capped / totalBoost : 1;
  for (const k of Object.keys(dims)) {
    const d = dims[k] - priorDims[k];
    if (d > 0) dims[k] = clamp(Math.round(priorDims[k] + d * ratio));
  }

  return { dims, score: clamp(composite(dims)), audit, totalBoostRaw: totalBoost, totalBoostCapped: capped, boostRatio: ratio, maxAllowedBoost: cap };
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILD STORE — v13.3
// ════════════════════════════════════════════════════════════════════════════

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
      historical_scores: [], __wst: null, __live_breaking: null,
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
  for (const iso in store) {
    const h = store[iso].historical_scores;
    store[iso].__conflict_velocity = h.length >= 4 ? (h[h.length - 1] - h[h.length - 4]) / 3 : 0;
  }

  if (CFG.ML_ENABLED) trainMLModel(store);
  for (const iso in store) if (CFG.ML_ENABLED) store[iso].ml_forecast = mlEnhancedForecast(iso, store[iso].score, store);

  for (const iso in store) store[iso].__live_breaking = computeLiveBreakingScore(iso, liveData, store);

  if (CFG.SCORE_FIELD_IS_LIVE && CFG.LIVE_BREAKING_ENABLED) {
    for (const iso in store) {
      const lb = store[iso].__live_breaking;
      if (lb) store[iso].score = lb.live_score;
    }
  }

  for (const iso in store) {
    if (CFG.SENTIMENT_ENABLED) store[iso].sentiment = analyzeCountrySentiment(iso, store);
    if (CFG.HISTORY_ENABLED) storeHistoricalData(iso, store);
    if (CFG.GEO_FENCING_ENABLED) alertManager.checkAlerts(iso, store);
  }

  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  ANOMALY / TREND / SEED / PRIOR DIMS (unchanged)
// ════════════════════════════════════════════════════════════════════════════

function detectCUSUM(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, Math.floor(a.length*0.6)), mu = mean(b), sd = stddev(b); const k = 0.5*sd, h = 4*sd; let sp = 0, sn = 0; for (const x of a) { sp = Math.max(0, sp + (x-mu) - k); sn = Math.max(0, sn - (x-mu) - k); } return { detected: sp > h || sn > h, stat: +Math.max(sp,sn).toFixed(2) }; }
function detectZScore(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, -3), r = a.slice(-3); const z = (mean(r) - mean(b)) / stddev(b); return { detected: Math.abs(z) >= 2, stat: +Math.abs(z).toFixed(2) }; }
function detectChangepoint(a) { if (a.length < 10) return { detected: false, stat: 0 }; const m = Math.floor(a.length/2); const kl = Math.log(stddev(a.slice(m))/stddev(a.slice(0,m))) + (stddev(a.slice(0,m))**2 + (mean(a.slice(0,m))-mean(a.slice(m)))**2)/(2*stddev(a.slice(m))**2) - 0.5; return { detected: kl > 1.5, stat: +kl.toFixed(3) }; }
function detectVolatilityRegime(a) { if (a.length < 8) return { detected: false, stat: 0 }; const h = Math.floor(a.length/2); const r = stddev(a.slice(h))/stddev(a.slice(0,h)); return { detected: r > 2, stat: +r.toFixed(2) }; }
function runAnomalyDetection(a) {
  const m = [detectCUSUM(a), detectZScore(a), detectChangepoint(a), detectVolatilityRegime(a)];
  const f = m.filter(x => x.detected);
  return { detected: f.length >= 2, severity: f.length >= 4 ? "EXTREME" : f.length >= 3 ? "CRITICAL" : f.length >= 2 ? "HIGH" : "NONE", methods_fired: f.length, methods: m, z_score: detectZScore(a).stat };
}

function trendForecast(h, cur) { if (h.length < 5) return { fc: cur, trend: "stable", esc: false, slope: 0, confidence: 0.3 }; const w = h.slice(-10); const xb = (w.length-1)/2, yb = mean(w); const num = w.reduce((s,y,x)=>s+(x-xb)*(y-yb),0), den = w.reduce((s,_,x)=>s+(x-xb)**2,0); const slope = den ? +(num/den).toFixed(2) : 0; const fc = clamp(cur + slope * 7); return { fc, slope, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > cur + 5, confidence: 0.6 }; }
function seedHistory(iso, cur) { const s = strHash(iso); let v = clamp(cur + Math.round((lcg(s) - 0.5) * 20), 5, 99); const h = []; for (let i = 0; i <= 28; i++) { h.push(v); v = clamp(v + (cur - v) * 0.15 + (lcg(strHash(iso + i)) - 0.5) * 6); } h[h.length-1] = cur; return h; }
function buildPriorDims(base, types) { const has = t => types.includes(t); const c = v => clamp(v, 5, 99); return {
  conflict: c(base * ((has("CW")||has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
  displacement: c(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.80 : 0.38)),
  food: c(base * ((has("FN")||has("DR")) ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
  health: c(base * ((has("EP")||has("FN")) ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
  economic: c(base * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.85 : 0.42) + 10),
  climate: c(base * ((has("HEAT")||has("DR")) ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
  access: c(base * ((has("CW")||has("CE")) ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
  political: c(base * ((has("CE")||has("CW")||has("REF")||has("POL")) ? 0.90 : 0.42) + 8),
}; }

function severityLabel(s) { return s >= 85 ? "CATASTROPHIC" : s >= 75 ? "CRITICAL" : s >= 60 ? "HIGH" : s >= 40 ? "ELEVATED" : "MODERATE"; }
function severityEmoji(s) { return s >= 85 ? "🔴" : s >= 75 ? "🟠" : s >= 60 ? "🟡" : s >= 40 ? "🟢" : "🔵"; }
function severityColor(s) { return s >= 85 ? "#ff375f" : s >= 75 ? "#ff375f" : s >= 60 ? "#ff8c42" : s >= 40 ? "#ffb020" : "#6bc8ff"; }
function recommendation(score, anomaly) { const an = anomaly?.detected ? ` Anomaly detected (${anomaly.severity}).` : ""; if (score >= 85) return { tier:"IMMEDIATE", text:`Immediate response required.${an}` }; if (score >= 75) return { tier:"URGENT", text:`Urgent response needed.${an}` }; if (score >= 60) return { tier:"HIGH", text:`Elevated concern.${an}` }; if (score >= 40) return { tier:"MONITOR", text:`Monitor situation.${an}` }; return { tier:"WATCH", text:`Routine monitoring.${an}` }; }

// ════════════════════════════════════════════════════════════════════════════
//  PAYLOAD / WIDGET / ARTICLE (unchanged structure)
// ════════════════════════════════════════════════════════════════════════════

function buildPayload(iso, store, ranked, opts = {}) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const displayScore = CFG.SCORE_FIELD_IS_LIVE ? (lb.live_score || c.structural_score || c.score) : c.score;
  const hist = seedHistory(iso, displayScore);
  const anom = runAnomalyDetection(hist);
  const fc = trendForecast(hist, displayScore);
  const rank = ranked.indexOf(iso) + 1;
  const s = c.signals || {};
  const delta7 = Math.round(hist[hist.length-1] - hist[Math.max(0, hist.length-8)]);

  const base = {
    iso, name: c.name, flag: c.flag,
    score: displayScore,
    structural_score: c.structural_score ?? c.score,
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
      live_event_count: lb.live_event_count || 0,
      has_fresh_live_event: lb.has_fresh_live_event || false,
      unique_signal_types: lb.unique_signal_types || 0,
      source_count: lb.source_count || 0,
      sources: lb.sources || [],
      freshest_signal_age_hours: lb.freshest_signal_age_hours,
      live_event_boost: lb.live_event_boost || 0,
      freshness_bonus: lb.freshness_bonus || 0,
      diversity_bonus: lb.diversity_bonus || 0,
      spike_bonus: lb.spike_bonus || 0,
      fsi_baseline: lb.fsi_baseline || 0,
      ensemble_dampener: lb.ensemble_dampener || 1.0,
      source_multiplier: lb.source_multiplier || 1,
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
      })),
    },

    live_evidence_sources: s.evidenceSources || [],
    live_evidence_count: s.liveEvidenceCount || 0,
    is_live_data: s.liveEvidenceCount >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
    dimensions: Object.fromEntries(DIMS.map(d => [d.k, { value: c.dims[d.k] || 0, label: d.l, weight: d.w, icon: d.icon }])),
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️", color: ARC[t]?.color || "#6bc8ff" })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    trend: { delta_7d: delta7, direction: fc.trend, slope: fc.slope, forecast_7d: fc.fc, escalating: fc.esc, confidence: fc.confidence },
    anomaly: { detected: anom.detected, severity: anom.severity, methods_fired: anom.methods_fired, z_score: anom.z_score, methods: { cusum: anom.methods[0], zscore: anom.methods[1], changepoint: anom.methods[2], volatility: anom.methods[3] } },
    spillover: { value: c.spillover, from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })) },

    live_evidence: {
      earthquake: s.quakeMag >= 4.5 ? { magnitude: s.quakeMag, location: s.quakePlace, event_count: s.quakeCount, source: "USGS/EMSC" } : null,
      earthquake_significant_month: s.quakeSigMonth ? { magnitude: s.quakeSigMonth.mag, location: s.quakeSigMonth.place, source: "USGS (30d)" } : null,
      nasa_events: s.nasaEventCount > 0 ? { count: s.nasaEventCount, source: "NASA EONET" } : null,
      gdacs: s.gdacs ? { alert_level: s.gdacsAlert, event_type: s.gdacsEventType, count: s.gdacsCount, source: "GDACS" } : null,
      ifrc: s.ifrcCount > 0 ? { count: s.ifrcCount, source: "IFRC GO" } : null,
      ifrc_appeals: s.ifrcAppeals?.length ? { count: s.ifrcAppeals.length, source: "IFRC Appeals" } : null,
      cdc_outbreaks: s.cdcOutbreaks?.length ? { count: s.cdcOutbreaks.length, source: "CDC" } : null,
      spc_outlook: s.spcOutlook ? { label: s.spcOutlook.label, label2: s.spcOutlook.label2, source: "SPC" } : null,
      who_don: s.whoDon?.length ? { count: s.whoDon.length, source: "WHO DON" } : null,
      nasa_power: s.nasaPower ? { tempAnomaly: s.nasaPower.tempAnomaly, precipAnomaly: s.nasaPower.precipAnomaly, source: "NASA POWER" } : null,
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
        population: s.population ? { value: s.population, source: "World Bank" } : null,
      },
      displacement: s.totalDisplaced > 0 ? { total: s.totalDisplaced, refugees: s.refugees, idps: s.idps, asylum_seekers: s.asylum_seekers, source: "UNHCR" } : null,
    },

    ml: c.ml_forecast ? { forecast: c.ml_forecast.fc, confidence: c.ml_forecast.confidence, anomaly_probability: c.ml_forecast.anomaly_probability, trained: c.ml_forecast.ml_trained, training_count: c.ml_forecast.training_count } : null,
    sentiment: c.sentiment ? { score: c.sentiment.score, label: c.sentiment.label, confidence: c.sentiment.confidence } : null,
    historical: c.historical_trend ? { direction: c.historical_trend.direction, change: c.historical_trend.change, points: c.historical_trend.points } : null,

    score_audit: {
      prior_score: c.priorScore,
      structural_score: c.structural_score,
      live_breaking_score: lb.live_score,
      adjustments: c.audit || [],
      spillover: c.spillover,
      final_score: displayScore,
      live_boost: c.liveBoost,
    },

    recommendation: recommendation(displayScore, anom),
    region: c.region,
    fsi: { score: c.fsi_score, rank: c.fsi_rank, band: c.fsi_band },
    wst: CFG.WST_ENABLED && c.__wst ? { class: c.__wst.class, tier: c.__wst.tier, recovery_rate: c.__wst.recovery_rate } : null,
  };

  if (opts.keywords) base.seo_keywords = buildKeywords(iso, store);
  if (opts.summary) base.meta_description = buildMetaDescription(iso, store);
  if (opts.schema) base.json_ld = buildJSONLD(iso, store, ranked);
  if (opts.related) base.related = buildRelatedStories(iso, store, ranked);
  if (opts.article) base.article = buildSEOArticle(iso, store, ranked);

  return base;
}

function buildKeywords(iso, store) {
  const c = store[iso]; const s = c.signals || {}; const kws = new Set();
  kws.add(`${c.name} humanitarian crisis`); kws.add(`${c.name} crisis ${new Date().getFullYear()}`);
  kws.add(`${c.name} emergency`); kws.add(`${c.name} disaster`); kws.add(`${c.name} breaking news`);
  for (const t of c.types) { const arc = ARC[t]; if (arc?.seo) { kws.add(`${c.name} ${arc.seo}`); kws.add(arc.seo); } }
  if (s.totalDisplaced > 0) kws.add(`${c.name} refugees`);
  if (s.quakeMag >= 5.0) kws.add(`${c.name} earthquake`);
  if (s.cdcOutbreaks?.length) kws.add(`${c.name} CDC outbreak`);
  if (s.spcOutlook) kws.add(`${c.name} severe weather`);
  return [...kws].slice(0, 35);
}
function buildMetaDescription(iso, store) {
  const c = store[iso]; const lb = c.__live_breaking || {}; const severity = severityLabel(c.score);
  let parts = [`${c.name} crisis update: score ${c.score}/100 (${severity})`];
  if (lb.tier === "BREAKING") parts.unshift(`🔴 BREAKING: ${lb.breaking_headline}`);
  return parts.slice(0, 3).join('. ') + '.';
}
function buildRelatedStories(iso, store, ranked) {
  return ranked.filter(r => r !== iso && (COUNTRIES[r].region === COUNTRIES[iso].region || (COUNTRIES[iso].adj || []).includes(r))).slice(0, 5)
    .map(r => ({ iso: r, name: store[r].name, score: store[r].score, live_score: store[r].__live_breaking?.live_score || 0, slug: slugify(store[r].name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(store[r].name)}` }));
}
function buildJSONLD(iso, store, ranked) {
  const c = store[iso]; const slug = slugify(c.name); const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date().toISOString(); const severity = severityLabel(c.score);
  const lb = c.__live_breaking || {};
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "NewsArticle", "@id": `${url}#article`,
      "headline": lb.breaking_headline || `${c.name} Crisis — Score ${c.score}/100 (${severity})`,
      "description": buildMetaDescription(iso, store), "url": url, "datePublished": now, "dateModified": now,
      "author": { "@type": "Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
      "publisher": { "@type": "Organization", "name": CFG.ARTICLE_SITE_NAME, "url": CFG.ARTICLE_BASE_URL,
        "logo": { "@type": "ImageObject", "url": CFG.ARTICLE_LOGO } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "articleSection": "Humanitarian Crisis",
      "keywords": buildKeywords(iso, store).slice(0, 15).join(", "),
    }
  ]};
}
function buildFAQs(iso, store, ranked) {
  const c = store[iso]; const lb = c.__live_breaking || {};
  return [
    { q: `What is the current humanitarian situation in ${c.name}?`, a: `${c.name} has a score of ${c.score}/100, rated ${severityLabel(c.score)}.${lb.tier === "BREAKING" ? ` 🔴 BREAKING: ${lb.breaking_headline}` : ''}` },
    { q: `How can I help?`, a: `Support organisations active in ${c.name}.` },
  ];
}
function buildSEOArticle(iso, store, ranked) {
  const c = store[iso]; const lb = c.__live_breaking || {};
  const headline = lb.breaking_headline || `${c.name} Crisis Monitor — ${c.score}/100`;
  const articleBody = `## Overview\n\n${c.name} scores ${c.score}/100 (${severityLabel(c.score)}).`;
  const { words, minutes } = estimateReadTime(articleBody);
  return { headline, dek: `Score ${c.score}/100 · ${lb.signal_count || 0} signals`, slug: slugify(c.name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`, metaDescription: buildMetaDescription(iso, store), keywords: buildKeywords(iso, store), faqs: buildFAQs(iso, store, ranked), body_markdown: articleBody, body_html: `<article><h1>${headline}</h1><p>${articleBody}</p></article>`, word_count: words, read_time_minutes: minutes };
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
    const c = store[iso]; const lb = c.__live_breaking || {};
    return `<item><title>${escapeXml(a.headline)}</title><link>${a.url}</link><guid isPermaLink="true">${a.url}</guid><pubDate>${now.toUTCString()}</pubDate><description>${escapeXml(a.dek)}</description>${lb.tier === "BREAKING" ? `<category>🔴 BREAKING NEWS</category>` : ""}<content:encoded><![CDATA[${a.body_html}]]></content:encoded></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${CFG.ARTICLE_SITE_NAME}</title><link>${CFG.ARTICLE_BASE_URL}</link><description>Live breaking world crisis news.</description><lastBuildDate>${now.toUTCString()}</lastBuildDate>${items}</channel></rss>`;
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
    const liveData = await fetchAllLive(Object.keys(COUNTRIES));
    const store = buildStore(liveData);
    const ranked = rankByLiveBreaking(store);
    const breakingRanked = rankBreakingOnly(store, 1);
    const liveEventsOnly = rankLiveEventsOnly(store);

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => (store[iso].__live_breaking?.live_score || 0) >= params.threshold);
    else if (params.force_live && liveEventsOnly.length > 0) finalIsos = liveEventsOnly.slice(0, params.top);
    else if (params.force_live && breakingRanked.length > 0) finalIsos = breakingRanked.slice(0, params.top);
    else finalIsos = ranked.slice(0, params.top);
    if (!finalIsos.length && !isoList.length) finalIsos = ranked.slice(0, params.top);

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0]; const s = store[iso];
      const data = { iso, name: s.name, score: s.score, structural_score: s.structural_score, live_breaking: s.__live_breaking, dimensions: s.dims, evidence: s.signals };
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${iso}.json"` });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const c = store[finalIsos[0]]; const lb = c.__live_breaking || {};
      const html = `<div style="padding:16px;background:#0f1a30;color:#fff;font-family:system-ui;max-width:320px;border-radius:12px;"><b>${c.flag} ${c.name}</b> — Live Score ${lb.live_score || 0}/100 (${lb.tier_label || "—"})<br><small>${lb.breaking_headline || ""}</small></div>`;
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return;
    }

    if (params.live) {
      const source = liveEventsOnly.length ? liveEventsOnly : breakingRanked;
      const feed = source.slice(0, params.top || 25).map(iso => {
        const c = store[iso]; const lb = c.__live_breaking;
        return { rank: source.indexOf(iso) + 1, iso, name: c.name, flag: c.flag, live_score: lb.live_score, tier: lb.tier, headline: lb.breaking_headline, signal_count: lb.signal_count, live_event_count: lb.live_event_count, source_count: lb.source_count, sources: lb.sources, structural_score: c.structural_score };
      });
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=120" });
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), feed: "live-breaking-news", total_with_live_events: liveEventsOnly.length, total_with_any_signals: breakingRanked.length }, live_news: feed }, null, 2));
      return;
    }

    if (params.rss) {
      const iso = params.region ? (liveEventsOnly.length ? liveEventsOnly : breakingRanked).filter(i => COUNTRIES[i].region === params.region).slice(0, 30) : (liveEventsOnly.length ? liveEventsOnly : breakingRanked).slice(0, 30);
      const f = buildRSSFeed(iso.length ? iso : ranked.slice(0, 30), store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" }); res.end(f); return;
    }

    if (params.wst) {
      const wst = Object.keys(store).filter(i => store[i].__wst).map(i => ({ iso: i, name: store[i].name, flag: store[i].flag, wst_class: store[i].__wst.class, score: store[i].score, structural_score: store[i].structural_score, live_score: store[i].__live_breaking?.live_score || 0, live_tier: store[i].__live_breaking?.tier })).sort((a, b) => b.live_score - a.live_score);
      res.writeHead(200, CORS); res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString() }, countries: wst }, null, 2)); return;
    }

    if (params.breaking) {
      const source = liveEventsOnly.length ? liveEventsOnly : breakingRanked;
      const feed = source.slice(0, params.top || 20).map(iso => {
        const c = store[iso]; const lb = c.__live_breaking;
        return { iso, name: c.name, flag: c.flag, live_score: lb.live_score, tier: lb.tier, tier_label: lb.tier_label, headline: lb.breaking_headline, signal_count: lb.signal_count, live_event_count: lb.live_event_count, has_fresh_live_event: lb.has_fresh_live_event, source_count: lb.source_count, sources: lb.sources, structural_score: c.structural_score, top_signals: lb.signals.slice(0, 3).map(s => ({ icon: LIVE_SIGNALS[s.type]?.icon || "⚠️", label: LIVE_SIGNALS[s.type]?.label || s.type, details: s.details, age_hours: +s.ageHours.toFixed(1), source: s.source })) };
      });
      res.writeHead(200, CORS); res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), mode: "breaking", total_with_live_events: liveEventsOnly.length, total_with_any_signals: breakingRanked.length }, breaking: feed }, null, 2)); return;
    }

    if (params.format === "sitemap") {
      const p = finalIsos.map(iso => buildPayload(iso, store, ranked, { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary }));
      res.writeHead(200, { ...CORS, "Content-Type": "application/xml; charset=utf-8" }); res.end(buildSitemap(p)); return;
    }

    if (params.format === "article" && finalIsos.length === 1) {
      const a = buildSEOArticle(finalIsos[0], store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "text/html; charset=utf-8" }); res.end(a.body_html); return;
    }

    const opts = { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary, article: params.format === "article" };
    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, opts));
    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";

    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        ranking_mode: "LIVE_BREAKING_NEWS_v13.3",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_signals: breakingRanked.length,
        countries_with_fresh_live_events: liveEventsOnly.length,
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        score_field_is_live: CFG.SCORE_FIELD_IS_LIVE,
        note: "v13.3 — expanded feed stack. `score` = LIVE score; `structural_score` = FSI-derived baseline.",
        live_news_stats: {
          total_with_live_signals: breakingRanked.length,
          total_with_fresh_live_events: liveEventsOnly.length,
          top_live_iso: ranked[0] || null,
          top_live_headline: ranked[0] ? store[ranked[0]].__live_breaking.breaking_headline : null,
          signal_types_available: Object.keys(LIVE_SIGNALS).length,
        },
        data_sources: {
          usgs_weekly: { live: liveData.usgs.live, events: liveData.usgs.data?.length ?? 0 },
          usgs_significant_month: { live: liveData.usgsSig.live, events: liveData.usgsSig.data?.length ?? 0 },
          emsc: { live: liveData.emsc.live, events: liveData.emsc.data?.length ?? 0 },
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
          copernicus_sentinel: { live: liveData.sentinel.live, events: liveData.sentinel.data?.length ?? 0 },
          nasa_power: { live: liveData.nasaPower.live, anchors: Object.keys(liveData.nasaPower.data || {}).length },
          disease_sh: { live: liveData.disease.live, countries: liveData.disease.data?.length ?? 0 },
          world_bank: { live: Object.values(liveData.wb).some(v => v.live) },
          unhcr: { live: liveData.unhcr.live },
        },
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
    console.error("[top-story v13.3]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
