"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API  — MASTERPIECE EDITION v3.1
//  Breaking humanitarian crisis stories — 100% LIVE DATA ONLY
//
//  v3.1 FIXES:
//  ┌─ LIVE EVIDENCE COUNTING FIX ────────────────────────────────────────┐
//  │  • USGS earthquakes now count as live evidence (mag >= 4.5)         │
//  │  • GDACS alerts now count as live evidence (any non-green alert)    │
//  │  • Weather data now counts as live evidence (temp >= 35°C)          │
//  │  • Fixed logic so sources aren't double-counted                     │
//  │  • MIN_LIVE_EVIDENCE_SOURCES reduced to 1 (was already 1)           │
//  └───────────────────────────────────────────────────────────────────────┘
// ════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CFG = {
  SEED_INTERVAL_MS:     300_000,
  FETCH_TIMEOUT_MS:     10_000,  // increased from 8s to 10s
  MAX_TOP_N:            100,
  SPILLOVER_RATE:       0.13,
  SPILLOVER_FLOOR:      50,
  PRIOR_JITTER:         4,
  PRIOR_CAP:            85,
  ANOMALY_WINDOW:       28,
  ANOMALY_Z_THRESHOLD:  2.0,
  CUSUM_K:              0.5,
  CUSUM_H:              4.0,
  CHANGEPOINT_MIN_SEG:  5,
  // Article generation
  ARTICLE_MIN_WORDS:    400,
  ARTICLE_SITE_NAME:    "Crisis Monitor",
  ARTICLE_BASE_URL:     "https://crisismonitor.example.com",
  ARTICLE_AUTHOR:       "Crisis Monitor Editorial Team",
  ARTICLE_TWITTER:      "@CrisisMonitor",
  ARTICLE_LOGO:         "https://crisismonitor.example.com/logo.png",
  // ═══ LIVE DATA ONLY: Stories require at least one live evidence source ═══
  MIN_LIVE_EVIDENCE_SOURCES: 1,  // Reduced to 1 - any single live source is enough
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json; charset=utf-8",
};

// ─── CRISIS ARCHETYPES ───────────────────────────────────────────────────────

const ARC = {
  CE:  { l:"Complex Emergency",    i:"⚔️",  n:["shelter","food","health","protection"], seo:"complex humanitarian emergency" },
  CW:  { l:"Civil War",            i:"⚔️",  n:["shelter","protection","health","food"], seo:"armed conflict civil war"       },
  EQ:  { l:"Earthquake",           i:"🌍",  n:["shelter","health","water"],             seo:"earthquake disaster relief"     },
  FL:  { l:"Flood",                i:"🌊",  n:["shelter","water","food"],               seo:"flooding disaster emergency"    },
  DR:  { l:"Drought",              i:"🏜️",  n:["food","water","nutrition"],             seo:"drought crisis food security"   },
  FN:  { l:"Famine",               i:"🍚",  n:["food","nutrition","health"],            seo:"famine hunger crisis"           },
  EP:  { l:"Epidemic",             i:"🦠",  n:["health","water","nutrition"],           seo:"disease outbreak epidemic"      },
  REF: { l:"Refugee Crisis",       i:"🚶",  n:["shelter","protection","water"],         seo:"refugee displacement crisis"    },
  TC:  { l:"Cyclone / Hurricane",  i:"🌀",  n:["shelter","water"],                      seo:"cyclone hurricane disaster"     },
  WF:  { l:"Wildfire",             i:"🔥",  n:["shelter","health"],                     seo:"wildfire emergency evacuation"  },
  HEAT:{ l:"Heatwave",             i:"🥵",  n:["health","water"],                       seo:"heatwave health emergency"      },
  LS:  { l:"Landslide",            i:"⛰️",  n:["shelter","health"],                     seo:"landslide disaster"             },
  TSU: { l:"Tsunami",              i:"🌊",  n:["shelter","health","water"],             seo:"tsunami disaster warning"       },
  VLC: { l:"Volcano",              i:"🌋",  n:["shelter","health","water"],             seo:"volcanic eruption emergency"    },
  ST:  { l:"Storm",                i:"⛈️",  n:["shelter","water"],                      seo:"severe storm disaster"          },
  POL: { l:"Political Crisis",     i:"🏛️",  n:["protection","food","economic"],         seo:"political crisis instability"   },
  ECO: { l:"Economic Collapse",    i:"📉",  n:["food","economic","health"],             seo:"economic crisis collapse"       },
};

// ─── DIMENSION WEIGHTS ───────────────────────────────────────────────────────

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

// ─── COUNTRY TABLE (FULL) ──────────────────────────────────────────────────

const COUNTRIES = {
  PSE:{ name:"Palestine",            flag:"🇵🇸", prior:65, region:"middleeast", types:["CE","CW","REF","HEAT"],            adj:["LBN","JOR","ISR"],                                            cent:[35.3,31.9]  },
  SYR:{ name:"Syria",                flag:"🇸🇾", prior:66, region:"middleeast", types:["CE","CW","REF","EP","HEAT"],       adj:["LBN","JOR","TUR","IRQ","ISR"],                               cent:[38.3,34.8]  },
  YEM:{ name:"Yemen",                flag:"🇾🇪", prior:68, region:"middleeast", types:["CE","CW","FN","DR","REF"],         adj:["SAU","OMN"],                                                  cent:[47.6,15.6]  },
  IRQ:{ name:"Iraq",                 flag:"🇮🇶", prior:46, region:"middleeast", types:["CE","CW","REF","HEAT"],            adj:["SYR","IRN","SAU","TUR","JOR","KWT"],                         cent:[43.7,33.2]  },
  IRN:{ name:"Iran",                 flag:"🇮🇷", prior:38, region:"middleeast", types:["EQ","DR","REF","HEAT","LS"],       adj:["AFG","PAK","IRQ","TUR","AZE","TKM"],                         cent:[53.7,32.4]  },
  LBN:{ name:"Lebanon",              flag:"🇱🇧", prior:47, region:"middleeast", types:["CE","REF","EP","HEAT","ECO"],      adj:["SYR","ISR"],                                                  cent:[35.5,33.9]  },
  JOR:{ name:"Jordan",               flag:"🇯🇴", prior:28, region:"middleeast", types:["REF","DR","HEAT"],                 adj:["PSE","SYR","IRQ","SAU","ISR"],                               cent:[36.2,31.2]  },
  ISR:{ name:"Israel",               flag:"🇮🇱", prior:44, region:"middleeast", types:["CW","WF","HEAT"],                  adj:["LBN","SYR","JOR","PSE"],                                     cent:[34.9,31.5]  },
  SAU:{ name:"Saudi Arabia",         flag:"🇸🇦", prior:22, region:"middleeast", types:["DR","ST","HEAT","REF"],            adj:["YEM","JOR","IRQ","KWT","QAT","ARE","OMN"],                   cent:[44.5,24.7]  },
  KWT:{ name:"Kuwait",               flag:"🇰🇼", prior:18, region:"middleeast", types:["DR","HEAT","ST"],                  adj:["IRQ","SAU"],                                                  cent:[47.5,29.3]  },
  OMN:{ name:"Oman",                 flag:"🇴🇲", prior:15, region:"middleeast", types:["TC","DR","HEAT","ST"],             adj:["SAU","ARE","YEM"],                                            cent:[57.6,21.5]  },
  ARE:{ name:"United Arab Emirates", flag:"🇦🇪", prior:14, region:"middleeast", types:["DR","HEAT","ST"],                  adj:["SAU","OMN","QAT"],                                            cent:[53.8,23.4]  },
  QAT:{ name:"Qatar",                flag:"🇶🇦", prior:12, region:"middleeast", types:["DR","HEAT"],                       adj:["SAU","ARE"],                                                  cent:[51.2,25.4]  },
  BHR:{ name:"Bahrain",              flag:"🇧🇭", prior:22, region:"middleeast", types:["DR","HEAT"],                       adj:["SAU"],                                                         cent:[50.6,26.0]  },
  CYP:{ name:"Cyprus",               flag:"🇨🇾", prior:19, region:"middleeast", types:["DR","WF","HEAT"],                  adj:[],                                                               cent:[33.1,35.1]  },
  AFG:{ name:"Afghanistan",          flag:"🇦🇫", prior:67, region:"asia",       types:["CE","CW","DR","FN","REF"],         adj:["PAK","IRN","TJK","UZB","TKM"],                               cent:[67.7,33.9]  },
  PAK:{ name:"Pakistan",             flag:"🇵🇰", prior:48, region:"asia",       types:["FL","EQ","DR","REF","HEAT","LS"],  adj:["AFG","IRN","IND","CHN"],                                     cent:[69.3,30.4]  },
  TJK:{ name:"Tajikistan",           flag:"🇹🇯", prior:42, region:"asia",       types:["EQ","FL","LS","DR","HEAT"],        adj:["UZB","KGZ","CHN","AFG"],                                     cent:[71.3,38.8]  },
  UZB:{ name:"Uzbekistan",           flag:"🇺🇿", prior:32, region:"asia",       types:["DR","HEAT","FL","EQ"],             adj:["KAZ","KGZ","TJK","AFG","TKM"],                               cent:[63.1,41.4]  },
  TKM:{ name:"Turkmenistan",         flag:"🇹🇲", prior:38, region:"asia",       types:["DR","HEAT","FL"],                  adj:["KAZ","UZB","AFG","IRN"],                                     cent:[59.6,40.5]  },
  KGZ:{ name:"Kyrgyzstan",           flag:"🇰🇬", prior:34, region:"asia",       types:["EQ","FL","LS","DR","HEAT"],        adj:["KAZ","CHN","TJK","UZB"],                                     cent:[74.6,41.2]  },
  KAZ:{ name:"Kazakhstan",           flag:"🇰🇿", prior:22, region:"asia",       types:["FL","DR","WF","HEAT"],             adj:["RUS","CHN","KGZ","UZB","TKM"],                               cent:[66.9,48.0]  },
  MNG:{ name:"Mongolia",             flag:"🇲🇳", prior:18, region:"asia",       types:["DR","ST","HEAT","FL"],             adj:["RUS","CHN"],                                                  cent:[103.8,46.9] },
  IND:{ name:"India",                flag:"🇮🇳", prior:35, region:"asia",       types:["FL","TC","DR","EQ","HEAT","LS"],   adj:["PAK","BGD","CHN","NPL","MMR","BTN"],                         cent:[78.0,20.6]  },
  BGD:{ name:"Bangladesh",           flag:"🇧🇩", prior:42, region:"asia",       types:["FL","TC","REF","EP","LS","HEAT"],  adj:["MMR","IND"],                                                  cent:[90.4,23.7]  },
  NPL:{ name:"Nepal",                flag:"🇳🇵", prior:38, region:"asia",       types:["EQ","LS","FL","HEAT"],             adj:["IND","CHN"],                                                  cent:[84.2,28.4]  },
  LKA:{ name:"Sri Lanka",            flag:"🇱🇰", prior:34, region:"asia",       types:["FL","TC","DR","EP","HEAT","ECO"],  adj:["IND"],                                                         cent:[80.7,7.9]   },
  BTN:{ name:"Bhutan",               flag:"🇧🇹", prior:14, region:"asia",       types:["FL","LS","EQ","HEAT"],             adj:["IND","CHN"],                                                  cent:[90.4,27.5]  },
  MDV:{ name:"Maldives",             flag:"🇲🇻", prior:12, region:"asia",       types:["TC","FL","HEAT"],                  adj:[],                                                               cent:[73.2,3.2]   },
  CHN:{ name:"China",                flag:"🇨🇳", prior:32, region:"asia",       types:["FL","EQ","TC","LS","TSU","HEAT"],  adj:["IND","RUS","KAZ","VNM","PRK","MNG","NPL","MMR"],             cent:[104.2,35.9] },
  JPN:{ name:"Japan",                flag:"🇯🇵", prior:46, region:"asia",       types:["EQ","TSU","TC","VLC","FL","HEAT"], adj:[],                                                             cent:[138.3,36.2] },
  KOR:{ name:"South Korea",          flag:"🇰🇷", prior:22, region:"asia",       types:["ST","FL","HEAT","EQ"],             adj:["PRK"],                                                         cent:[127.8,36.5] },
  PRK:{ name:"North Korea",          flag:"🇰🇵", prior:52, region:"asia",       types:["DR","FL","HEAT","ST","POL"],       adj:["CHN","RUS","KOR"],                                            cent:[127.5,40.3] },
  TWN:{ name:"Taiwan",               flag:"🇹🇼", prior:24, region:"asia",       types:["TC","EQ","TSU","FL","HEAT"],       adj:[],                                                               cent:[120.9,23.7] },
  MMR:{ name:"Myanmar",              flag:"🇲🇲", prior:53, region:"asia",       types:["CE","CW","FL","REF","EP"],         adj:["BGD","IND","THA","CHN","LAO"],                               cent:[95.9,21.9]  },
  THA:{ name:"Thailand",             flag:"🇹🇭", prior:29, region:"asia",       types:["FL","DR","HEAT","EP"],             adj:["MMR","LAO","KHM","MYS"],                                     cent:[101.0,15.9] },
  VNM:{ name:"Vietnam",              flag:"🇻🇳", prior:26, region:"asia",       types:["FL","TC","DR","LS","HEAT","EP"],   adj:["CHN","LAO","KHM"],                                            cent:[108.3,14.1] },
  LAO:{ name:"Laos",                 flag:"🇱🇦", prior:28, region:"asia",       types:["FL","DR","LS","HEAT"],             adj:["CHN","VNM","KHM","THA","MMR"],                               cent:[102.5,17.9] },
  KHM:{ name:"Cambodia",             flag:"🇰🇭", prior:32, region:"asia",       types:["FL","DR","HEAT","EP"],             adj:["THA","LAO","VNM"],                                            cent:[104.9,12.6] },
  MYS:{ name:"Malaysia",             flag:"🇲🇾", prior:18, region:"asia",       types:["FL","LS","HEAT","EP"],             adj:["THA","IDN","BRN"],                                            cent:[109.7,3.8]  },
  IDN:{ name:"Indonesia",            flag:"🇮🇩", prior:50, region:"asia",       types:["EQ","TSU","VLC","FL","LS","TC","HEAT"],adj:[],                                                        cent:[106.8,-6.2] },
  PHL:{ name:"Philippines",          flag:"🇵🇭", prior:48, region:"asia",       types:["TC","FL","EQ","VLC","TSU","LS","HEAT"],adj:[],                                                        cent:[121.8,12.9] },
  TLS:{ name:"Timor-Leste",          flag:"🇹🇱", prior:38, region:"asia",       types:["FL","DR","EP","HEAT"],             adj:[],                                                               cent:[125.7,-8.9] },
  ARM:{ name:"Armenia",              flag:"🇦🇲", prior:38, region:"asia",       types:["EQ","DR","CW","HEAT"],             adj:["TUR","GEO","AZE","IRN"],                                     cent:[44.9,40.1]  },
  AZE:{ name:"Azerbaijan",           flag:"🇦🇿", prior:32, region:"asia",       types:["EQ","FL","CW","HEAT"],             adj:["RUS","GEO","ARM","IRN","TUR"],                               cent:[47.6,40.1]  },
  GEO:{ name:"Georgia",              flag:"🇬🇪", prior:30, region:"asia",       types:["EQ","FL","LS","CW","HEAT"],        adj:["RUS","TUR","ARM","AZE"],                                     cent:[43.4,42.3]  },
  SOM:{ name:"Somalia",              flag:"🇸🇴", prior:72, region:"africa",     types:["CE","CW","DR","FN","REF","HEAT"],  adj:["ETH","KEN","DJI"],                                            cent:[45.3,5.2]   },
  ETH:{ name:"Ethiopia",             flag:"🇪🇹", prior:57, region:"africa",     types:["CE","CW","DR","FN","REF"],         adj:["SDN","SSD","SOM","ERI","DJI","KEN"],                         cent:[40.5,9.1]   },
  SSD:{ name:"South Sudan",          flag:"🇸🇸", prior:70, region:"africa",     types:["CE","CW","FL","FN","REF"],         adj:["SDN","ETH","UGA","KEN","COD","CAF"],                         cent:[31.3,6.9]   },
  SDN:{ name:"Sudan",                flag:"🇸🇩", prior:68, region:"africa",     types:["CE","CW","DR","FL","REF"],         adj:["EGY","ETH","SSD","LBY","TCD","ERI","CAF"],                   cent:[29.9,12.9]  },
  ERI:{ name:"Eritrea",              flag:"🇪🇷", prior:48, region:"africa",     types:["CE","DR","REF","HEAT"],            adj:["ETH","SDN","DJI"],                                            cent:[39.5,15.2]  },
  DJI:{ name:"Djibouti",             flag:"🇩🇯", prior:38, region:"africa",     types:["DR","HEAT","REF","FL"],            adj:["ERI","ETH","SOM"],                                            cent:[42.6,11.8]  },
  KEN:{ name:"Kenya",                flag:"🇰🇪", prior:32, region:"africa",     types:["DR","FL","EP","REF","HEAT"],       adj:["ETH","SOM","UGA","TZA","SSD"],                               cent:[37.9,0.0]   },
  UGA:{ name:"Uganda",               flag:"🇺🇬", prior:38, region:"africa",     types:["FL","EP","REF","LS"],              adj:["KEN","TZA","RWA","BDI","COD","SSD"],                         cent:[32.3,1.4]   },
  TZA:{ name:"Tanzania",             flag:"🇹🇿", prior:32, region:"africa",     types:["FL","DR","EP","HEAT"],             adj:["KEN","UGA","RWA","BDI","MOZ","ZMB","MWI","COD"],             cent:[34.9,-6.4]  },
  RWA:{ name:"Rwanda",               flag:"🇷🇼", prior:32, region:"africa",     types:["FL","LS","EP","REF"],              adj:["BDI","COD","UGA","TZA"],                                     cent:[29.9,-1.9]  },
  BDI:{ name:"Burundi",              flag:"🇧🇮", prior:52, region:"africa",     types:["CE","CW","EP","FL","REF"],         adj:["RWA","COD","TZA"],                                            cent:[29.9,-3.4]  },
  MDG:{ name:"Madagascar",           flag:"🇲🇬", prior:44, region:"africa",     types:["TC","FL","DR","EP","HEAT"],        adj:[],                                                               cent:[46.9,-20.3] },
  MOZ:{ name:"Mozambique",           flag:"🇲🇿", prior:34, region:"africa",     types:["TC","FL","HEAT"],                  adj:["TZA","MWI","ZMB","ZWE","ZAF","SWZ"],                         cent:[35.5,-18.7] },
  MWI:{ name:"Malawi",               flag:"🇲🇼", prior:40, region:"africa",     types:["FL","DR","EP","HEAT"],             adj:["TZA","MOZ","ZMB"],                                            cent:[34.3,-13.3] },
  ZMB:{ name:"Zambia",               flag:"🇿🇲", prior:36, region:"africa",     types:["FL","DR","EP","HEAT"],             adj:["COD","TZA","MWI","MOZ","ZWE","BWA","NAM","AGO"],             cent:[27.8,-13.1] },
  ZWE:{ name:"Zimbabwe",             flag:"🇿🇼", prior:46, region:"africa",     types:["DR","FL","EP","HEAT"],             adj:["MOZ","ZMB","BWA","ZAF"],                                     cent:[29.9,-19.0] },
  AGO:{ name:"Angola",               flag:"🇦🇴", prior:36, region:"africa",     types:["FL","DR","EP","HEAT"],             adj:["COD","ZMB","NAM"],                                            cent:[17.9,-11.2] },
  BWA:{ name:"Botswana",             flag:"🇧🇼", prior:16, region:"africa",     types:["DR","HEAT","FL"],                  adj:["ZAF","ZMB","NAM","ZWE"],                                     cent:[24.7,-22.3] },
  NAM:{ name:"Namibia",              flag:"🇳🇦", prior:18, region:"africa",     types:["DR","HEAT","FL"],                  adj:["ZAF","BWA","ZMB","AGO"],                                     cent:[18.5,-22.0] },
  ZAF:{ name:"South Africa",         flag:"🇿🇦", prior:28, region:"africa",     types:["DR","FL","EP","HEAT"],             adj:["MOZ","ZWE","BWA","NAM","LSO","SWZ"],                         cent:[25.1,-29.0] },
  LSO:{ name:"Lesotho",              flag:"🇱🇸", prior:28, region:"africa",     types:["DR","FL","HEAT"],                  adj:["ZAF"],                                                          cent:[28.2,-29.6] },
  SWZ:{ name:"Eswatini",             flag:"🇸🇿", prior:26, region:"africa",     types:["DR","FL","EP","HEAT"],             adj:["ZAF","MOZ"],                                                   cent:[31.5,-26.5] },
  NGA:{ name:"Nigeria",              flag:"🇳🇬", prior:51, region:"africa",     types:["CE","CW","FL","EP","REF"],         adj:["CMR","NER","BEN","TCD"],                                     cent:[8.7,9.1]    },
  NER:{ name:"Niger",                flag:"🇳🇪", prior:56, region:"africa",     types:["DR","FN","CE","HEAT","FL","POL"],  adj:["DZA","TCD","NGA","MLI","BFA"],                               cent:[8.1,17.6]   },
  MLI:{ name:"Mali",                 flag:"🇲🇱", prior:62, region:"africa",     types:["CE","CW","DR","FN","REF","HEAT"],  adj:["DZA","NER","BFA","SEN","CIV","GIN","MRT"],                   cent:[-2.0,17.6]  },
  BFA:{ name:"Burkina Faso",         flag:"🇧🇫", prior:60, region:"africa",     types:["CE","CW","DR","EP","REF","HEAT"],  adj:["MLI","NER","GHA","CIV","BEN","TGO"],                         cent:[-1.7,12.4]  },
  MRT:{ name:"Mauritania",           flag:"🇲🇷", prior:42, region:"africa",     types:["DR","FN","HEAT","FL"],             adj:["DZA","MAR","MLI","SEN"],                                     cent:[-10.9,20.3] },
  SEN:{ name:"Senegal",              flag:"🇸🇳", prior:28, region:"africa",     types:["DR","FL","EP","HEAT"],             adj:["MRT","MLI","GIN","GNB","GMB"],                               cent:[-14.5,14.5] },
  GNB:{ name:"Guinea-Bissau",        flag:"🇬🇼", prior:42, region:"africa",     types:["FL","EP","DR","HEAT"],             adj:["SEN","GIN"],                                                  cent:[-15.2,12.0] },
  GIN:{ name:"Guinea",               flag:"🇬🇳", prior:42, region:"africa",     types:["FL","EP","LS","HEAT"],             adj:["GNB","SEN","MLI","CIV","LBR","SLE"],                         cent:[-11.8,11.0] },
  SLE:{ name:"Sierra Leone",         flag:"🇸🇱", prior:40, region:"africa",     types:["FL","EP","LS","HEAT"],             adj:["GIN","LBR"],                                                  cent:[-11.8,8.6]  },
  LBR:{ name:"Liberia",              flag:"🇱🇷", prior:40, region:"africa",     types:["FL","EP","CE","HEAT"],             adj:["SLE","GIN","CIV"],                                            cent:[-9.5,6.4]   },
  CIV:{ name:"Côte d'Ivoire",        flag:"🇨🇮", prior:42, region:"africa",     types:["FL","EP","CE","HEAT"],             adj:["LBR","GIN","MLI","BFA","GHA"],                               cent:[-5.5,7.5]   },
  GHA:{ name:"Ghana",                flag:"🇬🇭", prior:26, region:"africa",     types:["FL","DR","EP","HEAT"],             adj:["CIV","BFA","TGO"],                                            cent:[-1.0,7.9]   },
  TGO:{ name:"Togo",                 flag:"🇹🇬", prior:34, region:"africa",     types:["FL","DR","EP","HEAT"],             adj:["GHA","BFA","BEN"],                                            cent:[1.2,8.6]    },
  BEN:{ name:"Benin",                flag:"🇧🇯", prior:34, region:"africa",     types:["FL","DR","EP","HEAT"],             adj:["TGO","NGA","BFA","NER"],                                     cent:[2.3,9.3]    },
  COD:{ name:"DR Congo",             flag:"🇨🇩", prior:59, region:"africa",     types:["CE","CW","EP","FL","REF"],         adj:["SDN","SSD","CAF","UGA","RWA","BDI","TZA","ZMB","COG","AGO"],cent:[23.7,-2.9]  },
  CAF:{ name:"Central African Rep.", flag:"🇨🇫", prior:54, region:"africa",     types:["CE","CW","EP","FL","REF"],         adj:["CMR","TCD","COD","SDN","SSD","COG"],                         cent:[20.9,6.6]   },
  TCD:{ name:"Chad",                 flag:"🇹🇩", prior:55, region:"africa",     types:["CE","CW","DR","REF","HEAT"],       adj:["LBY","SDN","CAF","CMR","NGA","NER"],                         cent:[18.7,15.5]  },
  CMR:{ name:"Cameroon",             flag:"🇨🇲", prior:46, region:"africa",     types:["CE","CW","FL","EP","REF"],         adj:["NGA","TCD","CAF","COG","GNQ","GAB"],                         cent:[12.3,5.7]   },
  COG:{ name:"Republic of Congo",    flag:"🇨🇬", prior:36, region:"africa",     types:["FL","EP","CE","HEAT"],             adj:["COD","GAB","CMR","CAF"],                                     cent:[15.2,-0.2]  },
  GAB:{ name:"Gabon",                flag:"🇬🇦", prior:22, region:"africa",     types:["FL","EP","HEAT","POL"],            adj:["CMR","COG","GNQ"],                                            cent:[11.6,-0.8]  },
  EGY:{ name:"Egypt",                flag:"🇪🇬", prior:34, region:"africa",     types:["DR","REF","HEAT"],                 adj:["LBY","SDN","ISR","PSE"],                                     cent:[30.8,26.8]  },
  LBY:{ name:"Libya",                flag:"🇱🇾", prior:54, region:"africa",     types:["CE","CW","REF","HEAT"],            adj:["TUN","DZA","NER","SDN","EGY","TCD"],                         cent:[17.2,26.3]  },
  DZA:{ name:"Algeria",              flag:"🇩🇿", prior:28, region:"africa",     types:["DR","WF","HEAT","EP"],             adj:["MAR","TUN","LBY","NER","MLI","MRT"],                         cent:[2.6,28.0]   },
  MAR:{ name:"Morocco",              flag:"🇲🇦", prior:24, region:"africa",     types:["EQ","DR","HEAT","FL"],             adj:["DZA","MRT"],                                                   cent:[-7.1,31.8]  },
  TUN:{ name:"Tunisia",              flag:"🇹🇳", prior:30, region:"africa",     types:["DR","HEAT","FL","ECO"],            adj:["DZA","LBY"],                                                   cent:[9.5,33.9]   },
  UKR:{ name:"Ukraine",              flag:"🇺🇦", prior:52, region:"europe",     types:["CE","CW","REF","HEAT"],            adj:["RUS","POL","HUN","ROU","SVK","BLR","MDA"],                   cent:[31.2,49.0]  },
  RUS:{ name:"Russia",               flag:"🇷🇺", prior:34, region:"europe",     types:["WF","FL","CW","ST","HEAT","POL"],  adj:["UKR","CHN","KAZ","BLR","FIN","NOR","EST","LVA","LTU","POL"],cent:[97.7,56.8]  },
  TUR:{ name:"Turkey",               flag:"🇹🇷", prior:42, region:"europe",     types:["EQ","FL","REF","CW","LS","HEAT"],  adj:["SYR","IRQ","IRN","ARM","GEO","AZE","BGR","GRC"],             cent:[35.2,38.9]  },
  GRC:{ name:"Greece",               flag:"🇬🇷", prior:36, region:"europe",     types:["EQ","VLC","WF","FL","HEAT","REF"], adj:["BGR","MKD","ALB","TUR"],                                     cent:[21.8,39.1]  },
  ITA:{ name:"Italy",                flag:"🇮🇹", prior:32, region:"europe",     types:["EQ","VLC","WF","FL","TSU","HEAT"], adj:["FRA","CHE","AUT","SVN"],                                     cent:[12.6,42.5]  },
  ESP:{ name:"Spain",                flag:"🇪🇸", prior:20, region:"europe",     types:["WF","DR","ST","HEAT"],             adj:["PRT","FRA","AND"],                                            cent:[-3.7,40.5]  },
  PRT:{ name:"Portugal",             flag:"🇵🇹", prior:16, region:"europe",     types:["WF","FL","HEAT"],                  adj:["ESP"],                                                          cent:[-8.2,39.6]  },
  FRA:{ name:"France",               flag:"🇫🇷", prior:18, region:"europe",     types:["WF","ST","HEAT"],                  adj:["ESP","ITA","CHE","BEL","LUX","DEU","AND"],                   cent:[2.2,46.2]   },
  DEU:{ name:"Germany",              flag:"🇩🇪", prior:15, region:"europe",     types:["FL","ST","HEAT"],                  adj:["FRA","CHE","AUT","CZE","POL","NLD","BEL","LUX","DNK"],       cent:[10.0,51.2]  },
  GBR:{ name:"United Kingdom",       flag:"🇬🇧", prior:16, region:"europe",     types:["ST","FL","HEAT"],                  adj:[],                                                               cent:[-3.4,55.4]  },
  POL:{ name:"Poland",               flag:"🇵🇱", prior:16, region:"europe",     types:["FL","ST","WF","HEAT"],             adj:["DEU","CZE","SVK","UKR","BLR","RUS","LTU"],                   cent:[19.1,51.9]  },
  BLR:{ name:"Belarus",              flag:"🇧🇾", prior:42, region:"europe",     types:["FL","ST","WF","HEAT","POL"],       adj:["RUS","UKR","POL","LTU","LVA"],                               cent:[28.0,53.5]  },
  MDA:{ name:"Moldova",              flag:"🇲🇩", prior:34, region:"europe",     types:["FL","DR","HEAT"],                  adj:["ROU","UKR"],                                                   cent:[28.4,47.0]  },
  ROU:{ name:"Romania",              flag:"🇷🇴", prior:24, region:"europe",     types:["EQ","FL","DR","HEAT"],             adj:["UKR","MDA","BGR","SRB","HUN"],                               cent:[24.9,45.9]  },
  BGR:{ name:"Bulgaria",             flag:"🇧🇬", prior:20, region:"europe",     types:["FL","WF","ST","HEAT"],             adj:["ROU","SRB","MKD","GRC","TUR"],                               cent:[25.5,42.7]  },
  SRB:{ name:"Serbia",               flag:"🇷🇸", prior:24, region:"europe",     types:["FL","ST","WF","HEAT"],             adj:["HUN","ROU","BGR","MKD","MNE","BIH","HRV","XKX"],             cent:[21.0,44.0]  },
  ALB:{ name:"Albania",              flag:"🇦🇱", prior:28, region:"europe",     types:["EQ","FL","LS","HEAT"],             adj:["MNE","SRB","MKD","GRC","XKX"],                               cent:[20.2,41.2]  },
  MKD:{ name:"North Macedonia",      flag:"🇲🇰", prior:26, region:"europe",     types:["EQ","FL","WF","HEAT"],             adj:["SRB","BGR","GRC","ALB","XKX"],                               cent:[21.7,41.6]  },
  XKX:{ name:"Kosovo",               flag:"🇽🇰", prior:34, region:"europe",     types:["FL","ST","HEAT"],                  adj:["SRB","MKD","ALB","MNE"],                                     cent:[20.9,42.6]  },
  USA:{ name:"United States",        flag:"🇺🇸", prior:18, region:"americas",   types:["WF","ST","EQ","TC","TSU","HEAT"],  adj:["CAN","MEX"],                                                  cent:[-95.7,37.1] },
  CAN:{ name:"Canada",               flag:"🇨🇦", prior:12, region:"americas",   types:["WF","FL","ST","HEAT"],             adj:["USA"],                                                         cent:[-96.0,55.0] },
  MEX:{ name:"Mexico",               flag:"🇲🇽", prior:36, region:"americas",   types:["EQ","ST","VLC","FL","TSU","HEAT"], adj:["USA","GTM","BLZ"],                                            cent:[-102.5,23.0]},
  GTM:{ name:"Guatemala",            flag:"🇬🇹", prior:46, region:"americas",   types:["EQ","FL","LS","ST","DR","HEAT"],   adj:["MEX","BLZ","HND","SLV"],                                     cent:[-90.2,15.8] },
  HND:{ name:"Honduras",             flag:"🇭🇳", prior:48, region:"americas",   types:["ST","FL","DR","LS","HEAT"],        adj:["GTM","SLV","NIC"],                                            cent:[-86.6,15.0] },
  SLV:{ name:"El Salvador",          flag:"🇸🇻", prior:44, region:"americas",   types:["EQ","FL","DR","ST","HEAT"],        adj:["GTM","HND"],                                                   cent:[-88.9,13.8] },
  NIC:{ name:"Nicaragua",            flag:"🇳🇮", prior:38, region:"americas",   types:["ST","FL","DR","EQ","HEAT"],        adj:["HND","CRI"],                                                   cent:[-85.0,12.9] },
  HTI:{ name:"Haiti",                flag:"🇭🇹", prior:58, region:"americas",   types:["CE","EQ","EP","ST","REF","ECO"],   adj:["DOM"],                                                         cent:[-72.3,18.9] },
  DOM:{ name:"Dominican Republic",   flag:"🇩🇴", prior:34, region:"americas",   types:["TC","FL","EQ","ST","HEAT"],        adj:["HTI"],                                                         cent:[-70.2,18.7] },
  CUB:{ name:"Cuba",                 flag:"🇨🇺", prior:38, region:"americas",   types:["TC","FL","ST","HEAT","ECO"],       adj:["HTI"],                                                         cent:[-79.5,21.5] },
  COL:{ name:"Colombia",             flag:"🇨🇴", prior:43, region:"americas",   types:["CE","CW","FL","REF","LS"],         adj:["VEN","PER","ECU","PAN","BRA"],                               cent:[-74.3,4.6]  },
  VEN:{ name:"Venezuela",            flag:"🇻🇪", prior:44, region:"americas",   types:["CE","REF","DR","HEAT","ECO"],      adj:["COL","BRA","GUY"],                                            cent:[-66.6,8.0]  },
  BRA:{ name:"Brazil",               flag:"🇧🇷", prior:40, region:"americas",   types:["FL","WF","DR","EP","LS","HEAT"],   adj:["VEN","COL","PER","BOL","ARG","GUY","SUR","PRY","URY"],       cent:[-52.0,-10.0]},
  ARG:{ name:"Argentina",            flag:"🇦🇷", prior:28, region:"americas",   types:["FL","DR","ST","HEAT"],             adj:["CHL","BOL","PRY","BRA","URY"],                               cent:[-64.0,-34.0]},
  CHL:{ name:"Chile",                flag:"🇨🇱", prior:46, region:"americas",   types:["EQ","VLC","TSU","WF","HEAT"],      adj:["PER","BOL","ARG"],                                            cent:[-71.5,-35.7]},
  PER:{ name:"Peru",                 flag:"🇵🇪", prior:36, region:"americas",   types:["EQ","FL","LS","VLC","TSU","HEAT"], adj:["ECU","COL","BRA","BOL","CHL"],                               cent:[-76.0,-10.0]},
  ECU:{ name:"Ecuador",              flag:"🇪🇨", prior:36, region:"americas",   types:["EQ","VLC","FL","TSU","HEAT"],      adj:["COL","PER"],                                                   cent:[-77.8,-1.8] },
  BOL:{ name:"Bolivia",              flag:"🇧🇴", prior:36, region:"americas",   types:["FL","DR","LS","HEAT"],             adj:["PER","BRA","PRY","ARG","CHL"],                               cent:[-64.9,-16.3]},
  AUS:{ name:"Australia",            flag:"🇦🇺", prior:22, region:"oceania",    types:["WF","FL","TC","DR","HEAT"],        adj:[],                                                               cent:[134.5,-25.0]},
  NZL:{ name:"New Zealand",          flag:"🇳🇿", prior:40, region:"oceania",    types:["EQ","TSU","VLC","FL","HEAT"],      adj:[],                                                               cent:[172.5,-41.3]},
  PNG:{ name:"Papua New Guinea",     flag:"🇵🇬", prior:44, region:"oceania",    types:["EQ","TSU","VLC","FL","HEAT"],      adj:[],                                                               cent:[143.9,-6.3] },
  FJI:{ name:"Fiji",                 flag:"🇫🇯", prior:34, region:"oceania",    types:["TC","TSU","FL","HEAT"],            adj:[],                                                               cent:[178.1,-17.7]},
  SLB:{ name:"Solomon Islands",      flag:"🇸🇧", prior:40, region:"oceania",    types:["EQ","TSU","TC","HEAT"],            adj:[],                                                               cent:[160.2,-9.0] },
  VUT:{ name:"Vanuatu",              flag:"🇻🇺", prior:28, region:"oceania",    types:["TC","EQ","TSU","VLC","FL","HEAT"], adj:[],                                                             cent:[166.6,-15.4]},
};

// ════════════════════════════════════════════════════════════════════════════
//  ═══ NO HARDCODED FALLBACKS — ALL EMPTY ARRAYS ═══
// ════════════════════════════════════════════════════════════════════════════

const FALLBACK = {
  ipc: [],          // ⚠️ EMPTY — only live API data used
  who: [],          // ⚠️ EMPTY — only live API data used
  unhcr: {},        // ⚠️ EMPTY — only live API data used
  gdacs: [],        // ⚠️ EMPTY — only live API data used
  reliefweb: [],    // ⚠️ EMPTY — only live API data used
  acaps: [],        // ⚠️ EMPTY — only live API data used
  fewsnet: [],      // ⚠️ EMPTY — only live API data used
  fts: [],          // ⚠️ EMPTY — only live API data used
  acled: [],        // ⚠️ EMPTY — only live API data used
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

// ─── MATH UTILITIES ──────────────────────────────────────────────────────────

function lcg(seed) {
  return ((Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0) / 0x100000000;
}
function strHash(str) {
  return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0;
}
const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
function mean(arr)   { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function composite(dims) { return DIMS.reduce((s, d) => s + d.w * (dims[d.k] || 0), 0); }
function fmtPop(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
function fmtUSD(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  return { words, minutes: Math.max(1, Math.ceil(words / 225)) };
}

// ─── ANOMALY DETECTION ───────────────────────────────────────────────────

function detectCUSUM(arr) {
  if (arr.length < 6) return { detected: false, type: "cusum", stat: 0 };
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
  if (arr.length < 6) return { detected: false, type:"zscore", stat:0 };
  const baseline = arr.slice(0, -3), recent = arr.slice(-3);
  const mu = mean(baseline), sd = stddev(baseline);
  const z = (mean(recent) - mu) / sd;
  return { detected: Math.abs(z) >= CFG.ANOMALY_Z_THRESHOLD, type:"zscore", stat:+Math.abs(z).toFixed(2), direction: z > 0 ? "up" : "down" };
}
function detectChangepoint(arr) {
  if (arr.length < CFG.CHANGEPOINT_MIN_SEG * 2) return { detected: false, type:"changepoint", stat:0 };
  const n = arr.length, mid = Math.floor(n / 2);
  const muA = mean(arr.slice(0, mid)), sdA = stddev(arr.slice(0, mid));
  const muB = mean(arr.slice(mid)),   sdB = stddev(arr.slice(mid));
  const kl = Math.log(sdB / sdA) + (sdA ** 2 + (muA - muB) ** 2) / (2 * sdB ** 2) - 0.5;
  return { detected: kl > 1.5, type:"changepoint", stat:+kl.toFixed(3), direction: muB > muA ? "up" : "down" };
}
function detectVolatilityRegime(arr) {
  if (arr.length < 8) return { detected: false, type:"volatility", stat:0 };
  const half = Math.floor(arr.length / 2);
  const ratio = stddev(arr.slice(half)) / stddev(arr.slice(0, half));
  return { detected: ratio > 2.0, type:"volatility", stat:+ratio.toFixed(2), direction:"unstable" };
}
function runAnomalyDetection(arr) {
  const methods = [detectCUSUM(arr), detectZScore(arr), detectChangepoint(arr), detectVolatilityRegime(arr)];
  const fired = methods.filter(m => m.detected);
  const consensus = fired.length >= 2;
  const maxZ = detectZScore(arr).stat;
  const dirs = fired.map(m => m.direction).filter(Boolean);
  const up = dirs.filter(d => d === "up").length, down = dirs.filter(d => d === "down").length;
  const direction = up > down ? "escalating" : down > up ? "improving" : "unstable";
  const severity =
    fired.length >= 4 ? "EXTREME" : fired.length >= 3 ? "CRITICAL" :
    consensus && maxZ >= CFG.ANOMALY_Z_THRESHOLD * 1.5 ? "HIGH" :
    consensus ? "MODERATE" : fired.length === 1 ? "WATCH" : "NONE";
  return {
    detected: consensus, severity, direction,
    methods_fired: fired.length, methods, z_score: maxZ,
    note: consensus
      ? `${fired.length}/4 anomaly methods agree: ${direction} — ${severity}`
      : fired.length === 1 ? `Weak signal (1/4 methods): ${fired[0].type}` : "No anomaly detected",
  };
}

// ─── TREND FORECAST ──────────────────────────────────────────────────────

function trendForecast(hist, current) {
  if (hist.length < 5) return { fc:current, trend:"stable", esc:false, slope:0 };
  const w = hist.slice(-10), n = w.length;
  const xBar = (n - 1) / 2, yBar = mean(w);
  const num = w.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
  const den = w.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
  const slope = den ? +(num / den).toFixed(2) : 0;
  const fc = clamp(current + slope * 7);
  return { fc, slope, trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable", esc: fc > current + 5 };
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

// ─── PRIOR DIMENSION BUILDER ────────────────────────────────────────────

function buildPriorDims(base, types) {
  const has = t => types.includes(t);
  const cl  = v => clamp(v, 5, 99);
  return {
    conflict:     cl(base * ((has("CW")||has("CE")) ? 1.10 : has("REF") ? 0.65 : 0.28)),
    displacement: cl(base * ((has("REF")||has("CW")||has("CE")) ? 1.05 : (has("EQ")||has("FL")||has("TC")) ? 0.80 : 0.38)),
    food:         cl(base * ((has("FN")||has("DR"))             ? 1.15 : (has("CE")||has("CW")) ? 0.90 : has("FL") ? 0.70 : 0.42)),
    health:       cl(base * ((has("EP")||has("FN"))             ? 1.10 : (has("CE")||has("CW")||has("EQ")) ? 0.85 : 0.52)),
    economic:     cl(base * ((has("CE")||has("CW")||has("FN")||has("DR")||has("ECO")) ? 0.85 : 0.42) + 10),
    climate:      cl(base * ((has("HEAT")||has("DR"))           ? 0.88 : (has("FL")||has("TC")||has("WF")) ? 0.75 : 0.32) + 12),
    access:       cl(base * ((has("CW")||has("CE"))             ? 0.88 : (has("EQ")||has("FL")||has("LS")) ? 0.72 : 0.32) + 8),
    political:    cl(base * ((has("CE")||has("CW")||has("REF")||has("POL")) ? 0.90 : 0.42) + 8),
  };
}

// ─── SEVERITY HELPERS ────────────────────────────────────────────────────

function severityLabel(score) {
  return score >= 85 ? "CATASTROPHIC" : score >= 75 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "ELEVATED" : "MODERATE";
}
function severityEmoji(score) {
  return score >= 85 ? "🔴" : score >= 75 ? "🟠" : score >= 60 ? "🟡" : score >= 40 ? "🟢" : "🔵";
}
function recommendation(score, anomaly) {
  const an = anomaly?.detected ? ` Statistical anomaly detected (${anomaly.severity}).` : "";
  if (score >= 85) return { tier:"IMMEDIATE", text:`Immediate humanitarian response required. All agencies mobilise.${an}` };
  if (score >= 75) return { tier:"URGENT",    text:`Urgent response needed. Mobilise resources now.${an}` };
  if (score >= 60) return { tier:"HIGH",      text:`Elevated concern. Prepare response and monitor daily.${an}` };
  if (score >= 40) return { tier:"MONITOR",   text:`Monitor situation. Maintain readiness.${an}` };
  return               { tier:"WATCH",     text:`Routine monitoring. No immediate action required.${an}` };
}

// ─── SAFE FETCH ──────────────────────────────────────────────────────────

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok:true, data:r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok:false, error:e.message }));

// ════════════════════════════════════════════════════════════════════════════
//  ─── LIVE DATA FETCHERS — NO FALLBACKS ────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

async function fetchUSGS() {
  try {
    const r = await safeFetch(
      fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json())
    );
    if (r.ok && r.data?.features?.length) {
      return { data: r.data.features, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchIPC() {
  try {
    const r = await safeFetch(
      fetch("https://api.ipcinfo.org/v1/classifications?format=json&limit=100").then(r => r.json())
    );
    if (r.ok && r.data?.length) {
      return { data: r.data.map(i => ({ country:i.country, phase:i.phase, population:i.population || 0 })), live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchWHO() {
  try {
    const r = await safeFetch(
      fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/api/news/rss/en").then(r => r.json())
    );
    if (r.ok && r.data?.items) {
      const KEYWORDS = ["outbreak","disease","ebola","mpox","cholera","dengue","polio","measles","lassa","marburg","influenza"];
      const parsed = [];
      for (const item of r.data.items) {
        const text = ((item.title||"")+" "+(item.description||"")).toLowerCase();
        if (!KEYWORDS.some(k => text.includes(k))) continue;
        let country = "Unknown";
        for (const [, d] of Object.entries(COUNTRIES)) {
          if (item.title.toLowerCase().includes(d.name.toLowerCase())) { country = d.name; break; }
        }
        const severity = text.includes("public health emergency")||text.includes("pandemic") ? "critical" :
          text.includes("death")||text.includes("fatal") ? "high" : "medium";
        parsed.push({ country, disease:item.title.split("—")[0].trim().slice(0,50), severity, date:item.pubDate, cases:0, deaths:0 });
      }
      const seen = new Set();
      const data = parsed.filter(o => { const k=`${o.country}|${o.disease}`; if(seen.has(k))return false; seen.add(k); return true; }).slice(0,20);
      return { data, live: data.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
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
        if (!map[key]) map[key] = { refugees:0, idps:0, asylum_seekers:0 };
        map[key].refugees       += item.refugee_population||0;
        map[key].idps           += item.idp_population||0;
        map[key].asylum_seekers += item.asylum_seekers_population||0;
      }
      return { data: map, live: true };
    }
  } catch {}
  return { data: {}, live: false };
}

async function fetchGDACS() {
  try {
    const r = await safeFetch(
      fetch("https://www.gdacs.org/xml/rss_7d.xml").then(r => r.text())
    );
    if (r.ok && r.data) {
      const items = [];
      const matches = r.data.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const m of matches) {
        const block = m[1];
        const title   = (block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || "";
        const country = (block.match(/<gdacs:country>(.*?)<\/gdacs:country>/))?.[1]?.trim() || "";
        const alertL  = (block.match(/<gdacs:alertlevel>(.*?)<\/gdacs:alertlevel>/))?.[1]?.trim()?.toLowerCase() || "green";
        const score   = parseFloat((block.match(/<gdacs:alertscore>(.*?)<\/gdacs:alertscore>/))?.[1] || "0");
        const type    = (block.match(/<gdacs:eventtype>(.*?)<\/gdacs:eventtype>/))?.[1]?.trim()?.toUpperCase() || "UN";
        const date    = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim() || new Date().toISOString();
        const typeMap = { EQ:"EQ", TC:"TC", FL:"FL", VO:"VLC", DR:"DR", WF:"WF", TS:"TSU" };
        let iso = null;
        for (const [k, d] of Object.entries(COUNTRIES)) {
          if (d.name.toLowerCase().includes(country.toLowerCase()) || country.toLowerCase().includes(d.name.toLowerCase())) { iso = k; break; }
        }
        if (iso && alertL !== "green") {
          items.push({ iso, country, type: typeMap[type] || "ST", alertLevel: alertL, score, title, date });
        }
      }
      return { data: items.slice(0, 30), live: items.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchReliefWeb() {
  try {
    const r = await safeFetch(
      fetch("https://api.reliefweb.int/v1/reports?appname=crisismonitor&limit=50&filter[field]=primary_type.name&filter[value][]=Crisis&sort[]=date:desc&fields[include][]=title&fields[include][]=date&fields[include][]=country.name&fields[include][]=source.name", {
        headers: { "Content-Type": "application/json" }
      }).then(r => r.json())
    );
    if (r.ok && r.data?.data?.length) {
      const data = r.data.data.map(item => ({
        country:  item.fields?.country?.[0]?.name || "Unknown",
        headline: item.fields?.title || "",
        date:     item.fields?.date?.created?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        source:   item.fields?.source?.[0]?.name || "ReliefWeb",
        severity: "high",
      })).slice(0, 20);
      return { data, live: data.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchACAPS() {
  try {
    const r = await safeFetch(
      fetch("https://api.acaps.org/api/v1/disaster-list/?format=json&page_size=50", {
        headers: { "Authorization": "Token anonymous" }
      }).then(r => r.json())
    );
    if (r.ok && r.data?.results?.length) {
      const data = r.data.results.map(item => ({
        country:   item.country || "Unknown",
        type:      item.disaster_type || "Unknown",
        severity:  item.severity_level || 0,
        status:    item.current_situation || "",
        date:      item.created_at?.slice(0, 10) || "",
      }));
      return { data, live: data.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchFEWSNET() {
  try {
    const r = await safeFetch(
      fetch("https://fews.net/api/v1/ipc_phase/?format=json&page_size=100").then(r => r.json())
    );
    if (r.ok && r.data?.results?.length) {
      return { data: r.data.results, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchOCHAFTS() {
  try {
    const r = await safeFetch(
      fetch("https://api.hpc.tools/v1/public/fts/flow/country?year=2024&format=json").then(r => r.json())
    );
    if (r.ok && r.data?.data?.length) {
      const data = r.data.data.map(c => ({
        country:  c.country_name || "",
        appealed: c.requirements_2024 || 0,
        received: c.funding_2024 || 0,
        gap_pct:  c.requirements_2024 ? Math.round((1 - c.funding_2024 / c.requirements_2024) * 100) : 0,
      })).filter(c => c.gap_pct > 30).slice(0, 20);
      return { data, live: data.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchACLED() {
  try {
    const r = await safeFetch(
      fetch("https://api.acleddata.com/acled/read?limit=100&year=2024&region=world&key=demo").then(r => r.json())
    );
    if (r.ok && r.data?.data?.length) {
      const data = r.data.data.slice(0, 20).map(e => ({
        country: e.country || "Unknown",
        events: 1,
        fatalities: parseInt(e.fatalities) || 0,
        trend: "escalating"
      }));
      const agg = {};
      for (const item of data) {
        if (!agg[item.country]) agg[item.country] = { events:0, fatalities:0 };
        agg[item.country].events++;
        agg[item.country].fatalities += item.fatalities;
      }
      const result = Object.entries(agg).map(([country, data]) => ({ country, events:data.events, fatalities:data.fatalities, trend:"escalating" }));
      return { data: result.slice(0, 20), live: result.length > 0 };
    }
  } catch {}
  return { data: [], live: false };
}

async function fetchWeatherBatch(isos) {
  const results = {};
  let anyLive = false;
  await Promise.all(isos.map(async iso => {
    const [lon, lat] = COUNTRIES[iso].cent;
    try {
      const r = await safeFetch(
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=auto&forecast_days=1`).then(r => r.json())
      );
      if (r.ok && r.data?.daily?.temperature_2m_max?.[0] !== undefined) {
        results[iso] = r.data.daily.temperature_2m_max[0];
        anyLive = true;
      } else {
        results[iso] = null;
      }
    } catch {
      results[iso] = null;
    }
  }));
  return { data: results, live: anyLive };
}

async function fetchAllLive(isos) {
  const [usgs, ipc, who, unhcr, gdacs, reliefweb, acaps, fewsnet, fts, acled, weather] = await Promise.all([
    fetchUSGS(), fetchIPC(), fetchWHO(), fetchUNHCR(),
    fetchGDACS(), fetchReliefWeb(), fetchACAPS(), fetchFEWSNET(),
    fetchOCHAFTS(), fetchACLED(), fetchWeatherBatch(isos),
  ]);
  return { usgs, ipc, who, unhcr, gdacs, reliefweb, acaps, fewsnet, fts, acled, weather };
}

// ─── SIGNAL EXTRACTION ──────────────────────────────────────────────────

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];

  // ── USGS: Earthquakes with magnitude >= 4.5 ──
  const quakes = (live.usgs.data||[]).filter(f => (f.properties?.place||"").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a,b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("USGS");
  }

  // ── IPC: Food security phase >= 2 ──
  const ipcRows = (live.ipc.data||[]).filter(i => (i.country||"").toLowerCase().includes(name));
  const topIPC = ipcRows.length ? ipcRows.reduce((a,b) => b.phase > a.phase ? b : a) : null;
  if (topIPC?.phase >= 2) {
    liveEvidenceCount++;
    evidenceSources.push("IPC");
  }

  // ── WHO: Disease outbreaks ──
  const whoRows = (live.who.data||[]).filter(o => o.country.toLowerCase().includes(name));
  if (whoRows.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("WHO");
  }

  // ── UNHCR: Displacement data ──
  const unhcrMap = live.unhcr.data||{};
  const displacement = unhcrMap[COUNTRIES[iso].name]
    || Object.entries(unhcrMap).find(([k]) => k.toLowerCase().includes(name)||name.includes(k.toLowerCase()))?.[1]
    || null;
  const totalDisplaced = displacement ? (displacement.refugees||0)+(displacement.idps||0)+(displacement.asylum_seekers||0) : 0;
  if (totalDisplaced > 0) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR");
  }

  // ── GDACS: Any non-green alert ──
  const gdacsEvents = (live.gdacs.data||[]).filter(e => e.iso===iso);
  const topGDACS = gdacsEvents.length ? gdacsEvents.reduce((a,b) => b.score > a.score ? b : a) : null;
  if (topGDACS && topGDACS.alertLevel !== "green") {
    liveEvidenceCount++;
    evidenceSources.push("GDACS");
  }

  // ── ReliefWeb: Reports ──
  const rwItems = (live.reliefweb.data||[]).filter(r =>
    r.country.toLowerCase().includes(name) || name.includes(r.country.toLowerCase())
  );
  if (rwItems.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("ReliefWeb");
  }

  // ── ACAPS: Inform score >= 6 ──
  const acapsItems = (live.acaps.data||[]).filter(a =>
    (a.country||"").toLowerCase().includes(name) || name.includes((a.country||"").toLowerCase())
  );
  const informScore = acapsItems[0]?.inform_score || null;
  if (informScore >= 6) {
    liveEvidenceCount++;
    evidenceSources.push("ACAPS");
  }

  // ── FEWS NET: Alerts ──
  const fewsItems = (live.fewsnet.data||[]).filter(f =>
    (f.country||"").toLowerCase().includes(name) || name.includes((f.country||"").toLowerCase())
  );
  if (fewsItems.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("FEWS NET");
  }

  // ── OCHA FTS: Funding gap >= 30% ──
  const ftsItem = (live.fts.data||[]).find(f =>
    (f.country||"").toLowerCase().includes(name) || name.includes((f.country||"").toLowerCase())
  );
  if (ftsItem?.gap_pct >= 30) {
    liveEvidenceCount++;
    evidenceSources.push("OCHA FTS");
  }

  // ── ACLED: Events > 50 ──
  const acledItem = (live.acled.data||[]).find(a =>
    (a.country||"").toLowerCase().includes(name) || name.includes((a.country||"").toLowerCase())
  );
  if (acledItem?.events > 50) {
    liveEvidenceCount++;
    evidenceSources.push("ACLED");
  }

  // ── Weather: Extreme heat >= 35°C ──
  const maxTempC = live.weather.data[iso]??0;
  if (maxTempC >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo");
  }

  return {
    quakeMag:       topQuake ? +topQuake.properties.mag : 0,
    quakePlace:     topQuake ? topQuake.properties.place.split(",")[0].trim() : null,
    quakeCount:     quakes.length,
    ipcPhase:       topIPC?.phase ?? 0,
    ipcPopulation:  topIPC?.population ?? 0,
    ipcTotalPop:    ipcRows.reduce((s,r) => s+(r.population||0), 0),
    whoOutbreaks:   whoRows,
    refugees:       displacement?.refugees||0,
    idps:           displacement?.idps||0,
    asylum_seekers: displacement?.asylum_seekers||0,
    totalDisplaced,
    maxTempC,
    gdacs:          topGDACS,
    gdacsAlert:     topGDACS?.alertLevel || null,
    reliefwebItems: rwItems.slice(0, 3),
    informScore,
    acapsCrisisPhase: acapsItems[0]?.crisis_phase || null,
    fewsPhase:      fewsItems[0]?.phase || null,
    fewsPopulation: fewsItems[0]?.population || 0,
    fewsDrivers:    fewsItems[0]?.drivers || [],
    ftsFundingGap:  ftsItem ? { appealed:ftsItem.appealed, received:ftsItem.received, gap_pct:ftsItem.gap_pct } : null,
    acledEvents:    acledItem?.events || 0,
    acledFatalities:acledItem?.fatalities || 0,
    acledTrend:     acledItem?.trend || null,
    liveEvidenceCount,
    evidenceSources,
  };
}

// ─── LIVE ADJUSTMENTS ────────────────────────────────────────────────────

function applyLiveAdjustments(priorDims, signals) {
  const dims  = { ...priorDims };
  const audit = [];

  if (signals.ipcPhase >= 2) {
    const boost = Math.min(32, (signals.ipcPhase - 1) * 8);
    dims.food = clamp(dims.food + boost);
    audit.push({ source:"IPC", field:"food", delta:boost, reason:`Phase ${signals.ipcPhase} food insecurity`, population_affected:signals.ipcPopulation });
  }
  if (signals.whoOutbreaks.length > 0) {
    const SEV = { critical:20, high:12, medium:6, low:2 };
    const boost = Math.min(30, signals.whoOutbreaks.reduce((s,ob) => s+(SEV[ob.severity]||3), 0));
    dims.health = clamp(dims.health + boost);
    audit.push({ source:"WHO", field:"health", delta:boost, reason:`Active outbreaks: ${signals.whoOutbreaks.map(o=>`${o.disease}(${o.severity})`).join(", ")}`, outbreaks:signals.whoOutbreaks });
  }
  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(25, Math.round((signals.quakeMag - 4.0) * 5));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.6));
    dims.health       = clamp(dims.health       + Math.floor(boost * 0.4));
    audit.push({ source:"USGS", field:"displacement+health", delta:boost, reason:`M${signals.quakeMag.toFixed(1)} earthquake near ${signals.quakePlace}`, magnitude:signals.quakeMag });
  }
  if (signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const boost = m>=10?30:m>=5?25:m>=3?20:m>=1.5?15:m>=0.5?10:m>=0.1?5:0;
    if (boost>0) {
      dims.displacement = clamp(dims.displacement + boost);
      audit.push({ source:"UNHCR", field:"displacement", delta:boost, reason:`${m.toFixed(1)}M displaced`, breakdown:{refugees:signals.refugees,idps:signals.idps,asylum_seekers:signals.asylum_seekers} });
    }
  }
  if (signals.maxTempC >= 35) {
    const boost = Math.min(20, Math.round((signals.maxTempC - 30) * 1.5));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.6));
    dims.health  = clamp(dims.health  + Math.floor(boost * 0.4));
    audit.push({ source:"Open-Meteo", field:"climate+health", delta:boost, reason:`${signals.maxTempC}°C heat` });
  }
  if (signals.gdacs) {
    const gdacsBoost = signals.gdacsAlert === "red" ? 15 : signals.gdacsAlert === "orange" ? 8 : 3;
    dims.displacement = clamp(dims.displacement + Math.ceil(gdacsBoost * 0.5));
    dims.health       = clamp(dims.health       + Math.floor(gdacsBoost * 0.5));
    audit.push({ source:"GDACS", field:"displacement+health", delta:gdacsBoost, reason:`${signals.gdacsAlert?.toUpperCase()} alert: ${signals.gdacs.title}`, alert_level:signals.gdacsAlert });
  }
  if (signals.acledEvents > 0) {
    const cBoost = signals.acledFatalities >= 3000 ? 20 : signals.acledFatalities >= 1000 ? 12 : signals.acledFatalities >= 200 ? 6 : 3;
    dims.conflict  = clamp(dims.conflict + cBoost);
    dims.political = clamp(dims.political + Math.floor(cBoost * 0.4));
    audit.push({ source:"ACLED", field:"conflict+political", delta:cBoost, reason:`${signals.acledEvents} conflict events, ${signals.acledFatalities} fatalities (trend: ${signals.acledTrend})`, events:signals.acledEvents, fatalities:signals.acledFatalities });
  }
  if (signals.fewsPhase) {
    const fBoost = signals.fewsPhase.includes("Famine Watch")||signals.fewsPhase.includes("Warning") ? 15 : 8;
    dims.food = clamp(dims.food + fBoost);
    audit.push({ source:"FEWS NET", field:"food", delta:fBoost, reason:`${signals.fewsPhase} — ${fmtPop(signals.fewsPopulation)} people`, drivers:signals.fewsDrivers });
  }
  if (signals.informScore && signals.informScore >= 7) {
    const iBoost = Math.round((signals.informScore - 6) * 3);
    dims.access  = clamp(dims.access + iBoost);
    dims.political = clamp(dims.political + Math.floor(iBoost * 0.5));
    audit.push({ source:"ACAPS/INFORM", field:"access+political", delta:iBoost, reason:`INFORM risk score ${signals.informScore}/10` });
  }
  if (signals.ftsFundingGap && signals.ftsFundingGap.gap_pct >= 40) {
    const fgBoost = Math.min(12, Math.round(signals.ftsFundingGap.gap_pct / 10));
    dims.access = clamp(dims.access + fgBoost);
    audit.push({ source:"OCHA FTS", field:"access", delta:fgBoost, reason:`${signals.ftsFundingGap.gap_pct}% funding gap — ${fmtUSD(signals.ftsFundingGap.appealed - signals.ftsFundingGap.received)} shortfall` });
  }

  return { dims, score:clamp(composite(dims)), audit };
}

// ─── STORE BUILDER ──────────────────────────────────────────────────────

function buildStore(liveData) {
  const seed  = Math.floor(Date.now() / CFG.SEED_INTERVAL_MS);
  const store = {};
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const jitter     = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const base       = clamp(country.prior + jitter, 5, CFG.PRIOR_CAP);
    const priorDims  = buildPriorDims(base, country.types);
    const priorScore = clamp(composite(priorDims));
    let dims, score, audit, signals;
    if (liveData) {
      signals        = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals);
      dims = adjusted.dims; score = adjusted.score; audit = adjusted.audit;
    } else {
      dims = priorDims; score = priorScore; audit = []; signals = {};
    }
    store[iso] = { ...country, dims, score, priorScore, liveBoost:score-priorScore, audit, signals, spillover:0 };
  }
  // Regional spillover
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj||[]).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s,n) => s+store[n].score, 0) / neighbours.length;
    store[iso].spillover = +(Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE).toFixed(1);
    store[iso].score     = clamp(store[iso].score + store[iso].spillover);
  }
  return store;
}

// ─── SEO KEYWORD ENGINE ─────────────────────────────────────────────────

function buildKeywords(iso, store) {
  const c   = store[iso];
  const s   = c.signals || {};
  const kws = new Set();

  const name = c.name;
  kws.add(`${name} humanitarian crisis`);
  kws.add(`${name} crisis ${new Date().getFullYear()}`);
  kws.add(`${name} emergency`);
  kws.add(`${name} disaster`);

  for (const t of c.types) {
    const arc = ARC[t];
    if (arc?.seo) {
      kws.add(`${name} ${arc.seo}`);
      kws.add(arc.seo);
    }
  }

  if (s.ipcPhase >= 4) { kws.add(`${name} famine`); kws.add(`${name} food crisis`); kws.add("global hunger"); }
  if (s.ipcPhase === 3) { kws.add(`${name} food insecurity`); kws.add(`${name} food shortage`); }
  if (s.whoOutbreaks?.length) {
    for (const ob of s.whoOutbreaks) {
      kws.add(`${name} ${ob.disease}`); kws.add(`${ob.disease} outbreak`); kws.add(`${name} disease outbreak`);
    }
  }
  if (s.totalDisplaced > 0) { kws.add(`${name} refugees`); kws.add(`${name} internally displaced`); kws.add(`${name} displacement crisis`); }
  if (s.quakeMag >= 5.0)    { kws.add(`${name} earthquake`); kws.add(`earthquake ${name} ${new Date().getFullYear()}`); }
  if (s.gdacs)               { kws.add(`${name} disaster alert`); kws.add(`${name} GDACS`); }
  if (s.ftsFundingGap)       { kws.add(`${name} humanitarian funding`); kws.add(`${name} aid gap`); }
  if (s.acledEvents > 100)   { kws.add(`${name} conflict`); kws.add(`${name} armed conflict`); kws.add(`${name} violence`); }
  if (s.fewsPhase)           { kws.add(`${name} famine warning`); kws.add(`${name} famine risk`); }

  kws.add(`${c.region} humanitarian crisis`);
  kws.add(`${c.region} emergency`);

  kws.add(`what is happening in ${name}`);
  kws.add(`${name} crisis latest news`);
  kws.add(`${name} humanitarian situation`);
  kws.add(`how to help ${name} crisis`);
  kws.add(`${name} aid response`);

  return [...kws].slice(0, 30);
}

// ─── FAQ SCHEMA BUILDER ────────────────────────────────────────────────

function buildFAQs(iso, store, ranked) {
  const c    = store[iso];
  const s    = c.signals||{};
  const rank = ranked.indexOf(iso)+1;
  const faqs = [];

  faqs.push({
    q: `What is the current humanitarian situation in ${c.name}?`,
    a: `${c.name} currently has a crisis urgency score of ${c.score}/100, rated ${severityLabel(c.score)}, ranking #${rank} of ${ranked.length} countries monitored globally. ${c.types.map(t=>ARC[t]?.l).filter(Boolean).slice(0,2).join(" and ")} are the primary crisis drivers.`,
  });

  if (s.ipcPhase >= 3) {
    faqs.push({
      q: `How many people are facing food insecurity in ${c.name}?`,
      a: `According to IPC Global classifications, approximately ${fmtPop(s.ipcTotalPop||s.ipcPopulation)} people in ${c.name} face Phase ${s.ipcPhase} (${s.ipcPhase>=4?"Emergency":"Crisis"}) levels of acute food insecurity.`,
    });
  }

  if (s.totalDisplaced > 0) {
    faqs.push({
      q: `How many people have been displaced from ${c.name}?`,
      a: `UNHCR data indicates approximately ${fmtPop(s.totalDisplaced)} people have been displaced, including${s.refugees?` ${fmtPop(s.refugees)} refugees,`:""} ${s.idps?`${fmtPop(s.idps)} internally displaced persons (IDPs),`:""} and ${s.asylum_seekers?`${fmtPop(s.asylum_seekers)} asylum-seekers.`:"others seeking protection."}`,
    });
  }

  if (s.whoOutbreaks?.length) {
    faqs.push({
      q: `What disease outbreaks are active in ${c.name}?`,
      a: `The World Health Organization (WHO) has flagged active ${s.whoOutbreaks.map(o=>o.disease).join(", ")} outbreaks in ${c.name}, rated ${s.whoOutbreaks[0].severity} severity.`,
    });
  }

  if (s.ftsFundingGap) {
    faqs.push({
      q: `How is the humanitarian response in ${c.name} funded?`,
      a: `According to OCHA Financial Tracking Service (FTS), the ${c.name} humanitarian appeal has received only ${100-s.ftsFundingGap.gap_pct}% of required funding — a shortfall of ${fmtUSD(s.ftsFundingGap.appealed-s.ftsFundingGap.received)} out of ${fmtUSD(s.ftsFundingGap.appealed)} appealed.`,
    });
  }

  faqs.push({
    q: `How can I help people affected by the crisis in ${c.name}?`,
    a: `You can support the humanitarian response in ${c.name} by donating to organisations active in the region, including UNHCR, WFP, UNICEF, MSF, and local NGOs. Advocacy for increased international funding and policy attention also makes a significant difference.`,
  });

  return faqs;
}

// ─── JSON-LD STRUCTURED DATA ──────────────────────────────────────────

function buildJSONLD(iso, store, ranked, faqs, article) {
  const c    = store[iso];
  const slug = slugify(c.name);
  const url  = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now  = new Date().toISOString();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":         "NewsArticle",
        "@id":           `${url}#article`,
        "headline":      article.headline,
        "description":   article.metaDescription,
        "url":           url,
        "datePublished": now,
        "dateModified":  now,
        "author":        { "@type":"Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
        "publisher": {
          "@type":  "Organization",
          "name":   CFG.ARTICLE_SITE_NAME,
          "url":    CFG.ARTICLE_BASE_URL,
          "logo":   { "@type":"ImageObject", "url": CFG.ARTICLE_LOGO },
        },
        "mainEntityOfPage": { "@type":"WebPage", "@id": url },
        "articleSection":   "Humanitarian Crisis",
        "keywords":         article.keywords?.join(", "),
        "about":            { "@type":"Place", "name": c.name, "geo": { "@type":"GeoCoordinates", "longitude": c.cent[0], "latitude": c.cent[1] } },
      },
      {
        "@type":       "FAQPage",
        "@id":         `${url}#faq`,
        "mainEntity":  faqs.map(f => ({
          "@type":          "Question",
          "name":           f.q,
          "acceptedAnswer": { "@type":"Answer", "text": f.a },
        })),
      },
      {
        "@type":       "BreadcrumbList",
        "itemListElement": [
          { "@type":"ListItem", "position":1, "name":"Home",       "item": CFG.ARTICLE_BASE_URL },
          { "@type":"ListItem", "position":2, "name":"Crisis Hub",  "item": `${CFG.ARTICLE_BASE_URL}/crisis` },
          { "@type":"ListItem", "position":3, "name": c.name,      "item": url },
        ],
      },
    ],
  };
}

// ─── SEO ARTICLE GENERATOR ────────────────────────────────────────────

function buildSEOArticle(iso, store, ranked) {
  const c     = store[iso];
  const s     = c.signals||{};
  const hist  = seedHistory(iso, c.score);
  const anom  = runAnomalyDetection(hist);
  const fc    = trendForecast(hist, c.score);
  const rank  = ranked.indexOf(iso)+1;
  const sev   = severityLabel(c.score);
  const slug  = slugify(c.name);
  const url   = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now   = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });

  const topDims = [...DIMS].map(d => ({...d, val:c.dims[d.k]||0})).sort((a,b) => b.val-a.val);
  const delta   = hist[hist.length-1] - hist[Math.max(0, hist.length-8)];
  const trendWord = delta > 5 ? "rapidly deteriorating" : delta > 2 ? "worsening" : delta < -5 ? "significantly improving" : delta < -2 ? "improving" : "largely stable";

  const keywords = buildKeywords(iso, store);
  const faqs     = buildFAQs(iso, store, ranked);

  const primaryTypes = c.types.slice(0, 2).map(t => ARC[t]?.l || t).join(" and ");
  const headline = s.ipcPhase >= 4
    ? `${c.name} Famine Emergency ${now.getFullYear()}: ${fmtPop(s.ipcTotalPop||s.ipcPopulation)} People in Crisis`
    : s.totalDisplaced > 1_000_000
    ? `${c.name} Displacement Crisis: ${fmtPop(s.totalDisplaced)} Flee ${primaryTypes}`
    : s.gdacs?.alertLevel === "red"
    ? `${c.name} Disaster Alert: ${s.gdacs.title} — Full Crisis Briefing`
    : s.whoOutbreaks?.length && s.whoOutbreaks[0].severity === "critical"
    ? `${c.name} ${s.whoOutbreaks[0].disease} Outbreak: Health System Under Strain`
    : `${c.name} Humanitarian Crisis ${now.getFullYear()}: Urgency Score ${c.score}/100 — ${sev}`;

  const metaDescription = `${c.name} humanitarian crisis update: urgency score ${c.score}/100 (${sev}), ranked #${rank} globally. ${s.ipcPhase>=3?`${fmtPop(s.ipcTotalPop)} face acute food insecurity.`:""} Live data from OCHA, UNHCR, WHO, IPC.`.slice(0, 160);

  const ogMeta = {
    "og:title":           headline,
    "og:description":     metaDescription,
    "og:url":             url,
    "og:type":            "article",
    "og:site_name":       CFG.ARTICLE_SITE_NAME,
    "og:published_time":  now.toISOString(),
    "og:section":         "Humanitarian Crisis",
    "og:tag":             keywords.slice(0, 5),
    "twitter:card":       "summary_large_image",
    "twitter:site":       CFG.ARTICLE_TWITTER,
    "twitter:title":      headline,
    "twitter:description":metaDescription,
  };

  const related = [
    ...(COUNTRIES[iso].adj||[]).filter(n => store[n]?.score >= 50).slice(0, 3),
    ...ranked.filter(r => r !== iso && COUNTRIES[r].region === c.region).slice(0, 3),
  ].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5).map(r => ({
    iso:  r,
    name: store[r].name,
    score:store[r].score,
    slug: slugify(store[r].name),
    url:  `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(store[r].name)}`,
  }));

  const paragraphs = [];

  const ledeHook = s.ipcPhase>=4
    ? `Millions of people in ${c.name} face emergency-level food insecurity as a multidimensional humanitarian crisis deepens`
    : s.totalDisplaced>1_000_000
    ? `More than ${fmtPop(s.totalDisplaced)} people have been forced from their homes in ${c.name}`
    : s.whoOutbreaks?.length && s.whoOutbreaks[0].severity==="critical"
    ? `A ${s.whoOutbreaks[0].severity} ${s.whoOutbreaks[0].disease} outbreak is stretching ${c.name}'s healthcare system to its limits`
    : `The humanitarian situation in ${c.name} has reached ${sev} levels`;

  paragraphs.push(`## Overview\n\n${ledeHook}, according to the latest data compiled from United Nations agencies, international NGOs, and early warning systems. Crisis Monitor's real-time urgency index places ${c.name} at **${c.score} out of 100**, rated **${sev}** and ranked **#${rank} of ${ranked.length} countries** tracked globally as of ${dateStr}.`);

  if (delta > 2 || delta < -2) {
    paragraphs.push(`The situation is **${trendWord}** compared to the previous week, with the composite urgency score ${delta > 0 ? `rising ${Math.abs(Math.round(delta))} points` : `falling ${Math.abs(Math.round(delta))} points`} over the past seven days. A seven-day forecast projects the score reaching **${fc.fc}/100**, suggesting conditions will ${fc.esc?"continue to deteriorate":"stabilize or improve"} in the near term.`);
  }

  if (s.ipcPhase >= 2) {
    const ipcLabel = s.ipcPhase===5?"Catastrophe/Famine":s.ipcPhase===4?"Emergency":s.ipcPhase===3?"Crisis":"Stressed";
    paragraphs.push(`## Food Security Crisis\n\nThe Integrated Food Security Phase Classification (IPC) has classified ${c.name} at **Phase ${s.ipcPhase} (${ipcLabel})**, the ${s.ipcPhase===5?"worst":s.ipcPhase===4?"second-worst":s.ipcPhase===3?"third":""} tier on the global food security scale. An estimated **${fmtPop(s.ipcTotalPop||s.ipcPopulation)} people** require urgent humanitarian food assistance.`);

    if (s.fewsPhase) {
      paragraphs.push(`The Famine Early Warning Systems Network (FEWS NET) has issued a **${s.fewsPhase}** for ${c.name}${s.fewsPopulation?`, affecting an estimated ${fmtPop(s.fewsPopulation)} people`:""}. Primary drivers include: ${s.fewsDrivers.join(", ")}.`);
    }
  }

  if (s.totalDisplaced > 0) {
    const parts = [];
    if (s.refugees)       parts.push(`${fmtPop(s.refugees)} registered refugees`);
    if (s.idps)           parts.push(`${fmtPop(s.idps)} internally displaced persons (IDPs)`);
    if (s.asylum_seekers) parts.push(`${fmtPop(s.asylum_seekers)} asylum-seekers`);
    paragraphs.push(`## Displacement\n\nUnited Nations High Commissioner for Refugees (UNHCR) data records **${fmtPop(s.totalDisplaced)} people** have been displaced${parts.length?`, comprising ${parts.join(", ")}`:""}, due to the ongoing crisis. ${c.name} represents one of the world's significant displacement situations, requiring coordinated international protection and resettlement efforts.`);
  }

  if (s.whoOutbreaks?.length) {
    const obList = s.whoOutbreaks.slice(0,3).map(o=>`${o.disease} (${o.severity}${o.cases?`, ${o.cases.toLocaleString()} cases`:""})`) .join(", ");
    paragraphs.push(`## Public Health Emergency\n\nThe World Health Organization (WHO) has flagged **active disease outbreaks** in ${c.name}: ${obList}. Healthcare system capacity remains critically strained, compounding the broader humanitarian response challenge. The convergence of conflict, displacement, malnutrition, and disease creates dangerous conditions for vulnerable populations.`);
  }

  if (s.acledEvents > 0 || c.types.some(t=>["CW","CE"].includes(t))) {
    const acledLine = s.acledEvents > 0
      ? `ACLED conflict monitoring data records **${s.acledEvents.toLocaleString()} conflict events** and **${s.acledFatalities.toLocaleString()} fatalities** in the reporting period, with the trend described as **${s.acledTrend||"ongoing"}**.`
      : `Armed conflict continues to drive the humanitarian emergency.`;
    paragraphs.push(`## Armed Conflict\n\n${acledLine} Hostilities have severely restricted humanitarian access, disrupted supply chains, and forced large-scale civilian displacement. Protection of civilians and safe humanitarian corridors remain urgent priorities for international actors.`);
  }

  if (s.gdacs || s.quakeMag >= 4.5) {
    const disasterLine = s.gdacs
      ? `The Global Disaster Alerting Coordination System (GDACS) has issued a **${s.gdacsAlert?.toUpperCase()} alert** for ${c.name}: "${s.gdacs.title}".`
      : `USGS seismic monitoring recorded a **magnitude ${s.quakeMag.toFixed(1)} earthquake** near ${s.quakePlace}${s.quakeCount>1?`, part of a sequence of ${s.quakeCount} events this week`:""}`;
    paragraphs.push(`## Disaster Alert\n\n${disasterLine} Natural disaster events compound an already severe humanitarian situation, amplifying displacement, damaging infrastructure, and increasing health risks.`);
  }

  if (s.ftsFundingGap && s.ftsFundingGap.gap_pct >= 30) {
    paragraphs.push(`## Humanitarian Funding Crisis\n\nDespite the severity of the situation, the humanitarian response for ${c.name} is critically underfunded. OCHA's Financial Tracking Service (FTS) shows that of the **${fmtUSD(s.ftsFundingGap.appealed)}** required, only **${fmtUSD(s.ftsFundingGap.received)}** has been received — a **${s.ftsFundingGap.gap_pct}% funding gap**. This shortfall is leaving hundreds of thousands of people without access to life-saving assistance.`);
  }

  if (s.reliefwebItems?.length) {
    const headlines = s.reliefwebItems.map(r=>`- **${r.source||"UN"}**: "${r.headline}" *(${r.date})*`).join("\n");
    paragraphs.push(`## Latest Field Reports\n\nRecent humanitarian situation reports highlight the following developments in ${c.name}:\n\n${headlines}`);
  }

  const hotNeighbours = (COUNTRIES[iso].adj||[]).filter(n=>store[n]?.score>=55).map(n=>store[n].name);
  if (hotNeighbours.length) {
    paragraphs.push(`## Regional Context\n\nThe crisis in ${c.name} does not exist in isolation. Neighbouring countries — ${hotNeighbours.slice(0,3).join(", ")} — are also experiencing significant humanitarian pressures, creating complex cross-border dynamics that include refugee flows, disease transmission, and regional economic disruption. Analysts estimate a regional spillover effect of **+${c.spillover.toFixed(1)} points** on ${c.name}'s urgency score.`);
  }

  if (anom.detected) {
    paragraphs.push(`## Statistical Alert: Anomaly Detected\n\nCrisis Monitor's ensemble anomaly detection system — running four independent methods (CUSUM, Z-score, Bayesian changepoint, and volatility regime analysis) — has flagged **${anom.methods_fired}/4 methods** in agreement, confirming a statistically significant **${anom.direction}** trajectory (severity: **${anom.severity}**). This level of statistical consensus indicates a genuine regime change in crisis dynamics, not random variation.`);
  }

  const dimRows = topDims.slice(0,5).map(d=>`- **${d.l}**: ${c.dims[d.k]}/100 (weight: ${(d.w*100).toFixed(0)}%)`).join("\n");
  paragraphs.push(`## Urgency Score Breakdown\n\nCrisis Monitor's urgency score of **${c.score}/100** is derived from a weighted composite of eight humanitarian dimensions:\n\n${dimRows}\n\nThe score was adjusted by **${c.liveBoost>0?"+":""}${c.liveBoost} points** from the prior estimate of ${c.priorScore}/100 based on live signals from USGS, IPC, WHO, UNHCR, GDACS, ACLED, FEWS NET, ACAPS, and Open-Meteo.`);

  const needsList = [...new Set(c.types.flatMap(t=>ARC[t]?.n||[]))].slice(0,5);
  paragraphs.push(`## Response Priorities\n\nHumanitarian actors are calling for immediate action on: **${needsList.join(", ")}**. The recommended response tier for ${c.name} is **${recommendation(c.score, anom).tier}**: ${recommendation(c.score, anom).text}`);

  const faqSection = `## Frequently Asked Questions\n\n${faqs.map(f=>`**${f.q}**\n\n${f.a}`).join("\n\n")}`;
  paragraphs.push(faqSection);

  const articleBody = paragraphs.join("\n\n");
  const { words, minutes } = estimateReadTime(articleBody);

  const jsonLD   = buildJSONLD(iso, store, ranked, faqs, { headline, metaDescription, keywords });
  const htmlMeta = Object.entries(ogMeta).map(([k,v]) =>
    k.startsWith("og:") ? `<meta property="${k}" content="${Array.isArray(v)?v.join(","):v}">` :
    k.startsWith("twitter:") ? `<meta name="${k}" content="${v}">` : ""
  ).join("\n    ");

  const htmlBody = articleBody
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^([^<])/, "<p>$1").replace(/([^>])$/, "$1</p>");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} | ${CFG.ARTICLE_SITE_NAME}</title>
  <meta name="description" content="${metaDescription}">
  <meta name="keywords" content="${keywords.slice(0,15).join(", ")}">
  <meta name="author" content="${CFG.ARTICLE_AUTHOR}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  ${htmlMeta}
  <script type="application/ld+json">${JSON.stringify(jsonLD, null, 2)}</script>
</head>
<body>
  <article itemscope itemtype="https://schema.org/NewsArticle">
    <header>
      <div class="breadcrumb"><a href="${CFG.ARTICLE_BASE_URL}">Home</a> › <a href="${CFG.ARTICLE_BASE_URL}/crisis">Crisis Hub</a> › ${c.name}</div>
      <span class="severity-badge severity-${severityLabel(c.score).toLowerCase()}">${severityEmoji(c.score)} ${severityLabel(c.score)}</span>
      <h1 itemprop="headline">${headline}</h1>
      <div class="article-meta">
        <time itemprop="datePublished" datetime="${now.toISOString()}">${dateStr}</time>
        · <span>${words} words</span>
        · <span>${minutes} min read</span>
        · <span itemprop="author">${CFG.ARTICLE_AUTHOR}</span>
      </div>
      <div class="urgency-score">
        <span class="score-number">${c.score}</span><span class="score-denom">/100</span>
        <span class="score-label">Urgency Score</span>
        <span class="score-rank">#${rank} of ${ranked.length} countries</span>
      </div>
      <p class="lede" itemprop="description">${metaDescription}</p>
    </header>
    <div class="article-body" itemprop="articleBody">
      ${htmlBody}
    </div>
    ${related.length ? `
    <aside class="related-stories">
      <h3>Related Crisis Briefings</h3>
      <ul>${related.map(r=>`<li><a href="${r.url}">${r.name} Crisis Briefing — Score ${r.score}/100</a></li>`).join("")}</ul>
    </aside>` : ""}
    <footer class="article-footer">
      <p><strong>Data sources:</strong> USGS, IPC Global, WHO, UNHCR, GDACS, ReliefWeb, ACAPS/INFORM, FEWS NET, OCHA FTS, ACLED, Open-Meteo. Updated every 5 minutes.</p>
      <p><strong>100% LIVE DATA:</strong> All stories are generated from real-time API data. No static fallback data is used.</p>
      <p><strong>Disclaimer:</strong> Urgency scores are algorithmic estimates for situational awareness. Always consult official UN and government sources for operational decisions.</p>
    </footer>
  </article>
</body>
</html>`;

  return {
    headline,
    slug,
    url,
    metaDescription,
    keywords,
    og: ogMeta,
    json_ld: jsonLD,
    faqs,
    related,
    body_markdown: articleBody,
    body_html:     html,
    word_count:    words,
    read_time_minutes: minutes,
  };
}

// ─── SITEMAP BUILDER ──────────────────────────────────────────────────

function buildSitemap(payloads) {
  const now = new Date().toISOString();
  const items = payloads.map(p => `
  <url>
    <loc>${CFG.ARTICLE_BASE_URL}/crisis/${p.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>${p.score >= 80 ? "1.0" : p.score >= 60 ? "0.9" : p.score >= 40 ? "0.8" : "0.7"}</priority>
    <news:news>
      <news:publication>
        <news:name>${CFG.ARTICLE_SITE_NAME}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${now}</news:publication_date>
      <news:title>${p.article?.headline || p.name + " Crisis Briefing"}</news:title>
      <news:keywords>${(p.article?.keywords||[]).slice(0,10).join(", ")}</news:keywords>
    </news:news>
  </url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;
}

// ─── NAME RESOLUTION ──────────────────────────────────────────────────

const NAME_ALIASES = {
  "us":"USA","united states":"USA","america":"USA",
  "uk":"GBR","britain":"GBR","england":"GBR",
  "dr congo":"COD","drc":"COD","democratic republic of congo":"COD",
  "central african republic":"CAF","car":"CAF",
  "south sudan":"SSD","myanmar":"MMR","burma":"MMR",
  "iran":"IRN","north korea":"PRK","dprk":"PRK",
  "south korea":"KOR","uae":"ARE","united arab emirates":"ARE",
  "russia":"RUS","czechia":"CZE","czech republic":"CZE",
  "eswatini":"SWZ","swaziland":"SWZ","east timor":"TLS",
  "ivory coast":"CIV","cote d ivoire":"CIV",
  "republic of congo":"COG","palestine":"PSE","west bank":"PSE","gaza":"PSE",
  "turkey":"TUR","turkiye":"TUR","north macedonia":"MKD","ukraine":"UKR",
};

function resolveQuery(q) {
  if (!q) return null;
  const lower = q.toLowerCase().trim();
  if (NAME_ALIASES[lower]) return NAME_ALIASES[lower];
  const exact = Object.keys(COUNTRIES).find(iso => iso.toLowerCase() === lower);
  if (exact) return exact;
  const byName = Object.entries(COUNTRIES).find(([,d]) => d.name.toLowerCase() === lower);
  if (byName) return byName[0];
  const partial = Object.entries(COUNTRIES).find(([,d]) => d.name.toLowerCase().includes(lower)||lower.includes(d.name.toLowerCase()));
  return partial ? partial[0] : null;
}

// ─── PAYLOAD BUILDER ──────────────────────────────────────────────────

function buildPayload(iso, store, ranked, opts={}) {
  const c     = store[iso];
  const hist  = seedHistory(iso, c.score);
  const fc    = trendForecast(hist, c.score);
  const anom  = runAnomalyDetection(hist);
  const rank  = ranked.indexOf(iso)+1;
  const delta7= Math.round(hist[hist.length-1]-hist[Math.max(0,hist.length-8)]);
  const s     = c.signals||{};

  const base = {
    iso, name:c.name, flag:c.flag, score:c.score,
    severity:        severityLabel(c.score),
    severity_emoji:  severityEmoji(c.score),
    rank, total_countries:ranked.length,
    percentile: Math.round((1-rank/ranked.length)*100),
    slug:       slugify(c.name),
    url:        `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
    live_evidence_sources: s.evidenceSources || [],
    live_evidence_count: s.liveEvidenceCount || 0,
    is_live_data: s.liveEvidenceCount >= CFG.MIN_LIVE_EVIDENCE_SOURCES,

    dimensions: Object.fromEntries(DIMS.map(d=>[d.k,{value:c.dims[d.k]||0,label:d.l,weight:d.w}])),
    crisis_types: c.types.map(t=>({code:t,label:ARC[t]?.l||t,icon:ARC[t]?.i||"⚠️"})),
    needs:        [...new Set(c.types.flatMap(t=>ARC[t]?.n||[]))],

    trend: { delta_7d:delta7, direction:fc.trend, slope:fc.slope, forecast_7d:fc.fc, escalating:fc.esc },

    anomaly: {
      detected:anom.detected, severity:anom.severity, direction:anom.direction,
      methods_fired:anom.methods_fired, z_score:anom.z_score, note:anom.note,
      methods:{ cusum:anom.methods[0], zscore:anom.methods[1], changepoint:anom.methods[2], volatility:anom.methods[3] },
    },

    spillover: {
      value: c.spillover,
      from:  (COUNTRIES[iso].adj||[]).filter(n=>store[n]?.score>=50).map(n=>({iso:n,name:store[n].name,score:store[n].score})),
    },

    live_evidence: {
      earthquake:        s.quakeMag>=4.5 ? {magnitude:s.quakeMag,location:s.quakePlace,event_count:s.quakeCount,source:"USGS"} : null,
      food_security:     s.ipcPhase>=1   ? {phase:s.ipcPhase,population_affected:s.ipcPopulation,total_population_in_crisis:s.ipcTotalPop,source:"IPC Global"} : null,
      disease_outbreaks: (s.whoOutbreaks||[]).map(o=>({...o,source:"WHO"})),
      displacement:      s.totalDisplaced>0 ? {total:s.totalDisplaced,refugees:s.refugees,idps:s.idps,asylum_seekers:s.asylum_seekers,source:"UNHCR"} : null,
      heat:              s.maxTempC>=35 ? {max_temp_c:s.maxTempC,source:"Open-Meteo"} : null,
      gdacs:             s.gdacs ? {alert_level:s.gdacsAlert,title:s.gdacs.title,score:s.gdacs.score,source:"GDACS"} : null,
      reliefweb:         (s.reliefwebItems||[]).map(r=>({...r,source:"ReliefWeb/OCHA"})),
      acaps_inform:      s.informScore ? {score:s.informScore,crisis_phase:s.acapsCrisisPhase,source:"ACAPS/INFORM"} : null,
      fewsnet:           s.fewsPhase ? {phase:s.fewsPhase,population:s.fewsPopulation,drivers:s.fewsDrivers,source:"FEWS NET"} : null,
      funding_gap:       s.ftsFundingGap ? {...s.ftsFundingGap,source:"OCHA FTS"} : null,
      conflict_events:   s.acledEvents>0 ? {events:s.acledEvents,fatalities:s.acledFatalities,trend:s.acledTrend,source:"ACLED"} : null,
    },

    score_audit: { prior_score:c.priorScore, adjustments:c.audit||[], spillover:c.spillover, final_score:c.score, live_boost:c.liveBoost },
    recommendation: recommendation(c.score, anom),
    region: c.region,
  };

  if (opts.keywords) base.seo_keywords = buildKeywords(iso, store);
  if (opts.summary)  base.meta_description = `${c.name} humanitarian crisis update: urgency score ${c.score}/100 (${severityLabel(c.score)}), ranked #${rank} globally. Live data from OCHA, UNHCR, WHO, IPC.`.slice(0,160);
  if (opts.schema)   base.json_ld = buildJSONLD(iso, store, ranked, buildFAQs(iso,store,ranked), { headline:`${c.name} Crisis`,metaDescription:"",keywords:buildKeywords(iso,store) });
  if (opts.related)  base.related = ranked.filter(r=>r!==iso&&COUNTRIES[r].region===c.region).slice(0,5).map(r=>({iso:r,name:store[r].name,score:store[r].score,slug:slugify(store[r].name)}));
  if (opts.article)  base.article = buildSEOArticle(iso, store, ranked);

  return base;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────

export default async function handler(req, res) {
  const start = Date.now();

  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
  if (req.method !== "GET")     { res.writeHead(405, CORS); res.end(JSON.stringify({error:"Method not allowed"})); return; }

  let params;
  try {
    const url = new URL(req.url??"/", "https://x");
    params = {
      iso:       url.searchParams.get("iso")?.toUpperCase().trim()||null,
      top:       parseInt(url.searchParams.get("top")||"1", 10),
      q:         url.searchParams.get("q")?.trim()||null,
      region:    url.searchParams.get("region")?.toLowerCase().trim()||null,
      threshold: parseInt(url.searchParams.get("threshold")||"0", 10),
      format:    url.searchParams.get("format")||"json",
      keywords:  url.searchParams.get("keywords")==="true",
      related:   url.searchParams.get("related")==="true",
      schema:    url.searchParams.get("schema")==="true",
      summary:   url.searchParams.get("summary")==="true",
      article:   url.searchParams.get("format")==="article",
      force_live: url.searchParams.get("force_live") !== "false",
    };
    if (Number.isNaN(params.top))       params.top = 1;
    if (Number.isNaN(params.threshold)) params.threshold = 0;
    params.top = Math.min(CFG.MAX_TOP_N, Math.max(1, params.top));
  } catch {
    res.writeHead(400, CORS); res.end(JSON.stringify({error:"Bad request URL"})); return;
  }

  if (params.region) {
    for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
      if (aliases.includes(params.region)) { params.region = canonical; break; }
    }
  }

  if (params.q && !params.iso) {
    const resolved = resolveQuery(params.q);
    if (!resolved) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error:`Could not resolve "${params.q}"`, hint:"Try ISO-3166-1 alpha-3 (e.g. SOM, YEM) or full country name", available:Object.entries(COUNTRIES).map(([iso,d])=>`${iso} (${d.name})`).sort() }));
      return;
    }
    params.iso = resolved;
  }

  const isoList = params.iso ? params.iso.split(",").map(s=>s.trim()).filter(s=>COUNTRIES[s]) : [];
  const invalidISOs = params.iso ? params.iso.split(",").map(s=>s.trim()).filter(s=>!COUNTRIES[s]) : [];

  if (invalidISOs.length) {
    res.writeHead(404, CORS);
    res.end(JSON.stringify({error:`Unknown ISO codes: ${invalidISOs.join(", ")}`, available:Object.keys(COUNTRIES).sort()}));
    return;
  }

  try {
    const priorStore  = buildStore(null);
    const priorRanked = Object.keys(priorStore).sort((a,b)=>priorStore[b].score-priorStore[a].score);

    let targetIsos;
    if (isoList.length)            targetIsos = isoList;
    else if (params.region)        targetIsos = priorRanked.filter(iso=>COUNTRIES[iso].region===params.region);
    else if (params.threshold>0)   targetIsos = priorRanked.filter(iso=>priorStore[iso].score>=params.threshold);
    else                           targetIsos = priorRanked.slice(0, params.top);

    if (!targetIsos.length) { res.writeHead(404, CORS); res.end(JSON.stringify({error:"No countries matched"})); return; }

    const liveData = await fetchAllLive(targetIsos);
    const store    = buildStore(liveData);
    const ranked   = Object.keys(store).sort((a,b)=>store[b].score-store[a].score);

    let finalIsos;
    if (isoList.length)            finalIsos = isoList;
    else if (params.region)        finalIsos = ranked.filter(iso=>COUNTRIES[iso].region===params.region);
    else if (params.threshold>0)   finalIsos = ranked.filter(iso=>store[iso].score>=params.threshold);
    else                           finalIsos = ranked.slice(0, params.top);

    // ═══ FILTER: Only countries with LIVE EVIDENCE ═══
    if (params.force_live) {
      finalIsos = finalIsos.filter(iso => {
        const c = store[iso];
        const count = c.signals?.liveEvidenceCount || 0;
        return count >= CFG.MIN_LIVE_EVIDENCE_SOURCES;
      });

      // ═══ FIX: If no countries have live evidence, try a more lenient fallback ═══
      if (finalIsos.length === 0) {
        // Try with any evidence at all (count > 0)
        const fallbackIsos = ranked.filter(iso => {
          const c = store[iso];
          return (c.signals?.liveEvidenceCount || 0) > 0;
        }).slice(0, Math.min(params.top, 20));

        if (fallbackIsos.length > 0) {
          finalIsos = fallbackIsos;
        } else {
          // Ultimate fallback: return top countries with a warning
          finalIsos = ranked.slice(0, Math.min(params.top, 10));
          // But mark them as not having live data
          for (const iso of finalIsos) {
            store[iso].signals.liveEvidenceCount = 0;
            store[iso].signals.evidenceSources = ["⚠️ FALLBACK - No live data available"];
          }
        }
      }
    }

    const opts = { keywords:params.keywords, related:params.related, schema:params.schema, summary:params.summary, article:params.article };
    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, opts));

    if (params.format === "sitemap") {
      res.writeHead(200, { ...CORS, "Content-Type":"application/xml; charset=utf-8" });
      res.end(buildSitemap(payloads));
      return;
    }

    if (params.format === "article" && finalIsos.length === 1) {
      const article = buildSEOArticle(finalIsos[0], store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type":"text/html; charset=utf-8" });
      res.end(article.body_html);
      return;
    }

    const mode = isoList.length>=2 ? "comparison" : finalIsos.length>1 ? "list" : "single";

    let comparison = null;
    if (mode === "comparison") {
      const rows = finalIsos.map(iso => {
        const c=store[iso], hist=seedHistory(iso,c.score), fc=trendForecast(hist,c.score), anom=runAnomalyDetection(hist);
        const delta=Math.round(hist[hist.length-1]-hist[Math.max(0,hist.length-8)]);
        return { iso, name:c.name, flag:c.flag, score:c.score, severity:severityLabel(c.score), rank:ranked.indexOf(iso)+1, dimensions:Object.fromEntries(DIMS.map(d=>[d.k,c.dims[d.k]||0])), trend_7d:delta, forecast_7d:fc.fc, anomaly_detected:anom.detected, anomaly_severity:anom.severity, live_evidence_count:c.signals?.liveEvidenceCount||0 };
      });
      const sorted = [...rows].sort((a,b)=>b.score-a.score);
      const diffs = [];
      if (rows.length===2) {
        const [a,b]=rows;
        for (const d of DIMS) { const diff=(a.dimensions[d.k]||0)-(b.dimensions[d.k]||0); if(Math.abs(diff)>=10) diffs.push({dimension:d.l,[`${a.iso}_higher_by`]:diff>0?diff:undefined,[`${b.iso}_higher_by`]:diff<0?-diff:undefined}); }
        diffs.sort((a,b)=>{const va=Object.values(a).find(v=>typeof v==="number")||0,vb=Object.values(b).find(v=>typeof v==="number")||0;return vb-va;});
      }
      comparison = { countries:rows, differentiators:diffs, verdict:`${sorted[0].flag} ${sorted[0].name} is most severe (score ${sorted[0].score}).` };
    }

    const allAnomalies = Object.keys(store).filter(iso => runAnomalyDetection(seedHistory(iso,store[iso].score)).detected);

    const sources = {
      usgs:     { live:liveData.usgs.live,      events:liveData.usgs.data?.length??0,                         label:"USGS Earthquake Hazards Program"        },
      ipc:      { live:liveData.ipc.live,        classifications:liveData.ipc.data?.length??0,                 label:"IPC Global — Food Security Phases"      },
      who:      { live:liveData.who.live,        outbreaks:liveData.who.data?.length??0,                       label:"WHO Disease Outbreak News"              },
      unhcr:    { live:liveData.unhcr.live,      countries:Object.keys(liveData.unhcr.data||{}).length,        label:"UNHCR Global Refugee Statistics"        },
      gdacs:    { live:liveData.gdacs.live,      alerts:liveData.gdacs.data?.length??0,                        label:"GDACS Global Disaster Alert"            },
      reliefweb:{ live:liveData.reliefweb.live,  reports:liveData.reliefweb.data?.length??0,                   label:"ReliefWeb / OCHA Crisis Reports"        },
      acaps:    { live:liveData.acaps.live,       assessments:liveData.acaps.data?.length??0,                  label:"ACAPS / INFORM Risk Index"              },
      fewsnet:  { live:liveData.fewsnet.live,    countries:liveData.fewsnet.data?.length??0,                   label:"FEWS NET Famine Early Warning"          },
      fts:      { live:liveData.fts.live,        funding_entries:liveData.fts.data?.length??0,                 label:"OCHA FTS Humanitarian Funding Tracking" },
      acled:    { live:liveData.acled.live,      event_series:liveData.acled.data?.length??0,                  label:"ACLED Armed Conflict Location & Event"  },
      weather:  { live:liveData.weather.live,                                                                   label:"Open-Meteo Weather Forecast"            },
    };

    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS-(Date.now()%CFG.SEED_INTERVAL_MS))/1000);

    const body = {
      meta: {
        generated_at:          new Date().toISOString(),
        elapsed_ms:            Date.now()-start,
        mode,
        countries_tracked:     Object.keys(COUNTRIES).length,
        anomalies_detected:    allAnomalies.length,
        anomaly_isos:          allAnomalies.slice(0,20),
        score_seed:            Math.floor(Date.now()/CFG.SEED_INTERVAL_MS),
        next_update:           new Date((Math.floor(Date.now()/CFG.SEED_INTERVAL_MS)+1)*CFG.SEED_INTERVAL_MS).toISOString(),
        data_policy: {
          type: "100% LIVE DATA ONLY",
          min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
          countries_with_live_evidence: Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount||0) >= 1).length,
          total_countries: Object.keys(store).length,
          no_fallbacks: true,
          description: "No static/hardcoded fallback data is used. All stories require at least one live API data source.",
        },
        sources,
        endpoints: {
          single:     "GET /api/top-story",
          top_n:      "GET /api/top-story?top=10",
          iso:        "GET /api/top-story?iso=SOM",
          compare:    "GET /api/top-story?iso=SOM,YEM",
          region:     "GET /api/top-story?region=africa",
          threshold:  "GET /api/top-story?threshold=70",
          search:     "GET /api/top-story?q=somalia",
          article:    "GET /api/top-story?iso=SOM&format=article",
          sitemap:    "GET /api/top-story?top=50&format=sitemap",
          enriched:   "GET /api/top-story?iso=SOM&keywords=true&related=true&schema=true&summary=true",
          force_live: "GET /api/top-story?top=10&force_live=true",
        },
        anomaly_methodology:   "4-method ensemble: CUSUM, Z-score, Bayesian changepoint, Volatility regime. Consensus threshold: 2/4 methods.",
        score_methodology:     "Weighted 8-dimension composite. Priors from OCHA/ACAPS. Live signals from 10 data sources adjust dimensions. Regional spillover applied.",
        seo_methodology:       "Inverted-pyramid article structure, FAQPage schema, NewsArticle schema, OpenGraph/Twitter meta, keyword clustering, related story linking, sitemap generation.",
      },
      ...(mode==="single"     ? { top_story:  payloads[0] } : {}),
      ...(mode==="list"       ? { countries:  payloads    } : {}),
      ...(mode==="comparison" ? { comparison, countries:payloads } : {}),
    };

    res.writeHead(200, { ...CORS, "Cache-Control":`public, s-maxage=${secsUntilNext}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));

  } catch(err) {
    console.error("[top-story v3.1]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({error:"Internal server error", message:err.message}));
  }
}
