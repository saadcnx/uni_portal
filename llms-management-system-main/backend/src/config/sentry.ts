import * as Sentry from "@sentry/node";
import { env } from "./env.js";
import { logger } from "./logger.js";

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    logger.debug("SENTRY_DSN is empty, skipping Sentry initialization");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
  logger.info("Sentry initialized");
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}
