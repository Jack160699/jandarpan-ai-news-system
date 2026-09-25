"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Masthead, ReaderShell, JdIcon } from "@/features/reader-ds/components";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { getDistrict } from "@/lib/regional/districts";
import {
  saveLocalEditableProfile,
  loadLocalEditableProfile,
  applyCustomDisplayName,
  applyCustomAvatarUrl,
  DEFAULT_EDITABLE_PROFILE,
} from "@/lib/auth/reader-profile";

/**
 * Jan Darpan Simplified Profile Page.
 *
 * Core Principles:
 * 1. Logged-out: Single prominent "Sign in with Google" action. Zero confusing forms/passwords.
 * 2. Logged-in: Clear Google account identity vs Jan Darpan display profile, with edit capability.
 * 3. 3 Clean Expandable Accordions:
 *    - ACCOUNT (My Profile, Library, Reading History, Offline, Notifications, Preferences)
 *    - ABOUT JAN DARPAN (About & Publisher, Editorial standards, How we report, Corrections, Sources)
 *    - HELP & INFORMATION (Official Contact Channels, Grievance Rule 11, Monthly Compliance, Legal & Privacy)
 * 4. Exact Approved Contact Info:
 *    - Call: +91 77778 12777
 *    - Call / WhatsApp: +91 95847 35857
 *    - Email: shriyanshchandrakar@gmail.com ONLY
 */
export default function ProfilePage() {
  const { language } = useLanguage();
  const isHi = language !== "en";
  const prefsCtx = useReaderPreferencesOptional();
  const {
    isLoggedIn,
    user,
    displayName,
    avatarUrl,
    avatarInitial,
    signInWithGoogle,
    signOut,
    updateDisplayName,
    loading,
  } = useReaderAccount();

  // Accordion state: default open 'account', others collapsible
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    account: true,
    about: false,
    help: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Editing display profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(displayName || "");
  const [editAvatar, setEditAvatar] = useState(avatarUrl || "");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const districtSlug = prefsCtx?.prefs.homeDistrict?.trim() || "raipur";
  const districtObj = getDistrict(districtSlug);
  const districtName = districtObj
    ? isHi
      ? districtObj.nameHi
      : districtObj.name
    : isHi
    ? "रायपुर"
    : "Raipur";

  const googleName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Google User";
  const googlePhoto =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(isHi ? "सहेजा जा रहा है..." : "Saving...");

    try {
      const res = await updateDisplayName(editName);
      if (res.ok) {
        const local = loadLocalEditableProfile() ?? DEFAULT_EDITABLE_PROFILE;
        let updated = applyCustomDisplayName(local, editName);
        if (editAvatar) {
          updated = applyCustomAvatarUrl(updated, editAvatar);
        }
        saveLocalEditableProfile(updated);
        setSaveStatus(isHi ? "सफलतापूर्वक सहेजा गया!" : "Saved successfully!");
        setTimeout(() => {
          setIsEditingProfile(false);
          setSaveStatus(null);
        }, 1200);
      } else {
        setSaveStatus(res.error || (isHi ? "त्रुटि हुई" : "Error saving"));
      }
    } catch {
      setSaveStatus(isHi ? "त्रुटि हुई" : "Error saving");
    }
  };

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
            background: "linear-gradient(135deg, #0a1628 0%, #162d52 100%)",
            color: "#ffffff",
            borderRadius: 12,
            padding: "20px 18px",
            marginBottom: 20,
            boxShadow: "0 6px 20px rgba(10, 22, 40, 0.2)",
          }}
        >
          {isLoggedIn ? (
            <div>
              {/* Authenticated user header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    position: "relative",
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.15)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "2px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  {avatarUrl || googlePhoto ? (
                    <Image
                      src={avatarUrl || googlePhoto || ""}
                      alt={displayName}
                      fill
                      sizes="54px"
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  ) : (
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                      {avatarInitial || "U"}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                      {displayName || googleName}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 11.5,
                      color: "rgba(255, 255, 255, 0.72)",
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>Google: {user?.email}</span>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255, 255, 255, 0.65)",
                      marginTop: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>📍 {districtName}</span>
                    <span>•</span>
                    <span style={{ color: "#48bb78", fontWeight: 700 }}>✓ {isHi ? "Google प्रमाणित" : "Google Verified"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile((prev) => !prev)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#ffffff",
                    background: isEditingProfile ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.18)",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 20,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {isEditingProfile ? (isHi ? "रद्द करें" : "Cancel") : (isHi ? "प्रोफ़ाइल बदलें" : "Edit Profile")}
                </button>
              </div>

              {/* Inline Edit Display Profile Form */}
              {isEditingProfile && (
                <form
                  onSubmit={handleSaveProfile}
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#ffffff" }}>
                    {isHi ? "जन दर्पण डिस्प्ले प्रोफ़ाइल संपादित करें" : "Edit Jan Darpan Display Profile"}
                  </div>

                  <p style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)", margin: "0 0 10px", lineHeight: 1.4 }}>
                    {isHi
                      ? "नोट: जन दर्पण डिस्प्ले नाम/फ़ोटो बदलने से आपके मूल Google खाते पर कोई प्रभाव नहीं पड़ता है।"
                      : "Note: Changing your Jan Darpan display name/photo does not alter your underlying Google account."}
                  </p>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255, 255, 255, 0.8)", marginBottom: 4 }}>
                      {isHi ? "डिस्प्ले नाम:" : "Display Name:"}
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255, 255, 255, 0.8)", marginBottom: 4 }}>
                      {isHi ? "प्रोफ़ाइल फ़ोटो लिंक (वैकल्पिक):" : "Profile Photo URL (optional):"}
                    </label>
                    <input
                      type="url"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      placeholder="https://..."
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="submit"
                      style={{
                        background: "var(--jd-red, #9e1b22)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "7px 16px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {isHi ? "सहेजें" : "Save Changes"}
                    </button>
                    {saveStatus && (
                      <span style={{ fontSize: 11.5, color: "#ffd700" }}>{saveStatus}</span>
                    )}
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Logged-out state: PROMINENT GOOGLE SIGN IN ONLY */
            <div style={{ textAlign: "center", padding: "10px 4px" }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: 6,
                }}
              >
                {isHi ? "जन दर्पण में साइन इन करें" : "Sign in to Jan Darpan"}
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "rgba(255, 255, 255, 0.78)",
                  margin: "0 auto 16px",
                  maxWidth: 360,
                  lineHeight: 1.45,
                }}
              >
                {isHi
                  ? "सहेजी गई खबरें, जिला प्राथमिकताएं और लाइव टीवी अनुभव सिंक करने के लिए Google से लॉगिन करें।"
                  : "Sign in with Google to sync saved stories, district preferences, and personalize your Live TV."}
              </p>

              {/* Direct Single Google Auth Action */}
              <button
                type="button"
                onClick={() => signInWithGoogle("/profile")}
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background: "#ffffff",
                  color: "#1f2937",
                  border: "none",
                  borderRadius: 24,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  transition: "transform 0.15s ease",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v8.7h11.8c-.5 2.8-2.1 5.2-4.5 6.8v5.6h7.3c4.3-3.9 6.5-9.7 6.5-16.5z" />
                  <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.3-5.6c-2 1.4-4.6 2.2-7.6 2.2-5.9 0-10.8-4-12.6-9.3H3.9v5.8C7.6 41.1 15.2 46 24 46z" />
                  <path fill="#FBBC05" d="M11.4 27.8c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4V13.2H3.9C2.1 16.7 1 20.2 1 23.4c0 3.2 1.1 6.7 2.9 10.2l7.5-5.8z" />
                  <path fill="#EA4335" d="M24 10.9c3.3 0 6.3 1.1 8.6 3.4l6.4-6.4C35.2 4.1 30.1 2 24 2 15.2 2 7.6 6.9 3.9 13.2l7.5 5.8C13.2 14.9 18.1 10.9 24 10.9z" />
                </svg>
                <span>{isHi ? "Google से साइन इन / साइन अप करें" : "Sign in / Sign up with Google"}</span>
              </button>
            </div>
          )}
        </section>

        {/* ─── TOPIC 1: ACCOUNT (EXPANDABLE ACCORDION) ─────────────────────────── */}
        <section style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => toggleSection("account")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: "transparent",
              border: "none",
              padding: "8px 4px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <h2
              className="jd-ui"
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--jd-ink, #16130d)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>👤 {isHi ? "खाता एवं प्राथमिकताएं" : "Account & Preferences"}</span>
            </h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--jd-muted, #736b5e)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{openSections.account ? (isHi ? "संक्षिप्त करें" : "Collapse") : (isHi ? "विस्तार करें" : "Expand")}</span>
              <span style={{ transform: openSections.account ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s ease" }}>
                ▼
              </span>
            </span>
          </button>

          {openSections.account && (
            <div
              style={{
                background: "var(--jd-paper)",
                border: "1px solid var(--jd-line)",
                borderRadius: 10,
                overflow: "hidden",
                marginTop: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
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
              />
              <ProfileRow
                href="/district"
                icon="flag"
                title={isHi ? `प्राथमिक ज़िला: ${districtName}` : `Primary District: ${districtName}`}
                subtitle={isHi ? "अपना क्षेत्रीय समाचार जिला चुनें" : "Select your local news district"}
              />
              {isLoggedIn && (
                <div
                  onClick={() => signOut()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    cursor: "pointer",
                    color: "var(--jd-red, #9e1b22)",
                    borderTop: "1px solid var(--jd-line-2, #e5dfd2)",
                    background: "rgba(158, 27, 34, 0.03)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: "rgba(158, 27, 34, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <JdIcon name="lock" size={16} stroke={2} color="var(--jd-red, #9e1b22)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {isHi ? "साइन आउट करें" : "Sign Out"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── TOPIC 2: ABOUT JAN DARPAN (EXPANDABLE ACCORDION) ───────────────── */}
        <section style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => toggleSection("about")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: "transparent",
              border: "none",
              padding: "8px 4px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <h2
              className="jd-ui"
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--jd-ink, #16130d)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>📰 {isHi ? "जन दर्पण के बारे में" : "About Jan Darpan"}</span>
            </h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--jd-muted, #736b5e)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{openSections.about ? (isHi ? "संक्षिप्त करें" : "Collapse") : (isHi ? "विस्तार करें" : "Expand")}</span>
              <span style={{ transform: openSections.about ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s ease" }}>
                ▼
              </span>
            </span>
          </button>

          {openSections.about && (
            <div
              style={{
                background: "var(--jd-paper)",
                border: "1px solid var(--jd-line)",
                borderRadius: 10,
                overflow: "hidden",
                marginTop: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <ProfileRow
                href="/about"
                icon="star"
                title={isHi ? "परिचय एवं स्वामित्व" : "About Jan Darpan & Publisher"}
                subtitle={isHi ? "स्वामित्व, कंपनी विवरण एवं संपादकीय उत्तरदायित्व" : "Ownership, publisher CIN & editorial accountability"}
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
              />
              <ProfileRow
                href="/copyright-content-removal"
                icon="lock"
                title={isHi ? "स्रोत नीति एवं कॉपीराइट" : "Content & Sources Policy"}
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
          )}
        </section>

        {/* ─── TOPIC 3: HELP & INFORMATION (EXPANDABLE ACCORDION) ─────────────── */}
        <section style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => toggleSection("help")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: "transparent",
              border: "none",
              padding: "8px 4px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <h2
              className="jd-ui"
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--jd-ink, #16130d)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>ℹ️ {isHi ? "सहायता एवं कानूनी जानकारी" : "Help & Information"}</span>
            </h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--jd-muted, #736b5e)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{openSections.help ? (isHi ? "संक्षिप्त करें" : "Collapse") : (isHi ? "विस्तार करें" : "Expand")}</span>
              <span style={{ transform: openSections.help ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s ease" }}>
                ▼
              </span>
            </span>
          </button>

          {openSections.help && (
            <div
              style={{
                background: "var(--jd-paper)",
                border: "1px solid var(--jd-line)",
                borderRadius: 10,
                overflow: "hidden",
                marginTop: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              {/* EXACT APPROVED CONTACT CHANNELS */}
              <div
                style={{
                  padding: "14px 16px",
                  background: "rgba(10, 37, 80, 0.03)",
                  borderBottom: "1px solid var(--jd-line)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--jd-ink)", marginBottom: 8 }}>
                  📞 {isHi ? "आधिकारिक संपर्क सूत्र (Official Contacts)" : "Official Contact Channels"}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Channel 1: Calling Number only: +91 77778 12777 */}
                  <a
                    href="tel:+917777812777"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--jd-paper, #ffffff)",
                      border: "1px solid var(--jd-line)",
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--jd-muted)" }}>
                        {isHi ? "कॉलिंग नंबर (Calling only)" : "Call"}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--jd-ink)" }}>
                        +91 77778 12777
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--jd-red)" }}>
                      {isHi ? "कॉल करें →" : "Call →"}
                    </span>
                  </a>

                  {/* Channel 2: Calling + WhatsApp: +91 95847 35857 */}
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "var(--jd-paper, #ffffff)",
                      border: "1px solid var(--jd-line)",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--jd-muted)", marginBottom: 2 }}>
                      {isHi ? "कॉल एवं व्हाट्सएप (Call & WhatsApp)" : "Call / WhatsApp"}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--jd-ink)", marginBottom: 6 }}>
                      +91 95847 35857
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a
                        href="tel:+919584735857"
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "var(--jd-red)",
                          textDecoration: "none",
                          background: "rgba(158, 27, 34, 0.08)",
                          padding: "4px 10px",
                          borderRadius: 4,
                        }}
                      >
                        {isHi ? "कॉल करें" : "Call"}
                      </a>
                      <a
                        href="https://wa.me/919584735857"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "#128c7e",
                          textDecoration: "none",
                          background: "rgba(37, 211, 102, 0.12)",
                          padding: "4px 10px",
                          borderRadius: 4,
                        }}
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Channel 3: Email: shriyanshchandrakar@gmail.com ONLY */}
                  <a
                    href="mailto:shriyanshchandrakar@gmail.com"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--jd-paper, #ffffff)",
                      border: "1px solid var(--jd-line)",
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--jd-muted)" }}>
                        {isHi ? "आधिकारिक ईमेल (Email)" : "Email"}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--jd-ink)" }}>
                        shriyanshchandrakar@gmail.com
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--jd-red)" }}>
                      {isHi ? "ईमेल भेजें →" : "Email →"}
                    </span>
                  </a>
                </div>
              </div>

              {/* Subtopics */}
              <ProfileRow
                href="/grievance-redressal"
                icon="flag"
                title={isHi ? "शिकायत निवारण (Rule 11)" : "Grievance Redressal (Rule 11)"}
                subtitle={isHi ? "शिकायत अधिकारी एवं 24 घंटे पावती तंत्र" : "Statutory Grievance Officer & 24h ack SLA"}
              />
              <ProfileRow
                href="/compliance"
                icon="check"
                title={isHi ? "मासिक अनुपालन रिपोर्ट" : "Monthly Compliance Disclosures"}
                subtitle={isHi ? "डिजिटल मीडिया आचार संहिता व मासिक शिकायत विवरण" : "Digital media Code of Ethics & monthly reports"}
              />
              <ProfileRow
                href="/terms"
                icon="flag"
                title={isHi ? "नियम और शर्तें" : "Terms of Service"}
                subtitle={isHi ? "उपयोग की शर्तें एवं पाठक अनुबंध" : "Platform terms and reader agreement"}
              />
              <ProfileRow
                href="/privacy"
                icon="lock"
                title={isHi ? "गोपनीयता नीति" : "Privacy Policy"}
                subtitle={isHi ? "डेटा सुरक्षा एवं उपयोगकर्ता अधिकार" : "Data protection & privacy standards"}
                last
              />
            </div>
          )}
        </section>

        {/* ─── PUBLISHER FOOTER DISCLOSURE ───────────────────────────────────── */}
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
        padding: "12px 14px",
        borderBottom: last ? "none" : "1px solid var(--jd-line-2, #e5dfd2)",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(158, 27, 34, 0.08)",
          color: "var(--jd-red)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <JdIcon name={icon} size={16} stroke={1.9} color="currentColor" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="jd-ui"
          style={{
            fontSize: 13,
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
            fontSize: 11,
            color: "var(--jd-muted, #736b5e)",
            marginTop: 2,
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </div>
      </div>

      <JdIcon name="chevR" size={15} stroke={2} color="var(--jd-muted, #736b5e)" />
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
