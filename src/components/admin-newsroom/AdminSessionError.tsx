"use client";

type AdminSessionErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  recoverHref?: string;
};

export function AdminSessionError({
  title = "Could not verify your newsroom role",
  message = "Your account is signed in, but workspace membership could not be loaded. Use session recovery or sign in again.",
  onRetry,
  recoverHref,
}: AdminSessionErrorProps) {
  return (
    <div className="anr-auth-error" role="alert">
      <h2>{title}</h2>
      <p className="anr-meta">{message}</p>
      <div className="anr-auth-error__actions">
        {recoverHref ? (
          <a className="anr-btn" href={recoverHref}>
            Recover session
          </a>
        ) : null}
        {onRetry ? (
          <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void onRetry()}>
            Retry
          </button>
        ) : null}
        <a className="anr-btn anr-btn--ghost" href="/admin/login">
          Sign in again
        </a>
      </div>
    </div>
  );
}
