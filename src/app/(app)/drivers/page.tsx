"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Star, Eye, EyeOff, Loader2, MessageSquare } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useDrivers,
  useDeactivatedDrivers,
  useCreateDriver,
  useDeactivateDriver,
  useActivateDriver,
  type Language,
} from "@/hooks/use-drivers";
import { useAuthStore } from "@/store/auth";

const languageLabels: Record<Language, string> = {
  UK: "Ukrainian",
  EN: "English",
  PL: "Polish",
  LT: "Lithuanian",
  UZ: "Uzbek",
  KZ: "Kazakh",
  HI: "Hindi",
  RU: "Russian",
};

export default function DriversPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<Language>("EN");

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === "TEAMLEAD" || user?.role === "ADMIN";

  const { data: drivers, isLoading } = useDrivers();
  const { data: deactivatedDrivers } = useDeactivatedDrivers();
  const createDriver = useCreateDriver();
  const deactivateDriver = useDeactivateDriver();
  const activateDriver = useActivateDriver();

  const filteredDrivers = (drivers ?? []).filter(
    (d) =>
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone?.includes(searchQuery) ||
      d.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  async function handleCreate() {
    if (!name.trim() || !phone.trim()) return;
    await createDriver.mutateAsync({ name, phone, password: password || undefined, language });
    setName(""); setPhone(""); setPassword(""); setLanguage("EN");
    setDialogOpen(false);
  }

  return (
    <div className="flex flex-col p-4 gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Driver</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-name">Name</Label>
                <Input id="d-name" placeholder="John Smith" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-phone">Phone</Label>
                <Input id="d-phone" placeholder="+1 555-0100" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-password">Password (optional)</Label>
                <Input id="d-password" type="password" placeholder="Leave empty to set later" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(languageLabels) as [Language, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || !phone.trim() || createDriver.isPending}
              >
                {createDriver.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Driver
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
              {(drivers?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs">
                  {drivers?.length}
                </span>
              )}
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="deactivated">
                Deactivated
                {(deactivatedDrivers?.length ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs">
                    {deactivatedDrivers?.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
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
                  <TableHead>Driver</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Language</TableHead>
                  <TableHead className="hidden md:table-cell">Dispatcher</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead className="hidden sm:table-cell">Rating</TableHead>
                  <TableHead className="hidden sm:table-cell w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No drivers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow
                      key={driver.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/drivers/${driver.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={driver.avatar ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {driver.name?.slice(0, 2).toUpperCase() ?? "DR"}
                            </AvatarFallback>
                          </Avatar>
                          <Link href={`/drivers/${driver.id}`} className="font-medium hover:underline">
                            {driver.name ?? "—"}
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => router.push(`/chat?userId=${driver.id}`)}
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{driver.phone ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{languageLabels[driver.language]}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{driver.dispatcher?.name ?? "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-sm">
                        {driver.currentTruck ? (
                          <Link href={`/trucks/${driver.currentTruck.id}`} className="hover:underline">
                            {driver.currentTruck.plate}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {driver.averageRating !== null ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm font-medium">
                              {driver.averageRating.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({driver.ratingCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deactivateDriver.mutate(driver.id)}
                          disabled={deactivateDriver.isPending}
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
                    <TableHead>Driver</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!deactivatedDrivers || deactivatedDrivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No deactivated drivers.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deactivatedDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {driver.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{driver.phone ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => activateDriver.mutate(driver.id)}
                            disabled={activateDriver.isPending}
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
