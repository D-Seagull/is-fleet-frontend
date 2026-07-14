import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points the plugin at our request-config resolver — the one that reads
// the locale cookie and loads the matching messages/*.json for every
// server-rendered request. Without this wire-up next-intl doesn't know
// where to source its data and useTranslations/getTranslations throw.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
