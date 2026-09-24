import { describe, it, expect } from "vitest";
import { resolveCanonicalStoryDistrict } from "./canonical-district";

describe("resolveCanonicalStoryDistrict", () => {
  it("resolves Durg district from explicit tag or mention", () => {
    const res = resolveCanonicalStoryDistrict({
      headline: "दुर्ग जिले में सड़क सुरक्षा अभियान शुरू",
    });
    expect(res.districtSlug).toBe("durg");
    expect(res.nameHi).toBe("दुर्ग");
    expect(res.nameEn).toBe("Durg");
    expect(res.displayTagHi).toBe("दुर्ग");
    expect(res.isStatewide).toBe(false);
  });

  it("maps Bhilai city to Durg district", () => {
    const res = resolveCanonicalStoryDistrict({
      headline: "भिलाई में नई सड़क परियोजना का उद्घाटन",
    });
    expect(res.districtSlug).toBe("durg");
    expect(res.nameHi).toBe("दुर्ग");
    expect(res.nameEn).toBe("Durg");
    expect(res.displayTagHi).toBe("दुर्ग");
  });

  it("resolves Raipur from city mention", () => {
    const res = resolveCanonicalStoryDistrict({
      headline: "रायपुर के पूर्व मेयर एजाज ढेबर को मिली धमकी",
    });
    expect(res.districtSlug).toBe("raipur");
    expect(res.nameHi).toBe("रायपुर");
    expect(res.nameEn).toBe("Raipur");
  });

  it("maps Ambikapur city to Surguja district", () => {
    const res = resolveCanonicalStoryDistrict({
      headline: "अंबिकापुर मेडिकल कॉलेज में नई सुविधाएं शुरू",
    });
    expect(res.districtSlug).toBe("surguja");
    expect(res.nameHi).toBe("सरगुजा");
    expect(res.nameEn).toBe("Surguja");
  });

  it("maps Jagdalpur city to Bastar district", () => {
    const res = resolveCanonicalStoryDistrict({
      headline: "जगदलपुर में बस्तर दशहरा की तैयारियां शुरू",
    });
    expect(res.districtSlug).toBe("bastar");
    expect(res.nameHi).toBe("बस्तर");
    expect(res.nameEn).toBe("Bastar");
  });

  it("maps Kawardha city to Kabirdham district", () => {
    const res = resolveCanonicalStoryDistrict({
      headline: "कवर्धा में किसानों को मिला मुआवजा",
    });
    expect(res.districtSlug).toBe("kabirdham");
    expect(res.nameHi).toBe("कबीरधाम");
  });

  it("resolves Bilaspur, Korba, Rajnandgaon, Balod, Bemetara", () => {
    expect(resolveCanonicalStoryDistrict({ headline: "बिलासपुर हाईकोर्ट का बड़ा फैसला" }).districtSlug).toBe("bilaspur");
    expect(resolveCanonicalStoryDistrict({ headline: "कोरबा में कोयला खदान में हादसा" }).districtSlug).toBe("korba");
    expect(resolveCanonicalStoryDistrict({ headline: "राजनांदगांव में खेल प्रतियोगिता आयोजित" }).districtSlug).toBe("rajnandgaon");
    expect(resolveCanonicalStoryDistrict({ headline: "बालोद में किसान सम्मेलन संपन्न" }).districtSlug).toBe("balod");
    expect(resolveCanonicalStoryDistrict({ headline: "बेमेतरा में कृषि कार्यशाला का आयोजन" }).districtSlug).toBe("bemetara");
    expect(resolveCanonicalStoryDistrict({ headline: "बीजापुर में सुरक्षा बलों की बड़ी कार्रवाई" }).districtSlug).toBe("bijapur");
  });

  it("correctly handles genuinely statewide governance stories without falsifying a district", () => {
    const res = resolveCanonicalStoryDistrict({
      headline: "साय कैबिनेट का बड़ा फैसला: प्रदेश के सभी 33 कलेक्टरों को विशेष निर्देश",
      summary: "मंत्रालय महानदी भवन में आयोजित बैठक में राज्य सरकार ने महत्वपूर्ण नीतिगत निर्णय लिए।",
    });
    expect(res.districtSlug).toBeNull();
    expect(res.isStatewide).toBe(true);
    expect(res.displayTagHi).not.toBe("छत्तीसगढ़");
    expect(res.displayTagEn).not.toBe("Chhattisgarh");
    expect(res.displayTagHi).toBe("राज्य डेस्क");
  });

  it("NEVER outputs 'Chhattisgarh' as a visible district tag", () => {
    const res = resolveCanonicalStoryDistrict({
      explicitDistrict: "chhattisgarh",
      headline: "छत्तीसगढ़ में नए निवेश प्रस्तावों को मंजूरी",
    });
    expect(res.displayTagHi).not.toBe("छत्तीसगढ़");
    expect(res.displayTagEn).not.toBe("Chhattisgarh");
    expect(res.nameHi).toBeNull();
    expect(res.isStatewide).toBe(true);
  });
});
