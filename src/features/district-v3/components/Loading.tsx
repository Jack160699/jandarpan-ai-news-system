import { Loader2 } from "lucide-react";

export type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Loading your district…" }: LoadingProps) {
  return (
    <div className="dv3-loading" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="dv3-loading__spinner" size={28} aria-hidden />
      <p className="dv3-loading__label">{label}</p>
    </div>
  );
}
