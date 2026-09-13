"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Search, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOnlineUsers } from "@/hooks/use-admin-online";

export default function AdminOnlineUsersPage() {
  const t = useTranslations("admin.dashboard");
  const tRoles = useTranslations("common.roles");
  const { data, isLoading, isError } = useOnlineUsers();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((u) =>
      `${u.firstName} ${u.lastName ?? ""} ${u.company?.name ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [data, query]);

  return (
    <div className="p-6 w-full max-w-3xl mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h1 className="text-2xl font-semibold">{t("onlineNowTitle")}</h1>
          <span className="text-muted-foreground text-sm ml-1">
            ({data?.length ?? 0})
          </span>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("onlineSearchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4 text-emerald-500" />
            {t("onlineNowTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="text-destructive text-sm">{t("errorStats")}</div>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : filtered.length > 0 ? (
            <ul className="divide-y">
              {filtered.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-9 w-9">
                      {u.avatar && <AvatarImage src={u.avatar} />}
                      <AvatarFallback className="text-xs">
                        {(u.firstName[0] ?? "?") + (u.lastName?.[0] ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {u.firstName} {u.lastName ?? ""}
                    </div>
                    {u.company?.name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {u.company.name}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {tRoles(u.role)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {query ? t("onlineNoResults", { query }) : t("onlineNowEmpty")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
