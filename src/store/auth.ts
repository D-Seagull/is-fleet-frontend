import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

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
  fetchMe: (tokenOverride?: string) => Promise<void>;
  setUser: (user: AuthUser) => void;
  setLoading: (v: boolean) => void;
}

const TOKEN_KEY = "access_token";

function setCookie(token: string, remember: boolean) {
  if (remember) {
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
  } else {
    // Session cookie — видаляється при закритті браузера
    document.cookie = `${TOKEN_KEY}=${token}; path=/`;
  }
}

function clearCookie() {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
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
        localStorage.setItem(TOKEN_KEY, token);
        setCookie(token, remember);
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
        localStorage.removeItem(TOKEN_KEY);
        clearCookie();
        set({ user: null, token: null, isLoading: false });
      },

      fetchMe: async (tokenOverride?: string) => {
        const token = tokenOverride || localStorage.getItem(TOKEN_KEY);

        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const res = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          localStorage.setItem(TOKEN_KEY, token);
          set({ user: res.data, token, isLoading: false });
        } catch {
          // Токен не валідний — чистимо все
          localStorage.removeItem(TOKEN_KEY);
          clearCookie();
          set({ user: null, token: null, isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      // Завжди localStorage — стабільно і передбачувано
      storage: createJSONStorage(() => localStorage),
      // isLoading НЕ зберігаємо — завжди починає з true (потрібна перевірка)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);

// Селектори
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuth = () => useAuthStore((s) => !!s.token);
export const useRole = () => useAuthStore((s) => s.user?.role);
