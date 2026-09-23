import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { dbToCookie } from "@/lib/ui-locale";
import ukMessages from "../../messages/uk.json";
import enMessages from "../../messages/en.json";
import plMessages from "../../messages/pl.json";
import ltMessages from "../../messages/lt.json";
import deMessages from "../../messages/de.json";
import ruMessages from "../../messages/ru.json";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Send/receive the backend's httpOnly refresh cookie on /auth/refresh
  // and /auth/logout. The access token stays in memory and travels as a
  // Bearer header (below) — never in a JS-readable cookie or localStorage.
  withCredentials: true,
});

const SAFE_METHODS = new Set(["get", "head", "options"]);
const CHAT_MESSAGES: Record<
  string,
  { chat?: { companyDeactivatedNotice?: string } }
> = {
  uk: ukMessages,
  en: enMessages,
  pl: plMessages,
  lt: ltMessages,
  de: deMessages,
  ru: ruMessages,
};

function companyDeactivatedMessage(): string {
  const locale = dbToCookie(useAuthStore.getState().user?.uiLocale ?? "UK");
  return (
    CHAT_MESSAGES[locale]?.chat?.companyDeactivatedNotice ??
    CHAT_MESSAGES.uk.chat!.companyDeactivatedNotice!
  );
}

// Підставляємо access-токен (у памʼяті) із store в кожен запит
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const method = (config.method ?? "get").toLowerCase();
  const isAuthPath = (config.url ?? "").includes("/auth/");
  const user = useAuthStore.getState().user;
  if (!isAuthPath && !SAFE_METHODS.has(method) && user?.company?.isActive === false) {
    toast.error(companyDeactivatedMessage());
    return Promise.reject(new Error("company-deactivated"));
  }
  return config;
});

// A single shared refresh so N concurrent 401s trigger ONE /auth/refresh
// (rotation is single-use — parallel refreshes would invalidate each other).
let refreshInFlight: Promise<string | null> | null = null;
function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = useAuthStore
      .getState()
      .refresh()
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// A 401 on these is a real failure (bad creds / dead refresh), not an expired
// access token — don't try to refresh-and-retry them.
const AUTH_PATHS = ["/auth/refresh", "/auth/logout", "/auth/login"];

// On 401: silently refresh the access token and replay the request. Only when
// the refresh itself fails do we log out (AuthProvider then redirects to /login).
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url: string = original?.url ?? "";
    const isAuthCall = AUTH_PATHS.some((p) => url.includes(p));

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const newToken = await refreshOnce();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
