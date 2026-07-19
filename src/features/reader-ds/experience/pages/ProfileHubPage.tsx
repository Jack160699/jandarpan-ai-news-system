"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { SettingRow } from "../components/SettingRow";
import { loadReadingMemory } from "@/lib/reading-memory";
import { loadPreferences } from "@/lib/reader-preferences";
import { loadHomepageLayout } from "@/lib/personalization/homepage-layout";
import { CG_DISTRICTS } from "@/lib/regional/districts";

/** D29 — reader profile / अधिक hub. */
export function ProfileHubPage() {
  const [name] = useState("पाठक");
  const [saved, setSaved] = useState(0);
  const [followed, setFollowed] = useState(0);
  const [district, setDistrict] = useState("रायपुर");

  useEffect(() => {
    const mem = loadReadingMemory();
    setSaved(mem.bookmarks.length);
    const prefs = loadPreferences();
    const layout = loadHomepageLayout();
    setFollowed((prefs.feedInterests?.length ?? 0) + (layout.followedDistricts?.length ?? 0));
    const d = CG_DISTRICTS.find((x) => x.slug === prefs.homeDistrict);
    setDistrict(d?.nameHi ?? d?.name ?? "रायपुर");
  }, []);

  return (
    <ReaderShell activeNav="more">
      <Masthead pageTitle="अधिक" />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 56,
              background: "linear-gradient(135deg, var(--jd-navy), var(--jd-red))",
              flexShrink: 0,
            }}
          />
          <div>
            <div className="jd-serif" style={{ fontSize: 19, fontWeight: 700, color: "var(--jd-ink)" }}>
              {name}
            </div>
            <div className="jd-ui" style={{ fontSize: 12, color: "var(--jd-muted)" }}>
              {district} · इस डिवाइस पर
            </div>
          </div>
        </div>

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
              दर्पण प्रीमियम आज़माएँ
            </div>
            <div className="jd-ui" style={{ fontSize: 11, color: "#8ea0c4" }}>
              विज्ञापन-मुक्त · ई-पेपर · सदस्यता
            </div>
          </div>
          <JdIcon name="chevR" size={20} stroke={2} color="var(--jd-gold-soft)" />
        </Link>

        <SettingRow icon="bookmark" label="सहेजी कहानियाँ" sub={`${saved} सहेजी`} href="/archive/saved" />
        <SettingRow icon="clock" label="पढ़ने का इतिहास" href="/archive/history" />
        <SettingRow
          icon="bell"
          label="फ़ॉलो किए टॉपिक"
          sub={followed ? `${followed} फ़ॉलो` : "अभी कोई नहीं"}
          href="/archive/followed"
        />
        <SettingRow icon="cog" label="सेटिंग्स व डेटा-बचत" href="/archive/accessibility" />
        <SettingRow icon="globe" label="भाषा" href="/archive/language" />
        <SettingRow icon="pin" label="ज़िला प्राथमिकताएँ" href="/archive/districts" />
        <SettingRow icon="bell" label="सूचना प्राथमिकताएँ" href="/archive/notifications" />
        <SettingRow icon="user" label="खाता / साइन इन" href="/login" />
      </main>
    </ReaderShell>
  );
}
