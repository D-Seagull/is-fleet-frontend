"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { fullName, initials } from "@/lib/format";
import {
  ArrowLeft,
  Check,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Star,
  Truck as TruckIcon,
  User as UserIcon,
  UserCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useActivateManager,
  useDeactivateManager,
  useManager,
  useTeamleads,
  useUpdateUser,
} from "@/hooks/use-managers";
import { useAuthStore } from "@/store/auth";
import { type Language } from "@/hooks/use-drivers";

const LANGUAGE_KEYS: Language[] = [
  "UK",
  "EN",
  "PL",
  "LT",
  "UZ",
  "KZ",
  "HI",
  "RU",
];

const PHONE_REGEX = /^\+\d{7,15}$/;

export default function ManagerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("managers.detail");
  const tLangs = useTranslations("common.languages");
  const tTruckStatus = useTranslations("common.truckStatus");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "info";

  const me = useAuthStore((s) => s.user);
  const { data: manager, isLoading } = useManager(id);
  const { data: teamleads = [] } = useTeamleads();
  const update = useUpdateUser(id);
  const deactivate = useDeactivateManager();
  const activate = useActivateManager();

  // Local-editable copies of editable fields. Reset whenever the underlying
  // manager record changes; clear "dirty" state so Save/Cancel only show
  // after a real edit.
  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneDirty, setPhoneDirty] = useState(false);

  useEffect(() => {
    if (!manager) return;
    setName(fullName(manager) || "");
    setPhone(manager.phone ?? "");
    setNameDirty(false);
    setPhoneDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager?.id, fullName(manager), manager?.phone]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!manager) notFound();

  const isAdminOrTeamlead = me?.role === "ADMIN" || me?.role === "TEAMLEAD";
  const canEditTeamlead = isAdminOrTeamlead;
  const phoneValid = PHONE_REGEX.test(phone);
  const avg = manager.managerAverageRating ?? null;
  const ratingCount = manager.managerRatingCount ?? 0;
  const trucks = manager.assignedTrucks ?? [];
  const drivers = manager.drivers ?? [];
  const ratings = manager.managerRatingsReceived ?? [];

  return (
    <div className="flex flex-col p-4 gap-6 max-w-5xl mx-auto">
      {/* ── Header (shared shape with driver card) ──────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/managers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {fullName(manager) || manager.email}
          </h1>
          <Badge
            variant="outline"
            className={
              manager.isActive
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
            }
          >
            {manager.isActive ? t("statusActive") : t("statusInactive")}
          </Badge>
          {avg !== null && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-medium">{avg.toFixed(1)}</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={`/chat?userId=${manager.id}`}>
            <MessageSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("chat")}</span>
          </Link>
        </Button>
        {isAdminOrTeamlead && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {manager.isActive ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deactivate.mutate(manager.id)}
                  disabled={deactivate.isPending}
                >
                  {t("deactivate")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => activate.mutate(manager.id)}
                  disabled={activate.isPending}
                >
                  {t("activate")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="info">{t("tabInfo")}</TabsTrigger>
          <TabsTrigger value="trucks">
            {t("tabTrucks")}{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {trucks.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="drivers">
            {t("tabDrivers")}{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {drivers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="rating">
            {t("tabRating")}
            {ratingCount > 0 && (
              <span className="ml-1.5 flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {avg?.toFixed(1)}
                <span className="text-muted-foreground">({ratingCount})</span>
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Info ──────────────────────────────────────────────────────── */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("profileTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={manager.avatar ?? undefined} />
                  <AvatarFallback>
                    <UserIcon className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-1 flex-col gap-4">
                  {/* Name — editable */}
                  <div className="flex items-center gap-2 max-w-md">
                    <Input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNameDirty(e.target.value !== (fullName(manager) || ""));
                      }}
                      placeholder={t("namePlaceholder")}
                      className="text-xl font-semibold h-9"
                    />
                    {nameDirty && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          disabled={update.isPending || !name.trim()}
                          onClick={async () => {
                            const parts = name.trim().split(/\s+/);
                            const firstName = parts.shift() ?? "";
                            const lastName = parts.length > 0 ? parts.join(" ") : null;
                            await update.mutateAsync({ firstName, lastName });
                            setNameDirty(false);
                          }}
                        >
                          {update.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            setName(fullName(manager) || "");
                            setNameDirty(false);
                          }}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Email — read-only (used as login) */}
                    <InfoField
                      icon={<Mail className="h-5 w-5 text-muted-foreground" />}
                      label={t("emailField")}
                      value={manager.email}
                    />

                    {/* Phone — editable */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <p className="text-sm text-muted-foreground">{t("phoneField")}</p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setPhoneDirty(
                                e.target.value !== (manager.phone ?? ""),
                              );
                            }}
                            placeholder="+12345678901"
                            className={`h-8 text-sm ${
                              phoneDirty && !phoneValid
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          {phoneDirty && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                disabled={!phoneValid || update.isPending}
                                onClick={async () => {
                                  await update.mutateAsync({ phone });
                                  setPhoneDirty(false);
                                }}
                              >
                                {update.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={() => {
                                  setPhone(manager.phone ?? "");
                                  setPhoneDirty(false);
                                }}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </>
                          )}
                        </div>
                        {phoneDirty && !phoneValid && (
                          <p className="text-xs text-destructive">
                            {t("phoneFormatHint")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Language — select */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <p className="text-sm text-muted-foreground">
                          {t("languageField")}
                        </p>
                        <Select
                          value={(manager.language as Language) ?? "EN"}
                          onValueChange={(v) =>
                            update.mutate({ language: v as Language })
                          }
                          disabled={update.isPending}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_KEYS.map((l) => (
                              <SelectItem key={l} value={l}>
                                {tLangs(l)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Teamlead — select (admin/teamlead only) */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                        <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <p className="text-sm text-muted-foreground">
                          {t("teamleadField")}
                        </p>
                        {canEditTeamlead ? (
                          <Select
                            value={manager.teamleadId ?? "none"}
                            onValueChange={(v) =>
                              update.mutate({
                                teamleadId: v === "none" ? null : v,
                              })
                            }
                            disabled={update.isPending}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder={t("noTeamlead")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("noTeamlead")}
                              </SelectItem>
                              {teamleads.map((tl) => (
                                <SelectItem key={tl.id} value={tl.id}>
                                  {fullName(tl) || tl.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium">
                            {fullName(manager.teamlead) ??
                              manager.teamlead?.email ?? (
                                <span className="italic text-muted-foreground">
                                  {t("notAssigned")}
                                </span>
                              )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trucks ────────────────────────────────────────────────────── */}
        <TabsContent value="trucks" className="mt-4">
          {trucks.length === 0 ? (
            <EmptyState text={t("trucksEmpty")} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {trucks.map((truck) => (
                <Link
                  key={truck.id}
                  href={`/trucks/${truck.id}`}
                  className="border rounded-md p-3 hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <TruckIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{truck.plate}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {fullName(truck.currentDriver) || t("noDriver")} ·{" "}
                      {tTruckStatus(truck.status)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Drivers ───────────────────────────────────────────────────── */}
        <TabsContent value="drivers" className="mt-4">
          {drivers.length === 0 ? (
            <EmptyState text={t("driversEmpty")} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {drivers.map((d) => (
                <Link
                  key={d.id}
                  href={`/drivers/${d.id}`}
                  className="border rounded-md p-3 hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={d.avatar ?? undefined} />
<AvatarFallback className="text-xs">{initials(d)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {fullName(d) || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.phone ?? "—"}
                      {d.currentTruck ? ` · ${d.currentTruck.plate}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Ratings (read-only — drivers rate from the mobile app) ────── */}
        <TabsContent value="rating" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("overallTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {avg !== null ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold">{avg.toFixed(1)}</span>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={
                              n <= Math.round(avg)
                                ? "h-5 w-5 fill-yellow-500 text-yellow-500"
                                : "h-5 w-5 text-muted-foreground/20"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {t("ratingsFromDrivers", { count: ratingCount })}
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex flex-col gap-2">
                    {ratings.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={
                                  n <= r.score
                                    ? "h-3.5 w-3.5 fill-yellow-500 text-yellow-500"
                                    : "h-3.5 w-3.5 text-muted-foreground/20"
                                }
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {fullName(r.ratedBy) || t("unknown")}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(r.createdAt).toLocaleDateString(locale)}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-muted-foreground">
                            &quot;{r.comment}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noRatings")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex flex-col flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium break-all">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground border rounded-md">
      {text}
    </div>
  );
}
