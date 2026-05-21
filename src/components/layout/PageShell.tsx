import { cn } from "@/lib/cn";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("page-shell relative min-h-screen w-full", className)}>
      <div className="paper-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <div className="paper-fiber pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <div className="ink-vignette pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      {children}
    </div>
  );
}
