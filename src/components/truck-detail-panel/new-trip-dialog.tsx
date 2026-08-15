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
import { StopRow, emptyStop, type StopRowData } from "./stop-row";
import { extractPostcodeCity } from "./utils";

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
  const [loadingStops, setLoadingStops] = useState<StopRowData[]>([emptyStop()]);
  const [unloadingStops, setUnloadingStops] = useState<StopRowData[]>([
    emptyStop(),
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
        // spread over emptyStop() so drafts saved before the time-window
        // fields existed still get windowDate/windowStart/windowEnd defaults.
        setLoadingStops(
          draft.loadingStops?.length
            ? draft.loadingStops.map((s: Partial<StopRowData>) => ({
                ...emptyStop(),
                ...s,
              }))
            : [emptyStop()],
        );
        setUnloadingStops(
          draft.unloadingStops?.length
            ? draft.unloadingStops.map((s: Partial<StopRowData>) => ({
                ...emptyStop(),
                ...s,
              }))
            : [emptyStop()],
        );
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
        loadingStops,
        unloadingStops,
        isNameEdited: isNameEdited.current,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, tripName, orderNumber, notes, loadingStops, unloadingStops, open]);

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
    const title =
      tripName.trim() ||
      t("tripFallbackName", { date: new Date().toLocaleDateString(locale) });

    const stops: StopFormData[] = [
      ...loadingStops.map((s, i) => ({
        type: "LOADING" as StopType,
        order: i,
        address: s.address || undefined,
        ref: s.ref || undefined,
        coords: s.coords || undefined,
        windowDate: s.windowDate || undefined,
        windowStart: s.windowStart || undefined,
        windowEnd: s.windowEnd || undefined,
      })),
      ...unloadingStops.map((s, i) => ({
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-emerald-600">{t("loadingStops")}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLoadingStops([...loadingStops, emptyStop()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> {t("addStop")}
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
              <Label className="text-red-600">{t("unloadingStops")}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setUnloadingStops([...unloadingStops, emptyStop()])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> {t("addStop")}
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
