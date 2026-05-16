"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCompanies } from "@/hooks/use-companies";
import { useAuthStore } from "@/store/auth";
import type { NavItem } from "@/components/app-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (user && user.role !== "ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const adminNavItems: NavItem[] = [
    {
      title: "Companies",
      href: "/admin/companies",
      icon: Building2,
      children: companies.map((c) => ({
        title: c.name,
        href: `/admin/companies/${c.id}`,
      })),
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar navItems={adminNavItems} groupLabel="Admin Panel" />
        <SidebarInset className="flex flex-1 flex-col min-w-0">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
            <SidebarTrigger />
            <ThemeToggle />
          </header>
          <main className="flex items-center justify-center flex-1 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
