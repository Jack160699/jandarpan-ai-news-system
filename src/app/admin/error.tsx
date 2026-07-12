"use client";

import { useEffect } from "react";
import { BrandedErrorFallback } from "@/components/errors/BrandedErrorFallback";
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
    <BrandedErrorFallback
      title="Newsroom panel error"
      message={
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong in the editorial workspace. Try reloading or return to the overview."
      }
      reset={reset}
      showHome
    />
  );
}
