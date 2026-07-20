# District Classification

## Entry points

- `src/lib/regional/district-classifier.ts` → `classifyDistrictContent(input)`
- Re-exported from `src/lib/regional/geo-tagging.ts` and `src/lib/regional/index.ts`
- `tagGeoFromContent` consumes the classifier

## Result shape

```ts
{
  kind: 'district' | 'statewide' | 'multi_district' | 'unknown' | 'non_cg',
  districtSlug?, districtId?,
  confidence, matchedTerms, method, ambiguity, alternatives
}
```

## Rules

| Kind | Rule |
|------|------|
| `statewide` | CG/state keywords **or** secretariat/cabinet/vidhan sabha/CM/mantralaya **without** a strong district match. **Never** force Raipur. |
| `multi_district` | ≥2 strong district matches |
| `district` | Exactly one strong match; `tagGeoFromContent` sets `primary_district` only if confidence ≥ **0.65** |
| `non_cg` | National / other-state cues without CG context |
| `unknown` | No reliable signal |

Weak aliases (e.g. `capital` on Raipur) cannot assign a primary district alone.

## Repair

`src/lib/regional/district-repair.ts`:

- `dryRunRepairArticles` / `applyHighConfidenceRepairs`
- Write only when `kind=district`, confidence ≥ **0.8**, existing primary empty
- Never overwrite `geo_metadata.manual_lock` or `editorial_metadata.district_manual`

## Tests

`src/lib/regional/district-classifier.test.ts` — statewide vs Raipur, multi, Hindi alias.
