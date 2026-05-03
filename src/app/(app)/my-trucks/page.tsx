"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck, ChevronRight, Megaphone, BookTemplate, Trash2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { useMyTrucks, type Truck as TruckType } from "@/hooks/use-trucks";
import { TruckDetailPanel, TRUCK_STATUS_COLORS, TRUCK_STATUS_LABELS } from "@/components/truck-detail-panel";
import { useBroadcastToMyTrucks } from "@/hooks/use-trips";
import { useSidebar } from "@/components/ui/sidebar";
import { useUnreadSummary, type UnreadSummaryItem } from "@/hooks/use-unread";
import { cn } from "@/lib/utils";

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
  const lastNote = truck.truckNotes?.[0];
  const hasUnread = (unread?.totalUnread ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 border-b transition-colors hover:bg-muted/50 flex items-center gap-2",
        isSelected && !isMobile && "bg-muted",
        hasUnread && !isSelected && "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60",
      )}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {hasUnread && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />
          )}
          <span className={cn("text-sm flex-1 min-w-0 truncate", hasUnread ? "font-bold" : "font-semibold")}>
            {truck.plate}
          </span>
          {hasUnread && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none shrink-0">
              {unread!.totalUnread}
            </span>
          )}
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0", TRUCK_STATUS_COLORS[truck.status])}>
            {TRUCK_STATUS_LABELS[truck.status]}
          </Badge>
        </div>
        {truck.currentDriver && (
          <span className="text-xs text-muted-foreground truncate">{truck.currentDriver.name}</span>
        )}
        {hasUnread && unread?.latestMessage ? (
          <span className="text-[11px] text-muted-foreground truncate">
            <span className="font-medium">{unread.latestMessage.senderName}:</span>{" "}
            {unread.latestMessage.content}
          </span>
        ) : lastNote ? (
          <span className="text-xs text-muted-foreground/70 truncate italic">{lastNote.content}</span>
        ) : null}
      </div>
      {isMobile && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
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
    await tpl.save(title.trim() || "Template", text.trim());
  }

  function applyTemplate(t: BroadcastTemplate) {
    setTitle(t.title);
    setText(t.content);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Broadcast to all my trucks">
          <Megaphone className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Broadcast to all trucks
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          Sent to all active trips of your trucks.
        </p>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Subject (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder="Message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="resize-none"
            style={{ wordBreak: "break-all", overflowWrap: "break-word" }}
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleSend()}
          />

          <div className="flex items-center gap-2">
            {/* Templates dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <BookTemplate className="h-3.5 w-3.5" />
                  Templates
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {tpl.loading ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : tpl.templates.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No templates yet.</p>
                ) : (
                  tpl.templates.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onSelect={(e) => { e.preventDefault(); applyTemplate(t); }}
                    >
                      <span className="truncate text-sm">{t.title}</span>
                      <button
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => { e.stopPropagation(); tpl.remove(t.id); }}
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
                  + Save current as template
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
              Send to all
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTrucksPage() {
  const router = useRouter();
  const { setOpen, isMobile } = useSidebar();
  const { data: trucks, isLoading } = useMyTrucks();
  const { data: unreadSummary } = useUnreadSummary();
  const unreadByTruck = Object.fromEntries(
    (unreadSummary?.items ?? []).map((i) => [i.truckId, i])
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-select first truck on desktop
  useEffect(() => {
    if (!isMobile && trucks && trucks.length > 0 && !selectedId) {
      setSelectedId(trucks[0].id);
    }
  }, [isMobile, trucks, selectedId]);

  function handleTruckClick(truck: TruckType) {
    if (isMobile) {
      router.push(`/trucks/${truck.id}`);
    } else {
      setSelectedId(truck.id);
    }
  }

  const truckList = (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !trucks || trucks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center px-3 py-10">
          No trucks assigned to you yet.
        </p>
      ) : (
        trucks.map((truck) => (
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
            My Trucks
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
        <div className="px-3 py-3 border-b shrink-0 flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Truck className="h-4 w-4" />
            My Trucks
          </h2>
          <BroadcastDialog />
        </div>
        {truckList}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedId ? (
          <TruckDetailPanel key={selectedId} truckId={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Select a truck to start working
          </div>
        )}
      </div>
    </div>
  );
}
