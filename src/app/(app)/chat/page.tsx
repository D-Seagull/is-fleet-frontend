"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import {
  Loader2,
  Send,
  ArrowLeft,
  Users,
  Plus,
  UserPlus,
  MoreVertical,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useConversations,
  useMessages,
  useChatUser,
  DirectMessage,
} from "@/hooks/use-direct-messages";
import { useAuthStore } from "@/store/auth";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useGroupsForChat,
  useCreateGroup,
  useAddManagerToGroup,
  useGroup,
  useGroupMessages,
  useRemoveManagerFromGroup,
  GroupMessage,
} from "@/hooks/use-groups";
import { useManagers } from "@/hooks/use-managers";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const userIdFromUrl = searchParams.get("userId");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    userIdFromUrl ?? null,
  );
  const [showConversations, setShowConversations] = useState(!userIdFromUrl);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedUserIdRef = useRef(selectedUserId);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"managers" | "drivers">("managers");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupTyping, setIsGroupTyping] = useState(false);
  const [groupTypingName, setGroupTypingName] = useState<string | null>(null);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations, isLoading: loadingConversations } =
    useConversations();
  const { data: messages, isLoading: loadingMessages } = useMessages(
    selectedUserId ?? "",
  );
  const { data: chatUser } = useChatUser(selectedUserId ?? "");
  const { data: groups } = useGroupsForChat();
  const { data: managers } = useManagers();
  const createGroup = useCreateGroup();
  const addMember = useAddManagerToGroup();
  const removeMember = useRemoveManagerFromGroup();
  const { data: selectedGroup } = useGroup(selectedGroupId ?? "");
  const { data: groupMessages } = useGroupMessages(selectedGroupId ?? "");

  const selectedUser =
    conversations?.find((c) => c.user.id === selectedUserId)?.user ?? chatUser;

  const managerConvs = (conversations ?? []).filter(
    (c) => c.user.role === "MANAGER" || c.user.role === "TEAMLEAD",
  );
  const driverConvs = (conversations ?? []).filter(
    (c) => c.user.role === "DRIVER",
  );

  const searchQ = searchQuery.toLowerCase().trim();
  const filteredGroups = !searchQ
    ? (groups ?? [])
    : (groups ?? []).filter((g) => g.name.toLowerCase().includes(searchQ));
  const filteredManagerConvs = !searchQ
    ? managerConvs
    : managerConvs.filter((c) =>
        (c.user.name ?? "").toLowerCase().includes(searchQ),
      );
  const filteredDriverConvs = !searchQ
    ? driverConvs
    : driverConvs.filter((c) =>
        (c.user.name ?? "").toLowerCase().includes(searchQ),
      );

  type Conv = NonNullable<typeof conversations>[number];
  const renderConvButton = (conv: Conv) => (
    <button
      key={conv.user.id}
      onClick={() => handleSelectUser(conv.user.id)}
      className={cn(
        "w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
        selectedUserId === conv.user.id && "bg-muted",
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">
          {conv.user.name?.slice(0, 2).toUpperCase() ?? "??"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium truncate">
            {conv.user.name ?? conv.user.role}
          </p>
          {conv.unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0">
              {conv.unreadCount}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {conv.lastMessage.content}
        </p>
      </div>
    </button>
  );

  const markMessagesAsRead = useCallback(
    (userId: string) => {
      getSocket().emit("mark_as_read", { senderId: userId });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    [queryClient],
  );

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      markMessagesAsRead(selectedUserId);
    }
  }, [selectedUserId, markMessagesAsRead]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("new_direct_message", (message: DirectMessage) => {
      const otherUserId =
        message.senderId === user?.id ? message.receiverId : message.senderId;
      queryClient.setQueryData<DirectMessage[]>(
        ["messages", otherUserId],
        (prev = []) => [...prev, message],
      );
      if (
        message.senderId !== user?.id &&
        selectedUserIdRef.current === message.senderId
      ) {
        markMessagesAsRead(message.senderId);
      } else {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    });
    socket.on("messages_read", ({ readBy }: { readBy: string }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", readBy] });
    });
    return () => {
      socket.off("new_direct_message");
      socket.off("messages_read");
    };
  }, [user?.id, queryClient, markMessagesAsRead]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("user_typing", ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(true);
    });
    socket.on("user_stopped_typing", ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(false);
    });
    return () => {
      socket.off("user_typing");
      socket.off("user_stopped_typing");
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedGroupId) return;
    const socket = getSocket();
    socket.emit("join_group", { groupId: selectedGroupId });

    const onNewGroupMessage = (msg: GroupMessage) => {
      if (msg.groupId !== selectedGroupId) return;
      queryClient.setQueryData<GroupMessage[]>(
        ["group-messages", selectedGroupId],
        (prev = []) => [...prev, msg],
      );
    };
    const onGroupTyping = ({
      groupId,
      userId,
      name,
    }: {
      groupId: string;
      userId: string;
      name?: string;
    }) => {
      if (groupId === selectedGroupId && userId !== user?.id) {
        setIsGroupTyping(true);
        setGroupTypingName(name ?? null);
      }
    };
    const onGroupStoppedTyping = ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      if (groupId === selectedGroupId && userId !== user?.id) {
        setIsGroupTyping(false);
      }
    };

    socket.on("new_group_message", onNewGroupMessage);
    socket.on("group_typing", onGroupTyping);
    socket.on("group_stopped_typing", onGroupStoppedTyping);

    return () => {
      socket.emit("leave_group", { groupId: selectedGroupId });
      socket.off("new_group_message", onNewGroupMessage);
      socket.off("group_typing", onGroupTyping);
      socket.off("group_stopped_typing", onGroupStoppedTyping);
    };
  }, [selectedGroupId, user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedGroupId(null);
    setShowConversations(false);
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedUserId(null);
    setShowConversations(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (selectedGroupId) {
      getSocket().emit("send_group_message", {
        groupId: selectedGroupId,
        content: newMessage,
      });
    } else if (selectedUserId) {
      getSocket().emit("send_direct_message", {
        receiverId: selectedUserId,
        content: newMessage,
      });
    } else {
      return;
    }
    setNewMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const socket = getSocket();
    if (selectedGroupId) {
      socket.emit("group_typing", {
        groupId: selectedGroupId,
        name: user?.name,
      });
    } else if (selectedUserId) {
      socket.emit("typing_start", { receiverId: selectedUserId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedGroupId) {
        getSocket().emit("group_stopped_typing", { groupId: selectedGroupId });
      } else if (selectedUserId) {
        getSocket().emit("typing_stop", { receiverId: selectedUserId });
      }
    }, 2000);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name || selectedMemberIds.size === 0) return;
    const group = await createGroup.mutateAsync(name);
    await Promise.all(
      [...selectedMemberIds].map((managerId) =>
        addMember.mutateAsync({ groupId: group.id, managerId }),
      ),
    );
    setNewGroupName("");
    setSelectedMemberIds(new Set());
    setGroupDialogOpen(false);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Список розмов */}
      <div
        className={cn(
          "border-r flex flex-col overflow-hidden",
          "md:w-80 md:flex",
          showConversations ? "flex w-full" : "hidden md:flex",
        )}
      >
        <div className="p-4 border-b shrink-0 space-y-3">
          <h2 className="font-semibold">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "managers" | "drivers")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-2 grid grid-cols-2 shrink-0">
            <TabsTrigger value="managers">Managers</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
          </TabsList>

          <TabsContent
            value="managers"
            className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden"
          >
            {/* Заголовок Groups з кнопкою "+" (заглушка — Dialog буде в Етапі 4) */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Groups
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setGroupDialogOpen(true)}
                title="Create group"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <button
                  key={`group-${group.id}`}
                  onClick={() => handleSelectGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
                    selectedGroupId === group.id && "bg-muted",
                  )}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {group.managers.length} members
                    </p>
                  </div>
                </button>
              ))
            ) : searchQ ? (
              <p className="text-center text-muted-foreground/70 px-4 py-2 text-xs">
                No matching groups
              </p>
            ) : (
              <p className="text-center text-muted-foreground/70 px-4 py-2 text-xs">
                No groups yet
              </p>
            )}

            <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-2">
              Direct Messages
            </div>
            {loadingConversations ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredManagerConvs.length === 0 ? (
              <p className="text-center text-muted-foreground p-4 text-sm">
                {searchQ ? "No matches" : "No conversations yet"}
              </p>
            ) : (
              filteredManagerConvs.map((conv) => renderConvButton(conv))
            )}
          </TabsContent>

          <TabsContent
            value="drivers"
            className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden"
          >
            {loadingConversations ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDriverConvs.length === 0 ? (
              <p className="text-center text-muted-foreground p-4 text-sm">
                {searchQ ? "No matches" : "No conversations yet"}
              </p>
            ) : (
              filteredDriverConvs.map((conv) => renderConvButton(conv))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Вікно повідомлень */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden",
          !showConversations ? "flex" : "hidden md:flex",
        )}
      >
        {selectedUser || selectedGroup ? (
          <>
            <div className="p-4 border-b shrink-0 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setShowConversations(true)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {selectedGroup ? (
                <>
                  <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {selectedGroup.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedGroup.managers.length} members
                    </p>
                  </div>
                  <Sheet
                    open={membersSheetOpen}
                    onOpenChange={setMembersSheetOpen}
                  >
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" title="Members">
                        <Users className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>{selectedGroup.name}</SheetTitle>
                      </SheetHeader>
                      <div className="px-4 space-y-4 mt-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                            Members ({selectedGroup.managers.length})
                          </p>
                          <div className="space-y-1">
                            {selectedGroup.managers.map((gm) => {
                              const isSelf = gm.manager.id === user?.id;
                              return (
                                <div
                                  key={gm.id}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isSelf) return;
                                      handleSelectUser(gm.manager.id);
                                      setMembersSheetOpen(false);
                                    }}
                                    disabled={isSelf}
                                    className="flex items-center gap-2 flex-1 min-w-0 text-left disabled:cursor-default"
                                  >
                                    <Avatar className="h-8 w-8 shrink-0">
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {gm.manager.name
                                          ?.slice(0, 2)
                                          .toUpperCase() ?? "??"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 text-sm truncate">
                                      {gm.manager.name ?? gm.manager.email}
                                      {isSelf && (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                          (you)
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                  {selectedGroup.createdBy === user?.id &&
                                    !isSelf && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() =>
                                              removeMember.mutate({
                                                groupId: selectedGroup.id,
                                                managerId: gm.manager.id,
                                              })
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {selectedGroup.createdBy === user?.id && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                              Add member
                            </p>
                            <div className="flex gap-2">
                              <select
                                value={newMemberId ?? ""}
                                onChange={(e) =>
                                  setNewMemberId(e.target.value || null)
                                }
                                className="flex-1 h-9 rounded-md border bg-background px-2 text-sm"
                              >
                                <option value="">Select manager…</option>
                                {(managers ?? [])
                                  .filter(
                                    (m) =>
                                      !selectedGroup.managers.some(
                                        (gm) => gm.manager.id === m.id,
                                      ),
                                  )
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name ?? m.email}
                                    </option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                disabled={!newMemberId || addMember.isPending}
                                onClick={async () => {
                                  if (!newMemberId) return;
                                  await addMember.mutateAsync({
                                    groupId: selectedGroup.id,
                                    managerId: newMemberId,
                                  });
                                  setNewMemberId(null);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              ) : selectedUser ? (
                <>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedUser.name?.slice(0, 2).toUpperCase() ?? "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedUser.name ?? "No name"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.role}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingMessages && !selectedGroupId ? (
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(selectedGroupId
                    ? (groupMessages ?? [])
                    : (messages ?? [])
                  ).map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    const senderName =
                      !isOwn && selectedGroupId
                        ? (msg as GroupMessage).sender?.name
                        : null;
                    const isRead = !selectedGroupId
                      ? (msg as DirectMessage).isRead
                      : null;
                    const showSenderAvatar = !isOwn;
                    const avatarName = !isOwn
                      ? selectedGroupId
                        ? (msg as GroupMessage).sender?.name
                        : selectedUser?.name
                      : null;
                    const senderInitials =
                      (avatarName ?? "??").slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-2",
                          isOwn ? "justify-end" : "justify-start",
                        )}
                      >
                        {showSenderAvatar &&
                          (selectedGroupId ? (
                            <button
                              type="button"
                              onClick={() => handleSelectUser(msg.senderId)}
                              className="shrink-0"
                              title={`Message ${senderName ?? "user"}`}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {senderInitials}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          ) : (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {senderInitials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          {senderName && (
                            <button
                              type="button"
                              onClick={() => handleSelectUser(msg.senderId)}
                              className="block text-xs font-semibold mb-0.5 opacity-80 hover:underline cursor-pointer"
                            >
                              {senderName}
                            </button>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={cn(
                              "text-xs mt-1 flex items-center gap-1",
                              isOwn
                                ? "text-primary-foreground/70 justify-end"
                                : "text-muted-foreground",
                            )}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isOwn && isRead != null && (
                              <span>{isRead ? "✓✓" : "✓"}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {!selectedGroupId && isTyping && (
              <div className="px-4 py-1 shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                <span>{selectedUser?.name ?? "Someone"} is typing</span>
                <span className="flex gap-0.5">
                  <span className="animate-bounce delay-0">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              </div>
            )}
            {selectedGroupId && isGroupTyping && (
              <div className="px-4 py-1 shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                <span>{groupTypingName ?? "Someone"} is typing</span>
                <span className="flex gap-0.5">
                  <span className="animate-bounce delay-0">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="p-4 border-t shrink-0 flex gap-2"
            >
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 border-none"
                  side="top"
                  align="start"
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    skinTonesDisabled
                    searchDisabled={false}
                  />
                </PopoverContent>
              </Popover>
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </div>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Morning Shift"
              />
            </div>
            <div className="space-y-2">
              <Label>Members ({selectedMemberIds.size} selected)</Label>
              <ScrollArea className="h-60 rounded border">
                <div className="p-2">
                  {(managers ?? [])
                    .filter((m) => m.id !== user?.id)
                    .map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMemberIds.has(m.id)}
                          onCheckedChange={(checked) => {
                            setSelectedMemberIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(m.id);
                              else next.delete(m.id);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm">{m.name ?? m.email}</span>
                      </label>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGroupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={
                !newGroupName.trim() ||
                selectedMemberIds.size === 0 ||
                createGroup.isPending ||
                addMember.isPending
              }
            >
              {createGroup.isPending || addMember.isPending
                ? "Creating..."
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageContent />
    </Suspense>
  );
}
