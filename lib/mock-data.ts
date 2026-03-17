export type TruckStatus = "available" | "on-trip" | "repair"
export type DriverStatus = "active" | "inactive"
export type DispatcherStatus = "active" | "inactive" | "on-break"
export type TripStatus = "completed" | "in-progress" | "scheduled"
export type DocumentType = "invoice" | "bill-of-lading" | "pod" | "other"

export interface Truck {
  id: string
  plateNumber: string
  status: TruckStatus
  currentDriverId: string | null
  currentDriverName: string | null
  notes: string[]
}

export interface Driver {
  id: string
  name: string
  phone: string
  language: string
  assignedDispatcher: string
  status: DriverStatus
  rating: number
  avatarUrl: string
}

export interface Dispatcher {
  id: string
  name: string
  phone: string
  email: string
  status: DispatcherStatus
  assignedDrivers: number
  assignedTrucks: number
  avatarUrl: string
}

export interface Trip {
  id: string
  truckId: string
  driverId: string
  origin: string
  destination: string
  status: TripStatus
  startDate: string
  endDate: string | null
}

export interface Document {
  id: string
  name: string
  type: DocumentType
  uploadDate: string
  tripId: string
  tripNumber: string
  truckId: string
  truckPlate: string
  driverId: string
  driverName: string
  url: string
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderType: "driver" | "dispatcher" | "teamlead"
  content: string
  timestamp: string
  isRead: boolean
}

export interface Chat {
  id: string
  participantId: string
  participantName: string
  participantType: "driver" | "dispatcher" | "teamlead"
  truckPlate: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  avatarUrl: string
}

export interface Group {
  id: string
  name: string
  type: "truck" | "dispatcher"
  memberCount: number
  members: { id: string; name: string; avatarUrl: string }[]
}

export const trucks: Truck[] = [
  { id: "1", plateNumber: "ABC-1234", status: "available", currentDriverId: "1", currentDriverName: "John Smith", notes: ["Regular maintenance due next month", "New tires installed 01/2026"] },
  { id: "2", plateNumber: "XYZ-5678", status: "on-trip", currentDriverId: "2", currentDriverName: "Mike Johnson", notes: ["GPS tracker replaced"] },
  { id: "3", plateNumber: "DEF-9012", status: "repair", currentDriverId: null, currentDriverName: null, notes: ["Engine repair in progress"] },
  { id: "4", plateNumber: "GHI-3456", status: "available", currentDriverId: "3", currentDriverName: "Carlos Rodriguez", notes: [] },
  { id: "5", plateNumber: "JKL-7890", status: "on-trip", currentDriverId: "4", currentDriverName: "David Lee", notes: ["AC needs servicing"] },
]

export const drivers: Driver[] = [
  { id: "1", name: "John Smith", phone: "+1 555-0101", language: "English", assignedDispatcher: "Sarah Wilson", status: "active", rating: 4.8, avatarUrl: "/avatars/driver1.jpg" },
  { id: "2", name: "Mike Johnson", phone: "+1 555-0102", language: "English", assignedDispatcher: "Sarah Wilson", status: "active", rating: 4.5, avatarUrl: "/avatars/driver2.jpg" },
  { id: "3", name: "Carlos Rodriguez", phone: "+1 555-0103", language: "Spanish", assignedDispatcher: "Tom Brown", status: "active", rating: 4.9, avatarUrl: "/avatars/driver3.jpg" },
  { id: "4", name: "David Lee", phone: "+1 555-0104", language: "English", assignedDispatcher: "Tom Brown", status: "active", rating: 4.2, avatarUrl: "/avatars/driver4.jpg" },
  { id: "5", name: "Alex Kim", phone: "+1 555-0105", language: "Korean", assignedDispatcher: "Sarah Wilson", status: "inactive", rating: 4.0, avatarUrl: "/avatars/driver5.jpg" },
]

export const dispatchers: Dispatcher[] = [
  { id: "d1", name: "Sarah Wilson", phone: "+1 555-0201", email: "sarah.wilson@isfleet.com", status: "active", assignedDrivers: 3, assignedTrucks: 3, avatarUrl: "/avatars/dispatcher1.jpg" },
  { id: "d2", name: "Tom Brown", phone: "+1 555-0202", email: "tom.brown@isfleet.com", status: "active", assignedDrivers: 2, assignedTrucks: 2, avatarUrl: "/avatars/dispatcher2.jpg" },
  { id: "d3", name: "Emily Davis", phone: "+1 555-0203", email: "emily.davis@isfleet.com", status: "on-break", assignedDrivers: 0, assignedTrucks: 0, avatarUrl: "/avatars/dispatcher3.jpg" },
  { id: "d4", name: "James Miller", phone: "+1 555-0204", email: "james.miller@isfleet.com", status: "active", assignedDrivers: 4, assignedTrucks: 4, avatarUrl: "/avatars/dispatcher4.jpg" },
  { id: "d5", name: "Lisa Anderson", phone: "+1 555-0205", email: "lisa.anderson@isfleet.com", status: "inactive", assignedDrivers: 0, assignedTrucks: 0, avatarUrl: "/avatars/dispatcher5.jpg" },
]

export const trips: Trip[] = [
  { id: "1", truckId: "2", driverId: "2", origin: "Los Angeles, CA", destination: "Phoenix, AZ", status: "in-progress", startDate: "2026-03-14", endDate: null },
  { id: "2", truckId: "5", driverId: "4", origin: "Seattle, WA", destination: "Portland, OR", status: "in-progress", startDate: "2026-03-15", endDate: null },
  { id: "3", truckId: "1", driverId: "1", origin: "Chicago, IL", destination: "Detroit, MI", status: "completed", startDate: "2026-03-10", endDate: "2026-03-11" },
  { id: "4", truckId: "1", driverId: "1", origin: "Detroit, MI", destination: "Cleveland, OH", status: "completed", startDate: "2026-03-12", endDate: "2026-03-12" },
  { id: "5", truckId: "4", driverId: "3", origin: "Dallas, TX", destination: "Houston, TX", status: "scheduled", startDate: "2026-03-16", endDate: null },
]

export const documents: Document[] = [
  { id: "1", name: "Invoice_001.pdf", type: "invoice", uploadDate: "2026-03-10", tripId: "3", tripNumber: "TRIP-003", truckId: "1", truckPlate: "ABC-1234", driverId: "1", driverName: "John Smith", url: "#" },
  { id: "2", name: "BOL_001.pdf", type: "bill-of-lading", uploadDate: "2026-03-10", tripId: "3", tripNumber: "TRIP-003", truckId: "1", truckPlate: "ABC-1234", driverId: "1", driverName: "John Smith", url: "#" },
  { id: "3", name: "POD_001.pdf", type: "pod", uploadDate: "2026-03-11", tripId: "3", tripNumber: "TRIP-003", truckId: "1", truckPlate: "ABC-1234", driverId: "1", driverName: "John Smith", url: "#" },
  { id: "4", name: "Invoice_002.pdf", type: "invoice", uploadDate: "2026-03-14", tripId: "1", tripNumber: "TRIP-001", truckId: "2", truckPlate: "XYZ-5678", driverId: "2", driverName: "Mike Johnson", url: "#" },
  { id: "5", name: "BOL_002.pdf", type: "bill-of-lading", uploadDate: "2026-03-14", tripId: "1", tripNumber: "TRIP-001", truckId: "2", truckPlate: "XYZ-5678", driverId: "2", driverName: "Mike Johnson", url: "#" },
]

export const chats: Chat[] = [
  { id: "1", participantId: "1", participantName: "John Smith", participantType: "driver", truckPlate: "ABC-1234", lastMessage: "Arrived at destination", lastMessageTime: "2026-03-15T10:30:00", unreadCount: 2, avatarUrl: "/avatars/driver1.jpg" },
  { id: "2", participantId: "2", participantName: "Mike Johnson", participantType: "driver", truckPlate: "XYZ-5678", lastMessage: "On my way to Phoenix", lastMessageTime: "2026-03-15T09:15:00", unreadCount: 0, avatarUrl: "/avatars/driver2.jpg" },
  { id: "3", participantId: "3", participantName: "Carlos Rodriguez", participantType: "driver", truckPlate: "GHI-3456", lastMessage: "Ready for next trip", lastMessageTime: "2026-03-14T16:45:00", unreadCount: 1, avatarUrl: "/avatars/driver3.jpg" },
  { id: "4", participantId: "d1", participantName: "Sarah Wilson", participantType: "dispatcher", truckPlate: null, lastMessage: "Please check the schedule", lastMessageTime: "2026-03-15T08:00:00", unreadCount: 0, avatarUrl: "/avatars/dispatcher1.jpg" },
  { id: "5", participantId: "t1", participantName: "Tom Brown", participantType: "teamlead", truckPlate: null, lastMessage: "Meeting at 3 PM", lastMessageTime: "2026-03-14T14:00:00", unreadCount: 3, avatarUrl: "/avatars/teamlead1.jpg" },
]

export const messages: Message[] = [
  { id: "1", senderId: "1", senderName: "John Smith", senderType: "driver", content: "Good morning! Starting my route now.", timestamp: "2026-03-15T08:00:00", isRead: true },
  { id: "2", senderId: "dispatcher", senderName: "You", senderType: "dispatcher", content: "Great! Safe travels. Let me know when you arrive.", timestamp: "2026-03-15T08:05:00", isRead: true },
  { id: "3", senderId: "1", senderName: "John Smith", senderType: "driver", content: "Will do! Traffic looks good so far.", timestamp: "2026-03-15T08:30:00", isRead: true },
  { id: "4", senderId: "1", senderName: "John Smith", senderType: "driver", content: "Arrived at destination", timestamp: "2026-03-15T10:30:00", isRead: false },
]

export const groups: Group[] = [
  { id: "1", name: "East Coast Fleet", type: "truck", memberCount: 3, members: [
    { id: "1", name: "ABC-1234", avatarUrl: "/avatars/truck1.jpg" },
    { id: "2", name: "XYZ-5678", avatarUrl: "/avatars/truck2.jpg" },
    { id: "3", name: "DEF-9012", avatarUrl: "/avatars/truck3.jpg" },
  ]},
  { id: "2", name: "West Coast Fleet", type: "truck", memberCount: 2, members: [
    { id: "4", name: "GHI-3456", avatarUrl: "/avatars/truck4.jpg" },
    { id: "5", name: "JKL-7890", avatarUrl: "/avatars/truck5.jpg" },
  ]},
  { id: "3", name: "Day Shift Dispatchers", type: "dispatcher", memberCount: 2, members: [
    { id: "d1", name: "Sarah Wilson", avatarUrl: "/avatars/dispatcher1.jpg" },
    { id: "d2", name: "Tom Brown", avatarUrl: "/avatars/dispatcher2.jpg" },
  ]},
  { id: "4", name: "Night Shift Dispatchers", type: "dispatcher", memberCount: 2, members: [
    { id: "d3", name: "Emily Davis", avatarUrl: "/avatars/dispatcher3.jpg" },
    { id: "d4", name: "James Miller", avatarUrl: "/avatars/dispatcher4.jpg" },
  ]},
]
