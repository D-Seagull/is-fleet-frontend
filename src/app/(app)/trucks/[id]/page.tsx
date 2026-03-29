"use client";

import { useState, use } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Search,
  Plus,
  Bell,
  Download,
  Calendar,
  User,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  trucks,
  drivers,
  trips,
  documents,
  messages,
  type TruckStatus,
  type TripStatus,
} from "@/lib/mock-data";

const statusColors: Record<TruckStatus, string> = {
  available: "bg-green-500/10 text-green-500 border-green-500/20",
  "on-trip": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  repair: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusLabels: Record<TruckStatus, string> = {
  available: "Available",
  "on-trip": "On Trip",
  repair: "Repair",
};

const tripStatusColors: Record<TripStatus, string> = {
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  "in-progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  scheduled: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

const tripStatusLabels: Record<TripStatus, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  scheduled: "Scheduled",
};

export default function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const truck = trucks.find((t) => t.id === id);
  const [chatMessage, setChatMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [tripSearch, setTripSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [alarmTime, setAlarmTime] = useState("");
  const [alarmNote, setAlarmNote] = useState("");
  const [noteText, setNoteText] = useState("");

  if (!truck) {
    notFound();
  }

  const currentDriver = truck.currentDriverId
    ? drivers.find((d) => d.id === truck.currentDriverId)
    : null;

  const truckTrips = trips.filter((t) => t.truckId === truck.id);
  const filteredTrips = truckTrips.filter(
    (trip) =>
      trip.origin.toLowerCase().includes(tripSearch.toLowerCase()) ||
      trip.destination.toLowerCase().includes(tripSearch.toLowerCase()),
  );

  const truckDocuments = documents.filter((d) => d.truckId === truck.id);
  const filteredDocuments = truckDocuments.filter((doc) =>
    doc.name.toLowerCase().includes(docSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/trucks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{truck.plateNumber}</h1>
          <Badge variant="outline" className={statusColors[truck.status]}>
            {statusLabels[truck.status]}
          </Badge>
          {currentDriver && (
            <span className="text-muted-foreground">
              Driver: {currentDriver.name}
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alarm">Alarm</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Chat with {currentDriver?.name || "Driver"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="h-8 w-48 pl-8"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="flex flex-col gap-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderType === "dispatcher"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[70%] gap-2 ${
                          message.senderType === "dispatcher"
                            ? "flex-row-reverse"
                            : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentDriver?.avatarUrl} />
                          <AvatarFallback>
                            {message.senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            message.senderType === "dispatcher"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && chatMessage.trim()) {
                      setChatMessage("");
                    }
                  }}
                />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Trip History</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search trips..."
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    className="h-8 w-64 pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip ID</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.map((trip) => {
                    const tripDriver = drivers.find(
                      (d) => d.id === trip.driverId,
                    );
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          TRIP-{trip.id.padStart(3, "0")}
                        </TableCell>
                        <TableCell>{trip.origin}</TableCell>
                        <TableCell>{trip.destination}</TableCell>
                        <TableCell>{trip.startDate}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={tripStatusColors[trip.status]}
                          >
                            {tripStatusLabels[trip.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary hover:text-primary"
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  Trip TRIP-{trip.id.padStart(3, "0")}
                                  <Badge
                                    variant="outline"
                                    className={tripStatusColors[trip.status]}
                                  >
                                    {tripStatusLabels[trip.status]}
                                  </Badge>
                                </DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">
                                      Truck
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded bg-accent/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-accent" />
                                      </div>
                                      <span className="font-medium">
                                        {truck.plateNumber}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">
                                      Driver
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage
                                          src={tripDriver?.avatarUrl}
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                          {tripDriver?.name.charAt(0) || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">
                                        {tripDriver?.name || "Unassigned"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="rounded-lg border p-4 bg-muted/30">
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-start gap-3">
                                      <div className="h-3 w-3 rounded-full bg-emerald-500 mt-1.5"></div>
                                      <div>
                                        <span className="text-xs text-muted-foreground">
                                          Origin
                                        </span>
                                        <p className="font-medium">
                                          {trip.origin}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="ml-1.5 h-6 border-l-2 border-dashed border-muted-foreground/30"></div>
                                    <div className="flex items-start gap-3">
                                      <div className="h-3 w-3 rounded-full bg-primary mt-1.5"></div>
                                      <div>
                                        <span className="text-xs text-muted-foreground">
                                          Destination
                                        </span>
                                        <p className="font-medium">
                                          {trip.destination}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Start Date:
                                    </span>
                                    <p className="font-medium">
                                      {trip.startDate}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      End Date:
                                    </span>
                                    <p className="font-medium">
                                      {trip.endDate || "In Progress"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documents</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="h-8 w-64 pl-8"
                    />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Label>File</Label>
                          <Input type="file" />
                        </div>
                        <Button>Upload</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Trip</TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alarm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Set Alarm for Driver</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex max-w-md flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="alarm-time">Alarm Time</Label>
                  <Input
                    id="alarm-time"
                    type="time"
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="alarm-note">Note for Driver</Label>
                  <Textarea
                    id="alarm-note"
                    placeholder="Enter a note for the driver..."
                    value={alarmNote}
                    onChange={(e) => setAlarmNote(e.target.value)}
                  />
                </div>
                <Button className="w-fit">
                  <Bell className="mr-2 h-4 w-4" />
                  Set Alarm
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {currentDriver && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Driver Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={currentDriver.avatarUrl} />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold">
                        {currentDriver.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Phone: {currentDriver.phone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Language: {currentDriver.language}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dispatcher: {currentDriver.assignedDispatcher}
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">
                          Rating:
                        </span>
                        <span className="font-medium">
                          {currentDriver.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Truck Notes</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Note</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 py-4">
                        <Textarea
                          placeholder="Enter note..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                        />
                        <Button>Add Note</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {truck.notes.length > 0 ? (
                    truck.notes.map((note, index) => (
                      <li
                        key={index}
                        className="rounded-md border bg-muted/50 px-3 py-2 text-sm"
                      >
                        {note}
                      </li>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No notes yet.
                    </p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
