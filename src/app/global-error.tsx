"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort boundary: this catches a crash in the root layout itself, the
 * one place a route-level error.tsx cannot reach. It replaces the whole
 * document, which is why it renders its own <html> and <body>.
 *
 * Nothing from the providers is available here — NextIntlClientProvider and
 * the theme provider live inside the layout that just failed — so the text is
 * hardcoded in two languages and the styles are inline. Calling
 * useTranslations() in this file would throw inside the error handler itself
 * and leave the user with a blank page and no way out.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="uk">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#0b131d",
          color: "#e7eef6",
        }}
      >
        <main style={{ maxWidth: "28rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 .75rem" }}>
            Сталася помилка
          </h1>
          <p style={{ margin: "0 0 .25rem", opacity: 0.75, fontSize: ".9375rem" }}>
            Спробуйте перезавантажити сторінку.
          </p>
          <p style={{ margin: "0 0 1.5rem", opacity: 0.55, fontSize: ".875rem" }}>
            Something went wrong. Please reload the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              font: "inherit",
              fontSize: ".9375rem",
              padding: ".625rem 1.25rem",
              borderRadius: ".5rem",
              border: "1px solid #233343",
              background: "#131f2c",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Перезавантажити · Reload
          </button>
        </main>
      </body>
    </html>
  );
}
