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
import { ChevronUp, LogOut, Settings } from "lucide-react";
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
import { STATUS_LABEL } from "@/lib/status";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

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
                placeholder="Пошук..."
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
                Нічого не знайдено
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
  groupLabel = "Navigation",
}: AppSidebarProps) {
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
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
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
                        <item.icon className="h-4 w-4" />
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
                  <span className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar ?? undefined} alt={fullName(user)} />
                      <AvatarFallback className="bg-primary text-primary-foreground">{initials(user)}</AvatarFallback>
                    </Avatar>
                    <StatusDot
                      user={user}
                      isOnline
                      size="sm"
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  </span>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{fullName(user)}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.role}
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
                  Account Settings
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
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Sleep duration presets for managers. The "indefinite" pick is added
// inline below — it always lands at the bottom of the list. Hours are
// translated to ISO timestamps when the user picks them.
const SLEEP_PRESETS: { label: string; hours: number }[] = [
  { label: "1 година", hours: 1 },
  { label: "4 години", hours: 4 },
  { label: "8 годин", hours: 8 },
  { label: "До завтра (12 год)", hours: 12 },
];

function StatusSubmenu() {
  const user = useAuthStore((s) => s.user);
  const updateMe = useUpdateMe();
  const currentStatus = user?.status ?? "ONLINE";

  const setStatus = (
    status: "ONLINE" | "BUSY" | "SLEEP",
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
        Статус
        <span className="ml-auto text-xs text-muted-foreground">
          {STATUS_LABEL[currentStatus]}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        <DropdownMenuItem onClick={() => setStatus("ONLINE")}>
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Online
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("BUSY")}>
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
          Не турбувати
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            </span>
            Сплю
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              На скільки?
            </DropdownMenuLabel>
            {SLEEP_PRESETS.map((p) => (
              <DropdownMenuItem
                key={p.label}
                onClick={() => setStatus("SLEEP", p.hours)}
              >
                {p.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setStatus("SLEEP")}>
              Без обмеження
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
