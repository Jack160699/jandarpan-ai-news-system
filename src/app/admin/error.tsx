"use client";

import { useEffect } from "react";
import { AdminEditorialErrorFallback } from "@/components/admin-newsroom/AdminEditorialErrorFallback";
import { captureOpsException } from "@/lib/observability/sentry";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error("[admin/error]", error);
    void captureOpsException(error, {
      boundary: "admin/error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <AdminEditorialErrorFallback
      title="Editorial workspace unavailable"
      error={error}
      reset={reset}
    />
  );
}
