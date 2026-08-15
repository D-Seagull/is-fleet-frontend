"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Ghost back-arrow that steps back in history. Sits next to a page title. */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={() => router.back()}
      aria-label="Back"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
