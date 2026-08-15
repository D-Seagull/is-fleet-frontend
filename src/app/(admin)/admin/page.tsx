"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  Users,
  Wifi,
  Truck as TruckIcon,
  Loader2,
  Clock,
  CheckCircle2,
  MailWarning,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAdminStats } from "@/hooks/use-admin-stats";

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const locale = useLocale();
  const { data, isLoading, isError } = useAdminStats();

  return (
    <div className="p-6 w-full max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isError && (
        <div className="text-destructive text-sm">{t("errorStats")}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t("kpiCompanies")}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          value={data?.companies.total}
          subline={
            data
              ? t("kpiCompaniesSub", {
                  active: data.companies.active,
                  deactivated: data.companies.deactivated,
                })
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title={t("kpiUsers")}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          value={data?.users.total}
          subline={
            data
              ? t("kpiUsersSub", {
                  drivers: data.users.byRole.DRIVER,
                  managers: data.users.byRole.MANAGER,
                })
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title={t("kpiOnline")}
          icon={<Wifi className="h-4 w-4 text-emerald-500" />}
          value={
            data ? data.onlineNow.drivers + data.onlineNow.managers : undefined
          }
          subline={
            data
              ? t("kpiOnlineSub", {
                  drivers: data.onlineNow.drivers,
                  managers: data.onlineNow.managers,
                })
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title={t("kpiActiveTrips")}
          icon={<TruckIcon className="h-4 w-4 text-muted-foreground" />}
          value={data?.activeTrips}
          subline={t("kpiActiveTripsSub")}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            {t("recentTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : data && data.recentCompanies.length > 0 ? (
            <ul className="divide-y">
              {data.recentCompanies.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {" · "}
                          {t("usersCount", { count: c.usersCount })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.awaitingInvite ? (
                        <Badge variant="secondary" className="gap-1">
                          <MailWarning className="h-3 w-3" />
                          {t("awaitingTeamlead")}
                        </Badge>
                      ) : c.isActive ? (
                        <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("statusActive")}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          {t("statusDeactivated")}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {t("empty")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  icon,
  value,
  subline,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  value: number | undefined;
  subline?: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading || value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
        {subline && (
          <p className="text-xs text-muted-foreground mt-1">{subline}</p>
        )}
      </CardContent>
    </Card>
  );
}
