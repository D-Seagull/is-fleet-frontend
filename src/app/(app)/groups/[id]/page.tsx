"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  X,
  Send,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useGroup,
  useGroupMessages,
  useAddDispatcherToGroup,
  useRemoveDispatcherFromGroup,
  GroupMessage,
} from "@/hooks/use-groups";
import { useDispatchers } from "@/hooks/use-dispatchers";
import { useAuthStore } from "@/store/auth";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [newMessage, setNewMessage] = useState("");
  const [showAddDispatcher, setShowAddDispatcher] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: group, isLoading: loadingGroup } = useGroup(id);
  const { data: messages, isLoading: loadingMessages } = useGroupMessages(id);
  const { data: dispatchers } = useDispatchers();
  const addDispatcher = useAddDispatcherToGroup();
  const removeDispatcher = useRemoveDispatcherFromGroup();

  // Доступні диспетчери (не в групі)
  const groupDispatcherIds =
    group?.dispatchers.map((d) => d.dispatcher.id) ?? [];
  const availableDispatchers =
    dispatchers?.filter((d) => !groupDispatcherIds.includes(d.id)) ?? [];

  // Socket.io
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_group", { groupId: id });

    socket.on("new_group_message", (message: GroupMessage) => {
      queryClient.setQueryData<GroupMessage[]>(
        ["group-messages", id],
        (prev = []) => [...prev, message],
      );
    });

    socket.on(
      "group_typing",
      ({ userId, name }: { userId: string; name: string }) => {
        if (userId !== user?.id) {
          setIsTyping(true);
          setTypingUser(name);
        }
      },
    );

    socket.on("group_stopped_typing", ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setIsTyping(false);
        setTypingUser(null);
      }
    });

    return () => {
      socket.emit("leave_group", { groupId: id });
      socket.off("new_group_message");
      socket.off("group_typing");
      socket.off("group_stopped_typing");
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
    getSocket().emit("group_typing", { groupId: id, name: user?.name });
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
    <div className="flex h-full overflow-hidden">
      {/* Ліва колонка — учасники */}
      <div className="w-72 border-r flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b shrink-0 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/groups")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold">{group.name}</h2>
            <p className="text-xs text-muted-foreground">
              {group.dispatchers.length} dispatchers
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {group.dispatchers.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {d.dispatcher.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {d.dispatcher.name ?? "No name"}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => router.push(`/chat?userId=${d.dispatcher.id}`)}
                  title="Write personally"
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() =>
                    removeDispatcher.mutate({
                      groupId: id,
                      dispatcherId: d.dispatcher.id,
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Додати диспетчера */}
        <div className="p-3 border-t shrink-0">
          {showAddDispatcher ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Add dispatcher:</p>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {availableDispatchers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No available dispatchers
                  </p>
                ) : (
                  availableDispatchers.map((d) => (
                    <button
                      key={d.id}
                      onClick={() =>
                        addDispatcher.mutate({
                          groupId: id,
                          dispatcherId: d.id,
                        })
                      }
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left text-sm"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {d.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{d.name ?? d.email}</span>
                    </button>
                  ))
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddDispatcher(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddDispatcher(true)}
            >
              <UserPlus className="mr-2 h-3 w-3" />
              Add Dispatcher
            </Button>
          )}
        </div>
      </div>

      {/* Права колонка — чат */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b shrink-0">
          <h3 className="font-semibold">{group.name} — Group Chat</h3>
        </div>

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
                    <Avatar className="h-7 w-7 mr-2 shrink-0 self-end">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {msg.sender.name?.slice(0, 2).toUpperCase() ?? "??"}
                      </AvatarFallback>
                    </Avatar>
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
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.sender.name ?? msg.sender.role}
                      </p>
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

        <form
          onSubmit={handleSend}
          className="p-4 border-t shrink-0 flex gap-2"
        >
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
    </div>
  );
}
