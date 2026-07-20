import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SNAPSHOT_POLICY_SUMMARY_HI } from "@/lib/verified-rates/snapshot-policy";
import { webPageJsonLd } from "@/lib/seo/json-ld";

export const metadata: Metadata = buildPageMetadata({
  title: "दर सत्यापन पद्धति — जन दर्पण",
  description:
    "जन दर्पण कैसे सत्यापित पेट्रोल, डीजल, सोना और चांदी दरें संग्रहित करता है — दैनिक स्नैपशॉट नीति, अंतराल, और अस्वीकरण।",
  path: "/rates/methodology",
  locale: "hi_IN",
  section: "rates",
});

export default function RatesMethodologyPage() {
  const jsonLd = webPageJsonLd(
    "दर सत्यापन पद्धति",
    "सत्यापित दरों की नीति और सीमाएँ",
    "/rates/methodology"
  );

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 16, lineHeight: 1.6 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>दर सत्यापन पद्धति</h1>
      <p>
        जन दर्पण काल्पनिक इतिहास या सिंथेटिक ट्रेंड नहीं बनाता। केवल सत्यापित स्वीकृत
        स्नैपशॉट ग्राफ़ में जाते हैं। रैंकिंग या बैकलिंक की गारंटी नहीं।
      </p>

      <h2>दैनिक स्नैपशॉट नीति</h2>
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", background: "#f6f6f6", padding: 12 }}>
        {SNAPSHOT_POLICY_SUMMARY_HI}
      </pre>

      <h2>स्रोत पात्रता</h2>
      <ul>
        <li>ईंधन: HPCL-via-ULIP (लाइसेंस + प्रदर्शन अधिकार आवश्यक)</li>
        <li>बुलियन: IBJA Rates API (टोकन + लिखित प्रकाशन सहमति आवश्यक)</li>
        <li>तीसरे पक्ष की स्क्रैपिंग अस्वीकृत</li>
      </ul>

      <h2>लापता दिन</h2>
      <p>
        अनुपलब्ध दिनों को कल की कीमत से नहीं भरा जाता। ग्राफ़ में अंतराल स्पष्ट रहते हैं।
      </p>

      <h2>सुधार</h2>
      <p>
        <Link href="/contact">संपर्क</Link> के माध्यम से सुधार अनुरोध भेजें।{" "}
        <Link href="/rates">दरें हब</Link>
      </p>
    </main>
  );
}
