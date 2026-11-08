"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { defaultPeriod, useCompanyTrucks } from "@/hooks/use-admin-billing";

const name = (p: { firstName: string; lastName: string | null } | null) =>
  p ? `${p.firstName} ${p.lastName ?? ""}`.trim() : "—";

/** Company trucks: active / inactive and trips in a chosen period. */
export function TrucksCard({ companyId }: { companyId: string }) {
  const t = useTranslations("admin.trucks");
  const [period, setPeriod] = useState(defaultPeriod);
  const { data, isLoading } = useCompanyTrucks(
    companyId,
    period.from,
    period.to,
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" />
          {t("title")}
          {data && (
            <span className="text-sm font-normal text-muted-foreground">
              {t("summary", { active: data.active, inactive: data.inactive })}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Input
            type="date"
            className="w-40"
            value={period.from}
            max={period.to}
            onChange={(e) =>
              e.target.value && setPeriod((p) => ({ ...p, from: e.target.value }))
            }
          />
          –
          <Input
            type="date"
            className="w-40"
            value={period.to}
            min={period.from}
            onChange={(e) =>
              e.target.value && setPeriod((p) => ({ ...p, to: e.target.value }))
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : data.trucks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colPlate")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colDriver")}</TableHead>
                <TableHead>{t("colManager")}</TableHead>
                <TableHead className="text-right">{t("colTrips")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.trucks.map((tr) => (
                <TableRow key={tr.id}>
                  <TableCell className="font-medium">{tr.plate}</TableCell>
                  <TableCell>
                    {tr.isActive ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      >
                        {t("active")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {t("inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{name(tr.driver)}</TableCell>
                  <TableCell>{name(tr.manager)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {tr.trips}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
