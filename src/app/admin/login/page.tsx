import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";
import { getDashboardSession } from "@/lib/saas-auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getDashboardSession();
  if (session) {
    redirect("/admin/editorial");
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
