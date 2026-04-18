"use client";

import { useState, use } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTruck,
  useUpdateTruck,
  useTruckNotes,
  useCreateTruckNote,
  useDeleteTruckNote,
  useDrivers,
  type TruckStatus,
} from "@/hooks/use-trucks";
import { useAuthStore } from "@/store/auth";

const statusColors: Record<TruckStatus, string> = {
  AVAILABLE: "bg-green-500/10 text-green-500 border-green-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  REPAIR: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusLabels: Record<TruckStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  REPAIR: "Repair",
};

export default function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useAuthStore((s) => s.user);

  const { data: truck, isLoading } = useTruck(id);
  const { data: notes, isLoading: notesLoading } = useTruckNotes(id);
  const { data: drivers } = useDrivers();
  const updateTruck = useUpdateTruck();
  const createNote = useCreateTruckNote();
  const deleteNote = useDeleteTruckNote();

  const [noteText, setNoteText] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!truck) {
    notFound();
  }

  async function handleStatusChange(status: TruckStatus) {
    await updateTruck.mutateAsync({ id, data: { status } });
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await createNote.mutateAsync({ truckId: id, content: noteText.trim() });
    setNoteText("");
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    await deleteNote.mutateAsync({ noteId, truckId: id });
  }

  function canDeleteNote(noteUserId: string, noteUserRole: string) {
    if (!user) return false;
    if (user.id === noteUserId) return true;
    if (user.role === "TEAMLEAD" || user.role === "ADMIN") return true;
    return false;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/trucks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{truck.plate}</h1>
          <Badge variant="outline" className={statusColors[truck.status]}>
            {statusLabels[truck.status]}
          </Badge>
          {truck.currentDriver && (
            <span className="text-muted-foreground">
              Driver: {truck.currentDriver.name}
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alarm">Alarm</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alarm" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <div className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={truck.status}
                    onValueChange={(v) => handleStatusChange(v as TruckStatus)}
                    disabled={updateTruck.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ON_TRIP">On Trip</SelectItem>
                      <SelectItem value="REPAIR">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Driver</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {truck.currentDriver && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="font-medium text-sm">{truck.currentDriver.name}</p>
                        <p className="text-xs text-muted-foreground">{truck.currentDriver.phone}</p>
                      </div>
                    </div>
                  )}
                  <Select
                    value={truck.currentDriverId ?? "none"}
                    onValueChange={(v) =>
                      updateTruck.mutate({
                        id,
                        data: { currentDriverId: v === "none" ? null : v },
                      })
                    }
                    disabled={updateTruck.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No driver</SelectItem>
                      {(drivers ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name ?? d.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="note-text">Add Note</Label>
                  <Textarea
                    id="note-text"
                    placeholder="Enter note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || createNote.isPending}
                    className="w-fit"
                  >
                    {createNote.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {notesLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : !notes || notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-start justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2"
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <p className="text-sm">{note.content}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{note.user.name ?? "Unknown"}</span>
                            <span>·</span>
                            <span>
                              {new Date(note.createdAt).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>
                        {canDeleteNote(note.user.id, note.user.role) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deleteNote.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
