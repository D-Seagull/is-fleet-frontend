"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { useAuthStore } from "@/store/auth";

// Admins live in (admin)/ — bouncing them out of (app)/ here keeps the
// dispatch/driver UI free of admin-only side effects (sidebar, unread bell,
// truck queries, etc.) and matches the post-login redirect.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user?.role, router]);

  if (user?.role === "ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
