// /api/top-story.js
// GET /api/top-story          → top urgent country
// GET /api/top-story?iso=UKR  → specific country
// GET /api/top-story?top=5    → top N countries (max 20)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

// ─── SAFE FETCH: timeout + graceful null on any failure ──────────────────────
const safe = (promise, ms = 6000) =>
  Promise.race([
    promise,
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms)),
  ]).catch(() => null);

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

// ─── DIMENSION WEIGHTS (must sum to 1.0) ────────────────────────────────────
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

// ─── COUNTRY MASTER TABLE ────────────────────────────────────────────────────
// Each entry: base score (0-99), crisis types, neighbours (for spillover), centroid [lon, lat]
const DATA = {
  PSE: { name:"Palestine",            flag:"🇵🇸", base:96, types:["CE","CW","REF","HEAT"],           adj:["LBN","JOR","ISR"],             cent:[35.3, 31.9] },
  SOM: { name:"Somalia",              flag:"🇸🇴", base:94, types:["CE","CW","DR","FN","REF","HEAT"],  adj:["ETH","DJI","KEN"],             cent:[45.3,  5.2] },
  SYR: { name:"Syria",                flag:"🇸🇾", base:93, types:["CE","CW","REF","EP","HEAT"],       adj:["LBN","JOR","TUR","IRQ","ISR"], cent:[38.3, 34.8] },
  YEM: { name:"Yemen",                flag:"🇾🇪", base:92, types:["CE","CW","FN","DR","REF"],         adj:["SAU","OMN"],                   cent:[47.6, 15.6] },
  SSD: { name:"South Sudan",          flag:"🇸🇸", base:91, types:["CE","CW","FL","FN","REF"],         adj:["SDN","ETH","COD","UGA","KEN"], cent:[31.3,  6.9] },
  AFG: { name:"Afghanistan",          flag:"🇦🇫", base:90, types:["CE","CW","DR","FN","REF"],         adj:["PAK","IRN","TJK"],             cent:[67.7, 33.9] },
  SDN: { name:"Sudan",                flag:"🇸🇩", base:88, types:["CE","CW","DR","FL","REF"],         adj:["EGY","ETH","SSD","LBY","TCD"], cent:[29.9, 12.9] },
  HTI: { name:"Haiti",                flag:"🇭🇹", base:86, types:["CE","EQ","EP","ST","REF"],         adj:["DOM"],                         cent:[-72.3,18.9] },
  COD: { name:"DR Congo",             flag:"🇨🇩", base:86, types:["CE","CW","EP","FL","REF"],         adj:["SDN","SSD","CAF","UGA","RWA"], cent:[23.7, -2.9] },
  UKR: { name:"Ukraine",              flag:"🇺🇦", base:85, types:["CE","CW","REF","HEAT"],            adj:["RUS","POL","HUN","ROU"],       cent:[31.2, 49.0] },
  CAF: { name:"Central African Rep.", flag:"🇨🇫", base:84, types:["CE","CW","EP","FL","REF"],         adj:["CMR","TCD","COD","SDN","SSD"], cent:[20.9,  6.6] },
  MLI: { name:"Mali",                 flag:"🇲🇱", base:82, types:["CE","CW","DR","FN","REF","HEAT"],  adj:["DZA","NER","BFA","SEN"],       cent:[-2.0, 17.6] },
  ETH: { name:"Ethiopia",             flag:"🇪🇹", base:79, types:["CE","CW","DR","FN","REF"],         adj:["SDN","SSD","SOM","ERI","KEN"], cent:[40.5,  9.1] },
  IDN: { name:"Indonesia",            flag:"🇮🇩", base:79, types:["EQ","TSU","VLC","FL","LS","TC"],   adj:[],                              cent:[106.8,-6.2] },
  BFA: { name:"Burkina Faso",         flag:"🇧🇫", base:78, types:["CE","CW","DR","EP","REF","HEAT"],  adj:["MLI","NER","GHA","CIV"],       cent:[-1.7, 12.4] },
  NER: { name:"Niger",                flag:"🇳🇪", base:76, types:["DR","FN","CE","HEAT","FL"],        adj:["DZA","TCD","NGA","MLI"],       cent:[ 8.1, 17.6] },
  TCD: { name:"Chad",                 flag:"🇹🇩", base:74, types:["CE","CW","DR","REF","HEAT"],       adj:["LBY","SDN","CAF","CMR","NGA"], cent:[18.7, 15.5] },
  IRQ: { name:"Iraq",                 flag:"🇮🇶", base:72, types:["CE","CW","REF","HEAT"],            adj:["SYR","IRN","SAU","TUR"],       cent:[43.7, 33.2] },
  LBY: { name:"Libya",                flag:"🇱🇾", base:72, types:["CE","CW","REF","HEAT"],            adj:["TUN","DZA","EGY","TCD"],       cent:[17.2, 26.3] },
  MMR: { name:"Myanmar",              flag:"🇲🇲", base:73, types:["CE","CW","FL","REF","EP"],         adj:["BGD","IND","THA"],             cent:[95.9, 21.9] },
  PHL: { name:"Philippines",          flag:"🇵🇭", base:73, types:["TC","FL","EQ","VLC","TSU","LS"],   adj:[],                              cent:[121.8,12.9] },
  LBN: { name:"Lebanon",              flag:"🇱🇧", base:75, types:["CE","REF","EP","HEAT"],            adj:["SYR","ISR"],                   cent:[35.5, 33.9] },
  VEN: { name:"Venezuela",            flag:"🇻🇪", base:63, types:["CE","REF","DR","HEAT"],            adj:["COL","BRA"],                   cent:[-66.6, 8.0] },
  ISR: { name:"Israel",               flag:"🇮🇱", base:62, types:["CW","WF","HEAT"],                 adj:["LBN","SYR","JOR","PSE"],       cent:[34.9, 31.5] },
  IRN: { name:"Iran",                 flag:"🇮🇷", base:61, types:["EQ","DR","REF","HEAT","LS"],       adj:["AFG","PAK","IRQ","TUR"],       cent:[53.7, 32.4] },
  NGA: { name:"Nigeria",              flag:"🇳🇬", base:66, types:["CE","CW","FL","EP","REF"],         adj:["CMR","NER","BEN","TCD"],       cent:[ 8.7,  9.1] },
  RUS: { name:"Russia",               flag:"🇷🇺", base:66, types:["WF","FL","CW","ST","HEAT"],        adj:["UKR","CHN","KAZ"],             cent:[97.7, 56.8] },
  PAK: { name:"Pakistan",             flag:"🇵🇰", base:69, types:["FL","EQ","DR","REF","HEAT","LS"],  adj:["AFG","IRN","IND"],             cent:[69.3, 30.4] },
  COL: { name:"Colombia",             flag:"🇨🇴", base:57, types:["CE","CW","FL","REF","LS"],         adj:["VEN","PER","ECU","PAN"],       cent:[-74.3, 4.6] },
  BGD: { name:"Bangladesh",           flag:"🇧🇩", base:57, types:["FL","TC","REF","EP","LS","HEAT"],  adj:["MMR","IND"],                   cent:[90.4, 23.7] },
  IND: { name:"India",                flag:"🇮🇳", base:56, types:["FL","TC","DR","EQ","HEAT","LS"],   adj:["PAK","BGD","CHN","NPL"],       cent:[78.0, 20.6] },
  CHN: { name:"China",                flag:"🇨🇳", base:55, types:["FL","EQ","TC","LS","TSU","HEAT"],  adj:["IND","RUS","KAZ","VNM"],       cent:[104.2,35.9] },
  BRA: { name:"Brazil",               flag:"🇧🇷", base:53, types:["FL","WF","DR","EP","LS","HEAT"],   adj:["VEN","COL","PER","BOL","ARG"], cent:[-52.0,-10.0] },
  ZAF: { name:"South Africa",         flag:"🇿🇦", base:51, types:["DR","FL","EP","HEAT"],             adj:["MOZ","ZWE","BWA","NAM"],       cent:[25.1,-29.0] },
  EGY: { name:"Egypt",                flag:"🇪🇬", base:49, types:["DR","REF","HEAT"],                 adj:["LBY","SDN","ISR"],             cent:[30.8, 26.8] },
  MOZ: { name:"Mozambique",           flag:"🇲🇿", base:44, types:["TC","FL","HEAT"],                  adj:["TZA","MWI","ZMB","ZWE","ZAF"], cent:[35.5,-18.7] },
  KEN: { name:"Kenya",                flag:"🇰🇪", base:42, types:["DR","FL","EP","REF","HEAT"],       adj:["ETH","SOM","UGA","TZA"],       cent:[37.9,  0.0] },
  JOR: { name:"Jordan",               flag:"🇯🇴", base:41, types:["REF","DR","HEAT"],                 adj:["PSE","SYR","IRQ","SAU","ISR"], cent:[36.2, 31.2] },
  SAU: { name:"Saudi Arabia",         flag:"🇸🇦", base:38, types:["DR","ST","HEAT","REF"],            adj:["YEM","JOR","IRQ","KWT"],       cent:[44.5, 24.7] },
};

// ─── MATH HELPERS ────────────────────────────────────────────────────────────

// Deterministic pseudo-random (same input → same output, always)
function seededRand(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Build 8 dimension scores from a base score + crisis type list
function buildDims(base, types) {
  const has = t => types.includes(t);
  const cl  = v => Math.min(99, Math.max(5, Math.round(v)));
  return {
    conflict:     cl(base * ((has("CW")||has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
    displacement: cl(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.80 : 0.38)),
    food:         cl(base * ((has("FN")||has("DR"))            ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health:       cl(base * ((has("EP")||has("FN"))            ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     cl(base * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.82 : 0.42) + 10),
    climate:      cl(base * ((has("HEAT")||has("DR"))          ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       cl(base * ((has("CW")||has("CE"))            ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    cl(base * ((has("CE")||has("CW")||has("REF"))? 0.85 : 0.42) + 8),
  };
}

// Weighted composite of all 8 dimensions
function composite(dims) {
  return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0);
}

// Deterministic 28-day score history seeded from ISO code
function seedHistory(iso, currentScore) {
  const seed = iso.split("").reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1) * 17, 0);
  let v = Math.min(99, Math.max(5, currentScore + Math.round((seededRand(seed) - 0.5) * 18)));
  const hist = [];
  for (let i = 0; i <= 28; i++) {
    hist.push(v);
    const r = seededRand(seed + i * 31 + 7);
    v = Math.min(99, Math.max(5, Math.round(v + (currentScore - v) * 0.12 + (r - 0.5) * 5)));
  }
  hist[hist.length - 1] = currentScore; // pin last point to live score
  return hist;
}

// CUSUM anomaly detection — returns z-score and detection flag
function cusum(arr) {
  if (arr.length < 4) return { det: false, z: 0 };
  const mu  = arr.slice(0, -3).reduce((a, b) => a + b, 0) / (arr.length - 3) || arr[0];
  let sP = 0, sN = 0;
  arr.forEach(x => {
    sP = Math.max(0, sP + (x - mu) - 1.2);
    sN = Math.max(0, sN - (x - mu) - 1.2);
  });
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mu) ** 2, 0) / arr.length) || 1;
  return {
    det: sP > 3.5 || sN > 3.5,
    z:   +Math.abs((arr[arr.length - 1] - mu) / std).toFixed(1),
  };
}

// Simple linear trend forecast over next 7 days
function forecast(hist, score) {
  if (hist.length < 5) return { fc: score, esc: false, trend: "stable" };
  const d  = hist.slice(-12);
  const tr = (d[d.length - 1] - d[Math.max(0, d.length - 5)]) / 5;
  const fc = Math.round(Math.min(99, Math.max(5, d[d.length - 1] + tr * 2)));
  return {
    fc,
    esc:   fc > score + 5,
    trend: tr > 1.2 ? "escalating" : tr < -0.8 ? "improving" : "stable",
  };
}

// ─── BUILD STORE ─────────────────────────────────────────────────────────────
// Scores shift slightly every 5 minutes — matches front-end seeding exactly

function buildStore() {
  const seed  = Math.floor(Date.now() / 300_000);
  const store = {};

  // First pass: individual scores
  for (const [iso, d] of Object.entries(DATA)) {
    const jitter   = Math.round((seededRand(seed + iso.charCodeAt(0) * 137 + (iso.charCodeAt(1) || 0) * 31) - 0.5) * 5);
    const base     = Math.min(99, Math.max(5, d.base + jitter));
    const dims     = buildDims(base, d.types);
    const score    = Math.min(99, Math.max(1, Math.round(composite(dims))));
    store[iso]     = { ...d, dims, score, spillover: 0 };
  }

  // Second pass: add regional spillover pressure
  for (const iso in store) {
    const neighbours = (DATA[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNeighbour = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    store[iso].spillover = +(Math.max(0, avgNeighbour - 50) * 0.13).toFixed(1);
    store[iso].score     = Math.min(99, store[iso].score + store[iso].spillover);
  }

  return store;
}

// ─── LIVE API FETCHERS ───────────────────────────────────────────────────────
// All run in parallel, all fail gracefully

function fetchLiveData(cent) {
  const [lon, lat] = cent;
  return Promise.all([
    safe(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json())),
    safe(fetch("https://api.acleddata.com/acled/read?terms=accept&limit=50&event_date=2024-01-01&event_date_where=>").then(r => r.json())),
    safe(fetch("https://api.ipcinfo.org/v1/classifications/latest").then(r => r.json())),
    safe(fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=auto&forecast_days=1`).then(r => r.json())),
    safe(fetch("https://fews.net/api/alert.json").then(r => r.json())),
  ]).then(([usgs, acled, ipc, heat, fews]) => ({ usgs, acled, ipc, heat, fews }));
}

// ─── NARRATIVE BUILDER ───────────────────────────────────────────────────────

function buildNarrative(iso, store, ranked, live) {
  const c    = store[iso];
  const hist = seedHistory(iso, c.score);
  const anom = cusum(hist);
  const fc   = forecast(hist, c.score);

  const rank   = ranked.indexOf(iso) + 1;
  const total  = ranked.length;
  const label  = c.score >= 80 ? "critical" : c.score >= 60 ? "high" : "elevated";
  const pctile = Math.round((1 - rank / total) * 100);

  // Top 2 dimensions by value
  const byValue = [...DIMS].map(d => ({ ...d, val: c.dims[d.k] || 0 })).sort((a, b) => b.val - a.val);
  const [top, second] = byValue;

  // 7-day trend phrase
  const delta  = hist.length >= 7 ? hist[hist.length - 1] - hist[hist.length - 7] : 0;
  const dAbs   = Math.abs(Math.round(delta));
  const tPhrase =
    delta > 4  ? `escalated ${dAbs} points over the past 7 days` :
    delta < -3 ? `eased slightly (${dAbs} pts) but remains ${label}` :
                 `held steady at ${label} levels`;

  // ── Live signal detection ─────────────────────────────────────────────────
  const nl      = c.name.toLowerCase();
  const signals = [];

  // USGS earthquake near this country
  const quakes = (live.usgs?.features || []).filter(f =>
    (f.properties.place || "").toLowerCase().includes(nl)
  );
  if (quakes.length) {
    const biggest = quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a);
    const place   = biggest.properties.place.split(",")[0].trim();
    signals.push(`a M${(+biggest.properties.mag).toFixed(1)} earthquake (USGS, ${place})`);
  }

  // ACLED conflict event
  const acledEvent = (live.acled?.data || []).find(e =>
    (e.country || "").toLowerCase().includes(nl)
  );
  if (acledEvent) {
    const type = (acledEvent.event_type || "conflict event").toLowerCase();
    signals.push(`active ${type} (${acledEvent.fatalities}+ fatalities, ACLED)`);
  }

  // IPC food insecurity classification
  const ipcEntry = (Array.isArray(live.ipc) ? live.ipc : []).find(i =>
    (i.country || "").toLowerCase().includes(nl)
  );
  if (ipcEntry?.phase >= 3) {
    const pop = ipcEntry.population ? `${Math.round(ipcEntry.population / 1e6)}M people` : "significant population";
    signals.push(`IPC Phase ${ipcEntry.phase} food insecurity (${pop})`);
  }

  // FEWS NET alert
  const fewsEntry = (Array.isArray(live.fews) ? live.fews : []).find(a =>
    (a.country || "").toLowerCase().includes(nl)
  );
  if (fewsEntry && !ipcEntry) {
    signals.push(`FEWS NET alert: ${(fewsEntry.title || "").substring(0, 55)}`);
  }

  // Open-Meteo extreme heat
  const maxTemp = live.heat?.daily?.temperature_2m_max?.[0];
  if (maxTemp > 38) signals.push(`extreme heat (${maxTemp}°C, Open-Meteo)`);

  // ── Regional spillover sentence ───────────────────────────────────────────
  const hotNeighbours = (DATA[iso].adj || [])
    .filter(n => store[n]?.score >= 60)
    .map(n => store[n].name);
  const spillSentence = hotNeighbours.length >= 2
    ? ` Regional pressure from ${hotNeighbours.slice(0, 2).join(" and ")} adds +${c.spillover.toFixed(1)} to the composite score.`
    : "";

  // ── Anomaly sentence ─────────────────────────────────────────────────────
  const histSwing    = Math.max(...hist) - Math.min(...hist);
  const isHardSpike  = anom.det && anom.z > 3.5 && histSwing > 12;
  const anomSentence =
    isHardSpike
      ? ` A statistical anomaly is detected (z=${anom.z}), indicating an unusual spike relative to the 28-day baseline.`
    : anom.z > 0
      ? ` A statistical anomaly is detected (z=${anom.z}), indicating the current score deviates significantly from the 28-day baseline.`
    : "";

  // ── Assemble sentences ───────────────────────────────────────────────────
  const sentences = [
    // 1 — Score + rank
    `${c.flag} ${c.name} ranks #${rank} globally with a ${label} urgency score of ${c.score}/100, placing it in the top ${100 - pctile}% of all tracked countries.`,

    // 2 — Dominant dimensions
    `The composite is driven primarily by ${top.l} (${top.val}/100) and ${second.l} (${second.val}/100), the two highest-weighted dimensions.`,

    // 3 — Trend + optional forecast
    `The score has ${tPhrase}${fc.esc ? `, with the 7-day model projecting further escalation to ${fc.fc}.` : "."}`,
  ];

  // 4 — Live evidence (only if we have signals)
  if (signals.length) {
    const joined =
      signals.length === 1 ? signals[0] :
      signals.length === 2 ? `${signals[0]} and ${signals[1]}` :
      signals.slice(0, -1).join(", ") + ", and " + signals[signals.length - 1];
    sentences.push(`Live data confirms ${joined}.`);
  }

  // 5 — Spillover / anomaly tail
  const tail = (spillSentence + anomSentence).trim();
  if (tail) sentences.push(tail);

  return sentences.join(" ");
}

// ─── RESPONSE SHAPE ──────────────────────────────────────────────────────────

function countryPayload(iso, store, ranked, live) {
  const c    = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc   = forecast(hist, c.score);
  const anom = cusum(hist);

  return {
    iso,
    rank:        ranked.indexOf(iso) + 1,
    name:        c.name,
    flag:        c.flag,
    score:       c.score,
    severity:    c.score >= 80 ? "CRITICAL" : c.score >= 60 ? "HIGH" : c.score >= 40 ? "MODERATE" : "LOW",
    spillover:   c.spillover,
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️" })),
    needs:       [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    dimensions:  Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
    forecast: {
      score_7d:    fc.fc,
      trend:       fc.trend,
      escalating:  fc.esc,
    },
    anomaly: {
      detected:  anom.det,
      z_score:   anom.z,
    },
    narrative: buildNarrative(iso, store, ranked, live),
  };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, CORS);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    // ── 1. Build scored store ───────────────────────────────────────────────
    const store  = buildStore();
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    // ── 2. Parse query params ───────────────────────────────────────────────
    const url    = new URL(req.url, "https://x");
    const isoReq = url.searchParams.get("iso")?.toUpperCase();
    const topN   = Math.min(20, Math.max(1, parseInt(url.searchParams.get("top") || "1", 10)));

    // Validate requested ISO if provided
    if (isoReq && !store[isoReq]) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({
        error:     "Country not found",
        iso:       isoReq,
        available: Object.keys(DATA).sort(),
      }));
      return;
    }

    // ── 3. Fetch live data for the target country ───────────────────────────
    const targetIso  = isoReq || ranked[0];
    const live       = await fetchLiveData(DATA[targetIso].cent);
    const liveApiHit = Object.values(live).filter(Boolean).length;

    // ── 4. Build response ───────────────────────────────────────────────────
    const isMulti    = !isoReq && topN > 1;
    const stories    = isMulti
      ? ranked.slice(0, topN).map(iso => countryPayload(iso, store, ranked, live))
      : [countryPayload(targetIso, store, ranked, live)];

    const body = {
      meta: {
        generated_at:    new Date().toISOString(),
        score_seed:      Math.floor(Date.now() / 300_000), // same seed = same scores; changes every 5 min
        countries_total: ranked.length,
        live_apis_hit:   `${liveApiHit}/5`,
        query:           { iso: isoReq || null, top: isMulti ? topN : null },
      },
      // Single story → top_story key; multi → top_stories array
      ...(isMulti
        ? { top_stories: stories }
        : { top_story: stories[0] }
      ),
    };

    res.writeHead(200, CORS);
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({
      error:   "Internal server error",
      message: err.message,
    }));
  }
}
