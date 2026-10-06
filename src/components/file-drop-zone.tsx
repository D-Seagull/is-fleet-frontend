"use client";

import * as React from "react";
import { Paperclip } from "lucide-react";

import { chatFilesFrom } from "@/lib/chat-files";
import { cn } from "@/lib/utils";

const isFileDrag = (e: React.DragEvent) =>
  Array.from(e.dataTransfer.types).includes("Files");

/**
 * Lets files be dragged onto a chat (from Explorer, the desktop, a browser
 * download bar). Shows `label` over the area while files hover it; text or
 * links being dragged are ignored. `disabled` turns it into a plain div.
 */
export function FileDropZone({
  onFiles,
  label,
  disabled,
  className,
  children,
}: {
  onFiles: (files: File[]) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  // dragenter/dragleave also fire for every child crossed — count them so
  // the overlay doesn't flicker while the cursor moves over the messages.
  const depth = React.useRef(0);
  const [over, setOver] = React.useState(false);

  const reset = () => {
    depth.current = 0;
    setOver(false);
  };

  if (disabled) return <div className={className}>{children}</div>;

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault(); // allow the drop
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (!isFileDrag(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault(); // or the browser opens the file in the tab
        reset();
        const files = chatFilesFrom(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-2 z-50 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-background/85 text-sm font-medium text-primary backdrop-blur-[1px]">
          <Paperclip className="h-6 w-6" />
          {label}
        </div>
      )}
    </div>
  );
}
