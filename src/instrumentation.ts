/**
 * Next.js instrumentation hook. Runs once per server runtime before anything
 * else, which is why Sentry has to be initialised from here rather than from a
 * module some page happens to import.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * Without this, errors thrown inside server components are swallowed by the
 * React streaming boundary and never reach Sentry — Next hands them here
 * instead.
 */
export const onRequestError = Sentry.captureRequestError;
