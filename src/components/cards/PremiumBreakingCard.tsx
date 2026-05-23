import Link from "next/link";
import type { ReactNode } from "react";
import { CardThumbnail } from "@/components/cards/CardThumbnail";

export type PremiumBreakingCardProps = {
  href: string;
  headline: string;
  deck?: string;
  meta?: ReactNode;
  imageSrc?: string | null;
  imageSizes?: string;
  priority?: boolean;
  hero?: boolean;
  className?: string;
  lang?: string;
};

export function PremiumBreakingCard({
  href,
  headline,
  deck,
  meta,
  imageSrc,
  imageSizes = "(max-width: 768px) 100vw, 65vw",
  priority = false,
  hero = false,
  className = "",
  lang,
}: PremiumBreakingCardProps) {
  return (
    <article
      className={`pcard pcard--breaking pcard--news pcard-enter ds-hover-lift ${hero ? "pcard--breaking-hero" : ""} ${className}`.trim()}
    >
      <Link href={href} className="pcard__link tap-target ds-press">
        {imageSrc ? (
          <CardThumbnail
            src={imageSrc}
            alt=""
            aspect="16:9"
            overlay="breaking"
            priority={priority}
            sizes={imageSizes}
            badges={
              <span className="pcard__flag pcard__flag--breaking">Breaking</span>
            }
          />
        ) : null}
        <div className="pcard__body">
          <span className="pcard__kicker">ताज़ा · Breaking</span>
          <h3 className="pcard__headline" lang={lang}>
            {headline}
          </h3>
          {deck ? <p className="pcard__deck">{deck}</p> : null}
          {meta ? <div className="pcard__meta">{meta}</div> : null}
        </div>
      </Link>
    </article>
  );
}
