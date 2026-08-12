"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchMe, token, isLoading, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Крок 1 — при завантаженні відновлюємо сесію
  useEffect(() => {
    const storeToken = useAuthStore.getState().token;
    if (storeToken) {
      // Свіжий in-memory токен (щойно залогінились / клієнтська навігація) —
      // валідуємо на сервері.
      fetchMe(storeToken);
    } else if (!isPublic) {
      // Холодний старт / перезавантаження захищеної сторінки: access-токен у
      // памʼяті зник — тихо відновлюємо його з httpOnly refresh-кукі.
      void useAuthStore.getState().refresh();
    } else {
      // Публічна сторінка без сесії — прибираємо спінер.
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
