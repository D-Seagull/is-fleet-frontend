"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, Truck, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { fullName, initials } from "@/lib/format";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronUp, LogOut, Moon, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDot } from "@/components/status-dot";
import { useUpdateMe } from "@/hooks/use-avatar";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export interface NavChild {
  title: string;
  href: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
  /** Unread counter badge shown on the right of the menu item. */
  badge?: number;
}

interface AppSidebarProps {
  navItems: NavItem[];
  groupLabel?: string;
}

function CollapsibleNavItem({
  item,
  pathname,
  onNavClick,
}: {
  item: NavItem;
  pathname: string;
  onNavClick: () => void;
}) {
  const t = useTranslations("sidebar");
  const [search, setSearch] = useState("");

  const filtered = item.children?.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Collapsible defaultOpen={true} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={pathname.startsWith(item.href)}
            tooltip={item.title}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Пошук */}
          <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 pl-6 text-xs"
              />
            </div>
          </div>

          {/* Список */}
          <SidebarMenuSub>
            {filtered?.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                {t("nothingFound")}
              </p>
            )}
            {filtered?.map((child) => (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === child.href}
                >
                  <Link href={child.href} onClick={onNavClick}>
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({
  navItems,
  groupLabel,
}: AppSidebarProps) {
  const t = useTranslations("sidebar");
  const tRoles = useTranslations("common.roles");
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Truck className="h-7 w-7 shrink-0 text-accent" />
          <span className="text-lg font-bold whitespace-nowrap transition-all duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
            IS Fleet
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {groupLabel ?? t("navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) =>
                item.children && item.children.length > 0 ? (
                  <CollapsibleNavItem
                    key={item.title}
                    item={item}
                    pathname={pathname}
                    onNavClick={handleNavClick}
                  />
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href} onClick={handleNavClick}>
                        <span className="relative">
                          <item.icon className="h-4 w-4" />
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                          )}
                        </span>
                        <span>{item.title}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none shrink-0">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {/* SidebarMenuButton clips overflow, so the status dot
                      can't overhang the avatar — anchor it just inside the
                      bottom-right corner instead of using negative offsets. */}
                  <span className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar ?? undefined} alt={fullName(user)} />
                      <AvatarFallback className="bg-primary text-primary-foreground">{initials(user)}</AvatarFallback>
                    </Avatar>
                    <StatusDot
                      user={user}
                      isOnline
                      size="xs"
                      className="absolute bottom-0 right-0"
                    />
                  </span>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{fullName(user)}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.role ? tRoles(user.role) : ""}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <StatusSubmenu />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false);
                    } else {
                      setOpen(false);
                    }
                    router.push("/account");
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {t("accountSettings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false);
                    } else {
                      setOpen(false);
                    }

                    logout();
                    router.push("/login");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Duration presets per status. Sleep is hour-based (typical EU
// rest-break convention); vacation is day-based since people usually
// take more than one day off.
const SLEEP_PRESETS: { key: string; hours: number }[] = [
  { key: "sleep1h", hours: 1 },
  { key: "sleep4h", hours: 4 },
  { key: "sleep8h", hours: 8 },
  { key: "sleep12h", hours: 12 },
];

const VACATION_PRESETS: { key: string; hours: number }[] = [
  { key: "vac1d", hours: 24 },
  { key: "vac3d", hours: 72 },
  { key: "vac1w", hours: 168 },
  { key: "vac2w", hours: 336 },
];

function StatusSubmenu() {
  const t = useTranslations("sidebar");
  const tStatus = useTranslations("common.status");
  const user = useAuthStore((s) => s.user);
  const updateMe = useUpdateMe();
  const currentStatus = user?.status ?? "ONLINE";

  const setStatus = (
    status: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION",
    hours?: number,
  ) => {
    const statusUntil =
      status !== "ONLINE" && hours
        ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
        : null;
    updateMe.mutate({ status, statusUntil });
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
          <StatusDot user={user} isOnline size="sm" />
        </span>
        {t("statusLabel")}
        <span className="ml-auto text-xs text-muted-foreground">
          {tStatus(currentStatus)}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        <DropdownMenuItem onClick={() => setStatus("ONLINE")}>
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          {tStatus("ONLINE")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("BUSY")}>
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          {tStatus("BUSY")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("AWAY")}>
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
          {tStatus("AWAY")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500">
                <Moon className="h-2.5 w-2.5 text-white" />
              </span>
            </span>
            {tStatus("SLEEP")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("statusDuration")}
            </DropdownMenuLabel>
            {SLEEP_PRESETS.map((p) => (
              <DropdownMenuItem
                key={p.key}
                onClick={() => setStatus("SLEEP", p.hours)}
              >
                {t(`sleepPresets.${p.key}`)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setStatus("SLEEP")}>
              {t("durationUnlimited")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center">
              {/* Emoji 🌴 (brown trunk + green leaves) — matches the driver
                  app's rendering and keeps full color detail at small
                  sizes where a flat SVG icon turns into a blob. */}
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] leading-none">
                🌴
              </span>
            </span>
            {tStatus("VACATION")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("statusDuration")}
            </DropdownMenuLabel>
            {VACATION_PRESETS.map((p) => (
              <DropdownMenuItem
                key={p.key}
                onClick={() => setStatus("VACATION", p.hours)}
              >
                {t(`vacationPresets.${p.key}`)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setStatus("VACATION")}>
              {t("durationUnlimited")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
