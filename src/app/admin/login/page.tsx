import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";
import { AdminRecoveryCard } from "@/components/admin-newsroom/AdminRecoveryCard";
import { getDashboardSession } from "@/lib/saas-auth/session";

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

  const session = await getDashboardSession();

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
