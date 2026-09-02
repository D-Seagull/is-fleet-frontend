import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Function form → socket.io calls it before EVERY (re)connect, so the
      // handshake always carries the CURRENT in-memory access token (a silent
      // refresh may have rotated it since login). The token is no longer in
      // localStorage; the gateway reads handshake.auth.token.
      auth: (cb) => cb({ token: useAuthStore.getState().token ?? "" }),
      // Websocket first → fallback to long-polling if WS is blocked.
      // WS gives near-instant delivery; polling adds ~1-2s per cycle.
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    if (process.env.NODE_ENV !== "production") {
      socket.on("connect", () =>
        console.log("✅ Socket connected:", socket?.id),
      );
      socket.on("disconnect", (reason) =>
        console.log("❌ Socket disconnected:", reason),
      );
    }
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

/**
 * Re-run the handshake on the EXISTING socket (same instance, so every
 * registered listener survives). socket.connect() re-invokes the `auth`
 * function, which re-reads the current in-memory token — so a socket that
 * first connected before the token was ready (cold load / silent refresh)
 * re-authenticates and the backend rejoins its user room. No-op if no socket
 * exists yet; the next getSocket() will create one with the token present.
 */
export function reconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket.connect();
  }
}
