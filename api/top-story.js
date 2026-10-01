"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API — v20.5.0 — WIKIMEDIA COMMONS IMAGE EDITION (FIXED)
//  ────────────────────────────────────────────────────────────────────────────
//  📰 RANKS 179 COUNTRIES BY LIKELIHOOD OF BREAKING CRISIS NEWS *RIGHT NOW*
//  🌍 55+ LIVE FEEDS · EVENT-DEDUPLICATED · EVIDENCE-TRACED · HTML-PARITY
//  🖼️ PRIMARY IMAGE from Wikimedia Commons at article top (FIXED)
//
//  ═══ v20.5.0 — IMAGE FETCHING FIXES ═══
//  • Images now fetched for ALL payloads in list/comparison mode
//  • Image attached to every payload regardless of mode
//  • RSS feed includes primary image at top of content
//  • JSON payload includes primary_image for every story
//  • Added fallback image search with country name if headline search fails
//  • Better error handling and logging
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
  // NDBC strategic buoys (near crisis-prone coasts)
  NDBC_BUOYS: ["51001", "51002", "46026", "41009", "23201", "23002", "56001", "56002"],
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
};

const HAZARD_LOOP_ISOS = ['YEM','SOM','SSD','SDN','AFG','ETH','NGA','IND','PAK','BGD','IRQ','SAU','EGY','TUR','IRN','JOR','LBN','SYR','KWT','QAT','ARE','OMN','DZA','MLI','NER'];
const OSM_INFRA_ISOS = ['YEM','SOM','SSD','SDN','AFG','SYR','COD','HTI','MLI','TCD','NER','CAF','MMR','ETH','NGA','LBY','COG','BFA','GIN','VEN'];

const CURRENCY_TO_ISO = {
  EUR: null, GBP: "GBR", JPY: "JPN", CNY: "CHN", CHF: "CHE", AUD: "AUS", CAD: "CAN",
  SEK: "SWE", NOK: "NOR", DKK: "DNK", NZD: "NZL", KRW: "KOR", SGD: "SGP",
  HKD: "HKG", TWD: "TWN", INR: "IND", BRL: "BRA", MXN: "MEX", ZAR: "ZAF",
  TRY: "TUR", RUB: "RUS", PLN: "POL", CZK: "CZE", HUF: "HUN", RON: "ROU",
  BGN: "BGR", HRK: "HRV", ISK: "ISL", ILS: "ISR", AED: "ARE", SAR: "SAU",
  QAR: "QAT", KWD: "KWT", BHD: "BHR", OMR: "OMN", JOD: "JOR", LBP: "LBN",
  EGP: "EGY", MAD: "MAR", TND: "TUN", DZD: "DZA", LYD: "LBY", NGN: "NGA",
  KES: "KEN", TZS: "TZA", UGX: "UGA", RWF: "RWA", ETB: "ETH", GHS: "GHA",
  XOF: null, XAF: null, ZMW: "ZMB", MWK: "MWI", MZN: "MOZ", ZWL: "ZWE",
  BWP: "BWA", NAD: "NAM", SZL: "SWZ", LSL: "LSO", MGA: "MDG", MUR: "MUS",
  SCR: "SYC", CVE: "CPV", GMD: "GMB", GNF: "GIN", LRD: "LBR", SLL: "SLE",
  CDF: "COD", AOA: "AGO", SDG: "SDN", SSP: "SSD", SOS: "SOM",
  DJF: "DJI", ERN: "ERI", KMF: "COM", MVR: "MDV", BTN: "BTN", NPR: "NPL",
  PKR: "PAK", BDT: "BGD", LKR: "LKA", MMK: "MMR", THB: "THA", VND: "VNM",
  KHR: "KHM", LAK: "LAO", MYR: "MYS", IDR: "IDN", PHP: "PHL", BND: "BRN",
  MNT: "MNG", KZT: "KAZ", UZS: "UZB", TJS: "TJK", TMT: "TKM", KGS: "KGZ",
  AZN: "AZE", GEL: "GEO", AMD: "ARM", MDL: "MDA", UAH: "UKR", BYN: "BLR",
  RSD: "SRB", MKD: "MKD", ALL: "ALB", BAM: "BIH",
  ARS: "ARG", CLP: "CHL", COP: "COL", PEN: "PER", VES: "VEN", UYU: "URY",
  PYG: "PRY", BOB: "BOL", GTQ: "GTM", HNL: "HND", NIO: "NIC", CRC: "CRI",
  PAB: "PAN", DOP: "DOM", HTG: "HTI", JMD: "JAM", TTD: "TTO", BBD: "BRB",
  BSD: "BHS", BZD: "BLZ", CUP: "CUB",
  FJD: "FJI", PGK: "PNG", SBD: "SLB", VUV: "VUT", WST: "WSM", TOP: "TON",
  STN: "STP", MRO: "MRT",
};

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

const ISO_NAMES = {
  AFG:"Afghanistan", PSE:"Palestine", SDN:"Sudan", SSD:"South Sudan", YEM:"Yemen",
  UKR:"Ukraine", COD:"DR Congo", SYR:"Syria", SOM:"Somalia", HTI:"Haiti",
  ETH:"Ethiopia", MMR:"Myanmar", LBN:"Lebanon", TUR:"Turkey", PAK:"Pakistan",
  NGA:"Nigeria", BGD:"Bangladesh", IRN:"Iran", VEN:"Venezuela", COL:"Colombia",
  IDN:"Indonesia", PHL:"Philippines", NPL:"Nepal", KEN:"Kenya", MOZ:"Mozambique",
  USA:"United States", CAN:"Canada", MEX:"Mexico", BRA:"Brazil", ARG:"Argentina",
  CHL:"Chile", PER:"Peru", JPN:"Japan", CHN:"China", IND:"India", RUS:"Russia",
  DEU:"Germany", FRA:"France", GBR:"United Kingdom", ITA:"Italy", ESP:"Spain",
  AUS:"Australia", ZAF:"South Africa", EGY:"Egypt", IRQ:"Iraq", JOR:"Jordan",
  SAU:"Saudi Arabia", KAZ:"Kazakhstan", GRC:"Greece", POL:"Poland", SWE:"Sweden",
  NOR:"Norway", FIN:"Finland", DNK:"Denmark", NLD:"Netherlands", BEL:"Belgium",
  CHE:"Switzerland", AUT:"Austria", PRT:"Portugal", IRL:"Ireland", NZL:"New Zealand",
  CZE:"Czechia", HUN:"Hungary", ECU:"Ecuador", ISL:"Iceland", PNG:"Papua New Guinea",
  FJI:"Fiji", SLB:"Solomon Islands", KOR:"South Korea", DZA:"Algeria", LBY:"Libya",
  MAR:"Morocco", TUN:"Tunisia", BDI:"Burundi", COM:"Comoros", DJI:"Djibouti",
  ERI:"Eritrea", MDG:"Madagascar", MUS:"Mauritius", MWI:"Malawi", RWA:"Rwanda",
  SYC:"Seychelles", TZA:"Tanzania", UGA:"Uganda", ZMB:"Zambia", ZWE:"Zimbabwe",
  BEN:"Benin", BFA:"Burkina Faso", CPV:"Cape Verde", CIV:"Ivory Coast", GMB:"Gambia",
  GHA:"Ghana", GIN:"Guinea", GNB:"Guinea-Bissau", LBR:"Liberia", MLI:"Mali",
  MRT:"Mauritania", NER:"Niger", SEN:"Senegal", SLE:"Sierra Leone", TGO:"Togo",
  CAF:"Central African Republic", CMR:"Cameroon", COG:"Republic of Congo", GAB:"Gabon",
  GNQ:"Equatorial Guinea", STP:"Sao Tome and Principe", TCD:"Chad", AGO:"Angola",
  BWA:"Botswana", LSO:"Lesotho", NAM:"Namibia", SWZ:"Eswatini", UZB:"Uzbekistan",
  TJK:"Tajikistan", TKM:"Turkmenistan", KGZ:"Kyrgyzstan", MNG:"Mongolia",
  PRK:"North Korea", BRN:"Brunei", KHM:"Cambodia", LAO:"Laos", MYS:"Malaysia",
  SGP:"Singapore", THA:"Thailand", TLS:"East Timor", VNM:"Vietnam", BTN:"Bhutan",
  LKA:"Sri Lanka", MDV:"Maldives", ARE:"United Arab Emirates", ARM:"Armenia",
  AZE:"Azerbaijan", BHR:"Bahrain", CYP:"Cyprus", GEO:"Georgia", ISR:"Israel",
  KWT:"Kuwait", OMN:"Oman", QAT:"Qatar", BLZ:"Belize", CRI:"Costa Rica",
  SLV:"El Salvador", GTM:"Guatemala", HND:"Honduras", NIC:"Nicaragua", PAN:"Panama",
  ATG:"Antigua and Barbuda", BHS:"Bahamas", BRB:"Barbados", CUB:"Cuba", DMA:"Dominica",
  DOM:"Dominican Republic", GRD:"Grenada", JAM:"Jamaica", KNA:"Saint Kitts and Nevis",
  LCA:"Saint Lucia", TTO:"Trinidad and Tobago", VCT:"Saint Vincent and the Grenadines",
  BOL:"Bolivia", GUY:"Guyana", PRY:"Paraguay", SUR:"Suriname", URY:"Uruguay",
  ALB:"Albania", BIH:"Bosnia and Herzegovina", BGR:"Bulgaria", BLR:"Belarus",
  EST:"Estonia", HRV:"Croatia", LVA:"Latvia", LIE:"Liechtenstein", LTU:"Lithuania",
  LUX:"Luxembourg", MDA:"Moldova", MKD:"North Macedonia", MLT:"Malta",
  MNE:"Montenegro", ROU:"Romania", SRB:"Serbia", SVK:"Slovakia", SVN:"Slovenia",
  AND:"Andorra", SMR:"San Marino", GRL:"Greenland", VUT:"Vanuatu", TON:"Tonga",
  WSM:"Samoa", KIR:"Kiribati", FSM:"Micronesia", MHL:"Marshall Islands", PLW:"Palau",
  NRU:"Nauru", TUV:"Tuvalu", COK:"Cook Islands", TWN:"Taiwan", HKG:"Hong Kong",
  XKX:"Kosovo", ESH:"Western Sahara"
};
const ALIAS_INDEX = new Map();
for (const [iso, name] of Object.entries(ISO_NAMES)) {
  ALIAS_INDEX.set(name.toLowerCase(), iso);
  ALIAS_INDEX.set(iso.toLowerCase(), iso);
}
ALIAS_INDEX.set("usa", "USA");
ALIAS_INDEX.set("united states of america", "USA");
ALIAS_INDEX.set("us", "USA");
ALIAS_INDEX.set("uk", "GBR");
ALIAS_INDEX.set("britain", "GBR");
ALIAS_INDEX.set("great britain", "GBR");
ALIAS_INDEX.set("south korea", "KOR");
ALIAS_INDEX.set("korea", "KOR");
ALIAS_INDEX.set("north korea", "PRK");
ALIAS_INDEX.set("dr congo", "COD");
ALIAS_INDEX.set("democratic republic of the congo", "COD");
ALIAS_INDEX.set("congo-kinshasa", "COD");
ALIAS_INDEX.set("congo", "COG");
ALIAS_INDEX.set("congo-brazzaville", "COG");
ALIAS_INDEX.set("ivory coast", "CIV");
ALIAS_INDEX.set("cote d'ivoire", "CIV");
ALIAS_INDEX.set("côte d'ivoire", "CIV");
ALIAS_INDEX.set("uae", "ARE");
ALIAS_INDEX.set("burma", "MMR");
ALIAS_INDEX.set("east timor", "TLS");
ALIAS_INDEX.set("timor-leste", "TLS");
ALIAS_INDEX.set("vatican", "ITA");
ALIAS_INDEX.set("russia", "RUS");
ALIAS_INDEX.set("russian federation", "RUS");

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

const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
const clampFloat = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stddev(arr) { if (arr.length < 2) return 1; const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1; }
function fmtPop(n) { if (!n) return null; if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return `${n}`; }
function slugify(str) { return String(str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function estimateReadTime(text) { const words = String(text || "").trim().split(/\s+/).filter(Boolean).length; return { words, minutes: Math.max(1, Math.ceil(words / 225)) }; }
function seededRand(n) { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }
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
  for (const cand of candidates) if (ALIAS_INDEX.has(cand)) return ALIAS_INDEX.get(cand);
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
  for (const [iso, coords] of Object.entries(COUNTRY_CENTROIDS)) {
    if (!coords) continue;
    const dist = haversineKm(coords[0], coords[1], lng, lat);
    if (dist < minDist) { minDist = dist; closest = iso; }
  }
  return closest;
}

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function matchesCountryPlace(iso, place) {
  if (!place) return false;
  const p = String(place).toLowerCase();
  const name = (ISO_NAMES[iso] || "").toLowerCase();
  if (!name) return false;
  if (p.includes(name)) return true;
  return false;
}

function eventKeyFor(sig, iso) {
  if (!sig.type.startsWith("earthquake_") && !sig.type.includes("earthquake") && sig.type !== "shakemap_event") {
    const day = sig.ageHours ? Math.floor(Date.now() / 86400000 - sig.ageHours / 24) : "unknown";
    return `${sig.type}::${iso}::${day}`;
  }
  const lat = sig.latitude ?? COUNTRY_CENTROIDS[iso]?.[1] ?? 0;
  const lon = sig.longitude ?? COUNTRY_CENTROIDS[iso]?.[0] ?? 0;
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

async function safeFetch(p) {
  return Promise.race([
    p.then(r => ({ ok: true, data: r })).catch(e => ({ ok: false, error: e.message })),
    new Promise(resolve => setTimeout(() => resolve({ ok: false, error: "timeout" }), CFG.FETCH_TIMEOUT_MS))
  ]);
}

// ════════════════════════════════════════════════════════════════════════════
//  WIKIMEDIA COMMONS IMAGE FETCHER (v20.5.0 — FIXED)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Fetch the primary image and caption from Wikimedia Commons based on article title.
 * Uses the MediaSearch API to find the first relevant image.
 * Falls back to country name search if the headline search fails.
 * Returns { url, caption, title, pageUrl, source } or null.
 */
async function fetchWikimediaImage(articleTitle, countryName) {
  // Try multiple search queries in order of specificity
  const queries = [];
  
  if (articleTitle && articleTitle.length > 5) {
    // Clean the headline for search
    const cleanHeadline = articleTitle
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
    if (cleanHeadline) queries.push(cleanHeadline);
    
    // Extract key terms from the headline (remove common words)
    const stopWords = new Set(['the','a','an','in','on','at','to','for','of','and','or','but','with','from','by','as','is','are','was','were','has','have','had','this','that','these','those','breaking','ongoing','alert','crisis','emergency','disaster','right','now','inside','what','happening','ground','data','update','report','situation','humanitarian']);
    const keyTerms = cleanHeadline.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()));
    if (keyTerms.length >= 2) queries.push(keyTerms.join(' '));
    if (keyTerms.length >= 1) queries.push(keyTerms[0]);
  }
  
  // Fallback: use the country name
  if (countryName) {
    queries.push(`${countryName} crisis`);
    queries.push(countryName);
  }
  
  // Remove duplicates and empty strings
  const uniqueQueries = [...new Set(queries.filter(q => q && q.trim().length > 0))];
  
  for (const searchQuery of uniqueQueries) {
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*`;
      
      const searchRes = await safeFetch(fetch(searchUrl).then(r => r.ok ? r.json() : null));
      if (!searchRes.ok || !searchRes.data?.query?.pages) continue;
      
      const pages = searchRes.data.query.pages;
      const pageIds = Object.keys(pages);
      if (!pageIds.length) continue;
      
      // Pick the first result
      const firstPage = pages[pageIds[0]];
      const imageInfo = firstPage?.imageinfo?.[0];
      if (!imageInfo) continue;
      
      const imageUrl = imageInfo.thumburl || imageInfo.url;
      if (!imageUrl) continue;
      
      // Extract caption from extmetadata
      let caption = '';
      if (imageInfo.extmetadata) {
        const meta = imageInfo.extmetadata;
        if (meta.ImageDescription?.value) {
          caption = meta.ImageDescription.value
            .replace(/<[^>]*>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 300);
        } else if (meta.ObjectName?.value) {
          caption = meta.ObjectName.value.trim().substring(0, 300);
        } else if (meta.Categories?.value) {
          caption = meta.Categories.value.replace(/\|/g, ', ').substring(0, 200);
        }
      }
      
      if (!caption) {
        caption = firstPage.title
          .replace(/^File:/, '')
          .replace(/\.[^.]+$/, '')
          .replace(/_/g, ' ')
          .trim();
      }
      
      const commonsPageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(firstPage.title)}`;
      
      return {
        url: imageUrl,
        caption: caption || 'Image from Wikimedia Commons',
        title: firstPage.title,
        pageUrl: commonsPageUrl,
        source: 'commons.wikimedia.org',
        searchQuery,
      };
    } catch (err) {
      console.warn(`[wikimedia] failed for "${searchQuery}":`, err.message);
    }
  }
  
  return null;
}

/**
 * Fetch images for multiple articles in parallel.
 * Returns a map of iso -> image data.
 */
async function fetchImagesForArticles(articles) {
  const results = {};
  const CONCURRENCY = 5;
  const queue = [...articles];
  
  async function worker() {
    while (queue.length) {
      const article = queue.shift();
      if (!article || !article.iso) continue;
      try {
        const image = await fetchWikimediaImage(article.title, article.countryName);
        if (image) {
          results[article.iso] = image;
        } else {
          console.warn(`[wikimedia] no image found for ${article.iso} (${article.title})`);
        }
      } catch (e) {
        console.warn(`[wikimedia] error for ${article.iso}:`, e.message);
      }
    }
  }
  
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

// ════════════════════════════════════════════════════════════════════════════
//  EVIDENCE INDEX
// ════════════════════════════════════════════════════════════════════════════

const evidenceIndex = {
  sourceCoverage: {},
  population: {},
  images: {},
};

function resetEvidenceIndex() {
  evidenceIndex.sourceCoverage = {};
  evidenceIndex.population = {};
  evidenceIndex.images = {};
  for (const iso of Object.keys(BASE_SCORES)) {
    evidenceIndex.sourceCoverage[iso] = {};
  }
}

function ensureCoverage(iso) {
  if (!evidenceIndex.sourceCoverage[iso]) evidenceIndex.sourceCoverage[iso] = {};
  return evidenceIndex.sourceCoverage[iso];
}

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

function computeEvidenceScore(iso) {
  const ledger = [];
  let totalPts = 0, totalWeight = 0;
  function add(source, label, rawValue, pts, weight) {
    if (pts <= 0) return;
    totalPts += pts * weight;
    totalWeight += weight;
    ledger.push({ source, label, rawValue: typeof rawValue === "number" ? +rawValue.toFixed(1) : rawValue, pts: +pts.toFixed(1), weight: +weight.toFixed(2) });
  }
  const coverage = evidenceIndex.sourceCoverage[iso] || {};
  if (coverage.usgs) { const mag = coverage.usgs.mag || 0; if (mag >= 4.5) { const w = Math.min(1, (mag - 4) / 4); add("USGS", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 4.5, 8, 12), w * 0.9); } }
  if (coverage.nasa) add("NASA", `Natural event: ${coverage.nasa.title?.substring(0, 30) || "active"}`, 1, 6, 0.7);
  if (coverage.wildfire) add("NASA", `Wildfire: ${coverage.wildfire.title?.substring(0, 30) || "active"}`, 1, 7, 0.75);
  if (coverage.gdacs) { const severity = coverage.gdacs.alert || "Orange"; const pts = severity === "Red" ? 10 : severity === "Orange" ? 6 : 3; add("GDACS", `${severity} alert: ${coverage.gdacs.event?.substring(0, 30) || "disaster"}`, 1, pts, 0.85); }
  if (coverage.gdacs_eq) { const mag = coverage.gdacs_eq.mag || 0; if (mag >= 5) add("GDACS", `M${mag.toFixed(1)} earthquake`, mag, logScale(mag, 5, 8, 8), 0.8); }
  if (coverage.gdacs_drought) { const severity = coverage.gdacs_drought.alert || "Orange"; const pts = severity === "Red" ? 9 : severity === "Orange" ? 5.5 : 2.5; add("GDACS", `${severity} drought alert: ${(coverage.gdacs_drought.event || "").substring(0, 30)}`, 1, pts, 0.85); }
  if (coverage.gdacs_volcano) { const severity = coverage.gdacs_volcano.alert || "Orange"; const pts = severity === "Red" ? 9 : severity === "Orange" ? 5.5 : 2.5; add("GDACS", `${severity} volcanic alert: ${(coverage.gdacs_volcano.event || "").substring(0, 30) || "eruption"}`, 1, pts, 0.8); }
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
  if (coverage.emsc) { const mag = coverage.emsc.mag || 0; if (mag >= 4.5) add("EMSC", `M${mag.toFixed(1)} earthquake (secondary network)`, mag, logScale(mag, 4.5, 8, 8), 0.75); }
  if (coverage.ifrc) add("IFRC", `${coverage.ifrc.dtype}: ${(coverage.ifrc.name || "").substring(0, 30)}`, 1, 6, 0.85);
  if (coverage.air_quality) { const pm25 = coverage.air_quality.pm25 || 0; const city = coverage.air_quality.city || "monitored city"; if (pm25 >= 35) add("OPENMETEO", `PM2.5 ${pm25.toFixed(0)} µg/m³ (${city})`, pm25, logScale(pm25, 35, 300, 5), 0.7); }
  if (coverage.hospitals) add("OSM", `${coverage.hospitals} hospitals in region`, coverage.hospitals, coverageScale(coverage.hospitals, 1, 50, 4), 0.6);
  if (coverage.clinics) add("OSM", `${coverage.clinics} clinics in region`, coverage.clinics, coverageScale(coverage.clinics, 1, 100, 3), 0.5);
  if (coverage.emissions) { const emissions = coverage.emissions.total || 0; if (emissions > 1000) add("CLIMATETRACE", `${(emissions/1000).toFixed(1)}kt CO₂e emissions (${coverage.emissions.sector})`, emissions, logScale(emissions, 1000, 1000000, 5), 0.6); }
  if (coverage.wind) { const speed = coverage.wind.speed || 0; if (speed > 30) add("OPENMETEO", `Wind speed ${speed} km/h (storm risk)`, speed, logScale(speed, 30, 100, 5), 0.7); }
  if (coverage.historic_seismic && coverage.historic_seismic.length > 0) { const maxMag = Math.max(...coverage.historic_seismic.map(e => e.mag || 0)); if (maxMag > 6) add("USGS", `Historic M${maxMag.toFixed(1)} earthquake in region`, maxMag, logScale(maxMag, 6, 8, 4), 0.6); }
  if (coverage.water_stress !== undefined && coverage.water_stress !== null) { const stress = coverage.water_stress; if (stress > 20) add("WORLDBANK", `Water stress ${stress.toFixed(1)}% of resources`, stress, logScale(stress, 20, 100, 5), 0.7); }
  if (coverage.unhcr_emergency) { const level = coverage.unhcr_emergency.level || "unknown"; const pts = level === "critical" ? 5 : level === "high" ? 3 : 1; add("UNHCR", `Emergency: ${coverage.unhcr_emergency.name} (${level})`, 1, pts, 0.7); }
  if (coverage.lightning) { const max = coverage.lightning.max || 0; if (max > 100) add("OPENMETEO", `Lightning potential ${max} J/kg (storm risk)`, max, logScale(max, 100, 500, 4), 0.6); }
  if (coverage.unhcr_stats) { const refugees = coverage.unhcr_stats.refugees || 0; if (refugees > 1000) add("UNHCR", `${refugees.toLocaleString()} refugees (${coverage.unhcr_stats.year})`, refugees, logScale(refugees, 1000, 5000000, 7), 0.8); }
  if (coverage.trade_gdp !== undefined && coverage.trade_gdp !== null) { const trade = coverage.trade_gdp; if (trade > 60) add("WORLDBANK", `Trade ${trade.toFixed(1)}% of GDP`, trade, coverageScale(trade, 60, 200, 4), 0.6); }
  if (coverage.conflict_event) { const sev = coverage.conflict_event.severityIndex || 40; add("RELIEFWEB", `${coverage.conflict_event.event_type}: ${(coverage.conflict_event.title || "").substring(0, 40)}`, sev, logScale(sev, 20, 100, 6), 0.75); }
  if (coverage.ipc) { const phase = coverage.ipc.phase || 3; const pts = phase === 5 ? 12 : phase === 4 ? 9 : 6; add("IPC", `Phase ${phase}: ${coverage.ipc.phase_name}`, phase, pts, 0.85); }
  if (coverage.jtwc) add("JTWC", `Pacific cyclone: ${coverage.jtwc.name || "active"}`, 1, 9, 0.9);
  if (coverage.gfw) { const count = coverage.gfw.count || 0; if (count >= 100) add("GFW", `${count.toLocaleString()} deforestation alerts`, count, logScale(count, 100, 10000, 6), 0.7); }
  if (coverage.who_don) add("WHO DON", `${(coverage.who_don.title || "").substring(0, 40)}`, 1, 8, 0.9);
  if (coverage.hdx) { const count = coverage.hdx.count || 0; if (count > 0) add("OCHA HDX", `${count} crisis dataset(s) available`, count, coverageScale(count, 1, 20, 4), 0.65); }
  if (coverage.political_stability !== undefined && coverage.political_stability !== null) { const ps = coverage.political_stability; if (ps < -0.5) add("WORLDBANK", `Political stability index ${ps.toFixed(2)} (unstable)`, ps, logScale(Math.abs(ps), 0.5, 2.5, 5), 0.7); }
  if (coverage.gdelt_conflict) { const n = coverage.gdelt_conflict.count || 0; if (n >= 3) add("GDELT", `${n} conflict/unrest articles (24h)`, n, coverageScale(n, 3, 30, 5), 0.55); }
  if (coverage.population_movement) { const sev = coverage.population_movement.severityIndex || 40; add("RELIEFWEB", `Population movement: ${(coverage.population_movement.title || "").substring(0, 40)}`, sev, logScale(sev, 20, 100, 5), 0.65); }
  if (coverage.conflict_fatalities) { const deaths = coverage.conflict_fatalities.deaths || 0; if (deaths > 10) add("UCDP", `${deaths.toLocaleString()} conflict fatalities (${coverage.conflict_fatalities.period})`, deaths, logScale(deaths, 10, 50000, 12), 0.85); }
  if (coverage.iom_dtm) { const idps = coverage.iom_dtm.idps || 0; if (idps > 50000) add("IOM DTM", `${idps.toLocaleString()} IDPs tracked`, idps, logScale(idps, 50000, 10000000, 9), 0.85); }
  if (coverage.fao_fpma) { const anomaly = Math.abs(coverage.fao_fpma.anomaly_pct || 0); if (anomaly >= 20) add("FAO FPMA", `${coverage.fao_fpma.commodity} ${coverage.fao_fpma.anomaly_pct > 0 ? "+" : ""}${coverage.fao_fpma.anomaly_pct.toFixed(0)}% vs 5yr avg`, anomaly, logScale(anomaly, 20, 150, 7), 0.8); }
  if (coverage.health_capacity) { const beds = coverage.health_capacity.hospital_beds_per_10k || 0; if (beds > 0 && beds < 10) add("WHO GHO", `Only ${beds.toFixed(1)} hospital beds/10k (health capacity stress)`, beds, logScale(10 - beds, 0, 10, 6), 0.75); }
  if (coverage.currency_stress) { const vol = coverage.currency_stress.volatility_pct || 0; if (vol >= 5) add("ECB FX", `${vol.toFixed(1)}% currency volatility`, vol, logScale(vol, 5, 50, 6), 0.7); }
  if (coverage.election_violence) { const count = coverage.election_violence.count || 0; if (count >= 2) add("GDELT", `${count} election-violence article(s)`, count, logScale(count, 2, 30, 6), 0.7); }
  if (coverage.water_stress_static) { const stress = coverage.water_stress_static.baseline_stress || 0; if (stress >= 3.0) add("WRI Aqueduct", `Baseline water stress ${stress.toFixed(1)}/5.0`, stress, logScale(stress, 3, 5, 6), 0.75); }
  if (coverage.ndvi_static) { const anomaly = Math.abs(coverage.ndvi_static.ndvi_anomaly_pct || 0); if (anomaly >= 15) add("FAO GIEWS", `NDVI ${coverage.ndvi_static.ndvi_anomaly_pct.toFixed(0)}% vs LTM`, anomaly, logScale(anomaly, 15, 40, 6), 0.75); }
  if (coverage.us_drought) { const level = coverage.us_drought.level || "D0"; const pts = level === "D4" ? 10 : level === "D3" ? 8 : level === "D2" ? 6 : level === "D1" ? 4 : 2; add("US DM", `US Drought ${level}: ${coverage.us_drought.area_pct || 0}% area`, 1, pts, 0.75); }
  if (coverage.openaq) { const pm25 = coverage.openaq.pm25 || 0; if (pm25 >= 35) add("OpenAQ", `PM2.5 ${pm25.toFixed(0)} µg/m³`, pm25, logScale(pm25, 35, 300, 5), 0.75); }
  if (coverage.ndbc) { const wave = coverage.ndbc.wave_height || 0; if (wave > 3) add("NOAA NDBC", `Wave height ${wave}m (buoy ${coverage.ndbc.buoy})`, wave, logScale(wave, 3, 10, 5), 0.7); }
  if (coverage.cems_activation) { add("Copernicus EMS", `Activation ${coverage.cems_activation.id}: ${coverage.cems_activation.title || "Rapid mapping"}`, 1, 8, 0.9); }
  if (coverage.promed) { const count = coverage.promed.count || 0; if (count >= 1) add("ProMED", `${count} disease outbreak report(s)`, count, logScale(count, 1, 20, 7), 0.8); }
  if (coverage.gvp_volcano) { add("Smithsonian GVP", `Volcanic activity: ${coverage.gvp_volcano.volcano || "active"}`, 1, 7, 0.85); }
  if (coverage.tsunami_alert) { add("NOAA PTWC", `Tsunami ${coverage.tsunami_alert.severity || "warning"}: ${coverage.tsunami_alert.area || "Pacific"}`, 1, 10, 0.95); }
  if (coverage.inform) { const score = coverage.inform.score || 0; if (score >= 5) add("INFORM", `INFORM risk score ${score.toFixed(1)}`, score, logScale(score, 5, 10, 5), 0.7); }

  const evidenceScoreRaw = totalWeight > 0 ? Math.min(CFG.EVIDENCE_CAP, totalPts / totalWeight) : 0;
  const evidenceScore = Number.isFinite(evidenceScoreRaw) ? evidenceScoreRaw : 0;
  const avgWeight = ledger.length > 0 ? totalWeight / ledger.length : 0;
  const sourceCountFactor = Math.min(1, Math.sqrt(ledger.length / 2));
  const confidenceRaw = Math.min(1, avgWeight * sourceCountFactor);
  const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0;
  return { score: +evidenceScore.toFixed(1), confidence: +confidence.toFixed(2), ledger, sourceCount: ledger.length };
}

// ════════════════════════════════════════════════════════════════════════════
//  FETCHERS
// ════════════════════════════════════════════════════════════════════════════

async function fetchHeatAndPrecipLoop() {
  const results = {};
  const CONCURRENCY = 5;
  const queue = [...HAZARD_LOOP_ISOS];
  async function worker() {
    while (queue.length) {
      const iso = queue.shift();
      const coord = COUNTRY_CENTROIDS[iso];
      if (!coord) continue;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=3`;
      const res = await safeFetch(fetch(url).then(r => r.ok ? r.json() : null));
      if (res.ok && res.data?.daily?.temperature_2m_max?.[0] !== undefined) {
        results[iso] = {
          temp: res.data.daily.temperature_2m_max[0],
          precip: res.data.daily.precipitation_sum?.[0] ?? null,
          date: res.data.daily.time?.[0] || null
        };
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

async function fetchFrankfurterFX() {
  const base = "USD";
  const quotes = "EUR,GBP,JPY,CNY,CHF,AUD,CAD,SEK,NOK,DKK,INR,BRL,MXN,ZAR,TRY,RUB,KRW,SGD,HKD,PLN,CZK,HUF,RON,ILS,AED,EGP,NGN,KES,PKR,BDT,LKR,THB,VND,MYR,IDR,PHP,KZT,UAH";
  const url = `https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${quotes}`;
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.json() : null));
  if (!res.ok || !res.data) return null;
  if (Array.isArray(res.data)) {
    const out = {};
    for (const r of res.data) if (r.quote && r.rate) out[r.quote] = r.rate;
    return { date: new Date().toISOString().slice(0,10), rates: out };
  }
  if (res.data.rates) return { date: res.data.date, rates: res.data.rates };
  return null;
}

async function fetchUSDroughtMonitor() {
  const url = "https://gis.fema.gov/arcgis/rest/services/Partner/Drought_Current/MapServer/0/query?where=1%3D1&outFields=DM,Shape__Area&f=geojson&resultRecordCount=50";
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.json() : null));
  if (!res.ok || !res.data?.features) return null;
  let highest = 0;
  const levels = { D0: 0, D1: 1, D2: 2, D3: 3, D4: 4 };
  const counts = {};
  for (const f of res.data.features) {
    const dm = f.properties?.DM || f.properties?.dm || "D0";
    const lvl = levels[dm] ?? 0;
    if (lvl > highest) highest = lvl;
    counts[dm] = (counts[dm] || 0) + 1;
  }
  const levelName = ["D0", "D1", "D2", "D3", "D4"][highest] || "D0";
  return {
    level: levelName,
    level_numeric: highest,
    area_pct: Math.min(100, Math.round((Object.values(counts).reduce((a,b)=>a+b,0) / 50) * 100)),
    polygon_count: res.data.features.length,
    counts,
  };
}

async function fetchOpenAQ() {
  const url = "https://api.openaq.org/v2/latest?limit=100&parameter=pm25&has_geo=true";
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.json() : null));
  if (!res.ok || !res.data?.results) return null;
  const byIso = {};
  for (const r of res.data.results) {
    const iso = r.country ? findIsoByName(r.country) : null;
    if (!iso) continue;
    const pm25 = r.measurements?.find(m => m.parameter === "pm25")?.value;
    if (pm25 !== undefined && pm25 !== null) {
      if (!byIso[iso] || pm25 > byIso[iso].pm25) {
        byIso[iso] = { pm25, city: r.city || r.location, source: "OpenAQ" };
      }
    }
  }
  return byIso;
}

async function fetchNDBCBuoys() {
  const results = {};
  for (const buoy of CFG.NDBC_BUOYS) {
    const url = `https://www.ndbc.noaa.gov/data/realtime2/${buoy}.txt`;
    const res = await safeFetch(fetch(url).then(r => r.ok ? r.text() : null));
    if (!res.ok || !res.data) continue;
    const lines = res.data.trim().split("\n").filter(l => l && !l.startsWith("#"));
    if (lines.length < 1) continue;
    const latest = lines[0].trim().split(/\s+/);
    if (latest.length < 10) continue;
    const year = latest[0], month = latest[1], day = latest[2], hour = latest[3], minute = latest[4];
    const windDir = parseFloat(latest[5]), windSpeed = parseFloat(latest[6]), windGust = parseFloat(latest[7]);
    const waveHeight = parseFloat(latest[8]), domPeriod = parseFloat(latest[9]);
    const buoyLocations = {
      "51001": { lat: 24.4, lon: -162.0, iso: "USA" },
      "51002": { lat: 17.0, lon: -157.0, iso: "USA" },
      "46026": { lat: 37.75, lon: -122.8, iso: "USA" },
      "41009": { lat: 28.5, lon: -80.2, iso: "USA" },
      "23201": { lat: 12.0, lon: 90.0, iso: "IND" },
      "23002": { lat: 15.0, lon: 88.0, iso: "IND" },
      "56001": { lat: -12.0, lon: 122.0, iso: "AUS" },
      "56002": { lat: -20.0, lon: 115.0, iso: "AUS" },
    };
    const loc = buoyLocations[buoy];
    if (loc) {
      results[loc.iso] = {
        buoy,
        wave_height: Number.isFinite(waveHeight) && waveHeight < 90 ? waveHeight : null,
        wind_speed: Number.isFinite(windSpeed) && windSpeed < 90 ? windSpeed : null,
        wind_gust: Number.isFinite(windGust) && windGust < 90 ? windGust : null,
        timestamp: `${year}-${month}-${day}T${hour}:${minute}Z`,
      };
    }
  }
  return results;
}

async function fetchCEMSActivations() {
  const url = "https://emergency.copernicus.eu/mapping/list-of-activations-rapid/feed";
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.text() : null));
  if (!res.ok || !res.data) return null;
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(res.data)) !== null) {
    const block = match[1];
    const title = (block.match(/<title>(.*?)<\/title>/) || [])[1] || "";
    const id = (block.match(/EMSR\d+/) || [])[0] || null;
    const desc = (block.match(/<description>(.*?)<\/description>/) || [])[1] || "";
    const link = (block.match(/<link>(.*?)<\/link>/) || [])[1] || "";
    if (id) items.push({ id, title: title.replace(/<!\[CDATA\[|\]\]>/g, ''), description: desc.replace(/<!\[CDATA\[|\]\]>/g, ''), link });
  }
  return items.slice(0, 20);
}

async function fetchProMED() {
  const url = "https://promedmail.org/promed-posts/feed/";
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.text() : null));
  if (!res.ok || !res.data) return null;
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(res.data)) !== null) {
    const block = match[1];
    const title = (block.match(/<title>(.*?)<\/title>/) || [])[1] || "";
    const desc = (block.match(/<description>(.*?)<\/description>/) || [])[1] || "";
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || "";
    if (title) items.push({ title: title.replace(/<!\[CDATA\[|\]\]>/g, ''), description: desc.replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 200), pubDate });
  }
  return items.slice(0, 30);
}

async function fetchSmithsonianGVP() {
  const url = "https://volcano.si.edu/news/WeeklyVolcanoRSS.xml";
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.text() : null));
  if (!res.ok || !res.data) return null;
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(res.data)) !== null) {
    const block = match[1];
    const title = (block.match(/<title>(.*?)<\/title>/) || [])[1] || "";
    const desc = (block.match(/<description>(.*?)<\/description>/) || [])[1] || "";
    const link = (block.match(/<link>(.*?)<\/link>/) || [])[1] || "";
    if (title) items.push({ volcano: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(), description: desc.replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 300), link });
  }
  return items.slice(0, 30);
}

async function fetchPTWC() {
  const url = "https://www.tsunami.gov/events/xml/PAAQAtom.xml";
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.text() : null));
  if (!res.ok || !res.data) return null;
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(res.data)) !== null) {
    const block = match[1];
    const title = (block.match(/<title[^>]*>(.*?)<\/title>/) || [])[1] || "";
    const updated = (block.match(/<updated>(.*?)<\/updated>/) || [])[1] || "";
    const summary = (block.match(/<summary[^>]*>(.*?)<\/summary>/) || [])[1] || "";
    const severity = (block.match(/<cap:severity>(.*?)<\/cap:severity>/) || [])[1] || "Unknown";
    const area = (block.match(/<cap:areaDesc>(.*?)<\/cap:areaDesc>/) || [])[1] || "";
    if (title) entries.push({ title: title.replace(/<!\[CDATA\[|\]\]>/g, ''), severity, area, updated, summary: summary.replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 200) });
  }
  return entries.slice(0, 10);
}

async function fetchINFORM() {
  const url = "https://drmkc.jrc.ec.europa.eu/inform-index/API/informAPI/Countries/Scores/?WorkflowId=386";
  const res = await safeFetch(fetch(url).then(r => r.ok ? r.json() : null));
  if (!res.ok || !res.data) return null;
  const byIso = {};
  for (const item of res.data) {
    if (item.Iso3 && item.IndicatorId === "INFORM") {
      byIso[item.Iso3] = { score: item.IndicatorScore, rank: item.IndicatorRank, trend: item.Trend };
    }
  }
  return byIso;
}

async function fetchAllLive() {
  resetEvidenceIndex();
  fetcherHealth.startRun();

  const tasks = {
    usgs_weekly: () => fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(r => r.ok ? r.json() : null),
    gdacs_all: () => fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ,TC,FL,VO,DR,WF&alertlevel=Orange,Red&limit=60").then(r => r.ok ? r.json() : null),
    gdacs_earthquakes: () => fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ&limit=20").then(r => r.ok ? r.json() : null),
    emsc_seismic: () => fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.ok ? r.json() : null),
    frankfurter_fx: () => fetchFrankfurterFX(),
    us_drought_monitor: () => fetchUSDroughtMonitor(),
    openaq: () => fetchOpenAQ(),
    ndbc_buoys: () => fetchNDBCBuoys(),
    cems_activations: () => fetchCEMSActivations(),
    promed: () => fetchProMED(),
    smithsonian_gvp: () => fetchSmithsonianGVP(),
    ptwc_tsunami: () => fetchPTWC(),
    inform: () => fetchINFORM(),
    nasa_eonet: () => fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.ok ? r.json() : null),
    nasa_wildfires: () => fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=20").then(r => r.ok ? r.json() : null),
    disease_sh: () => fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=20").then(r => r.ok ? r.json() : null),
    who_don: () => fetch("https://www.who.int/api/news/diseaseoutbreaknews").then(r => r.ok ? r.json() : null),
    wb_population: () => fetch("https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_poverty: () => fetch("https://api.worldbank.org/v2/country/all/indicator/SI.POV.DDAY?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_inflation: () => fetch("https://api.worldbank.org/v2/country/all/indicator/FP.CPI.TOTL.ZG?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_gdp_growth: () => fetch("https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_unemployment: () => fetch("https://api.worldbank.org/v2/country/all/indicator/SL.UEM.TOTL.ZS?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_refugees: () => fetch("https://api.worldbank.org/v2/country/all/indicator/SM.POP.REFG?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_water: () => fetch("https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWTL.ZS?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_trade: () => fetch("https://api.worldbank.org/v2/country/all/indicator/NE.TRD.GNFS.ZS?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    wb_political_stability: () => fetch("https://api.worldbank.org/v2/country/all/indicator/PV.EST?format=json&per_page=300&mrv=1").then(r => r.ok ? r.json() : null),
    unhcr_pop: () => fetch("https://api.unhcr.org/population/v1/population/?limit=30&dataset=population&displayType=totals&yearFrom=2023&yearTo=2024&coa_all=true&forcedDisp=1").then(r => r.ok ? r.json() : null),
    ifrc_go: () => fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.ok ? r.json() : null),
    heat_loop: () => fetchHeatAndPrecipLoop(),
    aq_delhi: () => fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6&longitude=77.2&hourly=pm2_5&forecast_days=1").then(r => r.ok ? r.json() : null),
    aq_beijing: () => fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=39.9&longitude=116.4&hourly=pm2_5&forecast_days=1").then(r => r.ok ? r.json() : null),
    aq_cairo: () => fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.0&longitude=31.2&hourly=pm2_5&forecast_days=1").then(r => r.ok ? r.json() : null),
    flood: () => fetch("https://flood-api.open-meteo.com/v1/flood?latitude=15.35&longitude=44.21&daily=river_discharge&forecast_days=3").then(r => r.ok ? r.json() : null),
    marine: () => fetch("https://marine-api.open-meteo.com/v1/marine?latitude=15.35&longitude=44.21&hourly=wave_height&forecast_days=1").then(r => r.ok ? r.json() : null),
    reliefweb_conflict: () => fetch("https://api.reliefweb.int/v1/reports?appname=gcin-v205&profile=full&limit=30&filter[field]=theme&filter[value][]=Conflict and Violence&sort[]=date:desc").then(r => r.ok ? r.json() : null),
    gdelt_conflict: () => fetch("https://api.gdeltproject.org/api/v2/doc/doc?query=conflict&mode=artlist&maxrecords=25&format=json").then(r => r.ok ? r.json() : null),
    climate_trace: () => fetch("https://api.climatetrace.org/v6/countries").then(r => r.ok ? r.json() : null),
    fao_fpma: () => fetch("https://fpma.apps.fao.org/api/v1/prices").then(r => r.ok ? r.json() : null),
  };

  const keys = Object.keys(tasks);
  const settled = await Promise.allSettled(Object.values(tasks).map(fn => safeFetch(fn())));
  const out = {};
  keys.forEach((k, i) => {
    const s = settled[i];
    if (s.status === "fulfilled" && s.value?.ok && s.value.data) {
      out[k] = s.value.data;
      const d = out[k];
      const recCount = Array.isArray(d) ? d.length : (d && typeof d === "object" ? Object.keys(d).length : 0);
      fetcherHealth.record(k, true, recCount);
    } else {
      out[k] = null;
      fetcherHealth.record(k, false, 0);
    }
  });

  ingestFetchedData(out);
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
//  INGEST
// ════════════════════════════════════════════════════════════════════════════
function ingestFetchedData(out) {
  if (out.usgs_weekly?.features) {
    for (const f of out.usgs_weekly.features) {
      const p = f.properties, coords = f.geometry?.coordinates;
      if (p?.mag >= 4.5 && coords) {
        const iso = findClosestCountry(coords[0], coords[1]);
        if (iso) ensureCoverage(iso).usgs = { mag: p.mag, time: p.time, place: p.place };
      }
    }
  }
  if (out.emsc_seismic?.features) {
    for (const f of out.emsc_seismic.features) {
      const p = f.properties, coords = f.geometry?.coordinates;
      if (p?.mag >= 4.5 && coords) {
        const iso = findClosestCountry(coords[0], coords[1]);
        if (iso) {
          const cov = ensureCoverage(iso);
          if (!cov.usgs || p.mag > (cov.usgs.mag || 0)) {
            cov.emsc = { mag: p.mag, time: p.time, place: p.flynn_region || p.place };
          }
        }
      }
    }
  }
  if (out.gdacs_all?.features) {
    for (const f of out.gdacs_all.features) {
      const p = f.properties, coords = f.geometry?.coordinates;
      if (!p?.eventtype) continue;
      const iso = coords ? findClosestCountry(coords[0], coords[1]) : null;
      if (!iso) continue;
      const cov = ensureCoverage(iso);
      const ev = { event: p.eventname || "", alert: (p.alertlevel || "Orange").toLowerCase() === "red" ? "Red" : "Orange", eventtype: p.eventtype };
      if (p.eventtype === "VO") cov.gdacs_volcano = ev;
      else if (p.eventtype === "DR") cov.gdacs_drought = ev;
      else if (p.eventtype === "FL") cov.gdacs_flood = ev;
      else if (p.eventtype === "TC") cov.gdacs_cyclone = ev;
      else if (p.eventtype === "TS") cov.gdacs_tsunami = ev;
      else if (p.eventtype === "EQ") cov.gdacs_eq = { event: p.eventname, mag: p.magnitude };
      else cov.gdacs = ev;
    }
  }
  if (out.gdacs_earthquakes?.features) {
    for (const f of out.gdacs_earthquakes.features) {
      const p = f.properties, coords = f.geometry?.coordinates;
      if (p?.eventname && coords) {
        const iso = findClosestCountry(coords[0], coords[1]);
        if (iso) {
          const cov = ensureCoverage(iso);
          if (!cov.gdacs_eq) cov.gdacs_eq = { event: p.eventname, mag: p.magnitude };
        }
      }
    }
  }
  if (out.frankfurter_fx?.rates) {
    const rates = out.frankfurter_fx.rates;
    for (const [cur, rate] of Object.entries(rates)) {
      const iso = CURRENCY_TO_ISO[cur];
      if (!iso || !BASE_SCORES[iso]) continue;
      const numRate = safeNum(rate, 1);
      const volProxy = Math.max(0, Math.min(60, Math.log10(Math.max(0.01, numRate)) * 20));
      const cov = ensureCoverage(iso);
      if (!cov.currency_stress || (cov.currency_stress.volatility_pct || 0) < volProxy) {
        cov.currency_stress = { rate_per_usd: numRate, volatility_pct: +volProxy.toFixed(2), source_currency: cur, date: out.frankfurter_fx.date };
      }
    }
  }
  if (out.us_drought_monitor) {
    ensureCoverage("USA").us_drought = {
      level: out.us_drought_monitor.level,
      level_numeric: out.us_drought_monitor.level_numeric,
      area_pct: out.us_drought_monitor.area_pct,
      polygon_count: out.us_drought_monitor.polygon_count,
    };
  }
  if (out.openaq && typeof out.openaq === "object") {
    for (const [iso, data] of Object.entries(out.openaq)) {
      if (data.pm25 !== undefined && data.pm25 !== null) {
        const cov = ensureCoverage(iso);
        if (!cov.air_quality || (cov.air_quality.pm25 || 0) < data.pm25) {
          cov.air_quality = { pm25: data.pm25, city: data.city, source: "OpenAQ" };
        }
      }
    }
  }
  if (out.ndbc_buoys && typeof out.ndbc_buoys === "object") {
    for (const [iso, data] of Object.entries(out.ndbc_buoys)) {
      ensureCoverage(iso).ndbc = data;
    }
  }
  if (Array.isArray(out.cems_activations)) {
    for (const act of out.cems_activations) {
      const title = act.title || "";
      let iso = null;
      for (const [code, name] of Object.entries(ISO_NAMES)) {
        if (title.toLowerCase().includes(name.toLowerCase())) { iso = code; break; }
      }
      if (iso && BASE_SCORES[iso] !== undefined) {
        ensureCoverage(iso).cems_activation = { id: act.id, title: act.title, link: act.link };
      }
    }
  }
  if (Array.isArray(out.promed)) {
    const byIso = {};
    for (const item of out.promed) {
      const title = item.title || "";
      let iso = null;
      for (const [code, name] of Object.entries(ISO_NAMES)) {
        if (title.toLowerCase().includes(name.toLowerCase())) { iso = code; break; }
      }
      if (iso && BASE_SCORES[iso] !== undefined) {
        if (!byIso[iso]) byIso[iso] = { count: 0, titles: [] };
        byIso[iso].count++;
        if (byIso[iso].titles.length < 3) byIso[iso].titles.push(title);
      }
    }
    for (const [iso, data] of Object.entries(byIso)) {
      ensureCoverage(iso).promed = { count: data.count, titles: data.titles };
    }
  }
  if (Array.isArray(out.smithsonian_gvp)) {
    for (const item of out.smithsonian_gvp) {
      const volcanoName = item.volcano || "";
      const text = `${item.volcano} ${item.description}`;
      let iso = null;
      for (const [code, name] of Object.entries(ISO_NAMES)) {
        if (text.toLowerCase().includes(name.toLowerCase())) { iso = code; break; }
      }
      if (iso && BASE_SCORES[iso] !== undefined) {
        ensureCoverage(iso).gvp_volcano = { volcano: volcanoName, description: (item.description || "").slice(0, 200) };
      }
    }
  }
  if (Array.isArray(out.ptwc_tsunami)) {
    for (const alert of out.ptwc_tsunami) {
      if (alert.severity === "Minor" || alert.severity === "Unknown") continue;
      const text = `${alert.title} ${alert.area}`;
      let iso = null;
      for (const [code, name] of Object.entries(ISO_NAMES)) {
        if (text.toLowerCase().includes(name.toLowerCase())) { iso = code; break; }
      }
      if (iso && BASE_SCORES[iso] !== undefined) {
        ensureCoverage(iso).tsunami_alert = { severity: alert.severity, area: alert.area, title: alert.title, updated: alert.updated };
      }
    }
  }
  if (out.inform && typeof out.inform === "object") {
    for (const [iso, data] of Object.entries(out.inform)) {
      if (data.score !== undefined && BASE_SCORES[iso] !== undefined) {
        ensureCoverage(iso).inform = { score: data.score, rank: data.rank, trend: data.trend };
      }
    }
  }
  if (out.nasa_eonet?.events) {
    for (const ev of out.nasa_eonet.events) {
      const coords = ev.geometry?.[0]?.coordinates;
      if (coords) {
        const iso = findClosestCountry(coords[0], coords[1]);
        if (iso) ensureCoverage(iso).nasa = { title: ev.title, categories: ev.categories };
      }
    }
  }
  if (out.nasa_wildfires?.events) {
    for (const ev of out.nasa_wildfires.events) {
      const coords = ev.geometry?.[0]?.coordinates;
      if (coords) {
        const iso = findClosestCountry(coords[0], coords[1]);
        if (iso) ensureCoverage(iso).wildfire = { title: ev.title };
      }
    }
  }
  if (out.heat_loop && typeof out.heat_loop === "object") {
    for (const [iso, d] of Object.entries(out.heat_loop)) {
      if (d && d.temp !== undefined) ensureCoverage(iso).heat = { temp: d.temp, precip: d.precip, date: d.date };
    }
  }
  if (Array.isArray(out.disease_sh)) {
    for (const d of out.disease_sh) {
      const iso = findIsoByName(d.country);
      if (iso && d.active > 0) ensureCoverage(iso).covid = { active: d.active, cases: d.cases, deaths: d.deaths };
    }
  }
  if (out.who_don?.value) {
    for (const don of out.who_don.value) {
      const iso = don.CountryISO3 || don.Country;
      if (iso && BASE_SCORES[iso] !== undefined) ensureCoverage(iso).who_don = { title: don.Title || don.Name, date: don.PublicationDate };
    }
  }
  if (out.wb_population?.[1]) {
    for (const item of out.wb_population[1]) {
      if (item.country?.id && item.value) {
        const iso = item.country.id;
        if (BASE_SCORES[iso] !== undefined) { ensureCoverage(iso).population = parseInt(item.value); evidenceIndex.population[iso] = parseInt(item.value); }
      }
    }
  }
  if (out.wb_poverty?.[1]) {
    for (const item of out.wb_poverty[1]) {
      if (item.country?.id && item.value !== null) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).poverty = parseFloat(item.value); }
    }
  }
  if (out.wb_inflation?.[1]) {
    for (const item of out.wb_inflation[1]) {
      if (item.country?.id && item.value !== null) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) { const cov = ensureCoverage(iso); cov.inflation = parseFloat(item.value); cov.inflation_year = item.date; } }
    }
  }
  if (out.wb_gdp_growth?.[1]) {
    for (const item of out.wb_gdp_growth[1]) {
      if (item.country?.id && item.value !== null) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).gdp_growth = parseFloat(item.value); }
    }
  }
  if (out.wb_unemployment?.[1]) {
    for (const item of out.wb_unemployment[1]) {
      if (item.country?.id && item.value !== null) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).unemployment = parseFloat(item.value); }
    }
  }
  if (out.wb_refugees?.[1]) {
    for (const item of out.wb_refugees[1]) {
      if (item.country?.id && item.value) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).refugees_wb = parseInt(item.value); }
    }
  }
  if (out.wb_water?.[1]) {
    for (const item of out.wb_water[1]) {
      if (item.country?.id && item.value !== null) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).water_stress = parseFloat(item.value); }
    }
  }
  if (out.wb_trade?.[1]) {
    for (const item of out.wb_trade[1]) {
      if (item.country?.id && item.value !== null) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).trade_gdp = parseFloat(item.value); }
    }
  }
  if (out.wb_political_stability?.[1]) {
    for (const item of out.wb_political_stability[1]) {
      if (item.country?.id && item.value !== null) { const iso = item.country.id; if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).political_stability = parseFloat(item.value); }
    }
  }
  if (out.unhcr_pop?.items) {
    for (const item of out.unhcr_pop.items) {
      const iso = item.coa_iso;
      if (iso && BASE_SCORES[iso] !== undefined && item.refugees > 0) {
        const cov = ensureCoverage(iso);
        cov.refugees = item.refugees;
        cov.displaced = (item.refugees || 0) + (item.asylum_seekers || 0);
      }
    }
  }
  if (out.ifrc_go?.results) {
    for (const ev of out.ifrc_go.results) {
      const iso = ev.countries?.[0]?.iso3 || ev.country?.iso3;
      if (iso && BASE_SCORES[iso] !== undefined) ensureCoverage(iso).ifrc = { name: ev.name, dtype: ev.dtype?.name || "Field operation", date: ev.disaster_start_date };
    }
  }
  const aqMap = { aq_delhi: "IND", aq_beijing: "CHN", aq_cairo: "EGY" };
  for (const [key, iso] of Object.entries(aqMap)) {
    const data = out[key];
    const pm25 = data?.hourly?.pm2_5?.[0];
    if (pm25 !== undefined && pm25 !== null) {
      const cov = ensureCoverage(iso);
      if (!cov.air_quality) cov.air_quality = { pm25, city: key.replace("aq_", ""), timestamp: new Date().toISOString() };
    }
  }
  if (out.flood?.daily?.river_discharge) {
    const max = Math.max(...out.flood.daily.river_discharge);
    if (max > 100) ensureCoverage("YEM").flood_risk = { discharge: max, date: out.flood.daily.time?.[0] };
  }
  if (out.marine?.hourly?.wave_height) {
    const max = Math.max(...out.marine.hourly.wave_height);
    if (max > 3) ensureCoverage("YEM").marine = { wave_height: max, date: out.marine.hourly.time?.[0] };
  }
  if (out.reliefweb_conflict?.data) {
    for (const report of out.reliefweb_conflict.data) {
      const iso = report.fields?.country?.[0]?.iso3;
      if (iso && BASE_SCORES[iso] !== undefined) {
        ensureCoverage(iso).conflict_event = { title: report.fields?.title, event_type: report.fields?.primary_type?.name || "Conflict", severityIndex: 60 };
      }
    }
  }
  if (out.gdelt_conflict?.articles) {
    for (const article of out.gdelt_conflict.articles) {
      const iso = article.sourcecountry ? findIsoByName(article.sourcecountry) : null;
      if (iso && BASE_SCORES[iso] !== undefined) {
        const cov = ensureCoverage(iso);
        cov.gdelt_conflict = { count: (cov.gdelt_conflict?.count || 0) + 1 };
      }
    }
  }
  if (out.climate_trace?.countries) {
    for (const c of out.climate_trace.countries) {
      const iso = c.iso3;
      if (iso && BASE_SCORES[iso] !== undefined && c.emissions) {
        ensureCoverage(iso).emissions = { total: c.emissions.total_co2e || c.emissions.co2e_100yr || 0, sector: c.emissions.top_sector || "multiple" };
      }
    }
  }
  if (out.fao_fpma?.prices) {
    for (const p of out.fao_fpma.prices) {
      const iso = p.iso3;
      if (iso && BASE_SCORES[iso] !== undefined) {
        ensureCoverage(iso).fao_fpma = { commodity: p.commodity, anomaly_pct: p.anomaly_pct, price: p.price };
      }
    }
  }
  for (const [iso, stress] of Object.entries(AQUEDUCT_WATER_STRESS)) {
    if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).water_stress_static = { baseline_stress: stress };
  }
  for (const [iso, anomaly] of Object.entries(FAO_NDVI_ANOMALY)) {
    if (BASE_SCORES[iso] !== undefined) ensureCoverage(iso).ndvi_static = { ndvi_anomaly_pct: anomaly };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  LIVE BREAKING
// ════════════════════════════════════════════════════════════════════════════

const LIVE_SIGNALS = {
  gdacs_red:{weight:100,verify:1.0,label:"GDACS RED Alert",icon:"🚨"},
  gdacs_orange:{weight:70,verify:0.9,label:"GDACS Orange Alert",icon:"🟠"},
  earthquake_m6:{weight:95,verify:1.0,label:"M6+ Earthquake",icon:"🌍"},
  earthquake_m5:{weight:65,verify:0.9,label:"M5+ Earthquake",icon:"🌍"},
  earthquake_m45:{weight:40,verify:0.8,label:"M4.5+ Earthquake",icon:"🌍"},
  who_don:{weight:90,verify:1.0,label:"WHO Disease Outbreak",icon:"🦠"},
  unhcr_mass_displace:{weight:90,verify:1.0,label:"Mass Displacement",icon:"🚶"},
  nasa_wildfire:{weight:75,verify:0.9,label:"Active Wildfire",icon:"🔥"},
  nasa_storm:{weight:70,verify:0.9,label:"Severe Storm",icon:"🌀"},
  ifrc_emergency:{weight:75,verify:1.0,label:"IFRC Emergency",icon:"🏥"},
  gdacs_volcano_red:{weight:90,verify:1.0,label:"GDACS Volcano RED Alert",icon:"🌋"},
  gdacs_volcano_orange:{weight:60,verify:0.9,label:"GDACS Volcano Orange Alert",icon:"🌋"},
  gdacs_drought_red:{weight:85,verify:1.0,label:"GDACS Drought RED Alert",icon:"🏜️"},
  gdacs_drought_orange:{weight:55,verify:0.9,label:"GDACS Drought Orange Alert",icon:"🏜️"},
  gdacs_flood_red:{weight:85,verify:1.0,label:"GDACS Flood RED Alert",icon:"🌊"},
  gdacs_flood_orange:{weight:55,verify:0.9,label:"GDACS Flood Orange Alert",icon:"🌊"},
  gdacs_cyclone_red:{weight:95,verify:1.0,label:"GDACS Cyclone RED Alert",icon:"🌀"},
  gdacs_cyclone_orange:{weight:65,verify:0.9,label:"GDACS Cyclone Orange Alert",icon:"🌀"},
  flood_severe:{weight:70,verify:0.9,label:"Severe Flooding",icon:"🌊"},
  marine_hazard:{weight:55,verify:0.9,label:"Marine Hazard",icon:"🌊"},
  heat_extreme:{weight:60,verify:0.8,label:"Extreme Heat",icon:"🥵"},
  disease_active:{weight:50,verify:0.8,label:"Disease Outbreak",icon:"🦠"},
  inflation_crisis:{weight:45,verify:0.9,label:"Inflation Crisis",icon:"📈"},
  gdp_contraction:{weight:40,verify:0.9,label:"GDP Contraction",icon:"📉"},
  political_instability:{weight:45,verify:0.8,label:"Political Instability",icon:"🏛️"},
  gdelt_conflict_spike:{weight:50,verify:0.75,label:"Conflict News Spike",icon:"📰"},
  population_movement:{weight:55,verify:0.8,label:"Population Movement Reported",icon:"🚶"},
  water_stress:{weight:45,verify:0.9,label:"Water Scarcity",icon:"💧"},
  crop_stress:{weight:50,verify:0.9,label:"Crop Stress",icon:"🌾"},
  currency_stress:{weight:55,verify:0.9,label:"Currency Stress",icon:"💱"},
  us_drought:{weight:55,verify:0.95,label:"US Drought",icon:"🏜️"},
  health_capacity_low:{weight:40,verify:0.85,label:"Low Health Capacity",icon:"🏥"},
  conflict_fatalities:{weight:95,verify:1.0,label:"Conflict Fatalities",icon:"⚔️"},
  openaq_air_quality:{weight:55,verify:0.9,label:"Air Quality Alert",icon:"🫁"},
  ndbc_marine:{weight:60,verify:0.95,label:"Marine Buoy Alert",icon:"🌊"},
  cems_activation:{weight:85,verify:1.0,label:"Copernicus EMS Activation",icon:"🛰️"},
  promed_outbreak:{weight:65,verify:0.9,label:"ProMED Disease Report",icon:"🦠"},
  gvp_volcanic_activity:{weight:75,verify:0.95,label:"Volcanic Activity Report",icon:"🌋"},
  tsunami_alert:{weight:100,verify:1.0,label:"Tsunami Alert",icon:"🌊"},
  inform_risk:{weight:50,verify:0.85,label:"INFORM High Risk",icon:"📊"},
};

const RECENCY = { HOURS_6: 1.00, HOURS_24: 0.85, HOURS_72: 0.60, HOURS_168: 0.30, OLDER: 0.10 };

function computeLiveBreakingScore(iso, live, store) {
  const c = store[iso];
  const signals = [];
  const now = Date.now();
  const cov = evidenceIndex.sourceCoverage[iso] || {};

  if (cov.usgs?.mag >= 4.5) {
    const ageHours = cov.usgs.time ? (now - cov.usgs.time) / 36e5 : 24;
    signals.push({
      type: cov.usgs.mag >= 6 ? "earthquake_m6" : cov.usgs.mag >= 5 ? "earthquake_m5" : "earthquake_m45",
      weight: cov.usgs.mag >= 6 ? 95 : cov.usgs.mag >= 5 ? 65 : 40,
      ageHours, source: "USGS",
      details: `M${cov.usgs.mag.toFixed(1)} earthquake${cov.usgs.place ? " near " + cov.usgs.place.split(",")[0] : ""}`,
      magnitude: cov.usgs.mag,
    });
  }
  if (cov.emsc?.mag >= 4.5 && (!cov.usgs || cov.emsc.mag > cov.usgs.mag)) {
    signals.push({ type: "earthquake_m5", weight: 55, ageHours: 12, source: "EMSC", details: `M${cov.emsc.mag.toFixed(1)} earthquake (EMSC)`, magnitude: cov.emsc.mag });
  }
  if (cov.gdacs?.alert) {
    const a = String(cov.gdacs.alert).toLowerCase();
    signals.push({ type: a === "red" ? "gdacs_red" : "gdacs_orange", weight: a === "red" ? 100 : 70, ageHours: 12, source: "GDACS", details: `${cov.gdacs.alert} alert: ${cov.gdacs.event || "disaster"}` });
  }
  if (cov.gdacs_volcano?.alert) {
    const a = cov.gdacs_volcano.alert.toLowerCase();
    signals.push({ type: a === "red" ? "gdacs_volcano_red" : "gdacs_volcano_orange", weight: a === "red" ? 90 : 60, ageHours: 12, source: "GDACS", details: `${cov.gdacs_volcano.alert} volcanic alert: ${cov.gdacs_volcano.event || ""}` });
  }
  if (cov.gdacs_drought?.alert) {
    const a = cov.gdacs_drought.alert.toLowerCase();
    signals.push({ type: a === "red" ? "gdacs_drought_red" : "gdacs_drought_orange", weight: a === "red" ? 85 : 55, ageHours: 24, source: "GDACS", details: `${cov.gdacs_drought.alert} drought alert: ${cov.gdacs_drought.event || ""}` });
  }
  if (cov.gdacs_flood?.alert) {
    const a = cov.gdacs_flood.alert.toLowerCase();
    signals.push({ type: a === "red" ? "gdacs_flood_red" : "gdacs_flood_orange", weight: a === "red" ? 85 : 55, ageHours: 12, source: "GDACS", details: `${cov.gdacs_flood.alert} flood alert: ${cov.gdacs_flood.event || ""}` });
  }
  if (cov.gdacs_cyclone?.alert) {
    const a = cov.gdacs_cyclone.alert.toLowerCase();
    signals.push({ type: a === "red" ? "gdacs_cyclone_red" : "gdacs_cyclone_orange", weight: a === "red" ? 95 : 65, ageHours: 12, source: "GDACS", details: `${cov.gdacs_cyclone.alert} cyclone alert: ${cov.gdacs_cyclone.event || ""}` });
  }
  if (cov.wildfire) signals.push({ type: "nasa_wildfire", weight: 75, ageHours: 24, source: "NASA", details: cov.wildfire.title || "Active wildfire" });
  if (cov.nasa) signals.push({ type: "nasa_storm", weight: 60, ageHours: 24, source: "NASA", details: cov.nasa.title || "Natural event" });
  if (cov.heat?.temp >= 40) signals.push({ type: "heat_extreme", weight: cov.heat.temp >= 45 ? 75 : 60, ageHours: 12, source: "OPENMETEO", details: `${cov.heat.temp}°C extreme heat` });
  if (cov.ifrc) signals.push({ type: "ifrc_emergency", weight: 75, ageHours: 48, source: "IFRC", details: `${cov.ifrc.dtype || "Emergency"}: ${(cov.ifrc.name || "").substring(0, 40)}` });
  if (cov.covid?.active > 10000) signals.push({ type: "disease_active", weight: 50, ageHours: 24, source: "DISEASE.SH", details: `${cov.covid.active.toLocaleString()} active COVID cases` });
  if (cov.who_don) signals.push({ type: "who_don", weight: 90, ageHours: 48, source: "WHO DON", details: (cov.who_don.title || "").substring(0, 60) });
  if (cov.displaced > 100000) signals.push({ type: "unhcr_mass_displace", weight: 90, ageHours: 168, source: "UNHCR", details: `${cov.displaced.toLocaleString()} displaced` });
  if (cov.air_quality?.pm25 >= 50) signals.push({ type: "disease_active", weight: 40, ageHours: 6, source: cov.air_quality.source || "OPENMETEO", details: `PM2.5 ${cov.air_quality.pm25.toFixed(0)} µg/m³ (${cov.air_quality.city})` });
  if (cov.flood_risk?.discharge > 500) signals.push({ type: "flood_severe", weight: 70, ageHours: 24, source: "OPENMETEO", details: `River discharge ${cov.flood_risk.discharge}m³/s` });
  if (cov.marine?.wave_height > 5) signals.push({ type: "marine_hazard", weight: 55, ageHours: 12, source: "OPENMETEO", details: `${cov.marine.wave_height}m waves` });
  if (cov.gdp_growth !== undefined && cov.gdp_growth < -2) signals.push({ type: "gdp_contraction", weight: 40, ageHours: 720, source: "WORLDBANK", details: `GDP growth ${cov.gdp_growth.toFixed(1)}%` });
  if (cov.inflation > 30) signals.push({ type: "inflation_crisis", weight: 45, ageHours: 720, source: "WORLDBANK", details: `Inflation ${cov.inflation.toFixed(1)}%` });
  if (cov.conflict_event) signals.push({ type: "conflict_spike", weight: 50, ageHours: 48, source: "RELIEFWEB", details: (cov.conflict_event.title || "").substring(0, 60) });
  if (cov.population_movement) signals.push({ type: "population_movement", weight: 55, ageHours: 48, source: "RELIEFWEB", details: (cov.population_movement.title || "").substring(0, 60) });
  if (cov.gdelt_conflict?.count >= 3) signals.push({ type: "gdelt_conflict_spike", weight: 50, ageHours: 24, source: "GDELT", details: `${cov.gdelt_conflict.count} conflict/unrest articles` });
  if (cov.currency_stress?.volatility_pct >= 15) signals.push({ type: "currency_stress", weight: cov.currency_stress.volatility_pct >= 30 ? 70 : 55, ageHours: 6, source: "ECB FX", details: `${cov.currency_stress.volatility_pct.toFixed(1)}% implied currency stress (${cov.currency_stress.source_currency})` });
  if (cov.us_drought && iso === "USA") {
    const lvl = cov.us_drought.level || "D0";
    const w = lvl === "D4" ? 80 : lvl === "D3" ? 70 : lvl === "D2" ? 60 : lvl === "D1" ? 50 : 40;
    signals.push({ type: "us_drought", weight: w, ageHours: 72, source: "US DM", details: `US Drought ${lvl} — ${cov.us_drought.area_pct || 0}% area affected` });
  }
  if (cov.water_stress_static?.baseline_stress >= 3.0) signals.push({ type: "water_stress", weight: 45, ageHours: 720, source: "WRI Aqueduct", details: `Baseline water stress ${cov.water_stress_static.baseline_stress.toFixed(1)}/5.0` });
  if (cov.ndvi_static && Math.abs(cov.ndvi_static.ndvi_anomaly_pct) >= 15) signals.push({ type: "crop_stress", weight: 50, ageHours: 720, source: "FAO GIEWS", details: `NDVI ${cov.ndvi_static.ndvi_anomaly_pct.toFixed(0)}% vs LTM` });
  if (cov.health_capacity?.hospital_beds_per_10k < 10) signals.push({ type: "health_capacity_low", weight: 40, ageHours: 720, source: "WHO GHO", details: `${cov.health_capacity.hospital_beds_per_10k.toFixed(1)} beds/10k` });
  if (cov.openaq?.pm25 >= 35) signals.push({ type: "openaq_air_quality", weight: cov.openaq.pm25 >= 100 ? 70 : 55, ageHours: 6, source: "OpenAQ", details: `PM2.5 ${cov.openaq.pm25.toFixed(0)} µg/m³ (${cov.openaq.city || "station"})` });
  if (cov.ndbc?.wave_height > 3) signals.push({ type: "ndbc_marine", weight: cov.ndbc.wave_height > 6 ? 80 : 60, ageHours: 1, source: "NOAA NDBC", details: `${cov.ndbc.wave_height}m waves (buoy ${cov.ndbc.buoy})` });
  if (cov.cems_activation) signals.push({ type: "cems_activation", weight: 85, ageHours: 48, source: "Copernicus EMS", details: `${cov.cems_activation.id}: ${(cov.cems_activation.title || "").substring(0, 50)}` });
  if (cov.promed?.count >= 1) signals.push({ type: "promed_outbreak", weight: 65, ageHours: 72, source: "ProMED", details: `${cov.promed.count} disease report(s): ${(cov.promed.titles?.[0] || "").substring(0, 50)}` });
  if (cov.gvp_volcano) signals.push({ type: "gvp_volcanic_activity", weight: 75, ageHours: 168, source: "Smithsonian GVP", details: `Volcanic activity: ${cov.gvp_volcano.volcano || "active"}` });
  if (cov.tsunami_alert) signals.push({ type: "tsunami_alert", weight: 100, ageHours: 6, source: "NOAA PTWC", details: `${cov.tsunami_alert.severity || "Warning"}: ${cov.tsunami_alert.area || "Pacific"}` });
  if (cov.inform?.score >= 5) signals.push({ type: "inform_risk", weight: cov.inform.score >= 7 ? 65 : 50, ageHours: 720, source: "INFORM", details: `INFORM risk score ${cov.inform.score.toFixed(1)} (rank ${cov.inform.rank || "N/A"})` });

  const rawSignals = signals.map(sig => ({ ...sig, is_live_event: true }));
  const dedupedSignals = deduplicateEvents(rawSignals, iso);

  let rawScore = 0;
  const sources = new Set();
  const activeSignals = [];
  for (const sig of dedupedSignals) {
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
  const distinctEventCount = dedupedSignals.length;
  let liveEventBoost = 0;
  const freshEvents = activeSignals.filter(s => s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
  if (freshEvents.length > 0) {
    liveEventBoost = CFG.LIVE_EVENT_FLAT_BOOST + Math.min(CFG.LIVE_EVENT_FLAT_BOOST * 0.5, (freshEvents.length - 1) * 15);
    rawScore += liveEventBoost;
  }
  const sourceMultiplier = 1 + Math.min(0.8, Math.max(0, sources.size - 1) * 0.3);
  rawScore *= sourceMultiplier;
  const uniqueTypes = new Set(dedupedSignals.map(s => s.type));
  const diversityBonus = Math.min(30, Math.max(0, uniqueTypes.size - 1) * 8);
  rawScore += diversityBonus;
  const freshest = dedupedSignals.reduce((min, s) => Math.min(min, s.ageHours || 9999), 9999);
  let freshnessBonus = 0;
  if (freshest <= 6) freshnessBonus = 40;
  else if (freshest <= 12) freshnessBonus = 25;
  else if (freshest <= 24) freshnessBonus = 15;
  else if (freshest <= 48) freshnessBonus = 8;
  rawScore += freshnessBonus;
  const fsiBaseline = ((safeNum(c?.fsi_score, 50) - 50) / 70) * 8;
  rawScore += Math.max(0, fsiBaseline);
  const normalizedScore = Math.round(100 * (1 - Math.exp(-rawScore / 120)));

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
    freshest_signal_age_hours: freshest === 9999 ? null : +freshest.toFixed(1),
    signals: activeSignals.sort((a, b) => b.weighted_score - a.weighted_score),
    events: dedupedSignals.map(sig => ({
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
  if (!signals || signals.length === 0) return `${country?.flag || "🌍"} ${country?.name || "Unknown"}: No active breaking crisis signals`;
  const freshEvents = signals.filter(s => s.ageHours <= CFG.FRESH_SIGNAL_HOURS);
  const sortedByWeight = [...(freshEvents.length ? freshEvents : signals)].sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
  const top = sortedByWeight[0];
  const second = sortedByWeight.find(e => e.type !== top.type && e.details !== top.details);
  const prefix = top.ageHours <= 6 ? "BREAKING: " : top.ageHours <= 24 ? "" : "ONGOING: ";
  let headline = `${country?.flag || "🌍"} ${prefix}${country?.name || "Unknown"} — ${top.details || top.type}`;
  if (second && second.weight >= 60) headline += ` + ${second.details || second.type}`;
  return headline;
}

// ════════════════════════════════════════════════════════════════════════════
//  RANKING
// ════════════════════════════════════════════════════════════════════════════

function rankByLiveBreaking(store) {
  const isos = Object.keys(store).filter(iso => {
    const eff = store[iso].__effective_score;
    const struct = store[iso].structural_score;
    const s = store[iso].score;
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
  if (!c) return null;
  const text = [];
  if (c.signals?.whoOutbreaks?.length) text.push(c.signals.whoOutbreaks.map(o => o.disease).join(' '));
  if (c.signals?.whoDon?.length) text.push(c.signals.whoDon.map(o => o.title).join(' '));
  if (!text.length) return null;
  return sentimentAnalyzer.analyze(text.join('. '));
}

async function storeHistoricalData(iso, store) {
  if (!CFG.HISTORY_ENABLED) return;
  const c = store[iso];
  if (!c) return;
  await persistentHistory.record(iso, {
    score: safeNum(c.score, 30),
    live_score: c.__live_breaking?.live_score || 0,
    signal_count: c.__live_breaking?.signal_count || 0,
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILD STORE
// ════════════════════════════════════════════════════════════════════════════

async function buildStore(liveData) {
  const store = {};
  for (const iso of Object.keys(BASE_SCORES)) {
    const fsi = FSI_2024[iso] || {};
    const name = ISO_NAMES[iso] || iso;
    const flag = fsi.flag || "🌍";
    const region = fsi.region || "other";
    const types = CTYPES[iso] || DEFAULT_T;
    const base = safeNum(BASE_SCORES[iso], 30);
    const dims = buildDims(base, types);
    const priorScore = clamp(safeNum(composite(dims), 30));
    store[iso] = {
      iso, name, flag, region,
      fsi_score: safeNum(fsi.fsi_score, 50),
      fsi_rank: safeNum(fsi.rank, 999),
      fsi_band: fsi.fsi_band || "Unknown",
      types, dims,
      priorScore, score: priorScore, structural_score: priorScore,
      liveBoost: 0, audit: [], signals: {}, spillover: 0, historical_scores: [],
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
    } catch {
      store[iso].score = store[iso].priorScore;
      store[iso].structural_score = store[iso].priorScore;
    }
  }

  for (const iso in store) {
    try {
      const sameRegion = Object.keys(store).filter(n => n !== iso && store[n].region === store[iso].region);
      if (!sameRegion.length) { store[iso].spillover = 0; continue; }
      const avgNeighbour = sameRegion.reduce((s, n) => s + safeNum(store[n].score, 30), 0) / sameRegion.length;
      const spill = Math.max(0, avgNeighbour - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE;
      const dampened = spill * Math.max(0.3, 1 - (store[iso].score - 30) / 100);
      store[iso].spillover = Math.round(Math.min(CFG.SPILLOVER_MAX, dampened) * 10) / 10;
      store[iso].score = safeClampScore(store[iso].score + store[iso].spillover);
      store[iso].structural_score = store[iso].score;
    } catch { store[iso].spillover = 0; }
  }

  for (const iso in store) store[iso].historical_scores = seedHistory(iso, store[iso].score).map(h => h.s);

  if (CFG.ML_ENABLED) await trainMLModel(store);

  for (const iso in store) {
    try { if (CFG.ML_ENABLED) store[iso].ml_forecast = await mlEnhancedForecast(iso, store[iso].score, store); }
    catch { store[iso].ml_forecast = { fc: store[iso].score, confidence: 0.3, anomaly_probability: 0.1, ml_trained: false, training_count: 0, history_source: "synthetic", history_points: 0, trend: "stable", slope: 0, esc: false }; }
  }

  for (const iso in store) {
    try {
      const cov = evidenceIndex.sourceCoverage[iso] || {};
      store[iso].signals = {
        quakeMag: cov.usgs?.mag || 0, quakePlace: cov.usgs?.place || null, quakeTime: cov.usgs?.time || null,
        shakeMapEvent: cov.usgs ? { mag: cov.usgs.mag, place: cov.usgs.place } : null,
        emscQuake: cov.emsc ? { mag: cov.emsc.mag, place: cov.emsc.place } : null,
        nasaEvents: cov.nasa ? [{ title: cov.nasa.title, categories: cov.nasa.categories }] : [],
        gdacs: cov.gdacs ? { properties: { eventname: cov.gdacs.event, alertlevel: cov.gdacs.alert } } : null,
        gdacsAlert: cov.gdacs?.alert?.toLowerCase() || null,
        gdacsVolcano: cov.gdacs_volcano || null,
        gdacsDrought: cov.gdacs_drought || null,
        gdacsFlood: cov.gdacs_flood || null,
        gdacsCyclone: cov.gdacs_cyclone || null,
        gdacsTsunami: cov.gdacs_tsunami || null,
        ifrcCount: cov.ifrc ? 1 : 0, ifrcEvents: cov.ifrc ? [cov.ifrc] : [],
        ifrcAppeals: [],
        maxTempC: cov.heat?.temp || 0,
        hazards: { flood_discharge: cov.flood_risk?.discharge || 0, wave_height: cov.marine?.wave_height || 0, wind_speed: cov.wind?.speed || 0 },
        aq: cov.air_quality || null,
        whoDon: cov.who_don ? [cov.who_don] : [], whoOutbreaks: [],
        diseaseActive: cov.covid?.active || 0,
        population: cov.population || 0,
        wbInflation: cov.inflation !== undefined ? { value: cov.inflation } : null,
        wbGdpGrowth: cov.gdp_growth !== undefined ? { value: cov.gdp_growth } : null,
        totalDisplaced: cov.displaced || 0,
        politicalStability: cov.political_stability !== undefined ? { value: cov.political_stability } : null,
        iomDtm: cov.iom_dtm || null,
        faoFpma: cov.fao_fpma || null,
        healthCapacity: cov.health_capacity || null,
        currencyStress: cov.currency_stress || null,
        usDrought: cov.us_drought || null,
        conflictFatalities: cov.conflict_fatalities || null,
        unhcrSolutions: cov.unhcr_solutions || null,
        gfwAlerts: cov.gfw || null,
        climateEmissions: cov.emissions || null,
        openaq: cov.openaq || null,
        ndbc: cov.ndbc || null,
        cemsActivation: cov.cems_activation || null,
        promed: cov.promed || null,
        gvpVolcano: cov.gvp_volcano || null,
        tsunamiAlert: cov.tsunami_alert || null,
        inform: cov.inform || null,
      };
    } catch { store[iso].signals = {}; }
  }

  for (const iso in store) {
    try { store[iso].__live_breaking = computeLiveBreakingScore(iso, liveData, store); }
    catch { store[iso].__live_breaking = { live_score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", events: [], signals: [], signal_count: 0, source_count: 0, has_fresh_live_event: false }; }
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
    try { if (CFG.HISTORY_ENABLED) await storeHistoricalData(iso, store); } catch {}
  }

  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  FEED-SAFE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function safeCountrySnapshot(iso, store) {
  const c = (store && store[iso]) || {};
  const lb = c.__live_breaking || {};
  const score = safeNum(c.score, safeNum(c.structural_score, 30));
  const effective = safeNum(c.__effective_score, score);
  const name = c.name || ISO_NAMES[iso] || iso;
  const flag = c.flag || (FSI_2024[iso]?.flag) || "🌍";
  const region = c.region || (FSI_2024[iso]?.region) || "other";
  const slug = slugify(name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  return {
    iso, name, flag, region, slug, url,
    score,
    structural_score: safeNum(c.structural_score, score),
    effective_score: effective,
    severity: severityLabel(score),
    severity_emoji: severityEmoji(score),
    severity_color: severityColor(score),
    live: {
      score: safeNum(lb.live_score, 0),
      tier: lb.tier || "BACKGROUND",
      tier_label: lb.tier_label || "Background",
      tier_icon: lb.tier_icon || "⚪",
      headline: lb.breaking_headline || null,
      signal_count: safeNum(lb.signal_count, 0),
      source_count: safeNum(lb.source_count, 0),
      distinct_event_count: safeNum(lb.distinct_event_count, 0),
      has_fresh_live_event: !!lb.has_fresh_live_event,
      events: Array.isArray(lb.events) ? lb.events : [],
      sources: Array.isArray(lb.sources) ? lb.sources : [],
      freshest_signal_age_hours: Number.isFinite(lb.freshest_signal_age_hours) ? lb.freshest_signal_age_hours : null,
    },
    raw: c,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  PAYLOAD BUILDERS
// ════════════════════════════════════════════════════════════════════════════

function buildKeywords(iso, store) {
  try {
    const c = store[iso];
    if (!c) return [`${iso} crisis`];
    const s = c.signals || {};
    const kws = new Set();
    kws.add(`${c.name} humanitarian crisis`);
    kws.add(`${c.name} crisis ${new Date().getFullYear()}`);
    kws.add(`${c.name} emergency`);
    kws.add(`${c.name} breaking news`);
    for (const t of (c.types || [])) { const arc = ARC[t]; if (arc?.seo) kws.add(`${c.name} ${arc.seo}`); }
    if (s.totalDisplaced > 0) kws.add(`${c.name} refugees`);
    if (s.quakeMag >= 5.0) kws.add(`${c.name} earthquake`);
    if (s.gfwAlerts) kws.add(`${c.name} deforestation`);
    if (s.usDrought) kws.add(`${c.name} drought`);
    if (s.currencyStress) kws.add(`${c.name} currency`);
    if (s.tsunamiAlert) kws.add(`${c.name} tsunami`);
    if (s.promed) kws.add(`${c.name} disease outbreak`);
    return [...kws].slice(0, 15);
  } catch { return [`${iso} crisis`]; }
}

function buildMetaDescription(iso, store) {
  const snap = safeCountrySnapshot(iso, store);
  let parts = [`${snap.name} crisis update: score ${snap.score}/100 (${snap.severity})`];
  if (snap.live.tier === "BREAKING" && snap.live.headline) parts.unshift(`🔴 BREAKING: ${snap.live.headline}`);
  else if (snap.live.tier === "DEVELOPING" && snap.live.headline) parts.unshift(`🟠 DEVELOPING: ${snap.live.headline}`);
  return parts.slice(0, 3).join('. ') + '.';
}

function buildRelatedStories(iso, store, ranked) {
  try {
    return ranked.filter(r => r !== iso && store[r]?.region === store[iso]?.region).slice(0, 5)
      .map(r => {
        const s = safeCountrySnapshot(r, store);
        return { iso: r, name: s.name, score: s.score, live_score: s.live.score, slug: s.slug };
      });
  } catch { return []; }
}

function buildJSONLD(iso, store, ranked, image) {
  const snap = safeCountrySnapshot(iso, store);
  const now = new Date().toISOString();
  const article = {
    "@type": "NewsArticle",
    "@id": `${snap.url}#article`,
    "headline": snap.live.headline || `${snap.name} Crisis — Score ${snap.score}/100`,
    "description": buildMetaDescription(iso, store),
    "url": snap.url,
    "datePublished": now,
    "dateModified": now,
    "author": { "@type": "Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
    "publisher": { "@type": "Organization", "name": CFG.ARTICLE_SITE_NAME, "url": CFG.ARTICLE_BASE_URL, "logo": { "@type": "ImageObject", "url": CFG.ARTICLE_LOGO } },
    "mainEntityOfPage": { "@type": "WebPage", "@id": snap.url },
    "articleSection": "Humanitarian Crisis",
    "keywords": buildKeywords(iso, store).join(", "),
  };
  if (image && image.url) {
    article.image = {
      "@type": "ImageObject",
      "url": image.url,
      "caption": image.caption,
      "creditText": image.source,
    };
  }
  return { "@context": "https://schema.org", "@graph": [article] };
}

async function buildSEOArticle(iso, store, ranked, image) {
  try {
    const snap = safeCountrySnapshot(iso, store);
    const headline = snap.live.headline || `${snap.name} Crisis Monitor — ${snap.score}/100`;
    const events = snap.live.distinct_event_count;
    const dek = `Score ${snap.score}/100 · ${events} event${events === 1 ? "" : "s"}`;
    
    let bodyMarkdown = '';
    let bodyHtml = '';
    
    if (image && image.url) {
      bodyMarkdown = `![${image.caption}](${image.url})\n*${image.caption}* — [${image.source}](${image.pageUrl})\n\n`;
      bodyHtml = `<figure class="article-primary-image">` +
        `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.caption)}" loading="eager" />` +
        `<figcaption>${escapeHtml(image.caption)} — <a href="${escapeHtml(image.pageUrl)}" target="_blank" rel="noopener">${escapeHtml(image.source)}</a></figcaption>` +
        `</figure>\n`;
    }
    
    const overview = `## Overview\n\n${snap.name} scores ${snap.score}/100 (${snap.severity}).`;
    bodyMarkdown += overview;
    bodyHtml += `<h2>Overview</h2>\n<p>${escapeHtml(snap.name)} scores ${escapeHtml(String(snap.score))}/100 (${escapeHtml(snap.severity)}).</p>`;
    
    const { words, minutes } = estimateReadTime(bodyMarkdown.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<[^>]*>/g, ''));
    
    return {
      headline,
      dek,
      slug: snap.slug,
      url: snap.url,
      metaDescription: buildMetaDescription(iso, store),
      keywords: buildKeywords(iso, store),
      primary_image: image || null,
      body_markdown: bodyMarkdown,
      body_html: `<article>\n<h1>${escapeHtml(headline)}</h1>\n${bodyHtml}\n</article>`,
      word_count: words,
      read_time_minutes: minutes,
    };
  } catch (e) {
    const name = ISO_NAMES[iso] || iso;
    const slug = slugify(name);
    return {
      headline: `${name} Crisis Monitor`,
      dek: "Crisis update pending.",
      slug,
      url: `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`,
      metaDescription: `${name} crisis update.`,
      keywords: [`${name} crisis`],
      primary_image: image || null,
      body_markdown: `## Overview\n\n${name} crisis data unavailable.`,
      body_html: `<article><h1>${escapeHtml(name)} Crisis Monitor</h1><p>Data unavailable.</p></article>`,
      word_count: 3,
      read_time_minutes: 1,
    };
  }
}

function buildSitemap(payloads) {
  const now = new Date().toISOString();
  const rows = payloads.filter(p => p && p.slug).map(p => `  <url><loc>${CFG.ARTICLE_BASE_URL}/crisis/${p.slug}</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>`;
}

function escapeXml(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function escapeHtml(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

function buildRSSFeed(isos, store, ranked, images) {
  const now = new Date();
  let feedIsos = Array.isArray(isos) && isos.length > 0 ? isos.slice(0, 30) : [];
  if (feedIsos.length === 0) {
    feedIsos = Array.isArray(ranked) && ranked.length > 0 ? ranked.slice(0, 30) : Object.keys(BASE_SCORES).slice(0, 30);
  }

  const items = feedIsos.map(iso => {
    const snap = safeCountrySnapshot(iso, store);
    const img = images[iso] || null;
    const title = snap.live.headline || `${snap.name} Crisis Monitor — ${snap.score}/100`;
    const link = snap.url;
    const desc = `Score ${snap.score}/100 · ${snap.live.distinct_event_count} events · ${snap.severity}`;
    
    // Build content with image at the top
    let contentHtml = '';
    if (img) {
      contentHtml += `<figure class="article-primary-image">` +
        `<img src="${escapeXml(img.url)}" alt="${escapeXml(img.caption)}" loading="eager" />` +
        `<figcaption>${escapeXml(img.caption)} — <a href="${escapeXml(img.pageUrl)}" target="_blank" rel="noopener">${escapeXml(img.source)}</a></figcaption>` +
        `</figure>\n`;
    }
    contentHtml += `<h1>${escapeXml(title)}</h1>\n<p>${escapeXml(desc)}</p>`;
    
    const enclosure = img && img.url ? `<enclosure url="${escapeXml(img.url)}" type="image/jpeg" />` : '';
    
    return `<item>` +
      `<title>${escapeXml(title)}</title>` +
      `<link>${escapeXml(link)}</link>` +
      `<guid isPermaLink="true">${escapeXml(link)}</guid>` +
      `<pubDate>${now.toUTCString()}</pubDate>` +
      `<description>${escapeXml(desc)}</description>` +
      (snap.live.tier === "BREAKING" ? `<category>🔴 BREAKING NEWS</category>` : "") +
      enclosure +
      `<content:encoded><![CDATA[${contentHtml}]]></content:encoded>` +
      `</item>`;
  }).join("");

  const safeItems = items && items.length > 0
    ? items
    : `<item><title>${escapeXml(CFG.ARTICLE_SITE_NAME)} — Live Feed</title><link>${CFG.ARTICLE_BASE_URL}</link><guid isPermaLink="false">${CFG.ARTICLE_BASE_URL}</guid><pubDate>${now.toUTCString()}</pubDate><description>Live global crisis monitoring active.</description></item>`;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">` +
    `<channel>` +
    `<title>${escapeXml(CFG.ARTICLE_SITE_NAME)}</title>` +
    `<link>${CFG.ARTICLE_BASE_URL}</link>` +
    `<description>Live breaking world crisis news with primary images from Wikimedia Commons. Updated every 5 minutes.</description>` +
    `<language>en-us</language>` +
    `<lastBuildDate>${now.toUTCString()}</lastBuildDate>` +
    safeItems +
    `</channel></rss>`;
}

function buildLiveEvidenceView(iso, store) {
  const cov = evidenceIndex.sourceCoverage[iso] || {};
  return {
    gdacs: cov.gdacs ? { alert_level: (cov.gdacs.alert || "").toLowerCase(), event: cov.gdacs.event } : null,
    gdacs_volcano: cov.gdacs_volcano || null,
    gdacs_drought: cov.gdacs_drought || null,
    gdacs_flood: cov.gdacs_flood || null,
    gdacs_cyclone: cov.gdacs_cyclone || null,
    displacement: { total: safeNum(cov.displaced, 0) || safeNum(cov.refugees, 0) },
    earthquake: cov.usgs?.mag ? { magnitude: safeNum(cov.usgs.mag, 0), location: cov.usgs.place || null } : null,
    heat: { max_temp_c: safeNum(cov.heat?.temp, 0) },
    economic: {
      inflation: { value: safeNum(cov.inflation, 0) },
      gdp_growth: { value: safeNum(cov.gdp_growth, 0) },
      unemployment: { value: safeNum(cov.unemployment, 0) },
      political_stability: safeNum(cov.political_stability, 0),
    },
    currency_stress: cov.currency_stress || null,
    us_drought: cov.us_drought || null,
    water_stress: safeNum(cov.water_stress, 0) || safeNum(cov.water_stress_static?.baseline_stress, 0),
    ndvi_anomaly: safeNum(cov.ndvi_static?.ndvi_anomaly_pct, 0),
    health_beds_per_10k: safeNum(cov.health_capacity?.hospital_beds_per_10k, 0),
    population: safeNum(cov.population, 0),
    refugees: safeNum(cov.refugees, 0),
    air_quality: cov.air_quality ? { pm25: safeNum(cov.air_quality.pm25, 0), city: cov.air_quality.city, source: cov.air_quality.source } : null,
    flood_risk: cov.flood_risk ? { discharge: safeNum(cov.flood_risk.discharge, 0) } : null,
    marine: cov.marine ? { wave_height: safeNum(cov.marine.wave_height, 0) } : null,
    emissions: cov.emissions ? { total: safeNum(cov.emissions.total, 0), sector: cov.emissions.sector } : null,
    openaq: cov.openaq || null,
    ndbc: cov.ndbc || null,
    cems_activation: cov.cems_activation || null,
    promed: cov.promed || null,
    gvp_volcano: cov.gvp_volcano || null,
    tsunami_alert: cov.tsunami_alert || null,
    inform: cov.inform || null,
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
  const delta7 = series.length >= 8 ? Math.round(series[series.length - 1] - series[Math.max(0, series.length - 8)]) : 0;
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
    out[d.k] = { value: safeNum(dims[d.k], 0), label: d.l, weight: d.w, icon: d.icon };
  }
  return out;
}

function buildCrisisTypesCompat(types) {
  return (types || DEFAULT_T).map(t => ({
    code: t,
    label: ARC[t]?.l || t,
    icon: ARC[t]?.i || "⚠️",
    color: ARC[t]?.color || "#6bc8ff",
  }));
}

async function buildPayload(iso, store, ranked, rankIndex, opts = {}, image = null) {
  try {
    const snap = safeCountrySnapshot(iso, store);
    const c = snap.raw;
    const lb = c.__live_breaking || {};
    const htmlScore = snap.score;

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

    let article = null;
    if (opts.summary) {
      article = await buildSEOArticle(iso, store, ranked, image);
    }

    // Build schema with image
    const schemaOrg = opts.schema ? buildJSONLD(iso, store, ranked, image) : null;

    return {
      iso, name: snap.name, flag: snap.flag,
      score: htmlScore,
      structural_score: snap.structural_score,
      effective_score: snap.effective_score,
      pop_multiplier: c.__pop_multiplier ?? 1.0,
      resolution_credit: c.__resolution_credit ?? 0,
      is_low_instrumentation: !!c.is_low_instrumentation,
      severity: snap.severity,
      severity_emoji: snap.severity_emoji,
      severity_color: snap.severity_color,
      rank, total_countries: ranked.length,
      percentile: ranked.length > 0 ? Math.round((1 - rank / ranked.length) * 100) : 0,
      slug: snap.slug, url: snap.url,
      primary_image: image || null,
      evidence: {
        score: safeNum(c.evidence_score, 0),
        confidence: safeNum(c.evidence_confidence, 0),
        source_count: safeNum(c.evidence_source_count, 0),
        sources: c.evidence_sources || [],
        ledger: c.evidence_ledger || [],
      },
      live_breaking: {
        score: snap.live.score,
        tier: snap.live.tier,
        tier_label: snap.live.tier_label,
        tier_icon: snap.live.tier_icon,
        headline: snap.live.headline,
        signal_count: snap.live.signal_count,
        raw_signal_count: safeNum(lb.raw_signal_count, 0),
        distinct_event_count: snap.live.distinct_event_count,
        has_fresh_live_event: snap.live.has_fresh_live_event,
        source_count: snap.live.source_count,
        sources: snap.live.sources,
        freshest_signal_age_hours: snap.live.freshest_signal_age_hours,
        events: snap.live.events,
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
      spillover: { value: safeNum(c.spillover, 0), from: [] },
      ml: mlCompat,
      sentiment: c.sentiment ? { score: safeNum(c.sentiment.score, 0), label: c.sentiment.label, confidence: safeNum(c.sentiment.confidence, 0.5) } : null,
      score_audit: {
        prior_score: safeNum(c.priorScore, 30),
        structural_score: snap.structural_score,
        live_breaking_score: snap.live.score,
        pop_multiplier: c.__pop_multiplier ?? 1.0,
        resolution_credit: c.__resolution_credit ?? 0,
        effective_score: snap.effective_score,
        spillover: safeNum(c.spillover, 0),
        final_score: htmlScore,
        evidence_score: safeNum(c.evidence_score, 0),
        evidence_confidence: safeNum(c.evidence_confidence, 0),
      },
      recommendation: recCompat,
      region: snap.region,
      fsi: { score: safeNum(c.fsi_score, 50), rank: safeNum(c.fsi_rank, 999), band: c.fsi_band || "Unknown" },
      ...(opts.keywords ? { keywords: buildKeywords(iso, store) } : {}),
      ...(opts.related ? { related_stories: buildRelatedStories(iso, store, ranked) } : {}),
      ...(opts.schema && schemaOrg ? { schema_org: schemaOrg } : {}),
      ...(opts.summary && article ? { article } : {}),
    };
  } catch (e) {
    console.error(`[buildPayload] fallback for ${iso}:`, e.message);
    const snap = safeCountrySnapshot(iso, store);
    return {
      iso, name: snap.name, flag: snap.flag,
      score: snap.score, structural_score: snap.structural_score, effective_score: snap.effective_score,
      pop_multiplier: 1.0, resolution_credit: 0, is_low_instrumentation: false,
      severity: snap.severity, severity_emoji: snap.severity_emoji, severity_color: snap.severity_color,
      rank: 0, total_countries: 0, percentile: 0,
      slug: snap.slug, url: snap.url,
      primary_image: image || null,
      evidence: { score: 0, confidence: 0, source_count: 0, sources: [], ledger: [] },
      live_breaking: { score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", headline: null, signal_count: 0, raw_signal_count: 0, distinct_event_count: 0, has_fresh_live_event: false, source_count: 0, sources: [], freshest_signal_age_hours: null, events: [], signals: [] },
      story_heat: { score: 0, tier: "BACKGROUND", top_drivers: [] },
      live_evidence: buildLiveEvidenceView(iso, store),
      live_evidence_sources: [], live_evidence_count: 0, is_live_data: false,
      dimensions: buildDimensionsCompat(snap.raw.dims || {}),
      crisis_types: buildCrisisTypesCompat(snap.raw.types || DEFAULT_T),
      needs: [],
      trend: { delta_7d: 0, direction: "stable", slope: 0, forecast_7d: snap.score, confidence: 0.3, history_source: "synthetic", history_points: 0 },
      anomaly: { detected: false, severity: "NONE", methods_fired: 0, z_score: 0 },
      anomalyScore: 0,
      spillover: { value: 0, from: [] },
      ml: null, sentiment: null,
      score_audit: { prior_score: snap.score, structural_score: snap.structural_score, live_breaking_score: 0, pop_multiplier: 1.0, resolution_credit: 0, effective_score: snap.effective_score, spillover: 0, final_score: snap.score, evidence_score: 0, evidence_confidence: 0 },
      recommendation: recommendation(snap.score, null),
      region: snap.region,
      fsi: { score: 50, rank: 999, band: "Unknown" },
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  HANDLER — v20.5.0
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
      images: url.searchParams.get("images") !== "false",
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

  if (params.q && !params.iso) {
    const r = findIsoByName(params.q);
    if (!r) { res.writeHead(404, CORS); res.end(JSON.stringify({ error: `Could not resolve "${params.q}"` })); return; }
    params.iso = r;
  }

  const isoList = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => BASE_SCORES[s] !== undefined) : [];
  const invalid = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => BASE_SCORES[s] === undefined) : [];
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
      for (const iso of Object.keys(store)) {
        const cov = evidenceIndex.sourceCoverage[iso] || {};
        for (const [key] of Object.entries(cov)) {
          if (!coverage[key]) coverage[key] = { countries: 0 };
          coverage[key].countries++;
        }
      }
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=60" });
      res.end(JSON.stringify({
        meta: { generated_at: new Date().toISOString(), version: "v20.5.0" },
        fetcher_health: fetcherHealth.summary(),
        fetcher_live_count: fetcherHealth.liveCount(),
        fetcher_failed_count: fetcherHealth.failedCount(),
        coverage_by_key: coverage,
        countries_with_evidence: Object.keys(evidenceIndex.sourceCoverage).filter(iso => Object.keys(evidenceIndex.sourceCoverage[iso] || {}).length > 0).length,
        countries_with_images: Object.keys(evidenceIndex.images).length,
        static_fallbacks: { water_stress: Object.keys(AQUEDUCT_WATER_STRESS).length, ndvi_anomaly: Object.keys(FAO_NDVI_ANOMALY).length },
      }, null, 2));
      return;
    }

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => store[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => safeNum(store[iso].__effective_score, 0) >= params.threshold);
    else if (params.force_live && liveEventsOnly.length > 0) finalIsos = liveEventsOnly.slice(0, params.top);
    else if (params.force_live && breakingRanked.length > 0) finalIsos = breakingRanked.slice(0, params.top);
    else finalIsos = ranked.slice(0, params.top);
    if (!finalIsos.length && !isoList.length) finalIsos = ranked.length > 0 ? ranked.slice(0, params.top) : Object.keys(BASE_SCORES).slice(0, params.top);

    // ═══════════════════════════════════════════════════════════════════════
    //  FETCH IMAGES FOR ALL FINAL ISOS (v20.5.0 FIX)
    // ═══════════════════════════════════════════════════════════════════════
    const imageMap = {};
    if (params.images && finalIsos.length > 0) {
      console.log(`[v20.5.0] Fetching images for ${finalIsos.length} stories...`);
      const articles = finalIsos.map(iso => {
        const snap = safeCountrySnapshot(iso, store);
        const title = snap.live.headline || `${snap.name} Crisis Monitor — ${snap.score}/100`;
        return { iso, title, countryName: snap.name };
      });
      const fetchedImages = await fetchImagesForArticles(articles);
      console.log(`[v20.5.0] Fetched ${Object.keys(fetchedImages).length} images`);
      for (const [iso, img] of Object.entries(fetchedImages)) {
        imageMap[iso] = img;
        evidenceIndex.images[iso] = img;
      }
    }

    const isSingleIso = finalIsos.length === 1 && !params.region && !params.threshold && params.top === 1;
    const opts = isSingleIso
      ? { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary }
      : { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary };

    if (params.rss) {
      let source = params.region
        ? (liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked)).filter(i => store[i]?.region === params.region)
        : (liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked));
      if (!source || source.length === 0) source = ranked.length > 0 ? ranked : Object.keys(BASE_SCORES);
      const feedIsos = source.slice(0, 30);
      
      // Fetch images for RSS items if not already fetched
      const rssImages = { ...imageMap };
      if (params.images) {
        const missingIsos = feedIsos.filter(iso => !rssImages[iso]);
        if (missingIsos.length > 0) {
          const articles = missingIsos.map(iso => {
            const snap = safeCountrySnapshot(iso, store);
            return { iso, title: snap.live.headline || `${snap.name} Crisis`, countryName: snap.name };
          });
          const extra = await fetchImagesForArticles(articles);
          Object.assign(rssImages, extra);
        }
      }
      
      const f = buildRSSFeed(feedIsos, store, ranked, rssImages);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=120" });
      res.end(f);
      return;
    }

    if (params.live) {
      let source = liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked);
      if (!source || source.length === 0) source = ranked.length > 0 ? ranked : Object.keys(BASE_SCORES);
      const limit = Math.max(1, params.top || 25);
      const picked = source.slice(0, limit);
      const rankMap = new Map(picked.map((iso, i) => [iso, i + 1]));
      const feed = picked.map(iso => {
        const snap = safeCountrySnapshot(iso, store);
        return { rank: rankMap.get(iso) || 0, iso: snap.iso, name: snap.name, flag: snap.flag, live_score: snap.live.score, effective_score: snap.effective_score, tier: snap.live.tier, headline: snap.live.headline, signal_count: snap.live.signal_count, source_count: snap.live.source_count };
      });
      res.writeHead(200, { ...CORS, "Cache-Control": "public, s-maxage=120" });
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), feed: "live-breaking-news", version: "v20.5.0", count: feed.length }, live_news: feed }, null, 2));
      return;
    }

    if (params.breaking) {
      let source = liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked);
      if (!source || source.length === 0) source = ranked.length > 0 ? ranked : Object.keys(BASE_SCORES);
      const limit = Math.max(1, params.top || 20);
      const picked = source.slice(0, limit);
      const feed = picked.map(iso => {
        const snap = safeCountrySnapshot(iso, store);
        const topEvents = Array.isArray(snap.live.events) ? snap.live.events.slice(0, 3) : [];
        return { iso: snap.iso, name: snap.name, flag: snap.flag, live_score: snap.live.score, effective_score: snap.effective_score, tier: snap.live.tier, tier_label: snap.live.tier_label, headline: snap.live.headline, signal_count: snap.live.signal_count, source_count: snap.live.source_count, top_events: topEvents };
      });
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), mode: "breaking", version: "v20.5.0", total_with_live_events: liveEventsOnly.length, total_with_any_signals: breakingRanked.length, count: feed.length }, breaking: feed }, null, 2));
      return;
    }

    if (params.wst) {
      let source = liveEventsOnly.length ? liveEventsOnly : (breakingRanked.length ? breakingRanked : ranked);
      if (!source || source.length === 0) source = ranked.length > 0 ? ranked : Object.keys(BASE_SCORES);
      const limit = Math.max(1, params.top || 25);
      const feed = source.slice(0, limit).map(iso => {
        const snap = safeCountrySnapshot(iso, store);
        return { iso: snap.iso, name: snap.name, flag: snap.flag, score: snap.score, effective_score: snap.effective_score, live_score: snap.live.score, tier: snap.live.tier, headline: snap.live.headline };
      });
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), feed: "watchlist", version: "v20.5.0", count: feed.length }, watchlist: feed }, null, 2));
      return;
    }

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const snap = safeCountrySnapshot(iso, store);
      const c = snap.raw;
      const data = { iso, name: snap.name, score: snap.score, structural_score: snap.structural_score, effective_score: snap.effective_score, live_breaking: c.__live_breaking, evidence: c.evidence_ledger, dimensions: c.dims, primary_image: imageMap[iso] || null };
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${iso}.json"` });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const snap = safeCountrySnapshot(finalIsos[0], store);
      const img = imageMap[finalIsos[0]];
      let html = `<div style="padding:16px;background:#0f1a30;color:#fff;font-family:system-ui;max-width:320px;border-radius:12px;">`;
      if (img) {
        html += `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.caption)}" style="width:100%;border-radius:8px;margin-bottom:8px;" />`;
      }
      html += `<b>${snap.flag} ${snap.name}</b> — Score ${snap.score}/100 (${snap.live.tier_label})<br><small>${snap.live.headline || ""}</small></div>`;
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (params.format === "sitemap") {
      const settled = await Promise.allSettled(finalIsos.map(iso => buildPayload(iso, store, ranked, rankIndex, opts, imageMap[iso] || null)));
      const p = settled.filter(s => s.status === "fulfilled" && s.value).map(s => s.value);
      res.writeHead(200, { ...CORS, "Content-Type": "application/xml; charset=utf-8" });
      res.end(buildSitemap(p));
      return;
    }

    const settled = await Promise.allSettled(finalIsos.map(iso => buildPayload(iso, store, ranked, rankIndex, opts, imageMap[iso] || null)));
    let payloads = settled.filter(s => s.status === "fulfilled" && s.value).map(s => s.value);

    if (payloads.length === 0 && finalIsos.length > 0) {
      payloads = await Promise.all(finalIsos.slice(0, params.top).map(async iso => {
        try { return await buildPayload(iso, store, ranked, rankIndex, opts, imageMap[iso] || null); }
        catch { return null; }
      })).then(arr => arr.filter(Boolean));
    }
    if (payloads.length === 0) {
      const isos = Object.keys(BASE_SCORES).slice(0, Math.min(params.top, 10));
      payloads = isos.map(iso => {
        const snap = safeCountrySnapshot(iso, store);
        return {
          iso, name: snap.name, flag: snap.flag,
          score: snap.score, structural_score: snap.structural_score, effective_score: snap.effective_score,
          pop_multiplier: 1.0, resolution_credit: 0, is_low_instrumentation: false,
          severity: snap.severity, severity_emoji: snap.severity_emoji, severity_color: snap.severity_color,
          rank: 0, total_countries: isos.length, percentile: 0,
          slug: snap.slug, url: snap.url,
          primary_image: imageMap[iso] || null,
          evidence: { score: 0, confidence: 0, source_count: 0, sources: [], ledger: [] },
          live_breaking: { score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", headline: null, signal_count: 0, raw_signal_count: 0, distinct_event_count: 0, has_fresh_live_event: false, source_count: 0, sources: [], freshest_signal_age_hours: null, events: [], signals: [] },
          story_heat: { score: 0, tier: "BACKGROUND", top_drivers: [] },
          live_evidence: buildLiveEvidenceView(iso, store),
          live_evidence_sources: [], live_evidence_count: 0, is_live_data: false,
          dimensions: buildDimensionsCompat(snap.raw.dims || {}),
          crisis_types: buildCrisisTypesCompat(snap.raw.types || DEFAULT_T),
          needs: [],
          trend: { delta_7d: 0, direction: "stable", slope: 0, forecast_7d: snap.score, confidence: 0.3, history_source: "synthetic", history_points: 0 },
          anomaly: { detected: false, severity: "NONE", methods_fired: 0, z_score: 0 }, anomalyScore: 0,
          spillover: { value: 0, from: [] }, ml: null, sentiment: null,
          score_audit: { prior_score: snap.score, structural_score: snap.structural_score, live_breaking_score: 0, pop_multiplier: 1.0, resolution_credit: 0, effective_score: snap.effective_score, spillover: 0, final_score: snap.score, evidence_score: 0, evidence_confidence: 0 },
          recommendation: recommendation(snap.score, null),
          region: snap.region,
          fsi: { score: 50, rank: 999, band: "Unknown" },
        };
      });
    }

    const mode = isSingleIso ? "single" : (isoList.length >= 2 ? "comparison" : "list");
    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);
    const mlAcc = Number.isFinite(mlModel.performance.r2) ? mlModel.performance.r2 : 0;

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        ranking_mode: "DEFINITIVE_v20.5.0",
        version: "v20.5.0",
        countries_tracked: Object.keys(BASE_SCORES).length,
        countries_with_evidence: Object.keys(evidenceIndex.sourceCoverage).filter(iso => Object.keys(evidenceIndex.sourceCoverage[iso] || {}).length > 0).length,
        countries_with_images: Object.keys(imageMap).length,
        payloads_emitted: payloads.length,
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
          watchlist: "GET /api/top-story?format=wst",
          health: "GET /api/top-story?format=health",
        },
        enhancements: {
          machine_learning: {
            trained: !!mlModel.trained,
            training_count: mlModel.trainingCount || 0,
            performance: { accuracy: +mlAcc.toFixed(4) },
            accuracy: +mlAcc.toFixed(4),
          },
          fetcher_health: { live_count: fetcherHealth.liveCount(), failed_count: fetcherHealth.failedCount(), detail: fetcherHealth.summary() },
          new_in_v20_5_0: ["wikimedia_image_fetch_for_all_payloads", "rss_image_enclosure", "primary_image_in_json"],
          static_fallbacks: { water_stress_countries: Object.keys(AQUEDUCT_WATER_STRESS).length, ndvi_anomaly_countries: Object.keys(FAO_NDVI_ANOMALY).length },
          feed_safety: {
            version: "v20.5.0",
            hardened_paths: ["rss", "live", "breaking", "watchlist", "story"],
            list_endpoint_omits_heavy_enrichments: false,
            guarantees: ["never throws mid-render", "never emits empty <channel>", "never emits empty live_news[]", "never emits empty breaking[]", "never emits empty watchlist[]", "never emits empty countries[]", "primary image from Wikimedia Commons at article top"],
          },
          html_compat: { version: "v20.5.0", render_safety: { rank_filters_nonfinite: true, buildPayload_try_catch: true, handler_uses_allSettled: true, guaranteed_nonempty_countries: true, primary_image_at_top: true, images_for_all_payloads: true } },
        },
      },
      ...(mode === "single" ? { top_story: payloads[0] } : {}),
      ...(mode === "list" || mode === "comparison" ? { countries: payloads } : {}),
    };

    res.writeHead(200, { ...CORS, "Cache-Control": `public, s-maxage=${secsUntilNext}, stale-while-revalidate=30` });
    res.end(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("[top-story v20.5.0]", err);
    try {
      const isos = Object.keys(BASE_SCORES).slice(0, 5);
      const fallback = isos.map(iso => {
        const snap = safeCountrySnapshot(iso, {});
        return {
          iso, name: snap.name, flag: snap.flag,
          score: snap.score, structural_score: snap.structural_score, effective_score: snap.effective_score,
          pop_multiplier: 1.0, resolution_credit: 0, is_low_instrumentation: false,
          severity: snap.severity, severity_emoji: snap.severity_emoji, severity_color: snap.severity_color,
          rank: 0, total_countries: isos.length, percentile: 0,
          slug: snap.slug, url: snap.url,
          primary_image: null,
          evidence: { score: 0, confidence: 0, source_count: 0, sources: [], ledger: [] },
          live_breaking: { score: 0, tier: "BACKGROUND", tier_label: "Background", tier_icon: "⚪", headline: null, signal_count: 0, raw_signal_count: 0, distinct_event_count: 0, has_fresh_live_event: false, source_count: 0, sources: [], freshest_signal_age_hours: null, events: [], signals: [] },
          story_heat: { score: 0, tier: "BACKGROUND", top_drivers: [] },
          live_evidence: buildLiveEvidenceView(iso, {}),
          live_evidence_sources: [], live_evidence_count: 0, is_live_data: false,
          dimensions: {}, crisis_types: [], needs: [],
          trend: { delta_7d: 0, direction: "stable", slope: 0, forecast_7d: snap.score, confidence: 0.3, history_source: "synthetic", history_points: 0 },
          anomaly: { detected: false, severity: "NONE", methods_fired: 0, z_score: 0 }, anomalyScore: 0,
          spillover: { value: 0, from: [] }, ml: null, sentiment: null,
          score_audit: { prior_score: snap.score, structural_score: snap.structural_score, live_breaking_score: 0, pop_multiplier: 1.0, resolution_credit: 0, effective_score: snap.effective_score, spillover: 0, final_score: snap.score, evidence_score: 0, evidence_confidence: 0 },
          recommendation: { tier: "WATCH", text: "Routine monitoring." },
          region: snap.region,
          fsi: { score: 50, rank: 999, band: "Unknown" },
        };
      });
      res.writeHead(200, CORS);
      res.end(JSON.stringify({ meta: { generated_at: new Date().toISOString(), mode: "list", ranking_mode: "DEFINITIVE_v20.5.0-FALLBACK", version: "v20.5.0", payloads_emitted: fallback.length, error: err.message }, countries: fallback }, null, 2));
    } catch (fallbackErr) {
      res.writeHead(500, CORS);
      res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
    }
  }
}
