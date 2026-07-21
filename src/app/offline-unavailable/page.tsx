import Link from "next/link";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { ReaderShell } from "@/features/reader-ds/components/ReaderShell";
import { Masthead } from "@/features/reader-ds/components/Masthead";
import { jdDsT, toJdDsLocale } from "@/features/reader-ds/i18n";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Offline · ${BRAND.nameEn}`,
  description: "Content not available offline.",
  path: "/offline-unavailable",
});

export default async function OfflineUnavailablePage() {
  if (!isReaderDesignSystemEnabled()) redirect("/");
  const locale = toJdDsLocale(await getServerReaderLanguage());
  const t = (key: Parameters<typeof jdDsT>[1]) => jdDsT(locale, key);

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive/offline" pageTitle={t("offline.notAvailable")} />
      <div style={{ padding: "28px 18px", textAlign: "center" }}>
        <h1 className="jd-serif" style={{ fontSize: 22, margin: "0 0 8px" }}>
          {t("offline.notAvailable")}
        </h1>
        <p className="jd-ui" style={{ fontSize: 13.5, color: "var(--jd-ink-3)" }}>
          {t("offline.notAvailableBody")}
        </p>
        <Link
          href="/archive/offline"
          className="jd-ui"
          style={{
            display: "inline-flex",
            marginTop: 16,
            minHeight: 40,
            padding: "0 14px",
            alignItems: "center",
            border: "1px solid var(--jd-line)",
            borderRadius: 3,
            color: "var(--jd-navy)",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {t("offline.goLibrary")}
        </Link>
      </div>
    </ReaderShell>
  );
}
