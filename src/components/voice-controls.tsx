"use client";

import { Mic, Send, Square, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VoiceMessagePlayer } from "@/components/voice-message-player";
import { formatClock, useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";

/**
 * Voice recording for a chat composer: a mic button that turns into a
 * "recording" strip (cancel · timer · stop), then — after stop — a draft strip
 * (trash · player · send) to listen to the take before it goes out.
 * Renders nothing in a browser that can't record.
 */
export function VoiceRecorder({
  onSend,
  disabled,
  className,
  children,
}: {
  onSend: (file: File, durationMs: number, waveform: string | null) => void;
  disabled?: boolean;
  className?: string;
  /**
   * The rest of the composer row, drawn while NOT recording. It gets the mic
   * button (null when the browser can't record) to place where it likes —
   * normally in the Send button's spot while the input is empty.
   */
  children: (mic: React.ReactNode) => React.ReactNode;
}) {
  const t = useTranslations("chat");
  const tUpload = useTranslations("common.upload");
  const rec = useVoiceRecorder({
    onDone: onSend,
    onError: (reason) =>
      toast.error(reason === "denied" ? t("voiceMicDenied") : tUpload("failed")),
  });

  if (rec.state === "recording") {
    return (
      <div className={cn("flex items-center gap-2 flex-1 min-w-0", className)}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-full shrink-0 text-muted-foreground hover:text-destructive"
          title={t("voiceCancel")}
          onClick={rec.cancel}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center gap-2 h-11 rounded-full border px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm tabular-nums">
            {formatClock(rec.elapsedMs)}
          </span>
        </div>
        <Button
          type="button"
          size="icon"
          className="h-11 w-11 rounded-full shrink-0"
          title={t("voiceStop")}
          onClick={rec.stop}
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </div>
    );
  }

  if (rec.draft) {
    return (
      <div className={cn("flex items-center gap-2 flex-1 min-w-0", className)}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-full shrink-0 text-muted-foreground hover:text-destructive"
          title={t("voiceCancel")}
          onClick={rec.discardDraft}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center rounded-full border min-w-0">
          <VoiceMessagePlayer
            src={rec.draft.url}
            durationMs={rec.draft.durationMs}
            waveform={rec.draft.waveform}
            isMine={false}
            className="w-full"
          />
        </div>
        <Button
          type="button"
          size="icon"
          className="h-11 w-11 rounded-full shrink-0"
          title={t("voiceSend")}
          onClick={rec.sendDraft}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {children(
        rec.supported ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-11 w-11 rounded-full shrink-0"
            title={t("voiceRecord")}
            disabled={disabled || rec.state === "starting"}
            onClick={() => void rec.start()}
          >
            <Mic className="h-5 w-5 text-primary" />
          </Button>
        ) : null,
      )}
    </>
  );
}
