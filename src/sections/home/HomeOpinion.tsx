import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";

const OPINIONS = [
  {
    author: "Prof. Ramesh Sahu",
    title: "Regional media must slow for verification",
    href: "#opinion",
  },
  {
    author: "Meenakshi Verma",
    title: "Why ward water charts belong on the front page",
    href: "#opinion",
  },
];

export function HomeOpinion() {
  return (
    <section id="opinion" className="news-scroll-target feed-section bg-[var(--paper)]">
      <div className="feed-section__inner">
        <FeedSectionHeader title="Editorial" titleHi="संपादकीय" href="#opinion" />
        <ul className="quick-read-list">
          {OPINIONS.map((item) => (
            <li key={item.author} className="quick-read-item">
              <Link href={item.href} className="quick-read-link story-link">
                <span className="quick-read-title">{item.title}</span>
                <span className="quick-read-time">{item.author}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
