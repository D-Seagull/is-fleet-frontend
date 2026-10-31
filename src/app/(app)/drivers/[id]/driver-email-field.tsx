"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Check, Loader2, Mail, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useResendEmailVerification,
  useUpdateDriver,
} from "@/hooks/use-drivers";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The driver's email — a sign-in fallback when SMS doesn't reach them.
 * Saving a new address sends the driver a confirmation link; codes go there
 * only once they confirm it (badge shows which).
 */
export function DriverEmailField({
  driverId,
  email,
  verifiedAt,
}: {
  driverId: string;
  email: string | null;
  verifiedAt: string | null;
}) {
  const t = useTranslations("drivers.detail");
  const update = useUpdateDriver(driverId);
  const resend = useResendEmailVerification();
  // The parent keys this field by the saved email, so a new value from the
  // server remounts it with fresh state.
  const [value, setValue] = useState(email ?? "");

  const dirty = value.trim().toLowerCase() !== (email ?? "");
  const valid = value.trim() === "" || EMAIL_REGEX.test(value.trim());

  const errorText = (e: unknown, fallback: string) => {
    const msg = isAxiosError(e) ? e.response?.data?.message : undefined;
    return typeof msg === "string" ? msg : fallback;
  };

  async function save() {
    if (!valid) return;
    try {
      const next = value.trim() || null;
      await update.mutateAsync({ email: next });
      if (next) toast.success(t("emailSent"));
    } catch (e) {
      toast.error(errorText(e, t("emailSaveError")));
    }
  }

  async function sendAgain() {
    try {
      await resend.mutateAsync(driverId);
      toast.success(t("emailSent"));
    } catch (e) {
      toast.error(errorText(e, t("emailSaveError")));
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
        <Mail className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{t("emailField")}</p>
          {email && !dirty && (
            <Badge
              variant="outline"
              className={
                verifiedAt
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
              }
            >
              {verifiedAt ? t("emailVerified") : t("emailUnverified")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="driver@example.com"
            className={`h-8 text-sm ${
              dirty && !valid
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }`}
          />
          {dirty && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={save}
                disabled={!valid || update.isPending}
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => setValue(email ?? "")}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {dirty && !valid ? (
            <span className="text-destructive">{t("emailFormatHint")}</span>
          ) : (
            t("emailHint")
          )}
        </p>
        {email && !verifiedAt && !dirty && (
          <Button
            variant="link"
            size="sm"
            className="h-auto self-start p-0 text-xs"
            onClick={sendAgain}
            disabled={resend.isPending}
          >
            {t("emailResend")}
          </Button>
        )}
      </div>
    </div>
  );
}
