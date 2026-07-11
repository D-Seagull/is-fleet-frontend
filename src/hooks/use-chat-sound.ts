"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

/**
 * Play a short beep when an incoming DM / group message arrives, or when
 * the current user is added to a new group. Mounted globally in
 * AppLayoutInner so the ping fires no matter which page is open.
 *
 * A soft rate-limit (500ms) prevents overlapping beeps when a burst of
 * messages lands at once. Autoplay is blocked in the browser until the
 * user has interacted with the page — the catch just swallows the promise
 * rejection so nothing surfaces in the console before that first click.
 */
const RATE_LIMIT_MS = 500;
let lastPlayedAt = 0;

function playPing() {
  const now = Date.now();
  if (now - lastPlayedAt < RATE_LIMIT_MS) return;
  lastPlayedAt = now;
  try {
    const a = new Audio("/sounds/is_message.mp3");
    a.volume = 0.6;
    void a.play().catch(() => {
      /* autoplay blocked — silent until first user interaction */
    });
  } catch {
    /* Audio constructor unavailable (SSR / very old browser) — silent */
  }
}

export function useChatSoundSync() {
  const meId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!meId) return;
    const socket = getSocket();

    const onNewDm = (msg: { senderId: string }) => {
      if (msg.senderId === meId) return;
      playPing();
    };
    const onNewGroupMsg = (msg: { senderId: string }) => {
      if (msg.senderId === meId) return;
      playPing();
    };
    const onGroupAdded = () => {
      // Someone put me in a fresh group — worth an audible ping.
      playPing();
    };

    socket.on("new_direct_message", onNewDm);
    socket.on("new_group_message", onNewGroupMsg);
    socket.on("group_added", onGroupAdded);
    return () => {
      socket.off("new_direct_message", onNewDm);
      socket.off("new_group_message", onNewGroupMsg);
      socket.off("group_added", onGroupAdded);
    };
  }, [meId]);
}
