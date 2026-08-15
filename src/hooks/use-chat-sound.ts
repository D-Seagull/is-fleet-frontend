"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";
import { fullName } from "@/lib/format";
import {
  primeNotifyPermission,
  showMessageNotification,
} from "@/lib/desktop-notify";

/**
 * Play a short beep AND raise a desktop notification when an incoming DM /
 * group message arrives, or when the current user is added to a new group.
 * Mounted globally in AppLayoutInner so it fires no matter which page is open.
 *
 * A soft rate-limit (500ms) prevents overlapping beeps when a burst of
 * messages lands at once. Autoplay is blocked in the browser until the
 * user has interacted with the page — the catch just swallows the promise
 * rejection so nothing surfaces in the console before that first click.
 *
 * Notifications only pop when the window isn't focused (see desktop-notify),
 * so the user isn't pinged about messages they're already looking at. In the
 * Tauri desktop shell these surface as native Windows toasts.
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

type IncomingSender = {
  firstName: string;
  lastName: string | null;
  avatar: string | null;
};

export function useChatSoundSync() {
  const meId = useAuthStore((s) => s.user?.id);
  const router = useRouter();

  useEffect(() => {
    if (!meId) return;
    primeNotifyPermission();
    const socket = getSocket();

    const onNewDm = (msg: {
      senderId: string;
      content: string;
      sender?: IncomingSender;
    }) => {
      if (msg.senderId === meId) return;
      playPing();
      showMessageNotification({
        title: fullName(msg.sender) || "IS Fleet",
        body: msg.content?.trim() || "📎 Attachment",
        icon: msg.sender?.avatar,
        onClick: () => router.push(`/chat?userId=${msg.senderId}`),
      });
    };
    const onNewGroupMsg = (msg: {
      senderId: string;
      groupId: string;
      content: string;
      isSystem?: boolean;
      sender?: IncomingSender;
    }) => {
      if (msg.senderId === meId || msg.isSystem) return;
      playPing();
      showMessageNotification({
        title: fullName(msg.sender) || "IS Fleet",
        body: msg.content?.trim() || "📎 Attachment",
        icon: msg.sender?.avatar,
        onClick: () => router.push(`/chat?groupId=${msg.groupId}`),
      });
    };
    const onGroupAdded = () => {
      // Someone put me in a fresh group — worth an audible ping.
      playPing();
    };
    // Trip chat: the lightweight `tripUnreadChanged` signal now carries the
    // sender + text so we can ping/notify without joining every trip room.
    // System/reassign signals arrive without a senderName — skip those.
    const onTripMessage = (sig: {
      tripId: string;
      truckId?: string | null;
      senderId?: string;
      senderName?: string;
      content?: string;
    }) => {
      if (!sig?.senderName || sig.senderId === meId) return;
      playPing();
      showMessageNotification({
        title: sig.senderName,
        body: sig.content?.trim() || "📎 Attachment",
        onClick: () => {
          if (sig.truckId) router.push(`/trucks/${sig.truckId}?tab=chat`);
        },
      });
    };

    socket.on("new_direct_message", onNewDm);
    socket.on("new_group_message", onNewGroupMsg);
    socket.on("group_added", onGroupAdded);
    socket.on("tripUnreadChanged", onTripMessage);
    return () => {
      socket.off("new_direct_message", onNewDm);
      socket.off("new_group_message", onNewGroupMsg);
      socket.off("group_added", onGroupAdded);
      socket.off("tripUnreadChanged", onTripMessage);
    };
  }, [meId, router]);
}
