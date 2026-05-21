import { cn } from "@/lib/cn";

type DeskOfProps = {
  desk: string;
  editor: string;
  note?: string;
  className?: string;
};

export function DeskOf({ desk, editor, note, className }: DeskOfProps) {
  return (
    <div className={cn("desk-of", className)}>
      <p className="archive-marker">From the desk of</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink-primary)] md:text-2xl">
        {desk}
      </p>
      <p className="meta-label mt-2 text-[var(--ink-muted)]">
        {editor}, Editor
      </p>
      {note ? (
        <p className="editorial-body mt-4 max-w-md text-[var(--ink-secondary)]">
          {note}
        </p>
      ) : null}
    </div>
  );
}
