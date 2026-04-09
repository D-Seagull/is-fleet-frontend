"use client";

import { useState } from "react";
import { Search, Plus, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  useDispatchers,
  useCreateDispatcher,
  useDeactivateDispatcher,
} from "@/hooks/use-dispatchers";
import { useRouter } from "next/navigation";

export default function DispatchersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [createError, setCreateError] = useState("");
  const router = useRouter();
  const { data: dispatchers, isLoading } = useDispatchers();
  const createDispatcher = useCreateDispatcher();
  const deactivateDispatcher = useDeactivateDispatcher();

  const filtered =
    dispatchers?.filter(
      (d) =>
        d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    try {
      await createDispatcher.mutateAsync(newEmail);
      setDialogOpen(false);
      setNewEmail("");
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        setCreateError(msg.join(", "));
      } else if (typeof msg === "string") {
        setCreateError(msg);
      } else {
        setCreateError("Помилка створення диспетчера");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dispatchers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Dispatcher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Dispatcher</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="dispatcher@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {createError}
                </div>
              )}
              <Button type="submit" disabled={createDispatcher.isPending}>
                {createDispatcher.isPending ? (
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
          placeholder="Search dispatchers..."
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
          {filtered.map((dispatcher) => (
            <Card
              key={dispatcher.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {dispatcher.name
                          ? dispatcher.name.slice(0, 2).toUpperCase()
                          : dispatcher.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {dispatcher.name ?? "Не зареєстрований"}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          dispatcher.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                        }
                      >
                        {dispatcher.isActive ? "Active" : "Inactive"}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deactivateDispatcher.isPending}
                  onClick={() => deactivateDispatcher.mutate(dispatcher.id)}
                >
                  Deactivate
                </Button>
              </CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/chat?userId=${dispatcher.id}`)}
              >
                Message
              </Button>
            </Card>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No dispatchers found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
