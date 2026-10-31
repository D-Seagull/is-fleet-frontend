"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Truck, ChevronRight, Megaphone, BookTemplate, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { fullName } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMyTrucks, type Truck as TruckType } from "@/hooks/use-trucks";
import { TruckDetailPanel } from "@/components/truck-detail-panel";
import { useBroadcastToMyTrucks } from "@/hooks/use-trips";
import { useSidebar } from "@/components/ui/sidebar";
import { useUnreadSummary, type UnreadSummaryItem } from "@/hooks/use-unread";
import { cn } from "@/lib/utils";
import { OnlineDot } from "@/components/online-dot";
import { LastSeen } from "@/components/last-seen";
import { LicensePlate } from "@/components/license-plate";
import { StatusBadge } from "@/components/status-badge";
import { IssueChip } from "@/components/issue-chip";

// ─── Driver line ──────────────────────────────────────────────────────────────

/**
 * Driver name in full with their presence mark (green / sleep / vacation) and,
 * when they're out of the app, when they were last in it — on its own line.
 */
function DriverStatusLine({
  driver,
}: {
  driver: NonNullable<TruckType["currentDriver"]>;
}) {
  return (
    <span className="flex flex-col min-w-0">
      <span className="flex items-center gap-1.5 text-[13px] text-text-secondary">
        <span className="break-words">{fullName(driver)}</span>
        <OnlineDot user={driver} />
      </span>
      <LastSeen user={driver} always className="text-xs text-muted-foreground" />
    </span>
  );
}

const sameName = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

// ─── Truck List Item ──────────────────────────────────────────────────────────

function TruckListItem({
  truck,
  isSelected,
  isMobile,
  unread,
  onClick,
}: {
  truck: TruckType;
  isSelected: boolean;
  isMobile: boolean;
  unread?: UnreadSummaryItem;
  onClick: () => void;
}) {
  const tTripStatus = useTranslations("common.tripStatus");
  const lastNote = truck.truckNotes?.[0];
  const hasUnread = (unread?.totalUnread ?? 0) > 0;
  const activeTrip = truck.trips?.[0];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3.5 py-3 rounded-2xl border transition-colors flex items-center gap-2",
        isSelected && !isMobile
          ? "bg-accent border-primary/50 shadow-sm"
          : "bg-muted border-border hover:bg-secondary",
      )}
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <LicensePlate plate={truck.plate} className="min-w-0" />
          <span className="flex-1" />
          {hasUnread && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5 leading-none shrink-0">
              {unread!.totalUnread}
            </span>
          )}
          <StatusBadge status={activeTrip?.status ?? "NONE"}>
            {tTripStatus(activeTrip?.status ?? "NONE")}
          </StatusBadge>
        </div>
        {truck.currentDriver && <DriverStatusLine driver={truck.currentDriver} />}
        {hasUnread && unread?.latestMessage ? (
          <span className="text-xs text-foreground truncate">
            {/* The driver's name is on the line above — repeat it only when
                someone else wrote (another manager). */}
            {!sameName(unread.latestMessage.senderName, fullName(truck.currentDriver)) && (
              <span className="font-medium">{unread.latestMessage.senderName}: </span>
            )}
            {unread.latestMessage.content}
          </span>
        ) : lastNote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IssueChip className="self-start cursor-help">{lastNote.content}</IssueChip>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="max-w-[260px] whitespace-normal break-words"
            >
              {lastNote.content}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {isMobile && <ChevronRight className="h-4 w-4 text-text-subtle shrink-0" />}
    </button>
  );
}

// ─── Broadcast Templates hook ─────────────────────────────────────────────────

interface BroadcastTemplate { id: string; title: string; content: string; }

function useBroadcastTemplates() {
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { api } = await import("@/lib/api");
      const res = await api.get("/announcements/drafts?isTemplate=true");
      setTemplates(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function save(title: string, content: string) {
    const { api } = await import("@/lib/api");
    await api.post("/announcements/drafts", { title, content, isTemplate: true });
    await load();
  }

  async function remove(id: string) {
    const { api } = await import("@/lib/api");
    await api.delete(`/announcements/drafts/${id}`);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return { templates, loading, load, save, remove };
}

// ─── Broadcast Dialog ─────────────────────────────────────────────────────────

function BroadcastDialog() {
  const t = useTranslations("myTrucks.broadcast");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const broadcast = useBroadcastToMyTrucks();
  const tpl = useBroadcastTemplates();

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) tpl.load();
  }

  async function handleSend() {
    if (!text.trim()) return;
    const content = title.trim() ? `${title.trim()}\n\n${text.trim()}` : text.trim();
    await broadcast.mutateAsync(content);
    setTitle("");
    setText("");
    setOpen(false);
  }

  async function handleSaveTemplate() {
    if (!text.trim()) return;
    await tpl.save(title.trim() || t("defaultTemplateName"), text.trim());
  }

  function applyTemplate(tplItem: BroadcastTemplate) {
    setTitle(tplItem.title);
    setText(tplItem.content);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title={t("triggerTitle")}>
          <Megaphone className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            {t("dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          {t("subtitle")}
        </p>

        <div className="flex flex-col gap-3">
          <Input
            placeholder={t("subjectPlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm font-semibold"
          />
          <Textarea
            placeholder={t("messagePlaceholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="resize-none"
            style={{ overflowWrap: "break-word" }}
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleSend()}
          />

          <div className="flex items-center gap-2">
            {/* Templates dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <BookTemplate className="h-3.5 w-3.5" />
                  {t("templates")}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {tpl.loading ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : tpl.templates.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">{t("noTemplates")}</p>
                ) : (
                  tpl.templates.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onSelect={(e) => { e.preventDefault(); applyTemplate(item); }}
                    >
                      <span className="truncate text-sm">{item.title}</span>
                      <button
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => { e.stopPropagation(); tpl.remove(item.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
                {tpl.templates.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="text-xs text-muted-foreground cursor-pointer"
                  onSelect={(e) => { e.preventDefault(); handleSaveTemplate(); }}
                  disabled={!text.trim()}
                >
                  {t("saveTemplate")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={!text.trim() || broadcast.isPending}
            >
              {broadcast.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="mr-2 h-4 w-4" />
              )}
              {t("sendButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTrucksPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense>
      <MyTrucksContent />
    </Suspense>
  );
}

function MyTrucksContent() {
  const t = useTranslations("myTrucks");
  const router = useRouter();
  const { setOpen, isMobile } = useSidebar();
  const { data: trucks, isLoading } = useMyTrucks();
  const { data: unreadSummary } = useUnreadSummary();
  const unreadByTruck = Object.fromEntries(
    (unreadSummary?.items ?? []).map((i) => [i.truckId, i])
  );
  // Trucks whose trip chat has unread messages float to the top, so new
  // activity isn't lost in a long fleet — the rest keep their order.
  const sortedTrucks = [...(trucks ?? [])].sort(
    (a, b) =>
      ((unreadByTruck[a.id]?.totalUnread ?? 0) > 0 ? 0 : 1) -
      ((unreadByTruck[b.id]?.totalUnread ?? 0) > 0 ? 0 : 1)
  );
  // `?truck=<id>&tab=<tab>` opens that truck in the panel: what a Windows
  // notification, the bell or a status toast links to (lib/truck-link), and
  // the way back from the full-screen truck page. Applied whenever the URL
  // changes — also while this page is already open — not just on load.
  const searchParams = useSearchParams();
  const urlTruck = searchParams.get("truck");
  const urlTab = searchParams.get("tab") ?? undefined;
  const urlKey = `${urlTruck ?? ""}|${urlTab ?? ""}`;
  const [selectedId, setSelectedId] = useState<string | null>(urlTruck);
  const [panelTab, setPanelTab] = useState<string | undefined>(urlTab);
  // Bumped per URL-driven open: re-opens the panel on the asked tab even
  // when that truck is already selected.
  const [openCount, setOpenCount] = useState(0);
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);
  if (urlKey !== seenUrlKey) {
    setSeenUrlKey(urlKey);
    if (urlTruck) {
      setSelectedId(urlTruck);
      setPanelTab(urlTab);
      setOpenCount((n) => n + 1);
    }
  }

  // Phones have no split view: show that truck on its own page instead.
  useEffect(() => {
    if (isMobile && urlTruck) {
      router.replace(`/trucks/${urlTruck}?tab=${urlTab ?? "chat"}`);
    }
  }, [isMobile, urlTruck, urlTab, router]);

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-select first truck on desktop — also when `?truck=` names one that
  // isn't (or is no longer) among this manager's trucks.
  useEffect(() => {
    if (isMobile || !trucks || trucks.length === 0) return;
    if (!selectedId || !trucks.some((tr) => tr.id === selectedId)) {
      setSelectedId(trucks[0].id);
    }
  }, [isMobile, trucks, selectedId]);

  function handleTruckClick(truck: TruckType) {
    if (isMobile) {
      router.push(`/trucks/${truck.id}`);
    } else {
      setSelectedId(truck.id);
      setPanelTab(undefined);
      // Keep the URL on the open truck, so the next link to another (or this)
      // truck is a change the page reacts to.
      setSeenUrlKey(`${truck.id}|`);
      router.replace(`/my-trucks?truck=${truck.id}`, { scroll: false });
    }
  }

  const truckList = (
    <div className="flex-1 overflow-y-auto flex flex-col gap-2 px-2 pt-2 pb-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !trucks || trucks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center px-3 py-10">
          {t("empty")}
        </p>
      ) : (
        sortedTrucks.map((truck) => (
          <TruckListItem
            key={truck.id}
            truck={truck}
            isSelected={truck.id === selectedId}
            isMobile={isMobile}
            unread={unreadByTruck[truck.id]}
            onClick={() => handleTruckClick(truck)}
          />
        ))
      )}
    </div>
  );

  // ── Mobile: full-width list, tap → navigate ──
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
          <h1 className="font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t("title")}
          </h1>
          <BroadcastDialog />
        </div>
        {truckList}
      </div>
    );
  }

  // ── Desktop: split-panel ──
  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b shrink-0 flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t("title")}
          </h2>
          <BroadcastDialog />
        </div>
        {truckList}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedId ? (
          <TruckDetailPanel
            key={`${selectedId}:${openCount}`}
            truckId={selectedId}
            defaultTab={panelTab}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            {t("selectPrompt")}
          </div>
        )}
      </div>
    </div>
  );
}
