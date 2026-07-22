"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Reply, Copy, Pencil, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export interface MessageActions {
  /** Always available — copies the plain text to clipboard. */
  onCopy: () => void;
  /** Optional — caller sets the chat's "reply-to" state. */
  onReply?: () => void;
  /** Optional — caller toggles inline-edit mode. Only own + not deleted. */
  onEdit?: () => void;
  /** Optional — soft-delete on the server. Only own + not yet deleted. */
  onDelete?: () => void;
}

interface Props {
  actions: MessageActions;
  isOwn: boolean;
  isDeleted?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a message bubble (or whatever the caller passes as children) and
 * shows a native context menu on:
 *   - right-click (desktop, Radix default),
 *   - keyboard menu key / Shift+F10 (desktop accessibility),
 *   - long-press (mobile/tablet — we synthesise a contextmenu event from
 *     the held touch position so Radix positions the menu correctly).
 */
export function MessageActionsContext({
  actions,
  isOwn,
  isDeleted = false,
  children,
}: Props) {
  const tActions = useTranslations("common.actions");
  const canEdit = isOwn && !isDeleted && !!actions.onEdit;
  const canDelete = isOwn && !isDeleted && !!actions.onDelete;
  const canReply = !isDeleted && !!actions.onReply;

  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  // For deleted messages — no menu at all.
  if (isDeleted) return <>{children}</>;

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (clientX: number, clientY: number) => {
    longPressed.current = false;
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      // Synthesise a contextmenu event so Radix opens the menu at the
      // touch position — same path as a right-click.
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
      });
      containerRef.current?.dispatchEvent(event);
    }, 500);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) startLongPress(t.clientX, t.clientY);
          }}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onTouchCancel={cancelLongPress}
          // Disable the OS' default touch text-selection callout when
          // holding — we want our menu instead.
          style={{ WebkitTouchCallout: "none" }}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {canReply && (
          <ContextMenuItem onClick={actions.onReply}>
            <Reply className="h-4 w-4 mr-2" />
            {tActions("reply")}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={actions.onCopy}>
          <Copy className="h-4 w-4 mr-2" />
          {tActions("copy")}
        </ContextMenuItem>
        {canEdit && (
          <ContextMenuItem onClick={actions.onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            {tActions("edit")}
          </ContextMenuItem>
        )}
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={actions.onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {tActions("delete")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
