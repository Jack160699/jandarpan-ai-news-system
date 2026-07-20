# Jan Darpan — AGMARKNET / data.gov.in mandi provider audit

**Date:** 2026-07-21  
**Branch:** `feat/jandarpan-reader-design-system`  
**Dataset (catalog):** Current daily price of various commodities from various markets (Mandi)  
**Publisher:** Department of Agriculture and Farmers Welfare / Directorate of Marketing and Inspection (DMI)  
**Underlying source:** AGMARKNET (`https://agmarknet.gov.in`)

> Security: this document never contains `DATA_GOV_IN_API_KEY` or any secret value.

---

## Catalog & resource

| Item | Value |
|------|--------|
| Catalog name | Current daily price of various commodities from various markets (Mandi) |
| Catalog URL | `https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi` |
| Resource UUID (canonical for this catalog) | `9ef84268-d588-465a-a308-a864a43d0070` |
| Endpoint host | `https://api.data.gov.in` |
| Endpoint pattern | `GET /resource/{RESOURCE_ID}` |
| Auth | Query param `api-key` (server-only) |
| Format | `format=json` |
| Pagination | `limit`, `offset` |
| Filters | `filters[<field>]=<exact value>` (field names case-sensitive per OAS) |

### Alternate resource observed in community

`35985678-0d79-46b4-9ed6-6f13308a1d24` (“Variety-wise Daily Market Prices…”) uses PascalCase fields (`State`, `Arrival_Date`, `Modal Price`). **Jan Darpan targets the catalog resource above** and normalizes **both** snake_case and PascalCase record shapes so a publisher rename does not invent prices.

---

## Credential status (Vercel)

| Environment | Variable name | Value present? |
|-------------|---------------|----------------|
| Preview | `DATA_GOV_IN_API_KEY` | **Runtime non-empty** (Preview API returned `no_current_records`, not `missing_api_key`). `vercel env pull` may still show empty for Sensitive vars — treat Dashboard/runtime as source of truth. |
| Production | `DATA_GOV_IN_API_KEY` | Name present; **must remain unset / unused** for Production until certified |
| Development | — | not configured |
| Local `.env.local` | — | not configured |

Unauthenticated probe:

```json
{ "error": "Authorization field missing" }
```

Invalid key probe returns HTTP **403** with an `error` field (body not logged here).

**Live notes (Preview deploy `bda229b`):**

1. Authenticated Preview `/api/utilities/mandi` responded without leaking key/URL.
2. Initial filter-only path returned `no_current_records` (filters may be ignored or CG sparse in the first pages).
3. Provider now includes an unfiltered page scan + in-memory Chhattisgarh filter as fallback.
4. Unit fixtures cover snake_case + PascalCase schemas.

---

## Expected response fields (documented + dual-case)

Records are under `records[]`. Field ids commonly returned for this resource:

| Logical field | snake_case | PascalCase / spaced |
|---------------|------------|---------------------|
| State | `state` | `State` |
| District | `district` | `District` |
| Market | `market` | `Market` |
| Commodity | `commodity` | `Commodity` |
| Variety | `variety` | `Variety` |
| Grade | `grade` | `Grade` |
| Arrival date | `arrival_date` | `Arrival_Date` |
| Min price | `min_price` | `Min Price` / `min_price` |
| Max price | `max_price` | `Max Price` / `max_price` |
| Modal price | `modal_price` | `Modal Price` / `modal_price` |

Top-level envelope keys typically include: `records`, `count` / `total`, `limit`, `offset`, `status`, `message`.

---

## Spellings to use (exact match filters)

Until live confirmation, prefer these documented AGMARKNET English spellings:

| Dimension | Preferred exact value | Notes |
|-----------|----------------------|-------|
| State | `Chhattisgarh` | Primary; also try `Chattisgarh` only as diagnostic, not for UI |
| District | `Raipur` | User district English name when available |
| Commodity candidates | `Paddy(Dhan)(Common)`, `Wheat`, `Gram`, `Tomato`, `Onion` | Exact labels must be remapped after first successful live pull |

Hindi UI labels are **mapped locally** after match; never sent as filter values unless observed in the feed.

---

## Date format & price unit

| Item | Finding |
|------|---------|
| Arrival / reported date | Commonly `DD/MM/YYYY` string on this resource |
| Price meaning | Wholesale **minimum / maximum / modal** (catalog text) |
| Unit used in product | `₹/क्विंटल` (hi) / `₹/quintal` (en) — AGMARKNET wholesale mandi prices for this dataset are published per quintal; the JSON records usually **do not** include a unit field |
| Primary display price | **Modal** |
| Min/max | Retained for detail; never averaged across markets/varieties |

---

## Sample records (credentials removed)

Illustrative shape only (fixtures / documented examples — **not** live Preview data):

```json
{
  "state": "Chhattisgarh",
  "district": "Raipur",
  "market": "Raipur",
  "commodity": "Paddy(Dhan)(Common)",
  "variety": "Common",
  "arrival_date": "20/07/2026",
  "min_price": "2200",
  "max_price": "2400",
  "modal_price": "2300"
}
```

---

## Freshness observed

- Dataset is described as **current daily** mandi prices; publishing cadence follows market reporting (not sub-minute “live”).
- Product policy (pending live confirmation):  
  - **current**: reported date within latest trading window (today / yesterday IST)  
  - **acceptable**: up to **3 calendar days** old, labelled “हालिया मंडी भाव” (not “आज का”)  
  - **stale**: older than 3 days → omit from homepage  
  - **unavailable**: no trustworthy row

---

## Duplicate / missing-field behavior

- Duplicate `(commodity, variety, market, district, arrival_date)` → keep one (prefer complete modal price).
- Missing `modal_price` or non-numeric modal → reject record.
- Missing min/max → allow `null` for those fields only.
- Empty `records` after filters → `no_current_records`.

---

## Provider limitations

- Requires a valid data.gov.in API key (server-only).
- Exact filter field casing can differ across resource editions.
- Not a streaming live ticker; “Live” must never be shown.
- Rate limits: not clearly disclosed on the public catalog page; keep cache **30–60 minutes** and small `limit`.
- CORS: browser must never call the provider; only Jan Darpan server routes.

---

## Automated reuse suitability

| Question | Answer |
|----------|--------|
| Suitable for honest Reader DS A1 mandi utility? | **Yes**, once Preview key is non-empty and Chhattisgarh rows validate |
| Suitable without inventing movement %? | **Yes** — modal + date + market only |
| Suitable for gold/silver/fuel/indices? | **No** — different feeds; remain omitted |

---

## Audit verdict

| Checkpoint | Status |
|------------|--------|
| Catalog + resource ID identified | **Pass** — `9ef84268-d588-465a-a308-a864a43d0070` |
| Endpoint / filter pattern documented | **Pass** |
| Live authenticated sample for CG / Raipur | **Blocked** — Preview secret empty |
| Automated reuse after key fill | **Suitable** |

Next step for ops: set a non-empty `DATA_GOV_IN_API_KEY` on **Preview only** (not Production), redeploy, re-run live filter checks.
