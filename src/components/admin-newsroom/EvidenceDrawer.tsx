"use client";

import { useState } from "react";

type EvidenceDrawerProps = {
  label?: string;
  data: unknown;
};

function isEmptyEvidence(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data as object).length === 0;
  return false;
}

/**
 * Renders a finding's/action's arbitrary `evidence`/`evidence_refs` JSON
 * readably behind a small toggle. Deliberately simple — a formatted <pre>,
 * not a JSON tree viewer.
 */
export function EvidenceDrawer({ label = "Evidence", data }: EvidenceDrawerProps) {
  const [open, setOpen] = useState(false);

  if (isEmptyEvidence(data)) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-zinc-400 underline decoration-dotted underline-offset-2 hover:text-zinc-200"
        aria-expanded={open}
      >
        {open ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      </button>
      {open ? (
        <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/70 p-3 text-[11px] leading-relaxed text-zinc-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
