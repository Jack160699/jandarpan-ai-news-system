"use client";

import { useEffect } from "react";
import { BrandedErrorFallback } from "@/components/errors/BrandedErrorFallback";
import { captureOpsException } from "@/lib/observability/sentry";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
    void captureOpsException(error, { boundary: "app/error", digest: error.digest });
  }, [error]);

  return (
    <BrandedErrorFallback
      reset={reset}
      message={
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong while loading the app. Please try again."
      }
    />
  );
}
