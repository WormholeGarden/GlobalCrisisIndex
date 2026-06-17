// /api/proxy.js
// A unified proxy to fetch data from multiple external APIs, bypassing CORS.
// Usage: /api/proxy?source=fews&endpoint=alerts

// Define the configuration for each external API source
const API_CONFIG = {
  ipc: {
    base: 'https://api.ipcinfo.org/v1/classifications/latest',
  },
  fews: {
    base: 'https://fews.net/api/alert.json',
  },
  gdelt: {
    base: 'https://api.gdeltproject.org/api/v2/geo/geo',
  },
  imf_ngdp: {
    base: 'https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH',
  },
  imf_pcpi: {
    base: 'https://www.imf.org/external/datamapper/api/v1/PCPIPCH',
  },
  wfp: {
    base: 'https://api.vam.wfp.org/v1/food-security/indicators/latest',
  },
  unhcr: {
    base: 'https://api.unhcr.org/population/v1/displacement-situations',
  },
  ipc_populations: {
    base: 'https://api.ipcinfo.org/v1/populations/latest',
  },
  firms: {
    base: 'https://firms.modaps.eosdis.nasa.gov/api/country/csv/7d/ALL/1',
  },
  fao: {
    base: 'https://api.fao.org/giews/country-alerts/latest',
  },
  openaq: {
    base: 'https://api.openaq.org/v2/countries',
  },
  // Add more sources here as needed
};

export default async function handler(req, res) {
  // 1. Enable CORS for your own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Get the source and any additional parameters from the query string
  const { source, ...queryParams } = req.query;

  // 3. Validate the source
  if (!source || !API_CONFIG[source]) {
    return res.status(400).json({ error: 'Invalid or missing "source" parameter.' });
  }

  const config = API_CONFIG[source];
  let url = config.base;

  // 4. Build the final URL with query parameters
  // For sources like GDELT, we need to add its specific query parameters
  if (source === 'gdelt') {
    const gdeltParams = new URLSearchParams({
      query: 'conflict crisis humanitarian emergency disaster',
      mode: 'pointdata',
      maxrows: '300',
      format: 'GeoJSON',
      TIMESPAN: '7d',
      ...queryParams // Allow overriding defaults
    });
    url = `${config.base}?${gdeltParams.toString()}`;
  } else if (source === 'openaq') {
    const openaqParams = new URLSearchParams({
      limit: '200',
      page: '1',
      ...queryParams
    });
    url = `${config.base}?${openaqParams.toString()}`;
  } else {
    // For most APIs, just append any provided query parameters
    const params = new URLSearchParams(queryParams);
    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }
  }

  try {
    // 5. Fetch the data from the external API
    console.log(`[Proxy] Fetching from ${source}: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Proxy] ${source} responded with ${response.status}`);
      return res.status(response.status).json({
        error: `External API responded with status ${response.status}`,
        source: source,
      });
    }

    // 6. Return the data, preserving the content type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(200).json(data);
    } else if (source === 'firms') {
      // NASA FIRMS returns CSV data. Return as text.
      const data = await response.text();
      res.status(200).send(data);
    } else {
      // Fallback for other data types (e.g., CSV, XML)
      const data = await response.text();
      res.status(200).send(data);
    }
  } catch (error) {
    console.error(`[Proxy] Error fetching from ${source}:`, error);
    res.status(500).json({
      error: `Failed to fetch data from ${source}`,
      message: error.message,
    });
  }
}
