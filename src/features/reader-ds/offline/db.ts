import {
  DEFAULT_MAX_ARTICLES,
  DEFAULT_STORAGE_LIMIT_BYTES,
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  OFFLINE_META_STORE,
  OFFLINE_STORE,
  type OfflineArticleRecord,
  type OfflineMeta,
} from "./types";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        const store = db.createObjectStore(OFFLINE_STORE, { keyPath: "slug" });
        store.createIndex("downloadedAt", "downloadedAt");
        store.createIndex("category", "category");
        store.createIndex("district", "district");
        store.createIndex("favorite", "favorite");
      }
      if (!db.objectStoreNames.contains(OFFLINE_META_STORE)) {
        db.createObjectStore(OFFLINE_META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx aborted"));
  });
}

export async function putOfflineArticle(record: OfflineArticleRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OFFLINE_STORE, "readwrite");
  tx.objectStore(OFFLINE_STORE).put(record);
  await txDone(tx);
  db.close();
}

export async function getOfflineArticle(slug: string): Promise<OfflineArticleRecord | null> {
  const db = await openDb();
  const tx = db.transaction(OFFLINE_STORE, "readonly");
  const req = tx.objectStore(OFFLINE_STORE).get(slug);
  const row = await new Promise<OfflineArticleRecord | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as OfflineArticleRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return row ?? null;
}

export async function deleteOfflineArticle(slug: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OFFLINE_STORE, "readwrite");
  tx.objectStore(OFFLINE_STORE).delete(slug);
  await txDone(tx);
  db.close();
}

export async function listOfflineArticles(): Promise<OfflineArticleRecord[]> {
  const db = await openDb();
  const tx = db.transaction(OFFLINE_STORE, "readonly");
  const req = tx.objectStore(OFFLINE_STORE).getAll();
  const rows = await new Promise<OfflineArticleRecord[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as OfflineArticleRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows;
}

export async function clearAllOfflineArticles(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OFFLINE_STORE, "readwrite");
  tx.objectStore(OFFLINE_STORE).clear();
  await txDone(tx);
  db.close();
}

export async function getOfflineSettings(): Promise<OfflineMeta> {
  const db = await openDb();
  const tx = db.transaction(OFFLINE_META_STORE, "readonly");
  const req = tx.objectStore(OFFLINE_META_STORE).get("settings");
  const row = await new Promise<OfflineMeta | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as OfflineMeta | undefined);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return (
    row ?? {
      key: "settings",
      storageLimitBytes: DEFAULT_STORAGE_LIMIT_BYTES,
      maxArticles: DEFAULT_MAX_ARTICLES,
      lastCleanupAt: null,
    }
  );
}

export async function saveOfflineSettings(patch: Partial<OfflineMeta>): Promise<OfflineMeta> {
  const current = await getOfflineSettings();
  const next: OfflineMeta = { ...current, ...patch, key: "settings" };
  const db = await openDb();
  const tx = db.transaction(OFFLINE_META_STORE, "readwrite");
  tx.objectStore(OFFLINE_META_STORE).put(next);
  await txDone(tx);
  db.close();
  return next;
}

export async function setFavorite(slug: string, favorite: boolean): Promise<void> {
  const row = await getOfflineArticle(slug);
  if (!row) return;
  await putOfflineArticle({ ...row, favorite });
}
