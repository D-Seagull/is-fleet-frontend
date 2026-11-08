"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LoginIssue {
  id: string;
  action: "CODE_ISSUED" | "CODE_FAILED" | "CODE_LOCKED" | "DELIVERY_FAILED";
  channel: string | null;
  ip: string | null;
  createdAt: string;
  notUsed: boolean;
  driver: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
  } | null;
  company: { id: string; name: string } | null;
}

function useLoginIssues(days: number) {
  return useQuery<{ days: number; events: LoginIssue[] }>({
    queryKey: ["admin", "login-issues", days],
    queryFn: async () =>
      (await api.get("/admin/login-issues", { params: { days } })).data,
    refetchInterval: 60_000,
  });
}

/** Driver sign-in trouble: codes that never arrived, wrong / locked codes. */
export default function LoginIssuesPage() {
  const t = useTranslations("admin.loginIssues");
  const locale = useLocale();
  const [days, setDays] = useState(7);
  const { data, isLoading } = useLoginIssues(days);

  const problem = (e: LoginIssue) =>
    e.action === "CODE_ISSUED" ? t("NOT_USED") : t(e.action);

  return (
    <div className="w-full p-6">
      <div className="mb-1 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("days")}
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 7, 14, 30].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("subtitle")}</p>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !data?.events.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colWhen")}</TableHead>
              <TableHead>{t("colDriver")}</TableHead>
              <TableHead>{t("colCompany")}</TableHead>
              <TableHead>{t("colChannel")}</TableHead>
              <TableHead>{t("colProblem")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.events.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {e.driver
                      ? `${e.driver.firstName} ${e.driver.lastName ?? ""}`.trim()
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.driver?.phone ?? ""}
                  </div>
                </TableCell>
                <TableCell>{e.company?.name ?? "—"}</TableCell>
                <TableCell>{e.channel ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      e.action === "CODE_FAILED"
                        ? ""
                        : "border-destructive/40 text-destructive"
                    }
                  >
                    {problem(e)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
