"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Bug, Headset, Loader2 } from "lucide-react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  useNewBugCount,
  useBugReportsSocketSync,
} from "@/hooks/use-bug-reports";
import { useOnlineUsersSocketSync } from "@/hooks/use-admin-online";
import { useAuthStore } from "@/store/auth";
import type { NavItem } from "@/components/app-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  // Non-admins land here only by typing the URL — bounce them to their own
  // home so the admin sidebar / companies query never mount.
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace(user.role === "MANAGER" ? "/my-trucks" : "/trucks");
    }
  }, [user, router]);

  // Keep the reports + NEW badge live across every admin page.
  useBugReportsSocketSync();
  // Keep the dashboard's cross-company "online now" list live.
  useOnlineUsersSocketSync();
  const newBugs = useNewBugCount();

  if (user && user.role !== "ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const adminNavItems: NavItem[] = [
    {
      title: t("companies.title"),
      href: "/admin/companies",
      icon: Building2,
    },
    {
      title: t("bugReports.title"),
      href: "/admin/bug-reports",
      icon: Bug,
      badge: newBugs,
    },
    {
      title: t("support.title"),
      href: "/admin/support",
      icon: Headset,
    },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Same frame as the main app: full-height rail headed by the
          wordmark (here it links home to the dashboard). */}
      <AppSidebar
        navItems={adminNavItems}
        groupLabel={t("panelLabel")}
        logoHref="/admin"
      />
      <SidebarInset className="flex h-svh flex-col min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
          <SidebarTrigger className="text-muted-foreground" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
