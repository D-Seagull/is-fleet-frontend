import type { QueryClient } from "@tanstack/react-query";
import type { Truck } from "@/hooks/use-trucks";

/**
 * Where to open a truck from a notification, the bell or a toast.
 *
 * One of the user's own trucks opens in My Trucks — the column of their
 * trucks stays on the left, the truck's panel (chat by default) on the right.
 * Any other truck opens on its own page, as before.
 */
export function truckHref(
  queryClient: QueryClient,
  truckId: string,
  tab: string = "chat",
): string {
  const mine = queryClient.getQueryData<Truck[]>(["trucks-my"]);
  if (mine?.some((t) => t.id === truckId)) {
    return `/my-trucks?truck=${truckId}&tab=${tab}`;
  }
  return `/trucks/${truckId}?tab=${tab}`;
}
