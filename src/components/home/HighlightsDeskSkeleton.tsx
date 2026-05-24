/**
 * Slim homepage highlights placeholder — district + national segmented layout.
 */

export function HighlightsDeskSkeleton() {
  return (
    <div className="flex w-full flex-col gap-5 py-0.5" aria-hidden>
      {/* District block */}
      <div className="flex flex-col gap-3">
        <div className="h-[18px] w-[42%] max-w-[11rem] animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-700/60" />
        <div className="h-[46px] w-full animate-pulse rounded-[18px] bg-stone-200/70 dark:bg-stone-800/50" />
        <div className="flex gap-2 border-t border-stone-200/80 pt-2 dark:border-stone-700/50">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-300/80" />
          <div className="h-3 w-28 animate-pulse rounded bg-stone-200/80 dark:bg-stone-700/60" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-[52px] animate-pulse rounded-2xl bg-stone-200/70 dark:bg-stone-800/45"
            />
          ))}
        </div>
      </div>

      {/* National block */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between gap-3">
          <div className="h-[18px] w-[48%] max-w-[12rem] animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-700/60" />
          <div className="h-3 w-20 animate-pulse rounded bg-stone-200/60 dark:bg-stone-700/40" />
        </div>
        <div className="space-y-3 rounded-[20px] border border-stone-200/70 p-3 dark:border-stone-700/50">
          <div className="h-[46px] w-full animate-pulse rounded-[18px] bg-stone-800/40 dark:bg-stone-900/70" />
          <div className="flex gap-2 border-t border-stone-200/70 pt-2 dark:border-stone-700/50">
            <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-400/80" />
            <div className="h-3 w-32 animate-pulse rounded bg-stone-200/70 dark:bg-stone-700/50" />
          </div>
          <div className="flex flex-col gap-0 divide-y divide-stone-200/60 rounded-2xl border border-stone-200/50 p-2 dark:divide-stone-700/50 dark:border-stone-800/60">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-3">
                <div className="mb-2 h-2.5 w-16 animate-pulse rounded bg-stone-200/70 dark:bg-stone-700/50" />
                <div className="mb-1.5 h-4 w-full animate-pulse rounded bg-stone-200/80 dark:bg-stone-700/60" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-stone-200/50 dark:bg-stone-700/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
