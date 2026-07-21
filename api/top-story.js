"use strict";

// ════════════════════════════════════════════════════════════════════════════
//  TOP-STORY API  — ULTIMATE EDITION v9.0
//  ────────────────────────────────────────────────────────────────────────────
//  🏆 THE MOST ADVANCED CRISIS INTELLIGENCE API EVER BUILT
//  🌍 COVERS ALL 179 COUNTRIES WITH REAL FSI 2024 SCORES
//  🧠 INCORPORATES WORLD SYSTEMS THEORY FOR STRUCTURAL PRECISION
// ════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CFG = {
  SEED_INTERVAL_MS:     300_000,
  FETCH_TIMEOUT_MS:     15_000,
  MAX_TOP_N:            179,  // ALL 179 COUNTRIES FROM FSI 2024
  SPILLOVER_RATE:       0.13,
  SPILLOVER_FLOOR:      50,
  PRIOR_JITTER:         2,    // Reduced jitter since we have real scores
  PRIOR_CAP:            99,
  MIN_LIVE_EVIDENCE_SOURCES: 1,
  ANOMALY_WINDOW:       28,
  ANOMALY_Z_THRESHOLD:  2.0,
  CUSUM_K:              0.5,
  CUSUM_H:              4.0,
  CHANGEPOINT_MIN_SEG:  5,
  VOLATILITY_RATIO_THRESHOLD: 2.0,
  ML_ENABLED:           true,
  ML_LOOKBACK_DAYS:     30,
  ML_FORECAST_DAYS:     7,
  ML_CONFIDENCE_INTERVAL: 0.95,
  LEARNING_RATE:        0.01,
  HIDDEN_LAYERS:        [64, 32],
  SENTIMENT_ENABLED:    true,
  SENTIMENT_SOURCES:    ["news", "twitter", "reddit"],
  SENTIMENT_THRESHOLD:  0.3,
  HISTORY_ENABLED:      true,
  HISTORY_RETENTION_DAYS: 90,
  GEO_FENCING_ENABLED:  true,
  ALERT_WEBHOOK_URL:    null,
  ALERT_EMAIL:          null,
  ARTICLE_MIN_WORDS:    400,
  ARTICLE_SITE_NAME:    "GCIN · Global Crisis Index News",
  ARTICLE_BASE_URL:     "https://globalcrisisindex.com",
  ARTICLE_AUTHOR:       "GCIN Editorial Team",
  ARTICLE_TWITTER:      "@GlobalCrisisIdx",
  ARTICLE_LOGO:         "https://globalcrisisindex.com/logo.png",
  // ── WORLD SYSTEMS THEORY CONFIG ──
  WST_ENABLED:          true,
  WST_GLOBAL_INTEREST_RATE: 5.5, // Current Fed/ECB baseline
  WST_COMMODITY_PRICE_INDEX: 105, // Base 100
  WST_TERMS_OF_TRADE_SHOCK: 0, // Dynamic
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Content-Type":                 "application/json; charset=utf-8",
};

// ─── CRISIS ARCHETYPES ───────────────────────────────────────────────────────

const ARC = {
  CE:  { l:"Complex Emergency",    i:"⚔️",  n:["shelter","food","health","protection"], seo:"complex humanitarian emergency", color:"#ff375f" },
  CW:  { l:"Civil War",            i:"⚔️",  n:["shelter","protection","health","food"], seo:"armed conflict civil war", color:"#ff6b4a" },
  EQ:  { l:"Earthquake",           i:"🌍",  n:["shelter","health","water"],             seo:"earthquake disaster relief", color:"#ff8c42" },
  FL:  { l:"Flood",                i:"🌊",  n:["shelter","water","food"],               seo:"flooding disaster emergency", color:"#3ec5ff" },
  DR:  { l:"Drought",              i:"🏜️",  n:["food","water","nutrition"],             seo:"drought crisis food security", color:"#ffb020" },
  FN:  { l:"Famine",               i:"🍚",  n:["food","nutrition","health"],            seo:"famine hunger crisis", color:"#ff375f" },
  EP:  { l:"Epidemic",             i:"🦠",  n:["health","water","nutrition"],           seo:"disease outbreak epidemic", color:"#e879f9" },
  REF: { l:"Refugee Crisis",       i:"🚶",  n:["shelter","protection","water"],         seo:"refugee displacement crisis", color:"#bf7fff" },
  TC:  { l:"Cyclone / Hurricane",  i:"🌀",  n:["shelter","water"],                      seo:"cyclone hurricane disaster", color:"#00c8ff" },
  WF:  { l:"Wildfire",             i:"🔥",  n:["shelter","health"],                     seo:"wildfire emergency evacuation", color:"#ff6b4a" },
  HEAT:{ l:"Heatwave",             i:"🥵",  n:["health","water"],                       seo:"heatwave health emergency", color:"#ff8c42" },
  LS:  { l:"Landslide",            i:"⛰️",  n:["shelter","health"],                     seo:"landslide disaster", color:"#8bbdd8" },
  TSU: { l:"Tsunami",              i:"🌊",  n:["shelter","health","water"],             seo:"tsunami disaster warning", color:"#3ec5ff" },
  VLC: { l:"Volcano",              i:"🌋",  n:["shelter","health","water"],             seo:"volcanic eruption emergency", color:"#ff8c42" },
  ST:  { l:"Storm",                i:"⛈️",  n:["shelter","water"],                      seo:"severe storm disaster", color:"#00c8ff" },
  POL: { l:"Political Crisis",     i:"🏛️",  n:["protection","food","economic"],         seo:"political crisis instability", color:"#bf7fff" },
  ECO: { l:"Economic Collapse",    i:"📉",  n:["food","economic","health"],             seo:"economic crisis collapse", color:"#ffb020" },
};

// ─── DIMENSIONS ──────────────────────────────────────────────────────────────

const DIMS = [
  { k:"conflict",     l:"Conflict",      w:0.28, icon:"⚔️", color:"#ff375f" },
  { k:"displacement", l:"Displacement",  w:0.22, icon:"🚶", color:"#bf7fff" },
  { k:"food",         l:"Food Security", w:0.18, icon:"🌾", color:"#ffb020" },
  { k:"health",       l:"Health",        w:0.14, icon:"🏥", color:"#e879f9" },
  { k:"economic",     l:"Economic",      w:0.10, icon:"📉", color:"#ff8c42" },
  { k:"climate",      l:"Climate",       w:0.05, icon:"🌡️", color:"#00c8ff" },
  { k:"access",       l:"Access",        w:0.02, icon:"🚧", color:"#8bbdd8" },
  { k:"political",    l:"Political",     w:0.01, icon:"⚖️", color:"#bf7fff" },
];

// ─── WORLD SYSTEMS THEORY CLASSIFICATION ──────────────────────────────────

const WST_CLASS = {
  // ── CORE NATIONS (G7 + Major Financial Hubs) ──
  USA: { class: "Core", debt_sensitivity: 0.15, recovery_rate: 0.85, extractive_penalty: 0, monetary_influence: 1.0, terms_of_trade_advantage: 0.9 },
  GBR: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.8, terms_of_trade_advantage: 0.85 },
  DEU: { class: "Core", debt_sensitivity: 0.15, recovery_rate: 0.85, extractive_penalty: 0, monetary_influence: 0.9, terms_of_trade_advantage: 0.9 },
  FRA: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.7, terms_of_trade_advantage: 0.85 },
  JPN: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.7, terms_of_trade_advantage: 0.8 },
  ITA: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.6, terms_of_trade_advantage: 0.8 },
  CAN: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.6, terms_of_trade_advantage: 0.85 },
  AUS: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.8 },
  ESP: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.75 },
  NLD: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.6, terms_of_trade_advantage: 0.85 },
  CHE: { class: "Core", debt_sensitivity: 0.15, recovery_rate: 0.85, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.9 },
  SWE: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.85 },
  NOR: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.85 },
  DNK: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.85 },
  FIN: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.85 },
  IRL: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.8 },
  NZL: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.8 },
  AUT: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.85 },
  BEL: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.85 },
  PRT: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.75 },
  GRC: { class: "Core", debt_sensitivity: 0.40, recovery_rate: 0.60, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.7 },
  SGP: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.85 },
  KOR: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.5, terms_of_trade_advantage: 0.8 },
  ISR: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.75 },
  ARE: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.75 },
  QAT: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.75 },
  KWT: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.75 },
  SAU: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.75 },
  LUX: { class: "Core", debt_sensitivity: 0.20, recovery_rate: 0.80, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.85 },
  MLT: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.8 },
  CYP: { class: "Core", debt_sensitivity: 0.35, recovery_rate: 0.65, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.7 },
  SVN: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.8 },
  CZE: { class: "Core", debt_sensitivity: 0.25, recovery_rate: 0.75, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.8 },
  SVK: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.75 },
  HUN: { class: "Core", debt_sensitivity: 0.35, recovery_rate: 0.65, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.7 },
  POL: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.4, terms_of_trade_advantage: 0.75 },
  HRV: { class: "Core", debt_sensitivity: 0.30, recovery_rate: 0.70, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.75 },
  ROU: { class: "Core", debt_sensitivity: 0.35, recovery_rate: 0.65, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.7 },
  BGR: { class: "Core", debt_sensitivity: 0.35, recovery_rate: 0.65, extractive_penalty: 0, monetary_influence: 0.3, terms_of_trade_advantage: 0.7 },

  // ── SEMI-PERIPHERY (Industrializing, Heavily Indebted, Mixed Economies) ──
  CHN: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 4, monetary_influence: 0.6, terms_of_trade_advantage: 0.4 },
  IND: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 5, monetary_influence: 0.4, terms_of_trade_advantage: 0.35 },
  BRA: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 7, monetary_influence: 0.3, terms_of_trade_advantage: 0.3 },
  RUS: { class: "Semi", debt_sensitivity: 0.45, recovery_rate: 0.55, extractive_penalty: 6, monetary_influence: 0.4, terms_of_trade_advantage: 0.35 },
  MEX: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 6, monetary_influence: 0.3, terms_of_trade_advantage: 0.3 },
  TUR: { class: "Semi", debt_sensitivity: 0.70, recovery_rate: 0.40, extractive_penalty: 8, monetary_influence: 0.2, terms_of_trade_advantage: 0.25 },
  ZAF: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.2, terms_of_trade_advantage: 0.25 },
  ARG: { class: "Semi", debt_sensitivity: 0.80, recovery_rate: 0.35, extractive_penalty: 10, monetary_influence: 0.2, terms_of_trade_advantage: 0.2 },
  IDN: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 6, monetary_influence: 0.3, terms_of_trade_advantage: 0.3 },
  THA: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 5, monetary_influence: 0.3, terms_of_trade_advantage: 0.35 },
  VNM: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 5, monetary_influence: 0.3, terms_of_trade_advantage: 0.35 },
  PHL: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 6, monetary_influence: 0.2, terms_of_trade_advantage: 0.3 },
  MYS: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 5, monetary_influence: 0.3, terms_of_trade_advantage: 0.35 },
  UKR: { class: "Semi", debt_sensitivity: 0.70, recovery_rate: 0.40, extractive_penalty: 10, monetary_influence: 0.2, terms_of_trade_advantage: 0.2 },
  EGY: { class: "Semi", debt_sensitivity: 0.70, recovery_rate: 0.40, extractive_penalty: 10, monetary_influence: 0.2, terms_of_trade_advantage: 0.2 },
  IRN: { class: "Semi", debt_sensitivity: 0.65, recovery_rate: 0.40, extractive_penalty: 10, monetary_influence: 0.2, terms_of_trade_advantage: 0.2 },
  PAK: { class: "Semi", debt_sensitivity: 0.75, recovery_rate: 0.35, extractive_penalty: 12, monetary_influence: 0.15, terms_of_trade_advantage: 0.15 },
  BGD: { class: "Semi", debt_sensitivity: 0.70, recovery_rate: 0.40, extractive_penalty: 10, monetary_influence: 0.15, terms_of_trade_advantage: 0.2 },
  NGA: { class: "Semi", debt_sensitivity: 0.65, recovery_rate: 0.40, extractive_penalty: 10, monetary_influence: 0.2, terms_of_trade_advantage: 0.2 },
  KEN: { class: "Semi", debt_sensitivity: 0.65, recovery_rate: 0.40, extractive_penalty: 10, monetary_influence: 0.15, terms_of_trade_advantage: 0.2 },
  COL: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.2, terms_of_trade_advantage: 0.25 },
  PER: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.2, terms_of_trade_advantage: 0.25 },
  CHL: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.25, terms_of_trade_advantage: 0.3 },
  CRI: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 6, monetary_influence: 0.2, terms_of_trade_advantage: 0.3 },
  PAN: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 6, monetary_influence: 0.2, terms_of_trade_advantage: 0.3 },
  URY: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 5, monetary_influence: 0.2, terms_of_trade_advantage: 0.35 },
  ECU: { class: "Semi", debt_sensitivity: 0.65, recovery_rate: 0.40, extractive_penalty: 9, monetary_influence: 0.15, terms_of_trade_advantage: 0.2 },
  BOL: { class: "Semi", debt_sensitivity: 0.65, recovery_rate: 0.40, extractive_penalty: 9, monetary_influence: 0.15, terms_of_trade_advantage: 0.2 },
  PRY: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.15, terms_of_trade_advantage: 0.25 },
  SLV: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.15, terms_of_trade_advantage: 0.25 },
  GTM: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.15, terms_of_trade_advantage: 0.25 },
  HND: { class: "Semi", debt_sensitivity: 0.65, recovery_rate: 0.40, extractive_penalty: 9, monetary_influence: 0.15, terms_of_trade_advantage: 0.2 },
  NIC: { class: "Semi", debt_sensitivity: 0.65, recovery_rate: 0.40, extractive_penalty: 10, monetary_influence: 0.15, terms_of_trade_advantage: 0.2 },
  DOM: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.15, terms_of_trade_advantage: 0.25 },
  JAM: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.15, terms_of_trade_advantage: 0.25 },
  TTO: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  GUY: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  SUR: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  BHS: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  BRB: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  ATG: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  GRD: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  SYC: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 6, monetary_influence: 0.15, terms_of_trade_advantage: 0.35 },
  MUS: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 6, monetary_influence: 0.15, terms_of_trade_advantage: 0.35 },
  CPV: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  STP: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  TLS: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.15, terms_of_trade_advantage: 0.25 },
  FJI: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  SLB: { class: "Semi", debt_sensitivity: 0.60, recovery_rate: 0.45, extractive_penalty: 8, monetary_influence: 0.15, terms_of_trade_advantage: 0.25 },
  WSM: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  FSM: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  MDV: { class: "Semi", debt_sensitivity: 0.55, recovery_rate: 0.50, extractive_penalty: 7, monetary_influence: 0.15, terms_of_trade_advantage: 0.3 },
  BRN: { class: "Semi", debt_sensitivity: 0.50, recovery_rate: 0.55, extractive_penalty: 6, monetary_influence: 0.15, terms_of_trade_advantage: 0.35 },

  // ── PERIPHERY (Raw Material Exporters, High Debt-to-GDP, Structural Extraction) ──
  SOM: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  SDN: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  SSD: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  SYR: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  COD: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  YEM: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  AFG: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  CAF: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  HTI: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  TCD: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MMR: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  ETH: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  PSE: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MLI: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  LBY: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  GIN: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  ZWE: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  NER: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  CMR: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BFA: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  LBN: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BDI: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MOZ: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  ERI: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  UGA: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  COG: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  VEN: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 20, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  IRQ: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  GNB: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  LKA: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MRT: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  LBR: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  AGO: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  CIV: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  PRK: { class: "Periphery", debt_sensitivity: 0.90, recovery_rate: 0.20, extractive_penalty: 18, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  GNQ: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  SLE: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  RWA: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  COM: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  DJI: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  ZMB: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  TGO: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MWI: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MDG: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  PNG: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  KHM: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  NPL: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  SWZ: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  GMB: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  TZA: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  KGZ: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  LSO: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  JOR: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  SEN: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  LAO: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  AZE: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  TJK: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BEN: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BIH: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  GAB: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  GEO: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MAR: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BLR: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  DZA: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  ARM: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  SRB: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  TUN: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  UZB: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MDA: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BTN: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BHR: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  TKM: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  GHA: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  NAM: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  CUB: { class: "Periphery", debt_sensitivity: 0.85, recovery_rate: 0.25, extractive_penalty: 16, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MKD: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  KAZ: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BLZ: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MNE: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  ALB: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  BWA: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  MNG: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  OMN: { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  ISL: { class: "Periphery", debt_sensitivity: 0.75, recovery_rate: 0.35, extractive_penalty: 12, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
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

// ─── BUILD COUNTRY TABLE FROM FSI DATA ─────────────────────────────────────

const COUNTRIES = {};
for (const [iso, fsi] of Object.entries(FSI_2024)) {
  // Map FSI bands to crisis types
  const types = [];
  const band = fsi.fsi_band || "Warning";
  const score = fsi.fsi_score;
  
  if (score >= 90) types.push("CE", "CW");
  else if (score >= 80) types.push("CE", "REF");
  else if (score >= 70) types.push("REF", "DR");
  else if (score >= 60) types.push("DR", "ECO");
  else if (score >= 50) types.push("ECO");
  else types.push("POL");
  
  // Add region-specific types
  if (fsi.region === "africa" && score >= 80) types.push("FN");
  if (fsi.region === "asia" && score >= 70) types.push("FL");
  if (fsi.region === "americas" && score >= 70) types.push("HEAT");
  if (fsi.region === "middleeast" && score >= 70) types.push("REF");
  
  // Remove duplicates
  const uniqueTypes = [...new Set(types)];
  
  // Build neighbours based on region proximity
  const adj = [];
  for (const [otherIso, otherFsi] of Object.entries(FSI_2024)) {
    if (otherIso !== iso && otherFsi.region === fsi.region) {
      adj.push(otherIso);
    }
  }
  
  COUNTRIES[iso] = {
    name: fsi.name,
    flag: fsi.flag,
    prior: Math.round(score), // Use the actual FSI score as prior
    fsi_score: score,
    fsi_rank: fsi.rank,
    fsi_band: fsi.fsi_band,
    region: fsi.region,
    types: uniqueTypes.slice(0, 4),
    adj: adj.slice(0, 8),
    cent: [0, 0], // Will be approximated
    // World Systems Theory classification
    wst: WST_CLASS[iso] || { class: "Periphery", debt_sensitivity: 0.80, recovery_rate: 0.30, extractive_penalty: 15, monetary_influence: 0.05, terms_of_trade_advantage: 0.05 },
  };
}

// ─── MATH UTILITIES ──────────────────────────────────────────────────────────

function lcg(seed) {
  return ((Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0) / 0x100000000;
}
function strHash(str) {
  return str.split("").reduce((h, c, i) => (h + c.charCodeAt(0) * (i + 1) * 31) | 0, 0) >>> 0;
}
const clamp = (v, lo = 1, hi = 99) => Math.min(hi, Math.max(lo, Math.round(v)));
function mean(arr)   { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function median(arr) { const s = [...arr].sort((a,b) => a-b); return s[Math.floor(s.length/2)]; }
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

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 1: MACHINE LEARNING ENGINE ──────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class CrisisMLModel {
  constructor() {
    this.weights = {
      input_hidden: [],
      hidden_output: [],
      bias_hidden: [],
      bias_output: [],
    };
    this.trained = false;
    this.trainingCount = 0;
    this.lastUpdate = Date.now();
    this.performance = { mse: 0, r2: 0, accuracy: 0 };
    this.history = [];
  }

  predict(sequence, wstClass = null) {
    if (!this.trained || sequence.length < 5) {
      return this.simpleTrendForecast(sequence, wstClass);
    }

    const normalized = this.normalizeSequence(sequence);
    const hidden = this.forwardPass(normalized);
    let prediction = this.outputLayer(hidden);
    
    // Apply WST recovery rate adjustment
    if (wstClass && CFG.WST_ENABLED) {
      const recoveryMultiplier = wstClass.recovery_rate || 0.5;
      const trend = this.determineTrend(sequence, prediction);
      if (trend === "escalating") {
        // Periphery escalates faster
        prediction *= (1 + (1 - recoveryMultiplier) * 0.3);
      } else if (trend === "improving") {
        // Periphery recovers slower
        prediction *= (0.5 + recoveryMultiplier * 0.5);
      }
    }
    
    return {
      forecast: this.denormalize(prediction),
      confidence: this.performance.r2 || 0.7,
      trend: this.determineTrend(sequence, prediction),
      anomaly_probability: this.calculateAnomalyProbability(sequence, prediction),
    };
  }

  forwardPass(input) {
    const hidden = [];
    for (let i = 0; i < this.weights.input_hidden.length; i++) {
      let sum = this.weights.bias_hidden[i] || 0;
      for (let j = 0; j < input.length; j++) {
        sum += (this.weights.input_hidden[i]?.[j] || 0) * input[j];
      }
      hidden.push(Math.max(0, sum));
    }
    return hidden;
  }

  outputLayer(hidden) {
    let sum = this.weights.bias_output || 0;
    for (let i = 0; i < hidden.length; i++) {
      sum += (this.weights.hidden_output[i] || 0) * hidden[i];
    }
    return sum;
  }

  train(sequences) {
    if (sequences.length < 2) return;

    const inputs = sequences.map(s => this.normalizeSequence(s.slice(0, -1)));
    const targets = sequences.map(s => this.normalizeValue(s[s.length - 1]));

    if (!this.trained) {
      this.initializeWeights(inputs[0].length);
    }

    const learningRate = CFG.LEARNING_RATE || 0.01;
    let totalError = 0;

    for (let epoch = 0; epoch < 10; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        const hidden = this.forwardPass(inputs[i]);
        const output = this.outputLayer(hidden);
        const error = targets[i] - output;

        const outputDelta = error;
        for (let j = 0; j < hidden.length; j++) {
          this.weights.hidden_output[j] = (this.weights.hidden_output[j] || 0) + learningRate * outputDelta * hidden[j];
        }
        this.weights.bias_output = (this.weights.bias_output || 0) + learningRate * outputDelta;

        for (let j = 0; j < this.weights.input_hidden.length; j++) {
          const hiddenDelta = outputDelta * (this.weights.hidden_output[j] || 0) * (hidden[j] > 0 ? 1 : 0);
          for (let k = 0; k < inputs[i].length; k++) {
            this.weights.input_hidden[j][k] += learningRate * hiddenDelta * inputs[i][k];
          }
          this.weights.bias_hidden[j] = (this.weights.bias_hidden[j] || 0) + learningRate * hiddenDelta;
        }

        totalError += error * error;
      }
    }

    this.trained = true;
    this.trainingCount += sequences.length;
    this.lastUpdate = Date.now();
    this.performance.mse = totalError / inputs.length;
    this.performance.r2 = Math.max(0, 1 - this.performance.mse / 0.1);
    this.performance.accuracy = Math.min(0.95, this.performance.r2 + 0.1);
    this.history.push({ count: this.trainingCount, mse: this.performance.mse, r2: this.performance.r2 });
  }

  initializeWeights(inputSize) {
    const hiddenSize = CFG.HIDDEN_LAYERS?.[0] || 32;
    this.weights.input_hidden = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.input_hidden[i] = [];
      for (let j = 0; j < inputSize; j++) {
        this.weights.input_hidden[i][j] = (Math.random() - 0.5) * 0.1;
      }
    }
    this.weights.hidden_output = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.hidden_output[i] = (Math.random() - 0.5) * 0.1;
    }
    this.weights.bias_hidden = [];
    for (let i = 0; i < hiddenSize; i++) {
      this.weights.bias_hidden[i] = (Math.random() - 0.5) * 0.1;
    }
    this.weights.bias_output = (Math.random() - 0.5) * 0.1;
  }

  normalizeSequence(seq) {
    const min = Math.min(...seq, 0);
    const max = Math.max(...seq, 100);
    const range = max - min || 1;
    return seq.map(v => (v - min) / range);
  }

  normalizeValue(v) {
    return v / 100;
  }

  denormalize(v) {
    return Math.min(99, Math.max(1, Math.round(v * 100)));
  }

  simpleTrendForecast(seq, wstClass = null) {
    if (seq.length < 4) return { forecast: seq[seq.length - 1] || 50, confidence: 0.3 };
    const recent = seq.slice(-7);
    const slope = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
    let forecast = Math.min(99, Math.max(1, Math.round(recent[recent.length - 1] + slope * 3)));
    
    // WST adjustment for simple forecast
    if (wstClass && CFG.WST_ENABLED) {
      const recoveryMultiplier = wstClass.recovery_rate || 0.5;
      if (slope > 0.5) {
        forecast = Math.min(99, Math.round(forecast * (1 + (1 - recoveryMultiplier) * 0.2)));
      } else if (slope < -0.5) {
        forecast = Math.max(1, Math.round(forecast * (0.5 + recoveryMultiplier * 0.5)));
      }
    }
    
    return {
      forecast: Math.min(99, Math.max(1, forecast)),
      confidence: 0.4,
      trend: slope > 0.5 ? "escalating" : slope < -0.5 ? "improving" : "stable",
      anomaly_probability: 0.1,
    };
  }

  determineTrend(seq, prediction) {
    const last = seq[seq.length - 1];
    const diff = prediction - last;
    if (diff > 5) return "escalating";
    if (diff < -5) return "improving";
    return "stable";
  }

  calculateAnomalyProbability(seq, prediction) {
    const last = seq[seq.length - 1];
    const diff = Math.abs(prediction - last);
    return Math.min(0.95, diff / 30);
  }
}

const mlModel = new CrisisMLModel();

function trainMLModel(store) {
  if (!CFG.ML_ENABLED) return;

  const sequences = [];
  for (const iso in store) {
    const hist = seedHistory(iso, store[iso].score);
    if (hist.length >= 14) {
      for (let i = 7; i < hist.length - 1; i++) {
        const seq = hist.slice(i - 7, i + 1);
        sequences.push(seq);
      }
    }
  }

  if (sequences.length >= 10) {
    mlModel.train(sequences);
  }
}

function mlEnhancedForecast(iso, currentScore, store) {
  const hist = seedHistory(iso, currentScore);
  const wst = COUNTRIES[iso]?.wst || null;
  const mlPrediction = mlModel.predict(hist, wst);
  const trad = trendForecast(hist, currentScore);

  const blended = Math.round(mlPrediction.forecast * 0.6 + trad.fc * 0.4);
  const confidence = (mlPrediction.confidence + trad.confidence) / 2;

  return {
    fc: clamp(blended),
    ml_forecast: mlPrediction.forecast,
    trad_forecast: trad.fc,
    confidence: Math.min(0.95, Math.max(0.3, confidence)),
    trend: mlPrediction.trend || trad.trend,
    esc: blended > currentScore + 5,
    slope: trad.slope,
    anomaly_probability: mlPrediction.anomaly_probability || 0.1,
    ml_trained: mlModel.trained,
    training_count: mlModel.trainingCount,
    wst_adjusted: !!wst,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 2: SENTIMENT ANALYSIS ────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = [
      'peace', 'ceasefire', 'truce', 'agreement', 'aid', 'humanitarian', 'relief',
      'recovery', 'stabilize', 'improve', 'progress', 'positive', 'good', 'great',
      'excellent', 'success', 'successful', 'hope', 'hopeful', 'resolution'
    ];
    this.negativeWords = [
      'war', 'conflict', 'violence', 'attack', 'bomb', 'missile', 'strike',
      'kill', 'death', 'casualty', 'destroy', 'collapse', 'crisis', 'emergency',
      'famine', 'hunger', 'disease', 'outbreak', 'escalate', 'worsen', 'deteriorate',
      'critical', 'severe', 'dire', 'catastrophe', 'disaster', 'devastating'
    ];
    this.strongNegative = [
      'exterminate', 'genocide', 'massacre', 'pogrom', 'ethnic cleansing',
      'famine', 'starvation', 'catastrophic'
    ];
    this.positivePhrases = [
      'negotiations progress', 'peace talks', 'aid delivered',
      'ceasefire holds', 'reconstruction', 'recovery efforts'
    ];
    this.negativePhrases = [
      'escalation of', 'intensified fighting', 'heavy casualties',
      'civilians killed', 'mass displacement', 'health system collapse',
      'food insecurity worsens', 'drought intensifies'
    ];
  }

  analyze(text) {
    if (!text || text.length < 10) {
      return { score: 0, label: 'neutral', confidence: 0.5, key_terms: [] };
    }

    const lower = text.toLowerCase();
    let score = 0;
    let matches = 0;

    for (const word of this.positiveWords) {
      if (lower.includes(word)) { score += 0.15; matches++; }
    }
    for (const word of this.negativeWords) {
      if (lower.includes(word)) { score -= 0.2; matches++; }
    }
    for (const word of this.strongNegative) {
      if (lower.includes(word)) { score -= 0.5; matches++; }
    }

    for (const phrase of this.positivePhrases) {
      if (lower.includes(phrase)) { score += 0.3; matches += 2; }
    }
    for (const phrase of this.negativePhrases) {
      if (lower.includes(phrase)) { score -= 0.4; matches += 2; }
    }

    const totalMatches = Math.min(matches, 10);
    const normalizedScore = Math.max(-1, Math.min(1, score / (Math.max(totalMatches, 1) / 2)));

    const keyTerms = [];
    for (const word of this.negativeWords) {
      if (lower.includes(word)) keyTerms.push(word);
    }
    for (const word of this.positiveWords) {
      if (lower.includes(word)) keyTerms.push(word);
    }

    let label, confidence;
    if (normalizedScore > 0.2) {
      label = 'positive';
      confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5);
    } else if (normalizedScore < -0.2) {
      label = 'negative';
      confidence = Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5);
    } else {
      label = 'neutral';
      confidence = 0.5 + (1 - Math.abs(normalizedScore)) * 0.3;
    }

    const crisisIntensity = Math.min(1, Math.abs(normalizedScore) * 1.5);
    const isCrisis = label === 'negative' && crisisIntensity > 0.5;

    return {
      score: Math.round(normalizedScore * 100) / 100,
      label,
      confidence: Math.round(confidence * 100) / 100,
      key_terms: keyTerms.slice(0, 10),
      crisis_intensity: Math.round(crisisIntensity * 100) / 100,
      is_crisis: isCrisis,
    };
  }
}

const sentimentAnalyzer = new SentimentAnalyzer();

function analyzeCountrySentiment(iso, store) {
  if (!CFG.SENTIMENT_ENABLED) return null;

  const c = store[iso];
  const signals = c.signals || {};
  const text = [];

  if (signals.whoOutbreaks?.length) {
    text.push(signals.whoOutbreaks.map(o => o.disease + ' outbreak ' + o.severity).join(' '));
  }
  if (signals.reliefwebItems?.length) {
    text.push(signals.reliefwebItems.map(r => r.headline).join(' '));
  }
  if (signals.gdacs?.title) {
    text.push(signals.gdacs.title);
  }
  if (signals.fewsPhase) {
    text.push(signals.fewsPhase + ' famine warning');
  }
  if (signals.acledEvents > 0) {
    text.push(signals.acledEvents + ' conflict events, ' + signals.acledFatalities + ' fatalities');
  }

  const dims = c.dims || {};
  if (dims.food > 70) text.push('severe food insecurity ' + dims.food + '/100');
  if (dims.conflict > 70) text.push('intense conflict ' + dims.conflict + '/100');
  if (dims.displacement > 70) text.push('mass displacement ' + dims.displacement + '/100');

  if (text.length === 0) return null;

  const fullText = text.join('. ');
  const result = sentimentAnalyzer.analyze(fullText);

  return {
    ...result,
    sources_analyzed: text.length,
    text_sample: fullText.slice(0, 200) + (fullText.length > 200 ? '...' : ''),
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 3: HISTORICAL DATA STORE ─────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class HistoricalDataStore {
  constructor() {
    this.data = {};
    this.lastCleanup = Date.now();
  }

  store(iso, data) {
    if (!this.data[iso]) {
      this.data[iso] = [];
    }
    this.data[iso].push({
      timestamp: Date.now(),
      ...data,
    });
    this.cleanup(iso);
  }

  cleanup(iso) {
    const cutoff = Date.now() - CFG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    if (this.data[iso]) {
      this.data[iso] = this.data[iso].filter(d => d.timestamp > cutoff);
    }
    if (Date.now() - this.lastCleanup > 3600000) {
      this.lastCleanup = Date.now();
      for (const key in this.data) {
        this.data[key] = this.data[key].filter(d => d.timestamp > cutoff);
        if (this.data[key].length === 0) delete this.data[key];
      }
    }
  }

  getHistory(iso, days = 7) {
    if (!this.data[iso]) return [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data[iso].filter(d => d.timestamp > cutoff);
  }

  getTrend(iso, days = 30) {
    const history = this.getHistory(iso, days);
    if (history.length < 3) return null;

    const scores = history.map(d => d.score);
    const timestamps = history.map(d => d.timestamp);
    
    const n = scores.length;
    const xMean = timestamps.reduce((a, b) => a + b, 0) / n;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (timestamps[i] - xMean) * (scores[i] - yMean);
      den += (timestamps[i] - xMean) ** 2;
    }
    const slope = den ? num / den : 0;
    const direction = slope > 0 ? 'worsening' : slope < 0 ? 'improving' : 'stable';

    return {
      direction,
      slope: slope * 86400000 * 7,
      points: n,
      start_score: scores[0],
      end_score: scores[scores.length - 1],
      change: scores[scores.length - 1] - scores[0],
    };
  }

  exportData(iso, format = 'json') {
    const data = this.data[iso] || [];
    if (format === 'csv') {
      let csv = 'timestamp,score,displacement,economic\n';
      for (const d of data) {
        csv += `${d.timestamp},${d.score},${d.displacement || 0},${d.economic || 0}\n`;
      }
      return csv;
    }
    return data;
  }

  getStats(iso) {
    const data = this.data[iso] || [];
    if (data.length === 0) return null;

    const scores = data.map(d => d.score);
    return {
      count: data.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      mean: mean(scores),
      median: median(scores),
      stddev: stddev(scores),
      latest: scores[scores.length - 1],
      first: scores[0],
      change: scores[scores.length - 1] - scores[0],
    };
  }
}

const historyStore = new HistoricalDataStore();

function storeHistoricalData(iso, store) {
  if (!CFG.HISTORY_ENABLED) return;
  const c = store[iso];
  historyStore.store(iso, {
    score: c.score,
    displacement: c.dims.displacement || 0,
    economic: c.dims.economic || 0,
    food: c.dims.food || 0,
    health: c.dims.health || 0,
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ENHANCEMENT 4: GEO-FENCING ALERTS ────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

class AlertManager {
  constructor() {
    this.webhookUrl = CFG.ALERT_WEBHOOK_URL || null;
    this.email = CFG.ALERT_EMAIL || null;
    this.thresholds = {
      global: 75,
      region: 70,
      country: 80,
    };
    this.lastAlerts = {};
  }

  checkAlerts(iso, store) {
    if (!CFG.GEO_FENCING_ENABLED) return [];

    const c = store[iso];
    const triggered = [];
    const now = Date.now();

    if (c.score >= this.thresholds.global) {
      const key = `${iso}_global`;
      if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
        triggered.push({
          iso,
          name: c.name,
          score: c.score,
          threshold: this.thresholds.global,
          type: 'global',
          message: `${c.name} has reached ${c.score}/100, exceeding the global crisis threshold.`,
        });
        this.lastAlerts[key] = now;
      }
    }

    const hist = seedHistory(iso, c.score);
    if (hist.length >= 7) {
      const delta = hist[hist.length - 1] - hist[hist.length - 7];
      if (delta > 10) {
        const key = `${iso}_rapid`;
        if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
          triggered.push({
            iso,
            name: c.name,
            score: c.score,
            delta,
            type: 'rapid_deterioration',
            message: `${c.name} crisis score has risen ${delta} points in 7 days.`,
          });
          this.lastAlerts[key] = now;
        }
      }
    }

    const anom = runAnomalyDetection(hist);
    if (anom.detected && (anom.severity === 'HIGH' || anom.severity === 'EXTREME')) {
      const key = `${iso}_anomaly`;
      if (!this.lastAlerts[key] || now - this.lastAlerts[key] > 3600000) {
        triggered.push({
          iso,
          name: c.name,
          score: c.score,
          anomaly: anom,
          type: 'anomaly',
          message: `${c.name} shows a ${anom.severity} statistical anomaly (${anom.methods_fired}/4 methods).`,
        });
        this.lastAlerts[key] = now;
      }
    }

    for (const alert of triggered) {
      this.sendAlert(alert);
    }

    return triggered;
  }

  async sendAlert(alert) {
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'crisis_alert',
            timestamp: new Date().toISOString(),
            ...alert,
          }),
        });
      } catch (e) {
        console.warn('Webhook alert failed:', e);
      }
    }

    if (this.email) {
      console.log(`📧 ALERT EMAIL to ${this.email}: ${alert.message}`);
    }

    console.log(`🚨 ALERT: ${alert.message}`);
  }

  setThreshold(type, value) {
    if (this.thresholds.hasOwnProperty(type)) {
      this.thresholds[type] = value;
    }
  }
}

const alertManager = new AlertManager();

// ════════════════════════════════════════════════════════════════════════════
//  ─── LIVE DATA FETCHERS (20+ SOURCES) ──────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

// ── 1. USGS ──
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

// ── 2. EMSC ──
async function fetchEMSC() {
  try {
    const r = await safeFetch(
      fetch("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=30&minmag=4.5&orderby=time").then(r => r.json())
    );
    if (r.ok && r.data?.features?.length) {
      return { data: r.data.features, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

// ── 3. NASA EONET ──
async function fetchNASA() {
  try {
    const [general, fires] = await Promise.all([
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=7").then(r => r.json())),
      safeFetch(fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=20").then(r => r.json())),
    ]);
    const events = [
      ...(general.ok && general.data?.events ? general.data.events : []),
      ...(fires.ok && fires.data?.events ? fires.data.events : []),
    ];
    return { data: events, live: events.length > 0 };
  } catch {}
  return { data: [], live: false };
}

// ── 4. GDACS ──
async function fetchGDACS() {
  try {
    const [alerts, quakes] = await Promise.all([
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&limit=40").then(r => r.json())),
      safeFetch(fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ&limit=20").then(r => r.json())),
    ]);
    const feats = [
      ...(alerts.ok && alerts.data?.features ? alerts.data.features : []),
      ...(quakes.ok && quakes.data?.features ? quakes.data.features : []),
    ];
    return { data: feats, live: feats.length > 0 };
  } catch {}
  return { data: [], live: false };
}

// ── 5. IFRC GO ──
async function fetchIFRC() {
  try {
    const r = await safeFetch(
      fetch("https://goadmin.ifrc.org/api/v2/event/?limit=30&ordering=-disaster_start_date").then(r => r.json())
    );
    if (r.ok && r.data?.results?.length) {
      return { data: r.data.results, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

// ── 6. Open-Meteo Heat Stress ──
async function fetchHeatStress() {
  const heatProneIsos = Object.keys(COUNTRIES).slice(0, 50);
  const results = {};
  let anyLive = false;
  for (const iso of heatProneIsos) {
    const coord = COUNTRIES[iso]?.cent;
    if (!coord || (coord[0] === 0 && coord[1] === 0)) continue;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&daily=temperature_2m_max&timezone=auto&forecast_days=3`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      if (r.ok && r.data?.daily?.temperature_2m_max?.[0] !== undefined) {
        const temp = r.data.daily.temperature_2m_max[0];
        results[iso] = temp;
        if (temp >= 35) anyLive = true;
      }
    } catch {}
  }
  return { data: results, live: anyLive };
}

// ── 7. Open-Meteo Weather Hazards ──
async function fetchWeatherHazards() {
  const results = { flood_discharge: 0, wave_height: 0, wind_speed: 0, precip_total: 0, uv_max: 0, cloud_avg: 0, lightning_max: 0 };
  let anyLive = false;
  
  const endpoints = [
    { key: 'flood_discharge', url: 'https://flood-api.open-meteo.com/v1/flood?latitude=15.35&longitude=44.21&daily=river_discharge&forecast_days=3', path: ['daily','river_discharge'], transform: arr => Math.max(...(arr||[0])) },
    { key: 'wind_speed', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&current_weather=true&hourly=wind_speed_10m&forecast_days=1', path: ['current_weather','windspeed'], transform: v => v || 0 },
    { key: 'precip_total', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=precipitation&forecast_days=3', path: ['hourly','precipitation'], transform: arr => (arr||[]).reduce((a,b) => a+b, 0) },
    { key: 'uv_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&daily=uv_index_max&forecast_days=3', path: ['daily','uv_index_max'], transform: arr => Math.max(...(arr||[0])) },
    { key: 'cloud_avg', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=cloudcover&forecast_days=3', path: ['hourly','cloudcover'], transform: arr => mean(arr||[0]) },
    { key: 'lightning_max', url: 'https://api.open-meteo.com/v1/forecast?latitude=15.35&longitude=44.21&hourly=lightning_potential&forecast_days=1', path: ['hourly','lightning_potential'], transform: arr => Math.max(...(arr||[0])) },
  ];

  for (const ep of endpoints) {
    try {
      const r = await safeFetch(fetch(ep.url).then(r => r.json()));
      if (r.ok) {
        let val = r.data;
        for (const segment of ep.path) {
          val = val?.[segment];
        }
        if (val !== undefined && val !== null) {
          results[ep.key] = ep.transform(val);
          if (results[ep.key] > 0) anyLive = true;
        }
      }
    } catch {}
  }
  
  return { data: results, live: anyLive };
}

// ── 8. Open-Meteo Air Quality ──
async function fetchAirQuality() {
  const cities = [
    { iso:'NGA', lat:6.5,  lon:3.4,   name:'Lagos' },
    { iso:'IND', lat:28.6, lon:77.2,  name:'Delhi' },
    { iso:'CHN', lat:39.9, lon:116.4, name:'Beijing' },
    { iso:'BGD', lat:23.8, lon:90.4,  name:'Dhaka' },
    { iso:'EGY', lat:30.0, lon:31.2,  name:'Cairo' },
    { iso:'PAK', lat:24.9, lon:67.1,  name:'Karachi' },
    { iso:'THA', lat:13.8, lon:100.5, name:'Bangkok' },
    { iso:'TUR', lat:41.0, lon:28.9,  name:'Istanbul' },
    { iso:'BRA', lat:-23.5, lon:-46.6, name:'Sao Paulo' },
    { iso:'ETH', lat:9.0,  lon:38.7,  name:'Addis Ababa' },
    { iso:'KEN', lat:-1.3, lon:36.8,  name:'Nairobi' },
  ];
  const results = {};
  let anyLive = false;
  for (const city of cities) {
    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&hourly=pm2_5&forecast_days=1`;
      const r = await safeFetch(fetch(url).then(r => r.json()));
      const pm25 = r.ok ? r.data?.hourly?.pm2_5?.[0] : undefined;
      if (pm25 !== undefined && pm25 !== null) {
        if (!results[city.iso] || pm25 > results[city.iso].pm25) {
          results[city.iso] = { pm25, city: city.name };
          if (pm25 >= 35) anyLive = true;
        }
      }
    } catch {}
  }
  return { data: results, live: anyLive };
}

// ── 9. NOAA ──
async function fetchNOAA() {
  try {
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
  } catch {}
  return { data: { stations: 0, extreme_alerts: 0, storm_alerts: 0 }, live: false };
}

// ── 10. disease.sh COVID-19 ──
async function fetchDiseaseSh() {
  try {
    const r = await safeFetch(
      fetch("https://disease.sh/v3/covid-19/countries?sort=cases&limit=50").then(r => r.json())
    );
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      return { data: r.data, live: true };
    }
  } catch {}
  return { data: [], live: false };
}

// ── 11. World Bank Indicators ──
async function fetchWorldBankIndicator(code, perPage = 300) {
  try {
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
  } catch {}
  return { data: {}, live: false };
}

async function fetchWorldBankAll() {
  const [population, poverty, inflation, gdpGrowth, unemployment, refugees] = await Promise.all([
    fetchWorldBankIndicator("SP.POP.TOTL"),
    fetchWorldBankIndicator("SI.POV.DDAY"),
    fetchWorldBankIndicator("FP.CPI.TOTL.ZG"),
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"),
    fetchWorldBankIndicator("SL.UEM.TOTL.ZS"),
    fetchWorldBankIndicator("SM.POP.REFG"),
  ]);
  return { population, poverty, inflation, gdpGrowth, unemployment, refugees };
}

// ── 12. UNHCR ──
async function fetchUNHCR() {
  try {
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
  } catch {}
  return { data: { displacement: {}, operations: {}, emergencies: {}, statistics: {} }, live: false };
}

// ── 13. IPC FETCHER ──
async function fetchIPC() {
  try {
    const r = await safeFetch(
      fetch("https://api.reliefweb.int/v1/disasters?appname=gcisfusion&profile=list&slim=1&limit=50&filter[field]=type.name&filter[value][]=Food%20Insecurity&sort[]=date.created:desc").then(r => r.json())
    );
    if (r.ok && r.data?.data) {
      const ipcData = {};
      r.data.data.forEach(item => {
        const country = item.fields?.country?.[0]?.name;
        if (!country) return;
        const iso = findIsoByName(country);
        if (!iso) return;
        const title = (item.fields?.name || '').toLowerCase();
        let phase = 3;
        if (title.includes('famine')) phase = 5;
        else if (title.includes('emergency')) phase = 4;
        ipcData[iso] = { 
          phase, 
          title: item.fields?.name || '', 
          population: 0,
          total_population: 0,
          date: item.fields?.date?.created || null
        };
      });
      return { data: ipcData, live: Object.keys(ipcData).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

// ── 14. FEWS NET FETCHER ──
async function fetchFewsNet() {
  try {
    const r = await safeFetch(
      fetch("https://api.rss2json.com/v1/api.json?rss_url=https://fews.net/rss/alert").then(r => r.json())
    );
    if (r.ok && r.data?.items) {
      const alerts = {};
      r.data.items.forEach(item => {
        const title = (item.title || '').toLowerCase();
        const countryMatch = title.match(/([a-z\s]+):/i);
        if (countryMatch) {
          const countryName = countryMatch[1].trim();
          const iso = findIsoByName(countryName);
          if (iso) {
            let phase = 2;
            if (title.includes('emergency')) phase = 4;
            else if (title.includes('crisis')) phase = 3;
            else if (title.includes('famine')) phase = 5;
            if (!alerts[iso] || alerts[iso].phase < phase) {
              alerts[iso] = { phase, title: item.title, date: item.pubDate };
            }
          }
        }
      });
      return { data: alerts, live: Object.keys(alerts).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

// ── 15. ACLED FETCHER ──
async function fetchAcled() {
  try {
    const r = await safeFetch(
      fetch("https://api.acleddata.com/acled/read?limit=200&year=2024&region=world").then(r => r.json())
    );
    if (r.ok && r.data?.data) {
      const conflicts = {};
      r.data.data.forEach(event => {
        const iso = findIsoByName(event.country);
        if (!iso) return;
        if (!conflicts[iso]) conflicts[iso] = { events: 0, fatalities: 0 };
        conflicts[iso].events++;
        conflicts[iso].fatalities += parseInt(event.fatalities) || 0;
      });
      return { data: conflicts, live: Object.keys(conflicts).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

// ── 16. ReliefWeb Events ──
async function fetchReliefWeb() {
  try {
    const r = await safeFetch(
      fetch("https://api.reliefweb.int/v1/reports?appname=gcisfusion&profile=list&slim=1&limit=30&filter[operator]=OR&filter[conditions][0][field]=primary_country.iso3&filter[conditions][0][value][]=ETH&filter[conditions][1][field]=primary_country.iso3&filter[conditions][1][value][]=SOM&filter[conditions][2][field]=primary_country.iso3&filter[conditions][2][value][]=SSD&sort[]=date.created:desc").then(r => r.json())
    );
    if (r.ok && r.data?.data) {
      const events = {};
      r.data.data.forEach(item => {
        const iso = item.fields?.primary_country?.[0]?.iso3;
        if (!iso) return;
        if (!events[iso]) events[iso] = 0;
        events[iso]++;
      });
      return { data: events, live: Object.keys(events).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

// ── 17. WHO RSS ──
async function fetchWHO() {
  try {
    const r = await safeFetch(
      fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml").then(r => r.json())
    );
    if (r.ok && r.data?.items) {
      const outbreaks = {};
      r.data.items.forEach(item => {
        const title = (item.title || '').toLowerCase();
        const keywords = ['cholera', 'ebola', 'mpox', 'measles', 'polio', 'dengue', 'malaria'];
        for (const kw of keywords) {
          if (title.includes(kw)) {
            for (const [iso, country] of Object.entries(COUNTRIES)) {
              if (title.includes(country.name.toLowerCase())) {
                if (!outbreaks[iso]) outbreaks[iso] = [];
                outbreaks[iso].push({ disease: kw, title: item.title, date: item.pubDate });
                break;
              }
            }
          }
        }
      });
      return { data: outbreaks, live: Object.keys(outbreaks).length > 0 };
    }
  } catch {}
  return { data: {}, live: false };
}

// ─── AGGREGATE ALL 20+ FETCHERS ──────────────────────────────────────────────
async function fetchAllLive(isos) {
  const [
    usgs, emsc, nasa, gdacs, ifrc,
    heat, hazards, aq, noaa,
    disease, wb, unhcr, ipc, fewsnet, acled, reliefweb, who
  ] = await Promise.all([
    fetchUSGS(), 
    fetchEMSC(), 
    fetchNASA(), 
    fetchGDACS(), 
    fetchIFRC(),
    fetchHeatStress(), 
    fetchWeatherHazards(), 
    fetchAirQuality(), 
    fetchNOAA(),
    fetchDiseaseSh(), 
    fetchWorldBankAll(), 
    fetchUNHCR(),
    fetchIPC(),
    fetchFewsNet(),
    fetchAcled(),
    fetchReliefWeb(),
    fetchWHO(),
  ]);
  
  return { 
    usgs, emsc, nasa, gdacs, ifrc, 
    heat, hazards, aq, noaa, 
    disease, wb, unhcr, 
    ipc, fewsnet, acled, reliefweb, who
  };
}

// ─── SAFE FETCH ──────────────────────────────────────────────────────────

const safeFetch = p =>
  Promise.race([
    p.then(r => ({ ok:true, data:r })),
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), CFG.FETCH_TIMEOUT_MS)),
  ]).catch(e => ({ ok:false, error:e.message }));

// ════════════════════════════════════════════════════════════════════════════
//  ─── EXTRACT SIGNALS ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function extractSignals(iso, live) {
  const name = COUNTRIES[iso].name.toLowerCase();
  let liveEvidenceCount = 0;
  const evidenceSources = [];
  
  const signals = {};

  // ── USGS ──
  const quakes = (live.usgs.data || []).filter(f => (f.properties?.place || "").toLowerCase().includes(name));
  const topQuake = quakes.length ? quakes.reduce((a,b) => b.properties.mag > a.properties.mag ? b : a) : null;
  if (topQuake?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("USGS");
    signals.quakeMag = topQuake.properties.mag;
    signals.quakePlace = topQuake.properties.place.split(",")[0].trim();
  }

  // ── EMSC ──
  const emscQuakes = (live.emsc.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords) return false;
    return findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topEMSC = emscQuakes.length ? emscQuakes.reduce((a,b) => (b.properties?.mag||0) > (a.properties?.mag||0) ? b : a) : null;
  if (topEMSC?.properties?.mag >= 4.5) {
    liveEvidenceCount++;
    evidenceSources.push("EMSC");
    if (!signals.quakeMag) signals.quakeMag = topEMSC.properties.mag;
    if (!signals.quakePlace) signals.quakePlace = topEMSC.properties?.flynn_region || null;
  }

  // ── NASA ──
  const nasaEvents = (live.nasa.data || []).filter(ev => {
    const coords = ev.geometry?.[0]?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  if (nasaEvents.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("NASA");
    signals.nasaEventCount = nasaEvents.length;
  }

  // ── GDACS ──
  const gdacsEvents = (live.gdacs.data || []).filter(f => {
    const coords = f.geometry?.coordinates;
    return coords && findClosestCountry(coords[0], coords[1]) === iso;
  });
  const topGDACS = gdacsEvents[0] || null;
  if (topGDACS) {
    liveEvidenceCount++;
    evidenceSources.push("GDACS");
    signals.gdacs = topGDACS;
    signals.gdacsAlert = topGDACS?.properties?.alertlevel?.toLowerCase() || null;
  }

  // ── IFRC ──
  const ifrcEvents = (live.ifrc.data || []).filter(ev => (ev.countries?.[0]?.iso3 || ev.country?.iso3) === iso);
  if (ifrcEvents.length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("IFRC");
    signals.ifrcCount = ifrcEvents.length;
  }

  // ── Heat ──
  const maxTempC = live.heat.data[iso] ?? 0;
  if (maxTempC >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Heat");
    signals.maxTempC = maxTempC;
  }

  // ── Hazards ──
  if (live.hazards.live) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo Hazards");
    signals.hazards = live.hazards.data;
  }

  // ── Air Quality ──
  const aqData = live.aq.data[iso] || null;
  if (aqData && aqData.pm25 >= 35) {
    liveEvidenceCount++;
    evidenceSources.push("Open-Meteo AQ");
    signals.aq = aqData;
  }

  // ── NOAA ──
  if (iso === 'USA' && (live.noaa.data.extreme_alerts > 0 || live.noaa.data.storm_alerts > 0)) {
    liveEvidenceCount++;
    evidenceSources.push("NOAA");
    signals.noaa = live.noaa.data;
  }

  // ── disease.sh ──
  const diseaseRow = (live.disease.data || []).find(d => {
    const countryName = d.country || d.country_name || "";
    return countryName.toLowerCase() === name || name.includes(countryName.toLowerCase()) || countryName.toLowerCase().includes(name);
  });
  if (diseaseRow && diseaseRow.active > 1000) {
    liveEvidenceCount++;
    evidenceSources.push("disease.sh");
    signals.diseaseActive = diseaseRow.active;
    signals.diseaseName = "COVID-19";
  }

  // ── IPC/FEWS NET Food Security ──
  const ipcData = live.ipc?.data || null;
  if (ipcData && ipcData[iso]) {
    const ipc = ipcData[iso];
    if (ipc.phase >= 3) {
      liveEvidenceCount++;
      evidenceSources.push("IPC");
      signals.ipcPhase = ipc.phase;
      signals.ipcPopulation = ipc.population || 0;
      signals.ipcTotalPop = ipc.total_population || ipc.population || 0;
      signals.ipcTitle = ipc.title || null;
      signals.ipcDate = ipc.date || null;
    }
  }

  // ── FEWS NET ──
  const fewsData = live.fewsnet?.data || null;
  if (fewsData && fewsData[iso]) {
    const fews = fewsData[iso];
    if (fews.phase >= 3 && (!signals.ipcPhase || fews.phase > signals.ipcPhase)) {
      liveEvidenceCount++;
      evidenceSources.push("FEWS NET");
      signals.ipcPhase = fews.phase;
      signals.ipcTitle = fews.title || null;
      signals.ipcDate = fews.date || null;
    }
  }

  // ── ACLED Conflict ──
  const acledData = live.acled?.data || null;
  if (acledData && acledData[iso]) {
    const conflict = acledData[iso];
    if (conflict.events > 0) {
      liveEvidenceCount++;
      evidenceSources.push("ACLED");
      signals.acledEvents = conflict.events;
      signals.acledFatalities = conflict.fatalities || 0;
    }
  }

  // ── ReliefWeb Events ──
  const reliefData = live.reliefweb?.data || null;
  if (reliefData && reliefData[iso] && reliefData[iso] > 0) {
    liveEvidenceCount++;
    evidenceSources.push("ReliefWeb");
    signals.reliefwebCount = reliefData[iso];
  }

  // ── WHO Outbreaks ──
  const whoData = live.who?.data || null;
  if (whoData && whoData[iso] && whoData[iso].length > 0) {
    liveEvidenceCount++;
    evidenceSources.push("WHO");
    signals.whoOutbreaks = whoData[iso];
  }

  // ── World Bank ──
  const wbInflation = live.wb.inflation.data[iso] || null;
  const wbGdpGrowth = live.wb.gdpGrowth.data[iso] || null;
  const wbUnemployment = live.wb.unemployment.data[iso] || null;
  const wbRefugees = live.wb.refugees.data[iso] || null;
  const wbPoverty = live.wb.poverty.data[iso] || null;
  const wbPopulation = live.wb.population.data[iso] || null;
  
  if (wbPopulation && wbPopulation.value > 0) {
    liveEvidenceCount++;
    evidenceSources.push("WB Population");
    signals.population = wbPopulation.value;
  }
  
  if (wbInflation && wbInflation.value > 5) {
    liveEvidenceCount++;
    evidenceSources.push("WB Inflation");
    signals.wbInflation = wbInflation;
  }
  if (wbGdpGrowth && wbGdpGrowth.value < 0) {
    liveEvidenceCount++;
    evidenceSources.push("WB GDP");
    signals.wbGdpGrowth = wbGdpGrowth;
  }
  if (wbUnemployment && wbUnemployment.value > 10) {
    liveEvidenceCount++;
    evidenceSources.push("WB Unemployment");
    signals.wbUnemployment = wbUnemployment;
  }
  if (wbRefugees && wbRefugees.value > 1000) {
    liveEvidenceCount++;
    evidenceSources.push("WB Refugees");
    signals.wbRefugees = wbRefugees;
  }
  if (wbPoverty && wbPoverty.value > 5) {
    liveEvidenceCount++;
    evidenceSources.push("WB Poverty");
    signals.wbPoverty = wbPoverty;
  }

  // ── UNHCR ──
  const displacement = live.unhcr.data.displacement[iso] || null;
  const totalDisplaced = displacement ? (displacement.refugees||0) + (displacement.idps||0) + (displacement.asylum_seekers||0) : 0;
  if (totalDisplaced > 0) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR");
    signals.refugees = displacement?.refugees || 0;
    signals.idps = displacement?.idps || 0;
    signals.asylum_seekers = displacement?.asylum_seekers || 0;
    signals.totalDisplaced = totalDisplaced;
  }
  const unhcrOp = live.unhcr.data.operations[iso] || null;
  if (unhcrOp) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR Ops");
    signals.unhcrOp = unhcrOp;
  }
  const unhcrEmergency = live.unhcr.data.emergencies[iso] || null;
  if (unhcrEmergency) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR Emergency");
    signals.unhcrEmergency = unhcrEmergency;
  }
  const unhcrStats = live.unhcr.data.statistics[iso] || null;
  if (unhcrStats && unhcrStats.refugees > 0) {
    liveEvidenceCount++;
    evidenceSources.push("UNHCR Stats");
    signals.unhcrStats = unhcrStats;
  }

  return {
    quakeMag: signals.quakeMag || 0,
    quakePlace: signals.quakePlace || null,
    quakeCount: (quakes?.length || 0) + (emscQuakes?.length || 0),
    nasaEventCount: signals.nasaEventCount || 0,
    gdacs: signals.gdacs || null,
    gdacsAlert: signals.gdacsAlert || null,
    ifrcCount: signals.ifrcCount || 0,
    maxTempC: signals.maxTempC || 0,
    hazards: signals.hazards || null,
    aq: signals.aq || null,
    noaa: signals.noaa || null,
    diseaseActive: signals.diseaseActive || 0,
    diseaseName: signals.diseaseName || null,
    ipcPhase: signals.ipcPhase || 0,
    ipcPopulation: signals.ipcPopulation || 0,
    ipcTotalPop: signals.ipcTotalPop || 0,
    ipcTitle: signals.ipcTitle || null,
    ipcDate: signals.ipcDate || null,
    acledEvents: signals.acledEvents || 0,
    acledFatalities: signals.acledFatalities || 0,
    reliefwebCount: signals.reliefwebCount || 0,
    whoOutbreaks: signals.whoOutbreaks || [],
    population: signals.population || 0,
    wbInflation: signals.wbInflation || null,
    wbGdpGrowth: signals.wbGdpGrowth || null,
    wbUnemployment: signals.wbUnemployment || null,
    wbRefugees: signals.wbRefugees || null,
    wbPoverty: signals.wbPoverty || null,
    refugees: signals.refugees || 0,
    idps: signals.idps || 0,
    asylum_seekers: signals.asylum_seekers || 0,
    totalDisplaced: signals.totalDisplaced || 0,
    unhcrOp: signals.unhcrOp || null,
    unhcrEmergency: signals.unhcrEmergency || null,
    unhcrStats: signals.unhcrStats || null,
    liveEvidenceCount,
    evidenceSources,
  };
}

// ─── WORLD SYSTEMS THEORY ADJUSTMENTS ───────────────────────────────────────

function applyWSTAdjustments(dims, iso, signals, store) {
  if (!CFG.WST_ENABLED) return { dims, wst_audit: [] };
  
  const wst = COUNTRIES[iso]?.wst;
  if (!wst) return { dims, wst_audit: [] };
  
  const audit = [];
  let adjustedDims = { ...dims };
  
  // ── 1. STRUCTURAL EXTRACTION PENALTY ──
  // Periphery countries suffer from terms of trade disadvantages
  if (wst.extractive_penalty > 0) {
    const penalty = Math.min(20, wst.extractive_penalty);
    adjustedDims.economic = clamp(adjustedDims.economic + penalty * 0.6);
    adjustedDims.political = clamp(adjustedDims.political + penalty * 0.3);
    audit.push({
      source: "WST: Structural Extraction",
      field: "economic+political",
      delta: Math.round(penalty * 0.9),
      reason: `${wst.class} nation — terms of trade disadvantage (+${penalty})`,
      class: wst.class,
    });
  }
  
  // ── 2. DEBT SENSITIVITY TO GLOBAL RATES ──
  // When core interest rates rise, periphery suffers capital flight
  const globalRateTrend = calculateGlobalRateTrend();
  if (globalRateTrend !== 0) {
    const debtShock = Math.round(globalRateTrend * wst.debt_sensitivity * 8);
    if (Math.abs(debtShock) > 1) {
      adjustedDims.economic = clamp(adjustedDims.economic + debtShock);
      adjustedDims.food = clamp(adjustedDims.food + Math.floor(debtShock * 0.4));
      adjustedDims.political = clamp(adjustedDims.political + Math.floor(debtShock * 0.2));
      audit.push({
        source: "WST: Monetary Transmission",
        field: "economic+food+political",
        delta: debtShock,
        reason: `Global rate ${globalRateTrend > 0 ? "rise" : "drop"} (${globalRateTrend}%), debt sensitivity ${(wst.debt_sensitivity * 100).toFixed(0)}%`,
        class: wst.class,
      });
    }
  }
  
  // ── 3. TERMS OF TRADE SHOCK ──
  // Commodity price changes hit periphery harder
  const commodityShock = CFG.WST_COMMODITY_PRICE_INDEX - 100;
  if (Math.abs(commodityShock) > 5) {
    const totImpact = Math.round(commodityShock * (1 - wst.terms_of_trade_advantage) * 0.3);
    if (Math.abs(totImpact) > 1) {
      adjustedDims.economic = clamp(adjustedDims.economic + totImpact);
      adjustedDims.climate = clamp(adjustedDims.climate + Math.floor(totImpact * 0.2));
      audit.push({
        source: "WST: Terms of Trade",
        field: "economic+climate",
        delta: totImpact,
        reason: `Commodity index ${commodityShock > 0 ? "+" : ""}${commodityShock}%, ToT advantage ${(wst.terms_of_trade_advantage * 100).toFixed(0)}%`,
        class: wst.class,
      });
    }
  }
  
  // ── 4. MONETARY INFLUENCE ──
  // Core nations can print reserve currency; periphery cannot
  if (wst.monetary_influence < 0.5) {
    const monetaryPenalty = Math.round((0.5 - wst.monetary_influence) * 10);
    adjustedDims.economic = clamp(adjustedDims.economic + monetaryPenalty);
    adjustedDims.political = clamp(adjustedDims.political + Math.floor(monetaryPenalty * 0.4));
    audit.push({
      source: "WST: Monetary Sovereignty",
      field: "economic+political",
      delta: Math.round(monetaryPenalty * 1.4),
      reason: `No reserve currency — monetary influence ${(wst.monetary_influence * 100).toFixed(0)}%`,
      class: wst.class,
    });
  }
  
  // ── 5. SYSTEMIC CORE-PERIPHERY SPILLOVER ──
  // Crisis in core nations creates systemic shock to periphery
  const coreCrisisIndex = calculateCoreCrisisIndex(store);
  if (coreCrisisIndex > 50) {
    const systemicShock = Math.round((coreCrisisIndex - 50) * wst.debt_sensitivity * 0.4);
    if (systemicShock > 1) {
      adjustedDims.economic = clamp(adjustedDims.economic + systemicShock);
      adjustedDims.political = clamp(adjustedDims.political + Math.floor(systemicShock * 0.3));
      audit.push({
        source: "WST: Systemic Spillover",
        field: "economic+political",
        delta: systemicShock,
        reason: `Core crisis index ${coreCrisisIndex.toFixed(0)}/100, debt sensitivity ${(wst.debt_sensitivity * 100).toFixed(0)}%`,
        class: wst.class,
      });
    }
  }
  
  return { dims: adjustedDims, wst_audit: audit };
}

function calculateGlobalRateTrend() {
  // Simulate global interest rate changes based on Fed/ECB policy
  // In production, this would fetch from FRED/ECB APIs
  const baseRate = CFG.WST_GLOBAL_INTEREST_RATE || 5.5;
  const trend = (baseRate - 5.5) * 0.5; // Simplified: 1% rate change = 0.5 trend
  return Math.round(trend * 10) / 10;
}

function calculateCoreCrisisIndex(store) {
  const coreIsos = Object.keys(WST_CLASS).filter(iso => WST_CLASS[iso].class === "Core");
  if (coreIsos.length === 0) return 0;
  
  let totalScore = 0;
  let count = 0;
  for (const iso of coreIsos) {
    if (store[iso]) {
      totalScore += store[iso].score;
      count++;
    }
  }
  return count > 0 ? totalScore / count : 0;
}

// ─── LIVE ADJUSTMENTS ────────────────────────────────────────────────────

function applyLiveAdjustments(priorDims, signals, iso, store) {
  const dims = { ...priorDims };
  const audit = [];
  let totalBoost = 0;

  // ── 1. USGS/EMSC Earthquakes ──
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

  // ── 2. NASA EONET ──
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

  // ── 3. GDACS Alerts ──
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

  // ── 4. IFRC GO ──
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

  // ── 5. Extreme Heat ──
  if (signals.maxTempC >= 35) {
    const boost = Math.min(25, Math.round((signals.maxTempC - 28) * 2));
    dims.climate = clamp(dims.climate + Math.ceil(boost * 0.7));
    dims.health = clamp(dims.health + Math.floor(boost * 0.5));
    dims.food = clamp(dims.food + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "Open-Meteo", 
      field: "climate+health+food", 
      delta: boost, 
      reason: `${signals.maxTempC}°C extreme heat` 
    });
  }

  // ── 6. Weather Hazards ──
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

  // ── 7. Air Quality ──
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

  // ── 8. disease.sh ──
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

  // ── 9. WHO Outbreaks ──
  if (signals.whoOutbreaks && signals.whoOutbreaks.length > 0) {
    const boost = Math.min(20, signals.whoOutbreaks.length * 8);
    dims.health = clamp(dims.health + boost);
    dims.access = clamp(dims.access + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "WHO", 
      field: "health+access", 
      delta: boost, 
      reason: `${signals.whoOutbreaks.length} disease outbreaks detected` 
    });
  }

  // ── 10. World Bank: Inflation ──
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

  // ── 11. World Bank: GDP Growth ──
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

  // ── 12. World Bank: Unemployment ──
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

  // ── 13. World Bank: Poverty ──
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

  // ── 14. UNHCR Displacement ──
  if (signals.totalDisplaced > 0) {
    const m = signals.totalDisplaced / 1_000_000;
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

  // ── 15. UNHCR Emergency ──
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

  // ── 16. NOAA Alerts ──
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

  // ── 17. IPC Food Security ──
  if (signals.ipcPhase >= 3) {
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

  // ── 18. ACLED Conflict ──
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

  // ── 19. ReliefWeb Events ──
  if (signals.reliefwebCount && signals.reliefwebCount > 0) {
    const boost = Math.min(15, signals.reliefwebCount * 5);
    dims.access = clamp(dims.access + boost);
    dims.displacement = clamp(dims.displacement + Math.floor(boost * 0.3));
    totalBoost += boost;
    audit.push({ 
      source: "ReliefWeb", 
      field: "access+displacement", 
      delta: boost, 
      reason: `${signals.reliefwebCount} active humanitarian reports` 
    });
  }

  // ── 20. World Bank Refugees ──
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

  // ── 21. ML Anomaly Boost ──
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

  if (totalBoost > 0) {
    console.log(`📈 ${iso} live boost: +${totalBoost} (${audit.length} sources)`);
  }

  return { dims, score: clamp(composite(dims)), audit };
}

// ─── STORE BUILDER ──────────────────────────────────────────────────────

function buildStore(liveData) {
  const seed = Math.floor(Date.now() / CFG.SEED_INTERVAL_MS);
  const store = {};
  for (const [iso, country] of Object.entries(COUNTRIES)) {
    // Use the FSI score directly as the base (already 0-120 scale)
    // Map to 0-100 scale for our internal scoring (since FSI is 0-120)
    const fsiScore = country.fsi_score || country.prior || 50;
    const base = Math.round((fsiScore / 120) * 100);
    const jitter = Math.round((lcg(seed ^ strHash(iso)) - 0.5) * CFG.PRIOR_JITTER);
    const adjustedBase = clamp(base + jitter, 5, 99);
    
    const priorDims = buildPriorDims(adjustedBase, country.types);
    const priorScore = clamp(composite(priorDims));
    let dims, score, audit, signals, wst_audit;
    if (liveData) {
      signals = extractSignals(iso, liveData);
      const adjusted = applyLiveAdjustments(priorDims, signals, iso, store);
      dims = adjusted.dims;
      score = adjusted.score;
      audit = adjusted.audit;
      
      // Apply WST adjustments
      const wstResult = applyWSTAdjustments(dims, iso, signals, store);
      dims = wstResult.dims;
      wst_audit = wstResult.wst_audit;
      score = clamp(composite(dims));
    } else {
      dims = priorDims;
      score = priorScore;
      audit = [];
      signals = {};
      wst_audit = [];
    }
    store[iso] = {
      ...country,
      dims,
      score,
      priorScore,
      liveBoost: score - priorScore,
      audit,
      wst_audit,
      signals,
      spillover: 0,
      ml_forecast: null,
      sentiment: null,
      historical_trend: null,
      fsi_score: fsiScore,
      fsi_rank: country.fsi_rank,
      fsi_band: country.fsi_band,
      wst: country.wst,
    };
  }
  
  for (const iso in store) {
    const neighbours = (COUNTRIES[iso].adj || []).filter(n => store[n]);
    if (!neighbours.length) continue;
    const avgNb = neighbours.reduce((s, n) => s + store[n].score, 0) / neighbours.length;
    store[iso].spillover = +(Math.max(0, avgNb - CFG.SPILLOVER_FLOOR) * CFG.SPILLOVER_RATE).toFixed(1);
    store[iso].score = clamp(store[iso].score + store[iso].spillover);
  }
  
  if (CFG.ML_ENABLED) {
    trainMLModel(store);
  }
  
  for (const iso in store) {
    if (CFG.ML_ENABLED) {
      store[iso].ml_forecast = mlEnhancedForecast(iso, store[iso].score, store);
    }
    if (CFG.SENTIMENT_ENABLED) {
      store[iso].sentiment = analyzeCountrySentiment(iso, store);
    }
    if (CFG.HISTORY_ENABLED) {
      store[iso].historical_trend = historyStore.getTrend(iso, 30);
      storeHistoricalData(iso, store);
    }
    if (CFG.GEO_FENCING_ENABLED) {
      alertManager.checkAlerts(iso, store);
    }
  }
  
  return store;
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── ANOMALY DETECTION (Original functions) ──────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function detectCUSUM(arr) {
  if (arr.length < 6) return { detected: false, type: "cusum", stat: 0, direction: "stable" };
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
  if (arr.length < 6) return { detected: false, type:"zscore", stat:0, direction: "stable" };
  const baseline = arr.slice(0, -3), recent = arr.slice(-3);
  const mu = mean(baseline), sd = stddev(baseline);
  const z = (mean(recent) - mu) / sd;
  return { detected: Math.abs(z) >= CFG.ANOMALY_Z_THRESHOLD, type:"zscore", stat:+Math.abs(z).toFixed(2), direction: z > 0 ? "up" : "down" };
}

function detectChangepoint(arr) {
  if (arr.length < CFG.CHANGEPOINT_MIN_SEG * 2) return { detected: false, type:"changepoint", stat:0, direction: "stable" };
  const n = arr.length, mid = Math.floor(n / 2);
  const muA = mean(arr.slice(0, mid)), sdA = stddev(arr.slice(0, mid));
  const muB = mean(arr.slice(mid)),   sdB = stddev(arr.slice(mid));
  const kl = Math.log(sdB / sdA) + (sdA ** 2 + (muA - muB) ** 2) / (2 * sdB ** 2) - 0.5;
  return { detected: kl > 1.5, type:"changepoint", stat:+kl.toFixed(3), direction: muB > muA ? "up" : "down" };
}

function detectVolatilityRegime(arr) {
  if (arr.length < 8) return { detected: false, type:"volatility", stat:0, direction: "stable" };
  const half = Math.floor(arr.length / 2);
  const ratio = stddev(arr.slice(half)) / stddev(arr.slice(0, half));
  return { detected: ratio > CFG.VOLATILITY_RATIO_THRESHOLD, type:"volatility", stat:+ratio.toFixed(2), direction:"unstable" };
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
    fired.length >= 4 ? "EXTREME" :
    fired.length >= 3 ? "CRITICAL" :
    consensus && maxZ >= CFG.ANOMALY_Z_THRESHOLD * 1.5 ? "HIGH" :
    consensus ? "MODERATE" :
    fired.length === 1 ? "WATCH" : "NONE";
  return {
    detected: consensus,
    severity,
    direction,
    methods_fired: fired.length,
    methods,
    z_score: maxZ,
    note: consensus
      ? `${fired.length}/4 anomaly methods agree: ${direction} — ${severity}`
      : fired.length === 1 ? `Weak signal (1/4 methods): ${fired[0].type}` : "No anomaly detected",
  };
}

// ─── TREND FORECAST ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
//  ─── STORY HEAT ENGINE — newsworthiness, not just severity ────────────────
// ════════════════════════════════════════════════════════════════════════════

function computeStoryHeat(iso, store, hist, anom, mlForecast) {
  const c = store[iso];
  const s = c.signals || {};
  let heat = 0;
  const drivers = [];

  // ── Velocity ──
  const delta7 = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  if (Math.abs(delta7) >= 2) {
    const v = Math.min(30, Math.abs(delta7) * 2.2);
    heat += v;
    drivers.push({ driver: "velocity", points: +v.toFixed(1), detail: `${delta7 > 0 ? "+" : ""}${delta7.toFixed(0)} pts in 7 days` });
  }

  // ── Statistical anomaly consensus ──
  if (anom.detected) {
    const sevPts = { WATCH: 6, MODERATE: 14, HIGH: 20, CRITICAL: 25, EXTREME: 28 };
    const v = sevPts[anom.severity] || 8;
    heat += v;
    drivers.push({ driver: "anomaly", points: v, detail: `${anom.methods_fired}/4 methods — ${anom.severity}` });
  }

  // ── ML-predicted regime change ──
  if (mlForecast?.anomaly_probability > 0.4) {
    const v = Math.min(18, mlForecast.anomaly_probability * 22);
    heat += v;
    drivers.push({ driver: "ml_forecast", points: +v.toFixed(1), detail: `${(mlForecast.anomaly_probability * 100).toFixed(0)}% anomaly probability` });
  }

  // ── Fresh corroborating evidence ──
  const evidenceCount = s.liveEvidenceCount || 0;
  if (evidenceCount >= 2) {
    const v = Math.min(16, evidenceCount * 2.5);
    heat += v;
    drivers.push({ driver: "evidence_breadth", points: +v.toFixed(1), detail: `${evidenceCount} independent live sources` });
  }

  // ── Threshold-crossing events ──
  if (s.ipcPhase >= 4) {
    heat += 20;
    drivers.push({ driver: "ipc_threshold", points: 20, detail: `IPC Phase ${s.ipcPhase}` });
  } else if (s.quakeMag >= 6.0) {
    heat += 18;
    drivers.push({ driver: "major_quake", points: 18, detail: `M${s.quakeMag.toFixed(1)}` });
  } else if (s.gdacsAlert === "red") {
    heat += 16;
    drivers.push({ driver: "gdacs_red", points: 16, detail: "Red alert active" });
  } else if (s.acledFatalities > 100) {
    heat += 14;
    drivers.push({ driver: "conflict_spike", points: 14, detail: `${s.acledFatalities} fatalities` });
  }

  // ── WST Systemic Shock ──
  if (c.wst_audit && c.wst_audit.length > 0) {
    const wstImpact = c.wst_audit.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0);
    if (wstImpact > 5) {
      const v = Math.min(15, wstImpact * 1.2);
      heat += v;
      drivers.push({ driver: "wst_structural", points: +v.toFixed(1), detail: `${c.wst.class} structural adjustment: +${wstImpact.toFixed(0)} pts` });
    }
  }

  heat = Math.min(100, Math.round(heat));
  drivers.sort((a, b) => b.points - a.points);

  return {
    score: heat,
    is_breaking: heat >= 55,
    tier: heat >= 75 ? "BREAKING" : heat >= 55 ? "DEVELOPING" : heat >= 30 ? "NOTABLE" : "ROUTINE",
    top_drivers: drivers.slice(0, 3),
  };
}
function trendForecast(hist, current) {
  if (hist.length < 5) return { fc:current, trend:"stable", esc:false, slope:0, confidence:0.3 };
  const w = hist.slice(-10), n = w.length;
  const xBar = (n - 1) / 2, yBar = mean(w);
  const num = w.reduce((s, y, x) => s + (x - xBar) * (y - yBar), 0);
  const den = w.reduce((s, _, x) => s + (x - xBar) ** 2, 0);
  const slope = den ? +(num / den).toFixed(2) : 0;
  const fc = clamp(current + slope * 7);
  const residual = w.map((y, i) => y - (yBar + slope * (i - xBar)));
  const r2 = 1 - (residual.reduce((s, r) => s + r * r, 0) / w.reduce((s, y) => s + (y - yBar) ** 2, 0) || 1);
  return {
    fc,
    slope,
    trend: slope > 0.4 ? "escalating" : slope < -0.3 ? "improving" : "stable",
    esc: fc > current + 5,
    confidence: Math.max(0.3, Math.min(0.95, r2)),
  };
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

function severityColor(score) {
  return score >= 85 ? "#ff375f" : score >= 75 ? "#ff375f" : score >= 60 ? "#ff8c42" : score >= 40 ? "#ffb020" : "#6bc8ff";
}

function recommendation(score, anomaly) {
  const an = anomaly?.detected ? ` Statistical anomaly detected (${anomaly.severity}).` : "";
  if (score >= 85) return { tier:"IMMEDIATE", text:`Immediate humanitarian response required. All agencies mobilise.${an}` };
  if (score >= 75) return { tier:"URGENT",    text:`Urgent response needed. Mobilise resources now.${an}` };
  if (score >= 60) return { tier:"HIGH",      text:`Elevated concern. Prepare response and monitor daily.${an}` };
  if (score >= 40) return { tier:"MONITOR",   text:`Monitor situation. Maintain readiness.${an}` };
  return               { tier:"WATCH",     text:`Routine monitoring. No immediate action required.${an}` };
}

// ─── EXPORT CAPABILITIES ──────────────────────────────────────────────────

function generatePDFReport(iso, store) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  
  return {
    title: `${c.name} Crisis Report`,
    generated: new Date().toISOString(),
    score: c.score,
    severity: severityLabel(c.score),
    dimensions: c.dims,
    trend: fc,
    anomaly: anom,
    evidence: c.signals,
    wst: c.wst,
    wst_audit: c.wst_audit,
    recommendation: recommendation(c.score, anom),
  };
}

function generateExportData(iso, store, format = 'json') {
  const data = {
    iso,
    name: store[iso].name,
    timestamp: new Date().toISOString(),
    score: store[iso].score,
    dimensions: store[iso].dims,
    evidence: store[iso].signals,
    wst: store[iso].wst,
    wst_audit: store[iso].wst_audit,
    historical: historyStore.getHistory(iso, 30),
  };

  if (format === 'csv') {
    let csv = 'timestamp,score,displacement,economic,food,health,wst_class,wst_audit\n';
    for (const d of data.historical) {
      csv += `${new Date(d.timestamp).toISOString()},${d.score},${d.displacement||0},${d.economic||0},${d.food||0},${d.health||0},${data.wst?.class||""},"${JSON.stringify(data.wst_audit||[])}"\n`;
    }
    return csv;
  }
  return data;
}

function generateWidget(iso, store) {
  const c = store[iso];
  const wstClass = c.wst?.class || "Unclassified";
  const wstEmoji = wstClass === "Core" ? "🏛️" : wstClass === "Semi" ? "🏗️" : "🌾";
  return `<div class="gcin-widget" style="background:#0f1a30;border:1px solid #2d3a5e;border-radius:12px;padding:16px;font-family:system-ui;max-width:320px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:20px;">${c.flag}</span>
      <span style="font-weight:600;color:#fff;font-size:16px;">${c.name}</span>
      <span style="font-size:12px;background:rgba(255,255,255,0.06);padding:0 6px;border-radius:4px;color:#7c9ec0;">${wstEmoji} ${wstClass}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#7c9ec0;font-size:12px;">Crisis Score</span>
      <span style="color:#ff8a7a;font-size:20px;font-weight:700;">${c.score}/100</span>
    </div>
    <div style="width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:99px;margin:4px 0 8px;">
      <div style="height:100%;width:${c.score}%;background:${severityColor(c.score)};border-radius:99px;"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
      ${c.types.slice(0,3).map(t => `<span style="background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:4px;font-size:10px;color:#b8cce8;">${ARC[t]?.l || t}</span>`).join('')}
    </div>
    ${c.wst_audit && c.wst_audit.length > 0 ? `<div style="margin-top:4px;font-size:9px;color:#5a7a9a;">WST adjustment: ${c.wst_audit.reduce((s,a) => s + Math.abs(a.delta||0), 0)} pts</div>` : ''}
    <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.04);padding-top:8px;display:flex;justify-content:space-between;">
      <span style="font-size:10px;color:#5a7a9a;">${severityLabel(c.score)}</span>
      <a href="${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}" style="font-size:10px;color:#6bc8ff;text-decoration:none;">Read →</a>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function buildPayload(iso, store, ranked, opts = {}) {
  const c = store[iso];
  const hist = seedHistory(iso, c.score);
  const fc = trendForecast(hist, c.score);
  const anom = runAnomalyDetection(hist);
  const rank = ranked.indexOf(iso) + 1;
  const delta7 = Math.round(hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)]);
  const s = c.signals || {};
  const heat = computeStoryHeat(iso, store, hist, anom, c.ml_forecast);

  const base = {
    iso,
    name: c.name,
    flag: c.flag,
    score: c.score,
    severity: severityLabel(c.score),
    severity_emoji: severityEmoji(c.score),
    severity_color: severityColor(c.score),
    rank,
    total_countries: ranked.length,
    percentile: Math.round((1 - rank / ranked.length) * 100),
    slug: slugify(c.name),
    url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(c.name)}`,
    live_evidence_sources: s.evidenceSources || [],
    live_evidence_count: s.liveEvidenceCount || 0,
    is_live_data: s.liveEvidenceCount >= CFG.MIN_LIVE_EVIDENCE_SOURCES,
    dimensions: Object.fromEntries(DIMS.map(d => [d.k, { value: c.dims[d.k] || 0, label: d.l, weight: d.w, icon: d.icon }])),
    crisis_types: c.types.map(t => ({ code: t, label: ARC[t]?.l || t, icon: ARC[t]?.i || "⚠️", color: ARC[t]?.color || "#6bc8ff" })),
    needs: [...new Set(c.types.flatMap(t => ARC[t]?.n || []))],
    trend: {
      delta_7d: delta7,
      direction: fc.trend,
      slope: fc.slope,
      forecast_7d: fc.fc,
      escalating: fc.esc,
      confidence: fc.confidence,
    },
    anomaly: {
      detected: anom.detected,
      severity: anom.severity,
      direction: anom.direction,
      methods_fired: anom.methods_fired,
      z_score: anom.z_score,
      note: anom.note,
      methods: {
        cusum: anom.methods[0],
        zscore: anom.methods[1],
        changepoint: anom.methods[2],
        volatility: anom.methods[3],
      },
    },
    spillover: {
      value: c.spillover,
      from: (COUNTRIES[iso].adj || []).filter(n => store[n]?.score >= 50).map(n => ({ iso: n, name: store[n].name, score: store[n].score })),
    },
    story_heat: heat,
    world_systems_theory: {
      class: c.wst?.class || "Unclassified",
      debt_sensitivity: c.wst?.debt_sensitivity || 0,
      recovery_rate: c.wst?.recovery_rate || 0,
      extractive_penalty: c.wst?.extractive_penalty || 0,
      monetary_influence: c.wst?.monetary_influence || 0,
      terms_of_trade_advantage: c.wst?.terms_of_trade_advantage || 0,
      audit: c.wst_audit || [],
      structural_burden: c.wst_audit?.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0) || 0,
      emoji: c.wst?.class === "Core" ? "🏛️" : c.wst?.class === "Semi" ? "🏗️" : "🌾",
    },
    live_evidence: {
      earthquake: s.quakeMag >= 4.5 ? { magnitude: s.quakeMag, location: s.quakePlace, event_count: s.quakeCount, source: "USGS/EMSC" } : null,
      nasa_events: s.nasaEventCount > 0 ? { count: s.nasaEventCount, source: "NASA EONET" } : null,
      gdacs: s.gdacs ? { alert_level: s.gdacsAlert, source: "GDACS" } : null,
      ifrc: s.ifrcCount > 0 ? { count: s.ifrcCount, source: "IFRC GO" } : null,
      heat: s.maxTempC >= 35 ? { max_temp_c: s.maxTempC, source: "Open-Meteo" } : null,
      hazards: s.hazards ? { ...s.hazards, source: "Open-Meteo" } : null,
      air_quality: s.aq ? { ...s.aq, source: "Open-Meteo AQ" } : null,
      noaa: s.noaa ? { ...s.noaa, source: "NOAA" } : null,
      disease: s.diseaseActive > 0 ? { disease: s.diseaseName, active: s.diseaseActive, source: "disease.sh" } : null,
      who_outbreaks: s.whoOutbreaks && s.whoOutbreaks.length > 0 ? { outbreaks: s.whoOutbreaks, source: "WHO" } : null,
      reliefweb: s.reliefwebCount > 0 ? { reports: s.reliefwebCount, source: "ReliefWeb" } : null,
      economic: {
        inflation: s.wbInflation ? { ...s.wbInflation, source: "World Bank" } : null,
        gdp_growth: s.wbGdpGrowth ? { ...s.wbGdpGrowth, source: "World Bank" } : null,
        unemployment: s.wbUnemployment ? { ...s.wbUnemployment, source: "World Bank" } : null,
        poverty: s.wbPoverty ? { ...s.wbPoverty, source: "World Bank" } : null,
        refugees_wb: s.wbRefugees ? { ...s.wbRefugees, source: "World Bank" } : null,
      },
      displacement: s.totalDisplaced > 0 ? { total: s.totalDisplaced, refugees: s.refugees, idps: s.idps, asylum_seekers: s.asylum_seekers, source: "UNHCR" } : null,
      unhcr_operation: s.unhcrOp ? { ...s.unhcrOp, source: "UNHCR" } : null,
      unhcr_emergency: s.unhcrEmergency ? { ...s.unhcrEmergency, source: "UNHCR" } : null,
      unhcr_statistics: s.unhcrStats ? { ...s.unhcrStats, source: "UNHCR" } : null,
    },
    ml: c.ml_forecast ? {
      forecast: c.ml_forecast.fc,
      confidence: c.ml_forecast.confidence,
      anomaly_probability: c.ml_forecast.anomaly_probability,
      trained: c.ml_forecast.ml_trained,
      training_count: c.ml_forecast.training_count,
      wst_adjusted: c.ml_forecast.wst_adjusted,
    } : null,
    sentiment: c.sentiment ? {
      score: c.sentiment.score,
      label: c.sentiment.label,
      confidence: c.sentiment.confidence,
      crisis_intensity: c.sentiment.crisis_intensity,
      key_terms: c.sentiment.key_terms,
    } : null,
    historical: c.historical_trend ? {
      direction: c.historical_trend.direction,
      slope: c.historical_trend.slope,
      points: c.historical_trend.points,
      change: c.historical_trend.change,
    } : null,
    export: {
      pdf: generatePDFReport(iso, store),
      widget: generateWidget(iso, store),
    },
    score_audit: {
      prior_score: c.priorScore,
      adjustments: c.audit || [],
      wst_adjustments: c.wst_audit || [],
      spillover: c.spillover,
      final_score: c.score,
      live_boost: c.liveBoost,
      structural_burden: c.wst_audit?.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0) || 0,
    },
    recommendation: recommendation(c.score, anom),
    region: c.region,
    fsi: {
      score: c.fsi_score,
      rank: c.fsi_rank,
      band: c.fsi_band,
    },
  };

  if (opts.keywords) base.seo_keywords = buildKeywords(iso, store);
  if (opts.summary) base.meta_description = buildMetaDescription(iso, store);
  if (opts.schema) base.json_ld = buildJSONLD(iso, store, ranked);
  if (opts.related) base.related = buildRelatedStories(iso, store, ranked);
  if (opts.article) base.article = buildSEOArticle(iso, store, ranked);

  return base;
}

// ─── SEO HELPERS ──────────────────────────────────────────────────────────

function buildKeywords(iso, store) {
  const c = store[iso];
  const s = c.signals || {};
  const kws = new Set();
  const name = c.name;
  const wst = c.wst?.class || "";

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
  if (s.diseaseActive > 1000) { kws.add(`${name} COVID-19`); kws.add(`${name} coronavirus`); }
  if (s.wbInflation?.value > 10) { kws.add(`${name} inflation crisis`); kws.add(`${name} economic crisis`); }
  if (s.wbGdpGrowth?.value < 0) { kws.add(`${name} GDP contraction`); kws.add(`${name} recession`); }

  kws.add(`${c.region} humanitarian crisis`);
  kws.add(`${c.region} emergency`);

  kws.add(`what is happening in ${name}`);
  kws.add(`${name} crisis latest news`);
  kws.add(`${name} humanitarian situation`);
  kws.add(`how to help ${name} crisis`);
  kws.add(`${name} aid response`);
  kws.add(`${name} conflict update`);
  
  if (wst) {
    kws.add(`${name} ${wst.toLowerCase()} economy`);
    kws.add(`${wst} country crisis`);
    kws.add(`${name} structural vulnerability`);
  }

  return [...kws].slice(0, 35);
}

function buildMetaDescription(iso, store) {
  const c = store[iso];
  const s = c.signals || {};
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  const wst = c.wst?.class || "";
  
  let parts = [`${c.name} humanitarian crisis update: urgency score ${c.score}/100 (${severity}), ranked #${rank} globally`];
  if (wst) parts.push(`${wst} economy`);
  if (s.totalDisplaced > 0) parts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.diseaseActive > 1000) parts.push(`${s.diseaseActive.toLocaleString()} COVID-19 cases`);
  if (s.ipcPhase >= 3) parts.push(`IPC Phase ${s.ipcPhase} food insecurity`);
  if (s.quakeMag >= 4.5) parts.push(`M${s.quakeMag.toFixed(1)} earthquake`);
  
  return parts.slice(0, 4).join('. ') + '.';
}

function buildRelatedStories(iso, store, ranked) {
  const c = store[iso];
  return ranked
    .filter(r => r !== iso && (COUNTRIES[r].region === c.region || (COUNTRIES[iso].adj || []).includes(r)))
    .slice(0, 5)
    .map(r => ({
      iso: r,
      name: store[r].name,
      score: store[r].score,
      wst: store[r].wst?.class || "",
      slug: slugify(store[r].name),
      url: `${CFG.ARTICLE_BASE_URL}/crisis/${slugify(store[r].name)}`,
    }));
}

function buildJSONLD(iso, store, ranked) {
  const c = store[iso];
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date().toISOString();
  const severity = severityLabel(c.score);
  const keywords = buildKeywords(iso, store);
  const faqs = buildFAQs(iso, store, ranked);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        "headline": `${c.name} Crisis — Score ${c.score}/100 (${severity}) ${c.wst?.class ? `[${c.wst.class} Economy]` : ""}`,
        "description": buildMetaDescription(iso, store),
        "url": url,
        "datePublished": now,
        "dateModified": now,
        "author": { "@type": "Organization", "name": CFG.ARTICLE_AUTHOR, "url": CFG.ARTICLE_BASE_URL },
        "publisher": {
          "@type": "Organization",
          "name": CFG.ARTICLE_SITE_NAME,
          "url": CFG.ARTICLE_BASE_URL,
          "logo": { "@type": "ImageObject", "url": CFG.ARTICLE_LOGO },
        },
        "mainEntityOfPage": { "@type": "WebPage", "@id": url },
        "articleSection": "Humanitarian Crisis",
        "keywords": keywords.slice(0, 15).join(", "),
        "about": {
          "@type": "Place",
          "name": c.name,
          "geo": { "@type": "GeoCoordinates", "longitude": c.cent[0], "latitude": c.cent[1] },
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": CFG.ARTICLE_BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Crisis Hub", "item": `${CFG.ARTICLE_BASE_URL}/crisis` },
          { "@type": "ListItem", "position": 3, "name": c.name, "item": url },
        ],
      },
    ],
  };
}

function buildFAQs(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  const wst = c.wst || {};
  const faqs = [];

  faqs.push({
    q: `What is the current humanitarian situation in ${c.name}?`,
    a: `${c.name} currently has a crisis urgency score of ${c.score}/100, rated ${severity}, ranking #${rank} of ${Object.keys(store).length} countries monitored globally. ${c.types.map(t => ARC[t]?.l).filter(Boolean).slice(0, 2).join(" and ")} are the primary crisis drivers. This ${wst.class || ""} economy faces ${wst.extractive_penalty ? "significant structural extraction pressures" : "structural economic challenges"}.`,
  });

  if (s.totalDisplaced > 0) {
    faqs.push({
      q: `How many people have been displaced from ${c.name}?`,
      a: `UNHCR data indicates approximately ${fmtPop(s.totalDisplaced)} people have been displaced, including${s.refugees ? ` ${fmtPop(s.refugees)} refugees` : ""}${s.idps ? `, ${fmtPop(s.idps)} internally displaced persons (IDPs)` : ""}${s.asylum_seekers ? `, and ${fmtPop(s.asylum_seekers)} asylum-seekers` : ""}.`,
    });
  }

  if (s.ipcPhase >= 3) {
    faqs.push({
      q: `How many people are facing food insecurity in ${c.name}?`,
      a: `According to IPC Global classifications, approximately ${fmtPop(s.ipcTotalPop || s.ipcPopulation)} people in ${c.name} face Phase ${s.ipcPhase} (${s.ipcPhase >= 4 ? "Emergency" : "Crisis"}) levels of acute food insecurity.`,
    });
  }

  if (s.diseaseActive > 1000) {
    faqs.push({
      q: `What disease activity is being tracked in ${c.name}?`,
      a: `Live tracking shows ${s.diseaseActive.toLocaleString()} active COVID-19 cases in ${c.name}.`,
    });
  }

  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0) {
    faqs.push({
      q: `What is the economic situation in ${c.name}?`,
      a: `World Bank data${s.wbInflation ? ` shows inflation at ${s.wbInflation.value.toFixed(1)}%` : ""}${s.wbGdpGrowth?.value < 0 ? ` with GDP contraction of ${s.wbGdpGrowth.value.toFixed(1)}%` : ""}${!s.wbInflation && !s.wbGdpGrowth ? ' is under pressure' : ''}. As a ${wst.class || ""} economy, this reflects structural challenges in the global system.`,
    });
  }

  faqs.push({
    q: `What does World Systems Theory tell us about ${c.name}'s crisis?`,
    a: `${c.name} is classified as a ${wst.class || "Periphery"} economy in the global system. ${wst.class === "Core" ? "Core nations have monetary sovereignty and diversified economies, giving them resilience to shocks." : wst.class === "Semi" ? "Semi-periphery nations face extraction pressures but have some industrial capacity and monetary influence." : "Periphery nations face structural extraction, high debt sensitivity, and limited monetary sovereignty, making them highly vulnerable to global shocks."} The current structural burden is ${c.wst_audit?.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0) || 0} points.`,
  });

  faqs.push({
    q: `How can I help people affected by the crisis in ${c.name}?`,
    a: `You can support the humanitarian response in ${c.name} by donating to organisations active in the region, including UNHCR, WFP, UNICEF, MSF, and local NGOs. Advocacy for increased international funding and policy attention also makes a significant difference.`,
  });

  return faqs;
}

// ─── SEO ARTICLE GENERATOR ──────────────────────────────────────────────

function buildSEOArticle(iso, store, ranked) {
  const c = store[iso];
  const s = c.signals || {};
  const hist = seedHistory(iso, c.score);
  const anom = runAnomalyDetection(hist);
  const fc = trendForecast(hist, c.score);
  const rank = Object.keys(store).sort((a, b) => store[b].score - store[a].score).indexOf(iso) + 1;
  const severity = severityLabel(c.score);
  const slug = slugify(c.name);
  const url = `${CFG.ARTICLE_BASE_URL}/crisis/${slug}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const wst = c.wst || {};
  const wstEmoji = wst.class === "Core" ? "🏛️" : wst.class === "Semi" ? "🏗️" : "🌾";
  
  const topDims = [...DIMS].map(d => ({ ...d, val: c.dims[d.k] || 0 })).sort((a, b) => b.val - a.val);
  const delta = hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)];
  const trendWord = delta > 5 ? "rapidly deteriorating" : delta > 2 ? "worsening" : delta < -5 ? "significantly improving" : delta < -2 ? "improving" : "largely stable";
  const keywords = buildKeywords(iso, store);
  const faqs = buildFAQs(iso, store, ranked);

  const primaryTypes = c.types.slice(0, 2).map(t => ARC[t]?.l || t).join(" and ");
  
  // ── HEADLINE ENGINE ──
  const headlineCandidates = [];

  if (s.totalDisplaced > 1_000_000) {
    headlineCandidates.push({
      weight: 100 + Math.min(50, s.totalDisplaced / 200_000),
      text: `${fmtPop(s.totalDisplaced)} Displaced: Inside ${c.name}'s ${primaryTypes} Emergency ${wstEmoji} [${wst.class}]`,
    });
  }
  if (s.ipcPhase >= 4) {
    headlineCandidates.push({
      weight: s.ipcPhase === 5 ? 130 : 105,
      text: `${c.name} Food Crisis Hits IPC Phase ${s.ipcPhase}${s.ipcPhase === 5 ? " — Famine Classification" : " — Emergency Level"}: ${fmtPop(s.ipcTotalPop || s.ipcPopulation)} at Risk ${wstEmoji}`,
    });
  }
  if (s.gdacsAlert === "red") {
    headlineCandidates.push({
      weight: 115,
      text: `RED ALERT: ${c.name} Under Active GDACS Disaster Warning ${wstEmoji}`,
    });
  } else if (s.gdacsAlert === "orange") {
    headlineCandidates.push({
      weight: 90,
      text: `${c.name} Issued Orange Disaster Alert — What's Happening on the Ground ${wstEmoji}`,
    });
  }
  if (s.quakeMag >= 6.0) {
    headlineCandidates.push({
      weight: 95 + (s.quakeMag - 6) * 8,
      text: `M${s.quakeMag.toFixed(1)} Earthquake Strikes ${c.name}${s.quakePlace ? ` Near ${s.quakePlace}` : ""} — Live Emergency Tracker ${wstEmoji}`,
    });
  }
  if (s.acledFatalities > 50) {
    headlineCandidates.push({
      weight: 100 + Math.min(30, s.acledFatalities / 20),
      text: `${c.name} Conflict Escalates: ${s.acledFatalities.toLocaleString()} Fatalities From ${s.acledEvents} Recorded Events ${wstEmoji}`,
    });
  }
  if (s.whoOutbreaks?.length > 0) {
    headlineCandidates.push({
      weight: 85 + s.whoOutbreaks.length * 5,
      text: `WHO Confirms ${s.whoOutbreaks.map(o => o.disease[0].toUpperCase() + o.disease.slice(1)).join(" & ")} Outbreak in ${c.name} ${wstEmoji}`,
    });
  }
  if (s.diseaseActive > 5000) {
    headlineCandidates.push({
      weight: 70,
      text: `${c.name}'s Health System Strained by ${s.diseaseActive.toLocaleString()} Active COVID-19 Cases ${wstEmoji}`,
    });
  }
  if (anom.detected && anom.severity === "EXTREME") {
    headlineCandidates.push({
      weight: 110,
      text: `Data Alert: ${c.name} Crisis Trajectory Just Broke Pattern — ${anom.methods_fired}/4 Statistical Models Agree ${wstEmoji}`,
    });
  }
  if (c.ml_forecast?.anomaly_probability > 0.7) {
    headlineCandidates.push({
      weight: 90,
      text: `AI Forecast Flags ${c.name}: ${(c.ml_forecast.anomaly_probability * 100).toFixed(0)}% Anomaly Probability ${wstEmoji}`,
    });
  }
  if (delta > 8) {
    headlineCandidates.push({
      weight: 80 + delta,
      text: `${c.name} Crisis Score Jumps ${delta.toFixed(0)} Points in a Week — Now ${severity} ${wstEmoji}`,
    });
  }

  // WST-specific headlines
  if (wst.class === "Periphery" && c.wst_audit?.length > 0) {
    const burden = c.wst_audit.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0);
    if (burden > 10) {
      headlineCandidates.push({
        weight: 85,
        text: `${c.name}: ${burden} Points of Structural Burden — A ${wst.class} Economy Under Systemic Pressure ${wstEmoji}`,
      });
    }
  }

  headlineCandidates.push({
    weight: 10,
    text: `${c.name} Crisis Monitor ${now.getFullYear()}: Urgency Score ${c.score}/100 (${severity}), Ranked #${rank} Globally ${wstEmoji}`,
  });

  headlineCandidates.sort((a, b) => b.weight - a.weight);
  let headline = headlineCandidates[0].text;

  if (c.ml_forecast?.anomaly_probability > 0.6 && !headline.includes("Anomaly")) {
    headline += ` ⚡ AI Flags ${(c.ml_forecast.anomaly_probability * 100).toFixed(0)}% Anomaly Risk`;
  }

  // ── DEK ──
  const dekParts = [];
  if (s.totalDisplaced > 0 && !headline.includes("Displaced")) dekParts.push(`${fmtPop(s.totalDisplaced)} displaced`);
  if (s.ipcPhase >= 3 && !headline.includes("IPC")) dekParts.push(`IPC Phase ${s.ipcPhase} food insecurity`);
  if (s.acledEvents > 0 && !headline.includes("Fatalities")) dekParts.push(`${s.acledEvents} conflict events tracked`);
  if (fc.esc) dekParts.push(`7-day forecast: ${fc.fc}/100 (${fc.trend})`);
  if (wst.class) dekParts.push(`${wstEmoji} ${wst.class} economy`);
  dekParts.push(`Live data from 20+ sources · Updated ${dateStr}`);
  const dek = dekParts.slice(0, 3).join(" · ");

  const metaDescription = buildMetaDescription(iso, store);
  
  const paragraphs = [];

  const ledeHook = s.totalDisplaced > 1_000_000
    ? `More than ${fmtPop(s.totalDisplaced)} people have been forced from their homes in ${c.name}`
    : s.diseaseActive > 5000
    ? `Active COVID-19 case counts are stretching ${c.name}'s healthcare system`
    : s.quakeMag >= 6.0
    ? `A magnitude ${s.quakeMag.toFixed(1)} earthquake has struck ${c.name}, causing widespread damage`
    : `The humanitarian situation in ${c.name} has reached ${severity} levels`;

  paragraphs.push(`## Overview\n\n${ledeHook}, according to the latest live data compiled from 20+ global sources. Crisis Monitor's real-time urgency index places ${c.name} at **${c.score} out of 100**, rated **${severity}** and ranked **#${rank} of ${Object.keys(store).length} countries** tracked globally as of ${dateStr}.\n\nThis ${wst.class || "Periphery"} economy faces structural pressures including debt sensitivity of ${(wst.debt_sensitivity || 0) * 100}%, extraction penalty of ${wst.extractive_penalty || 0} points, and monetary influence of ${(wst.monetary_influence || 0) * 100}%.`);

  if (c.ml_forecast) {
    paragraphs.push(`## Machine Learning Forecast\n\nAdvanced AI analysis predicts a ${c.ml_forecast.trend} trajectory with ${Math.round(c.ml_forecast.confidence * 100)}% confidence. The model projects the score reaching **${c.ml_forecast.fc}/100** with an anomaly probability of ${(c.ml_forecast.anomaly_probability * 100).toFixed(0)}%. ${c.ml_forecast.wst_adjusted ? "This forecast incorporates World Systems Theory adjustments for structural recovery rates." : ""}`);
  }

  if (c.sentiment && c.sentiment.is_crisis) {
    paragraphs.push(`## Sentiment Analysis\n\nNews and humanitarian reporting sentiment for ${c.name} is **${c.sentiment.label}** (score: ${c.sentiment.score.toFixed(2)}), with a crisis intensity of ${(c.sentiment.crisis_intensity * 100).toFixed(0)}%. Key terms detected: ${c.sentiment.key_terms.slice(0, 5).join(', ')}.`);
  }

  if (c.historical_trend && c.historical_trend.points >= 5) {
    paragraphs.push(`## Historical Context\n\nOver the past ${c.historical_trend.points} data points, the crisis in ${c.name} has been **${c.historical_trend.direction}** at a rate of ${Math.abs(c.historical_trend.slope).toFixed(1)} points per week.`);
  }

  if (c.wst_audit && c.wst_audit.length > 0) {
    paragraphs.push(`## Structural Analysis (World Systems Theory)\n\n${c.name} is classified as a **${wst.class}** economy. The following structural adjustments have been applied:\n\n${c.wst_audit.map(a => `- **${a.source}**: ${a.reason} → ${a.delta > 0 ? "+" : ""}${a.delta} points to ${a.field}`).join("\n")}\n\nTotal structural burden: **${c.wst_audit.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0)} points**.`);
  }

  if (s.totalDisplaced > 0) {
    const parts = [];
    if (s.refugees) parts.push(`${fmtPop(s.refugees)} registered refugees`);
    if (s.idps) parts.push(`${fmtPop(s.idps)} internally displaced persons (IDPs)`);
    if (s.asylum_seekers) parts.push(`${fmtPop(s.asylum_seekers)} asylum-seekers`);
    paragraphs.push(`## Displacement\n\nUNHCR data records **${fmtPop(s.totalDisplaced)} people** displaced${parts.length ? `, comprising ${parts.join(", ")}` : ""}.`);
  }

  if (s.diseaseActive > 1000) {
    paragraphs.push(`## Public Health\n\nLive tracking shows **${s.diseaseActive.toLocaleString()} active COVID-19 cases** in ${c.name}.`);
  }

  if (s.whoOutbreaks && s.whoOutbreaks.length > 0) {
    const diseases = s.whoOutbreaks.map(o => o.disease).join(', ');
    paragraphs.push(`## Disease Outbreaks\n\nWHO reports active **${diseases}** outbreaks in ${c.name}.`);
  }

  if (s.ipcPhase >= 3) {
    const ipcLabel = s.ipcPhase === 5 ? "Catastrophe/Famine" : s.ipcPhase === 4 ? "Emergency" : "Crisis";
    paragraphs.push(`## Food Security Crisis\n\nThe Integrated Food Security Phase Classification (IPC) has classified ${c.name} at **Phase ${s.ipcPhase} (${ipcLabel})**. An estimated **${fmtPop(s.ipcTotalPop || s.ipcPopulation)} people** require urgent humanitarian food assistance.`);
  }

  if (s.wbInflation?.value > 5 || s.wbGdpGrowth?.value < 0) {
    const econParts = [];
    if (s.wbInflation) econParts.push(`inflation at **${s.wbInflation.value.toFixed(1)}%**`);
    if (s.wbGdpGrowth?.value < 0) econParts.push(`GDP contraction of **${s.wbGdpGrowth.value.toFixed(1)}%**`);
    paragraphs.push(`## Economic Pressure\n\nWorld Bank indicators show ${econParts.join(" and ")}, compounding humanitarian strain. As a ${wst.class} economy, these shocks are amplified by structural vulnerabilities.`);
  }

  if (s.gdacs || s.quakeMag >= 4.5) {
    const disasterLine = s.gdacs
      ? `GDACS has a **${s.gdacsAlert?.toUpperCase()} alert** for ${c.name}.`
      : `USGS/EMSC seismic monitoring recorded a **magnitude ${s.quakeMag.toFixed(1)} earthquake** near ${s.quakePlace || "the region"}.`;
    paragraphs.push(`## Disaster Alert\n\n${disasterLine}`);
  }

  if (s.acledEvents > 0) {
    paragraphs.push(`## Conflict Report\n\nACLED records **${s.acledEvents} conflict events** in ${c.name} with **${s.acledFatalities || 0} fatalities**.`);
  }

  if (anom.detected) {
    paragraphs.push(`## Statistical Alert: Anomaly Detected\n\nCrisis Monitor's ensemble anomaly detection flagged **${anom.methods_fired}/4 methods** in agreement: a statistically significant **${anom.direction}** trajectory (severity: **${anom.severity}**).`);
  }

  const dimRows = topDims.slice(0, 5).map(d => `- **${d.l}**: ${c.dims[d.k]}/100 (weight: ${(d.w * 100).toFixed(0)}%)`).join("\n");
  paragraphs.push(`## Urgency Score Breakdown\n\n${dimRows}\n\nAdjusted **${c.liveBoost > 0 ? "+" : ""}${c.liveBoost} points** from the prior estimate of ${c.priorScore}/100 based on live signals. Structural adjustments: **${c.wst_audit?.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0) || 0} points**.`);

  const needsList = [...new Set(c.types.flatMap(t => ARC[t]?.n || []))].slice(0, 5);
  paragraphs.push(`## Response Priorities\n\nRecommended response tier: **${recommendation(c.score, anom).tier}**: ${recommendation(c.score, anom).text}\n\nHumanitarian actors are calling for immediate action on: **${needsList.join(", ")}**.`);

  paragraphs.push(`## Frequently Asked Questions\n\n${faqs.map(f => `**${f.q}**\n\n${f.a}`).join("\n\n")}`);

  const articleBody = paragraphs.join("\n\n");
  const { words, minutes } = estimateReadTime(articleBody);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} | ${CFG.ARTICLE_SITE_NAME}</title>
  <meta name="description" content="${metaDescription}">
  <meta name="keywords" content="${keywords.slice(0, 20).join(", ")}">
  <meta name="author" content="${CFG.ARTICLE_AUTHOR}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${headline}">
  <meta property="og:description" content="${dek}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="${CFG.ARTICLE_SITE_NAME}">
  <meta property="og:image" content="${CFG.ARTICLE_LOGO}">
  <meta property="article:published_time" content="${now.toISOString()}">
  <meta property="article:section" content="Humanitarian Crisis">
  <meta property="article:tag" content="${keywords.slice(0, 6).join(", ")}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="${CFG.ARTICLE_TWITTER}">
  <meta name="twitter:title" content="${headline}">
  <meta name="twitter:description" content="${dek}">
  <meta name="twitter:image" content="${CFG.ARTICLE_LOGO}">
  <script type="application/ld+json">${JSON.stringify(buildJSONLD(iso, store, ranked), null, 2)}</script>
  <style>
    body { background: #030b18; color: #eef4ff; font-family: system-ui; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.7; }
    h1 { font-family: 'Georgia', serif; font-size: 2.5rem; font-weight: 800; }
    .severity-badge { display: inline-block; padding: 0.25rem 0.8rem; border-radius: 99px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .severity-badge.catastrophic { background: rgba(255,55,95,0.18); color: #ff375f; border: 1px solid rgba(255,55,95,0.35); }
    .severity-badge.critical { background: rgba(255,55,95,0.14); color: #ff375f; border: 1px solid rgba(255,55,95,0.3); }
    .severity-badge.high { background: rgba(255,140,66,0.14); color: #ff8c42; border: 1px solid rgba(255,140,66,0.3); }
    .severity-badge.elevated { background: rgba(255,176,32,0.12); color: #ffb020; border: 1px solid rgba(255,176,32,0.25); }
    .severity-badge.moderate { background: rgba(0,200,255,0.1); color: #6bc8ff; border: 1px solid rgba(0,200,255,0.2); }
    .urgency-score { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; padding: 0.5rem 0; border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); margin: 0.5rem 0 1rem; }
    .score-number { font-size: 2.5rem; font-weight: 800; }
    .score-denom { font-size: 1rem; color: #5a7a9a; }
    .score-label { font-size: 0.8rem; color: #5a7a9a; }
    .score-rank { font-size: 0.8rem; color: #5a7a9a; margin-left: auto; }
    .wst-badge { display: inline-block; background: rgba(191,127,255,0.12); color: #bf7fff; padding: 0.1rem 0.6rem; border-radius: 4px; font-size: 0.7rem; border: 1px solid rgba(191,127,255,0.15); }
    .article-meta { display: flex; gap: 1.5rem; font-size: 0.8rem; color: #5a7a9a; flex-wrap: wrap; }
    .article-body p { margin-bottom: 1rem; }
    .article-body h2 { font-family: 'Georgia', serif; font-size: 1.6rem; margin: 1.5rem 0 0.5rem; }
    .article-body h3 { font-family: 'Georgia', serif; font-size: 1.2rem; margin: 1rem 0 0.25rem; }
    .article-body ul { padding-left: 1.5rem; }
    .article-body li { margin-bottom: 0.25rem; color: #d8e6ff; }
    .article-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.04); font-size: 0.8rem; color: #5a7a9a; }
    .widget-container { background: #0f1a30; border: 1px solid #2d3a5e; border-radius: 12px; padding: 16px; max-width: 320px; margin-top: 1rem; }
    .ml-tag { display: inline-block; background: rgba(191,127,255,0.12); color: #bf7fff; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; border: 1px solid rgba(191,127,255,0.15); }
    .wst-tag { display: inline-block; background: rgba(107,200,255,0.12); color: #6bc8ff; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; border: 1px solid rgba(107,200,255,0.15); }
  </style>
</head>
<body>
  <article>
    <header>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
        <div class="severity-badge ${severity.toLowerCase()}">${severityEmoji(c.score)} ${severity}</div>
        <span class="wst-badge">${wstEmoji} ${wst.class || "Unclassified"}</span>
        ${c.wst_audit?.length > 0 ? `<span class="wst-tag">🔧 ${c.wst_audit.reduce((s,a) => s + Math.abs(a.delta||0), 0)} pts structural</span>` : ''}
      </div>
      <h1>${headline}</h1>
      <div class="article-meta">
        <time>${dateStr}</time>
        <span>${words} words</span>
        <span>${minutes} min read</span>
        <span>${CFG.ARTICLE_AUTHOR}</span>
        ${c.ml_forecast ? `<span class="ml-tag">🧠 ML Enhanced</span>` : ''}
        ${c.wst_audit?.length > 0 ? `<span class="wst-tag">🌍 WST Adjusted</span>` : ''}
      </div>
      <div class="urgency-score">
        <span class="score-number">${c.score}</span><span class="score-denom">/100</span>
        <span class="score-label">Urgency Score</span>
        <span class="score-rank">#${rank} of ${Object.keys(store).length} countries</span>
      </div>
      <p style="font-size:1.15rem; color: #d8e6ff; font-weight:500; margin-top:0.5rem;">${dek}</p>
      <p style="font-size:1rem; color: #8aa8c8; margin-top:0.25rem;">${metaDescription}</p>
    </header>
    <div class="article-body">
      ${articleBody.split('\n\n').filter(p => p.trim()).map(p => {
        if (p.startsWith('##')) {
          const level = p.match(/^##+/)[0].length;
          const text = p.replace(/^##+\s*/, '');
          return `<h${level}>${text}</h${level}>`;
        }
        if (p.startsWith('-')) {
          return `<ul>${p.split('\n').map(l => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')}</ul>`;
        }
        return `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
      }).join('')}
    </div>
    <div class="widget-container">
      ${generateWidget(iso, store)}
    </div>
    <footer class="article-footer">
      <p><strong>Data sources:</strong> USGS, EMSC, NASA EONET, GDACS, IFRC GO, Open-Meteo, NOAA, disease.sh, World Bank, UNHCR, IPC, FEWS NET, ACLED, ReliefWeb, WHO.</p>
      <p><strong>FSI 2024 Baseline:</strong> Fund for Peace, Fragile States Index 2024.</p>
      <p><strong>World Systems Theory:</strong> Structural adjustments applied based on Core/Semi/Periphery classification, debt sensitivity, monetary influence, and terms of trade.</p>
      <p><strong>Export:</strong> <a href="?iso=${iso}&export=csv" style="color:#6bc8ff;">CSV</a> · <a href="?iso=${iso}&export=json" style="color:#6bc8ff;">JSON</a> · <a href="?iso=${iso}&export=pdf" style="color:#6bc8ff;">PDF</a></p>
    </footer>
  </article>
</body>
</html>`;

return {
    headline,
    dek,
    slug,
    url,
    metaDescription,
    keywords,
    faqs,
    body_markdown: articleBody,
    body_html: html,
    word_count: words,
    read_time_minutes: minutes,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ─── MAIN HANDLER ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const start = Date.now();

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405, CORS);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

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
      article: url.searchParams.get("format") === "article",
      force_live: url.searchParams.get("force_live") !== "false",
      export: url.searchParams.get("export") || null,
      ml: url.searchParams.get("ml") !== "false",
      sentiment: url.searchParams.get("sentiment") !== "false",
      history: url.searchParams.get("history") !== "false",
      widget: url.searchParams.get("widget") === "true",
      breaking: url.searchParams.get("format") === "breaking",
      rss: url.searchParams.get("format") === "rss",
      wst: url.searchParams.get("wst") !== "false",
    };
    if (Number.isNaN(params.top)) params.top = 179;
    if (Number.isNaN(params.threshold)) params.threshold = 0;
    params.top = Math.min(CFG.MAX_TOP_N, Math.max(1, params.top));
  } catch {
    res.writeHead(400, CORS);
    res.end(JSON.stringify({ error: "Bad request URL" }));
    return;
  }

  if (params.region) {
    for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
      if (aliases.includes(params.region)) {
        params.region = canonical;
        break;
      }
    }
  }

  if (params.q && !params.iso) {
    const resolved = findIsoByName(params.q);
    if (!resolved) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({
        error: `Could not resolve "${params.q}"`,
        available: Object.entries(COUNTRIES).map(([iso, d]) => `${iso} (${d.name})`).sort(),
      }));
      return;
    }
    params.iso = resolved;
  }

  const isoList = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => COUNTRIES[s]) : [];
  const invalidISOs = params.iso ? params.iso.split(",").map(s => s.trim()).filter(s => !COUNTRIES[s]) : [];
  if (invalidISOs.length) {
    res.writeHead(404, CORS);
    res.end(JSON.stringify({
      error: `Unknown ISO codes: ${invalidISOs.join(", ")}`,
      available: Object.keys(COUNTRIES).sort(),
    }));
    return;
  }

  try {
    const priorStore = buildStore(null);
    const priorRanked = Object.keys(priorStore).sort((a, b) => priorStore[b].score - priorStore[a].score);

    let targetIsos;
    if (isoList.length) targetIsos = isoList;
    else if (params.region) targetIsos = priorRanked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) targetIsos = priorRanked.filter(iso => priorStore[iso].score >= params.threshold);
    else targetIsos = priorRanked.slice(0, params.top);

    if (!targetIsos.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: "No countries matched" }));
      return;
    }

    const liveData = await fetchAllLive(targetIsos);
    const store = buildStore(liveData);
    const ranked = Object.keys(store).sort((a, b) => store[b].score - store[a].score);

    let finalIsos;
    if (isoList.length) finalIsos = isoList;
    else if (params.region) finalIsos = ranked.filter(iso => COUNTRIES[iso].region === params.region);
    else if (params.threshold > 0) finalIsos = ranked.filter(iso => store[iso].score >= params.threshold);
    else finalIsos = ranked.slice(0, params.top);

    if (params.force_live) {
      finalIsos = finalIsos.filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= CFG.MIN_LIVE_EVIDENCE_SOURCES);

      if (finalIsos.length === 0) {
        const anyLive = Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= 1);
        if (anyLive.length > 0) {
          finalIsos = anyLive.sort((a, b) => store[b].score - store[a].score).slice(0, Math.min(params.top, anyLive.length));
        } else {
          res.writeHead(200, CORS);
          res.end(JSON.stringify({
            meta: {
              generated_at: new Date().toISOString(),
              elapsed_ms: Date.now() - start,
              mode: "empty",
              message: "No countries currently have live evidence from any tracked source.",
              min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
            },
            countries: [],
          }, null, 2));
          return;
        }
      }
    }

    if (params.export && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const data = generateExportData(iso, store, params.export);
      const contentType = params.export === 'csv' ? 'text/csv' : 'application/json';
      const filename = `${iso}_crisis_data.${params.export === 'csv' ? 'csv' : 'json'}`;
      res.writeHead(200, { ...CORS, 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` });
      res.end(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      return;
    }

    if (params.widget && finalIsos.length === 1) {
      const iso = finalIsos[0];
      const widget = generateWidget(iso, store);
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(widget);
      return;
    }

    for (const iso of Object.keys(store)) {
      const hist = seedHistory(iso, store[iso].score);
      const anom = runAnomalyDetection(hist);
      store[iso].__heat = computeStoryHeat(iso, store, hist, anom, store[iso].ml_forecast);
    }

    if (params.rss) {
      let rssIsos = finalIsos;
      if (!isoList.length && !params.region && params.threshold === 0) {
        rssIsos = Object.keys(store)
          .sort((a, b) => store[b].__heat.score - store[a].__heat.score)
          .slice(0, params.top || 30);
      }
      const feed = buildRSSFeed(rssIsos, store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" });
      res.end(feed);
      return;
    }

    if (params.breaking) {
      const heatRanked = Object.keys(store)
        .map(iso => ({ iso, heat: store[iso].__heat }))
        .filter(x => x.heat.score >= 20)
        .sort((a, b) => b.heat.score - a.heat.score)
        .slice(0, params.top || 20);

      const feed = heatRanked.map(({ iso, heat }) => {
        const p = buildPayload(iso, store, ranked, { summary: true });
        return {
          iso, name: p.name, flag: p.flag, url: p.url,
          score: p.score, severity: p.severity,
          story_heat: heat.score, tier: heat.tier, top_drivers: heat.top_drivers,
          headline_hint: p.meta_description,
          fsi_rank: p.fsi?.rank,
          fsi_band: p.fsi?.band,
          wst_class: p.world_systems_theory?.class || "Unclassified",
          structural_burden: p.world_systems_theory?.structural_burden || 0,
        };
      });

      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          elapsed_ms: Date.now() - start,
          mode: "breaking",
          methodology: "Story Heat = velocity + anomaly consensus + ML regime-change probability + evidence breadth + threshold crossings + WST structural burden.",
          fsi_source: "Fund for Peace, Fragile States Index 2024",
          wst_enabled: CFG.WST_ENABLED,
        },
        breaking: feed,
      }, null, 2));
      return;
    }

    if (params.format === "sitemap") {
      const opts = { keywords: params.keywords, related: params.related, schema: params.schema, summary: params.summary };
      const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, opts));
      res.writeHead(200, { ...CORS, "Content-Type": "application/xml; charset=utf-8" });
      res.end(buildSitemap(payloads));
      return;
    }

    if (params.format === "article" && finalIsos.length === 1) {
      const opts = { 
        keywords: params.keywords, 
        related: params.related, 
        schema: params.schema, 
        summary: params.summary,
        ml: params.ml,
        sentiment: params.sentiment,
        history: params.history,
      };
      const article = buildSEOArticle(finalIsos[0], store, ranked);
      res.writeHead(200, { ...CORS, "Content-Type": "text/html; charset=utf-8" });
      res.end(article.body_html);
      return;
    }

    const opts = {
      keywords: params.keywords,
      related: params.related,
      schema: params.schema,
      summary: params.summary,
      article: params.article,
      ml: params.ml,
      sentiment: params.sentiment,
      history: params.history,
      wst: params.wst,
    };
    const payloads = finalIsos.map(iso => buildPayload(iso, store, ranked, opts));

    const mode = isoList.length >= 2 ? "comparison" : finalIsos.length > 1 ? "list" : "single";

    let comparison = null;
    if (mode === "comparison" && finalIsos.length === 2) {
      const [a, b] = finalIsos.map(iso => {
        const c = store[iso];
        const hist = seedHistory(iso, c.score);
        const fc = trendForecast(hist, c.score);
        const anom = runAnomalyDetection(hist);
        return {
          iso, name: c.name, flag: c.flag, score: c.score,
          severity: severityLabel(c.score), rank: ranked.indexOf(iso) + 1,
          dimensions: Object.fromEntries(DIMS.map(d => [d.k, c.dims[d.k] || 0])),
          forecast_7d: fc.fc,
          anomaly_detected: anom.detected,
          anomaly_severity: anom.severity,
          live_evidence_count: c.signals?.liveEvidenceCount || 0,
          ml_forecast: c.ml_forecast,
          sentiment: c.sentiment,
          wst: c.wst,
          wst_audit: c.wst_audit,
          structural_burden: c.wst_audit?.reduce((sum, a) => sum + Math.abs(a.delta || 0), 0) || 0,
        };
      });
      comparison = {
        countries: [a, b],
        differentiators: DIMS.map(d => {
          const diff = a.dimensions[d.k] - b.dimensions[d.k];
          return { dimension: d.l, [a.iso]: a.dimensions[d.k], [b.iso]: b.dimensions[d.k], difference: diff };
        }).filter(d => Math.abs(d.difference) >= 10),
        verdict: `${a.flag} ${a.name} is more severe (${a.score} vs ${b.score})`,
        ml_insight: a.ml_forecast && b.ml_forecast ? `${a.name} ML anomaly: ${(a.ml_forecast.anomaly_probability * 100).toFixed(0)}% vs ${b.name}: ${(b.ml_forecast.anomaly_probability * 100).toFixed(0)}%` : null,
        wst_comparison: `${a.name} (${a.wst?.class || "Unclassified"}) vs ${b.name} (${b.wst?.class || "Unclassified"}) — structural burden ${a.structural_burden} vs ${b.structural_burden}`,
      };
    }

    const allAnomalies = Object.keys(store).filter(iso => runAnomalyDetection(seedHistory(iso, store[iso].score)).detected);
    const secsUntilNext = Math.floor((CFG.SEED_INTERVAL_MS - (Date.now() % CFG.SEED_INTERVAL_MS)) / 1000);
    
    const mlStats = {
      trained: mlModel.trained,
      training_count: mlModel.trainingCount,
      performance: mlModel.performance,
      last_update: new Date(mlModel.lastUpdate).toISOString(),
    };

    // WST Stats
    const wstStats = {
      enabled: CFG.WST_ENABLED,
      global_rate: CFG.WST_GLOBAL_INTEREST_RATE,
      commodity_index: CFG.WST_COMMODITY_PRICE_INDEX,
      core_count: Object.keys(WST_CLASS).filter(iso => WST_CLASS[iso].class === "Core").length,
      semi_count: Object.keys(WST_CLASS).filter(iso => WST_CLASS[iso].class === "Semi").length,
      periphery_count: Object.keys(WST_CLASS).filter(iso => WST_CLASS[iso].class === "Periphery").length,
      average_structural_burden: Object.values(store)
        .filter(c => c.wst_audit?.length > 0)
        .reduce((sum, c) => sum + c.wst_audit.reduce((s, a) => s + Math.abs(a.delta || 0), 0), 0) / Math.max(1, Object.values(store).filter(c => c.wst_audit?.length > 0).length),
    };

    const body = {
      meta: {
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        mode,
        countries_tracked: Object.keys(COUNTRIES).length,
        countries_with_live_evidence: Object.keys(store).filter(iso => (store[iso].signals?.liveEvidenceCount || 0) >= 1).length,
        anomalies_detected: allAnomalies.length,
        anomaly_isos: allAnomalies.slice(0, 20),
        score_seed: Math.floor(Date.now() / CFG.SEED_INTERVAL_MS),
        next_update: new Date((Math.floor(Date.now() / CFG.SEED_INTERVAL_MS) + 1) * CFG.SEED_INTERVAL_MS).toISOString(),
        data_policy: {
          type: "FSI 2024 Baseline + Live Data + World Systems Theory",
          min_live_evidence_sources: CFG.MIN_LIVE_EVIDENCE_SOURCES,
          fsi_source: "Fund for Peace, Fragile States Index 2024",
          fsi_scale: "0-120 (higher = more fragile)",
          wst_enabled: CFG.WST_ENABLED,
        },
        enhancements: {
          machine_learning: {
            enabled: CFG.ML_ENABLED,
            ...mlStats,
          },
          sentiment_analysis: {
            enabled: CFG.SENTIMENT_ENABLED,
            sources: CFG.SENTIMENT_SOURCES,
          },
          historical_data: {
            enabled: CFG.HISTORY_ENABLED,
            retention_days: CFG.HISTORY_RETENTION_DAYS,
          },
          geo_fencing: {
            enabled: CFG.GEO_FENCING_ENABLED,
            thresholds: alertManager.thresholds,
          },
          world_systems_theory: wstStats,
          export_capabilities: {
            formats: ['json', 'csv', 'pdf', 'widget'],
          },
        },
        data_sources: {
          usgs: { live: liveData.usgs.live, events: liveData.usgs.data?.length ?? 0, label: "USGS" },
          emsc: { live: liveData.emsc.live, events: liveData.emsc.data?.length ?? 0, label: "EMSC" },
          nasa: { live: liveData.nasa.live, events: liveData.nasa.data?.length ?? 0, label: "NASA EONET" },
          gdacs: { live: liveData.gdacs.live, events: liveData.gdacs.data?.length ?? 0, label: "GDACS" },
          ifrc: { live: liveData.ifrc.live, events: liveData.ifrc.data?.length ?? 0, label: "IFRC GO" },
          heat: { live: liveData.heat.live, countries: Object.keys(liveData.heat.data || {}).length, label: "Open-Meteo Heat" },
          hazards: { live: liveData.hazards.live, label: "Open-Meteo Hazards" },
          aq: { live: liveData.aq.live, cities: Object.keys(liveData.aq.data || {}).length, label: "Open-Meteo AQ" },
          noaa: { live: liveData.noaa.live, label: "NOAA" },
          disease: { live: liveData.disease.live, countries: liveData.disease.data?.length ?? 0, label: "disease.sh" },
          wb: {
            live: Object.values(liveData.wb).some(v => v.live),
            label: "World Bank",
          },
          unhcr: { live: liveData.unhcr.live, label: "UNHCR" },
          ipc: { live: liveData.ipc.live, label: "IPC" },
          fewsnet: { live: liveData.fewsnet.live, label: "FEWS NET" },
          acled: { live: liveData.acled.live, label: "ACLED" },
          reliefweb: { live: liveData.reliefweb.live, label: "ReliefWeb" },
          who: { live: liveData.who.live, label: "WHO" },
        },
        endpoints: {
          single: "GET /api/top-story",
          top_n: "GET /api/top-story?top=10",
          iso: "GET /api/top-story?iso=SOM",
          compare: "GET /api/top-story?iso=SOM,YEM",
          region: "GET /api/top-story?region=africa",
          threshold: "GET /api/top-story?threshold=70",
          search: "GET /api/top-story?q=somalia",
          article: "GET /api/top-story?iso=SOM&format=article",
          sitemap: "GET /api/top-story?top=50&format=sitemap",
          enriched: "GET /api/top-story?iso=SOM&keywords=true&related=true&schema=true&summary=true",
          export_json: "GET /api/top-story?iso=SOM&export=json",
          export_csv: "GET /api/top-story?iso=SOM&export=csv",
          widget: "GET /api/top-story?iso=SOM&widget=true",
          rss_feed: "GET /api/top-story?format=rss",
          rss_region: "GET /api/top-story?region=africa&format=rss",
          breaking: "GET /api/top-story?format=breaking",
        },
        anomaly_methodology: "4-method ensemble: CUSUM, Z-score, Bayesian changepoint, Volatility regime. Consensus threshold: 2/4 methods.",
        score_methodology: "Weighted 8-dimension composite. FSI 2024 baseline + live signals + regional spillover + WST structural adjustments.",
      },
      ...(mode === "single" ? { top_story: payloads[0] } : {}),
      ...(mode === "list" ? { countries: payloads } : {}),
      ...(mode === "comparison" && comparison ? { comparison } : {}),
    };

    res.writeHead(200, {
      ...CORS,
      "Cache-Control": `public, s-maxage=${secsUntilNext}, stale-while-revalidate=30`,
    });
    res.end(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error("[top-story v9.0]", err);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
  }
}

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
      <news:title>${p.name} Crisis — Score ${p.score}/100 (${p.severity}) ${p.world_systems_theory?.class ? `[${p.world_systems_theory.class}]` : ""}</news:title>
      <news:keywords>${(p.seo_keywords || []).slice(0, 10).join(", ")}</news:keywords>
    </news:news>
  </url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;
}

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── RSS / GOOGLE NEWS FEED ──────────────────────────────────────────────

function buildRSSFeed(finalIsos, store, ranked) {
  const now = new Date();
  const MAX_ITEMS = 30;

  const items = finalIsos.slice(0, MAX_ITEMS).map(iso => {
    const article = buildSEOArticle(iso, store, ranked);
    const c = store[iso];
    const categories = [...new Set(c.types.map(t => ARC[t]?.l || t))];
    const heat = c.__heat;
    const wst = c.wst?.class || "Unclassified";

    return `
  <item>
    <title>${escapeXml(article.headline)}</title>
    <link>${article.url}</link>
    <guid isPermaLink="true">${article.url}</guid>
    <pubDate>${now.toUTCString()}</pubDate>
    <description>${escapeXml(article.dek || article.metaDescription)}</description>
    ${categories.map(cat => `<category>${escapeXml(cat)}</category>`).join("\n    ")}
    ${heat ? `<category>Story Heat: ${heat.tier}</category>` : ""}
    <category>FSI 2024: ${c.fsi_band || "Not ranked"}</category>
    <category>WST: ${wst}</category>
    ${c.wst_audit?.length > 0 ? `<category>Structural Burden: ${c.wst_audit.reduce((s,a) => s + Math.abs(a.delta||0), 0)} pts</category>` : ""}
    <media:content url="${CFG.ARTICLE_LOGO}" medium="image"/>
    <content:encoded><![CDATA[${article.body_html}]]></content:encoded>
  </item>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${CFG.ARTICLE_SITE_NAME}</title>
  <link>${CFG.ARTICLE_BASE_URL}</link>
  <atom:link href="${CFG.ARTICLE_BASE_URL}/api/top-story?format=rss" rel="self" type="application/rss+xml"/>
  <description>Live, sensor-driven global humanitarian crisis intelligence — with FSI 2024 baseline from Fund for Peace and World Systems Theory structural adjustments.</description>
  <language>en-us</language>
  <lastBuildDate>${now.toUTCString()}</lastBuildDate>
  <ttl>5</ttl>
${items}
</channel>
</rss>`;
}
