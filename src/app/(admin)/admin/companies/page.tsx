"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Building2, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { currentMonth, useBilling } from "@/hooks/use-admin-billing";
import { NewCompanyDialog } from "./_components/new-company-dialog";
import { BillingStatusBadge } from "./_components/billing-status-badge";

const COLS = 10;

/**
 * Companies for invoicing: hand-set status / price / pilot end / note, plus
 * the month's paid trucks (a truck with at least one trip that month),
 * drivers, managers and the resulting amount.
 */
export default function CompaniesPage() {
  const t = useTranslations("admin.companies");
  const tNew = useTranslations("admin.newCompany");
  const tB = useTranslations("admin.billing");
  const locale = useLocale();
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading, isError } = useBilling(month);
  const companies = data?.companies;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies ?? [];
    return (companies ?? []).filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    let trucks = 0;
    for (const c of filtered) {
      trucks += c.paidTrucks;
      if (c.amount !== null) {
        byCurrency.set(c.currency, (byCurrency.get(c.currency) ?? 0) + c.amount);
      }
    }
    return { trucks, byCurrency };
  }, [filtered]);

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  const href = (id: string) => `/admin/companies/${id}`;

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <span className="text-muted-foreground text-sm ml-1">
            ({companies?.length ?? 0})
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {tB("month")}
            <Input
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="w-40"
            />
          </label>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <NewCompanyDialog />
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{tB("trucksHint")}</p>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      )}

      {isError && <div className="text-destructive text-sm">{t("error")}</div>}

      {!isLoading && !isError && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{tB("colStatus")}</TableHead>
              <TableHead className="text-right">{tB("colTrucks")}</TableHead>
              <TableHead className="text-right">{tB("colDrivers")}</TableHead>
              <TableHead className="text-right">{tB("colManagers")}</TableHead>
              <TableHead className="text-right">{tB("colPrice")}</TableHead>
              <TableHead className="text-right">{tB("colAmount")}</TableHead>
              <TableHead>{tB("colPilotEnd")}</TableHead>
              <TableHead>{tB("colNote")}</TableHead>
              <TableHead>{t("colDate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">
                  <Link href={href(c.id)} className="block">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={href(c.id)} className="block">
                    <BillingStatusBadge status={c.billingStatus} />
                  </Link>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Link href={href(c.id)} className="block">
                    {c.paidTrucks}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={href(c.id)} className="block">
                    {c.drivers}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={href(c.id)} className="block">
                    {c.managers}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={href(c.id)} className="block">
                    {c.pricePerTruck === null
                      ? "—"
                      : money(c.pricePerTruck, c.currency)}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Link href={href(c.id)} className="block">
                    {c.amount === null ? "—" : money(c.amount, c.currency)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={href(c.id)} className="block">
                    {c.pilotEndsAt
                      ? new Date(c.pilotEndsAt).toLocaleDateString(locale)
                      : "—"}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground">
                  <Link href={href(c.id)} className="block truncate">
                    {c.adminNote ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={href(c.id)} className="block">
                    {new Date(c.createdAt).toLocaleDateString(locale)}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {companies?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={COLS}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("emptyHint", { button: tNew("button") })}
                </TableCell>
              </TableRow>
            )}
            {companies && companies.length > 0 && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={COLS}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("noResults", { query })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{tB("total")}</TableCell>
                <TableCell className="text-right">{totals.trucks}</TableCell>
                <TableCell colSpan={3} />
                <TableCell colSpan={5} className="text-right">
                  {[...totals.byCurrency]
                    .map(([cur, sum]) => money(sum, cur))
                    .join(" · ") || "—"}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </div>
  );
}
