import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

// Points the plugin at our request-config resolver — the one that reads
// the locale cookie and loads the matching messages/*.json for every
// server-rendered request. Without this wire-up next-intl doesn't know
// where to source its data and useTranslations/getTranslations throw.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Both are needed only to upload source maps. Absent — as they are locally —
  // the build simply skips the upload step instead of failing, so this wrapper
  // is safe to keep in place before the Sentry account exists.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Without uploaded source maps a client-side stack trace is minified
  // gibberish (`t.default@main-a3f2.js:1:48210`). Set SENTRY_AUTH_TOKEN in
  // Vercel to turn that back into real file names and line numbers.
  silent: !process.env.CI,

  // Strip the uploaded maps from the deployed bundle afterwards: they are for
  // Sentry to read, not for anyone who opens DevTools on the production site.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
