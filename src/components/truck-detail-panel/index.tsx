"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/status-dot";
import { AlarmTab } from "@/components/alarm-tab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useTruck,
  useUpdateTruck,
  useTruckNotes,
  useCreateTruckNote,
  useDeleteTruckNote,
  useDrivers,
  type TruckStatus,
} from "@/hooks/use-trucks";
import { useAssignableManagers } from "@/hooks/use-managers";
import { useTripsByTruck, useReassignTrip } from "@/hooks/use-trips";
import { useAuthStore } from "@/store/auth";
import { useUnreadSummary } from "@/hooks/use-unread";

// Folder split parts. Actual code lives in each sibling; index.tsx is the
// shell that renders the truck header + tabs and re-exports the public
// surface so `import { X } from "@/components/truck-detail-panel"` sites
// don't break.
import { TRUCK_STATUS_COLORS, TRUCK_STATUS_LABELS } from "./constants";
import { shortenTripTitle } from "./utils";
import { NewTripDialog } from "./new-trip-dialog";
import { DocumentsTab } from "./documents-tab";
import { ChatTab } from "./chat-tab";
import { TripsTab } from "./trips-tab";
export { NewTripDialog, ChatTab };
export { TRUCK_STATUS_COLORS, TRUCK_STATUS_LABELS, shortenTripTitle };
export { ACTIVE_STATUSES } from "./constants";

interface TruckDetailPanelProps {
  truckId: string;
  defaultTab?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export function TruckDetailPanel({
  truckId,
  defaultTab,
  showBackButton = false,
  backHref = "/trucks",
}: TruckDetailPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [chatTripId, setChatTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [navOpen, setNavOpen] = useState(false);

  const { data: truck, isLoading } = useTruck(truckId);
  const { data: notes, isLoading: notesLoading } = useTruckNotes(truckId);
  const { data: drivers } = useDrivers();
  const { data: assignableManagers } = useAssignableManagers();
  const { data: unreadSummary } = useUnreadSummary();
  const truckUnread = unreadSummary?.items.find((i) => i.truckId === truckId);
  const { data: truckTrips = [] } = useTripsByTruck(truckId);
  const updateTruck = useUpdateTruck();
  const reassignTrip = useReassignTrip(truckId);
  const createNote = useCreateTruckNote();
  const deleteNote = useDeleteTruckNote();

  // Підтвердження переводу водія з іншого трака
  const [pendingDriver, setPendingDriver] = useState<{
    driverId: string;
    driverName: string;
    fromTruck: { id: string; plate: string };
  } | null>(null);

  const ACTIVE_STATUSES = ["ASSIGNED", "ACCEPTED", "ON_WAY", "ON_SITE", "LOADED"];
  const activeTrip = truckTrips.find((t) => ACTIVE_STATUSES.includes(t.status)) ?? null;

  const [noteText, setNoteText] = useState("");

  // Resolve chat access once truck data is available
  useEffect(() => {
    if (!truck || !user) return;
    const isCurrentMgr = truck.managerId === user.id;
    const canAccessChat = user.role === "ADMIN" || isCurrentMgr;

    // URL says chat але user не має доступу → fallback на trips
    if (defaultTab === "chat" && !canAccessChat) {
      setActiveTab("trips");
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    } else {
      setActiveTab(canAccessChat ? "chat" : "trips");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truck?.id, user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!truck) {
    notFound();
  }

  const isCurrentManager = truck.managerId === user?.id;
  const isChatEnabled = user?.role === "ADMIN" || isCurrentManager;

  function handleOpenTrip(tripId: string) {
    setChatTripId(tripId);
    setActiveTab("chat");
  }

  async function handleStatusChange(status: TruckStatus) {
    await updateTruck.mutateAsync({ id: truckId, data: { status } });
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await createNote.mutateAsync({ truckId, content: noteText.trim() });
    setNoteText("");
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    await deleteNote.mutateAsync({ noteId, truckId });
  }

  // Виконуємо призначення водія. Якщо водій вже на іншій машині — бекенд
  // у тій самій транзакції звільнить попередню (currentDriverId @unique
  // забороняє race-condition з двома послідовними mutate).
  function applyDriverChange(newDriverId: string | null) {
    updateTruck.mutate({ id: truckId, data: { currentDriverId: newDriverId } });
    // Якщо є активний тріп і новий водій — переносимо тріп
    if (activeTrip && newDriverId) {
      reassignTrip.mutate({ id: activeTrip.id, driverId: newDriverId });
    }
  }

  // Обробник вибору водія з перевіркою "зайнятий на іншому траку"
  function handleDriverSelect(value: string) {
    const newDriverId = value === "none" ? null : value;
    if (!newDriverId) {
      applyDriverChange(null);
      return;
    }
    const selectedDriver = (drivers ?? []).find((d) => d.id === newDriverId);
    const occupiedTruck = selectedDriver?.currentTruck;
    // Якщо водій зараз на ІНШОМУ траку — питаємо підтвердження
    if (occupiedTruck && occupiedTruck.id !== truckId) {
      setPendingDriver({
        driverId: newDriverId,
        driverName: fullName(selectedDriver) || selectedDriver?.email || "Driver",
        fromTruck: { id: occupiedTruck.id, plate: occupiedTruck.plate },
      });
      return;
    }
    applyDriverChange(newDriverId);
  }

  function canDeleteNote(noteUserId: string) {
    if (!user) return false;
    return (
      user.id === noteUserId ||
      user.role === "TEAMLEAD" ||
      user.role === "ADMIN"
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* header */}
      <div className="flex shrink-0 items-center gap-4">
        {showBackButton && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <h1 className="text-base md:text-2xl font-bold shrink-0">{truck.plate}</h1>
          <Badge
            variant="outline"
            className={cn("text-xs md:text-sm shrink-0", TRUCK_STATUS_COLORS[truck.status])}
          >
            {TRUCK_STATUS_LABELS[truck.status]}
          </Badge>
          {truck.currentDriver && (
            <Link
              href={`/drivers/${truck.currentDriver.id}`}
              className="text-muted-foreground text-xs md:text-sm truncate hover:text-foreground hover:underline transition-colors inline-flex items-center gap-1.5"
            >
              <StatusDot user={truck.currentDriver} size="xs" />
              Driver: {fullName(truck.currentDriver)}
            </Link>
          )}
          <button
            className="md:hidden ml-auto shrink-0 flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary hover:bg-primary/20 transition-colors"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {navOpen
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0 w-full"
      >
        <TabsList className={cn("shrink-0", !navOpen && "hidden md:flex")}>
          <TabsTrigger value="chat" disabled={!isChatEnabled} className="gap-1.5">
            Chat
            {(truckUnread?.activeTripUnread ?? 0) > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none">
                {truckUnread!.activeTripUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="trips" className="gap-1.5">
            Trips
            {(truckUnread?.pastTripsUnread ?? 0) > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold px-1 leading-none">
                {truckUnread!.pastTripsUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alarm">Alarm</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4 flex flex-col flex-1 min-h-0">
          <ChatTab
            truckId={truckId}
            defaultDriverId={truck.currentDriverId}
            initialTripId={chatTripId}
            truckManagerId={truck.managerId}
            navOpen={navOpen}
            key={chatTripId ?? "chat"}
          />
        </TabsContent>

        <TabsContent
          value="trips"
          className="mt-4 flex-1 min-h-0 overflow-y-auto"
        >
          <TripsTab
            truckId={truckId}
            defaultDriverId={truck.currentDriverId}
            onOpenTrip={handleOpenTrip}
            tripUnread={truckUnread?.tripUnread ?? {}}
          />
        </TabsContent>

        <TabsContent
          value="documents"
          className="mt-4 flex-1 min-h-0 overflow-y-auto"
        >
          <DocumentsTab truckId={truckId} />
        </TabsContent>

        <TabsContent
          value="alarm"
          className="mt-4 flex-1 min-h-0 overflow-y-auto"
        >
          <AlarmTab truck={truck} activeTripId={activeTrip?.id ?? null} />
        </TabsContent>

        <TabsContent
          value="info"
          className="mt-4 flex-1 min-h-0 overflow-y-auto"
        >
          <div className="flex flex-col gap-3">
            {/* ── Assignments ── */}
            <div className="rounded-lg border divide-y">
              {/* Status */}
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  Status
                </span>
                <Select
                  value={truck.status}
                  onValueChange={(v) => handleStatusChange(v as TruckStatus)}
                  disabled={updateTruck.isPending}
                >
                  <SelectTrigger className="h-7 w-[120px] text-xs border-0 shadow-none px-1 focus:ring-0">
                    <Badge
                      variant="outline"
                      className={TRUCK_STATUS_COLORS[truck.status]}
                    >
                      {TRUCK_STATUS_LABELS[truck.status]}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="ON_TRIP">On Trip</SelectItem>
                    <SelectItem value="REPAIR">Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Driver */}
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  Driver
                </span>
                <Select
                  value={truck.currentDriverId ?? "none"}
                  onValueChange={handleDriverSelect}
                  disabled={updateTruck.isPending || reassignTrip.isPending}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs">
                    <SelectValue placeholder="No driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No driver</SelectItem>
                    {(drivers ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {fullName(d) || d.email}
                        {d.currentTruck && d.currentTruck.id !== truckId && (
                          <span className="ml-1.5 text-muted-foreground">
                            · {d.currentTruck.plate}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {truck.currentDriver?.phone && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {truck.currentDriver.phone}
                  </span>
                )}
                {activeTrip && (
                  <span className="text-[10px] text-muted-foreground shrink-0 border rounded px-1.5 py-0.5">
                    active trip
                  </span>
                )}
              </div>

              {/* Підтвердження переводу водія з іншого трака */}
              <AlertDialog
                open={!!pendingDriver}
                onOpenChange={(open) => { if (!open) setPendingDriver(null); }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reassign driver?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>{pendingDriver?.driverName}</strong> is currently assigned to truck{" "}
                      <strong>{pendingDriver?.fromTruck.plate}</strong>.
                      <br />
                      Do you want to move them to this truck?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPendingDriver(null)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (!pendingDriver) return;
                        applyDriverChange(pendingDriver.driverId);
                        setPendingDriver(null);
                      }}
                    >
                      Move driver
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Manager */}
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  Manager
                </span>
                <Select
                  value={truck.managerId ?? "none"}
                  onValueChange={(v) =>
                    updateTruck.mutate({
                      id: truckId,
                      data: { managerId: v === "none" ? null : v },
                    })
                  }
                  disabled={updateTruck.isPending}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs">
                    <SelectValue placeholder="No manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {(assignableManagers ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {fullName(d) || d.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="rounded-lg border flex flex-col gap-0 divide-y">
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Notes
                </p>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    className="resize-none text-sm flex-1"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0 self-end"
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || createNote.isPending}
                  >
                    {createNote.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {notesLoading ? (
                <div className="px-3 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : !notes || notes.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  No notes yet.
                </p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start justify-between gap-2 px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5 flex-1">
                      <p className="text-sm">{note.content}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{fullName(note.user) || "Unknown"}</span>
                        <span>·</span>
                        <span>
                          {new Date(note.createdAt).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    {canDeleteNote(note.user.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deleteNote.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
