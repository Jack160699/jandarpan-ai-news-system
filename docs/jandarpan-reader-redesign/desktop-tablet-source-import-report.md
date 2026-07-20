# Desktop / tablet source import report

**Date:** 2026-07-20  
**Branch:** `feat/jandarpan-reader-design-system`  
**Action:** Import only — no UI implementation, no commit, no push, no deploy

---

## Source discovery

Searched `C:\Users\shriyansh chandrakar\Downloads` for HTML/HTM and related Jan Darpan design files.

### Candidates

| Path | Size | Modified | Notes |
|------|------|----------|-------|
| `Jandarpan design brief tab.zip` | 3,113,567 bytes | 2026-07-20 23:46:46 | **Selected package** — newest; name matches expected “design brief tab” |
| `Jandarpan-Design-System.html.html` | ~2.0 MB | 2026-07-19 16:56 | Phone / mobile Plot gallery (already known mobile source) |
| `Jandarpan Homepage Concepts.html` | ~1.9 MB | 2026-07-19 16:01 | Homepage concepts — not desktop/tablet SoT |
| `Jandarpan_Claude_Design_Brief.txt` | 2,189 bytes | 2026-07-19 13:15 | Text brief only |

No standalone HTML named “design brief tab” existed outside the zip. The zip is the correct delivery artifact.

### Inside the zip (relevant HTML)

| Member | Size | Desktop | Tablet | Role |
|--------|------|---------|--------|------|
| **`Jandarpan Desktop System.dc.html`** | 140,962 | Yes | Yes | **Selected** — “Desktop & Tablet Visual Source of Truth” |
| `Jandarpan Design System.html` | ~2.0 MB | No | No | Mobile-only bundled Plot (rejected) |
| `Jandarpan Design System.dc.html` | ~175 KB | No | Phone | Mobile Plot companion (rejected) |
| `Jandarpan Homepage Concepts.html` | ~1.9 MB | No | Phone | Concepts (rejected) |

---

## Selected original

| Field | Value |
|-------|-------|
| **Original package** | `Jandarpan design brief tab.zip` |
| **Original full path** | `C:\Users\shriyansh chandrakar\Downloads\Jandarpan design brief tab.zip` |
| **Selected member** | `Jandarpan Desktop System.dc.html` |
| **Member size** | 140,962 bytes |
| **Member modified (zip entry)** | 2026-07-20 18:16:22 +05:30 |
| **Package modified** | 2026-07-20 23:46:46 |
| **Downloads original** | **Untouched** (SHA-256 unchanged after copy) |

---

## Copied paths

| Item | Path |
|------|------|
| HTML | `docs/jandarpan-reader-redesign/source-designs/desktop-tablet/jandarpan-desktop-tablet-design-brief.html` |
| Asset | `docs/jandarpan-reader-redesign/source-designs/desktop-tablet/assets/support.js` |
| Copied HTML size | 140,969 bytes (+7 from `./support.js` → `./assets/support.js` rewrite only) |
| `support.js` size | 66,404 bytes |

---

## Page identity

| Field | Value |
|-------|-------|
| `<title>` | *(empty / none)* |
| Visible H1 | **डेस्कटॉप व टैबलेट डिज़ाइन सिस्टम — मोबाइल पहचान का बुद्धिमान विस्तार** |
| Eyebrow | `JANDARPAN.NEWS • DESKTOP & TABLET VISUAL SOURCE OF TRUTH` |
| Brand | जनदर्पण / छत्तीसगढ़ |
| Breakpoints called out | 1440 / 1280 / 1024 / 768 |

---

## Assets

| Asset | Required? | Copied? | Path rewrite |
|-------|-----------|---------|--------------|
| `support.js` | **Yes** (sole local `src`) | Yes → `assets/support.js` | `./support.js` → `./assets/support.js` |
| `scraps/*` | No (not referenced by Desktop System HTML) | No | — |
| `uploads/*` | No | No | — |

**Render check:** Opened via local static server (`http://localhost:8765/...`). Page loads; H1 and Jan Darpan desktop/tablet copy visible; `support.js` loads from `./assets/support.js`. No missing local image/CSS folder deps for this file (Plot/Claude export is self-contained + support runtime).

---

## Frames detected

### Desktop (16 ids @ 1440)

`Desktop_Home_1440`, `Desktop_Category_1440`, `Desktop_Article_1440`, `Desktop_Opinion_1440`, `Desktop_LiveArticle_1440`, `Desktop_PhotoStory_1440`, `Desktop_District_1440`, `Desktop_Search_1440`, `Desktop_Latest_1440`, `Desktop_Trending_1440`, `Desktop_LiveNews_1440`, `Desktop_Membership_1440`, `Desktop_Audio_1440`, `Desktop_Login_1440`, `Desktop_Account_1440`, `Desktop_States_1440`

### Tablet landscape (~1024)

`Tablet_Home_1024`, `Tablet_Category_1024`, `Tablet_Article_1024` (+ section labels “TABLET LANDSCAPE 1024”)

### Tablet portrait (~768)

`TabletPortrait_Home_768`, `TabletPortrait_Article_768` (+ “TABLET PORTRAIT 768”)

Document also claims **28+ hi-fi frames** and a responsive grid section; the IDs above are the explicit named screen builders found in source.

---

## Suitability as source of truth

**Yes — suitable as the new desktop/tablet visual source of truth** for Cursor implementation.

- Distinct from the older **mobile-only** `Jandarpan-Design-System` Plot HTML  
- Explicitly labeled desktop & tablet SoT for Jan Darpan  
- Contains desktop 1440 frames and tablet landscape + portrait frames  
- Opens correctly after asset path rewrite  

### Limitations

- No HTML `<title>`; identity is in on-page headings  
- Fewer named tablet frame IDs than desktop (home/category/article focused) — still clearly tablet SoT, not mobile-only  
- Zip also contains mobile Plot files; those were **not** copied into this folder to avoid confusion  

---

## Explicit non-actions

- Application code **not** modified  
- Desktop/tablet UI **not** implemented  
- **No** commit / push / deploy / merge  
