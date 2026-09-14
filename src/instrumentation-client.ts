/**
 * Sentry in the browser. Catches what the server never sees: render crashes,
 * failed fetches, and anything thrown in an event handler.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f2706c0a201e6ec444692a1f489dbd6f@o4512086189080576.ingest.de.sentry.io/4512086213328976",
  environment: process.env.NODE_ENV,

  enabled:
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_SENTRY_DEV === "1",

  tracesSampleRate: 0,

  // ⚠️ Session Replay is deliberately NOT enabled. It records the DOM, which on
  // this app means recording drivers' chat messages, phone numbers and trip
  // documents. Do not add `replayIntegration()` here without a privacy-policy
  // change and a masking configuration that has actually been reviewed.

  // Explicit, because the v10 defaults collect far more than this app may send.
  // sendDefaultPii is deprecated in v10 and ignored when dataCollection is set.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    // Minifiers rename locals, so name-based filtering is unreliable here —
    // drop them entirely rather than hope `phone` did not survive as `phone`.
    stackFrameVariables: false,
  },

  beforeSend(event) {
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
