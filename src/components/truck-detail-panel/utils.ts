/**
 * Formats a stop's scheduled window for display, e.g. "14.08 · 08:00–10:00".
 * Returns "" when there's no meaningful time (both ends unset or 00:00) so
 * stops left at defaults don't render a noisy empty window.
 */
export function formatStopWindow(stop: {
  windowDate: string | null;
  windowStart: string | null;
  windowEnd: string | null;
}): string {
  const start = stop.windowStart && stop.windowStart !== "00:00" ? stop.windowStart : "";
  const endRaw = stop.windowEnd && stop.windowEnd !== "00:00" ? stop.windowEnd : "";
  const end = endRaw && endRaw !== start ? endRaw : "";
  if (!start && !end) return "";
  const time = [start, end].filter(Boolean).join("–");
  const date = stop.windowDate ? formatWindowDate(stop.windowDate) : "";
  return date ? `${date} · ${time}` : time;
}

/** "YYYY-MM-DD" → "DD.MM" (near-term operational dates, year dropped for compactness). */
function formatWindowDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}.${m}` : iso;
}

export function shortenTripTitle(title: string): string {
  const [from, to] = title.split(" → ");
  const shortFrom = from?.split(",")[0]?.trim() ?? from ?? "";
  const shortTo = to?.split(",")[0]?.trim() ?? to ?? "";
  return to ? `${shortFrom} → ${shortTo}` : shortFrom;
}

// Country + postcode for trip titles — see lib/postcode.ts.
export { extractPostcodeCity } from "@/lib/postcode";

const PROGRESS_RANK: Record<string, number> = {
  LOADED: 5,
  ON_SITE: 4,
  ON_WAY: 3,
  ACCEPTED: 2,
  ASSIGNED: 1,
};

/**
 * The truck's trip in progress — mirrors the backend's `trip-order.ts`:
 * furthest along first, then the OLDEST within a status (loads are done in
 * the order given). Every other open trip is "queued" (shown under
 * В черзі; its chat can still be opened).
 */
export function currentTrip<T extends { status: string; createdAt: string }>(
  trips: T[] | undefined,
): T | null {
  const open = (trips ?? []).filter((tr) => tr.status !== "DELIVERED");
  open.sort((a, b) => {
    const byStatus =
      (PROGRESS_RANK[b.status] ?? 0) - (PROGRESS_RANK[a.status] ?? 0);
    if (byStatus !== 0) return byStatus;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  return open[0] ?? null;
}

