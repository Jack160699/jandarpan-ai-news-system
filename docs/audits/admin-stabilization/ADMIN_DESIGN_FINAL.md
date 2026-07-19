# Admin Design Final — Phase 6

## System

- Tokens: `src/styles/admin-tokens.css` (navy/slate foundation, red + blue accents)
- Shell / primitives: `src/styles/admin-v3.css` + `src/components/admin-v3/`
- Login: `src/styles/admin-v2.css` (`.anr-login-v2`) with dark input overrides
- Editor density: `src/styles/admin-v3-editor.css`

## Polish applied

- Command Centre: non-duplicative pulse panels; Today wrapped in `Av3Panel`; compact KPIs
- Buttons/links normalized to `av3-btn` / `av3-panel-link` on primary surfaces
- Editorial charts use Jan Darpan blue (`#2563eb`) instead of amber
- Warning status pills use blue accent (not dominant orange)
- `prefers-reduced-motion` covers skeletons, buttons, page enter, shell
- Login shadcn inputs styled for dark navy card

## Remaining design debt (non-blocking)

- Editorial overview still uses some `anr-*` layout classes under Av3 shell
- Legacy `admin-newsroom.css` remains loaded for compatibility
