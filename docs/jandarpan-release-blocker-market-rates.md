# Release blocker — Market / rates

**Branch:** `feat/jandarpan-reader-design-system`  
**Date:** 2026-07-21  
**Overall market/rates verdict:** **PARTIALLY CLOSED** (platform ready; feeds externally gated)

---

## What shipped

| Feed | Status |
|------|--------|
| AGMARKNET mandi (data.gov.in) | **Implemented** (live-fetch; no DB history) |
| Verified rates schema + hardening | **Applied** on `giiuqshoconjbpiueasp` |
| Multi-family consensus + adapters | **Implemented** (gated) |
| History APIs / graphs / SEO pages | **Implemented** (prior commit) |
| Gold / silver live numbers | **DISPLAY_PERMISSION_REQUIRED** + credentials |
| Diesel / petrol live numbers | **CREDENTIALS_REQUIRED** + second family |
| Sensex / Nifty / FX | Omitted |
| Weather (Open-Meteo) | Unchanged — still live |

---

## Category verdicts (activation phase)

| Category | Verdict |
|----------|---------|
| Petrol | **CREDENTIALS_REQUIRED** (+ second family → else **INSUFFICIENT_ELIGIBLE_SOURCES**) |
| Diesel | **CREDENTIALS_REQUIRED** (+ second family → else **INSUFFICIENT_ELIGIBLE_SOURCES**) |
| Gold 24K | **DISPLAY_PERMISSION_REQUIRED** / **CREDENTIALS_REQUIRED** |
| Gold 22K | **DISPLAY_PERMISSION_REQUIRED** / **CREDENTIALS_REQUIRED** |
| Silver 999 | **DISPLAY_PERMISSION_REQUIRED** / **CREDENTIALS_REQUIRED** |

Stability gate: **PENDING_STABILITY_GATE** (scheduler configured; seven genuine runs not yet elapsed).  
Production Reader DS / rates: **unchanged / disabled**.

---

## Remaining external actions

1. ULIP credentials + enable on **Preview** only  
2. Second licensed fuel family credentials  
3. IBJA token + written republication consent  
4. Two additional bullion families (or keep bullion unpublished)  
5. Complete seven scheduled Preview runs before any Production consideration  

Until then public rate pages correctly show blocked/unavailable + methodology. **No fabricated prices.**
