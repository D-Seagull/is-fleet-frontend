import { isAxiosError } from "axios";
import { useAuthStore } from "@/store/auth";
import { dbToCookie } from "@/lib/ui-locale";
import ukMessages from "../../messages/uk.json";
import enMessages from "../../messages/en.json";
import plMessages from "../../messages/pl.json";
import ltMessages from "../../messages/lt.json";
import deMessages from "../../messages/de.json";
import ruMessages from "../../messages/ru.json";

/**
 * True when a request never reached the server: offline, the laptop just
 * woke, a backend deploy — the browser got no response at all. Nothing in
 * our code went wrong, so these aren't bugs to report, only something to
 * tell the user. A server that DID answer (4xx / 5xx) is not this.
 */
export function isNetworkError(err: unknown): boolean {
  return isAxiosError(err) && !err.response && err.code !== "ERR_CANCELED";
}

const MESSAGES: Record<string, { common?: { networkError?: string } }> = {
  uk: ukMessages,
  en: enMessages,
  pl: plMessages,
  lt: ltMessages,
  de: deMessages,
  ru: ruMessages,
};

/** "No connection to the server — try again", in the user's UI language. */
export function networkErrorMessage(): string {
  const locale = dbToCookie(useAuthStore.getState().user?.uiLocale ?? "UK");
  return (
    MESSAGES[locale]?.common?.networkError ??
    MESSAGES.uk.common!.networkError!
  );
}
