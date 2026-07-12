import * as Sentry from "@sentry/nextjs";

const release =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim() ||
  process.env.SENTRY_RELEASE?.trim() ||
  (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ? `jan-darpan@${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12)}`
    : process.env.VERCEL_GIT_COMMIT_SHA
      ? `jan-darpan@${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12)}`
      : undefined);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
  enabled: Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN
  ),
});
