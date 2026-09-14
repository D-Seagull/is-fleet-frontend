/**
 * Sentry in the browser. Catches what the server never sees: render crashes,
 * failed fetches, and anything thrown in an event handler.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  sendDefaultPii: false,
  tracesSampleRate: 0,

  // ⚠️ Session Replay is deliberately NOT enabled. It records the DOM, which on
  // this app means recording drivers' chat messages, phone numbers and trip
  // documents — and shipping them to a third party. Do not add
  // `replayIntegration()` here without a privacy-policy change and a masking
  // configuration that has actually been reviewed.

  beforeSend(event) {
    // The access token lives in memory and can end up in a failed-request
    // breadcrumb URL or header; strip request detail before anything leaves
    // the browser.
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      if (event.request.headers) {
        delete event.request.headers.authorization;
      }
    }
    return event;
  },
});

/** Feeds Next's client-side navigation timings to Sentry. Harmless with
 *  tracing off, and required by the SDK's router instrumentation. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
