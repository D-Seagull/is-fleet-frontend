"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { fullName, initials } from "@/lib/format";
import {
  Loader2,
  Send,
  ArrowLeft,
  Users,
  Plus,
  UserPlus,
  MoreVertical,
  Trash2,
  Search,
  Folder,
  Paperclip,
  Pencil,
  Check,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupAvatarTrigger } from "@/components/group-avatar-trigger";
import { GroupActionsMenu } from "@/components/group-actions-menu";
import { StatusDot } from "@/components/status-dot";
import {
  ConversationListSkeleton,
  MessageListSkeleton,
} from "@/components/chat-skeletons";
import {
  useConversations,
  useMessages,
  useChatUser,
  useDeleteDirectMessage,
  useEditDirectMessage,
  useHideConversation,
  DirectMessage,
  type Conversation,
} from "@/hooks/use-direct-messages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useChatInit } from "@/hooks/use-chat-init";
import { useAuthStore } from "@/store/auth";
import { getSocket } from "@/lib/socket";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  appendInfiniteMessage,
  patchInfiniteMessage,
} from "@/lib/infinite-messages";
import { LoadOlderMessages } from "@/components/load-older-messages";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useGroupsForChat,
  useCreateGroup,
  useAddManagerToGroup,
  useGroup,
  useGroupMessages,
  useRemoveManagerFromGroup,
  useDeleteGroup,
  useDeleteGroupMessage,
  useEditGroupMessage,
  GroupMessage,
  type ManagerGroup,
} from "@/hooks/use-groups";
import { useTeamMembers } from "@/hooks/use-managers";
import { useDrivers } from "@/hooks/use-drivers";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageAttachmentsSheet } from "@/components/message-attachments-sheet";
import { MessageReactionsCluster } from "@/components/message-reactions";
import { MessageActionsContext } from "@/components/message-actions-menu";
import { MessageQuote } from "@/components/message-quote";
import {
  useReactionsSocketSync,
  type MessageReactionRow,
} from "@/hooks/use-message-reactions";
import {
  useConversationDocuments,
  useUploadConversationDocs,
  useDeleteConversationDoc,
  useConversationDocsSocketSync,
  type ConversationDocumentFull,
} from "@/hooks/use-conversation-documents";
import {
  useGroupDocuments,
  useUploadGroupDocs,
  useDeleteGroupDoc,
  useGroupDocsSocketSync,
  type GroupDocumentFull,
} from "@/hooks/use-group-documents";
import {
  useMarkGroupRead,
  useGroupUnreadSummary,
} from "@/hooks/use-group-unread";
import { FileText, Download } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Overlay kebab (⋯) on a conversation / group row. Hidden until row-hover
// on desktop; always visible on touch devices where hover-intent doesn't
// exist. Uses Radix's recommended AlertDialogTrigger-inside-DropdownMenuItem
// pattern so the dropdown closes into the confirmation dialog cleanly and
// AlertDialogAction auto-dismisses the dialog when clicked.
function RowKebab({
  label,
  icon,
  confirmTitle,
  confirmDescription,
  onConfirm,
}: {
  label: string;
  icon: React.ReactNode;
  confirmTitle: string;
  confirmDescription: string;
  onConfirm: () => void;
}) {
  const tActions = useTranslations("common.actions");
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="text-destructive focus:text-destructive"
            >
              {icon}
              <span className="ml-2">{label}</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tActions("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
              {label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  );
}

function ChatPageContent() {
  const t = useTranslations("chatPage");
  const tChat = useTranslations("chat");
  const locale = useLocale();
  const tActions = useTranslations("common.actions");
  const tNav = useTranslations("nav");
  const tRoles = useTranslations("common.roles");
  const searchParams = useSearchParams();
  const userIdFromUrl = searchParams.get("userId");
  const groupIdFromUrl = searchParams.get("groupId");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    userIdFromUrl ?? null,
  );
  const [showConversations, setShowConversations] = useState(
    !userIdFromUrl && !groupIdFromUrl,
  );
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedUserIdRef = useRef(selectedUserId);
  const selectedGroupIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;
  const [activeTab, setActiveTab] = useState<"managers" | "drivers">(
    "managers",
  );
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groupIdFromUrl ?? null,
  );
  const [isGroupTyping, setIsGroupTyping] = useState(false);
  const [groupTypingName, setGroupTypingName] = useState<string | null>(null);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    /** msg → reply to a text message; doc → reply to a document */
    targetType: "msg" | "doc";
    senderName: string | null;
    /** For msg: text content. For doc: file name. */
    content: string;
    isDeleted: boolean;
  } | null>(null);
  const [editing, setEditing] = useState<{ id: string; original: string } | null>(
    null,
  );
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [attachUploading, setAttachUploading] = useState(false);
  // Files staged for sending — uploaded together with the text on Send so a
  // single reply can have both a caption AND a file (Telegram-style).
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Pre-fetches conversations + dm/group/trip unread summaries in a single
  // round-trip and seeds the corresponding query caches, so the dependent
  // hooks below (useConversations, useDmUnreadSummary, etc.) read from
  // cache instantly on mount.
  useChatInit();
  const { data: conversations, isLoading: loadingConversations } =
    useConversations();
  const {
    data: messages,
    isLoading: loadingMessages,
    fetchOlder: fetchOlderDm,
    hasOlder: hasOlderDm,
    isFetchingOlder: isFetchingOlderDm,
  } = useMessages(selectedUserId ?? "");
  const { data: chatUser } = useChatUser(selectedUserId ?? "");
  const { data: groups } = useGroupsForChat();
  const { data: teamMembers } = useTeamMembers();
  const { data: allDrivers } = useDrivers();
  const createGroup = useCreateGroup();
  const addMember = useAddManagerToGroup();
  const removeMember = useRemoveManagerFromGroup();
  const deleteDm = useDeleteDirectMessage();
  const deleteGroupMsg = useDeleteGroupMessage();
  const hideConversation = useHideConversation();
  const deleteGroup = useDeleteGroup();
  const editDm = useEditDirectMessage(selectedUserId ?? "");
  const editGroupMsg = useEditGroupMessage(selectedGroupId ?? "");
  const dmDocUpload = useUploadConversationDocs(selectedUserId ?? "");
  const groupDocUpload = useUploadGroupDocs(selectedGroupId ?? "");
  const deleteDmDoc = useDeleteConversationDoc(selectedUserId ?? "");
  const deleteGroupDoc = useDeleteGroupDoc(selectedGroupId ?? "");
  const { data: dmDocs = [] } = useConversationDocuments(selectedUserId ?? "");
  const { data: groupDocs = [] } = useGroupDocuments(selectedGroupId ?? "");
  useConversationDocsSocketSync(selectedUserId);
  useGroupDocsSocketSync(selectedGroupId);
  useReactionsSocketSync({
    dmOtherUserId: selectedUserId,
    groupId: selectedGroupId,
  });
  const markGroupRead = useMarkGroupRead();
  const { data: groupUnreadData } = useGroupUnreadSummary();
  const groupUnreadMap = new Map(
    (groupUnreadData?.items ?? []).map((g) => [g.groupId, g.unreadCount]),
  );
  const { data: selectedGroup } = useGroup(selectedGroupId ?? "");
  const {
    data: groupMessages,
    fetchOlder: fetchOlderGroup,
    hasOlder: hasOlderGroup,
    isFetchingOlder: isFetchingOlderGroup,
  } = useGroupMessages(selectedGroupId ?? "");

  const selectedUser =
    conversations?.find((c) => c.user.id === selectedUserId)?.user ?? chatUser;

  const managerConvs = (conversations ?? []).filter(
    (c) => c.user.role === "MANAGER" || c.user.role === "TEAMLEAD",
  );
  const driverConvs = (conversations ?? []).filter(
    (c) => c.user.role === "DRIVER",
  );

  // Merge messages + documents into a single chronological timeline so
  // attachments appear inline in the chat (same UX as trip chat).
  const currentMessages = selectedGroupId
    ? (groupMessages ?? [])
    : (messages ?? []);
  const currentDocs = selectedGroupId ? groupDocs : dmDocs;
  type ChatItem =
    | {
        kind: "msg";
        data: DirectMessage | GroupMessage;
        createdAt: string;
      }
    | {
        kind: "doc";
        data: ConversationDocumentFull | GroupDocumentFull;
        createdAt: string;
      };
  const timeline: ChatItem[] = [
    ...currentMessages.map((m) => ({
      kind: "msg" as const,
      data: m,
      createdAt: m.createdAt,
    })),
    ...currentDocs.map((d) => ({
      kind: "doc" as const,
      data: d,
      createdAt: d.createdAt,
    })),
  ].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const searchQ = searchQuery.toLowerCase().trim();
  const filteredGroups = !searchQ
    ? (groups ?? [])
    : (groups ?? []).filter((g) => g.name.toLowerCase().includes(searchQ));
  const filteredManagerConvs = !searchQ
    ? managerConvs
    : managerConvs.filter((c) =>
        (fullName(c.user) || "").toLowerCase().includes(searchQ),
      );
  const filteredDriverConvs = !searchQ
    ? driverConvs
    : driverConvs.filter((c) =>
        (fullName(c.user) || "").toLowerCase().includes(searchQ),
      );

  // Teams-style search: when the user types a query, also surface company
  // members they haven't started a chat with yet — clicking opens a blank DM
  // ready for the first message.
  const matchesQuery = (
    name: string | null | undefined,
    phone: string | null | undefined,
    email: string | null | undefined,
  ) => {
    if (!searchQ) return false;
    return (
      (name ?? "").toLowerCase().includes(searchQ) ||
      (phone ?? "").includes(searchQuery) ||
      (email ?? "").toLowerCase().includes(searchQ)
    );
  };
  const managerConvIds = new Set(managerConvs.map((c) => c.user.id));
  const driverConvIds = new Set(driverConvs.map((c) => c.user.id));
  // Managers-tab mirrors Drivers: permanent "All team" directory under Recent.
  // Search narrows to matches; otherwise the full team minus users already in
  // Recent. ADMIN is a system role — managers don't chat with them, so drop
  // ADMIN from the directory (useTeamMembers keeps them for other pages).
  const extraTeamMembers = (teamMembers ?? []).filter((m) => {
    if (m.id === user?.id) return false;
    if (m.role === "ADMIN") return false;
    if (managerConvIds.has(m.id)) return false;
    if (!searchQ) return true;
    return matchesQuery(fullName(m), m.phone, m.email);
  });
  // Drivers-tab shows a permanent "All drivers" directory below "Recent".
  // Under a search query, filter to matches; otherwise show the full list
  // minus anyone who already has a conversation (they appear under Recent).
  const extraDrivers = (allDrivers ?? []).filter((d) => {
    if (d.id === user?.id) return false;
    if (driverConvIds.has(d.id)) return false;
    if (!searchQ) return true;
    return matchesQuery(fullName(d), d.phone, d.email);
  });

  type SearchableUser = {
    id: string;
    firstName: string;
    lastName: string | null;
    role: string;
    avatar?: string | null;
  };
  const renderUserButton = (u: SearchableUser) => (
    <button
      key={`find-${u.id}`}
      onClick={() => handleSelectUser(u.id)}
      className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={u?.avatar ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials(u)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{fullName(u) || u.role}</p>
        <p className="text-xs text-muted-foreground truncate capitalize">
          {u.role.toLowerCase()}
        </p>
      </div>
    </button>
  );

  type Conv = NonNullable<typeof conversations>[number];
  const renderConvButton = (conv: Conv) => {
    const hasUnread = conv.unreadCount > 0;
    return (
      <div key={conv.user.id} className="group relative">
        <button
          onClick={() => handleSelectUser(conv.user.id)}
          className={cn(
            "w-full flex items-center gap-3 p-4 pr-12 text-left hover:bg-muted/50 transition-colors",
            selectedUserId === conv.user.id && "bg-muted",
            hasUnread &&
              selectedUserId !== conv.user.id &&
              "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60",
          )}
        >
          <span className="relative shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conv.user?.avatar ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials(conv.user)}</AvatarFallback>
            </Avatar>
            <StatusDot
              user={conv.user}
              size="sm"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {hasUnread && (
                <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />
              )}
              <p
                className={cn(
                  "truncate flex-1",
                  hasUnread ? "font-bold" : "font-medium",
                )}
              >
                {fullName(conv.user) || tRoles(conv.user.role)}
              </p>
              {hasUnread && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none shrink-0">
                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {conv.lastMessage.content}
            </p>
          </div>
        </button>
        <RowKebab
          label={t("deleteForMe")}
          icon={<Trash2 className="h-4 w-4" />}
          confirmTitle={t("deleteConvTitle")}
          confirmDescription={t("deleteConvDesc", {
            name: fullName(conv.user) || tRoles(conv.user.role),
          })}
          onConfirm={() => hideConversation.mutate(conv.user.id)}
        />
      </div>
    );
  };

  const renderGroupButton = (group: ManagerGroup) => {
    const unread = groupUnreadMap.get(group.id) ?? 0;
    const hasUnread = unread > 0;
    return (
      <div key={`group-${group.id}`} className="group relative">
        <button
          onClick={() => handleSelectGroup(group.id)}
          className={cn(
            "w-full flex items-center gap-3 p-4 pr-12 text-left hover:bg-muted/50 transition-colors",
            selectedGroupId === group.id && "bg-muted",
            hasUnread &&
              selectedGroupId !== group.id &&
              "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60",
          )}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={group.avatar ?? undefined} alt={group.name} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {group.name ? group.name.charAt(0).toUpperCase() : "#"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {hasUnread && (
                <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />
              )}
              <p
                className={cn(
                  "truncate flex-1",
                  hasUnread ? "font-bold" : "font-medium",
                )}
              >
                {group.name}
              </p>
              {hasUnread && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none shrink-0">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {t("membersCount", { count: group.managers.length })}
            </p>
          </div>
        </button>
        {group.createdBy === user?.id && (
          <RowKebab
            label={tActions("delete")}
            icon={<Trash2 className="h-4 w-4" />}
            confirmTitle={t("deleteGroupTitle", { name: group.name })}
            confirmDescription={t("deleteGroupDesc")}
            onConfirm={() =>
              deleteGroup.mutate(group.id, {
                onError: (err) => {
                  const msg =
                    (err as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message ?? err.message;
                  toast.error(t("cannotDeleteGroup", { msg }));
                },
              })
            }
          />
        )}
      </div>
    );
  };

  const markMessagesAsRead = useCallback(
    (userId: string) => {
      getSocket().emit("mark_as_read", { senderId: userId });
      // useConversations is disabled on /chat while chat-init owns the cache,
      // so an invalidate on ["conversations"] alone wouldn't refetch and the
      // unread badge would linger until the next chat-init hydrate. Patch
      // the peer's row to 0 optimistically for an instant repaint, then
      // invalidate chat-init so the next fresh fetch matches server state.
      queryClient.setQueryData<Conversation[]>(["conversations"], (prev) =>
        prev
          ? prev.map((c) =>
              c.user.id === userId ? { ...c, unreadCount: 0 } : c,
            )
          : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["chat-init"] });
      queryClient.invalidateQueries({ queryKey: ["dm-unread-summary"] });
    },
    [queryClient],
  );

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  // Bell-notification clicks push `/chat?userId=X` even when we're already on
  // /chat. useState only reads the query on first mount, so without this
  // sync the URL changes but the sidebar stays put.
  useEffect(() => {
    if (userIdFromUrl && userIdFromUrl !== selectedUserId) {
      handleSelectUser(userIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdFromUrl]);

  // When we arrive at /chat?userId=X (deep-link from /drivers or /managers),
  // switch the sidebar tab to match the target user's role so their row is
  // visible in the visible list. Waits for allDrivers/conversations to
  // resolve; falls back to a chatUser lookup for users the current viewer
  // has never messaged and who aren't in the drivers dropdown.
  useEffect(() => {
    if (!userIdFromUrl) return;
    const role =
      (allDrivers ?? []).find((d) => d.id === userIdFromUrl)?.role ??
      (conversations ?? []).find((c) => c.user.id === userIdFromUrl)?.user
        .role ??
      chatUser?.role;
    if (role === "DRIVER") setActiveTab("drivers");
    else if (role === "MANAGER" || role === "TEAMLEAD" || role === "ADMIN")
      setActiveTab("managers");
  }, [userIdFromUrl, allDrivers, conversations, chatUser]);

  useEffect(() => {
    if (groupIdFromUrl && groupIdFromUrl !== selectedGroupId) {
      handleSelectGroup(groupIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdFromUrl]);

  // Keep the sidebar tab aligned with whoever is currently selected. Fires
  // on mount (URL-driven initial selection) and after handleSelectUser too,
  // so a bell click that reveals a manager auto-switches away from Drivers.
  // Deps use the raw query results (stable refs) instead of the per-render
  // driverConvs / managerConvs filters — otherwise every render creates a
  // fresh array reference and the effect re-fires, overriding any manual
  // tab click the user just made.
  useEffect(() => {
    if (!selectedUserId) return;
    const conv =
      conversations?.find((c) => c.user.id === selectedUserId)?.user ??
      (allDrivers ?? []).find((d) => d.id === selectedUserId) ??
      (teamMembers ?? []).find((m) => m.id === selectedUserId);
    if (conv) {
      setActiveTab(conv.role === "DRIVER" ? "drivers" : "managers");
    }
  }, [selectedUserId, conversations, allDrivers, teamMembers]);

  useEffect(() => {
    if (selectedUserId) {
      markMessagesAsRead(selectedUserId);
    }
  }, [selectedUserId, markMessagesAsRead]);

  useEffect(() => {
    if (selectedGroupId) {
      markGroupRead.mutate(selectedGroupId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  useEffect(() => {
    const socket = getSocket();
    const onNewDirect = (message: DirectMessage) => {
      const otherUserId =
        message.senderId === user?.id ? message.receiverId : message.senderId;
      queryClient.setQueryData<InfiniteData<DirectMessage[]>>(
        ["messages", otherUserId],
        (prev) => appendInfiniteMessage(prev, message),
      );
      if (
        message.senderId !== user?.id &&
        selectedUserIdRef.current === message.senderId
      ) {
        markMessagesAsRead(message.senderId);
      } else {
        // Bump the peer's row locally so it re-sorts to the top of Recent
        // and its lastMessage/unreadCount update without a network hit.
        // If the peer has no row yet — genuinely first message ever — we
        // fall back to refetching chat-init so a full Conversation object
        // (with user profile) enters the cache. On /chat the plain
        // ["conversations"] key is a no-op because useConversations is
        // disabled while chat-init owns the cache.
        const existing =
          queryClient.getQueryData<Conversation[]>(["conversations"]) ?? [];
        const alreadyKnown = existing.some((c) => c.user.id === otherUserId);

        if (alreadyKnown) {
          queryClient.setQueryData<Conversation[]>(["conversations"], (prev) => {
            if (!prev) return prev;
            const isIncoming = message.senderId !== user?.id;
            const patched = prev.map((c) =>
              c.user.id === otherUserId
                ? {
                    ...c,
                    lastMessage: message,
                    unreadCount: isIncoming
                      ? c.unreadCount + 1
                      : c.unreadCount,
                  }
                : c,
            );
            return [...patched].sort(
              (a, b) =>
                new Date(b.lastMessage.createdAt).getTime() -
                new Date(a.lastMessage.createdAt).getTime(),
            );
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ["chat-init"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      }
    };
    const onMessagesRead = ({ readBy }: { readBy: string }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", readBy] });
      queryClient.invalidateQueries({
        queryKey: ["conversation-documents", readBy],
      });
    };
    // Patch a single DM cache slot scoped to the (current user, peer) pair.
    // The backend now includes senderId + receiverId on delete events and
    // the edited message object already carries them, so we can target the
    // exact ["messages", peerId] key instead of iterating every cached
    // DM conversation (which gets expensive for managers who open many
    // chats during a shift).
    const patchDm = (
      payload: { id: string; senderId: string; receiverId: string },
      mutator: (msg: DirectMessage) => DirectMessage,
    ) => {
      const meId = user?.id;
      const peerId =
        payload.senderId === meId ? payload.receiverId : payload.senderId;
      queryClient.setQueryData<InfiniteData<DirectMessage[]>>(
        ["messages", peerId],
        (prev) => patchInfiniteMessage(prev, payload.id, mutator),
      );
    };
    const onDmDeleted = (payload: {
      id: string;
      senderId: string;
      receiverId: string;
    }) => {
      patchDm(payload, (m) => ({
        ...m,
        content: "",
        deletedAt: new Date().toISOString(),
      }));
    };
    const onGroupDeleted = ({ id, groupId }: { id: string; groupId: string }) => {
      queryClient.setQueryData<InfiniteData<GroupMessage[]>>(
        ["group-messages", groupId],
        (prev) =>
          patchInfiniteMessage(prev, id, (m) => ({
            ...m,
            content: "",
            deletedAt: new Date().toISOString(),
          })),
      );
    };
    const onDmEdited = (updated: DirectMessage) => {
      patchDm(
        { id: updated.id, senderId: updated.senderId, receiverId: updated.receiverId },
        (m) => ({ ...m, ...updated }),
      );
    };
    const onGroupEdited = (updated: GroupMessage) => {
      queryClient.setQueryData<InfiniteData<GroupMessage[]>>(
        ["group-messages", updated.groupId],
        (prev) =>
          patchInfiniteMessage(prev, updated.id, (m) => ({ ...m, ...updated })),
      );
    };
    // Backend broadcasts group_deleted to `group:{id}` room and to each
    // member's `user:{memberId}` room after a successful delete. Drop the
    // row from the cache and clear selection if the open chat is the one
    // that vanished.
    const onGroupDeletedForAll = (payload: { id: string }) => {
      queryClient.setQueryData<ManagerGroup[]>(["manager-groups"], (prev) =>
        prev ? prev.filter((g) => g.id !== payload.id) : prev,
      );
      if (selectedGroupIdRef.current === payload.id) {
        setSelectedGroupId(null);
      }
    };
    // A new group I've just been added to arrives here; prepend so it
    // shows up at the top of the list. Guard against duplicates in case the
    // adder is also the caller of the mutation (their optimistic invalidate
    // may have already brought it in).
    const onGroupAdded = (group: ManagerGroup) => {
      queryClient.setQueryData<ManagerGroup[]>(["manager-groups"], (prev) => {
        if (!prev) return [group];
        if (prev.some((g) => g.id === group.id)) return prev;
        return [group, ...prev];
      });
    };
    // The group's name / avatar / member list was edited — swap the row
    // in place so every member's sidebar reflects the change instantly.
    const onGroupUpdated = (group: ManagerGroup) => {
      queryClient.setQueryData<ManagerGroup[]>(["manager-groups"], (prev) => {
        if (!prev) return prev;
        return prev.map((g) => (g.id === group.id ? group : g));
      });
    };
    // An existing group I'm already in gained a new member — patch the
    // managers list so the member count / avatars in the sidebar refresh.
    const onGroupMemberAdded = (payload: {
      groupId: string;
      manager: ManagerGroup["managers"][number]["manager"];
    }) => {
      queryClient.setQueryData<ManagerGroup[]>(["manager-groups"], (prev) => {
        if (!prev) return prev;
        return prev.map((g) => {
          if (g.id !== payload.groupId) return g;
          if (g.managers.some((m) => m.manager.id === payload.manager.id)) return g;
          return {
            ...g,
            managers: [
              ...g.managers,
              { id: `${payload.groupId}:${payload.manager.id}`, manager: payload.manager },
            ],
          };
        });
      });
    };
    socket.on("new_direct_message", onNewDirect);
    socket.on("messages_read", onMessagesRead);
    socket.on("dm_message_deleted", onDmDeleted);
    socket.on("group_message_deleted", onGroupDeleted);
    socket.on("dm_message_edited", onDmEdited);
    socket.on("group_message_edited", onGroupEdited);
    socket.on("group_deleted", onGroupDeletedForAll);
    socket.on("group_added", onGroupAdded);
    socket.on("group_updated", onGroupUpdated);
    socket.on("group_member_added", onGroupMemberAdded);
    return () => {
      // Pass specific callback — otherwise socket.off(event) wipes ALL
      // listeners for that event, including the global ones in AppLayoutInner.
      socket.off("new_direct_message", onNewDirect);
      socket.off("messages_read", onMessagesRead);
      socket.off("dm_message_deleted", onDmDeleted);
      socket.off("group_message_deleted", onGroupDeleted);
      socket.off("dm_message_edited", onDmEdited);
      socket.off("group_message_edited", onGroupEdited);
      socket.off("group_deleted", onGroupDeletedForAll);
      socket.off("group_added", onGroupAdded);
      socket.off("group_updated", onGroupUpdated);
      socket.off("group_member_added", onGroupMemberAdded);
    };
  }, [user?.id, queryClient, markMessagesAsRead]);

  useEffect(() => {
    const socket = getSocket();
    const onTyping = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(true);
    };
    const onStopped = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(false);
    };
    socket.on("user_typing", onTyping);
    socket.on("user_stopped_typing", onStopped);
    return () => {
      socket.off("user_typing", onTyping);
      socket.off("user_stopped_typing", onStopped);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedGroupId) return;
    const socket = getSocket();
    socket.emit("join_group", { groupId: selectedGroupId });

    const onNewGroupMessage = (msg: GroupMessage) => {
      if (msg.groupId !== selectedGroupId) return;
      queryClient.setQueryData<InfiniteData<GroupMessage[]>>(
        ["group-messages", selectedGroupId],
        (prev) => appendInfiniteMessage(prev, msg),
      );
    };
    const onGroupTyping = ({
      groupId,
      userId,
      firstName,
      lastName,
    }: {
      groupId: string;
      userId: string;
      firstName?: string | null;
      lastName?: string | null;
    }) => {
      if (groupId === selectedGroupId && userId !== user?.id) {
        setIsGroupTyping(true);
        setGroupTypingName(fullName({ firstName, lastName }) || null);
      }
    };
    const onGroupStoppedTyping = ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      if (groupId === selectedGroupId && userId !== user?.id) {
        setIsGroupTyping(false);
      }
    };

    socket.on("new_group_message", onNewGroupMessage);
    socket.on("group_typing", onGroupTyping);
    socket.on("group_stopped_typing", onGroupStoppedTyping);

    return () => {
      socket.emit("leave_group", { groupId: selectedGroupId });
      socket.off("new_group_message", onNewGroupMessage);
      socket.off("group_typing", onGroupTyping);
      socket.off("group_stopped_typing", onGroupStoppedTyping);
    };
  }, [selectedGroupId, user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages, dmDocs, groupDocs]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedGroupId(null);
    setShowConversations(false);
    setSearchQuery("");
    setReplyingTo(null);
    setEditing(null);
    setPendingFiles([]);
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedUserId(null);
    setShowConversations(false);
    setSearchQuery("");
    setReplyingTo(null);
    setEditing(null);
    setPendingFiles([]);
  };

  /** Scroll a target (message OR doc) into view and briefly highlight it. */
  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`chat-msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-lg");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "rounded-lg");
    }, 1500);
  };
  const scrollToDoc = (docId: string) => {
    const el = document.getElementById(`chat-doc-${docId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-lg");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "rounded-lg");
    }, 1500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!trimmed && !hasFiles && !editing) return;

    // Edit mode — PATCH the message instead of sending a new one.
    if (editing) {
      if (!trimmed) return;
      if (trimmed === editing.original.trim()) {
        // No change — just exit edit mode silently.
        setEditing(null);
        setNewMessage("");
        return;
      }
      try {
        if (selectedGroupId) {
          await editGroupMsg.mutateAsync({ id: editing.id, content: trimmed });
        } else if (selectedUserId) {
          await editDm.mutateAsync({ id: editing.id, content: trimmed });
        }
      } finally {
        setEditing(null);
        setNewMessage("");
      }
      return;
    }

    // replyTo can point at a message OR a document — pass exactly one.
    const replyMsgId =
      replyingTo?.targetType === "msg" ? replyingTo.id : null;
    const replyDocId =
      replyingTo?.targetType === "doc" ? replyingTo.id : null;

    // Telegram-style: when files AND text are sent together, the text becomes
    // the caption on the file bubble — NOT a separate message. Pure text or
    // pure files use the existing single-channel paths.
    if (hasFiles) {
      setAttachUploading(true);
      try {
        if (selectedGroupId) {
          await groupDocUpload.mutateAsync({
            files: pendingFiles,
            replyToMessageId: replyMsgId,
            replyToDocumentId: replyDocId,
            caption: trimmed || null,
          });
        } else if (selectedUserId) {
          await dmDocUpload.mutateAsync({
            files: pendingFiles,
            replyToMessageId: replyMsgId,
            replyToDocumentId: replyDocId,
            caption: trimmed || null,
          });
        }
      } catch (err) {
        setAttachUploading(false);
        console.error("[chat] file upload failed", err);
        return;
      }
      setAttachUploading(false);
      setPendingFiles([]);
    } else if (trimmed) {
      if (selectedGroupId) {
        getSocket().emit("send_group_message", {
          groupId: selectedGroupId,
          content: trimmed,
          replyToId: replyMsgId,
          replyToDocumentId: replyDocId,
        });
      } else if (selectedUserId) {
        getSocket().emit("send_direct_message", {
          receiverId: selectedUserId,
          content: trimmed,
          replyToId: replyMsgId,
          replyToDocumentId: replyDocId,
        });
      }
    }

    setNewMessage("");
    setReplyingTo(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const socket = getSocket();
    if (selectedGroupId) {
      socket.emit("group_typing", {
        groupId: selectedGroupId,
        name: fullName(user),
      });
    } else if (selectedUserId) {
      socket.emit("typing_start", { receiverId: selectedUserId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedGroupId) {
        getSocket().emit("group_stopped_typing", { groupId: selectedGroupId });
      } else if (selectedUserId) {
        getSocket().emit("typing_stop", { receiverId: selectedUserId });
      }
    }, 2000);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (attachInputRef.current) attachInputRef.current.value = "";
    if (!files.length) return;
    // Send immediately on selection — no staging / extra Send click. Any
    // active reply target still travels with the upload.
    const replyMsgId = replyingTo?.targetType === "msg" ? replyingTo.id : null;
    const replyDocId = replyingTo?.targetType === "doc" ? replyingTo.id : null;
    setAttachUploading(true);
    try {
      if (selectedGroupId) {
        await groupDocUpload.mutateAsync({
          files,
          replyToMessageId: replyMsgId,
          replyToDocumentId: replyDocId,
          caption: null,
        });
      } else if (selectedUserId) {
        await dmDocUpload.mutateAsync({
          files,
          replyToMessageId: replyMsgId,
          replyToDocumentId: replyDocId,
          caption: null,
        });
      }
      setReplyingTo(null);
    } catch (err) {
      console.error("[chat] file upload failed", err);
    } finally {
      setAttachUploading(false);
    }
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name || selectedMemberIds.size === 0) return;
    const group = await createGroup.mutateAsync(name);
    await Promise.all(
      [...selectedMemberIds].map((managerId) =>
        addMember.mutateAsync({ groupId: group.id, managerId }),
      ),
    );
    setNewGroupName("");
    setSelectedMemberIds(new Set());
    setGroupDialogOpen(false);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Список розмов */}
      <div
        className={cn(
          "border-r flex flex-col overflow-hidden",
          "md:w-80 md:flex",
          showConversations ? "flex w-full" : "hidden md:flex",
        )}
      >
        <div className="p-4 border-b shrink-0 space-y-3">
          <h2 className="font-semibold">{t("messagesTitle")}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label={t("clearSearch")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {searchQ ? (
          <div className="flex-1 overflow-y-auto">
            {/* ── Groups ───────────────────────────────────────────── */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("groups")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setGroupDialogOpen(true)}
                title={t("createGroup")}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => renderGroupButton(group))
            ) : (
              <p className="text-center text-muted-foreground/70 px-4 py-2 text-xs">
                {t("noMatchingGroups")}
              </p>
            )}

            {/* ── Direct messages (managers + drivers combined) ───── */}
            {(() => {
              const combinedConvs = [
                ...filteredManagerConvs,
                ...filteredDriverConvs,
              ].sort(
                (a, b) =>
                  new Date(b.lastMessage.createdAt).getTime() -
                  new Date(a.lastMessage.createdAt).getTime(),
              );
              return (
                <>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-2">
                    {t("directMessages")}
                  </div>
                  {combinedConvs.length === 0 ? (
                    <p className="text-center text-muted-foreground/70 px-4 py-2 text-xs">
                      {t("noMatchingConversations")}
                    </p>
                  ) : (
                    combinedConvs.map((conv) => renderConvButton(conv))
                  )}
                </>
              );
            })()}

            {/* ── Find people (extras from company) ────────────────── */}
            {(extraTeamMembers.length > 0 || extraDrivers.length > 0) && (
              <>
                <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-2">
                  {t("findPeople")}
                </div>
                {extraTeamMembers.map((m) => renderUserButton(m))}
                {extraDrivers.map((d) => renderUserButton(d))}
              </>
            )}
          </div>
        ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "managers" | "drivers")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-2 grid grid-cols-2 shrink-0">
            <TabsTrigger value="managers" className="relative">
              {tNav("managers")}
              {managerConvs.some((c) => c.unreadCount > 0) && (
                <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="relative">
              {tNav("drivers")}
              {driverConvs.some((c) => c.unreadCount > 0) && (
                <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="managers"
            className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden"
          >
            {/* Заголовок Groups з кнопкою "+" для створення нової групи */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("groups")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setGroupDialogOpen(true)}
                title={t("createGroup")}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => renderGroupButton(group))
            ) : searchQ ? (
              <p className="text-center text-muted-foreground/70 px-4 py-2 text-xs">
                {t("noMatchingGroups")}
              </p>
            ) : (
              <p className="text-center text-muted-foreground/70 px-4 py-2 text-xs">
                {t("noGroupsYet")}
              </p>
            )}

            {loadingConversations ? (
              <ConversationListSkeleton />
            ) : filteredManagerConvs.length === 0 &&
              extraTeamMembers.length === 0 ? (
              <p className="text-center text-muted-foreground p-4 text-sm">
                {searchQ ? t("noMatches") : t("noTeamMembers")}
              </p>
            ) : (
              <>
                {filteredManagerConvs.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-2">
                      {t("recent")}
                    </div>
                    {filteredManagerConvs.map((conv) => renderConvButton(conv))}
                  </>
                )}
                {extraTeamMembers.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-2">
                      {t("allTeam", { count: extraTeamMembers.length })}
                    </div>
                    {extraTeamMembers.map((m) => renderUserButton(m))}
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent
            value="drivers"
            className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden"
          >
            {loadingConversations ? (
              <ConversationListSkeleton />
            ) : filteredDriverConvs.length === 0 &&
              extraDrivers.length === 0 ? (
              <p className="text-center text-muted-foreground p-4 text-sm">
                {searchQ ? t("noMatches") : t("noDrivers")}
              </p>
            ) : (
              <>
                {filteredDriverConvs.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("recent")}
                    </div>
                    {filteredDriverConvs.map((conv) => renderConvButton(conv))}
                  </>
                )}
                {extraDrivers.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-2">
                      {t("allDrivers", { count: extraDrivers.length })}
                    </div>
                    {extraDrivers.map((d) => renderUserButton(d))}
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Вікно повідомлень */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden",
          !showConversations ? "flex" : "hidden md:flex",
        )}
      >
        {selectedUser || selectedGroup ? (
          <>
            <div className="p-4 border-b shrink-0 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setShowConversations(true)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {selectedGroup ? (
                <>
                  {/* Avatar is display-only here — edit actions live in the
                      "..." dropdown below so the header doesn't have two
                      separate edit affordances side by side. */}
                  <GroupAvatarTrigger group={selectedGroup} canEdit={false} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {selectedGroup.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("membersCount", {
                        count: selectedGroup.managers.length,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("attachments")}
                    onClick={() => setAttachmentsOpen(true)}
                  >
                    <Folder className="h-4 w-4" />
                  </Button>
                  <Sheet
                    open={membersSheetOpen}
                    onOpenChange={setMembersSheetOpen}
                  >
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" title={t("members")}>
                        <Users className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>{selectedGroup.name}</SheetTitle>
                      </SheetHeader>
                      <div className="px-4 space-y-4 mt-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                            {t("membersHeading", {
                              count: selectedGroup.managers.length,
                            })}
                          </p>
                          <div className="space-y-1">
                            {selectedGroup.managers.map((gm) => {
                              const isSelf = gm.manager.id === user?.id;
                              return (
                                <div
                                  key={gm.id}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isSelf) return;
                                      handleSelectUser(gm.manager.id);
                                      setMembersSheetOpen(false);
                                    }}
                                    disabled={isSelf}
                                    className="flex items-center gap-2 flex-1 min-w-0 text-left disabled:cursor-default"
                                  >
                                    <Avatar className="h-8 w-8 shrink-0">
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {fullName(gm.manager)
                                          ?.slice(0, 2)
                                          .toUpperCase() ?? "??"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 text-sm truncate flex items-center gap-1.5">
                                      {gm.manager.role === "TEAMLEAD" && (
                                        <Shield
                                          className="h-3.5 w-3.5 text-amber-500 shrink-0"
                                          aria-label={tRoles("TEAMLEAD")}
                                        />
                                      )}
                                      <span className="truncate">
                                        {fullName(gm.manager) || gm.manager.email}
                                      </span>
                                      {isSelf && (
                                        <span className="text-xs text-muted-foreground shrink-0">
                                          {t("you")}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                  {selectedGroup.createdBy === user?.id &&
                                    !isSelf && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() =>
                                              removeMember.mutate({
                                                groupId: selectedGroup.id,
                                                managerId: gm.manager.id,
                                              })
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {tActions("remove")}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {selectedGroup.createdBy === user?.id && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                              {t("addMember")}
                            </p>
                            <div className="flex gap-2">
                              <select
                                value={newMemberId ?? ""}
                                onChange={(e) =>
                                  setNewMemberId(e.target.value || null)
                                }
                                className="flex-1 h-9 rounded-md border bg-background px-2 text-sm"
                              >
                                <option value="">{t("selectMember")}</option>
                                {(teamMembers ?? [])
                                  .filter(
                                    (m) =>
                                      !selectedGroup.managers.some(
                                        (gm) => gm.manager.id === m.id,
                                      ),
                                  )
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {fullName(m) || m.email}
                                    </option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                disabled={!newMemberId || addMember.isPending}
                                onClick={async () => {
                                  if (!newMemberId) return;
                                  await addMember.mutateAsync({
                                    groupId: selectedGroup.id,
                                    managerId: newMemberId,
                                  });
                                  setNewMemberId(null);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                  <GroupActionsMenu
                    group={selectedGroup}
                    canEdit={
                      !!user &&
                      (user.role === "ADMIN" ||
                        user.role === "TEAMLEAD" ||
                        selectedGroup.createdBy === user.id ||
                        selectedGroup.managers.some(
                          (m) => m.manager.id === user.id,
                        ))
                    }
                  />
                </>
              ) : selectedUser ? (
                <>
                  <span className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={selectedUser?.avatar ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{initials(selectedUser)}</AvatarFallback>
                    </Avatar>
                    <StatusDot
                      user={selectedUser}
                      size="sm"
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {fullName(selectedUser) || t("noName")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tRoles(selectedUser.role)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("attachments")}
                    onClick={() => setAttachmentsOpen(true)}
                  >
                    <Folder className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-chat-bg">
              {loadingMessages && !selectedGroupId ? (
                <MessageListSkeleton />
              ) : (
                <div className="flex flex-col gap-3">
                  <LoadOlderMessages
                    hasOlder={
                      selectedGroupId ? hasOlderGroup : hasOlderDm
                    }
                    isFetchingOlder={
                      selectedGroupId
                        ? isFetchingOlderGroup
                        : isFetchingOlderDm
                    }
                    onLoadOlder={() => {
                      if (selectedGroupId) void fetchOlderGroup();
                      else if (selectedUserId) void fetchOlderDm();
                    }}
                  />
                  {timeline.map((item) => {
                    if (item.kind === "msg") {
                      const msg = item.data;
                      // Backend-authored notice ("added X" / "removed X").
                      // Render as a small centred muted line, no bubble.
                      if (
                        selectedGroupId &&
                        (msg as GroupMessage).isSystem
                      ) {
                        return (
                          <div
                            key={`msg-${msg.id}`}
                            className="flex justify-center py-1"
                          >
                            <span className="text-xs text-muted-foreground italic">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }
                      const isOwn = msg.senderId === user?.id;
                      const senderName =
                        !isOwn && selectedGroupId
                          ? fullName((msg as GroupMessage).sender)
                          : null;
                      const isRead = !selectedGroupId
                        ? (msg as DirectMessage).isRead
                        : null;
                      // Group chats show each sender's avatar beside their
                      // bubble (Telegram-style group identity). DM chats
                      // don't — the header already says who you're talking
                      // to, repeating the avatar on every bubble is noise.
                      const showSenderAvatar = !isOwn && !!selectedGroupId;
                      const groupSender = selectedGroupId
                        ? (msg as GroupMessage).sender
                        : null;
                      return (
                        <div
                          key={`msg-${msg.id}`}
                          className={cn(
                            "group flex items-center gap-2",
                            isOwn ? "justify-end" : "justify-start",
                          )}
                        >
                          {/* Sidekick (own→LEFT). Trigger (mine / idle)
                              + other participant's reactions as plain
                              glyphs next to it. */}
                          {isOwn && !msg.deletedAt && (
                            <MessageReactionsCluster
                              messageId={msg.id}
                              type={selectedGroupId ? "GROUP" : "DM"}
                              reactions={msg.reactions ?? []}
                              currentUserId={user?.id}
                            />
                          )}
                          {showSenderAvatar && groupSender && (
                            <button
                              type="button"
                              onClick={() => handleSelectUser(msg.senderId)}
                              className="relative shrink-0"
                              title={tChat("messageUser", {
                                name: senderName ?? tChat("userFallback"),
                              })}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={groupSender.avatar ?? undefined}
                                  alt={fullName(groupSender)}
                                />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {initials(groupSender)}
                                </AvatarFallback>
                              </Avatar>
                              <StatusDot
                                user={groupSender}
                                size="xs"
                                className="absolute -bottom-0.5 -right-0.5"
                              />
                            </button>
                          )}
                          <div
                            className={cn(
                              "flex flex-col gap-0.5 max-w-[70%] min-w-0",
                              isOwn && "items-end",
                            )}
                          >
                            {senderName && (
                              <button
                                type="button"
                                onClick={() => handleSelectUser(msg.senderId)}
                                className="text-xs font-semibold opacity-80 hover:underline cursor-pointer text-left px-1"
                              >
                                {senderName}
                              </button>
                            )}
                            <MessageActionsContext
                              actions={{
                                onCopy: () =>
                                  navigator.clipboard.writeText(msg.content),
                                onReply: () =>
                                  setReplyingTo({
                                    id: msg.id,
                                    targetType: "msg",
                                    senderName:
                                      fullName(msg.sender) || null,
                                    content: msg.content,
                                    isDeleted: !!msg.deletedAt,
                                  }),
                                onEdit:
                                  isOwn &&
                                  !msg.deletedAt &&
                                  Date.now() -
                                    new Date(msg.createdAt).getTime() <
                                    15 * 60 * 1000
                                    ? () => {
                                        setEditing({
                                          id: msg.id,
                                          original: msg.content,
                                        });
                                        setNewMessage(msg.content);
                                        setReplyingTo(null);
                                        setPendingFiles([]);
                                      }
                                    : undefined,
                                onDelete: isOwn
                                  ? () => {
                                      if (selectedGroupId)
                                        deleteGroupMsg.mutate(msg.id);
                                      else deleteDm.mutate(msg.id);
                                    }
                                  : undefined,
                              }}
                              isOwn={isOwn}
                              isDeleted={!!msg.deletedAt}
                            >
                              <div
                                id={`chat-msg-${msg.id}`}
                                className={cn(
                                  "rounded-lg max-w-full transition-shadow",
                                  msg.deletedAt
                                    ? "bg-muted/40 text-muted-foreground italic px-3 py-1"
                                    : cn(
                                        "px-4 py-2",
                                        isOwn
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted",
                                      ),
                                )}
                              >
                                {msg.replyTo && (
                                  <MessageQuote
                                    senderName={fullName(msg.replyTo.sender)}
                                    content={msg.replyTo.content}
                                    isDeleted={!!msg.replyTo.deletedAt}
                                    onClick={() =>
                                      scrollToMessage(msg.replyTo!.id)
                                    }
                                    variant={isOwn ? "onPrimary" : "default"}
                                  />
                                )}
                                {msg.replyToDocument && (
                                  <MessageQuote
                                    kind="doc"
                                    senderName={
                                      fullName(msg.replyToDocument.uploader)
                                    }
                                    fileName={msg.replyToDocument.fileName}
                                    content=""
                                    isDeleted={!!msg.replyToDocument.deletedAt}
                                    onClick={() =>
                                      scrollToDoc(msg.replyToDocument!.id)
                                    }
                                    variant={isOwn ? "onPrimary" : "default"}
                                  />
                                )}
                                <p
                                  className={cn(
                                    msg.deletedAt
                                      ? "text-xs whitespace-nowrap"
                                      : "text-sm whitespace-pre-wrap break-all",
                                  )}
                                >
                                  {msg.deletedAt
                                    ? tChat("messageDeleted")
                                    : msg.content}
                                </p>
                              </div>
                            </MessageActionsContext>
                            <div
                              className={cn(
                                "flex items-center gap-2 px-1 min-h-[20px]",
                                isOwn ? "flex-row-reverse" : "flex-row",
                              )}
                            >
                              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0">
                                {msg.editedAt && !msg.deletedAt && (
                                  <span
                                    title={tChat("editedAtTitle", {
                                      time: new Date(
                                        msg.editedAt,
                                      ).toLocaleTimeString(locale, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }),
                                    })}
                                    className="italic"
                                  >
                                    {tChat("editedMark")}
                                  </span>
                                )}
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  locale,
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                                {isOwn && isRead != null && !msg.deletedAt && (
                                  <span
                                    className={cn(isRead && "text-primary")}
                                  >
                                    {isRead ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </span>
                              {/* Bar moved to bubble's sidekick (above) so
                                  reactions stay inline with the bubble. */}
                            </div>
                          </div>
                          {/* Sidekick (other→RIGHT). */}
                          {!isOwn && !msg.deletedAt && (
                            <MessageReactionsCluster
                              messageId={msg.id}
                              type={selectedGroupId ? "GROUP" : "DM"}
                              reactions={msg.reactions ?? []}
                              currentUserId={user?.id}
                            />
                          )}
                        </div>
                      );
                    }
                    // kind === "doc"
                    const doc = item.data;
                    const isOwn = doc.uploadedBy === user?.id;
                    const isDeleted = !!doc.deletedAt;
                    const isPhoto = doc.fileType === "PHOTO";
                    const senderName =
                      !isOwn && selectedGroupId
                        ? fullName(doc.uploader)
                        : null;
                    const avatarName = !isOwn
                      ? selectedGroupId
                        ? fullName(doc.uploader)
                        : fullName(selectedUser)
                      : null;
                    const senderInitials = (avatarName ?? "??")
                      .slice(0, 2)
                      .toUpperCase();
                    const ext =
                      doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
                    const docReplyToMsg =
                      "replyTo" in doc ? doc.replyTo : null;
                    const docReplyToDoc =
                      "replyToDocument" in doc
                        ? doc.replyToDocument
                        : null;
                    return (
                      <div
                        key={`doc-${doc.id}`}
                        className={cn(
                          "group flex items-center gap-2",
                          isOwn ? "justify-end" : "justify-start",
                        )}
                      >
                        {/* Sidekick (own→LEFT) — cluster style. */}
                        {isOwn && !isDeleted && (
                          <MessageReactionsCluster
                            messageId={doc.id}
                            type={selectedGroupId ? "GROUP_DOC" : "DM_DOC"}
                            reactions={
                              (doc as { reactions?: MessageReactionRow[] })
                                .reactions ?? []
                            }
                            currentUserId={user?.id}
                          />
                        )}
                        {!isOwn &&
                          (selectedGroupId ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectUser(doc.uploadedBy)
                              }
                              className="shrink-0"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {senderInitials}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          ) : (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {senderInitials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        <div
                          className={cn(
                            "flex flex-col gap-0.5 max-w-[70%] min-w-0",
                            isOwn && "items-end",
                          )}
                        >
                          {senderName && (
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectUser(doc.uploadedBy)
                              }
                              className="text-xs font-semibold opacity-80 hover:underline cursor-pointer text-left px-1"
                            >
                              {senderName}
                            </button>
                          )}
                          <MessageActionsContext
                            actions={{
                              onCopy: () =>
                                navigator.clipboard.writeText(doc.fileName),
                              onReply: () =>
                                setReplyingTo({
                                  id: doc.id,
                                  targetType: "doc",
                                  senderName: fullName(doc.uploader) || null,
                                  content: doc.fileName,
                                  isDeleted,
                                }),
                              onDelete: isOwn
                                ? () => {
                                    if (selectedGroupId)
                                      deleteGroupDoc.mutate(doc.id);
                                    else deleteDmDoc.mutate(doc.id);
                                  }
                                : undefined,
                            }}
                            isOwn={isOwn}
                            isDeleted={isDeleted}
                          >
                            <div
                              id={`chat-doc-${doc.id}`}
                              className="max-w-full transition-shadow"
                            >
                              {(docReplyToMsg || docReplyToDoc) && (
                                <div className={cn(
                                  "rounded-md mb-1",
                                  isOwn ? "" : "",
                                )}>
                                  {docReplyToMsg && (
                                    <MessageQuote
                                      senderName={fullName(docReplyToMsg.sender)}
                                      content={docReplyToMsg.content}
                                      isDeleted={!!docReplyToMsg.deletedAt}
                                      onClick={() =>
                                        scrollToMessage(docReplyToMsg.id)
                                      }
                                      variant="default"
                                    />
                                  )}
                                  {docReplyToDoc && (
                                    <MessageQuote
                                      kind="doc"
                                      senderName={fullName(docReplyToDoc.uploader)}
                                      fileName={docReplyToDoc.fileName}
                                      content=""
                                      isDeleted={!!docReplyToDoc.deletedAt}
                                      onClick={() =>
                                        scrollToDoc(docReplyToDoc.id)
                                      }
                                      variant="default"
                                    />
                                  )}
                                </div>
                              )}
                              {isDeleted ? (
                                <div className="rounded-lg bg-muted/40 text-muted-foreground italic px-3 py-1 text-xs whitespace-nowrap">
                                  {tChat("fileDeleted")}
                                </div>
                              ) : isPhoto ? (
                                <div
                                  className={cn(
                                    "rounded-2xl overflow-hidden border max-w-[220px]",
                                    doc.caption &&
                                      (isOwn
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"),
                                  )}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={doc.signedUrl}
                                    alt={doc.fileName}
                                    onClick={() =>
                                      window.open(doc.signedUrl, "_blank")
                                    }
                                    className="block max-w-[220px] max-h-[200px] w-full object-cover cursor-pointer"
                                  />
                                  {doc.caption && (
                                    <p className="text-sm whitespace-pre-wrap break-words px-3 py-2">
                                      {doc.caption}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "rounded-2xl border overflow-hidden",
                                    isOwn
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted",
                                  )}
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      window.open(doc.signedUrl, "_blank")
                                    }
                                    onKeyDown={(e) =>
                                      e.key === "Enter" &&
                                      window.open(doc.signedUrl, "_blank")
                                    }
                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
                                  >
                                    <FileText className="h-5 w-5 shrink-0" />
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-sm truncate max-w-[180px] leading-tight">
                                        {doc.fileName}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-[10px] leading-tight",
                                          isOwn
                                            ? "text-primary-foreground/70"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        {ext}
                                      </span>
                                    </div>
                                    <button
                                      title={tActions("download")}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(doc.signedUrl, "_blank");
                                      }}
                                      className="shrink-0 opacity-70 hover:opacity-100"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  {doc.caption && (
                                    <p className="text-sm whitespace-pre-wrap break-words px-3 pb-2">
                                      {doc.caption}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </MessageActionsContext>
                          <div
                            className={cn(
                              "flex items-center gap-2 px-1 min-h-[20px]",
                              isOwn ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0">
                              {new Date(doc.createdAt).toLocaleTimeString(
                                locale,
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                              {isOwn && !selectedGroupId && !isDeleted && (
                                <span
                                  className={cn(
                                    (doc as ConversationDocumentFull).isRead &&
                                      "text-primary",
                                  )}
                                >
                                  {(doc as ConversationDocumentFull).isRead
                                    ? "✓✓"
                                    : "✓"}
                                </span>
                              )}
                            </span>
                            {/* Bar moved to bubble's sidekick (above). */}
                          </div>
                        </div>
                        {/* Sidekick (other→RIGHT) — cluster style. */}
                        {!isOwn && !isDeleted && (
                          <MessageReactionsCluster
                            messageId={doc.id}
                            type={selectedGroupId ? "GROUP_DOC" : "DM_DOC"}
                            reactions={
                              (doc as { reactions?: MessageReactionRow[] })
                                .reactions ?? []
                            }
                            currentUserId={user?.id}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {!selectedGroupId && isTyping && (
              <div className="px-4 py-1 shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                <span>
                  {tChat("userTyping", {
                    name: fullName(selectedUser) || tChat("someone"),
                  })}
                </span>
                <span className="flex gap-0.5">
                  <span className="animate-bounce delay-0">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              </div>
            )}
            {selectedGroupId && isGroupTyping && (
              <div className="px-4 py-1 shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                <span>
                  {tChat("userTyping", {
                    name: groupTypingName ?? tChat("someone"),
                  })}
                </span>
                <span className="flex gap-0.5">
                  <span className="animate-bounce delay-0">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              </div>
            )}

            {editing && (
              <div className="px-4 pt-2 shrink-0 border-t flex items-start gap-2">
                <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                  <p className="text-[11px] font-semibold text-primary leading-tight flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    {tChat("editingMessage")}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">
                    {editing.original}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setNewMessage("");
                  }}
                  title={tChat("cancelEditing")}
                  className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {replyingTo && !editing && (
              <div className="px-4 pt-2 shrink-0 border-t flex items-start gap-2">
                <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                  <p className="text-[11px] font-semibold text-primary leading-tight">
                    {tChat("replyTo", {
                      name: replyingTo.senderName ?? tChat("unknown"),
                    })}
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
                          ? tChat("fileDeleted")
                          : tChat("messageDeleted")
                        : replyingTo.content}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  title={tChat("cancelReply")}
                  className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="px-4 pt-2 shrink-0 flex flex-wrap gap-1.5">
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
                      title={tChat("removeFile")}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSend}
              className={cn(
                "p-4 shrink-0 flex gap-2",
                !replyingTo &&
                  !editing &&
                  pendingFiles.length === 0 &&
                  "border-t",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => attachInputRef.current?.click()}
                disabled={attachUploading}
                title={tChat("attachFile")}
              >
                {attachUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={attachInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleAttach}
              />
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 border-none"
                  side="top"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onInteractOutside={(e) => e.preventDefault()}
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={pickerTheme}
                    skinTonesDisabled
                    searchDisabled={false}
                  />
                </PopoverContent>
              </Popover>
              <Input
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (editing && e.key === "Escape") {
                    e.preventDefault();
                    setEditing(null);
                    setNewMessage("");
                  }
                }}
                placeholder={
                  editing
                    ? tChat("editPlaceholder")
                    : tChat("messagePlaceholder")
                }
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                title={editing ? tActions("save") : tChat("send")}
                disabled={
                  editing
                    ? !newMessage.trim()
                    : !newMessage.trim() && pendingFiles.length === 0
                }
              >
                {editing ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {t("emptyState")}
          </div>
        )}
      </div>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createGroup")}</DialogTitle>
            <DialogDescription>{t("createGroupDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">{t("groupNameLabel")}</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t("groupNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("membersSelected", { count: selectedMemberIds.size })}
              </Label>
              <ScrollArea className="h-60 rounded border">
                <div className="p-2">
                  {(teamMembers ?? [])
                    .filter((m) => m.id !== user?.id)
                    .map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMemberIds.has(m.id)}
                          onCheckedChange={(checked) => {
                            setSelectedMemberIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(m.id);
                              else next.delete(m.id);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm">{fullName(m) || m.email}</span>
                      </label>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGroupDialogOpen(false)}
            >
              {tActions("cancel")}
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={
                !newGroupName.trim() ||
                selectedMemberIds.size === 0 ||
                createGroup.isPending ||
                addMember.isPending
              }
            >
              {createGroup.isPending || addMember.isPending
                ? t("creating")
                : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MessageAttachmentsSheet
        open={attachmentsOpen}
        onOpenChange={setAttachmentsOpen}
        source={selectedGroupId ? "group" : "dm"}
        targetId={selectedGroupId ?? selectedUserId ?? ""}
        title={
          selectedGroupId
            ? (selectedGroup?.name ?? t("groupTitleFallback"))
            : (fullName(selectedUser) || t("conversationFallback"))
        }
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageContent />
    </Suspense>
  );
}
