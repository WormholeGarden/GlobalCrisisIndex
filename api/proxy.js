// /api/proxy.js
// Final working version — handles all sources correctly

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { source, ...queryParams } = req.query;

  // ── CONFIGURATION FOR EACH SOURCE ────────────────────────────────────────
  const configs = {
    // ── RELIEFWEB ──────────────────────────────────────────────────────────
    // FIXED: No Accept header — avoids 406 Not Acceptable
    reliefweb_disasters: {
      url: 'https://api.reliefweb.int/v2/disasters?appname=gcis-fusion&limit=30&sort[]=date:desc&fields[include][]=name&fields[include][]=country&fields[include][]=date&fields[include][]=type&fields[include][]=status',
    },
    reliefweb_reports: {
      url: 'https://api.reliefweb.int/v2/reports?appname=gcis-fusion&limit=25&sort[]=date:desc&fields[include][]=title&fields[include][]=country&fields[include][]=date&fields[include][]=format',
    },

    // ── GDELT ──────────────────────────────────────────────────────────────
    // FIXED: Proper URL encoding
    gdelt: {
      url: `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent('conflict crisis humanitarian emergency disaster')}&mode=pointdata&maxrows=300&format=GeoJSON&TIMESPAN=7d`,
      headers: { 'Accept': 'application/json' }
    },

    // ── UNHCR ──────────────────────────────────────────────────────────────
    unhcr: {
      url: `https://api.unhcr.org/refugee-statistics/v1/population?year=${queryParams.year || '2025'}`,
      headers: { 'Accept': 'application/json' }
    }
  };

  // ── VALIDATE SOURCE ──────────────────────────────────────────────────────
  if (!source) {
    return res.status(400).json({ error: 'Missing "source" parameter', available: Object.keys(configs) });
  }

  const config = configs[source];
  if (!config) {
    return res.status(400).json({ error: `Unknown source: "${source}"`, available: Object.keys(configs) });
  }

  try {
    const url = config.url;
    console.log(`[Proxy] Fetching ${source}: ${url}`);

    const response = await fetch(url, {
      headers: config.headers || {},
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error(`[Proxy] ${source} error: ${response.status}`);
      return res.status(response.status).json({
        error: `External API returned ${response.status}`,
        source,
        url
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const textData = await response.text();

    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(textData);
        return res.status(200).json(jsonData);
      } catch {
        return res.status(200).send(textData);
      }
    } else {
      return res.status(200).send(textData);
    }
  } catch (error) {
    console.error(`[Proxy] Error fetching ${source}:`, error);
    return res.status(500).json({
      error: `Failed to fetch ${source}`,
      message: error.message,
      source
    });
  }
}
