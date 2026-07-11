"use client";

import Link from "next/link";
import {
  Bookmark,
  Flame,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Avatar } from "@/design-system/components/Avatar";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { ProfileSection } from "./ProfileSection";
import type { ProfileV3Data } from "../types";

export type PersonalDashboardProps = {
  data: ProfileV3Data;
};

export function PersonalDashboard({ data }: PersonalDashboardProps) {
  const { language, t } = useLanguage();
  const { signInWithGoogle, signOut } = useReaderAccount();

  const stats = [
    {
      key: "streak",
      label: pickBilingualLabel(language, "Day streak", "दिन की लकीर"),
      value: data.streakDays,
      icon: Flame,
    },
    {
      key: "saved",
      label: pickBilingualLabel(language, "Saved stories", "सेव की खबरें"),
      value: data.savedCount,
      icon: Bookmark,
    },
    {
      key: "topics",
      label: pickBilingualLabel(language, "Topics", "विषय"),
      value: data.interests.length,
      icon: TrendingUp,
    },
    {
      key: "districts",
      label: pickBilingualLabel(language, "Districts", "जिले"),
      value: data.followedDistricts.length,
      icon: MapPin,
    },
  ];

  return (
    <ProfileSection
      id="personal-dashboard"
      kicker={pickBilingualLabel(language, "Overview", "सारांश")}
      title={pickBilingualLabel(language, "Personal dashboard", "व्यक्तिगत डैशबोर्ड")}
      description={t.profile.subtitle}
    >
      <div className="pv3-dashboard">
        <div className="pv3-dashboard__identity">
          <Avatar size="lg" initials={data.avatarInitial} alt={data.displayName} />
          <div className="pv3-dashboard__meta">
            <h3 className="pv3-dashboard__name">{data.displayName}</h3>
            {data.email ? (
              <p className="pv3-dashboard__email">{data.email}</p>
            ) : (
              <p className="pv3-dashboard__email">
                {pickBilingualLabel(
                  language,
                  "Reading on this device",
                  "इस डिवाइस पर पढ़ रहे हैं"
                )}
              </p>
            )}
            <div className="pv3-dashboard__badges">
              <Badge variant={data.isPremium ? "brand" : "default"}>
                {data.isPremium
                  ? pickBilingualLabel(language, "Premium", "प्रीमियम")
                  : pickBilingualLabel(language, "Reader", "पाठक")}
              </Badge>
              {data.isLoggedIn ? (
                <Badge variant="success">
                  {pickBilingualLabel(language, "Signed in", "साइन इन")}
                </Badge>
              ) : (
                <Badge variant="warning">
                  {pickBilingualLabel(language, "Guest", "अतिथि")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="pv3-dashboard__actions">
          {data.isLoggedIn ? (
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              {pickBilingualLabel(language, "Sign out", "साइन आउट")}
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" onClick={() => void signInWithGoogle()}>
                {pickBilingualLabel(language, "Sign in with Google", "Google से साइन इन")}
              </Button>
              <Link href="/login" className="jds-button jds-button--outline jds-button--sm">
                {pickBilingualLabel(language, "More sign-in options", "और विकल्प")}
              </Link>
            </>
          )}
        </div>

        <div
          className="pv3-dashboard__stats"
          role="list"
          aria-label={pickBilingualLabel(language, "Reading stats", "पढ़ने के आँकड़े")}
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.key} className="pv3-stat" role="listitem">
                <span className="pv3-stat__icon" aria-hidden>
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="pv3-stat__value">{stat.value}</span>
                <span className="pv3-stat__label">{stat.label}</span>
              </div>
            );
          })}
        </div>

        {data.continueTarget ? (
          <div className="pv3-dashboard__continue">
            <p className="pv3-dashboard__continue-kicker">
              <Sparkles size={14} aria-hidden />
              {pickBilingualLabel(language, "Continue reading", "पढ़ना जारी रखें")}
            </p>
            <Link href={data.continueTarget.href} className="pv3-dashboard__continue-link">
              {data.continueTarget.label}
            </Link>
            <div
              className="pv3-progress"
              role="progressbar"
              aria-valuenow={Math.round(data.continueTarget.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={pickBilingualLabel(language, "Reading progress", "पढ़ने की प्रगति")}
            >
              <div
                className="pv3-progress__bar"
                style={{ width: `${Math.round(data.continueTarget.progress * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </ProfileSection>
  );
}
