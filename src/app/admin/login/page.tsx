import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";
import { AdminRecoveryCard } from "@/components/admin-newsroom/AdminRecoveryCard";
import { getDashboardSessionSafe } from "@/lib/saas-auth/session-safe";

export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    recovery?: string;
    next?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const recoveryMode =
    params.recovery === "1" ||
    params.error === "forbidden" ||
    params.error === "session_timeout";

  const sessionResult = await getDashboardSessionSafe();
  const session = sessionResult.ok ? sessionResult.session : null;

  if (!sessionResult.ok && sessionResult.reason === "timeout") {
    return (
      <AdminRecoveryCard
        title="Sign-in service timed out"
        message={sessionResult.message}
        showLogin
        retryHref="/admin/login"
      />
    );
  }

  if (session && !recoveryMode) {
    const dest = params.next ?? "/admin/editorial";
    redirect(dest.startsWith("/admin") ? dest : "/admin/editorial");
  }

  if (session && params.error === "forbidden") {
    return (
      <AdminRecoveryCard
        title="Signed in without access"
        message="Your account is active but lacks permission for that admin route. Ask a super admin to adjust your role."
        forbidden
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="anr-login-root flex min-h-dvh items-center justify-center">
          <span className="text-sm text-zinc-500">Loading…</span>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
