# Jan Darpan — Gold & Silver provider audit

**Date:** 2026-07-21  
**Branch context:** `feat/jandarpan-reader-design-system`  
**Scope:** Investigation only — **no implementation, no env vars, no deploy, no merge**

Goal: identify an officially licensed Indian bullion rate source suitable for Reader DS A1 tiles (सोना / चांदी), without inventing prices or violating redistribution terms.

---

## Executive summary

| Provider | Official API? | Suitable for news display? | Verdict |
|----------|---------------|----------------------------|---------|
| **IBJA (official Rates API)** | **Yes** — JSON REST, paid, ACCESS_TOKEN | **Only with prior written consent to publish** | **Recommended provider** — legal gate first |
| Unofficial scrapers / “MCX HTML” / jeweller site scrapes | No / ToS-hostile | No | Rejected |
| Generic global metal APIs (LBMA/XAUUSD converters) | Often yes | Wrong product for Indian retail jewellery benchmark | Rejected for A1 “India gold rate” |

**Recommendation:** Contract **IBJA Rates API** (`indiagoldratesapi.com` / `ibjarates.com`) as the sole bullion provider — **after** obtaining **written permission to display rates on jandarpan.news / Reader DS**. Without that consent, keep gold/silver tiles **omitted**.

---

## 1. IBJA — India Bullion and Jewellers Association

### What it is

- 100+ year association (Zaveri Bazar, Mumbai).
- Publishes India’s **benchmark** daily gold **opening (AM)** and **closing (PM)** rates, plus **silver 999**.
- Cited in RBI / MoF contexts (Sovereign Gold Bonds, gold-loan valuation guidance) — see notices linked from IBJA’s API site.

### Official API?

| Item | Detail |
|------|--------|
| Official API? | **Yes** — marketed as India’s official IBJA Gold & Silver Rates API |
| Sites | [indiagoldratesapi.com](https://www.indiagoldratesapi.com/), [ibjarates.com](https://www.ibjarates.com/) |
| Format | **JSON** (REST) |
| Auth | `ACCESS_TOKEN` query parameter (per-subscriber key) |
| Environments | Production + UAT; encrypted and non-encrypted endpoints |
| Example shape (docs) | `RateDate`, `RateTime` (`12AM` / PM), `Purity`, `GoldRate`, `SilverRate` |
| Date format | `dd/MM/yyyy` |
| AM/PM updates? | **Yes** — published ~**12:30** and **18:30** IST (docs also note ~12:10 / 18:10 hit-limit copy); **not** on Sat/Sun/bank holidays |
| Rate limits? | Production **~40 hits**; UAT **~100 hits** (docs: rates refresh twice daily — polling beyond that is unnecessary) |
| Query window | Docs: out-of-range error if asking beyond ~**30 days** from current date without historic purchase |

### Purities & silver

| Metal | Purities |
|-------|----------|
| Gold | **999**, **995**, **916** (22K), **750** (18K), **585** (14K) |
| Silver | **999** |

### Units & GST

| Item | Finding |
|------|---------|
| Units | Rates returned as numeric strings (e.g. gold per **10 grams** convention in Indian retail — **confirm unit wording in signed contract / sample payload**; FAQ focuses on purity, not always repeating “per 10g” in every page) |
| GST included? | **No** — FAQ: rates **do not include GST, other taxes, or making charges** |
| City / state rates? | **No** — **One India, One Rate**; not Raipur-specific jewellery shop rates |

### Licensing / commercial use / redistribution (critical)

From IBJA FAQ ([Faqs.aspx](https://www.indiagoldratesapi.com/Faqs.aspx)):

| Question | IBJA position |
|----------|----------------|
| Free? | **No** — paid subscription, **minimum 1 year** |
| Commercial use? | Sold to banks, NBFCs, fintech, “Others” via application form |
| Store in DB? | **Yes** for **internal** consumption / reports |
| **Publish on website / redistribute / resell?** | **Forbidden without prior written consent** — even after subscription ends; legal action threatened |
| Share one license across group companies? | **No** — one company per license (group license available on request) |
| Historic data | Separate request; typically **.xls**, not free with API |

**Implication for Jan Darpan:** A paid IBJA key alone is **not** enough. Product display of सोना/चांदी on the Reader homepage is **republication**. Legal must secure **written display / media redistribution rights** and agree attribution language.

### Attribution

- Expect **“IBJA”** (and rate session AM/PM + date) on any tile.
- Do not brand as “live tick” — refresh is **twice daily** on working days.

### Failure modes

| Mode | Behaviour |
|------|-----------|
| Holiday / weekend | No new rate; API may return “No Record Found” for that date |
| Invalid token / blank dates | Structured `Invalid` messages |
| Hit limit exceeded | Explicit max-hit message |
| UAT misuse | UAT returns rates ~**4 days behind** — not for production UI |
| Missing publish consent | **Must omit UI** even if technical fetch works |
| Assuming GST-inclusive or city jewellery MRP | Incorrect — would invent retail |

### Contacts (from IBJA site)

- Subscription / pricing: `nagaraj.iyer@ibja.in` (cc noted on site: `ankitawadke@ibja.in`)
- Apply via API Subscription Application form (business type includes **Others** — news may fit; confirm with IBJA)

---

## 2. Other “licensed API” options

| Option | Assessment |
|--------|------------|
| **IBJA official API** | Only **first-party** Indian bullion benchmark API identified in this audit |
| Third-party “India gold rate APIs” | Often scrape jeweller sites / MCX pages; **not** acceptable as honest official feed without their own IBJA sublicense |
| Global metals APIs (e.g. LBMA / FX converters) | Useful for international spot; **not** IBJA jewellery benchmark; would mislead Hindi “सोना 24K” tiles |
| Exchange delayed quotes (MCX) | Different product (futures/spot exchange); licensing separate; not a drop-in IBJA substitute |

**No second equally authoritative, publicly documented Indian jewellery-benchmark API was found.** Alternatives require either IBJA sublicensing or a different product definition (exchange spot ≠ IBJA AM/PM).

---

## Recommendation

| Decision | Detail |
|----------|--------|
| **Choose** | **IBJA Rates API** |
| **Before any code** | Written consent to **display** gold/silver rates on Jan Darpan (web + apps), attribution text, purity (recommend **999** and/or **916** for consumer clarity), unit (per 10g), GST disclaimer |
| **Commercial terms** | Annual subscription + media/display addendum if standard FAQ ban applies |
| **Until signed** | Keep gold/silver tiles **omitted** (honest A1 posture) |
| **Do not** | Scrape ibjarates.com HTML, jeweller sites, or unlicensed aggregators |

### Suggested product mapping (post-license only)

| Tile | IBJA field | Label notes |
|------|------------|-------------|
| सोना | Gold **999** or **916** (product choice) | Show AM or latest PM; date; “IBJA”; “GST अतिरिक्त” |
| चांदी | Silver **999** | Same session/date/attribution |

Never invent % change unless computed from **two stored IBJA sessions** with clear “vs previous IBJA fix.”

---

## Comparison checklist (filled)

| Criterion | IBJA |
|-----------|------|
| Official API? | Yes |
| Licensing? | Paid, annual, application-based |
| Commercial use? | Yes for subscribers; **display needs written OK** |
| Redistribution allowed? | **No by default** — consent required |
| AM/PM updates? | Yes (~12:30 / 18:30 IST, working days) |
| JSON? | Yes |
| Authentication? | ACCESS_TOKEN |
| Rate limits? | ~40 prod hits / day class |
| Purities? | Gold 999/995/916/750/585; Silver 999 |
| Silver included? | Yes |
| Units? | Confirm in contract (Indian per-10g convention expected) |
| GST included? | **No** |
| Attribution? | IBJA + date + session |

---

## Decision for release blocker

| Item | Status |
|------|--------|
| Honest gold/silver feed ready to ship | **No** (legal + subscription pending) |
| Recommended provider | **IBJA official Rates API** |
| Next business step | Email IBJA for **media/display license** quote; do not implement until consent letter filed |

Related: `docs/jandarpan-release-blocker-a1-weather-market.md`, `docs/jandarpan-release-blocker-market-rates.md`, `docs/jandarpan-fuel-provider-audit.md`
