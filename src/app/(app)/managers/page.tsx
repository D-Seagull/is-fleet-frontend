"use client";

import { useState } from "react";
import { Search, Plus, Mail, Loader2, Phone, Star, UserCircle2, MessageSquare } from "lucide-react";
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
  useManagers,
  useCreateManager,
  useDeactivateManager,
  useActivateManager,
} from "@/hooks/use-managers";
import { useRouter } from "next/navigation";

export default function ManagersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const router = useRouter();
  const { data: managers, isLoading } = useManagers();
  const createManager = useCreateManager();
  const deactivateManager = useDeactivateManager();
  const activateManager = useActivateManager();

  const filtered =
    managers?.filter(
      (m) =>
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    try {
      await createManager.mutateAsync({
        email: newEmail,
        phone: newPhone,
        name: newName || undefined,
      });
      setDialogOpen(false);
      setNewEmail("");
      setNewPhone("");
      setNewName("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      if (Array.isArray(msg)) {
        setCreateError(msg.join(", "));
      } else if (typeof msg === "string") {
        setCreateError(msg);
      } else {
        setCreateError("Помилка створення менеджера");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Managers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Manager
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Manager</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Ім&apos;я (необов&apos;язково)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Іван Петренко"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="manager@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+380501234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                />
              </div>
              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {createError}
                </div>
              )}
              <Button type="submit" disabled={createManager.isPending}>
                {createManager.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Відправка...
                  </>
                ) : (
                  "Відправити запрошення"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search managers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const avg = m.managerAverageRating ?? null;
            const ratingCount = m.managerRatingCount ?? 0;
            return (
              <Card
                key={m.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14">
                      {m.avatar ? (
                        <AvatarImage src={m.avatar} alt={m.name ?? m.email} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {m.name
                          ? m.name.slice(0, 2).toUpperCase()
                          : m.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {m.name ?? "Не зареєстрований"}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            m.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                          }
                        >
                          {m.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {avg !== null && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium">{avg.toFixed(1)}</span>
                            <span className="text-muted-foreground">
                              ({ratingCount})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  {m.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Teamlead:{" "}
                      {m.teamlead?.name ?? (
                        <span className="italic">не призначений</span>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/chat?userId=${m.id}`)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Message
                    </Button>
                    {m.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deactivateManager.isPending}
                        onClick={() => deactivateManager.mutate(m.id)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activateManager.isPending}
                        onClick={() => activateManager.mutate(m.id)}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No managers found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
