"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UiLocalePicker } from "@/components/ui-locale-picker";
import { fullName } from "@/lib/format";
import {
  Truck,
  BookMarked,
  Users,
  MessageSquare,
  Settings,
  Headset,
  Route,
  Bell,
} from "lucide-react";
import { NavItem } from "@/components/app-sidebar";
import { useAuthStore } from "@/store/auth";
import { useMyTrucks } from "@/hooks/use-trucks";
import { useUnreadSummary, useUnreadSocketSync } from "@/hooks/use-unread";
import {
  useDmUnreadSummary,
  useDmUnreadSocketSync,
} from "@/hooks/use-dm-unread";
import {
  useGroupUnreadSummary,
  useGroupUnreadSocketSync,
} from "@/hooks/use-group-unread";
import { useTruckChangedSync } from "@/hooks/use-trucks";
import { useTabVisibilityPresence } from "@/hooks/use-tab-visibility-presence";
import { useBrowserTimezoneSync } from "@/hooks/use-timezone-sync";
import { useUserStatusSync } from "@/hooks/use-user-status-sync";
import { usePresenceSync } from "@/hooks/use-presence";
import { useAutoAway } from "@/hooks/use-auto-away";
import { useChatSoundSync } from "@/hooks/use-chat-sound";
import { AlarmNoticeOverlay } from "@/components/alarm-notice-overlay";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Base nav — items visible to every signed-in role. Managers + Settings
// land here too but get filtered out below for non-TEAMLEAD users so the
// teamlead doesn't share a deduplicated list with every viewer.
const BASE_NAV: NavItem[] = [
  { title: "Trucks", href: "/trucks", icon: Truck },
  { title: "Trips", href: "/trips", icon: Route },
  { title: "Drivers", href: "/drivers", icon: Users },
  { title: "Managers", href: "/managers", icon: Headset },
  { title: "Chat", href: "/chat", icon: MessageSquare },
  { title: "Settings", href: "/settings", icon: Settings },
];

// Items that only TEAMLEAD should see in the sidebar. Routes stay live
// for everyone (the backend already gates writes) — this is purely a
// navigation-affordance filter.
const TEAMLEAD_ONLY = new Set(["Managers", "Settings"]);

function UnreadBell() {
  const router = useRouter();
  const { data } = useUnreadSummary();
  useUnreadSocketSync();
  useTruckChangedSync();
  const { data: dmData } = useDmUnreadSummary();

  const { data: groupData } = useGroupUnreadSummary();

  const tripTotal = data?.total ?? 0;
  const items = data?.items ?? [];
  const dmTotal = dmData?.total ?? 0;
  const dmItems = dmData?.items ?? [];
  const groupTotal = groupData?.total ?? 0;
  const groupItems = groupData?.items ?? [];
  const total = tripTotal + dmTotal + groupTotal;

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
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No unread messages</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y">
            {items.map((item) => (
              <li key={`trip-${item.truckId}`}>
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
            {dmItems.map((conv) => (
              <li key={`dm-${conv.user.id}`}>
                <button
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
                  onClick={() => router.push(`/chat?userId=${conv.user.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {fullName(conv.user) || conv.user.role}
                    </span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      {conv.unreadCount}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {conv.lastMessage.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </button>
              </li>
            ))}
            {groupItems.map((g) => (
              <li key={`group-${g.groupId}`}>
                <button
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
                  onClick={() => router.push(`/chat?groupId=${g.groupId}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      # {g.name}
                    </span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      {g.unreadCount}
                    </span>
                  </div>
                  {g.latestMessage && (
                    <>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        <span className="font-medium text-foreground/70">
                          {g.latestMessage.senderName}:
                        </span>{" "}
                        {g.latestMessage.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(
                          new Date(g.latestMessage.createdAt),
                          { addSuffix: true },
                        )}
                      </p>
                    </>
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
  const isManagerRole = user?.role === "MANAGER";
  const isTeamlead = user?.role === "TEAMLEAD";
  const isManager = isManagerRole || isTeamlead || user?.role === "ADMIN";

  // Foreground/background tracking — backend uses this to decide whether
  // chat-message push should fall through when the user isn't actually
  // looking at the tab.
  useTabVisibilityPresence();
  // Push the browser's IANA timezone so backend can interpret alarm
  // wall-clock times on the target user's clock.
  useBrowserTimezoneSync();
  // Global DM/group unread socket sync — always live, regardless of which
  // page the user is on. Trip socket sync stays inside UnreadBell because
  // it already works there.
  useDmUnreadSocketSync();
  useGroupUnreadSocketSync();
  // Audible ping on incoming DM / group message / freshly-created group.
  useChatSoundSync();
  // Live presence dots — patches every cached user payload when a
  // teammate flips Online/Busy/Sleep, so other sessions stop needing
  // a full reload to see the change.
  useUserStatusSync();
  // Maintains the Set of currently-online teammate IDs so StatusDot
  // can render OFFLINE when someone logs out / closes the app.
  usePresenceSync();
  // Auto-AWAY after 15 min of input silence (managers/teamleads/admins
  // only — bails inside the hook for drivers).
  useAutoAway();

  const { data: myTrucks } = useMyTrucks();
  const hasMyTrucks = (myTrucks?.length ?? 0) > 0;
  const { data: dmData } = useDmUnreadSummary();
  const { data: groupData } = useGroupUnreadSummary();
  const dmTotal = dmData?.total ?? 0;
  const groupTotal = groupData?.total ?? 0;
  const chatBadge = dmTotal + groupTotal;

  const showMyTrucks = isManagerRole || (isTeamlead && hasMyTrucks);

  const baseNav: NavItem[] = showMyTrucks
    ? [{ title: "My Trucks", href: "/my-trucks", icon: BookMarked }, ...BASE_NAV]
    : BASE_NAV;
  const navItems: NavItem[] = baseNav
    .filter((item) => isTeamlead || !TEAMLEAD_ONLY.has(item.title))
    .map((item) =>
      item.title === "Chat" ? { ...item, badge: chatBadge } : item,
    );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <AppSidebar navItems={navItems} />
        <SidebarInset className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              {isManager && <UnreadBell />}
              {/* TEMP: quick locale switch for i18n testing — remove once
                  translation pass is done (the real one lives on /account). */}
              <UiLocalePicker variant="compact" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
        </SidebarInset>
      </div>
      {/* Fires when one of the user's alarms is due (cron → socket). */}
      <AlarmNoticeOverlay />
    </SidebarProvider>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
