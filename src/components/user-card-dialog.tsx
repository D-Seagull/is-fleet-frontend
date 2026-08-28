"use client";

import { Award, Languages, Mail, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { StatusDot } from "@/components/status-dot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChatUser } from "@/hooks/use-direct-messages";
import { fullName, initials } from "@/lib/format";

type CardUser = {
  id: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
  statusUntil?: string | null;
  role: string;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  teamlead?: { firstName: string; lastName: string | null } | null;
};

/**
 * A read-only mini profile — opened by clicking a sender's name/avatar in chat.
 * Shows who someone is (name, role, contacts, language, team lead) without any
 * actions. Available to every user; backed by GET /users/:id (useChatUser).
 */
export function UserCardDialog({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("userCard");
  const tLangs = useTranslations("common.languages");
  const { data } = useChatUser(userId ?? "");
  // useChatUser is typed minimally, but GET /users/:id returns the richer
  // profile fields the card needs.
  const person = data as CardUser | undefined;

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>{person ? fullName(person) : ""}</DialogTitle>
        </DialogHeader>

        {!person ? (
          <div className="py-10 text-center text-sm text-muted-foreground">…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative shrink-0">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={person.avatar ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials(person)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot user={person} size="sm" />
                </span>
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">
                  {fullName(person) || "—"}
                </p>
                <p className="text-sm capitalize text-muted-foreground">
                  {person.role.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {person.phone ? (
                <Row icon={<Phone className="h-4 w-4 text-muted-foreground" />} label={t("phone")} value={person.phone} />
              ) : null}
              {person.email ? (
                <Row icon={<Mail className="h-4 w-4 text-muted-foreground" />} label={t("email")} value={person.email} />
              ) : null}
              {person.language ? (
                <Row
                  icon={<Languages className="h-4 w-4 text-muted-foreground" />}
                  label={t("language")}
                  value={tLangs.has(person.language) ? tLangs(person.language) : person.language}
                />
              ) : null}
              {person.teamlead ? (
                <Row
                  icon={<Award className="h-4 w-4 text-muted-foreground" />}
                  label={t("teamlead")}
                  value={fullName(person.teamlead) || "—"}
                />
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      {icon}
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
    </div>
  );
}
