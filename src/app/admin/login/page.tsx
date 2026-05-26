import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="saas-login">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
