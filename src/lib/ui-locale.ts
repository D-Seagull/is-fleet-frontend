/**
 * Backend `UILocale` enum values that the User row carries.
 */
export type UiLocaleDb = "UK" | "EN" | "PL" | "LT" | "DE" | "RU";

/**
 * Shape used everywhere the cookie / next-intl config touches (must match
 * `LOCALES` in src/i18n/request.ts).
 */
export type UiLocaleCookie = "uk" | "en" | "pl" | "lt" | "de" | "ru";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const COOKIE_NAME = "locale";

/**
 * Sync the `locale` cookie next-intl reads on the server. Called after
 * login (from the /auth/login response payload) and after the account
 * picker changes uiLocale on the backend, so a full reload sees the
 * matching messages/*.json immediately.
 */
export function writeUiLocaleCookie(db: UiLocaleDb): void {
  if (typeof document === "undefined") return;
  const value = db.toLowerCase() as UiLocaleCookie;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/** Uppercase DB enum ↔ lowercase cookie value. */
export function dbToCookie(db: UiLocaleDb): UiLocaleCookie {
  return db.toLowerCase() as UiLocaleCookie;
}

export function cookieToDb(cookie: string): UiLocaleDb {
  const upper = cookie.toUpperCase();
  const allowed: UiLocaleDb[] = ["UK", "EN", "PL", "LT", "DE", "RU"];
  return (allowed as string[]).includes(upper)
    ? (upper as UiLocaleDb)
    : "UK";
}
