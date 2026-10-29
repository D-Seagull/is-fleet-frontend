import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

// Points the plugin at our request-config resolver — the one that reads
// the locale cookie and loads the matching messages/*.json for every
// server-rendered request. Without this wire-up next-intl doesn't know
// where to source its data and useTranslations/getTranslations throw.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Baseline security headers on every route. No full CSP yet: the app pulls
// from the API, Supabase Storage and the Sentry tunnel, and a wrong policy
// silently breaks pages — `frame-ancestors` is the part that matters now
// (no one may embed the app and trick a click through an invisible frame).
// The desktop shell loads the app as its top-level page, so DENY is safe.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Hardcoded rather than read from env: neither is a secret (both appear in
  // the dashboard URL), and three required Vercel variables instead of one is
  // three chances to silently skip the source-map upload. The token stays in
  // SENTRY_AUTH_TOKEN, which is the only actual secret here.
  org: "dmytro-chaika",
  project: "javascript-nextjs",

  // Without uploaded source maps a client-side stack trace is minified
  // gibberish (`t.default@main-a3f2.js:1:48210`). Set SENTRY_AUTH_TOKEN in
  // Vercel to turn that back into real file names and line numbers.
  silent: !process.env.CI,

  // Strip the uploaded maps from the deployed bundle afterwards: they are for
  // Sentry to read, not for anyone who opens DevTools on the production site.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Routes browser events through our own origin so ad blockers cannot drop
  // them. This path must be exempt from the auth guard — see src/lib/routes.ts.
  tunnelRoute: "/monitoring",
});
