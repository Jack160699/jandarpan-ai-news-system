"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountShell } from "../components/AccountShell";
import { useJdDsT } from "../../i18n";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { validateAvatarUpload } from "@/lib/auth/reader-profile";

/** Editable display profile — name always; avatar via secured upload API. */
export function EditProfilePage() {
  const { t } = useJdDsT();
  const {
    isLoggedIn,
    loading,
    displayName,
    avatarUrl,
    avatarInitial,
    updateDisplayName,
  } = useReaderAccount();

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<string | null>(null);

  const name = nameDraft ?? displayName;
  const preview = previewDraft ?? avatarUrl;

  if (loading) {
    return (
      <AccountShell pageTitle={t("accountCard.editProfile")} active="profile" backHref="/archive">
        <p className="jd-ui" style={{ padding: 24, color: "var(--jd-muted)" }}>
          {t("signin.loading")}
        </p>
      </AccountShell>
    );
  }

  if (!isLoggedIn) {
    return (
      <AccountShell pageTitle={t("accountCard.editProfile")} active="profile" backHref="/archive">
        <div style={{ padding: 24 }}>
          <p className="jd-ui" style={{ color: "var(--jd-ink-3)" }}>
            {t("accountCard.editRequiresSignIn")}
          </p>
          <Link
            href="/login"
            className="jd-ui"
            style={{
              display: "inline-flex",
              marginTop: 16,
              minHeight: 44,
              alignItems: "center",
              padding: "0 16px",
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            {t("accountCard.googleSignIn")}
          </Link>
        </div>
      </AccountShell>
    );
  }

  async function onSave() {
    setBusy(true);
    setStatus(null);
    const result = await updateDisplayName(name);
    setBusy(false);
    setStatus(result.ok ? t("accountCard.saved") : result.error ?? t("accountCard.saveFailed"));
  }

  async function onAvatar(file: File | null) {
    if (!file) return;
    const validated = validateAvatarUpload({ type: file.type, size: file.size });
    if (!validated.ok) {
      setStatus(
        validated.error === "invalid_type"
          ? t("accountCard.avatarType")
          : t("accountCard.avatarSize")
      );
      return;
    }

    setBusy(true);
    setStatus(null);
    const body = new FormData();
    body.set("avatar", file);
    try {
      const res = await fetch("/api/reader/profile", { method: "POST", body });
      const json = (await res.json()) as {
        ok?: boolean;
        avatarUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setStatus(json.error ?? t("accountCard.saveFailed"));
      } else if (json.avatarUrl) {
        setPreviewDraft(json.avatarUrl);
        setStatus(t("accountCard.saved"));
      }
    } catch {
      setStatus(t("accountCard.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountShell pageTitle={t("accountCard.editProfile")} active="profile" backHref="/archive">
      <div data-testid="jd-edit-profile" style={{ padding: "18px 16px 32px", maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              width={72}
              height={72}
              style={{
                width: 72,
                height: 72,
                borderRadius: 72,
                objectFit: "cover",
                border: "1px solid var(--jd-line)",
              }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: 72,
                height: 72,
                borderRadius: 72,
                background: "linear-gradient(135deg, var(--jd-navy), var(--jd-red))",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 24,
              }}
            >
              {avatarInitial}
            </div>
          )}
          <div>
            <label className="jd-ui" style={{ fontSize: 13, fontWeight: 700, color: "var(--jd-ink)" }}>
              {t("accountCard.changePhoto")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                data-testid="jd-avatar-input"
                style={{ display: "block", marginTop: 8, fontSize: 12 }}
                onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="jd-ui" style={{ margin: "6px 0 0", fontSize: 11, color: "var(--jd-muted)" }}>
              {t("accountCard.avatarHint")}
            </p>
          </div>
        </div>

        <label
          htmlFor="jd-display-name"
          className="jd-ui"
          style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--jd-ink-2)" }}
        >
          {t("accountCard.displayName")}
        </label>
        <input
          id="jd-display-name"
          data-testid="jd-display-name-input"
          className="jd-ui"
          value={name}
          maxLength={80}
          onChange={(e) => setNameDraft(e.target.value)}
          style={{
            marginTop: 8,
            width: "100%",
            minHeight: 44,
            padding: "0 12px",
            border: "1px solid var(--jd-line)",
            borderRadius: 4,
            background: "var(--jd-paper)",
            color: "var(--jd-ink)",
            fontSize: 15,
          }}
        />

        <button
          type="button"
          data-testid="jd-save-profile"
          className="jd-ui"
          disabled={busy || !name.trim()}
          onClick={() => void onSave()}
          style={{
            marginTop: 16,
            minHeight: 48,
            width: "100%",
            background: "var(--jd-navy)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            border: "none",
            borderRadius: 4,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? t("signin.loading") : t("accountCard.save")}
        </button>

        {status ? (
          <p
            role="status"
            className="jd-ui"
            style={{ marginTop: 12, fontSize: 13, color: "var(--jd-ink-3)" }}
          >
            {status}
          </p>
        ) : null}
      </div>
    </AccountShell>
  );
}
