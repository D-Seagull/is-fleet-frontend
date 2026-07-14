import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

/**
 * Supported locales for the web UI. Kept in sync (by convention) with
 * the Prisma `Language` enum on the backend — user preference lives at
 * `User.language` and is synced to this cookie by the language switcher.
 * The `UK` enum value maps to the `uk` locale here.
 */
export const LOCALES = ["uk", "en", "pl", "lt", "de", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uk";

function normalize(input: string | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase();
  return (LOCALES as readonly string[]).includes(lower)
    ? (lower as Locale)
    : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = normalize(store.get("locale")?.value);
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
