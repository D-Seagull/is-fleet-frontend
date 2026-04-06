import { create } from "zustand";
import { persist } from "zustand/middleware";

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
        // якщо remember — persist збереже в localStorage
        // якщо ні — зберігаємо тільки в пам'яті (очиститься при закритті)
        if (!remember) {
          sessionStorage.setItem("access_token", token);
          sessionStorage.setItem("user", JSON.stringify(user));
        }
        set({ user, token });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage", // ключ в localStorage
      // зберігаємо тільки якщо є дані
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);
