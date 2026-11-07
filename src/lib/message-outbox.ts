import { useMemo } from "react";
import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

/*
 * Offline outbox for chat TEXT on the web (the mobile apps have the same
 * thing — keep the behaviour in step with is-driver/is-manager lib/outbox.ts).
 * A message written without a connection used to depend on socket.io's
 * in-memory buffer and was gone after a reload. Now every send is saved in
 * localStorage, shown in the chat at once as "pending", and re-emitted with its
 * client id until the server acknowledges it. The server dedupes by that id
 * (backend src/common/utils/send-dedupe.ts), so a retry whose ack was lost never
 * creates a second message.
 *
 * (lib/outbox.ts is the unrelated instant FILE upload bubble.)
 */

export type MessageOutboxKind = "trip" | "dm" | "group";

export interface MessageOutboxItem {
  clientId: string;
  kind: MessageOutboxKind;
  /** tripId / peer user id / groupId */
  scopeId: string;
  /** Owner — items of another account in this browser are left alone. */
  userId: string;
  content: string;
  replyToId: string | null;
  replyToDocumentId: string | null;
  createdAt: string;
  /** 'failed' = the server refused it (not retried automatically). */
  status: "pending" | "failed";
  error?: string;
}

export const PENDING_PREFIX = "pending:";

const STORAGE_KEY = "message-outbox.v1";
const ACK_TIMEOUT_MS = 15_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const useMessageOutboxStore = create<{ items: MessageOutboxItem[] }>(
  () => ({ items: [] }),
);

let hydrated = false;

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(useMessageOutboxStore.getState().items),
    );
  } catch {
    /* storage full / blocked — the in-memory queue still works */
  }
}

function setItems(fn: (items: MessageOutboxItem[]) => MessageOutboxItem[]) {
  useMessageOutboxStore.setState((s) => ({ items: fn(s.items) }));
  persist();
}

export function hydrateMessageOutbox() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const cutoff = Date.now() - MAX_AGE_MS;
    const stored = (JSON.parse(raw) as MessageOutboxItem[]).filter(
      (i) => new Date(i.createdAt).getTime() > cutoff,
    );
    useMessageOutboxStore.setState((s) => {
      const have = new Set(s.items.map((i) => i.clientId));
      return {
        items: [...stored.filter((i) => !have.has(i.clientId)), ...s.items],
      };
    });
  } catch {
    /* corrupt value — start empty */
  }
}

const EVENT: Record<MessageOutboxKind, string> = {
  trip: "sendMessage",
  dm: "send_direct_message",
  group: "send_group_message",
};

function payloadOf(item: MessageOutboxItem): Record<string, unknown> {
  const base = {
    content: item.content,
    replyToId: item.replyToId,
    replyToDocumentId: item.replyToDocumentId,
  };
  if (item.kind === "trip") {
    return { ...base, tripId: item.scopeId, tempId: item.clientId };
  }
  if (item.kind === "dm") {
    return { ...base, receiverId: item.scopeId, clientId: item.clientId };
  }
  return { ...base, groupId: item.scopeId, clientId: item.clientId };
}

type DeliveredListener = (
  item: MessageOutboxItem,
  message: Record<string, unknown>,
) => void;
const listeners = new Set<DeliveredListener>();

/** Called with the saved message when the server acknowledges an item. */
export function onMessageDelivered(fn: DeliveredListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function enqueueMessage(input: {
  kind: MessageOutboxKind;
  scopeId: string;
  content: string;
  replyToId?: string | null;
  replyToDocumentId?: string | null;
}): void {
  hydrateMessageOutbox();
  const userId = useAuthStore.getState().user?.id;
  const content = input.content.trim();
  if (!userId || !content || !input.scopeId) return;
  const item: MessageOutboxItem = {
    clientId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    kind: input.kind,
    scopeId: input.scopeId,
    userId,
    content,
    replyToId: input.replyToId ?? null,
    replyToDocumentId: input.replyToDocumentId ?? null,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  setItems((items) => [...items, item]);
  void flushMessageOutbox();
}

export function retryOutboxMessage(clientId: string): void {
  setItems((items) =>
    items.map((i) =>
      i.clientId === clientId
        ? { ...i, status: "pending", error: undefined }
        : i,
    ),
  );
  void flushMessageOutbox();
}

export function discardOutboxMessage(clientId: string): void {
  setItems((items) => items.filter((i) => i.clientId !== clientId));
}

let flushing = false;
let flushAgain = false;

/**
 * Send everything that waits, oldest first. Safe to call often: does nothing
 * while offline and runs one pass at a time. Within one conversation order is
 * kept — after a timeout the rest of that conversation waits.
 */
export async function flushMessageOutbox(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return;
  }
  flushing = true;
  try {
    hydrateMessageOutbox();
    do {
      flushAgain = false;
      const me = useAuthStore.getState().user?.id;
      if (!me) return;
      const sock = getSocket();
      const stalled = new Set<string>();
      for (const item of [...useMessageOutboxStore.getState().items]) {
        if (item.userId !== me || item.status !== "pending") continue;
        if (!sock.connected) return;
        const lane = `${item.kind}:${item.scopeId}`;
        if (stalled.has(lane)) continue;
        try {
          const res = (await sock
            .timeout(ACK_TIMEOUT_MS)
            .emitWithAck(EVENT[item.kind], payloadOf(item))) as
            | Record<string, unknown>
            | undefined;
          if (
            res &&
            typeof res.error === "string" &&
            res.error !== "unauthenticated"
          ) {
            // Refused for good (not a member, company deactivated…).
            const error = res.error;
            setItems((items) =>
              items.map((i) =>
                i.clientId === item.clientId
                  ? { ...i, status: "failed", error }
                  : i,
              ),
            );
          } else if (res && typeof res.id === "string") {
            setItems((items) =>
              items.filter((i) => i.clientId !== item.clientId),
            );
            listeners.forEach((fn) => fn(item, res));
          } else {
            stalled.add(lane); // no usable answer yet — try again later
          }
        } catch {
          stalled.add(lane); // ack timed out / socket dropped
        }
      }
    } while (flushAgain);
  } finally {
    flushing = false;
  }
}

/** Items of one conversation belonging to the signed-in user. */
export function useMessageOutboxItems(
  kind: MessageOutboxKind,
  scopeId: string | null | undefined,
): MessageOutboxItem[] {
  const items = useMessageOutboxStore((s) => s.items);
  const me = useAuthStore((s) => s.user?.id);
  return useMemo(
    () =>
      scopeId
        ? items.filter(
            (i) => i.kind === kind && i.scopeId === scopeId && i.userId === me,
          )
        : [],
    [items, kind, scopeId, me],
  );
}

/** Wire the triggers: socket (re)connect, browser back online, slow tick. */
export function startMessageOutboxRunner(): () => void {
  hydrateMessageOutbox();
  void flushMessageOutbox();
  const sock = getSocket();
  const kick = () => void flushMessageOutbox();
  sock.on("connect", kick);
  window.addEventListener("online", kick);
  const timer = setInterval(() => {
    if (
      useMessageOutboxStore.getState().items.some((i) => i.status === "pending")
    ) {
      void flushMessageOutbox();
    }
  }, 10_000);
  return () => {
    sock.off("connect", kick);
    window.removeEventListener("online", kick);
    clearInterval(timer);
  };
}
