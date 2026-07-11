import { Loader2 } from "lucide-react";

export type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Preparing your morning brief…" }: LoadingProps) {
  return (
    <div className="mb-loading" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="mb-loading__spinner" size={28} aria-hidden />
      <p className="mb-loading__label">{label}</p>
    </div>
  );
}
