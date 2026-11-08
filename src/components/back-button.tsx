"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Ghost back-arrow next to a page title. Goes one level UP in the URL
 * (/trucks/abc → /trucks → /), never "back in history": history-back looped
 * between two pages that link to each other.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const parent = "/" + segments.slice(0, -1).join("/");
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={() => router.push(parent)}
      aria-label="Back"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
