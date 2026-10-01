import { describe, expect, it } from "vitest";
import { isGenericRoundupSourceTitle } from "./source-title-quality";

describe("isGenericRoundupSourceTitle (pre-AI filter for aggregator live-page / roundup events)", () => {
  it("flags the real aggregator event title that cost ~8k CodeCraft tokens per candidate in production", () => {
    expect(isGenericRoundupSourceTitle("पढ़ें 2 अक्टूबर के मुख्य और ताजा समाचार - लाइव ब्रेकिंग न्यूज")).toBe(true);
  });

  it("does NOT flag any of the real event titles that went on to publish (false-positive guard, 14 production titles)", () => {
    const published = [
      "CG Police Transfer: छत्तीसगढ़ पुलिस में बंपर तबादले, एक साथ इतने इंस्पेक्टरों का ट्रांसफर, पुलिस मुख्यालय से जारी आदेश",
      "छत्तीसगढ़ में 854 व्याख्याता पदों पर भर्ती की तैयारी, इस दिन हो सकती है परीक्षा",
      "Chhattisgarh Sai Cabinet Decision Today: कॉलेजों में लागू अतिथि व्याख्याता संशोधित नीति को मंजूरी",
      "रायपुर में होर्डिंग पोल से लटका मिला युवक का शव : सिर पर चोट के निशान, 30-35 साल की उम्र",
      "छत्तीसगढ़ में बड़ा प्रशासनिक फेरबदल : राज्य प्रशासनिक सेवा के 125 अधिकारियों का तबादला",
      "भारत-यूरोपीय संघ के बीच अंतरिक्ष साझेदारी क्यों अहम, दोनों को कैसे होगा फायदा",
      "BJP J&K marks Deendayal Upadhyaya birth anniversary",
      "Emmerdale legend gushes over 'perfect job' as she lands role away from ITV soap",
      "Red Sox beat Cubs 4-3 in doubleheader opener, assure Wild Card Series matchup against Yankees",
      "Lavrov discusses Ukraine, Middle East with Indian foreign minister",
      "India strengthening public health systems through Ayushman Bharat, digital health push: Health Minister",
      "Videos Claim To Show Green Line Issue In iPhone 18 Display, Users Link It To Samsung",
    ];
    for (const t of published) expect(isGenericRoundupSourceTitle(t), t).toBe(false);
  });

  it("empty / missing titles are not flagged (other gates handle them)", () => {
    for (const t of [null, undefined, "", "   "]) expect(isGenericRoundupSourceTitle(t)).toBe(false);
  });
});
