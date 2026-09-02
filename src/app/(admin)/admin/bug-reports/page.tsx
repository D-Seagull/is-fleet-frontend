"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bug,
  Check,
  Clock,
  Loader2,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import {
  useBugReports,
  useUpdateBugStatus,
  type BugReport,
  type BugStatus,
} from "@/hooks/use-bug-reports";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSocket } from "@/lib/socket";
import { fullName } from "@/lib/format";

type Filter = "all" | "NEW" | "TRIAGED" | "RESOLVED";

const ROLE_CLASS: Record<string, string> = {
  DRIVER: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  MANAGER: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  TEAMLEAD: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  ADMIN: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

export default function BugReportsPage() {
  const t = useTranslations("admin.bugReports");
  const [filter, setFilter] = React.useState<Filter>("all");
  const status: BugStatus | undefined = filter === "all" ? undefined : filter;
  const { data: reports, isLoading, isError } = useBugReports(status);
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  return (
    <div className="p-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Bug className="h-5 w-5 text-destructive" />
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <span className="text-muted-foreground text-sm ml-1">
          ({reports?.length ?? 0})
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("subtitle")}</p>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">{t("filters.all")}</TabsTrigger>
          <TabsTrigger value="NEW">{t("filters.new")}</TabsTrigger>
          <TabsTrigger value="TRIAGED">{t("filters.triaged")}</TabsTrigger>
          <TabsTrigger value="RESOLVED">{t("filters.resolved")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      )}
      {isError && <p className="text-sm text-destructive">{t("error")}</p>}
      {!isLoading && !isError && (reports?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      <div className="flex flex-col gap-3">
        {reports?.map((r) => (
          <ReportCard key={r.id} report={r} onOpenImage={setLightbox} />
        ))}
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{t("screenshot")}</DialogTitle>
          {lightbox && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox}
              alt=""
              className="w-full h-auto rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportCard({
  report: r,
  onOpenImage,
}: {
  report: BugReport;
  onOpenImage: (url: string) => void;
}) {
  const t = useTranslations("admin.bugReports");
  const locale = useLocale();
  const { mutate, isPending } = useUpdateBugStatus();
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");

  const openReply = () => {
    const quote =
      r.description.length > 60 ? `${r.description.slice(0, 60)}…` : r.description;
    setReplyText(`Re: «${quote}»\n\n`);
    setReplyOpen(true);
  };

  const sendReply = () => {
    const content = replyText.trim();
    if (!content) return;
    // Sends over the shared socket — reuses the DM pipeline (realtime + push +
    // translation), which has no company scoping, so admin → any reporter works
    // without pulling admin into the dispatch chat UI.
    getSocket().emit("send_direct_message", {
      receiverId: r.reporterId,
      content,
    });
    toast.success(t("messageSent"));
    setReplyOpen(false);
    setReplyText("");
  };

  const resolved = r.status === "RESOLVED";
  const name = fullName(r.reporter) || r.reporter.role;
  const initials =
    (r.reporter.firstName?.[0] ?? "") + (r.reporter.lastName?.[0] ?? "");
  const when = new Date(r.createdAt).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const meta = [r.appName && r.appVersion ? `${r.appName} ${r.appVersion}` : r.appName, r.platform, r.route, r.company?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`flex gap-3 rounded-xl border bg-card p-3 ${resolved ? "opacity-60" : ""}`}
    >
      <Avatar className="h-9 w-9 shrink-0">
        {r.reporter.avatar && <AvatarImage src={r.reporter.avatar} alt="" />}
        <AvatarFallback className="text-xs">
          {initials.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${resolved ? "line-through" : ""}`}
          >
            {name}
          </span>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 ${ROLE_CLASS[r.reporter.role] ?? ""}`}
          >
            {r.reporter.role}
          </Badge>
          {resolved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              {t("statusResolved")}
            </span>
          )}
          {!resolved && (
            <span className="ml-auto text-xs text-muted-foreground">{when}</span>
          )}
        </div>

        <p className="text-sm my-2 whitespace-pre-wrap break-words">
          {r.description}
        </p>

        {r.screenshots.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {r.screenshots.map((url, i) => (
              <button
                key={`${r.id}-${i}`}
                type="button"
                onClick={() => onOpenImage(url)}
                className="h-12 w-16 overflow-hidden rounded-md border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {meta && (
          <p className="text-[11px] text-muted-foreground border-t pt-1.5">
            {meta}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {resolved ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => mutate({ id: r.id, status: "NEW" })}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("actions.reopen")}
            </Button>
          ) : (
            <>
              {r.status !== "TRIAGED" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => mutate({ id: r.id, status: "TRIAGED" })}
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {t("actions.triage")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                className="text-emerald-600 dark:text-emerald-400"
                onClick={() => mutate({ id: r.id, status: "RESOLVED" })}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {t("actions.resolve")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openReply}
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                {t("actions.message")}
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reply.title", { name })}</DialogTitle>
            <DialogDescription>{t("reply.subtitle")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={5}
            autoFocus
          />
          <DialogFooter>
            <Button size="sm" onClick={sendReply} disabled={!replyText.trim()}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {t("reply.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
