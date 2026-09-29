import { describe, expect, it } from "vitest";
import { numberToEnglishIndian, numberToHindi } from "@/lib/voice/script/numbers";
import {
  expandAbbreviations,
  normalizeDates,
  normalizeForSpeech,
  normalizeNumbers,
  normalizeTimes,
  normalizeUnits,
  stripWebJunk,
} from "@/lib/voice/script/normalize";
import {
  buildNewsScript,
  countWords,
  overlapRatio,
  pickDeliveryStyle,
  renderForChirp,
  renderForGemini,
  shapeSentence,
} from "@/lib/voice/script/news-script";

describe("Indian number words", () => {
  it.each([
    [0, "zero", "शून्य"],
    [5, "five", "पाँच"],
    [21, "twenty-one", "इक्कीस"],
    [99, "ninety-nine", "निन्यानवे"],
    [100, "one hundred", "एक सौ"],
    [2500, "two thousand five hundred", "दो हज़ार पाँच सौ"],
    [12345, "twelve thousand three hundred and forty-five", "बारह हज़ार तीन सौ पैंतालीस"],
    [125000, "one lakh twenty-five thousand", "एक लाख पच्चीस हज़ार"],
    [2500000, "twenty-five lakh", "पच्चीस लाख"],
    [35000000, "three crore fifty lakh", "तीन करोड़ पचास लाख"],
  ])("%i", (n, en, hi) => {
    expect(numberToEnglishIndian(n)).toBe(en);
    expect(numberToHindi(n)).toBe(hi);
  });
});

describe("web junk removal", () => {
  it("strips HTML, markdown, URLs, emails, hashtags, emoji and source/SEO lines", () => {
    const raw = `<p>रायपुर में <b>भारी बारिश</b> हुई।</p>\n[यहाँ पढ़ें](https://x.com/a)\n**बड़ी खबर** #Raipur 🔥\nस्रोत: दैनिक भास्कर\nये भी पढ़ें: और खबरें\nसंपर्क: desk@example.com https://site.com/story\nTags: raipur, rain`;
    const out = stripWebJunk(raw);
    expect(out).toContain("रायपुर में भारी बारिश हुई।");
    expect(out).toContain("यहाँ पढ़ें");
    expect(out).toContain("बड़ी खबर Raipur");
    for (const bad of ["<p>", "https", "@example", "स्रोत", "ये भी पढ़ें", "🔥", "Tags", "**"]) expect(out).not.toContain(bad);
  });
});

describe("abbreviations, units, dates, times, numbers", () => {
  it("expands abbreviations per language and protects names", () => {
    expect(expandAbbreviations("CM ने SP से बात की", "hi")).toBe("मुख्यमंत्री ने पुलिस अधीक्षक से बात की");
    expect(expandAbbreviations("The CM met Dr. Rao.", "en")).toBe("The Chief Minister met Doctor Rao.");
    expect(expandAbbreviations("अभिनेता CM Punk आए", "hi", ["CM Punk"])).toBe("अभिनेता CM Punk आए");
  });

  it("normalises currency, percent, temperature and distance", () => {
    expect(normalizeUnits("₹5 करोड़ का घोटाला, 45% बढ़ोतरी, 38°C, 12 km", "hi")).toBe(
      "5 करोड़ रुपये का घोटाला, 45 प्रतिशत बढ़ोतरी, 38 डिग्री सेल्सियस, 12 किलोमीटर"
    );
    expect(normalizeUnits("Rs. 25 lakh, 45% rise, 38°C", "en")).toBe("25 lakh rupees, 45 percent rise, 38 degrees Celsius");
  });

  it("normalises dates in Indian day-first and ISO forms, leaving invalid ones", () => {
    expect(normalizeDates("29/09/2026 को", "hi")).toBe("29 सितंबर 2026 को");
    expect(normalizeDates("on 2026-09-29", "en")).toBe("on 29 September 2026");
    expect(normalizeDates("31-13-2026", "en")).toBe("31-13-2026");
  });

  it("normalises times", () => {
    expect(normalizeTimes("सुबह 9:00 AM और 3:30 PM को", "hi")).toContain("सुबह 9:00 बजे");
    expect(normalizeTimes("3:30 PM को", "hi")).toContain("दोपहर 3:30 बजे");
    expect(normalizeTimes("6:00 PM को", "hi")).toContain("शाम 6:00 बजे");
    expect(normalizeTimes("9:15 PM को", "hi")).toContain("रात 9:15 बजे");
  });

  it("spells out big plain quantities but not years, IDs or decimals", () => {
    expect(normalizeNumbers("1,25,000 लोग", "hi")).toBe("एक लाख पच्चीस हज़ार लोग");
    expect(normalizeNumbers("12500 votes", "en")).toBe("twelve thousand five hundred votes");
    expect(normalizeNumbers("वर्ष 2026 में", "hi")).toBe("वर्ष 2026 में");
    expect(normalizeNumbers("CG04-1234 vehicle", "en")).toBe("CG04-1234 vehicle");
    expect(normalizeNumbers("2.5 करोड़", "hi")).toBe("2.5 करोड़");
    expect(normalizeNumbers("भाव 500 रुपये", "hi")).toBe("भाव 500 रुपये");
  });

  it("composes the whole pipeline", () => {
    const out = normalizeForSpeech("CM ने ₹1,25,000 की सहायता का ऐलान 29/09/2026 को किया https://x.co", "hi");
    expect(out).toBe("मुख्यमंत्री ने एक लाख पच्चीस हज़ार रुपये की सहायता का ऐलान 29 सितंबर 2026 को किया");
  });
});

const HI_ARTICLE = {
  language: "hi" as const,
  headline: "रायपुर के पंडरी इलाके में होर्डिंग पोल से लटका मिला युवक का शव - दैनिक भास्कर",
  summary: "रायपुर पुलिस ने पंडरी क्षेत्र में एक युवक का शव बरामद किया है। पुलिस मामले की जांच कर रही है।",
  body: `रायपुर के पंडरी इलाके में गुरुवार सुबह पुलिस ने एक युवक का शव होर्डिंग पोल से लटका हुआ बरामद किया। मृतक की उम्र करीब 28 वर्ष बताई जा रही है और उसके सिर पर चोट के निशान मिले हैं, जिसके बाद पुलिस ने हत्या की आशंका जताते हुए मामला दर्ज कर लिया है। पंडरी थाना पुलिस ने शव को पोस्टमॉर्टम के लिए भेज दिया।
स्रोत: भिलाई टाइम्स ब्यूरो | जन दर्पण ब्यूरो द्वारा सत्यापित स्थानीय कवरेज।`,
  district: "रायपुर",
};

describe("buildNewsScript", () => {
  it("reads the headline once, drops boilerplate/source lines, and never repeats it in the summary", () => {
    const s = buildNewsScript({ ...HI_ARTICLE, kind: "tv" });
    expect(s.text).not.toContain("दैनिक भास्कर");
    expect(s.text).not.toContain("स्रोत");
    expect(s.text).not.toContain("सत्यापित");
    const headlineWords = "होर्डिंग पोल से लटका मिला युवक का शव";
    expect(s.text.split(headlineWords).length - 1).toBe(1);
    expect(s.text.startsWith("रायपुर के पंडरी इलाके")).toBe(true);
    expect(s.text.endsWith("।")).toBe(true);
  });

  it("respects the per-kind length budgets", () => {
    const radio = buildNewsScript({ ...HI_ARTICLE, kind: "radio" });
    const tv = buildNewsScript({ ...HI_ARTICLE, kind: "tv" });
    const short = buildNewsScript({ ...HI_ARTICLE, kind: "short_bulletin" });
    expect(short.wordCount).toBeLessThanOrEqual(52);
    expect(tv.wordCount).toBeLessThanOrEqual(100);
    expect(radio.wordCount).toBeLessThanOrEqual(170);
    expect(short.wordCount).toBeLessThan(tv.wordCount + 1);
    expect(tv.wordCount).toBeLessThanOrEqual(radio.wordCount);
    expect(short.estimatedSeconds).toBeLessThan(25);
  });

  it("adds a dateline only for radio and only from evidence-based district input", () => {
    expect(buildNewsScript({ ...HI_ARTICLE, kind: "radio" }).text).toContain("रायपुर से खबर।");
    expect(buildNewsScript({ ...HI_ARTICLE, kind: "tv" }).text).not.toContain("से खबर।");
    expect(buildNewsScript({ ...HI_ARTICLE, district: null, kind: "radio" }).text).not.toContain("से खबर।");
  });

  it("adds a breaking cue only when breaking", () => {
    expect(buildNewsScript({ ...HI_ARTICLE, kind: "tv", isBreaking: true }).text.startsWith("ब्रेकिंग न्यूज़।")).toBe(true);
    expect(buildNewsScript({ ...HI_ARTICLE, kind: "tv" }).text).not.toContain("ब्रेकिंग");
  });

  it("splits over-long sentences and ends every sentence with the right terminator", () => {
    const long =
      "the state government has announced a major relief package for farmers affected by the floods in several districts, and officials said the money would be transferred within a week after verification of damage reports by revenue teams";
    const parts = shapeSentence(long, "en");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(countWords(p)).toBeLessThanOrEqual(27);
      expect(p.endsWith(".")).toBe(true);
    }
  });

  it("builds an English radio script with normalised money and dates", () => {
    const s = buildNewsScript({
      language: "en",
      kind: "radio",
      district: "Raipur",
      headline: "CM announces Rs. 25 lakh aid for flood-hit families in Raipur",
      summary: "The Chief Minister announced the aid on 29/09/2026. Officials will verify the damage first.",
      body: "Families in the low-lying areas of Raipur will receive support of Rs. 25 lakh in total, an official said. Read more: https://example.com/x",
    });
    expect(s.text).toContain("News from Raipur.");
    expect(s.text).toContain("Chief Minister announces 25 lakh rupees");
    expect(s.text).toContain("29 September 2026");
    expect(s.text).not.toContain("http");
    expect(s.text).not.toMatch(/Read more/i);
  });

  it("renders provider-specific text (paragraph pauses for Gemini, pause tags for Chirp)", () => {
    const s = buildNewsScript({ ...HI_ARTICLE, kind: "tv" });
    expect(renderForGemini(s)).toContain("\n\n");
    expect(renderForChirp(s)).toContain("[pause]");
    expect(renderForChirp(s)).not.toContain("\n");
  });

  it("overlapRatio detects headline echoes", () => {
    expect(overlapRatio("Heavy rain alert for South Chhattisgarh", "Heavy rain alert issued for South Chhattisgarh today")).toBeGreaterThan(0.7);
    expect(overlapRatio("Farmers protest over crop prices", "Cricket team wins the final")).toBe(0);
  });
});

describe("pickDeliveryStyle", () => {
  it.each([
    [{ headline: "Chief Minister announces cabinet reshuffle", urgencyScore: 95 }, "breaking_news"],
    [{ headline: "IPL: Mumbai beat Chennai by 5 wickets" }, "sports"],
    [{ headline: "छत्तीसगढ़ में भारी बारिश का येलो अलर्ट, अगले 24 घंटे अहम" }, "weather"],
    [{ headline: "सड़क हादसे में तीन की मौत" }, "serious_report"],
    [{ headline: "प्रशासन ने जारी की एडवाइजरी, यातायात डायवर्ट" }, "urgency"],
    [{ headline: "किसान की बेटी ने रचा इतिहास, गांव को मिसाल पर गर्व" }, "human_interest"],
    [{ headline: "जानिए क्या है नई नीति और क्यों हो रहा है विरोध" }, "explainer"],
    [{ headline: "Municipal corporation approves new budget for roads" }, "standard_bulletin"],
  ])("%j -> %s", (signals, style) => {
    expect(pickDeliveryStyle(signals as never)).toBe(style);
  });

  it("an explicit breaking flag wins over topic", () => {
    expect(pickDeliveryStyle({ headline: "IPL final today", isBreaking: true })).toBe("breaking_news");
  });
});
