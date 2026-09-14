/**
 * Sentry for the Edge runtime — this is where src/proxy.ts (the Next 16
 * middleware) runs, so an auth-guard failure that redirects every user to
 * /login would surface here and nowhere else.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
