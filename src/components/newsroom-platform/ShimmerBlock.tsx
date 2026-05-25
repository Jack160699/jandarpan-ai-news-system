import { cn } from "@/lib/cn";

type ShimmerBlockProps = {
  className?: string;
};

export function ShimmerBlock({ className }: ShimmerBlockProps) {
  return (
    <div
      className={cn(
        "nr-shimmer rounded-2xl bg-stone-200/40 dark:bg-stone-800/50",
        className
      )}
      aria-hidden
    />
  );
}

export function ShimmerCardRow({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerBlock key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
