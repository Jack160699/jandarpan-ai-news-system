import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

function LoginFallback() {
  return (
    <div className="anr-login-root flex min-h-dvh items-center justify-center bg-zinc-950">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        Loading newsroom console…
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
