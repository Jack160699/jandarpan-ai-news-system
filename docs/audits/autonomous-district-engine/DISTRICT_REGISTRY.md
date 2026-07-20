# District Registry

`ACTIVE_DISTRICT_COUNT = 33` official Chhattisgarh districts.

## Tiers

| Tier | Priority | Count | dailyTarget | Sum |
|------|----------|------:|------------:|----:|
| high | 1 | 8 | 8 | 64 |
| medium | 2 | 12 | 4 | 48 |
| low | 3 | 13 | 2 | 26 |
| **total** | | **33** | | **138** |

### High (8)

raipur, durg, bilaspur, korba, raigarh, rajnandgaon, bastar, janjgir-champa

### Medium (12)

dhamtari, mahasamund, bemetara, balod, mungeli, gariaband, kanker, dantewada, kabirdham, jashpur, surguja, surajpur

### Low (13)

baloda-bazar, balrampur, bijapur, gaurela-pendra-marwahi, khairagarh-chhuikhadan-gandai, kondagaon, korea, manendragarh-chirmiri-bharatpur, mohla-manpur-ambagarh-chowki, narayanpur, sakti, sarangarh-bilaigarh, sukma

## Surguja / Surajpur

- `surguja` = Surguja HQ Ambikapur; aliases include `ambikapur` only.
- `surajpur` is a separate district — not aliased under surguja.

## Helpers

`assertThirtyThreeDistricts()`, `getDistrictsByTier()`, `getDailyCoverageTargets()`, existing `getDistrict` / `getPrioritizedDistricts` / `districtPriorityBoost`.
