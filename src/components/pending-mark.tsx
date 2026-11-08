"use client";

import { Clock, RotateCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  discardOutboxMessage,
  PENDING_PREFIX,
  retryOutboxMessage,
} from "@/lib/message-outbox";

/**
 * Delivery state of an own message still in the offline outbox: a clock while
 * it waits for a connection, retry / delete buttons when the server refused it.
 * Renders nothing for a delivered message.
 */
export function PendingMark({
  msg,
}: {
  msg: { id: string; pending?: boolean; failed?: boolean };
}) {
  const t = useTranslations("chat");
  if (!msg.pending && !msg.failed) return null;
  const clientId = msg.id.startsWith(PENDING_PREFIX)
    ? msg.id.slice(PENDING_PREFIX.length)
    : msg.id;

  if (msg.failed) {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <span>{t("outboxFailed")}</span>
        <button
          type="button"
          title={t("outboxRetry")}
          onClick={() => retryOutboxMessage(clientId)}
          className="hover:opacity-70"
        >
          <RotateCw className="h-3 w-3" />
        </button>
        <button
          type="button"
          title={t("outboxDiscard")}
          onClick={() => discardOutboxMessage(clientId)}
          className="hover:opacity-70"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }
  return (
    <span title={t("outboxPending")} className="inline-flex">
      <Clock className="h-3 w-3" />
    </span>
  );
}
