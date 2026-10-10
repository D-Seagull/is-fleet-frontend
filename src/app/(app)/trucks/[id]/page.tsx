"use client";

import { use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TruckDetailPanel } from "@/components/truck-detail-panel";
import { useAuthStore } from "@/store/auth";

function TruckDetailContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "chat";
  const role = useAuthStore((s) => s.user?.role);
  // A manager reaches this full-screen page from a notification; "back" puts
  // the column of their trucks back, with this truck still open. Everyone
  // else returns to the all-trucks list.
  const backHref =
    role === "MANAGER"
      ? `/my-trucks?truck=${id}&tab=${defaultTab}`
      : "/trucks";
  return (
    <TruckDetailPanel
      truckId={id}
      defaultTab={defaultTab}
      showBackButton
      backHref={backHref}
    />
  );
}

export default function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <TruckDetailContent id={id} />
    </Suspense>
  );
}
