"use client";

import { useState } from "react";
import { Loader2, Lock, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSaveTripFinance,
  useTripFinance,
  type OrderFinance,
  type TripFinanceData,
} from "@/hooks/use-order-import";

/** The form keeps strings (what the inputs hold); the API takes numbers / null. */
export interface FinanceFormData {
  freightRate: string;
  currency: string;
  loadedKm: string;
  emptyKm: string;
  tolls: string;
}

export const emptyFinance = (): FinanceFormData => ({
  freightRate: "",
  currency: "EUR",
  loadedKm: "",
  emptyKm: "",
  tolls: "",
});

const str = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

export function financeToForm(
  f: OrderFinance | null | undefined,
): FinanceFormData {
  return {
    freightRate: str(f?.freightRate),
    currency: f?.currency || "EUR",
    loadedKm: str(f?.loadedKm),
    emptyKm: str(f?.emptyKm),
    tolls: str(f?.tolls),
  };
}

/** "1 451,30" / "1451.30" → 1451.3; blank or junk → null. */
function num(v: string, whole = false): number | null {
  const clean = v.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0) return null;
  return whole ? Math.round(n) : Math.round(n * 100) / 100;
}

export function financePayload(f: FinanceFormData): OrderFinance {
  const currency = f.currency.trim().toUpperCase();
  return {
    freightRate: num(f.freightRate),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : null,
    loadedKm: num(f.loadedKm, true),
    emptyKm: num(f.emptyKm, true),
    tolls: num(f.tolls),
  };
}

/** Anything worth saving (a currency alone is not). */
export function hasFinance(f: FinanceFormData): boolean {
  const p = financePayload(f);
  return [p.freightRate, p.loadedKm, p.emptyKm, p.tolls].some(
    (v) => v !== null,
  );
}

/** Freight / km / tolls inputs, with the "managers only" mark. */
export function FinanceFields({
  value,
  onChange,
}: {
  value: FinanceFormData;
  onChange: (v: FinanceFormData) => void;
}) {
  const t = useTranslations("truckPanel.finance");
  const set =
    (key: keyof FinanceFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [key]: e.target.value });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label>{t("title")}</Label>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          {t("managersOnly")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1.5fr]">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t("freightRate")}
          </span>
          <div className="flex gap-1">
            <Input
              inputMode="decimal"
              value={value.freightRate}
              onChange={set("freightRate")}
              placeholder="1451.30"
            />
            <Input
              className="w-16 uppercase"
              maxLength={3}
              value={value.currency}
              onChange={set("currency")}
              aria-label={t("currency")}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t("loadedKm")}
          </span>
          <Input
            inputMode="numeric"
            value={value.loadedKm}
            onChange={set("loadedKm")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t("emptyKm")}
          </span>
          <Input
            inputMode="numeric"
            value={value.emptyKm}
            onChange={set("emptyKm")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t("tolls")}
          </span>
          <Input
            inputMode="decimal"
            value={value.tolls}
            onChange={set("tolls")}
          />
        </div>
      </div>
    </div>
  );
}

/** Read-only line: "1 451,30 EUR · 1264 km + 240 empty · tolls 368,42". */
function summary(
  f: TripFinanceData,
  locale: string,
  t: ReturnType<typeof useTranslations>,
): string {
  const money = (v: number) =>
    v.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const parts: string[] = [];
  if (f.freightRate !== null)
    parts.push(`${money(f.freightRate)} ${f.currency ?? ""}`.trim());
  if (f.loadedKm !== null || f.emptyKm !== null) {
    const km = [
      f.loadedKm !== null ? t("kmLoaded", { km: f.loadedKm }) : null,
      f.emptyKm !== null ? t("kmEmpty", { km: f.emptyKm }) : null,
    ].filter(Boolean);
    parts.push(km.join(" + "));
  }
  if (f.tolls !== null) parts.push(t("tollsValue", { value: money(f.tolls) }));
  return parts.join(" · ");
}

/** The trip card's money line (managers only): view, add or edit. */
export function TripFinanceSection({ tripId }: { tripId: string }) {
  const t = useTranslations("truckPanel.finance");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const { data, isLoading } = useTripFinance(tripId);
  const save = useSaveTripFinance(tripId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FinanceFormData>(emptyFinance());

  if (isLoading) return null;

  const line = data ? summary(data, locale, t) : "";

  if (editing) {
    return (
      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        <FinanceFields value={form} onChange={setForm} />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {tActions("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync(financePayload(form));
                setEditing(false);
              } catch {
                toast.error(t("saveFailed"));
              }
            }}
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {tActions("save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-1.5 text-xs text-muted-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      <Lock className="mt-0.5 h-3 w-3 shrink-0" />
      {line ? (
        <span className="min-w-0 flex-1 break-words">{line}</span>
      ) : (
        <span className="min-w-0 flex-1">{t("none")}</span>
      )}
      <button
        className="shrink-0 rounded p-0.5 hover:bg-muted hover:text-foreground"
        onClick={() => {
          setForm(financeToForm(data));
          setEditing(true);
        }}
        title={line ? t("edit") : t("add")}
      >
        {line ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </button>
    </div>
  );
}
