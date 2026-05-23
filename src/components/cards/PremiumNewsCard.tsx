import Link from "next/link";
import type { ReactNode } from "react";
import { CardThumbnail } from "@/components/cards/CardThumbnail";
import type { ThumbAspect } from "@/components/cards/types";

export type PremiumNewsCardProps = {
  href: string;
  headline: string;
  kicker?: string;
  deck?: string;
  meta?: ReactNode;
  imageSrc?: string | null;
  imageAlt?: string;
  imageSizes?: string;
  priority?: boolean;
  variant?: "standard" | "compact" | "lead";
  badges?: ReactNode;
  className?: string;
  lang?: string;
  onClick?: () => void;
};

function layoutClass(variant: PremiumNewsCardProps["variant"]): string {
  switch (variant) {
    case "compact":
      return "pcard--news-compact";
    case "lead":
      return "pcard--news-lead";
    default:
      return "";
  }
}

function thumbAspect(variant: PremiumNewsCardProps["variant"]): ThumbAspect {
  if (variant === "compact") return "4:5";
  return "16:9";
}

export function PremiumNewsCard({
  href,
  headline,
  kicker,
  deck,
  meta,
  imageSrc,
  imageAlt,
  imageSizes = "(max-width: 768px) 100vw, 40vw",
  priority = false,
  variant = "standard",
  badges,
  className = "",
  lang,
}: PremiumNewsCardProps) {
  const showImage = Boolean(imageSrc) || variant !== "compact";

  return (
    <article
      className={`pcard pcard--news pcard-enter ds-hover-lift ${layoutClass(variant)} ${className}`.trim()}
    >
      <Link href={href} className="pcard__link tap-target ds-press">
        {showImage ? (
          <CardThumbnail
            src={imageSrc}
            alt={imageAlt ?? headline.slice(0, 120)}
            aspect={thumbAspect(variant)}
            overlay={variant === "lead" ? "bottom" : "subtle"}
            priority={priority}
            sizes={imageSizes}
            badges={badges}
          />
        ) : null}
        <div className="pcard__body">
          {kicker ? <span className="pcard__kicker">{kicker}</span> : null}
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
