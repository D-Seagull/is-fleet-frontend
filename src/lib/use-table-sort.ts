"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Click-to-sort for the web tables (trips, trucks, drivers, managers).
 *
 * A header click cycles ascending → descending → back to the server order.
 * The choice is remembered per table in localStorage (a per-viewer
 * convenience, like a remembered tab) and restored after a reload. Sorting
 * runs on the client: these tables are fetched in full anyway.
 */

export type SortDir = "asc" | "desc";
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/** What a column sorts by. null / undefined / "" always go last. */
export type SortValue = string | number | null | undefined;

const STORAGE_PREFIX = "table-sort:";
const CHANGE_EVENT = "table-sort-change";

function read(tableId: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + tableId);
  } catch {
    return null;
  }
}

function write(tableId: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_PREFIX + tableId);
    else localStorage.setItem(STORAGE_PREFIX + tableId, value);
  } catch {
    // private mode / blocked storage: the sort still works, just isn't kept
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Natural order for text: "TR 9" before "TR 10", case/accents ignored.
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

const isBlank = (v: SortValue) => v === null || v === undefined || v === "";

export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K> | null,
  columns: Record<K, (row: T) => SortValue>,
): T[] {
  const by = sort ? columns[sort.key] : undefined;
  if (!sort || !by) return [...rows];
  const sign = sort.dir === "asc" ? 1 : -1;
  // Stable: equal values keep the server order.
  return rows
    .map((row, i) => ({ row, i, v: by(row) }))
    .sort((x, y) => {
      const xb = isBlank(x.v);
      const yb = isBlank(y.v);
      if (xb || yb) return xb === yb ? x.i - y.i : xb ? 1 : -1; // blanks last
      return sign * compareValues(x.v, y.v) || x.i - y.i;
    })
    .map((x) => x.row);
}

/**
 * Sorted `rows` plus the state for the headers. `columns` maps each sortable
 * column key to the value it sorts by.
 */
export function useTableSort<T, K extends string>(
  tableId: string,
  rows: readonly T[],
  columns: Record<K, (row: T) => SortValue>,
) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(tableId),
    () => null, // server render: unsorted, then the saved order applies
  );

  const sort = useMemo<SortState<K> | null>(() => {
    if (!raw) return null;
    const [key, dir] = raw.split(":");
    if (!(key in columns) || (dir !== "asc" && dir !== "desc")) return null;
    return { key: key as K, dir };
    // `columns` is a fresh object each render; its keys are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const toggle = useCallback(
    (key: K) => {
      const next: SortState<K> | null =
        sort?.key !== key
          ? { key, dir: "asc" }
          : sort.dir === "asc"
            ? { key, dir: "desc" }
            : null;
      write(tableId, next ? `${next.key}:${next.dir}` : null);
    },
    [sort, tableId],
  );

  const sorted = sortRows(rows, sort, columns);
  return { sorted, sort, toggle };
}
