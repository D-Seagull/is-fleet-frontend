"use client"

import { useState, useEffect } from "react"
import { Search, Users, Truck, Megaphone, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useSidebar } from "@/components/ui/sidebar"
import { groups } from "@/lib/mock-data"

export default function GroupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const { setOpen } = useSidebar()

  const truckGroups = groups.filter((g) => g.type === "truck")
  const dispatcherGroups = groups.filter((g) => g.type === "dispatcher")

  useEffect(() => {
    if (selectedGroup) {
      setOpen(false)
    }
  }, [selectedGroup, setOpen])

  const filteredTruckGroups = truckGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredDispatcherGroups = dispatcherGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedGroupData = groups.find((g) => g.id === selectedGroup)

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6">
      <div
        className={`flex flex-1 flex-col gap-6 transition-all ${
          selectedGroup ? "md:w-1/2" : "w-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Groups</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-6 pr-4">
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Truck className="h-5 w-5" />
                Truck Groups
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTruckGroups.map((group) => (
                  <Card
                    key={group.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedGroup === group.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() =>
                      setSelectedGroup(selectedGroup === group.id ? null : group.id)
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Megaphone className="mr-2 h-4 w-4" />
                              Announce
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Send Announcement to {group.name}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4">
                              <div className="flex flex-col gap-2">
                                <Label>Message</Label>
                                <Textarea placeholder="Enter your announcement..." />
                              </div>
                              <Button>Send Announcement</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{group.memberCount} trucks</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5" />
                Dispatcher Groups
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredDispatcherGroups.map((group) => (
                  <Card
                    key={group.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedGroup === group.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() =>
                      setSelectedGroup(selectedGroup === group.id ? null : group.id)
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Megaphone className="mr-2 h-4 w-4" />
                              Announce
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Send Announcement to {group.name}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4">
                              <div className="flex flex-col gap-2">
                                <Label>Message</Label>
                                <Textarea placeholder="Enter your announcement..." />
                              </div>
                              <Button>Send Announcement</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{group.memberCount} dispatchers</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>

      {selectedGroup && selectedGroupData && (
        <div className="hidden w-80 flex-col gap-4 border-l pl-6 md:flex">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedGroupData.name}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedGroup(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedGroupData.memberCount}{" "}
            {selectedGroupData.type === "truck" ? "trucks" : "dispatchers"}
          </p>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2">
              {selectedGroupData.members.map((member) => (
                <div key={member.id}>
                  {selectedGroupData.type === "truck" ? (
                    <Link
                      href={`/trucks/${member.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>
                          <Truck className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg p-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>
                          <Users className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
