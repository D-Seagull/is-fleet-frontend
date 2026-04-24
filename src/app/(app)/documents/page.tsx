"use client";

import { useState } from "react";
import {
  Search,
  Download,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { documents, trucks, trips } from "@/lib/mock-data";

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [truckFilter, setTruckFilter] = useState<string>("all");
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTruck = truckFilter === "all" || doc.truckId === truckFilter;
    const matchesTrip = tripFilter === "all" || doc.tripId === tripFilter;
    const matchesDate =
      !selectedDate ||
      doc.uploadDate === selectedDate.toISOString().split("T")[0];
    return matchesSearch && matchesTruck && matchesTrip && matchesDate;
  });

  const uniqueTrucks = [...new Set(documents.map((d) => d.truckId))].map(
    (id) => {
      const truck = trucks.find((t) => t.id === id);
      return { id, plate: truck?.plateNumber || id };
    },
  );

  const uniqueTrips = [...new Set(documents.map((d) => d.tripId))].map((id) => {
    const trip = trips.find((t) => t.id === id);
    return { id, number: `TRIP-${id.padStart(3, "0")}` };
  });

  const clearFilters = () => {
    setTruckFilter("all");
    setTripFilter("all");
    setSelectedDate(undefined);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by truck" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            {uniqueTrucks.map((truck) => (
              <SelectItem key={truck.id} value={truck.id}>
                {truck.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by trip" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            {uniqueTrips.map((trip) => (
              <SelectItem key={trip.id} value={trip.id}>
                {trip.number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={selectedDate ? "border-primary text-primary" : ""}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? selectedDate.toLocaleDateString() : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() - 1,
                      ),
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {calendarMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                      ),
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setShowCalendar(false);
              }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
            {selectedDate && (
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setSelectedDate(undefined);
                    setShowCalendar(false);
                  }}
                >
                  Clear date filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {(truckFilter !== "all" || tripFilter !== "all" || selectedDate) && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Trip Number</TableHead>
              <TableHead>Truck</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell className="capitalize">
                  {doc.type.replace("-", " ")}
                </TableCell>
                <TableCell>{doc.uploadDate}</TableCell>
                <TableCell>{doc.tripNumber}</TableCell>
                <TableCell>{doc.truckPlate}</TableCell>
                <TableCell>{doc.driverName}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredDocuments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
