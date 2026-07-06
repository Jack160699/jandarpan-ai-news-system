"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { getSeoHomepagePrimaryClusters } from "@/lib/seo/homepage-hub";
import { SITE_URL } from "@/lib/seo/constants";
import { useLanguage } from "@/providers/LanguageProvider";

export function HomepageSeoHub() {
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);

  const clusters = useMemo(() => getSeoHomepagePrimaryClusters(), []);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: pickBilingualLabel(
        language,
        "Jan Darpan News Topics",
        "जन दर्पण समाचार विषय"
      ),
      itemListElement: clusters.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: pickBilingualLabel(language, c.titleEn, c.titleHi),
        url: `${SITE_URL}${c.path}`,
        description: pickBilingualLabel(
          language,
          c.descriptionEn,
          c.descriptionHi
        ),
      })),
    }),
    [language, clusters]
  );

  return (
    <section
      id="seo-topics"
      className="seo-hub nr-section scroll-mt-24"
      aria-labelledby="seo-hub-title"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="nr-wrap pl-container">
        <header className="seo-hub__head">
          <p className="seo-hub__kicker">
            {pickBilingualLabel(language, "Explore topics", "विषय खोजें")}
          </p>
          <h2 id="seo-hub-title" className="seo-hub__title">
            {pickBilingualLabel(
              language,
              "Chhattisgarh & India — full news directory",
              "छत्तीसगढ़ और भारत — पूरी खबर निर्देशिका"
            )}
          </h2>
          <p className="seo-hub__desc">
            {pickBilingualLabel(
              language,
              "Jobs, markets, districts, cricket, fact-check, and more — updated by our editorial desk.",
              "नौकरी, बाजार, जिला, क्रिकेट, फैक्ट चेक और अन्य विषय — संपादकीय डेस्क द्वारा अपडेट।"
            )}
          </p>
        </header>

        <div className="seo-hub__list" role="list">
          {clusters.map((cluster) => {
            const open = openId === cluster.id;
            const title = pickBilingualLabel(
              language,
              cluster.titleEn,
              cluster.titleHi
            );
            const desc = pickBilingualLabel(
              language,
              cluster.descriptionEn,
              cluster.descriptionHi
            );

            return (
              <article
                key={cluster.id}
                className={`seo-hub__item${open ? " is-open" : ""}`}
                role="listitem"
              >
                <button
                  type="button"
                  className="seo-hub__trigger tap-target"
                  aria-expanded={open}
                  onClick={() =>
                    setOpenId((id) => (id === cluster.id ? null : cluster.id))
                  }
                >
                  <span>
                    <span className="seo-hub__item-title">{title}</span>
                    <span className="seo-hub__keywords">
                      {cluster.keywords.slice(0, 3).join(" · ")}
                    </span>
                  </span>
                  <ChevronDown
                    className={`seo-hub__chev${open ? " is-open" : ""}`}
                    size={18}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      className="seo-hub__panel"
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <p className="seo-hub__panel-desc">{desc}</p>
                      <div className="seo-hub__links">
                        <Link
                          href={cluster.path}
                          className="seo-hub__primary tap-target"
                        >
                          {pickBilingualLabel(language, "Browse hub", "हब देखें")} →
                        </Link>
                        {cluster.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="seo-hub__link tap-target"
                          >
                            {pickBilingualLabel(
                              language,
                              link.labelEn,
                              link.labelHi
                            )}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
