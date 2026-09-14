import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

// Points the plugin at our request-config resolver — the one that reads
// the locale cookie and loads the matching messages/*.json for every
// server-rendered request. Without this wire-up next-intl doesn't know
// where to source its data and useTranslations/getTranslations throw.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
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
