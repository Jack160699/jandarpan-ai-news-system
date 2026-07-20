# Verified rates graphing

## Component

`RateHistoryGraph` — accessible SVG (dynamic client import). Recharts is **not** loaded on public rate pages (bundle protection).

## Behaviour

| Points | UI |
|--------|----|
| 0 | Controlled unavailable copy |
| 1 | Current value + “history accumulating” — **no** line |
| ≥2 | Segmented polyline; gaps &gt;1 day break the line |

## Ranges

Controls: 7 दिन / 30 दिन / 90 दिन / 1 वर्ष / पूरा इतिहास.
Disabled when real span is insufficient. Never enables a range that implies fabricated history.

## Accessibility

- Keyboard focus on points
- Screen-reader summary
- HTML table alternative (`RateHistoryTable`) SSR
- Meaning not color-only (labels + text status)
- `prefers-reduced-motion`: no fake live animation (none shipped)
