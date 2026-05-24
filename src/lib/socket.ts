import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    socket = io(SOCKET_URL, {
      // Send token both ways so the gateway can pick whichever it reads.
      auth: { token },
      query: { userId: token ?? "" },
      // Websocket first → fallback to long-polling if WS is blocked.
      // WS gives near-instant delivery; polling adds ~1-2s per cycle.
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () =>
      console.log("✅ Socket connected:", socket?.id),
    );
    socket.on("disconnect", (reason) =>
      console.log("❌ Socket disconnected:", reason),
    );
    socket.on("connect_error", (err) =>
      console.warn("⚠️ Socket error:", err.message),
    );
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
