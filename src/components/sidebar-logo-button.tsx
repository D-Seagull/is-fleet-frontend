"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Brand logo that doubles as the sidebar toggle — the same affordance the main
 * app header uses, so the admin panel reads as one product. Must render inside
 * a SidebarProvider (it calls useSidebar).
 */
export function SidebarLogoButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Toggle Sidebar"
      className="flex items-center rounded-md transition-opacity hover:opacity-80"
    >
      <BrandLogo className="h-13" />
    </button>
  );
}
