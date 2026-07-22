"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface AvatarCropperDialogProps {
  /** Object URL or data: URL of the picked image. */
  imageSrc: string | null;
  /** Filename to reuse on the produced blob (keeps original extension). */
  filename?: string;
  open: boolean;
  onCancel: () => void;
  /** Returns a square Blob ready to upload as the new avatar. */
  onConfirm: (blob: Blob) => Promise<void> | void;
}

/**
 * Crops the raw <img> at `imageSrc` to the rectangle the user picked,
 * outputting a square PNG/JPEG blob. Done client-side via canvas so we
 * don't ship the full uploaded photo to the server.
 */
async function getCroppedBlob(
  imageSrc: string,
  area: Area,
  mime: string,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не вдалось прочитати фото."));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не вдалось підготувати фото."));
      },
      mime,
      0.92,
    );
  });
}

export function AvatarCropperDialog({
  imageSrc,
  filename,
  open,
  onCancel,
  onConfirm,
}: AvatarCropperDialogProps) {
  const t = useTranslations("avatarCropper");
  const tActions = useTranslations("common.actions");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset all transient state when a new image arrives or the dialog closes.
  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setError(null);
    setSubmitting(true);
    try {
      const mime =
        filename?.toLowerCase().endsWith(".png") ||
        filename?.toLowerCase().endsWith(".webp")
          ? "image/png"
          : "image/jpeg";
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, mime);
      await onConfirm(blob);
    } catch {
      setError(t("errorCrop"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cropPhoto")}</DialogTitle>
        </DialogHeader>
        <div className="relative h-64 w-full overflow-hidden rounded-md bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground">{t("zoom")}</label>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            {tActions("cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting || !croppedAreaPixels}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("savePhoto")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
