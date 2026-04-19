"use client";

import { useState, use, Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  User,
  Plus,
  Send,
  MapPin,
  Hash,
  Navigation,
  Copy,
  ExternalLink,
  FileText,
  X,
  Pencil,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useTruck,
  useUpdateTruck,
  useTruckNotes,
  useCreateTruckNote,
  useDeleteTruckNote,
  useDrivers,
  type TruckStatus,
} from "@/hooks/use-trucks";
import {
  useTripsByTruck,
  useTripMessages,
  useCreateTrip,
  useUpdateTripStatus,
  useUpdateTripInfo,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
  type Trip,
  type TripMessage,
  type TripStatus,
  type StopType,
  type StopFormData,
} from "@/hooks/use-trips";
import { useAuthStore } from "@/store/auth";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

// ─── constants ────────────────────────────────────────────────────────────────

const TRUCK_STATUS_COLORS: Record<TruckStatus, string> = {
  AVAILABLE: "bg-green-500/10 text-green-500 border-green-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  REPAIR: "bg-red-500/10 text-red-500 border-red-500/20",
};

const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  REPAIR: "Repair",
};

// active trip = not yet delivered
const ACTIVE_STATUSES: TripStatus[] = [
  "ASSIGNED",
  "ACCEPTED",
  "ON_WAY",
  "ON_SITE",
  "LOADED",
];

// ─── Stop Form Row ────────────────────────────────────────────────────────────

interface StopRowData {
  address: string;
  ref: string;
  coords: string;
}

const emptyStop = (): StopRowData => ({ address: "", ref: "", coords: "" });

function StopRow({
  index,
  type,
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  type: StopType;
  value: StopRowData;
  onChange: (v: StopRowData) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const color = type === "LOADING" ? "text-emerald-500" : "text-red-500";

  function set(field: keyof StopRowData, val: string) {
    onChange({ ...value, [field]: val });
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium flex items-center gap-1", color)}>
          <MapPin className="h-3.5 w-3.5" />
          {type === "LOADING" ? "Loading" : "Unloading"} {index + 1}
        </span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* single address field */}
      <Textarea
        placeholder="Company name, street, postcode, city"
        value={value.address}
        onChange={(e) => set("address", e.target.value)}
        rows={2}
        className="resize-none"
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Reference #"
          value={value.ref}
          onChange={(e) => set("ref", e.target.value)}
          className="w-36"
        />
        <Input
          placeholder="Coordinates"
          value={value.coords}
          onChange={(e) => set("coords", e.target.value)}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!value.coords}
          onClick={() => navigator.clipboard.writeText(value.coords)}
          title="Copy coordinates"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!value.coords}
          onClick={() =>
            window.open(`https://www.google.com/maps?q=${value.coords}`, "_blank")
          }
          title="Open in Google Maps"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── New Trip Dialog ──────────────────────────────────────────────────────────

function NewTripDialog({
  truckId,
  defaultDriverId,
  onCreated,
}: {
  truckId: string;
  defaultDriverId?: string | null;
  onCreated?: (trip: Trip) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: drivers } = useDrivers();
  const createTrip = useCreateTrip();

  const [driverId, setDriverId] = useState(defaultDriverId ?? "");
  const [notes, setNotes] = useState("");
  const [loadingStops, setLoadingStops] = useState<StopRowData[]>([emptyStop()]);
  const [unloadingStops, setUnloadingStops] = useState<StopRowData[]>([emptyStop()]);

  useEffect(() => {
    if (open) {
      setDriverId(defaultDriverId ?? "");
      setNotes("");
      setLoadingStops([emptyStop()]);
      setUnloadingStops([emptyStop()]);
    }
  }, [open, defaultDriverId]);

  function updateStop(
    list: StopRowData[],
    setList: (v: StopRowData[]) => void,
    idx: number,
    val: StopRowData,
  ) {
    const next = [...list];
    next[idx] = val;
    setList(next);
  }

  function removeStop(
    list: StopRowData[],
    setList: (v: StopRowData[]) => void,
    idx: number,
  ) {
    setList(list.filter((_, i) => i !== idx));
  }

  async function handleCreate() {
    if (!driverId) return;

    // auto-generate title from first address of each side
    const from = loadingStops[0]?.address;
    const to = unloadingStops[0]?.address;
    const title =
      from && to
        ? `${from} → ${to}`
        : `Trip ${new Date().toLocaleDateString()}`;

    const stops: StopFormData[] = [
      ...loadingStops.map((s, i) => ({ type: "LOADING" as StopType, order: i, address: s.address || undefined, ref: s.ref || undefined, coords: s.coords || undefined })),
      ...unloadingStops.map((s, i) => ({ type: "UNLOADING" as StopType, order: i, address: s.address || undefined, ref: s.ref || undefined, coords: s.coords || undefined })),
    ];

    const trip = await createTrip.mutateAsync({
      title,
      driverId,
      truckId,
      notes: notes || undefined,
      stops,
    });
    setOpen(false);
    onCreated?.(trip);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Trip</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">

          {/* driver */}
          <div className="flex flex-col gap-2">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {(drivers ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name ?? d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* loading stops */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-emerald-600">Loading stops</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLoadingStops([...loadingStops, emptyStop()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add stop
              </Button>
            </div>
            {loadingStops.map((stop, i) => (
              <StopRow
                key={i}
                index={i}
                type="LOADING"
                value={stop}
                onChange={(v) => updateStop(loadingStops, setLoadingStops, i, v)}
                onRemove={() => removeStop(loadingStops, setLoadingStops, i)}
                canRemove={loadingStops.length > 1}
              />
            ))}
          </div>

          {/* unloading stops */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-red-600">Unloading stops</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setUnloadingStops([...unloadingStops, emptyStop()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add stop
              </Button>
            </div>
            {unloadingStops.map((stop, i) => (
              <StopRow
                key={i}
                index={i}
                type="UNLOADING"
                value={stop}
                onChange={(v) => updateStop(unloadingStops, setUnloadingStops, i, v)}
                onRemove={() => removeStop(unloadingStops, setUnloadingStops, i)}
                canRemove={unloadingStops.length > 1}
              />
            ))}
          </div>

          {/* notes */}
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Trip notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleCreate} disabled={!driverId || createTrip.isPending}>
            {createTrip.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Trip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Coords Cell (copy + google maps) ────────────────────────────────────────

function CoordsCell({ coords }: { coords: string }) {
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(coords);
  }
  return (
    <span className="flex items-center gap-1">
      <Navigation className="h-3 w-3 shrink-0" />
      {coords}
      <button onClick={copy} className="hover:text-foreground transition-colors" title="Copy">
        <Copy className="h-3 w-3" />
      </button>
      <a
        href={`https://www.google.com/maps?q=${coords}`}
        target="_blank"
        rel="noreferrer"
        className="hover:text-foreground transition-colors"
        title="Open in Google Maps"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}

// ─── Trip Info Card (pinned in chat, with inline edit) ───────────────────────

function TripInfoCard({
  trip,
  truckId,
}: {
  trip: Trip;
  truckId: string;
}) {
  const updateInfo = useUpdateTripInfo(truckId);
  const updateStatus = useUpdateTripStatus(truckId);
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // local edit state — split by stop type
  const [editLoadingStops, setEditLoadingStops] = useState<StopRowData[]>([]);
  const [editUnloadingStops, setEditUnloadingStops] = useState<StopRowData[]>([]);
  const [editNotes, setEditNotes] = useState(trip.notes ?? "");

  const isEdited = trip.updatedAt !== trip.createdAt;
  const loadingStops = trip.stops.filter((s) => s.type === "LOADING");
  const unloadingStops = trip.stops.filter((s) => s.type === "UNLOADING");

  function startEdit() {
    setEditLoadingStops(
      trip.stops
        .filter((s) => s.type === "LOADING")
        .map((s) => ({ address: s.address ?? "", ref: s.ref ?? "", coords: s.coords ?? "" })),
    );
    setEditUnloadingStops(
      trip.stops
        .filter((s) => s.type === "UNLOADING")
        .map((s) => ({ address: s.address ?? "", ref: s.ref ?? "", coords: s.coords ?? "" })),
    );
    setEditNotes(trip.notes ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    const stops = [
      ...editLoadingStops.map((s, i) => ({
        type: "LOADING" as StopType,
        order: i,
        address: s.address || undefined,
        ref: s.ref || undefined,
        coords: s.coords || undefined,
      })),
      ...editUnloadingStops.map((s, i) => ({
        type: "UNLOADING" as StopType,
        order: i,
        address: s.address || undefined,
        ref: s.ref || undefined,
        coords: s.coords || undefined,
      })),
    ];
    await updateInfo.mutateAsync({ id: trip.id, notes: editNotes || undefined, stops });
    setEditing(false);
  }

  // ── view mode ──
  if (!editing) {
    return (
      <div
        className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col gap-3 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{trip.title}</span>
            {isEdited && (
              <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
                edited
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* status + edit: stop propagation so they don't toggle collapse */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Select
                value={trip.status}
                onValueChange={(v) =>
                  updateStatus.mutate({ id: trip.id, status: v as TripStatus })
                }
              >
                <SelectTrigger className="h-6 w-auto border-0 shadow-none px-1 focus:ring-0 text-xs gap-1">
                  <Badge variant="outline" className={TRIP_STATUS_COLORS[trip.status]}>
                    {TRIP_STATUS_LABELS[trip.status]}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIP_STATUS_LABELS) as TripStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{TRIP_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEdit} title="Edit trip info">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            {/* chevron bubbles up → toggles collapse */}
            {collapsed
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {loadingStops.map((s, i) => (
                <div key={s.id} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                    <MapPin className="h-3 w-3" />
                    Loading {loadingStops.length > 1 ? i + 1 : ""}
                  </span>
                  {s.address && <span>{s.address}</span>}
                  {s.ref && <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {s.ref}</span>}
                  {s.coords && <CoordsCell coords={s.coords} />}
                </div>
              ))}
              {unloadingStops.map((s, i) => (
                <div key={s.id} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 font-medium text-red-500">
                    <MapPin className="h-3 w-3" />
                    Unloading {unloadingStops.length > 1 ? i + 1 : ""}
                  </span>
                  {s.address && <span>{s.address}</span>}
                  {s.ref && <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {s.ref}</span>}
                  {s.coords && <CoordsCell coords={s.coords} />}
                </div>
              ))}
            </div>
            {trip.notes && (
              <p className="text-xs text-muted-foreground border-t pt-2">{trip.notes}</p>
            )}
          </>
        )}
      </div>
    );
  }

  // ── edit mode ──
  function editStopSection(
    label: string,
    color: string,
    stops: StopRowData[],
    setStops: (v: StopRowData[]) => void,
  ) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-medium flex items-center gap-1", color)}>
            <MapPin className="h-3 w-3" />
            {label} stops
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setStops([...stops, emptyStop()])}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
        {stops.map((stop, i) => (
          <div key={i} className="rounded-lg border bg-background px-3 py-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={cn("text-[11px] font-medium", color)}>
                {label} {stops.length > 1 ? i + 1 : ""}
              </span>
              {stops.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setStops(stops.filter((_, j) => j !== i))}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
            <Textarea
              placeholder="Company name, street, postcode, city"
              value={stop.address}
              onChange={(e) => {
                const next = [...stops];
                next[i] = { ...next[i], address: e.target.value };
                setStops(next);
              }}
              rows={2}
              className="resize-none text-xs"
            />
            <div className="flex gap-1.5">
              <Input
                placeholder="Ref #"
                value={stop.ref}
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], ref: e.target.value };
                  setStops(next);
                }}
                className="w-28 text-xs h-7"
              />
              <Input
                placeholder="Coordinates"
                value={stop.coords}
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], coords: e.target.value };
                  setStops(next);
                }}
                className="flex-1 text-xs h-7"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!stop.coords}
                onClick={() => navigator.clipboard.writeText(stop.coords)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!stop.coords}
                onClick={() => window.open(`https://www.google.com/maps?q=${stop.coords}`, "_blank")}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{trip.title}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={saveEdit} disabled={updateInfo.isPending}>
            {updateInfo.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {editStopSection("Loading", "text-emerald-600", editLoadingStops, setEditLoadingStops)}
      {editStopSection("Unloading", "text-red-500", editUnloadingStops, setEditUnloadingStops)}

      <div className="flex flex-col gap-1 border-t pt-2">
        <Label className="text-xs">Notes</Label>
        <Textarea
          placeholder="Trip notes..."
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          rows={2}
          className="resize-none text-xs"
        />
      </div>
    </div>
  );
}

// ─── Trip Chat ────────────────────────────────────────────────────────────────

function TripChat({ trip, truckId, currentUserId }: { trip: Trip; truckId: string; currentUserId: string }) {
  const { data: initialMessages, isLoading } = useTripMessages(trip.id);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("joinTrip", trip.id);
    const handleNew = (msg: TripMessage) => {
      if (msg.tripId !== trip.id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    };
    socket.on("newMessage", handleNew);
    return () => { socket.off("newMessage", handleNew); };
  }, [trip.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!text.trim()) return;
    getSocket().emit("sendMessage", {
      tripId: trip.id,
      content: text.trim(),
      senderId: currentUserId,
    });
    setText("");
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* pinned trip info — shrinks messages area when expanded */}
      <div className="shrink-0">
        <TripInfoCard trip={trip} truckId={truckId} />
      </div>

      {/* messages — takes remaining space, scrolls internally */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 py-2 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-0.5 max-w-[75%]",
                  isMine && "self-end items-end",
                )}
              >
                <span className="text-xs text-muted-foreground px-1">
                  {msg.sender.name ?? "Unknown"}
                </span>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm",
                    isMine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground/60 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* input — always pinned at bottom */}
      <div className="shrink-0 flex items-center gap-2 border-t pt-3">
        <Input
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({
  truckId,
  defaultDriverId,
  initialTripId,
}: {
  truckId: string;
  defaultDriverId?: string | null;
  initialTripId?: string | null;
}) {
  const user = useAuthStore((s) => s.user);
  const { data: trips, isLoading } = useTripsByTruck(truckId);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    initialTripId ?? null,
  );

  useEffect(() => {
    if (!trips || selectedTripId) return;
    const active = trips.find((t) => ACTIVE_STATUSES.includes(t.status));
    if (active) setSelectedTripId(active.id);
  }, [trips, selectedTripId]);

  const selectedTrip = trips?.find((t) => t.id === selectedTripId) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex shrink-0 items-center gap-3">
        {trips && trips.length > 0 ? (
          <Select value={selectedTripId ?? ""} onValueChange={setSelectedTripId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        ACTIVE_STATUSES.includes(t.status)
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/40",
                      )}
                    />
                    {t.title}
                    <span className="text-xs text-muted-foreground">
                      · {TRIP_STATUS_LABELS[t.status]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="flex-1 text-sm text-muted-foreground">No trips yet</p>
        )}
        <NewTripDialog
          truckId={truckId}
          defaultDriverId={defaultDriverId}
          onCreated={(trip) => setSelectedTripId(trip.id)}
        />
      </div>

      {selectedTrip ? (
        <TripChat trip={selectedTrip} truckId={truckId} currentUserId={user?.id ?? ""} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <p className="text-sm">Select or create a trip to start chatting</p>
        </div>
      )}
    </div>
  );
}

// ─── Trips Tab ────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  truckId,
  onOpenTrip,
}: {
  trip: Trip;
  truckId: string;
  onOpenTrip: (id: string) => void;
}) {
  const updateStatus = useUpdateTripStatus(truckId);
  const [section, setSection] = useState<"stops" | "attachments" | null>(null);
  const allDocs = trip.documents;

  return (
    <div className="rounded-lg border bg-card flex flex-col overflow-hidden">
      {/* header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onOpenTrip(trip.id)}
      >
        {/* active dot */}
        <span className={cn("h-2 w-2 rounded-full shrink-0",
          ACTIVE_STATUSES.includes(trip.status) ? "bg-emerald-500" : "bg-muted-foreground/30"
        )} />

        {/* title + date */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{trip.title}</p>
          <p className="text-xs text-muted-foreground">
            {trip.driver.name} · {new Date(trip.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* stops / attachments toggles + status — all on the right */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Stops toggle */}
          <Button
            variant={section === "stops" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setSection(section === "stops" ? null : "stops")}
          >
            <MapPin className="h-3 w-3" />
            {trip.stops.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{trip.stops.length}</span>
            )}
          </Button>

          {/* Attachments toggle */}
          <Button
            variant={section === "attachments" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setSection(section === "attachments" ? null : "attachments")}
          >
            <Paperclip className="h-3 w-3" />
            {allDocs.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{allDocs.length}</span>
            )}
          </Button>

          {/* status select */}
          <Select
            value={trip.status}
            onValueChange={(v) =>
              updateStatus.mutate({ id: trip.id, status: v as TripStatus })
            }
          >
            <SelectTrigger className="h-7 w-[110px] text-xs border-0 px-2 shadow-none focus:ring-0">
              <Badge variant="outline" className={TRIP_STATUS_COLORS[trip.status]}>
                {TRIP_STATUS_LABELS[trip.status]}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TRIP_STATUS_LABELS) as TripStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{TRIP_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* expandable section */}
      {section === "stops" && (
        <div className="border-t px-4 py-3">
          {trip.stops.length === 0 ? (
            <p className="text-xs text-muted-foreground">No stops.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {trip.stops.filter((s) => s.type === "LOADING").map((s) => (
                <span key={s.id} className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />{s.address || "—"}
                </span>
              ))}
              {trip.stops.filter((s) => s.type === "UNLOADING").map((s) => (
                <span key={s.id} className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-red-500 shrink-0" />{s.address || "—"}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "attachments" && (
        <div className="border-t px-4 py-3">
          {allDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No attachments yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allDocs.map((doc) => (
                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1.5 text-xs hover:bg-muted/80 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />{doc.fileName}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TripsTab({
  truckId,
  defaultDriverId,
  onOpenTrip,
}: {
  truckId: string;
  defaultDriverId?: string | null;
  onOpenTrip: (tripId: string) => void;
}) {
  const { data: trips, isLoading } = useTripsByTruck(truckId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewTripDialog
          truckId={truckId}
          defaultDriverId={defaultDriverId}
          onCreated={(trip) => onOpenTrip(trip.id)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !trips || trips.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No trips yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} truckId={truckId} onOpenTrip={onOpenTrip} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function TruckDetailContent({ id }: { id: string }) {
  const user = useAuthStore((s) => s.user);
  // read ?tab= from URL: plate link passes "info", row click uses default "chat"
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "chat";

  const [activeTab, setActiveTab] = useState(defaultTab);
  // shared selectedTripId — Trips tab can open a trip in Chat tab
  const [chatTripId, setChatTripId] = useState<string | null>(null);

  const { data: truck, isLoading } = useTruck(id);
  const { data: notes, isLoading: notesLoading } = useTruckNotes(id);
  const { data: drivers } = useDrivers();
  const updateTruck = useUpdateTruck();
  const createNote = useCreateTruckNote();
  const deleteNote = useDeleteTruckNote();

  const [noteText, setNoteText] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!truck) notFound();

  function handleOpenTrip(tripId: string) {
    setChatTripId(tripId);
    setActiveTab("chat");
  }

  async function handleStatusChange(status: TruckStatus) {
    await updateTruck.mutateAsync({ id, data: { status } });
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await createNote.mutateAsync({ truckId: id, content: noteText.trim() });
    setNoteText("");
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    await deleteNote.mutateAsync({ noteId, truckId: id });
  }

  function canDeleteNote(noteUserId: string) {
    if (!user) return false;
    return user.id === noteUserId || user.role === "TEAMLEAD" || user.role === "ADMIN";
  }

  return (
    <div className="flex flex-col h-full p-4 gap-6">
      {/* header */}
      <div className="flex shrink-0 items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/trucks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{truck.plate}</h1>
          <Badge variant="outline" className={TRUCK_STATUS_COLORS[truck.status]}>
            {TRUCK_STATUS_LABELS[truck.status]}
          </Badge>
          {truck.currentDriver && (
            <span className="text-muted-foreground">
              Driver: {truck.currentDriver.name}
            </span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 w-full">
        <TabsList className="shrink-0">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alarm">Alarm</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        {/* ── Chat ── */}
        <TabsContent value="chat" className="mt-4 flex flex-col flex-1 min-h-0">
          <ChatTab
            truckId={id}
            defaultDriverId={truck.currentDriverId}
            initialTripId={chatTripId}
            key={chatTripId ?? "chat"}
          />
        </TabsContent>

        {/* ── Trips ── */}
        <TabsContent value="trips" className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <TripsTab
            truckId={id}
            defaultDriverId={truck.currentDriverId}
            onOpenTrip={handleOpenTrip}
          />
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents" className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Alarm ── */}
        <TabsContent value="alarm" className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Info ── */}
        <TabsContent value="info" className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={truck.status}
                    onValueChange={(v) => handleStatusChange(v as TruckStatus)}
                    disabled={updateTruck.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ON_TRIP">On Trip</SelectItem>
                      <SelectItem value="REPAIR">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Driver</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {truck.currentDriver && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="font-medium text-sm">
                          {truck.currentDriver.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {truck.currentDriver.phone}
                        </p>
                      </div>
                    </div>
                  )}
                  <Select
                    value={truck.currentDriverId ?? "none"}
                    onValueChange={(v) =>
                      updateTruck.mutate({
                        id,
                        data: { currentDriverId: v === "none" ? null : v },
                      })
                    }
                    disabled={updateTruck.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No driver</SelectItem>
                      {(drivers ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name ?? d.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="note-text">Add Note</Label>
                  <Textarea
                    id="note-text"
                    placeholder="Enter note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || createNote.isPending}
                    className="w-fit"
                  >
                    {createNote.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {notesLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : !notes || notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-start justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2"
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <p className="text-sm">{note.content}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{note.user.name ?? "Unknown"}</span>
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
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deleteNote.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Suspense is required because TruckDetailContent uses useSearchParams()
export default function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense>
      <TruckDetailContent id={id} />
    </Suspense>
  );
}
