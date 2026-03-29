"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2 } from "lucide-react";
import { NavItem } from "@/components/app-sidebar";

const adminNavItems: NavItem[] = [
  { title: "Companies", href: "/admin", icon: Building2 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
