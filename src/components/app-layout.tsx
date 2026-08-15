"use client";

import { useTranslations } from "next-intl";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandLogo } from "@/components/brand-logo";
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
// `navKey` is a stable i18n key (translated at render); href is the stable
// identity used for role-filtering and badge injection.
type NavDef = {
  navKey:
    | "trucks"
    | "trips"
    | "drivers"
    | "managers"
    | "chat"
    | "settings"
    | "myTrucks";
  href: string;
  icon: NavItem["icon"];
};
const BASE_NAV: NavDef[] = [
  { navKey: "trucks", href: "/trucks", icon: Truck },
  { navKey: "trips", href: "/trips", icon: Route },
  { navKey: "drivers", href: "/drivers", icon: Users },
  { navKey: "managers", href: "/managers", icon: Headset },
  { navKey: "chat", href: "/chat", icon: MessageSquare },
  { navKey: "settings", href: "/settings", icon: Settings },
];

// Routes that only TEAMLEAD should see in the sidebar. Routes stay live
// for everyone (the backend already gates writes) — this is purely a
// navigation-affordance filter.
const TEAMLEAD_ONLY = new Set(["/managers", "/settings"]);

function UnreadBell() {
  const router = useRouter();
  const t = useTranslations("notifications");
  const tRoles = useTranslations("common.roles");
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
        <button
          className="relative p-1.5 rounded-md hover:bg-accent transition-colors"
          aria-label={t("unreadMessages")}
        >
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
            {total > 0 ? t("unreadCount", { count: total }) : t("allCaughtUp")}
          </p>
        </div>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("noUnread")}
          </p>
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
                    <span
                      className={cn(
                        "text-xs font-bold px-1.5 py-0.5 rounded-full",
                        item.activeTripUnread > 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
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
                      {formatDistanceToNow(
                        new Date(item.latestMessage.createdAt),
                        { addSuffix: true },
                      )}
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
                      {fullName(conv.user) || tRoles(conv.user.role)}
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

// Logo doubles as a sidebar toggle. Lives in its own component so it can read
// the sidebar context (useSidebar must be called under SidebarProvider).
function HeaderLogo() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Toggle Sidebar"
      className="flex items-center rounded-md transition-opacity hover:opacity-80"
    >
      <BrandLogo className="h-13" />
    </button>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const tNav = useTranslations("nav");
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

  const baseNav: NavDef[] = showMyTrucks
    ? [
        { navKey: "myTrucks", href: "/my-trucks", icon: BookMarked } as NavDef,
        ...BASE_NAV,
      ]
    : BASE_NAV;
  const navItems: NavItem[] = baseNav
    .filter((item) => isTeamlead || !TEAMLEAD_ONLY.has(item.href))
    .map((item) => ({
      title: tNav(item.navKey),
      href: item.href,
      icon: item.icon,
      ...(item.href === "/chat" ? { badge: chatBadge } : {}),
    }));

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full flex-col">
        {/* Full-width top header. The logo lives here (not in the sidebar) so
            it stays put and never collapses with the sidebar. `relative z-30`
            makes it paint above the fixed sidebar, so it reads as one
            continuous bar with no vertical divider. */}
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <HeaderLogo />
            <SidebarTrigger />
          </div>
          <div className="flex items-center gap-2">
            {isManager && <UnreadBell />}
            {/* TEMP: quick locale switch for i18n testing — remove once
                translation pass is done (the real one lives on /account). */}
            <UiLocalePicker variant="compact" />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 min-h-0">
          <AppSidebar navItems={navItems} />
          <SidebarInset className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
      {/* Fires when one of the user's alarms is due (cron → socket). */}
      <AlarmNoticeOverlay />
    </SidebarProvider>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
