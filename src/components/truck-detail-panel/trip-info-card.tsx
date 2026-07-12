"use client";

import { useState } from "react";
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MapPin,
  Hash,
  Plus,
  X,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { StatusDot } from "@/components/status-dot";
import { cn } from "@/lib/utils";
import {
  useUpdateTripInfo,
  useUpdateTripStatus,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
  type Trip,
  type TripStatus,
  type StopType,
} from "@/hooks/use-trips";
import { emptyStop, type StopRowData } from "./stop-row";
import { CoordsCell } from "./coords-cell";
import { shortenTripTitle } from "./utils";

export function TripInfoCard({
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
  const [editUnloadingStops, setEditUnloadingStops] = useState<StopRowData[]>(
    [],
  );
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
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · #{trip.orderNumber}
                </span>
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDocsClick();
                }}
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
