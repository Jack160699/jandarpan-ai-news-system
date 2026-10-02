# Jan Darpan — four-district source registry (verified 2026-10-02)

Primary districts: **Raipur, Durg (Bhilai), Bilaspur, Rajnandgaon**. Evidence below was measured live (HTTP, robots.txt, feed
parse, the repo's own geo tagger) — not assumed. Only feeds that returned HTTP 200 with a valid RSS document, Hindi titles and a
newest item < 11 h old were added. District counts are mentions inside one feed snapshot (10–100 items), so they show *relative*
coverage, not daily volume.

## Registered (in `src/lib/news/providers/rss-sources.ts`)

| Source | Feed | Items/day | Text per item | Full text via | robots | District mentions in snapshot |
|---|---|---|---|---|---|---|
| IBC24 CG (existing) | `ibc24.in/chhattisgarh/feed` | ~18 | 2,126 chars | feed `content:encoded` | allows | Raipur 40, Bilaspur 7, Durg 6 (of 60) |
| Bhilai Times (existing) | `bhilaitimes.com/feed/` | ~9 | 1,586 | feed | allows | Raipur 5, Durg 2, Bilaspur 1 (of 10) |
| Thiha CG (**new**) | `thihacg.com/feed/` | ~47 | 1,655 | feed | allows | Raipur 5, Rajnandgaon 2 (of 10) |
| Daily Chhattisgarh (**new**) | `dailychhattisgarh.com/feed` | ~94 | 1,743 | feed (long `description`) | allows (`/cgi-bin/` only) | Raipur 33, Bilaspur 12, Rajnandgaon 2, Durg 2 (of 100; 55% CG) |
| Chhattisgarh 24 News (**new**) | `chhattisgarh-24-news.com/feed/` | ~8 | 2,084 | feed | allows | Durg 3, Raipur 2, Rajnandgaon 1 (of 10) |
| Chhattisgarh Vaibhav (**new**) | `chhattisgarhvaibhav.com/feed/` | ~21 | 2,369 | feed | allows | Raipur 2, Bilaspur 1 (of 10) |
| Lalluram (**new**) | `lalluram.com/feed` | ~144 (30% CG) | 111 (excerpt) | **page extraction** (JSON-LD `articleBody`, 5/5 pages OK) | allows all | Raipur 2 (of 10) |

Google News district queries (Raipur / Durg-Bhilai / Bilaspur / Rajnandgaon) were rewritten with local place names and `when:2d`
(Rajnandgaon query: 49 items). They are title-only aggregator discovery, never a source of article text.

## Evaluated and NOT added

| Source | Finding |
|---|---|
| Aaj Bhilai | `aajbhilai.com` / `www.aajbhilai.com` do not resolve (ENOTFOUND); web search finds no site of that name. No verified domain. |
| Vayam Chhattisgarh | `vayamchhattisgarh.com` does not resolve; the public presence found is YouTube/X only. No feed. |
| IAN24 | `ian24.in` serves HTML; `sitemap.xml` is a 1-URL index, no RSS/Atom, no news sitemap. Not machine-ingestible. |
| Bansal News | `bansalnews.com/rss` valid (86/day, full text) but MP+CG national mix (46% CG, Bilaspur-heavy via Bilaspur-HP name collisions). Left out: it would add newswire volume, not district supply. |
| Haribhoomi | `/feed` valid (221/day, full text) but 33% CG, national mix. Already covered by the CG Google-News query. |
| Dainik Bhaskar CG, Naidunia, Patrika, ETV Bharat | No discoverable RSS (Patrika/ETV expose sitemaps only; Patrika CG feed was permanently retired after 74 failures). Bhaskar full text is already delivered by NewsData ("Bhaskar": 100% of items ≥ 482 chars). |
| The Sootr, Dainik Jagran MPCG | Valid feeds but 10% / 6% CG (Bhopal-centric). |
| Today Chhattisgarh (Blogger) | Valid, full text, but ~7/day and newest item 114 h old. |
| District sub-feeds (`/category/raipur/feed` etc. on Thiha, Bhilai Times, CG24, Daily CG; `ibc24.in/state/chhattisgarh/raipur/feed`) | Return 0 items or 404 — not real feeds. Not added. |

## Observed constraints that drive the polling policy

* Feed windows are short: Thiha CG's 10 items span ~5 h, Lalluram's 10 items ~1.7 h. A source polled every 6–12 h (the old
  adaptive backoff for "quiet" feeds) silently loses items. Direct Chhattisgarh publishers are therefore capped at **30 min**
  between polls and primary-district aggregator queries at **60 min**, regardless of empty polls (`maxPollDelayMs`).
* Rajnandgaon is the thinnest district in every feed (1–2 mentions per snapshot). It gets a dedicated local-terms query
  (Dongargarh, Khairagarh, Dongargaon, Churia, Manpur) and the NewsData Hindi/English district queries; expect it to stay
  the lowest-volume primary district.

## Terms of use

Only publicly published syndication feeds and pages permitted by robots.txt are read (page fetches are checked per URL, fail
closed, ≤ 6 per source per run, ~1.2 s apart). Source text is input to the editorial gates and rewrite — never published
verbatim — and every signal keeps publisher, URL, method and fetch time in `ingestion_metadata.text_enrichment`. Per-publisher
Terms of Service were **not** reviewed by counsel; that remains an owner decision before scaling beyond these feeds.
