import Link from "next/link";

type AdminRecoveryCardProps = {
  title: string;
  message: string;
  showLogin?: boolean;
  forbidden?: boolean;
};

export function AdminRecoveryCard({
  title,
  message,
  showLogin,
  forbidden,
}: AdminRecoveryCardProps) {
  const loginHref = forbidden
    ? "/admin/login?error=forbidden&recovery=1"
    : "/admin/login?recovery=1";

  return (
    <div className="admin-safe-guard admin-safe-guard--recovery">
      <div className="admin-safe-guard__card">
        <p className="admin-safe-guard__eyebrow">Newsroom</p>
        <h2 className="admin-safe-guard__title">{title}</h2>
        <p className="admin-safe-guard__message">{message}</p>
        <div className="admin-safe-guard__actions">
          {showLogin ? (
            <Link href={loginHref} className="anr-btn anr-btn--primary">
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
