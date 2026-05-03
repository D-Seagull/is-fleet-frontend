"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
  ChevronsUpDown,
  Check,
  Search,
  FolderOpen,
  ImageIcon,
  Download,
  Smile,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { openDoc, downloadDoc, fetchSignedUrl } from "@/lib/doc-helpers";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  useTruck,
  useUpdateTruck,
  useTruckNotes,
  useCreateTruckNote,
  useDeleteTruckNote,
  useDrivers,
  type TruckStatus,
} from "@/hooks/use-trucks";
import { useAssignableDispatchers } from "@/hooks/use-dispatchers";
import {
  useTripsByTruck,
  useTripMessages,
  useCreateTrip,
  useUpdateTripStatus,
  useUpdateTripInfo,
  useReassignTrip,
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
import {
  useDocumentsByTruck,
  useDocumentsByTrip,
  useUploadDocuments,
  useDeleteDocument,
  type TripDocumentFull,
} from "@/hooks/use-documents";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { notFound } from "next/navigation";

// ─── constants ────────────────────────────────────────────────────────────────

export const TRUCK_STATUS_COLORS: Record<TruckStatus, string> = {
  AVAILABLE: "bg-green-500/10 text-green-500 border-green-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  REPAIR: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  REPAIR: "Repair",
};

export function shortenTripTitle(title: string): string {
  const [from, to] = title.split(" → ");
  const shortFrom = from?.split(",")[0]?.trim() ?? from ?? "";
  const shortTo = to?.split(",")[0]?.trim() ?? to ?? "";
  return to ? `${shortFrom} → ${shortTo}` : shortFrom;
}

// Витягує "CC поштовий_індекс" з адреси
// "Zabka\nMaslcka\npl 51-106"          → "PL 51-106"
// "Polcher Str. 113, DE-56727 Mayen"   → "DE 56727"
// "Lancaster Way, GB-CB6 3NW Ely"      → "GB CB6 3NW"
// "Some Street, 56727 Mayen"           → "56727"  (без коду країни)
function extractPostcodeCity(address: string): string {
  // Шукаємо: опційний код країни (2 літери) + роздільник + поштовий індекс
  const patterns: RegExp[] = [
    /\b([A-Z]{2})[-\s](\d{2}-\d{3})\b/i,              // PL: pl 51-106 / PL-51-106
    /\b([A-Z]{2})[-\s]([A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2})\b/i, // GB: GB-CB6 3NW
    /\b([A-Z]{2})[-\s](\d{4,6})\b/i,                   // DE/AT/FR: DE-56727
    /\b(\d{2}-\d{3})\b/,                                // PL без коду: 51-106
    /\b([A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2})\b/i,         // UK без коду: CB6 3NW
    /\b(\d{4,6})\b/,                                    // DE/FR без коду: 56727
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (!match) continue;
    // Якщо є дві групи — це "країна + індекс"
    if (match[2]) return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
    // Інакше просто індекс
    return match[1].toUpperCase();
  }

  // fallback
  const parts = address.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? address;
  return last.replace(/^[a-z]{1,3}[-\s]/i, "").trim();
}

export const ACTIVE_STATUSES: TripStatus[] = [
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
        <span
          className={cn("text-xs font-medium flex items-center gap-1", color)}
        >
          <MapPin className="h-3.5 w-3.5" />
          {type === "LOADING" ? "Loading" : "Unloading"} {index + 1}
        </span>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
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
            window.open(
              `https://www.google.com/maps?q=${value.coords}`,
              "_blank",
            )
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

export function NewTripDialog({
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

  const DRAFT_KEY = `trip-draft-${truckId}`;

  const [driverId, setDriverId] = useState(defaultDriverId ?? "");
  const [tripName, setTripName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingStops, setLoadingStops] = useState<StopRowData[]>([emptyStop()]);
  const [unloadingStops, setUnloadingStops] = useState<StopRowData[]>([emptyStop()]);
  const isNameEdited = useRef(false);

  // відновлення чернетки з localStorage при відкритті
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        setDriverId(draft.driverId ?? defaultDriverId ?? "");
        setTripName(draft.tripName ?? "");
        setOrderNumber(draft.orderNumber ?? "");
        setNotes(draft.notes ?? "");
        setLoadingStops(draft.loadingStops?.length ? draft.loadingStops : [emptyStop()]);
        setUnloadingStops(draft.unloadingStops?.length ? draft.unloadingStops : [emptyStop()]);
        isNameEdited.current = draft.isNameEdited ?? false;
      } else {
        setDriverId(defaultDriverId ?? "");
        setTripName("");
        setOrderNumber("");
        setNotes("");
        setLoadingStops([emptyStop()]);
        setUnloadingStops([emptyStop()]);
        isNameEdited.current = false;
      }
    } catch {
      setDriverId(defaultDriverId ?? "");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // збереження чернетки у localStorage при кожній зміні
  useEffect(() => {
    if (!open) return;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ driverId, tripName, orderNumber, notes, loadingStops, unloadingStops, isNameEdited: isNameEdited.current }),
    );
  }, [driverId, tripName, orderNumber, notes, loadingStops, unloadingStops, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // авто-заповнення Trip name з адрес (якщо користувач не редагував вручну)
  useEffect(() => {
    if (isNameEdited.current) return;
    const from = loadingStops[0]?.address;
    const to = unloadingStops[0]?.address;
    const fromShort = from ? extractPostcodeCity(from) : "";
    const toShort = to ? extractPostcodeCity(to) : "";
    if (fromShort || toShort) {
      setTripName([fromShort, toShort].filter(Boolean).join(" → "));
    } else {
      setTripName("");
    }
  }, [loadingStops, unloadingStops]);

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
    const title = tripName.trim() || `Trip ${new Date().toLocaleDateString()}`;

    const stops: StopFormData[] = [
      ...loadingStops.map((s, i) => ({
        type: "LOADING" as StopType,
        order: i,
        address: s.address || undefined,
        ref: s.ref || undefined,
        coords: s.coords || undefined,
      })),
      ...unloadingStops.map((s, i) => ({
        type: "UNLOADING" as StopType,
        order: i,
        address: s.address || undefined,
        ref: s.ref || undefined,
        coords: s.coords || undefined,
      })),
    ];

    const trip = await createTrip.mutateAsync({
      title,
      driverId,
      truckId,
      notes: notes || undefined,
      orderNumber: orderNumber || undefined,
      stops,
    });
    localStorage.removeItem(DRAFT_KEY);
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label>Trip name</Label>
              <span className="text-[11px] text-muted-foreground">
                auto-filled from addresses · edit to override
              </span>
            </div>
            <Input
              placeholder="e.g. CB6 3NW Ely → 56727 Mayen"
              value={tripName}
              onChange={(e) => {
                isNameEdited.current = true;
                setTripName(e.target.value);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Order number</Label>
            <Input
              placeholder="e.g. ORD-2024-001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-emerald-600">Loading stops</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLoadingStops([...loadingStops, emptyStop()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add stop
              </Button>
            </div>
            {loadingStops.map((stop, i) => (
              <StopRow
                key={i}
                index={i}
                type="LOADING"
                value={stop}
                onChange={(v) =>
                  updateStop(loadingStops, setLoadingStops, i, v)
                }
                onRemove={() => removeStop(loadingStops, setLoadingStops, i)}
                canRemove={loadingStops.length > 1}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-red-600">Unloading stops</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setUnloadingStops([...unloadingStops, emptyStop()])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add stop
              </Button>
            </div>
            {unloadingStops.map((stop, i) => (
              <StopRow
                key={i}
                index={i}
                type="UNLOADING"
                value={stop}
                onChange={(v) =>
                  updateStop(unloadingStops, setUnloadingStops, i, v)
                }
                onRemove={() =>
                  removeStop(unloadingStops, setUnloadingStops, i)
                }
                canRemove={unloadingStops.length > 1}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Trip notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!driverId || createTrip.isPending}
          >
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

// ─── Coords Cell ──────────────────────────────────────────────────────────────

function CoordsCell({ coords }: { coords: string }) {
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(coords);
  }
  return (
    <span className="flex items-center gap-1">
      <Navigation className="h-3 w-3 shrink-0" />
      {coords}
      <button
        onClick={copy}
        className="hover:text-foreground transition-colors"
        title="Copy"
      >
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

// ─── Trip Info Card ───────────────────────────────────────────────────────────

function TripInfoCard({
  trip,
  truckId,
  docsCount,
  onDocsClick,
}: {
  trip: Trip;
  truckId: string;
  docsCount?: number;
  onDocsClick?: () => void;
}) {
  const updateInfo = useUpdateTripInfo(truckId);
  const updateStatus = useUpdateTripStatus(truckId);
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const [editLoadingStops, setEditLoadingStops] = useState<StopRowData[]>([]);
  const [editUnloadingStops, setEditUnloadingStops] = useState<StopRowData[]>([]);
  const [editNotes, setEditNotes] = useState(trip.notes ?? "");
  const [editOrderNumber, setEditOrderNumber] = useState(trip.orderNumber ?? "");

  const isEdited = trip.updatedAt !== trip.createdAt;
  const loadingStops = trip.stops.filter((s) => s.type === "LOADING");
  const unloadingStops = trip.stops.filter((s) => s.type === "UNLOADING");

  function startEdit() {
    setEditLoadingStops(
      trip.stops
        .filter((s) => s.type === "LOADING")
        .map((s) => ({
          address: s.address ?? "",
          ref: s.ref ?? "",
          coords: s.coords ?? "",
        })),
    );
    setEditUnloadingStops(
      trip.stops
        .filter((s) => s.type === "UNLOADING")
        .map((s) => ({
          address: s.address ?? "",
          ref: s.ref ?? "",
          coords: s.coords ?? "",
        })),
    );
    setEditNotes(trip.notes ?? "");
    setEditOrderNumber(trip.orderNumber ?? "");
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
    await updateInfo.mutateAsync({
      id: trip.id,
      notes: editNotes || undefined,
      orderNumber: editOrderNumber || undefined,
      stops,
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <div
        className="rounded-lg border bg-muted/40 px-3 py-1.5 md:px-4 md:py-3 flex flex-col gap-2 md:gap-3 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-normal text-xs md:font-medium md:text-sm truncate">
              {shortenTripTitle(trip.title)}
              {trip.orderNumber && (
                <span className="text-muted-foreground font-normal"> · #{trip.orderNumber}</span>
              )}
            </span>
            {trip.driver?.name && (
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <User className="h-3 w-3" />
                {trip.driver.name}
              </span>
            )}
            {isEdited && (
              <span className="shrink-0 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
                edited
              </span>
            )}
            {onDocsClick !== undefined && (
              <button
                className="shrink-0 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => { e.stopPropagation(); onDocsClick(); }}
                title="Trip documents"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {!!docsCount && <span className="text-[10px]">{docsCount}</span>}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Select
                value={trip.status}
                onValueChange={(v) =>
                  updateStatus.mutate({ id: trip.id, status: v as TripStatus })
                }
              >
                <SelectTrigger className="h-6 w-auto border-0 shadow-none px-1 focus:ring-0 text-xs gap-1">
                  <Badge
                    variant="outline"
                    className={TRIP_STATUS_COLORS[trip.status]}
                  >
                    {TRIP_STATUS_LABELS[trip.status]}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIP_STATUS_LABELS) as TripStatus[]).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {TRIP_STATUS_LABELS[s]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={startEdit}
                title="Edit trip info"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>

            </div>
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            )}
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
                  {s.ref && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {s.ref}
                    </span>
                  )}
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
                  {s.ref && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {s.ref}
                    </span>
                  )}
                  {s.coords && <CoordsCell coords={s.coords} />}
                </div>
              ))}
            </div>
            {trip.notes && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                {trip.notes}
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  function editStopSection(
    label: string,
    color: string,
    stops: StopRowData[],
    setStops: (v: StopRowData[]) => void,
  ) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span
            className={cn("text-xs font-medium flex items-center gap-1", color)}
          >
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
          <div
            key={i}
            className="rounded-lg border bg-background px-3 py-2 flex flex-col gap-1.5"
          >
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
                className="w-28 text-xs h-7"
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], ref: e.target.value };
                  setStops(next);
                }}
              />
              <Input
                placeholder="Coordinates"
                value={stop.coords}
                className="flex-1 text-xs h-7"
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], coords: e.target.value };
                  setStops(next);
                }}
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
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps?q=${stop.coords}`,
                    "_blank",
                  )
                }
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
      <div className="flex flex-col gap-2">
        {/* рядок 1: назва + поле ордера */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate shrink-0 max-w-[45%]">
            {shortenTripTitle(trip.title)}
          </span>
          <span className="text-muted-foreground text-sm shrink-0">·</span>
          <Input
            placeholder="#order"
            value={editOrderNumber}
            onChange={(e) => setEditOrderNumber(e.target.value)}
            className="text-xs h-7 min-w-0 flex-1"
          />
        </div>
        {/* рядок 2: кнопки */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={saveEdit}
            disabled={updateInfo.isPending}
          >
            {updateInfo.isPending && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            Save
          </Button>
        </div>
      </div>
      {editStopSection(
        "Loading",
        "text-emerald-600",
        editLoadingStops,
        setEditLoadingStops,
      )}
      {editStopSection(
        "Unloading",
        "text-red-500",
        editUnloadingStops,
        setEditUnloadingStops,
      )}
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

// ─── Trip Attachments Content ─────────────────────────────────────────────────

function TripAttachmentsContent({
  tripId,
  truckId,
  canDelete = false,
  canUpload = false,
}: {
  tripId: string;
  truckId: string;
  canDelete?: boolean;
  canUpload?: boolean;
}) {
  const { data: docs = [], isLoading } = useDocumentsByTrip(tripId);
  const deleteDoc = useDeleteDocument(truckId);
  const upload = useUploadDocuments(truckId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const photos = docs.filter((d) => d.fileType === "PHOTO");
  const documents = docs.filter((d) => d.fileType === "DOCUMENT");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try { await upload.mutateAsync({ tripId, files }); }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (isLoading) return (
    <div className="py-6 flex justify-center">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );

  const renderRow = (doc: TripDocumentFull) => {
    const isPhoto = doc.fileType === "PHOTO";
    return (
      <div key={doc.id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50">
        {isPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.signedUrl}
            alt={doc.fileName}
            className="h-10 w-10 object-cover rounded shrink-0 cursor-pointer"
            onClick={() => openDoc(doc.id)}
          />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <button
          onClick={() => openDoc(doc.id)}
          className="text-xs truncate flex-1 text-left hover:underline"
        >
          {doc.fileName}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => openDoc(doc.id)} title="View"
            className="p-1 rounded hover:bg-muted"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></button>
          <button onClick={() => downloadDoc(doc.id)} title="Download"
            className="p-1 rounded hover:bg-muted"><Download className="h-3.5 w-3.5 text-muted-foreground" /></button>
          {canDelete && (
            <button onClick={() => deleteDoc.mutate(doc.id)} title="Delete"
              className="p-1 rounded hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {canUpload && (
        <div className="flex justify-end">
          <Button size="sm" className="h-7 text-xs gap-1" disabled={uploading}
            onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Upload
          </Button>
          <input ref={fileInputRef} type="file" multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden"
            onChange={handleUpload} />
        </div>
      )}
      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No attachments yet.</p>
      ) : (
        <Tabs defaultValue="ALL">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="ALL" className="text-xs">All ({docs.length})</TabsTrigger>
            <TabsTrigger value="PHOTO" className="text-xs">Photos ({photos.length})</TabsTrigger>
            <TabsTrigger value="DOCUMENT" className="text-xs">Documents ({documents.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="ALL" className="flex flex-col gap-1.5 mt-0">
            {docs.map(renderRow)}
          </TabsContent>
          <TabsContent value="PHOTO" className="flex flex-col gap-1.5 mt-0">
            {photos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No photos.</p>
            ) : (
              photos.map(renderRow)
            )}
          </TabsContent>
          <TabsContent value="DOCUMENT" className="flex flex-col gap-1.5 mt-0">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No documents.</p>
            ) : (
              documents.map(renderRow)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Trip Chat ────────────────────────────────────────────────────────────────

function TripChat({
  trip,
  truckId,
  currentUserId,
  truckDispatcherId,
}: {
  trip: Trip;
  truckId: string;
  currentUserId: string;
  truckDispatcherId?: string | null;
}) {
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useTripMessages(trip.id);
  const { data: tripDocs = [] } = useDocumentsByTrip(trip.id);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{ id: string; signedUrl: string } | null>(null);
  const [showTripDocs, setShowTripDocs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocuments(truckId);

  // unified timeline: messages + files sorted by createdAt
  type TimelineItem =
    | { kind: "msg"; data: TripMessage }
    | { kind: "file"; data: TripDocumentFull };

  const timeline: TimelineItem[] = [
    ...messages
      .filter(
        (msg) =>
          msg.sender.role === "DRIVER" ||
          msg.senderId === currentUserId ||
          msg.senderId === truckDispatcherId,
      )
      .map((m) => ({ kind: "msg" as const, data: m })),
    ...tripDocs.map((d) => ({ kind: "file" as const, data: d })),
  ].sort((a, b) =>
    new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime(),
  );

  // Keep currentUserId out of the socket effect's deps — it changes after auth
  // hydrates and would otherwise re-register listeners (the old `connect`
  // listener leaked because off() got the wrong reference).
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Only acknowledge reads when the browser tab is visible. Without this,
  // the sender sees ✓✓ even though the dispatcher had the tab in the
  // background and never actually saw the message.
  const tabVisibleRef = useRef(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      tabVisibleRef.current = document.visibilityState === "visible";
      // On returning to the tab, catch up — mark any unread as read.
      if (tabVisibleRef.current) {
        getSocket().emit("markTripRead", { tripId: trip.id });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [trip.id]);

  useEffect(() => {
    const socket = getSocket();
    const joinRoom = () => socket.emit("joinTrip", { tripId: trip.id });
    const markRead = () => {
      if (!tabVisibleRef.current) return;
      socket.emit("markTripRead", { tripId: trip.id });
    };
    const onConnect = () => {
      joinRoom();
      markRead();
    };

    joinRoom();
    markRead();
    socket.on("connect", onConnect);

    const handleNew = (msg: TripMessage) => {
      if (msg.tripId !== trip.id) return;
      queryClient.setQueryData<TripMessage[]>(
        ["trip-messages", trip.id],
        (old = []) => old.some((m) => m.id === msg.id) ? old : [...old, msg],
      );
      if (msg.senderId !== currentUserIdRef.current) markRead();
    };
    const handleNewDoc = (doc: TripDocumentFull) => {
      if (doc.tripId !== trip.id) return;
      queryClient.setQueryData<TripDocumentFull[]>(
        ["documents-trip", trip.id],
        (old = []) => (old.some((d) => d.id === doc.id) ? old : [...old, doc]),
      );
      // Also patch the truck-scoped cache so the docs sheet stays fresh.
      queryClient.invalidateQueries({ queryKey: ["documents-truck", truckId] });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
      if (doc.uploadedBy !== currentUserIdRef.current) markRead();
    };
    const handleRead = (payload: {
      tripId: string;
      messageIds: string[];
      documentIds: string[];
    }) => {
      if (payload.tripId !== trip.id) return;
      const msgIds = new Set(payload.messageIds ?? []);
      const docIds = new Set(payload.documentIds ?? []);
      if (msgIds.size > 0) {
        queryClient.setQueryData<TripMessage[]>(
          ["trip-messages", trip.id],
          (old = []) =>
            old.map((m) => (msgIds.has(m.id) ? { ...m, isRead: true } : m)),
        );
      }
      if (docIds.size > 0) {
        queryClient.setQueryData<TripDocumentFull[]>(
          ["documents-trip", trip.id],
          (old = []) =>
            old.map((d) => (docIds.has(d.id) ? { ...d, isRead: true } : d)),
        );
      }
    };
    socket.on("newMessage", handleNew);
    socket.on("newDocument", handleNewDoc);
    socket.on("tripMessagesRead", handleRead);
    return () => {
      socket.off("connect", onConnect);
      socket.off("newMessage", handleNew);
      socket.off("newDocument", handleNewDoc);
      socket.off("tripMessagesRead", handleRead);
    };
  }, [trip.id, queryClient]);

  // Scroll on every timeline item count change — text or doc. Watching only
  // `messages` left docs at the bottom, hidden under the input.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, tripDocs.length]);

  function handleSend() {
    if (!text.trim()) return;
    const sock = getSocket();
    // TEMP DEBUG — remove after we confirm send is working
    console.log("[chat] send", {
      tripId: trip.id,
      connected: sock.connected,
      transport: sock.io.engine?.transport?.name,
      socketId: sock.id,
      content: text.trim().slice(0, 30),
    });
    // senderId is no longer sent — backend uses client.data.userId from JWT
    sock.emit("sendMessage", {
      tripId: trip.id,
      content: text.trim(),
    });
    setText("");
  }

  function onEmojiClick(data: EmojiClickData) {
    setText((prev) => prev + data.emoji);
    setShowEmoji(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      await upload.mutateAsync({ tripId: trip.id, files });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <TripInfoCard
          trip={trip}
          truckId={truckId}
          docsCount={tripDocs.length}
          onDocsClick={() => setShowTripDocs(true)}
        />
      </div>

      {/* Trip docs sheet */}
      <Sheet open={showTripDocs} onOpenChange={setShowTripDocs}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Trip Documents
            </SheetTitle>
            {trip.orderNumber && (
              <p className="text-xs text-muted-foreground">Order #{trip.orderNumber}</p>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <TripAttachmentsContent
              tripId={trip.id}
              truckId={truckId}
              canDelete
              canUpload
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox.signedUrl}
            alt="preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 flex gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-white text-sm transition-colors"
              onClick={(e) => { e.stopPropagation(); downloadDoc(lightbox.id); }}
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 py-2 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No messages yet. Start the conversation.
          </p>
        ) : (
          timeline.map((item) => {
            if (item.kind === "msg") {
              const msg = item.data;
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={`msg-${msg.id}`}
                  className={cn("flex flex-col gap-0.5 max-w-[75%]", isMine && "self-end items-end")}
                >
                  <span className="text-xs text-muted-foreground px-1">
                    {msg.sender.name ?? "Unknown"}
                  </span>
                  <div className={cn("rounded-2xl px-3 py-2 text-sm", isMine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {(() => {
                      const [subject, ...rest] = msg.content.split("\n");
                      return rest.length > 0 ? (
                        <>
                          <span className="font-semibold block">{subject}</span>
                          <span className="whitespace-pre-wrap">{rest.join("\n")}</span>
                        </>
                      ) : msg.content;
                    })()}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {isMine && (
                      <span className={cn(msg.isRead && "text-primary")}>
                        {msg.isRead ? "✓✓" : "✓"}
                      </span>
                    )}
                  </span>
                </div>
              );
            }

            // file item
            const doc = item.data;
            const isMine = doc.uploadedBy === currentUserId;
            const isPhoto = doc.fileType === "PHOTO" ||
              /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(doc.fileName);
            const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
            return (
              <div
                key={`doc-${doc.id}`}
                className={cn(
                  // w-fit so the bubble shrinks to its content (e.g. a 180px
                  // photo) instead of stretching to the 80% max-w container.
                  "flex flex-col gap-0.5 max-w-[80%] w-fit",
                  isMine && "self-end items-end",
                )}
              >
                <span className="text-xs text-muted-foreground px-1">
                  {doc.uploader?.name ?? "Unknown"}
                </span>
                {isPhoto ? (
                  <div
                    className="rounded-2xl overflow-hidden cursor-pointer border hover:opacity-90 transition-opacity"
                    onClick={() => setLightbox({ id: doc.id, signedUrl: doc.signedUrl })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.signedUrl}
                      alt={doc.fileName}
                      // Re-scroll once the image dimensions are known —
                      // otherwise the bubble grows after our scroll fired
                      // and the new content sits below the viewport.
                      onLoad={() =>
                        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="max-w-[180px] max-h-[200px] w-full object-cover block"
                    />
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openDoc(doc.id)}
                    onKeyDown={(e) => e.key === "Enter" && openDoc(doc.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl px-3 py-2 border cursor-pointer hover:opacity-80 transition-opacity",
                      isMine ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <FileText className="h-5 w-5 shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm truncate max-w-[180px] leading-tight">
                        {doc.fileName}
                      </span>
                      <span className={cn(
                        "text-[10px] leading-tight",
                        isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {ext}
                      </span>
                    </div>
                    <button
                      title="Download"
                      onClick={(e) => { e.stopPropagation(); downloadDoc(doc.id); }}
                      className="shrink-0 opacity-70 hover:opacity-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
                  {new Date(doc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isMine && (
                    <span className={cn(doc.isRead && "text-primary")}>
                      {doc.isRead ? "✓✓" : "✓"}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 border-t pt-3 relative">
        {/* Emoji picker */}
        {showEmoji && (
          <div className="absolute bottom-full right-0 mb-2 z-50">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={Theme.AUTO}
              width={300}
              height={380}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {/* Файл */}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            title="Attach file"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Paperclip className="h-4 w-4 text-muted-foreground" />
            }
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Смайли */}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            title="Emoji"
            onClick={() => setShowEmoji((v) => !v)}
          >
            <Smile className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Інпут */}
          <Input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) handleSend();
              if (e.key === "Escape") setShowEmoji(false);
            }}
            className="flex-1"
          />

          {/* Відправити */}
          <Button size="icon" onClick={handleSend} disabled={!text.trim()} className="h-9 w-9 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Trip Combobox ────────────────────────────────────────────────────────────

function TripCombobox({
  trips,
  value,
  onChange,
  className,
}: {
  trips: Trip[];
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = trips.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal overflow-hidden", className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  ACTIVE_STATUSES.includes(selected.status)
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/40",
                )}
              />
              <span className="truncate text-sm">
                {shortenTripTitle(selected.title)}
                {selected.orderNumber && (
                  <span className="text-muted-foreground"> · #{selected.orderNumber}</span>
                )}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">Select trip...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput placeholder="Search trip..." className="h-9" />
          <CommandList>
            <CommandEmpty>No trips found.</CommandEmpty>
            <CommandGroup>
              {trips.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.title} ${t.orderNumber ?? ""} ${t.driver.name ?? ""}`}
                  onSelect={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0 mr-2",
                      ACTIVE_STATUSES.includes(t.status)
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="flex-1 truncate">
                    {shortenTripTitle(t.title)}
                    {t.orderNumber && (
                      <span className="text-muted-foreground"> · #{t.orderNumber}</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {TRIP_STATUS_LABELS[t.status]}
                  </span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === t.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

export function ChatTab({
  truckId,
  defaultDriverId,
  initialTripId,
  truckDispatcherId,
  navOpen = true,
}: {
  truckId: string;
  defaultDriverId?: string | null;
  initialTripId?: string | null;
  truckDispatcherId?: string | null;
  navOpen?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const { data: trips, isLoading } = useTripsByTruck(truckId);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    initialTripId ?? null,
  );
  const [selectorOpen, setSelectorOpen] = useState(false);

  const activeTrip = trips?.find((t) => ACTIVE_STATUSES.includes(t.status));
  const resolvedTripId = selectedTripId ?? activeTrip?.id ?? null;
  const selectedTrip = trips?.find((t) => t.id === resolvedTripId) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Mobile: compact bar with toggle + New Trip */}
      <div className={cn("flex shrink-0 items-center gap-2 md:hidden", !navOpen && "hidden")}>
        <button
          className="flex-1 flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 h-8 text-xs text-left truncate"
          onClick={() => setSelectorOpen((v) => !v)}
        >
          <span className="truncate flex-1 text-muted-foreground">
            {selectedTrip ? shortenTripTitle(selectedTrip.title) : "Select trip..."}
          </span>
          {selectorOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </button>
        <NewTripDialog
          truckId={truckId}
          defaultDriverId={defaultDriverId}
          onCreated={(trip) => { setSelectedTripId(trip.id); setSelectorOpen(false); }}
        />
      </div>
      {/* Mobile: expanded selector */}
      {selectorOpen && navOpen && (
        <div className="md:hidden shrink-0">
          <TripCombobox
            trips={trips ?? []}
            value={resolvedTripId}
            onChange={(id) => { setSelectedTripId(id); setSelectorOpen(false); }}
            className="w-full"
          />
        </div>
      )}
      {/* Desktop: always visible */}
      <div className="hidden md:flex shrink-0 items-center gap-3">
        <TripCombobox
          trips={trips ?? []}
          value={resolvedTripId}
          onChange={setSelectedTripId}
          className="flex-1"
        />
        <NewTripDialog
          truckId={truckId}
          defaultDriverId={defaultDriverId}
          onCreated={(trip) => setSelectedTripId(trip.id)}
        />
      </div>
      {selectedTrip ? (
        <TripChat
          trip={selectedTrip}
          truckId={truckId}
          currentUserId={user?.id ?? ""}
          truckDispatcherId={truckDispatcherId}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <p className="text-sm">Select or create a trip to start chatting</p>
        </div>
      )}
    </div>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

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
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onOpenTrip(trip.id)}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            ACTIVE_STATUSES.includes(trip.status)
              ? "bg-emerald-500"
              : "bg-muted-foreground/30",
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-medium truncate">
              {shortenTripTitle(trip.title)}
              {trip.orderNumber && (
                <span className="text-muted-foreground font-normal"> · #{trip.orderNumber}</span>
              )}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {trip.driver.name} · {new Date(trip.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant={section === "stops" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setSection(section === "stops" ? null : "stops")}
          >
            <MapPin className="h-3 w-3" />
            {trip.stops.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {trip.stops.length}
              </span>
            )}
          </Button>
          <Button
            variant={section === "attachments" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() =>
              setSection(section === "attachments" ? null : "attachments")
            }
          >
            <Paperclip className="h-3 w-3" />
            {allDocs.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {allDocs.length}
              </span>
            )}
          </Button>
          <Select
            value={trip.status}
            onValueChange={(v) =>
              updateStatus.mutate({ id: trip.id, status: v as TripStatus })
            }
          >
            <SelectTrigger className="h-7 w-[110px] text-xs border-0 px-2 shadow-none focus:ring-0">
              <Badge
                variant="outline"
                className={TRIP_STATUS_COLORS[trip.status]}
              >
                {TRIP_STATUS_LABELS[trip.status]}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TRIP_STATUS_LABELS) as TripStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {TRIP_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {section === "stops" && (
        <div className="border-t px-4 py-3">
          {trip.stops.length === 0 ? (
            <p className="text-xs text-muted-foreground">No stops.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {trip.stops
                .filter((s) => s.type === "LOADING")
                .map((s) => (
                  <span key={s.id} className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                    {s.address || "—"}
                  </span>
                ))}
              {trip.stops
                .filter((s) => s.type === "UNLOADING")
                .map((s) => (
                  <span key={s.id} className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                    {s.address || "—"}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
      {section === "attachments" && (
        <div className="border-t px-4 py-3">
          <TripAttachmentsContent
            tripId={trip.id}
            truckId={truckId}
            canDelete
            canUpload
          />
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ truckId }: { truckId: string }) {
  const { data: trips = [] } = useTripsByTruck(truckId);
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [uploadTripId, setUploadTripId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<{ id: string; signedUrl: string } | null>(null);

  const { data: docs = [], isLoading } = useDocumentsByTruck(truckId);
  const upload = useUploadDocuments(truckId);
  const deleteDoc = useDeleteDocument(truckId);

  const filtered = tripFilter === "all" ? docs : docs.filter((d) => d.tripId === tripFilter);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !uploadTripId) return;
    setUploading(true);
    try {
      await upload.mutateAsync({ tripId: uploadTripId, files });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={lightbox.signedUrl} alt="preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-4">
            <button className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-white text-sm transition-colors"
              onClick={(e) => { e.stopPropagation(); downloadDoc(lightbox.id); }}>
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </div>
      )}

      {/* Upload row */}
      <div className="flex items-center gap-2">
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trips ({docs.length})</SelectItem>
            {trips.map((t) => {
              const count = docs.filter((d) => d.tripId === t.id).length;
              return (
                <SelectItem key={t.id} value={t.id}>
                  {shortenTripTitle(t.title)}
                  {t.orderNumber && ` · #${t.orderNumber}`}
                  {count > 0 && ` (${count})`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={uploadTripId} onValueChange={setUploadTripId}>
          <SelectTrigger className="h-8 text-xs w-[130px] shrink-0">
            <SelectValue placeholder="Trip…" />
          </SelectTrigger>
          <SelectContent>
            {trips.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.orderNumber ? `#${t.orderNumber}` : shortenTripTitle(t.title)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 shrink-0 px-3" disabled={!uploadTripId || uploading}
          onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
        <input ref={fileInputRef} type="file" multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleUpload} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <FolderOpen className="h-8 w-8 opacity-30" />
          <p className="text-sm">No attachments yet</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px]">
                <TableHead className="w-12 px-2 py-2" />
                <TableHead className="px-2 py-2">File</TableHead>
                <TableHead className="px-2 py-2 hidden sm:table-cell w-24">Date</TableHead>
                <TableHead className="px-2 py-2 hidden sm:table-cell w-24">Order #</TableHead>
                <TableHead className="px-2 py-2 hidden md:table-cell">Driver</TableHead>
                <TableHead className="px-2 py-2 w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => {
                const isPhoto = doc.fileType === "PHOTO";
                return (
                  <TableRow key={doc.id} className="text-xs">
                    <TableCell className="px-2 py-1.5 w-12">
                      {isPhoto ? (
                        <img
                          src={doc.signedUrl}
                          alt={doc.fileName}
                          className="h-9 w-9 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightbox({ id: doc.id, signedUrl: doc.signedUrl })}
                        />
                      ) : (
                        <div className="h-9 w-9 flex items-center justify-center rounded bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 max-w-[120px]">
                      <button
                        onClick={() => openDoc(doc.id)}
                        className="truncate block w-full text-left hover:underline font-medium"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </button>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell font-mono">
                      {doc.trip?.orderNumber ? `#${doc.trip.orderNumber}` : "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-muted-foreground hidden md:table-cell">
                      {doc.uploader?.name ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5 justify-end">
                        <button onClick={() => openDoc(doc.id)} title="View"
                          className="p-1 rounded hover:bg-muted">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => downloadDoc(doc.id)} title="Download"
                          className="p-1 rounded hover:bg-muted">
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => deleteDoc.mutate(doc.id)} title="Delete"
                          className="p-1 rounded hover:bg-muted">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


// ─── Trips Tab ────────────────────────────────────────────────────────────────

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
  const [search, setSearch] = useState("");

  const filtered = trips?.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.orderNumber ?? "").toLowerCase().includes(q) ||
      (t.driver.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by route, order #, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
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
        <p className="text-center text-sm text-muted-foreground py-10">
          No trips yet.
        </p>
      ) : filtered?.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          Nothing found.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered?.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              truckId={truckId}
              onOpenTrip={onOpenTrip}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Truck Detail Panel ───────────────────────────────────────────────────────

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
  const { data: assignableDispatchers } = useAssignableDispatchers();
  const { data: truckTrips = [] } = useTripsByTruck(truckId);
  const updateTruck = useUpdateTruck();
  const reassignTrip = useReassignTrip(truckId);
  const createNote = useCreateTruckNote();
  const deleteNote = useDeleteTruckNote();

  const ACTIVE_STATUSES = ["ASSIGNED", "ACCEPTED", "ON_WAY", "ON_SITE", "LOADED"];
  const activeTrip = truckTrips.find((t) => ACTIVE_STATUSES.includes(t.status)) ?? null;

  const [noteText, setNoteText] = useState("");

  // Resolve chat access once truck data is available
  useEffect(() => {
    if (!truck || !user) return;
    const isDispatcher = user.role === "DISPATCHER" || user.role === "ADMIN";
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else {
      setActiveTab(isDispatcher ? "chat" : "trips");
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

  const isCurrentDispatcher = truck.dispatcherId === user?.id;
  const isChatEnabled = user?.role === "ADMIN" || isCurrentDispatcher;

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
            <span className="text-muted-foreground text-xs md:text-sm truncate">
              Driver: {truck.currentDriver.name}
            </span>
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
          <TabsTrigger value="chat" disabled={!isChatEnabled}>
            Chat
          </TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alarm">Alarm</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4 flex flex-col flex-1 min-h-0">
          <ChatTab
            truckId={truckId}
            defaultDriverId={truck.currentDriverId}
            initialTripId={chatTripId}
            truckDispatcherId={truck.dispatcherId}
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
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
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
                  onValueChange={(v) => {
                    const newDriverId = v === "none" ? null : v;
                    // 1. Update the truck's assigned driver
                    updateTruck.mutate({
                      id: truckId,
                      data: { currentDriverId: newDriverId },
                    });
                    // 2. If there's an active trip — reassign it to the new driver
                    if (activeTrip && newDriverId) {
                      reassignTrip.mutate({ id: activeTrip.id, driverId: newDriverId });
                    }
                  }}
                  disabled={updateTruck.isPending || reassignTrip.isPending}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs">
                    <SelectValue placeholder="No driver" />
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

              {/* Dispatcher */}
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="text-sm text-muted-foreground w-24 shrink-0">
                  Dispatcher
                </span>
                <Select
                  value={truck.dispatcherId ?? "none"}
                  onValueChange={(v) =>
                    updateTruck.mutate({
                      id: truckId,
                      data: { dispatcherId: v === "none" ? null : v },
                    })
                  }
                  disabled={updateTruck.isPending}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs">
                    <SelectValue placeholder="No dispatcher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No dispatcher</SelectItem>
                    {(assignableDispatchers ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name ?? d.email}
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
