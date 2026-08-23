"use client";

import { useState, useEffect, useRef } from "react";
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MapPin,
  Hash,
  Clock,
  Loader2,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusDot } from "@/components/status-dot";
import { cn } from "@/lib/utils";
import {
  useUpdateTripInfo,
  useUpdateTripStatus,
  useDeleteTrip,
  TRIP_STATUS_COLORS,
  TRIP_STATUS_KEYS,
  type Trip,
  type TripStatus,
  type StopType,
} from "@/hooks/use-trips";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/components/confirm-dialog";
import {
  StopRow,
  InsertStopButton,
  emptyStop,
  stopTypeColor,
  todayLocal,
  type StopRowData,
} from "./stop-row";
import { buildStopsPayload } from "./new-trip-dialog";
import { CoordsCell } from "./coords-cell";
import { shortenTripTitle, formatStopWindow, extractPostcodeCity } from "./utils";

/** Назва рейсу з адрес: перше завантаження → останнє розвантаження. */
function deriveTripTitle(rows: StopRowData[]): string {
  const from = rows.find((s) => s.type === "LOADING")?.address;
  const to = [...rows].reverse().find((s) => s.type === "UNLOADING")?.address;
  const fromShort = from ? extractPostcodeCity(from) : "";
  const toShort = to ? extractPostcodeCity(to) : "";
  return [fromShort, toShort].filter(Boolean).join(" → ");
}

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
  const tActions = useTranslations("common.actions");
  const tTrips = useTranslations("trips");
  const updateInfo = useUpdateTripInfo(truckId);
  const updateStatus = useUpdateTripStatus(truckId);
  const deleteTrip = useDeleteTrip();
  const confirm = useConfirm();
  const role = useAuthStore((s) => s.user?.role);
  const canDelete =
    role === "ADMIN" || role === "TEAMLEAD" || role === "MANAGER";
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const [editStops, setEditStops] = useState<StopRowData[]>([]);
  const [editTitle, setEditTitle] = useState(trip.title ?? "");
  const [editNotes, setEditNotes] = useState(trip.notes ?? "");
  const [editOrderNumber, setEditOrderNumber] = useState(trip.orderNumber ?? "");
  // назва редагована вручну → не перезаписуємо автоматично з адрес
  const isTitleEdited = useRef(false);

  // автозаповнення назви з адрес поки користувач не редагував її вручну
  useEffect(() => {
    if (!editing || isTitleEdited.current) return;
    setEditTitle(deriveTripTitle(editStops));
  }, [editStops, editing]);

  const isEdited = trip.updatedAt !== trip.createdAt;
  // stops приходять із бекенду вже відсортовані за order (єдиний маршрут).
  const stops = trip.stops;

  function stopLabel(s: Trip["stops"][number]): string {
    if (s.type === "WAYPOINT") return s.name || tStopType("WAYPOINT");
    return tStopType(s.type);
  }

  function startEdit() {
    const toRow = (s: Trip["stops"][number]): StopRowData => ({
      type: s.type,
      name: s.name ?? "",
      address: s.address ?? "",
      ref: s.ref ?? "",
      coords: s.coords ?? "",
      windowDate: s.windowDate ?? todayLocal(),
      windowStart: s.windowStart ?? "00:00",
      windowEnd: s.windowEnd ?? "00:00",
    });
    const rows = stops.length
      ? stops.map(toRow)
      : [emptyStop("LOADING"), emptyStop("UNLOADING")];
    setEditStops(rows);
    // якщо поточна назва збігається з автогенерованою — вважаємо її авто (оновлюємо
    // при зміні адрес); якщо відрізняється — це ручна назва, зберігаємо як є.
    isTitleEdited.current =
      !!trip.title && trip.title !== deriveTripTitle(rows);
    setEditTitle(trip.title ?? "");
    setEditNotes(trip.notes ?? "");
    setEditOrderNumber(trip.orderNumber ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    await updateInfo.mutateAsync({
      id: trip.id,
      title: editTitle.trim() || undefined,
      notes: editNotes || undefined,
      orderNumber: editOrderNumber || undefined,
      stops: buildStopsPayload(editStops),
    });
    setEditing(false);
  }

  function updateStop(idx: number, val: StopRowData) {
    setEditStops((prev) => prev.map((s, i) => (i === idx ? val : s)));
  }
  function removeStop(idx: number) {
    setEditStops((prev) => prev.filter((_, i) => i !== idx));
  }
  function insertStop(idx: number, type: StopType) {
    setEditStops((prev) => {
      const next = [...prev];
      next.splice(idx, 0, emptyStop(type));
      return next;
    });
  }
  function moveStop(idx: number, dir: -1 | 1) {
    setEditStops((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: tTrips("deleteConfirm", { title: trip.title }),
      description: tTrips("deleteConfirmDesc"),
      confirmText: tActions("delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTrip.mutateAsync(trip.id);
      toast.success(tTrips("deleteSuccess"));
    } catch {
      toast.error(tTrips("deleteError"));
    }
  }

  return (
    <>
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
              {stops.map((s) => (
                <div key={s.id} className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "flex items-center gap-1 font-medium",
                      stopTypeColor(s.type),
                    )}
                  >
                    <MapPin className="h-3 w-3" />
                    {stopLabel(s)}
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

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col gap-3">
          <DialogHeader>
            <DialogTitle>{t("editTripInfo")}</DialogTitle>
          </DialogHeader>
      <div className="flex flex-col gap-3">
        {/* Назва рейсу (автозаповнення з адрес · редагується вручну) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Label className="text-xs">{tNewTrip("tripNameLabel")}</Label>
            <span className="text-[11px] text-muted-foreground">
              {tNewTrip("tripNameHint")}
            </span>
          </div>
          <Input
            placeholder={tNewTrip("tripNamePlaceholder")}
            value={editTitle}
            onChange={(e) => {
              isTitleEdited.current = true;
              setEditTitle(e.target.value);
            }}
            className="h-8 text-sm"
          />
        </div>
        {/* № замовлення */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{tNewTrip("orderNumberLabel")}</Label>
          <Input
            placeholder={t("orderShortPlaceholder")}
            value={editOrderNumber}
            onChange={(e) => setEditOrderNumber(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        {/* кнопки — видалити / скасувати / зберегти разом справа */}
        <div className="flex items-center justify-end gap-2">
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteTrip.isPending}
            >
              {deleteTrip.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              {tActions("delete")}
            </Button>
          )}
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

      {/* Маршрут — упорядкований список стопів; «+» вставляє між пунктами */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{tNewTrip("routeLabel")}</Label>
        <div className="flex flex-col gap-2">
          {editStops.map((stop, i) => (
            <div key={i} className="flex flex-col gap-2">
              <InsertStopButton onInsert={(type) => insertStop(i, type)} />
              <StopRow
                index={i}
                value={stop}
                onChange={(v) => updateStop(i, v)}
                onRemove={() => removeStop(i)}
                canRemove={editStops.length > 1}
                onMoveUp={() => moveStop(i, -1)}
                onMoveDown={() => moveStop(i, 1)}
                canMoveUp={i > 0}
                canMoveDown={i < editStops.length - 1}
              />
            </div>
          ))}
          <InsertStopButton onInsert={(type) => insertStop(editStops.length, type)} />
        </div>
      </div>

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
        </DialogContent>
      </Dialog>
    </>
  );
}
