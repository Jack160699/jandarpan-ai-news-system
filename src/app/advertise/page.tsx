import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { fetchOrganizationSettings } from "@/lib/organization/settings";

export async function generateMetadata(): Promise<Metadata> {
  const org = await fetchOrganizationSettings();
  return {
    title: `विज्ञापन एवं साझेदारी | Advertise with ${org.organizationName}`,
    description: `Partner with ${org.organizationName} — Chhattisgarh's leading digital newsroom expanding across India. Explore display advertising, sponsored content, and regional audience reach.`,
  };
}

export default async function AdvertisePage() {
  const org = await fetchOrganizationSettings();

  return (
    <PageShell pageTitle="विज्ञापन एवं साझेदारी">
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">Advertise</span>
        </nav>

        <h1 className="m-0 jd-serif text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          विज्ञापन एवं साझेदारी (Advertise With Us)
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
          {org.organizationName} — छत्तीसगढ़ और भारत का विश्वसनीय, आधुनिक डिजिटल समाचार माध्यम।
        </p>

        <div className="mt-8 space-y-8">
          <section className="rounded-lg border border-[var(--jd-line)] bg-white p-6 shadow-sm">
            <h2 className="m-0 text-lg font-bold text-stone-900">
              हमारे साथ प्रचार क्यों करें?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              जन दर्पण राज्य के सभी 33 जिलों में तीव्र गति से बढ़ते पाठक वर्ग तक पहुंच प्रदान करता है।
              हमारे पाठक जागरूक, निर्णय लेने में सक्षम और क्षेत्रीय एवं राष्ट्रीय घटनाक्रमों में गहरी रुचि रखते हैं।
            </p>
            <ul className="mt-4 space-y-2 text-sm text-stone-700">
              <li className="flex items-center gap-2">
                <span className="text-[var(--jd-red)] font-bold">✓</span>
                <span><strong>हाइपरलोकल लक्षित विज्ञापन:</strong> दुर्ग, रायपुर, बिलासपुर, बस्तर सहित जिला-स्तरीय अभियान।</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--jd-red)] font-bold">✓</span>
                <span><strong>प्रीमियम डिस्प्ले स्लॉट्स:</strong> लीडरबोर्ड, इन-फ़ीड और साइडबार ब्रांड प्लेसमेंट।</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--jd-red)] font-bold">✓</span>
                <span><strong>पारदर्शी संपादकीय मानक:</strong> स्पष्ट रूप से चिह्नित प्रायोजित सामग्री जो पाठकों का विश्वास बनाए रखती है।</span>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-[var(--jd-line)] bg-white p-6 shadow-sm">
            <h2 className="m-0 text-lg font-bold text-stone-900">
              विज्ञापन एवं व्यावसायिक पूछताछ
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              कस्टम विज्ञापन पैकेज, दर सूची (Rate Card) और साझेदारी के लिए हमारी विज्ञापन टीम से संपर्क करें:
            </p>
            <div className="mt-4 rounded-md bg-[var(--jd-paper-deep)] p-4 text-sm">
              <p className="m-0 font-semibold text-stone-900">
                ईमेल:{" "}
                <a
                  href={`mailto:${org.email}?subject=Advertising Inquiry - Jan Darpan`}
                  className="text-[var(--jd-red)] hover:underline"
                >
                  {org.email}
                </a>
              </p>
              <p className="mt-2 text-xs text-stone-500">
                हमारी टीम कार्यदिवस में 24 घंटे के भीतर प्रतिक्रिया देती है।
              </p>
            </div>
          </section>

          <section className="text-xs text-stone-500">
            <p className="m-0">
              हमारी विज्ञापन नीति और पारदर्शिता मानकों के बारे में अधिक जानने के लिए कृपया हमारी{" "}
              <Link href="/ads-policy" className="text-[var(--jd-red)] underline">
                विज्ञापन नीति (Ads Policy)
              </Link>{" "}
              देखें।
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
