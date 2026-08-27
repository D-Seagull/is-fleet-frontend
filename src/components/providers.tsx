"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "./auth-provider";
import { ConfirmProvider } from "./confirm-dialog";
import { DocViewerModal } from "./doc-viewer-modal";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </AuthProvider>
      <DocViewerModal />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
