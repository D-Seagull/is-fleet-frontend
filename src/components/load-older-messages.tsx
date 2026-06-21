"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadOlderMessagesProps {
  hasOlder: boolean;
  isFetchingOlder: boolean;
  onLoadOlder: () => void;
  className?: string;
}

/**
 * Header for an infinite-scroll message list. Shows nothing when there's
 * no older history; a spinner while the previous page is loading; and a
 * tap-to-load button otherwise. Place it at the very top of the message
 * timeline (before the first message in chronological order).
 */
export function LoadOlderMessages({
  hasOlder,
  isFetchingOlder,
  onLoadOlder,
  className,
}: LoadOlderMessagesProps) {
  if (!hasOlder && !isFetchingOlder) return null;

  return (
    <div
      className={`flex justify-center py-2 ${className ?? ""}`}
    >
      {isFetchingOlder ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLoadOlder}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Load older messages
        </Button>
      )}
    </div>
  );
}
