"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatClock } from "@/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";

// One voice message at a time: starting another stops the one playing.
let playing: HTMLAudioElement | null = null;

const SPEEDS = [1, 1.5, 2] as const;

/**
 * Player inside a chat bubble: play / pause, a progress bar you can click to
 * seek, the length (counting down while playing) and a 1× / 1.5× / 2× toggle.
 * `durationMs` comes from the server — a browser-recorded file often has no
 * duration of its own in its header.
 */
export function VoiceMessagePlayer({
  src,
  durationMs,
  isMine,
  className,
}: {
  src: string;
  durationMs?: number | null;
  isMine: boolean;
  className?: string;
}) {
  const t = useTranslations("chat");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [realMs, setRealMs] = useState<number | null>(null);
  const [speedIdx, setSpeedIdx] = useState(0);

  const totalMs = durationMs || realMs || 0;
  const progress = totalMs ? Math.min(1, currentMs / totalMs) : 0;

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (playing === audio) playing = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (playing && playing !== audio) playing.pause();
      playing = audio;
      audio.playbackRate = SPEEDS[speedIdx];
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !totalMs) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = (ratio * totalMs) / 1000;
    setCurrentMs(ratio * totalMs);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const muted = isMine ? "text-primary-foreground/70" : "text-muted-foreground";
  return (
    <div
      className={cn("flex items-center gap-2 px-3 py-2 w-[230px]", className)}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentMs(0);
          if (playing === audioRef.current) playing = null;
        }}
        onTimeUpdate={(e) => setCurrentMs(e.currentTarget.currentTime * 1000)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setRealMs(d * 1000);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        title={isPlaying ? t("voicePause") : t("voicePlay")}
        className={cn(
          "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
          isMine
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-primary/10 hover:bg-primary/20 text-primary",
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-px" />
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div
          role="slider"
          aria-label={t("voiceMessage")}
          aria-valuemin={0}
          aria-valuemax={Math.round(totalMs / 1000)}
          aria-valuenow={Math.round(currentMs / 1000)}
          onClick={seek}
          className={cn(
            "relative h-1.5 w-full cursor-pointer rounded-full",
            isMine ? "bg-primary-foreground/25" : "bg-primary/15",
          )}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              isMine ? "bg-primary-foreground" : "bg-primary",
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={cn("text-[10px] leading-none tabular-nums", muted)}>
          {formatClock(isPlaying || currentMs > 0 ? currentMs : totalMs)}
        </span>
      </div>
      <button
        type="button"
        onClick={cycleSpeed}
        className={cn(
          "shrink-0 text-[10px] font-semibold tabular-nums w-7 text-center",
          muted,
        )}
      >
        {SPEEDS[speedIdx]}×
      </button>
    </div>
  );
}
