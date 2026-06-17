// /api/proxy.js
// Unified proxy for Global Crisis Index — fetches external APIs, bypasses CORS

const API_CONFIG = {
  // ── IPC (Integrated Food Security Phase Classification) ────────────────
  ipc: {
    base: 'https://api.ipcinfo.org/v1/classifications/latest',
    headers: { 'Accept': 'application/json' }
  },
  ipc_populations: {
    base: 'https://api.ipcinfo.org/v1/populations/latest',
    headers: { 'Accept': 'application/json' }
  },

  // ── FEWS NET (Famine Early Warning Systems Network) ─────────────────────
  fews: {
    base: 'https://fews.net/api/alert.json',
    headers: { 'Accept': 'application/json' }
  },

  // ── GDELT (Global Database of Events, Language, and Tone) ─────────────
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

  // ── IMF (International Monetary Fund) ──────────────────────────────────
  imf_ngdp: {
    base: 'https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH',
    headers: { 'Accept': 'application/json' }
  },
  imf_pcpi: {
    base: 'https://www.imf.org/external/datamapper/api/v1/PCPIPCH',
    headers: { 'Accept': 'application/json' }
  },

  // ── WFP (World Food Programme) ─────────────────────────────────────────
  wfp: {
    base: 'https://api.vam.wfp.org/v1/food-security/indicators/latest',
    headers: { 'Accept': 'application/json' }
  },

  // ── UNHCR (UN Refugee Agency) ──────────────────────────────────────────
  unhcr: {
    base: 'https://api.unhcr.org/population/v1/displacement-situations',
    buildUrl: (params) => {
      const limit = params.limit || '50';
      return `https://api.unhcr.org/population/v1/displacement-situations?limit=${limit}`;
    },
    headers: { 'Accept': 'application/json' }
  },

  // ── FAO (Food and Agriculture Organization) ────────────────────────────
  // Note: The FAO GIEWS API endpoint may require an API key or may have changed.
  // If this continues to fail, check the FAO Developer Portal for the current URL.
  fao: {
    base: 'https://api.fao.org/giews/alerts/latest',
    headers: { 'Accept': 'application/json' }
  },

  // ── NASA FIRMS (Fire Information for Resource Management System) ──────
  firms: {
    base: 'https://firms.modaps.eosdis.nasa.gov/api/country/csv/7d/ALL/1',
    headers: { 'Accept': 'text/csv' }
  },

  // ── OpenAQ (Air Quality) ──────────────────────────────────────────────
  openaq: {
    base: 'https://api.openaq.org/v2/countries',
    buildUrl: (params) => {
      const limit = params.limit || '200';
      const page = params.page || '1';
      return `https://api.openaq.org/v2/countries?limit=${limit}&page=${page}`;
    },
    headers: { 'Accept': 'application/json' }
  },

  // ── World Bank (fallback for any WB endpoints) ─────────────────────────
  wb: {
    base: 'https://api.worldbank.org/v2/country/all/indicator/',
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
