"use client";

import Link from "next/link";
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
  const { data, isLoading, isError } = useAdminStats();

  return (
    <div className="p-6 w-full max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Огляд</h1>
        <p className="text-sm text-muted-foreground">
          Ключові показники по всіх компаніях
        </p>
      </div>

      {isError && (
        <div className="text-destructive text-sm">
          Помилка завантаження статистики
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Компаній"
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          value={data?.companies.total}
          subline={
            data
              ? `${data.companies.active} активних · ${data.companies.deactivated} деактивованих`
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title="Юзерів усього"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          value={data?.users.total}
          subline={
            data
              ? `${data.users.byRole.DRIVER} водіїв · ${data.users.byRole.MANAGER} менеджерів`
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title="Онлайн"
          icon={<Wifi className="h-4 w-4 text-emerald-500" />}
          value={
            data ? data.onlineNow.drivers + data.onlineNow.managers : undefined
          }
          subline={
            data
              ? `${data.onlineNow.drivers} водіїв · ${data.onlineNow.managers} менеджерів`
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title="Активних поїздок"
          icon={<TruckIcon className="h-4 w-4 text-muted-foreground" />}
          value={data?.activeTrips}
          subline="У процесі виконання"
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Останні реєстрації
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Завантаження...
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
                          {new Date(c.createdAt).toLocaleDateString("uk-UA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {" · "}
                          {c.usersCount}{" "}
                          {c.usersCount === 1 ? "юзер" : "юзерів"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.awaitingInvite ? (
                        <Badge variant="secondary" className="gap-1">
                          <MailWarning className="h-3 w-3" />
                          Чекає TeamLead-а
                        </Badge>
                      ) : c.isActive ? (
                        <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Активна
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Деактивована</Badge>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Компаній ще немає
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
