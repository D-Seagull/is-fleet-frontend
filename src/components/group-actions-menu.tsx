"use client";

import { useRef, useState } from "react";
import {
  Camera,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarCropperDialog } from "@/components/avatar-cropper-dialog";
import {
  useDeleteGroupAvatar,
  useUpdateGroup,
  useUploadGroupAvatar,
} from "@/hooks/use-groups";

const MAX_GROUP_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_GROUP_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * "..." menu in the group chat header. Bundles photo + name editing
 * behind a single affordance so the header itself stays uncluttered.
 * Renders nothing when `canEdit` is false — non-members shouldn't see
 * actions they can't perform.
 */
export function GroupActionsMenu({
  group,
  canEdit,
}: {
  group: { id: string; name: string; avatar: string | null };
  canEdit: boolean;
}) {
  const upload = useUploadGroupAvatar(group.id);
  const remove = useDeleteGroupAvatar(group.id);
  const rename = useUpdateGroup();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropFilename, setCropFilename] = useState<string | undefined>();
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState(group.name);
  const [renameError, setRenameError] = useState<string | null>(null);

  if (!canEdit) return null;

  // ── Photo upload ──────────────────────────────────────────────
  const onPick = () => {
    setPickerError(null);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_GROUP_AVATAR_TYPES.includes(file.type)) {
      setPickerError("Лише JPG, PNG або WebP.");
      return;
    }
    if (file.size > MAX_GROUP_AVATAR_BYTES) {
      setPickerError("Файл завеликий — до 5 MB.");
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
      setPickerError("Не вдалось завантажити фото.");
    }
  };

  // ── Rename ────────────────────────────────────────────────────
  const openRename = () => {
    setDraftName(group.name);
    setRenameError(null);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setRenameError("Назва не може бути порожньою.");
      return;
    }
    if (trimmed === group.name) {
      setRenameOpen(false);
      return;
    }
    try {
      await rename.mutateAsync({ id: group.id, name: trimmed });
      setRenameOpen(false);
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(data?.message)
          ? data?.message?.[0]
          : data?.message;
        setRenameError(msg ?? "Не вдалось зберегти.");
      } else {
        setRenameError("Не вдалось зберегти.");
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="More">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={onPick}
            disabled={upload.isPending || remove.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {group.avatar ? "Змінити фото" : "Завантажити фото"}
          </DropdownMenuItem>
          {group.avatar && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => remove.mutate()}
              disabled={upload.isPending || remove.isPending}
            >
              {remove.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Прибрати фото
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Перейменувати групу
          </DropdownMenuItem>
          {pickerError && (
            <p className="text-xs text-destructive px-3 py-2">{pickerError}</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => !rename.isPending && setRenameOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Перейменувати групу</DialogTitle>
            <DialogDescription>
              Учасники побачать нову назву одразу після збереження.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">Назва</Label>
            <Input
              id="group-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                }
              }}
            />
            {renameError && (
              <p className="text-xs text-destructive">{renameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={rename.isPending}
            >
              Скасувати
            </Button>
            <Button
              type="button"
              onClick={handleRename}
              disabled={rename.isPending || !draftName.trim()}
            >
              {rename.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
