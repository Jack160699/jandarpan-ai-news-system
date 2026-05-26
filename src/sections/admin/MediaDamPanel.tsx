"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AudioLines,
  Film,
  FolderPlus,
  Image as ImageIcon,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DamAsset, DamLibrarySnapshot, DamMediaType } from "@/lib/dam/types";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";

type MediaFilter = DamMediaType | "all";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaDamPanel() {
  const [data, setData] = useState<DamLibrarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DamAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [watermark, setWatermark] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (filter !== "all") params.set("type", filter);
      if (folderId) params.set("folderId", folderId);

      const res = await fetch(`/api/dam/library?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load library");
        return;
      }
      const { ok: _ok, ...snapshot } = json;
      setData(snapshot as DamLibrarySnapshot);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [query, filter, folderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        if (folderId) form.append("folderId", folderId);
        if (watermark) form.append("watermark", "1");

        await fetch("/api/dam/upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });
      }
      await load();
    } finally {
      setUploading(false);
      setDragOver(false);
    }
  }

  async function createFolder() {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    await fetch("/api/dam/folders", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId: folderId }),
    });
    load();
  }

  async function runAiAnalyze(id: string) {
    await fetch(`/api/dam/assets/${id}/analyze`, {
      method: "POST",
      credentials: "include",
    });
    load();
    if (selected?.id === id) {
      const res = await fetch(`/api/dam/assets/${id}`, { credentials: "include" });
      const json = await res.json();
      if (json.asset) setSelected(json.asset);
    }
  }

  async function deleteAsset(id: string) {
    if (!window.confirm("Delete this asset from the library?")) return;
    await fetch(`/api/dam/assets/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (selected?.id === id) setSelected(null);
    load();
  }

  if (loading && !data) {
    return (
      <div className="dam">
        <div className="anr-skeleton" style={{ height: "18rem" }} />
      </div>
    );
  }

  if (error) return <EmptyState title="Media library offline" hint={error} />;

  const assets = data?.assets ?? [];

  return (
    <div className="dam">
      <header className="dam__header">
        <div>
          <p className="dam__kicker">Digital Asset Management</p>
          <h2 className="dam__title">Media Library</h2>
        </div>
        <div className="dam__header-actions">
          <label className="dam__check">
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
            />
            Watermark uploads
          </label>
          <button type="button" className="dam__btn dam__btn--ghost" onClick={createFolder}>
            <FolderPlus size={14} /> Folder
          </button>
          <button
            type="button"
            className="dam__btn dam__btn--primary"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="dam__file-input"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      </header>

      <div className="dam__stats">
        <span>{data?.total ?? 0} assets</span>
        <span>{data?.counts.image ?? 0} images</span>
        <span>{data?.counts.video ?? 0} video</span>
        <span>{data?.counts.audio ?? 0} audio</span>
      </div>

      <div
        className={`dam__dropzone ${dragOver ? "dam__dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={28} strokeWidth={1.25} />
        <p>Drag & drop images, video, or audio</p>
        <span className="dam__meta">Max 25 MB per file · WebP variants for images</span>
      </div>

      <div className="dam__toolbar">
        <div className="dam__search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, caption, OCR…"
            aria-label="Search media"
          />
        </div>
        <div className="dam__filters">
          {(["all", "image", "video", "audio"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={filter === t ? "is-active" : ""}
              onClick={() => setFilter(t)}
            >
              {t === "image" && <ImageIcon size={12} />}
              {t === "video" && <Film size={12} />}
              {t === "audio" && <AudioLines size={12} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dam__body">
        <aside className="dam__sidebar">
          <button
            type="button"
            className={!folderId ? "is-active" : ""}
            onClick={() => setFolderId(null)}
          >
            All media
          </button>
          {(data?.folders ?? []).map((f) => (
            <button
              key={f.id}
              type="button"
              className={folderId === f.id ? "is-active" : ""}
              onClick={() => setFolderId(f.id)}
            >
              {f.name}
            </button>
          ))}

          {data?.recommendations?.length ? (
            <div className="dam__recs">
              <h4>Smart picks</h4>
              <ul>
                {data.recommendations.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const a = assets.find((x) => x.id === r.assetId);
                        if (a) setSelected(a);
                      }}
                    >
                      <strong>{r.headline.slice(0, 32)}</strong>
                      <span>{r.reason}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <main className="dam__grid-wrap">
          {assets.length === 0 ? (
            <EmptyState title="No assets yet" hint="Upload or drag files to begin." />
          ) : (
            <div className="dam__grid">
              {assets.map((asset, i) => (
                <motion.button
                  key={asset.id}
                  type="button"
                  className={`dam__card ${selected?.id === asset.id ? "dam__card--selected" : ""}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelected(asset)}
                >
                  <div className="dam__thumb">
                    {asset.mediaType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          asset.variants.find((v) => v.variantKey === "thumb")
                            ?.publicUrl ?? asset.publicUrl
                        }
                        alt=""
                      />
                    ) : asset.mediaType === "video" ? (
                      <Film size={32} />
                    ) : (
                      <AudioLines size={32} />
                    )}
                    {asset.duplicateOf ? (
                      <span className="dam__badge">dup</span>
                    ) : null}
                  </div>
                  <p>{asset.name}</p>
                  <span>{formatBytes(asset.sizeBytes)}</span>
                </motion.button>
              ))}
            </div>
          )}
        </main>

        <AnimatePresence>
          {selected ? (
            <motion.aside
              className="dam__detail"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
            >
              <div className="dam__detail-head">
                <h3>{selected.name}</h3>
                <button
                  type="button"
                  className="dam__icon-btn"
                  aria-label="Delete asset"
                  onClick={() => deleteAsset(selected.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {selected.mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.publicUrl}
                  alt=""
                  className="dam__preview"
                />
              ) : null}

              <dl className="dam__meta-list">
                <div>
                  <dt>Type</dt>
                  <dd>{selected.mediaType}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{formatBytes(selected.sizeBytes)}</dd>
                </div>
                {selected.width ? (
                  <div>
                    <dt>Dimensions</dt>
                    <dd>
                      {selected.width}×{selected.height}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>CDN</dt>
                  <dd>{selected.cdnOptimized ? "Optimized" : "Original"}</dd>
                </div>
              </dl>

              {selected.aiCaption ? (
                <p className="dam__caption">{selected.aiCaption}</p>
              ) : null}

              {selected.aiTags.length > 0 ? (
                <div className="dam__tags">
                  {selected.aiTags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              ) : null}

              {selected.aiObjects.length > 0 ? (
                <p className="dam__meta">
                  Objects: {selected.aiObjects.join(", ")}
                </p>
              ) : null}

              {selected.aiOcr ? (
                <blockquote className="dam__ocr">{selected.aiOcr}</blockquote>
              ) : null}

              {selected.aiFaces.length > 0 ? (
                <p className="dam__meta">
                  Faces:{" "}
                  {selected.aiFaces
                    .map((f) => `${f.label} (${f.count})`)
                    .join(", ")}
                </p>
              ) : null}

              {selected.copyright?.holder ? (
                <p className="dam__meta">
                  © {selected.copyright.holder}
                  {selected.copyright.license
                    ? ` · ${selected.copyright.license}`
                    : ""}
                </p>
              ) : null}

              {selected.variants.length > 0 ? (
                <div className="dam__variants">
                  <h4>Responsive variants</h4>
                  <ul>
                    {selected.variants.map((v) => (
                      <li key={v.id}>
                        {v.variantKey} — {v.width}×{v.height}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <button
                type="button"
                className="dam__btn dam__btn--primary"
                onClick={() => runAiAnalyze(selected.id)}
              >
                <Sparkles size={14} /> Re-run AI analysis
              </button>

              <input
                className="dam__url"
                readOnly
                value={selected.publicUrl}
                onFocus={(e) => e.target.select()}
              />
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
