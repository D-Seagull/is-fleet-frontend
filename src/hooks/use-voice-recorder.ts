"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildWaveform, waveformToString } from "@/lib/waveform";

/** Longest voice message, in ms (the server accepts up to ~65 s). */
export const VOICE_MAX_MS = 60 * 1000;
/** Shorter taps are an accident, not a message. */
const VOICE_MIN_MS = 700;

// Browsers record differently: Safari / new Chrome can write AAC in MP4, the
// rest webm/opus. MP4 first — it plays everywhere, Safari included.
const CANDIDATES = [
  { mime: "audio/mp4", ext: "m4a" },
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
] as const;

function pickFormat() {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mime)) ?? null
  );
}

export type VoiceRecorderState = "idle" | "starting" | "recording";

/**
 * Records a voice message with MediaRecorder. `onDone` gets the finished file,
 * its length and its waveform ("12,40,…", null when too short to draw) — only
 * when sent, never for a cancelled or too-short take.
 * `onError("denied" | "failed")` reports a refused microphone or a failure.
 */
export function useVoiceRecorder(opts: {
  onDone: (file: File, durationMs: number, waveform: string | null) => void;
  onError?: (reason: "denied" | "failed") => void;
}) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    pickFormat() !== null;

  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Microphone loudness (0…1), sampled ten times a second via an analyser.
  const levelsRef = useRef<number[]>([]);
  const meterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Set when the take is thrown away (cancel / unmount / too short).
  const discardRef = useRef(false);

  const release = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (meterRef.current) clearInterval(meterRef.current);
    meterRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const finish = useCallback(
    (send: boolean) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") return;
      discardRef.current = !send;
      rec.stop(); // → onstop does the rest
    },
    [],
  );

  const start = useCallback(async () => {
    if (state !== "idle") return;
    const format = pickFormat();
    if (!format || !navigator.mediaDevices?.getUserMedia) {
      optsRef.current.onError?.("failed");
      return;
    }
    setState("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setState("idle");
      const name = (err as { name?: string })?.name;
      optsRef.current.onError?.(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : "failed",
      );
      return;
    }
    try {
      const rec = new MediaRecorder(stream, { mimeType: format.mime });
      streamRef.current = stream;
      recorderRef.current = rec;
      chunksRef.current = [];
      discardRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const discard = discardRef.current;
        const chunks = chunksRef.current;
        const levels = levelsRef.current;
        release();
        setState("idle");
        setElapsedMs(0);
        if (discard || durationMs < VOICE_MIN_MS || chunks.length === 0) return;
        // Plain "audio/webm", not "audio/webm;codecs=opus": what the server stores.
        const type = format.mime.split(";")[0];
        const file = new File(chunks, `voice-${Date.now()}.${format.ext}`, {
          type,
        });
        optsRef.current.onDone(
          file,
          Math.min(durationMs, VOICE_MAX_MS),
          waveformToString(buildWaveform(levels)),
        );
      };
      rec.onerror = () => {
        discardRef.current = true;
        optsRef.current.onError?.("failed");
        if (rec.state !== "inactive") rec.stop();
        else {
          release();
          setState("idle");
        }
      };
      // Loudness for the bars: RMS of the live signal, ten times a second.
      levelsRef.current = [];
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Float32Array(analyser.fftSize);
          meterRef.current = setInterval(() => {
            analyser.getFloatTimeDomainData(buf);
            let sum = 0;
            for (const v of buf) sum += v * v;
            const rms = Math.sqrt(sum / buf.length);
            // dBFS → 0…1 (speech sits around −50…−10 dB).
            const db = rms > 0 ? 20 * Math.log10(rms) : -160;
            levelsRef.current.push(Math.min(1, Math.max(0, (db + 55) / 55)));
          }, 100);
        }
      } catch {
        // No waveform: the message still sends, drawn with the placeholder.
      }
      startedAtRef.current = Date.now();
      rec.start(250);
      setElapsedMs(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsedMs(ms);
        if (ms >= VOICE_MAX_MS) finish(true);
      }, 200);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      release();
      setState("idle");
      optsRef.current.onError?.("failed");
    }
  }, [state, finish, release]);

  // Leaving the chat mid-recording throws the take away and frees the mic.
  useEffect(
    () => () => {
      discardRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else {
        release();
      }
    },
    [release],
  );

  return {
    supported,
    state,
    elapsedMs,
    start,
    send: () => finish(true),
    cancel: () => finish(false),
  };
}

/** "0:07" / "12:03". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
