# Verified rates — failure policy

| Condition | Public behaviour |
|-----------|------------------|
| Provider blocked / missing consent | `blocked` — no price, no fake trend |
| Provider error / empty | `unavailable` |
| Multi-source disagreement | `conflict` — no consensus published |
| Latest point older than today IST | `stale` — history kept with original dates |
| &lt;2 points | Graph disabled; movement `insufficient_history` |
| Missing calendar day | Gap in series — never filled from yesterday |

Never show undefined, NaN, or ₹0 as a rate.
