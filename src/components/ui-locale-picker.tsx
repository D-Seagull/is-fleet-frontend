"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateMe } from "@/hooks/use-avatar";
import { useUser } from "@/store/auth";
import { writeUiLocaleCookie, type UiLocaleDb } from "@/lib/ui-locale";

/**
 * UI-locale switcher. On change:
 *   1. persists `uiLocale` on the User row via PATCH /users/me (so the
 *      choice follows the user to other devices / next login)
 *   2. writes the matching `locale` cookie that next-intl's request
 *      resolver reads on the server
 *   3. calls router.refresh() so the RSC layer re-runs with the new
 *      cookie and streams down updated messages — soft-refresh, no
 *      white flash, client state is preserved.
 *
 * If the user is somehow not signed in when this renders (edge case
 * during logout), we still write the cookie so the switch behaves
 * locally — the backend sync is skipped.
 *
 * `variant="compact"` renders a narrow trigger showing just the locale
 * code (UK/EN/…) — used as a temporary header switcher for quick
 * locale testing next to the notification bell.
 */
const LOCALES: { db: UiLocaleDb; label: string }[] = [
  { db: "UK", label: "Українська" },
  { db: "EN", label: "English" },
  { db: "PL", label: "Polski" },
  { db: "LT", label: "Lietuvių" },
  { db: "DE", label: "Deutsch" },
  { db: "RU", label: "Русский" },
];

export function UiLocalePicker({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  const current = useLocale();
  const user = useUser();
  const updateMe = useUpdateMe();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleChange = async (dbValue: string) => {
    const next = dbValue as UiLocaleDb;
    if (next.toLowerCase() === current) return;
    setPending(true);
    try {
      if (user) {
        await updateMe.mutateAsync({ uiLocale: next });
      }
      writeUiLocaleCookie(next);
      router.refresh();
    } catch {
      // Even on backend failure, honour the local pick so the switcher
      // still feels responsive. Next login will re-sync from the DB.
      writeUiLocaleCookie(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const compact = variant === "compact";

  return (
    <div className="flex items-center gap-2">
      <Select
        value={current.toUpperCase()}
        onValueChange={handleChange}
        disabled={pending}
      >
        <SelectTrigger
          id="ui-locale"
          className={compact ? "h-8 w-[72px] text-xs" : "max-w-xs"}
        >
          {compact ? current.toUpperCase() : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {LOCALES.map((l) => (
            <SelectItem key={l.db} value={l.db}>
              {compact ? l.db : l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
