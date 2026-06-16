"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fullName } from "@/lib/format";
import {
  Search,
  Plus,
  Loader2,
  Truck as TruckIcon,
  MessageSquare,
  UserCircle2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useManagers,
  useCreateManager,
  type Manager,
} from "@/hooks/use-managers";
import { useAuthStore } from "@/store/auth";

export default function ManagersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"team" | "all">("team");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [createError, setCreateError] = useState("");

  const { data: managers, isLoading } = useManagers();
  const createManager = useCreateManager();

  // "Team" tab — managers reporting to the same teamlead as the current user.
  //   - TEAMLEAD: their direct reports (teamleadId === my id)
  //   - MANAGER : peers (teamleadId === my teamleadId, looked up in the list)
  //   - ADMIN  : no team → show empty state (Admin uses All tab)
  const myTeamleadId = useMemo<string | null>(() => {
    if (!user) return null;
    if (user.role === "TEAMLEAD") return user.id;
    if (user.role === "MANAGER") {
      const me = managers?.find((m) => m.id === user.id);
      return me?.teamleadId ?? null;
    }
    return null;
  }, [user, managers]);

  const filterBySearch = (rows: Manager[]) =>
    rows.filter((m) => {
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        m.email.toLowerCase().includes(q) ||
        (fullName(m) || "").toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q)
      );
    });

  const teamManagers = useMemo(
    () =>
      filterBySearch(
        (managers ?? []).filter(
          (m) => myTeamleadId && m.teamleadId === myTeamleadId,
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [managers, myTeamleadId, searchQuery],
  );

  const allManagers = useMemo(
    () => filterBySearch(managers ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [managers, searchQuery],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      const firstName = newFirstName.trim();
      const lastName = newLastName.trim() || null;
      if (!firstName) {
        setCreateError("Ім'я обов'язкове");
        return;
      }
      await createManager.mutateAsync({
        email: newEmail,
        phone: newPhone,
        firstName,
        lastName,
      });
      setDialogOpen(false);
      setNewEmail("");
      setNewPhone("");
      setNewFirstName("");
      setNewLastName("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      if (Array.isArray(msg)) setCreateError(msg.join(", "));
      else if (typeof msg === "string") setCreateError(msg);
      else setCreateError("Помилка створення менеджера");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
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
                <Label htmlFor="firstName">Ім&apos;я</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Іван"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Прізвище (необов&apos;язково)</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Петренко"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
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
          placeholder="Search by name, phone, email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "team" | "all")}>
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="all">All managers</TabsTrigger>
        </TabsList>

        {/* ── Team ─────────────────────────────────────────────────────────── */}
        <TabsContent value="team" className="mt-4">
          {isLoading ? (
            <LoadingRow />
          ) : !myTeamleadId ? (
            <EmptyState text="Only managers and team leads have a team view. Switch to “All managers”." />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Phone
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Trucks
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Rating
                    </TableHead>
                    <TableHead className="w-[60px] text-center">Chat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamManagers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No team members yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teamManagers.map((m) => (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/managers/${m.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m.avatar ?? undefined} />
                              <AvatarFallback className="text-xs">
                                {(fullName(m) || m.email)
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              href={`/managers/${m.id}`}
                              className="font-medium hover:underline"
                            >
                              {fullName(m) || m.email}
                            </Link>
                            {!m.isActive && (
                              <Badge variant="outline" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {m.email}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {m.phone ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          <div className="flex items-center gap-1.5">
                            <TruckIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{m.truckCount ?? 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {typeof m.managerAverageRating === "number" ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-medium">
                                {m.managerAverageRating.toFixed(1)}
                              </span>
                              <span className="text-muted-foreground">
                                ({m.managerRatingCount ?? 0})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              router.push(`/chat?userId=${m.id}`)
                            }
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── All managers ─────────────────────────────────────────────────── */}
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <LoadingRow />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Teamlead
                    </TableHead>
                    <TableHead className="w-[60px] text-center">Chat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allManagers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No managers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allManagers.map((m) => (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/managers/${m.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m.avatar ?? undefined} />
                              <AvatarFallback className="text-xs">
                                {(fullName(m) || m.email)
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              href={`/managers/${m.id}`}
                              className="font-medium hover:underline"
                            >
                              {fullName(m) || m.email}
                            </Link>
                            {!m.isActive && (
                              <Badge variant="outline" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {m.email}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <UserCircle2 className="h-3.5 w-3.5" />
                            <span>{fullName(m.teamlead) || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              router.push(`/chat?userId=${m.id}`)
                            }
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

