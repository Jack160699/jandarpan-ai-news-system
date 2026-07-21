# Jan Darpan — Petrol & Diesel provider audit

**Date:** 2026-07-21  
**Branch context:** `feat/jandarpan-reader-design-system`  
**Scope:** Investigation only — **no implementation, no env vars, no deploy, no merge**

Goal: find an honest source for Chhattisgarh retail petrol/diesel (Raipur / Bhilai / Durg) suitable for Reader DS A1 utilities, without inventing prices or violating provider terms.

---

## Executive summary

| Provider | Public developer API? | City-wise CG usable today? | Verdict |
|----------|----------------------|----------------------------|---------|
| **PPAC** | No | State/metro RSP sheets & build-ups, not a live city feed | Good **reference / attribution** source; not a live A1 feed |
| **Indian Oil (IOCL)** | No (consumer SMS + app + HTML) | **Raipur** specimen dealer code documented; Bhilai/Durg via outlet codes | Best **consumer-official** channel; not a stable machine API |
| **BPCL** | No (SMS + app + HTML) | Outlet-level via dealer code; no published CG specimen list as complete as IOCL | Same class as IOCL |
| **HPCL** | **Yes, but gated** — ULIP “Fuel Station & Pricing Visibility” | Potentially nationwide HPCL stations incl. CG if ULIP grants access | **Best candidate for a licensed machine feed** — only after ULIP/HPCL approval |

**Recommendation:** Treat **HPCL-via-ULIP** as the preferred *licensed API path* to pursue commercially. Until that access (and display rights) are confirmed in writing, **omit petrol/diesel tiles** (current honest posture) or show only a **non-numeric deep-link/SMS help** to official OMC channels. Do **not** scrape third-party fuel sites or unofficial “fuel APIs.”

---

## Shared market context (all OMCs)

- India uses **daily dynamic pricing** for petrol/diesel; revisions typically take effect around **06:00 IST**.
- Retail Selling Price (RSP) varies by **state taxes**, freight, and **outlet**; city “average” is not always official.
- OMCs publish **indicative** location prices; boards at pumps remain the consumer authority.
- Third-party scrapers (Goodreturns, petroldieselprice.com, hobby GitHub APIs, PurePriceIO, etc.) are **not** treated as official Jan Darpan sources unless separately licensed.

---

## 1. PPAC (Petroleum Planning & Analysis Cell)

| Question | Finding |
|----------|---------|
| Official API? | **No** public REST/JSON API for daily city RSP discovered |
| JSON / XML / HTML? | **HTML portal** + downloadable **PDF / spreadsheet** artefacts (price build-up, RSP tables, ready reckoners) |
| Authentication? | Public website browsing; no developer key product |
| Rate limits? | N/A for API; portal/download usage subject to normal site policy |
| Licensing / commercial use? | Government open information for public use; **redistribution should attribute PPAC / MoPNG**; not a live commercial data product with SLA |
| Attribution required? | **Yes** — cite PPAC / Ministry of Petroleum & Natural Gas |
| City-wise pricing? | **Limited** — emphasis on Delhi build-ups and selected location RSPs, not full CG city grid |
| Chhattisgarh / Raipur / Bhilai / Durg? | State-level RSP/build-up tables may appear in PPAC artefacts **as per IOC/BPC/HPC**; **not confirmed as a daily machine-readable CG city feed** |
| Update frequency? | Periodic statistical/publication cadence (daily Delhi RSP PDFs observed on homepage; not a streaming feed) |
| Freshness timestamp? | Document “as on &lt;date&gt;” on PDFs/pages |
| Failure modes? | Stale PDFs; “Loading…” portal widgets; no programmatic schema |

**Sources:** [ppac.gov.in](https://ppac.gov.in/home), [RSP / price build-up](https://ppac.gov.in/retail-selling-price-rsp-of-petrol-diesel-and-domestic-lpg/price-build-up-of-petrol-and-diesel)

**Role for Jan Darpan:** Attribution + occasional editorial context — **not** A1 live tiles.

---

## 2. Indian Oil (IOCL)

| Question | Finding |
|----------|---------|
| Official API? | **No** public developer JSON/XML API |
| JSON / XML / HTML? | **HTML** (`iocl.com/petrol-diesel-price`); consumer **SMS**; **Fuel@IOC** mobile app |
| Authentication? | None for SMS/HTML; app store install for app |
| Rate limits? | SMS carrier / abuse limits (not published as API quotas) |
| Licensing / commercial use? | Consumer information service; **automated harvesting of SMS/app for commercial republication is not an offered license** |
| Attribution required? | If quoting IOCL figures: attribute **Indian Oil** + date; note “indicative” |
| City-wise pricing? | **Yes (indicative)** via dealer codes |
| Chhattisgarh? | **Yes** — Raipur listed in IOCL specimen dealer-code tables |
| Raipur? | **Yes** — specimen SMS: `RSP 169751` → `92249 92249` (widely republished from IOCL list; confirm on live IOCL page before product use) |
| Bhilai / Durg? | **No fixed specimen codes** in the metro/state-capital list; use **outlet dealer codes displayed at pumps** or Fuel@IOC locator |
| Update frequency? | Daily revision ~**06:00 IST** |
| Freshness timestamp? | SMS/app response for “today”; IOCL states prices may vary outlet-to-outlet |
| Failure modes? | SMS delay/failure; wrong dealer code; outlet variance; website HTML changes; no SLA for publishers |

**Sources:** [IOCL petrol-diesel price](https://iocl.com/petrol-diesel-price); press summaries of dealer-code list including Raipur `RSP 169751`

**Role for Jan Darpan:** Honest **consumer redirect** (“Check Raipur IOCL indicative price via SMS / Fuel@IOC”). **Not** a server-side feed without a separate commercial agreement.

---

## 3. Bharat Petroleum (BPCL)

| Question | Finding |
|----------|---------|
| Official API? | **No** public developer API |
| JSON / XML / HTML? | **HTML** petro-prices / pump locator pages; **SMS**; **SmartDrive** app |
| Authentication? | None for SMS/HTML |
| Rate limits? | SMS / website only |
| Licensing / commercial use? | Consumer service; no public redistribution API license found |
| Attribution required? | Attribute **BPCL** + date if quoting |
| City-wise pricing? | Outlet / locator oriented |
| Chhattisgarh / Raipur / Bhilai / Durg? | **Possible via dealer codes / locator**, but **no complete public specimen CG city table** equivalent to IOCL’s published list found in this audit |
| Update frequency? | Daily dynamic pricing (~06:00 IST) |
| Freshness timestamp? | SMS/app “today” |
| Failure modes? | Same class as IOCL; HTML “Click to know Prices” UX not machine-stable |

**Sources:** [BPCL petro prices](https://www.bharatpetroleum.in/our-businesses/fuels-and-services/petro-prices); SMS format `RSP <Dealer Code>` → `9223112222` (press + BPCL consumer guidance)

---

## 4. Hindustan Petroleum (HPCL)

| Question | Finding |
|----------|---------|
| Official API? | **Yes for logistics integrators** — HPCL APIs on **ULIP** (Unified Logistics Interface Platform) for **fuel station location + pricing visibility**. Not an anonymous open API. |
| Consumer web? | **HTML** + downloadable price build-up files; interactive RSP map mentioned on [price buildup](https://www.hindustanpetroleum.com/pricebuildup) |
| JSON / XML / HTML? | ULIP: **API-based** (JSON-style government integrations; exact schema behind registration). Consumer site: HTML/PDF/XLS |
| Authentication? | **ULIP organisation registration** (`goulip.in` ecosystem) + approval; not a free browser key |
| Rate limits? | Platform-governed (not publicly detailed in press notes) |
| Licensing / commercial use? | Aimed at **logistics / private-sector ULIP participants**; news-media display rights **must be confirmed in ULIP/HPCL terms before use** |
| Attribution required? | Expect **HPCL + ULIP** attribution if approved |
| City-wise / CG cities? | Station-level nationwide pricing visibility claimed in PIB/ET coverage — **likely includes CG stations if access granted**; not verified live in this audit |
| Update frequency? | Described as **real-time / near real-time station pricing** for logistics (stronger than daily PDF) |
| Freshness timestamp? | API responses expected to carry observation time (confirm in ULIP docs after access) |
| Failure modes? | Registration denial; logistics-only use restriction; HPCL-only coverage (not IOCL/BPCL); outages; schema change |

**Sources:** PIB / Economic Times / ET Government coverage of HPCL–NLDS ULIP integration (Dec 2024); HPCL price buildup page

**Role for Jan Darpan:** **Primary official API pursuit** for fuel — contingent on ULIP onboarding + written permission to show prices in a consumer news product.

---

## CG city coverage matrix (audit-time)

| City | PPAC | IOCL | BPCL | HPCL consumer web | HPCL ULIP (if approved) |
|------|------|------|------|-------------------|-------------------------|
| Raipur | Indirect / state sheets | **Specimen code known** | Outlet/locator | Map/build-up (select locations) | Likely station-level |
| Bhilai | Unclear | Outlet code / app | Outlet/locator | Unclear | Likely station-level |
| Durg | Unclear | Outlet code / app | Outlet/locator | Unclear | Likely station-level |

---

## Ranking — best provider

1. **HPCL via ULIP** — only candidate with an **official machine API** narrative and station-level pricing; requires registration + legal OK for news display.  
2. **IOCL** — best **documented consumer channel** for Raipur indicative price (SMS/app); not an API.  
3. **BPCL** — parallel consumer channel; weaker published CG specimen list.  
4. **PPAC** — authoritative **macro/build-up** publisher; wrong tool for daily A1 tiles.

---

## Honest implementation strategy (no ToS-violating scrape)

Until a licensed feed exists:

1. **Keep petrol/diesel tiles omitted** (current Reader DS honest default).  
2. Optional non-numeric UX (if product wants a fuel affordance):  
   - “पेट्रोल / डीज़ल — आधिकारिक भाव देखें” linking to IOCL / BPCL / HPCL official pages or app stores  
   - Or document SMS instructions for Raipur IOCL (`RSP 169751` → `92249 92249`) with disclaimer that prices are **indicative** and may vary by outlet  
3. **Do not** scrape Goodreturns, petroldieselprice.com, or unlicensed “fuel APIs.”  
4. **Do not** reverse-engineer OMC apps or automate SMS at scale without written permission.  
5. If pursuing ULIP: register entity → request HPCL Fuel Station & Pricing API → obtain **written** confirmation that **consumer news display** is allowed → then design server-side provider with attribution, `reportedAt`, and unavailable states (same honesty pattern as mandi/weather).  
6. Multi-OMC “city average” must **never** be invented from mixed scraped sources.

---

## Failure modes to plan for (when implementing later)

- Missing license / ULIP denial → omit tile  
- Stale station timestamp → label date or omit  
- HPCL-only coverage → label “HPCL outlets” not “all pumps”  
- Raipur SMS vs Bhilai/Durg missing codes → district-specific unavailable  
- Outlet variance → never claim single city price as universal  

---

## Decision for release blocker

| Item | Status |
|------|--------|
| Honest live petrol/diesel feed ready to ship | **No** |
| Recommended path | **ULIP + HPCL** (licensed) **or remain omitted** |
| Scraping strategy | **Rejected** |

Related: `docs/jandarpan-release-blocker-a1-weather-market.md`, `docs/jandarpan-release-blocker-market-rates.md`
