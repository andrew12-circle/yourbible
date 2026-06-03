import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) {
    console.error(error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
