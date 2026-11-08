"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SILENT_DAYS, useCompanyUsage } from "@/hooks/use-admin-billing";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Pilot evidence for one company: how much the drivers use the product. */
export function UsageCard({ companyId }: { companyId: string }) {
  const t = useTranslations("admin.usage");
  const locale = useLocale();
  const [days, setDays] = useState(30);
  const { data, isLoading } = useCompanyUsage(companyId, days);
  // "Now" is taken once, when the card opens (Date.now() can't run in render).
  const [now] = useState(() => Date.now());

  const silentDays = data?.lastActivityAt
    ? Math.floor((now - new Date(data.lastActivityAt).getTime()) / 86_400_000)
    : null;
  const silent = silentDays === null || silentDays >= SILENT_DAYS;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("period")}
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[7, 30, 90].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {t("daysN", { n: d })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading || !data ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label={t("driverStatus")}
                value={
                  data.driverStatusShare === null
                    ? "—"
                    : `${Math.round(data.driverStatusShare * 100)}%`
                }
                sub={t("driverStatusSub", {
                  a: data.driverStatusTrips,
                  b: data.statusTrips,
                })}
              />
              <Stat
                label={t("documents")}
                value={String(data.documents)}
                sub={t("tripsSub", { n: data.trips })}
              />
              <Stat
                label={t("active7d")}
                value={`${data.drivers.activeLast7d} / ${data.drivers.total}`}
              />
              <Stat
                label={t("lastActivity")}
                value={
                  data.lastActivityAt
                    ? new Date(data.lastActivityAt).toLocaleDateString(locale)
                    : "—"
                }
                sub={silent ? t("silent") : undefined}
              />
            </div>
            {data.drivers.neverSignedIn.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-medium">
                  {t("neverSignedIn", { n: data.drivers.neverSignedIn.length })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("neverHint")}
                </div>
                <ul className="mt-2 divide-y rounded-lg border text-sm">
                  {data.drivers.neverSignedIn.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="font-medium">
                        {`${d.firstName} ${d.lastName ?? ""}`.trim()}
                      </span>
                      <span className="text-muted-foreground">
                        {d.phone ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
