"use client";

import { useState } from "react";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  MessageSquare,
  Megaphone,
  Loader2,
  Check,
  X,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useDispatcherGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from "@/hooks/use-groups";
import { useRouter } from "next/navigation";

export default function GroupsPage() {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [createError, setCreateError] = useState("");
  const [search, setSearch] = useState("");
  const { data: groups, isLoading } = useDispatcherGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      await createGroup.mutateAsync(newGroupName);
      setCreateDialogOpen(false);
      setNewGroupName("");
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setCreateError(typeof msg === "string" ? msg : "Помилка створення групи");
    }
  };

  const handleUpdateName = async (id: string) => {
    if (!editingName.trim()) return;
    await updateGroup.mutateAsync({ id, name: editingName });
    setEditingGroupId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити групу?")) return;
    await deleteGroup.mutateAsync(id);
  };
  const filtered =
    groups?.filter((g) =>
      g.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between ">
        <h1 className="text-2xl font-bold">Dispatcher Groups</h1>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Dispatcher Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Morning Shift"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {createError}
                </div>
              )}
              <Button type="submit" disabled={createGroup.isPending}>
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 w-full"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No groups yet. Create one!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((group) => (
            <Card
              key={group.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/groups/${group.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  {editingGroupId === group.id ? (
                    <div
                      className="flex items-center gap-2 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleUpdateName(group.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setEditingGroupId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <CardTitle className="text-base flex items-center gap-2">
                      {group.name}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGroupId(group.id);
                          setEditingName(group.name);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </CardTitle>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(group.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{group.dispatchers.length} dispatchers</span>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/groups/${group.id}`);
                  }}
                >
                  <MessageSquare className="mr-2 h-3 w-3" />
                  Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/announcements?groupId=${group.id}`);
                  }}
                >
                  <Megaphone className="mr-2 h-3 w-3" />
                  Broadcast
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
