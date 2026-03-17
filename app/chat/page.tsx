"use client"

import { useState, useEffect } from "react"
import { Search, Send, Calendar, Truck, Users, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useSidebar } from "@/components/ui/sidebar"
import { chats, messages } from "@/lib/mock-data"

export default function ChatPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [messageSearchQuery, setMessageSearchQuery] = useState("")
  const [selectedChat, setSelectedChat] = useState<string | null>(chats[0]?.id || null)
  const [newMessage, setNewMessage] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const { setOpen } = useSidebar()

  useEffect(() => {
    if (selectedChat) {
      setOpen(false)
    }
  }, [selectedChat, setOpen])

  const filteredChats = chats.filter(
    (chat) =>
      chat.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.truckPlate?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const selectedChatData = chats.find((c) => c.id === selectedChat)

  const getParticipantIcon = (type: string) => {
    switch (type) {
      case "driver":
        return <Truck className="h-4 w-4" />
      case "dispatcher":
        return <Users className="h-4 w-4" />
      case "teamlead":
        return <UserCog className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 rounded-lg border">
      {/* Left Panel - Chat List */}
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`flex items-start gap-3 border-b p-4 text-left transition-colors hover:bg-muted/50 ${
                  selectedChat === chat.id ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={chat.avatarUrl} />
                  <AvatarFallback>{chat.participantName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{chat.participantName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getParticipantIcon(chat.participantType)}
                    {chat.truckPlate && (
                      <span className="text-xs text-muted-foreground">
                        {chat.truckPlate}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {chat.lastMessage}
                  </p>
                </div>
                {chat.unreadCount > 0 && (
                  <Badge className="shrink-0">{chat.unreadCount}</Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex flex-1 flex-col">
        {selectedChatData ? (
          <>
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedChatData.avatarUrl} />
                  <AvatarFallback>
                    {selectedChatData.participantName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{selectedChatData.participantName}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getParticipantIcon(selectedChatData.participantType)}
                    <span className="capitalize">{selectedChatData.participantType}</span>
                    {selectedChatData.truckPlate && (
                      <>
                        <span>•</span>
                        <span>{selectedChatData.truckPlate}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    className="h-8 w-48 pl-8"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderType === "dispatcher" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[70%] gap-2 ${
                        message.senderType === "dispatcher" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedChatData.avatarUrl} />
                        <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          message.senderType === "dispatcher"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="mt-1 text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newMessage.trim()) {
                      setNewMessage("")
                    }
                  }}
                />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  )
}
