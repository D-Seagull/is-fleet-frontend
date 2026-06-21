import type { InfiniteData } from "@tanstack/react-query";

/**
 * Helpers for the cache shape that useInfiniteQuery puts under
 * ["messages", peerId] / ["trip-messages", tripId] / ["group-messages", groupId].
 *
 * Pages are stored in the order they were fetched:
 *   pages[0] — the very first batch (latest 50)
 *   pages[1] — older batch
 *   pages[N] — even older
 *
 * Each batch is itself ASC-ordered (oldest in the batch first), so the
 * full chronological view is `pages.reverse().flat()`.
 */

interface WithId {
  id: string;
}

/** Flatten the page structure into the chronological array the UI consumes. */
export function flattenInfinitePages<T extends WithId>(
  data: InfiniteData<T[]> | undefined,
): T[] {
  if (!data?.pages) return [];
  return [...data.pages].reverse().flat();
}

/** Apply a mutator only to the message with the given id, across every page. */
export function patchInfiniteMessage<T extends WithId>(
  data: InfiniteData<T[]> | undefined,
  id: string,
  mutator: (msg: T) => T,
): InfiniteData<T[]> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.map((m) => (m.id === id ? mutator(m) : m)),
    ),
  };
}

/** Append a brand new message to the newest page (idempotent on duplicates). */
export function appendInfiniteMessage<T extends WithId>(
  data: InfiniteData<T[]> | undefined,
  msg: T,
): InfiniteData<T[]> {
  if (!data || data.pages.length === 0) {
    return { pages: [[msg]], pageParams: [undefined] };
  }
  const [newest, ...rest] = data.pages;
  if (newest.some((m) => m.id === msg.id)) return data;
  return {
    ...data,
    pages: [[...newest, msg], ...rest],
  };
}

/** Apply a mutator to every message in every page (e.g. mark a set of ids as read). */
export function mapInfinitePages<T extends WithId>(
  data: InfiniteData<T[]> | undefined,
  mutator: (msg: T) => T,
): InfiniteData<T[]> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => page.map(mutator)),
  };
}

/** Remove messages matching a predicate from every page (hard delete). */
export function filterInfinitePages<T extends WithId>(
  data: InfiniteData<T[]> | undefined,
  predicate: (msg: T) => boolean,
): InfiniteData<T[]> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => page.filter(predicate)),
  };
}
