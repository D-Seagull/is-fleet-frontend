/**
 * Sentry for the Node.js runtime (server components, route handlers, SSR).
 * Loaded by src/instrumentation.ts.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f2706c0a201e6ec444692a1f489dbd6f@o4512086189080576.ingest.de.sentry.io/4512086213328976",
  // VERCEL_ENV, not NODE_ENV: a local `npm run build && npm start` also sets
  // NODE_ENV=production and would file its errors as if they came from the
  // live site. This also separates preview deploys from production, so a
  // crash on a feature branch does not read as an outage.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",

  // Local dev stays out of the production dashboard. Set NEXT_PUBLIC_SENTRY_DEV=1
  // in .env.local when you deliberately want to test reporting from localhost.
  enabled:
    Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV) ||
    process.env.NEXT_PUBLIC_SENTRY_DEV === "1",

  // Errors only — tracing on a Socket.io app burns the quota that errors need.
  tracesSampleRate: 0,

// Explicit, because the v10 defaults collect far more than this app may
  // send: request bodies, database query data (including returned rows) and
  // local variables from stack frames all default to ON. sendDefaultPii is
  // deprecated in v10 and ignored when dataCollection is present, so state
  // every category rather than relying on it.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    // Prisma rows would carry driver names, phones and message text.
    databaseQueryData: false,
    // A local named `message` or `phone` is exactly what we must not ship.
    stackFrameVariables: false,
  },

  // Second layer behind dataCollection: the SDK's categories move between
  // versions, these two fields never become acceptable to send.
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
