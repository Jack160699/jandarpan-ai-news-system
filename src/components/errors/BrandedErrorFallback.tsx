"use client";

import Link from "next/link";

export type BrandedErrorLink = {
  href: string;
  label: string;
};

type BrandedErrorFallbackProps = {
  title?: string;
  message?: string;
  reset?: () => void;
  showHome?: boolean;
  variant?: "default" | "admin";
  digest?: string;
  links?: BrandedErrorLink[];
  retryLabel?: string;
};

export function BrandedErrorFallback({
  title = "This page couldn't load",
  message = "Something went wrong while loading the app. Please try again.",
  reset,
  showHome = true,
  variant = "default",
  digest,
  links = [],
  retryLabel = "Reload",
}: BrandedErrorFallbackProps) {
  const isAdmin = variant === "admin";

  function handleRetry() {
    if (reset) {
      reset();
      return;
    }
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div
      className={`error-fallback ${isAdmin ? "error-fallback--admin" : ""}`}
      role="alert"
    >
      <div className="error-fallback__card">
        <p className="error-fallback__brand">
          {isAdmin ? "Jan Darpan" : "जन दर्पण छत्तीसगढ़"}
        </p>
        <h1 className="error-fallback__title">{title}</h1>
        <p className="error-fallback__message">{message}</p>
        {digest ? (
          <p className="error-fallback__digest">
            Reference: <code>{digest}</code>
          </p>
        ) : null}
        <div className="error-fallback__actions">
          <button type="button" className="error-fallback__btn" onClick={handleRetry}>
            {retryLabel}
          </button>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="error-fallback__link">
              {link.label}
            </Link>
          ))}
          {showHome ? (
            <Link href="/" className="error-fallback__link">
              Go to homepage
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
