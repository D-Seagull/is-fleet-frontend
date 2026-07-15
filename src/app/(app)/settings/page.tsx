"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Loader2, ShieldAlert } from "lucide-react";
import { isAxiosError } from "axios";
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
import { useAuthStore } from "@/store/auth";
import { useCompany, useUpdateCompany } from "@/hooks/use-company";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tForm = useTranslations("account.form");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isTeamlead = user?.role === "TEAMLEAD";

  const { data: company, isLoading } = useCompany();
  const updateCompany = useUpdateCompany();

  const [accountingEmail, setAccountingEmail] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;
    setAccountingEmail(company.accountingEmail ?? "");
    setHrEmail(company.hrEmail ?? "");
    setDirectorEmail(company.directorEmail ?? "");
    setSaved(false);
    setError(null);
  }, [company]);

  // Non-teamlead users land on a soft 403 instead of seeing an empty form
  // they can't submit. Drivers and managers don't need this page at all.
  if (user && !isTeamlead) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">
          {t("accessDenied.title")}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("accessDenied.description")}
        </p>
        <Button variant="outline" onClick={() => router.push("/trucks")}>
          {t("accessDenied.home")}
        </Button>
      </div>
    );
  }

  // Company name is locked — it was chosen on signup and changing it would
  // ripple through historical invoices, exports, etc. Only emails are
  // mutable from this surface.
  const isDirty =
    accountingEmail.trim() !== (company?.accountingEmail ?? "") ||
    hrEmail.trim() !== (company?.hrEmail ?? "") ||
    directorEmail.trim() !== (company?.directorEmail ?? "");
  const canSubmit = isDirty && !updateCompany.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await updateCompany.mutateAsync({
        accountingEmail: accountingEmail.trim() || null,
        hrEmail: hrEmail.trim() || null,
        directorEmail: directorEmail.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(data?.message)
          ? data?.message?.[0]
          : data?.message;
        setError(msg ?? tForm("saveError"));
      } else {
        setError(tForm("saveError"));
      }
    }
  };

  if (isLoading || !company) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>{t("company.title")}</CardTitle>
          </div>
          <CardDescription>{t("company.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 max-w-2xl">
            <div className="flex flex-col gap-2">
              <Label htmlFor="company-name">{t("company.nameLabel")}</Label>
              <Input
                id="company-name"
                value={company.name}
                disabled
                readOnly
                className="cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-muted-foreground">
                {t("company.nameLocked")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="accounting-email">
                {t("company.accountingLabel")}
              </Label>
              <Input
                id="accounting-email"
                type="email"
                placeholder="accounting@company.com"
                value={accountingEmail}
                onChange={(e) => setAccountingEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hr-email">{t("company.hrLabel")}</Label>
              <Input
                id="hr-email"
                type="email"
                placeholder="hr@company.com"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="director-email">
                {t("company.directorLabel")}
              </Label>
              <Input
                id="director-email"
                type="email"
                placeholder="director@company.com"
                value={directorEmail}
                onChange={(e) => setDirectorEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && (
              <p className="text-sm text-emerald-600">
                {tForm("saveSuccess")}
              </p>
            )}

            <div>
              <Button type="submit" disabled={!canSubmit}>
                {updateCompany.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {tForm("submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
