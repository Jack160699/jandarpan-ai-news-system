"use client";

import Link from "next/link";

export function AdminEmergencyBanner() {
  return (
    <div className="anr-emergency-banner" role="status">
      <strong>Recovery mode.</strong> Auth and workspace bootstrap are bypassed so
      you can reach the console. Set{" "}
      <code>ADMIN_EMERGENCY_MODE=0</code> and{" "}
      <code>NEXT_PUBLIC_ADMIN_EMERGENCY_MODE=0</code> to restore protections after
      fixing Supabase connectivity.
      <Link href="/admin/login" className="anr-emergency-banner__link">
        Sign in
      </Link>
    </div>
  );
}
