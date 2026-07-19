"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilePlus, Loader2 } from "lucide-react";

export function EditorIndexPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function newDraft() {
    setBusy(true);
    try {
      const res = await fetch("/api/editorial/article", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "hi" }),
      });
      const json = await res.json();
      if (json.ok && json.id) {
        router.push(`/admin/editor/${json.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="jd-editor-index">
      <p className="anr-meta">
        Professional block editor with AI desk, SEO studio, and version snapshots.
      </p>
      <div className="jd-editor-index__actions">
        <button
          type="button"
          className="anr-btn anr-btn--primary"
          onClick={() => void newDraft()}
          disabled={busy}
        >
          {busy ? <Loader2 size={14} className="spin" /> : <FilePlus size={14} />}
          New article
        </button>
        <Link href="/admin/stories" className="anr-btn anr-btn--ghost">
          Open stories desk
        </Link>
      </div>
    </div>
  );
}
