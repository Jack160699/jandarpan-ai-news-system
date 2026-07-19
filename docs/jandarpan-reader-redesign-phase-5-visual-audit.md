# Phase 5 visual audit — Monetization (E36–E45 + district sponsor)

**Branch:** `feat/jandarpan-reader-design-system`  
**Flag:** `NEXT_PUBLIC_READER_DS=1`  
**Viewport:** 390×844 (mobile) + 1280×800 (desktop)  
**Design source:** Plot Design `groupE()` + A2 district sponsor strip  
**Approved static HTML:** `public/design-refs/phase-5/approved-phase-5-screens.html`  
**Screenshot dir:** `docs/jandarpan-reader-redesign/screenshots/phase-5/`  
**Feature root:** `src/features/reader-ds/monetization/`

## Architecture

| Concern | Implementation |
|---------|----------------|
| Membership landing | `MembershipLandingPage` → `/membership` |
| Plan comparison | `PlanComparisonPage` → `/membership/plans` via `buildDisplayPlans` + `reader_plans` |
| Paywall | `PremiumPaywallPage` when `premium_reports.is_paywalled`; QA entry `/membership/paywall-preview` |
| Checkout | `CheckoutPage` UI shell — **no live processor**; paid CTA → failure `checkout-not-live` |
| Success / failure | Query-driven; no invented order IDs |
| Manage | `ManageSubscriptionPage` + `useReaderAccount().isPremium` |
| Ad-free home | Homepage hides ads when `isPremium`; `PremiumExclusiveStrip` + masthead badge |
| Native sponsored | `NativeSponsoredCard` + `getNativeAdCreative` (labeled प्रायोजित) |
| Display / sticky | `DismissibleAd` + `Ad` (विज्ञापन + रिपोर्ट/बंद) |
| Inline article | `ArticleInlineAd` after first paragraph (non-sponsored) |
| District sponsor | Strip only when real affiliate/placement label exists; else labeled district Ad slot |
| AppChrome opt-out | Exact `/membership` + prefix `/membership/` |

## Screen-by-screen

| Screen | Design ref | Route | Screenshots | Major differences | Fixes | Remaining mismatch | Functional |
|--------|------------|-------|-------------|-------------------|-------|--------------------|------------|
| E36 Membership | groupE E36 | `/membership` | `e36-membership-*` | Honest social line (no invented “40,000+”); CTA from real plans or “प्लान देखें” | Dark gold sticky CTA | Price CTA depends on DB plans | Pass |
| E37 Plans | groupE E37 | `/membership/plans` | `e37-plans-*` | Coming-soon card when no paid `reader_plans` | Monthly/yearly toggle; recommended gold card | Matrix limited to available plans | Pass |
| E38 Paywall | groupE E38 | `/premium/[slug]` or `/membership/paywall-preview` | `e38-paywall-*` | Preview uses real report or generic “प्रीमियम सामग्री” chrome | Fade + gold lock card + sign-in | Fake GST story not used | Pass |
| E39 Checkout | groupE E39 | `/membership/checkout` | `e39-checkout-*` | Amounts “—” without paid plan; no charge | UPI-first methods; secure note | Live UPI/card not wired (intentional) | Pass — routes to failure when price &gt; 0 |
| E40 Success | groupE E40 | `/membership/success` | `e40-success-*` | No fake order/plan rows unless query provided | Calm green check + CTA home | Receipt SMS copy only when `until` query set | Pass |
| E41 Failure | groupE E41 | `/membership/failure` | `e41-failure-*` | `checkout-not-live` reason for preview | Non-blaming copy; retry / other method | — | Pass |
| E42 Manage | groupE E42 | `/membership/manage` | `e42-manage-*` | Status from real `isPremium`; cancel confirms locally only | Auto-renew toggle local; no cancel API invented | Billing date after live billing | Pass |
| E43 Ad-free | groupE E43 | `/` when premium | `e43-adfree-*` | Capture is free-tier (no session) — same as E44/E45 | Code path: strip + badge + no ads | Needs premium subscription to verify visually | Pass (code) |
| E44 Native | groupE E44 | `/` | `e44-native-*` | House creative English headline from existing helper | Tint + प्रायोजित · brand; Hindi CTA | Sponsor copy from `getNativeAdCreative` | Pass |
| E45 Display/sticky | groupE E45 | `/` | `e45-display-ads-*` | Top + mid-feed + sticky labeled विज्ञापन | Close/report controls | Mid-feed below fold on short viewports | Pass |
| District sponsor | A2 | `/district/[slug]` | `a2-district-sponsor-*` | No fake bank brand; strip omitted without affiliate | Labeled `विज्ञापन · ज़िला` slot remains | Sponsor strip when DB affiliate exists | Pass (honest empty) |
| Inline ads | story_in_article | `/story/[slug]` | (article body) | After first paragraph; hidden for premium | `ArticleInlineAd` | — | Pass |

## Ads vs editorial

- Display units: uppercase **विज्ञापन** + dashed empty slot (never fake creative).
- Native: tinted `#efe7d6`, gold border, **प्रायोजित · {brand}**.
- District sponsor: **ज़िला प्रायोजक** only with real partner name.
- Premium exclusive strip replaces ad slots for members (editorial replacement).

## Integrations preserved

- `fetchMonetizationPayload` / `reader_plans` / placements settings  
- `ReaderAccountProvider.isPremium`  
- `getNativeAdCreative` / native-feed-ads  
- `premium_reports` paywall flag  
- Founding membership API untouched; no Stripe/Razorpay invented  

## Functional checklist

| Check | Result |
|-------|--------|
| Membership → plans → checkout | Pass |
| Checkout does not charge | Pass (`checkout-not-live`) |
| Success without fake order | Pass |
| Manage reflects premium | Pass (account-driven) |
| Home ads labeled + dismissible | Pass |
| Native labeled प्रायोजित | Pass |
| Inline ad in article | Pass (client; hidden if premium) |
| District sponsor not invented | Pass |
| Responsive 390 + desktop captures | Pass |
| AppChrome opt-out for `/membership*` | Pass |

## Limitations (genuine)

- Live payment processor not available — checkout is a UI shell.
- E43 ad-free visual requires an active `reader_subscriptions` row.
- District sponsor strip empty until affiliates/placements provide a real name.
- Capture scripts must use **localhost** (not `127.0.0.1`) for Next.js 16 HMR/dev origins.

## Preview

_(filled after deploy)_
