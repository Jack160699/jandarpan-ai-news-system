"use client";

import { useEffect } from "react";
import { BrandedErrorFallback } from "@/components/errors/BrandedErrorFallback";
import { captureOpsException } from "@/lib/observability/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
    void captureOpsException(error, {
      boundary: "global-error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="hi">
      <body style={{ margin: 0, background: "#0a0608", color: "#f5f1e8" }}>
        <BrandedErrorFallback
          reset={reset}
          message="A critical error occurred. Reload to continue reading."
        />
      </body>
    </html>
  );
}
