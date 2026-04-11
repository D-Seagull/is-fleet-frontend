"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Truck,
  Users,
  FolderKanban,
  MessageSquare,
  FileText,
  Settings,
  Headset,
} from "lucide-react";
import { NavItem } from "@/components/app-sidebar";

const appNavItems: NavItem[] = [
  { title: "Trucks", href: "/trucks", icon: Truck },
  { title: "Drivers", href: "/drivers", icon: Users },
  { title: "Dispatchers", href: "/dispatchers", icon: Headset },
  { title: "Groups", href: "/groups", icon: FolderKanban },
  { title: "Chat", href: "/chat", icon: MessageSquare },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <AppSidebar navItems={appNavItems} />
        <SidebarInset className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
            <SidebarTrigger />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
