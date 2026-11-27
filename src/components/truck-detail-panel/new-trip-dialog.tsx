"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Loader2, RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/confirm-dialog";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import axios from "axios";
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
import {
  StopRow,
  InsertStopButton,
  emptyStop,
  type StopRowData,
} from "./stop-row";
import { extractPostcodeCity } from "./utils";
import {
  useOrderImportStatus,
  uploadTripOrder,
  saveTripFinance,
  useInvalidateTripOrder,
  type OrderDraft,
} from "@/hooks/use-order-import";
import {
  OrderImportBox,
  OrderDraftNotice,
  OrderPreview,
  StopReviewNote,
  type OrderSourceInput,
} from "./order-import";
import {
  FinanceFields,
  emptyFinance,
  financePayload,
  financeToForm,
  hasFinance,
  type FinanceFormData,
} from "./trip-finance";

/** The server's own (translated) error text, when it sent one. */
function serverMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const message = (err.response?.data as { message?: unknown })?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string")
    return message[0];
  return err.message || null;
}

/** Draft stops from an order -> form rows. Missing values stay empty, never guessed. */
function draftToStops(draft: OrderDraft): StopRowData[] {
  return draft.stops.map((s) => ({
    ...emptyStop(s.type),
    name: s.name ?? "",
    address: s.address ?? "",
    ref: s.ref ?? "",
    windowDate: s.windowDate ?? "",
    windowStart: s.windowStart ?? "",
    windowEnd: s.windowEnd ?? "",
    page: s.page,
    review: s.needsReview ? { note: s.reviewNote, page: s.page } : null,
  }));
}

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
  const { data: importStatus } = useOrderImportStatus();
  const invalidateTripOrder = useInvalidateTripOrder();
  const tOrder = useTranslations("truckPanel.newTrip.fromOrder");
  const tFinance = useTranslations("truckPanel.finance");
  const confirm = useConfirm();

  const DRAFT_KEY = `trip-draft-${truckId}`;

  const [driverId, setDriverId] = useState(defaultDriverId ?? "");
  const [tripName, setTripName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [finance, setFinance] = useState<FinanceFormData>(emptyFinance());
  const [stops, setStops] = useState<StopRowData[]>([
    emptyStop("LOADING"),
    emptyStop("UNLOADING"),
  ]);
  const isNameEdited = useRef(false);
  // "Fill from order": the file / text the draft came from (preview + upload
  // on create; not kept in the localStorage draft), its warnings, the page
  // shown next to the form, and the create's idempotency key.
  const [orderSource, setOrderSource] = useState<OrderSourceInput | null>(null);
  const [orderWarnings, setOrderWarnings] = useState<string[]>([]);
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [importKey, setImportKey] = useState<string | null>(null);
  // Bumped by "Reset" to remount the form, so inputs that keep their own
  // state (the order import box, address search) start empty too.
  const [formKey, setFormKey] = useState(0);

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
        setFinance({ ...emptyFinance(), ...(draft.finance ?? {}) });
        // spread over emptyStop() so старі чернетки (без type/name або з двома
        // окремими списками) отримають дефолти нового формату.
        const norm = (
          s: Partial<StopRowData>,
          type: StopType,
        ): StopRowData => ({
          ...emptyStop(type),
          ...s,
          type: s.type ?? type,
        });
        if (Array.isArray(draft.stops) && draft.stops.length) {
          setStops(
            draft.stops.map((s: Partial<StopRowData>) => norm(s, "LOADING")),
          );
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
        setImportKey(draft.importKey ?? null);
      } else {
        setDriverId(defaultDriverId ?? "");
        setTripName("");
        setOrderNumber("");
        setNotes("");
        setFinance(emptyFinance());
        setStops([emptyStop("LOADING"), emptyStop("UNLOADING")]);
        isNameEdited.current = false;
        setImportKey(null);
      }
      setOrderSource(null);
      setOrderWarnings([]);
      setPreviewPage(null);
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
        finance,
        stops,
        isNameEdited: isNameEdited.current,
        importKey,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, tripName, orderNumber, notes, finance, stops, importKey, open]);

  function applyOrderDraft(draft: OrderDraft, source: OrderSourceInput) {
    if (draft.orderNumber) setOrderNumber(draft.orderNumber);
    if (draft.notes) setNotes(draft.notes);
    if (draft.finance) {
      const f = financeToForm(draft.finance);
      if (hasFinance(f)) setFinance(f);
    }
    if (draft.stops.length) {
      isNameEdited.current = false; // the name follows the new addresses
      setStops(draftToStops(draft));
    }
    setOrderSource(source);
    setOrderWarnings(draft.warnings);
    setPreviewPage(draft.stops.find((s) => s.page)?.page ?? null);
    setImportKey(crypto.randomUUID());
  }

  function resetOrder() {
    setOrderSource(null);
    setOrderWarnings([]);
    setPreviewPage(null);
    setImportKey(null);
  }

  /** "Reset": empty form + forget the saved draft, after a confirm. */
  async function handleResetForm() {
    const ok = await confirm({
      title: t("resetConfirm"),
      description: t("resetConfirmDesc"),
      confirmText: t("resetButton"),
      destructive: true,
    });
    if (!ok) return;
    localStorage.removeItem(DRAFT_KEY);
    setDriverId(defaultDriverId ?? "");
    setTripName("");
    setOrderNumber("");
    setNotes("");
    setFinance(emptyFinance());
    setStops([emptyStop("LOADING"), emptyStop("UNLOADING")]);
    isNameEdited.current = false;
    resetOrder();
    setFormKey((k) => k + 1);
  }

  // авто-заповнення Trip name з адрес (якщо користувач не редагував вручну):
  // перше завантаження → останнє розвантаження.
  useEffect(() => {
    if (isNameEdited.current) return;
    const from = stops.find((s) => s.type === "LOADING")?.address;
    const to = [...stops]
      .reverse()
      .find((s) => s.type === "UNLOADING")?.address;
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
      importKey: importKey ?? undefined,
    });
    // Freight / km / tolls: their own managers-only table, saved after the
    // trip exists — a failure is a warning, the trip is already made.
    if (hasFinance(finance)) {
      try {
        await saveTripFinance(trip.id, financePayload(finance));
      } catch (err) {
        console.error("trip finance save failed", err);
        toast.error(tFinance("saveFailed"), {
          description: serverMessage(err) ?? undefined,
        });
      }
    }
    // The order file goes with the trip (managers only). The trip already
    // exists, so a failed upload is a warning, not a failed create.
    if (orderSource && "file" in orderSource) {
      try {
        await uploadTripOrder(trip.id, orderSource.file);
        void invalidateTripOrder(trip.id);
      } catch (err) {
        // Say why (too large, type refused…): "not saved" alone left us guessing.
        console.error("order file upload failed", err);
        toast.error(tOrder("uploadFailed"), {
          description: serverMessage(err) ?? undefined,
        });
      }
    }
    localStorage.removeItem(DRAFT_KEY);
    setOpen(false);
    onCreated?.(trip);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-[42px] rounded-full px-5 font-semibold">
          <Plus className="h-4 w-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={
          orderSource
            ? "max-h-[92vh] w-[95vw] max-w-[1400px] overflow-y-auto sm:max-w-[1400px]"
            : "max-w-4xl max-h-[90vh] overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div
          key={formKey}
          className={
            orderSource
              ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              : undefined
          }
        >
          {orderSource && (
            <div className="lg:sticky lg:top-0 lg:h-[78vh]">
              <OrderPreview source={orderSource} page={previewPage} />
            </div>
          )}
          <div className="flex flex-col gap-5 py-2">
            {importStatus?.enabled &&
              (orderSource ? (
                <OrderDraftNotice
                  sourceName={
                    "file" in orderSource
                      ? orderSource.file.name
                      : tOrder("pastedText")
                  }
                  warnings={orderWarnings}
                  onReset={resetOrder}
                />
              ) : (
                <OrderImportBox driverId={driverId} onDraft={applyOrderDraft} />
              ))}

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
                  {stop.review && (
                    <StopReviewNote
                      note={stop.review.note}
                      page={stop.review.page}
                      onShowPage={
                        orderSource && "file" in orderSource
                          ? setPreviewPage
                          : undefined
                      }
                      onDismiss={() => updateStop(i, { ...stop, review: null })}
                    />
                  )}
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
              <InsertStopButton
                onInsert={(type) => insertStop(stops.length, type)}
              />
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

            <FinanceFields value={finance} onChange={setFinance} />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForm}
                disabled={createTrip.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {t("resetButton")}
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={!driverId || createTrip.isPending}
              >
                {createTrip.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("createButton")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
