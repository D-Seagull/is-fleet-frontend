"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { fullName } from "@/lib/format";
import { StatusDot } from "@/components/status-dot";
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
  History,
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
import { useAssignableManagers } from "@/hooks/use-managers";
import {
  useTripsByTruck,
  useDeleteMessage,
  useEditTripMessage,
  useTripMessages,
  useTripChatArchive,
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
import { ChatArchiveDialog } from "@/components/chat-archive-dialog";
import { AlarmTab } from "@/components/alarm-tab";
import { useAuthStore } from "@/store/auth";
import { getSocket } from "@/lib/socket";
import { useUnreadSummary, UNREAD_QUERY_KEY } from "@/hooks/use-unread";
import { cn } from "@/lib/utils";
import {
  useDocumentsByTruck,
  useDocumentsByTrip,
  useUploadDocuments,
  useDeleteDocument,
  type TripDocumentFull,
} from "@/hooks/use-documents";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { notFound, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageReactionsCluster } from "@/components/message-reactions";
import { MessageActionsContext } from "@/components/message-actions-menu";
import { MessageQuote } from "@/components/message-quote";
import { useReactionsSocketSync } from "@/hooks/use-message-reactions";

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
                    {fullName(d) || d.email}
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
            {fullName(trip.driver) && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground">
                <StatusDot user={trip.driver} size="xs" />
                {fullName(trip.driver)}
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
  truckManagerId,
}: {
  trip: Trip;
  truckId: string;
  currentUserId: string;
  truckManagerId?: string | null;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === "ADMIN" || user?.role === "TEAMLEAD";
  useReactionsSocketSync({ tripId: trip.id });
  // Only the trip's current driver / manager may send messages in the
  // active session — backend enforces this too. Other roles see a notice.
  const isActiveParticipant =
    trip.driverId === currentUserId || trip.managerId === currentUserId;
  const { data: messages = [], isLoading } = useTripMessages(trip.id);
  const { data: tripDocs = [] } = useDocumentsByTrip(trip.id);
  const { data: archiveSessions = [] } = useTripChatArchive(trip.id);
  const deleteMessage = useDeleteMessage(trip.id);
  const editMessage = useEditTripMessage(trip.id);
  const deleteDocument = useDeleteDocument(truckId);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<{ id: string; original: string } | null>(
    null,
  );
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    targetType: "msg" | "doc";
    senderName: string | null;
    content: string;
    isDeleted: boolean;
  } | null>(null);

  const scrollToTripMessage = (messageId: string) => {
    const el = document.getElementById(`trip-msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-lg");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "rounded-lg");
    }, 1500);
  };
  const scrollToTripDoc = (docId: string) => {
    const el = document.getElementById(`trip-doc-${docId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-lg");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "rounded-lg");
    }, 1500);
  };
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{ id: string; signedUrl: string } | null>(null);
  const [showTripDocs, setShowTripDocs] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // true  → user is within ~80px of the bottom (messages are visible)
  // false → user scrolled up to read history
  const nearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocuments(truckId);
  // Files staged for sending — uploaded together with the text caption on
  // Send so a single reply can carry both a file and text.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // unified timeline: messages + files sorted by createdAt
  type TimelineItem =
    | { kind: "msg"; data: TripMessage }
    | { kind: "file"; data: TripDocumentFull };

  const timeline: TimelineItem[] = [
    ...messages
      .map((m) => ({ kind: "msg" as const, data: m })),
    ...tripDocs.map((d) => ({ kind: "file" as const, data: d })),
  ].sort((a, b) =>
    new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime(),
  );

  // Keep currentUserId out of the socket effect's deps — it changes after auth
  // hydrates and would otherwise re-register listeners (the old `connect`
  // listener leaked because off() got the wrong reference).
  const currentUserIdRef = useRef(currentUserId);
  const isManagerRef = useRef(isManager);
  useEffect(() => {
    isManagerRef.current = isManager;
  }, [isManager]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Only acknowledge reads when the browser tab is visible. Without this,
  // the sender sees ✓✓ even though the manager had the tab in the
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

    const handleNew = (msg: TripMessage & { tempId?: string | null }) => {
      if (msg.tripId !== trip.id) return;

      // Privacy: ignore messages from a session the current user wasn't in.
      // Without this, an old manager who happens to still have the trip
      // open would receive the new manager's chat over the wire.
      const meId = currentUserIdRef.current;
      const inSession =
        msg.session?.driverId === meId || msg.session?.managerId === meId;
      if (!isManagerRef.current && !inSession) return;

      queryClient.setQueryData<TripMessage[]>(
        ["trip-messages", trip.id],
        (old = []) => {
          // Optimistic swap: if the server echoed our tempId, drop the
          // placeholder and append the real row in its place.
          if (msg.tempId) {
            const withoutTemp = old.filter((m) => m.id !== msg.tempId);
            if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp;
            return [...withoutTemp, msg];
          }
          return old.some((m) => m.id === msg.id) ? old : [...old, msg];
        },
      );
      // Оновлюємо лічильники непрочитаних у шапці та картках
      void queryClient.invalidateQueries({ queryKey: UNREAD_QUERY_KEY });
      // Only mark as read if the user is actually looking at the bottom.
      // If they scrolled up, the pill will appear and markRead fires on scroll-down.
      if (msg.senderId !== meId && nearBottomRef.current) markRead();

      // Sound: ping for incoming non-system messages from someone else.
      if (!msg.isSystem && msg.senderId !== meId) {
        try {
          const a = new Audio("/sounds/is_message.mp3");
          a.volume = 0.6;
          void a.play();
        } catch {
          /* autoplay can be blocked until first user interaction — silent */
        }
      }
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
      if (doc.uploadedBy !== currentUserIdRef.current && nearBottomRef.current) markRead();
    };
    const handleMsgDeleted = (payload: { tripId: string; messageId: string }) => {
      if (payload.tripId !== trip.id) return;
      queryClient.setQueryData<TripMessage[]>(
        ["trip-messages", trip.id],
        (old = []) => old.filter((m) => m.id !== payload.messageId),
      );
    };
    const handleMsgEdited = (payload: { tripId: string; message: TripMessage }) => {
      if (payload.tripId !== trip.id) return;
      queryClient.setQueryData<TripMessage[]>(
        ["trip-messages", trip.id],
        (old = []) =>
          old.map((m) =>
            m.id === payload.message.id ? { ...m, ...payload.message } : m,
          ),
      );
    };
    const handleDocDeleted = (payload: { tripId: string; documentId: string }) => {
      if (payload.tripId !== trip.id) return;
      // Soft delete — patch the row so the chat shows a tombstone. The
      // truck-level / company-level views can still purge via invalidate
      // because they don't render soft-deleted rows.
      queryClient.setQueryData<TripDocumentFull[]>(
        ["documents-trip", trip.id],
        (old = []) =>
          old.map((d) =>
            d.id === payload.documentId
              ? { ...d, deletedAt: new Date().toISOString(), signedUrl: "" }
              : d,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ["documents-truck", truckId] });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
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
    // Driver / manager changed — refetch trip + messages + archive so the
    // current pair sees the new system message and old chat is hidden.
    const handleTripUpdated = (payload: { tripId: string }) => {
      if (payload.tripId !== trip.id) return;
      queryClient.invalidateQueries({ queryKey: ["trip-messages", trip.id] });
      queryClient.invalidateQueries({ queryKey: ["trip-chat-archive", trip.id] });
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    };

    socket.on("newMessage", handleNew);
    socket.on("newDocument", handleNewDoc);
    socket.on("tripMessagesRead", handleRead);
    socket.on("messageDeleted", handleMsgDeleted);
    socket.on("messageEdited", handleMsgEdited);
    socket.on("documentDeleted", handleDocDeleted);
    socket.on("tripUpdated", handleTripUpdated);
    return () => {
      socket.off("connect", onConnect);
      socket.off("newMessage", handleNew);
      socket.off("newDocument", handleNewDoc);
      socket.off("tripMessagesRead", handleRead);
      socket.off("messageDeleted", handleMsgDeleted);
      socket.off("messageEdited", handleMsgEdited);
      socket.off("documentDeleted", handleDocDeleted);
      socket.off("tripUpdated", handleTripUpdated);
    };
  }, [trip.id, queryClient]);

  // ── Typing indicator ────────────────────────────────────────────────────
  // Track who's currently typing in this trip. We only ever expect the
  // counterparty (one driver ↔ one manager), but use a Map<userId, name>
  // to handle race conditions and future N-party chats cleanly.
  const [typers, setTypers] = useState<Map<string, string>>(new Map());
  // Per-typer auto-clear: if we never receive `userStopTyping` (e.g. socket
  // drop), the indicator vanishes after 4s on its own.
  const typerTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    const socket = getSocket();
    const onTyping = (payload: { tripId: string; user: { id: string; firstName: string; lastName: string | null } }) => {
      if (payload.tripId !== trip.id) return;
      if (payload.user.id === currentUserIdRef.current) return;
      setTypers((prev) => {
        const next = new Map(prev);
        next.set(payload.user.id, fullName(payload.user) || "Someone");
        return next;
      });
      // Reset auto-clear timeout
      const prev = typerTimeoutsRef.current.get(payload.user.id);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        setTypers((p) => {
          const n = new Map(p);
          n.delete(payload.user.id);
          return n;
        });
        typerTimeoutsRef.current.delete(payload.user.id);
      }, 4000);
      typerTimeoutsRef.current.set(payload.user.id, t);
    };
    const onStopTyping = (payload: { tripId: string; userId: string }) => {
      if (payload.tripId !== trip.id) return;
      const t = typerTimeoutsRef.current.get(payload.userId);
      if (t) clearTimeout(t);
      typerTimeoutsRef.current.delete(payload.userId);
      setTypers((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    };
    socket.on("userTyping", onTyping);
    socket.on("userStopTyping", onStopTyping);
    return () => {
      socket.off("userTyping", onTyping);
      socket.off("userStopTyping", onStopTyping);
      typerTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typerTimeoutsRef.current.clear();
    };
  }, [trip.id]);

  // Outbound: throttle "typing" emit to once per debounce window; emit
  // "stopTyping" 2s after last keystroke.
  const isTypingRef = useRef(false);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function notifyTyping() {
    if (!isActiveParticipant) return;
    const socket = getSocket();
    if (!isTypingRef.current) {
      socket.emit("typing", { tripId: trip.id });
      isTypingRef.current = true;
    }
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { tripId: trip.id });
      isTypingRef.current = false;
    }, 2000);
  }
  function notifyStopTyping() {
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    if (isTypingRef.current) {
      getSocket().emit("stopTyping", { tripId: trip.id });
      isTypingRef.current = false;
    }
  }
  // Cleanup on unmount / trip switch
  useEffect(() => {
    return () => {
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
      if (isTypingRef.current) {
        getSocket().emit("stopTyping", { tripId: trip.id });
        isTypingRef.current = false;
      }
    };
  }, [trip.id]);

  // Smart scroll: jump to bottom when near bottom; show "↓ N new" pill when
  // user is scrolled up (Viber/Telegram pattern).
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || (messages.length === 0 && tripDocs.length === 0)) return;
    if (nearBottomRef.current) {
      if (!initialScrollDone.current) {
        // First load — instant jump, no animation
        el.scrollTop = el.scrollHeight;
        initialScrollDone.current = true;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    } else if (initialScrollDone.current) {
      // User scrolled up — show pill, don't force-scroll
      setNewMsgCount((n) => n + 1);
    }
  }, [messages.length, tripDocs.length]);

  async function handleSend() {
    const trimmed = text.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!trimmed && !hasFiles && !editing) return;

    // Edit mode — PATCH instead of sending a new message.
    if (editing) {
      if (!trimmed) return;
      if (trimmed === editing.original.trim()) {
        setEditing(null);
        setText("");
        return;
      }
      try {
        await editMessage.mutateAsync({ id: editing.id, content: trimmed });
      } finally {
        setEditing(null);
        setText("");
        notifyStopTyping();
      }
      return;
    }

    // User is sending — snap back to bottom so they see their own message.
    nearBottomRef.current = true;
    setNewMsgCount(0);
    const replyMsgId =
      replyingTo?.targetType === "msg" ? replyingTo.id : null;
    const replyDocId =
      replyingTo?.targetType === "doc" ? replyingTo.id : null;

    // Telegram-style: text + files = ONE file bubble with a caption (NOT a
    // separate text message). Pure text or pure files keep their existing
    // single-channel paths.
    if (hasFiles) {
      setUploading(true);
      try {
        await upload.mutateAsync({
          tripId: trip.id,
          files: pendingFiles,
          replyToMessageId: replyMsgId,
          replyToDocumentId: replyDocId,
          caption: trimmed || null,
        });
      } catch (err) {
        setUploading(false);
        console.error("[trip-chat] file upload failed", err);
        return;
      }
      setUploading(false);
      setPendingFiles([]);
      notifyStopTyping();
      setText("");
      setReplyingTo(null);
      return;
    }

    // Optimistic text message — drop a "pending" bubble in the cache so the
    // user sees their message instantly, then swap it out when the real one
    // arrives over WS. Gateway echoes `tempId` back so we can locate the
    // placeholder.
    if (trimmed) {
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const meId = currentUserIdRef.current ?? "";
      const optimistic: TripMessage = {
        id: tempId,
        tripId: trip.id,
        senderId: meId,
        content: trimmed,
        translatedContent: null,
        isRead: false,
        isSystem: false,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        editedAt: null,
        replyToId: replyMsgId,
        replyTo: replyingTo?.targetType === "msg"
          ? {
              id: replyingTo.id,
              content: replyingTo.content,
              deletedAt: replyingTo.isDeleted ? new Date().toISOString() : null,
              sender: {
                id: "",
                firstName: replyingTo.senderName ?? "",
                lastName: null,
                avatar: null,
              },
            }
          : null,
        replyToDocumentId: replyDocId,
        replyToDocument: replyingTo?.targetType === "doc"
          ? {
              id: replyingTo.id,
              fileName: replyingTo.content,
              fileType: "DOCUMENT",
              deletedAt: replyingTo.isDeleted ? new Date().toISOString() : null,
              uploader: { id: "", firstName: replyingTo.senderName ?? "", lastName: null, avatar: null },
            }
          : null,
        sender: {
          id: meId,
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? null,
          avatar: user?.avatar ?? null,
          role: user?.role ?? "MANAGER",
        },
        reactions: [],
      };
      queryClient.setQueryData<TripMessage[]>(
        ["trip-messages", trip.id],
        (old = []) => [...old, optimistic],
      );

      getSocket().emit("sendMessage", {
        tripId: trip.id,
        content: trimmed,
        replyToId: replyMsgId,
        replyToDocumentId: replyDocId,
        tempId,
      });
    }

    notifyStopTyping();
    setText("");
    setReplyingTo(null);
  }

  function onEmojiClick(data: EmojiClickData) {
    setText((prev) => prev + data.emoji);
    setShowEmoji(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // Stage only — the actual upload runs from handleSend so a caption + reply
    // target can travel with the file in a single user action.
    setPendingFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
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

      {/* Archive banner — only admins/teamleads see it. Drivers/managers see
          system messages inline in the chat instead. */}
      {isManager && archiveSessions.length > 0 && (
        <div className="shrink-0 border-y bg-muted/30 px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <History className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {archiveSessions.length} previous chat
              {archiveSessions.length === 1 ? "" : "s"} on this trip
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0"
            onClick={() => setShowArchive(true)}
          >
            View archive
          </Button>
        </div>
      )}

      {isManager && (
        <ChatArchiveDialog
          open={showArchive}
          onOpenChange={setShowArchive}
          tripId={trip.id}
          currentUserId={currentUserId}
        />
      )}

      <div className="relative flex-1 min-h-0">
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-y-auto flex flex-col gap-2 py-2 pr-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
          const wasNear = nearBottomRef.current;
          nearBottomRef.current = dist < 80;
          if (!wasNear && nearBottomRef.current) {
            // User scrolled back to bottom — dismiss pill and mark visible msgs read
            setNewMsgCount(0);
            if (tabVisibleRef.current) getSocket().emit("markTripRead", { tripId: trip.id });
          }
        }}
      >
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

              // System messages (e.g. "New driver assigned: ...") render as a
              // centered grey label, like Telegram's group event notices.
              if (msg.isSystem) {
                return (
                  <div
                    key={`msg-${msg.id}`}
                    className="self-center text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full"
                  >
                    {msg.content}
                  </div>
                );
              }

              const isMine = msg.senderId === currentUserId;
              const isDeleted = !!msg.deletedAt;
              const senderInitials = (fullName(msg.sender) || "??")
                .slice(0, 2)
                .toUpperCase();
              const canEdit =
                isMine &&
                !isDeleted &&
                !msg.isSystem &&
                Date.now() - new Date(msg.createdAt).getTime() <
                  15 * 60 * 1000;
              const actions = {
                onCopy: () => navigator.clipboard.writeText(msg.content),
                onReply: () =>
                  setReplyingTo({
                    id: msg.id,
                    targetType: "msg",
                    senderName: fullName(msg.sender) || null,
                    content: msg.content,
                    isDeleted: !!msg.deletedAt,
                  }),
                onEdit: canEdit
                  ? () => {
                      setEditing({ id: msg.id, original: msg.content });
                      setText(msg.content);
                      setReplyingTo(null);
                      setPendingFiles([]);
                    }
                  : undefined,
                onDelete: isMine
                  ? () => deleteMessage.mutate(msg.id)
                  : undefined,
              };
              return (
                <div
                  key={`msg-${msg.id}`}
                  className={cn(
                    "group flex items-center gap-2",
                    isMine && "self-end",
                  )}
                >
                  {/* Sidekick — Trigger (mine / idle) + others inline. */}
                  {isMine && !isDeleted && (
                    <MessageReactionsCluster
                      messageId={msg.id}
                      type="TRIP"
                      reactions={msg.reactions ?? []}
                      currentUserId={currentUserId}
                    />
                  )}
                  {!isMine && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/chat?userId=${msg.senderId}`)
                      }
                      className="shrink-0"
                      title={`Message ${fullName(msg.sender) || "user"}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {senderInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  )}
                  <div
                    className={cn(
                      "flex flex-col gap-0.5 max-w-[75%] min-w-0",
                      isMine && "items-end",
                    )}
                  >
                    {!isMine && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/chat?userId=${msg.senderId}`)
                        }
                        className="text-xs text-muted-foreground px-1 hover:underline cursor-pointer text-left"
                      >
                        {fullName(msg.sender) || "Unknown"}
                      </button>
                    )}
                    <MessageActionsContext actions={actions} isOwn={isMine} isDeleted={isDeleted}>
                      <div
                        id={`trip-msg-${msg.id}`}
                        className={cn(
                          "rounded-2xl max-w-full transition-shadow",
                          isDeleted
                            ? "bg-muted/40 text-muted-foreground italic text-xs px-3 py-1 whitespace-nowrap"
                            : cn(
                                "px-3 py-2 text-sm whitespace-pre-wrap break-all",
                                isMine ? "bg-primary text-primary-foreground" : "bg-muted",
                              ),
                        )}
                      >
                        {!isDeleted && msg.replyTo && (
                          <MessageQuote
                            senderName={fullName(msg.replyTo.sender)}
                            content={msg.replyTo.content}
                            isDeleted={!!msg.replyTo.deletedAt}
                            onClick={() => scrollToTripMessage(msg.replyTo!.id)}
                            variant={isMine ? "onPrimary" : "default"}
                          />
                        )}
                        {!isDeleted && msg.replyToDocument && (
                          <MessageQuote
                            kind="doc"
                            senderName={fullName(msg.replyToDocument.uploader)}
                            fileName={msg.replyToDocument.fileName}
                            content=""
                            isDeleted={!!msg.replyToDocument.deletedAt}
                            onClick={() =>
                              scrollToTripDoc(msg.replyToDocument!.id)
                            }
                            variant={isMine ? "onPrimary" : "default"}
                          />
                        )}
                        {isDeleted ? (
                          "Повідомлення видалено"
                        ) : (
                          (() => {
                            const [subject, ...rest] = msg.content.split("\n");
                            return rest.length > 0 ? (
                              <>
                                <span className="font-semibold block">{subject}</span>
                                <span>{rest.join("\n")}</span>
                              </>
                            ) : msg.content;
                          })()
                        )}
                      </div>
                    </MessageActionsContext>
                    <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
                      {msg.editedAt && !isDeleted && (
                        <span
                          title={`Редаговано о ${new Date(msg.editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                          className="italic"
                        >
                          (ред.)
                        </span>
                      )}
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {isMine && (
                        <span className={cn(msg.isRead && "text-primary")}>
                          {msg.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                    </span>
                  </div>
                  {/* Sidekick (other side). */}
                  {!isMine && !isDeleted && (
                    <MessageReactionsCluster
                      messageId={msg.id}
                      type="TRIP"
                      reactions={msg.reactions ?? []}
                      currentUserId={currentUserId}
                    />
                  )}
                </div>
              );
            }

            // file item
            const doc = item.data;
            const isMine = doc.uploadedBy === currentUserId;
            const isDeletedDoc = !!doc.deletedAt;
            const isPhoto = doc.fileType === "PHOTO" ||
              /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(doc.fileName);
            const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
            const docActions = {
              onCopy: () => navigator.clipboard.writeText(doc.fileName),
              onReply: () =>
                setReplyingTo({
                  id: doc.id,
                  targetType: "doc" as const,
                  senderName: fullName(doc.uploader) || null,
                  content: doc.fileName,
                  isDeleted: isDeletedDoc,
                }),
              onDelete: isMine
                ? () => deleteDocument.mutate(doc.id)
                : undefined,
            };
            return (
              <div
                key={`doc-${doc.id}`}
                className={cn(
                  "group flex items-center gap-3",
                  // Own: trigger on the LEFT, bubble on the right.
                  // Other: bubble on the left, trigger on the RIGHT (reverse).
                  isMine ? "self-end" : "self-start flex-row-reverse",
                )}
              >
                {/* Doc sidekick — cluster style. flex-row-reverse on
                    `other` keeps the cluster on the visual right. */}
                {!isDeletedDoc && (
                  <MessageReactionsCluster
                    messageId={doc.id}
                    type="TRIP_DOC"
                    reactions={doc.reactions ?? []}
                    currentUserId={currentUserId}
                  />
                )}
              <div
                className={cn(
                  // w-fit so the bubble shrinks to its content (e.g. a 180px
                  // photo) instead of stretching to the 80% max-w container.
                  "flex flex-col gap-0.5 max-w-[80%] w-fit min-w-0",
                  isMine && "items-end",
                )}
              >
                <span className="text-xs text-muted-foreground px-1">
                  {fullName(doc.uploader) || "Unknown"}
                </span>
                <MessageActionsContext
                  actions={docActions}
                  isOwn={isMine}
                  isDeleted={isDeletedDoc}
                >
                  <div id={`trip-doc-${doc.id}`} className="transition-shadow">
                    {!isDeletedDoc && doc.replyTo && (
                      <MessageQuote
                        senderName={fullName(doc.replyTo.sender)}
                        content={doc.replyTo.content}
                        isDeleted={!!doc.replyTo.deletedAt}
                        onClick={() => scrollToTripMessage(doc.replyTo!.id)}
                        variant="default"
                      />
                    )}
                    {!isDeletedDoc && doc.replyToDocument && (
                      <MessageQuote
                        kind="doc"
                        senderName={fullName(doc.replyToDocument.uploader)}
                        fileName={doc.replyToDocument.fileName}
                        content=""
                        isDeleted={!!doc.replyToDocument.deletedAt}
                        onClick={() =>
                          scrollToTripDoc(doc.replyToDocument!.id)
                        }
                        variant="default"
                      />
                    )}
                    {isDeletedDoc ? (
                      <div className="rounded-2xl bg-muted/40 text-muted-foreground italic px-3 py-1 text-xs whitespace-nowrap">
                        Файл видалено
                      </div>
                    ) : isPhoto ? (
                      <div
                        className={cn(
                          "rounded-2xl overflow-hidden border max-w-[200px]",
                          doc.caption &&
                            (isMine ? "bg-primary text-primary-foreground" : "bg-muted"),
                        )}
                      >
                        <div
                          className="cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightbox({ id: doc.id, signedUrl: doc.signedUrl })}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.signedUrl}
                            alt={doc.fileName}
                            onLoad={() => {
                              if (nearBottomRef.current) {
                                const el = scrollContainerRef.current;
                                if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                              }
                            }}
                            className="max-w-[200px] max-h-[200px] w-full object-cover block"
                          />
                        </div>
                        {doc.caption && (
                          <p className="text-sm whitespace-pre-wrap break-words px-3 py-2">
                            {doc.caption}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "rounded-2xl border overflow-hidden",
                          isMine ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openDoc(doc.id)}
                          onKeyDown={(e) => e.key === "Enter" && openDoc(doc.id)}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
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
                        {doc.caption && (
                          <p className="text-sm whitespace-pre-wrap break-words px-3 pb-2">
                            {doc.caption}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </MessageActionsContext>
                <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
                  {new Date(doc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isMine && !isDeletedDoc && (
                    <span className={cn(doc.isRead && "text-primary")}>
                      {doc.isRead ? "✓✓" : "✓"}
                    </span>
                  )}
                </span>
              </div>
              </div>
            );
          })
        )}
      </div>
      {/* "↓ N new" pill — visible when user scrolled up and new messages arrived */}
      {newMsgCount > 0 && (
        <button
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 shadow-lg hover:bg-primary/90 transition-colors z-10"
          onClick={() => {
            nearBottomRef.current = true;
            setNewMsgCount(0);
            const el = scrollContainerRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            if (tabVisibleRef.current) getSocket().emit("markTripRead", { tripId: trip.id });
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {newMsgCount} new
        </button>
      )}
      </div>
      {/* Typing indicator — animated dots matching the direct-chat style. */}
      {typers.size > 0 && (
        <div className="shrink-0 px-4 py-1 text-xs text-muted-foreground flex items-center gap-1">
          <span>
            {Array.from(typers.values()).join(", ")}{" "}
            {typers.size === 1 ? "набирає" : "набирають"}
          </span>
          <span className="flex gap-0.5">
            <span className="animate-bounce delay-0">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </span>
        </div>
      )}

      <div className="shrink-0 border-t pt-3 relative">
        {!isActiveParticipant ? (
          <div className="px-3 py-3 text-center text-xs text-muted-foreground">
            Ви більше не учасник цього чату — перегляд тільки для читання.
          </div>
        ) : (
          <>
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

            {editing && (
              <div className="mb-2 flex items-start gap-2">
                <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                  <p className="text-[11px] font-semibold text-primary leading-tight flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    Редагування повідомлення
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">
                    {editing.original}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setText("");
                  }}
                  title="Скасувати редагування"
                  className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {replyingTo && !editing && (
              <div className="mb-2 flex items-start gap-2">
                <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                  <p className="text-[11px] font-semibold text-primary leading-tight">
                    Reply to {replyingTo.senderName ?? "Unknown"}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] text-muted-foreground leading-tight truncate flex items-center gap-1",
                      replyingTo.isDeleted && "italic",
                    )}
                  >
                    {replyingTo.targetType === "doc" &&
                      !replyingTo.isDeleted && (
                        <Paperclip className="h-3 w-3 shrink-0" />
                      )}
                    <span className="truncate">
                      {replyingTo.isDeleted
                        ? replyingTo.targetType === "doc"
                          ? "Файл видалено"
                          : "Повідомлення видалено"
                        : replyingTo.content}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  title="Cancel reply"
                  className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pendingFiles.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs max-w-[200px]"
                  >
                    <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      title="Remove"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
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
                placeholder={editing ? "Редагуйте повідомлення…" : "Type a message..."}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value.length > 0) notifyTyping();
                  else notifyStopTyping();
                }}
                onBlur={notifyStopTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleSend();
                  if (e.key === "Escape") {
                    setShowEmoji(false);
                    if (editing) {
                      setEditing(null);
                      setText("");
                    }
                  }
                }}
                className="flex-1"
              />

              {/* Відправити / Зберегти */}
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!text.trim() && pendingFiles.length === 0}
                title={editing ? "Зберегти" : "Send"}
                className="h-9 w-9 shrink-0"
              >
                {editing ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
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
                  value={`${t.title} ${t.orderNumber ?? ""} ${fullName(t.driver) || ""}`}
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
  truckManagerId,
  navOpen = true,
}: {
  truckId: string;
  defaultDriverId?: string | null;
  initialTripId?: string | null;
  truckManagerId?: string | null;
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
          truckManagerId={truckManagerId}
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
  unreadCount = 0,
}: {
  trip: Trip;
  truckId: string;
  onOpenTrip: (id: string) => void;
  unreadCount?: number;
}) {
  const updateStatus = useUpdateTripStatus(truckId);
  const [section, setSection] = useState<"stops" | "attachments" | null>(null);
  const allDocs = trip.documents;

  return (
    <div className={cn(
      "rounded-lg border bg-card flex flex-col overflow-hidden",
      unreadCount > 0 && "border-blue-500/30 bg-blue-500/5"
    )}>
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
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none shrink-0">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <StatusDot user={trip.driver} size="xs" />
            {fullName(trip.driver)} · {new Date(trip.createdAt).toLocaleDateString()}
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
                      {fullName(doc.uploader) || "—"}
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
  tripUnread = {},
}: {
  truckId: string;
  defaultDriverId?: string | null;
  onOpenTrip: (tripId: string) => void;
  tripUnread?: Record<string, number>;
}) {
  const { data: trips, isLoading } = useTripsByTruck(truckId);
  const [search, setSearch] = useState("");

  const filtered = trips?.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.orderNumber ?? "").toLowerCase().includes(q) ||
      (fullName(t.driver) || "").toLowerCase().includes(q)
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
              unreadCount={tripUnread[trip.id] ?? 0}
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
