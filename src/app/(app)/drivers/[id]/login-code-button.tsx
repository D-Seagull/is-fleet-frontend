"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIssueDriverLoginCode } from "@/hooks/use-drivers";

/**
 * "Login code" for the driver's assigned manager: when the SMS doesn't reach
 * the driver (UA numbers roaming in DE/AT), the manager mints a one-time
 * code here and dictates it. The driver types it on the usual code screen.
 */
export function LoginCodeButton({ driverId }: { driverId: string }) {
  const t = useTranslations("drivers.detail");
  const locale = useLocale();
  const issue = useIssueDriverLoginCode();
  const [open, setOpen] = useState(false);

  async function generate() {
    try {
      await issue.mutateAsync(driverId);
      setOpen(true);
    } catch (e) {
      const msg = isAxiosError(e) ? e.response?.data?.message : undefined;
      toast.error(typeof msg === "string" ? msg : t("loginCodeError"));
    }
  }

  const data = issue.data;
  const expires = data
    ? new Date(data.expiresAt).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={generate}
        disabled={issue.isPending}
      >
        {issue.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
        ) : (
          <KeyRound className="h-4 w-4 sm:mr-2" />
        )}
        <span className="hidden sm:inline">{t("loginCode")}</span>
      </Button>

      <Dialog open={open && !!data} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("loginCodeTitle")}</DialogTitle>
            <DialogDescription>{t("loginCodeDesc")}</DialogDescription>
          </DialogHeader>
          <p className="py-2 text-center font-mono text-4xl font-bold tracking-[0.3em]">
            {data?.code}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            {t("loginCodeExpires", { time: expires })}
          </p>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => {
                if (!data) return;
                navigator.clipboard.writeText(data.code);
                toast.success(t("loginCodeCopied"));
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t("loginCodeCopy")}
            </Button>
            <Button variant="outline" onClick={generate} disabled={issue.isPending}>
              {t("loginCodeNew")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
