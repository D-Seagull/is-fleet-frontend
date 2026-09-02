"use client";

import * as React from "react";
import { Bug, ImagePlus, Loader2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { reportBug } from "@/lib/bug-report";

const MAX_SCREENSHOTS = 5;

/**
 * Header "report a problem" button. Lives next to the bell + theme toggle.
 * Opens a small dialog for a description + screenshots; the current route is
 * captured automatically so the report points at the screen the user was on.
 */
export function BugReportButton() {
  const t = useTranslations("bugReport");
  const pathname = usePathname();

  const [open, setOpen] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[] | null) {
    if (!incoming) return;
    const images = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/"),
    );
    setFiles((prev) => [...prev, ...images].slice(0, MAX_SCREENSHOTS));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setDescription("");
    setFiles([]);
    setSubmitting(false);
  }

  const canSend = description.trim().length > 0 || files.length > 0;

  async function handleSubmit() {
    if (!canSend || submitting) return;
    setSubmitting(true);
    try {
      await reportBug(description.trim(), files, { route: pathname });
      toast.success(t("sent"));
      setOpen(false);
      reset();
    } catch {
      toast.error(t("error"));
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("title")}>
          <Bug className="size-5 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent
        onPaste={(e) => addFiles(e.clipboardData?.files ?? null)}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("placeholder")}
          rows={5}
          autoFocus
        />

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative h-16 w-16 overflow-hidden rounded-md border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label={t("removeScreenshot")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_SCREENSHOTS}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {t("attach")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSend || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
