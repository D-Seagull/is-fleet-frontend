"use client";

import { useState } from "react";
import { Search, Plus, Phone, Mail, Users, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { dispatchers, type DispatcherStatus } from "@/lib/mock-data";

const statusColors: Record<DispatcherStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  "on-break": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const statusLabels: Record<DispatcherStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  "on-break": "On Break",
};

export default function DispatchersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredDispatchers = dispatchers.filter((dispatcher) => {
    const matchesSearch =
      dispatcher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispatcher.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || dispatcher.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dispatchers</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Dispatcher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Dispatcher</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter dispatcher name" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter email" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="Enter phone number" />
              </div>
              <Button className="bg-primary hover:bg-primary/90">
                Add Dispatcher
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dispatchers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on-break">On Break</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDispatchers.map((dispatcher) => (
          <Card
            key={dispatcher.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={dispatcher.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {dispatcher.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {dispatcher.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`mt-1 ${statusColors[dispatcher.status]}`}
                    >
                      {statusLabels[dispatcher.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{dispatcher.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{dispatcher.phone}</span>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {dispatcher.assignedDrivers}
                  </span>
                  <span className="text-muted-foreground">Drivers</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-accent" />
                  <span className="font-medium">
                    {dispatcher.assignedTrucks}
                  </span>
                  <span className="text-muted-foreground">Trucks</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredDispatchers.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No dispatchers found.
          </div>
        )}
      </div>
    </div>
  );
}
