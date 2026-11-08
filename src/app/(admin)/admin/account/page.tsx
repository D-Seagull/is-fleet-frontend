"use client";

import { useTranslations } from "next-intl";
import { Globe, User as UserIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AvatarSection } from "@/components/avatar-section";
import { UiLocalePicker } from "@/components/ui-locale-picker";

/**
 * The admin's own settings. `/account` belongs to the dispatch app and bounces
 * admins to `/admin`, so this is the same two blocks (photo, interface
 * language) inside the admin shell.
 */
export default function AdminAccountPage() {
  const t = useTranslations("account");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            <CardTitle>{t("profile.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <AvatarSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>{t("uiLocale.title")}</CardTitle>
          </div>
          <CardDescription>{t("uiLocale.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UiLocalePicker />
        </CardContent>
      </Card>
    </div>
  );
}
