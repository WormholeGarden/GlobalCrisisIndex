// /api/proxy.js
// Unified proxy for Global Crisis Index — fetches external APIs, bypasses CORS
// Supports all data sources used in the frontend API_ENDPOINTS

const API_CONFIG = {
  // ── SEISMIC ──────────────────────────────────────────────────────────────
  // USGS endpoints are called directly from the frontend, no proxy needed.
  // (Kept here for reference if needed in the future)

  // ── NASA EONET ──────────────────────────────────────────────────────────
  nasa: {
    base: 'https://eonet.gsfc.nasa.gov/api/v3/events',
    buildUrl: (params) => {
      const status = params.status || 'open';
      const limit = params.limit || '50';
      return `https://eonet.gsfc.nasa.gov/api/v3/events?status=${status}&limit=${limit}`;
    },
    headers: { 'Accept': 'application/json' }
  },

  // ── RELIEFWEB ───────────────────────────────────────────────────────────
  // Using v2 to fix the 410 Gone errors from v1
  reliefweb_disasters: {
    base: 'https://api.reliefweb.int/v2/disasters',
    buildUrl: (params) => {
      const appname = params.appname || 'gcis-fusion';
      const limit = params.limit || '30';
      const sort = params.sort || 'date:desc';
      // Note: This builds a URL that matches the original v1 fields but uses v2 endpoint
      return `https://api.reliefweb.int/v2/disasters?appname=${appname}&limit=${limit}&sort[]=${sort}&fields[include][]=name&fields[include][]=country&fields[include][]=date&fields[include][]=type&fields[include][]=status`;
    },
    headers: { 'Accept': 'application/json' }
  },
  reliefweb_reports: {
    base: 'https://api.reliefweb.int/v2/reports',
    buildUrl: (params) => {
      const appname = params.appname || 'gcis-fusion';
      const limit = params.limit || '25';
      const sort = params.sort || 'date:desc';
      return `https://api.reliefweb.int/v2/reports?appname=${appname}&limit=${limit}&sort[]=${sort}&fields[include][]=title&fields[include][]=country&fields[include][]=date&fields[include][]=format`;
    },
    headers: { 'Accept': 'application/json' }
  },

  // ── GFW (Global Forest Watch) ──────────────────────────────────────────
  gfw: {
    base: 'https://data-api.globalforestwatch.org/v1/forest-change/status',
    headers: { 'Accept': 'application/json' }
  },

  // ── FIRMS (NASA Fires) ──────────────────────────────────────────────────
  firms: {
    base: 'https://firms.modaps.eosdis.nasa.gov/api/country/csv/7d/ALL/1',
    headers: { 'Accept': 'text/csv' }
  },

  // ── CONFLICT ─────────────────────────────────────────────────────────────
  acled: {
    base: 'https://api.acleddata.com/acled/read',
    buildUrl: (params) => {
      const terms = params.terms || 'accept';
      const limit = params.limit || '50';
      const eventDate = params.event_date || '2024-01-01';
      return `https://api.acleddata.com/acled/read?terms=${terms}&limit=${limit}&event_date=${eventDate}&event_date_where=>`;
    },
    headers: { 'Accept': 'application/json' }
  },
  gdelt: {
    base: 'https://api.gdeltproject.org/api/v2/geo/geo',
    buildUrl: (params) => {
      const query = params.query || 'conflict crisis humanitarian emergency disaster';
      const mode = params.mode || 'pointdata';
      const maxrows = params.maxrows || '300';
      const format = params.format || 'GeoJSON';
      const timespan = params.TIMESPAN || '7d';
      return `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&mode=${mode}&maxrows=${maxrows}&format=${format}&TIMESPAN=${timespan}`;
    },
    headers: { 'Accept': 'application/json' }
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  opendisease: {
    base: 'https://api.opendiseasedata.org/v1/outbreaks',
    buildUrl: (params) => {
      const limit = params.limit || '50';
      return `https://api.opendiseasedata.org/v1/outbreaks?limit=${limit}`;
    },
    headers: { 'Accept': 'application/json' }
  },

  // ── FOOD SECURITY ──────────────────────────────────────────────────────
  ipc: {
    base: 'https://api.ipcinfo.org/v1/classifications/latest',
    headers: { 'Accept': 'application/json' }
  },
  ipc_populations: {
    base: 'https://api.ipcinfo.org/v1/populations/latest',
    headers: { 'Accept': 'application/json' }
  },
  fews: {
    base: 'https://fews.net/api/alert.json',
    headers: { 'Accept': 'application/json' }
  },
  wfp: {
    base: 'https://api.vam.wfp.org/v1/food-security/indicators/latest',
    headers: { 'Accept': 'application/json' }
  },
  fao: {
    // Note: This endpoint may still be broken. If it continues to fail, check for a new URL.
    base: 'https://api.fao.org/giews/country-alerts/latest',
    headers: { 'Accept': 'application/json' }
  },

  // ── ECONOMIC ─────────────────────────────────────────────────────────────
  imf_ngdp: {
    base: 'https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH',
    headers: { 'Accept': 'application/json' }
  },
  imf_pcpi: {
    base: 'https://www.imf.org/external/datamapper/api/v1/PCPIPCH',
    headers: { 'Accept': 'application/json' }
  },

  // ── DISPLACEMENT ────────────────────────────────────────────────────────
  unhcr: {
    base: 'https://api.unhcr.org/refugee-statistics/v1/population',
    buildUrl: (params) => {
      const year = params.year || '2025';
      return `https://api.unhcr.org/refugee-statistics/v1/population?year=${year}`;
    },
    headers: { 'Accept': 'application/json' }
  },

  // ── AIR QUALITY ─────────────────────────────────────────────────────────
  openaq: {
    base: 'https://api.openaq.org/v2/countries',
    buildUrl: (params) => {
      const limit = params.limit || '200';
      const page = params.page || '1';
      return `https://api.openaq.org/v2/countries?limit=${limit}&page=${page}`;
    },
    headers: { 'Accept': 'application/json' }
  }
};

export default async function handler(req, res) {
  // ── ENABLE CORS for your frontend ────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ── PARSE REQUEST ────────────────────────────────────────────────────
  const { source, ...queryParams } = req.query;

  if (!source) {
    return res.status(400).json({
      error: 'Missing "source" parameter',
      available: Object.keys(API_CONFIG)
    });
  }

  const config = API_CONFIG[source];
  if (!config) {
    return res.status(400).json({
      error: `Unknown source: "${source}"`,
      available: Object.keys(API_CONFIG)
    });
  }

  let url;

  try {
    // ── BUILD URL ──────────────────────────────────────────────────────
    if (config.buildUrl) {
      url = config.buildUrl(queryParams);
    } else {
      url = config.base;
      const params = new URLSearchParams(queryParams);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    console.log(`[Proxy] Fetching ${source}: ${url}`);

    // ── FETCH ──────────────────────────────────────────────────────────
    const response = await fetch(url, {
      headers: config.headers || { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000) // 15-second timeout
    });

    if (!response.ok) {
      console.error(`[Proxy] ${source} error: ${response.status}`);
      return res.status(response.status).json({
        error: `External API returned ${response.status}`,
        source,
        url
      });
    }

    // ── HANDLE RESPONSE ──────────────────────────────────────────────
    const contentType = response.headers.get('content-type') || '';
    const textData = await response.text();

    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(textData);
        return res.status(200).json(jsonData);
      } catch (parseError) {
        // If JSON parsing fails, return raw text
        return res.status(200).send(textData);
      }
    } else {
      return res.status(200).send(textData);
    }
  } catch (error) {
    console.error(`[Proxy] Error fetching ${source}:`, error);

    // ── HANDLE TIMEOUT SPECIFICALLY ────────────────────────────────
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({
        error: `Timeout fetching ${source}`,
        source,
        message: 'The external API took too long to respond'
      });
    }

    return res.status(500).json({
      error: `Failed to fetch ${source}`,
      message: error.message,
      source,
      url
    });
  }
}
