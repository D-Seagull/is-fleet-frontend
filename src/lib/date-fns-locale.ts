import type { Locale } from "date-fns";
import { uk, enUS, pl, lt, de, ru } from "date-fns/locale";

/**
 * Maps a next-intl UI locale (see `src/i18n/request.ts` LOCALES) to the
 * matching date-fns locale object, so relative times like
 * `formatDistanceToNow` render in the user's language instead of English.
 * Falls back to Ukrainian (the app's default locale) for anything unknown.
 */
const DATE_FNS_LOCALES: Record<string, Locale> = {
  uk,
  en: enUS,
  pl,
  lt,
  de,
  ru,
};

export function dateFnsLocale(locale: string): Locale {
  return DATE_FNS_LOCALES[locale.toLowerCase()] ?? uk;
}
