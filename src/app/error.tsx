"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorPage } from "@/components/error-page";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.serverError");

  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title={t("title")}
      message={t("message")}
      action={{ label: t("action"), onClick: () => reset() }}
    />
  );
}
