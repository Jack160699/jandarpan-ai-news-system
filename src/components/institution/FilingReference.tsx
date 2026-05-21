import { cn } from "@/lib/cn";

type FilingReferenceProps = {
  refId: string;
  filed: string;
  className?: string;
};

export function FilingReference({ refId, filed, className }: FilingReferenceProps) {
  return (
    <p className={cn("filing-ref", className)}>
      Filing {refId} · Entered {filed}
    </p>
  );
}
