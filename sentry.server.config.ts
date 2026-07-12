import * as Sentry from "@sentry/nextjs";

const release =
  process.env.SENTRY_RELEASE?.trim() ||
  (process.env.VERCEL_GIT_COMMIT_SHA
    ? `jan-darpan@${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12)}`
    : undefined);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  enabled:
    Boolean(process.env.SENTRY_DSN) &&
    (process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLED === "true"),
});
