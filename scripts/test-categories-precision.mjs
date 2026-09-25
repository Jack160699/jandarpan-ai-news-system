import { resolveCanonicalCategories } from "../src/lib/editorial/canonical-categories.js";

const testCases = [
  {
    name: "Jashpur Elephant",
    hl: "जशपुर वन मंडल में दंतैल हाथी का शव मिलने के बाद जांच तेज, करंट या आपसी संघर्ष की आशंका",
    sum: "तपकरा परिक्षेत्र के कुनकुरी जंगल में मिले वयस्क नर हाथी के शव का पोस्टमार्टम किया गया",
    sec: "india",
  },
  {
    name: "Ministry Bus Fire",
    hl: "नवा रायपुर में मंत्रालय कर्मचारी बस में लगी अचानक आग, चालक की सूझबूझ से सभी 30 कर्मचारी सुरक्षित",
    sum: "सेक्टर-19 के पास इंजन से धुआं उठते ही बस रोककर सवारियों को सुरक्षित नीचे उतारा गया",
    sec: "raipur",
  },
  {
    name: "Kawardha Road Inspection",
    hl: "कवर्धा में 2 करोड़ की लागत से बनी सड़क पर सवाल, गुणवत्ता की जांच के लिए तकनीकी टीम गठित",
    sum: "पीएम जनमन योजना के तहत बोड़ला विकासखंड में तीन माह पहले बनी डामर सड़क उखड़ने पर कलेक्टर ने लिया संज्ञान",
    sec: "india",
  },
  {
    name: "Surguja Timber Seizure",
    hl: "सरगुजा के लुण्ड्रा वन परिक्षेत्र में सागौन की अवैध कटाई पर बड़ी कार्रवाई, लकड़ी का जखीरा जब्त",
    sum: "वन विभाग के विशेष उड़नदस्ते ने छापेमारी कर तस्करों द्वारा छुपाकर रखी गई 5 लाख मूल्य की इमारती लकड़ी पकड़ी",
    sec: "india",
  },
  {
    name: "MP WhatsApp Hack FIR",
    hl: "राज्यसभा सांसद फूलो देवी नेताम का व्हाट्सएप हैक, कोंडागांव कोतवाली में एफआईआर दर्ज",
    sum: "हैकर द्वारा संपर्क सूची के लोगों को आपत्तिजनक संदेश भेजने पर पुलिस ने शुरू की जांच",
    sec: "india",
  },
  {
    name: "Raipur Exam Paper Blunder",
    hl: "रायपुर में तिमाही परीक्षा के पहले दिन लापरवाही, हिंदी के प्रश्नपत्र में एक ही सवाल तीन बार",
    sum: "रायपुर में कक्षा छठवीं की तिमाही परीक्षा के पहले दिन हिंदी के प्रश्नपत्र में बड़ी लापरवाही सामने आई",
    sec: "raipur",
  },
];

for (const tc of testCases) {
  const res = resolveCanonicalCategories({
    headline: tc.hl,
    summary: tc.sum,
    section: tc.sec,
  });
  console.log(`[${tc.name}] => Categories: ${JSON.stringify(res.categories)} | Primary: ${res.primaryCategory}`);
}
