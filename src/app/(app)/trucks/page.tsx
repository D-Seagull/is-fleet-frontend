"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, EyeOff, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  useDeleteTruck,
  useDeactivatedTrucks,
  useActivateTruck,
  useDrivers,
  type TruckStatus,
} from "@/hooks/use-trucks";
import { useAuthStore } from "@/store/auth";

const statusColors: Record<TruckStatus, string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  REPAIR: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabels: Record<TruckStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  REPAIR: "Repair",
};

export default function TrucksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === "TEAMLEAD" || user?.role === "ADMIN";

  const { data: trucks, isLoading } = useTrucks();
  const { data: deactivatedTrucks } = useDeactivatedTrucks();
  const { data: drivers } = useDrivers();
  const createTruck = useCreateTruck();
  const updateTruck = useUpdateTruck();
  const deleteTruck = useDeleteTruck();
  const activateTruck = useActivateTruck();

  const filteredTrucks = (trucks ?? []).filter(
    (truck) =>
      truck.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (truck.currentDriver?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ??
        false),
  );

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

  async function handleDelete(id: string) {
    if (!confirm("Деактивувати вантажівку? Вона зникне зі списку.")) return;
    await deleteTruck.mutateAsync(id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trucks</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Truck
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Truck</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plate">Plate Number</Label>
                <Input
                  id="plate"
                  placeholder="ABC-1234"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="driver">Driver (optional)</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No driver</SelectItem>
                    {(drivers ?? []).map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name ?? driver.email}
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
                Add Truck
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="active">
              Active
              {(trucks?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs">
                  {trucks?.length}
                </span>
              )}
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="deactivated">
                Deactivated
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
              placeholder="Search trucks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="active" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Plate</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Last note</TableHead>
                  <TableHead className="w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredTrucks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      No trucks found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrucks.map((truck) => (
                    <TableRow
                      key={truck.id}
                      className="cursor-pointer"
                      onClick={() =>
                        truck.currentDriver
                          ? router.push(`/chat?userId=${truck.currentDriver.id}`)
                          : router.push(`/trucks/${truck.id}`)
                      }
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/trucks/${truck.id}`}
                          className="font-medium hover:underline"
                        >
                          {truck.plate}
                        </Link>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={truck.status}
                          onValueChange={(v) =>
                            updateTruck.mutate({ id: truck.id, data: { status: v as TruckStatus } })
                          }
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs border-0 px-2 shadow-none focus:ring-0">
                            <Badge variant="outline" className={statusColors[truck.status]}>
                              {statusLabels[truck.status]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AVAILABLE">Available</SelectItem>
                            <SelectItem value="ON_TRIP">On Trip</SelectItem>
                            <SelectItem value="REPAIR">Repair</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{truck.currentDriver?.name ?? "—"}</TableCell>
                      <TableCell className="max-w-[220px]">
                        {truck.truckNotes[0] ? (
                          <span className="text-xs text-muted-foreground truncate block">
                            {truck.truckNotes[0].content}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(truck.id)}
                          disabled={deleteTruck.isPending}
                        >
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        </Button>
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
            <div className="rounded-lg border opacity-75">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!deactivatedTrucks || deactivatedTrucks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No deactivated trucks.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deactivatedTrucks.map((truck) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {truck.plate}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {truck.currentDriver?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => activateTruck.mutate(truck.id)}
                            disabled={activateTruck.isPending}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Activate
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
