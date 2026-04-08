import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthUser {
  id: string;
  role: string;
  companyId: string | null;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string, remember: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: (user, token, remember) => {
        // Вибираємо сховище залежно від remember
        if (remember) {
          localStorage.setItem("access_token", token);
        } else {
          sessionStorage.setItem("access_token", token);
        }
        set({ user, token });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("access_token");
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
      // Використовуємо sessionStorage для persist якщо не remember
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && !localStorage.getItem("access_token")
          ? sessionStorage
          : localStorage,
      ),
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
