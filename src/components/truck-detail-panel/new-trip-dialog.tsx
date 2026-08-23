"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDrivers } from "@/hooks/use-trucks";
import {
  useCreateTrip,
  type Trip,
  type StopType,
  type StopFormData,
} from "@/hooks/use-trips";
import { StopRow, InsertStopButton, emptyStop, type StopRowData } from "./stop-row";
import { extractPostcodeCity } from "./utils";

/** Порядок стопів рейсу з форми у StopFormData для API (order = позиція в списку). */
export function buildStopsPayload(stops: StopRowData[]): StopFormData[] {
  return stops.map((s, i) => ({
    type: s.type,
    order: i,
    name: s.type === "WAYPOINT" ? s.name || undefined : undefined,
    address: s.address || undefined,
    ref: s.ref || undefined,
    coords: s.coords || undefined,
    windowDate: s.windowDate || undefined,
    windowStart: s.windowStart || undefined,
    windowEnd: s.windowEnd || undefined,
  }));
}

export function NewTripDialog({
  truckId,
  defaultDriverId,
  onCreated,
}: {
  truckId: string;
  defaultDriverId?: string | null;
  onCreated?: (trip: Trip) => void;
}) {
  const t = useTranslations("truckPanel.newTrip");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const { data: drivers } = useDrivers();
  const createTrip = useCreateTrip();

  const DRAFT_KEY = `trip-draft-${truckId}`;

  const [driverId, setDriverId] = useState(defaultDriverId ?? "");
  const [tripName, setTripName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [stops, setStops] = useState<StopRowData[]>([
    emptyStop("LOADING"),
    emptyStop("UNLOADING"),
  ]);
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
        // spread over emptyStop() so старі чернетки (без type/name або з двома
        // окремими списками) отримають дефолти нового формату.
        const norm = (s: Partial<StopRowData>, type: StopType): StopRowData => ({
          ...emptyStop(type),
          ...s,
          type: s.type ?? type,
        });
        if (Array.isArray(draft.stops) && draft.stops.length) {
          setStops(draft.stops.map((s: Partial<StopRowData>) => norm(s, "LOADING")));
        } else if (draft.loadingStops || draft.unloadingStops) {
          setStops([
            ...(draft.loadingStops ?? []).map((s: Partial<StopRowData>) =>
              norm(s, "LOADING"),
            ),
            ...(draft.unloadingStops ?? []).map((s: Partial<StopRowData>) =>
              norm(s, "UNLOADING"),
            ),
          ]);
        } else {
          setStops([emptyStop("LOADING"), emptyStop("UNLOADING")]);
        }
        isNameEdited.current = draft.isNameEdited ?? false;
      } else {
        setDriverId(defaultDriverId ?? "");
        setTripName("");
        setOrderNumber("");
        setNotes("");
        setStops([emptyStop("LOADING"), emptyStop("UNLOADING")]);
        isNameEdited.current = false;
      }
    } catch {
      setDriverId(defaultDriverId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // збереження чернетки у localStorage при кожній зміні
  useEffect(() => {
    if (!open) return;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        driverId,
        tripName,
        orderNumber,
        notes,
        stops,
        isNameEdited: isNameEdited.current,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, tripName, orderNumber, notes, stops, open]);

  // авто-заповнення Trip name з адрес (якщо користувач не редагував вручну):
  // перше завантаження → останнє розвантаження.
  useEffect(() => {
    if (isNameEdited.current) return;
    const from = stops.find((s) => s.type === "LOADING")?.address;
    const to = [...stops].reverse().find((s) => s.type === "UNLOADING")?.address;
    const fromShort = from ? extractPostcodeCity(from) : "";
    const toShort = to ? extractPostcodeCity(to) : "";
    if (fromShort || toShort) {
      setTripName([fromShort, toShort].filter(Boolean).join(" → "));
    } else {
      setTripName("");
    }
  }, [stops]);

  function updateStop(idx: number, val: StopRowData) {
    setStops((prev) => prev.map((s, i) => (i === idx ? val : s)));
  }

  function removeStop(idx: number) {
    setStops((prev) => prev.filter((_, i) => i !== idx));
  }

  function insertStop(idx: number, type: StopType) {
    setStops((prev) => {
      const next = [...prev];
      next.splice(idx, 0, emptyStop(type));
      return next;
    });
  }

  function moveStop(idx: number, dir: -1 | 1) {
    setStops((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function handleCreate() {
    if (!driverId) return;
    const title =
      tripName.trim() ||
      t("tripFallbackName", { date: new Date().toLocaleDateString(locale) });

    const trip = await createTrip.mutateAsync({
      title,
      driverId,
      truckId,
      notes: notes || undefined,
      orderNumber: orderNumber || undefined,
      stops: buildStopsPayload(stops),
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
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <Label>{t("driverLabel")}</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectDriver")} />
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
              <Label>{t("tripNameLabel")}</Label>
              <span className="text-[11px] text-muted-foreground">
                {t("tripNameHint")}
              </span>
            </div>
            <Input
              placeholder={t("tripNamePlaceholder")}
              value={tripName}
              onChange={(e) => {
                isNameEdited.current = true;
                setTripName(e.target.value);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("orderNumberLabel")}</Label>
            <Input
              placeholder={t("orderNumberPlaceholder")}
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>

          {/* Маршрут — упорядкований список стопів; «+» вставляє між пунктами */}
          <div className="flex flex-col gap-2">
            <Label>{t("routeLabel")}</Label>
            {stops.map((stop, i) => (
              <div key={i} className="flex flex-col gap-2">
                <InsertStopButton onInsert={(type) => insertStop(i, type)} />
                <StopRow
                  index={i}
                  value={stop}
                  onChange={(v) => updateStop(i, v)}
                  onRemove={() => removeStop(i)}
                  canRemove={stops.length > 1}
                  onMoveUp={() => moveStop(i, -1)}
                  onMoveDown={() => moveStop(i, 1)}
                  canMoveUp={i > 0}
                  canMoveDown={i < stops.length - 1}
                />
              </div>
            ))}
            <InsertStopButton onInsert={(type) => insertStop(stops.length, type)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("notesLabel")}</Label>
            <Textarea
              placeholder={t("notesPlaceholder")}
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
            {t("createButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
