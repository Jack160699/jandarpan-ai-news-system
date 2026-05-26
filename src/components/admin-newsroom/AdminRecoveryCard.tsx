import Link from "next/link";

type AdminRecoveryCardProps = {
  title: string;
  message: string;
  showLogin?: boolean;
  forbidden?: boolean;
  /** Full page reload for same route after timeout */
  retryHref?: string;
};

export function AdminRecoveryCard({
  title,
  message,
  showLogin,
  forbidden,
  retryHref,
}: AdminRecoveryCardProps) {
  const loginHref = forbidden
    ? "/admin/login?error=forbidden&recovery=1"
    : "/admin/login?recovery=1";

  const retryTarget = retryHref
    ? retryHref.startsWith("/admin")
      ? retryHref
      : "/admin/editorial"
    : "/admin/editorial";

  return (
    <div className="admin-safe-guard admin-safe-guard--recovery">
      <div className="admin-safe-guard__card">
        <p className="admin-safe-guard__eyebrow">Newsroom</p>
        <h2 className="admin-safe-guard__title">{title}</h2>
        <p className="admin-safe-guard__message">{message}</p>
        <div className="admin-safe-guard__actions">
          <Link href={retryTarget} className="anr-btn anr-btn--primary">
            Retry
          </Link>
          {showLogin ? (
            <Link href={loginHref} className="anr-btn anr-btn--ghost">
              Sign in again
            </Link>
          ) : null}
          <Link href="/admin/editorial" className="anr-btn anr-btn--ghost">
            Editorial home
          </Link>
        </div>
      </div>
    </div>
  );
}
