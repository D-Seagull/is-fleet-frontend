"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (token) {
      fetchMe(token);
    }
  }, []);

  return <>{children}</>;
}
