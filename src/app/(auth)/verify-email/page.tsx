"use client";

import { Suspense, useState } from "react";
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

type Stage = "ask" | "done" | "invalid";

/**
 * Link from the "confirm your email" letter a driver gets when their manager
 * adds an email to their profile. Confirming needs a click (not on load), so
 * a mail scanner opening the link can't confirm on the driver's behalf. The
 * token goes in the POST body to stay out of request logs.
 */
function VerifyEmail() {
  const t = useTranslations("verifyEmail");
  const token = useSearchParams().get("token") ?? "";
  const [stage, setStage] = useState<Stage>(token ? "ask" : "invalid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/verify-email", { token });
      setStage("done");
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 400) setStage("invalid");
      else setError(t("error"));
    } finally {
      setBusy(false);
    }
  };

  const header =
    stage === "done"
      ? {
          icon: <CheckCircle2 className="h-6 w-6 text-primary-foreground" />,
          title: t("doneTitle"),
          body: t("doneBody"),
        }
      : stage === "invalid"
        ? {
            icon: <XCircle className="h-6 w-6 text-primary-foreground" />,
            title: t("invalidTitle"),
            body: t("invalidBody"),
          }
        : null;

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
          <CardDescription>{header ? header.body : t("body")}</CardDescription>
        </CardHeader>
        {stage === "ask" && (
          <CardContent className="flex flex-col gap-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <Button onClick={confirm} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("confirm")}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
