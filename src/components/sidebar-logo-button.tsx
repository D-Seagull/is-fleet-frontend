"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Brand logo in the admin header — clicking it returns to the dashboard
 * (`/admin`), the way a product logo goes home. The sidebar collapse lives on
 * the separate SidebarTrigger next to it.
 */
export function SidebarLogoButton() {
  return (
    <Link
      href="/admin"
      aria-label="Dashboard"
      className="flex items-center rounded-md transition-opacity hover:opacity-80"
    >
      <BrandLogo className="h-[22.5px]" />
    </Link>
  );
}
