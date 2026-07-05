// ─── LIVE ADJUSTMENTS — FULLY AGGRESSIVE VERSION ────────────────────────────
function applyLiveAdjustments(priorDims, signals, iso, store) {
  const dims = { ...priorDims };
  const audit = [];
  let totalBoost = 0;

  // ── 1. USGS/EMSC Earthquakes ──────────────────────────────────────────────
  if (signals.quakeMag >= 4.5) {
    const boost = Math.min(30, Math.round((signals.quakeMag - 3.5) * 6));
    dims.displacement = clamp(dims.displacement + Math.ceil(boost * 0.6));
    dims.health = clamp(dims.health + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "USGS/EMSC", 
      field: "displacement+health", 
      delta: boost, 
      reason: `M${signals.quakeMag.toFixed(1)} earthquake`, 
      magnitude: signals.quakeMag 
    });
  }

  // ── 2. NASA EONET ─────────────────────────────────────────────────────────
  if (signals.nasaEventCount > 0) {
    const boost = Math.min(20, signals.nasaEventCount * 7);
    dims.climate = clamp(dims.climate + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "NASA EONET", 
      field: "climate+displacement", 
      delta: boost, 
      reason: `${signals.nasaEventCount} active NASA events` 
    });
  }

  // ── 3. GDACS Alerts ──────────────────────────────────────────────────────
  if (signals.gdacs) {
    const gdacsBoost = signals.gdacsAlert === "red" ? 20 : signals.gdacsAlert === "orange" ? 12 : 5;
    dims.displacement = clamp(dims.displacement + Math.ceil(gdacsBoost * 0.6));
    dims.health = clamp(dims.health + Math.floor(gdacsBoost * 0.4));
    dims.access = clamp(dims.access + Math.floor(gdacsBoost * 0.3));
    totalBoost += gdacsBoost;
    audit.push({ 
      source: "GDACS", 
      field: "displacement+health+access", 
      delta: gdacsBoost, 
      reason: `${signals.gdacsAlert?.toUpperCase()} alert active` 
    });
  }

  // ── 4. IFRC GO ────────────────────────────────────────────────────────────
  if (signals.ifrcCount > 0) {
    const boost = Math.min(18, signals.ifrcCount * 7);
    dims.access = clamp(dims.access + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "IFRC GO", 
      field: "access+displacement", 
      delta: boost, 
      reason: `${signals.ifrcCount} active IFRC operations` 
    });
  }

  // ── 5. Extreme Heat ──────────────────────────────────────────────────────
  if (signals.maxTempC >= 35) {
    const boost = Math.min(25, Math.round((signals.maxTempC - 28) * 2));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.7));
    dims.health = clamp(dims.health + Math.floor(boost * 0.5));
    dims.food = clamp(dims.food + Math.floor(boost * 0.3)); // Heat affects crops
    totalBoost += boost;
    audit.push({ 
      source: "Open-Meteo", 
      field: "climate+health+food", 
      delta: boost, 
      reason: `${signals.maxTempC}°C extreme heat` 
    });
  }

  // ── 6. Weather Hazards ──────────────────────────────────────────────────
  if (signals.hazards) {
    const h = signals.hazards;
    let hazardBoost = 0;
    const parts = [];
    
    if (h.flood_discharge > 100) { 
      hazardBoost += 8; 
      parts.push(`${h.flood_discharge.toFixed(0)}m³/s river discharge`); 
    }
    if (h.wind_speed > 30) { 
      hazardBoost += 6; 
      parts.push(`${h.wind_speed.toFixed(0)}km/h winds`); 
    }
    if (h.precip_total > 10) { 
      hazardBoost += 5; 
      parts.push(`${h.precip_total.toFixed(0)}mm precipitation`); 
    }
    if (h.uv_max > 8) { 
      hazardBoost += 4; 
      parts.push(`UV ${h.uv_max.toFixed(1)}`); 
    }
    if (h.cloud_avg > 70) { 
      hazardBoost += 3; 
      parts.push(`${h.cloud_avg.toFixed(0)}% cloud cover`); 
    }
    if (h.lightning_max > 100) { 
      hazardBoost += 5; 
      parts.push(`${h.lightning_max.toFixed(0)}J/kg lightning potential`); 
    }
    
    if (hazardBoost > 0) {
      dims.climate = clamp(dims.climate + hazardBoost);
      dims.displacement = clamp(dims.displacement + Math.floor(hazardBoost * 0.3));
      totalBoost += hazardBoost;
      audit.push({ 
        source: "Open-Meteo Hazards", 
        field: "climate+displacement", 
        delta: hazardBoost, 
        reason: parts.join(", ") 
      });
    }
  }

  // ── 7. Air Quality ──────────────────────────────────────────────────────
  if (signals.aq && signals.aq.pm25 >= 35) {
    const boost = Math.min(15, Math.round((signals.aq.pm25 - 25) / 8));
    if (boost > 0) {
      dims.health = clamp(dims.health + boost);
      totalBoost += boost;
      audit.push({ 
        source: "Open-Meteo AQ", 
        field: "health", 
        delta: boost, 
        reason: `PM2.5 ${signals.aq.pm25.toFixed(0)}µg/m³ in ${signals.aq.city}` 
      });
    }
  }

  // ── 8. COVID-19 ──────────────────────────────────────────────────────────
  if (signals.diseaseActive > 1000) {
    const m = signals.diseaseActive / 1000;
    const boost = Math.min(25, Math.round(Math.log10(m + 1) * 10));
    dims.health = clamp(dims.health + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "disease.sh", 
      field: "health+food", 
      delta: boost, 
      reason: `${signals.diseaseActive.toLocaleString()} active COVID-19 cases` 
    });
  }

  // ── 9. World Bank: Inflation ──────────────────────────────────────────
  if (signals.wbInflation && signals.wbInflation.value > 5) {
    const boost = Math.min(20, Math.round(signals.wbInflation.value / 3));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.4));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+food", 
      delta: boost, 
      reason: `Inflation ${signals.wbInflation.value.toFixed(1)}%` 
    });
  }

  // ── 10. World Bank: GDP Growth ─────────────────────────────────────────
  if (signals.wbGdpGrowth && signals.wbGdpGrowth.value < 0) {
    const boost = Math.min(18, Math.round(Math.abs(signals.wbGdpGrowth.value) * 2.5));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+political", 
      delta: boost, 
      reason: `GDP growth ${signals.wbGdpGrowth.value.toFixed(1)}% (contraction)` 
    });
  }

  // ── 11. World Bank: Unemployment ───────────────────────────────────────
  if (signals.wbUnemployment && signals.wbUnemployment.value > 10) {
    const boost = Math.min(15, Math.round(signals.wbUnemployment.value / 4));
    dims.economic = clamp(dims.economic + boost);
    dims.political = clamp(dims.political + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+political", 
      delta: boost, 
      reason: `Unemployment ${signals.wbUnemployment.value.toFixed(1)}%` 
    });
  }

  // ── 12. World Bank: Poverty ────────────────────────────────────────────
  if (signals.wbPoverty && signals.wbPoverty.value > 5) {
    const boost = Math.min(18, Math.round(signals.wbPoverty.value / 3));
    dims.economic = clamp(dims.economic + boost);
    dims.food = clamp(dims.food + Math.floor(boost * 0.5));
    totalBoost += boost;
    audit.push({ 
      source: "World Bank", 
      field: "economic+food", 
      delta: boost, 
      reason: `${signals.wbPoverty.value.toFixed(1)}% living in extreme poverty` 
    });
  }

  // ── 13. UNHCR Displacement ─────────────────────────────────────────────
  if (signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
    // AGGRESSIVE BOOSTS to match Ranking #1
    const boost = m >= 10 ? 45 
                : m >= 5 ? 35 
                : m >= 3 ? 28 
                : m >= 1.5 ? 20 
                : m >= 0.5 ? 12 
                : m >= 0.1 ? 6 
                : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      dims.political = clamp(dims.political + Math.floor(boost * 0.4));
      dims.economic = clamp(dims.economic + Math.floor(boost * 0.3));
      dims.access = clamp(dims.access + Math.floor(boost * 0.2));
      totalBoost += boost;
      audit.push({ 
        source: "UNHCR", 
        field: "displacement+political+economic+access", 
        delta: boost, 
        reason: `${m.toFixed(1)}M displaced — massive humanitarian crisis` 
      });
    }
  }

  // ── 14. UNHCR Emergency ─────────────────────────────────────────────────
  if (signals.unhcrEmergency) {
    const boost = signals.unhcrEmergency.level === "critical" ? 18 
                : signals.unhcrEmergency.level === "high" ? 12 
                : 6;
    dims.political = clamp(dims.political + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.6));
    totalBoost += boost;
    audit.push({ 
      source: "UNHCR Emergency", 
      field: "political+displacement", 
      delta: boost, 
      reason: `Active emergency: ${signals.unhcrEmergency.name} (${signals.unhcrEmergency.level})` 
    });
  }

  // ── 15. NOAA Alerts ─────────────────────────────────────────────────────
  if (signals.noaa) {
    const boost = Math.min(15, (signals.noaa.extreme_alerts + signals.noaa.storm_alerts) * 3);
    if (boost > 0) {
      dims.climate = clamp(dims.climate + boost);
      totalBoost += boost;
      audit.push({ 
        source: "NOAA", 
        field: "climate", 
        delta: boost, 
        reason: `${signals.noaa.extreme_alerts} extreme + ${signals.noaa.storm_alerts} severe storm alerts active` 
      });
    }
  }

  // ── 16. IPC Food Security ──────────────────────────────────────────────
  if (signals.ipcPhase && signals.ipcPhase >= 3) {
    const phaseBoosts = { 3: 20, 4: 35, 5: 50 };
    const boost = phaseBoosts[signals.ipcPhase] || 0;
    if (boost > 0) {
      dims.food = clamp(dims.food + boost);
      dims.health = clamp(dims.health + Math.floor(boost * 0.6));
      dims.economic = clamp(dims.economic + Math.floor(boost * 0.3));
      totalBoost += boost;
      audit.push({ 
        source: "IPC/FEWS NET", 
        field: "food+health+economic", 
        delta: boost, 
        reason: `IPC Phase ${signals.ipcPhase} food insecurity ${signals.ipcPhase >= 4 ? '— EMERGENCY' : ''}` 
      });
    }
  }

  // ── 17. ACLED Conflict ──────────────────────────────────────────────────
  if (signals.acledEvents && signals.acledEvents > 0) {
    const boost = Math.min(25, Math.round(signals.acledEvents * 0.8 + signals.acledFatalities * 0.05));
    if (boost > 0) {
      dims.conflict = clamp(dims.conflict + boost);
      dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.4));
      dims.political = clamp(dims.political + Math.floor(boost * 0.3));
      totalBoost += boost;
      audit.push({ 
        source: "ACLED", 
        field: "conflict+displacement+political", 
        delta: boost, 
        reason: `${signals.acledEvents} conflict events, ${signals.acledFatalities || 0} fatalities` 
      });
    }
  }

  // ── 18. UNHCR Statistics ──────────────────────────────────────────────
  if (signals.unhcrStats && signals.unhcrStats.refugees > 0) {
    const m = signals.unhcrStats.refugees / 1_000_000;
    const boost = m >= 5 ? 20 : m >= 2 ? 14 : m >= 0.5 ? 8 : m >= 0.1 ? 4 : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      totalBoost += boost;
      audit.push({ 
        source: "UNHCR Statistics", 
        field: "displacement", 
        delta: boost, 
        reason: `${m.toFixed(1)}M refugees (${signals.unhcrStats.year})` 
      });
    }
  }

  // ── 19. ML Anomaly Boost ──────────────────────────────────────────────
  if (CFG.ML_ENABLED && store) {
    const mlForecast = mlEnhancedForecast(iso, clamp(composite(dims)), store);
    if (mlForecast.anomaly_probability > 0.6) {
      const mlBoost = Math.round(mlForecast.anomaly_probability * 12);
      dims.political = clamp(dims.political + Math.floor(mlBoost * 0.4));
      dims.economic = clamp(dims.economic + Math.floor(mlBoost * 0.3));
      dims.conflict = clamp(dims.conflict + Math.floor(mlBoost * 0.2));
      totalBoost += mlBoost;
      audit.push({ 
        source: "ML Anomaly", 
        field: "political+economic+conflict", 
        delta: mlBoost, 
        reason: `ML anomaly probability ${(mlForecast.anomaly_probability * 100).toFixed(0)}%` 
      });
    }
  }

  // ── 20. World Bank Refugees ─────────────────────────────────────────────
  if (signals.wbRefugees && signals.wbRefugees.value > 1000) {
    const m = signals.wbRefugees.value / 1_000_000;
    const boost = m >= 2 ? 15 : m >= 0.5 ? 10 : m >= 0.1 ? 5 : 0;
    if (boost > 0) {
      dims.displacement = clamp(dims.displacement + boost);
      totalBoost += boost;
      audit.push({ 
        source: "World Bank Refugees", 
        field: "displacement", 
        delta: boost, 
        reason: `${m.toFixed(1)}M refugees (WB cross-check)` 
      });
    }
  }

  // ── LOG THE TOTAL BOOST ──────────────────────────────────────────────
  if (totalBoost > 0) {
    console.log(`📈 ${iso} live boost: +${totalBoost} (${audit.length} sources)`);
  }

  return { dims, score: clamp(composite(dims)), audit };
}
