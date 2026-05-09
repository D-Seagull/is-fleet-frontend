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
  Route,
  Bell,
} from "lucide-react";
import { NavItem } from "@/components/app-sidebar";
import { useAuthStore } from "@/store/auth";
import { useMyTrucks } from "@/hooks/use-trucks";
import { useUnreadSummary, useUnreadSocketSync } from "@/hooks/use-unread";
import { useTruckChangedSync } from "@/hooks/use-trucks";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const BASE_NAV: NavItem[] = [
  { title: "Trucks", href: "/trucks", icon: Truck },
  { title: "Trips", href: "/trips", icon: Route },
  { title: "Drivers", href: "/drivers", icon: Users },
  { title: "Dispatchers", href: "/dispatchers", icon: Headset },
  { title: "Groups", href: "/groups", icon: FolderKanban },
  { title: "Chat", href: "/chat", icon: MessageSquare },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Settings", href: "/settings", icon: Settings },
];

function UnreadBell() {
  const router = useRouter();
  const { data } = useUnreadSummary();
  useUnreadSocketSync();
  useTruckChangedSync();

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Unread messages">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2.5 border-b">
          <p className="text-sm font-semibold">
            {total > 0 ? `${total} unread message${total === 1 ? "" : "s"}` : "All caught up"}
          </p>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No unread messages</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y">
            {items.map((item) => (
              <li key={item.truckId}>
                <button
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
                  onClick={() => {
                    const tab = item.activeTripUnread > 0 ? "chat" : "trips";
                    router.push(`/trucks/${item.truckId}?tab=${tab}`);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{item.plate}</span>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded-full",
                      item.activeTripUnread > 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {item.totalUnread}
                    </span>
                  </div>
                  {item.latestMessage && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      <span className="font-medium text-foreground/70">
                        {item.latestMessage.senderName}:
                      </span>{" "}
                      {item.latestMessage.content}
                    </p>
                  )}
                  {item.latestMessage && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(item.latestMessage.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isDispatcher = user?.role === "DISPATCHER";
  const isTeamlead = user?.role === "TEAMLEAD";
  const isManager = isDispatcher || isTeamlead || user?.role === "ADMIN";

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
            <div className="flex items-center gap-2">
              {isManager && <UnreadBell />}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
