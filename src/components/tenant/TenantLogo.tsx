"use client";

import Image from "next/image";
import { useTenant } from "@/providers/TenantProvider";
import { useLanguage } from "@/providers/LanguageProvider";

type TenantLogoProps = {
  className?: string;
  /** Show text wordmark beside mark (desktop drawer, etc.) */
  showText?: boolean;
  /** Horizontal banner logo for app header */
  variant?: "mark" | "banner";
};

export function TenantLogo({
  className = "",
  showText = true,
  variant = "mark",
}: TenantLogoProps) {
  const { tenant } = useTenant();
  const { language } = useLanguage();
  const name =
    language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;
  const bannerSrc = tenant.branding.logoUrl;
  const markSrc = tenant.branding.logoMarkUrl ?? tenant.branding.logoUrl;

  if (variant === "banner" && bannerSrc) {
    return (
      <span
        className={`tenant-logo tenant-logo--banner ${className}`.trim()}
        aria-label={name}
      >
        <span className="tenant-logo__banner-wrap">
          <Image
            src={bannerSrc}
            alt={name}
            width={280}
            height={56}
            className="tenant-logo__img tenant-logo__img--banner"
            priority
            sizes="(max-width: 767px) 42vw, 200px"
          />
        </span>
      </span>
    );
  }

  return (
    <span className={`tenant-logo flex items-center gap-2 min-w-0 ${className}`.trim()}>
      {markSrc ? (
        <Image
          src={markSrc}
          alt=""
          width={32}
          height={32}
          className="tenant-logo__img h-7 w-7 shrink-0 object-contain"
          priority
        />
      ) : null}
      {showText ? (
        <span className="tenant-logo__text truncate">{name}</span>
      ) : null}
    </span>
  );
}
