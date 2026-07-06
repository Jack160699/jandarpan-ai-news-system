"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import type { OrganizationSettings } from "@/lib/organization/types";

type FieldDef = {
  key: keyof OrganizationSettings;
  label: string;
  type?: "text" | "email" | "url" | "tel";
  hint?: string;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Identity",
    fields: [
      { key: "organizationName", label: "Organization name" },
      { key: "logoUrl", label: "Logo URL", type: "url", hint: "Absolute or site-relative path" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "googleMapsUrl", label: "Google Maps embed URL", type: "url" },
    ],
  },
  {
    title: "Social profiles",
    fields: [
      { key: "facebook", label: "Facebook", type: "url" },
      { key: "instagram", label: "Instagram", type: "url" },
      { key: "x", label: "X (Twitter)", type: "url" },
      { key: "youtube", label: "YouTube", type: "url" },
      { key: "linkedin", label: "LinkedIn", type: "url" },
      { key: "telegram", label: "Telegram", hint: "URL or @handle" },
      { key: "whatsapp", label: "WhatsApp", hint: "URL or phone number" },
    ],
  },
  {
    title: "Policy inboxes",
    fields: [
      { key: "copyrightEmail", label: "Copyright email", type: "email" },
      { key: "editorialEmail", label: "Editorial email", type: "email" },
      { key: "correctionsEmail", label: "Corrections email", type: "email" },
    ],
  },
];

export function OrganizationSettingsPanel() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organization", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        settings?: OrganizationSettings;
        error?: string;
      };
      if (!json.ok || !json.settings) {
        setError(json.error ?? "Failed to load organization settings");
        return;
      }
      setSettings(json.settings);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(key: keyof OrganizationSettings, value: string) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="anr-meta flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading organization settings…
      </p>
    );
  }

  if (!settings) {
    return (
      <div className="anr-panel">
        <p className="anr-meta text-red-400">{error ?? "Settings unavailable"}</p>
        <button type="button" className="anr-btn anr-btn--sm" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="anr-panel space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="anr-ps-card__icon" aria-hidden>
            <Building2 size={18} />
          </span>
          <div>
            <h2 className="m-0 text-lg font-semibold text-white">Organization</h2>
            <p className="anr-meta m-0 mt-1 max-w-xl">
              Publisher identity, contact details, and social profiles. These values
              populate the footer, contact page, JSON-LD, and SEO metadata.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="anr-btn anr-btn--primary inline-flex items-center gap-2"
          onClick={save}
          disabled={saving}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save changes
        </button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {savedAt ? (
        <p className="text-sm text-emerald-400">Saved at {savedAt}</p>
      ) : null}

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-zinc-400">
            {section.title}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-200">{field.label}</span>
                <input
                  type={field.type ?? "text"}
                  value={settings[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white"
                />
                {field.hint ? (
                  <span className="block text-xs text-zinc-500">{field.hint}</span>
                ) : null}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
