import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fake rows for the chat sidebar (conversations / team members list).
 * Mimics the real row shape — avatar circle + two lines of text — so the
 * layout doesn't jump when the query resolves.
 */
export function ConversationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Alternating-side chat bubbles as skeletons — matches how a real chat
 * reads so the timeline area doesn't collapse to a spinner before
 * messages land.
 */
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => {
        const isRight = i % 2 === 1;
        const widthClass =
          i % 3 === 0 ? "w-[60%]" : i % 3 === 1 ? "w-[45%]" : "w-[75%]";
        return (
          <div
            key={i}
            className={
              "flex " + (isRight ? "justify-end" : "justify-start")
            }
          >
            <Skeleton className={`h-10 rounded-2xl ${widthClass}`} />
          </div>
        );
      })}
    </div>
  );
}
