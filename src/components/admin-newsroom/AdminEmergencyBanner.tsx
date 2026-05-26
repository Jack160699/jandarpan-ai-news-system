"use client";

import Link from "next/link";

export function AdminEmergencyBanner() {
  return (
    <div className="anr-emergency-banner" role="status">
      <strong>Emergency recovery mode.</strong> Auth is bypassed. Remove{" "}
      <code>ADMIN_EMERGENCY_MODE=1</code> and{" "}
      <code>NEXT_PUBLIC_ADMIN_EMERGENCY_MODE=1</code> from env to restore production
      security.
      <Link href="/admin/login" className="anr-emergency-banner__link">
        Sign in
      </Link>
    </div>
  );
}
