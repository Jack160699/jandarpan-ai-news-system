"use client";

import { useEffect } from "react";
import { BrandedErrorFallback } from "@/components/errors/BrandedErrorFallback";
import { ErrorStatePage } from "@/features/reader-ds/system";
import { captureOpsException } from "@/lib/observability/sentry";

const readerDs =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_READER_DS === "1";

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

  if (readerDs) {
    return <ErrorStatePage reset={reset} code={error.digest ? `JD-${error.digest.slice(0, 6)}` : "JD-500"} />;
  }

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
