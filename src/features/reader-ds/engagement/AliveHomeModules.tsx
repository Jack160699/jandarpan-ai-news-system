"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { buildDailyDarpan } from "@/lib/engagement/daily-darpan";
import { buildLocalPulse } from "@/lib/engagement/local-pulse";
import { pickDevelopingStory } from "@/lib/engagement/pick-developing";
import { toFormattedStory } from "@/lib/engagement/story-format";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import { DEFAULT_DISTRICT_SLUG } from "@/lib/district-intelligence";
import { useJdDsT } from "../i18n";
import Link from "next/link";
import { toReaderStory, formatStoryTime, type ReaderStory } from "../utils";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";
import { hasVerifiedRealMedia, extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";
import { SectionHeader } from "../components";
import { DevelopingStoryTeaserCard } from "./DevelopingStoryTeaserCard";
import { FormatStoryCard } from "./FormatStoryCard";

const LocalPulseLazy = dynamic(
  () =>
    import("./LocalPulseModule").then((m) => ({ default: m.LocalPulseModule })),
  { ssr: false, loading: () => null }
);

const JanDarpanLivePreviewLazy = dynamic(
  () =>
    import("@/features/jd-live").then((m) => ({ default: m.JanDarpanLivePreview })),
  { ssr: false, loading: () => null }
);

const JanDarpanLiveLazy = dynamic(
  () =>
    import("@/features/jd-live").then((m) => ({ default: m.JanDarpanLive })),
  {
    ssr: false,
    loading: () => (
      <div
        className="jdl-studio-loading-placeholder"
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          maxHeight: 640,
          background: "#0a1628",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          color: "rgba(255,255,255,0.6)",
          fontFamily: "sans-serif",
          fontSize: 14,
          marginTop: 10,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "#c8102e",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span>जन दर्पण लाइव लोड हो रहा है…</span>
      </div>
    ),
  }
);

type SlotProps = {
  feed: GeneratedHomepageFeed;
  excludeSlugs: Set<string>;
};

/**
 * Jan Darpan Live newsroom — compact television broadcast anchored to the upper-left
 * with a live editorial news column (ताज़ा खबरें) on desktop, and a single 16:9 frame on mobile.
 */
export function AliveHomeBriefingSlot({ feed, excludeSlugs }: SlotProps) {
  const { locale } = useJdDsT();
  const broadcastLang = locale === "en" ? "en" : "hi";

  const freshStories = useMemo(() => {
    const rawCandidates = [
      ...(feed.liveWire ?? []),
      ...(feed.trending ?? []),
      ...(feed.regionalHighlights ?? []),
      ...(feed.editorsPicks?.supporting ?? []),
      ...(feed.breakingTicker ?? []),
    ];

    // Chronological ordering: NEWEST ARTICLE FIRST (strictly chronological by original published_at)
    const candidates = [...rawCandidates].sort((a, b) => {
      const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tB - tA;
    });

    const out: ReaderStory[] = [];
    const seen = new Set(excludeSlugs);
    const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str || "");

    const CG_DISTRICT_LIST = new Set([
      "durg", "bhilai", "raipur", "rajnandgaon", "bilaspur", "korba", "raigarh",
      "bastar", "surguja", "jagdalpur", "ambikapur", "dhamtari", "mahasamund",
      "kanker", "sukma", "dantewada", "bijapur", "narayanpur", "kondagaon",
      "kabirdham", "balod", "bemetara", "gariaband", "balodabazar", "janjgir",
      "champa", "jashpur", "korea", "manendragarh", "mohla", "sakti", "sarangarh", "khairagarh"
    ]);

    const isCgStory = (a: any) => {
      const text = `${a.headline || ""} ${a.summary || ""}`.toLowerCase();
      const hlLower = (a.headline || "").toLowerCase();
      const dSlug = (a.districtSlug || a.district || "").toLowerCase();

      const mentionsCg =
        CG_DISTRICT_LIST.has(dSlug) ||
        a.section === "chhattisgarh" ||
        a.section === "raipur" ||
        [
          "छत्तीसगढ़", "chhattisgarh", "chattisgarh",
          "रायपुर", "raipur", "दुर्ग", "durg", "भिलाई", "bhilai",
          "बिलासपुर", "bilaspur", "बस्तर", "bastar", "कोरबा", "korba",
          "राजनंदगांव", "rajnandgaon", "रायगढ़", "raigarh", "अंबिकापुर", "जगदलपुर",
          "कांकेर", "दंतेवाड़ा", "सुकमा", "धमतरी", "महासमुंद", "कबीरधाम", "बालोद",
          "बेमेतरा", "विष्णु देव साय", "साय कैबिनेट", "महानदी", "बीजापुर", "जांजगीर",
          "बलौदाबाज़ार", "गरियाबंद", "कोरिया", "जशपुर"
        ].some((sig) => text.includes(sig));

      if (!mentionsCg) return false;

      const mentionsExclude = [
        "मध्य प्रदेश", "madhya pradesh", "पश्चिम बंगाल", "west bengal", "बंगाल में",
        "जम्मू-कश्मीर", "jammu", "kashmir", "महाराष्ट्र", "iit बॉम्बे", "उत्तर प्रदेश",
        "बिहार", "राजस्थान", "पंजाब", "हरियाणा", "देश-दुनिया", "राशिफल", "नाखून टूटने",
        "खाद्य तेल सस्ता होने का अनुमान"
      ].some((sig) => text.includes(sig));

      if (mentionsExclude) {
        const hlHasCg = ["छत्तीसगढ़", "chhattisgarh", "रायपुर", "दुर्ग", "भिलाई", "बिलासपुर", "बस्तर", "साय"].some((sig) => hlLower.includes(sig));
        if (!hlHasCg) return false;
      }

      if (hlLower.includes("देश-दुनिया") || hlLower.includes("राशिफल")) return false;
      return true;
    };

    for (const a of candidates) {
      if (!a?.slug || !a.headline?.trim() || seen.has(a.slug)) continue;

      // ABSOLUTE MEDIA RULE: ONLY SHOW REAL NEWS WITH REAL SOURCE MEDIA
      const imgUrl = extractVerifiedRealMediaUrl(a) || a.imageUrl;
      if (!hasVerifiedRealMedia(imgUrl)) continue;

      if (!isCgStory(a)) continue;
      const hasDev = isDevanagari(a.headline);
      if (locale === "en" && hasDev) continue;
      if (locale === "hi" && !hasDev && a.language !== "hi") continue;

      seen.add(a.slug);
      out.push(toReaderStory(a));
      if (out.length >= 40) break;
    }

    return out;
  }, [feed, excludeSlugs, locale]);

  const initialBroadcastQueue = useMemo(() => {
    if (!feed) return [];
    const candidates = [
      ...(feed.breakingTicker ?? []),
      ...(feed.liveWire ?? []),
      ...(feed.editorsPicks ? [feed.editorsPicks.lead, ...feed.editorsPicks.supporting] : []),
      ...(feed.regionalHighlights ?? []),
      ...(feed.trending ?? []),
    ];

    // Chronological ordering: NEWEST ARTICLE FIRST
    const sortedCandidates = [...candidates].sort((a, b) => {
      const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tB - tA;
    });

    const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str || "");
    const queue: any[] = [];
    const seen = new Set<string>();

    for (const a of sortedCandidates) {
      if (!a?.id || !a?.slug || !a?.headline?.trim()) continue;
      if (seen.has(a.id) || seen.has(a.slug)) continue;

      // ABSOLUTE MEDIA RULE: ONLY PUBLISH IF HAS VERIFIED REAL SOURCE MEDIA
      const verifiedImg = extractVerifiedRealMediaUrl(a);
      if (!verifiedImg || !hasVerifiedRealMedia(verifiedImg)) continue;

      const hasDev = isDevanagari(a.headline);
      if (broadcastLang === "en" && hasDev) continue;
      if (broadcastLang === "hi" && !hasDev && a.language !== "hi") continue;

      seen.add(a.id);
      seen.add(a.slug);

      const districtRes = resolveCanonicalStoryDistrict({
        explicitDistrict: a.districtSlug || a.district,
        tags: a.tags,
        headline: a.headline,
        summary: a.summary,
        section: a.section,
        categoryLabel: a.categoryLabel,
      });

      const distHi = districtRes.nameHi || (districtRes.isStatewide ? "राज्य डेस्क" : (a.categoryLabel || "राज्य डेस्क"));
      const distEn = districtRes.nameEn || (districtRes.isStatewide ? "State Desk" : (a.categoryLabel || "State Desk"));

      queue.push({
        id: a.id,
        slug: a.slug,
        headline: a.headline,
        headlineHi: hasDev ? a.headline : undefined,
        summary: a.summary || "",
        summaryHi: hasDev ? a.summary : undefined,
        imageUrl: verifiedImg,
        categoryLabel: broadcastLang === "en" ? distEn : distHi,
        categoryLabelHi: distHi,
        district: broadcastLang === "en" ? distEn : distHi,
        districtHi: distHi,
        section: a.section || "chhattisgarh",
        isBreaking: a.tags?.includes("breaking") || (a as { isBreaking?: boolean }).isBreaking === true,
        isLive: true,
        priorityScore: a.priorityScore || 50,
        publishedAt: a.publishedAt || new Date().toISOString(),
      });
      if (queue.length >= 45) break;
    }
    return queue;
  }, [feed, broadcastLang]);

  return (
    <section
      className="jd-home-broadcast-layout"
      data-testid="jd-live-newsroom"
      aria-label={broadcastLang === "en" ? "Jan Darpan Live Television Newsroom" : "जन दर्पण लाइव टेलीविज़न न्यूज़रूम"}
    >
      {/* 72% Left column: Compact Jan Darpan Live TV Newsroom anchored upper-left */}
      <div className="jd-home-broadcast-tv">
        <JanDarpanLiveLazy initialLanguage={broadcastLang} initialQueue={initialBroadcastQueue} embedded />
      </div>

      {/* 32% Right column: Live Editorial / Fresh Stories Column (Desktop only, hidden on mobile) */}
      <aside
        className="jd-home-broadcast-aside"
        aria-label={locale === "en" ? "Latest News" : "ताज़ा खबरें"}
      >
        <div className="jd-fresh-col">
          <div className="jd-fresh-col__head">
            <div className="jd-fresh-col__title-row">
              <span className="jd-fresh-col__dot" aria-hidden="true" />
              <h2 className="jd-fresh-col__title">
                {locale === "en" ? "Latest News" : "ताज़ा खबरें"}
              </h2>
            </div>
            <Link href="/latest" className="jd-fresh-col__more">
              {locale === "en" ? "See all ›" : "सभी देखें ›"}
            </Link>
          </div>

          <div className="jd-fresh-col__list">
            {freshStories.map((story) => (
              <Link
                key={story.slug}
                href={`/story/${story.slug}`}
                className="jd-fresh-col__item"
                prefetch={false}
              >
                <div className="jd-fresh-col__thumb-wrap">
                  {story.imageUrl && (
                    <img
                      src={story.imageUrl}
                      alt=""
                      className="jd-fresh-col__thumb"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/brand/jan-darpan/mark/jan-darpan-mark-square-light.svg";
                      }}
                    />
                  )}
                </div>
                <div className="jd-fresh-col__body">
                  <div className="jd-fresh-col__meta">
                    <span className="jd-fresh-col__tag">
                      {story.kicker && story.kicker !== "छत्तीसगढ़" && story.kicker !== "Chhattisgarh"
                        ? story.kicker
                        : locale === "en"
                        ? "State Desk"
                        : "राज्य डेस्क"}
                    </span>
                    {story.publishedAt && (
                      <span className="jd-fresh-col__time">
                        {formatStoryTime(story.publishedAt, locale)}
                      </span>
                    )}
                  </div>
                  <h3 className="jd-fresh-col__headline">{story.headline}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

/**
 * Local pulse / discussion / developing — after lead, before section streams.
 * Lazy-loads pulse to keep LCP on the lead.
 */
export function AliveHomeSecondarySlot({ feed, excludeSlugs }: SlotProps) {
  const { locale, t } = useJdDsT();
  const prefs = useReaderPreferencesOptional();
  const districtSlug =
    prefs?.prefs.homeDistrict?.trim() || DEFAULT_DISTRICT_SLUG;

  const briefingSlugs = useMemo(() => {
    const briefing = buildDailyDarpan(feed, { districtSlug, excludeSlugs });
    return new Set(briefing?.items.map((i) => i.slug) ?? []);
  }, [feed, districtSlug, excludeSlugs]);

  const claimed = useMemo(() => {
    const next = new Set(excludeSlugs);
    for (const s of briefingSlugs) next.add(s);
    return next;
  }, [excludeSlugs, briefingSlugs]);

  const pulse = useMemo(
    () => buildLocalPulse(feed, { districtSlug, limit: 4 }),
    [feed, districtSlug]
  );

  const developing = useMemo(
    () =>
      pickDevelopingStory(feed, {
        districtSlug,
        excludeSlugs: claimed,
      }),
    [feed, districtSlug, claimed]
  );

  const discussion = useMemo(() => {
    const seen = new Set(claimed);
    if (developing) seen.add(developing.slug);
    const out = [];
    for (const a of feed.trending ?? []) {
      if (!a?.slug || seen.has(a.slug)) continue;
      out.push(toFormattedStory(a, locale));
      seen.add(a.slug);
      if (out.length >= 4) break;
    }
    return out;
  }, [feed.trending, claimed, developing, locale]);

  return (
    <div className="jd-alive-secondary" data-testid="jd-alive-secondary">
      {pulse ? <LocalPulseLazy pulse={pulse} /> : null}

      {discussion.length >= 2 ? (
        <section
          className="jd-alive-discussion"
          aria-label={t("home.discussion")}
        >
          <SectionHeader
            title={t("home.discussion")}
            color="var(--jd-red)"
            moreHref="/trending"
            moreLabel={t("common.seeAll")}
          />
          <div className="jd-home-section-cards">
            {discussion.map((s, i) => (
              <FormatStoryCard
                key={s.slug}
                story={s}
                last={i === discussion.length - 1}
                toneIndex={i}
              />
            ))}
          </div>
        </section>
      ) : null}

      {developing ? <DevelopingStoryTeaserCard teaser={developing} /> : null}
    </div>
  );
}

/**
 * Compact Jan Darpan Live preview for the homepage sidebar.
 * Lazy loaded — does NOT initialize audio or broadcast engine.
 */
export function AliveHomeLiveSlot({ feed }: { feed: SlotProps["feed"] }) {
  const { locale } = useJdDsT();
  // Pick the top story image + headline for the preview
  const topStory = feed.breakingTicker[0] ?? feed.liveWire[0] ?? feed.editorsPicks?.lead;
  return (
    <JanDarpanLivePreviewLazy
      headline={topStory?.headline}
      imageUrl={topStory?.imageUrl}
      language={locale === "en" ? "en" : "hi"}
    />
  );
}

/** @deprecated Prefer slot components */
export function AliveHomeModules(props: SlotProps) {
  return (
    <>
      <AliveHomeBriefingSlot {...props} />
      <AliveHomeSecondarySlot {...props} />
    </>
  );
}
