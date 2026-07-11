"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/error-page";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Road closed"
      message="Something broke down on our end. The route is blocked, but you can try again."
      action={{ label: "Try again", onClick: () => reset() }}
    />
  );
}
