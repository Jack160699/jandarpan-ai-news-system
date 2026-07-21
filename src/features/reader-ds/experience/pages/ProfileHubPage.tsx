"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";
import { SettingRow } from "../components/SettingRow";
import { AccountShell } from "../components/AccountShell";
import { ReaderAccountCard } from "../components/ReaderAccountCard";
import { loadReadingMemory } from "@/lib/reading-memory";
import { loadPreferences } from "@/lib/reader-preferences";
import { loadHomepageLayout } from "@/lib/personalization/homepage-layout";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

/** D29 / D15 — reader profile hub inside account dual-rail. */
export function ProfileHubPage() {
  const { t, locale } = useJdDsT();
  const { isLoggedIn } = useReaderAccount();
  const [saved, setSaved] = useState(0);
  const [followed, setFollowed] = useState(0);
  const [district, setDistrict] = useState("");

  useEffect(() => {
    const mem = loadReadingMemory();
    setSaved(mem.bookmarks.length);
    const prefs = loadPreferences();
    const layout = loadHomepageLayout();
    setFollowed((prefs.feedInterests?.length ?? 0) + (layout.followedDistricts?.length ?? 0));
    const d = CG_DISTRICTS.find((x) => x.slug === prefs.homeDistrict);
    setDistrict(
      locale === "en"
        ? d?.name ?? d?.nameHi ?? "Raipur"
        : d?.nameHi ?? d?.name ?? "रायपुर"
    );
  }, [locale]);

  return (
    <AccountShell pageTitle={t("profile.title")} active="profile">
      <div data-jd-locale={locale} data-testid="jd-profile-hub">
        <ReaderAccountCard districtLabel={district} />

        <Link
          href="/membership"
          style={{
            margin: "0 16px 8px",
            background: "linear-gradient(135deg, var(--jd-navy), var(--jd-navy-deep))",
            borderRadius: 4,
            padding: "15px 16px",
            color: "var(--jd-paper)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
          }}
        >
          <JdIcon name="star" size={22} stroke={1.8} color="var(--jd-gold)" />
          <div style={{ flex: 1 }}>
            <div className="jd-ui" style={{ fontSize: 13, fontWeight: 800, color: "var(--jd-gold-soft)" }}>
              {t("profile.tryPremium")}
            </div>
            <div className="jd-ui" style={{ fontSize: 11, color: "#8ea0c4" }}>
              {t("profile.premiumSub")}
            </div>
          </div>
          <JdIcon name="chevR" size={20} stroke={2} color="var(--jd-gold-soft)" />
        </Link>

        <SettingRow
          icon="search"
          label={t("search.submit")}
          sub={t("profile.searchSub")}
          href="/search"
        />
        <SettingRow
          icon="bell"
          label={t("masthead.notifyAria")}
          sub={t("profile.notifyInboxSub")}
          href="/notifications"
        />
        <SettingRow
          icon="star"
          label={t("profile.manageMembership")}
          sub={t("profile.manageSub")}
          href="/membership/manage"
        />
        <SettingRow
          icon="bookmark"
          label={t("profile.saved")}
          sub={t("profile.savedCount", { n: saved })}
          href="/archive/saved"
        />
        <SettingRow
          icon="download"
          label={t("profile.offline")}
          sub={t("profile.offlineSub")}
          href="/archive/offline"
        />
        <SettingRow icon="clock" label={t("profile.history")} href="/archive/history" />
        <SettingRow
          icon="bell"
          label={t("profile.followed")}
          sub={followed ? t("profile.followedCount", { n: followed }) : t("profile.followedNone")}
          href="/archive/followed"
        />
        <SettingRow icon="cog" label={t("profile.settings")} href="/archive/accessibility" />
        <SettingRow icon="globe" label={t("profile.language")} href="/archive/language" />
        <SettingRow icon="pin" label={t("profile.districts")} href="/archive/districts" />
        <SettingRow icon="bell" label={t("profile.notifications")} href="/archive/notifications" />
        {!isLoggedIn ? (
          <SettingRow icon="user" label={t("profile.account")} href="/login" />
        ) : (
          <SettingRow
            icon="user"
            label={t("accountCard.editProfile")}
            href="/archive/edit-profile"
          />
        )}
      </div>
    </AccountShell>
  );
}
