"use client";

import { use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TruckDetailPanel } from "@/components/truck-detail-panel";

function TruckDetailContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "chat";
  return <TruckDetailPanel truckId={id} defaultTab={defaultTab} showBackButton backHref="/trucks" />;
}

export default function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <TruckDetailContent id={id} />
    </Suspense>
  );
}
