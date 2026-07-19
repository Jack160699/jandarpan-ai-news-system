"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JdIcon, type JdIconName } from "../components/icons";

const NOTIFY_KEY = "jd-ds-perm-notify-v1";
const LOC_KEY = "jd-ds-perm-loc-v1";

type SheetKind = "notify" | "location" | null;

function readInitialKind(): SheetKind {
  try {
    if (!localStorage.getItem(NOTIFY_KEY)) return "notify";
    if (!localStorage.getItem(LOC_KEY)) return "location";
  } catch {
    /* private mode */
  }
  return null;
}

/**
 * F51/F52 — value-first permission pre-prompts.
 * Shown once per browser until dismissed; never blocks reading.
 */
export function PermissionSheet() {
  const [kind, setKind] = useState<SheetKind>(null);

  useEffect(() => {
    // External store (localStorage) — read after mount to avoid SSR/hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client boot
    setKind(readInitialKind());
  }, []);

  const dismiss = (k: "notify" | "location") => {
    try {
      localStorage.setItem(k === "notify" ? NOTIFY_KEY : LOC_KEY, "1");
    } catch {
      /* ignore */
    }
    if (k === "notify") {
      try {
        setKind(!localStorage.getItem(LOC_KEY) ? "location" : null);
      } catch {
        setKind(null);
      }
    } else {
      setKind(null);
    }
  };

  const enableNotify = async () => {
    try {
      if (typeof Notification !== "undefined") {
        await Notification.requestPermission();
      }
    } catch {
      /* unsupported */
    }
    dismiss("notify");
  };

  if (!kind) return null;

  if (kind === "notify") {
    return (
      <Sheet
        icon="bell"
        iconBg="rgba(158,27,34,.1)"
        iconColor="var(--jd-red)"
        title="ब्रेकिंग न्यूज़ सबसे पहले पाएँ"
        body="हम केवल ज़रूरी अलर्ट भेजेंगे — आपके ज़िले की बड़ी ख़बरें व चुनी हुई अपडेट। कभी भी बंद कर सकते हैं।"
        primaryLabel="सूचनाएँ चालू करें"
        primaryTone="red"
        onPrimary={() => void enableNotify()}
        secondaryLabel="अभी नहीं"
        onSecondary={() => dismiss("notify")}
      />
    );
  }

  return (
    <Sheet
      icon="pin"
      iconBg="rgba(10,37,80,.08)"
      iconColor="var(--jd-navy)"
      title="अपने ज़िले की ख़बरें पाएँ"
      body="स्थान से हम आपका ज़िला अपने-आप चुन लेंगे — स्थानीय ब्रेकिंग, मंडी भाव व मौसम शीर्ष पर।"
      privacyNote
      primaryLabel="स्थान चालू करें"
      primaryTone="navy"
      onPrimary={() => {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => dismiss("location"),
            () => dismiss("location"),
            { maximumAge: 600_000, timeout: 8_000 }
          );
        } else {
          dismiss("location");
        }
      }}
      secondaryLabel="मैन्युअल रूप से ज़िला चुनें"
      secondaryHref="/district"
      onSecondary={() => dismiss("location")}
    />
  );
}

function Sheet({
  icon,
  iconBg,
  iconColor,
  title,
  body,
  privacyNote,
  primaryLabel,
  primaryTone,
  onPrimary,
  secondaryLabel,
  secondaryHref,
  onSecondary,
}: {
  icon: JdIconName;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  privacyNote?: boolean;
  primaryLabel: string;
  primaryTone: "red" | "navy";
  onPrimary: () => void;
  secondaryLabel: string;
  secondaryHref?: string;
  onSecondary: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jd-perm-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(10,37,80,.35)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          padding: "22px 22px 26px",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: 56,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <JdIcon name={icon} size={28} stroke={1.8} color={iconColor} />
        </div>
        <h2
          id="jd-perm-title"
          className="jd-serif"
          style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, textAlign: "center", color: "var(--jd-ink)" }}
        >
          {title}
        </h2>
        <p
          className="jd-ui"
          style={{
            margin: privacyNote ? "0 0 8px" : "0 0 18px",
            fontSize: 13,
            color: "var(--jd-ink-3)",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          {body}
        </p>
        {privacyNote ? (
          <div
            className="jd-ui"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 16,
              fontSize: 10.5,
              color: "var(--jd-muted)",
            }}
          >
            <JdIcon name="lock" size={13} stroke={1.9} color="var(--jd-green)" />
            स्थान संग्रहीत नहीं किया जाता
          </div>
        ) : null}
        <button
          type="button"
          onClick={onPrimary}
          className="jd-ui"
          style={{
            width: "100%",
            background: primaryTone === "red" ? "var(--jd-red)" : "var(--jd-navy)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            padding: "13px 0",
            borderRadius: 3,
            border: "none",
            cursor: "pointer",
            marginBottom: 10,
            minHeight: 44,
          }}
        >
          {primaryLabel}
        </button>
        {secondaryHref ? (
          <Link
            href={secondaryHref}
            onClick={onSecondary}
            className="jd-ui"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--jd-navy)",
              textAlign: "center",
              textDecoration: "underline",
              minHeight: 44,
              lineHeight: "44px",
            }}
          >
            {secondaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSecondary}
            className="jd-ui"
            style={{
              width: "100%",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--jd-ink-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
