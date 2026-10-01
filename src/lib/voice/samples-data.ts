/**
 * Verification sample copy (pure data; no server imports so scripts can use it).
 * Generic public-interest text — no real individuals, no claims.
 */

import type { NewsScriptInput } from "@/lib/voice/script/news-script";
import type { DeliveryStyle, VoiceLanguage } from "@/lib/voice/types";

export type VoiceSampleSpec = {
  name: string;
  label: string;
  language: VoiceLanguage;
  style: DeliveryStyle;
  input: NewsScriptInput;
};

export const VOICE_SAMPLES: VoiceSampleSpec[] = [
  {
    name: "hindi-breaking",
    label: "Hindi · breaking news",
    language: "hi-IN",
    style: "breaking_news",
    input: {
      language: "hi",
      kind: "tv",
      isBreaking: true,
      headline: "रायपुर में भारी बारिश से नदी-नाले उफान पर, निचले इलाकों में पानी भरा",
      summary:
        "राजधानी रायपुर में बीती रात से हो रही तेज़ बारिश के बाद कई निचले इलाकों में पानी भर गया है। जिला प्रशासन ने लोगों से सावधानी बरतने की अपील की है।",
      body: "नगर निगम की टीमें 24 घंटे तैनात हैं। प्रशासन के मुताबिक अगले दो दिन तक भारी बारिश की संभावना है, इसलिए लोग बिना ज़रूरत घरों से न निकलें।",
      district: "रायपुर",
    },
  },
  {
    name: "hindi-normal",
    label: "Hindi · normal bulletin",
    language: "hi-IN",
    style: "standard_bulletin",
    input: {
      language: "hi",
      kind: "tv",
      headline: "छत्तीसगढ़ सरकार ने किसानों के लिए धान खरीदी की तारीख़ों का ऐलान किया",
      summary:
        "राज्य सरकार ने इस साल धान खरीदी एक नवंबर से शुरू करने का फैसला किया है। किसानों के पंजीयन की प्रक्रिया अगले सप्ताह से शुरू होगी।",
      body: "अधिकारियों के अनुसार सभी जिलों में खरीदी केंद्र बनाए जाएंगे और भुगतान सीधे किसानों के बैंक खाते में किया जाएगा।",
    },
  },
  {
    name: "english-breaking",
    label: "English · breaking news",
    language: "en-IN",
    style: "breaking_news",
    input: {
      language: "en",
      kind: "tv",
      isBreaking: true,
      headline: "Heavy rain floods low-lying areas of Raipur, district administration issues advisory",
      summary:
        "Continuous rain since last night has waterlogged several low-lying areas of Raipur. The district administration has urged residents to stay alert and avoid unnecessary travel.",
      body: "Municipal teams have been deployed round the clock. Officials said heavy rain is likely to continue for the next two days.",
      district: "Raipur",
    },
  },
  {
    name: "english-normal",
    label: "English · normal bulletin",
    language: "en-IN",
    style: "standard_bulletin",
    input: {
      language: "en",
      kind: "tv",
      headline: "Chhattisgarh announces paddy procurement schedule for this season",
      summary:
        "The state government has decided to begin paddy procurement from the first of November. Farmer registration will start next week.",
      body: "Officials said procurement centres will be set up in every district and payments will be transferred directly to farmers' bank accounts.",
    },
  },
];
