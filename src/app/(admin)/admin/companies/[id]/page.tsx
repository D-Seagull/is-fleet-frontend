"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Users,
  Wifi,
  Truck as TruckIcon,
  Route,
  Bell,
  Mail,
  Loader2,
  MailPlus,
  Power,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminCompany,
  useDeactivateCompany,
  useResendCompanyInvite,
} from "@/hooks/use-admin-company";
import type { AdminCompanyUser, Role } from "@/hooks/use-admin-company";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Адмін",
  TEAMLEAD: "TeamLead",
  MANAGER: "Менеджер",
  DRIVER: "Водій",
};

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, isLoading, isError } = useAdminCompany(id);

  return (
    <div className="p-6 w-full max-w-6xl mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            До дашборду
          </Link>
        </Button>

        {isError && (
          <div className="text-destructive text-sm">
            Помилка завантаження компанії
          </div>
        )}

        <CompanyHeader data={data} isLoading={isLoading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Юзерів"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          value={data?.counts.usersTotal}
          subline={
            data
              ? `${data.counts.usersByRole.DRIVER} водіїв · ${data.counts.usersByRole.MANAGER} менеджерів · ${data.counts.usersByRole.TEAMLEAD} TeamLead`
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title="Онлайн"
          icon={<Wifi className="h-4 w-4 text-emerald-500" />}
          value={
            data
              ? data.counts.onlineNow.drivers + data.counts.onlineNow.managers
              : undefined
          }
          subline={
            data
              ? `${data.counts.onlineNow.drivers} водіїв · ${data.counts.onlineNow.managers} менеджерів`
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title="Вантажівок"
          icon={<TruckIcon className="h-4 w-4 text-muted-foreground" />}
          value={data?.counts.trucks.total}
          subline={
            data ? `${data.counts.trucks.active} активних` : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title="Поїздки"
          icon={<Route className="h-4 w-4 text-muted-foreground" />}
          value={data?.counts.trips.active}
          subline={
            data
              ? `${data.counts.trips.thisMonth} за останні 30 днів`
              : undefined
          }
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ContactsCard data={data} isLoading={isLoading} />
        <PushCoverageCard data={data} isLoading={isLoading} />
      </div>

      <UsersCard users={data?.users} isLoading={isLoading} />
    </div>
  );
}

function CompanyHeader({
  data,
  isLoading,
}: {
  data: ReturnType<typeof useAdminCompany>["data"];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deactivate = useDeactivateCompany();
  const resend = useResendCompanyInvite();

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  const teamlead = null; // resend-invite target email — best UX would resolve here, but backend accepts explicit; ask when firing.
  void teamlead;

  const handleResend = async () => {
    const email = window.prompt("На яку пошту переслати запрошення?");
    if (!email) return;
    try {
      await resend.mutateAsync({ id: data.id, email });
      toast({ title: "Invite надіслано", description: email });
    } catch {
      toast({
        title: "Не вдалося надіслати",
        description: "Спробуйте ще раз",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivate.mutateAsync(data.id);
      toast({ title: "Компанію деактивовано" });
      setConfirmOpen(false);
    } catch {
      toast({ title: "Помилка", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {data.logo && <AvatarImage src={data.logo} alt={data.name} />}
          <AvatarFallback className="bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            {data.isActive ? (
              <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" /> Активна
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Деактивована
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Зареєстрована{" "}
            {new Date(data.createdAt).toLocaleDateString("uk-UA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={resend.isPending}
        >
          {resend.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MailPlus className="mr-2 h-4 w-4" />
          )}
          Переслати invite
        </Button>
        {data.isActive && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Power className="mr-2 h-4 w-4" />
                Деактивувати
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Деактивувати компанію?</AlertDialogTitle>
                <AlertDialogDescription>
                  Юзери {data.name} втратять доступ. Це можна повернути через
                  БД.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Скасувати</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeactivate}
                  disabled={deactivate.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deactivate.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Деактивувати
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

function ContactsCard({
  data,
  isLoading,
}: {
  data: ReturnType<typeof useAdminCompany>["data"];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Контакти
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !data ? (
          <>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </>
        ) : (
          <>
            <ContactRow label="Директор" value={data.directorEmail} />
            <Separator />
            <ContactRow label="Бухгалтерія" value={data.accountingEmail} />
            <Separator />
            <ContactRow label="HR" value={data.hrEmail} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ContactRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value ? (
        <a
          href={`mailto:${value}`}
          className="font-medium hover:underline truncate ml-4"
        >
          {value}
        </a>
      ) : (
        <span className="text-muted-foreground italic">не вказано</span>
      )}
    </div>
  );
}

function PushCoverageCard({
  data,
  isLoading,
}: {
  data: ReturnType<typeof useAdminCompany>["data"];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Push-нотифікації
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <>
            <Skeleton className="h-5 w-full mb-3" />
            <Skeleton className="h-2 w-full" />
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-semibold">
                {data.counts.pushCoverage.outOf === 0
                  ? "—"
                  : Math.round(
                      (data.counts.pushCoverage.withToken /
                        data.counts.pushCoverage.outOf) *
                        100,
                    ) + "%"}
              </span>
              <span className="text-sm text-muted-foreground">
                {data.counts.pushCoverage.withToken} з{" "}
                {data.counts.pushCoverage.outOf}
              </span>
            </div>
            <Progress
              value={
                data.counts.pushCoverage.outOf === 0
                  ? 0
                  : (data.counts.pushCoverage.withToken /
                      data.counts.pushCoverage.outOf) *
                    100
              }
            />
            <p className="text-xs text-muted-foreground mt-2">
              Юзери з активним push-токеном
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UsersCard({
  users,
  isLoading,
}: {
  users: AdminCompanyUser[] | undefined;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Юзери{users ? ` (${users.length})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !users ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Завантаження...
          </div>
        ) : users.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Юзерів ще немає — TeamLead не завершив реєстрацію
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Юзер</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Контакт</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {u.avatar && <AvatarImage src={u.avatar} />}
                        <AvatarFallback className="text-xs">
                          {(u.firstName[0] ?? "?") +
                            (u.lastName?.[0] ?? "")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {u.firstName} {u.lastName ?? ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (u.status === "ONLINE"
                            ? "bg-emerald-500"
                            : "bg-muted-foreground/30")
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {u.status === "ONLINE" ? "Онлайн" : u.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.email ?? u.phone ?? "—"}
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
