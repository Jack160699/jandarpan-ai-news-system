"use client";

import { BrandedErrorFallback } from "@/components/errors/BrandedErrorFallback";

const ADMIN_ERROR_LINKS = [
  { href: "/admin/editorial", label: "Return to Editorial" },
  { href: "/admin/overview", label: "Return to Command Centre" },
  { href: "/admin/health", label: "Open Platform Health" },
] as const;

type AdminEditorialErrorFallbackProps = {
  title?: string;
  message?: string;
  error?: Error & { digest?: string };
  reset?: () => void;
};

export function AdminEditorialErrorFallback({
  title = "Editorial workspace unavailable",
  message = "Something went wrong in the editorial workspace. Try again or return to a safe route.",
  error,
  reset,
}: AdminEditorialErrorFallbackProps) {
  const detail =
    process.env.NODE_ENV === "development" && error?.message
      ? error.message
      : message;

  return (
    <BrandedErrorFallback
      variant="admin"
      title={title}
      message={detail}
      digest={error?.digest}
      reset={reset}
      showHome={false}
      retryLabel="Retry"
      links={[...ADMIN_ERROR_LINKS]}
    />
  );
}
