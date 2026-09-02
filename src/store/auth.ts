import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api";
import { disconnectSocket, reconnectSocket } from "@/lib/socket";

interface AuthUser {
  id: string;
  role: string;
  companyId: string | null;
  firstName: string;
  lastName: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  language?: "UK" | "EN" | "PL" | "LT" | "UZ" | "KZ" | "HI" | "RU";
  /** UI locale — drives which messages/*.json the app renders. */
  uiLocale?: "UK" | "EN" | "PL" | "LT" | "DE" | "RU";
  status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
  statusUntil?: string | null;
  timezone?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (user: AuthUser, token: string, remember: boolean) => void;
  logout: () => void;
  /** Silently restore the access token from the httpOnly refresh cookie. */
  refresh: () => Promise<string | null>;
  fetchMe: (tokenOverride?: string) => Promise<void>;
  setUser: (user: AuthUser) => void;
  setLoading: (v: boolean) => void;
}

// Non-sensitive gate marker for the Next.js middleware (proxy.ts). The real
// auth is the in-memory access token (validated by the backend on every
// request) + the httpOnly refresh cookie on the backend domain. This first-
// party cookie only tells the edge "there is a session" so it can redirect
// unauthenticated users to /login. It is NOT a credential.
const AUTHED_COOKIE = "fleet_authed";
// Non-sensitive "remember me" preference. Persisted so silent refreshes can
// keep the refresh cookie session-only (unchecked) vs 30-day (checked).
const REMEMBER_KEY = "fleet_remember";

function setAuthedCookie(remember: boolean) {
  const maxAge = remember ? `; max-age=${30 * 24 * 60 * 60}` : "";
  document.cookie = `${AUTHED_COOKIE}=1; path=/; samesite=lax${maxAge}`;
}

function clearAuthedCookie() {
  document.cookie = `${AUTHED_COOKIE}=; path=/; max-age=0`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true, // true поки не перевірено токен

      setLoading: (v) => set({ isLoading: v }),

      setUser: (user) => set({ user }),

      login: (user, token, remember) => {
        // Drop any pre-existing socket so the next getSocket() picks up
        // the fresh token and re-runs the backend's handleConnection
        // (presence broadcast included). Without this, a stale socket
        // from a previous session — or one created with no auth before
        // login — keeps the backend thinking we're nobody.
        disconnectSocket();
        // Access token stays in memory only (no localStorage, no JS cookie).
        // The backend already set the httpOnly refresh cookie on the login
        // response (axios withCredentials).
        localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
        setAuthedCookie(remember);
        set({ user, token, isLoading: false });
        // The /auth/login response only carries the bare-minimum
        // fields used by the token (id, role, firstName, lastName).
        // Pull the full /auth/me row asynchronously so the sidebar
        // avatar, language, presence status, etc. populate without
        // waiting for a page reload.
        void get().fetchMe(token);
      },

      logout: () => {
        // Tear the socket down BEFORE we clear the token. Otherwise the
        // backend never fires `handleDisconnect` for this session, so
        // teammates keep seeing the leaving user's stored status instead
        // of OFFLINE until the socket times out on its own.
        disconnectSocket();
        // Best-effort server-side revoke + clear of the httpOnly refresh cookie.
        void api.post("/auth/logout").catch(() => {});
        localStorage.removeItem(REMEMBER_KEY);
        clearAuthedCookie();
        set({ user: null, token: null, isLoading: false });
      },

      refresh: async () => {
        // Preserve the "remember me" choice across silent refreshes so an
        // unchecked session stays session-only. Default true when unknown, to
        // avoid accidentally downgrading a remembered session.
        const remember = localStorage.getItem(REMEMBER_KEY) !== "0";
        try {
          // withCredentials sends the httpOnly refresh cookie; the backend
          // rotates it (honouring `remember`) and returns a fresh access token.
          const res = await api.post("/auth/refresh", { remember });
          const { access_token, user } = res.data;
          setAuthedCookie(remember);
          // /auth/refresh (signToken) returns a BARE user — no avatar / status /
          // email. Merge it over the persisted row so the sidebar avatar doesn't
          // blank out, then hydrate the authoritative full profile from
          // /auth/me (same as login does). Without this, on a cold start the
          // avatar only appeared after the next status change refetched it.
          set({
            user: { ...(get().user ?? {}), ...user },
            token: access_token,
            isLoading: false,
          });
          // A socket created before this token was ready (cold start, or a
          // silent refresh after the access token expired) connected without a
          // valid JWT, so the backend never joined its user room and rejects
          // its emits. Re-handshake now that the token is set — same socket
          // instance, so all listeners stay attached.
          reconnectSocket();
          void get().fetchMe(access_token);
          return access_token as string;
        } catch {
          clearAuthedCookie();
          set({ user: null, token: null, isLoading: false });
          return null;
        }
      },

      fetchMe: async (tokenOverride?: string) => {
        const token = tokenOverride || get().token;

        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const res = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ user: res.data, token, isLoading: false });
        } catch {
          // If the access token was expired, the api interceptor already
          // tried to refresh + retry; landing here means the session is gone.
          set({ user: null, token: null, isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      // Завжди localStorage — стабільно і передбачувано
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // v0 (pre access+refresh migration) persisted the access token in
      // localStorage. Strip it on upgrade so a stale token from an old session
      // isn't loaded into the now in-memory-only store.
      migrate: (persisted) => {
        if (persisted && typeof persisted === "object") {
          delete (persisted as { token?: string }).token;
        }
        return persisted as { user: AuthUser | null };
      },
      // Persist ONLY the (non-sensitive) user for a flash-free reload. The
      // access token is intentionally never persisted — it lives in memory and
      // is restored from the httpOnly refresh cookie on load.
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);

// Селектори
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuth = () => useAuthStore((s) => !!s.token);
export const useRole = () => useAuthStore((s) => s.user?.role);
