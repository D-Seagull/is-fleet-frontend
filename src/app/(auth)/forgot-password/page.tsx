"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, MailCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(typeof msg === "string" ? msg : t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full flex items-center justify-center px-2 sm:px-6">
      <Card className="w-full max-w-md sm:max-w-lg">
        <CardHeader className="text-center">
          {submitted ? (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <MailCheck className="h-6 w-6 text-primary-foreground" />
            </div>
          ) : (
            <div className="mb-4 flex justify-center">
              <BrandLogo className="h-12" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {submitted ? t("titleAfter") : t("titleBefore")}
          </CardTitle>
          <CardDescription>
            {submitted ? t("subtitleAfter") : t("subtitleBefore")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex flex-col gap-4">
              <Button asChild className="w-full">
                <Link href="/login">{t("backToSignIn")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("submitLoading")}
                  </>
                ) : (
                  t("submitButton")
                )}
              </Button>
              <Button
                asChild
                variant="link"
                className="h-auto p-0 text-sm mx-auto"
              >
                <Link href="/login">{t("backToSignIn")}</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
