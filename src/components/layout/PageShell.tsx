import { cn } from "@/lib/cn";
import { ReaderShell } from "@/features/reader-ds/components/ReaderShell";
import { Masthead } from "@/features/reader-ds/components/Masthead";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Lighter overlays for fast-scan news surfaces */
  variant?: "default" | "news";
  pageTitle?: string;
  backHref?: string;
};

export function PageShell({
  children,
  className,
  variant = "default",
  pageTitle,
  backHref = "/",
}: PageShellProps) {
  const isNews = variant === "news";

  if (isNews) {
    return (
      <div className={cn("page-shell relative min-h-screen w-full", className)}>
        {children}
      </div>
    );
  }

  return (
    <ReaderShell activeNav={null} showDeskFooter={true}>
      <Masthead back backHref={backHref} pageTitle={pageTitle} />
      <div
        className={cn("page-shell relative min-h-[70vh] w-full jd-ui", className)}
        style={{ background: "var(--jd-paper)", flex: 1 }}
      >
        <div className="paper-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
        <div className="paper-fiber pointer-events-none fixed inset-0 z-[1]" aria-hidden />
        <div className="ink-vignette pointer-events-none fixed inset-0 z-[1]" aria-hidden />
        <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
      </div>
    </ReaderShell>
  );
}

