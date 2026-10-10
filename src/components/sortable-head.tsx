"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import type { SortState } from "@/lib/use-table-sort";
import { cn } from "@/lib/utils";

/**
 * A table header you can click to sort by (see useTableSort). Shows ↑ / ↓ on
 * the active column and a faint ⇅ on hover elsewhere.
 */
export function SortableHead<K extends string>({
  column,
  sort,
  onSort,
  className,
  children,
}: {
  column: K;
  sort: SortState<K> | null;
  onSort: (column: K) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = sort?.key === column ? sort.dir : null;
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead
      className={className}
      aria-sort={
        active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "group/sort -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-40",
          )}
        />
      </button>
    </TableHead>
  );
}
