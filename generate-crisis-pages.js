function generateCrisisPageHTML(iso, countryName, crisisCode, crisisInfo) {
  const slug = toSlug(countryName, crisisInfo.label);
  const keywords = CRISIS_KEYWORDS[crisisCode] || [crisisInfo.label.toLowerCase()];
  const primaryKeyword = `${countryName} ${crisisInfo.label.toLowerCase()}`;
  const allKeywords = [
    primaryKeyword,
    `${countryName} ${keywords[0]}`,
    `${countryName} crisis ${new Date().getFullYear()}`,
    `${countryName} humanitarian ${keywords[0]}`,
    ...keywords.map(k => `${countryName} ${k}`),
    `${keywords[0]} ${countryName}`,
    `live ${primaryKeyword} data`,
    `${primaryKeyword} map`,
    `${primaryKeyword} relief`,
    `${primaryKeyword} update`,
  ].join(', ');

  const description = `Live real-time data on the ${countryName} ${crisisInfo.label.toLowerCase()} crisis. Track severity scores, affected populations, humanitarian needs and donate to verified relief organizations. Updated from 40+ live APIs.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${countryName} ${crisisInfo.label} Crisis ${new Date().getFullYear()} | Live Data | Global Crisis Index</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${allKeywords}">
  <link rel="canonical" href="https://globalcrisisindex.com/crisis/${slug}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${crisisInfo.icon} ${countryName} ${crisisInfo.label} Crisis — Live Severity Score">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://globalcrisisindex.com/crisis/${slug}">
  <meta property="og:site_name" content="Global Crisis Index">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${crisisInfo.icon} ${countryName} ${crisisInfo.label} | Live Crisis Data">
  <meta name="twitter:description" content="${description}">

  <!-- Redirect to app with crisis pre-selected (RELATIVE URL - works on any domain) -->
  <meta http-equiv="refresh" content="0; url=/?country=${iso}&crisis=${crisisCode}">

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${countryName} ${crisisInfo.label} Crisis — Live Severity Tracking",
    "description": "${description}",
    "url": "https://globalcrisisindex.com/crisis/${slug}",
    "dateModified": "${new Date().toISOString()}",
    "publisher": {
      "@type": "Organization",
      "name": "Global Crisis Index",
      "url": "https://globalcrisisindex.com"
    },
    "about": {
      "@type": "Event",
      "name": "${countryName} ${crisisInfo.label}",
      "location": {
        "@type": "Country",
        "name": "${countryName}"
      },
      "eventStatus": "https://schema.org/EventScheduled"
    },
    "keywords": "${allKeywords}"
  }
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #030b18;
      color: #ddeeff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: clamp(22px, 5vw, 36px); font-weight: 900; margin-bottom: 10px; color: #fff; }
    .badge {
      display: inline-block;
      background: rgba(255,55,95,.15);
      border: 1px solid rgba(255,55,95,.35);
      color: #ff375f;
      border-radius: 40px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    p { color: #6a9ec0; font-size: 15px; line-height: 1.6; max-width: 520px; margin-bottom: 24px; }
    .spinner {
      width: 36px; height: 36px;
      border: 2px solid rgba(0,200,255,.1);
      border-top-color: #00c8ff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .redirect-note { font-size: 12px; color: #2e5878; }
    a { color: #00c8ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <!-- SEO-readable content (crawled before JS redirect) -->
  <noscript>
    <h2>${crisisInfo.icon} ${countryName} ${crisisInfo.label} Crisis</h2>
    <p>${description}</p>
    <p><a href="/?country=${iso}&crisis=${crisisCode}">View live crisis data →</a></p>
  </noscript>

  <!-- Visible while redirecting -->
  <div class="icon">${crisisInfo.icon}</div>
  <div class="badge">LIVE CRISIS DATA</div>
  <h1>${countryName} ${crisisInfo.label}</h1>
  <p>${description}</p>
  <div class="spinner"></div>
  <p class="redirect-note">Loading live data from 40+ APIs…<br>
    <a href="/?country=${iso}&crisis=${crisisCode}">Click here if not redirected</a>
  </p>
</body>
</html>`;
}
