"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformSectionConfig } from "@/lib/newsroom-platform/content/types";
import { mergeNewsroomSettings } from "@/lib/platform-admin/settings-schema";

type PlatformConfigResponse = {
  ok: boolean;
  config?: {
    homepageSections: PlatformSectionConfig[];
    newsroomSettings: Record<string, unknown>;
  };
  error?: string;
};

export function usePlatformConfig() {
  const [homepageSections, setHomepageSections] = useState<PlatformSectionConfig[]>([]);
  const [newsroomSettings, setNewsroomSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [cardUpdatedAt, setCardUpdatedAt] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platform/config", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as PlatformConfigResponse;
      if (!json.ok || !json.config) {
        setError(json.error ?? "Failed to load platform config");
        return;
      }
      setHomepageSections(json.config.homepageSections ?? []);
      setNewsroomSettings(mergeNewsroomSettings(json.config.newsroomSettings));
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

  const markSaved = useCallback((id: string) => {
    const iso = new Date().toISOString();
    setLastSavedAt(new Date(iso));
    setCardUpdatedAt((prev) => ({ ...prev, [id]: iso }));
  }, []);

  async function persistNewsroomSettings(next: Record<string, boolean>, busyId: string) {
    setSavingId(busyId);
    setNewsroomSettings(next);
    try {
      await fetch("/api/admin/platform/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "newsroom_settings", value: next }),
      });
      markSaved(busyId);
    } finally {
      setSavingId(null);
    }
  }

  async function toggleSetting(id: string) {
    const next = {
      ...newsroomSettings,
      [id]: !(newsroomSettings[id] ?? true),
    };
    await persistNewsroomSettings(next, id);
  }

  async function setAllInSection(ids: string[], enabled: boolean) {
    const next = { ...newsroomSettings };
    for (const id of ids) next[id] = enabled;
    setSavingId("bulk");
    setNewsroomSettings(next);
    try {
      await fetch("/api/admin/platform/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "newsroom_settings", value: next }),
      });
      markSaved("bulk");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleHomepage(key: PlatformSectionConfig["key"]) {
    setSavingId(key);
    const next = homepageSections.map((s) =>
      s.key === key ? { ...s, enabled: !s.enabled } : s
    );
    setHomepageSections(next);
    try {
      await fetch("/api/admin/platform/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "homepage_sections", value: next }),
      });
      markSaved(key);
    } finally {
      setSavingId(null);
    }
  }

  async function setAllHomepage(enabled: boolean) {
    setSavingId("homepage-bulk");
    const next = homepageSections.map((s) => ({ ...s, enabled }));
    setHomepageSections(next);
    try {
      await fetch("/api/admin/platform/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "homepage_sections", value: next }),
      });
      markSaved("homepage-bulk");
    } finally {
      setSavingId(null);
    }
  }

  return {
    homepageSections,
    newsroomSettings,
    loading,
    error,
    savingId,
    lastSavedAt,
    cardUpdatedAt,
    reload: load,
    toggleSetting,
    toggleHomepage,
    setAllInSection,
    setAllHomepage,
  };
}
