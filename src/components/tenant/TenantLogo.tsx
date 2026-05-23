"use client";

import Link from "next/link";
import { useTenant } from "@/providers/TenantProvider";
import { useLanguage } from "@/providers/LanguageProvider";

type TenantLogoProps = {
  className?: string;
  showText?: boolean;
};

export function TenantLogo({ className = "", showText = true }: TenantLogoProps) {
  const { tenant } = useTenant();
  const { language } = useLanguage();
  const name = language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;
  const logoSrc = tenant.branding.logoMarkUrl ?? tenant.branding.logoUrl;

  return (
    <Link href="/" className={`tenant-logo flex items-center gap-2 ${className}`.trim()}>
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          width={32}
          height={32}
          className="tenant-logo__img h-8 w-8"
        />
      ) : null}
      {showText ? (
        <span className="tenant-logo__text font-semibold tracking-tight">
          {name}
        </span>
      ) : null}
    </Link>
  );
}
