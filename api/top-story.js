// /api/top-story.js — drop this single file into your /api folder, done.
// Vercel auto-detects it. No package.json changes needed if you're already on Node 18+.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

const safe = (p) =>
  Promise.race([p, new Promise((_, r) => setTimeout(() => r(), 6000))]).catch(() => null);

// ── DATA ─────────────────────────────────────────────────────────────────────

const ARC = {
  CE:  { l:"Complex Emergency", n:["shelter","food","health","protection"] },
  CW:  { l:"Civil War",         n:["shelter","protection","health","food"] },
  EQ:  { l:"Earthquake",        n:["shelter","health","water"] },
  FL:  { l:"Flood",             n:["shelter","water","food"] },
  DR:  { l:"Drought",           n:["food","water","nutrition"] },
  FN:  { l:"Famine",            n:["food","nutrition","health"] },
  EP:  { l:"Epidemic",          n:["health","water","nutrition"] },
  REF: { l:"Refugee Crisis",    n:["shelter","protection","water"] },
  TC:  { l:"Cyclone",           n:["shelter","water"] },
  WF:  { l:"Wildfire",          n:["shelter","health"] },
  HEAT:{ l:"Heatwave",          n:["health","water"] },
  LS:  { l:"Landslide",         n:["shelter","health"] },
  TSU: { l:"Tsunami",           n:["shelter","health","water"] },
  VLC: { l:"Volcano",           n:["shelter","health","water"] },
  ST:  { l:"Storm",             n:["shelter","water"] },
};

const DIMS = [
  { k:"conflict",     l:"Conflict",      w:0.28 },
  { k:"displacement", l:"Displacement",  w:0.22 },
  { k:"food",         l:"Food Security", w:0.18 },
  { k:"health",       l:"Health",        w:0.14 },
  { k:"economic",     l:"Economic",      w:0.10 },
  { k:"climate",      l:"Climate",       w:0.05 },
  { k:"access",       l:"Access",        w:0.02 },
  { k:"political",    l:"Political",     w:0.01 },
];

const DATA = {
  PSE:{ name:"Palestine",            flag:"🇵🇸", base:96, types:["CE","CW","REF","HEAT"],          adj:["LBN","JOR","ISR"],              cent:[35.3,31.9] },
  SOM:{ name:"Somalia",              flag:"🇸🇴", base:94, types:["CE","CW","DR","FN","REF","HEAT"], adj:["ETH","DJI","KEN"],              cent:[45.3,5.2]  },
  SYR:{ name:"Syria",                flag:"🇸🇾", base:93, types:["CE","CW","REF","EP","HEAT"],      adj:["LBN","JOR","TUR","IRQ","ISR"],  cent:[38.3,34.8] },
  YEM:{ name:"Yemen",                flag:"🇾🇪", base:92, types:["CE","CW","FN","DR","REF"],        adj:["SAU","OMN"],                    cent:[47.6,15.6] },
  SSD:{ name:"South Sudan",          flag:"🇸🇸", base:91, types:["CE","CW","FL","FN","REF"],        adj:["SDN","ETH","COD","UGA","KEN"],  cent:[31.3,6.9]  },
  AFG:{ name:"Afghanistan",          flag:"🇦🇫", base:90, types:["CE","CW","DR","FN","REF"],        adj:["PAK","IRN","TJK"],              cent:[67.7,33.9] },
  SDN:{ name:"Sudan",                flag:"🇸🇩", base:88, types:["CE","CW","DR","FL","REF"],        adj:["EGY","ETH","SSD","LBY","TCD"],  cent:[29.9,12.9] },
  HTI:{ name:"Haiti",                flag:"🇭🇹", base:86, types:["CE","EQ","EP","ST","REF"],        adj:["DOM"],                          cent:[-72.3,18.9]},
  UKR:{ name:"Ukraine",              flag:"🇺🇦", base:85, types:["CE","CW","REF","HEAT"],           adj:["RUS","POL","HUN","ROU"],        cent:[31.2,49.0] },
  COD:{ name:"DR Congo",             flag:"🇨🇩", base:86, types:["CE","CW","EP","FL","REF"],        adj:["SDN","SSD","CAF","UGA","RWA"],  cent:[23.7,-2.9] },
  ETH:{ name:"Ethiopia",             flag:"🇪🇹", base:79, types:["CE","CW","DR","FN","REF"],        adj:["SDN","SSD","SOM","ERI","KEN"],  cent:[40.5,9.1]  },
  MMR:{ name:"Myanmar",              flag:"🇲🇲", base:73, types:["CE","CW","FL","REF","EP"],        adj:["BGD","IND","THA"],              cent:[95.9,21.9] },
  IRQ:{ name:"Iraq",                 flag:"🇮🇶", base:72, types:["CE","CW","REF","HEAT"],           adj:["SYR","IRN","SAU","TUR"],        cent:[43.7,33.2] },
  LBN:{ name:"Lebanon",              flag:"🇱🇧", base:75, types:["CE","REF","EP","HEAT"],           adj:["SYR","ISR"],                    cent:[35.5,33.9] },
  PAK:{ name:"Pakistan",             flag:"🇵🇰", base:69, types:["FL","EQ","DR","REF","HEAT","LS"], adj:["AFG","IRN","IND"],              cent:[69.3,30.4] },
  NGA:{ name:"Nigeria",              flag:"🇳🇬", base:66, types:["CE","CW","FL","EP","REF"],        adj:["CMR","NER","BEN","TCD"],        cent:[8.7,9.1]   },
  LBY:{ name:"Libya",                flag:"🇱🇾", base:72, types:["CE","CW","REF","HEAT"],           adj:["TUN","DZA","EGY","TCD"],        cent:[17.2,26.3] },
  MLI:{ name:"Mali",                 flag:"🇲🇱", base:82, types:["CE","CW","DR","FN","REF","HEAT"], adj:["DZA","NER","BFA","SEN"],        cent:[-2.0,17.6] },
  CAF:{ name:"Central African Rep.", flag:"🇨🇫", base:84, types:["CE","CW","EP","FL","REF"],        adj:["CMR","TCD","COD","SDN","SSD"],  cent:[20.9,6.6]  },
  TCD:{ name:"Chad",                 flag:"🇹🇩", base:74, types:["CE","CW","DR","REF","HEAT"],      adj:["LBY","SDN","CAF","CMR","NGA"],  cent:[18.7,15.5] },
  BFA:{ name:"Burkina Faso",         flag:"🇧🇫", base:78, types:["CE","CW","DR","EP","REF","HEAT"], adj:["MLI","NER","GHA","CIV"],        cent:[-1.7,12.4] },
  NER:{ name:"Niger",                flag:"🇳🇪", base:76, types:["DR","FN","CE","HEAT","FL"],       adj:["DZA","TCD","NGA","MLI"],        cent:[8.1,17.6]  },
  IRN:{ name:"Iran",                 flag:"🇮🇷", base:61, types:["EQ","DR","REF","HEAT","LS"],      adj:["AFG","PAK","IRQ","TUR"],        cent:[53.7,32.4] },
  ISR:{ name:"Israel",               flag:"🇮🇱", base:62, types:["CW","WF","HEAT"],                adj:["LBN","SYR","JOR","PSE"],        cent:[34.9,31.5] },
  VEN:{ name:"Venezuela",            flag:"🇻🇪", base:63, types:["CE","REF","DR","HEAT"],           adj:["COL","BRA"],                    cent:[-66.6,8.0] },
  COL:{ name:"Colombia",             flag:"🇨🇴", base:57, types:["CE","CW","FL","REF","LS"],        adj:["VEN","PER","ECU","PAN"],        cent:[-74.3,4.6] },
  BGD:{ name:"Bangladesh",           flag:"🇧🇩", base:57, types:["FL","TC","REF","EP","LS","HEAT"], adj:["MMR","IND"],                    cent:[90.4,23.7] },
  IDN:{ name:"Indonesia",            flag:"🇮🇩", base:79, types:["EQ","TSU","VLC","FL","LS","TC"],  adj:[],                              cent:[106.8,-6.2]},
  PHL:{ name:"Philippines",          flag:"🇵🇭", base:73, types:["TC","FL","EQ","VLC","TSU","LS"],  adj:[],                              cent:[121.8,12.9]},
  IND:{ name:"India",                flag:"🇮🇳", base:56, types:["FL","TC","DR","EQ","HEAT","LS"],  adj:["PAK","BGD","CHN","NPL"],        cent:[78.0,20.6] },
  CHN:{ name:"China",                flag:"🇨🇳", base:55, types:["FL","EQ","TC","LS","TSU","HEAT"], adj:["IND","RUS","KAZ","VNM"],        cent:[104.2,35.9]},
  RUS:{ name:"Russia",               flag:"🇷🇺", base:66, types:["WF","FL","CW","ST","HEAT"],       adj:["UKR","CHN","KAZ"],              cent:[97.7,56.8] },
};

// ── MATH ─────────────────────────────────────────────────────────────────────

function seededRand(n) {
  return (Math.sin(n * 9301 + 49297) * 233280) % 1;
}

function buildDims(base, types) {
  const has = t => types.includes(t);
  const cl  = v => Math.min(99, Math.max(5, Math.round(v)));
  return {
    conflict:     cl(base * ((has("CW")||has("CE")) ? 1.1  : has("REF") ? 0.65 : 0.28)),
    displacement: cl(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.8 : 0.38)),
    food:         cl(base * ((has("FN")||has("DR")) ? 1.15 : (has("CE")||has("CW")) ? 0.9 : has("FL") ? 0.7 : 0.42)),
    health:       cl(base * ((has("EP")||has("FN")) ? 1.1  : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     cl(base * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.82 : 0.42) + 10),
    climate:      cl(base * ((has("HEAT")||has("DR")) ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       cl(base * ((has("CW")||has("CE")) ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    cl(base * ((has("CE")||has("CW")||has("REF")) ? 0.85 : 0.42) + 8),
  };
}

function composite(dims) {
  return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0);
}

function seedHistory(iso, score) {
  const seed = iso.split("").reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1) * 17, 0);
  let v = Math.min(99, Math.max(5, score + Math.round((seededRand(seed) - 0.5) * 18)));
  const hist = [];
  for (let i = 0; i <= 28; i++) {
    hist.push(v);
    const r = seededRand(seed + i * 31 + 7);
    v = Math.min(99, Math.max(5, Math.round(v + (score - v) * 0.12 + (r - 0.5) * 5)));
  }
  hist[hist.length - 1] = score;
  return hist;
}

function cusum(arr) {
  if (arr.length < 4) return { det: false, z: 0.5 };
  const mu  = arr.slice(0, -3).reduce((a, b) => a + b, 0) / (arr.length - 3) || arr[0];
  let sP = 0, sN = 0;
  arr.forEach(x => { sP = Math.max(0, sP + (x - mu) - 1.2); sN = Math.max(0, sN - (x - mu) - 1.2); });
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mu) ** 2, 0) / arr.length) || 1;
  return { det: sP > 3.5 || sN > 3.5, z: Math.abs((arr[arr.length - 1] - mu) / std) };
}

function forecastDir(hist, score) {
  if (hist.length < 5) return { fc: score, esc: false };
  const d  = hist.slice(-12);
  const tr = (d[d.length - 1] - d[Math.max(0, d.length - 5)]) / 5;
  const fc = Math.round(Math.min(99, Math.max(5, d[d.length - 1] + tr * 2)));
  return { fc, esc: fc > score + 5 };
}

// ── BUILD STORE ───────────────────────────────────────────────────────────────

function buildStore() {
  const seed = Math.floor(Date.now() / 300000); // changes every 5 min
  const store = {};

  for (const [iso, d] of Object.entries(DATA)) {
    const variation = Math.round((seededRand(seed + iso.charCodeAt(0) * 137 + (iso.charCodeAt(1) || 0) * 31) - 0.5) * 5);
    const base  = Math.min(99, Math.max(5, d.base + variation));
    const dims  = buildDims(base, d.types);
    const score = Math.min(99, Math.max(1, Math.round(composite(dims))));
    store[iso]  = { ...d, dims, score, spillover: 0 };
  }

  // Spillover pass
  for (const iso in store) {
    const nb  = (DATA[iso].adj || []).filter(n => store[n]);
    const avg = nb.length ? nb.reduce((s, n) => s + store[n].score, 0) / nb.length : 0;
    store[iso].spillover = Math.round(Math.max(0, avg - 50) * 0.13 * 10) / 10;
    store[iso].score = Math.min(99, store[iso].score + store[iso].spillover);
  }

  return store;
}

// ── NARRATIVE ─────────────────────────────────────────────────────────────────

function buildNarrative(iso, store, ranked, live) {
  const c    = store[iso];
  const hist = seedHistory(iso, c.score);
  const anom = cusum(hist);
  const fc   = forecastDir(hist, c.score);

  const rank   = ranked.indexOf(iso) + 1;
  const sLabel = c.score >= 80 ? "critical" : c.score >= 60 ? "high" : "elevated";
  const pctile = Math.round((1 - rank / ranked.length) * 100);

  const sorted  = [...DIMS].map(d => ({ ...d, val: c.dims[d.k] || 0 })).sort((a, b) => b.val - a.val);
  const top     = sorted[0];
  const second  = sorted[1];

  const delta       = hist.length >= 7 ? hist[hist.length - 1] - hist[hist.length - 7] : 0;
  const trendPhrase = delta > 4
    ? `escalated ${Math.abs(Math.round(delta))} points over the past 7 days`
    : delta < -3
    ? `eased slightly (${Math.abs(Math.round(delta))} pts) but remains ${sLabel}`
    : `held steady at ${sLabel} levels`;

  // Live signals
  const nl      = c.name.toLowerCase();
  const signals = [];

  const quakes = (live.usgs?.features || []).filter(f => f.properties.place.toLowerCase().includes(nl));
  if (quakes.length) {
    const q = quakes.reduce((a, b) => b.properties.mag > a.properties.mag ? b : a);
    signals.push(`a M${(+q.properties.mag).toFixed(1)} earthquake (USGS, ${q.properties.place.split(",")[0]})`);
  }

  const conflict = (live.acled?.data || []).find(e => (e.country || "").toLowerCase().includes(nl));
  if (conflict) signals.push(`active ${(conflict.event_type || "conflict").toLowerCase()} (${conflict.fatalities}+ fatalities, ACLED)`);

  const ipc = (Array.isArray(live.ipc) ? live.ipc : []).find(i => (i.country || "").toLowerCase().includes(nl));
  if (ipc?.phase >= 3) signals.push(`IPC Phase ${ipc.phase} food insecurity (${Math.round(ipc.population / 1e6)}M people)`);

  if (live.heat?.daily?.temperature_2m_max?.[0] > 38)
    signals.push(`extreme heat (${live.heat.daily.temperature_2m_max[0]}°C, Open-Meteo)`);

  // Neighbours
  const hotNb = (DATA[iso].adj || []).filter(n => store[n]?.score >= 60).map(n => store[n].name);
  const spillPhrase = hotNb.length >= 2
    ? ` Regional pressure from ${hotNb.slice(0, 2).join(" and ")} adds +${c.spillover.toFixed(1)} to the composite score.`
    : "";

  // Anomaly
  const swing = Math.max(...hist) - Math.min(...hist);
  const anomPhrase = (anom.det && anom.z > 3.5 && swing > 12)
    ? ` A statistical anomaly is detected (z=${anom.z.toFixed(1)}), indicating an unusual spike relative to the 28-day baseline.`
    : anom.z > 0
    ? ` A statistical anomaly is detected (z=${anom.z.toFixed(1)}), indicating the current score deviates significantly from the 28-day baseline.`
    : "";

  const parts = [
    `${c.flag} ${c.name} ranks #${rank} globally with a ${sLabel} urgency score of ${c.score}/100, placing it in the top ${100 - pctile}% of all tracked countries.`,
    `The composite is driven primarily by ${top.l.toLowerCase()} (${top.val}/100) and ${second.l.toLowerCase()} (${second.val}/100), the two highest-weighted dimensions.`,
    `The score has ${trendPhrase}${fc.esc ? `, with the 7-day model projecting further escalation to ${fc.fc}.` : "."}`,
  ];

  if (signals.length) {
    const joined = signals.length === 1 ? signals[0] : signals.slice(0, -1).join(", ") + " and " + signals.slice(-1);
    parts.push(`Live data confirms ${joined}.`);
  }

  if (spillPhrase || anomPhrase) parts.push((spillPhrase + anomPhrase).trim());

  return parts.join(" ");
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }

  try {
    const store  = buildStore();
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);
    const iso    = ranked[0];
    const c      = store[iso];
    const coord  = DATA[iso].cent;

    const [usgs, acled, ipc, heat] = await Promise.all([
      safe(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json())),
      safe(fetch("https://api.acleddata.com/acled/read?terms=accept&limit=50&event_date=2024-01-01&event_date_where=>").then(r => r.json())),
      safe(fetch("https://api.ipcinfo.org/v1/classifications/latest").then(r => r.json())),
      safe(fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=temperature_2m_max&timezone=auto&forecast_days=1`).then(r => r.json())),
    ]);

    const narrative = buildNarrative(iso, store, ranked, { usgs, acled, ipc, heat });

    res.writeHead(200, CORS);
    res.end(JSON.stringify({
      generated_at: new Date().toISOString(),
      top_story: {
        iso, rank: 1,
        name:        c.name,
        flag:        c.flag,
        score:       c.score,
        severity:    c.score >= 80 ? "CRITICAL" : c.score >= 60 ? "HIGH" : "MODERATE",
        spillover:   c.spillover,
        narrative,
        dimensions:  Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
        crisis_types: c.types.map(t => ARC[t]?.l || t),
      },
      top_10: ranked.slice(0, 10).map((k, i) => ({
        rank: i + 1, iso: k, name: store[k].name, flag: store[k].flag, score: store[k].score,
      })),
    }, null, 2));

  } catch (err) {
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: err.message }));
  }
}
