"use client";

import React from "react";
import Link from "next/link";
import { Masthead, ReaderShell, JdIcon } from "@/features/reader-ds/components";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { getDistrict } from "@/lib/regional/districts";

/**
 * Jan Darpan Canonical Profile App Screen.
 *
 * Requirements:
 * - Fifth destination in final bottom navigation dock.
 * - Houses user account/preferences + all necessary platform information previously in the footer.
 * - ZERO website footers anywhere.
 * - Organized in clean, compact, theme-aware app-style rows/cards.
 * - No bloated category columns; only genuinely useful app/account/support/legal info.
 */
export default function ProfilePage() {
  const { language } = useLanguage();
  const isHi = language !== "en";
  const prefsCtx = useReaderPreferencesOptional();
  const { isLoggedIn, user, signOut } = useReaderAccount();

  const districtSlug = prefsCtx?.prefs.homeDistrict?.trim() || "raipur";
  const districtObj = getDistrict(districtSlug);
  const districtName = districtObj
    ? isHi
      ? districtObj.nameHi
      : districtObj.name
    : isHi
    ? "रायपुर"
    : "Raipur";

  const themeLabel =
    prefsCtx?.prefs.theme === "dark"
      ? isHi
        ? "डार्क मोड"
        : "Dark Theme"
      : isHi
      ? "लाइट मोड"
      : "Light Theme";

  return (
    <ReaderShell activeNav="profile">
      <Masthead />

      <main
        id="main-content"
        role="main"
        className="jd-shell jd-profile-screen"
        style={{
          flex: 1,
          background: "var(--jd-paper)",
          padding: "16px 14px 48px",
          maxWidth: 640,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* User Account / Identity Header Card */}
        <section
          style={{
            background: "var(--jd-navy)",
            color: "#ffffff",
            borderRadius: 12,
            padding: "20px 18px",
            marginBottom: 20,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "2px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              <JdIcon name="user" size={26} stroke={2} color="#ffffff" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: "#ffffff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {isLoggedIn && user?.email
                  ? user.email
                  : isHi
                  ? "सम्मानित पाठक"
                  : "Valued Reader"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255, 255, 255, 0.75)",
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>📍 {districtName}</span>
                <span>•</span>
                <span>{themeLabel}</span>
              </div>
            </div>

            <Link
              href="/district"
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--jd-paper, #ffffff)",
                background: "rgba(255, 255, 255, 0.18)",
                padding: "6px 12px",
                borderRadius: 20,
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {isHi ? "ज़िला बदलें" : "Change"}
            </Link>
          </div>
        </section>

        {/* Section 1: Library & Preferences */}
        <section id="profile-library" style={{ marginBottom: 20 }}>
          <h2
            className="jd-ui"
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--jd-muted, #736b5e)",
              margin: "0 0 8px 4px",
            }}
          >
            {isHi ? "पठन एवं प्राथमिकताएं" : "Library & Preferences"}
          </h2>

          <div
            style={{
              background: "var(--jd-paper)",
              border: "1px solid var(--jd-line)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <ProfileRow
              href="/archive/saved"
              icon="bookmark"
              title={isHi ? "सहेजी गई खबरें (Bookmarks)" : "Saved Stories"}
              subtitle={isHi ? "आपके द्वारा बुकमार्क किए गए समाचार" : "Your bookmarked news"}
            />
            <ProfileRow
              href="/archive/history"
              icon="clock"
              title={isHi ? "पठन इतिहास" : "Reading History"}
              subtitle={isHi ? "हाल ही में पढ़े गए समाचार" : "Recently viewed news"}
            />
            <ProfileRow
              href="/archive/offline"
              icon="download"
              title={isHi ? "ऑफ़लाइन खबरें" : "Offline Reader"}
              subtitle={isHi ? "इंटरनेट के बिना पढ़ने के लिए" : "Read without active internet"}
            />
            <ProfileRow
              href="/notifications"
              icon="bell"
              title={isHi ? "सूचनाएं" : "Notifications"}
              subtitle={isHi ? "ताज़ा ब्रेकिंग अलर्ट एवं सूचना केंद्र" : "Breaking alerts and alerts inbox"}
              last
            />
          </div>
        </section>

        {/* Section 2: About Jan Darpan */}
        <section id="profile-about" style={{ marginBottom: 20 }}>
          <h2
            className="jd-ui"
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--jd-muted, #736b5e)",
              margin: "0 0 8px 4px",
            }}
          >
            {isHi ? "जन दर्पण के बारे में" : "About Jan Darpan"}
          </h2>

          <div
            style={{
              background: "var(--jd-paper)",
              border: "1px solid var(--jd-line)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <ProfileRow
              href="/about"
              icon="star"
              title={isHi ? "जन दर्पण परिचय एवं स्वामित्व" : "About Jan Darpan & Publisher"}
              subtitle={isHi ? "स्वामित्व, कंपनी विवरण एवं संपादकीय उत्तरदायित्व" : "Ownership, publisher CIN & editorial accountability"}
            />
            <ProfileRow
              href="/grievance-redressal"
              icon="flag"
              title={isHi ? "शिकायत निवारण (Grievance Redressal)" : "Grievance Redressal (Rule 11)"}
              subtitle={isHi ? "शिकायत अधिकारी, 24 घंटे पावती, व्हाट्सएप एवं ई-प्रपत्र" : "Statutory Grievance Officer, 24h ack & WhatsApp intake"}
            />
            <ProfileRow
              href="/compliance"
              icon="check"
              title={isHi ? "मासिक अनुपालन रिपोर्ट" : "Monthly Compliance Disclosures"}
              subtitle={isHi ? "डिजिटल मीडिया आचार संहिता व मासिक शिकायत विवरण" : "Digital media Code of Ethics & monthly reports"}
            />
            <ProfileRow
              href="/how-we-report"
              icon="eye"
              title={isHi ? "हमारी रिपोर्टिंग प्रक्रिया" : "How We Report"}
              subtitle={isHi ? "सत्यापित स्रोत एवं पारदर्शी AI न्यूज़रूम" : "Verified sources and AI editorial standards"}
            />
            <ProfileRow
              href="/editorial-policy"
              icon="check"
              title={isHi ? "संपादकीय नीति एवं मानक" : "Editorial Policy & Standards"}
              subtitle={isHi ? "निष्पक्षता, सत्यता एवं निष्ठा के नियम" : "Fairness, accuracy, and editorial integrity"}
            />
            <ProfileRow
              href="/corrections"
              icon="refresh"
              title={isHi ? "संशोधन एवं स्पष्टीकरण" : "Corrections Policy"}
              subtitle={isHi ? "त्रुटि सुधार एवं संशोधन प्रक्रिया" : "Transparent correction workflow"}
              last
            />
          </div>
        </section>

        {/* Section 3: Content & Source Policy */}
        <section id="profile-editorial" style={{ marginBottom: 20 }}>
          <h2
            className="jd-ui"
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--jd-muted, #736b5e)",
              margin: "0 0 8px 4px",
            }}
          >
            {isHi ? "सामग्री एवं स्रोत सत्यापन" : "Content & Source Policy"}
          </h2>

          <div
            style={{
              background: "var(--jd-paper)",
              border: "1px solid var(--jd-line)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <ProfileRow
              href="/copyright-content-removal"
              icon="lock"
              title={isHi ? "स्रोत नीति एवं कॉपीराइट" : "Copyright & Content Policy"}
              subtitle={isHi ? "वास्तविक स्रोत अधिकार एवं सामग्री निष्कासन" : "Verified source rights & takedowns"}
            />
            <ProfileRow
              href="/feed.xml"
              icon="wifi"
              title={isHi ? "आरएसएस फ़ीड्स (RSS)" : "RSS Feeds"}
              subtitle={isHi ? "सार्वजनिक समाचार सिंडिकेशन फ़ीड" : "Public news syndication feed"}
              external
              last
            />
          </div>
        </section>

        {/* Section 4: Legal & Privacy */}
        <section id="profile-legal" style={{ marginBottom: 20 }}>
          <h2
            className="jd-ui"
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--jd-muted, #736b5e)",
              margin: "0 0 8px 4px",
            }}
          >
            {isHi ? "कानूनी एवं नीतियां" : "Legal & Privacy"}
          </h2>

          <div
            style={{
              background: "var(--jd-paper)",
              border: "1px solid var(--jd-line)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <ProfileRow
              href="/terms"
              icon="flag"
              title={isHi ? "नियम और शर्तें" : "Terms of Service"}
              subtitle={isHi ? "उपयोग की शर्तें एवं नियम" : "Platform terms and reader agreement"}
            />
            <ProfileRow
              href="/privacy"
              icon="lock"
              title={isHi ? "गोपनीयता नीति" : "Privacy Policy"}
              subtitle={isHi ? "डेटा सुरक्षा एवं उपयोगकर्ता अधिकार" : "Data protection & privacy standards"}
              last
            />
          </div>
        </section>

        {/* Section 5: Contact & Support */}
        <section id="profile-contact" style={{ marginBottom: 20 }}>
          <h2
            className="jd-ui"
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--jd-muted, #736b5e)",
              margin: "0 0 8px 4px",
            }}
          >
            {isHi ? "संपर्क एवं सहायता" : "Contact & Support"}
          </h2>

          <div
            style={{
              background: "var(--jd-paper)",
              border: "1px solid var(--jd-line)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <ProfileRow
              href="/contact"
              icon="user"
              title={isHi ? "न्यूज़रूम संपर्क" : "Contact Newsroom"}
              subtitle={isHi ? "संपादकीय टीम से संपर्क करें" : "Reach editorial bureau"}
            />
            <ProfileRow
              href="https://wa.me/919584735857?text=Namaste%20Grievance%20Officer,%20I%20wish%20to%20file%20a%20grievance."
              icon="share"
              title="Grievance WhatsApp (+91 95847 35857)"
              subtitle={isHi ? "शिकायत निवारण अधिकारी का संपर्क (त्वरित व्हाट्सएप पंजीकरण)" : "Statutory Grievance Officer (direct intake)"}
              external
            />
            <ProfileRow
              href="mailto:shriyanshchandrakar@gmail.com"
              icon="star"
              title="Grievance: shriyanshchandrakar@gmail.com"
              subtitle={isHi ? "वैधानिक शिकायत निवारण ईमेल" : "Statutory grievance redressal inbox"}
              external
            />
            <ProfileRow
              href="https://wa.me/917777812777"
              icon="share"
              title="Business WhatsApp (+91 77778 12777)"
              subtitle={isHi ? "अतिरिक्त जन दर्पण / व्यवसाय एवं सूचना संपर्क" : "Additional Jan Darpan / business contact"}
              external
            />
            <ProfileRow
              href="mailto:contact@jandarpan.news"
              icon="star"
              title="Email: contact@jandarpan.news"
              subtitle={isHi ? "संपादकीय एवं सामान्य पत्राचार" : "Editorial and newsroom desk"}
              external
              last
            />
          </div>
        </section>

        {/* Section 6: App Information & Legal Publisher Disclosure */}
        <section
          id="profile-app-info"
          style={{
            textAlign: "center",
            padding: "20px 10px 10px",
            borderTop: "1px solid var(--jd-line)",
          }}
        >
          <div
            className="jd-serif"
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--jd-ink)",
            }}
          >
            जन दर्पण / Jan Darpan
          </div>
          <div
            className="jd-ui"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--jd-ink)",
              marginTop: 4,
            }}
          >
            Operated & Published by STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED
          </div>
          <div
            className="jd-ui"
            style={{
              fontSize: 11,
              color: "var(--jd-muted)",
              marginTop: 2,
            }}
          >
            CIN: U70200CT2025OPC017739 · Registered Office: Bhilai, Durg, CG – 490006
          </div>
          <div
            className="jd-ui"
            style={{
              fontSize: 11,
              color: "var(--jd-muted)",
              marginTop: 4,
            }}
          >
            © {new Date().getFullYear()} Jan Darpan. All rights reserved.
          </div>
        </section>
      </main>
    </ReaderShell>
  );
}

function ProfileRow({
  href,
  icon,
  title,
  subtitle,
  external = false,
  last = false,
}: {
  href: string;
  icon: any;
  title: string;
  subtitle: string;
  external?: boolean;
  last?: boolean;
}) {
  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 14px",
        borderBottom: last ? "none" : "1px solid var(--jd-line-2, #e5dfd2)",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "rgba(158, 27, 34, 0.08)",
          color: "var(--jd-red)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <JdIcon name={icon} size={18} stroke={1.9} color="currentColor" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="jd-ui"
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--jd-ink)",
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>
        <div
          className="jd-ui"
          style={{
            fontSize: 11.5,
            color: "var(--jd-muted, #736b5e)",
            marginTop: 2,
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </div>
      </div>

      <JdIcon name="chevR" size={16} stroke={2} color="var(--jd-muted, #736b5e)" />
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}
