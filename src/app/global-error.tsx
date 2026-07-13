"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown by the root layout itself —
 * app/error.tsx is rendered *inside* the layout, so it can't catch a
 * layout crash. This component replaces the whole document tree
 * (Next.js gives it its own <html>/<body>), and can't rely on
 * globals.css or app providers being loaded, so we inline the minimum
 * styling we need.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0b0b0f",
          color: "#f5f5f7",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            500
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0 0 24px",
              color: "#a1a1aa",
              lineHeight: 1.5,
            }}
          >
            The app crashed in a place we could not recover from
            automatically. Please try again or reload the page.
          </p>
          {error.digest && (
            <p
              style={{
                margin: "0 0 24px",
                color: "#71717a",
                fontSize: 12,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "#3b82f6",
                color: "white",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #3f3f46",
                background: "transparent",
                color: "#f5f5f7",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
