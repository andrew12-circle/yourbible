const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

let sentryInitPromise: Promise<typeof import("@sentry/react")> | null = null;

export function initSentry(): void {
  void ensureSentryInitialized()?.catch((error) => {
    console.error("[sentry:init]", error);
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) {
    console.error(error, context);
    return;
  }

  void ensureSentryInitialized()
    ?.then((Sentry) => {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    })
    .catch((sentryError) => {
      console.error("[sentry:capture]", sentryError);
      console.error(error, context);
    });
}

function ensureSentryInitialized(): Promise<typeof import("@sentry/react")> | null {
  if (!dsn) return null;

  sentryInitPromise ??= import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
    });
    return Sentry;
  });

  return sentryInitPromise;
}
