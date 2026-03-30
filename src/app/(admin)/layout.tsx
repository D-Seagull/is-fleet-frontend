"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2 } from "lucide-react";
import { useCompanies } from "@/hooks/use-companies";
import type { NavItem } from "@/components/app-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: companies = [] } = useCompanies();

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
