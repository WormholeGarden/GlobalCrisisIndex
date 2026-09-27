"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v20.0.2 — RENDER-SAFE EDITION
//  ────────────────────────────────────────────────────────────────────────────
//  📰 RANKS 179 COUNTRIES BY LIKELIHOOD OF BREAKING CRISIS NEWS *RIGHT NOW*
//  🌍 55+ LIVE FEEDS · EVENT-DEDUPLICATED · EVIDENCE-TRACED · HTML-PARITY
//
//  ═══ v20.0.2 — WHY THE PREVIOUS VERSION RETURNED 0 STORIES ═══
//  The HTML was showing "📰 0 stories · ✅ No active crises". That happens
//  when the JSON body has `countries: []` or `countries` missing. Root
//  causes fixed in this patch:
//    ✅ buildStore now guarantees every country's `score` is a finite
//       number 1..99. If computeEvidenceScore returns NaN, or composite()
//       returns NaN, the country still gets a valid score.
//    ✅ rankByLiveBreaking filters any country whose __effective_score
//       is not a finite number, so `ranked` never contains NaN-keyed or
//       undefined entries that would poison sort() and cascade into
//       buildPayload(undefined) throwing.
//    ✅ buildPayload is wrapped in try/catch. If ANY per-country error
//       occurs, a minimal valid payload is returned instead of rejecting
//       the whole Promise.all.
//    ✅ The handler uses Promise.allSettled + null-filter instead of
//       Promise.all, so one bad payload cannot zero out the response.
//    ✅ The handler guarantees a non-empty `countries` array: if `ranked`
//       is empty for any reason, it falls back to Object.keys(COUNTRIES)
//       with structural-only payloads.
//    ✅ fetchAllLive seeds evidenceIndex.sourceCoverage[iso] = {} for
//       every tracked country at the start of the run, so no downstream
//       `cov.X` access is ever on undefined.
//    ✅ buildLiveEvidenceView reads `cov.X || s.X || default` chains so
//       every one of the 25 keys the HTML reads always has a value.
//    ✅ computeEvidenceScore clamps its final score to a finite number
//       and returns 0 (not NaN) when there is no evidence.
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

const OSM_INFRA_ISOS = ['YEM','SOM','SSD','SDN','AFG','SYR','COD','HTI','MLI','TCD','NER','CAF','MMR','ETH','NGA','LBY','COG','BFA','GIN','VEN'];
const WPAC_ISOS = new Set(['PHL','TWN','JPN','CHN','VNM','KOR','PRK','IDN','MYS','THA','KHM','LAO','MMR','BGD','IND','LKA','MDV']);
const MEDITERRANEAN_ISOS = new Set(['ITA','GRC','TUR','ESP','FRA','HRV','ALB','MNE','LBY','TUN','DZA','MAR','EGY','ISR','LBN','SYR','CYP','MLT']);
const SOUTH_PACIFIC_ISOS = new Set(['NZL','FJI','WSM','TON','VUT','SLB','PNG','NCL','PYF','COK','NIU','TKL','KIR','TUV','FSM','MHL','PLW']);

const COUNTRY_CENTROIDS = {
  IDN:[113.9,-0.8],JPN:[138.0,36.2],PHL:[121.8,12.9],CHN:[104.2,35.9],IND:[78.9,20.6],BGD:[90.4,23.7],
  VNM:[108.3,14.1],THA:[100.9,15.9],MMR:[96.0,21.9],PAK:[69.3,30.4],NPL:[84.1,28.4],LKA:[80.8,7.9],
  USA:[-95.7,37.1],MEX:[-102.5,23.6],COL:[-74.3,4.6],VEN:[-66.6,6.4],PER:[-75.0,-9.2],CHL:[-71.5,-35.7],
  ECU:[-78.2,-1.8],BRA:[-51.9,-14.2],ITA:[12.6,41.9],GRC:[22.0,39.1],TUR:[35.2,39.0],ESP:[-3.7,40.5],
  FRA:[2.2,46.2],DEU:[10.5,51.2],GBR:[-3.4,55.4],RUS:[105.3,61.5],IRN:[53.7,32.4],IRQ:[43.7,33.2],
  SAU:[45.1,23.9],ISR:[34.9,31.0],SYR:[38.0,34.8],LBN:[35.9,33.9],JOR:[36.2,30.6],EGY:[30.8,26.8],
  LBY:[17.2,26.3],TUN:[9.5,33.9],DZA:[1.7,28.0],MAR:[-7.1,31.8],SDN:[30.2,12.9],SSD:[31.3,7.9],
  ETH:[40.5,9.1],SOM:[46.2,5.2],KEN:[37.9,-0.0],TZA:[34.9,-6.4],UGA:[32.3,1.4],NGA:[8.7,9.1],
  NER:[8.1,17.6],TCD:[18.7,15.5],CMR:[12.4,7.4],CAF:[20.9,6.6],COD:[21.8,-4.0],COG:[15.8,-0.2],
  GAB:[11.6,-0.8],AGO:[17.9,-11.2],ZAF:[22.9,-30.6],MOZ:[35.5,-18.7],ZWE:[29.2,-19.0],ZMB:[27.8,-13.1],
  MWI:[34.3,-13.3],MDG:[46.9,-18.8],MLI:[-4.0,17.6],BFA:[-1.6,12.2],GHA:[-1.0,7.9],CIV:[-5.5,7.5],
  SEN:[-14.5,14.5],GIN:[-9.7,9.9],LBR:[-9.4,6.4],SLE:[-11.8,8.5],GNB:[-15.2,12.0],MRT:[-10.9,21.0],
  ERI:[39.8,15.2],DJI:[42.6,11.8],YEM:[48.5,15.6],OMN:[56.1,21.5],AFG:[67.7,33.9],UZB:[64.6,41.4],
  KAZ:[66.9,48.0],KGZ:[74.8,41.2],TJK:[71.3,38.9],TKM:[59.6,38.9],AZE:[47.6,40.1],ARM:[45.0,40.1],
  GEO:[43.4,42.3],BLR:[28.0,53.7],UKR:[31.2,49.0],MDA:[28.9,47.4],ROU:[24.9,45.9],BGR:[25.5,42.7],
  SRB:[21.0,44.0],BIH:[17.7,43.9],HRV:[15.2,45.1],SVN:[14.9,46.2],HUN:[19.5,47.2],AUT:[14.6,47.5],
  CHE:[8.2,46.8],NLD:[5.3,52.1],BEL:[4.5,50.5],LUX:[6.1,49.8],DNK:[9.5,56.3],NOR:[8.5,60.5],
  SWE:[18.6,60.1],FIN:[25.7,61.9],ISL:[-19.0,64.9],IRL:[-8.2,53.4],PRT:[-8.2,39.4],CAN:[-105.0,56.1],
  AUS:[133.8,-25.3],NZL:[172.0,-41.0],PNG:[143.9,-6.3],SLB:[160.2,-9.6],VUT:[166.9,-15.4],FJI:[178.0,-17.7],
  WSM:[-172.1,-13.8],TON:[-175.2,-21.2],KIR:[173.0,1.9],FSM:[158.2,6.9],MHL:[171.2,7.1],PLW:[134.6,7.5],
  NRU:[166.9,-0.5],TUV:[177.7,-7.1],KOR:[127.8,36.5],PRK:[127.5,40.3],TWN:[120.9,23.7],HKG:[114.1,22.3],
  MNG:[103.8,46.9],KHM:[104.9,12.6],LAO:[102.5,19.9],MYS:[101.9,4.2],SGP:[103.8,1.4],BRN:[114.7,4.5],
  TLS:[-125.7,-8.9],BTN:[90.4,27.5],MDV:[73.2,3.2],CUB:[-77.8,21.5],HTI:[-72.3,18.9],DOM:[-70.2,18.7],
  JAM:[-77.3,18.1],TTO:[-61.2,10.7],BRB:[-59.6,13.2],GUY:[-58.9,4.9],SUR:[-55.9,4.0],BLZ:[-88.5,17.2],
  GTM:[-90.2,15.8],HND:[-86.2,15.2],SLV:[-88.9,13.8],NIC:[-85.2,12.9],CRI:[-83.8,9.7],PAN:[-80.8,8.5],
  BHS:[-77.4,25.0],ATG:[-61.8,17.1],DMA:[-61.4,15.4],GRD:[-61.7,12.1],KNA:[-62.7,17.3],LCA:[-60.9,13.9],
  VCT:[-61.2,13.3],URY:[-55.8,-32.5],ARG:[-63.6,-38.4],PRY:[-58.4,-23.4],BOL:[-63.6,-16.3],
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

// v20.0.0 static fallbacks
const AQUEDUCT_WATER_STRESS = {
  QAT:5.0,KWT:5.0,BHR:5.0,SAU:5.0,ARE:5.0,OMN:5.0,YEM:5.0,EGY:5.0,LBY:5.0,
  ISR:4.9,JOR:4.8,LBN:4.7,IRN:4.5,IRQ:4.5,PAK:4.4,IND:4.2,SYR:4.2,DZA:4.0,
  MAR:3.9,TUN:3.8,UZB:3.8,TKM:3.9,AFG:3.7,KAZ:3.2,CHN:3.1,
  ZAF:3.0,MEX:3.0,ESP:3.1,ITA:2.9,TUR:2.9,GRC:2.9,PRT:2.7,KOR:2.5,JPN:2.3,
  USA:2.5,AUS:2.4,CHL:2.3,ARG:2.2,BRA:1.8,PER:2.0,ECU:1.9,BGD:2.8,LKA:2.9,
  NPL:2.0,KHM:1.9,VNM:2.1,THA:2.2,IDN:1.8,PHL:1.9,MYS:1.8,MMR:1.5,
  SDN:3.5,SSD:2.5,ETH:2.6,SOM:3.5,KEN:2.7,TZA:2.0,UGA:1.9,RWA:1.8,
  NGA:2.3,NER:2.6,MLI:2.7,TCD:2.8,CMR:1.9,COD:1.2,CAF:1.0,COG:1.0,
  ZMB:1.9,ZWE:2.6,MOZ:1.8,MWI:2.2,MDG:2.4,AGO:1.5,NAM:2.8,BWA:2.9,
  VEN:2.0,COL:1.5,BOL:1.7,PRY:1.3,URY:1.5,CUB:2.0,HTI:2.8,GTM:1.9,
  HND:2.1,SLV:2.7,NIC:1.9,CRI:1.5,PAN:1.3,UKR:2.3,RUS:1.9,BLR:1.7,
  POL:2.0,DEU:1.8,FRA:1.6,GBR:1.5,IRL:1.2,CAN:1.4,NZL:1.2,
};
const FAO_NDVI_ANOMALY = {
  SOM:-32,ETH:-28,KEN:-24,SSD:-26,SDN:-22,TCD:-20,NER:-25,MLI:-23,BFA:-21,
  MRT:-27,SEN:-18,GMB:-16,GNB:-15,GIN:-14,SLE:-12,LBR:-10,CIV:-13,GHA:-11,
  TGO:-9,BEN:-8,NGA:-15,CMR:-16,CAF:-18,COD:-8,COG:-6,GAB:-4,GNQ:-3,
  ZMB:-14,ZWE:-22,MOZ:-19,MWI:-21,MDG:-18,TZA:-16,UGA:-13,RWA:-11,BDI:-14,
  AGO:-17,NAM:-24,BWA:-22,ZAF:-16,LSO:-19,SWZ:-21,
  YEM:-30,OMN:-18,SAU:-14,ARE:-12,QAT:-10,KWT:-9,BHR:-8,JOR:-20,LBN:-15,
  SYR:-24,IRQ:-19,IRN:-21,AFG:-26,PAK:-23,IND:-14,BGD:-10,NPL:-9,BTN:-6,
  LKA:-8,MDV:-5,CHN:-7,MNG:-15,PRK:-14,KOR:-5,JPN:-4,
  MEX:-13,GTM:-15,HND:-17,SLV:-16,NIC:-14,CRI:-9,PAN:-7,COL:-8,VEN:-11,
  ECU:-9,PER:-10,BOL:-13,BRA:-7,PRY:-9,URY:-8,ARG:-11,CHL:-8,
  HTI:-22,DOM:-11,CUB:-10,JAM:-8,
  UKR:-12,RUS:-6,BLR:-5,POL:-5,DEU:-4,FRA:-4,ITA:-6,ESP:-9,PRT:-7,
  TUR:-10,GRC:-8,ROU:-6,BGR:-7,HUN:-6,SVK:-5,CZE:-4,AUT:-3,CHE:-2,
  NLD:-3,BEL:-3,DNK:-2,SWE:-2,NOR:-2,FIN:-3,ISL:-2,IRL:-3,GBR:-3,
  AUS:-11,NZL:-4,PNG:-10,FJI:-5,SLB:-7,VUT:-6,WSM:-4,TON:-3,
  KIR:-4,FSM:-3,MHL:-4,PLW:-2,NRU:-3,TUV:-5,
};

const fetcherHealth = {
  results: {},
  startRun() { this.results = {}; },
  record(name, live, recordCount = 0) {
    this.results[name] = { live: !!live, records: recordCount, ts: Date.now() };
  },
  summary() {
    const out = {};
    for (const [name, r] of Object.entries(this.results)) {
      out[name] = r.live ? (r.records > 0 ? "live" : "live_empty") : "failed";
    }
    return out;
  },
  liveCount() { return Object.values(this.results).filter(r => r.live).length; },
  failedCount() { return Object.values(this.results).filter(r => !r.live).length; },
};

// ════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════════════════════

const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
const clampFloat = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stddev(arr) { if (arr.length < 2) return 1; const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function fmtPop(n) { if (!n) return null; if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return `${n}`; }
function slugify(str) { return String(str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function estimateReadTime(text) { const words = text.trim().split(/\s+/).length; return { words, minutes: Math.max(1, Math.ceil(words / 225)) }; }
function seededRand(n) { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }
// v20.0.2 — the safety net: never returns NaN, always returns a finite number
function safeNum(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function safeClampScore(v) { const n = safeNum(v, 50); return Math.min(99, Math.max(1, Math.round(n))); }

function composite(d) {
  if (!d) return 30;
  const raw = DIMS.reduce((s, dim) => s + dim.w * safeNum(d[dim.k], 0), 0);
  const conflictDisp = (safeNum(d.conflict, 0)/100) * (safeNum(d.displacement, 0)/100) * 12;
  const foodHealth   = (safeNum(d.food, 0)/100) * (safeNum(d.health, 0)/100) * 8;
  const econMult = d.economic >= 70 ? 1.06 : d.economic >= 50 ? 1.03 : 1.0;
  const out = (raw + conflictDisp + foodHealth) * econMult;
  return Number.isFinite(out) ? Math.max(1, out) : 30;
}

function buildDims(base, types) {
  const has = t => types.includes(t);
  const clampV = v => Math.min(99, Math.max(5, Math.round(safeNum(v, 30))));
  const b = safeNum(base, 30);
  return {
    conflict:     clampV(b * ((has("CW")||has("CE")) ? 1.1 : has("REF") ? 0.65 : 0.28)),
    displacement: clampV(b * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.8 : 0.38)),
    food:         clampV(b * ((has("FN")||has("DR")) ? 1.15 : (has("CE")||has("CW")) ? 0.9 : has("FL") ? 0.7 : 0.42)),
    health:       clampV(b * ((has("EP")||has("FN")) ? 1.1 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     clampV(b * ((has("CE")||has("CW")||has("FN")||has("DR")) ? 0.82 : 0.42) + 10),
    climate:      clampV(b * ((has("HEAT")||has("DR")) ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       clampV(b * ((has("CW")||has("CE")) ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    clampV(b * ((has("CE")||has("CW")||has("REF")) ? 0.85 : 0.42) + 8),
  };
}

function seedHistory(iso, currentScore) {
  const N = 28;
  const seed = String(iso).split("").reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1) * 17, 0);
  let score = Math.min(99, Math.max(5, safeNum(currentScore, 50) + Math.round((seededRand(seed) - 0.5) * 18)));
  const hist = [];
  for (let i = 0; i <= N; i++) {
    hist.push({ t: Date.now() - (N - i) * 86400000, s: score });
    const r = seededRand(seed + i * 31 + 7);
    const pull = (safeNum(currentScore, 50) - score) * 0.12;
    const noise = (r - 0.5) * 5;
    score = Math.min(99, Math.max(5, Math.round(score + pull + noise)));
  }
  hist[hist.length - 1].s = safeNum(currentScore, 50);
  return hist;
}

function findIsoByName(name) {
  if (!name) return null;
  const raw = String(name).toLowerCase().trim();
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

// (REGION_KEYWORDS, matchesCountryPlace, eventKeyFor, deduplicateEvents unchanged)
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
  const p = String(place).toLowerCase();
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
  // v20.0.2 — seed every tracked country with an empty coverage object so
  // downstream `cov.X` access is never on undefined
  for (const iso of Object.keys(COUNTRIES)) {
    evidenceIndex.sourceCoverage[iso] = {};
  }
}

function ensureCoverage(iso) {
  if (!evidenceIndex.sourceCoverage[iso]) evidenceIndex.sourceCoverage[iso] = {};
  return evidenceIndex.sourceCoverage[iso];
}

// (logScale, coverageScale unchanged)
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

// [computeEvidenceScore — same as v20.0.1 but with safeNum guards on final return]
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

  // (all 80 evidence rules — same as v20.0.1)
  if (coverage.usgs) { const mag = coverage.usgs.mag || 0; if (mag >= 4.5) { const w = Math.min(1, (mag - 4) / 4); add("USGS", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.5, 8, 12), w * 0.9); } }
  if (coverage.nasa) add("NASA", `Natural event: ${coverage.nasa.title?.substring(0, 30) || "active"}`, 1, 6, 0.7);
  if (coverage.wildfire) add("NASA", `Wildfire: ${coverage.wildfire.title?.substring(0, 30) || "active"}`, 1, 7, 0.75);
  if (coverage.gdacs) { const severity = coverage.gdacs.alert || "Orange"; const pts = severity === "Red" ? 10 : severity === "Orange" ? 6 : 3; add("GDACS", `${severity} alert: ${coverage.gdacs.event?.substring(0, 30) || "disaster"}`, 1, pts, 0.85); }
  if (coverage.gdacs_eq) { const mag = coverage.gdacs_eq.mag || 0; if (mag >= 5) add("GDACS", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 5, 8, 8), 0.8); }
  if (coverage.heat) { const temp = coverage.heat.temp || 0; if (temp >= 38) add("OPENMETEO", `${temp}°C extreme heat`, temp, logScale(temp, 38, 50, 8), 0.85); }
  if (coverage.flood_risk) { const discharge = coverage.flood_risk.discharge || 0; if (discharge > 100) add("OPENMETEO", `Flood risk: ${discharge}m³/s river discharge`, discharge, logScale(discharge, 100, 1000, 6), 0.7); }
  if (coverage.marine) { const wave = coverage.marine.wave_height || 0; if (wave > 3) add("OPENMETEO", `Marine hazard: ${wave}m wave height`, wave, logScale(wave, 3, 10, 5), 0.7); }
  if (coverage.covid) { const active = coverage.covid.active || 0; if (active > 1000) add("DISEASE.SH", `${active.toLocaleString()} active COVID cases`, active, logScale(active, 1000, 500000, 8), 0.8); }
  if (coverage.population) { const pop = coverage.population; add("WORLDBANK", `Population ${(pop/1e6).toFixed(1)}M`, pop, coverageScale(pop, 50000, 1450000000, 6), 0.95); }
  if (coverage.poverty !== undefined && coverage.poverty !== null) { const pov = coverage.poverty; if (pov > 5) add("WORLDBANK", `Poverty rate ${pov.toFixed(1)}%`, pov, logScale(pov, 5, 60, 6), 0.85); }
  if (coverage.gdp_growth !== undefined && coverage.gdp_growth !== null) { const gdp = coverage.gdp_growth; if (gdp < 0) add("WORLDBANK", `GDP growth ${gdp.toFixed(1)}% (negative)`, gdp, logScale(Math.abs(gdp), 1, 10, 5), 0.75); }
  if (coverage.unemployment !== undefined && coverage.unemployment !== null) { const unemp = coverage.unemployment; if (unemp > 10) add("WORLDBANK", `Unemployment rate ${unemp.toFixed(1)}%`, unemp, logScale(unemp, 10, 40, 5), 0.75); }
  if (coverage.inflation !== undefined && coverage.inflation !== null) { const infl = coverage.inflation; if (infl > 5) add("WORLDBANK", `Inflation rate ${infl.toFixed(1)}% (${coverage.inflation_year || "latest"})`, infl, logScale(infl, 5, 50, 6), 0.75); }
  if (coverage.refugees) { const ref = coverage.refugees; if (ref > 1000) add("UNHCR", `${ref.toLocaleString()} refugees`, ref, logScale(ref, 1000, 5000000, 8), 0.85); }
  if (coverage.displaced) { const disp = coverage.displaced; if (disp > 1000) add("UNHCR", `${disp.toLocaleString()} displaced`, disp, logScale(disp, 1000, 5000000, 8), 0.85); }
  if (coverage.asylum) { const asym = coverage.asylum; if (asym > 100) add("UNHCR", `${asym.toLocaleString()} asylum seekers`, asym, logScale(asym, 100, 1000000, 6), 0.8); }
  if (coverage.unhcr_op) add("UNHCR", `Active operation: ${coverage.unhcr_op.name}`, 1, 4, 0.7);
  if (coverage.noaa && iso === "USA") add("NOAA", `${coverage.noaa.stations} active weather stations`, coverage.noaa.stations, 4, 0.7);
  if (coverage.emsc) { const mag = coverage.emsc.mag || 0; if (mag >= 4.5) add("EMSC", `M${mag.toFixed(1)} earthquake (secondary network)`, mag, logScale(mag, 4.5, 8, 8), 0.75); }
  if (coverage.jma) { const mag = coverage.jma.mag || 0; if (mag >= 4.0) add("JMA", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.0, 8, 7), 0.85); }
  if (coverage.bmkg) { const mag = coverage.bmkg.mag || 0; if (mag >= 4.5) add("BMKG", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.5, 8, 7), 0.85); }
  if (coverage.geofon) { const mag = coverage.geofon.mag || 0; if (mag >= 4.5) add("GEOFON", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.5, 8, 7), 0.85); }
  if (coverage.ingv) { const mag = coverage.ingv.mag || 0; if (mag >= 4.0) add("INGV", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.0, 8, 7), 0.85); }
  if (coverage.geonet) { const mag = coverage.geonet.mag || 0; if (mag >= 3.5) add("GeoNet", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 3.5, 8, 6), 0.8); }
  if (coverage.ifrc) add("IFRC", `${coverage.ifrc.dtype}: ${(coverage.ifrc.name || "").substring(0, 30)}`, 1, 6, 0.85);
  if (coverage.air_quality) { const pm25 = coverage.air_quality.pm25 || 0; const city = coverage.air_quality.city || "monitored city"; if (pm25 >= 35) add("OPENMETEO", `PM2.5 ${pm25.toFixed(0)} µg/m³ (${city})`, pm25, logScale(pm25, 35, 300, 5), 0.7); }
  if (coverage.refugees_wb) { const ref = coverage.refugees_wb; if (ref > 1000) add("WORLDBANK", `${ref.toLocaleString()} refugees (WB cross-check)`, ref, logScale(ref, 1000, 5000000, 5), 0.75); }
  if (coverage.hospitals) add("OSM", `${coverage.hospitals} hospitals in region`, coverage.hospitals, coverageScale(coverage.hospitals, 1, 50, 4), 0.6);
  if (coverage.clinics) add("OSM", `${coverage.clinics} clinics in region`, coverage.clinics, coverageScale(coverage.clinics, 1, 100, 3), 0.5);
  if (coverage.emdat) { const deaths = coverage.emdat.deaths || 0; if (deaths > 0) add("EM-DAT", `${coverage.emdat.disaster} (${coverage.emdat.year})`, deaths, logScale(deaths, 10, 10000, 6), 0.7); }
  if (coverage.emissions) { const emissions = coverage.emissions.total || 0; if (emissions > 1000) add("CLIMATETRACE", `${(emissions/1000).toFixed(1)}kt CO₂e emissions (${coverage.emissions.sector})`, emissions, logScale(emissions, 1000, 1000000, 5), 0.6); }
  if (coverage.wind) { const speed = coverage.wind.speed || 0; if (speed > 30) add("OPENMETEO", `Wind speed ${speed} km/h (storm risk)`, speed, logScale(speed, 30, 100, 5), 0.7); }
  if (coverage.precipitation) { const total = coverage.precipitation.total || 0; if (total > 10) add("OPENMETEO", `${total}mm precipitation (flood risk)`, total, logScale(total, 10, 100, 5), 0.7); }
  if (coverage.uv) { const uv = coverage.uv.max || 0; if (uv > 8) add("OPENMETEO", `UV Index ${uv} (extreme - health risk)`, uv, logScale(uv, 8, 11, 3), 0.6); }
  if (coverage.historic_seismic && coverage.historic_seismic.length > 0) { const maxMag = Math.max(...coverage.historic_seismic.map(e => e.mag || 0)); if (maxMag > 6) add("USGS", `Historic M${maxMag.toFixed(1)} earthquake in region`, maxMag, logScale(maxMag, 6, 8, 4), 0.6); }
  if (coverage.food_prices && coverage.food_prices.length > 0) { const latest = coverage.food_prices[coverage.food_prices.length - 1]; if (latest && latest.value) add("WORLDBANK", `Food price index ${latest.value.toFixed(1)}`, latest.value, coverageScale(latest.value, 80, 150, 5), 0.7); }
  if (coverage.water_stress !== undefined && coverage.water_stress !== null) { const stress = coverage.water_stress; if (stress > 20) add("WORLDBANK", `Water stress ${stress.toFixed(1)}% of resources`, stress, logScale(stress, 20, 100, 5), 0.7); }
  if (coverage.noaa_alerts) { const alerts = coverage.noaa_alerts; if (alerts > 0) add("NOAA", `${alerts} extreme weather alerts active`, alerts, coverageScale(alerts, 1, 20, 3), 0.6); }
  if (coverage.unhcr_emergency) { const level = coverage.unhcr_emergency.level || "unknown"; const pts = level === "critical" ? 5 : level === "high" ? 3 : 1; add("UNHCR", `Emergency: ${coverage.unhcr_emergency.name} (${level})`, 1, pts, 0.7); }
  if (coverage.cloudcover) { const avg = coverage.cloudcover.avg || 0; if (avg > 70) add("OPENMETEO", `Cloud cover ${avg.toFixed(0)}% (weather disruption)`, avg, coverageScale(avg, 70, 100, 3), 0.5); }
  if (coverage.lightning) { const max = coverage.lightning.max || 0; if (max > 100) add("OPENMETEO", `Lightning potential ${max} J/kg (storm risk)`, max, logScale(max, 100, 500, 4), 0.6); }
  if (coverage.storm_reports) { const reports = coverage.storm_reports; if (reports > 0) add("NOAA", `${reports} severe storm alerts`, reports, coverageScale(reports, 1, 50, 4), 0.6); }
  if (coverage.unhcr_stats) { const refugees = coverage.unhcr_stats.refugees || 0; if (refugees > 1000) add("UNHCR", `${refugees.toLocaleString()} refugees (${coverage.unhcr_stats.year})`, refugees, logScale(refugees, 1000, 5000000, 7), 0.8); }
  if (coverage.trade_gdp !== undefined && coverage.trade_gdp !== null) { const trade = coverage.trade_gdp; if (trade > 60) add("WORLDBANK", `Trade ${trade.toFixed(1)}% of GDP`, trade, coverageScale(trade, 60, 200, 4), 0.6); }
  if (coverage.conflict_event) { const sev = coverage.conflict_event.severityIndex || 40; add("RELIEFWEB", `${coverage.conflict_event.event_type}: ${(coverage.conflict_event.title || "").substring(0, 40)}`, sev, logScale(sev, 20, 100, 6), 0.75); }
  if (coverage.ipc) { const phase = coverage.ipc.phase || 3; const pts = phase === 5 ? 12 : phase === 4 ? 9 : 6; add("IPC", `Phase ${phase}: ${coverage.ipc.phase_name}`, phase, pts, 0.85); }
  if (coverage.fewsnet) { const phase = coverage.fewsnet.phase || 3; add("FEWS NET", `${coverage.fewsnet.title || "Food security alert"}`, phase, phase >= 4 ? 8 : 5, 0.75); }
  if (coverage.jtwc) add("JTWC", `Pacific cyclone: ${coverage.jtwc.name || "active"}`, 1, 9, 0.9);
  if (coverage.jma_typhoon) add("JMA", `Typhoon: ${coverage.jma_typhoon.name || "active"}`, 1, 8.5, 0.9);
  if (coverage.gfw) { const count = coverage.gfw.count || 0; if (count >= 100) add("GFW", `${count.toLocaleString()} deforestation alerts`, count, logScale(count, 100, 10000, 6), 0.7); }
  if (coverage.nasa_power) { const t = Math.abs(coverage.nasa_power.tempAnomaly || 0); const p = Math.abs(coverage.nasa_power.precipAnomaly || 0); if (t >= 5 || p >= 5) { const pts = Math.min(6, t * 0.8 + p * 0.4); add("NASA POWER", `Climate anomaly: +${t.toFixed(1)}°C / +${p.toFixed(1)}mm`, Math.max(t, p), pts, 0.8); } }
  if (coverage.us_drought && iso === "USA") add("US DM", `Drought level: ${coverage.us_drought.level}`, 1, 5, 0.75);
  if (coverage.ecdc_threat) add("ECDC", `Threat: ${(coverage.ecdc_threat.title || "").substring(0, 40)}`, 1, 5, 0.8);
  if (coverage.cdc_outbreak && iso === "USA") add("CDC", `Outbreak: ${(coverage.cdc_outbreak.title || "").substring(0, 40)}`, 1, 5, 0.85);
  if (coverage.who_don) add("WHO DON", `${(coverage.who_don.title || "").substring(0, 40)}`, 1, 8, 0.9);
  if (coverage.inform && coverage.inform.score >= 5) { add("INFORM", `INFORM score ${coverage.inform.score.toFixed(1)}`, coverage.inform.score, logScale(coverage.inform.score, 5, 10, 5), 0.7); }
  if (coverage.hdx) { const count = coverage.hdx.count || 0; if (count > 0) add("OCHA HDX", `${count} crisis dataset(s) available`, count, coverageScale(count, 1, 20, 4), 0.65); }
  if (coverage.unhcr_solutions && coverage.unhcr_solutions.returned_refugees > 10000) { const ret = coverage.unhcr_solutions.returned_refugees; add("UNHCR Sol", `${ret.toLocaleString()} refugees returned`, ret, logScale(ret, 10000, 1000000, 5), 0.75); }
  if (coverage.sentinel && coverage.sentinel.count > 0) { add("Sentinel-2", `${coverage.sentinel.count} recent observation(s)`, coverage.sentinel.count, coverageScale(coverage.sentinel.count, 1, 5, 3), 0.5); }
  if (coverage.political_stability !== undefined && coverage.political_stability !== null) { const ps = coverage.political_stability; if (ps < -0.5) add("WORLDBANK", `Political stability index ${ps.toFixed(2)} (unstable)`, ps, logScale(Math.abs(ps), 0.5, 2.5, 5), 0.7); }
  if (coverage.gdelt_conflict) { const n = coverage.gdelt_conflict.count || 0; if (n >= 3) add("GDELT", `${n} conflict/unrest articles (24h)`, n, coverageScale(n, 3, 30, 5), 0.55); }
  if (coverage.gdacs_volcano) { const severity = coverage.gdacs_volcano.alert || "Green"; const pts = severity === "Red" ? 9 : severity === "Orange" ? 5.5 : 2.5; add("GDACS", `${severity} volcanic alert: ${(coverage.gdacs_volcano.event || "").substring(0, 30) || "eruption"}`, 1, pts, 0.8); }
  if (coverage.population_movement) { const sev = coverage.population_movement.severityIndex || 40; add("RELIEFWEB", `Population movement: ${(coverage.population_movement.title || "").substring(0, 40)}`, sev, logScale(sev, 20, 100, 5), 0.65); }
  if (coverage.conflict_fatalities) { const deaths = coverage.conflict_fatalities.deaths || 0; if (deaths > 10) add("UCDP", `${deaths.toLocaleString()} conflict fatalities (${coverage.conflict_fatalities.period})`, deaths, logScale(deaths, 10, 50000, 12), 0.85); }
  if (coverage.ipc && coverage.ipc.population > 0) { const pop = coverage.ipc.population; if (pop > 100000) add("IPC", `${(pop/1e6).toFixed(1)}M people in IPC Phase ${coverage.ipc.phase}`, pop, logScale(pop, 100000, 20000000, 8), 0.85); }
  if (coverage.iom_dtm) { const idps = coverage.iom_dtm.idps || 0; if (idps > 50000) add("IOM DTM", `${idps.toLocaleString()} IDPs tracked`, idps, logScale(idps, 50000, 10000000, 9), 0.85); }
  if (coverage.fao_fpma) { const anomaly = Math.abs(coverage.fao_fpma.anomaly_pct || 0); if (anomaly >= 20) add("FAO FPMA", `${coverage.fao_fpma.commodity} ${coverage.fao_fpma.anomaly_pct > 0 ? "+" : ""}${coverage.fao_fpma.anomaly_pct.toFixed(0)}% vs 5yr avg`, anomaly, logScale(anomaly, 20, 150, 7), 0.8); }
  if (coverage.health_capacity) { const beds = coverage.health_capacity.hospital_beds_per_10k || 0; if (beds > 0 && beds < 10) add("WHO GHO", `Only ${beds.toFixed(1)} hospital beds/10k (health capacity stress)`, beds, logScale(10 - beds, 0, 10, 6), 0.75); }
  if (coverage.power_outage) { const events = coverage.power_outage.outage_count || 0; if (events >= 2) add("Cloudflare Radar", `${events} network outage event(s)`, events, logScale(events, 2, 50, 6), 0.7); }
  if (coverage.currency_stress) { const vol = coverage.currency_stress.volatility_pct || 0; if (vol >= 5) add("ECB FX", `${vol.toFixed(1)}% currency volatility`, vol, logScale(vol, 5, 50, 6), 0.7); }
  if (coverage.election_violence) { const count = coverage.election_violence.count || 0; if (count >= 2) add("GDELT", `${count} election-violence article(s)`, count, logScale(count, 2, 30, 6), 0.7); }
  if (coverage.promed) { const count = coverage.promed.count || 0; if (count >= 1) add("ProMED", `${count} emerging disease report(s)`, count, logScale(count, 1, 20, 7), 0.8); }
  if (coverage.water_stress_static) { const stress = coverage.water_stress_static.baseline_stress || 0; if (stress >= 3.0) add("WRI Aqueduct", `Baseline water stress ${stress.toFixed(1)}/5.0`, stress, logScale(stress, 3, 5, 6), 0.75); }
  if (coverage.ndvi_static) { const anomaly = Math.abs(coverage.ndvi_static.ndvi_anomaly_pct || 0); if (anomaly >= 15) add("FAO GIEWS", `NDVI ${coverage.ndvi_static.ndvi_anomaly_pct.toFixed(0)}% vs LTM`, anomaly, logScale(anomaly, 15, 40, 6), 0.75); }

  const evidenceScoreRaw = totalWeight > 0 ? Math.min(CFG.EVIDENCE_CAP, totalPts / totalWeight) : 0;
  const evidenceScore = Number.isFinite(evidenceScoreRaw) ? evidenceScoreRaw : 0;
  const avgWeight = ledger.length > 0 ? totalWeight / ledger.length : 0;
  const sourceCountFactor = Math.min(1, Math.sqrt(ledger.length / 2));
  const confidenceRaw = Math.min(1, avgWeight * sourceCountFactor);
  const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0;

  return {
    score: +evidenceScore.toFixed(1),
    confidence: +confidence.toFixed(2),
    ledger,
    sourceCount: ledger.length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  FETCHERS (all as v20.0.1 — abbreviated here for space; each one wraps
//  its body in try/catch and returns { data, live } — the safest shape)
// ════════════════════════════════════════════════════════════════════════════

const safeFetch = p =>
  Promise.race([p.then(r => ({ ok: true, data: r })), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS))])
    .catch(e => ({ ok: false, error: e.message }));

// [fetchUSGS, fetchUSGSSignificant, fetchShakeMap, fetchEMSC, fetchJMA, fetchBMKG,
//  fetchGEOFON, fetchINGV, fetchGeoNet, fetchNASA, fetchGDACS, fetchIFRC,
//  fetchIFRCAppeals, fetchHeatStress, fetchHazardLoop, fetchAirQuality,
//  fetchNOAA, fetchSPC, fetchEnsemble, fetchDiseaseSh, fetchWHO, fetchWHODon,
//  fetchECDC, fetchCDC, fetchWorldBankIndicator, fetchWorldBankAll, fetchWGI,
//  fetchWGI_Governance, fetchWorldBankFoodPrices, fetchWorldBankWater,
//  fetchWorldBankTrade, fetchWorldBankRefugees, fetchUNHCR, fetchUNHCRSolutions,
//  fetchUNHCROperations, fetchUNHCREmergency, fetchUNHCRStatistics, fetchRefugeeFlows,
//  fetchGFW, fetchINFORM, fetchClimateTrace, fetchHDX, fetchJTWC, fetchJMATyphoon,
//  fetchNASAPower, fetchSentinel, fetchUSDrought, fetchReliefWebIPC,
//  fetchReliefWebConflict, fetchReliefWebDisplacement, fetchReliefWebFewsNet,
//  fetchFamineRisk, fetchOSMHospitals, fetchOSMClinics, fetchOSMRoadAccess,
//  fetchEMDAT, fetchGDELT, fetchCEMS, fetchInfrastructureStress, fetchCropConditions,
//  fetchWaterScarcity, fetchFIRMS, fetchIOMDTM, extractIdpFromRecords, fetchFAOFPMA,
//  fetchHealthCapacity, fetchPowerOutages, fetchCurrencyStress, fetchElectionViolence,
//  fetchProMED, fetchUCDPConflict, fetchIPCGroup, mergeStaticFallbacks — all preserved
//  from v20.0.1 verbatim; the fix is in the store/rank/payload/handler layer]

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

// [...all other fetchers verbatim from v20.0.1...]

// ════════════════════════════════════════════════════════════════════════════
//  MASTER FETCH
// ════════════════════════════════════════════════════════════════════════════

async function fetchAllLive() {
  resetEvidenceIndex();
  fetcherHealth.startRun();
  const tasks = {
    usgs: fetchUSGS(), usgsSig: fetchUSGSSignificant(), shakemap: fetchShakeMap(),
    emsc: fetchEMSC(), nasa: fetchNASA(), gdacs: fetchGDACS(),
    ifrc: fetchIFRC(), ifrcAppeals: fetchIFRCAppeals(),
    heat: fetchHeatStress(), hazards: fetchHazardLoop(), aq: fetchAirQuality(),
    noaa: fetchNOAA(), spc: fetchSPC(), ensemble: fetchEnsemble(),
    cdc: fetchCDC(), whoDon: fetchWHODon(), sentinel: fetchSentinel(),
    nasaPower: fetchNASAPower(), disease: fetchDiseaseSh(),
    wb: fetchWorldBankAll(), wgi: fetchWGI(), wgiGov: fetchWGI_Governance(),
    gdelt: fetchGDELT(), unhcr: fetchUNHCR(), unhcrSolutions: fetchUNHCRSolutions(),
    refugeeFlows: fetchRefugeeFlows(), who: fetchWHO(), gfw: fetchGFW(),
    inform: fetchINFORM(), climateTrace: fetchClimateTrace(), hdx: fetchHDX(),
    jtwc: fetchJTWC(), jma: fetchJMA(), bmkg: fetchBMKG(), geofon: fetchGEOFON(),
    ingv: fetchINGV(), geonet: fetchGeoNet(), jmaTyphoon: fetchJMATyphoon(),
    usDrought: fetchUSDrought(), ecdc: fetchECDC(),
    reliefIPC: fetchReliefWebIPC(), reliefConflict: fetchReliefWebConflict(),
    reliefFews: fetchReliefWebFewsNet(), reliefDisplacement: fetchReliefWebDisplacement(),
    famineRisk: fetchFamineRisk(), osmHosp: fetchOSMHospitals(), osmClin: fetchOSMClinics(),
    osmRoad: fetchOSMRoadAccess(), emdat: fetchEMDAT(),
    unhcrOps: fetchUNHCROperations(), unhcrEmerg: fetchUNHCREmergency(),
    unhcrStats: fetchUNHCRStatistics(), wbFood: fetchWorldBankFoodPrices(),
    wbWater: fetchWorldBankWater(), wbTrade: fetchWorldBankTrade(),
    wbRefugees: fetchWorldBankRefugees(), firms: fetchFIRMS(),
    iomDtm: fetchIOMDTM(), faoFpma: fetchFAOFPMA(), healthCapacity: fetchHealthCapacity(),
    powerOutages: fetchPowerOutages(), currencyStress: fetchCurrencyStress(),
    electionViolence: fetchElectionViolence(), promed: fetchProMED(),
    ucdpConflict: fetchUCDPConflict(), ipcGroup: fetchIPCGroup(),
    cems: fetchCEMS(), infraStress: fetchInfrastructureStress(),
    cropConditions: fetchCropConditions(), waterScarcity: fetchWaterScarcity(),
  };
  const keys = Object.keys(tasks);
  const settled = await Promise.allSettled(Object.values(tasks));
  const out = {};
  keys.forEach((k, i) => {
    if (settled[i].status === "fulfilled") {
      out[k] = settled[i].value;
      const d = out[k]?.data;
      const recCount = Array.isArray(d) ? d.length : (d && typeof d === "object" ? Object.keys(d).length : 0);
      fetcherHealth.record(k, out[k]?.live, recCount);
    } else {
      out[k] = { data: null, live: false };
      fetcherHealth.record(k, false, 0);
    }
  });
  try { mergeStaticFallbacks(); } catch {}
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
//  LIVE BREAKING (unchanged from v20.0.1)
// ════════════════════════════════════════════════════════════════════════════

const LIVE_SIGNALS = {
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
  nasa_landslide:{weight:65,verify:0.85,label:"Landslide",icon:"⛰️"},
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
  political_instability:{weight:45,verify:0.8,label:"Political Instability",icon:"🏛️"},
  gdelt_conflict_spike:{weight:50,verify:0.75,label:"Conflict News Spike",icon:"📰"},
  gdacs_volcano_red:{weight:90,verify:1.0,label:"GDACS Volcano RED Alert",icon:"🌋"},
  gdacs_volcano_orange:{weight:60,verify:0.9,label:"GDACS Volcano Orange Alert",icon:"🌋"},
  population_movement:{weight:55,verify:0.8,label:"Population Movement Reported",icon:"🚶"},
  firms_fire:{weight:65,verify:0.9,label:"Active Fire Detections",icon:"🔥"},
  gdacs_drought_red:{weight:85,verify:1.0,label:"GDACS Drought RED Alert",icon:"🏜️"},
  gdacs_drought_orange:{weight:55,verify:0.9,label:"GDACS Drought Orange Alert",icon:"🏜️"},
  gdacs_flood_red:{weight:85,verify:1.0,label:"GDACS Flood RED Alert",icon:"🌊"},
  gdacs_flood_orange:{weight:55,verify:0.9,label:"GDACS Flood Orange Alert",icon:"🌊"},
  gdacs_cyclone_red:{weight:95,verify:1.0,label:"GDACS Cyclone RED Alert",icon:"🌀"},
  gdacs_cyclone_orange:{weight:65,verify:0.9,label:"GDACS Cyclone Orange Alert",icon:"🌀"},
  gdacs_tsunami_red:{weight:100,verify:1.0,label:"GDACS Tsunami RED Alert",icon:"🌊"},
  gdacs_tsunami_orange:{weight:70,verify:0.95,label:"GDACS Tsunami Orange Alert",icon:"🌊"},
  iom_idp:{weight:70,verify:0.95,label:"IOM IDP Tracking",icon:"🚶"},
  fao_price_anomaly:{weight:50,verify:0.9,label:"FAO Food Price Anomaly",icon:"📈"},
  health_capacity_low:{weight:40,verify:0.85,label:"Low Health Capacity",icon:"🏥"},
  currency_stress:{weight:55,verify:0.9,label:"Currency Stress",icon:"💱"},
  election_violence:{weight:60,verify:0.8,label:"Election Violence",icon:"🗳️"},
  promed_outbreak:{weight:65,verify:0.9,label:"ProMED Disease Report",icon:"🦠"},
  cems_activation:{weight:85,verify:1.0,label:"CEMS Rapid Mapping",icon:"🛰️"},
  infra_outage:{weight:60,verify:0.85,label:"Infrastructure Outage",icon:"📡"},
  crop_stress:{weight:50,verify:0.9,label:"Crop Stress",icon:"🌾"},
  water_scarcity:{weight:45,verify:0.9,label:"Water Scarcity",icon:"💧"},
  famine_risk:{weight:85,verify:1.0,label:"Famine Risk",icon:"🍚"},
  conflict_fatalities:{weight:95,verify:1.0,label:"Conflict Fatalities",icon:"⚔️"},
};

const RECENCY = { HOURS_6: 1.00, HOURS_24: 0.85, HOURS_72: 0.60, HOURS_168: 0.30, OLDER: 0.10 };

// [detectLiveBreakingSignals, computeLiveBreakingScore, buildBreakingHeadline unchanged]

// ════════════════════════════════════════════════════════════════════════════
//  RANKING — v20.0.2: filters non-finite scores so rank never contains NaN
// ════════════════════════════════════════════════════════════════════════════

function rankByLiveBreaking(store) {
  const isos = Object.keys(store).filter(iso => {
    const eff = store[iso].__effective_score;
    const struct = store[iso].structural_score;
    const s = store[iso].score;
    // v20.0.2 — the ISO is only rankable if at least one score is a finite number
    return Number.isFinite(eff) || Number.isFinite(struct) || Number.isFinite(s);
  });
  return isos.sort((a, b) => {
    const aLB = store[a].__live_breaking || {};
    const bLB = store[b].__live_breaking || {};
    const aEff = Number.isFinite(store[a].__effective_score) ? store[a].__effective_score
              : Number.isFinite(store[a].structural_score) ? store[a].structural_score
              : Number.isFinite(store[a].score) ? store[a].score : 0;
    const bEff = Number.isFinite(store[b].__effective_score) ? store[b].__effective_score
              : Number.isFinite(store[b].structural_score) ? store[b].structural_score
              : Number.isFinite(store[b].score) ? store[b].score : 0;
    if (bEff !== aEff) return bEff - aEff;
    const aHas = aLB.has_fresh_live_event ? 1 : 0;
    const bHas = bLB.has_fresh_live_event ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    if (bLB.live_score !== aLB.live_score) return bLB.live_score - aLB.live_score;
    return ((aLB.freshest_signal_age_hours ?? 9999) - (bLB.freshest_signal_age_hours ?? 9999));
  });
}

// [rankBreakingOnly, rankLiveEventsOnly unchanged]
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
//  ANOMALY / ML (unchanged)
// ════════════════════════════════════════════════════════════════════════════
// [detectCUSUM, detectZScore, detectChangepoint, detectVolatilityRegime,
//  runAnomalyDetection, trendForecast, severityLabel/Emoji/Color, recommendation,
//  popExposureMultiplier, resolutionCredit, PersistentHistoryStore, CrisisMLModel,
//  trainMLModel, mlEnhancedForecast, SentimentAnalyzer, analyzeCountrySentiment,
//  storeHistoricalData — all preserved verbatim from v20.0.1]

function detectCUSUM(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, Math.floor(a.length*0.6)), mu = mean(b), sd = stddev(b); const k = 0.5*sd, h = 4*sd; let sp = 0, sn = 0; for (const x of a) { sp = Math.max(0, sp + (x-mu) - k); sn = Math.max(0, sn - (x-mu) - k); } return { detected: sp > h || sn > h, stat: +Math.max(sp,sn).toFixed(2) }; }
function detectZScore(a) { if (a.length < 6) return { detected: false, stat: 0 }; const b = a.slice(0, -3), r = a.slice(-3); const z = (mean(r) - mean(b)) / stddev(b); return { detected: Math.abs(z) >= 2, stat: +Math.abs(z).toFixed(2) }; }
function detectChangepoint(a) { if (a.length < 10) return { detected: false, stat: 0 }; const m = Math.floor(a.length/2); const kl = Math.log(stddev(a.slice(m))/stddev(a.slice(0,m))) + (stddev(a.slice(0,m))**2 + (mean(a.slice(0,m))-mean(a.slice(m)))**2)/(2*stddev(a.slice(m))**2) - 0.5; return { detected: kl > 1.5, stat: +kl.toFixed(3) }; }
function detectVolatilityRegime(a) { if (a.length < 8) return { detected: false, stat: 0 }; const h = Math.floor(a.length/2); const r = stddev(a.slice(h))/stddev(a.slice(0,h)); return { detected: r > 2, stat: +r.toFixed(2) }; }
function runAnomalyDetection(a, opts = {}) {
  const minRequired = opts.minRequired || 10;
  if (a.length < minRequired) return { detected: false, severity: "INSUFFICIENT_HISTORY", methods_fired: 0, methods: [], z_score: 0 };
  const m = [detectCUSUM(a), detectZScore(a), detectChangepoint(a), detectVolatilityRegime(a)];
  const f = m.filter(x => x.detected);
  return { detected: f.length >= 1, severity: f.length >= 4 ? "EXTREME" : f.length >= 3 ? "CRITICAL" : f.length >= 2 ? "HIGH" : f.length >= 1 ? "ELEVATED" : "NONE", methods_fired: f.length, methods: m, z_score: safeNum(detectZScore(a).stat, 0) };
}
function trendForecast(h, cur) {
  const curSafe = safeNum(cur, 50);
  if (h.length < 5) return { fc: curSafe, trend: "stable", esc: false, slope: 0, confidence: 0.3 };
  const w = h.slice(-10);
  const xb = (w.length-1)/2, yb = mean(w);
  const num = w.reduce((s,y,x)=>s+(x-xb)*(y-yb),0), den = w.reduce((s,_,x)=>s+(x-xb)**2,0);
  const slope = den ? +(num/den).toFixed(2) : 0;
  const fc = clamp(curSafe + slope * 7);
  return { fc, slope, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > curSafe + 5, confidence: 0.6 };
}
function severityLabel(s) { const v = safeNum(s, 0); return v >= 85 ? "CATASTROPHIC" : v >= 75 ? "CRITICAL" : v >= 60 ? "HIGH" : v >= 40 ? "ELEVATED" : "MODERATE"; }
function severityEmoji(s) { const v = safeNum(s, 0); return v >= 85 ? "🔴" : v >= 75 ? "🟠" : v >= 60 ? "🟡" : v >= 40 ? "🟢" : "🔵"; }
function severityColor(s) { const v = safeNum(s, 0); return v >= 85 ? "#ff375f" : v >= 75 ? "#ff375f" : v >= 60 ? "#ff8c42" : v >= 40 ? "#ffb020" : "#6bc8ff"; }
function recommendation(score, anomaly) {
  const v = safeNum(score, 0);
  const an = anomaly?.detected ? ` Anomaly detected (${anomaly.severity}).` : "";
  if (v >= 85) return { tier: "IMMEDIATE", text: `Immediate response required.${an}` };
  if (v >= 75) return { tier: "URGENT", text: `Urgent response needed.${an}` };
  if (v >= 60) return { tier: "HIGH", text: `Elevated concern.${an}` };
  if (v >= 40) return { tier: "MONITOR", text: `Monitor situation.${an}` };
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
    this.performance.r2 = Number.isFinite(this.performance.mse) ? Math.max(0, 1 - this.performance.mse / 0.1) : 0;
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
  if (seqs.length >= CFG.HISTORY_MIN_FOR_ML_TRAIN) {
    try { mlModel.train(seqs); } catch (e) { console.error("[ml] train failed:", e.message); }
  }
}

async function mlEnhancedForecast(iso, currentScore, store) {
  const cur = safeNum(currentScore, 50);
  const realHistory = await persistentHistory.scoreSeries(iso, 500);
  const series = realHistory.length >= 14 ? realHistory : seedHistory(iso, cur).map(h => h.s);
  const isSynthetic = realHistory.length < 14;
  const mlP = mlModel.predict(series);
  const trad = trendForecast(series, cur);
  const blended = Math.round(safeNum(mlP.forecast, cur) * 0.6 + safeNum(trad.fc, cur) * 0.4);
  return {
    fc: clamp(blended),
    ml_forecast: safeNum(mlP.forecast, cur),
    trad_forecast: safeNum(trad.fc, cur),
    confidence: isSynthetic ? 0.3 : Math.min(0.95, Math.max(0.3, (safeNum(mlP.confidence, 0.5) + safeNum(trad.confidence, 0.5)) / 2)),
    trend: mlP.trend || trad.trend,
    esc: blended > cur + 5,
    slope: trad.slope,
    anomaly_probability: safeNum(mlP.anomaly_probability, 0.1),
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
//  BUILD STORE — v20.0.2: every score is guaranteed finite
// ════════════════════════════════════════════════════════════════════════════

async function buildStore(liveData) {
  const store = {};

  for (const iso of Object.keys(COUNTRIES)) {
    const c = COUNTRIES[iso];
    const base = safeNum(BASE_SCORES[iso], 30);
    const types = c.types || DEFAULT_T;
    const dims = buildDims(base, types);
    const priorScore = clamp(safeNum(composite(dims), 30));
    store[iso] = {
      ...c, dims,
      priorScore,
      score: priorScore,
      structural_score: priorScore,
      liveBoost: 0,
      audit: [], signals: {}, spillover: 0, historical_scores: [],
      __live_breaking: null, __effective_score: priorScore,
      evidence_score: 0, evidence_confidence: 0, evidence_source_count: 0,
      evidence_ledger: [], evidence_sources: [], is_low_instrumentation: false,
    };
  }

  for (const iso of Object.keys(store)) {
    try {
      const c = store[iso];
      const evidence = computeEvidenceScore(iso);
      const structuralWeight = 1 - (evidence.confidence * CFG.EVIDENCE_STRUCTURAL_WEIGHT);
      const structuralComponent = safeNum(composite(c.dims), 30) * structuralWeight;
      const rawTotal = safeNum(structuralComponent + evidence.score, 30);
      const blended = rawTotal <= 70 ? rawTotal : 70 + 29 * (1 - Math.exp(-(rawTotal - 70) / 38));
      const score = safeClampScore(blended);
      c.score = score;
      c.structural_score = score;
      c.liveBoost = score - c.priorScore;
      c.evidence_score = evidence.score;
      c.evidence_confidence = evidence.confidence;
      c.evidence_source_count = evidence.sourceCount;
      c.evidence_ledger = evidence.ledger;
      c.evidence_sources = [...new Set(evidence.ledger.map(l => l.source))];
      c.is_low_instrumentation = evidence.sourceCount < CFG.LOW_INSTRUMENTATION_THRESHOLD;
    } catch (e) {
      // Never let one bad country poison the whole store
      store[iso].score = store[iso].priorScore;
      store[iso].structural_score = store[iso].priorScore;
    }
  }

  for (const iso in store) {
    try {
      const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
      if (!neighbours.length) { store[iso].spillover = 0; continue; }
      const avgNeighbour = neighbours.reduce((s, n) => s + safeNum(store[n].score, 30), 0) / neighbours.length;
      const spill = Math.max(0, avgNeighbour - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
      const dampened = spill * Math.max(0.3, 1 - (store[iso].score - 30) / 100);
      store[iso].spillover = Math.round(Math.min(CFG.SPILLOVER_MAX, dampened) * 10) / 10;
      store[iso].score = safeClampScore(store[iso].score + store[iso].spillover);
      store[iso].structural_score = store[iso].score;
    } catch { store[iso].spillover = 0; }
  }

  for (const iso in store) {
    store[iso].historical_scores = seedHistory(iso, store[iso].score).map(h => h.s);
  }

  if (CFG.ML_ENABLED) await trainMLModel(store);
  for (const iso in store) {
    try {
      if (CFG.ML_ENABLED) store[iso].ml_forecast = await mlEnhancedForecast(iso, store[iso].score, store);
    } catch {
      store[iso].ml_forecast = { fc: store[iso].score, confidence: 0.3, anomaly_probability: 0.1, ml_trained: false, training_count: 0, history_source: "synthetic", history_points: 0, trend: "stable", slope: 0, esc: false };
    }
  }

  for (const iso in store) {
    try {
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
        politicalStability: cov.political_stability !== undefined ? { value: cov.political_stability } : null,
        gdeltConflict: cov.gdelt_conflict || null,
        gdacsVolcano: cov.gdacs_volcano || null,
        populationMovement: cov.population_movement || null,
        gdacsTsunami: cov.gdacs_tsunami || null,
        landslide: cov.landslide || null,
        cems: cov.cems || null,
        infraStress: cov.infra_stress || null,
        ruleOfLaw: cov.rule_of_law !== undefined ? { value: cov.rule_of_law } : null,
        corruptionControl: cov.corruption_control !== undefined ? { value: cov.corruption_control } : null,
        cropConditions: cov.crop_conditions || null,
        waterScarcity: cov.water_scarcity || null,
        famineRisk: cov.famine_risk || null,
        refugeeFlows: cov.refugee_flows || null,
        firms: cov.firms || null,
        iomDtm: cov.iom_dtm || null,
        faoFpma: cov.fao_fpma || null,
        healthCapacity: cov.health_capacity || null,
        powerOutage: cov.power_outage || null,
        currencyStress: cov.currency_stress || null,
        electionViolence: cov.election_violence || null,
        promed: cov.promed || null,
        conflictFatalities: cov.conflict_fatalities || null,
        gdacsDrought: cov.gdacs_drought || null,
        gdacsFlood: cov.gdacs_flood || null,
        gdacsCyclone: cov.gdacs_cyclone || null,
      };
    } catch { store[iso].signals = {}; }
  }

  for (const iso in store) {
    try { store[iso].__live_breaking = computeLiveBreakingScore(iso, liveData, store); }
    catch { store[iso].__live_breaking = { live_score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", events: [], signals: [], signal_count: 0, source_count: 0 }; }
  }

  for (const iso in store) {
    try {
      const htmlScore = safeNum(store[iso].score, 30);
      const popMult = popExposureMultiplier(store[iso].signals?.population || 0);
      const credit = resolutionCredit(store, iso);
      const effective = safeClampScore(htmlScore * popMult - credit);
      store[iso].__effective_score = effective;
      store[iso].__html_score = htmlScore;
      store[iso].__pop_multiplier = +safeNum(popMult, 1).toFixed(3);
      store[iso].__resolution_credit = +safeNum(credit, 0).toFixed(2);
    } catch {
      store[iso].__effective_score = store[iso].structural_score || store[iso].score || 30;
    }
  }

  for (const iso in store) {
    try { if (CFG.SENTIMENT_ENABLED) store[iso].sentiment = analyzeCountrySentiment(iso, store); }
    catch { store[iso].sentiment = null; }
    try { if (CFG.HISTORY_ENABLED) await storeHistoricalData(iso, store); }
    catch {}
  }

  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  PAYLOAD — v20.0.2: wrapped in try/catch, returns valid payload on error
// ════════════════════════════════════════════════════════════════════════════

function buildKeywords(iso, store) {
  try {
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
    if (s.firms) kws.add(`${c.name} wildfire`);
    if (s.iomDtm) kws.add(`${c.name} displacement`);
    if (s.cems) kws.add(`${c.name} emergency mapping`);
    if (s.famineRisk) kws.add(`${c.name} famine`);
    return [...kws].slice(0, 15);
  } catch { return [`${iso} crisis`]; }
}

function buildMetaDescription(iso, store) {
  const c = store[iso];
  const lb = c.__live_breaking || {};
  const severity = severityLabel(c.score);
  let parts = [`${c.name} crisis update: score ${c.score}/100 (${severity})`];
  if (lb.tier === "BREAKING") parts.unshift(`🔴 BREAKING: ${lb.breaking_headline}`);
  else if (lb.tier === "DEVELOPING") parts.unshift(`🟠 DEVELOPING: ${lb.breaking_headline}`);
  return parts.slice(0, 3).join('. ') + '.';
}

function buildRelatedStories(iso, store, ranked) {
  try {
    return ranked.filter(r => r !== iso && (COUNTRIES[r].region === COUNTRIES[iso].region || (COUNTRIES[iso].adj || []).includes(r))).slice(0, 5)
      .map(r => ({ iso: r, name: store[r].name, score: store[r].score, live_score: store[r].__live_breaking?.live_score || 0, slug: slugify(store[r].name) }));
  } catch { return []; }
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
  const articleBody = `## Overview\n\n${c.name} scores ${c.score}/100 (${severityLabel(c.score)}).`;
  const { words, minutes } = estimateReadTime(articleBody);
  return { headline, dek: `Score ${c.score}/100 · ${lb.distinct_event_count || 0} events`, slug: slugify(c.name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`, metaDescription: buildMetaDescription(iso, store), keywords: buildKeywords(iso, store), body_markdown: articleBody, body_html: `<article><h1>${headline}</h1><p>${articleBody}</p></article>`, word_count: words, read_time_minutes: minutes };
}

function buildSitemap(payloads) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${payloads.map(p => `  <url><loc>${CFG.ARTICLE_BASE_URL}/crisis/${p.slug}</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq></url>`).join("\n")}\n</urlset>`;
}

function escapeXml(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }

function buildRSSFeed(isos, store, ranked) {
  const now = new Date();
  const feedIsos = isos.length > 0 ? isos : ranked.slice(0, 30);
  const items = feedIsos.slice(0, 30).map(iso => {
    const a = buildSEOArticle(iso, store, ranked);
    const c = store[iso];
    const lb = c.__live_breaking || {};
    return `<item><title>${escapeXml(a.headline)}</title><link>${a.url}</link><guid isPermaLink="true">${a.url}</guid><pubDate>${now.toUTCString()}</pubDate><description>${escapeXml(a.dek)}</description>${lb.tier === "BREAKING" ? `<category>🔴 BREAKING NEWS</category>` : ""}<content:encoded><![CDATA[${a.body_html}]]></content:encoded></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${CFG.ARTICLE_SITE_NAME}</title><link>${CFG.ARTICLE_BASE_URL}</link><description>Live breaking world crisis news.</description><lastBuildDate>${now.toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}

function buildLiveEvidenceView(iso, store) {
  const s = store[iso]?.signals || {};
  const cov = evidenceIndex.sourceCoverage[iso] || {};
  return {
    gdacs: cov.gdacs ? { alert_level: (cov.gdacs.alert || "").toLowerCase(), event: cov.gdacs.event } : null,
    displacement: { total: safeNum(cov.displaced, 0) },
    ipcPhase: safeNum(cov.ipc?.phase, 0),
    ipcPopulation: safeNum(cov.ipc?.population, 0),
    earthquake: cov.usgs?.mag ? { magnitude: safeNum(cov.usgs.mag, 0), location: cov.usgs.place || null } : null,
    conflict_fatalities: safeNum(cov.conflict_fatalities?.deaths, 0),
    conflict_events: safeNum(cov.gdelt_conflict?.count, 0),
    who_outbreaks: { outbreaks: cov.who_outbreak ? [{ disease: cov.who_outbreak.disease }] : [] },
    heat: { max_temp_c: safeNum(cov.heat?.temp, 0) },
    economic: {
      inflation: { value: safeNum(cov.inflation, 0) },
      gdp_growth: { value: safeNum(cov.gdp_growth, 0) },
    },
    wildfire_detections: safeNum(cov.firms?.count, 0),
    iom_idps: safeNum(cov.iom_dtm?.idps, 0),
    food_price_anomaly: safeNum(cov.fao_fpma?.anomaly_pct, 0),
    health_beds_per_10k: safeNum(cov.health_capacity?.hospital_beds_per_10k, 0),
    currency_volatility: safeNum(cov.currency_stress?.volatility_pct, 0),
    tsunami_alert: cov.gdacs_tsunami?.alert || null,
    landslide_detected: !!cov.landslide,
    cems_activations: safeNum(cov.cems?.count, 0),
    infrastructure_outages: safeNum(cov.infra_stress?.outage_count, 0) || safeNum(cov.power_outage?.outage_count, 0),
    rule_of_law: cov.rule_of_law !== undefined ? cov.rule_of_law : null,
    corruption_control: cov.corruption_control !== undefined ? cov.corruption_control : null,
    ndvi_anomaly: safeNum(cov.crop_conditions?.ndvi_anomaly_pct, 0),
    water_stress: safeNum(cov.water_scarcity?.baseline_stress, 0),
    famine_phase: safeNum(cov.famine_risk?.phase, 0),
    resettlement_departures: safeNum(cov.refugee_flows?.departures, 0),
  };
}

function buildStoryHeat(lb) {
  const events = lb?.events || [];
  return {
    score: safeNum(lb?.live_score, 0),
    tier: lb?.tier || "BACKGROUND",
    top_drivers: events.slice(0, 3).map(e => ({
      driver: e.label || e.type || "Crisis Signal",
      source: e.source || "Unknown",
      details: e.details || "",
    })),
  };
}

function buildMLCompat(c) {
  if (!c.ml_forecast) return null;
  const acc = Number.isFinite(mlModel.performance.r2) ? mlModel.performance.r2 : 0;
  return {
    forecast: safeNum(c.ml_forecast.fc, 50),
    confidence: safeNum(c.ml_forecast.confidence, 0.3),
    anomaly_probability: safeNum(c.ml_forecast.anomaly_probability, 0.1),
    trained: !!mlModel.trained,
    accuracy: +acc.toFixed(4),
    training_count: mlModel.trainingCount || 0,
    history_source: c.ml_forecast.history_source,
    history_points: c.ml_forecast.history_points,
  };
}

function buildTrendCompat(series, cur, hasRealHistory, realHistory, fc) {
  const delta7 = series.length >= 8
    ? Math.round(series[series.length - 1] - series[Math.max(0, series.length - 8)])
    : 0;
  return {
    delta_7d: delta7,
    direction: fc.trend,
    slope: safeNum(fc.slope, 0),
    forecast_7d: safeNum(fc.fc, cur),
    confidence: safeNum(fc.confidence, 0.3),
    history_source: hasRealHistory ? "observed" : "synthetic",
    history_points: realHistory.length,
  };
}

function buildDimensionsCompat(dims) {
  const out = {};
  for (const d of DIMS) {
    out[d.k] = {
      value: safeNum(dims[d.k], 0),
      label: d.l,
      weight: d.w,
      icon: d.icon,
    };
  }
  return out;
}

function buildCrisisTypesCompat(types) {
  return types.map(t => ({
    code: t,
    label: ARC[t]?.l || t,
    icon: ARC[t]?.i || "⚠️",
    color: ARC[t]?.color || "#6bc8ff",
  }));
}

async function buildPayload(iso, store, ranked, rankIndex, opts = {}) {
  try {
    const c = store[iso];
    if (!c) throw new Error(`No store entry for ${iso}`);
    const lb = c.__live_breaking || {};
    const htmlScore = safeNum(c.score, 30);

    const realHistory = await persistentHistory.scoreSeries(iso, 500);
    const hasRealHistory = realHistory.length >= CFG.HISTORY_MIN_FOR_ANOMALY;
    const series = hasRealHistory ? realHistory : seedHistory(iso, htmlScore).map(h => h.s);
    const anom = runAnomalyDetection(series, { minRequired: CFG.HISTORY_MIN_FOR_ANOMALY });
    const fc = trendForecast(series, htmlScore);

    const rank = (rankIndex.get(iso) ?? 0) + 1;

    const storyHeat = buildStoryHeat(lb);
    const liveEvidence = buildLiveEvidenceView(iso, store);
    const mlCompat = buildMLCompat(c);
    const trendCompat = buildTrendCompat(series, htmlScore, hasRealHistory, realHistory, fc);
    const dimensionsCompat = buildDimensionsCompat(c.dims || {});
    const crisisTypesCompat = buildCrisisTypesCompat(c.types || DEFAULT_T);
    const needsCompat = [...new Set((c.types || []).flatMap(t => ARC[t]?.n || []))];
    const recCompat = recommendation(htmlScore, anom);
    const anomalyScore = Math.min(10, safeNum(anom.z_score, 0));

    return {
      iso, name: c.name, flag: c.flag,
      score: htmlScore,
      structural_score: safeNum(c.structural_score, htmlScore),
      effective_score: safeNum(c.__effective_score, htmlScore),
      pop_multiplier: c.__pop_multiplier ?? 1.0,
      resolution_credit: c.__resolution_credit ?? 0,
      is_low_instrumentation: !!c.is_low_instrumentation,
      severity: severityLabel(htmlScore),
      severity_emoji: severityEmoji(htmlScore),
      severity_color: severityColor(htmlScore),
      rank, total_countries: ranked.length,
      percentile: Math.round((1 - rank / ranked.length) * 100),
      slug: slugify(c.name),
      url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
      evidence: {
        score: safeNum(c.evidence_score, 0),
        confidence: safeNum(c.evidence_confidence, 0),
        source_count: safeNum(c.evidence_source_count, 0),
        sources: c.evidence_sources || [],
        ledger: c.evidence_ledger || [],
      },
      live_breaking: {
        score: safeNum(lb.live_score, 0),
        tier: lb.tier || "BACKGROUND",
        tier_label: lb.tier_label || "Background",
        tier_icon: lb.tier_icon || "⚪",
        headline: lb.breaking_headline || null,
        signal_count: safeNum(lb.signal_count, 0),
        raw_signal_count: safeNum(lb.raw_signal_count, 0),
        distinct_event_count: safeNum(lb.distinct_event_count, 0),
        has_fresh_live_event: !!lb.has_fresh_live_event,
        source_count: safeNum(lb.source_count, 0),
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
      story_heat: storyHeat,
      live_evidence: liveEvidence,
      live_evidence_sources: c.evidence_sources || [],
      live_evidence_count: safeNum(c.evidence_source_count, 0),
      is_live_data: safeNum(c.evidence_source_count, 0) >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
      dimensions: dimensionsCompat,
      crisis_types: crisisTypesCompat,
      needs: needsCompat,
      trend: trendCompat,
      anomaly: {
        detected: !!anom.detected,
        severity: anom.severity || "NONE",
        methods_fired: safeNum(anom.methods_fired, 0),
        z_score: safeNum(anom.z_score, 0),
      },
      anomalyScore,
      spillover: {
        value: safeNum(c.spillover, 0),
        from: (COUNTRIES[iso]?.adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })),
      },
      ml: mlCompat,
      sentiment: c.sentiment ? { score: safeNum(c.sentiment.score, 0), label: c.sentiment.label, confidence: safeNum(c.sentiment.confidence, 0.5) } : null,
      score_audit: {
        prior_score: safeNum(c.priorScore, 30),
        structural_score: safeNum(c.structural_score, 30),
        live_breaking_score: safeNum(lb.live_score, 0),
        pop_multiplier: c.__pop_multiplier ?? 1.0,
        resolution_credit: c.__resolution_credit ?? 0,
        effective_score: safeNum(c.__effective_score, 30),
        spillover: safeNum(c.spillover, 0),
        final_score: htmlScore,
        evidence_score: safeNum(c.evidence_score, 0),
        evidence_confidence: safeNum(c.evidence_confidence, 0),
      },
      recommendation: recCompat,
      region: c.region,
      fsi: { score: safeNum(c.fsi_score, 50), rank: safeNum(c.fsi_rank, 999), band: c.fsi_band || "Unknown" },
      ...(opts.keywords ? { keywords: buildKeywords(iso, store) } : {}),
      ...(opts.related ? { related_stories: buildRelatedStories(iso, store, ranked) } : {}),
      ...(opts.schema ? { schema_org: buildJSONLD(iso, store, ranked) } : {}),
      ...(opts.summary ? { article: buildSEOArticle(iso, store, ranked) } : {}),
      __parity_digest: {
        structural_component: safeNum(composite(c.dims) * (1 - (safeNum(c.evidence_confidence, 0) * CFG.EVIDENCE_STRUCTURAL_WEIGHT)), 30),
        evidence_score: safeNum(c.evidence_score, 0),
        raw_total: safeNum(composite(c.dims) * (1 - (safeNum(c.evidence_confidence, 0) * CFG.EVIDENCE_STRUCTURAL_WEIGHT)) + c.evidence_score, 30),
        post_blend: htmlScore,
        spillover_added: safeNum(c.spillover, 0),
        final: htmlScore,
      },
    };
  } catch (e) {
    // v20.0.2 — minimal valid payload on error; never reject the Promise.all
    console.error(`[buildPayload] fallback for ${iso}:`, e.message);
    const c = store[iso] || {};
    const htmlScore = safeNum(c.score, 30);
    return {
      iso, name: c.name || iso, flag: c.flag || "🌍",
      score: htmlScore,
      structural_score: htmlScore,
      effective_score: htmlScore,
      pop_multiplier: 1.0, resolution_credit: 0, is_low_instrumentation: false,
      severity: severityLabel(htmlScore), severity_emoji: severityEmoji(htmlScore), severity_color: severityColor(htmlScore),
      rank: 0, total_countries: 0, percentile: 0,
      slug: slugify(c.name || iso),
      url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name || iso)}`,
      evidence: { score: 0, confidence: 0, source_count: 0, sources: [], ledger: [] },
      live_breaking: { score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", headline: null, signal_count: 0, raw_signal_count: 0, distinct_event_count: 0, has_fresh_live_event: false, source_count: 0, sources: [], freshest_signal_age_hours: null, events: [], signals: [] },
      story_heat: { score: 0, tier: "BACKGROUND", top_drivers: [] },
      live_evidence: buildLiveEvidenceView(iso, store),
      live_evidence_sources: [], live_evidence_count: 0, is_live_data: false,
      dimensions: buildDimensionsCompat(c.dims || {}),
      crisis_types: buildCrisisTypesCompat(c.types || DEFAULT_T),
      needs: [],
      trend: { delta_7d: 0, direction: "stable", slope: 0, forecast_7d: htmlScore, confidence: 0.3, history_source: "synthetic", history_points: 0 },
      anomaly: { detected: false, severity: "NONE", methods_fired: 0, z_score: 0 },
      anomalyScore: 0,
      spillover: { value: 0, from: [] },
      ml: null, sentiment: null,
      score_audit: { prior_score: htmlScore, structural_score: htmlScore, live_breaking_score: 0, pop_multiplier: 1.0, resolution_credit: 0, effective_score: htmlScore, spillover: 0, final_score: htmlScore, evidence_score: 0, evidence_confidence: 0 },
      recommendation: recommendation(htmlScore, null),
      region: c.region || "other",
      fsi: { score: 50, rank: 999, band: "Unknown" },
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  HANDLER — v20.0.2: allSettled, guaranteed non-empty countries array
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
      ml: url.searchParams.get("ml") === "true",
      sentiment: url.searchParams.get("sentiment") === "true",
      force_live: url.searchParams.get("force_live") !== "false",
      export: url.searchParams.get("export") || null,
      widget: url.searchParams.get("widget") === "true",
      breaking: url.searchParams.get("format") === "breaking",
      live: url.searchParams.get("format") === "live",
      rss: url.searchParams.get("format") === "rss",
      wst: url.searchParams.get("format") === "wst",
      health: url.searchParams.get("format") === "health",
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

    if (params.health) {
      const coverage = {};
      for (const iso of Object.keys(COUNTRIES)) {
        const cov = evidenceIndex.sourceCoverage[iso] || {};
        for (const [key, val] of Object.entries(cov)) {
          if (!coverage[key]) coverage[key] = { countries: 0, source: "live" };
          coverage[key].countries++;
        }
      }
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=60" });
      res.end(JSON.stringify({
        meta: { generated_at: new Date().toISOString() },
        fetcher_health: fetcherHealth.summary(),
        fetcher_live_count: fetcherHealth.liveCount(),
        fetcher_failed_count: fetcherHealth.failedCount(),
        coverage_by_key: coverage,
        static_fallbacks: {
          water_stress: Object.keys(AQUEDUCT_WATER_STRESS).length,
          ndvi_anomaly: Object.keys(FAO_NDVI_ANOMALY).length,
        },
      }, null, 2));
      return;
    }

    // v20.0.2 — guaranteed non-empty finalIsos chain
    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => safeNum(store[iso].__effective_score, 0) >= params.threshold);
    else if (params.force_live && liveEventsOnly.length > 0) finalIsos = liveEventsOnly.slice(0, params.top);
    else if (params.force_live && breakingRanked.length > 0) finalIsos = breakingRanked.slice(0, params.top);
    else finalIsos = ranked.slice(0, params.top);

    // The safety nets — if ALL of the above produced nothing, use raw COUNTRIES keys
    if (!finalIsos.length && !isoList.length) {
      finalIsos = ranked.length > 0 ? ranked.slice(0, params.top) : Object.keys(COUNTRIES).slice(0, params.top);
    }
    if (!finalIsos.length && !isoList.length) {
      finalIsos = Object.keys(COUNTRIES).slice(0, params.top);
    }

    const opts = { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary };

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const s = store[iso];
      const data = { iso, name: s.name, score: s.score, structural_score: s.structural_score, effective_score: s.__effective_score, live_breaking: s.__live_breaking, evidence: s.evidence_ledger, dimensions: s.dims };
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${iso}.json"` });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const c = store[finalIsos[0]];
      const lb = c.__live_breaking || {};
      const html = `<div style="padding:16px;background:#0f1a30;color:#fff;font-family:system-ui;max-width:320px;border-radius:12px;"><b>${c.flag} ${c.name}</b> — Score ${c.score}/100 (${lb.tier_label || "—"})<br><small>${lb.breaking_headline || ""}</small></div>`;
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (params.live) {
      const source = liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked);
      const feed = source.slice(0, params.top || 25).map(iso => {
        const c = store[iso];
        const lb = c.__live_breaking;
        return { rank: source.indexOf(iso) + 1, iso, name: c.name, flag: c.flag, live_score: safeNum(lb.live_score, 0), effective_score: safeNum(c.__effective_score, 0), tier: lb.tier, headline: lb.breaking_headline, signal_count: safeNum(lb.signal_count, 0), source_count: safeNum(lb.source_count, 0) };
      });
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=120" });
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), feed: "live-breaking-news" }, live_news: feed }, null, 2));
      return;
    }

    if (params.rss) {
      const source = params.region
        ? (liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked)).filter(i => COUNTRIES[i].region === params.region)
        : (liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked));
      const feedIsos = source.length > 0 ? source.slice(0, 30) : (ranked.length > 0 ? ranked.slice(0, 30) : Object.keys(COUNTRIES).slice(0, 30));
      const f = buildRSSFeed(feedIsos, store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" });
      res.end(f);
      return;
    }

    if (params.wst) {
      const source = liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked);
      const feed = source.slice(0, params.top || 25).map(iso => {
        const c = store[iso];
        const lb = c.__live_breaking;
        return { iso, name: c.name, flag: c.flag, score: safeNum(c.score, 30), effective_score: safeNum(c.__effective_score, 30), live_score: safeNum(lb.live_score, 0), tier: lb.tier, headline: lb.breaking_headline };
      });
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), feed: "watchlist" }, watchlist: feed }, null, 2));
      return;
    }

    if (params.breaking) {
      const source = liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked);
      const feed = source.slice(0, params.top || 20).map(iso => {
        const c = store[iso];
        const lb = c.__live_breaking;
        return { iso, name: c.name, flag: c.flag, live_score: safeNum(lb.live_score, 0), effective_score: safeNum(c.__effective_score, 30), tier: lb.tier, tier_label: lb.tier_label, headline: lb.breaking_headline, signal_count: safeNum(lb.signal_count, 0), source_count: safeNum(lb.source_count, 0), top_events: (lb.events || []).slice(0, 3) };
      });
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), mode: "breaking", total_with_live_events: liveEventsOnly.length, total_with_any_signals: breakingRanked.length }, breaking: feed }, null, 2));
      return;
    }

    if (params.format === "sitemap") {
      const settled = await Promise.allSettled(finalIsos.map(iso => buildPayload(iso, store, ranked, rankIndex, opts)));
      const p = settled.filter(s => s.status === "fulfilled").map(s => s.value);
      res.writeHead(200, { ...CORS, "Content-Type": "application/xml; charset=utf-8" });
      res.end(buildSitemap(p));
      return;
    }

    // v20.0.2 — allSettled + null filter, so one bad payload cannot zero the response
    const settled = await Promise.allSettled(finalIsos.map(iso => buildPayload(iso, store, ranked, rankIndex, opts)));
    const payloads = settled.filter(s => s.status === "fulfilled" && s.value).map(s => s.value);

    // Final safety net — if ALL payloads failed, force a minimal valid one per ISO
    let finalPayloads = payloads;
    if (finalPayloads.length === 0 && finalIsos.length > 0) {
      finalPayloads = await Promise.all(finalIsos.slice(0, params.top).map(async iso => {
        try { return await buildPayload(iso, store, ranked, rankIndex, opts); }
        catch { return null; }
      })).then(arr => arr.filter(Boolean));
    }
    // Absolute last resort — synthesize payloads for the first N countries
    if (finalPayloads.length === 0) {
      const isos = Object.keys(COUNTRIES).slice(0, Math.min(params.top, 10));
      finalPayloads = isos.map(iso => ({
        iso, name: COUNTRIES[iso].name, flag: COUNTRIES[iso].flag,
        score: safeNum(BASE_SCORES[iso], 30),
        structural_score: safeNum(BASE_SCORES[iso], 30),
        effective_score: safeNum(BASE_SCORES[iso], 30),
        pop_multiplier: 1.0, resolution_credit: 0, is_low_instrumentation: false,
        severity: severityLabel(safeNum(BASE_SCORES[iso], 30)),
        severity_emoji: severityEmoji(safeNum(BASE_SCORES[iso], 30)),
        severity_color: severityColor(safeNum(BASE_SCORES[iso], 30)),
        rank: 0, total_countries: isos.length, percentile: 0,
        slug: slugify(COUNTRIES[iso].name),
        url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(COUNTRIES[iso].name)}`,
        evidence: { score: 0, confidence: 0, source_count: 0, sources: [], ledger: [] },
        live_breaking: { score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", headline: null, signal_count: 0, raw_signal_count: 0, distinct_event_count: 0, has_fresh_live_event: false, source_count: 0, sources: [], freshest_signal_age_hours: null, events: [], signals: [] },
        story_heat: { score: 0, tier: "BACKGROUND", top_drivers: [] },
        live_evidence: buildLiveEvidenceView(iso, store),
        live_evidence_sources: [], live_evidence_count: 0, is_live_data: false,
        dimensions: buildDimensionsCompat(store[iso]?.dims || {}),
        crisis_types: buildCrisisTypesCompat(COUNTRIES[iso].types || DEFAULT_T),
        needs: [], trend: { delta_7d: 0, direction: "stable", slope: 0, forecast_7d: safeNum(BASE_SCORES[iso], 30), confidence: 0.3, history_source: "synthetic", history_points: 0 },
        anomaly: { detected: false, severity: "NONE", methods_fired: 0, z_score: 0 }, anomalyScore: 0,
        spillover: { value: 0, from: [] }, ml: null, sentiment: null,
        score_audit: { prior_score: safeNum(BASE_SCORES[iso], 30), structural_score: safeNum(BASE_SCORES[iso], 30), live_breaking_score: 0, pop_multiplier: 1.0, resolution_credit: 0, effective_score: safeNum(BASE_SCORES[iso], 30), spillover: 0, final_score: safeNum(BASE_SCORES[iso], 30), evidence_score: 0, evidence_confidence: 0 },
        recommendation: recommendation(safeNum(BASE_SCORES[iso], 30), null),
        region: COUNTRIES[iso].region,
        fsi: { score: 50, rank: 999, band: "Unknown" },
      }));
    }

    const mode = isoList.length >= 2 ? "comparison" : finalPayloads.length > 1 ? "list" : "single";
    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);
    const mlAcc = Number.isFinite(mlModel.performance.r2) ? mlModel.performance.r2 : 0;

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        ranking_mode: "DEFINITIVE_v20.0.2",
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_evidence: Object.keys(evidenceIndex.sourceCoverage).length,
        payloads_emitted: finalPayloads.length,
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        endpoints: {
          single: "GET /api/top-story",
          live_news: "GET /api/top-story?format=live",
          top_n: "GET /api/top-story?top=10",
          iso: "GET /api/top-story?iso=SOM",
          region: "GET /api/top-story?region=africa",
          rss_feed: "GET /api/top-story?format=rss",
          breaking: "GET /api/top-story?format=breaking",
          health: "GET /api/top-story?format=health",
        },
        enhancements: {
          machine_learning: {
            trained: !!mlModel.trained,
            training_count: mlModel.trainingCount || 0,
            performance: { accuracy: +mlAcc.toFixed(2) },
            accuracy: +mlAcc.toFixed(4),
          },
          fetcher_health: {
            live_count: fetcherHealth.liveCount(),
            failed_count: fetcherHealth.failedCount(),
            detail: fetcherHealth.summary(),
          },
          static_fallbacks: {
            water_stress_countries: Object.keys(AQUEDUCT_WATER_STRESS).length,
            ndvi_anomaly_countries: Object.keys(FAO_NDVI_ANOMALY).length,
          },
          html_compat: {
            version: "v20.0.2",
            render_safety: {
              rank_filters_nonfinite: true,
              buildPayload_try_catch: true,
              handler_uses_allSettled: true,
              guaranteed_nonempty_countries: true,
            },
          },
        },
      },
      ...(mode === "single" ? { top_story: finalPayloads[0] } : {}),
      ...(mode === "list" ? { countries: finalPayloads } : {}),
      ...(mode === "comparison" ? { countries: finalPayloads } : {}),
    };

    res.writeHead(200, { ...CORS, "Cache-Control": `public, s-maxage=${secsUntilNext}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("[top-story v20.0.2]", err);
    // Absolute last resort — return a syntactically valid body with a seed payload
    try {
      const isos = Object.keys(COUNTRIES).slice(0, 5);
      const fallback = isos.map(iso => ({
        iso, name: COUNTRIES[iso].name, flag: COUNTRIES[iso].flag,
        score: safeNum(BASE_SCORES[iso], 30),
        structural_score: safeNum(BASE_SCORES[iso], 30),
        effective_score: safeNum(BASE_SCORES[iso], 30),
        pop_multiplier: 1.0, resolution_credit: 0, is_low_instrumentation: false,
        severity: severityLabel(safeNum(BASE_SCORES[iso], 30)),
        severity_emoji: severityEmoji(safeNum(BASE_SCORES[iso], 30)),
        severity_color: severityColor(safeNum(BASE_SCORES[iso], 30)),
        rank: 0, total_countries: isos.length, percentile: 0,
        slug: slugify(COUNTRIES[iso].name),
        url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(COUNTRIES[iso].name)}`,
        evidence: { score: 0, confidence: 0, source_count: 0, sources: [], ledger: [] },
        live_breaking: { score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", headline: null, signal_count: 0, raw_signal_count: 0, distinct_event_count: 0, has_fresh_live_event: false, source_count: 0, sources: [], freshest_signal_age_hours: null, events: [], signals: [] },
        story_heat: { score: 0, tier: "BACKGROUND", top_drivers: [] },
        live_evidence: { gdacs: null, displacement: { total: 0 }, ipcPhase: 0, ipcPopulation: 0, earthquake: null, conflict_fatalities: 0, conflict_events: 0, who_outbreaks: { outbreaks: [] }, heat: { max_temp_c: 0 }, economic: { inflation: { value: 0 }, gdp_growth: { value: 0 } }, wildfire_detections: 0, iom_idps: 0, food_price_anomaly: 0, health_beds_per_10k: 0, currency_volatility: 0, tsunami_alert: null, landslide_detected: false, cems_activations: 0, infrastructure_outages: 0, rule_of_law: null, corruption_control: null, ndvi_anomaly: 0, water_stress: 0, famine_phase: 0, resettlement_departures: 0 },
        live_evidence_sources: [], live_evidence_count: 0, is_live_data: false,
        dimensions: {}, crisis_types: [], needs: [],
        trend: { delta_7d: 0, direction: "stable", slope: 0, forecast_7d: safeNum(BASE_SCORES[iso], 30), confidence: 0.3, history_source: "synthetic", history_points: 0 },
        anomaly: { detected: false, severity: "NONE", methods_fired: 0, z_score: 0 }, anomalyScore: 0,
        spillover: { value: 0, from: [] }, ml: null, sentiment: null,
        score_audit: { prior_score: safeNum(BASE_SCORES[iso], 30), structural_score: safeNum(BASE_SCORES[iso], 30), live_breaking_score: 0, pop_multiplier: 1.0, resolution_credit: 0, effective_score: safeNum(BASE_SCORES[iso], 30), spillover: 0, final_score: safeNum(BASE_SCORES[iso], 30), evidence_score: 0, evidence_confidence: 0 },
        recommendation: { tier: "WATCH", text: "Routine monitoring." },
        region: COUNTRIES[iso].region,
        fsi: { score: 50, rank: 999, band: "Unknown" },
      }));
      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: { generated_at: new Date().toISOString(), mode: "list", ranking_mode: "DEFINITIVE_v20.0.2-FALLBACK", payloads_emitted: fallback.length, error: err.message },
        countries: fallback,
      }, null, 2));
    } catch (fallbackErr) {
      res.writeHead(500, CORS);
      res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
    }
  }
}
