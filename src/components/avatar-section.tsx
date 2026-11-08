"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/store/auth";
import { useDeleteAvatar, useUploadAvatar } from "@/hooks/use-avatar";
import { fullName, initials } from "@/lib/format";
import { AvatarCropperDialog } from "@/components/avatar-cropper-dialog";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarSection() {
  const t = useTranslations("account.avatar");
  const user = useUser();
  const upload = useUploadAvatar();
  const remove = useDeleteAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropFilename, setCropFilename] = useState<string | undefined>();

  const onPickFile = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError(t("errorType"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t("errorSize"));
      return;
    }
    // Open the cropper instead of uploading right away — the user picks
    // the square they actually want; we ship that to the server.
    const url = URL.createObjectURL(file);
    setCropImage(url);
    setCropFilename(file.name);
    setCropperOpen(true);
  };

  const closeCropper = () => {
    setCropperOpen(false);
    if (cropImage) URL.revokeObjectURL(cropImage);
    setCropImage(null);
    setCropFilename(undefined);
  };

  const handleCropConfirm = async (blob: Blob) => {
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const filename = cropFilename
        ? cropFilename.replace(/\.[^.]+$/, `.${ext}`)
        : `avatar.${ext}`;
      const file = new File([blob], filename, { type: blob.type });
      await upload.mutateAsync(file);
      closeCropper();
    } catch {
      setError(t("errorUpload"));
    }
  };

  const onRemove = async () => {
    setError(null);
    try {
      await remove.mutateAsync();
    } catch {
      setError(t("errorRemove"));
    }
  };

  const isBusy = upload.isPending || remove.isPending;

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-24 w-24">
        <AvatarImage src={user?.avatar ?? undefined} alt={fullName(user)} />
        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
          {initials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="text-base font-medium">
          {fullName(user) || "—"}
        </div>
        <div className="text-sm text-muted-foreground">
          {user?.email ?? user?.role}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            onClick={onPickFile}
            disabled={isBusy}
          >
            {upload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {user?.avatar ? t("change") : t("upload")}
          </Button>
          {user?.avatar && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRemove}
              disabled={isBusy}
            >
              {remove.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("remove")}
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES.join(",")}
        className="hidden"
        onChange={onFileChange}
      />
      <AvatarCropperDialog
        open={cropperOpen}
        imageSrc={cropImage}
        filename={cropFilename}
        onCancel={closeCropper}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
