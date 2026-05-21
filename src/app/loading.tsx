export default function Loading() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--paper)] px-6"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="archive-marker text-[var(--ink-faint)]">Edition loading</p>
      <p
        className="mt-4 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-maroon-deep,#5c1212)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        CG Bhaskar
      </p>
      <div className="mt-8 h-px w-16 animate-pulse bg-[var(--rule-strong)]" />
    </div>
  );
}
