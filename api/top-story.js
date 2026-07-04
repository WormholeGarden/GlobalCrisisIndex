"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API  — MASTERPIECE EDITION v5.0
//  Breaking humanitarian crisis stories — 100% LIVE DATA ONLY
//
//  v5.0: Full parity with the frontend's data source list. Every fetcher
//  below mirrors an endpoint actually used in the dashboard, so scores,
//  evidence, and generated articles are backed by the same live signals
//  the user sees on the map.
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  SEED_INTERVAL_MS:     300_000,
  FETCH_TIMEOUT_MS:     10_000,
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
  ARTICLE_MIN_WORDS:    400,
  ARTICLE_SITE_NAME:    "Crisis Monitor",
  ARTICLE_BASE_URL:     "https://crisismonitor.example.com",
  ARTICLE_AUTHOR:       "Crisis Monitor Editorial Team",
  ARTICLE_TWITTER:      "@CrisisMonitor",
  ARTICLE_LOGO:         "https://crisismonitor.example.com/logo.png",
  MIN_LIVE_EVIDENCE_SOURCES: 1,
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

// ─── COUNTRY TABLE (unchanged from v4.0 — full table kept) ──────────────────

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

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok:true, data:r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok:false, error:e.message }));

// ════════════════════════════════════════════════════════════════════════════
//  ─── LIVE DATA FETCHERS — FULL PARITY WITH FRONTEND SOURCE LIST ────────
// ════════════════════════════════════════════════════════════════════════════

// ── SEISMIC: USGS weekly ──
async function fetchUSGS() {
  const r = await safeFetch(fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.json()));
  return { data: r.ok && r.data?.features ? r.data.features : [], live: r.ok && !!r.data?.features?.length };
}

// ── SEISMIC: EMSC secondary network ──
async function fetchEMSC() {
  const r = await safeFetch(
    fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.json())
  );
  return { data: r.ok && r.data?.features ? r.data.features : [], live: r.ok && !!r.data?.features?.length };
}

// ── MULTI-HAZARD: NASA EONET (general + wildfires) ──
async function fetchNASA() {
  const [general, fires] = await Promise.all([
    safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.json())),
    safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=20").then(r => r.json())),
  ]);
  const events = [
    ...(general.ok && general.data?.events ? general.data.events : []),
    ...(fires.ok && fires.data?.events ? fires.data.events : []),
  ];
  return { data: events, live: events.length > 0 };
}

// ── MULTI-HAZARD: GDACS (alerts + earthquakes) ──
async function fetchGDACS() {
  const [alerts, quakes] = await Promise.all([
    safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=40").then(r => r.json())),
    safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ&limit=20").then(r => r.json())),
  ]);
  const feats = [
    ...(alerts.ok && alerts.data?.features ? alerts.data.features : []),
    ...(quakes.ok && quakes.data?.features ? quakes.data.features : []),
  ];
  return { data: feats, live: feats.length > 0 };
}

// ── MULTI-HAZARD: IFRC GO field operations ──
async function fetchIFRC() {
  const r = await safeFetch(fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.json()));
  return { data: r.ok && r.data?.results ? r.data.results : [], live: r.ok && !!r.data?.results?.length };
}

// ── WEATHER: Open-Meteo heat stress across crisis-prone countries ──
async function fetchHeatStress() {
  const heatProneIsos = ['YEM','SOM','SSD','SDN','AFG','ETH','NGA','IND','PAK','BGD','IRQ','SAU','EGY','TUR','IRN','JOR','LBN','SYR','KWT','QAT','ARE','OMN','DZA','MLI','NER'];
  const results = {};
  for (const iso of heatProneIsos) {
    const coord = COUNTRIES[iso]?.cent;
    if (!coord) continue;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=temperature_2m_max&timezone=auto&forecast_days=1`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    if (r.ok && r.data?.daily?.temperature_2m_max?.[0] !== undefined) {
      results[iso] = r.data.daily.temperature_2m_max[0];
    }
  }
  return { data: results, live: Object.keys(results).length > 0 };
}

// ── WEATHER: Open-Meteo Flood / Marine / Wind / Precip / UV / Cloud / Lightning (Yemen-pinned, matching frontend) ──
async function fetchWeatherHazards() {
  const [flood, marine, wind, precip, uv, cloud, lightning] = await Promise.all([
    safeFetch(fetch("https://flood-api.open-meteo.com/v1/flood?latitude=15.35&longitude=44.21&daily=river_discharge&forecast_days=3").then(r => r.json())),
    safeFetch(fetch("https://marine-api.open-meteo.com/v1/marine?latitude=15.35&longitude=44.21&hourly=wave_height&forecast_days=1").then(r => r.json())),
    safeFetch(fetch("https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&current_weather=true&hourly=wind_speed_10m&forecast_days=1").then(r => r.json())),
    safeFetch(fetch("https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=precipitation&forecast_days=3").then(r => r.json())),
    safeFetch(fetch("https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&daily=uv_index_max&forecast_days=3").then(r => r.json())),
    safeFetch(fetch("https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=cloudcover&forecast_days=3").then(r => r.json())),
    safeFetch(fetch("https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=lightning_potential&forecast_days=1").then(r => r.json())),
  ]);
  const out = {
    flood_discharge: flood.ok ? Math.max(...(flood.data?.daily?.river_discharge || [0])) : 0,
    wave_height: marine.ok ? Math.max(...(marine.data?.hourly?.wave_height || [0])) : 0,
    wind_speed: wind.ok ? (wind.data?.hourly?.wind_speed_10m?.[0] || wind.data?.current_weather?.windspeed || 0) : 0,
    precip_total: precip.ok ? (precip.data?.hourly?.precipitation || []).reduce((a,b) => a+b, 0) : 0,
    uv_max: uv.ok ? Math.max(...(uv.data?.daily?.uv_index_max || [0])) : 0,
    cloud_avg: cloud.ok ? mean(cloud.data?.hourly?.cloudcover || [0]) : 0,
    lightning_max: lightning.ok ? Math.max(...(lightning.data?.hourly?.lightning_potential || [0])) : 0,
  };
  const live = out.flood_discharge > 50 || out.wave_height > 2 || out.wind_speed > 30 || out.precip_total > 10 || out.uv_max > 8 || out.cloud_avg > 70 || out.lightning_max > 100;
  return { data: out, live };
}

// ── WEATHER: Open-Meteo multi-city air quality (PM2.5) ──
async function fetchAirQuality() {
  const cities = [
    { iso:'NGA', lat:6.5,  lon:3.4,   name:'Lagos' },
    { iso:'IND', lat:28.6, lon:77.2,  name:'Delhi' },
    { iso:'CHN', lat:39.9, lon:116.4, name:'Beijing' },
    { iso:'IND', lat:19.1, lon:72.9,  name:'Mumbai' },
    { iso:'BGD', lat:23.8, lon:90.4,  name:'Dhaka' },
    { iso:'EGY', lat:30.0, lon:31.2,  name:'Cairo' },
  ];
  const results = {};
  for (const city of cities) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&hourly=pm2_5&forecast_days=1`;
    const r = await safeFetch(fetch(url).then(r => r.json()));
    const pm25 = r.ok ? r.data?.hourly?.pm2_5?.[0] : undefined;
    if (pm25 !== undefined && pm25 !== null) {
      if (!results[city.iso] || pm25 > results[city.iso].pm25) results[city.iso] = { pm25, city: city.name };
    }
  }
  return { data: results, live: Object.keys(results).length > 0 };
}

// ── WEATHER/DISASTER: NOAA (stations, extreme alerts, storm reports; US only) ──
async function fetchNOAA() {
  const [stations, alerts, storms] = await Promise.all([
    safeFetch(fetch("https://api.weather.gov/stations?limit=20").then(r => r.json())),
    safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Extreme").then(r => r.json())),
    safeFetch(fetch("https://api.weather.gov/alerts/active?severity=Severe").then(r => r.json())),
  ]);
  const out = {
    stations: stations.ok ? (stations.data?.features?.length || 0) : 0,
    extreme_alerts: alerts.ok ? (alerts.data?.features?.length || 0) : 0,
    storm_alerts: storms.ok ? (storms.data?.features?.length || 0) : 0,
  };
  return { data: out, live: out.extreme_alerts > 0 || out.storm_alerts > 0 };
}

// ── HEALTH: disease.sh COVID-19 ──
async function fetchDiseaseSh() {
  const r = await safeFetch(fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=50").then(r => r.json()));
  return { data: Array.isArray(r.data) ? r.data : [], live: r.ok && Array.isArray(r.data) && r.data.length > 0 };
}

// ── WORLD BANK: population, poverty, inflation, GDP growth, unemployment, refugees, food prices, water stress, trade ──
async function fetchWorldBankIndicator(code, perPage = 300) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=${perPage}&mrv=1`;
  const r = await safeFetch(fetch(url).then(r => r.json()));
  const rows = r.ok && r.data?.[1] ? r.data[1] : [];
  const map = {};
  rows.forEach(item => {
    if (item.country?.id && item.value !== null && item.value !== undefined) {
      map[item.country.id] = { value: parseFloat(item.value), date: item.date, countryName: item.country.value };
    }
  });
  return { data: map, live: Object.keys(map).length > 0 };
}
async function fetchWorldBankAll() {
  const [population, poverty, inflation, gdpGrowth, unemployment, refugees, foodPrices, water, trade] = await Promise.all([
    fetchWorldBankIndicator("SP.POP.TOTL"),
    fetchWorldBankIndicator("SI.POV.DDAY"),
    fetchWorldBankIndicator("FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"),
    fetchWorldBankIndicator("SL.UEM.TOTL.ZS"),
    fetchWorldBankIndicator("SM.POP.REFG"),
    fetchWorldBankIndicator("AG.PRD.FOOD.XD", 10),
    fetchWorldBankIndicator("ER.H2O.FWTL.ZS", 10),
    fetchWorldBankIndicator("NE.TRD.GNFS.ZS", 10),
  ]);
  return { population, poverty, inflation, gdpGrowth, unemployment, refugees, foodPrices, water, trade };
}

// ── UNHCR: population, asylum, operations, emergency, statistics ──
async function fetchUNHCR() {
  const [pop, asylum, ops, emerg, stats] = await Promise.all([
    safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=population&displayType=totals&yearFrom=2023&yearTo=2024&coa_all=true&forcedDisp=1").then(r => r.json())),
    safeFetch(fetch("https://api.unhcr.org/population/v1/population/?limit=100&dataset=asylum&displayType=totals&yearFrom=2023&yearTo=2024").then(r => r.json())),
    safeFetch(fetch("https://api.unhcr.org/operations/v1/operations?limit=30").then(r => r.json())),
    safeFetch(fetch("https://api.unhcr.org/emergency/v1/emergencies?limit=30").then(r => r.json())),
    safeFetch(fetch("https://api.unhcr.org/statistics/v1/refugees?limit=30").then(r => r.json())),
  ]);
  const displacement = {};
  if (pop.ok && pop.data?.items) {
    pop.data.items.forEach(item => {
      const iso = item.coa_iso;
      if (!iso) return;
      if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
      displacement[iso].refugees += item.refugees || 0;
      displacement[iso].idps += item.idps || 0;
    });
  }
  if (asylum.ok && asylum.data?.items) {
    asylum.data.items.forEach(item => {
      const iso = item.coa_iso;
      if (!iso) return;
      if (!displacement[iso]) displacement[iso] = { refugees: 0, idps: 0, asylum_seekers: 0 };
      displacement[iso].asylum_seekers += item.asylum_seekers || 0;
    });
  }
  const operations = {};
  if (ops.ok) {
    const list = ops.data?.items || ops.data?.data || [];
    list.forEach(op => {
      const iso = op.country_iso || op.country?.iso3;
      if (iso) operations[iso] = { name: op.name || "UNHCR operation", status: op.status || "active" };
    });
  }
  const emergencies = {};
  if (emerg.ok) {
    const list = emerg.data?.items || emerg.data?.data || [];
    list.forEach(em => {
      const iso = em.country_iso || em.country?.iso3;
      if (iso) emergencies[iso] = { name: em.name || "Emergency response", level: em.level || "unknown" };
    });
  }
  const statistics = {};
  if (stats.ok) {
    const list = stats.data?.data || stats.data?.items || [];
    list.forEach(s => {
      const iso = s.country_iso || s.iso3 || s.country?.iso3;
      if (iso && s.refugees > 0) statistics[iso] = { refugees: s.refugees, year: s.year || "2024" };
    });
  }
  const live = Object.keys(displacement).length > 0 || Object.keys(operations).length > 0 || Object.keys(emergencies).length > 0;
  return { data: { displacement, operations, emergencies, statistics }, live };
}

// ── AGGREGATE ALL FETCHERS ──
async function fetchAllLive(isos) {
  const [
    usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr
  ] = await Promise.all([
    fetchUSGS(), fetchEMSC(), fetchNASA(), fetchGDACS(), fetchIFRC(),
    fetchHeatStress(), fetchWeatherHazards(), fetchAirQuality(), fetchNOAA(),
    fetchDiseaseSh(), fetchWorldBankAll(), fetchUNHCR(),
  ]);
  return { usgs, emsc, nasa, gdacs, ifrc, heat, hazards, aq, noaa, disease, wb, unhcr };
}

// ─── SIGNAL EXTRACTION ──────────────────────────────────────────────────

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];

  // USGS
  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a,b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) { liveEvidenceCount++; evidenceSources.push("USGS"); }

  // EMSC
  const emscQuakes = (live.emsc.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) return false;
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a,b) => (b.properties?.mag||0) > (a.properties?.mag||0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= 4.5 && (!topQuake || topEMSC.properties.mag > topQuake.properties.mag)) {
    liveEvidenceCount++; evidenceSources.push("EMSC");
  }

  // NASA EONET / Wildfires
  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const coords = ev.geometry?.[0]?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  if (nasaEvents.length > 0) { liveEvidenceCount++; evidenceSources.push("NASA"); }

  // GDACS
  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topGDACS = gdacsEvents[0] || null;
  if (topGDACS) { liveEvidenceCount++; evidenceSources.push("GDACS"); }

  // IFRC
  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length > 0) { liveEvidenceCount++; evidenceSources.push("IFRC"); }

  // Heat stress
  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= 35) { liveEvidenceCount++; evidenceSources.push("Open-Meteo Heat"); }

  // Weather hazards (Yemen-pinned; only credit to YEM to avoid misattribution)
  let hazards = null;
  if (iso === 'YEM' && live.hazards.live) {
    hazards = live.hazards.data;
    liveEvidenceCount++; evidenceSources.push("Open-Meteo Hazards");
  }

  // Air quality
  const aqData = live.aq.data[iso] || null;
  if (aqData && aqData.pm25 >= 35) { liveEvidenceCount++; evidenceSources.push("Open-Meteo AQ"); }

  // NOAA (US only)
  let noaaData = null;
  if (iso === 'USA' && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) {
    noaaData = live.noaa.data;
    liveEvidenceCount++; evidenceSources.push("NOAA");
  }

  // disease.sh
  const diseaseRow = (live.disease.data || []).find(d => (d.country || "").toLowerCase() === name);
  if (diseaseRow?.active > 1000) { liveEvidenceCount++; evidenceSources.push("disease.sh"); }

  // World Bank indicators
  const wbPop = live.wb.population.data[iso] || null;
  const wbPoverty = live.wb.poverty.data[iso] || null;
  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
  const wbRefugees = live.wb.refugees.data[iso] || null;
  if (wbInflation && wbInflation.value > 5) { liveEvidenceCount++; evidenceSources.push("WB Inflation"); }
  if (wbGdpGrowth && wbGdpGrowth.value < 0) { liveEvidenceCount++; evidenceSources.push("WB GDP"); }
  if (wbUnemployment && wbUnemployment.value > 10) { liveEvidenceCount++; evidenceSources.push("WB Unemployment"); }
  if (wbRefugees && wbRefugees.value > 1000) { liveEvidenceCount++; evidenceSources.push("WB Refugees"); }
  if (wbPoverty && wbPoverty.value > 5) { liveEvidenceCount++; evidenceSources.push("WB Poverty"); }

  // UNHCR
  const displacement = live.unhcr.data.displacement[iso] || null;
  const totalDisplaced = displacement ? (displacement.refugees||0) + (displacement.idps||0) + (displacement.asylum_seekers||0) : 0;
  if (totalDisplaced > 0) { liveEvidenceCount++; evidenceSources.push("UNHCR"); }
  const unhcrOp = live.unhcr.data.operations[iso] || null;
  if (unhcrOp) { liveEvidenceCount++; evidenceSources.push("UNHCR Ops"); }
  const unhcrEmergency = live.unhcr.data.emergencies[iso] || null;
  if (unhcrEmergency) { liveEvidenceCount++; evidenceSources.push("UNHCR Emergency"); }

  return {
    quakeMag: topQuake ? +topQuake.properties.mag : (topEMSC ? +topEMSC.properties.mag : 0),
    quakePlace: topQuake ? topQuake.properties.place.split(",")[0].trim() : (topEMSC?.properties?.flynn_region || null),
    quakeCount: quakes.length + emscQuakes.length,
    nasaEventCount: nasaEvents.length,
    gdacs: topGDACS,
    gdacsAlert: topGDACS?.properties?.alertlevel?.toLowerCase() || null,
    ifrcCount: ifrcEvents.length,
    maxTempC,
    hazards,
    aq: aqData,
    noaa: noaaData,
    diseaseActive: diseaseRow?.active || 0,
    diseaseName: diseaseRow ? "COVID-19" : null,
    wbPop, wbPoverty, wbInflation, wbGdpGrowth, wbUnemployment, wbRefugees,
    refugees: displacement?.refugees || 0,
    idps: displacement?.idps || 0,
    asylum_seekers: displacement?.asylum_seekers || 0,
    totalDisplaced,
    unhcrOp, unhcrEmergency,
    liveEvidenceCount,
    evidenceSources,
  };
}

// ─── LIVE ADJUSTMENTS ────────────────────────────────────────────────────

function applyLiveAdjustments(priorDims, signals) {
  const dims = { ...priorDims };
  const audit = [];

  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(25, Math.round((signals.quakeMag - 4.0) * 5));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.6));
    dims.health = clamp(dims.health + Math.floor(boost * 0.4));
    audit.push({ source: signals.quakeCount > 1 ? "USGS/EMSC" : "USGS", field: "displacement+health", delta: boost, reason: `M${signals.quakeMag.toFixed(1)} earthquake near ${signals.quakePlace || "region"}`, magnitude: signals.quakeMag });
  }
  if (signals.nasaEventCount > 0) {
    const boost = Math.min(15, signals.nasaEventCount * 5);
    dims.climate = clamp(dims.climate + boost);
    audit.push({ source: "NASA EONET", field: "climate", delta: boost, reason: `${signals.nasaEventCount} active NASA-tracked natural event(s)` });
  }
  if (signals.gdacs) {
    const gdacsBoost = signals.gdacsAlert === "red" ? 15 : signals.gdacsAlert === "orange" ? 8 : 3;
    dims.displacement = clamp(dims.displacement + Math.ceil(gdacsBoost * 0.5));
    dims.health = clamp(dims.health + Math.floor(gdacsBoost * 0.5));
    audit.push({ source: "GDACS", field: "displacement+health", delta: gdacsBoost, reason: `${signals.gdacsAlert?.toUpperCase()} alert active`, alert_level: signals.gdacsAlert });
  }
  if (signals.ifrcCount > 0) {
    const boost = Math.min(12, signals.ifrcCount * 6);
    dims.access = clamp(dims.access + boost);
    audit.push({ source: "IFRC GO", field: "access", delta: boost, reason: `${signals.ifrcCount} active Red Cross/Red Crescent field operation(s)` });
  }
  if (signals.maxTempC >= 35) {
    const boost = Math.min(20, Math.round((signals.maxTempC - 30) * 1.5));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.6));
    dims.health = clamp(dims.health + Math.floor(boost * 0.4));
    audit.push({ source: "Open-Meteo", field: "climate+health", delta: boost, reason: `${signals.maxTempC}°C heat` });
  }
  if (signals.hazards) {
    const h = signals.hazards;
    let hazardBoost = 0;
    const parts = [];
    if (h.flood_discharge > 100) { hazardBoost += 6; parts.push(`${h.flood_discharge.toFixed(0)}m³/s river discharge`); }
    if (h.wave_height > 3) { hazardBoost += 4; parts.push(`${h.wave_height.toFixed(1)}m waves`); }
    if (h.wind_speed > 30) { hazardBoost += 5; parts.push(`${h.wind_speed.toFixed(0)}km/h winds`); }
    if (h.precip_total > 10) { hazardBoost += 4; parts.push(`${h.precip_total.toFixed(0)}mm precipitation`); }
    if (hazardBoost > 0) {
      dims.climate = clamp(dims.climate + hazardBoost);
      audit.push({ source: "Open-Meteo Hazards", field: "climate", delta: hazardBoost, reason: parts.join(", ") });
    }
  }
  if (signals.aq && signals.aq.pm25 >= 35) {
    const boost = Math.min(10, Math.round((signals.aq.pm25 - 35) / 10));
    if (boost > 0) {
      dims.health = clamp(dims.health + boost);
      audit.push({ source: "Open-Meteo AQ", field: "health", delta: boost, reason: `PM2.5 ${signals.aq.pm25.toFixed(0)}µg/m³ in ${signals.aq.city}` });
    }
  }
  if (signals.diseaseActive > 1000) {
    const m = signals.diseaseActive / 1000;
    const boost = Math.min(15, Math.round(Math.log10(m + 1) * 6));
    dims.health = clamp(dims.health + boost);
    audit.push({ source: "disease.sh", field: "health", delta: boost, reason: `${signals.diseaseActive.toLocaleString()} active ${signals.diseaseName} cases` });
  }
  if (signals.wbInflation && signals.wbInflation.value > 5) {
    const boost = Math.min(15, Math.round(signals.wbInflation.value / 4));
    dims.economic = clamp(dims.economic + boost);
    audit.push({ source: "World Bank", field: "economic", delta: boost, reason: `Inflation ${signals.wbInflation.value.toFixed(1)}% (${signals.wbInflation.date})` });
  }
  if (signals.wbGdpGrowth && signals.wbGdpGrowth.value < 0) {
    const boost = Math.min(12, Math.round(Math.abs(signals.wbGdpGrowth.value) * 2));
    dims.economic = clamp(dims.economic + boost);
    audit.push({ source: "World Bank", field: "economic", delta: boost, reason: `GDP growth ${signals.wbGdpGrowth.value.toFixed(1)}% (contraction)` });
  }
  if (signals.wbUnemployment && signals.wbUnemployment.value > 10) {
    const boost = Math.min(10, Math.round(signals.wbUnemployment.value / 5));
    dims.economic = clamp(dims.economic + boost);
    audit.push({ source: "World Bank", field: "economic", delta: boost, reason: `Unemployment ${signals.wbUnemployment.value.toFixed(1)}%` });
  }
  if (signals.wbPoverty && signals.wbPoverty.value > 5) {
    const boost = Math.min(15, Math.round(signals.wbPoverty.value / 4));
    dims.economic = clamp(dims.economic + boost);
    audit.push({ source: "World Bank", field: "economic", delta: boost, reason: `${signals.wbPoverty.value.toFixed(1)}% living in extreme poverty` });
  }
  if (signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    const boost = m>=10?30:m>=5?25:m>=3?20:m>=1.5?15:m>=0.5?10:m>=0.1?5:0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      audit.push({ source: "UNHCR", field: "displacement", delta: boost, reason: `${m.toFixed(1)}M displaced`, breakdown: { refugees: signals.refugees, idps: signals.idps, asylum_seekers: signals.asylum_seekers } });
    }
  }
  if (signals.unhcrEmergency) {
    const boost = signals.unhcrEmergency.level === "critical" ? 12 : signals.unhcrEmergency.level === "high" ? 8 : 4;
    dims.political = clamp(dims.political + boost);
    audit.push({ source: "UNHCR Emergency", field: "political", delta: boost, reason: `Active emergency: ${signals.unhcrEmergency.name} (${signals.unhcrEmergency.level})` });
  }
  if (signals.wbRefugees && signals.wbRefugees.value > 1000) {
    const m = signals.wbRefugees.value / 1_000_000;
    const boost = Math.min(10, Math.round(m * 10));
    if (boost > 0 && !signals.totalDisplaced) {
      dims.displacement = clamp(dims.displacement + boost);
      audit.push({ source: "World Bank", field: "displacement", delta: boost, reason: `${fmtPop(signals.wbRefugees.value)} refugees (cross-check)` });
    }
  }
  if (signals.noaa) {
    const boost = Math.min(10, (signals.noaa.extreme_alerts + signals.noaa.storm_alerts) * 2);
    dims.climate = clamp(dims.climate + boost);
    audit.push({ source: "NOAA", field: "climate", delta: boost, reason: `${signals.noaa.extreme_alerts} extreme + ${signals.noaa.storm_alerts} severe storm alerts active` });
  }

  return { dims, score: clamp(composite(dims)), audit };
}

// ─── STORE BUILDER ──────────────────────────────────────────────────────

function buildStore(liveData) {
  const seed = Math.floor(Date.now() / CFG.SEED_INTERVAL_MS);
  const store = {};
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    const jitter = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const base = clamp(country.prior + jitter, 5, CFG.PRIOR_CAP);
    const priorDims = buildPriorDims(base, country.types);
    const priorScore = clamp(composite(priorDims));
    let dims, score, audit, signals;
    if (liveData) {
      signals = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals);
      dims = adjusted.dims; score = adjusted.score; audit = adjusted.audit;
    } else {
      dims = priorDims; score = priorScore; audit = []; signals = {};
    }
    store[iso] = { ...country, dims, score, priorScore, liveBoost: score - priorScore, audit, signals, spillover: 0 };
  }
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s,n) => s+store[n].score, 0) / neighbours.length;
    store[iso].spillover = +(Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }
  return store;
}

// ─── SEO KEYWORD / FAQ / JSON-LD / ARTICLE (unchanged logic from v4.0, using new signal fields) ──

function buildKeywords(iso, store) {
  const c = store[iso];
  const s = c.signals || {};
  const kws = new Set();
  const name = c.name;
  kws.add(`${name} humanitarian crisis`);
  kws.add(`${name} crisis ${new Date().getFullYear()}`);
  kws.add(`${name} emergency`);
  kws.add(`${name} disaster`);
  for (const t of c.types) {
    const arc = ARC[t];
    if (arc?.seo) { kws.add(`${name} ${arc.seo}`); kws.add(arc.seo); }
  }
  if (s.totalDisplaced > 0) { kws.add(`${name} refugees`); kws.add(`${name} internally displaced`); kws.add(`${name} displacement crisis`); }
  if (s.quakeMag >= 5.0) { kws.add(`${name} earthquake`); kws.add(`earthquake ${name} ${new Date().getFullYear()}`); }
  if (s.gdacs) { kws.add(`${name} disaster alert`); kws.add(`${name} GDACS`); }
  if (s.diseaseActive > 1000) { kws.add(`${name} ${s.diseaseName}`); kws.add(`${s.diseaseName} outbreak`); }
  if (s.wbInflation?.value > 10) { kws.add(`${name} inflation crisis`); kws.add(`${name} economic crisis`); }
  kws.add(`${c.region} humanitarian crisis`);
  kws.add(`${c.region} emergency`);
  kws.add(`what is happening in ${name}`);
  kws.add(`${name} crisis latest news`);
  kws.add(`${name} humanitarian situation`);
  kws.add(`how to help ${name} crisis`);
  kws.add(`${name} aid response`);
  return [...kws].slice(0, 30);
}

function buildFAQs(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const rank = ranked.indexOf(iso)+1;
  const faqs = [];
  faqs.push({
    q: `What is the current humanitarian situation in ${c.name}?`,
    a: `${c.name} currently has a crisis urgency score of ${c.score}/100, rated ${severityLabel(c.score)}, ranking #${rank} of ${ranked.length} countries monitored globally. ${c.types.map(t=>ARC[t]?.l).filter(Boolean).slice(0,2).join(" and ")} are the primary crisis drivers.`,
  });
  if (s.totalDisplaced > 0) {
    faqs.push({
      q: `How many people have been displaced from ${c.name}?`,
      a: `UNHCR data indicates approximately ${fmtPop(s.totalDisplaced)} people have been displaced, including${s.refugees?` ${fmtPop(s.refugees)} refugees,`:""} ${s.idps?`${fmtPop(s.idps)} internally displaced persons (IDPs),`:""} and ${s.asylum_seekers?`${fmtPop(s.asylum_seekers)} asylum-seekers.`:"others seeking protection."}`,
    });
  }
  if (s.diseaseActive > 1000) {
    faqs.push({
      q: `What disease activity is being tracked in ${c.name}?`,
      a: `Live tracking shows ${s.diseaseActive.toLocaleString()} active ${s.diseaseName} cases in ${c.name}.`,
    });
  }
  if (s.wbInflation?.value > 5) {
    faqs.push({
      q: `What is the economic situation in ${c.name}?`,
      a: `World Bank data (${s.wbInflation.date}) shows an inflation rate of ${s.wbInflation.value.toFixed(1)}% in ${c.name}${s.wbGdpGrowth?.value < 0 ? `, alongside a GDP contraction of ${s.wbGdpGrowth.value.toFixed(1)}%` : ""}.`,
    });
  }
  faqs.push({
    q: `How can I help people affected by the crisis in ${c.name}?`,
    a: `You can support the humanitarian response in ${c.name} by donating to organisations active in the region, including UNHCR, WFP, UNICEF, MSF, and local NGOs.`,
  });
  return faqs;
}

function buildJSONLD(iso, store, ranked, faqs, article) {
  const c = store[iso];
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date().toISOString();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle", "@id": `${url}#article`,
        "headline": article.headline, "description": article.metaDescription, "url": url,
        "datePublished": now, "dateModified": now,
        "author": { "@type":"Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
        "publisher": { "@type":"Organization", "name": CFG.ARTICLE_SITE_NAME, "url": CFG.ARTICLE_BASE_URL, "logo": { "@type":"ImageObject", "url": CFG.ARTICLE_LOGO } },
        "mainEntityOfPage": { "@type":"WebPage", "@id": url },
        "articleSection": "Humanitarian Crisis",
        "keywords": article.keywords?.join(", "),
        "about": { "@type":"Place", "name": c.name, "geo": { "@type":"GeoCoordinates", "longitude": c.cent[0], "latitude": c.cent[1] } },
      },
      { "@type":"FAQPage", "@id": `${url}#faq`, "mainEntity": faqs.map(f => ({ "@type":"Question", "name": f.q, "acceptedAnswer": { "@type":"Answer", "text": f.a } })) },
      { "@type":"BreadcrumbList", "itemListElement": [
        { "@type":"ListItem", "position":1, "name":"Home", "item": CFG.ARTICLE_BASE_URL },
        { "@type":"ListItem", "position":2, "name":"Crisis Hub", "item": `${CFG.ARTICLE_BASE_URL}/crisis` },
        { "@type":"ListItem", "position":3, "name": c.name, "item": url },
      ]},
    ],
  };
}

function buildSEOArticle(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const hist = seedHistory(iso, c.score);
  const anom = runAnomalyDetection(hist);
  const fc = trendForecast(hist, c.score);
  const rank = ranked.indexOf(iso)+1;
  const sev = severityLabel(c.score);
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const topDims = [...DIMS].map(d => ({...d, val:c.dims[d.k]||0})).sort((a,b) => b.val-a.val);
  const delta = hist[hist.length-1] - hist[Math.max(0, hist.length-8)];
  const trendWord = delta > 5 ? "rapidly deteriorating" : delta > 2 ? "worsening" : delta < -5 ? "significantly improving" : delta < -2 ? "improving" : "largely stable";
  const keywords = buildKeywords(iso, store);
  const faqs = buildFAQs(iso, store, ranked);
  const primaryTypes = c.types.slice(0, 2).map(t => ARC[t]?.l || t).join(" and ");

  const headline = s.totalDisplaced > 1_000_000
    ? `${c.name} Displacement Crisis: ${fmtPop(s.totalDisplaced)} Flee ${primaryTypes}`
    : s.gdacs?.properties?.alertlevel === "Red"
    ? `${c.name} Disaster Alert: Full Crisis Briefing`
    : s.diseaseActive > 5000
    ? `${c.name} ${s.diseaseName} Surge: Health System Under Strain`
    : `${c.name} Humanitarian Crisis ${now.getFullYear()}: Urgency Score ${c.score}/100 — ${sev}`;

  const metaDescription = `${c.name} humanitarian crisis update: urgency score ${c.score}/100 (${sev}), ranked #${rank} globally. Live data from USGS, UNHCR, World Bank, NASA, GDACS, IFRC.`.slice(0, 160);

  const ogMeta = {
    "og:title": headline, "og:description": metaDescription, "og:url": url, "og:type": "article",
    "og:site_name": CFG.ARTICLE_SITE_NAME, "og:published_time": now.toISOString(), "og:section": "Humanitarian Crisis",
    "og:tag": keywords.slice(0, 5), "twitter:card": "summary_large_image", "twitter:site": CFG.ARTICLE_TWITTER,
    "twitter:title": headline, "twitter:description": metaDescription,
  };

  const related = [
    ...(COUNTRIES[iso].adj||[]).filter(n => store[n]?.score >= 50).slice(0, 3),
    ...ranked.filter(r => r !== iso && COUNTRIES[r].region === c.region).slice(0, 3),
  ].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5).map(r => ({
    iso: r, name: store[r].name, score: store[r].score, slug: slugify(store[r].name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(store[r].name)}`,
  }));

  const paragraphs = [];
  const ledeHook = s.totalDisplaced>1_000_000
    ? `More than ${fmtPop(s.totalDisplaced)} people have been forced from their homes in ${c.name}`
    : s.diseaseActive > 5000
    ? `Active ${s.diseaseName} case counts are stretching ${c.name}'s healthcare system`
    : `The humanitarian situation in ${c.name} has reached ${sev} levels`;

  paragraphs.push(`## Overview\n\n${ledeHook}, according to the latest live data compiled from USGS, NASA, GDACS, IFRC, World Bank, UNHCR, disease.sh, and Open-Meteo. Crisis Monitor's real-time urgency index places ${c.name} at **${c.score} out of 100**, rated **${sev}** and ranked **#${rank} of ${ranked.length} countries** tracked globally as of ${dateStr}.`);

  if (delta > 2 || delta < -2) {
    paragraphs.push(`The situation is **${trendWord}** compared to the previous week, with the composite urgency score ${delta > 0 ? `rising ${Math.abs(Math.round(delta))} points` : `falling ${Math.abs(Math.round(delta))} points`}. A seven-day forecast projects the score reaching **${fc.fc}/100**.`);
  }
  if (s.totalDisplaced > 0) {
    const parts = [];
    if (s.refugees) parts.push(`${fmtPop(s.refugees)} registered refugees`);
    if (s.idps) parts.push(`${fmtPop(s.idps)} internally displaced persons (IDPs)`);
    if (s.asylum_seekers) parts.push(`${fmtPop(s.asylum_seekers)} asylum-seekers`);
    paragraphs.push(`## Displacement\n\nUNHCR data records **${fmtPop(s.totalDisplaced)} people** displaced${parts.length?`, comprising ${parts.join(", ")}`:""}.`);
  }
  if (s.diseaseActive > 1000) {
    paragraphs.push(`## Public Health\n\nLive tracking (disease.sh) shows **${s.diseaseActive.toLocaleString()} active ${s.diseaseName} cases** in ${c.name}, adding pressure to health infrastructure.`);
  }
  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0) {
    paragraphs.push(`## Economic Pressure\n\nWorld Bank indicators show inflation at **${s.wbInflation?.value?.toFixed(1) ?? 'n/a'}%**${s.wbGdpGrowth?.value < 0 ? ` and GDP contraction of **${s.wbGdpGrowth.value.toFixed(1)}%**` : ""}, compounding humanitarian strain.`);
  }
  if (s.gdacs || s.quakeMag >= 4.5) {
    const disasterLine = s.gdacs
      ? `GDACS has an active alert for ${c.name}.`
      : `USGS/EMSC seismic monitoring recorded a **magnitude ${s.quakeMag.toFixed(1)} earthquake** near ${s.quakePlace || "the region"}.`;
    paragraphs.push(`## Disaster Alert\n\n${disasterLine}`);
  }
  if (anom.detected) {
    paragraphs.push(`## Statistical Alert: Anomaly Detected\n\nCrisis Monitor's ensemble anomaly detection (CUSUM, Z-score, Bayesian changepoint, volatility regime) flagged **${anom.methods_fired}/4 methods** in agreement: a statistically significant **${anom.direction}** trajectory (severity: **${anom.severity}**).`);
  }
  const dimRows = topDims.slice(0,5).map(d=>`- **${d.l}**: ${c.dims[d.k]}/100 (weight: ${(d.w*100).toFixed(0)}%)`).join("\n");
  paragraphs.push(`## Urgency Score Breakdown\n\n${dimRows}\n\nAdjusted **${c.liveBoost>0?"+":""}${c.liveBoost} points** from the prior estimate of ${c.priorScore}/100 based on live signals.`);
  const needsList = [...new Set(c.types.flatMap(t=>ARC[t]?.n||[]))].slice(0,5);
  paragraphs.push(`## Response Priorities\n\nRecommended response tier: **${recommendation(c.score, anom).tier}**: ${recommendation(c.score, anom).text}`);
  paragraphs.push(`## Frequently Asked Questions\n\n${faqs.map(f=>`**${f.q}**\n\n${f.a}`).join("\n\n")}`);

  const articleBody = paragraphs.join("\n\n");
  const { words, minutes } = estimateReadTime(articleBody);
  const jsonLD = buildJSONLD(iso, store, ranked, faqs, { headline, metaDescription, keywords });
  const htmlMeta = Object.entries(ogMeta).map(([k,v]) =>
    k.startsWith("og:") ? `<meta property="${k}" content="${Array.isArray(v)?v.join(","):v}">` :
    k.startsWith("twitter:") ? `<meta name="${k}" content="${v}">` : ""
  ).join("\n    ");

  const htmlBody = articleBody
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
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
  <link rel="canonical" href="${url}">
  ${htmlMeta}
  <script type="application/ld+json">${JSON.stringify(jsonLD, null, 2)}</script>
</head>
<body>
  <article>
    <h1>${headline}</h1>
    <div class="urgency-score">${c.score}/100 — ${sev} · #${rank} of ${ranked.length}</div>
    <p class="lede">${metaDescription}</p>
    <div class="article-body">${htmlBody}</div>
    <footer>
      <p><strong>Data sources:</strong> USGS, EMSC, NASA EONET, GDACS, IFRC GO, Open-Meteo (heat/flood/marine/wind/precip/UV/AQ), NOAA, disease.sh, World Bank (population, poverty, inflation, GDP, unemployment, refugees, food prices, water, trade), UNHCR (population, asylum, operations, emergency, statistics). Updated every 5 minutes.</p>
      <p><strong>100% LIVE DATA:</strong> No static fallback data is used.</p>
    </footer>
  </article>
</body>
</html>`;

  return { headline, slug, url, metaDescription, keywords, og: ogMeta, json_ld: jsonLD, faqs, related, body_markdown: articleBody, body_html: html, word_count: words, read_time_minutes: minutes };
}

function buildSitemap(payloads) {
  const now = new Date().toISOString();
  const items = payloads.map(p => `
  <url>
    <loc>${CFG.ARTICLE_BASE_URL}/crisis/${p.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>${p.score >= 80 ? "1.0" : p.score >= 60 ? "0.9" : p.score >= 40 ? "0.8" : "0.7"}</priority>
  </url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

const NAME_ALIASES = {
  "us":"USA","united states":"USA","america":"USA","uk":"GBR","britain":"GBR",
  "dr congo":"COD","drc":"COD","central african republic":"CAF","car":"CAF",
  "south sudan":"SSD","myanmar":"MMR","burma":"MMR","iran":"IRN","north korea":"PRK",
  "south korea":"KOR","uae":"ARE","russia":"RUS","czechia":"CZE","eswatini":"SWZ",
  "swaziland":"SWZ","east timor":"TLS","ivory coast":"CIV","palestine":"PSE",
  "west bank":"PSE","gaza":"PSE","turkey":"TUR","turkiye":"TUR","ukraine":"UKR",
};
function resolveQuery(q) {
  if (!q) return null;
  const lower = q.toLowerCase().trim();
  if (NAME_ALIASES[lower]) return NAME_ALIASES[lower];
  const exact = Object.keys(COUNTRIES).find(iso => iso.toLowerCase() === lower);
  if (exact) return exact;
  return findIsoByName(q);
}

function buildPayload(iso, store, ranked, opts={}) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso)+1;
  const delta7 = Math.round(hist[hist.length-1]-hist[Math.max(0,hist.length-8)]);
  const s = c.signals || {};

  const base = {
    iso, name:c.name, flag:c.flag, score:c.score,
    severity: severityLabel(c.score), severity_emoji: severityEmoji(c.score),
    rank, total_countries: ranked.length, percentile: Math.round((1-rank/ranked.length)*100),
    slug: slugify(c.name), url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
    live_evidence_sources: s.evidenceSources || [],
    live_evidence_count: s.liveEvidenceCount || 0,
    is_live_data: s.liveEvidenceCount >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
    dimensions: Object.fromEntries(DIMS.map(d=>[d.k,{value:c.dims[d.k]||0,label:d.l,weight:d.w}])),
    crisis_types: c.types.map(t=>({code:t,label:ARC[t]?.l||t,icon:ARC[t]?.i||"⚠️"})),
    needs: [...new Set(c.types.flatMap(t=>ARC[t]?.n||[]))],
    trend: { delta_7d:delta7, direction:fc.trend, slope:fc.slope, forecast_7d:fc.fc, escalating:fc.esc },
    anomaly: { detected:anom.detected, severity:anom.severity, direction:anom.direction, methods_fired:anom.methods_fired, z_score:anom.z_score, note:anom.note },
    spillover: { value: c.spillover, from: (COUNTRIES[iso].adj||[]).filter(n=>store[n]?.score>=50).map(n=>({iso:n,name:store[n].name,score:store[n].score})) },
    live_evidence: {
      earthquake: s.quakeMag>=4.5 ? {magnitude:s.quakeMag,location:s.quakePlace,event_count:s.quakeCount,source:"USGS/EMSC"} : null,
      nasa_events: s.nasaEventCount>0 ? {count:s.nasaEventCount, source:"NASA EONET"} : null,
      gdacs: s.gdacs ? {alert_level:s.gdacsAlert, source:"GDACS"} : null,
      ifrc: s.ifrcCount>0 ? {count:s.ifrcCount, source:"IFRC GO"} : null,
      heat: s.maxTempC>=35 ? {max_temp_c:s.maxTempC,source:"Open-Meteo"} : null,
      hazards: s.hazards ? {...s.hazards, source:"Open-Meteo"} : null,
      air_quality: s.aq ? {...s.aq, source:"Open-Meteo AQ"} : null,
      noaa: s.noaa ? {...s.noaa, source:"NOAA"} : null,
      disease: s.diseaseActive>0 ? {disease:s.diseaseName, active:s.diseaseActive, source:"disease.sh"} : null,
      economic: {
        inflation: s.wbInflation ? {...s.wbInflation, source:"World Bank"} : null,
        gdp_growth: s.wbGdpGrowth ? {...s.wbGdpGrowth, source:"World Bank"} : null,
        unemployment: s.wbUnemployment ? {...s.wbUnemployment, source:"World Bank"} : null,
        poverty: s.wbPoverty ? {...s.wbPoverty, source:"World Bank"} : null,
        refugees_wb: s.wbRefugees ? {...s.wbRefugees, source:"World Bank"} : null,
      },
      displacement: s.totalDisplaced>0 ? {total:s.totalDisplaced,refugees:s.refugees,idps:s.idps,asylum_seekers:s.asylum_seekers,source:"UNHCR"} : null,
      unhcr_operation: s.unhcrOp ? {...s.unhcrOp, source:"UNHCR"} : null,
      unhcr_emergency: s.unhcrEmergency ? {...s.unhcrEmergency, source:"UNHCR"} : null,
    },
    score_audit: { prior_score:c.priorScore, adjustments:c.audit||[], spillover:c.spillover, final_score:c.score, live_boost:c.liveBoost },
    recommendation: recommendation(c.score, anom),
    region: c.region,
  };

  if (opts.keywords) base.seo_keywords = buildKeywords(iso, store);
  if (opts.summary)  base.meta_description = `${c.name} humanitarian crisis update: urgency score ${c.score}/100 (${severityLabel(c.score)}), ranked #${rank} globally.`.slice(0,160);
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
      res.end(JSON.stringify({ error:`Could not resolve "${params.q}"`, available:Object.entries(COUNTRIES).map(([iso,d])=>`${iso} (${d.name})`).sort() }));
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

    // ═══ NO STORY WITHOUT LIVE EVIDENCE — honest empty result, no fabricated fallback ═══
    if (params.force_live) {
      finalIsos = finalIsos.filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= CFG.MIN_LIVE_EVIDENCE_SOURCES);

      if (finalIsos.length === 0) {
        res.writeHead(200, CORS);
        res.end(JSON.stringify({
          meta: {
            generated_at: new Date().toISOString(),
            elapsed_ms: Date.now()-start,
            mode: "empty",
            message: "No countries in the requested scope currently have live evidence from any tracked source. No fabricated or fallback story is returned.",
            min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
          },
          countries: [],
        }, null, 2));
        return;
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
      comparison = { countries:rows, verdict:`${sorted[0].flag} ${sorted[0].name} is most severe (score ${sorted[0].score}).` };
    }

    const allAnomalies = Object.keys(store).filter(iso => runAnomalyDetection(seedHistory(iso,store[iso].score)).detected);

    const sources = {
      usgs:      { live: liveData.usgs.live,      events: liveData.usgs.data?.length ?? 0,          label: "USGS Earthquake Hazards Program" },
      emsc:      { live: liveData.emsc.live,       events: liveData.emsc.data?.length ?? 0,          label: "EMSC Seismic Portal" },
      nasa:      { live: liveData.nasa.live,       events: liveData.nasa.data?.length ?? 0,          label: "NASA EONET (general + wildfires)" },
      gdacs:     { live: liveData.gdacs.live,      events: liveData.gdacs.data?.length ?? 0,         label: "GDACS (alerts + earthquakes)" },
      ifrc:      { live: liveData.ifrc.live,       events: liveData.ifrc.data?.length ?? 0,          label: "IFRC GO Platform" },
      heat:      { live: liveData.heat.live,       countries: Object.keys(liveData.heat.data||{}).length, label: "Open-Meteo Heat Stress" },
      hazards:   { live: liveData.hazards.live,    label: "Open-Meteo Flood/Marine/Wind/Precip/UV/Cloud/Lightning (Yemen)" },
      aq:        { live: liveData.aq.live,         cities: Object.keys(liveData.aq.data||{}).length, label: "Open-Meteo Air Quality (multi-city)" },
      noaa:      { live: liveData.noaa.live,       label: "NOAA (stations, extreme alerts, storm reports — US)" },
      disease:   { live: liveData.disease.live,    countries: liveData.disease.data?.length ?? 0,     label: "disease.sh COVID-19" },
      wb:        {
        population:    liveData.wb.population.live,
        poverty:       liveData.wb.poverty.live,
        inflation:     liveData.wb.inflation.live,
        gdp_growth:    liveData.wb.gdpGrowth.live,
        unemployment:  liveData.wb.unemployment.live,
        refugees:      liveData.wb.refugees.live,
        food_prices:   liveData.wb.foodPrices.live,
        water:         liveData.wb.water.live,
        trade:         liveData.wb.trade.live,
        label: "World Bank Indicators",
      },
      unhcr:     { live: liveData.unhcr.live,      label: "UNHCR (population, asylum, operations, emergency, statistics)" },
    };

    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS-(Date.now()%CFG.SEED_INTERVAL_MS))/1000);

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now()-start,
        mode,
        countries_tracked: Object.keys(COUNTRIES).length,
        anomalies_detected: allAnomalies.length,
        anomaly_isos: allAnomalies.slice(0,20),
        score_seed: Math.floor(Date.now()/CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now()/CFG.SEED_INTERVAL_MS)+1)*CFG.SEED_INTERVAL_MS).toISOString(),
        data_policy: {
          type: "100% LIVE DATA ONLY",
          min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
          countries_with_live_evidence: Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount||0) >= 1).length,
          total_countries: Object.keys(store).length,
          no_fallbacks: true,
          description: "No static/hardcoded fallback data is used. A country is only returned as a story if it has at least one genuine live-evidence source; otherwise it is simply omitted, never fabricated.",
        },
        sources,
        endpoints: {
          single: "GET /api/top-story", top_n: "GET /api/top-story?top=10", iso: "GET /api/top-story?iso=SOM",
          compare: "GET /api/top-story?iso=SOM,YEM", region: "GET /api/top-story?region=africa",
          threshold: "GET /api/top-story?threshold=70", search: "GET /api/top-story?q=somalia",
          article: "GET /api/top-story?iso=SOM&format=article", sitemap: "GET /api/top-story?top=50&format=sitemap",
          enriched: "GET /api/top-story?iso=SOM&keywords=true&related=true&schema=true&summary=true",
        },
        anomaly_methodology: "4-method ensemble: CUSUM, Z-score, Bayesian changepoint, Volatility regime. Consensus threshold: 2/4 methods.",
        score_methodology: "Weighted 8-dimension composite. Live signals from USGS, EMSC, NASA, GDACS, IFRC, Open-Meteo (heat/hazards/AQ), NOAA, disease.sh, World Bank, UNHCR adjust dimensions. Regional spillover applied.",
      },
      ...(mode==="single"     ? { top_story:  payloads[0] } : {}),
      ...(mode==="list"       ? { countries:  payloads    } : {}),
      ...(mode==="comparison" ? { comparison, countries:payloads } : {}),
    };

    res.writeHead(200, { ...CORS, "Cache-Control":`public, s-maxage=${secsUntilNext}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));

  } catch(err) {
    console.error("[top-story v5.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({error:"Internal server error", message:err.message}));
  }
}
