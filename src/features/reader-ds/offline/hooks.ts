"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadArticle,
  isArticleDownloaded,
  prepareRefresh,
  refreshArticle,
  removeDownload,
  type DownloadInput,
} from "./download-manager";
import { getOfflineArticle, listOfflineArticles, setFavorite } from "./db";
import { searchOfflineArticles, sortOfflineArticles } from "./search";
import { getStorageStats } from "./storage-manager";
import type {
  DownloadProgress,
  OfflineArticleRecord,
  OfflineSort,
  OfflineStorageStats,
} from "./types";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => {
      const forced =
        typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-jd-force-offline") === "1";
      setOnline(!forced && typeof navigator !== "undefined" && navigator.onLine);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-jd-force-offline"],
    });
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      mo.disconnect();
    };
  }, []);
  return online;
}

export function useOfflineDownload(slug: string) {
  const [downloaded, setDownloaded] = useState(false);
  const [record, setRecord] = useState<OfflineArticleRecord | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const row = await getOfflineArticle(slug);
    setRecord(row);
    setDownloaded(Boolean(row));
  }, [slug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const download = useCallback(
    async (input: Omit<DownloadInput, "onProgress">) => {
      setBusy(true);
      try {
        const row = await downloadArticle({
          ...input,
          onProgress: setProgress,
        });
        setRecord(row);
        setDownloaded(true);
        return row;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const remove = useCallback(async () => {
    setBusy(true);
    setProgress({ slug, phase: "removing", progress: 0.5 });
    try {
      await removeDownload(slug);
      setRecord(null);
      setDownloaded(false);
      setProgress({ slug, phase: "done", progress: 1 });
    } finally {
      setBusy(false);
    }
  }, [slug]);

  const checkRefresh = useCallback(
    async (input: Omit<DownloadInput, "onProgress" | "favorite">) =>
      prepareRefresh(input.model, input.language),
    []
  );

  const applyRefresh = useCallback(
    async (input: Omit<DownloadInput, "onProgress"> & { confirm: boolean }) => {
      setBusy(true);
      try {
        const row = await refreshArticle({ ...input, onProgress: setProgress });
        if (row) {
          setRecord(row);
          setDownloaded(true);
        }
        return row;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const toggleFavorite = useCallback(async () => {
    if (!record) return;
    await setFavorite(slug, !record.favorite);
    await reload();
  }, [record, reload, slug]);

  return {
    downloaded,
    record,
    progress,
    busy,
    download,
    remove,
    checkRefresh,
    applyRefresh,
    toggleFavorite,
    reload,
    isDownloaded: () => isArticleDownloaded(slug),
  };
}

export function useOfflineLibrary(sort: OfflineSort = "newest", query = "") {
  const [rows, setRows] = useState<OfflineArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = query.trim()
        ? await searchOfflineArticles(query)
        : await listOfflineArticles();
      setRows(sortOfflineArticles(list, sort));
    } finally {
      setLoading(false);
    }
  }, [query, sort]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, reload };
}

export function useOfflineStorageStats() {
  const [stats, setStats] = useState<OfflineStorageStats | null>(null);
  const reload = useCallback(async () => {
    setStats(await getStorageStats());
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { stats, reload };
}
