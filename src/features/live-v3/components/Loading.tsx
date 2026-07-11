import { Loader2 } from "lucide-react";

export type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Loading live updates…" }: LoadingProps) {
  return (
    <div
      className="lv3-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="lv3-loading__spinner" size={28} aria-hidden />
      <p className="lv3-loading__label">{label}</p>
    </div>
  );
}
