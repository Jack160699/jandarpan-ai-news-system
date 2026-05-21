"use client";

import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { useLanguage } from "@/providers/LanguageProvider";

const OPINIONS = [
  {
    author: "Prof. Ramesh Sahu",
    titleEn: "Regional media must slow for verification",
    titleHi: "क्षेत्रीय मीडिया को सत्यापन के लिए धीमा होना चाहिए",
    href: "#opinion",
  },
  {
    author: "Meenakshi Verma",
    titleEn: "Why ward water charts belong on the front page",
    titleHi: "वार्ड जल चार्ट मुखपृष्ठ पर क्यों होने चाहिए",
    href: "#opinion",
  },
];

export function HomeOpinion() {
  const { language, t } = useLanguage();

  return (
    <section id="opinion" className="news-scroll-target feed-section bg-[var(--paper)]">
      <div className="feed-section__inner">
        <FeedSectionHeader title={t.home.opinion} href="#opinion" />
        <ul className="quick-read-list">
          {OPINIONS.map((item) => (
            <li key={item.author} className="quick-read-item">
              <Link href={item.href} className="quick-read-link story-link tap-target">
                <span className="quick-read-title">
                  {language === "en" ? item.titleEn : item.titleHi}
                </span>
                <span className="quick-read-time">{item.author}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
