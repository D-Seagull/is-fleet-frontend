"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

interface Notice {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

/**
 * While this window is in use the backend sends news (a truck or trip handed
 * to you, a trip status, …) as the `notice` socket event instead of a push to
 * the phone — so it has to show up here, or the person would miss it.
 * The text is already in the recipient's language.
 */
export function useInAppNotices() {
  useEffect(() => {
    const sock = getSocket();
    const onNotice = (n: Notice) => {
      if (!n?.title) return;
      toast(n.title, { description: n.body || undefined, duration: 8000 });
    };
    sock.on("notice", onNotice);
    return () => {
      sock.off("notice", onNotice);
    };
  }, []);
}
