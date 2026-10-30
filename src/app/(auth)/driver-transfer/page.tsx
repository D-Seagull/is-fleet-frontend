"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

interface TransferInfo {
  driverFirstName: string;
  toCompanyName: string;
  fromCompanyName: string | null;
  expiresAt: string;
}

type Stage = "loading" | "ask" | "accepted" | "declined" | "invalid";

/**
 * Consent page from the driver-transfer SMS. Nothing moves until the driver
 * presses Accept here — the link (in the SMS to their phone) is the proof it
 * is really them. The token goes in the POST body so it stays out of the
 * API's request logs.
 */
function DriverTransferConsent() {
  const t = useTranslations("driverTransfer");
  const token = useSearchParams().get("token") ?? "";

  const [stage, setStage] = useState<Stage>(token ? "loading" : "invalid");
  const [info, setInfo] = useState<TransferInfo | null>(null);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .post<TransferInfo>("/public/driver-transfer/lookup", { token })
      .then((res) => {
        if (cancelled) return;
        setInfo(res.data);
        setStage("ask");
      })
      .catch(() => {
        if (!cancelled) setStage("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const answer = async (choice: "accept" | "decline") => {
    if (busy) return;
    setBusy(choice);
    setError("");
    try {
      await api.post(`/public/driver-transfer/${choice}`, { token });
      setStage(choice === "accept" ? "accepted" : "declined");
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      // 404 → used / expired meanwhile (e.g. accepted in another tab).
      if (status === 404) setStage("invalid");
      else setError(t("error"));
    } finally {
      setBusy(null);
    }
  };

  const toCompany = info?.toCompanyName ?? "";

  const header = (() => {
    switch (stage) {
      case "accepted":
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-primary-foreground" />,
          title: t("acceptedTitle"),
          body: t("acceptedBody", { toCompany }),
        };
      case "declined":
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-primary-foreground" />,
          title: t("declinedTitle"),
          body: t("declinedBody"),
        };
      case "invalid":
        return {
          icon: <XCircle className="h-6 w-6 text-primary-foreground" />,
          title: t("invalidTitle"),
          body: t("invalidBody"),
        };
      default:
        return null;
    }
  })();

  return (
    <div className="relative w-full flex items-center justify-center px-2 sm:px-6">
      <Card className="w-full max-w-md sm:max-w-lg">
        <CardHeader className="text-center">
          {header ? (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              {header.icon}
            </div>
          ) : (
            <div className="mb-4 flex justify-center">
              <BrandLogo className="h-[22.5px]" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {header ? header.title : t("title")}
          </CardTitle>
          <CardDescription>
            {header
              ? header.body
              : stage === "ask"
                ? t("body", { toCompany })
                : t("loading")}
          </CardDescription>
        </CardHeader>
        {stage === "loading" && (
          <CardContent className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        )}
        {stage === "ask" && info && (
          <CardContent className="flex flex-col gap-4">
            {info.fromCompanyName && (
              <p className="text-sm text-muted-foreground text-center">
                {t("leaveNote", { fromCompany: info.fromCompanyName })}
              </p>
            )}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                onClick={() => answer("decline")}
                disabled={busy !== null}
              >
                {busy === "decline" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("decline")}
              </Button>
              <Button
                onClick={() => answer("accept")}
                disabled={busy !== null}
              >
                {busy === "accept" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("accept")}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function DriverTransferPage() {
  return (
    <Suspense fallback={null}>
      <DriverTransferConsent />
    </Suspense>
  );
}
