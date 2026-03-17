"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { trucks, type TruckStatus } from "@/lib/mock-data"

const statusColors: Record<TruckStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "on-trip": "bg-primary/10 text-primary border-primary/20",
  repair: "bg-destructive/10 text-destructive border-destructive/20",
}

const statusLabels: Record<TruckStatus, string> = {
  available: "Available",
  "on-trip": "On Trip",
  repair: "Repair",
}

export default function TrucksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredTrucks = trucks.filter(
    (truck) =>
      truck.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (truck.currentDriverName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trucks</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
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
                <Label htmlFor="plateNumber">Plate Number</Label>
                <Input id="plateNumber" placeholder="ABC-1234" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="status">Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on-trip">On Trip</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setDialogOpen(false)}>Add Truck</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search trucks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Driver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrucks.map((truck) => (
              <TableRow key={truck.id}>
                <TableCell>
                  <Link
                    href={`/trucks/${truck.id}`}
                    className="font-medium hover:underline"
                  >
                    {truck.plateNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[truck.status]}>
                    {statusLabels[truck.status]}
                  </Badge>
                </TableCell>
                <TableCell>{truck.currentDriverName || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
