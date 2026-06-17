const API_ENDPOINTS = {
  // ── SEISMIC ──────────────────────────────────────────────────────────────
  usgs_weekly: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
  usgs_significant: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson',
  emsc: 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=40&minmagnitude=4.5&orderby=time',
  
  // ── NATURAL EVENTS ──────────────────────────────────────────────────────
  nasa: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50',
  reliefweb_disasters: 'https://api.reliefweb.int/v1/disasters?appname=gcis-fusion&limit=30&sort[]=date:desc&fields[include][]=name&fields[include][]=country&fields[include][]=date&fields[include][]=type&fields[include][]=status',
  reliefweb_reports: 'https://api.reliefweb.int/v1/reports?appname=gcis-fusion&limit=25&sort[]=date:desc&fields[include][]=title&fields[include][]=country&fields[include][]=date&fields[include][]=format',
  gdacs: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=&eventtype=&fromDate=&toDate=&alertscore=&country=&limit=25',
  
  // ── FIRES ────────────────────────────────────────────────────────────────
  firms: '/api/proxy?source=firms',
  gfw: 'https://data-api.globalforestwatch.org/v1/forest-change/status',
  
  // ── WEATHER ──────────────────────────────────────────────────────────────
  noaa: 'https://api.weather.gov/alerts/active?status=actual&message_type=alert&severity=Extreme,Severe&limit=20',
  openmeteo: null,
  openweathermap: 'https://api.openweathermap.org/data/2.5/weather?q=London&appid=bd5e378503939ddaee76f12ad7a97608',
  
  // ── CONFLICT ─────────────────────────────────────────────────────────────
  acled: 'https://api.acleddata.com/acled/read?terms=accept&limit=50&event_date=2024-01-01&event_date_where=>',
  gdelt: '/api/proxy?source=gdelt',
  
  // ── HEALTH ───────────────────────────────────────────────────────────────
  who_news: 'https://www.who.int/api/news/emergencies?sf_culture=en',
  who_rss: 'https://www.who.int/rss-feeds/news-english.xml',
  opendisease: 'https://api.opendiseasedata.org/v1/outbreaks?limit=50',
  
  // ── FOOD SECURITY ──────────────────────────────────────────────────────
  ipc_current: '/api/proxy?source=ipc',
  ipc_population: '/api/proxy?source=ipc_populations',
  fewsnet: '/api/proxy?source=fews',
  wfp_vam: '/api/proxy?source=wfp',
  fao_giews: '/api/proxy?source=fao',
  
  // ── ECONOMIC ─────────────────────────────────────────────────────────────
  wb_gdp: 'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&per_page=300&mrv=1',
  wb_nutrition: 'https://api.worldbank.org/v2/country/all/indicator/SN.ITK.DEFC.ZS?format=json&per_page=300&mrv=1',
  wb_homicide: 'https://api.worldbank.org/v2/country/all/indicator/VC.IHR.PSRC.P5?format=json&per_page=300&mrv=3',
  wb_refugees: 'https://api.worldbank.org/v2/country/all/indicator/SM.POP.REFG?format=json&per_page=300&mrv=1',
  imf_gdp: '/api/proxy?source=imf_ngdp',
  imf_inflation: '/api/proxy?source=imf_pcpi',
  
  // ── DISPLACEMENT ────────────────────────────────────────────────────────
  unhcr: '/api/proxy?source=unhcr',
  
  // ── AIR QUALITY ─────────────────────────────────────────────────────────
  openaq: '/api/proxy?source=openaq',
};
