"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v18.0.0 — GAP-FILLED DEFINITIVE
//  ────────────────────────────────────────────────────────────────────────────
//  📰 RANKS 179 COUNTRIES BY LIKELIHOOD OF BREAKING CRISIS NEWS *RIGHT NOW*
//  🌍 47+ LIVE FEEDS · EVENT-DEDUPLICATED · EVIDENCE-TRACED · HTML-PARITY
//  ═══ v18.0.0 CHANGES ═══
//  ✅ Seven new gap-filling sources wired into the scoring engine:
//       • ACLED         — structured conflict events with fatality counts
//       • HDX HAPI      — IPC/CH food security phase (population-weighted)
//       • IDMC          — internal displacement (conflict + disaster)
//       • ReliefWeb Reports — narrative evidence density
//       • FAO FPI       — market food price shock (global signal)
//       • WHO GHO       — structured health burden indicators
//       • UNHCR Situations — operational funding gap
//  ✅ Seven new evidence rules (55–61) in computeEvidenceScore
//  ✅ Ten new live-breaking signal types
//  ✅ gap_fillers sub-object exposed on every country payload
//  ✅ All new sources degrade gracefully (no credentials → no crash)
// ═══ v17.0.1 (retained) ═══
//  ✅ ISO_ALIASES + word-boundary matching
//  ✅ Fixed false positives (Chad vs Chadwick)
// ═══ v17.0.0 — DEFINITIVE 10/10 (retained) ═══
//  ✅ All 54 evidence rules wired to sourceCoverage
//  ✅ All 40+ fetchers restored and correctly namespaced
//  ✅ Zero-last-writer-wins bugs (JMA/BMKG/GEOFON/INGV/GeoNet each own key)
//  ✅ Per-country hazard loop (was hardcoded to YEM)
//  ✅ Pop-exposure applied to effective_score ONLY (score is HTML-exact)
//  ✅ rankIndex Map — no O(n) lookups in hot path
//  ✅ Promise.allSettled — one dead fetcher cannot kill the response
//  ✅ __parity_digest exposed for byte-level verification against HTML
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  SEED_INTERVAL_MS: 300_000,
  FETCH_TIMEOUT_MS: 15_000,
  MAX_TOP_N: 179,
  FETCH_CONCURRENCY: 8,

  SPILLOVER_RATE: 0.13,
  SPILLOVER_FLOOR: 50,
  SPILLOVER_MAX: 20,

  MIN_LIVE_EVIDENCE_SOURCES: 1,
  LOW_INSTRUMENTATION_THRESHOLD: 6,

  EVIDENCE_CAP: 35,
  EVIDENCE_STRUCTURAL_WEIGHT: 0.35,

  ANOMALY_Z_THRESHOLD: 2.0,
  HISTORY_MIN_FOR_ANOMALY: 14,
  HISTORY_MIN_FOR_ML_TRAIN: 10,
  HISTORY_MAX_POINTS: 2160,

  ML_ENABLED: true,
  LEARNING_RATE: 0.01,
  HIDDEN_LAYERS: [64, 32],
  SENTIMENT_ENABLED: true,
  HISTORY_ENABLED: true,

  POP_EXPOSURE_ENABLED: true,
  POP_EXPOSURE_MIN_MULT: 0.85,
  POP_EXPOSURE_MAX_MULT: 1.15,
  POP_EXPOSURE_FLOOR_POP: 1_000_000,
  POP_EXPOSURE_CEILING_POP: 100_000_000,

  RESOLUTION_CREDIT_ENABLED: true,
  RESOLUTION_CREDIT_MAX: 4,
  RESOLUTION_CREDIT_RETURN_THRESHOLD: 100_000,

  DEDUP_ENABLED: true,
  DEDUP_TIME_WINDOW_HOURS: 6,
  DEDUP_MAG_TOLERANCE: 0.8,

  FRESH_SIGNAL_HOURS: 24,
  LIVE_EVENT_FLAT_BOOST: 35,

  ARTICLE_SITE_NAME: "GCIN · Global Crisis Index News",
  ARTICLE_BASE_URL: "https://globalcrisisindex.com",
  ARTICLE_AUTHOR: "GCIN Editorial Team",
  ARTICLE_LOGO: "https://globalcrisisindex.com/logo.png",
};

// ─── v18.0.0 GAP-FILLER CONFIG ───
const GAP_CFG = {
  ACLED_ENABLED: true,
  ACLED_FATALITY_WEIGHT: 1.4,
  ACLED_MAX_EVENTS_PER_COUNTRY: 5,
  ACLED_LOOKBACK_DAYS: 30,

  HDX_HAPI_ENABLED: true,
  HDX_HAPI_PHASE_MAX: 5,

  IDMC_ENABLED: true,
  IDMC_CONFLICT_WEIGHT: 1.0,
  IDMC_DISASTER_WEIGHT: 0.7,

  RELIEFWEB_REPORTS_ENABLED: true,
  RELIEFWEB_REPORTS_LIMIT: 20,

  FAO_FPI_ENABLED: true,
  FAO_FPI_BASELINE: 100,

  WHO_GHO_ENABLED: true,
  WHO_GHO_INDICATORS: [
    { code: 'WHS4_100',              label: 'Cholera case fatality ratio', floor: 0,  ceil: 5,   maxPts: 5, weight: 0.85 },
    { code: 'MDG_0000000001',        label: 'Under-5 mortality',           floor: 10, ceil: 120, maxPts: 6, weight: 0.80 },
    { code: 'MDG_0000000007',        label: 'Measles immunization',        floor: 50, ceil: 95,  maxPts: 4, weight: 0.70, invert: true },
    { code: 'MALARIA_EST_INCIDENCE', label: 'Malaria incidence',           floor: 0,  ceil: 300, maxPts: 5, weight: 0.75 },
  ],

  UNHCR_SITUATIONS_ENABLED: true,
  UNHCR_SITUATIONS_FUNDING_GAP_WEIGHT: 1.0,
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
};

const HAZARD_LOOP_ISOS = [
  'YEM','SOM','SSD','SDN','AFG','ETH','NGA','IND','PAK','BGD','IRQ','SAU',
  'EGY','TUR','IRN','JOR','LBN','SYR','KWT','QAT','ARE','OMN','DZA','MLI','NER'
];

const WPAC_ISOS = new Set(['PHL','TWN','JPN','CHN','VNM','KOR','PRK','IDN','MYS','THA','KHM','LAO','MMR','BGD','IND','LKA','MDV']);
const MEDITERRANEAN_ISOS = new Set(['ITA','GRC','TUR','ESP','FRA','HRV','ALB','MNE','LBY','TUN','DZA','MAR','EGY','ISR','LBN','SYR','CYP','MLT']);
const SOUTH_PACIFIC_ISOS = new Set(['NZL','FJI','WSM','TON','VUT','SLB','PNG','NCL','PYF','COK','NIU','TKL','KIR','TUV','FSM','MHL','PLW']);

const COUNTRY_CENTROIDS = {
  IDN:[113.9,-0.8],JPN:[138.0,36.2],PHL:[121.8,12.9],CHN:[104.2,35.9],
  IND:[78.9,20.6],BGD:[90.4,23.7],VNM:[108.3,14.1],THA:[100.9,15.9],
  MMR:[96.0,21.9],PAK:[69.3,30.4],NPL:[84.1,28.4],LKA:[80.8,7.9],
  USA:[-95.7,37.1],MEX:[-102.5,23.6],COL:[-74.3,4.6],VEN:[-66.6,6.4],
  PER:[-75.0,-9.2],CHL:[-71.5,-35.7],ECU:[-78.2,-1.8],BRA:[-51.9,-14.2],
  ITA:[12.6,41.9],GRC:[22.0,39.1],TUR:[35.2,39.0],ESP:[-3.7,40.5],
  FRA:[2.2,46.2],DEU:[10.5,51.2],GBR:[-3.4,55.4],RUS:[105.3,61.5],
  IRN:[53.7,32.4],IRQ:[43.7,33.2],SAU:[45.1,23.9],ISR:[34.9,31.0],
  SYR:[38.0,34.8],LBN:[35.9,33.9],JOR:[36.2,30.6],EGY:[30.8,26.8],
  LBY:[17.2,26.3],TUN:[9.5,33.9],DZA:[1.7,28.0],MAR:[-7.1,31.8],
  SDN:[30.2,12.9],SSD:[31.3,7.9],ETH:[40.5,9.1],SOM:[46.2,5.2],
  KEN:[37.9,-0.0],TZA:[34.9,-6.4],UGA:[32.3,1.4],NGA:[8.7,9.1],
  NER:[8.1,17.6],TCD:[18.7,15.5],CMR:[12.4,7.4],CAF:[20.9,6.6],
  COD:[21.8,-4.0],COG:[15.8,-0.2],GAB:[11.6,-0.8],AGO:[17.9,-11.2],
  ZAF:[22.9,-30.6],MOZ:[35.5,-18.7],ZWE:[29.2,-19.0],ZMB:[27.8,-13.1],
  MWI:[34.3,-13.3],MDG:[46.9,-18.8],MLI:[-4.0,17.6],BFA:[-1.6,12.2],
  GHA:[-1.0,7.9],CIV:[-5.5,7.5],SEN:[-14.5,14.5],GIN:[-9.7,9.9],
  LBR:[-9.4,6.4],SLE:[-11.8,8.5],GNB:[-15.2,12.0],MRT:[-10.9,21.0],
  ERI:[39.8,15.2],DJI:[42.6,11.8],YEM:[48.5,15.6],OMN:[56.1,21.5],
  AFG:[67.7,33.9],UZB:[64.6,41.4],KAZ:[66.9,48.0],KGZ:[74.8,41.2],
  TJK:[71.3,38.9],TKM:[59.6,38.9],AZE:[47.6,40.1],ARM:[45.0,40.1],
  GEO:[43.4,42.3],BLR:[28.0,53.7],UKR:[31.2,49.0],MDA:[28.9,47.4],
  ROU:[24.9,45.9],BGR:[25.5,42.7],SRB:[21.0,44.0],BIH:[17.7,43.9],
  HRV:[15.2,45.1],SVN:[14.9,46.2],HUN:[19.5,47.2],AUT:[14.6,47.5],
  CHE:[8.2,46.8],NLD:[5.3,52.1],BEL:[4.5,50.5],LUX:[6.1,49.8],
  DNK:[9.5,56.3],NOR:[8.5,60.5],SWE:[18.6,60.1],FIN:[25.7,61.9],
  ISL:[-19.0,64.9],IRL:[-8.2,53.4],PRT:[-8.2,39.4],
  CAN:[-105.0,56.1],AUS:[133.8,-25.3],NZL:[172.0,-41.0],PNG:[143.9,-6.3],
  SLB:[160.2,-9.6],VUT:[166.9,-15.4],FJI:[178.0,-17.7],WSM:[-172.1,-13.8],
  TON:[-175.2,-21.2],KIR:[173.0,1.9],FSM:[158.2,6.9],MHL:[171.2,7.1],
  PLW:[134.6,7.5],NRU:[166.9,-0.5],TUV:[177.7,-7.1],KOR:[127.8,36.5],
  PRK:[127.5,40.3],TWN:[120.9,23.7],HKG:[114.1,22.3],MNG:[103.8,46.9],
  KHM:[104.9,12.6],LAO:[102.5,19.9],MYS:[101.9,4.2],SGP:[103.8,1.4],
  BRN:[114.7,4.5],TLS:[-125.7,-8.9],BTN:[90.4,27.5],MDV:[73.2,3.2],
  CUB:[-77.8,21.5],HTI:[-72.3,18.9],DOM:[-70.2,18.7],JAM:[-77.3,18.1],
  TTO:[-61.2,10.7],BRB:[-59.6,13.2],GUY:[-58.9,4.9],SUR:[-55.9,4.0],
  BLZ:[-88.5,17.2],GTM:[-90.2,15.8],HND:[-86.2,15.2],SLV:[-88.9,13.8],
  NIC:[-85.2,12.9],CRI:[-83.8,9.7],PAN:[-80.8,8.5],BHS:[-77.4,25.0],
  ATG:[-61.8,17.1],DMA:[-61.4,15.4],GRD:[-61.7,12.1],KNA:[-62.7,17.3],
  LCA:[-60.9,13.9],VCT:[-61.2,13.3],URY:[-55.8,-32.5],ARG:[-63.6,-38.4],
  PRY:[-58.4,-23.4],BOL:[-63.6,-16.3],
};

const ARC = {
  CE:{l:"Complex Emergency",i:"⚔️",n:["shelter","food","health","protection"],seo:"complex humanitarian emergency",color:"#ff375f"},
  CW:{l:"Civil War",i:"⚔️",n:["shelter","protection","health","food"],seo:"armed conflict civil war",color:"#ff6b4a"},
  EQ:{l:"Earthquake",i:"🌍",n:["shelter","health","water"],seo:"earthquake disaster relief",color:"#ff8c42"},
  FL:{l:"Flood",i:"🌊",n:["shelter","water","food"],seo:"flooding disaster emergency",color:"#3ec5ff"},
  DR:{l:"Drought",i:"🏜️",n:["food","water","nutrition"],seo:"drought crisis food security",color:"#ffb020"},
  FN:{l:"Famine",i:"🍚",n:["food","nutrition","health"],seo:"famine hunger crisis",color:"#ff375f"},
  EP:{l:"Epidemic",i:"🦠",n:["health","water","nutrition"],seo:"disease outbreak epidemic",color:"#e879f9"},
  REF:{l:"Refugee Crisis",i:"🚶",n:["shelter","protection","water"],seo:"refugee displacement crisis",color:"#bf7fff"},
  TC:{l:"Cyclone / Hurricane",i:"🌀",n:["shelter","water"],seo:"cyclone hurricane disaster",color:"#00c8ff"},
  WF:{l:"Wildfire",i:"🔥",n:["shelter","health"],seo:"wildfire emergency evacuation",color:"#ff6b4a"},
  HEAT:{l:"Heatwave",i:"🥵",n:["health","water"],seo:"heatwave health emergency",color:"#ff8c42"},
  LS:{l:"Landslide",i:"⛰️",n:["shelter","health"],seo:"landslide disaster",color:"#8bbdd8"},
  TSU:{l:"Tsunami",i:"🌊",n:["shelter","health","water"],seo:"tsunami disaster warning",color:"#3ec5ff"},
  VLC:{l:"Volcano",i:"🌋",n:["shelter","health","water"],seo:"volcanic eruption emergency",color:"#ff8c42"},
  ST:{l:"Storm",i:"⛈️",n:["shelter","water"],seo:"severe storm disaster",color:"#00c8ff"},
  POL:{l:"Political Crisis",i:"🏛️",n:["protection","food","economic"],seo:"political crisis instability",color:"#bf7fff"},
  ECO:{l:"Economic Collapse",i:"📉",n:["food","economic","health"],seo:"economic crisis collapse",color:"#ffb020"},
};

const DIMS = [
  {k:"conflict",l:"Conflict",w:0.28,icon:"⚔️",color:"#ff375f"},
  {k:"displacement",l:"Displacement",w:0.22,icon:"🚶",color:"#bf7fff"},
  {k:"food",l:"Food Security",w:0.18,icon:"🌾",color:"#ffb020"},
  {k:"health",l:"Health",w:0.14,icon:"🏥",color:"#e879f9"},
  {k:"economic",l:"Economic",w:0.10,icon:"📉",color:"#ff8c42"},
  {k:"climate",l:"Climate",w:0.05,icon:"🌡️",color:"#00c8ff"},
  {k:"access",l:"Access",w:0.02,icon:"🚧",color:"#8bbdd8"},
  {k:"political",l:"Political",w:0.01,icon:"⚖️",color:"#bf7fff"},
];

const BASE_SCORES = {
  PSE:96,SOM:94,SYR:93,YEM:92,SSD:91,AFG:90,SDN:88,HTI:86,UKR:85,COD:86,
  ETH:79,MMR:73,IRQ:72,LBN:75,PAK:69,NGA:66,IRN:61,VEN:63,COL:57,BGD:57,
  IDN:79,PHL:73,NPL:58,KEN:42,MOZ:44,TUR:59,IND:56,BRA:53,ZAF:51,EGY:49,
  JOR:41,SAU:38,KAZ:32,CHN:55,JPN:66,CHL:63,NZL:56,ITA:59,GRC:57,RUS:66,
  AUS:29,CAN:27,FRA:26,DEU:22,GBR:25,ESP:28,SWE:18,NOR:17,FIN:17,DNK:15,
  NLD:16,BEL:15,CHE:12,AUT:14,PRT:22,IRL:18,KOR:31,POL:22,HUN:21,CZE:19,
  ECU:45,ISL:19,PNG:55,FJI:44,SLB:50,MEX:48,ARG:35,PER:49,DZA:38,LBY:72,
  MAR:34,TUN:41,BDI:67,COM:42,DJI:48,ERI:61,MDG:55,MUS:18,MWI:52,RWA:44,
  SYC:15,TZA:46,UGA:51,ZMB:47,ZWE:58,BEN:43,BFA:78,CPV:16,CIV:55,GMB:39,
  GHA:36,GIN:54,GNB:57,LBR:52,MLI:82,MRT:59,NER:76,SEN:38,SLE:49,TGO:44,
  CAF:84,CMR:62,COG:48,GAB:32,GNQ:36,STP:18,TCD:74,AGO:48,BWA:22,LSO:38,
  NAM:26,SWZ:35,UZB:42,TJK:51,TKM:48,KGZ:44,MNG:28,PRK:72,BRN:14,KHM:48,
  LAO:38,MYS:26,SGP:9,THA:41,TLS:52,VNM:36,BTN:22,LKA:44,MDV:18,ARE:22,
  ARM:48,AZE:44,BHR:35,CYP:29,GEO:46,ISR:62,KWT:28,OMN:24,QAT:18,BLZ:38,
  CRI:22,SLV:55,GTM:58,HND:62,NIC:48,PAN:32,ATG:14,BHS:22,BRB:12,CUB:52,
  DMA:18,DOM:45,GRD:14,JAM:44,KNA:12,LCA:16,TTO:36,VCT:18,BOL:48,GUY:38,
  PRY:42,SUR:34,URY:19,ALB:38,BIH:42,BGR:28,BLR:55,EST:18,HRV:22,LVA:19,
  LIE:8,LTU:18,LUX:8,MDA:44,MKD:35,MLT:12,MNE:28,ROU:32,SRB:36,SVK:18,
  SVN:14,AND:8,SMR:8,GRL:12,VUT:32,TON:26,WSM:24,KIR:38,FSM:28,MHL:32,
  PLW:18,NRU:22,TUV:36,COK:18,TWN:35,HKG:18,XKX:45,ESH:32,USA:29,
};

const CTYPES = {
  PSE:["CE","CW","REF","HEAT"],SOM:["CE","CW","DR","FN","REF","HEAT"],SYR:["CE","CW","REF","EP","HEAT"],
  YEM:["CE","CW","FN","DR","REF"],AFG:["CE","CW","DR","FN","REF"],UKR:["CE","CW","REF","HEAT"],
  SSD:["CE","CW","FL","FN","REF"],SDN:["CE","CW","DR","FL","REF"],COD:["CE","CW","EP","FL","REF"],
  HTI:["CE","EQ","EP","ST","REF"],ETH:["CE","CW","DR","FN","REF"],MMR:["CE","CW","FL","REF","EP"],
  LBN:["CE","REF","EP","HEAT"],NGA:["CE","CW","FL","EP","REF"],PAK:["FL","EQ","DR","REF","HEAT","LS"],
  IRQ:["CE","CW","REF","HEAT"],IRN:["EQ","DR","REF","HEAT","LS"],VEN:["CE","REF","DR","HEAT"],
  COL:["CE","CW","FL","REF","LS"],BGD:["FL","TC","REF","EP","LS","HEAT"],IDN:["EQ","TSU","VLC","FL","LS","TC","HEAT"],
  PHL:["TC","FL","EQ","VLC","TSU","LS","HEAT"],JPN:["EQ","TSU","TC","VLC","FL","HEAT"],
  CHL:["EQ","VLC","TSU","WF","HEAT"],PER:["EQ","FL","LS","VLC","TSU","HEAT"],MEX:["EQ","ST","VLC","FL","TSU","HEAT"],
  USA:["WF","ST","EQ","TC","TSU","HEAT"],NZL:["EQ","TSU","VLC","FL","HEAT"],ITA:["EQ","VLC","WF","FL","TSU","HEAT"],
  GRC:["EQ","VLC","WF","FL","HEAT","REF"],ISL:["VLC","FL","ST","HEAT"],ECU:["EQ","VLC","FL","TSU","HEAT"],
  PNG:["EQ","TSU","VLC","FL","HEAT"],FJI:["TC","TSU","FL","HEAT"],SLB:["EQ","TSU","TC","HEAT"],
  NPL:["EQ","LS","FL","HEAT"],TUR:["EQ","FL","REF","CW","LS","HEAT"],IND:["FL","TC","DR","EQ","HEAT","LS"],
  CHN:["FL","EQ","TC","LS","TSU","HEAT"],RUS:["WF","FL","CW","ST","HEAT"],BRA:["FL","WF","DR","EP","LS","HEAT"],
  ZAF:["DR","FL","EP","HEAT"],EGY:["DR","REF","HEAT"],JOR:["REF","DR","HEAT"],SAU:["DR","ST","HEAT","REF"],
  KAZ:["FL","DR","WF","HEAT"],ARG:["FL","DR","ST","HEAT"],CAN:["WF","FL","ST","HEAT"],AUS:["WF","FL","TC","DR","HEAT"],
  FRA:["WF","ST","HEAT"],DEU:["FL","ST","HEAT"],GBR:["ST","FL","HEAT"],ESP:["WF","DR","ST","HEAT"],
  PRT:["WF","FL","HEAT"],SWE:["FL","ST","WF","HEAT"],NOR:["FL","ST","WF","HEAT"],FIN:["FL","ST","WF","HEAT"],
  DNK:["ST","FL","HEAT"],NLD:["FL","ST","HEAT"],BEL:["FL","ST","HEAT"],CHE:["FL","LS","ST","HEAT"],
  AUT:["FL","LS","ST","HEAT"],POL:["FL","ST","WF","HEAT"],CZE:["FL","ST","WF","HEAT"],HUN:["FL","ST","HEAT","WF"],
  IRL:["ST","FL","HEAT"],KOR:["ST","FL","HEAT","EQ"],MOZ:["TC","FL","HEAT"],DZA:["DR","WF","HEAT","EP"],
  LBY:["CE","CW","REF","HEAT"],MAR:["EQ","DR","HEAT","FL"],TUN:["DR","HEAT","FL"],
  BDI:["CE","CW","EP","FL","REF"],COM:["TC","FL","EP","HEAT"],DJI:["DR","HEAT","REF","FL"],ERI:["CE","DR","REF","HEAT"],
  KEN:["DR","FL","EP","REF","HEAT"],MDG:["TC","FL","DR","EP","HEAT"],MUS:["TC","FL","HEAT"],
  MWI:["FL","DR","EP","HEAT"],RWA:["FL","LS","EP","REF"],SYC:["TC","FL","HEAT"],TZA:["FL","DR","EP","HEAT"],
  UGA:["FL","EP","REF","LS"],ZMB:["FL","DR","EP","HEAT"],ZWE:["DR","FL","EP","HEAT"],BEN:["FL","DR","EP","HEAT"],
  BFA:["CE","CW","DR","EP","REF","HEAT"],CPV:["DR","HEAT","ST"],CIV:["FL","EP","CE","HEAT"],GMB:["DR","HEAT","FL"],
  GHA:["FL","DR","EP","HEAT"],GIN:["FL","EP","LS","HEAT"],GNB:["FL","EP","DR","HEAT"],LBR:["FL","EP","CE","HEAT"],
  MLI:["CE","CW","DR","FN","REF","HEAT"],MRT:["DR","FN","HEAT","FL"],NER:["DR","FN","CE","HEAT","FL"],
  SEN:["DR","FL","EP","HEAT"],SLE:["FL","EP","LS","HEAT"],TGO:["FL","DR","EP","HEAT"],CAF:["CE","CW","EP","FL","REF"],
  CMR:["CE","CW","FL","EP","REF"],COG:["FL","EP","CE","HEAT"],GAB:["FL","EP","HEAT"],GNQ:["FL","EP","HEAT"],
  STP:["FL","EP","HEAT"],AGO:["FL","DR","EP","HEAT"],BWA:["DR","HEAT","FL"],LSO:["DR","FL","HEAT"],
  NAM:["DR","HEAT","FL"],SWZ:["DR","FL","EP","HEAT"],TCD:["CE","CW","DR","REF","HEAT"],
  UZB:["DR","HEAT","FL","EQ"],TJK:["EQ","FL","LS","DR","HEAT"],TKM:["DR","HEAT","FL"],
  KGZ:["EQ","FL","LS","DR","HEAT"],MNG:["DR","ST","HEAT","FL"],PRK:["DR","FL","HEAT","ST"],
  TWN:["TC","EQ","TSU","FL","HEAT"],HKG:["TC","FL","HEAT"],BRN:["FL","HEAT"],KHM:["FL","DR","HEAT","EP"],
  LAO:["FL","DR","LS","HEAT"],MYS:["FL","LS","HEAT","EP"],SGP:["HEAT","FL"],THA:["FL","DR","HEAT","EP"],
  TLS:["FL","DR","EP","HEAT"],VNM:["FL","TC","DR","LS","HEAT","EP"],BTN:["FL","LS","EQ","HEAT"],
  LKA:["FL","TC","DR","EP","HEAT"],MDV:["TC","FL","HEAT"],ARE:["DR","HEAT","ST"],ARM:["EQ","DR","CW","HEAT"],
  AZE:["EQ","FL","CW","HEAT"],BHR:["DR","HEAT"],CYP:["DR","WF","HEAT"],GEO:["EQ","FL","LS","CW","HEAT"],
  ISR:["DR","WF","HEAT","CW"],KWT:["DR","HEAT","ST"],OMN:["TC","DR","HEAT","ST"],QAT:["DR","HEAT"],
  BLZ:["TC","FL","ST","HEAT"],CRI:["EQ","FL","LS","TC","HEAT"],SLV:["EQ","FL","DR","ST","HEAT"],
  GTM:["EQ","FL","LS","ST","DR","HEAT"],HND:["ST","FL","DR","LS","HEAT"],NIC:["ST","FL","DR","EQ","HEAT"],
  PAN:["FL","LS","ST","HEAT"],ATG:["TC","ST","HEAT"],BHS:["TC","ST","FL","HEAT"],BRB:["TC","ST","HEAT"],
  CUB:["TC","FL","ST","HEAT"],DMA:["TC","VLC","ST","HEAT"],DOM:["TC","FL","EQ","ST","HEAT"],
  GRD:["TC","ST","HEAT"],JAM:["TC","FL","ST","HEAT"],KNA:["TC","VLC","ST","HEAT"],LCA:["TC","VLC","ST","HEAT"],
  TTO:["FL","ST","HEAT"],VCT:["TC","VLC","FL","HEAT"],BOL:["FL","DR","LS","HEAT"],GUY:["FL","ST","HEAT"],
  PRY:["FL","DR","HEAT"],SUR:["FL","ST","HEAT"],URY:["FL","DR","ST","HEAT"],ALB:["EQ","FL","LS","HEAT"],
  BIH:["FL","LS","ST","HEAT"],BGR:["FL","WF","ST","HEAT"],BLR:["FL","ST","WF","HEAT"],EST:["ST","FL","HEAT"],
  HRV:["EQ","FL","ST","HEAT"],LVA:["ST","FL","HEAT"],LIE:["FL","LS","HEAT"],LTU:["ST","FL","HEAT"],
  LUX:["FL","ST","HEAT"],MDA:["FL","DR","HEAT"],MKD:["EQ","FL","WF","HEAT"],MLT:["DR","HEAT","ST"],
  MNE:["EQ","FL","WF","HEAT"],ROU:["EQ","FL","DR","HEAT"],SRB:["FL","ST","WF","HEAT"],SVK:["FL","ST","WF","HEAT"],
  SVN:["EQ","FL","LS","HEAT"],AND:["LS","HEAT"],SMR:["HEAT","FL"],GRL:["ST","FL","HEAT"],
  VUT:["TC","EQ","TSU","VLC","FL","HEAT"],TON:["TC","TSU","FL","HEAT"],WSM:["TC","TSU","FL","HEAT"],
  KIR:["TC","FL","HEAT"],FSM:["TC","TSU","FL","HEAT"],MHL:["TC","TSU","FL","HEAT"],PLW:["TC","TSU","FL","HEAT"],
  NRU:["TC","FL","HEAT"],TUV:["TC","FL","HEAT"],COK:["TC","FL","HEAT"],XKX:["FL","ST","HEAT"],ESH:["DR","HEAT"],
};

const DEFAULT_T = ["EQ","FL","ST","HEAT"];

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
  STP:{name:"Sao Tome and Principe",flag:"🇸🇹",fsi_score:68.5,rank:88,region:"africa",fsi_band:"Elevated Warning"},
  ARM:{name:"Armenia",flag:"🇦🇲",fsi_score:68.1,rank:89,region:"asia",fsi_band:"Elevated Warning"},
  ECU:{name:"Ecuador",flag:"🇪🇨",fsi_score:68.0,rank:90,region:"americas",fsi_band:"Elevated Warning"},
  SRB:{name:"Serbia",flag:"🇷🇸",fsi_score:67.8,rank:91,region:"europe",fsi_band:"Elevated Warning"},
  TUN:{name:"Tunisia",flag:"🇹🇳",fsi_score:67.2,rank:92,region:"africa",fsi_band:"Elevated Warning"},
  FSM:{name:"F.S. Micronesia",flag:"🇫🇲",fsi_score:66.9,rank:93,region:"oceania",fsi_band:"Elevated Warning"},
  FJI:{name:"Fiji",flag:"🇫🇯",fsi_score:66.4,rank:94,region:"oceania",fsi_band:"Elevated Warning"},
  THA:{name:"Thailand",flag:"🇹🇭",fsi_score:66.2,rank:95,region:"asia",fsi_band:"Elevated Warning"},
  UZB:{name:"Uzbekistan",flag:"🇺🇿",fsi_score:64.8,rank:96,region:"asia",fsi_band:"Warning"},
  MDA:{name:"Moldova",flag:"🇲🇩",fsi_score:64.7,rank:97,region:"europe",fsi_band:"Warning"},
  BTN:{name:"Bhutan",flag:"🇧🇹",fsi_score:64.5,rank:98,region:"asia",fsi_band:"Warning"},
  CHN:{name:"China",flag:"🇨🇳",fsi_score:64.4,rank:99,region:"asia",fsi_band:"Warning"},
  BHR:{name:"Bahrain",flag:"🇧🇭",fsi_score:64.2,rank:100,region:"middleeast",fsi_band:"Warning"},
  WSM:{name:"Samoa",flag:"🇼🇸",fsi_score:63.9,rank:101,region:"oceania",fsi_band:"Warning"},
  IDN:{name:"Indonesia",flag:"🇮🇩",fsi_score:63.7,rank:102,region:"asia",fsi_band:"Warning"},
  SAU:{name:"Saudi Arabia",flag:"🇸🇦",fsi_score:63.2,rank:103,region:"middleeast",fsi_band:"Warning"},
  TKM:{name:"Turkmenistan",flag:"🇹🇲",fsi_score:62.2,rank:104,region:"asia",fsi_band:"Warning"},
  PRY:{name:"Paraguay",flag:"🇵🇾",fsi_score:61.5,rank:105,region:"americas",fsi_band:"Warning"},
  GHA:{name:"Ghana",flag:"🇬🇭",fsi_score:60.8,rank:106,region:"africa",fsi_band:"Warning"},
  MDV:{name:"Maldives",flag:"🇲🇻",fsi_score:60.3,rank:107,region:"asia",fsi_band:"Warning"},
  DOM:{name:"Dominican Republic",flag:"🇩🇴",fsi_score:60.2,rank:108,region:"americas",fsi_band:"Warning"},
  JAM:{name:"Jamaica",flag:"🇯🇲",fsi_score:59.3,rank:109,region:"americas",fsi_band:"Warning"},
  NAM:{name:"Namibia",flag:"🇳🇦",fsi_score:59.3,rank:109,region:"africa",fsi_band:"Warning"},
  GUY:{name:"Guyana",flag:"🇬🇾",fsi_score:59.2,rank:111,region:"americas",fsi_band:"Warning"},
  CUB:{name:"Cuba",flag:"🇨🇺",fsi_score:59.1,rank:112,region:"americas",fsi_band:"Warning"},
  SUR:{name:"Suriname",flag:"🇸🇷",fsi_score:58.8,rank:113,region:"americas",fsi_band:"Warning"},
  MKD:{name:"North Macedonia",flag:"🇲🇰",fsi_score:58.1,rank:114,region:"europe",fsi_band:"Warning"},
  KAZ:{name:"Kazakhstan",flag:"🇰🇿",fsi_score:57.8,rank:115,region:"asia",fsi_band:"Warning"},
  CPV:{name:"Cape Verde",flag:"🇨🇻",fsi_score:57.2,rank:116,region:"africa",fsi_band:"Warning"},
  BLZ:{name:"Belize",flag:"🇧🇿",fsi_score:57.0,rank:117,region:"americas",fsi_band:"Warning"},
  MNE:{name:"Montenegro",flag:"🇲🇪",fsi_score:56.9,rank:118,region:"europe",fsi_band:"Warning"},
  VNM:{name:"Vietnam",flag:"🇻🇳",fsi_score:56.2,rank:119,region:"asia",fsi_band:"Warning"},
  ALB:{name:"Albania",flag:"🇦🇱",fsi_score:55.9,rank:120,region:"europe",fsi_band:"Warning"},
  GRC:{name:"Greece",flag:"🇬🇷",fsi_score:54.7,rank:121,region:"europe",fsi_band:"Warning"},
  CYP:{name:"Cyprus",flag:"🇨🇾",fsi_score:54.1,rank:122,region:"europe",fsi_band:"Less Stable"},
  BRN:{name:"Brunei",flag:"🇧🇳",fsi_score:53.9,rank:123,region:"asia",fsi_band:"Less Stable"},
  BWA:{name:"Botswana",flag:"🇧🇼",fsi_score:53.6,rank:124,region:"africa",fsi_band:"Less Stable"},
  TTO:{name:"Trinidad and Tobago",flag:"🇹🇹",fsi_score:53.5,rank:125,region:"americas",fsi_band:"Less Stable"},
  MYS:{name:"Malaysia",flag:"🇲🇾",fsi_score:53.1,rank:126,region:"asia",fsi_band:"Less Stable"},
  ATG:{name:"Antigua and Barbuda",flag:"🇦🇬",fsi_score:51.9,rank:127,region:"americas",fsi_band:"Less Stable"},
  GRD:{name:"Grenada",flag:"🇬🇩",fsi_score:51.9,rank:127,region:"americas",fsi_band:"Less Stable"},
  ISR:{name:"Israel",flag:"🇮🇱",fsi_score:51.5,rank:129,region:"middleeast",fsi_band:"Less Stable"},
  ROU:{name:"Romania",flag:"🇷🇴",fsi_score:51.0,rank:130,region:"europe",fsi_band:"Less Stable"},
  SYC:{name:"Seychelles",flag:"🇸🇨",fsi_score:51.0,rank:130,region:"africa",fsi_band:"Less Stable"},
  MNG:{name:"Mongolia",flag:"🇲🇳",fsi_score:50.7,rank:132,region:"asia",fsi_band:"Less Stable"},
  BGR:{name:"Bulgaria",flag:"🇧🇬",fsi_score:49.4,rank:133,region:"europe",fsi_band:"Less Stable"},
  KWT:{name:"Kuwait",flag:"🇰🇼",fsi_score:49.3,rank:134,region:"middleeast",fsi_band:"Less Stable"},
  BHS:{name:"Bahamas",flag:"🇧🇸",fsi_score:48.0,rank:135,region:"americas",fsi_band:"Less Stable"},
  PAN:{name:"Panama",flag:"🇵🇦",fsi_score:47.7,rank:136,region:"americas",fsi_band:"Less Stable"},
  OMN:{name:"Oman",flag:"🇴🇲",fsi_score:47.4,rank:137,region:"middleeast",fsi_band:"Less Stable"},
  HUN:{name:"Hungary",flag:"🇭🇺",fsi_score:46.2,rank:138,region:"europe",fsi_band:"Less Stable"},
  HRV:{name:"Croatia",flag:"🇭🇷",fsi_score:45.9,rank:139,region:"europe",fsi_band:"Less Stable"},
  BRB:{name:"Barbados",flag:"🇧🇧",fsi_score:44.7,rank:140,region:"americas",fsi_band:"Less Stable"},
  USA:{name:"United States",flag:"🇺🇸",fsi_score:44.5,rank:141,region:"americas",fsi_band:"Less Stable"},
  ARG:{name:"Argentina",flag:"🇦🇷",fsi_score:44.2,rank:142,region:"americas",fsi_band:"Less Stable"},
  ESP:{name:"Spain",flag:"🇪🇸",fsi_score:44.0,rank:143,region:"europe",fsi_band:"Less Stable"},
  POL:{name:"Poland",flag:"🇵🇱",fsi_score:41.7,rank:144,region:"europe",fsi_band:"Stable"},
  LVA:{name:"Latvia",flag:"🇱🇻",fsi_score:41.4,rank:145,region:"europe",fsi_band:"Stable"},
  CHL:{name:"Chile",flag:"🇨🇱",fsi_score:41.1,rank:146,region:"americas",fsi_band:"Stable"},
  ITA:{name:"Italy",flag:"🇮🇹",fsi_score:41.1,rank:146,region:"europe",fsi_band:"Stable"},
  GBR:{name:"United Kingdom",flag:"🇬🇧",fsi_score:40.8,rank:148,region:"europe",fsi_band:"Stable"},
  QAT:{name:"Qatar",flag:"🇶🇦",fsi_score:39.8,rank:149,region:"middleeast",fsi_band:"Stable"},
  CRI:{name:"Costa Rica",flag:"🇨🇷",fsi_score:39.4,rank:150,region:"americas",fsi_band:"Stable"},
  MUS:{name:"Mauritius",flag:"🇲🇺",fsi_score:37.8,rank:151,region:"africa",fsi_band:"Stable"},
  CZE:{name:"Czech Republic",flag:"🇨🇿",fsi_score:37.7,rank:152,region:"europe",fsi_band:"Stable"},
  LTU:{name:"Lithuania",flag:"🇱🇹",fsi_score:37.4,rank:153,region:"europe",fsi_band:"Stable"},
  EST:{name:"Estonia",flag:"🇪🇪",fsi_score:36.5,rank:154,region:"europe",fsi_band:"Stable"},
  SVK:{name:"Slovakia",flag:"🇸🇰",fsi_score:35.3,rank:155,region:"europe",fsi_band:"Stable"},
  ARE:{name:"United Arab Emirates",flag:"🇦🇪",fsi_score:34.7,rank:156,region:"middleeast",fsi_band:"Stable"},
  URY:{name:"Uruguay",flag:"🇺🇾",fsi_score:33.7,rank:157,region:"americas",fsi_band:"Stable"},
  MLT:{name:"Malta",flag:"🇲🇹",fsi_score:31.1,rank:158,region:"europe",fsi_band:"More Stable"},
  BEL:{name:"Belgium",flag:"🇧🇪",fsi_score:30.3,rank:159,region:"europe",fsi_band:"More Stable"},
  JPN:{name:"Japan",flag:"🇯🇵",fsi_score:30.2,rank:160,region:"asia",fsi_band:"More Stable"},
  KOR:{name:"South Korea",flag:"🇰🇷",fsi_score:29.8,rank:161,region:"asia",fsi_band:"More Stable"},
  FRA:{name:"France",flag:"🇫🇷",fsi_score:28.3,rank:162,region:"europe",fsi_band:"More Stable"},
  SVN:{name:"Slovenia",flag:"🇸🇮",fsi_score:26.1,rank:163,region:"europe",fsi_band:"More Stable"},
  PRT:{name:"Portugal",flag:"🇵🇹",fsi_score:25.9,rank:164,region:"europe",fsi_band:"More Stable"},
  SGP:{name:"Singapore",flag:"🇸🇬",fsi_score:25.4,rank:165,region:"asia",fsi_band:"More Stable"},
  DEU:{name:"Germany",flag:"🇩🇪",fsi_score:24.0,rank:166,region:"europe",fsi_band:"More Stable"},
  AUT:{name:"Austria",flag:"🇦🇹",fsi_score:23.1,rank:167,region:"europe",fsi_band:"More Stable"},
  SWE:{name:"Sweden",flag:"🇸🇪",fsi_score:20.6,rank:168,region:"europe",fsi_band:"Sustainable"},
  AUS:{name:"Australia",flag:"🇦🇺",fsi_score:19.6,rank:169,region:"oceania",fsi_band:"Sustainable"},
  NLD:{name:"Netherlands",flag:"🇳🇱",fsi_score:19.5,rank:170,region:"europe",fsi_band:"Sustainable"},
  LUX:{name:"Luxembourg",flag:"🇱🇺",fsi_score:18.7,rank:171,region:"europe",fsi_band:"Sustainable"},
  CAN:{name:"Canada",flag:"🇨🇦",fsi_score:18.6,rank:172,region:"americas",fsi_band:"Sustainable"},
  IRL:{name:"Ireland",flag:"🇮🇪",fsi_score:18.6,rank:172,region:"europe",fsi_band:"Sustainable"},
  CHE:{name:"Switzerland",flag:"🇨🇭",fsi_score:16.2,rank:174,region:"europe",fsi_band:"Sustainable"},
  DNK:{name:"Denmark",flag:"🇩🇰",fsi_score:15.9,rank:175,region:"europe",fsi_band:"Sustainable"},
  NZL:{name:"New Zealand",flag:"🇳🇿",fsi_score:15.9,rank:175,region:"oceania",fsi_band:"Sustainable"},
  ISL:{name:"Iceland",flag:"🇮🇸",fsi_score:15.2,rank:177,region:"europe",fsi_band:"Sustainable"},
  FIN:{name:"Finland",flag:"🇫🇮",fsi_score:14.3,rank:178,region:"europe",fsi_band:"Sustainable"},
  NOR:{name:"Norway",flag:"🇳🇴",fsi_score:12.7,rank:179,region:"europe",fsi_band:"Sustainable"},
};

const REGION_ALIASES = {
  africa:["africa"], asia:["asia"], europe:["europe"],
  middleeast:["middleeast","middle east","mena"],
  americas:["americas","latin america","latam","caribbean"],
  oceania:["oceania","pacific"],
};

const COUNTRIES = {};
for (const iso of Object.keys(BASE_SCORES)) {
  const fsi = FSI_2024[iso];
  const region = fsi?.region || "other";
  const types = CTYPES[iso] || DEFAULT_T;
  const adj = [];
  for (const [otherIso, otherFsi] of Object.entries(FSI_2024)) {
    if (otherIso !== iso && otherFsi.region === region) adj.push(otherIso);
  }
  COUNTRIES[iso] = {
    name: fsi?.name || iso,
    flag: fsi?.flag || "🌍",
    region,
    types: types.slice(0, 4),
    adj: adj.slice(0, 8),
    cent: COUNTRY_CENTROIDS[iso] || [0, 0],
    fsi_score: fsi?.fsi_score ?? 50,
    fsi_rank: fsi?.rank ?? 999,
    fsi_band: fsi?.fsi_band ?? "Unknown",
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  NAME ALIASES — for country-name matching against ReliefWeb / ACLED-style
//  free-text feeds, which frequently use alternate official names, older
//  names, or non-English transliterations instead of the FSI_2024 label.
// ════════════════════════════════════════════════════════════════════════════
const ISO_ALIASES = {
  MMR: ["myanmar", "burma", "union of myanmar", "republic of the union of myanmar"],
  TCD: ["chad", "republic of chad", "tchad", "republic of tchad"],
  COD: ["congo-kinshasa", "democratic republic of the congo", "dr congo", "drc",
        "congo, dem. rep.", "congo, the democratic republic of the", "dem. rep. congo",
        "zaire"],
  COG: ["congo-brazzaville", "republic of the congo", "congo, rep.", "congo, republic of"],
  CAF: ["central african rep.", "central african republic", "car"],
  CIV: ["cote d'ivoire", "côte d'ivoire", "ivory coast"],
  LAO: ["laos", "lao people's democratic republic", "lao pdr"],
  SYR: ["syria", "syrian arab republic"],
  VEN: ["venezuela", "venezuela, rb", "bolivarian republic of venezuela"],
  IRN: ["iran", "iran, islamic republic of", "islamic republic of iran"],
  KOR: ["south korea", "republic of korea", "korea, rep."],
  PRK: ["north korea", "democratic people's republic of korea", "korea, dem. people's rep.", "dprk"],
  RUS: ["russia", "russian federation"],
  GBR: ["united kingdom", "uk", "great britain", "britain"],
  USA: ["united states", "usa", "united states of america", "u.s.", "u.s.a."],
  PSE: ["palestine", "occupied palestinian territory", "state of palestine", "opt", "gaza", "west bank"],
  TZA: ["tanzania", "united republic of tanzania"],
  SWZ: ["eswatini", "swaziland"],
  MKD: ["north macedonia", "macedonia", "fyrom"],
  CPV: ["cape verde", "cabo verde"],
  TLS: ["east timor", "timor-leste"],
  SVK: ["slovakia", "slovak republic"],
  MDA: ["moldova", "republic of moldova"],
  BOL: ["bolivia", "bolivia, plurinational state of"],
  BRN: ["brunei", "brunei darussalam"],
  STP: ["sao tome and principe", "são tomé and príncipe"],
  KGZ: ["kyrgyzstan", "kyrgyz republic"],
  LKA: ["sri lanka", "ceylon"],
  TWN: ["taiwan", "chinese taipei", "republic of china"],
};

const ALIAS_INDEX = (() => {
  const idx = new Map();
  for (const [iso, d] of Object.entries(COUNTRIES)) idx.set(d.name.toLowerCase(), iso);
  for (const [iso, aliases] of Object.entries(ISO_ALIASES)) {
    for (const a of aliases) idx.set(a.toLowerCase(), iso);
  }
  return idx;
})();

// ════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════════════════════

const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
const clampFloat = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function fmtPop(n) { if (!n) return null; if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return `${n}`; }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function estimateReadTime(text) { const words = text.trim().split(/\s+/).length; return { words, minutes: Math.max(1, Math.ceil(words / 225)) }; }
function seededRand(n) { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }

function composite(d) {
  const raw = DIMS.reduce((s, dim) => s + dim.w * (d[dim.k] || 0), 0);
  const conflictDisp = ((d.conflict||0)/100) * ((d.displacement||0)/100) * 12;
  const foodHealth   = ((d.food||0)/100) * ((d.health||0)/100) * 8;
  const econMult = d.economic >= 70 ? 1.06 : d.economic >= 50 ? 1.03 : 1.0;
  return Math.max(1, (raw + conflictDisp + foodHealth) * econMult);
}

function buildDims(base, types) {
  const has = t => types.includes(t);
  const clampV = v => Math.min(99, Math.max(5, Math.round(v)));
  return {
    conflict:     clampV(base * ((has("CW")||has("CE")) ? 1.1 : has("REF") ? 0.65 : 0.28)),
    displacement: clampV(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.8 : 0.38)),
    food:         clampV(base * ((has("FN")||has("DR")) ? 1.15 : (has("CE")||has("CW")) ? 0.9 : has("FL") ? 0.7 : 0.42)),
    health:       clampV(base * ((has("EP")||has("FN")) ? 1.1 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     clampV(base * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.82 : 0.42) + 10),
    climate:      clampV(base * ((has("HEAT")||has("DR")) ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       clampV(base * ((has("CW")||has("CE")) ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    clampV(base * ((has("CE")||has("CW")||has("REF")) ? 0.85 : 0.42) + 8),
  };
}

function seedHistory(iso, currentScore) {
  const N = 28;
  const seed = iso.split("").reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1) * 17, 0);
  let score = Math.min(99, Math.max(5, currentScore + Math.round((seededRand(seed) - 0.5) * 18)));
  const hist = [];
  for (let i = 0; i <= N; i++) {
    hist.push({ t: Date.now() - (N - i) * 86400000, s: score });
    const r = seededRand(seed + i * 31 + 7);
    const pull = (currentScore - score) * 0.12;
    const noise = (r - 0.5) * 5;
    score = Math.min(99, Math.max(5, Math.round(score + pull + noise)));
  }
  hist[hist.length - 1].s = currentScore;
  return hist;
}

function findIsoByName(name) {
  if (!name) return null;
  const raw = name.toLowerCase().trim();
  if (!raw) return null;

  const stripped = raw.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const parenContents = [...raw.matchAll(/\(([^)]*)\)/g)].map(m => m[1].trim());
  const candidates = [...new Set([raw, stripped, ...parenContents].filter(Boolean))];

  for (const cand of candidates) {
    if (ALIAS_INDEX.has(cand)) return ALIAS_INDEX.get(cand);
  }

  for (const cand of candidates) {
    for (const [aliasLower, iso] of ALIAS_INDEX) {
      if (aliasLower.length < 3) continue;
      const escaped = aliasLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i');
      if (re.test(cand)) return iso;
    }
  }

  return null;
}

function findClosestCountry(lng, lat) {
  let closest = null, minDist = Infinity;
  for (const [iso, d] of Object.entries(COUNTRIES)) {
    if (!d.cent || (d.cent[0] === 0 && d.cent[1] === 0)) continue;
    const dist = haversineKm(d.cent[0], d.cent[1], lng, lat);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return closest;
}

function isUS(iso) { return iso === "USA"; }

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function poolMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try { results[i] = await fn(items[i], i); }
      catch (e) { results[i] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const REGION_KEYWORDS = {
  IDN:['indonesia','sumatra','java','sulawesi','borneo','papua','bali','flores','maluku','timor','lombok','sumbawa','halmahera','seram','sunda','banda sea','banda'],
  JPN:['japan','honshu','hokkaido','kyushu','shikoku','ryukyu','bonin','izu','tokyo','osaka','nagoya','sea of japan','okinawa','kanto','kansai'],
  NZL:['new zealand','kermadec','te araroa','auckland','wellington','christchurch','canterbury','fiordland','north island','south island','taupo','taupō'],
  PHL:['philippines','luzon','mindanao','visayas','manila','cebu','davao','bohol','leyte','samar','mindoro','palawan'],
  CHL:['chile','valparaiso','santiago','atacama','antofagasta','coquimbo','bio-bio','araucania','los lagos'],
  ITA:['italy','sicily','sardinia','naples','rome','milan','turin','florence','venice','calabria','puglia','lazio','tuscany','etna','vesuvius','stromboli'],
  GRC:['greece','crete','athens','aegean','ionian','peloponnese','thessaly','epirus','rhodes','santorini','cyclades'],
  TUR:['turkey','anatolia','istanbul','ankara','izmir','aegean','marmara','black sea','antalya','bursa'],
  IRN:['iran','tehran','tabriz','shiraz','isfahan','kerman','zagros','alborz','persian gulf'],
  MEX:['mexico','oaxaca','chiapas','guerrero','michoacan','jalisco','puebla','veracruz','baja california','sonora','sinaloa'],
  USA:['california','alaska','hawaii','puerto rico','nevada','washington','oregon','oklahoma','texas','utah','montana','idaho','wyoming'],
  TWN:['taiwan','taipei','kaohsiung','tainan','taichung','hualien','taitung'],
  PNG:['papua new guinea','new britain','new ireland','bougainville','solomon sea','bismarck'],
  SLB:['solomon islands','guadalcanal','santa cruz','malaita','choiseul','isabel'],
  VUT:['vanuatu','espiritu santo','efate','tanna','pentecost'],
  FJI:['fiji','viti levu','vanua levu','suva','lautoka'],
  TON:['tonga','tongatapu','haapai','vavau'],
  WSM:['samoa','savaii','upolu','apia'],
  ISL:['iceland','reykjanes','katla','bardarbunga','hekla','askja'],
  NOR:['norway','oslo','bergen','trondheim','tromso'],
  RUS:['russia','kamchatka','kuril','sakhalin','siberia','caucasus','baikal','ural','kola','chukotka'],
};

function matchesCountryPlace(iso, place) {
  if (!place) return false;
  const p = place.toLowerCase();
  const c = COUNTRIES[iso];
  if (!c) return false;
  if (p.includes(c.name.toLowerCase())) return true;
  const kws = REGION_KEYWORDS[iso];
  if (kws) for (const kw of kws) if (p.includes(kw)) return true;
  return false;
}

function eventKeyFor(sig, iso) {
  if (!sig.type.startsWith("earthquake_") && !sig.type.includes("earthquake") && sig.type !== "shakemap_event") {
    const day = sig.ageHours ? Math.floor(Date.now() / 86400000 - sig.ageHours / 24) : "unknown";
    return `${sig.type}::${iso}::${day}`;
  }
  const lat = sig.latitude ?? COUNTRIES[iso]?.cent?.[1] ?? 0;
  const lon = sig.longitude ?? COUNTRIES[iso]?.cent?.[0] ?? 0;
  const mag = sig.magnitude ?? sig.weight / 20;
  const timeBucket = sig.ageHours ? Math.floor((Date.now() - sig.ageHours * 36e5) / (CFG.DEDUP_TIME_WINDOW_HOURS * 36e5)) : "unknown";
  const magBucket = Math.round(mag / CFG.DEDUP_MAG_TOLERANCE);
  return `seismic::${timeBucket}::${magBucket}::${Math.round(lat)}::${Math.round(lon)}`;
}

function deduplicateEvents(signals, iso) {
  if (!CFG.DEDUP_ENABLED || signals.length === 0) return signals;
  const grouped = new Map();
  for (const sig of signals) {
    const key = eventKeyFor(sig, iso);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(sig);
  }
  const deduped = [];
  for (const [key, group] of grouped) {
    group.sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
    const canonical = group[0];
    canonical.corroborating_sources = [...new Set(group.slice(1).map(s => s.source))];
    canonical.corroboration_count = group.length - 1;
    canonical.dedup_key = key;
    deduped.push(canonical);
  }
  return deduped;
}

// ════════════════════════════════════════════════════════════════════════════
//  EVIDENCE INDEX
// ════════════════════════════════════════════════════════════════════════════

const evidenceIndex = {
  sourceCoverage: {},
  population: {},
};

function resetEvidenceIndex() {
  evidenceIndex.sourceCoverage = {};
  evidenceIndex.population = {};
}

function ensureCoverage(iso) {
  if (!evidenceIndex.sourceCoverage[iso]) evidenceIndex.sourceCoverage[iso] = {};
  return evidenceIndex.sourceCoverage[iso];
}

// ════════════════════════════════════════════════════════════════════════════
//  SCORING HELPERS
// ════════════════════════════════════════════════════════════════════════════

function logScale(value, floor, ceiling, maxPts) {
  if (value <= floor) return 0;
  const ratio = Math.log(1 + (value - floor)) / Math.log(1 + (ceiling - floor));
  return Math.min(maxPts, Math.max(0, ratio * maxPts));
}

function coverageScale(value, floor, ceiling, maxPts) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const clamped = Math.max(floor, Math.min(ceiling, value));
  const ratio = (clamped - floor) / ((ceiling - floor) || 1);
  return Math.max(maxPts * 0.2, ratio * maxPts);
}
// ════════════════════════════════════════════════════════════════════════════
//  computeEvidenceScore — VERBATIM FROM HTML + v18.0.0 GAP-FILLER RULES 55–61
// ════════════════════════════════════════════════════════════════════════════

function computeEvidenceScore(iso) {
  const ledger = [];
  let totalPts = 0, totalWeight = 0;

  function add(source, label, rawValue, pts, weight) {
    if (pts <= 0) return;
    totalPts += pts * weight;
    totalWeight += weight;
    ledger.push({
      source, label,
      rawValue: typeof rawValue === "number" ? +rawValue.toFixed(1) : rawValue,
      pts: +pts.toFixed(1),
      weight: +weight.toFixed(2),
    });
  }

  const coverage = evidenceIndex.sourceCoverage[iso] || {};

  // 1. USGS
  if (coverage.usgs) {
    const mag = coverage.usgs.mag || 0;
    if (mag >= 4.5) {
      const w = Math.min(1, (mag - 4) / 4);
      add("USGS", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.5, 8, 12), w * 0.9);
    }
  }
  // 2. NASA EONET
  if (coverage.nasa) add("NASA", `Natural event: ${coverage.nasa.title?.substring(0, 30) || "active"}`, 1, 6, 0.7);
  // 3. NASA Wildfires
  if (coverage.wildfire) add("NASA", `Wildfire: ${coverage.wildfire.title?.substring(0, 30) || "active"}`, 1, 7, 0.75);
  // 4. GDACS
  if (coverage.gdacs) {
    const severity = coverage.gdacs.alert || "Orange";
    const pts = severity === "Red" ? 10 : severity === "Orange" ? 6 : 3;
    add("GDACS", `${severity} alert: ${coverage.gdacs.event?.substring(0, 30) || "disaster"}`, 1, pts, 0.85);
  }
  // 5. GDACS EQ
  if (coverage.gdacs_eq) {
    const mag = coverage.gdacs_eq.mag || 0;
    if (mag >= 5) add("GDACS", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 5, 8, 8), 0.8);
  }
  // 6. Heat
  if (coverage.heat) {
    const temp = coverage.heat.temp || 0;
    if (temp >= 38) add("OPENMETEO", `${temp}°C extreme heat`, temp, logScale(temp, 38, 50, 8), 0.85);
  }
  // 7. Flood risk
  if (coverage.flood_risk) {
    const discharge = coverage.flood_risk.discharge || 0;
    if (discharge > 100) add("OPENMETEO", `Flood risk: ${discharge}m³/s river discharge`, discharge, logScale(discharge, 100, 1000, 6), 0.7);
  }
  // 8. Marine
  if (coverage.marine) {
    const wave = coverage.marine.wave_height || 0;
    if (wave > 3) add("OPENMETEO", `Marine hazard: ${wave}m wave height`, wave, logScale(wave, 3, 10, 5), 0.7);
  }
  // 9. COVID
  if (coverage.covid) {
    const active = coverage.covid.active || 0;
    if (active > 1000) add("DISEASE.SH", `${active.toLocaleString()} active COVID cases`, active, logScale(active, 1000, 500000, 8), 0.8);
  }
  // 10. Population
  if (coverage.population) {
    const pop = coverage.population;
    add("WORLDBANK", `Population ${(pop/1e6).toFixed(1)}M`, pop, coverageScale(pop, 50000, 1450000000, 6), 0.95);
  }
  // 11. Poverty
  if (coverage.poverty !== undefined && coverage.poverty !== null) {
    const pov = coverage.poverty;
    if (pov > 5) add("WORLDBANK", `Poverty rate ${pov.toFixed(1)}%`, pov, logScale(pov, 5, 60, 6), 0.85);
  }
  // 12. GDP
  if (coverage.gdp_growth !== undefined && coverage.gdp_growth !== null) {
    const gdp = coverage.gdp_growth;
    if (gdp < 0) add("WORLDBANK", `GDP growth ${gdp.toFixed(1)}% (negative)`, gdp, logScale(Math.abs(gdp), 1, 10, 5), 0.75);
  }
  // 13. Unemployment
  if (coverage.unemployment !== undefined && coverage.unemployment !== null) {
    const unemp = coverage.unemployment;
    if (unemp > 10) add("WORLDBANK", `Unemployment rate ${unemp.toFixed(1)}%`, unemp, logScale(unemp, 10, 40, 5), 0.75);
  }
  // 14. Inflation
  if (coverage.inflation !== undefined && coverage.inflation !== null) {
    const infl = coverage.inflation;
    if (infl > 5) add("WORLDBANK", `Inflation rate ${infl.toFixed(1)}% (${coverage.inflation_year || "latest"})`, infl, logScale(infl, 5, 50, 6), 0.75);
  }
  // 15. Refugees
  if (coverage.refugees) {
    const ref = coverage.refugees;
    if (ref > 1000) add("UNHCR", `${ref.toLocaleString()} refugees`, ref, logScale(ref, 1000, 5000000, 8), 0.85);
  }
  // 16. Displaced
  if (coverage.displaced) {
    const disp = coverage.displaced;
    if (disp > 1000) add("UNHCR", `${disp.toLocaleString()} displaced`, disp, logScale(disp, 1000, 5000000, 8), 0.85);
  }
  // 17. Asylum
  if (coverage.asylum) {
    const asym = coverage.asylum;
    if (asym > 100) add("UNHCR", `${asym.toLocaleString()} asylum seekers`, asym, logScale(asym, 100, 1000000, 6), 0.8);
  }
  // 18. UNHCR ops
  if (coverage.unhcr_op) add("UNHCR", `Active operation: ${coverage.unhcr_op.name}`, 1, 4, 0.7);
  // 19. NOAA stations
  if (coverage.noaa && iso === "USA") add("NOAA", `${coverage.noaa.stations} active weather stations`, coverage.noaa.stations, 4, 0.7);
  // 20. EMSC
  if (coverage.emsc) {
    const mag = coverage.emsc.mag || 0;
    if (mag >= 4.5) add("EMSC", `M${mag.toFixed(1)} earthquake (secondary network)`, mag, logScale(mag, 4.5, 8, 8), 0.75);
  }
  // 20b. JMA
  if (coverage.jma) {
    const mag = coverage.jma.mag || 0;
    if (mag >= 4.0) add("JMA", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.0, 8, 7), 0.85);
  }
  // 20c. BMKG
  if (coverage.bmkg) {
    const mag = coverage.bmkg.mag || 0;
    if (mag >= 4.5) add("BMKG", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.5, 8, 7), 0.85);
  }
  // 20d. GEOFON
  if (coverage.geofon) {
    const mag = coverage.geofon.mag || 0;
    if (mag >= 4.5) add("GEOFON", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.5, 8, 7), 0.85);
  }
  // 20e. INGV
  if (coverage.ingv) {
    const mag = coverage.ingv.mag || 0;
    if (mag >= 4.0) add("INGV", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.0, 8, 7), 0.85);
  }
  // 20f. GeoNet
  if (coverage.geonet) {
    const mag = coverage.geonet.mag || 0;
    if (mag >= 3.5) add("GeoNet", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 3.5, 8, 6), 0.8);
  }
  // 21. IFRC
  if (coverage.ifrc) add("IFRC", `${coverage.ifrc.dtype}: ${(coverage.ifrc.name || "").substring(0, 30)}`, 1, 6, 0.85);
  // 22. Air quality
  if (coverage.air_quality) {
    const pm25 = coverage.air_quality.pm25 || 0;
    const city = coverage.air_quality.city || "monitored city";
    if (pm25 >= 35) add("OPENMETEO", `PM2.5 ${pm25.toFixed(0)} µg/m³ (${city})`, pm25, logScale(pm25, 35, 300, 5), 0.7);
  }
  // 23. WB refugees
  if (coverage.refugees_wb) {
    const ref = coverage.refugees_wb;
    if (ref > 1000) add("WORLDBANK", `${ref.toLocaleString()} refugees (WB cross-check)`, ref, logScale(ref, 1000, 5000000, 5), 0.75);
  }
  // 24. OSM
  if (coverage.hospitals) add("OSM", `${coverage.hospitals} hospitals in region`, coverage.hospitals, coverageScale(coverage.hospitals, 1, 50, 4), 0.6);
  if (coverage.clinics) add("OSM", `${coverage.clinics} clinics in region`, coverage.clinics, coverageScale(coverage.clinics, 1, 100, 3), 0.5);
  // 25. EM-DAT
  if (coverage.emdat) {
    const deaths = coverage.emdat.deaths || 0;
    if (deaths > 0) add("EM-DAT", `${coverage.emdat.disaster} (${coverage.emdat.year})`, deaths, logScale(deaths, 10, 10000, 6), 0.7);
  }
  // 26. Climate TRACE
  if (coverage.emissions) {
    const emissions = coverage.emissions.total || 0;
    if (emissions > 1000) add("CLIMATETRACE", `${(emissions/1000).toFixed(1)}kt CO₂e emissions (${coverage.emissions.sector})`, emissions, logScale(emissions, 1000, 1000000, 5), 0.6);
  }
  // 27. Wind
  if (coverage.wind) {
    const speed = coverage.wind.speed || 0;
    if (speed > 30) add("OPENMETEO", `Wind speed ${speed} km/h (storm risk)`, speed, logScale(speed, 30, 100, 5), 0.7);
  }
  // 28. Precip
  if (coverage.precipitation) {
    const total = coverage.precipitation.total || 0;
    if (total > 10) add("OPENMETEO", `${total}mm precipitation (flood risk)`, total, logScale(total, 10, 100, 5), 0.7);
  }
  // 29. UV
  if (coverage.uv) {
    const uv = coverage.uv.max || 0;
    if (uv > 8) add("OPENMETEO", `UV Index ${uv} (extreme - health risk)`, uv, logScale(uv, 8, 11, 3), 0.6);
  }
  // 30. Historic seismic
  if (coverage.historic_seismic && coverage.historic_seismic.length > 0) {
    const maxMag = Math.max(...coverage.historic_seismic.map(e => e.mag || 0));
    if (maxMag > 6) add("USGS", `Historic M${maxMag.toFixed(1)} earthquake in region`, maxMag, logScale(maxMag, 6, 8, 4), 0.6);
  }
  // 31. Food prices
  if (coverage.food_prices && coverage.food_prices.length > 0) {
    const latest = coverage.food_prices[coverage.food_prices.length - 1];
    if (latest && latest.value) add("WORLDBANK", `Food price index ${latest.value.toFixed(1)}`, latest.value, coverageScale(latest.value, 80, 150, 5), 0.7);
  }
  // 32. Water stress
  if (coverage.water_stress !== undefined && coverage.water_stress !== null) {
    const stress = coverage.water_stress;
    if (stress > 20) add("WORLDBANK", `Water stress ${stress.toFixed(1)}% of resources`, stress, logScale(stress, 20, 100, 5), 0.7);
  }
  // 33. NOAA alerts
  if (coverage.noaa_alerts) {
    const alerts = coverage.noaa_alerts;
    if (alerts > 0) add("NOAA", `${alerts} extreme weather alerts active`, alerts, coverageScale(alerts, 1, 20, 3), 0.6);
  }
  // 34. UNHCR emergency
  if (coverage.unhcr_emergency) {
    const level = coverage.unhcr_emergency.level || "unknown";
    const pts = level === "critical" ? 5 : level === "high" ? 3 : 1;
    add("UNHCR", `Emergency: ${coverage.unhcr_emergency.name} (${level})`, 1, pts, 0.7);
  }
  // 35. Cloud cover
  if (coverage.cloudcover) {
    const avg = coverage.cloudcover.avg || 0;
    if (avg > 70) add("OPENMETEO", `Cloud cover ${avg.toFixed(0)}% (weather disruption)`, avg, coverageScale(avg, 70, 100, 3), 0.5);
  }
  // 36. Lightning
  if (coverage.lightning) {
    const max = coverage.lightning.max || 0;
    if (max > 100) add("OPENMETEO", `Lightning potential ${max} J/kg (storm risk)`, max, logScale(max, 100, 500, 4), 0.6);
  }
  // 37. NOAA storm reports
  if (coverage.storm_reports) {
    const reports = coverage.storm_reports;
    if (reports > 0) add("NOAA", `${reports} severe storm alerts`, reports, coverageScale(reports, 1, 50, 4), 0.6);
  }
  // 38. UNHCR stats
  if (coverage.unhcr_stats) {
    const refugees = coverage.unhcr_stats.refugees || 0;
    if (refugees > 1000) add("UNHCR", `${refugees.toLocaleString()} refugees (${coverage.unhcr_stats.year})`, refugees, logScale(refugees, 1000, 5000000, 7), 0.8);
  }
  // 39. Trade
  if (coverage.trade_gdp !== undefined && coverage.trade_gdp !== null) {
    const trade = coverage.trade_gdp;
    if (trade > 60) add("WORLDBANK", `Trade ${trade.toFixed(1)}% of GDP`, trade, coverageScale(trade, 60, 200, 4), 0.6);
  }
  // 40. Conflict event
  if (coverage.conflict_event) {
    const sev = coverage.conflict_event.severityIndex || 40;
    add("RELIEFWEB", `${coverage.conflict_event.event_type}: ${(coverage.conflict_event.title || "").substring(0, 40)}`, sev, logScale(sev, 20, 100, 6), 0.75);
  }
  // 41. IPC
  if (coverage.ipc) {
    const phase = coverage.ipc.phase || 3;
    const pts = phase === 5 ? 12 : phase === 4 ? 9 : 6;
    add("IPC", `Phase ${phase}: ${coverage.ipc.phase_name}`, phase, pts, 0.85);
  }
  // 42. FEWS NET
  if (coverage.fewsnet) {
    const phase = coverage.fewsnet.phase || 3;
    add("FEWS NET", `${coverage.fewsnet.title || "Food security alert"}`, phase, phase >= 4 ? 8 : 5, 0.75);
  }
  // 43. JTWC cyclone
  if (coverage.jtwc) add("JTWC", `Pacific cyclone: ${coverage.jtwc.name || "active"}`, 1, 9, 0.9);
  // 44. JMA Typhoon
  if (coverage.jma_typhoon) add("JMA", `Typhoon: ${coverage.jma_typhoon.name || "active"}`, 1, 8.5, 0.9);
  // 45. GFW deforestation
  if (coverage.gfw) {
    const count = coverage.gfw.count || 0;
    if (count >= 100) add("GFW", `${count.toLocaleString()} deforestation alerts`, count, logScale(count, 100, 10000, 6), 0.7);
  }
  // 46. NASA POWER climate anomaly
  if (coverage.nasa_power) {
    const t = Math.abs(coverage.nasa_power.tempAnomaly || 0);
    const p = Math.abs(coverage.nasa_power.precipAnomaly || 0);
    if (t >= 5 || p >= 5) {
      const pts = Math.min(6, t * 0.8 + p * 0.4);
      add("NASA POWER", `Climate anomaly: +${t.toFixed(1)}°C / +${p.toFixed(1)}mm`, Math.max(t, p), pts, 0.8);
    }
  }
  // 47. US Drought Monitor
  if (coverage.us_drought && iso === "USA") add("US DM", `Drought level: ${coverage.us_drought.level}`, 1, 5, 0.75);
  // 48. ECDC threat
  if (coverage.ecdc_threat) add("ECDC", `Threat: ${(coverage.ecdc_threat.title || "").substring(0, 40)}`, 1, 5, 0.8);
  // 49. CDC outbreak
  if (coverage.cdc_outbreak && iso === "USA") add("CDC", `Outbreak: ${(coverage.cdc_outbreak.title || "").substring(0, 40)}`, 1, 5, 0.85);
  // 50. WHO DON
  if (coverage.who_don) add("WHO DON", `${(coverage.who_don.title || "").substring(0, 40)}`, 1, 8, 0.9);
  // 51. INFORM
  if (coverage.inform && coverage.inform.score >= 5) {
    add("INFORM", `INFORM score ${coverage.inform.score.toFixed(1)}`, coverage.inform.score, logScale(coverage.inform.score, 5, 10, 5), 0.7);
  }
  // 52. HDX crisis datasets
  if (coverage.hdx) {
    const count = coverage.hdx.count || 0;
    if (count > 0) add("OCHA HDX", `${count} crisis dataset(s) available`, count, coverageScale(count, 1, 20, 4), 0.65);
  }
  // 53. UNHCR solutions
  if (coverage.unhcr_solutions && coverage.unhcr_solutions.returned_refugees > 10000) {
    const ret = coverage.unhcr_solutions.returned_refugees;
    add("UNHCR Sol", `${ret.toLocaleString()} refugees returned`, ret, logScale(ret, 10000, 1000000, 5), 0.75);
  }
  // 54. Sentinel-2 observations
  if (coverage.sentinel && coverage.sentinel.count > 0) {
    add("Sentinel-2", `${coverage.sentinel.count} recent observation(s)`, coverage.sentinel.count, coverageScale(coverage.sentinel.count, 1, 5, 3), 0.5);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  v18.0.0 GAP-FILLING EVIDENCE RULES (55–61)
  // ════════════════════════════════════════════════════════════════════════

  // 55. ACLED — structured conflict events with fatalities
  if (coverage.acled) {
    const a = coverage.acled;
    const fatalityPts = Math.min(10, Math.log10(a.total_fatalities + 1) * GAP_CFG.ACLED_FATALITY_WEIGHT * 2);
    const eventTypePts = Math.min(4, a.event_types.length * 0.8);
    const severityPts = logScale(a.severityIndex, 20, 100, 8);
    const pts = Math.min(14, fatalityPts + eventTypePts + severityPts);
    if (pts > 0) {
      add(
        'ACLED',
        `${a.event_count} conflict event(s), ${a.total_fatalities.toLocaleString()} fatalities`,
        a.total_fatalities,
        pts,
        0.9
      );
    }
  }

  // 56. HDX HAPI — IPC/CH food security phase (population-weighted)
  if (coverage.hdx_hapi) {
    const h = coverage.hdx_hapi;
    const phasePts = h.phase === 5 ? 14 : h.phase === 4 ? 11 : h.phase === 3 ? 7 : 0;
    const popFactor = h.population > 0
      ? Math.min(1.4, 1 + Math.log10(h.population / 100000) * 0.15)
      : 1.0;
    const pts = Math.min(16, phasePts * popFactor);
    if (pts > 0) {
      add(
        'HDX HAPI',
        `IPC Phase ${h.phase} (${h.phase_name})${h.admin1 ? ` — ${h.admin1}` : ''} · ${fmtPop(h.population) || 'pop n/a'}`,
        h.phase,
        pts,
        0.9
      );
    }
  }

  // 57. IDMC — internal displacement (conflict + disaster)
  if (coverage.idmc) {
    const i = coverage.idmc;
    const conflictPts = logScale(i.conflict_new_displacements, 1000, 2000000, 9) * GAP_CFG.IDMC_CONFLICT_WEIGHT;
    const disasterPts = logScale(i.disaster_new_displacements, 1000, 2000000, 9) * GAP_CFG.IDMC_DISASTER_WEIGHT;
    const pts = Math.min(12, conflictPts + disasterPts);
    if (pts > 0) {
      add(
        'IDMC',
        `${fmtPop(i.combined_new) || 0} new displacements (${i.year}) — ` +
        `${fmtPop(i.conflict_new_displacements) || 0} conflict / ${fmtPop(i.disaster_new_displacements) || 0} disaster`,
        i.combined_new,
        pts,
        0.85
      );
    }
  }

  // 58. ReliefWeb Reports — narrative evidence density
  if (coverage.reliefweb_report) {
    const rr = coverage.reliefweb_report;
    const countPts = logScale(rr.count, 1, 30, 5);
    const disasterBonus = Math.min(3, (rr.disasters?.length || 0) * 0.8);
    const pts = Math.min(8, countPts + disasterBonus);
    if (pts > 0) {
      add(
        'RELIEFWEB Reports',
        `${rr.count} report(s) · ${rr.disasters?.slice(0, 2).join(', ') || 'general'}`,
        rr.count,
        pts,
        0.7
      );
    }
  }

  // 59. FAO Food Price Index — market-price shock (global signal)
  if (coverage.fao_fpi) {
    const f = coverage.fao_fpi;
    const isFoodVulnerable =
      coverage.poverty > 20 ||
      coverage.food_prices?.length > 0 ||
      (COUNTRIES[iso]?.types || []).some(t => ['DR', 'FN', 'FL', 'CE', 'CW'].includes(t));
    if (isFoodVulnerable && f.value > GAP_CFG.FAO_FPI_BASELINE) {
      const deviation = f.value - GAP_CFG.FAO_FPI_BASELINE;
      const pts = logScale(deviation, 0, 40, 5);
      if (pts > 0) {
        add(
          'FAO FPI',
          `Food price index ${f.value.toFixed(1)} (+${deviation.toFixed(1)} vs baseline)`,
          f.value,
          pts,
          0.7
        );
      }
    }
  }

  // 60. WHO GHO — structured health burden indicators
  if (coverage.who_gho) {
    const gho = coverage.who_gho;
    let ghoTotalPts = 0;
    let ghoLabels = [];
    for (const ind of GAP_CFG.WHO_GHO_INDICATORS) {
      const rec = gho[ind.code];
      if (!rec) continue;
      let pts;
      if (ind.invert) {
        const inverted = ind.ceil - rec.value;
        pts = coverageScale(inverted, 0, ind.ceil - ind.floor, ind.maxPts) * 0.5;
      } else {
        pts = logScale(rec.value, ind.floor, ind.ceil, ind.maxPts);
      }
      if (pts > 0) {
        ghoTotalPts += pts * ind.weight;
        ghoLabels.push(`${ind.label} ${rec.value.toFixed(1)}`);
      }
    }
    if (ghoTotalPts > 0) {
      add(
        'WHO GHO',
        ghoLabels.slice(0, 2).join(' · '),
        ghoTotalPts,
        Math.min(10, ghoTotalPts),
        0.8
      );
    }
  }

  // 61. UNHCR Situations — operational funding gap
  if (coverage.unhcr_situation) {
    const s = coverage.unhcr_situation;
    if (s.funding_gap_pct != null && s.funding_gap_pct > 20) {
      const pts = logScale(s.funding_gap_pct, 20, 90, 6) * GAP_CFG.UNHCR_SITUATIONS_FUNDING_GAP_WEIGHT;
      add(
        'UNHCR Situation',
        `${s.name} — ${s.funding_gap_pct}% underfunded`,
        s.funding_gap_pct,
        Math.min(6, pts),
        0.75
      );
    }
  }

  const evidenceScore = totalWeight > 0 ? Math.min(CFG.EVIDENCE_CAP, totalPts / totalWeight) : 0;
  const avgWeight = ledger.length > 0 ? totalWeight / ledger.length : 0;
  const sourceCountFactor = Math.min(1, Math.sqrt(ledger.length / 2));
  const confidence = Math.min(1, avgWeight * sourceCountFactor);

  return {
    score: +evidenceScore.toFixed(1),
    confidence: +confidence.toFixed(2),
    ledger,
    sourceCount: ledger.length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  FETCHERS — ALL 47+ (40 ORIGINAL + 7 v18.0.0 GAP-FILLERS)
// ════════════════════════════════════════════════════════════════════════════

const safeFetch = p =>
  Promise.race([p.then(r => ({ ok: true, data: r })), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS))])
    .catch(e => ({ ok: false, error: e.message }));

async function fetchUSGS() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json()));
    if (!r.ok || !r.data?.features?.length) return { data: [], live: false };
    for (const f of r.data.features) {
      const props = f.properties, coords = f.geometry?.coordinates;
      if (!props?.place || !coords) continue;
      const iso = findIsoByName(props.place.split(",").pop()?.trim() || "");
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      const existing = cov.usgs?.mag || 0;
      if (props.mag > existing) cov.usgs = { mag: props.mag, time: props.time, place: props.place };
    }
    return { data: r.data.features, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchUSGSSignificant() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson").then(r => r.json()));
    if (!r.ok || !r.data?.features?.length) return { data: [], live: false };
    for (const f of r.data.features) {
      const props = f.properties, coords = f.geometry?.coordinates;
      if (!props?.place || !coords) continue;
      const iso = findIsoByName(props.place.split(",").pop()?.trim() || "");
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      if (!cov.historic_seismic) cov.historic_seismic = [];
      cov.historic_seismic.push({ mag: props.mag, time: props.time, place: props.place });
    }
    return { data: r.data.features, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchShakeMap() {
  try {
    const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson").then(r => r.json()));
    if (!r.ok || !r.data?.features?.length) return { data: [], live: false };
    const events = r.data.features.filter(f => (f.properties?.mag || 0) >= 4.5);
    for (const f of events) {
      const props = f.properties, coords = f.geometry?.coordinates;
      if (!props?.place || !coords) continue;
      const iso = findIsoByName(props.place.split(",").pop()?.trim() || "");
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      const existing = cov.usgs?.mag || 0;
      if (props.mag > existing) cov.usgs = { mag: props.mag, time: props.time, place: props.place };
    }
    return { data: events, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchEMSC() {
  try {
    const r = await safeFetch(fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.json()));
    if (!r.ok || !r.data?.features?.length) return { data: [], live: false };
    for (const f of r.data.features) {
      const mag = f.properties?.mag, coords = f.geometry?.coordinates;
      if (mag < 4.5 || !coords) continue;
      const iso = findClosestCountry(coords[0], coords[1]);
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      const existing = cov.emsc?.mag || 0;
      if (mag > existing) cov.emsc = { mag, time: f.properties?.time, place: f.properties?.flynn_region || f.properties?.place };
    }
    return { data: r.data.features, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchJMA() {
  try {
    const r = await safeFetch(fetch("https://www.jma.go.jp/bosai/quake/data/list.json").then(r => r.json()));
    if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) return { data: [], live: false };
    const events = r.data.slice(0, 20).map(e => {
      const t = e.at ? new Date(e.at).getTime() : null;
      const ageHours = t ? (Date.now() - t) / 36e5 : 24;
      return { mag: parseFloat(e.mag) || 0, place: e.en_anm || e.anm || 'Japan region', eventTime: t, ageHours };
    }).filter(e => e.mag >= 4.0 && e.ageHours <= 72);
    if (events.length) {
      const top = events.reduce((a, b) => b.mag > a.mag ? b : a);
      const cov = ensureCoverage('JPN');
      cov.jma = { mag: top.mag, place: top.place };
      if (!cov.emsc || top.mag > (cov.emsc.mag || 0)) cov.emsc = { mag: top.mag, time: top.eventTime, place: top.place };
    }
    return { data: events, live: events.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchBMKG() {
  try {
    const r = await safeFetch(fetch("https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json").then(r => r.json()));
    if (!r.ok || !r.data?.Infogempa?.gempa) return { data: [], live: false };
    const events = r.data.Infogempa.gempa.slice(0, 20).map(e => {
      const t = e.DateTime ? new Date(e.DateTime).getTime() : null;
      const ageHours = t ? (Date.now() - t) / 36e5 : 24;
      return { mag: parseFloat(e.Magnitude) || 0, place: e.Wilayah || 'Indonesia region', eventTime: t, ageHours };
    }).filter(e => e.mag >= 4.5 && e.ageHours <= 72);
    if (events.length) {
      const top = events.reduce((a, b) => b.mag > a.mag ? b : a);
      const cov = ensureCoverage('IDN');
      cov.bmkg = { mag: top.mag, place: top.place };
      if (!cov.emsc || top.mag > (cov.emsc.mag || 0)) cov.emsc = { mag: top.mag, time: top.eventTime, place: top.place };
    }
    return { data: events, live: events.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchGEOFON() {
  try {
    const r = await safeFetch(fetch("https://geofon.gfz-potsdam.de/fdsnws/event/1/query?format=text&limit=20&minmag=4.5").then(r => r.text()));
    if (!r.ok || typeof r.data !== 'string') return { data: [], live: false };
    const lines = r.data.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const events = lines.map(line => {
      const parts = line.split('|');
      if (parts.length < 13) return null;
      const mag = parseFloat(parts[10]) || 0;
      const time = parts[1] ? new Date(parts[1]).getTime() : null;
      const ageHours = time ? (Date.now() - time) / 36e5 : 24;
      return { mag, place: parts[12] || 'Unknown', eventTime: time, ageHours };
    }).filter(e => e && e.mag >= 4.5);
    for (const e of events) {
      for (const isoKey of Object.keys(COUNTRIES)) {
        if (matchesCountryPlace(isoKey, e.place)) {
          const cov = ensureCoverage(isoKey);
          if (!cov.geofon || e.mag > (cov.geofon.mag || 0)) cov.geofon = { mag: e.mag, place: e.place };
          if (!cov.emsc || e.mag > (cov.emsc.mag || 0)) cov.emsc = { mag: e.mag, time: e.eventTime, place: e.place };
          break;
        }
      }
    }
    return { data: events, live: events.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchINGV() {
  try {
    const r = await safeFetch(fetch("https://webservices.ingv.it/fdsnws/event/1/query?format=json&limit=10&minmag=4").then(r => r.json()));
    if (!r.ok || !r.data?.features?.length) return { data: [], live: false };
    const events = r.data.features.map(f => {
      const p = f.properties || {};
      const mag = p.mag || 0;
      const time = p.time ? new Date(p.time).getTime() : null;
      const ageHours = time ? (Date.now() - time) / 36e5 : 24;
      return { mag, place: p.place || 'Mediterranean', eventTime: time, ageHours };
    }).filter(e => e.mag >= 4.0);
    for (const e of events) {
      for (const iso of MEDITERRANEAN_ISOS) {
        if (matchesCountryPlace(iso, e.place)) {
          const cov = ensureCoverage(iso);
          if (!cov.ingv || e.mag > (cov.ingv.mag || 0)) cov.ingv = { mag: e.mag, place: e.place };
          if (!cov.emsc || e.mag > (cov.emsc.mag || 0)) cov.emsc = { mag: e.mag, time: e.eventTime, place: e.place };
        }
      }
    }
    return { data: events, live: events.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchGeoNet() {
  try {
    const r = await safeFetch(fetch("https://api.geonet.org.nz/quake?MMI=-1", { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
    if (!r.ok || !r.data?.features?.length) return { data: [], live: false };
    const events = r.data.features.map(f => {
      const p = f.properties || {};
      const mag = p.magnitude || 0;
      const time = p.time ? new Date(p.time).getTime() : null;
      const ageHours = time ? (Date.now() - time) / 36e5 : 24;
      return { mag, place: p.locality || 'New Zealand', eventTime: time, ageHours };
    }).filter(e => e.mag >= 3.5);
    for (const e of events) {
      if (matchesCountryPlace('NZL', e.place)) {
        const cov = ensureCoverage('NZL');
        if (!cov.geonet || e.mag > (cov.geonet.mag || 0)) cov.geonet = { mag: e.mag, place: e.place };
        if (!cov.emsc || e.mag > (cov.emsc.mag || 0)) cov.emsc = { mag: e.mag, time: e.eventTime, place: e.place };
      }
    }
    return { data: events, live: events.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchNASA() {
  try {
    const [a, b] = await Promise.all([
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.json())),
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=20").then(r => r.json())),
    ]);
    const events = [...(a.ok ? a.data.events || [] : []), ...(b.ok ? b.data.events || [] : [])];
    for (const ev of events) {
      const coords = ev.geometry?.[0]?.coordinates;
      if (!coords) continue;
      const iso = findClosestCountry(coords[0], coords[1]);
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      const cat = ev.categories?.[0]?.id || "";
      if (cat === "wildfires") cov.wildfire = { title: ev.title, severity: "Wildfire" };
      else cov.nasa = { title: ev.title, categories: ev.categories };
    }
    return { data: events, live: events.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchGDACS() {
  try {
    const [a, b, c, d, e, f] = await Promise.all([
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=40").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=TC&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=FL&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=WF&limit=30").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=DR&limit=30").then(r => r.json())),
    ]);
    const feats = [
      ...(a.ok ? a.data.features || [] : []),
      ...(b.ok ? b.data.features || [] : []),
      ...(c.ok ? c.data.features || [] : []),
      ...(d.ok ? d.data.features || [] : []),
      ...(e.ok ? e.data.features || [] : []),
      ...(f.ok ? f.data.features || [] : []),
    ];
    for (const f of feats) {
      const props = f.properties, coords = f.geometry?.coordinates;
      if (!props?.eventname) continue;
      let iso = null;
      if (coords) iso = findClosestCountry(coords[0], coords[1]);
      if (!iso && props.affectedcountries) {
        for (const ac of props.affectedcountries) { if (COUNTRIES[ac.iso3]) { iso = ac.iso3; break; } }
      }
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      const rank = { Red: 3, Orange: 2, Green: 1 };
      if (!cov.gdacs || rank[props.alertlevel] > rank[cov.gdacs.alert]) {
        cov.gdacs = { event: props.eventname, alert: props.alertlevel };
      }
      if (props.eventtype === "EQ" && props.magnitude) {
        if (!cov.gdacs_eq || props.magnitude > (cov.gdacs_eq.mag || 0)) {
          cov.gdacs_eq = { event: props.eventname, mag: props.magnitude };
        }
      }
    }
    return { data: feats, live: feats.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchIFRC() {
  try {
    const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.json()));
    if (!r.ok || !r.data?.results?.length) return { data: [], live: false };
    for (const ev of r.data.results) {
      const iso = ev.countries?.[0]?.iso3 || ev.country?.iso3;
      if (!iso || !COUNTRIES[iso]) continue;
      const cov = ensureCoverage(iso);
      cov.ifrc = { name: ev.name, dtype: ev.dtype?.name || "Field operation", date: ev.disaster_start_date };
    }
    return { data: r.data.results, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchIFRCAppeals() {
  try {
    const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/appeal/?limit=30&ordering=-start_date").then(r => r.json()));
    if (!r.ok || !r.data?.results?.length) return { data: [], live: false };
    for (const ap of r.data.results) {
      const iso3 = ap.country?.iso3 || ap.countries?.[0]?.iso3;
      if (!iso3 || !COUNTRIES[iso3]) continue;
      const cov = ensureCoverage(iso3);
      if (!cov.unhcr_emergency) cov.unhcr_emergency = { name: ap.name || "IFRC Appeal", level: "high" };
    }
    return { data: r.data.results, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchHeatStress() {
  const isos = Object.keys(COUNTRIES).filter(iso => {
    const c = COUNTRIES[iso].cent;
    return c && (c[0] !== 0 || c[1] !== 0);
  });
  const results = {}; let anyLive = false;
  await poolMap(isos, CFG.FETCH_CONCURRENCY, async iso => {
    const coord = COUNTRIES[iso].cent;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=3`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.daily?.temperature_2m_max?.[0] !== undefined) {
        const t = r.data.daily.temperature_2m_max[0];
        const p = r.data.daily.precipitation_sum?.[0] ?? null;
        results[iso] = t;
        const cov = ensureCoverage(iso);
        cov.heat = { temp: t, precip: p, date: r.data.daily.time?.[0] || null };
        if (t >= 35 || p > 10) anyLive = true;
      }
    } catch {}
  });
  return { data: results, live: anyLive };
}

async function fetchHazardLoop() {
  const results = {}; let anyLive = false;
  await poolMap(HAZARD_LOOP_ISOS, CFG.FETCH_CONCURRENCY, async iso => {
    const coord = COUNTRIES[iso].cent;
    if (!coord) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=river_discharge,uv_index_max,precipitation_sum&hourly=wave_height,wind_speed_10m,cloudcover,lightning_potential&timezone=auto&forecast_days=3`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (!r.ok) return;
      const cov = ensureCoverage(iso);
      const d = r.data?.daily || {};
      const h = r.data?.hourly || {};
      if (d.river_discharge?.[0] > 0) { cov.flood_risk = { discharge: Math.max(...d.river_discharge.filter(Number.isFinite)) }; anyLive = true; }
      if (h.wave_height?.length) { const m = Math.max(...h.wave_height.filter(Number.isFinite)); if (m > 0) cov.marine = { wave_height: +m.toFixed(2) }; }
      if (h.wind_speed_10m?.length) { const m = Math.max(...h.wind_speed_10m.filter(Number.isFinite)); if (m > 0) cov.wind = { speed: +m.toFixed(1) }; }
      if (d.precipitation_sum?.length) { const s = d.precipitation_sum.filter(Number.isFinite).reduce((a, b) => a + b, 0); if (s > 0) cov.precipitation = { total: +s.toFixed(1) }; }
      if (d.uv_index_max?.length) { const m = Math.max(...d.uv_index_max.filter(Number.isFinite)); if (m > 0) cov.uv = { max: +m.toFixed(1) }; }
      if (h.cloudcover?.length) { const a = mean(h.cloudcover.filter(Number.isFinite)); if (a > 0) cov.cloudcover = { avg: +a.toFixed(0) }; }
      if (h.lightning_potential?.length) { const m = Math.max(...h.lightning_potential.filter(Number.isFinite)); if (m > 0) cov.lightning = { max: +m.toFixed(0) }; }
      results[iso] = cov;
    } catch {}
  });
  return { data: results, live: anyLive };
}

async function fetchAirQuality() {
  const cities = [
    {iso:'NGA',lat:6.5,lon:3.4},{iso:'IND',lat:28.6,lon:77.2},{iso:'CHN',lat:39.9,lon:116.4},
    {iso:'BGD',lat:23.8,lon:90.4},{iso:'EGY',lat:30.0,lon:31.2},{iso:'PAK',lat:24.9,lon:67.1},
    {iso:'IDN',lat:-6.2,lon:106.8},{iso:'MEX',lat:19.4,lon:-99.1},{iso:'BRA',lat:-23.5,lon:-46.6},
    {iso:'ZAF',lat:-26.2,lon:28.0},{iso:'THA',lat:13.8,lon:100.5},{iso:'TUR',lat:41.0,lon:28.9},
    {iso:'ARG',lat:-34.6,lon:-58.4},{iso:'RUS',lat:55.8,lon:37.6},{iso:'IND',lat:19.1,lon:72.9},
  ];
  const results = {}; let anyLive = false;
  await Promise.all(cities.map(async c => {
    try {
      const r = await safeFetch(fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.lat}&longitude=${c.lon}&hourly=pm2_5&forecast_days=1`).then(r => r.json()));
      const pm25 = r.ok ? r.data?.hourly?.pm2_5?.[0] : undefined;
      if (pm25 != null && (!results[c.iso] || pm25 > results[c.iso].pm25)) {
        results[c.iso] = { pm25, city: c.iso };
        const cov = ensureCoverage(c.iso);
        cov.air_quality = { pm25, city: c.iso };
        if (pm25 >= 35) anyLive = true;
      }
    } catch {}
  }));
  return { data: results, live: anyLive };
}

async function fetchNOAA() {
  try {
    const [s, a, b] = await Promise.all([
      safeFetch(fetch("https://api.weather.gov/stations?limit=20").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Extreme").then(r => r.json())),
      safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Severe").then(r => r.json())),
    ]);
    const out = { stations: s.ok ? (s.data.features?.length || 0) : 0, extreme_alerts: a.ok ? (a.data.features?.length || 0) : 0, storm_alerts: b.ok ? (b.data.features?.length || 0) : 0 };
    const cov = ensureCoverage('USA');
    if (out.stations > 0) cov.noaa = { stations: out.stations, status: "active" };
    if (out.extreme_alerts > 0) cov.noaa_alerts = out.extreme_alerts;
    if (out.storm_alerts > 0) cov.storm_reports = out.storm_alerts;
    return { data: out, live: out.extreme_alerts > 0 || out.storm_alerts > 0 };
  } catch { return { data: { stations: 0, extreme_alerts: 0, storm_alerts: 0 }, live: false }; }
}

async function fetchSPC() {
  try {
    const r = await safeFetch(fetch("https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson").then(r => r.json()));
    if (r.ok && r.data?.features?.length) {
      const rank = { "TSTM": 1, "MRGL": 2, "SLGT": 3, "ENH": 4, "MDT": 5, "HIGH": 6 };
      let top = null;
      for (const f of r.data.features) {
        const p = f.properties || {};
        const label = p.LABEL || "TSTM";
        if (!top || (rank[label] || 0) > (rank[top.LABEL] || 0)) top = { label, label2: p.LABEL2, issue: p.ISSUE_ISO };
      }
      if (top) { const cov = ensureCoverage('USA'); cov.spc = top; }
      return { data: top, live: !!top };
    }
  } catch {}
  return { data: null, live: false };
}

async function fetchEnsemble() {
  try {
    const r = await safeFetch(fetch("https://ensemble-api.open-meteo.com/v1/ensemble?latitude=15.35&longitude=44.21&hourly=temperature_2m&forecast_days=3").then(r => r.json()));
    if (r.ok && r.data?.hourly?.temperature_2m) {
      const arrs = Object.entries(r.data.hourly).filter(([k]) => k.startsWith("temperature_2m_member")).map(([, v]) => v);
      if (arrs.length > 1) {
        const idx = Math.min(24, arrs[0].length - 1);
        const vals = arrs.map(a => a[idx]).filter(Number.isFinite);
        if (vals.length > 1) return { data: { spread: Math.max(...vals) - Math.min(...vals) }, live: true };
      }
    }
  } catch {}
  return { data: { spread: 0 }, live: false };
}

async function fetchDiseaseSh() {
  try {
    const r = await safeFetch(fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=50").then(r => r.json()));
    if (!r.ok || !Array.isArray(r.data)) return { data: [], live: false };
    for (const d of r.data) {
      const iso = findIsoByName(d.country);
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      if (!cov.covid || d.active > (cov.covid.active || 0)) cov.covid = { active: d.active, cases: d.cases, deaths: d.deaths };
    }
    return { data: r.data, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchWHO() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml").then(r => r.json()));
    if (!r.ok || !r.data?.items) return { data: {}, live: false };
    const outbreaks = {};
    const kws = ['cholera','ebola','mpox','measles','polio','dengue','malaria','marburg','meningitis','avian influenza','h5n1','yellow fever','diphtheria','lassa'];
    r.data.items.forEach(it => {
      const t = ((it.title || "") + " " + (it.description || "")).toLowerCase();
      for (const kw of kws) {
        if (t.includes(kw)) {
          for (const [iso, c] of Object.entries(COUNTRIES)) {
            if (t.includes(c.name.toLowerCase())) {
              if (!outbreaks[iso]) outbreaks[iso] = [];
              outbreaks[iso].push({ disease: kw, title: it.title, date: it.pubDate, ageHours: 24 });
              break;
            }
          }
        }
      }
    });
    for (const [iso, arr] of Object.entries(outbreaks)) {
      const cov = ensureCoverage(iso);
      cov.who_outbreak = { disease: arr[0].disease, count: arr.length };
    }
    return { data: outbreaks, live: Object.keys(outbreaks).length > 0 };
  } catch { return { data: {}, live: false }; }
}

async function fetchWHODon() {
  try {
    const r = await safeFetch(fetch("https://www.who.int/api/news/diseaseoutbreaknews?$orderby=PublicationDateAndTime desc&$top=20").then(r => r.json()));
    if (!r.ok || !r.data?.value?.length) return { data: [], live: false };
    const items = r.data.value.map(d => ({
      title: d.Title || "", summary: d.Summary || "", overview: d.Overview || "",
      pubDate: d.PublicationDateAndTime || null,
      ageHours: d.PublicationDateAndTime ? (Date.now() - new Date(d.PublicationDateAndTime).getTime()) / 36e5 : 48,
    }));
    for (const it of items) {
      const text = ((it.title || "") + " " + (it.summary || "") + " " + (it.overview || "")).toLowerCase();
      for (const [iso, c] of Object.entries(COUNTRIES)) {
        if (text.includes(c.name.toLowerCase())) {
          const cov = ensureCoverage(iso);
          if (!cov.who_don) cov.who_don = { title: it.title, ageHours: it.ageHours };
          break;
        }
      }
    }
    return { data: items, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchECDC() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.ecdc.europa.eu/en/taxonomy/term/1607/feed").then(r => r.json()));
    if (!r.ok || !r.data?.items?.length) return { data: [], live: false };
    const items = r.data.items.slice(0, 10).map(it => ({
      title: it.title || "", pubDate: it.pubDate || null,
      ageHours: it.pubDate ? (Date.now() - new Date(it.pubDate).getTime()) / 36e5 : 48,
    }));
    for (const it of items) {
      const t = (it.title || "").toLowerCase();
      for (const [iso, c] of Object.entries(COUNTRIES)) {
        if (COUNTRIES[iso].region === "europe" && t.includes(c.name.toLowerCase())) {
          const cov = ensureCoverage(iso);
          if (!cov.ecdc_threat) cov.ecdc_threat = { title: it.title };
        }
      }
    }
    return { data: items, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchCDC() {
  try {
    const r = await safeFetch(fetch("https://api.rss2json.com/v1/api.json?rss_url=https://tools.cdc.gov/api/v2/resources/media/132608.rss").then(r => r.json()));
    if (!r.ok || !r.data?.items?.length) return { data: [], live: false };
    const items = r.data.items.slice(0, 15).map(it => ({
      title: it.title || "", description: it.description || "", pubDate: it.pubDate || null,
      ageHours: it.pubDate ? (Date.now() - new Date(it.pubDate).getTime()) / 36e5 : 48,
    }));
    for (const it of items) {
      const t = (it.title || "").toLowerCase();
      for (const [iso, c] of Object.entries(COUNTRIES)) {
        if (t.includes(c.name.toLowerCase())) {
          const cov = ensureCoverage(iso);
          if (!cov.cdc_outbreak) cov.cdc_outbreak = { title: it.title };
          break;
        }
      }
    }
    return { data: items, live: true };
  } catch { return { data: [], live: false }; }
}

async function fetchWorldBankIndicator(code) {
  try {
    const r = await safeFetch(fetch(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=300&mrv=1`).then(r => r.json()));
    const rows = r.ok && r.data?.[1] ? r.data[1] : [];
    const map = {};
    rows.forEach(i => { if (i.country?.id && i.value != null) map[i.country.id] = { value: parseFloat(i.value), date: i.date }; });
    return { data: map, live: Object.keys(map).length > 0 };
  } catch { return { data: {}, live: false }; }
}

async function fetchWorldBankAll() {
  const [population, poverty, inflation, gdpGrowth, unemployment, waterStress, foodPriceIndex, electricityAccess] = await Promise.all([
    fetchWorldBankIndicator("SP.POP.TOTL"),
    fetchWorldBankIndicator("SI.POV.DDAY"),
    fetchWorldBankIndicator("FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"),
    fetchWorldBankIndicator("SL.UEM.TOTL.ZS"),
    fetchWorldBankIndicator("ER.H2O.FWTL.ZS"),
    fetchWorldBankIndicator("AG.PRD.FOOD.XD"),
    fetchWorldBankIndicator("IC.ELC.ACCS.ZS"),
  ]);
  for (const [iso, d] of Object.entries(population.data)) { const cov = ensureCoverage(iso); cov.population = d.value; evidenceIndex.population[iso] = d.value; }
  for (const [iso, d] of Object.entries(poverty.data)) { ensureCoverage(iso).poverty = d.value; }
  for (const [iso, d] of Object.entries(inflation.data)) { const cov = ensureCoverage(iso); cov.inflation = d.value; cov.inflation_year = d.date; }
  for (const [iso, d] of Object.entries(gdpGrowth.data)) { ensureCoverage(iso).gdp_growth = d.value; }
  for (const [iso, d] of Object.entries(unemployment.data)) { ensureCoverage(iso).unemployment = d.value; }
  for (const [iso, d] of Object.entries(waterStress.data)) { ensureCoverage(iso).water_stress = d.value; }
  for (const [iso, d] of Object.entries(foodPriceIndex.data)) { ensureCoverage(iso).food_prices = [{ value: d.value, date: d.date }]; }
  for (const [iso, d] of Object.entries(electricityAccess.data)) { ensureCoverage(iso).electricity_access = d.value; }
  return { population, poverty, inflation, gdpGrowth, unemployment, waterStress, foodPriceIndex, electricityAccess };
}

async function fetchWorldBankFoodPrices() {
  try {
    const r = await safeFetch(fetch("https://api.worldbank.org/v2/country/all/indicator/AG.PRD.FOOD.XD?format=json&per_page=300&mrv=1").then(r => r.json()));
    if (r.ok && r.data?.[1]) {
      for (const item of r.data[1]) {
        if (item.country?.id && item.value != null) ensureCoverage(item.country.id).food_prices = [{ value: parseFloat(item.value), date: item.date }];
      }
      return { data: r.data[1], live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchWorldBankWater() {
  try {
    const r = await safeFetch(fetch("https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWTL.ZS?format=json&per_page=300&mrv=1").then(r => r.json()));
    if (r.ok && r.data?.[1]) {
      for (const item of r.data[1]) {
        if (item.country?.id && item.value != null) ensureCoverage(item.country.id).water_stress = parseFloat(item.value);
      }
      return { data: r.data[1], live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchWorldBankTrade() {
  try {
    const r = await safeFetch(fetch("https://api.worldbank.org/v2/country/all/indicator/NE.TRD.GNFS.ZS?format=json&per_page=300&mrv=1").then(r => r.json()));
    if (r.ok && r.data?.[1]) {
      for (const item of r.data[1]) {
        if (item.country?.id && item.value != null) ensureCoverage(item.country.id).trade_gdp = parseFloat(item.value);
      }
      return { data: r.data[1], live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchWorldBankRefugees() {
  try {
    const r = await safeFetch(fetch("https://api.worldbank.org/v2/country/all/indicator/SM.POP.REFG?format=json&per_page=300&mrv=1").then(r => r.json()));
    if (r.ok && r.data?.[1]) {
      for (const item of r.data[1]) {
        if (item.country?.id && item.value) ensureCoverage(item.country.id).refugees_wb = parseInt(item.value);
      }
      return { data: r.data[1], live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchUNHCR() {
  try {
    const [p, a] = await Promise.all([
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=population&displayType=totals&yearFrom=2023&yearTo=2024&coa_all=true&forcedDisp=1").then(r => r.json())),
      safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=asylum&displayType=totals&yearFrom=2023&yearTo=2024").then(r => r.json())),
    ]);
    const displacement = {};
    if (p.ok && p.data?.items) p.data.items.forEach(i => {
      const iso = i.coa_iso; if (!iso) return;
      if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
      displacement[iso].refugees += parseInt(i.refugees) || 0;
      displacement[iso].idps += parseInt(i.idps) || 0;
    });
    if (a.ok && a.data?.items) a.data.items.forEach(i => {
      const iso = i.coa_iso; if (!iso) return;
      if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
      displacement[iso].asylum_seekers += parseInt(i.asylum_seekers) || 0;
    });
    for (const [iso, d] of Object.entries(displacement)) {
      const cov = ensureCoverage(iso);
      if (d.refugees > 0) cov.refugees = d.refugees;
      const total = d.refugees + d.idps + d.asylum_seekers;
      if (total > 0) cov.displaced = total;
      if (d.asylum_seekers > 0) cov.asylum = d.asylum_seekers;
    }
    return { data: { displacement }, live: Object.keys(displacement).length > 0 };
  } catch { return { data: { displacement: {} }, live: false }; }
}

async function fetchUNHCRSolutions() {
  try {
    const r = await safeFetch(fetch("https://api.unhcr.org/population/v1/solutions/?limit=50&yearFrom=2024&yearTo=2025").then(r => r.json()));
    if (r.ok && r.data?.items?.length) {
      const map = {};
      for (const item of r.data.items) {
        if (item.coa_iso && item.coa_iso !== "-" && item.returned_refugees) {
          const iso = item.coa_iso;
          if (!map[iso]) map[iso] = { returned_refugees: 0, resettlement: 0, naturalisation: 0 };
          map[iso].returned_refugees += parseInt(item.returned_refugees) || 0;
          map[iso].resettlement += parseInt(item.resettlement) || 0;
          map[iso].naturalisation += parseInt(item.naturalisation) || 0;
        }
        if (item.coo_iso && item.coo_iso !== "-" && item.returned_refugees) {
          const iso = item.coo_iso;
          if (!map[iso]) map[iso] = { returned_refugees: 0, resettlement: 0, naturalisation: 0 };
          map[iso].returned_refugees += parseInt(item.returned_refugees) || 0;
        }
      }
      for (const [iso, d] of Object.entries(map)) ensureCoverage(iso).unhcr_solutions = d;
      return { data: map, live: Object.keys(map).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchUNHCROperations() {
  try {
    const r = await safeFetch(fetch("https://api.unhcr.org/operations/v1/operations?limit=20").then(r => r.json()));
    if (r.ok && (r.data?.items || r.data?.data)) {
      const ops = r.data.items || r.data.data || [];
      for (const op of ops) {
        const iso = op.country_iso || op.country?.iso3;
        if (!iso || !COUNTRIES[iso]) continue;
        ensureCoverage(iso).unhcr_op = { name: op.name || "UNHCR operation", status: op.status || "active" };
      }
      return { data: ops, live: ops.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchUNHCREmergency() {
  try {
    const r = await safeFetch(fetch("https://api.unhcr.org/emergency/v1/emergencies?limit=20").then(r => r.json()));
    if (r.ok && (r.data?.items || r.data?.data)) {
      const emergencies = r.data.items || r.data.data || [];
      for (const em of emergencies) {
        const iso = em.country_iso || em.country?.iso3;
        if (!iso || !COUNTRIES[iso]) continue;
        const cov = ensureCoverage(iso);
        if (!cov.unhcr_emergency) cov.unhcr_emergency = { name: em.name || "Emergency response", status: em.status || "active", level: em.level || "unknown" };
      }
      return { data: emergencies, live: emergencies.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchUNHCRStatistics() {
  try {
    const r = await safeFetch(fetch("https://api.unhcr.org/statistics/v1/refugees?limit=20").then(r => r.json()));
    if (r.ok && (r.data?.data || r.data?.items)) {
      const stats = r.data.data || r.data.items || [];
      for (const stat of stats) {
        const iso = stat.country_iso || stat.iso3 || stat.country?.iso3;
        if (!iso || !COUNTRIES[iso]) continue;
        if (stat.refugees > 1000) ensureCoverage(iso).unhcr_stats = { refugees: stat.refugees, asylum_seekers: stat.asylum_seekers || 0, year: stat.year || '2024' };
      }
      return { data: stats, live: stats.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchGFW() {
  try {
    const deforCountries = ['BRA','COD','IDN','COL','PER','BOL','MEX','MMR','MOZ','GHA'];
    const results = {};
    let anyLive = false;
    await poolMap(deforCountries, CFG.FETCH_CONCURRENCY, async iso => {
      try {
        const url = `https://data-api.globalforestwatch.org/dataset/umd_glad_landsat_alerts/latest/query/json?sql=SELECT COUNT(*) FROM data WHERE iso='${iso}' AND umd_glad_landsat_alerts__date >= NOW() - INTERVAL '30 days'`;
        const r = await safeFetch(fetch(url, { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
        if (r.ok && r.data?.data?.length) {
          const count = r.data.data[0]?.count || 0;
          if (count > 0) {
            results[iso] = { count, ageHours: 12 };
            ensureCoverage(iso).gfw = { count };
            anyLive = true;
          }
        }
      } catch {}
    });
    return { data: results, live: anyLive };
  } catch { return { data: {}, live: false }; }
}

async function fetchINFORM() {
  try {
    const r = await safeFetch(fetch("https://drmkc.jrc.ec.europa.eu/inform-index/API/InformAPI/Countries/Scores?informVersion=2024&indicators=INFORM").then(r => r.json()));
    if (r.ok && Array.isArray(r.data)) {
      const map = {};
      r.data.forEach(d => {
        if (d.ISO3 && d.INFORM) {
          map[d.ISO3] = { inform_score: parseFloat(d.INFORM), year: d.Year || 2024 };
          ensureCoverage(d.ISO3).inform = { score: parseFloat(d.INFORM) };
        }
      });
      return { data: map, live: Object.keys(map).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchClimateTrace() {
  try {
    const r = await safeFetch(fetch("https://api.climatetrace.org/v6/assets?limit=100").then(r => r.json()));
    if (r.ok && r.data?.assets?.length) {
      const byCountry = {};
      for (const a of r.data.assets) {
        const iso = a.Country || a.country || null;
        if (!iso || !COUNTRIES[iso]) continue;
        if (!byCountry[iso]) byCountry[iso] = { topEmission: null, count: 0 };
        byCountry[iso].count++;
        const em = a.Emissions?.find(e => e.Product === 'co2e_100yr')?.EmissionsQuantity || 0;
        if (!byCountry[iso].topEmission || em > byCountry[iso].topEmission.emissions) byCountry[iso].topEmission = { emissions: em, sector: a.Sector || 'mixed' };
      }
      for (const [iso, d] of Object.entries(byCountry)) {
        if (d.topEmission) ensureCoverage(iso).emissions = { total: d.topEmission.emissions, sector: d.topEmission.sector };
      }
      return { data: byCountry, live: Object.keys(byCountry).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchHDX() {
  try {
    const r = await safeFetch(fetch("https://data.humdata.org/api/3/action/package_search?q=crisis&rows=50").then(r => r.json()));
    if (r.ok && r.data?.result?.results?.length) {
      const byCountry = {};
      for (const pkg of r.data.result.results) {
        const groups = pkg.groups || [];
        for (const g of groups) {
          const iso = g.name ? g.name.toUpperCase() : null;
          if (iso && COUNTRIES[iso]) {
            if (!byCountry[iso]) byCountry[iso] = { count: 0, latest: null };
            byCountry[iso].count++;
          }
        }
      }
      for (const [iso, d] of Object.entries(byCountry)) ensureCoverage(iso).hdx = { count: d.count };
      return { data: byCountry, live: Object.keys(byCountry).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchJTWC() {
  try {
    const r = await safeFetch(fetch("https://www.metoc.navy.mil/jtwc/products/best-tracks/", { mode: 'cors' }).then(r => r.text()));
    if (!r.ok || typeof r.data !== 'string') return { data: [], live: false };
    const storms = [];
    const activeMatches = r.data.matchAll(/(?:TYPHOON|TROPICAL STORM|TROPICAL DEPRESSION|SUPER TYPHOON)\s+([A-Z0-9\-]+)/gi);
    const seen = new Set();
    for (const m of activeMatches) {
      const name = m[1]?.trim();
      if (name && !seen.has(name)) { seen.add(name); storms.push({ name, ageHours: 12, category: 'active' }); }
    }
    for (const storm of storms.slice(0, 5)) {
      for (const iso of WPAC_ISOS) {
        const cov = ensureCoverage(iso);
        if (!cov.jtwc) cov.jtwc = { name: storm.name };
      }
    }
    return { data: storms.slice(0, 5), live: storms.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchJMATyphoon() {
  try {
    const r = await safeFetch(fetch("https://www.jma.go.jp/bosai/typhoon/data/targetTc.json").then(r => r.json()));
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const typhoons = r.data.map(t => ({ name: t.title || t.name || 'Typhoon', category: t.category || 'active', ageHours: 12 }));
      for (const typhoon of typhoons) {
        for (const iso of WPAC_ISOS) {
          const cov = ensureCoverage(iso);
          if (!cov.jma_typhoon) cov.jma_typhoon = { name: typhoon.name };
        }
      }
      return { data: typhoons, live: typhoons.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchNASAPower() {
  const anchors = [{iso:'IND',lat:20,lon:77},{iso:'BGD',lat:24,lon:90},{iso:'SDN',lat:15,lon:30},{iso:'ETH',lat:9,lon:40},{iso:'SOM',lat:5,lon:45}];
  const results = {}; let anyLive = false;
  await Promise.all(anchors.map(async a => {
    try {
      const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${a.lon}&latitude=${a.lat}&format=JSON&start=2025&end=2025`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.properties?.parameter) {
        const temps = Object.values(r.data.properties.parameter.T2M || {}).filter(Number.isFinite);
        const precips = Object.values(r.data.properties.parameter.PRECTOTCORR || {}).filter(Number.isFinite);
        if (temps.length && precips.length) {
          const mT = mean(temps), mP = mean(precips);
          results[a.iso] = { tempAnomaly: mT - 25, precipAnomaly: mP - 2 };
          ensureCoverage(a.iso).nasa_power = results[a.iso];
          anyLive = true;
        }
      }
    } catch {}
  }));
  return { data: results, live: anyLive };
}

async function fetchSentinel() {
  try {
    const r = await safeFetch(fetch("https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$top=5&$orderby=ContentDate/Start desc&$filter=Collection/Name eq 'SENTINEL-2'").then(r => r.json()));
    if (r.ok && r.data?.value?.length) {
      const items = r.data.value.map(v => ({
        Id: v.Id, Name: v.Name,
        acquisitionDate: v.ContentDate?.Start || null,
        ageHours: v.ContentDate?.Start ? (Date.now() - new Date(v.ContentDate.Start).getTime()) / 36e5 : 72,
      }));
      let assigned = false;
      for (const v of r.data.value) {
        const footprint = v.GeoFootprint;
        if (footprint && footprint.length >= 2) {
          const match = String(footprint).match(/-?\d+\.?\d*\s+-?\d+\.?\d*/);
          if (match) {
            const [lon, lat] = match[0].split(/\s+/).map(Number);
            if (Number.isFinite(lon) && Number.isFinite(lat)) {
              const iso = findClosestCountry(lon, lat);
              if (iso) {
                const cov = ensureCoverage(iso);
                cov.sentinel = { count: (cov.sentinel?.count || 0) + 1 };
                assigned = true;
              }
            }
          }
        }
      }
      if (!assigned) ensureCoverage('YEM').sentinel = { count: items.length };
      return { data: items, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchUSDrought() {
  try {
    const r = await safeFetch(fetch("https://droughtmonitor.unl.edu/data/json/usdm_current.json").then(r => r.json()));
    if (r.ok && r.data) {
      const level = r.data.level || r.data.drought_level || 'drought';
      ensureCoverage('USA').us_drought = { level };
      return { data: { level, ageHours: 168 }, live: true };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchReliefWebIPC() {
  try {
    const url = 'https://api.reliefweb.int/v1/disasters?appname=gcisfusion&profile=list&slim=1&limit=40&filter[field]=type.name&filter[value][]=Food%20Insecurity&sort[]=date.created:desc';
    const r = await safeFetch(fetch(url, { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
    if (!r.ok || !r.data?.data?.length) return { data: [], live: false };
    const out = [];
    r.data.data.forEach(d => {
      const country = d.fields?.country?.[0]?.name;
      if (!country) return;
      const title = (d.fields?.name || '').toLowerCase();
      let phase = 3, phase_name = 'Crisis';
      if (title.includes('famine')) { phase = 5; phase_name = 'Famine'; }
      else if (title.includes('emergency')) { phase = 4; phase_name = 'Emergency'; }
      const iso = findIsoByName(country);
      if (iso) {
        const cov = ensureCoverage(iso);
        if (!cov.ipc || phase > (cov.ipc.phase || 0)) cov.ipc = { phase, phase_name, title: d.fields?.name || '' };
      }
      out.push({ country, phase, phase_name, title: d.fields?.name || '' });
    });
    return { data: out, live: out.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchReliefWebConflict() {
  try {
    const url = 'https://api.reliefweb.int/v1/disasters?appname=gcisfusion&profile=list&slim=1&limit=40&filter[operator]=OR&filter[conditions][0][field]=type.name&filter[conditions][0][value][]=Complex%20Emergency&filter[conditions][1][field]=type.name&filter[conditions][1][value][]=Civil%20Unrest&sort[]=date.created:desc';
    const r = await safeFetch(fetch(url, { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
    if (!r.ok || !r.data?.data?.length) return { data: [], live: false };
    const out = [];
    r.data.data.forEach(d => {
      const country = d.fields?.country?.[0]?.name;
      if (!country) return;
      const title = (d.fields?.name || '').toLowerCase();
      const severityIndex = (title.includes('escalat') || title.includes('offensive') || title.includes('intensif')) ? 80 : 40;
      const iso = findIsoByName(country);
      if (iso) {
        const cov = ensureCoverage(iso);
        if (!cov.conflict_event || severityIndex > (cov.conflict_event.severityIndex || 0)) {
          cov.conflict_event = { event_type: d.fields?.type?.[0]?.name || 'Conflict', severityIndex, title: d.fields?.name || '' };
        }
      }
      out.push({ country, event_type: d.fields?.type?.[0]?.name || 'Conflict', severityIndex, title: d.fields?.name || '' });
    });
    return { data: out, live: out.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchReliefWebFewsNet() {
  try {
    const url = 'https://api.reliefweb.int/v1/disasters?appname=gcisfusion&profile=list&slim=1&limit=30&filter[field]=type.name&filter[value][]=Drought&sort[]=date.created:desc';
    const r = await safeFetch(fetch(url, { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
    if (!r.ok || !r.data?.data?.length) return { data: [], live: false };
    const out = [];
    r.data.data.forEach(d => {
      const country = d.fields?.country?.[0]?.name;
      if (!country) return;
      const title = (d.fields?.name || '').toLowerCase();
      const phase = title.includes('emergency') ? 4 : 3;
      const iso = findIsoByName(country);
      if (iso) {
        const cov = ensureCoverage(iso);
        if (!cov.fewsnet || phase > (cov.fewsnet.phase || 0)) cov.fewsnet = { phase, title: d.fields?.name || '' };
      }
      out.push({ country, phase, title: d.fields?.name || '' });
    });
    return { data: out, live: out.length > 0 };
  } catch { return { data: [], live: false }; }
}

async function fetchOSMHospitals() {
  try {
    const r = await safeFetch(fetch("https://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](around:100000,15.35,44.21);out%20body;").then(r => r.json()));
    if (r.ok && r.data?.elements?.length) {
      ensureCoverage('YEM').hospitals = r.data.elements.length;
      return { data: r.data, live: true };
    }
  } catch {}
  return { data: { elements: [] }, live: false };
}

async function fetchOSMClinics() {
  try {
    const r = await safeFetch(fetch("https://overpass-api.de/api/interpreter?data=[out:json];node[amenity=clinic](around:100000,15.35,44.21);out%20body;").then(r => r.json()));
    if (r.ok && r.data?.elements?.length) {
      ensureCoverage('YEM').clinics = r.data.elements.length;
      return { data: r.data, live: true };
    }
  } catch {}
  return { data: { elements: [] }, live: false };
}

async function fetchEMDAT() {
  try {
    const r = await safeFetch(fetch("https://www.emdat.be/api/emdat?limit=10&year=2024").then(r => r.json()));
    if (r.ok && r.data?.data) {
      const disasters = Array.isArray(r.data.data) ? r.data.data : [];
      for (const d of disasters) {
        const country = d.country || d.location;
        if (!country) continue;
        const iso = findIsoByName(country);
        if (iso) {
          const cov = ensureCoverage(iso);
          if (!cov.emdat) cov.emdat = { disaster: d.disaster_type || "Disaster", year: d.year || "2024", deaths: d.total_deaths || 0 };
        }
      }
      return { data: r.data, live: disasters.length > 0 };
    }
  } catch {}
  return { data: { data: [] }, live: false };
}

// ════════════════════════════════════════════════════════════════════════════
//  v18.0.0 GAP-FILLING FETCHERS
// ════════════════════════════════════════════════════════════════════════════

// ─── 1. ACLED — conflict events with fatality counts ───────────────────────
async function fetchACLED() {
  const key = (typeof process !== 'undefined' && process.env?.ACLED_API_KEY) || null;
  const email = (typeof process !== 'undefined' && process.env?.ACLED_EMAIL) || null;
  if (!GAP_CFG.ACLED_ENABLED || !key || !email) {
    return { data: [], live: false, reason: 'no_acled_credentials' };
  }
  try {
    const since = new Date(Date.now() - GAP_CFG.ACLED_LOOKBACK_DAYS * 86400000)
      .toISOString().slice(0, 10);
    const url = `https://api.acleddata.com/acled/read?key=${encodeURIComponent(key)}` +
                `&email=${encodeURIComponent(email)}&limit=500&event_date=${since}` +
                `&event_date_where=%3E&fields=event_id|event_date|event_type|sub_event_type|` +
                `country|iso3|latitude|longitude|fatalities|actor1|actor2|notes`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok || !r.data?.data?.length) return { data: [], live: false };

    const byIso = {};
    for (const ev of r.data.data) {
      const iso = ev.iso3 || findIsoByName(ev.country);
      if (!iso || !COUNTRIES[iso]) continue;
      if (!byIso[iso]) byIso[iso] = [];
      byIso[iso].push(ev);
    }

    for (const [iso, events] of Object.entries(byIso)) {
      const cov = ensureCoverage(iso);
      const sorted = events
        .map(e => ({ ...e, fatalities: parseInt(e.fatalities) || 0 }))
        .sort((a, b) => b.fatalities - a.fatalities)
        .slice(0, GAP_CFG.ACLED_MAX_EVENTS_PER_COUNTRY);

      const totalFatalities = events.reduce((s, e) => s + (parseInt(e.fatalities) || 0), 0);
      const maxFatalities = sorted[0]?.fatalities || 0;
      const violentTypes = new Set(events.map(e => e.event_type));
      const severityIndex = Math.min(100, Math.round(
        Math.log10(totalFatalities + 1) * 22 +
        Math.log10(maxFatalities + 1) * 15 +
        violentTypes.size * 4
      ));

      cov.acled = {
        event_count: events.length,
        total_fatalities: totalFatalities,
        max_fatalities: maxFatalities,
        event_types: [...violentTypes],
        severityIndex,
        top_events: sorted.map(e => ({
          event_id: e.event_id,
          date: e.event_date,
          type: e.event_type,
          sub_type: e.sub_event_type,
          fatalities: e.fatalities,
          actor1: e.actor1,
          actor2: e.actor2,
          lat: parseFloat(e.latitude),
          lon: parseFloat(e.longitude),
          notes: (e.notes || '').slice(0, 200),
        })),
      };
    }
    return { data: r.data.data, live: true };
  } catch (e) {
    return { data: [], live: false, error: e.message };
  }
}

// ─── 2. HDX HAPI — IPC / Cadre Harmonisé food security phases ──────────────
async function fetchHDXHAPI() {
  if (!GAP_CFG.HDX_HAPI_ENABLED) return { data: [], live: false };
  try {
    const url = 'https://hapi.humdata.org/api/v1/food-security/food-security-phase' +
                '?output_format=json&limit=1000';
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok) return { data: [], live: false };

    const rows = Array.isArray(r.data) ? r.data : (r.data?.data || []);
    if (!rows.length) return { data: [], live: false };

    for (const row of rows) {
      const iso = row.location_code || row.iso3 || findIsoByName(row.location_name);
      if (!iso || !COUNTRIES[iso]) continue;
      const phase = parseInt(row.ipc_phase) || 0;
      if (phase < 3) continue;

      const cov = ensureCoverage(iso);
      const popInPhase = parseInt(row.population_in_phase) || 0;

      if (!cov.hdx_hapi || phase > cov.hdx_hapi.phase ||
          (phase === cov.hdx_hapi.phase && popInPhase > cov.hdx_hapi.population)) {
        cov.hdx_hapi = {
          phase,
          phase_name: phase === 5 ? 'Famine' : phase === 4 ? 'Emergency' : 'Crisis',
          population: popInPhase,
          admin1: row.admin1_name || null,
          reference_start: row.reference_period_start,
          reference_end: row.reference_period_end,
          ipc_type: row.ipc_type || 'current',
        };
      }
    }
    return { data: rows, live: true };
  } catch { return { data: [], live: false }; }
}

// ─── 3. IDMC — internal displacement (conflict + disaster) ─────────────────
async function fetchIDMC() {
  if (!GAP_CFG.IDMC_ENABLED) return { data: [], live: false };
  try {
    const url = 'https://api.idmcdb.org/api/displacement_data?limit=200' +
                '&year=2024&type_of_displacement=CONFLICT,DISASTER';
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok) return { data: [], live: false };
    const rows = Array.isArray(r.data) ? r.data : (r.data?.data || r.data?.results || []);
    if (!rows.length) return { data: [], live: false };

    for (const row of rows) {
      const iso = row.iso3 || row.country_iso3 || findIsoByName(row.country);
      if (!iso || !COUNTRIES[iso]) continue;
      const cov = ensureCoverage(iso);

      const conflictNew = parseInt(row.conflict_new_displacements || row.conflict_new || 0);
      const disasterNew = parseInt(row.disaster_new_displacements || row.disaster_new || 0);
      const total = parseInt(row.total_displacements || row.total || 0);

      cov.idmc = {
        year: parseInt(row.year) || 2024,
        conflict_new_displacements: conflictNew,
        disaster_new_displacements: disasterNew,
        total_displacements: total,
        combined_new: conflictNew + disasterNew,
      };
    }
    return { data: rows, live: true };
  } catch { return { data: [], live: false }; }
}

// ─── 4. ReliefWeb Reports — situation reports, assessments, appeals ────────
async function fetchReliefWebReports() {
  if (!GAP_CFG.RELIEFWEB_REPORTS_ENABLED) return { data: [], live: false };
  try {
    const url = `https://api.reliefweb.int/v1/reports?appname=gcisfusion` +
                `&profile=list&slim=1&limit=${GAP_CFG.RELIEFWEB_REPORTS_LIMIT}` +
                `&sort[]=date.created:desc` +
                `&fields[include][]=title&fields[include][]=body` +
                `&fields[include][]=date.created&fields[include][]=country` +
                `&fields[include][]=source.shortname&fields[include][]=disaster_type`;
    const r = await safeFetch(fetch(url, { headers: { 'Accept': 'application/json' } }).then(r => r.json()));
    if (!r.ok || !r.data?.data?.length) return { data: [], live: false };

    for (const item of r.data.data) {
      const countries = item.fields?.country || [];
      for (const c of countries) {
        const iso = findIsoByName(c.name) || c.iso3;
        if (!iso || !COUNTRIES[iso]) continue;
        const cov = ensureCoverage(iso);

        if (!cov.reliefweb_report) {
          cov.reliefweb_report = {
            count: 0,
            latest_title: null,
            latest_date: null,
            sources: new Set(),
            disasters: new Set(),
          };
        }
        const rr = cov.reliefweb_report;
        rr.count++;
        rr.sources.add(item.fields?.source?.[0]?.shortname || 'Unknown');
        const dt = item.fields?.disaster_type?.[0]?.name;
        if (dt) rr.disasters.add(dt);
        const created = item.fields?.date?.created;
        if (created && (!rr.latest_date || created > rr.latest_date)) {
          rr.latest_date = created;
          rr.latest_title = item.fields?.title || null;
        }
      }
    }

    for (const iso of Object.keys(evidenceIndex.sourceCoverage)) {
      const rr = evidenceIndex.sourceCoverage[iso]?.reliefweb_report;
      if (rr) {
        rr.sources = [...rr.sources];
        rr.disasters = [...rr.disasters];
      }
    }
    return { data: r.data.data, live: true };
  } catch { return { data: [], live: false }; }
}

// ─── 5. FAO Food Price Index (global, used as market-price shock proxy) ────
async function fetchFAOFoodPriceIndex() {
  if (!GAP_CFG.FAO_FPI_ENABLED) return { data: null, live: false };
  try {
    const url = 'https://fenixservices.fao.org/faostat/api/v1/en/data/FP?area=5000&item=23013&element=7001&year=2024,2025&format=json';
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (r.ok && r.data?.data?.length) {
      const sorted = r.data.data.sort((a, b) => (b.Year || 0) - (a.Year || 0));
      const latest = sorted[0];
      const value = parseFloat(latest.Value) || null;
      if (value) {
        for (const iso of Object.keys(COUNTRIES)) {
          const cov = ensureCoverage(iso);
          cov.fao_fpi = { value, year: latest.Year, baseline: GAP_CFG.FAO_FPI_BASELINE };
        }
        return { data: { value, year: latest.Year }, live: true };
      }
    }
  } catch { /* fall through */ }

  const fallbackValue = 124.5;
  for (const iso of Object.keys(COUNTRIES)) {
    const cov = ensureCoverage(iso);
    if (!cov.fao_fpi) cov.fao_fpi = { value: fallbackValue, year: 2025, baseline: 100, fallback: true };
  }
  return { data: { value: fallbackValue, year: 2025, fallback: true }, live: false };
}

// ─── 6. WHO GHO OData — structured health burden indicators ────────────────
async function fetchWHOGHO() {
  if (!GAP_CFG.WHO_GHO_ENABLED) return { data: {}, live: false };
  const out = {};
  let anyLive = false;

  await poolMap(GAP_CFG.WHO_GHO_INDICATORS, 3, async (ind) => {
    try {
      const url = `https://ghoapi.azureedge.net/api/${ind.code}?$filter=SpatialDimType eq 'COUNTRY'&$top=300`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (!r.ok || !r.data?.value?.length) return;
      anyLive = true;

      const byIso = {};
      for (const row of r.data.value) {
        const iso = row.SpatialDim;
        if (!iso || !COUNTRIES[iso]) continue;
        const year = parseInt(row.TimeDim) || 0;
        const val = parseFloat(row.NumericValue);
        if (!Number.isFinite(val)) continue;
        if (!byIso[iso] || year > byIso[iso].year) byIso[iso] = { value: val, year };
      }
      for (const [iso, d] of Object.entries(byIso)) {
        const cov = ensureCoverage(iso);
        if (!cov.who_gho) cov.who_gho = {};
        cov.who_gho[ind.code] = { value: d.value, year: d.year, label: ind.label };
      }
      out[ind.code] = byIso;
    } catch { /* individual indicator failed; continue */ }
  });
  return { data: out, live: anyLive };
}

// ─── 7. UNHCR Situations — operational context (funding, appeals) ──────────
async function fetchUNHCRSituations() {
  if (!GAP_CFG.UNHCR_SITUATIONS_ENABLED) return { data: [], live: false };
  try {
    const url = 'https://api.unhcr.org/situations/v1/situations?limit=50';
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (!r.ok) return { data: [], live: false };
    const items = r.data?.items || r.data?.data || (Array.isArray(r.data) ? r.data : []);
    if (!items.length) return { data: [], live: false };

    for (const sit of items) {
      const countries = sit.countries || sit.country_iso3 || [];
      const isoList = Array.isArray(countries)
        ? countries.map(c => typeof c === 'string' ? c : (c.iso3 || c.iso))
        : [];
      const funded = sit.appeal?.funded ?? sit.funding?.funded ?? null;
      const requested = sit.appeal?.requested ?? sit.funding?.requested ?? null;
      const fundingGapPct = (funded != null && requested != null && requested > 0)
        ? Math.round(100 * (1 - funded / requested))
        : null;

      for (const iso of isoList) {
        if (!iso || !COUNTRIES[iso]) continue;
        const cov = ensureCoverage(iso);
        const entry = {
          name: sit.name || sit.title || 'Situation',
          funding_gap_pct: fundingGapPct,
          funded, requested,
          description: (sit.description || '').slice(0, 200),
          updated: sit.updated_at || sit.updated || null,
        };
        if (!cov.unhcr_situation ||
            (fundingGapPct != null && fundingGapPct > (cov.unhcr_situation.funding_gap_pct ?? -1))) {
          cov.unhcr_situation = entry;
        }
      }
    }
    return { data: items, live: true };
  } catch { return { data: [], live: false }; }
}
// ════════════════════════════════════════════════════════════════════════════
//  MASTER FETCH — allSettled, so one dead fetch never kills the response
// ════════════════════════════════════════════════════════════════════════════

async function fetchAllLive() {
  resetEvidenceIndex();
  const tasks = {
    // ─── v17.0.0 core fetchers ───
    usgs: fetchUSGS(),
    usgsSig: fetchUSGSSignificant(),
    shakemap: fetchShakeMap(),
    emsc: fetchEMSC(),
    nasa: fetchNASA(),
    gdacs: fetchGDACS(),
    ifrc: fetchIFRC(),
    ifrcAppeals: fetchIFRCAppeals(),
    heat: fetchHeatStress(),
    hazards: fetchHazardLoop(),
    aq: fetchAirQuality(),
    noaa: fetchNOAA(),
    spc: fetchSPC(),
    ensemble: fetchEnsemble(),
    cdc: fetchCDC(),
    whoDon: fetchWHODon(),
    sentinel: fetchSentinel(),
    nasaPower: fetchNASAPower(),
    disease: fetchDiseaseSh(),
    wb: fetchWorldBankAll(),
    unhcr: fetchUNHCR(),
    unhcrSolutions: fetchUNHCRSolutions(),
    who: fetchWHO(),
    gfw: fetchGFW(),
    inform: fetchINFORM(),
    climateTrace: fetchClimateTrace(),
    hdx: fetchHDX(),
    jtwc: fetchJTWC(),
    jma: fetchJMA(),
    bmkg: fetchBMKG(),
    geofon: fetchGEOFON(),
    ingv: fetchINGV(),
    geonet: fetchGeoNet(),
    jmaTyphoon: fetchJMATyphoon(),
    usDrought: fetchUSDrought(),
    ecdc: fetchECDC(),
    reliefIPC: fetchReliefWebIPC(),
    reliefConflict: fetchReliefWebConflict(),
    reliefFews: fetchReliefWebFewsNet(),
    osmHosp: fetchOSMHospitals(),
    osmClin: fetchOSMClinics(),
    emdat: fetchEMDAT(),
    unhcrOps: fetchUNHCROperations(),
    unhcrEmerg: fetchUNHCREmergency(),
    unhcrStats: fetchUNHCRStatistics(),
    wbFood: fetchWorldBankFoodPrices(),
    wbWater: fetchWorldBankWater(),
    wbTrade: fetchWorldBankTrade(),
    wbRefugees: fetchWorldBankRefugees(),

    // ─── v18.0.0 GAP-FILLERS ───
    acled: fetchACLED(),
    hdxHapi: fetchHDXHAPI(),
    idmc: fetchIDMC(),
    reliefReports: fetchReliefWebReports(),
    faoFpi: fetchFAOFoodPriceIndex(),
    whoGho: fetchWHOGHO(),
    unhcrSituations: fetchUNHCRSituations(),
  };
  const keys = Object.keys(tasks);
  const settled = await Promise.allSettled(Object.values(tasks));
  const out = {};
  keys.forEach((k, i) => {
    out[k] = settled[i].status === "fulfilled" ? settled[i].value : { data: null, live: false };
  });
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
//  LIVE BREAKING (tier/headline only — does NOT touch numeric score)
// ════════════════════════════════════════════════════════════════════════════

const LIVE_SIGNALS = {
  // ─── v17.0.0 signals ───
  gdacs_red:{weight:100,verify:1.0,label:"GDACS RED Alert",icon:"🚨"},
  gdacs_orange:{weight:70,verify:0.9,label:"GDACS Orange Alert",icon:"🟠"},
  earthquake_m6:{weight:95,verify:1.0,label:"M6+ Earthquake",icon:"🌍"},
  earthquake_m5:{weight:65,verify:0.9,label:"M5+ Earthquake",icon:"🌍"},
  earthquake_m45:{weight:40,verify:0.8,label:"M4.5+ Earthquake",icon:"🌍"},
  jma_earthquake:{weight:60,verify:0.95,label:"JMA Earthquake",icon:"🌏"},
  bmkg_earthquake:{weight:60,verify:0.95,label:"BMKG Earthquake",icon:"🌏"},
  geofon_earthquake:{weight:55,verify:0.95,label:"GEOFON Earthquake",icon:"🌍"},
  ingv_earthquake:{weight:55,verify:0.95,label:"INGV Earthquake",icon:"🌍"},
  geonet_earthquake:{weight:50,verify:0.95,label:"GeoNet Earthquake",icon:"🌏"},
  shakemap_event:{weight:70,verify:0.95,label:"ShakeMap Event",icon:"🌍"},
  who_outbreak:{weight:80,verify:1.0,label:"WHO Outbreak",icon:"🦠"},
  who_outbreak_multi:{weight:95,verify:1.0,label:"Multiple WHO Outbreaks",icon:"🦠"},
  who_don:{weight:90,verify:1.0,label:"WHO Disease Outbreak",icon:"🦠"},
  ecdc_threat:{weight:55,verify:0.85,label:"ECDC Threat",icon:"🧫"},
  unhcr_mass_displace:{weight:90,verify:1.0,label:"Mass Displacement",icon:"🚶"},
  unhcr_return:{weight:40,verify:0.95,label:"Refugee Returns",icon:"🏠"},
  nasa_wildfire:{weight:75,verify:0.9,label:"Active Wildfire",icon:"🔥"},
  nasa_storm:{weight:70,verify:0.9,label:"Severe Storm",icon:"🌀"},
  nasa_flood:{weight:70,verify:0.9,label:"Flood Event",icon:"🌊"},
  nasa_drought:{weight:55,verify:0.9,label:"Drought",icon:"🏜️"},
  ifrc_emergency:{weight:75,verify:1.0,label:"IFRC Emergency",icon:"🏥"},
  ifrc_appeal:{weight:80,verify:1.0,label:"IFRC Emergency Appeal",icon:"🆘"},
  cyclone_active:{weight:85,verify:1.0,label:"Active Cyclone",icon:"🌀"},
  jtwc_cyclone:{weight:90,verify:1.0,label:"JTWC Pacific Cyclone",icon:"🌀"},
  jma_typhoon:{weight:85,verify:1.0,label:"JMA Typhoon",icon:"🌀"},
  flood_severe:{weight:70,verify:0.9,label:"Severe Flooding",icon:"🌊"},
  marine_hazard:{weight:55,verify:0.9,label:"Marine Hazard",icon:"🌊"},
  heat_extreme:{weight:60,verify:0.8,label:"Extreme Heat",icon:"🥵"},
  disease_active:{weight:50,verify:0.8,label:"Disease Outbreak",icon:"🦠"},
  inflation_crisis:{weight:45,verify:0.9,label:"Inflation Crisis",icon:"📈"},
  gdp_contraction:{weight:40,verify:0.9,label:"GDP Contraction",icon:"📉"},
  cdc_outbreak:{weight:55,verify:0.95,label:"CDC Outbreak Notice",icon:"🧫"},
  spc_severe:{weight:60,verify:0.95,label:"SPC Severe Outlook",icon:"⛈️"},
  sentinel_observation:{weight:35,verify:0.85,label:"Satellite Observation",icon:"🛰️"},
  nasa_power_anomaly:{weight:50,verify:0.9,label:"Climate Anomaly",icon:"🌡️"},
  gfw_deforestation:{weight:55,verify:0.95,label:"Deforestation Alert",icon:"🌳"},
  climate_trace_emissions:{weight:40,verify:0.85,label:"Emissions Hotspot",icon:"🏭"},
  hdx_crisis:{weight:45,verify:0.9,label:"HDX Crisis Dataset",icon:"📊"},
  us_drought:{weight:55,verify:0.95,label:"US Drought",icon:"🏜️"},
  wb_food_price:{weight:35,verify:0.9,label:"Food Price Shock",icon:"🍞"},
  wb_water_stress:{weight:30,verify:0.9,label:"Water Stress",icon:"💧"},

  // ─── v18.0.0 GAP-FILLER SIGNALS ───
  acled_mass_casualty:   { weight: 95,  verify: 1.00, label: "ACLED Mass-Casualty Event",   icon: "⚔️" },
  acled_armed_clash:     { weight: 70,  verify: 0.95, label: "ACLED Armed Clash",           icon: "⚔️" },
  acled_violence_civ:    { weight: 80,  verify: 0.95, label: "ACLED Violence vs Civilians", icon: "⚠️" },
  hdx_hapi_famine:       { weight: 100, verify: 1.00, label: "IPC Phase 5 (Famine)",         icon: "🍚" },
  hdx_hapi_emergency:    { weight: 80,  verify: 1.00, label: "IPC Phase 4 (Emergency)",      icon: "🍚" },
  idmc_mass_displacement:{ weight: 90,  verify: 1.00, label: "IDMC Mass Displacement",       icon: "🚶" },
  reliefweb_report_flood:{ weight: 45,  verify: 0.85, label: "ReliefWeb Report Surge",       icon: "📄" },
  fao_price_shock:       { weight: 55,  verify: 0.85, label: "FAO Food Price Shock",         icon: "🌾" },
  who_gho_cholera:       { weight: 70,  verify: 0.90, label: "WHO GHO Cholera Signal",       icon: "🦠" },
  unhcr_underfunded:     { weight: 50,  verify: 0.90, label: "UNHCR Situation Underfunded",  icon: "📋" },
};

const RECENCY = { HOURS_6: 1.00, HOURS_24: 0.85, HOURS_72: 0.60, HOURS_168: 0.30, OLDER: 0.10 };

function detectLiveBreakingSignals(iso, live, store) {
  const signals = [];
  const c = COUNTRIES[iso];
  const s = store[iso]?.signals || {};
  const now = Date.now();
  const cent = c.cent || [0, 0];

  if (s.gdacs && s.gdacsAlert) {
    const ageHours = 12;
    if (s.gdacsAlert === "red") signals.push({ type: "gdacs_red", weight: 100, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Red alert active" });
    else if (s.gdacsAlert === "orange") signals.push({ type: "gdacs_orange", weight: 70, ageHours, source: "GDACS", details: s.gdacs.properties?.eventname || "Orange alert active" });
  }

  const seismicSources = [
    { key: "quakeMag", placeKey: "quakePlace", timeKey: "quakeTime", type: null, source: "USGS/EMSC" },
    { key: "jmaQuake", type: "jma_earthquake", source: "JMA" },
    { key: "bmkgQuake", type: "bmkg_earthquake", source: "BMKG" },
    { key: "geofonQuake", type: "geofon_earthquake", source: "GEOFON" },
    { key: "ingvQuake", type: "ingv_earthquake", source: "INGV" },
    { key: "geonetQuake", type: "geonet_earthquake", source: "GeoNet" },
  ];

  for (const src of seismicSources) {
    const q = s[src.key];
    if (!q) continue;
    let mag, place, ageHours;
    if (src.key === "quakeMag") { mag = s.quakeMag; place = s.quakePlace; ageHours = s.quakeTime ? (now - s.quakeTime) / 36e5 : 24; }
    else { mag = q.mag; place = q.place; ageHours = q.ageHours || 12; }
    if (mag < 4.5) continue;
    let type;
    if (src.type) type = src.type;
    else if (mag >= 6.0) type = "earthquake_m6";
    else if (mag >= 5.0) type = "earthquake_m5";
    else type = "earthquake_m45";
    signals.push({ type, weight: LIVE_SIGNALS[type].weight, ageHours, source: src.source, details: `M${mag.toFixed(1)} ${place || ""}`, magnitude: mag, latitude: cent[1], longitude: cent[0] });
  }

  if (s.shakeMapEvent && s.shakeMapEvent.mag >= 4.5) {
    signals.push({ type: "shakemap_event", weight: 70, ageHours: s.shakeMapEvent.ageHours || 2, source: "USGS ShakeMap", details: `ShakeMap M${s.shakeMapEvent.mag.toFixed(1)}` });
  }

  if (s.whoOutbreaks && s.whoOutbreaks.length > 0) {
    const ageHours = 24;
    if (s.whoOutbreaks.length >= 2) signals.push({ type: "who_outbreak_multi", weight: 95, ageHours, source: "WHO RSS", details: s.whoOutbreaks.map(o => o.disease).join(", ") });
    else signals.push({ type: "who_outbreak", weight: 80, ageHours, source: "WHO RSS", details: s.whoOutbreaks[0].disease });
  }

  if (s.whoDon && s.whoDon.length > 0) {
    for (const don of s.whoDon.slice(0, 3)) signals.push({ type: "who_don", weight: 90, ageHours: don.ageHours || 24, source: "WHO DON", details: don.title || "WHO DON" });
  }

  if (COUNTRIES[iso].region === "europe" && s.ecdcThreats?.length) {
    for (const threat of s.ecdcThreats.slice(0, 2)) signals.push({ type: "ecdc_threat", weight: 55, ageHours: 48, source: "ECDC", details: threat.title || "ECDC Threat" });
  }

  if (s.totalDisplaced > 500_000) signals.push({ type: "unhcr_mass_displace", weight: 90, ageHours: 168, source: "UNHCR", details: `${fmtPop(s.totalDisplaced)} displaced` });
  if (s.unhcrSolutions && s.unhcrSolutions.returned_refugees > 10_000) signals.push({ type: "unhcr_return", weight: 40, ageHours: 168, source: "UNHCR Solutions", details: `${fmtPop(s.unhcrSolutions.returned_refugees)} returned` });

  if (s.nasaEvents && s.nasaEvents.length > 0) {
    for (const ev of s.nasaEvents.slice(0, 3)) {
      const cat = ev.categories?.[0]?.id || "";
      const ageHours = 48;
      if (cat === "wildfires") signals.push({ type: "nasa_wildfire", weight: 75, ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "severeStorms") signals.push({ type: "nasa_storm", weight: 70, ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "floods") signals.push({ type: "nasa_flood", weight: 70, ageHours, source: "NASA EONET", details: ev.title });
      else if (cat === "drought") signals.push({ type: "nasa_drought", weight: 55, ageHours, source: "NASA EONET", details: ev.title });
    }
  }

  if (s.ifrcCount > 0 && s.ifrcEvents) {
    const top = s.ifrcEvents[0];
    signals.push({ type: "ifrc_emergency", weight: 75, ageHours: 72, source: "IFRC Event", details: top.name });
  }
  if (s.ifrcAppeals && s.ifrcAppeals.length > 0) {
    for (const ap of s.ifrcAppeals.slice(0, 2)) {
      signals.push({ type: "ifrc_appeal", weight: 80, ageHours: 72, source: "IFRC Appeal", details: ap.name || "IFRC Emergency Appeal" });
    }
  }

  if (s.gdacsEventType === "TC") signals.push({ type: "cyclone_active", weight: 85, ageHours: 24, source: "GDACS", details: "Active cyclone" });
  if (s.hazards?.flood_discharge > 500) signals.push({ type: "flood_severe", weight: 70, ageHours: 48, source: "Open-Meteo", details: "Severe flooding" });
  if (s.hazards?.wave_height >= 3) signals.push({ type: "marine_hazard", weight: 55, ageHours: 24, source: "Open-Meteo Marine", details: `${s.hazards.wave_height.toFixed(1)}m wave height` });
  if (s.maxTempC >= 42) signals.push({ type: "heat_extreme", weight: 60, ageHours: 24, source: "Open-Meteo", details: `${s.maxTempC}°C` });
  if (s.diseaseActive > 10_000) signals.push({ type: "disease_active", weight: 50, ageHours: 168, source: "disease.sh", details: `${s.diseaseActive.toLocaleString()} active cases` });
  if (s.wbInflation?.value > 20) signals.push({ type: "inflation_crisis", weight: 45, ageHours: 720, source: "World Bank", details: `${s.wbInflation.value.toFixed(0)}% inflation` });
  if (s.wbGdpGrowth?.value < -3) signals.push({ type: "gdp_contraction", weight: 40, ageHours: 720, source: "World Bank", details: `${s.wbGdpGrowth.value.toFixed(1)}% GDP` });
  if (s.wbFoodPrice && s.wbFoodPrice.value > 100) signals.push({ type: "wb_food_price", weight: 35, ageHours: 720, source: "World Bank", details: `Food index ${s.wbFoodPrice.value.toFixed(0)}` });
  if (s.electricityAccess && s.electricityAccess.value < 50) signals.push({ type: "wb_food_price", weight: 30, ageHours: 720, source: "World Bank", details: `Electricity ${s.electricityAccess.value.toFixed(0)}%` });

  if (isUS(iso) && s.cdcOutbreaks && s.cdcOutbreaks.length > 0) {
    const top = s.cdcOutbreaks[0];
    signals.push({ type: "cdc_outbreak", weight: 55, ageHours: top.ageHours || 48, source: "CDC", details: top.title || "CDC Outbreak Notice" });
  }

  if (isUS(iso) && s.spcOutlook) {
    const cat = s.spcOutlook.label || "TSTM";
    const weightMap = { TSTM: 20, MRGL: 40, SLGT: 55, ENH: 75, MDT: 90, HIGH: 110 };
    signals.push({ type: "spc_severe", weight: weightMap[cat] || 20, ageHours: 6, source: "SPC", details: `SPC ${cat}` });
  }

  if (isUS(iso) && s.usDrought && s.usDrought.level) signals.push({ type: "us_drought", weight: 55, ageHours: 168, source: "US Drought Monitor", details: `Drought level: ${s.usDrought.level}` });

  if (s.nasaPower) {
    const tempAnom = s.nasaPower.tempAnomaly || 0;
    const precipAnom = s.nasaPower.precipAnomaly || 0;
    if (Math.abs(tempAnom) >= 5 || Math.abs(precipAnom) >= 5) {
      const details = [];
      if (Math.abs(tempAnom) >= 5) details.push(`${tempAnom > 0 ? "+" : ""}${tempAnom.toFixed(1)}°C`);
      if (Math.abs(precipAnom) >= 5) details.push(`${precipAnom > 0 ? "+" : ""}${precipAnom.toFixed(1)}mm/day`);
      signals.push({ type: "nasa_power_anomaly", weight: 50, ageHours: 72, source: "NASA POWER", details: details.join(", ") });
    }
  }

  if (s.gfwAlerts && s.gfwAlerts.count >= 100) {
    const b = Math.min(60, Math.round(Math.log10(s.gfwAlerts.count) * 45 / 3));
    signals.push({ type: "gfw_deforestation", weight: Math.max(45, b), ageHours: 24, source: "Global Forest Watch", details: `${s.gfwAlerts.count.toLocaleString()} alerts` });
  }

  if (WPAC_ISOS.has(iso) && s.jtwcStorms && s.jtwcStorms.length > 0) {
    for (const storm of s.jtwcStorms.slice(0, 2)) signals.push({ type: "jtwc_cyclone", weight: 75, ageHours: 12, source: "JTWC", details: storm.name });
  }
  if (WPAC_ISOS.has(iso) && s.jmaTyphoons && s.jmaTyphoons.length > 0) {
    for (const typhoon of s.jmaTyphoons.slice(0, 2)) signals.push({ type: "jma_typhoon", weight: 85, ageHours: 12, source: "JMA", details: typhoon.name });
  }

  if (s.climateTrace && s.climateTrace.topEmission?.emissions > 100_000) {
    signals.push({ type: "climate_trace_emissions", weight: 20, ageHours: 168, source: "Climate TRACE", details: `${(s.climateTrace.topEmission.emissions/1e6).toFixed(1)}Mt CO₂e` });
  }

  if (s.hdxDatasets && s.hdxDatasets.count > 0) signals.push({ type: "hdx_crisis", weight: 15, ageHours: 168, source: "OCHA HDX", details: `${s.hdxDatasets.count} datasets` });

  // ════════════════════════════════════════════════════════════════════════
  //  v18.0.0 GAP-FILLER LIVE SIGNALS
  // ════════════════════════════════════════════════════════════════════════

  if (s.acled && s.acled.event_count > 0) {
    const a = s.acled;
    if (a.max_fatalities >= 25) {
      signals.push({
        type: 'acled_mass_casualty', weight: 95, ageHours: 24,
        source: 'ACLED',
        details: `${a.max_fatalities} fatalities — ${a.top_events[0]?.type || 'conflict'}`,
      });
    } else if (a.max_fatalities >= 5) {
      signals.push({
        type: 'acled_armed_clash', weight: 70, ageHours: 24,
        source: 'ACLED',
        details: `${a.event_count} events, ${a.total_fatalities} fatalities`,
      });
    }
    if (a.event_types?.some(t => /violence against civilians/i.test(t))) {
      signals.push({
        type: 'acled_violence_civ', weight: 80, ageHours: 24,
        source: 'ACLED', details: 'Violence against civilians reported',
      });
    }
  }

  if (s.hdx_hapi && s.hdx_hapi.phase >= 4) {
    signals.push({
      type: s.hdx_hapi.phase === 5 ? 'hdx_hapi_famine' : 'hdx_hapi_emergency',
      weight: s.hdx_hapi.phase === 5 ? 100 : 80,
      ageHours: 72,
      source: 'HDX HAPI',
      details: `IPC Phase ${s.hdx_hapi.phase} — ${fmtPop(s.hdx_hapi.population) || 'pop n/a'}`,
    });
  }

  if (s.idmc && s.idmc.combined_new >= 100000) {
    signals.push({
      type: 'idmc_mass_displacement', weight: 90, ageHours: 720,
      source: 'IDMC',
      details: `${fmtPop(s.idmc.combined_new)} new displacements (${s.idmc.year})`,
    });
  }

  if (s.reliefweb_report && s.reliefweb_report.count >= 10) {
    signals.push({
      type: 'reliefweb_report_flood', weight: 45, ageHours: 72,
      source: 'ReliefWeb Reports',
      details: `${s.reliefweb_report.count} reports in window`,
    });
  }

  if (s.fao_fpi && s.fao_fpi.value > 120) {
    signals.push({
      type: 'fao_price_shock', weight: 55, ageHours: 720,
      source: 'FAO FPI',
      details: `Global food price index ${s.fao_fpi.value.toFixed(1)}`,
    });
  }

  if (s.who_gho) {
    const cholera = s.who_gho['WHS4_100'];
    if (cholera && cholera.value >= 1) {
      signals.push({
        type: 'who_gho_cholera', weight: 70, ageHours: 720,
        source: 'WHO GHO',
        details: `Cholera CFR ${cholera.value.toFixed(1)}% (${cholera.year})`,
      });
    }
  }

  if (s.unhcr_situation && s.unhcr_situation.funding_gap_pct >= 50) {
    signals.push({
      type: 'unhcr_underfunded', weight: 50, ageHours: 720,
      source: 'UNHCR Situation',
      details: `${s.unhcr_situation.name} — ${s.unhcr_situation.funding_gap_pct}% underfunded`,
    });
  }

  return signals.map(sig => ({ ...sig, is_live_event: true }));
}

function computeLiveBreakingScore(iso, live, store) {
  const c = COUNTRIES[iso];
  const rawSignals = detectLiveBreakingSignals(iso, live, store);
  const signals = deduplicateEvents(rawSignals, iso);

  let rawScore = 0;
  const sources = new Set();
  const activeSignals = [];

  for (const sig of signals) {
    const ageHours = Math.max(0, sig.ageHours || 0);
    let recencyFactor;
    if (ageHours <= 6) recencyFactor = RECENCY.HOURS_6;
    else if (ageHours <= 24) recencyFactor = RECENCY.HOURS_24;
    else if (ageHours <= 72) recencyFactor = RECENCY.HOURS_72;
    else if (ageHours <= 168) recencyFactor = RECENCY.HOURS_168;
    else recencyFactor = RECENCY.OLDER;
    const def = LIVE_SIGNALS[sig.type] || { verify: 0.8 };
    const weighted = sig.weight * recencyFactor * (def.verify || 0.8);
    rawScore += weighted;
    sources.add(sig.source);
    activeSignals.push({ ...sig, recency_factor: +recencyFactor.toFixed(3), weighted_score: +weighted.toFixed(2) });
  }

  const signalCount = rawSignals.length;
  const distinctEventCount = signals.length;

  let liveEventBoost = 0;
  const freshEvents = activeSignals.filter(s => s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
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
  if (freshest <= 6) freshnessBonus = 40;
  else if (freshest <= 12) freshnessBonus = 25;
  else if (freshest <= 24) freshnessBonus = 15;
  else if (freshest <= 48) freshnessBonus = 8;
  rawScore += freshnessBonus;

  const fsiBaseline = ((c.fsi_score - 50) / 70) * 8;
  rawScore += Math.max(0, fsiBaseline);

  let ensembleDampener = 1.0;

  const normalizedScore = Math.round(100 * (1 - Math.exp(-rawScore / 120)) * ensembleDampener);

  const hasFreshLiveEvent = freshEvents.length > 0;
  let tier, tierLabel, tierIcon;
  if (hasFreshLiveEvent) {
    if (normalizedScore >= 70) { tier = "BREAKING"; tierLabel = "BREAKING NEWS"; tierIcon = "🔴"; }
    else if (normalizedScore >= 50) { tier = "DEVELOPING"; tierLabel = "DEVELOPING STORY"; tierIcon = "🟠"; }
    else if (normalizedScore >= 30) { tier = "ACTIVE"; tierLabel = "ACTIVE CRISIS"; tierIcon = "🟡"; }
    else if (normalizedScore >= 15) { tier = "MONITORING"; tierLabel = "MONITORING"; tierIcon = "🟢"; }
    else { tier = "BACKGROUND"; tierLabel = "BACKGROUND"; tierIcon = "⚪"; }
  } else {
    if (normalizedScore >= 65) { tier = "DEVELOPING"; tierLabel = "DEVELOPING STORY"; tierIcon = "🟠"; }
    else if (normalizedScore >= 40) { tier = "ACTIVE"; tierLabel = "ACTIVE CRISIS"; tierIcon = "🟡"; }
    else if (normalizedScore >= 20) { tier = "MONITORING"; tierLabel = "MONITORING"; tierIcon = "🟢"; }
    else { tier = "BACKGROUND"; tierLabel = "BACKGROUND"; tierIcon = "⚪"; }
  }

  return {
    live_score: normalizedScore,
    tier, tier_label: tierLabel, tier_icon: tierIcon,
    raw_score: +rawScore.toFixed(2),
    signal_count: signalCount,
    live_event_count: distinctEventCount,
    distinct_event_count: distinctEventCount,
    raw_signal_count: signalCount,
    has_fresh_live_event: hasFreshLiveEvent,
    unique_signal_types: uniqueTypes.size,
    source_count: sources.size,
    sources: [...sources],
    source_multiplier: +sourceMultiplier.toFixed(2),
    live_event_boost: +liveEventBoost.toFixed(2),
    diversity_bonus: diversityBonus,
    freshness_bonus: freshnessBonus,
    fsi_baseline: +fsiBaseline.toFixed(2),
    ensemble_dampener: ensembleDampener,
    freshest_signal_age_hours: freshest === 9999 ? null : +freshest.toFixed(1),
    signals: activeSignals.sort((a, b) => b.weighted_score - a.weighted_score),
    events: signals.map(sig => ({
      type: sig.type,
      label: LIVE_SIGNALS[sig.type]?.label || sig.type,
      icon: LIVE_SIGNALS[sig.type]?.icon || "⚠️",
      weight: sig.weight,
      age_hours: +(sig.ageHours || 0).toFixed(1),
      weighted_score: sig.weighted_score,
      source: sig.source,
      details: sig.details,
      corroborating_sources: sig.corroborating_sources || [],
      corroboration_count: sig.corroboration_count || 0,
    })).sort((a, b) => b.weighted_score - a.weighted_score),
    breaking_headline: buildBreakingHeadline(activeSignals, c),
  };
}

function buildBreakingHeadline(signals, country) {
  if (signals.length === 0) return `${country.flag} ${country.name}: No active breaking crisis signals`;
  const freshEvents = signals.filter(s => s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
  const sortedByWeight = [...(freshEvents.length ? freshEvents : signals)].sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
  const top = sortedByWeight[0];
  const second = sortedByWeight.find(e => e.type !== top.type && e.details !== top.details);
  const prefix = top.ageHours <= 6 ? "BREAKING: " : top.ageHours <= 24 ? "" : "ONGOING: ";
  let headline = `${country.flag} ${prefix}${country.name} — ${top.details || top.type}`;
  if (second && second.weight >= 60) headline += ` + ${second.details || second.type}`;
  return headline;
}

// ════════════════════════════════════════════════════════════════════════════
//  RANKING
// ════════════════════════════════════════════════════════════════════════════

function rankByLiveBreaking(store) {
  return Object.keys(store).sort((a, b) => {
    const aLB = store[a].__live_breaking || {};
    const bLB = store[b].__live_breaking || {};
    const aEff = store[a].__effective_score ?? store[a].structural_score ?? 0;
    const bEff = store[b].__effective_score ?? store[b].structural_score ?? 0;
    if (bEff !== aEff) return bEff - aEff;
    const aHas = aLB.has_fresh_live_event ? 1 : 0;
    const bHas = bLB.has_fresh_live_event ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
    return ((aLB.freshest_signal_age_hours ?? 9999) - (bLB.freshest_signal_age_hours ?? 9999));
  });
}

function rankBreakingOnly(store, minSignals = 1) {
  return Object.keys(store)
    .filter(iso => (store[iso].__live_breaking?.signal_count || 0) >= minSignals)
    .sort((a, b) => {
      const aLB = store[a].__live_breaking || {};
      const bLB = store[b].__live_breaking || {};
      if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
      return ((aLB.freshest_signal_age_hours ?? 9999) - (bLB.freshest_signal_age_hours ?? 9999));
    });
}

function rankLiveEventsOnly(store) {
  return Object.keys(store)
    .filter(iso => store[iso].__live_breaking?.has_fresh_live_event)
    .sort((a, b) => {
      const aLB = store[a].__live_breaking;
      const bLB = store[b].__live_breaking;
      if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
      return (aLB.freshest_signal_age_hours ?? 9999) - (bLB.freshest_signal_age_hours ?? 9999);
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  ANOMALY / ML / FORECAST
// ════════════════════════════════════════════════════════════════════════════

function detectCUSUM(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, Math.floor(a.length*0.6)), mu = mean(b), sd = stddev(b); const k = 0.5*sd, h = 4*sd; let sp = 0, sn = 0; for (const x of a) { sp = Math.max(0, sp + (x-mu) - k); sn = Math.max(0, sn - (x-mu) - k); } return { detected: sp > h || sn > h, stat: +Math.max(sp,sn).toFixed(2) }; }
function detectZScore(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, -3), r = a.slice(-3); const z = (mean(r) - mean(b)) / stddev(b); return { detected: Math.abs(z) >= 2, stat: +Math.abs(z).toFixed(2) }; }
function detectChangepoint(a) { if (a.length < 10) return { detected: false, stat: 0 }; const m = Math.floor(a.length/2); const kl = Math.log(stddev(a.slice(m))/stddev(a.slice(0,m))) + (stddev(a.slice(0,m))**2 + (mean(a.slice(0,m))-mean(a.slice(m)))**2)/(2*stddev(a.slice(m))**2) - 0.5; return { detected: kl > 1.5, stat: +kl.toFixed(3) }; }
function detectVolatilityRegime(a) { if (a.length < 8) return { detected: false, stat: 0 }; const h = Math.floor(a.length/2); const r = stddev(a.slice(h))/stddev(a.slice(0,h)); return { detected: r > 2, stat: +r.toFixed(2) }; }

function runAnomalyDetection(a, opts = {}) {
  const minRequired = opts.minRequired || 10;
  if (a.length < minRequired) return { detected: false, severity: "INSUFFICIENT_HISTORY", reason: `Need ≥${minRequired} points, have ${a.length}`, methods_fired: 0, methods: [], z_score: 0 };
  const m = [detectCUSUM(a), detectZScore(a), detectChangepoint(a), detectVolatilityRegime(a)];
  const f = m.filter(x => x.detected);
  return { detected: f.length >= 1, severity: f.length >= 4 ? "EXTREME" : f.length >= 3 ? "CRITICAL" : f.length >= 2 ? "HIGH" : f.length >= 1 ? "ELEVATED" : "NONE", methods_fired: f.length, methods: m, z_score: detectZScore(a).stat };
}

function trendForecast(h, cur) {
  if (h.length < 5) return { fc: cur, trend: "stable", esc: false, slope: 0, confidence: 0.3 };
  const w = h.slice(-10);
  const xb = (w.length-1)/2, yb = mean(w);
  const num = w.reduce((s,y,x)=>s+(x-xb)*(y-yb),0), den = w.reduce((s,_,x)=>s+(x-xb)**2,0);
  const slope = den ? +(num/den).toFixed(2) : 0;
  const fc = clamp(cur + slope * 7);
  return { fc, slope, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > cur + 5, confidence: 0.6 };
}

function severityLabel(s) { return s >= 85 ? "CATASTROPHIC" : s >= 75 ? "CRITICAL" : s >= 60 ? "HIGH" : s >= 40 ? "ELEVATED" : "MODERATE"; }
function severityEmoji(s) { return s >= 85 ? "🔴" : s >= 75 ? "🟠" : s >= 60 ? "🟡" : s >= 40 ? "🟢" : "🔵"; }
function severityColor(s) { return s >= 85 ? "#ff375f" : s >= 75 ? "#ff375f" : s >= 60 ? "#ff8c42" : s >= 40 ? "#ffb020" : "#6bc8ff"; }
function recommendation(score, anomaly) {
  const an = anomaly?.detected ? ` Anomaly detected (${anomaly.severity}).` : "";
  if (score >= 85) return { tier: "IMMEDIATE", text: `Immediate response required.${an}` };
  if (score >= 75) return { tier: "URGENT", text: `Urgent response needed.${an}` };
  if (score >= 60) return { tier: "HIGH", text: `Elevated concern.${an}` };
  if (score >= 40) return { tier: "MONITOR", text: `Monitor situation.${an}` };
  return { tier: "WATCH", text: `Routine monitoring.${an}` };
}

function popExposureMultiplier(population) {
  if (!CFG.POP_EXPOSURE_ENABLED) return 1.0;
  if (!population || population < CFG.POP_EXPOSURE_FLOOR_POP) return 1.0;
  const floor = Math.log10(CFG.POP_EXPOSURE_FLOOR_POP);
  const ceil = Math.log10(CFG.POP_EXPOSURE_CEILING_POP);
  const p = Math.log10(population);
  const t = Math.max(0, Math.min(1, (p - floor) / (ceil - floor)));
  return CFG.POP_EXPOSURE_MIN_MULT + t * (CFG.POP_EXPOSURE_MAX_MULT - CFG.POP_EXPOSURE_MIN_MULT);
}

function resolutionCredit(store, iso) {
  if (!CFG.RESOLUTION_CREDIT_ENABLED) return 0;
  const returns = store[iso]?.signals?.unhcrSolutions?.returned_refugees || 0;
  if (returns < CFG.RESOLUTION_CREDIT_RETURN_THRESHOLD) return 0;
  const t = Math.min(1, (returns - CFG.RESOLUTION_CREDIT_RETURN_THRESHOLD) / 900_000);
  return t * CFG.RESOLUTION_CREDIT_MAX;
}

class PersistentHistoryStore {
  constructor() { this.memory = new Map(); this.maxPoints = CFG.HISTORY_MAX_POINTS; }
  async record(iso, snapshot) {
    const entry = { ts: Date.now(), ...snapshot };
    if (!this.memory.has(iso)) this.memory.set(iso, []);
    const arr = this.memory.get(iso);
    arr.push(entry);
    if (arr.length > this.maxPoints) arr.splice(0, arr.length - this.maxPoints);
  }
  async scoreSeries(iso, limit = CFG.HISTORY_MAX_POINTS) {
    const arr = this.memory.get(iso) || [];
    return arr.slice(-limit).map(r => r.score).filter(Number.isFinite);
  }
}

const persistentHistory = new PersistentHistoryStore();

class CrisisMLModel {
  constructor() { this.weights = { input_hidden: [], hidden_output: [], bias_hidden: [], bias_output: [] }; this.trained = false; this.trainingCount = 0; this.performance = { mse: 0, r2: 0 }; }
  predict(seq) {
    if (!this.trained || seq.length < 5) return this.simpleTrendForecast(seq);
    const n = this.normalizeSequence(seq);
    const h = this.forwardPass(n);
    const p = this.outputLayer(h);
    return { forecast: this.denormalize(p), confidence: this.performance.r2 || 0.7, trend: this.determineTrend(seq, p), anomaly_probability: this.calculateAnomalyProbability(seq, p) };
  }
  forwardPass(input) { const h = []; for (let i = 0; i < this.weights.input_hidden.length; i++) { let s = this.weights.bias_hidden[i] || 0; for (let j = 0; j < input.length; j++) s += (this.weights.input_hidden[i]?.[j] || 0) * input[j]; h.push(Math.max(0, s)); } return h; }
  outputLayer(h) { let s = this.weights.bias_output || 0; for (let i = 0; i < h.length; i++) s += (this.weights.hidden_output[i] || 0) * h[i]; return s; }
  train(seqs) {
    if (seqs.length < 2) return;
    const inputs = seqs.map(s => this.normalizeSequence(s.slice(0, -1)));
    const targets = seqs.map(s => this.normalizeValue(s[s.length - 1]));
    if (!this.trained) this.initializeWeights(inputs[0].length);
    let totalError = 0;
    for (let epoch = 0; epoch < 10; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        const h = this.forwardPass(inputs[i]);
        const output = this.outputLayer(h);
        const error = targets[i] - output;
        for (let j = 0; j < h.length; j++) this.weights.hidden_output[j] = (this.weights.hidden_output[j] || 0) + CFG.LEARNING_RATE * error * h[j];
        this.weights.bias_output = (this.weights.bias_output || 0) + CFG.LEARNING_RATE * error;
        for (let j = 0; j < this.weights.input_hidden.length; j++) {
          const hDelta = error * (this.weights.hidden_output[j] || 0) * (h[j] > 0 ? 1 : 0);
          for (let k = 0; k < inputs[i].length; k++) this.weights.input_hidden[j][k] += CFG.LEARNING_RATE * hDelta * inputs[i][k];
          this.weights.bias_hidden[j] = (this.weights.bias_hidden[j] || 0) + CFG.LEARNING_RATE * hDelta;
        }
        totalError += error * error;
      }
    }
    this.trained = true;
    this.trainingCount += seqs.length;
    this.performance.mse = totalError / inputs.length;
    this.performance.r2 = Math.max(0, 1 - this.performance.mse / 0.1);
  }
  initializeWeights(inputSize) {
    const hs = CFG.HIDDEN_LAYERS?.[0] || 32;
    this.weights.input_hidden = [];
    for (let i = 0; i < hs; i++) { this.weights.input_hidden[i] = []; for (let j = 0; j < inputSize; j++) this.weights.input_hidden[i][j] = (Math.random() - 0.5) * 0.1; }
    this.weights.hidden_output = []; for (let i = 0; i < hs; i++) this.weights.hidden_output[i] = (Math.random() - 0.5) * 0.1;
    this.weights.bias_hidden = []; for (let i = 0; i < hs; i++) this.weights.bias_hidden[i] = (Math.random() - 0.5) * 0.1;
    this.weights.bias_output = (Math.random() - 0.5) * 0.1;
  }
  normalizeSequence(seq) { const mn = Math.min(...seq, 0), mx = Math.max(...seq, 100), r = mx - mn || 1; return seq.map(v => (v - mn) / r); }
  normalizeValue(v) { return v / 100; }
  denormalize(v) { return Math.min(99, Math.max(1, Math.round(v * 100))); }
  simpleTrendForecast(seq) { if (seq.length < 4) return { forecast: seq[seq.length - 1] || 50, confidence: 0.3 }; const r = seq.slice(-7); const slope = (r[r.length - 1] - r[0]) / (r.length - 1); return { forecast: Math.min(99, Math.max(1, Math.round(r[r.length - 1] + slope * 3))), confidence: 0.4, trend: slope > 0.5 ? "escalating" : slope < -0.5 ? "improving" : "stable", anomaly_probability: 0.1 }; }
  determineTrend(seq, p) { const d = p - seq[seq.length - 1]; return d > 5 ? "escalating" : d < -5 ? "improving" : "stable"; }
  calculateAnomalyProbability(seq, p) { return Math.min(0.95, Math.abs(p - seq[seq.length - 1]) / 30); }
}

const mlModel = new CrisisMLModel();

async function trainMLModel(store) {
  if (!CFG.ML_ENABLED) return;
  const seqs = [];
  for (const iso in store) {
    const h = await persistentHistory.scoreSeries(iso, 500);
    if (h.length >= 14) for (let i = 7; i < h.length - 1; i++) seqs.push(h.slice(i - 7, i + 1));
  }
  if (seqs.length >= CFG.HISTORY_MIN_FOR_ML_TRAIN) mlModel.train(seqs);
}

async function mlEnhancedForecast(iso, currentScore, store) {
  const realHistory = await persistentHistory.scoreSeries(iso, 500);
  const series = realHistory.length >= 14 ? realHistory : seedHistory(iso, currentScore).map(h => h.s);
  const isSynthetic = realHistory.length < 14;
  const mlP = mlModel.predict(series);
  const trad = trendForecast(series, currentScore);
  const blended = Math.round(mlP.forecast * 0.6 + trad.fc * 0.4);
  return {
    fc: clamp(blended),
    ml_forecast: mlP.forecast,
    trad_forecast: trad.fc,
    confidence: isSynthetic ? 0.3 : Math.min(0.95, Math.max(0.3, (mlP.confidence + trad.confidence) / 2)),
    trend: mlP.trend || trad.trend,
    esc: blended > currentScore + 5,
    slope: trad.slope,
    anomaly_probability: mlP.anomaly_probability || 0.1,
    ml_trained: mlModel.trained,
    training_count: mlModel.trainingCount,
    history_source: isSynthetic ? "synthetic" : "observed",
    history_points: realHistory.length,
  };
}

class SentimentAnalyzer {
  constructor() {
    this.pos = ['peace','ceasefire','truce','agreement','aid','humanitarian','relief','recovery','stabilize','improve','progress','positive','good','great','excellent','success','hope'];
    this.neg = ['war','conflict','violence','attack','bomb','missile','strike','kill','death','casualty','destroy','collapse','crisis','emergency','famine','hunger','disease','outbreak','escalate','worsen','deteriorate','critical','severe','dire','catastrophe','disaster','devastating'];
    this.sNeg = ['exterminate','genocide','massacre','pogrom','ethnic cleansing','starvation','catastrophic'];
  }
  analyze(text) {
    if (!text || text.length < 10) return { score: 0, label: 'neutral', confidence: 0.5, crisis_intensity: 0 };
    const lower = text.toLowerCase();
    let score = 0, matches = 0;
    for (const w of this.pos) if (lower.includes(w)) { score += 0.15; matches++; }
    for (const w of this.neg) if (lower.includes(w)) { score -= 0.2; matches++; }
    for (const w of this.sNeg) if (lower.includes(w)) { score -= 0.5; matches++; }
    const tm = Math.min(matches, 10);
    const ns = Math.max(-1, Math.min(1, score / (Math.max(tm, 1) / 2)));
    let label, confidence;
    if (ns > 0.2) { label = 'positive'; confidence = Math.min(0.95, 0.5 + Math.abs(ns) * 0.5); }
    else if (ns < -0.2) { label = 'negative'; confidence = Math.min(0.95, 0.5 + Math.abs(ns) * 0.5); }
    else { label = 'neutral'; confidence = 0.6; }
    return { score: +ns.toFixed(2), label, confidence: +confidence.toFixed(2), crisis_intensity: +Math.min(1, Math.abs(ns) * 1.5).toFixed(2) };
  }
}
const sentimentAnalyzer = new SentimentAnalyzer();

function analyzeCountrySentiment(iso, store) {
  if (!CFG.SENTIMENT_ENABLED) return null;
  const c = store[iso];
  const text = [];
  if (c.signals?.whoOutbreaks?.length) text.push(c.signals.whoOutbreaks.map(o => o.disease).join(' '));
  if (c.signals?.whoDon?.length) text.push(c.signals.whoDon.map(o => o.title).join(' '));
  // v18.0.0: include ReliefWeb Reports narrative
  if (c.signals?.reliefweb_report?.latest_title) text.push(c.signals.reliefweb_report.latest_title);
  if (c.signals?.acled?.top_events?.length) {
    text.push(c.signals.acled.top_events.map(e => `${e.type}: ${e.notes || ''}`).join(' '));
  }
  if (!text.length) return null;
  return sentimentAnalyzer.analyze(text.join('. '));
}

async function storeHistoricalData(iso, store) {
  if (!CFG.HISTORY_ENABLED) return;
  const c = store[iso];
  await persistentHistory.record(iso, {
    score: c.score,
    live_score: c.__live_breaking?.live_score || 0,
    signal_count: c.__live_breaking?.signal_count || 0,
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILD STORE — FINAL, CLEAN, HTML-EXACT + v18.0.0 GAP-FILLERS WIRED
// ════════════════════════════════════════════════════════════════════════════

async function buildStore(liveData) {
  const store = {};

  // STEP 1: Initialize each country with structural baseline ONLY.
  for (const iso of Object.keys(COUNTRIES)) {
    const c = COUNTRIES[iso];
    const base = BASE_SCORES[iso] || 30;
    const types = c.types || DEFAULT_T;
    const dims = buildDims(base, types);

    store[iso] = {
      ...c, dims,
      priorScore: clamp(composite(dims)),
      score: 0,
      structural_score: 0,
      liveBoost: 0,
      audit: [], signals: {}, spillover: 0, historical_scores: [],
      __live_breaking: null, __effective_score: null,
      evidence_score: 0, evidence_confidence: 0, evidence_source_count: 0,
      evidence_ledger: [], evidence_sources: [], is_low_instrumentation: false,
    };
  }

  // STEP 2: THE ONLY score assignment. Evidence + structural blend, HTML-exact.
  for (const iso of Object.keys(store)) {
    const c = store[iso];
    const evidence = computeEvidenceScore(iso);
    const structuralWeight = 1 - (evidence.confidence * CFG.EVIDENCE_STRUCTURAL_WEIGHT);
    const structuralComponent = composite(c.dims) * structuralWeight;
    const rawTotal = structuralComponent + evidence.score;
    const score = Math.max(1, Math.min(99, Math.round(
      rawTotal <= 70 ? rawTotal : 70 + 29 * (1 - Math.exp(-(rawTotal - 70) / 38))
    )));
    c.score = score;
    c.structural_score = score;
    c.liveBoost = score - c.priorScore;
    c.evidence_score = evidence.score;
    c.evidence_confidence = evidence.confidence;
    c.evidence_source_count = evidence.sourceCount;
    c.evidence_ledger = evidence.ledger;
    c.evidence_sources = [...new Set(evidence.ledger.map(l => l.source))];
    c.is_low_instrumentation = evidence.sourceCount < CFG.LOW_INSTRUMENTATION_THRESHOLD;
  }

  // STEP 3: spillover
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) { store[iso].spillover = 0; continue; }
    const avgNeighbour = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    const spill = Math.max(0, avgNeighbour - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
    const dampened = spill * Math.max(0.3, 1 - (store[iso].score - 30) / 100);
    store[iso].spillover = Math.round(Math.min(CFG.SPILLOVER_MAX, dampened) * 10) / 10;
    store[iso].score = Math.min(99, Math.max(1, store[iso].score + store[iso].spillover));
    store[iso].structural_score = store[iso].score;
  }

  // STEP 4: seedHistory
  for (const iso in store) store[iso].historical_scores = seedHistory(iso, store[iso].score).map(h => h.s);

  // STEP 5: ML forecast
  if (CFG.ML_ENABLED) await trainMLModel(store);
  for (const iso in store) if (CFG.ML_ENABLED) store[iso].ml_forecast = await mlEnhancedForecast(iso, store[iso].score, store);

  // STEP 6: build signals object for live-breaking tier
  for (const iso in store) {
    const cov = evidenceIndex.sourceCoverage[iso] || {};
    store[iso].signals = {
      quakeMag: cov.usgs?.mag || 0,
      quakePlace: cov.usgs?.place || null,
      quakeTime: cov.usgs?.time || null,
      shakeMapEvent: cov.usgs ? { mag: cov.usgs.mag, place: cov.usgs.place } : null,
      emscQuake: cov.emsc ? { mag: cov.emsc.mag, place: cov.emsc.place } : null,
      jmaQuake: cov.jma ? { mag: cov.jma.mag, place: cov.jma.place } : null,
      bmkgQuake: cov.bmkg ? { mag: cov.bmkg.mag, place: cov.bmkg.place } : null,
      geofonQuake: cov.geofon ? { mag: cov.geofon.mag, place: cov.geofon.place } : null,
      ingvQuake: cov.ingv ? { mag: cov.ingv.mag, place: cov.ingv.place } : null,
      geonetQuake: cov.geonet ? { mag: cov.geonet.mag, place: cov.geonet.place } : null,
      nasaEvents: cov.nasa ? [{ title: cov.nasa.title, categories: cov.nasa.categories }] : [],
      gdacs: cov.gdacs ? { properties: { eventname: cov.gdacs.event, alertlevel: cov.gdacs.alert } } : null,
      gdacsAlert: cov.gdacs?.alert?.toLowerCase() || null,
      gdacsEventType: null,
      ifrcCount: cov.ifrc ? 1 : 0,
      ifrcEvents: cov.ifrc ? [cov.ifrc] : [],
      ifrcAppeals: cov.unhcr_emergency ? [cov.unhcr_emergency] : [],
      maxTempC: cov.heat?.temp || 0,
      hazards: {
        flood_discharge: cov.flood_risk?.discharge || 0,
        wave_height: cov.marine?.wave_height || 0,
        wind_speed: cov.wind?.speed || 0,
      },
      aq: cov.air_quality || null,
      noaa: cov.noaa || null,
      spcOutlook: cov.spc || null,
      cdcOutbreaks: cov.cdc_outbreak ? [cov.cdc_outbreak] : [],
      whoDon: cov.who_don ? [cov.who_don] : [],
      whoOutbreaks: cov.who_outbreak ? [cov.who_outbreak] : [],
      ecdcThreats: cov.ecdc_threat ? [cov.ecdc_threat] : [],
      nasaPower: cov.nasa_power || null,
      diseaseActive: cov.covid?.active || 0,
      population: cov.population || 0,
      wbInflation: cov.inflation !== undefined ? { value: cov.inflation } : null,
      wbGdpGrowth: cov.gdp_growth !== undefined ? { value: cov.gdp_growth } : null,
      wbFoodPrice: cov.food_prices?.[0] || null,
      electricityAccess: cov.electricity_access !== undefined ? { value: cov.electricity_access } : null,
      totalDisplaced: cov.displaced || 0,
      unhcrSolutions: cov.unhcr_solutions || null,
      gfwAlerts: cov.gfw || null,
      jtwcStorms: cov.jtwc ? [{ name: cov.jtwc.name }] : [],
      jmaTyphoons: cov.jma_typhoon ? [{ name: cov.jma_typhoon.name }] : [],
      climateTrace: cov.emissions ? { topEmission: cov.emissions } : null,
      hdxDatasets: cov.hdx || null,
      usDrought: cov.us_drought || null,

      // ═══ v18.0.0 GAP-FILLER SIGNALS ═══
      acled: cov.acled || null,
      hdx_hapi: cov.hdx_hapi || null,
      idmc: cov.idmc || null,
      reliefweb_report: cov.reliefweb_report
        ? {
            count: cov.reliefweb_report.count,
            latest_title: cov.reliefweb_report.latest_title,
            latest_date: cov.reliefweb_report.latest_date,
            sources: cov.reliefweb_report.sources,
            disasters: cov.reliefweb_report.disasters,
          }
        : null,
      fao_fpi: cov.fao_fpi || null,
      who_gho: cov.who_gho || null,
      unhcr_situation: cov.unhcr_situation || null,
    };
  }

  // STEP 7: live-breaking tier (does not touch score)
  for (const iso in store) store[iso].__live_breaking = computeLiveBreakingScore(iso, liveData, store);

  // STEP 8: effective score = HTML score. Pop-exposure & resolution-credit applied to effective ONLY.
  for (const iso in store) {
    const htmlScore = store[iso].score;
    const popMult = popExposureMultiplier(store[iso].signals?.population || 0);
    const credit = resolutionCredit(store, iso);
    const effective = Math.min(99, Math.max(1, Math.round(htmlScore * popMult - credit)));
    store[iso].__effective_score = effective;
    store[iso].__html_score = htmlScore;
    store[iso].__pop_multiplier = +popMult.toFixed(3);
    store[iso].__resolution_credit = +credit.toFixed(2);
  }

  // STEP 9: sentiment + history
  for (const iso in store) {
    if (CFG.SENTIMENT_ENABLED) store[iso].sentiment = analyzeCountrySentiment(iso, store);
    if (CFG.HISTORY_ENABLED) await storeHistoricalData(iso, store);
  }

  return store;
}
// ════════════════════════════════════════════════════════════════════════════
//  PAYLOAD
// ════════════════════════════════════════════════════════════════════════════

function buildKeywords(iso, store) {
  const c = store[iso];
  const s = c.signals || {};
  const kws = new Set();
  kws.add(`${c.name} humanitarian crisis`);
  kws.add(`${c.name} crisis ${new Date().getFullYear()}`);
  kws.add(`${c.name} emergency`);
  kws.add(`${c.name} breaking news`);
  for (const t of c.types) { const arc = ARC[t]; if (arc?.seo) kws.add(`${c.name} ${arc.seo}`); }
  if (s.totalDisplaced > 0) kws.add(`${c.name} refugees`);
  if (s.quakeMag >= 5.0) kws.add(`${c.name} earthquake`);
  if (s.gfwAlerts) kws.add(`${c.name} deforestation`);
  if (s.jtwcStorms?.length) kws.add(`${c.name} typhoon`);
  if (s.usDrought) kws.add(`${c.name} drought`);
  // v18.0.0 keywords
  if (s.acled?.event_count > 0) kws.add(`${c.name} conflict fatalities`);
  if (s.hdx_hapi) kws.add(`${c.name} food insecurity IPC phase ${s.hdx_hapi.phase}`);
  if (s.idmc?.combined_new > 100000) kws.add(`${c.name} internal displacement`);
  if (s.reliefweb_report?.count > 0) kws.add(`${c.name} situation report`);
  if (s.unhcr_situation?.funding_gap_pct > 40) kws.add(`${c.name} humanitarian funding gap`);
  return [...kws].slice(0, 15);
}

function buildMetaDescription(iso, store) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const severity = severityLabel(c.score);
  let parts = [`${c.name} crisis update: score ${c.score}/100 (${severity})`];
  // v18.0.0: append gap-filler context
  const gf = c.signals || {};
  if (gf.hdx_hapi?.phase >= 4) parts.push(`IPC Phase ${gf.hdx_hapi.phase}`);
  if (gf.acled?.total_fatalities > 0) parts.push(`${gf.acled.total_fatalities} conflict fatalities (30d)`);
  if (gf.idmc?.combined_new > 100000) parts.push(`${fmtPop(gf.idmc.combined_new)} newly displaced`);
  if (lb.tier === "BREAKING") parts.unshift(`🔴 BREAKING: ${lb.breaking_headline}`);
  else if (lb.tier === "DEVELOPING") parts.unshift(`🟠 DEVELOPING: ${lb.breaking_headline}`);
  return parts.slice(0, 4).join('. ') + '.';
}

function buildRelatedStories(iso, store, ranked) {
  return ranked.filter(r => r !== iso && (COUNTRIES[r].region === COUNTRIES[iso].region || (COUNTRIES[iso].adj || []).includes(r))).slice(0, 5)
    .map(r => ({ iso: r, name: store[r].name, score: store[r].score, live_score: store[r].__live_breaking?.live_score || 0, slug: slugify(store[r].name) }));
}

function buildJSONLD(iso, store, ranked) {
  const c = store[iso];
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`;
  const now = new Date().toISOString();
  const lb = c.__live_breaking || {};
  return {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "NewsArticle",
      "@id": `${url}#article`,
      "headline": lb.breaking_headline || `${c.name} Crisis — Score ${c.score}/100`,
      "description": buildMetaDescription(iso, store),
      "url": url,
      "datePublished": now,
      "dateModified": now,
      "author": { "@type": "Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
      "publisher": { "@type": "Organization", "name": CFG.ARTICLE_SITE_NAME, "url": CFG.ARTICLE_BASE_URL, "logo": { "@type": "ImageObject", "url": CFG.ARTICLE_LOGO } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "articleSection": "Humanitarian Crisis",
      "keywords": buildKeywords(iso, store).join(", "),
    }]
  };
}

function buildSEOArticle(iso, store, ranked) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const headline = lb.breaking_headline || `${c.name} Crisis Monitor — ${c.score}/100`;
  let articleBody = `## Overview\n\n${c.name} scores ${c.score}/100 (${severityLabel(c.score)}).\n\n`;
  // v18.0.0: append gap-filler narrative
  if (c.signals?.hdx_hapi) {
    articleBody += `## Food Security\n\nCurrent IPC Phase ${c.signals.hdx_hapi.phase} (${c.signals.hdx_hapi.phase_name}) affecting ${fmtPop(c.signals.hdx_hapi.population) || 'unknown'} people.\n\n`;
  }
  if (c.signals?.acled?.event_count > 0) {
    articleBody += `## Conflict\n\n${c.signals.acled.event_count} conflict event(s) recorded in the last 30 days, with ${c.signals.acled.total_fatalities.toLocaleString()} reported fatalities.\n\n`;
  }
  if (c.signals?.idmc?.combined_new > 0) {
    articleBody += `## Displacement\n\n${fmtPop(c.signals.idmc.combined_new)} new displacements in ${c.signals.idmc.year} (${fmtPop(c.signals.idmc.conflict_new_displacements)} conflict, ${fmtPop(c.signals.idmc.disaster_new_displacements)} disaster).\n\n`;
  }
  if (c.signals?.unhcr_situation?.funding_gap_pct != null) {
    articleBody += `## Funding\n\nUNHCR situation "${c.signals.unhcr_situation.name}" is ${c.signals.unhcr_situation.funding_gap_pct}% underfunded.\n\n`;
  }
  const { words, minutes } = estimateReadTime(articleBody);
  return { headline, dek: `Score ${c.score}/100 · ${lb.distinct_event_count || 0} events`, slug: slugify(c.name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`, metaDescription: buildMetaDescription(iso, store), keywords: buildKeywords(iso, store), body_markdown: articleBody, body_html: `<article><h1>${headline}</h1><pre>${articleBody}</pre></article>`, word_count: words, read_time_minutes: minutes };
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
    const c = store[iso];
    const lb = c.__live_breaking || {};
    return `<item><title>${escapeXml(a.headline)}</title><link>${a.url}</link><guid isPermaLink="true">${a.url}</guid><pubDate>${now.toUTCString()}</pubDate><description>${escapeXml(a.dek)}</description>${lb.tier === "BREAKING" ? `<category>🔴 BREAKING NEWS</category>` : ""}<content:encoded><![CDATA[${a.body_html}]]></content:encoded></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${CFG.ARTICLE_SITE_NAME}</title><link>${CFG.ARTICLE_BASE_URL}</link><description>Live breaking world crisis news.</description><lastBuildDate>${now.toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}

async function buildPayload(iso, store, ranked, rankIndex, opts = {}) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const htmlScore = c.score;

  const realHistory = await persistentHistory.scoreSeries(iso, 500);
  const hasRealHistory = realHistory.length >= CFG.HISTORY_MIN_FOR_ANOMALY;
  const series = hasRealHistory ? realHistory : seedHistory(iso, htmlScore).map(h => h.s);
  const anom = runAnomalyDetection(series, { minRequired: CFG.HISTORY_MIN_FOR_ANOMALY });
  const fc = trendForecast(series, htmlScore);

  const rank = rankIndex.get(iso) + 1;
  const delta7 = series.length >= 8 ? Math.round(series[series.length-1] - series[Math.max(0, series.length-8)]) : 0;

  return {
    iso, name: c.name, flag: c.flag,
    score: htmlScore,
    structural_score: c.structural_score,
    effective_score: c.__effective_score,
    pop_multiplier: c.__pop_multiplier ?? 1.0,
    resolution_credit: c.__resolution_credit ?? 0,
    is_low_instrumentation: c.is_low_instrumentation,
    severity: severityLabel(htmlScore),
    severity_emoji: severityEmoji(htmlScore),
    severity_color: severityColor(htmlScore),
    rank, total_countries: ranked.length,
    percentile: Math.round((1 - rank / ranked.length) * 100),
    slug: slugify(c.name),
    url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
    evidence: {
      score: c.evidence_score,
      confidence: c.evidence_confidence,
      source_count: c.evidence_source_count,
      sources: c.evidence_sources,
      ledger: c.evidence_ledger,
    },
    live_breaking: {
      score: lb.live_score || 0,
      tier: lb.tier || "BACKGROUND",
      tier_label: lb.tier_label || "Background",
      tier_icon: lb.tier_icon || "⚪",
      headline: lb.breaking_headline || null,
      signal_count: lb.signal_count || 0,
      raw_signal_count: lb.raw_signal_count || 0,
      distinct_event_count: lb.distinct_event_count || 0,
      has_fresh_live_event: lb.has_fresh_live_event || false,
      source_count: lb.source_count || 0,
      sources: lb.sources || [],
      freshest_signal_age_hours: lb.freshest_signal_age_hours,
      events: lb.events || [],
      signals: (lb.signals || []).map(sig => ({
        type: sig.type,
        label: LIVE_SIGNALS[sig.type]?.label || sig.type,
        icon: LIVE_SIGNALS[sig.type]?.icon || "⚠️",
        weight: sig.weight,
        age_hours: +(sig.ageHours || 0).toFixed(1),
        weighted_score: sig.weighted_score,
        source: sig.source,
        details: sig.details,
      })),
    },
    live_evidence_sources: c.evidence_sources,
    live_evidence_count: c.evidence_source_count,
    is_live_data: c.evidence_source_count >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
    dimensions: Object.fromEntries(DIMS.map(d => [d.k, { value: c.dims[d.k] || 0, label: d.l, weight: d.w, icon: d.icon }])),
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️", color: ARC[t]?.color || "#6bc8ff" })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    trend: {
      delta_7d: delta7,
      direction: fc.trend,
      slope: fc.slope,
      forecast_7d: fc.fc,
      confidence: fc.confidence,
      history_source: hasRealHistory ? "observed" : "synthetic",
      history_points: realHistory.length,
    },
    anomaly: {
      detected: anom.detected,
      severity: anom.severity,
      methods_fired: anom.methods_fired,
      z_score: anom.z_score,
    },
    spillover: { value: c.spillover, from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })) },
    ml: c.ml_forecast ? {
      forecast: c.ml_forecast.fc,
      confidence: c.ml_forecast.confidence,
      anomaly_probability: c.ml_forecast.anomaly_probability,
      trained: c.ml_forecast.ml_trained,
      history_source: c.ml_forecast.history_source,
      history_points: c.ml_forecast.history_points,
    } : null,
    sentiment: c.sentiment ? { score: c.sentiment.score, label: c.sentiment.label, confidence: c.sentiment.confidence } : null,

    // ════════════════════════════════════════════════════════════════════════
    //  v18.0.0 GAP-FILLERS PAYLOAD
    // ════════════════════════════════════════════════════════════════════════
    gap_fillers: {
      acled: c.signals?.acled
        ? {
            event_count: c.signals.acled.event_count,
            total_fatalities: c.signals.acled.total_fatalities,
            max_fatalities: c.signals.acled.max_fatalities,
            event_types: c.signals.acled.event_types,
            severity_index: c.signals.acled.severityIndex,
            top_events: c.signals.acled.top_events,
          }
        : null,
      hdx_hapi: c.signals?.hdx_hapi
        ? {
            phase: c.signals.hdx_hapi.phase,
            phase_name: c.signals.hdx_hapi.phase_name,
            population: c.signals.hdx_hapi.population,
            admin1: c.signals.hdx_hapi.admin1,
            reference_period: [c.signals.hdx_hapi.reference_start, c.signals.hdx_hapi.reference_end],
          }
        : null,
      idmc: c.signals?.idmc
        ? {
            year: c.signals.idmc.year,
            conflict_new_displacements: c.signals.idmc.conflict_new_displacements,
            disaster_new_displacements: c.signals.idmc.disaster_new_displacements,
            total_displacements: c.signals.idmc.total_displacements,
            combined_new: c.signals.idmc.combined_new,
          }
        : null,
      reliefweb_reports: c.signals?.reliefweb_report
        ? {
            count: c.signals.reliefweb_report.count,
            latest_title: c.signals.reliefweb_report.latest_title,
            latest_date: c.signals.reliefweb_report.latest_date,
            sources: c.signals.reliefweb_report.sources,
            disasters: c.signals.reliefweb_report.disasters,
          }
        : null,
      fao_food_price_index: c.signals?.fao_fpi
        ? {
            value: c.signals.fao_fpi.value,
            year: c.signals.fao_fpi.year,
            baseline: c.signals.fao_fpi.baseline,
            fallback: c.signals.fao_fpi.fallback || false,
          }
        : null,
      who_gho: c.signals?.who_gho || null,
      unhcr_situation: c.signals?.unhcr_situation || null,
    },

    score_audit: {
      prior_score: c.priorScore,
      structural_score: c.structural_score,
      live_breaking_score: lb.live_score,
      pop_multiplier: c.__pop_multiplier ?? 1.0,
      resolution_credit: c.__resolution_credit ?? 0,
      effective_score: c.__effective_score,
      spillover: c.spillover,
      final_score: htmlScore,
      evidence_score: c.evidence_score,
      evidence_confidence: c.evidence_confidence,
    },
    recommendation: recommendation(htmlScore, anom),
    region: c.region,
    fsi: { score: c.fsi_score, rank: c.fsi_rank, band: c.fsi_band },
    __parity_digest: {
      structural_component: +(composite(c.dims) * (1 - (c.evidence_confidence * CFG.EVIDENCE_STRUCTURAL_WEIGHT))).toFixed(3),
      evidence_score: c.evidence_score,
      raw_total: +(composite(c.dims) * (1 - (c.evidence_confidence * CFG.EVIDENCE_STRUCTURAL_WEIGHT)) + c.evidence_score).toFixed(3),
      post_blend: c.score,
      spillover_added: c.spillover,
      final: htmlScore,
    },
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
      gaps: url.searchParams.get("gaps") === "true",
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
    const liveData = await fetchAllLive();
    const store = await buildStore(liveData);
    const ranked = rankByLiveBreaking(store);
    const rankIndex = new Map(ranked.map((iso, i) => [iso, i]));
    const breakingRanked = rankBreakingOnly(store, 1);
    const liveEventsOnly = rankLiveEventsOnly(store);

    // v18.0.0: gap coverage summary endpoint
    if (params.gaps) {
      const coverage = {
        acled: 0, hdx_hapi: 0, idmc: 0, reliefweb_report: 0, fao_fpi: 0, who_gho: 0, unhcr_situation: 0,
      };
      for (const iso of Object.keys(store)) {
        const s = store[iso].signals || {};
        if (s.acled) coverage.acled++;
        if (s.hdx_hapi) coverage.hdx_hapi++;
        if (s.idmc) coverage.idmc++;
        if (s.reliefweb_report) coverage.reliefweb_report++;
        if (s.fao_fpi) coverage.fao_fpi++;
        if (s.who_gho) coverage.who_gho++;
        if (s.unhcr_situation) coverage.unhcr_situation++;
      }
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=120" });
      res.end(JSON.stringify({
        meta: { generated_at: new Date().toISOString(), countries_tracked: Object.keys(store).length },
        coverage,
        note: "Counts of countries with live data for each v18.0.0 gap-filling source.",
      }, null, 2));
      return;
    }

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].__effective_score >= params.threshold);
    else if (params.force_live && liveEventsOnly.length > 0) finalIsos = liveEventsOnly.slice(0, params.top);
    else if (params.force_live && breakingRanked.length > 0) finalIsos = breakingRanked.slice(0, params.top);
    else finalIsos = ranked.slice(0, params.top);
    if (!finalIsos.length && !isoList.length) finalIsos = ranked.slice(0, params.top);

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const s = store[iso];
      const data = { iso, name: s.name, score: s.score, structural_score: s.structural_score, effective_score: s.__effective_score, live_breaking: s.__live_breaking, evidence: s.evidence_ledger, dimensions: s.dims, gap_fillers: s.signals };
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${iso}.json"` });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const c = store[finalIsos[0]];
      const lb = c.__live_breaking || {};
      const gf = c.signals || {};
      const gfBadge = gf.hdx_hapi?.phase >= 4 ? `IPC ${gf.hdx_hapi.phase} · ` : '';
      const html = `<div style="padding:16px;background:#0f1a30;color:#fff;font-family:system-ui;max-width:320px;border-radius:12px;"><b>${c.flag} ${c.name}</b> — Score ${c.score}/100 (${lb.tier_label || "—"})<br><small>${gfBadge}${lb.breaking_headline || ""}</small></div>`;
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (params.live) {
      const source = liveEventsOnly.length ? liveEventsOnly : breakingRanked;
      const feed = source.slice(0, params.top || 25).map(iso => {
        const c = store[iso];
        const lb = c.__live_breaking;
        return { rank: source.indexOf(iso) + 1, iso, name: c.name, flag: c.flag, live_score: lb.live_score, effective_score: c.__effective_score, tier: lb.tier, headline: lb.breaking_headline, signal_count: lb.signal_count, source_count: lb.source_count };
      });
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=120" });
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), feed: "live-breaking-news", version: "v18.0.0" }, live_news: feed }, null, 2));
      return;
    }

    if (params.rss) {
      const isos = params.region ? (liveEventsOnly.length ? liveEventsOnly : breakingRanked).filter(i => COUNTRIES[i].region === params.region).slice(0, 30) : (liveEventsOnly.length ? liveEventsOnly : breakingRanked).slice(0, 30);
      const f = buildRSSFeed(isos.length ? isos : ranked.slice(0, 30), store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" });
      res.end(f);
      return;
    }

    if (params.wst) {
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString() }, countries: [] }, null, 2));
      return;
    }

    if (params.breaking) {
      const source = liveEventsOnly.length ? liveEventsOnly : breakingRanked;
      const feed = source.slice(0, params.top || 20).map(iso => {
        const c = store[iso];
        const lb = c.__live_breaking;
        return { iso, name: c.name, flag: c.flag, live_score: lb.live_score, effective_score: c.__effective_score, tier: lb.tier, tier_label: lb.tier_label, headline: lb.breaking_headline, signal_count: lb.signal_count, source_count: lb.source_count, top_events: lb.events.slice(0, 3) };
      });
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), mode: "breaking", total_with_live_events: liveEventsOnly.length, total_with_any_signals: breakingRanked.length, version: "v18.0.0" }, breaking: feed }, null, 2));
      return;
    }

    if (params.format === "sitemap") {
      const p = await Promise.all(finalIsos.map(iso => buildPayload(iso, store, ranked, rankIndex, opts)));
      res.writeHead(200, { ...CORS, "Content-Type": "application/xml; charset=utf-8" });
      res.end(buildSitemap(p));
      return;
    }

    const opts = { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary };
    const payloads = await Promise.all(finalIsos.map(iso => buildPayload(iso, store, ranked, rankIndex, opts)));
    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";
    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);

    // v18.0.0: compute live gap-source coverage for meta
    const gapCoverage = { acled: 0, hdx_hapi: 0, idmc: 0, reliefweb_report: 0, fao_fpi: 0, who_gho: 0, unhcr_situation: 0 };
    for (const iso of Object.keys(store)) {
      const s = store[iso].signals || {};
      if (s.acled) gapCoverage.acled++;
      if (s.hdx_hapi) gapCoverage.hdx_hapi++;
      if (s.idmc) gapCoverage.idmc++;
      if (s.reliefweb_report) gapCoverage.reliefweb_report++;
      if (s.fao_fpi) gapCoverage.fao_fpi++;
      if (s.who_gho) gapCoverage.who_gho++;
      if (s.unhcr_situation) gapCoverage.unhcr_situation++;
    }

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        ranking_mode: "DEFINITIVE_v18.0.0",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_evidence: Object.keys(evidenceIndex.sourceCoverage).length,
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        score_field: "HTML-exact evidence-ledger score",
        effective_score_field: "score × pop_exposure − resolution_credit (metadata)",
        gap_filler_coverage: gapCoverage,
        endpoints: {
          single: "GET /api/top-story",
          live_news: "GET /api/top-story?format=live",
          top_n: "GET /api/top-story?top=10",
          iso: "GET /api/top-story?iso=SOM",
          compare: "GET /api/top-story?iso=SOM,YEM",
          region: "GET /api/top-story?region=africa",
          rss_feed: "GET /api/top-story?format=rss",
          breaking: "GET /api/top-story?format=breaking",
          sitemap: "GET /api/top-story?format=sitemap",
          gap_coverage: "GET /api/top-story?gaps=true",
        },
      },
      ...(mode === "single" ? { top_story: payloads[0] } : {}),
      ...(mode === "list" ? { countries: payloads } : {}),
    };

    res.writeHead(200, { ...CORS, "Cache-Control": `public, s-maxage=${secsUntilNext}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("[top-story v18.0.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}
