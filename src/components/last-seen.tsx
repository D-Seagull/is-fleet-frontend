"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useLastSeen } from "@/hooks/use-presence";

// Below this, someone who just closed the app isn't worth a timestamp.
const SHOW_AFTER_MS = 15 * 60 * 1000;

/** Re-renders every minute so "15 min out of the app" is crossed live. */
function useMinuteTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * "останній вхід 12:30" — today only the time, then "учора 12:30", older
 * "12 жовт. 12:30". Renders nothing while the person is in the app or has
 * been out of it for less than 15 min. Live: going offline is picked up from
 * presence events, so no reload is needed.
 */
export function LastSeen({
  user,
  className,
}: {
  user: { id?: string; lastSeenAt?: string | null } | null | undefined;
  className?: string;
}) {
  const t = useTranslations("common.lastSeen");
  const locale = useLocale();
  const now = useMinuteTick();
  const at = useLastSeen(user?.id, user?.lastSeenAt);
  if (!at || now - at.getTime() < SHOW_AFTER_MS) return null;

  const time = at.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const today = new Date(now);
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  const when = sameDay(at, today)
    ? time
    : sameDay(at, yesterday)
      ? t("yesterday", { time })
      : `${at.toLocaleDateString(locale, { day: "numeric", month: "short" })} ${time}`;

  return <span className={className}>{t("label", { when })}</span>;
}
