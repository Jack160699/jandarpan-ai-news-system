"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeProvider } from "@/design-system/theme";
import { PreviewThemeSync } from "./components/PreviewThemeSync";
import { ThemeModeSwitch, ViewportSwitch, ViewportFrame, type ViewportSize } from "./components/PreviewControls";

type PreviewShellProps = {
  children: ReactNode;
  navItems: { id: string; label: string }[];
  title: string;
  subtitle: string;
  frameContent?: boolean;
};

export function PreviewShell({
  children,
  navItems,
  title,
  subtitle,
  frameContent = false,
}: PreviewShellProps) {
  const pathname = usePathname();
  const [viewport, setViewport] = useState<ViewportSize>("desktop");

  const content = frameContent ? (
    <ViewportFrame size={viewport}>{children}</ViewportFrame>
  ) : (
    children
  );

  return (
    <ThemeProvider defaultMode="light" syncWithReaderTheme={false} storageKey="jds-preview-theme">
      <PreviewThemeSync />
      <div className="jds-root jds-preview">
        <header className="jds-preview__header">
          <div className="jds-preview__brand">
            <span className="jds-preview__brand-tag">JDP-011 · Project Phoenix</span>
            <span className="jds-preview__brand-title">{title}</span>
          </div>
          <div className="jds-preview__controls">
            <ThemeModeSwitch />
            <ViewportSwitch value={viewport} onChange={setViewport} />
            <nav aria-label="Preview routes">
              <div className="jds-preview__row">
                <Link
                  href="/design-system"
                  className={`jds-preview__nav-link${pathname === "/design-system" ? " jds-preview__nav-link--active" : ""}`}
                >
                  Tokens
                </Link>
                <Link
                  href="/component-library"
                  className={`jds-preview__nav-link${pathname === "/component-library" ? " jds-preview__nav-link--active" : ""}`}
                >
                  Components
                </Link>
              </div>
            </nav>
          </div>
        </header>

        <div className="jds-preview__layout">
          <aside className="jds-preview__sidebar" aria-label="Section navigation">
            <div className="jds-preview__nav-group">
              <span className="jds-preview__nav-label">{subtitle}</span>
              {navItems.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="jds-preview__nav-link">
                  {item.label}
                </a>
              ))}
            </div>
          </aside>
          <main className="jds-preview__main">{content}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
