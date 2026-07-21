# Phase 7 — remaining issues (non-blocking)

Ordered by severity. None block Preview ship.

## Minor visual

1. **Bottom-nav home glyph** — production brand mark (“N” / logo tile) instead of line-home icon from Plot gallery. Intentional brand continuity; not a layout defect.
2. **F54 trending rail** — empty when no catalog passed into `NotFoundStatePage`. Honest degradation; wire real trending when a lightweight feed helper is available on the not-found path.
3. **F51/F52 first-visit timing** — sheets appear after client mount (one frame without sheet). Acceptable; avoids SSR/localStorage mismatch.
4. **Permission sheets on every fresh profile** — by design once per browser; e2e dismisses via localStorage.

## Product / honesty (kept)

5. **Checkout not live** — `/membership/checkout` still routes to failure with `checkout-not-live`. Do not fake payments.
6. **Offline library** — banner links to saved; full offline package listing depends on real downloads in reading memory / audio prefs.

## Tooling

7. **Full-repo `npm run lint`** — can hang when scanning `.claude/worktrees`; use scoped eslint paths or ignore worktrees in eslint config in a follow-up.
8. **Static ref serve port** — `serve public -l 3456` may fall back if busy; capture script should prefer an explicit free port.

## Out of scope / follow-ups

9. Pixel-perfect Plot gallery icons (emoji in static HTML refs only).
10. axe-core CI package — current a11y suite is Playwright landmark/name/dialog gates; full axe can be added later.
11. English UI string pass across all DS surfaces — language page exists; many DS strings remain Hindi-first by product choice.
