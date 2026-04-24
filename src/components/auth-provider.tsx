"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";

const PUBLIC_ROUTES = ["/login", "/register"];

function getCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const row = document.cookie
    .split("; ")
    .find((r) => r.startsWith("access_token="));
  return row ? row.split("=")[1] : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchMe, token, isLoading, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Крок 1 — при завантаженні перевіряємо токен
  useEffect(() => {
    const storeToken = useAuthStore.getState().token;
    const cookieToken = getCookieToken();

    if (storeToken) {
      // Є токен у store (rehydrated із localStorage) — валідуємо на сервері
      fetchMe(storeToken);
    } else if (cookieToken) {
      // Є тільки cookie (напр. sessionStorage очистився) — відновлюємо
      fetchMe(cookieToken);
    } else {
      // Немає нічого — прибираємо спінер
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Крок 2 — після перевірки: якщо не авторизований на захищеній сторінці — редірект
  useEffect(() => {
    if (!isLoading && !token && !isPublic) {
      router.replace("/login");
    }
  }, [isLoading, token, isPublic, router]);

  // Показуємо спінер тільки на захищених сторінках поки перевіряємо
  if (isLoading && !isPublic) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
