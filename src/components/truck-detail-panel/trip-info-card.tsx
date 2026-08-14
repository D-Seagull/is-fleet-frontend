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
  Clock,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
  TRIP_STATUS_COLORS,
  TRIP_STATUS_KEYS,
  type Trip,
  type TripStatus,
  type StopType,
} from "@/hooks/use-trips";
import { emptyStop, todayLocal, TIME_PRESETS, type StopRowData } from "./stop-row";
import { CoordsCell } from "./coords-cell";
import { shortenTripTitle, formatStopWindow } from "./utils";

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
  const t = useTranslations("truckPanel.trips");
  const tNewTrip = useTranslations("truckPanel.newTrip");
  const tStatus = useTranslations("common.tripStatus");
  const tStopType = useTranslations("common.stopType");
  const tStop = useTranslations("truckPanel.stop");
  const tActions = useTranslations("common.actions");
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
    const toRow = (s: Trip["stops"][number]): StopRowData => ({
      address: s.address ?? "",
      ref: s.ref ?? "",
      coords: s.coords ?? "",
      windowDate: s.windowDate ?? todayLocal(),
      windowStart: s.windowStart ?? "00:00",
      windowEnd: s.windowEnd ?? "00:00",
    });
    setEditLoadingStops(
      trip.stops.filter((s) => s.type === "LOADING").map(toRow),
    );
    setEditUnloadingStops(
      trip.stops.filter((s) => s.type === "UNLOADING").map(toRow),
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
        windowDate: s.windowDate || undefined,
        windowStart: s.windowStart || undefined,
        windowEnd: s.windowEnd || undefined,
      })),
      ...editUnloadingStops.map((s, i) => ({
        type: "UNLOADING" as StopType,
        order: i,
        address: s.address || undefined,
        ref: s.ref || undefined,
        coords: s.coords || undefined,
        windowDate: s.windowDate || undefined,
        windowStart: s.windowStart || undefined,
        windowEnd: s.windowEnd || undefined,
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
              <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground max-[373px]:hidden">
                <StatusDot user={trip.driver} size="xs" />
                {fullName(trip.driver)}
              </span>
            )}
            {isEdited && (
              <span className="shrink-0 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 max-[373px]:hidden">
                {t("edited")}
              </span>
            )}
            {onDocsClick !== undefined && (
              <button
                className="shrink-0 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDocsClick();
                }}
                title={t("tripDocuments")}
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
                    {tStatus(trip.status)}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {TRIP_STATUS_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={startEdit}
                title={t("editTripInfo")}
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
                    {tStopType("LOADING")} {loadingStops.length > 1 ? i + 1 : ""}
                  </span>
                  {s.address && <span>{s.address}</span>}
                  {s.ref && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {s.ref}
                    </span>
                  )}
                  {s.coords && <CoordsCell coords={s.coords} />}
                  {formatStopWindow(s) && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatStopWindow(s)}
                    </span>
                  )}
                </div>
              ))}
              {unloadingStops.map((s, i) => (
                <div key={s.id} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 font-medium text-red-500">
                    <MapPin className="h-3 w-3" />
                    {tStopType("UNLOADING")} {unloadingStops.length > 1 ? i + 1 : ""}
                  </span>
                  {s.address && <span>{s.address}</span>}
                  {s.ref && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {s.ref}
                    </span>
                  )}
                  {s.coords && <CoordsCell coords={s.coords} />}
                  {formatStopWindow(s) && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatStopWindow(s)}
                    </span>
                  )}
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
    itemLabel: string,
    sectionTitle: string,
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
            {sectionTitle}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setStops([...stops, emptyStop()])}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t("add")}
          </Button>
        </div>
        {stops.map((stop, i) => (
          <div
            key={i}
            className="rounded-lg border bg-background px-3 py-2 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-[11px] font-medium", color)}>
                {itemLabel} {stops.length > 1 ? i + 1 : ""}
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
              placeholder={tStop("addressPlaceholder")}
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
                placeholder={tStop("refShortPlaceholder")}
                value={stop.ref}
                className="w-28 text-xs h-7"
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], ref: e.target.value };
                  setStops(next);
                }}
              />
              <Input
                placeholder={tStop("coordsPlaceholder")}
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
            <div className="flex flex-wrap items-center gap-1">
              <Input
                type="date"
                value={stop.windowDate}
                aria-label={tStop("date")}
                className="w-[128px] text-xs h-7 px-2"
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], windowDate: e.target.value };
                  setStops(next);
                }}
              />
              <Input
                type="time"
                value={stop.windowStart}
                aria-label={tStop("from")}
                className="w-[100px] text-xs h-7 px-2"
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], windowStart: e.target.value };
                  setStops(next);
                }}
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="time"
                value={stop.windowEnd}
                aria-label={tStop("to")}
                className="w-[100px] text-xs h-7 px-2"
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = { ...next[i], windowEnd: e.target.value };
                  setStops(next);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className="px-2 py-0.5 text-[11px] rounded border hover:bg-accent transition-colors"
                  onClick={() => {
                    const next = [...stops];
                    next[i] = { ...next[i], windowStart: p.value };
                    setStops(next);
                  }}
                >
                  {p.label}
                </button>
              ))}
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
            placeholder={t("orderShortPlaceholder")}
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
            {tActions("cancel")}
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
            {tActions("save")}
          </Button>
        </div>
      </div>
      {editStopSection(
        tStopType("LOADING"),
        t("loadingStops"),
        "text-emerald-600",
        editLoadingStops,
        setEditLoadingStops,
      )}
      {editStopSection(
        tStopType("UNLOADING"),
        t("unloadingStops"),
        "text-red-500",
        editUnloadingStops,
        setEditUnloadingStops,
      )}
      <div className="flex flex-col gap-1 border-t pt-2">
        <Label className="text-xs">{tNewTrip("notesLabel")}</Label>
        <Textarea
          placeholder={tNewTrip("notesPlaceholder")}
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          rows={2}
          className="resize-none text-xs"
        />
      </div>
    </div>
  );
}
