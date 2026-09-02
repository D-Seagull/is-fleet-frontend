"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Bug, Loader2 } from "lucide-react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarLogoButton } from "@/components/sidebar-logo-button";
import { useCompanies } from "@/hooks/use-companies";
import {
  useNewBugCount,
  useBugReportsSocketSync,
} from "@/hooks/use-bug-reports";
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

  const { data: companies = [] } = useCompanies();

  // Keep the reports + NEW badge live across every admin page.
  useBugReportsSocketSync();
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
      children: companies.map((c) => ({
        title: c.name,
        href: `/admin/companies/${c.id}`,
      })),
    },
    {
      title: t("bugReports.title"),
      href: "/admin/bug-reports",
      icon: Bug,
      badge: newBugs,
    },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full flex-col">
        {/* Full-width top header — the logo sits here (not in the sidebar) so
            it never collapses with it, and `relative z-30` paints it over the
            sidebar so the bar reads as one continuous piece. Mirrors the main
            app layout so admin feels like the same product. */}
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarLogoButton />
            <SidebarTrigger />
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 min-h-0">
          <AppSidebar navItems={adminNavItems} groupLabel={t("panelLabel")} />
          <SidebarInset className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
