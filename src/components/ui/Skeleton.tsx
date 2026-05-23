import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
};

export function Skeleton({ className, label = "Loading" }: SkeletonProps) {
  return (
    <span
      className={cn("ds-skeleton pl-shimmer block", className)}
      role="status"
      aria-label={label}
      aria-busy="true"
    />
  );
}

type SkeletonBlockProps = {
  lines?: number;
  className?: string;
};

export function SkeletonText({ lines = 3, className }: SkeletonBlockProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            i === 0 && "w-[92%]",
            i === 1 && "w-[78%]",
            i > 1 && "w-[45%]"
          )}
        />
      ))}
    </div>
  );
}
