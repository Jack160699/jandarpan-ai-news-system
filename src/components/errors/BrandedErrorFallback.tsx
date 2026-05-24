"use client";

import Link from "next/link";

type BrandedErrorFallbackProps = {
  title?: string;
  message?: string;
  reset?: () => void;
  showHome?: boolean;
};

export function BrandedErrorFallback({
  title = "This page couldn't load",
  message = "Something went wrong while loading the app. Please try again.",
  reset,
  showHome = true,
}: BrandedErrorFallbackProps) {
  return (
    <div className="error-fallback" role="alert">
      <div className="error-fallback__card">
        <p className="error-fallback__brand">जन दर्पण छत्तीसगढ़</p>
        <h1 className="error-fallback__title">{title}</h1>
        <p className="error-fallback__message">{message}</p>
        <div className="error-fallback__actions">
          {reset ? (
            <button type="button" className="error-fallback__btn" onClick={reset}>
              Reload
            </button>
          ) : (
            <button
              type="button"
              className="error-fallback__btn"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
            >
              Reload
            </button>
          )}
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
