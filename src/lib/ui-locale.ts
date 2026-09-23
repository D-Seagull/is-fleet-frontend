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
 * Set once the person picks a language by hand. From then on a login must not
 * overwrite their choice with whatever the account carries — the same rule the
 * phone apps follow, where an explicit pick outranks the server value.
 */
const EXPLICIT_COOKIE = "locale_explicit";

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

/** Remember that this language came from the picker, not from an account. */
export function markUiLocaleExplicit(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${EXPLICIT_COOKIE}=1; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export function hasExplicitUiLocale(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${EXPLICIT_COOKIE}=`));
}

/**
 * Apply the language an account carries — but never on top of a manual pick.
 * Two people sharing a browser (a manager and a teamlead, say) would otherwise
 * hand each other their language on every login.
 */
export function syncUiLocaleFromAccount(db: UiLocaleDb | undefined): void {
  if (!db || hasExplicitUiLocale()) return;
  writeUiLocaleCookie(db);
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
