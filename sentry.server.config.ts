/**
 * Sentry for the Node.js runtime (server components, route handlers, SSR).
 * Loaded by src/instrumentation.ts.
 *
 * With no DSN the SDK initialises disabled and every capture is a no-op — that
 * is how local development runs, so dev errors stay in the terminal instead of
 * polluting the production dashboard.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Driver phone numbers, addresses and chat messages pass through this app.
  // Never let the SDK attach request bodies, cookies or IPs on its own.
  sendDefaultPii: false,

  // Errors only — see the backend's instrument.ts for the reasoning.
  tracesSampleRate: 0,

  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
    }
    return event;
  },
});
