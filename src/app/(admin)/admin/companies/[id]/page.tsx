"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
import type { AdminCompanyUser } from "@/hooks/use-admin-company";

export default function AdminCompanyDetailPage() {
  const t = useTranslations("admin.detail");
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, isLoading, isError } = useAdminCompany(id);

  return (
    <div className="p-6 w-full max-w-6xl mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Link>
        </Button>

        {isError && (
          <div className="text-destructive text-sm">{t("errorLoad")}</div>
        )}

        <CompanyHeader data={data} isLoading={isLoading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t("kpiUsers")}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          value={data?.counts.usersTotal}
          subline={
            data
              ? t("kpiUsersSub", {
                  drivers: data.counts.usersByRole.DRIVER,
                  managers: data.counts.usersByRole.MANAGER,
                  teamleads: data.counts.usersByRole.TEAMLEAD,
                })
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title={t("kpiOnline")}
          icon={<Wifi className="h-4 w-4 text-emerald-500" />}
          value={
            data
              ? data.counts.onlineNow.drivers + data.counts.onlineNow.managers
              : undefined
          }
          subline={
            data
              ? t("kpiOnlineSub", {
                  drivers: data.counts.onlineNow.drivers,
                  managers: data.counts.onlineNow.managers,
                })
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title={t("kpiTrucks")}
          icon={<TruckIcon className="h-4 w-4 text-muted-foreground" />}
          value={data?.counts.trucks.total}
          subline={
            data
              ? t("kpiTrucksSub", { active: data.counts.trucks.active })
              : undefined
          }
          isLoading={isLoading}
        />
        <KpiCard
          title={t("kpiTrips")}
          icon={<Route className="h-4 w-4 text-muted-foreground" />}
          value={data?.counts.trips.active}
          subline={
            data
              ? t("kpiTripsSub", { count: data.counts.trips.thisMonth })
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
  const t = useTranslations("admin.detail");
  const tActions = useTranslations("common.actions");
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
    const email = window.prompt(t("resendPrompt"));
    if (!email) return;
    try {
      await resend.mutateAsync({ id: data.id, email });
      toast({ title: t("resendSuccess"), description: email });
    } catch {
      toast({
        title: t("resendFail"),
        description: t("resendFailDesc"),
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivate.mutateAsync(data.id);
      toast({ title: t("deactivateSuccess") });
      setConfirmOpen(false);
    } catch {
      toast({ title: t("deactivateError"), variant: "destructive" });
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
                <CheckCircle2 className="h-3 w-3" /> {t("statusActive")}
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> {t("statusDeactivated")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("registered", {
              date: new Date(data.createdAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
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
          {t("resendInvite")}
        </Button>
        {data.isActive && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Power className="mr-2 h-4 w-4" />
                {t("deactivate")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("deactivateConfirmTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deactivateConfirmBody", { name: data.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tActions("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeactivate}
                  disabled={deactivate.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deactivate.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("deactivate")}
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
  const t = useTranslations("admin.detail");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          {t("contactsTitle")}
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
            <ContactRow label={t("contactDirector")} value={data.directorEmail} />
            <Separator />
            <ContactRow
              label={t("contactAccounting")}
              value={data.accountingEmail}
            />
            <Separator />
            <ContactRow label={t("contactHr")} value={data.hrEmail} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ContactRow({ label, value }: { label: string; value: string | null }) {
  const t = useTranslations("admin.detail");
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
        <span className="text-muted-foreground italic">{t("notSpecified")}</span>
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
  const t = useTranslations("admin.detail");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          {t("pushTitle")}
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
                {t("pushOutOf", {
                  withToken: data.counts.pushCoverage.withToken,
                  outOf: data.counts.pushCoverage.outOf,
                })}
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
              {t("pushCaption")}
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
  const t = useTranslations("admin.detail");
  const tRoles = useTranslations("common.roles");
  const tStatus = useTranslations("common.status");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          {t("usersTitle")}
          {users ? ` (${users.length})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !users ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("usersLoading")}
          </div>
        ) : users.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            {t("usersEmpty")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colUser")}</TableHead>
                <TableHead>{t("colRole")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colContact")}</TableHead>
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
                    <Badge variant="outline">{tRoles(u.role)}</Badge>
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
                        {tStatus(u.status)}
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
