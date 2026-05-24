import Link from "next/link";
import type { ReactNode } from "react";
import { CardThumbnail } from "@/components/cards/CardThumbnail";

export type PremiumVideoCardProps = {
  href: string;
  title: string;
  kicker?: string;
  meta?: ReactNode;
  imageSrc?: string | null;
  imageSizes?: string;
  priority?: boolean;
  isLive?: boolean;
  className?: string;
};

export function PremiumVideoCard({
  href,
  title,
  kicker,
  meta,
  imageSrc,
  imageSizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  isLive = false,
  className = "",
}: PremiumVideoCardProps) {
  return (
    <article
      className={`pcard pcard--video pcard-enter ds-hover-lift ${className}`.trim()}
    >
      <Link href={href} className="pcard__link tap-target ds-press">
        <div className="relative">
          <CardThumbnail
            src={imageSrc}
            alt=""
            aspect="16:9"
            overlay="bottom"
            priority={priority}
            sizes={imageSizes}
            badges={undefined}
          />
          <span className="pcard__play" aria-hidden />
        </div>
        <div className="pcard__body">
          {kicker ? <span className="pcard__kicker">{kicker}</span> : null}
          <h3 className="pcard__headline">{title}</h3>
          {meta ? <div className="pcard__meta">{meta}</div> : null}
        </div>
      </Link>
    </article>
  );
}
