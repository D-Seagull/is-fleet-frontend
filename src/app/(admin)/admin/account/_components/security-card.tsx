"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KEY = ["admin", "totp", "status"] as const;

/** Authenticator-app two-factor for the platform admin sign-in. */
export function SecurityCard() {
  const t = useTranslations("admin.security");
  const qc = useQueryClient();
  const { data: status } = useQuery<{
    enabled: boolean;
    recoveryCodesLeft: number;
  }>({
    queryKey: KEY,
    queryFn: async () => (await api.get("/auth/totp/status")).data,
  });

  const [setup, setSetup] = useState<{
    secret: string;
    otpauthUrl: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);

  const start = useMutation({
    mutationFn: async () => (await api.post("/auth/totp/setup")).data,
    onSuccess: (d) => setSetup(d),
    onError: () => toast.error(t("error")),
  });
  const enable = useMutation({
    mutationFn: async () =>
      (await api.post("/auth/totp/enable", { code })).data as {
        recoveryCodes: string[];
      },
    onSuccess: (d) => {
      setRecovery(d.recoveryCodes);
      setSetup(null);
      setCode("");
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: () => toast.error(t("wrongCode")),
  });
  const disable = useMutation({
    mutationFn: async () =>
      (await api.post("/auth/totp/disable", { code, password })).data,
    onSuccess: () => {
      setDisabling(false);
      setCode("");
      setPassword("");
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(t("disabled"));
    },
    onError: () => toast.error(t("wrongCode")),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {status?.enabled
            ? t("on", { n: status.recoveryCodesLeft })
            : t("off")}
        </p>

        {recovery && (
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="mb-2 text-sm font-medium">{t("recoveryTitle")}</p>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("recoveryHint")}
            </p>
            <div className="grid grid-cols-2 gap-1 font-mono text-sm">
              {recovery.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setRecovery(null)}
            >
              {t("saved")}
            </Button>
          </div>
        )}

        {!status?.enabled && !setup && (
          <div>
            <Button onClick={() => start.mutate()} disabled={start.isPending}>
              {start.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("enable")}
            </Button>
          </div>
        )}

        {setup && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">{t("scan")}</p>
            <div className="w-fit rounded-lg bg-white p-3">
              <QRCodeSVG value={setup.otpauthUrl} size={160} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("manualKey")}{" "}
              <span className="select-all font-mono">{setup.secret}</span>
            </p>
            <div className="flex max-w-xs flex-col gap-2">
              <Label htmlFor="totp-code">{t("codeLabel")}</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                onClick={() => enable.mutate()}
                disabled={code.trim().length < 6 || enable.isPending}
              >
                {enable.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("confirm")}
              </Button>
            </div>
          </div>
        )}

        {status?.enabled && !disabling && (
          <div>
            <Button variant="outline" onClick={() => setDisabling(true)}>
              {t("disable")}
            </Button>
          </div>
        )}

        {status?.enabled && disabling && (
          <div className="flex max-w-xs flex-col gap-2">
            <Label htmlFor="dis-pass">{t("password")}</Label>
            <Input
              id="dis-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Label htmlFor="dis-code">{t("codeLabel")}</Label>
            <Input
              id="dis-code"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => disable.mutate()}
                disabled={!password || code.trim().length < 6 || disable.isPending}
              >
                {disable.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("disable")}
              </Button>
              <Button variant="ghost" onClick={() => setDisabling(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
