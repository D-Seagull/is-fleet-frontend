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
  BookMarked,
  Users,
  FolderKanban,
  MessageSquare,
  FileText,
  Settings,
  Headset,
} from "lucide-react";
import { NavItem } from "@/components/app-sidebar";
import { useAuthStore } from "@/store/auth";
import { useMyTrucks } from "@/hooks/use-trucks";

const BASE_NAV: NavItem[] = [
  { title: "Trucks", href: "/trucks", icon: Truck },
  { title: "Drivers", href: "/drivers", icon: Users },
  { title: "Dispatchers", href: "/dispatchers", icon: Headset },
  { title: "Groups", href: "/groups", icon: FolderKanban },
  { title: "Chat", href: "/chat", icon: MessageSquare },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Settings", href: "/settings", icon: Settings },
];

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isDispatcher = user?.role === "DISPATCHER";
  const isTeamlead = user?.role === "TEAMLEAD";

  const { data: myTrucks } = useMyTrucks();
  const hasMyTrucks = (myTrucks?.length ?? 0) > 0;

  const showMyTrucks = isDispatcher || (isTeamlead && hasMyTrucks);

  const navItems: NavItem[] = showMyTrucks
    ? [{ title: "My Trucks", href: "/my-trucks", icon: BookMarked }, ...BASE_NAV]
    : BASE_NAV;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <AppSidebar navItems={navItems} />
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
