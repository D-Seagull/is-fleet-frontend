"use client";

import * as Sentry from "@sentry/nextjs";
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
    // Route-level crashes land here (e.g. a render throw on a page). Without
    // this they were only console.error'd — so a user hitting "500 / Дорогу
    // перекрито" left no stack trace anywhere. Mirror global-error.tsx and
    // ship it to Sentry so the next occurrence is diagnosable.
    console.error("[error boundary]", error);
    Sentry.captureException(error);
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
