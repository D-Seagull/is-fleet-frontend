"use client";

import type React from "react";
import {
  Pencil,
  X,
  Paperclip,
  Loader2,
  Smile,
  Check,
  Send,
} from "lucide-react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EditingState {
  id: string;
  original: string;
}

export interface ReplyTarget {
  id: string;
  targetType: "msg" | "doc";
  senderName: string | null;
  content: string;
  isDeleted: boolean;
}

// Bottom input bar of the trip chat — mode-switches between plain send,
// reply, and edit while sharing one Input + one Send button.
export function ChatComposer({
  isActiveParticipant,
  text,
  setText,
  editing,
  setEditing,
  replyingTo,
  setReplyingTo,
  showEmoji,
  setShowEmoji,
  pendingFiles,
  removePendingFile,
  uploading,
  fileInputRef,
  handleSend,
  handleFileUpload,
  notifyTyping,
  notifyStopTyping,
}: {
  isActiveParticipant: boolean;
  text: string;
  setText: (v: string) => void;
  editing: EditingState | null;
  setEditing: (v: EditingState | null) => void;
  replyingTo: ReplyTarget | null;
  setReplyingTo: (v: ReplyTarget | null) => void;
  showEmoji: boolean;
  setShowEmoji: (updater: boolean | ((prev: boolean) => boolean)) => void;
  pendingFiles: File[];
  removePendingFile: (idx: number) => void;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleSend: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  notifyTyping: () => void;
  notifyStopTyping: () => void;
}) {
  const onEmojiClick = (data: EmojiClickData) => {
    setText(text + data.emoji);
    setShowEmoji(false);
  };

  return (
    <div className="shrink-0 border-t pt-3 relative">
      {!isActiveParticipant ? (
        <div className="px-3 py-3 text-center text-xs text-muted-foreground">
          Ви більше не учасник цього чату — перегляд тільки для читання.
        </div>
      ) : (
        <>
          {/* Emoji picker */}
          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme={Theme.AUTO}
                width={300}
                height={380}
              />
            </div>
          )}

          {editing && (
            <div className="mb-2 flex items-start gap-2">
              <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                <p className="text-[11px] font-semibold text-primary leading-tight flex items-center gap-1">
                  <Pencil className="h-3 w-3" />
                  Редагування повідомлення
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">
                  {editing.original}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setText("");
                }}
                title="Скасувати редагування"
                className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {replyingTo && !editing && (
            <div className="mb-2 flex items-start gap-2">
              <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                <p className="text-[11px] font-semibold text-primary leading-tight">
                  Reply to {replyingTo.senderName ?? "Unknown"}
                </p>
                <p
                  className={cn(
                    "text-[11px] text-muted-foreground leading-tight truncate flex items-center gap-1",
                    replyingTo.isDeleted && "italic",
                  )}
                >
                  {replyingTo.targetType === "doc" &&
                    !replyingTo.isDeleted && (
                      <Paperclip className="h-3 w-3 shrink-0" />
                    )}
                  <span className="truncate">
                    {replyingTo.isDeleted
                      ? replyingTo.targetType === "doc"
                        ? "Файл видалено"
                        : "Повідомлення видалено"
                      : replyingTo.content}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                title="Cancel reply"
                className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs max-w-[200px]"
                >
                  <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(i)}
                    title="Remove"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              title="Attach file"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileUpload}
            />

            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              title="Emoji"
              onClick={() => setShowEmoji((v) => !v)}
            >
              <Smile className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Input
              placeholder={
                editing ? "Редагуйте повідомлення…" : "Type a message..."
              }
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.length > 0) notifyTyping();
                else notifyStopTyping();
              }}
              onBlur={notifyStopTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleSend();
                if (e.key === "Escape") {
                  setShowEmoji(false);
                  if (editing) {
                    setEditing(null);
                    setText("");
                  }
                }
              }}
              className="flex-1"
            />

            <Button
              size="icon"
              onClick={handleSend}
              disabled={!text.trim() && pendingFiles.length === 0}
              title={editing ? "Зберегти" : "Send"}
              className="h-9 w-9 shrink-0"
            >
              {editing ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
