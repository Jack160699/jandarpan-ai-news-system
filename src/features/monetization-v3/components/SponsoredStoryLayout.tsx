import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/design-system/components/Badge";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { NOSNIPPET_ATTRS, sponsoredLinkRel } from "@/lib/monetization/seo";
import type { SponsoredStoryMeta } from "@/lib/monetization/types";

export type SponsoredStoryLayoutProps = {
  meta: SponsoredStoryMeta;
  children: ReactNode;
  className?: string;
  /** Disclosure language */
  language?: "en" | "hi";
};

/**
 * JDP-020 — Sponsored story wrapper with disclosure header and footer.
 * Wraps article body content; UI only.
 */
export function SponsoredStoryLayout({
  meta,
  children,
  className,
  language = "en",
}: SponsoredStoryLayoutProps) {
  const disclosure =
    language === "en"
      ? meta.disclosureEn
      : meta.disclosureHi ?? meta.disclosureEn;

  return (
    <div className={cn("mnv3-sponsored mnv3-enter", className)} {...NOSNIPPET_ATTRS}>
      <header
        className="mnv3-sponsored__disclosure"
        aria-label="Sponsored content disclosure"
      >
        <Badge variant="warning">Sponsored</Badge>
        {meta.sponsorLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.sponsorLogoUrl}
            alt={meta.sponsorName}
            className="mnv3-sponsored__logo"
            width={96}
            height={28}
          />
        ) : null}
        <p className="mnv3-sponsored__text">
          {disclosure}{" "}
          <span className="mnv3-sponsored__sponsor">{meta.sponsorName}</span>
        </p>
        {meta.ctaUrl ? (
          <Link
            href={meta.ctaUrl}
            rel={sponsoredLinkRel()}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {meta.ctaLabel ?? "Learn more"}
          </Link>
        ) : null}
      </header>

      <div className="mnv3-sponsored__body">{children}</div>

      <footer className="mnv3-sponsored__footer">
        <p className="mnv3-sponsored__footer-note">
          This story was produced with support from{" "}
          <strong>{meta.sponsorName}</strong>. Jan Darpan retains editorial
          independence.
        </p>
        {meta.ctaUrl ? (
          <Link
            href={meta.ctaUrl}
            rel={sponsoredLinkRel()}
            target="_blank"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Visit sponsor
          </Link>
        ) : null}
      </footer>
    </div>
  );
}
