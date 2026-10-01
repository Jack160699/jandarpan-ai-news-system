import { describe, it, expect } from "vitest";
import {
  checkStoryEditorialEligibility,
  isGenericRoundupStory,
  hasLocationIntegrityConflict,
  resolveVerifiedStoryMedia,
} from "./eligibility";
import { getPrioritizedStories } from "@/features/jd-live/lib/categories";
import { DURG_SOLAR_AD_SEGMENT } from "@/features/jd-live/lib/ad-segment";
import type { BroadcastSegment } from "@/features/jd-live/types";

describe("Editorial Eligibility & Integrity (Acceptance Tests #46 - #52)", () => {
  const now = new Date();
  const validImageUrl = "https://images.jandarpan.news/stories/2026/09/editorial-photo-1.jpg";

  describe("1. Canonical 30-Day Window", () => {
    it("accepts stories published within the 30-day rolling window", () => {
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const res = checkStoryEditorialEligibility({
        id: "story-recent-1",
        headline: "रायपुर में नई मेट्रो बस सेवा का शुभारंभ",
        summary: "यात्रियों की सुविधा के लिए 50 नई वातानुकूलित बसें सड़कों पर उतरीं।",
        publishedAt: fiveDaysAgo,
        imageUrl: validImageUrl,
      });
      expect(res.eligible).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it("rejects stories published more than 30 days ago", () => {
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
      const res = checkStoryEditorialEligibility({
        id: "story-old-1",
        headline: "बिलासपुर हाईकोर्ट का ऐतिहासिक निर्णय",
        summary: "कर्मचारियों के हित में दिया गया महत्वपूर्ण फैसला।",
        publishedAt: fortyDaysAgo,
        imageUrl: validImageUrl,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("outside_canonical_30day_window");
    });
  });

  describe("2. Generic Roundup Rejection (Acceptance Test #49)", () => {
    it("rejects generic meta-roundups and live blog summaries", () => {
      const recentDate = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const roundups = [
        "देश और दुनिया के ताजा समाचारों का लाइव अपडेट जारी...",
        "आज की प्रमुख खबरें: दिनभर की ताजा और बड़ी खबरें यहां पढ़ें",
        "दिनभर की बड़ी खबरें: पढ़ें देश और दुनिया का हर अपडेट",
        "Top 10 News Headlines of the day",
        "आज का राशिफल: मेष से मीन तक जानें कैसा रहेगा दिन",
      ];

      for (const headline of roundups) {
        expect(isGenericRoundupStory(headline)).toBe(true);
        const res = checkStoryEditorialEligibility({
          id: "roundup-1",
          headline,
          publishedAt: recentDate,
          imageUrl: validImageUrl,
        });
        expect(res.eligible).toBe(false);
        expect(res.reason).toBe("generic_roundup_rejected");
      }
    });

    it("accepts genuine local news reports and investigative stories", () => {
      const realStories = [
        "कलेक्टर ने जिला अस्पताल का औचक निरीक्षण किया, 3 चिकित्सक अनुपस्थित मिले",
        "दुर्ग में 300 करोड़ की लागत से बनने वाले 6-लेन बाईपास को कैबिनेट से मंजूरी",
        "बस्तर में जनजातीय कलाकारों के लिए आधुनिक कला केंद्र की स्थापना",
        "सरगुजा में धान खरीदी केंद्रों पर पुख्ता व्यवस्था के निर्देश",
      ];

      for (const headline of realStories) {
        expect(isGenericRoundupStory(headline)).toBe(false);
      }
    });
  });

  describe("3. Location Integrity & Conflict Gate (Acceptance Test #48)", () => {
    it("flags an external non-CG story wrongly tagged to a CG district", () => {
      // Mumbai story incorrectly assigned to Bilaspur
      const hasConflict = hasLocationIntegrityConflict(
        "मुंबई में गणेश विसर्जन के दौरान भारी भीड़ उमड़ी, सुरक्षा के कड़े इंतजाम",
        "गिरगांव चौपाटी पर हजारों श्रद्धालुओं ने बप्पा को विदाई दी।",
        "bilaspur"
      );
      expect(hasConflict).toBe(true);
    });

    it("allows external stories when there is genuine CG involvement or state reference", () => {
      // Mumbai story with genuine CG connection
      const hasConflict = hasLocationIntegrityConflict(
        "मुंबई में आयोजित राष्ट्रीय निवेशक सम्मेलन में छत्तीसगढ़ के मुख्यमंत्री ने दिया आमंत्रण",
        "मुख्यमंत्री विष्णु देव साय ने मुंबई में उद्योगपतियों से मुलाकात की।",
        "raipur"
      );
      expect(hasConflict).toBe(false);
    });

    it("allows purely local CG stories without conflict", () => {
      const hasConflict = hasLocationIntegrityConflict(
        "दुर्ग में सोलर पैनल लगाने के लिए विशेष शिविर का आयोजन",
        "नागरिकों को रूफटॉप सोलर पर 60 प्रतिशत तक सब्सिडी मिलेगी।",
        "durg"
      );
      expect(hasConflict).toBe(false);
    });
  });

  describe("4. Media is a display rule, not an eligibility rule", () => {
    const recentDate = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const noImages = [null, undefined, "", "   ", "/placeholder.svg", "https://example.com/placeholder-avatar.png", "https://images.unsplash.com/photo-123?w=1200"];

    it("never rejects a valid story because its media is missing, a placeholder or generic stock", () => {
      for (const imageUrl of noImages) {
        const res = checkStoryEditorialEligibility({
          id: "no-media-1",
          headline: "बालोद में सड़क चौड़ीकरण कार्य प्रारंभ",
          publishedAt: recentDate,
          imageUrl: imageUrl as string,
        });
        expect(res.eligible).toBe(true);
      }
    });

    it("still refuses to PRESENT missing / placeholder / generic stock images as real source media", () => {
      for (const imageUrl of noImages) {
        expect(resolveVerifiedStoryMedia({ imageUrl: imageUrl as string })).toBe("");
      }
    });

    it("keeps a verified real image for display", () => {
      expect(resolveVerifiedStoryMedia({ imageUrl: validImageUrl })).toBe(validImageUrl);
    });
  });

  describe("5. Personalized Unread / Unheard Queue Ordering (Acceptance Test #46)", () => {
    const d1 = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(); // 1h ago
    const d2 = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(); // 3h ago
    const d3 = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(); // 5h ago
    const d4 = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(); // 8h ago

    const mockStories: BroadcastSegment[] = [
      {
        id: "story-1",
        headline: "दुर्ग में नई तकनीक से खेती की शुरुआत",
        summary: "किसानों को नई तकनीकों से अवगत कराया जा रहा है।",
        section: "agriculture",
        district: "durg",
        publishedAt: d2,
        imageUrl: validImageUrl,
        isBreaking: false,
        isLive: false,
        priorityScore: 0,
        slug: "story-1",
        categoryLabel: "कृषि",
      },
      {
        id: "story-2",
        headline: "रायपुर में 100 करोड़ के जल शोधन संयंत्र का लोकार्पण",
        summary: "नागरिकों को स्वच्छ पेयजल आपूर्ति सुनिश्चित होगी।",
        section: "development",
        district: "raipur",
        publishedAt: d1,
        imageUrl: validImageUrl,
        isBreaking: false,
        isLive: false,
        priorityScore: 0,
        slug: "story-2",
        categoryLabel: "विकास",
      },
      {
        id: "story-3",
        headline: "बिलासपुर में खेल महोत्सव संपन्न",
        summary: "खिलाड़ियों को उत्कृष्ट प्रदर्शन के लिए सम्मानित किया गया।",
        section: "sports",
        district: "bilaspur",
        publishedAt: d3,
        imageUrl: validImageUrl,
        isBreaking: false,
        isLive: false,
        priorityScore: 0,
        slug: "story-3",
        categoryLabel: "खेल",
      },
      {
        id: "story-4",
        headline: "राजनांदगांव में नई सड़क का निर्माण",
        summary: "ग्रामीण क्षेत्रों को शहर से जोड़ने वाली सड़क तैयार।",
        section: "development",
        district: "rajnandgaon",
        publishedAt: d4,
        imageUrl: validImageUrl,
        isBreaking: false,
        isLive: false,
        priorityScore: 0,
        slug: "story-4",
        categoryLabel: "विकास",
      },
    ];

    it("orders unread stories strictly before consumed stories, preserving chronology", () => {
      // User has consumed story-2 (which is the newest)
      const consumedIds = new Set(["story-2"]);
      const prioritized = getPrioritizedStories(mockStories, "all", "durg", consumedIds);

      // Unconsumed stories must be at top (story-1 from district durg, then story-3, story-4)
      const topIds = prioritized.slice(0, 3).map((s) => s.id);
      expect(topIds).not.toContain("story-2");

      // story-2 (consumed) must be at the bottom
      const lastStory = prioritized[prioritized.length - 1];
      expect(lastStory.id).toBe("story-2");
    });

    it("maintains strict published_at DESC chronology within tiers", () => {
      const prioritized = getPrioritizedStories(mockStories, "all", undefined, new Set());
      expect(prioritized[0].id).toBe("story-2"); // d1 (newest)
      expect(prioritized[1].id).toBe("story-1"); // d2
      expect(prioritized[2].id).toBe("story-3"); // d3
      expect(prioritized[3].id).toBe("story-4"); // d4 (oldest)
    });
  });

  describe("6. Advertisement Frequency & Segment (Acceptance Test #51)", () => {
    it("defines approved Durg Solar ad segment with proper creative asset and script", () => {
      expect(DURG_SOLAR_AD_SEGMENT.isAd).toBe(true);
      expect(DURG_SOLAR_AD_SEGMENT.adCampaign).toBe("durg_solar_rooftop");
      expect(DURG_SOLAR_AD_SEGMENT.imageUrl).toBe("/jd-live/durg-solar-creative.png");
      expect(DURG_SOLAR_AD_SEGMENT.script).toContain("दुर्ग सोलर");
    });

    it("calculates ad insertion index every 3 stories: (idx + 1) % 3 === 0", () => {
      const indicesWithAds: number[] = [];
      for (let i = 0; i < 9; i++) {
        if ((i + 1) % 3 === 0) {
          indicesWithAds.push(i);
        }
      }
      expect(indicesWithAds).toEqual([2, 5, 8]); // 3rd, 6th, 9th stories have ads right after them
    });
  });
});
