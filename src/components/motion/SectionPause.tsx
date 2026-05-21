"use client";

type SectionPauseProps = {
  /** Optional meta line — emotional beat between sections */
  label?: string;
};

export function SectionPause({ label }: SectionPauseProps) {
  return (
    <div
      className="section-pause editorial-container flex items-center justify-center"
      aria-hidden={!label}
    >
      {label ? (
        <p className="meta-label text-center text-[var(--ink-faint)]">{label}</p>
      ) : (
        <div className="h-px w-12 bg-[var(--rule)]" />
      )}
    </div>
  );
}
