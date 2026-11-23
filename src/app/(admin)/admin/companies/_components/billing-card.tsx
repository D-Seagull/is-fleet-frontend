"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Receipt, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BILLING_STATUSES,
  currentMonth,
  useBilling,
  useUpdateBilling,
  type BillingStatus,
} from "@/hooks/use-admin-billing";

/** Hand-set billing fields of one company (status, price, pilot end, note). */
export function BillingCard({ companyId }: { companyId: string }) {
  const t = useTranslations("admin.billing");
  const { data } = useBilling(currentMonth());
  const company = data?.companies.find((c) => c.id === companyId);
  const update = useUpdateBilling(companyId);

  const [status, setStatus] = useState<BillingStatus>("TRIAL");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [pilotEnd, setPilotEnd] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!company) return;
    setStatus(company.billingStatus);
    setPrice(company.pricePerTruck === null ? "" : String(company.pricePerTruck));
    setCurrency(company.currency);
    setPilotEnd(company.pilotEndsAt ? company.pilotEndsAt.slice(0, 10) : "");
    setNote(company.adminNote ?? "");
  }, [company]);

  if (!company) return null;

  const save = async () => {
    const p = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (p !== null && !Number.isFinite(p)) {
      toast.error(t("saveError"));
      return;
    }
    try {
      await update.mutateAsync({
        billingStatus: status,
        pricePerTruck: p,
        currency: currency.trim().toUpperCase() || "EUR",
        pilotEndsAt: pilotEnd ? new Date(pilotEnd).toISOString() : null,
        adminNote: note.trim() || null,
      });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveError"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          {t("cardTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {/* Saved on click, apart from the form: switching AI is one decision. */}
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5 sm:col-span-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t("aiTitle")}</div>
            <div className="text-xs text-muted-foreground">{t("aiHint")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={company.aiEnabled}
            aria-label={t("aiTitle")}
            disabled={update.isPending}
            onClick={async () => {
              const next = !company.aiEnabled;
              try {
                await update.mutateAsync({ aiEnabled: next });
                toast.success(next ? t("aiOn") : t("aiOff"));
              } catch {
                toast.error(t("saveError"));
              }
            }}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
              company.aiEnabled ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                company.aiEnabled ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
        <div className="space-y-1.5">
          <Label>{t("colStatus")}</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as BillingStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("colPilotEnd")}</Label>
          <Input
            type="date"
            value={pilotEnd}
            onChange={(e) => setPilotEnd(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("colPrice")}</Label>
          <Input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("currency")}</Label>
          <Input
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("colNote")}</Label>
          <Textarea
            rows={2}
            maxLength={1000}
            placeholder={t("notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
