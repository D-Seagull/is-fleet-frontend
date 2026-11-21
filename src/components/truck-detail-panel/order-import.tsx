"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Loader2,
  ScrollText,
  Sparkles,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useParseOrder,
  useTripOrder,
  type OrderDraft,
} from "@/hooks/use-order-import";
import { useDocViewer } from "@/store/doc-viewer";

/** What the draft was read from: a file (kept for the preview + upload) or pasted text. */
export type OrderSourceInput = { file: File } | { text: string };

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.docx,.xlsx,.txt,.csv,application/pdf,image/*";

function errorText(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const message = (err.response?.data as { message?: unknown })?.message;
  if (typeof message === "string") return message;
  // ValidationPipe answers with a list of messages.
  if (Array.isArray(message) && typeof message[0] === "string")
    return message[0];
  return fallback;
}

/**
 * "Fill from order": pick / drop a file or paste the order text, the server
 * reads it and hands back a draft for the form. Nothing is saved here.
 */
export function OrderImportBox({
  driverId,
  onDraft,
}: {
  /** The driver chosen in the form — the notes are written in their language. */
  driverId?: string;
  onDraft: (draft: OrderDraft, source: OrderSourceInput) => void;
}) {
  const t = useTranslations("truckPanel.newTrip.fromOrder");
  const locale = useLocale();
  const parse = useParseOrder();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(source: OrderSourceInput) {
    setError(null);
    try {
      const draft = await parse.mutateAsync({
        ...("file" in source ? { file: source.file } : { text: source.text }),
        locale,
        driverId: driverId || undefined,
      });
      onDraft(draft, source);
      setPasting(false);
      setText("");
    } catch (err) {
      setError(errorText(err, t("failed")));
    }
  }

  if (parse.isPending) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-sm">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        <div>
          <div className="font-medium">{t("reading")}</div>
          <div className="text-xs text-muted-foreground">
            {t("readingHint")}
          </div>
        </div>
      </div>
    );
  }

  // The notes are written in the driver's language: without a driver the
  // server can only fall back to English, so ask for one first.
  const noDriver = !driverId;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors",
        dragOver && !noDriver ? "border-primary bg-primary/5" : "border-border",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!noDriver) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && !noDriver) void run({ file });
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{t("title")}</div>
          <div
            className={cn(
              "text-xs",
              noDriver
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
            )}
          >
            {noDriver ? t("pickDriverFirst") : t("hint")}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={noDriver}
          onClick={() => inputRef.current?.click()}
        >
          <FileText className="h-4 w-4" />
          {t("chooseFile")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={noDriver}
          onClick={() => setPasting((v) => !v)}
        >
          {t("pasteText")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run({ file });
          }}
        />
      </div>

      {pasting && !noDriver && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("pastePlaceholder")}
            rows={6}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="self-end"
            disabled={!text.trim()}
            onClick={() => void run({ text: text.trim() })}
          >
            {t("readText")}
          </Button>
        </div>
      )}

      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
}

/** Shown once a draft is in the form: where it came from + order-wide warnings. */
export function OrderDraftNotice({
  sourceName,
  warnings,
  onReset,
}: {
  sourceName: string;
  warnings: string[];
  onReset: () => void;
}) {
  const t = useTranslations("truckPanel.newTrip.fromOrder");
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          {t("filledFrom", { name: sourceName })}{" "}
          <span className="text-muted-foreground">
            · {t("checkBeforeCreate")}
          </span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          {t("otherOrder")}
        </Button>
      </div>
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

/** A stop the model was unsure about: why, and a jump to its PDF page. */
export function StopReviewNote({
  note,
  page,
  onShowPage,
  onDismiss,
}: {
  note: string | null;
  page: number | null;
  onShowPage?: (page: number) => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("truckPanel.newTrip.fromOrder");
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        {note || t("reviewStop")}
        {page && onShowPage && (
          <>
            {" "}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => onShowPage(page)}
            >
              {t("showPage", { page })}
            </button>
          </>
        )}
      </span>
      <button
        type="button"
        className="rounded p-0.5 hover:bg-amber-500/20"
        onClick={onDismiss}
        aria-label={t("dismiss")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const IMG_TYPE = /^image\/(png|jpe?g|webp|gif)$/i;

/** The order next to the form: PDF (at `page`), photo, or the pasted text. */
export function OrderPreview({
  source,
  page,
}: {
  source: OrderSourceInput;
  page: number | null;
}) {
  const t = useTranslations("truckPanel.newTrip.fromOrder");
  const file = "file" in source ? source.file : null;
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  const box = "h-full min-h-[60vh] w-full rounded-lg border bg-muted/30";

  if (!file) {
    return (
      <pre className={cn(box, "overflow-auto whitespace-pre-wrap p-3 text-xs")}>
        {"text" in source ? source.text : ""}
      </pre>
    );
  }
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf && url) {
    // A new page changes the key: the viewer reloads at #page=N.
    return (
      <iframe
        key={page ?? 0}
        src={`${url}#page=${page ?? 1}`}
        title={file.name}
        className={cn(box, "border-0 bg-white")}
      />
    );
  }
  if (IMG_TYPE.test(file.type) && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={file.name} className={cn(box, "object-contain")} />
    );
  }
  return (
    <div
      className={cn(
        box,
        "flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground",
      )}
    >
      <FileText className="h-8 w-8" />
      <span className="font-medium text-foreground">{file.name}</span>
      <span>{t("noPreview")}</span>
    </div>
  );
}

/** The trip's order file (managers only): a small button that opens it in the viewer. */
export function TripOrderButton({ tripId }: { tripId: string }) {
  const t = useTranslations("truckPanel.newTrip.fromOrder");
  const { data } = useTripOrder(tripId);
  const openViewer = useDocViewer((s) => s.open);
  if (!data?.url) return null;
  const url = data.url;
  return (
    <button
      className="flex shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        openViewer(url, data.fileName);
      }}
      title={t("orderFile")}
    >
      <ScrollText className="h-3.5 w-3.5" />
    </button>
  );
}
