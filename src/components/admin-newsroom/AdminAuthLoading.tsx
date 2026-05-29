"use client";

export function AdminAuthLoading({ label = "Loading newsroom access…" }: { label?: string }) {
  return (
    <div className="anr-auth-loading" role="status" aria-live="polite">
      <div className="anr-auth-loading__spinner" aria-hidden />
      <p className="anr-meta">{label}</p>
    </div>
  );
}
