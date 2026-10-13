"use client";

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { isNetworkError, networkErrorMessage } from "@/lib/network-error";
import { useState } from "react";
import { AuthProvider } from "./auth-provider";
import { ConfirmProvider } from "./confirm-dialog";
import { DocViewerModal } from "./doc-viewer-modal";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Any action (send, save, delete, upload…) whose request never
        // reached the server says so, once — instead of a button that
        // silently did nothing. Server answers (4xx / 5xx) are left to each
        // screen. Background reads aren't toasted: they retry on their own.
        mutationCache: new MutationCache({
          onError: (err) => {
            if (isNetworkError(err)) {
              toast.error(networkErrorMessage(), { id: "network-error" });
            }
          },
        }),
      }),
  );

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
