"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function ChatPage() {
  const searchParams = useSearchParams();
  const userIdFromUrl = searchParams.get("userId");

  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    userIdFromUrl ?? null,
  );
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: conversations, isLoading: loadingConversations } =
    useConversations();
  const { data: messages, isLoading: loadingMessages } = useMessages(
    selectedUserId ?? "",
  );
  const { data: chatUser } = useChatUser(selectedUserId ?? "");

  const selectedUser =
    conversations?.find((c) => c.user.id === selectedUserId)?.user ?? chatUser;

  useEffect(() => {
    const socket = getSocket();

    socket.on("new_direct_message", (message: DirectMessage) => {
      queryClient.setQueryData<DirectMessage[]>(
        [
          "messages",
          message.senderId === user?.id ? message.receiverId : message.senderId,
        ],
        (prev = []) => [...prev, message],
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    return () => {
      socket.off("new_direct_message");
    };
  }, [user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;
    getSocket().emit("send_direct_message", {
      receiverId: selectedUserId,
      content: newMessage,
    });
    setNewMessage("");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Список розмов */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations?.length === 0 ? (
            <p className="text-center text-muted-foreground p-4 text-sm">
              No conversations yet
            </p>
          ) : (
            conversations?.map((conv) => (
              <button
                key={conv.user.id}
                onClick={() => setSelectedUserId(conv.user.id)}
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
                  <p className="font-medium truncate">
                    {conv.user.name ?? conv.user.role}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage.content}
                  </p>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Вікно повідомлень */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar className="h-9 w-9">
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
            </div>

            <ScrollArea className="flex-1 p-4">
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
                        msg.senderId === user?.id
                          ? "justify-end"
                          : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            msg.senderId === user?.id
                              ? "text-primary-foreground/70"
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
            </ScrollArea>

            <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
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
    </div>
  );
}
