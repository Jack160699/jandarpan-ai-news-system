import { cn } from "@/lib/cn";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Lighter overlays for fast-scan news surfaces */
  variant?: "default" | "news";
};

export function PageShell({
  children,
  className,
  variant = "default",
}: PageShellProps) {
  const isNews = variant === "news";

  return (
    <div className={cn("page-shell relative min-h-screen w-full", className)}>
      {!isNews ? (
        <>
          <div className="paper-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
          <div className="paper-fiber pointer-events-none fixed inset-0 z-[1]" aria-hidden />
          <div className="ink-vignette pointer-events-none fixed inset-0 z-[1]" aria-hidden />
        </>
      ) : null}
      {children}
    </div>
  );
}
