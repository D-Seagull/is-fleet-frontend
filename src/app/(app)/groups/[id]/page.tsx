"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fullName } from "@/lib/format";
import {
  ArrowLeft,
  Users,
  UserPlus,
  X,
  Send,
  Loader2,
  Smile,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  useGroup,
  useGroupMessages,
  useAddManagerToGroup,
  useRemoveManagerFromGroup,
  GroupMessage,
} from "@/hooks/use-groups";
import { useManagers } from "@/hooks/use-managers";
import { useAuthStore } from "@/store/auth";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAddManager, setShowAddManager] = useState(false);

  const { data: group, isLoading: loadingGroup } = useGroup(id);
  const { data: messages, isLoading: loadingMessages } = useGroupMessages(id);
  const { data: managers } = useManagers();
  const addManager = useAddManagerToGroup();
  const removeManager = useRemoveManagerFromGroup();

  const groupManagerIds =
    group?.managers.map((d) => d.manager.id) ?? [];
  const availableManagers =
    managers?.filter((d) => !groupManagerIds.includes(d.id)) ?? [];

  useEffect(() => {
    const socket = getSocket();

    const joinGroup = () => {
      console.log("🔵 Joining group:", id);
      socket.emit("join_group", { groupId: id });
    };

    // Завжди слухаємо reconnect, щоб заново зайти в кімнату
    socket.on("connect", joinGroup);
    if (socket.connected) {
      joinGroup();
    }

    const onNewGroupMessage = (message: GroupMessage) => {
      queryClient.setQueryData<GroupMessage[]>(
        ["group-messages", id],
        (prev = []) => [...prev, message],
      );
    };
    const onGroupTyping = ({
      userId,
      name,
    }: {
      userId: string;
      name: string;
    }) => {
      if (userId !== user?.id) {
        setIsTyping(true);
        setTypingUser(name);
      }
    };
    const onGroupStoppedTyping = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setIsTyping(false);
        setTypingUser(null);
      }
    };

    socket.on("new_group_message", onNewGroupMessage);
    socket.on("group_typing", onGroupTyping);
    socket.on("group_stopped_typing", onGroupStoppedTyping);

    return () => {
      socket.emit("leave_group", { groupId: id });
      socket.off("connect", joinGroup);
      // Pass specific callbacks — otherwise socket.off(event) wipes ALL
      // listeners, including the global ones in AppLayoutInner.
      socket.off("new_group_message", onNewGroupMessage);
      socket.off("group_typing", onGroupTyping);
      socket.off("group_stopped_typing", onGroupStoppedTyping);
    };
  }, [id, user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    getSocket().emit("send_group_message", {
      groupId: id,
      content: newMessage,
    });
    setNewMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    getSocket().emit("group_typing", { groupId: id, name: fullName(user) });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      getSocket().emit("group_stopped_typing", { groupId: id });
    }, 2000);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  if (loadingGroup) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) return <div>Group not found</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Хедер */}
      <div className="p-4 border-b shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/groups")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="font-semibold">{group.name}</p>
            <p className="text-xs text-muted-foreground">
              {group.managers.length} managers
            </p>
          </div>
        </div>

        {/* Кнопка учасників */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Users className="mr-2 h-4 w-4" />
              Members
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Members — {group.name}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 mt-4">
              {group.managers.map((d) => (
                <div key={d.id} className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-2 hover:opacity-75 transition-opacity"
                    onClick={() =>
                      router.push(`/chat?userId=${d.manager.id}`)
                    }
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {fullName(d.manager)?.slice(0, 2).toUpperCase() ?? "??"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {fullName(d.manager) || "No name"}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() =>
                        router.push(`/chat?userId=${d.manager.id}`)
                      }
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    {user?.id === group.createdBy && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              removeManager.mutate({
                                groupId: id,
                                managerId: d.manager.id,
                              })
                            }
                          >
                            <X className="mr-2 h-3.5 w-3.5" />
                            Remove from group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}

              {/* Додати менеджера — тільки для творця групи */}
              {user?.id === group.createdBy && <div className="border-t pt-3">
                {showAddManager ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      Add manager:
                    </p>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {availableManagers.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No available managers
                        </p>
                      ) : (
                        availableManagers.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => {
                              addManager.mutate({
                                groupId: id,
                                managerId: d.id,
                              });
                            }}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left text-sm"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {d.email.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{fullName(d) || d.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddManager(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAddManager(true)}
                  >
                    <UserPlus className="mr-2 h-3 w-3" />
                    Add Manager
                  </Button>
                )}
              </div>}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Повідомлення */}
      <div className="flex-1 overflow-y-auto p-4">
        {loadingMessages ? (
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.senderId === user?.id ? "justify-end" : "justify-start",
                )}
              >
                {msg.senderId !== user?.id && (
                  <button
                    className="shrink-0 self-end mr-2"
                    onClick={() =>
                      router.push(`/chat?userId=${msg.senderId}`)
                    }
                  >
                    <Avatar className="h-7 w-7 hover:opacity-75 transition-opacity">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {fullName(msg.sender)?.slice(0, 2).toUpperCase() ?? "??"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2",
                    msg.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {msg.senderId !== user?.id && (
                    <button
                      className="text-xs font-medium mb-1 opacity-70 hover:opacity-100 transition-opacity text-left"
                      onClick={() =>
                        router.push(`/chat?userId=${msg.senderId}`)
                      }
                    >
                      {fullName(msg.sender) || msg.sender.role}
                    </button>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      msg.senderId === user?.id
                        ? "text-primary-foreground/70 text-right"
                        : "text-muted-foreground",
                    )}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Індикатор вводу */}
      {isTyping && (
        <div className="px-4 py-1 shrink-0 text-xs text-muted-foreground flex items-center gap-1">
          <span>{typingUser ?? "Someone"} is typing</span>
          <span className="flex gap-0.5">
            <span className="animate-bounce delay-0">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </span>
        </div>
      )}

      {/* Інпут */}
      <form onSubmit={handleSend} className="p-4 border-t shrink-0 flex gap-2">
        <Popover>
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
            <EmojiPicker onEmojiClick={handleEmojiClick} skinTonesDisabled />
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
    </div>
  );
}
