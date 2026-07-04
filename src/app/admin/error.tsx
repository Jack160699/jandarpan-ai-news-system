"use client";

import { BrandedErrorFallback } from "@/components/errors/BrandedErrorFallback";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
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
