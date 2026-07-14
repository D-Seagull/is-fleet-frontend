"use client";

import { useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * UI-locale switcher. Writes the choice into a `locale` cookie which
 * `src/i18n/request.ts` reads on the next server render, then forces a
 * full reload so the RSC layer picks up the new messages. Cookie is
 * per-browser for now; backend sync via `User.uiLocale` is a follow-up.
 */
const LOCALES: { value: string; label: string }[] = [
  { value: "uk", label: "Українська" },
  { value: "en", label: "English" },
  { value: "pl", label: "Polski" },
  { value: "lt", label: "Lietuvių" },
  { value: "de", label: "Deutsch" },
  { value: "ru", label: "Русский" },
];

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function UiLocalePicker() {
  const current = useLocale();

  const handleChange = (value: string) => {
    if (value === current) return;
    document.cookie = `locale=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    window.location.reload();
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger id="ui-locale" className="max-w-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
