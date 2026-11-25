"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { currentMonth, useUpdateBilling } from "@/hooks/use-admin-billing";
import { useAiUsage, usd } from "@/hooks/use-admin-ai-usage";

/**
 * AI for one company (admin): the on/off switch, the price per AI-created
 * trip, and the month's numbers — requests, AI trips, tokens, what it cost
 * us and what the company owes. Shown for every company, the admin's own
 * included (the billing card leaves that one out).
 */
export function AiCard({ companyId }: { companyId: string }) {
  const t = useTranslations("admin.ai");
  const locale = useLocale();
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading } = useAiUsage(month);
  const row = data?.companies.find((c) => c.companyId === companyId);
  const update = useUpdateBilling(companyId);
  // null = the input shows the saved price; a string = being edited.
  const [priceDraft, setPriceDraft] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (!row) return null;

  const price =
    priceDraft ??
    (row.aiPricePerTrip === null ? "" : String(row.aiPricePerTrip));

  const toggle = async () => {
    const next = !row.aiEnabled;
    try {
      await update.mutateAsync({ aiEnabled: next });
      toast.success(next ? t("on") : t("off"));
    } catch {
      toast.error(t("saveError"));
    }
  };

  const savePrice = async () => {
    const v = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      toast.error(t("saveError"));
      return;
    }
    try {
      await update.mutateAsync({ aiPricePerTrip: v });
      setPriceDraft(null);
      toast.success(t("priceSaved"));
    } catch {
      toast.error(t("saveError"));
    }
  };

  const num = (n: number) => n.toLocaleString(locale);
  const stats: { label: string; value: string; hint?: string }[] = [
    {
      label: t("requests"),
      value: num(row.requests),
      hint: row.failed ? t("failed", { count: row.failed }) : undefined,
    },
    { label: t("aiTrips"), value: num(row.aiTrips) },
    {
      label: t("tokens"),
      value: num(row.inputTokens + row.outputTokens),
      hint: t("tokensSplit", {
        input: num(row.inputTokens),
        output: num(row.outputTokens),
      }),
    },
    { label: t("cost"), value: usd(row.costUsd, locale) },
    {
      label: t("revenue"),
      value: row.revenueUsd === null ? "—" : usd(row.revenueUsd, locale),
      hint: row.revenueUsd === null ? t("noPrice") : undefined,
    },
    {
      label: t("margin"),
      value: row.marginUsd === null ? "—" : usd(row.marginUsd, locale),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("cardTitle")}
        </CardTitle>
        <Input
          type="month"
          value={month}
          max={currentMonth()}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="w-40"
          aria-label={t("month")}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-lg border px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t("switchTitle")}</div>
              <div className="text-xs text-muted-foreground">
                {t("switchHint")}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={row.aiEnabled}
              aria-label={t("switchTitle")}
              disabled={update.isPending}
              onClick={toggle}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
                row.aiEnabled ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                  row.aiEnabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
          <div className="space-y-1.5">
            <Label>{t("pricePerTrip")}</Label>
            <div className="flex gap-2">
              <Input
                inputMode="decimal"
                className="w-32"
                placeholder="0.50"
                value={price}
                onChange={(e) => setPriceDraft(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={savePrice}
                disabled={update.isPending || priceDraft === null}
              >
                {t("save")}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-lg font-semibold tabular-nums">
                {s.value}
              </div>
              {s.hint && (
                <div className="text-[11px] text-muted-foreground">
                  {s.hint}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("footnote")}</p>
      </CardContent>
    </Card>
  );
}
