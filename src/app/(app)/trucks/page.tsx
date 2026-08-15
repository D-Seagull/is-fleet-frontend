"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fullName } from "@/lib/format";
import {
  Plus,
  Search,
  Eye,
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTrucks,
  useCreateTruck,
  useUpdateTruck,
  useDeactivatedTrucks,
  useActivateTruck,
  useDrivers,
  type TruckStatus,
} from "@/hooks/use-trucks";
import { useAuthStore } from "@/store/auth";
import { BackButton } from "@/components/back-button";

const statusColors: Record<TruckStatus, string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  REPAIR: "bg-red-500/10 text-red-600 border-red-500/20",
};


export default function TrucksPage() {
  const t = useTranslations("trucks");
  const tStatus = useTranslations("common.truckStatus");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === "TEAMLEAD" || user?.role === "ADMIN";
  const isTeamlead = user?.role === "TEAMLEAD";

  const { data: trucks, isLoading } = useTrucks();
  const { data: deactivatedTrucks } = useDeactivatedTrucks();
  const { data: drivers } = useDrivers();
  const createTruck = useCreateTruck();
  const updateTruck = useUpdateTruck();
  const activateTruck = useActivateTruck();

  const filteredTrucks = (trucks ?? []).filter((truck) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      truck.plate.toLowerCase().includes(q) ||
      (fullName(truck.currentDriver)?.toLowerCase().includes(q) ?? false) ||
      (truck.currentDriver?.phone?.includes(searchQuery) ?? false)
    );
  });

  async function handleCreate() {
    if (!plate.trim()) return;
    await createTruck.mutateAsync({
      plate: plate.trim(),
      ...(selectedDriverId && selectedDriverId !== "none"
        ? { currentDriverId: selectedDriverId }
        : {}),
    });
    setPlate("");
    setSelectedDriverId("");
    setDialogOpen(false);
  }

  return (
    <div className="flex flex-col p-4 gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BackButton />
          <h1 className="text-xl md:text-2xl font-bold truncate">{t("title")}</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("addButton")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addDialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plate">{t("plateLabel")}</Label>
                <Input
                  id="plate"
                  placeholder="ABC-1234"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="driver">{t("driverLabel")}</Label>
                <Select
                  value={selectedDriverId}
                  onValueChange={setSelectedDriverId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("driverPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noDriver")}</SelectItem>
                    {(drivers ?? []).map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {fullName(driver) || driver.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!plate.trim() || createTruck.isPending}
              >
                {createTruck.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("addButton")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="active">
              {t("tabActive")}
              {(trucks?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs">
                  {trucks?.length}
                </span>
              )}
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="deactivated">
                {t("tabDeactivated")}
                {(deactivatedTrucks?.length ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs">
                    {deactivatedTrucks?.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="active" className="mt-4">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[72px]">{t("colPlate")}</TableHead>
                  <TableHead className="hidden md:table-cell w-[130px]">
                    {t("colStatus")}
                  </TableHead>
                  <TableHead>{t("colDriver")}</TableHead>
                  <TableHead>{t("colManager")}</TableHead>
                  <TableHead className="hidden md:table-cell w-[200px]">
                    {t("colLastNote")}
                  </TableHead>
                  <TableHead className="w-[44px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-24 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-6" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTrucks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground"
                    >
                      {t("emptyActive")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrucks.map((truck) => (
                    <TableRow
                      key={truck.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/trucks/${truck.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/trucks/${truck.id}?tab=info`}
                          className="font-medium hover:underline"
                        >
                          {truck.plate}
                        </Link>
                      </TableCell>
                      <TableCell
                        className="hidden md:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          value={truck.status}
                          onValueChange={(v) =>
                            updateTruck.mutate({
                              id: truck.id,
                              data: { status: v as TruckStatus },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs border-0 px-2 shadow-none focus:ring-0">
                            <Badge
                              variant="outline"
                              className={statusColors[truck.status]}
                            >
                              {tStatus(truck.status)}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AVAILABLE">
                              {tStatus("AVAILABLE")}
                            </SelectItem>
                            <SelectItem value="ON_TRIP">
                              {tStatus("ON_TRIP")}
                            </SelectItem>
                            <SelectItem value="REPAIR">
                              {tStatus("REPAIR")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* driver name → driver profile */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {truck.currentDriver ? (
                          <Link
                            href={`/drivers/${truck.currentDriver.id}`}
                            className="hover:underline block truncate max-w-[84px] sm:max-w-[200px]"
                          >
                            {fullName(truck.currentDriver)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* manager name → manager profile */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {truck.manager ? (
                          <Link
                            href={`/managers/${truck.manager.id}`}
                            className="hover:underline block truncate max-w-[84px] sm:max-w-[200px]"
                          >
                            {fullName(truck.manager)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      {/* last note — hidden on mobile */}
                      <TableCell className="hidden md:table-cell max-w-[200px]">
                        {truck.truckNotes[0] ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-destructive truncate block cursor-help">
                                {truck.truckNotes[0].content}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              align="start"
                              className="max-w-[260px] whitespace-normal break-words"
                            >
                              {truck.truckNotes[0].content}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">
                            —
                          </span>
                        )}
                      </TableCell>
                      {/* take/release truck — teamlead, all breakpoints */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {isTeamlead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={
                                truck.managerId === user?.id
                                  ? t("releaseTruck")
                                  : t("takeTruck")
                              }
                              onClick={() =>
                                updateTruck.mutate({
                                  id: truck.id,
                                  data: {
                                    managerId:
                                      truck.managerId === user?.id
                                        ? null
                                        : user?.id,
                                  },
                                })
                              }
                              disabled={updateTruck.isPending}
                            >
                              {truck.managerId === user?.id ? (
                                <UserMinus className="h-4 w-4 text-primary" />
                              ) : (
                                <UserPlus className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {isManager && (
          <TabsContent value="deactivated" className="mt-4">
            <div className="rounded-lg border opacity-75 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colPlate")}</TableHead>
                    <TableHead>{t("colDriver")}</TableHead>
                    <TableHead>{t("colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!deactivatedTrucks || deactivatedTrucks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-10 text-muted-foreground"
                      >
                        {t("emptyDeactivated")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    deactivatedTrucks.map((truck) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {truck.plate}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fullName(truck.currentDriver) || "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => activateTruck.mutate(truck.id)}
                            disabled={activateTruck.isPending}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            {t("activate")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
