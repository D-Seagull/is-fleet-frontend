"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  User,
  Phone,
  Globe,
  UserCog,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { drivers, trucks, type DriverStatus } from "@/lib/mock-data";

const statusColors: Record<DriverStatus, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  inactive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<DriverStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export default function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const driver = drivers.find((d) => d.id === id);
  const [isActive, setIsActive] = useState(driver?.status === "active");
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!driver) {
    notFound();
  }

  const assignedTruck = trucks.find((t) => t.currentDriverId === driver.id);
  const availableTrucks = trucks.filter(
    (t) => t.status === "available" && t.currentDriverId !== driver.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/drivers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Driver Details</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>Profile Information</CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Truck className="mr-2 h-4 w-4" />
                    Assign to Truck
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Driver to Truck</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Label>Select Truck</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a truck" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTrucks.map((truck) => (
                            <SelectItem key={truck.id} value={truck.id}>
                              {truck.plateNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => setDialogOpen(false)}>Assign</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant={isActive ? "destructive" : "default"}
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={driver.avatarUrl} />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold">{driver.name}</h2>
                <Badge
                  variant="outline"
                  className={statusColors[isActive ? "active" : "inactive"]}
                >
                  {statusLabels[isActive ? "active" : "inactive"]}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{driver.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <p className="font-medium">{driver.language}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <UserCog className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Assigned Dispatcher
                    </p>
                    <p className="font-medium">{driver.assignedDispatcher}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Star className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium">{driver.rating} / 5</span>
                    </div>
                  </div>
                </div>

                {assignedTruck && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Assigned Truck
                      </p>
                      <Link
                        href={`/trucks/${assignedTruck.id}`}
                        className="font-medium hover:underline"
                      >
                        {assignedTruck.plateNumber}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
