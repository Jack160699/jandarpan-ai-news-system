import { describe, it, expect } from "vitest";
import {
  generateAnchorSpokenScript,
  extractCompleteSummarySentences,
} from "./anchor-script-engine";
import { splitIntoSpeechChunks } from "@/features/jd-live/speechController";

describe("Anchor Script Engine - Complete AI Summary Narration", () => {
  it("narrates short summary (3-4 sentences) completely without truncation or duplicate headline", () => {
    const headline = "रायपुर में नवीन फ्लाईओवर का लोकार्पण, यातायात सुगम होगा";
    const summary = "मुख्यमंत्री ने रायपुर में 45 करोड़ की लागत से बने नए फ्लाईओवर का लोकार्पण किया। इस पुल से शहर के व्यस्ततम मार्ग पर जाम की समस्या समाप्त होगी। स्थानीय नागरिकों ने इस सौगात पर हर्ष व्यक्त किया है।";

    const result = generateAnchorSpokenScript({
      headline,
      summary,
      language: "hi",
    });

    expect(result.isEligibleForLiveBroadcast).toBe(true);
    expect(result.supportingSentences.length).toBe(3);
    // Headline must appear once at the beginning
    expect(result.script.startsWith("रायपुर में नवीन फ्लाईओवर का लोकार्पण")).toBe(true);
    // All 3 sentences of the summary must be in the script
    expect(result.script).toContain("45 करोड़ की लागत से बने नए फ्लाईओवर का लोकार्पण किया");
    expect(result.script).toContain("जाम की समस्या समाप्त होगी");
    expect(result.script).toContain("स्थानीय नागरिकों ने इस सौगात पर हर्ष व्यक्त किया है");

    // Chunking test
    const chunks = splitIntoSpeechChunks(result.script, "hi");
    expect(chunks.length).toBe(4); // Headline + 3 sentences
  });

  it("narrates medium summary (5-8 sentences) completely with all sentences intact", () => {
    const headline = "महासमुंद में कंटेनर से 50 लाख का गांजा जब्त, पुलिस ने 7 अंतरराज्यीय तस्करों को दबोचा";
    const summary = "ओडिशा सीमा से आ रहे संदिग्ध कंटेनर की घेराबंदी कर पुलिस ने गुप्त केबिन से गांजा बरामद किया।";
    const body = `ओडिशा सीमा से आ रहे संदिग्ध कंटेनर की घेराबंदी कर पुलिस ने गुप्त केबिन से गांजा बरामद किया।
ओडिशा सीमा से लगे रेहटीखोल चेकपोस्ट पर पुलिस टीम ने संदेह के आधार पर कंटेनर को रोका था।
वाहन के विशेष केबिन में छुपाकर रखा गया करीब 320 किलोग्राम गांजा बरामद किया गया।
गिरफ्तार आरोपियों के खिलाफ एनडीपीएस एक्ट की गैर-जमानती धाराओं में केस दर्ज किया गया है।
अंतरराज्यीय ड्रग्स तस्करी नेटवर्क के अन्य संपर्कों को खंगालने के लिए पुलिस रिमांड की मांग करेगी।
स्रोत: महासमुंद जिला पुलिस | जन दर्पण ब्यूरो द्वारा सत्यापित स्थानीय कवरेज।`;

    const result = generateAnchorSpokenScript({
      headline,
      summary,
      articleBody: body,
      language: "hi",
    });

    expect(result.isEligibleForLiveBroadcast).toBe(true);
    // 5 distinct factual sentences (duplicate sentence 1 from summary/body dropped, boilerplate dropped)
    expect(result.supportingSentences.length).toBe(5);
    expect(result.script).toContain("320 किलोग्राम गांजा बरामद किया गया");
    expect(result.script).toContain("पुलिस रिमांड की मांग करेगी");
    expect(result.script).not.toContain("स्रोत: महासमुंद");

    // Verify chunking for medium summary
    const chunks = splitIntoSpeechChunks(result.script, "hi");
    expect(chunks.length).toBe(6); // 1 headline + 5 factual sentences
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(160);
    }
  });

  it("narrates long summary (9+ sentences) completely without artificial truncation", () => {
    const headline = "बस्तर में विकास कार्यों की नई रूपरेखा, 10 प्रमुख योजनाओं को मिली मंजूरी";
    const summary = "संभाग स्तरीय समीक्षा बैठक में कमिश्नर ने बस्तर के अंदरूनी इलाकों के लिए 10 नई विकास योजनाओं को हरी झंडी दी।";
    const body = `प्रथम चरण में 15 अंदरूनी गांवों को पक्की सड़कों से जोड़ा जाएगा।
पेयजल संकट के समाधान हेतु 50 नए सोलर पंप स्थापित किए जाएंगे।
प्राथमिक स्वास्थ्य केंद्रों में टेलीमेडिसिन सुविधा का विस्तार किया जाएगा।
स्थानीय वनोपज के प्रसंस्करण के लिए तीन नए केंद्र खोले जाएंगे।
आदिवासी युवाओं को कौशल विकास प्रशिक्षण प्रदान किया जाएगा।
स्कूली बच्चों के लिए नए आवासीय छात्रावासों का निर्माण होगा।
विद्युतीकरण से छूटे मजरों-टोलों में सौर ऊर्जा संयंत्र लगाए जाएंगे।
महिला स्व-सहायता समूहों को ऋण सहायता उपलब्ध कराई जाएगी।
सभी योजनाओं की प्रगति की साप्ताहिक समीक्षा का निर्देश दिया गया है।`;

    const result = generateAnchorSpokenScript({
      headline,
      summary,
      articleBody: body,
      language: "hi",
    });

    expect(result.isEligibleForLiveBroadcast).toBe(true);
    // 1 summary sentence + 9 body sentences = 10 supporting sentences
    expect(result.supportingSentences.length).toBe(10);
    // Verify no truncation
    expect(result.script).toContain("साप्ताहिक समीक्षा का निर्देश दिया गया है");
    expect(result.durationSec).toBeGreaterThanOrEqual(45);

    // Verify chunking handles 9+ sentences smoothly
    const chunks = splitIntoSpeechChunks(result.script, "hi");
    expect(chunks.length).toBe(11); // 1 headline + 10 sentences
  });

  it("intelligently removes duplicate opening sentence if summary repeats the headline", () => {
    const headline = "बिलासपुर में अरपा नदी के तेज बहाव में कूदे युवक को पुलिस ने सुरक्षित बाहर निकाला";
    // Summary starts with the exact headline
    const summary = "बिलासपुर में अरपा नदी के तेज बहाव में कूदे युवक को पुलिस ने सुरक्षित बाहर निकाला। पुराना पुल से नदी में गिरे युवक को देख स्थानीय नाविकों और पुलिस कर्मियों ने तत्परता से रेस्क्यू किया। प्राथमिक उपचार के लिए युवक को तत्काल सिम्स अस्पताल पहुंचाया गया।";

    const result = generateAnchorSpokenScript({
      headline,
      summary,
      language: "hi",
    });

    expect(result.supportingSentences.length).toBe(2);
    // Headline is spoken once
    const headlineCount = (result.script.match(/अरपा नदी के तेज बहाव में कूदे युवक/g) || []).length;
    expect(headlineCount).toBe(1);
    expect(result.script).toContain("पुराना पुल से नदी में गिरे युवक");
  });
});
