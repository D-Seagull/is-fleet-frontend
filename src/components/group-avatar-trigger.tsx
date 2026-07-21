"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AvatarCropperDialog } from "@/components/avatar-cropper-dialog";
import {
  useDeleteGroupAvatar,
  useUploadGroupAvatar,
} from "@/hooks/use-groups";

const MAX_GROUP_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_GROUP_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * Header slot for a group avatar — when the viewer is allowed to edit, the
 * avatar is a clickable trigger that opens a popover with Upload + Remove;
 * a small pencil badge in the bottom-right hints at it. When not editable,
 * we render a plain Avatar without any decoration.
 *
 * Used in /groups/[id]/page.tsx AND in /chat/page.tsx (the redesigned chat
 * uses the same group panel). The component is intentionally framework-y
 * (size + className overridable) so both call sites can match their layout.
 */
export function GroupAvatarTrigger({
  group,
  canEdit,
  className = "h-9 w-9",
}: {
  group: { id: string; name: string; avatar: string | null };
  canEdit: boolean;
  className?: string;
}) {
  const t = useTranslations("groupActions");
  const tActions = useTranslations("common.actions");
  const upload = useUploadGroupAvatar(group.id);
  const remove = useDeleteGroupAvatar(group.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropFilename, setCropFilename] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const fallback = group.name
    ? group.name.charAt(0).toUpperCase()
    : "#";

  const avatarNode = (
    <Avatar className={`${className} shrink-0`}>
      <AvatarImage src={group.avatar ?? undefined} alt={group.name} />
      <AvatarFallback className="bg-primary/20 text-primary">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );

  if (!canEdit) return avatarNode;

  const onPick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_GROUP_AVATAR_TYPES.includes(file.type)) {
      setError(t("errorType"));
      return;
    }
    if (file.size > MAX_GROUP_AVATAR_BYTES) {
      setError(t("errorSize"));
      return;
    }
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
        : `group-avatar.${ext}`;
      const file = new File([blob], filename, { type: blob.type });
      await upload.mutateAsync(file);
      closeCropper();
    } catch {
      setError(t("errorUpload"));
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative rounded-full hover:opacity-80 transition-opacity"
            title={t("changeGroupPhoto")}
          >
            {avatarNode}
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background"
              aria-hidden
            >
              <Pencil className="h-2.5 w-2.5" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent text-left"
            onClick={onPick}
            disabled={upload.isPending || remove.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {group.avatar ? t("changePhoto") : t("uploadPhoto")}
          </button>
          {group.avatar && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent text-left text-destructive"
              onClick={() => remove.mutate()}
              disabled={upload.isPending || remove.isPending}
            >
              {remove.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {tActions("remove")}
            </button>
          )}
          {error && (
            <p className="text-xs text-destructive px-3 py-2">{error}</p>
          )}
        </PopoverContent>
      </Popover>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_GROUP_AVATAR_TYPES.join(",")}
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
    </>
  );
}
