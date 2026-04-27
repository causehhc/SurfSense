import {
	AuiIf,
	ComposerPrimitive,
	MessagePrimitive,
	ThreadPrimitive,
	useAui,
	useAuiState,
	useThreadViewportStore,
} from "@assistant-ui/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	AlertCircle,
	ArrowDownIcon,
	ArrowUpIcon,
	ChevronDown,
	ChevronUp,
	Clipboard,
	Dot,
	Globe,
	Plus,
	Settings2,
	SquareIcon,
	Unplug,
	Upload,
	Wrench,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	agentToolsAtom,
	disabledToolsAtom,
	hydrateDisabledToolsAtom,
	toggleToolAtom,
} from "@/atoms/agent-tools/agent-tools.atoms";
import { chatSessionStateAtom } from "@/atoms/chat/chat-session-state.atom";
import {
	mentionedDocumentsAtom,
	sidebarSelectedDocumentsAtom,
} from "@/atoms/chat/mentioned-documents.atom";
import { connectorDialogOpenAtom } from "@/atoms/connector-dialog/connector-dialog.atoms";
import { connectorsAtom } from "@/atoms/connectors/connector-query.atoms";
import { documentsSidebarOpenAtom } from "@/atoms/documents/ui.atoms";
import { membersAtom } from "@/atoms/members/members-query.atoms";
import {
	globalNewLLMConfigsAtom,
	llmPreferencesAtom,
	newLLMConfigsAtom,
} from "@/atoms/new-llm-config/new-llm-config-query.atoms";
import { currentUserAtom } from "@/atoms/user/user-query.atoms";
import { AssistantMessage } from "@/components/assistant-ui/assistant-message";
import { ChatSessionStatus } from "@/components/assistant-ui/chat-session-status";
import { ConnectorIndicator } from "@/components/assistant-ui/connector-popup";
import { useDocumentUploadDialog } from "@/components/assistant-ui/document-upload-popup";
import {
	InlineMentionEditor,
	type InlineMentionEditorRef,
} from "@/components/assistant-ui/inline-mention-editor";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { UserMessage } from "@/components/assistant-ui/user-message";
import {
	DocumentMentionPicker,
	type DocumentMentionPickerRef,
} from "@/components/new-chat/document-mention-picker";
import { PromptPicker, type PromptPickerRef } from "@/components/new-chat/prompt-picker";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHandle, DrawerTitle } from "@/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getConnectorIcon } from "@/contracts/enums/connectorIcons";
import {
	CONNECTOR_ICON_TO_TYPES,
	CONNECTOR_TOOL_ICON_PATHS,
	getToolIcon,
} from "@/contracts/enums/toolIcons";
import type { Document } from "@/contracts/types/document.types";
import { useBatchCommentsPreload } from "@/hooks/use-comments";
import { useCommentsSync } from "@/hooks/use-comments-sync";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useElectronAPI } from "@/hooks/use-platform";
import { SLIDEOUT_PANEL_OPENED_EVENT } from "@/lib/layout-events";
import { cn } from "@/lib/utils";

const COMPOSER_PLACEHOLDER = "Ask anything, type / for prompts, type @ to mention docs";

export const Thread: FC = () => {
	return <ThreadContent />;
};

const ThreadContent: FC = () => {
	return (
		<ThreadPrimitive.Root
			className="aui-root aui-thread-root @container flex h-full min-h-0 flex-col bg-main-panel"
			style={{
				["--thread-max-width" as string]: "44rem",
			}}
		>
			<ThreadPrimitive.Viewport
				className="aui-thread-viewport relative flex flex-1 min-h-0 flex-col overflow-y-auto px-3 pt-3"
				style={{ scrollbarGutter: "stable" }}
			>
				<ThreadPrimitive.Messages
					components={{
						UserMessage,
						EditComposer,
						AssistantMessage,
					}}
				/>

				<div className="grow" />

				<ThreadPrimitive.ViewportFooter
					className="aui-thread-viewport-footer sticky bottom-0 z-10 mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-3 overflow-visible rounded-t-3xl bg-main-panel pb-3 md:pb-4"
					style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
				>
					<ThreadScrollToBottom />
					<Composer />
				</ThreadPrimitive.ViewportFooter>
			</ThreadPrimitive.Viewport>
		</ThreadPrimitive.Root>
	);
};

const ThreadScrollToBottom: FC = () => {
	return (
		<ThreadPrimitive.ScrollToBottom asChild>
			<TooltipIconButton
				tooltip="Scroll to bottom"
				variant="outline"
				className="aui-thread-scroll-to-bottom -top-12 absolute z-10 self-center rounded-full p-4 disabled:invisible dark:bg-main-panel dark:hover:bg-accent"
			>
				<ArrowDownIcon />
			</TooltipIconButton>
		</ThreadPrimitive.ScrollToBottom>
	);
};

const getTimeBasedGreeting = (user?: { display_name?: string | null; email?: string }): string => {
	const hour = new Date().getHours();

	// Extract first name: prefer display_name, fall back to email extraction
	let firstName: string | null = null;

	if (user?.display_name?.trim()) {
		// Use display_name if available and not empty
		// Extract first name from display_name (take first word)
		const nameParts = user.display_name.trim().split(/\s+/);
		firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
	} else if (user?.email) {
		// Fall back to email extraction if display_name is not available
		firstName =
			user.email.split("@")[0].split(".")[0].charAt(0).toUpperCase() +
			user.email.split("@")[0].split(".")[0].slice(1);
	}

	// Array of greeting variations for each time period
	const morningGreetings = ["Good morning", "Fresh start today", "Morning", "Hey there"];

	const afternoonGreetings = ["Good afternoon", "Afternoon", "Hey there", "Hi there"];

	const eveningGreetings = ["Good evening", "Evening", "Hey there", "Hi there"];

	const nightGreetings = ["Good night", "Evening", "Hey there", "Winding down"];

	const lateNightGreetings = ["Still up", "Night owl mode", "Up past bedtime", "Hi there"];

	// Select a random greeting based on time
	let greeting: string;
	if (hour < 5) {
		// Late night: midnight to 5 AM
		greeting = lateNightGreetings[Math.floor(Math.random() * lateNightGreetings.length)];
	} else if (hour < 12) {
		greeting = morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
	} else if (hour < 18) {
		greeting = afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
	} else if (hour < 22) {
		greeting = eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
	} else {
		// Night: 10 PM to midnight
		greeting = nightGreetings[Math.floor(Math.random() * nightGreetings.length)];
	}

	// Add personalization with first name if available
	if (firstName) {
		return `${greeting}, ${firstName}!`;
	}

	return `${greeting}!`;
};

const BANNER_CONNECTORS = [
	{ type: "GOOGLE_DRIVE_CONNECTOR", label: "Google Drive" },
	{ type: "GOOGLE_GMAIL_CONNECTOR", label: "Gmail" },
	{ type: "NOTION_CONNECTOR", label: "Notion" },
	{ type: "YOUTUBE_CONNECTOR", label: "YouTube" },
	{ type: "SLACK_CONNECTOR", label: "Slack" },
] as const;

const BANNER_DISMISSED_KEY = "surfsense-connect-tools-banner-dismissed";

const ConnectToolsBanner: FC<{ isThreadEmpty: boolean }> = ({ isThreadEmpty }) => {
	const { data: connectors } = useAtomValue(connectorsAtom);
	const setConnectorDialogOpen = useSetAtom(connectorDialogOpenAtom);
	const [dismissed, setDismissed] = useState(() => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
	});

	const hasConnectors = (connectors?.length ?? 0) > 0;

	if (dismissed || hasConnectors || !isThreadEmpty) return null;

	const handleDismiss = (e: React.MouseEvent) => {
		e.stopPropagation();
		setDismissed(true);
		localStorage.setItem(BANNER_DISMISSED_KEY, "true");
	};

	return (
		<div className="border-t border-border/50">
			<div className="flex w-full items-center gap-2.5 px-4 py-2.5">
				<button
					type="button"
					className="flex flex-1 items-center gap-2.5 text-left cursor-pointer select-none"
					onClick={() => setConnectorDialogOpen(true)}
				>
					<Unplug className="size-4 text-muted-foreground shrink-0" />
					<span className="text-[13px] text-muted-foreground/80 flex-1">Connect your tools</span>
					<AvatarGroup className="shrink-0">
						{BANNER_CONNECTORS.map(({ type }, i) => (
							<Avatar
								key={type}
								className="size-6"
								style={{ zIndex: BANNER_CONNECTORS.length - i }}
							>
								<AvatarFallback className="bg-muted text-[10px]">
									{getConnectorIcon(type, "size-3.5")}
								</AvatarFallback>
							</Avatar>
						))}
					</AvatarGroup>
				</button>
				<button
					type="button"
					onClick={handleDismiss}
					className="shrink-0 ml-0.5 p-1.5 -mr-1 text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer"
					aria-label="Dismiss"
				>
					<X className="size-3.5 text-muted-foreground" />
				</button>
			</div>
		</div>
	);
};

const ClipboardChip: FC<{ text: string; onDismiss: () => void }> = ({ text, onDismiss }) => {
	const [expanded, setExpanded] = useState(false);
	const isLong = text.length > 120;
	const preview = isLong ? `${text.slice(0, 120)}…` : text;

	return (
		<div className="mx-3 mt-2 rounded-lg border border-border/40 bg-background/60">
			<div className="flex items-center gap-2 px-3 py-2">
				<Clipboard className="size-4 shrink-0 text-muted-foreground" />
				<span className="text-xs font-medium text-muted-foreground">From clipboard</span>
				<div className="flex-1" />
				{isLong && (
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
					>
						{expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
					</button>
				)}
				<button
					type="button"
					onClick={onDismiss}
					className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
				>
					<X className="size-3.5" />
				</button>
			</div>
			<div className="px-3 pb-2">
				<p className="text-xs text-foreground/80 whitespace-pre-wrap wrap-break-word leading-relaxed">
					{expanded ? text : preview}
				</p>
			</div>
		</div>
	);
};

const Composer: FC = () => {
	// Document mention state (atoms persist across component remounts)
	const [mentionedDocuments, setMentionedDocuments] = useAtom(mentionedDocumentsAtom);
	const setSidebarDocs = useSetAtom(sidebarSelectedDocumentsAtom);
	const [showDocumentPopover, setShowDocumentPopover] = useState(false);
	const [showPromptPicker, setShowPromptPicker] = useState(false);
	const [mentionQuery, setMentionQuery] = useState("");
	const [actionQuery, setActionQuery] = useState("");
	const editorRef = useRef<InlineMentionEditorRef>(null);
	const documentPickerRef = useRef<DocumentMentionPickerRef>(null);
	const promptPickerRef = useRef<PromptPickerRef>(null);
	const viewportRef = useRef<Element | null>(null);
	const { search_space_id, chat_id } = useParams();
	const aui = useAui();
	const threadViewportStore = useThreadViewportStore();
	const hasAutoFocusedRef = useRef(false);
	const submitCleanupRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		return () => {
			submitCleanupRef.current?.();
		};
	}, []);

	// Store viewport element reference on mount
	useEffect(() => {
		viewportRef.current = document.querySelector(".aui-thread-viewport");
	}, []);

	const isThreadEmpty = useAuiState(({ thread }) => thread.isEmpty);
	const isThreadRunning = useAuiState(({ thread }) => thread.isRunning);

	const currentPlaceholder = COMPOSER_PLACEHOLDER;

	// Live collaboration state
	const { data: currentUser } = useAtomValue(currentUserAtom);
	const { data: members } = useAtomValue(membersAtom);
	const threadId = useMemo(() => {
		if (Array.isArray(chat_id) && chat_id.length > 0) {
			return Number.parseInt(chat_id[0], 10) || null;
		}
		return typeof chat_id === "string" ? Number.parseInt(chat_id, 10) || null : null;
	}, [chat_id]);
	const sessionState = useAtomValue(chatSessionStateAtom);
	const isAiResponding = sessionState?.isAiResponding ?? false;
	const respondingToUserId = sessionState?.respondingToUserId ?? null;
	const isBlockedByOtherUser = isAiResponding && respondingToUserId !== currentUser?.id;

	// Sync comments for the entire thread via Zero (one subscription per thread)
	useCommentsSync(threadId);

	// Batch-prefetch comments for all assistant messages so individual useComments
	// hooks never fire their own network requests (eliminates N+1 API calls).
	// Return a primitive string from the selector so useSyncExternalStore can
	// compare snapshots by value and avoid infinite re-render loops.
	const assistantIdsKey = useAuiState(({ thread }) =>
		thread.messages
			.filter((m) => m.role === "assistant" && m.id?.startsWith("msg-"))
			.map((m) => m.id?.replace("msg-", ""))
			.join(",")
	);
	const assistantDbMessageIds = useMemo(
		() => (assistantIdsKey ? assistantIdsKey.split(",").map(Number) : []),
		[assistantIdsKey]
	);
	useBatchCommentsPreload(assistantDbMessageIds);

	// Auto-focus editor on new chat page after mount
	useEffect(() => {
		if (isThreadEmpty && !hasAutoFocusedRef.current && editorRef.current) {
			const timeoutId = setTimeout(() => {
				editorRef.current?.focus();
				hasAutoFocusedRef.current = true;
			}, 100);
			return () => clearTimeout(timeoutId);
		}
	}, [isThreadEmpty]);

	// Close document picker when a slide-out panel (inbox, shared/private chats) opens
	useEffect(() => {
		const handler = () => {
			setShowDocumentPopover(false);
			setMentionQuery("");
		};
		window.addEventListener(SLIDEOUT_PANEL_OPENED_EVENT, handler);
		return () => window.removeEventListener(SLIDEOUT_PANEL_OPENED_EVENT, handler);
	}, []);

	// Sync editor text with assistant-ui composer runtime
	const handleEditorChange = useCallback(
		(text: string) => {
			aui.composer().setText(text);
		},
		[aui]
	);

	// Open document picker when @ mention is triggered
	const handleMentionTrigger = useCallback((query: string) => {
		setShowDocumentPopover(true);
		setMentionQuery(query);
	}, []);

	// Close document picker and reset query
	const handleMentionClose = useCallback(() => {
		if (showDocumentPopover) {
			setShowDocumentPopover(false);
			setMentionQuery("");
		}
	}, [showDocumentPopover]);

	// Open action picker when / is triggered
	const handleActionTrigger = useCallback((query: string) => {
		setShowPromptPicker(true);
		setActionQuery(query);
	}, []);

	// Close action picker and reset query
	const handleActionClose = useCallback(() => {
		if (showPromptPicker) {
			setShowPromptPicker(false);
			setActionQuery("");
		}
	}, [showPromptPicker]);

	const handleActionSelect = useCallback(
		(action: { name: string; prompt: string; mode: "transform" | "explore" }) => {
			let userText = editorRef.current?.getText() ?? "";
			const trigger = `/${actionQuery}`;
			if (userText.endsWith(trigger)) {
				userText = userText.slice(0, -trigger.length).trimEnd();
			}
			const finalPrompt = action.prompt.includes("{selection}")
				? action.prompt.replace("{selection}", () => userText)
				: userText
					? `${action.prompt}\n\n${userText}`
					: action.prompt;
			editorRef.current?.setText(finalPrompt);
			aui.composer().setText(finalPrompt);
			setShowPromptPicker(false);
			setActionQuery("");
		},
		[actionQuery, aui]
	);

	// Keyboard navigation for document/action picker (arrow keys, Enter, Escape)
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (showPromptPicker) {
				if (e.key === "ArrowDown") {
					e.preventDefault();
					promptPickerRef.current?.moveDown();
					return;
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					promptPickerRef.current?.moveUp();
					return;
				}
				if (e.key === "Enter") {
					e.preventDefault();
					promptPickerRef.current?.selectHighlighted();
					return;
				}
				if (e.key === "Escape") {
					e.preventDefault();
					setShowPromptPicker(false);
					setActionQuery("");
					return;
				}
			}
			if (showDocumentPopover) {
				if (e.key === "ArrowDown") {
					e.preventDefault();
					documentPickerRef.current?.moveDown();
					return;
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					documentPickerRef.current?.moveUp();
					return;
				}
				if (e.key === "Enter") {
					e.preventDefault();
					documentPickerRef.current?.selectHighlighted();
					return;
				}
				if (e.key === "Escape") {
					e.preventDefault();
					setShowDocumentPopover(false);
					setMentionQuery("");
					return;
				}
			}
		},
		[showDocumentPopover, showPromptPicker]
	);

	// Submit message (blocked during streaming, document picker open, or AI responding to another user)
	const handleSubmit = useCallback(() => {
		if (isThreadRunning || isBlockedByOtherUser) return;
		if (showDocumentPopover || showPromptPicker) return;

		const viewportEl = viewportRef.current;
		const heightBefore = viewportEl?.scrollHeight ?? 0;

		aui.composer().send();
		editorRef.current?.clear();
		setMentionedDocuments([]);
		setSidebarDocs([]);

		// After send, layout can shift (composer height, message mount). Poll via
		// rAF for ~500ms, re-scrolling whenever scrollHeight changes.
		const scrollToBottom = () =>
			threadViewportStore.getState().scrollToBottom({ behavior: "instant" });

		let lastHeight = heightBefore;
		let frames = 0;
		let cancelled = false;
		const POLL_FRAMES = 30;

		const pollAndScroll = () => {
			if (cancelled) return;
			const el = viewportRef.current;
			if (el) {
				const h = el.scrollHeight;
				if (h !== lastHeight) {
					lastHeight = h;
					scrollToBottom();
				}
			}
			if (++frames < POLL_FRAMES) {
				requestAnimationFrame(pollAndScroll);
			}
		};
		requestAnimationFrame(pollAndScroll);

		const t1 = setTimeout(scrollToBottom, 100);
		const t2 = setTimeout(scrollToBottom, 300);

		submitCleanupRef.current = () => {
			cancelled = true;
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, [
		showDocumentPopover,
		showPromptPicker,
		isThreadRunning,
		isBlockedByOtherUser,
		aui,
		setMentionedDocuments,
		setSidebarDocs,
		threadViewportStore,
	]);

	const handleDocumentRemove = useCallback(
		(docId: number, docType?: string) => {
			setMentionedDocuments((prev) =>
				prev.filter((doc) => !(doc.id === docId && doc.document_type === docType))
			);
		},
		[setMentionedDocuments]
	);

	const handleDocumentsMention = useCallback(
		(documents: Pick<Document, "id" | "title" | "document_type">[]) => {
			const existingKeys = new Set(mentionedDocuments.map((d) => `${d.document_type}:${d.id}`));
			const newDocs = documents.filter(
				(doc) => !existingKeys.has(`${doc.document_type}:${doc.id}`)
			);

			for (const doc of newDocs) {
				editorRef.current?.insertDocumentChip(doc);
			}

			setMentionedDocuments((prev) => {
				const existingKeySet = new Set(prev.map((d) => `${d.document_type}:${d.id}`));
				const uniqueNewDocs = documents.filter(
					(doc) => !existingKeySet.has(`${doc.document_type}:${doc.id}`)
				);
				return [...prev, ...uniqueNewDocs];
			});

			setMentionQuery("");
		},
		[mentionedDocuments, setMentionedDocuments]
	);

	return (
		<ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col gap-2">
			<ChatSessionStatus
				isAiResponding={isAiResponding}
				respondingToUserId={respondingToUserId}
				currentUserId={currentUser?.id ?? null}
				members={members ?? []}
			/>
			{showDocumentPopover && (
				<div className="absolute bottom-full left-0 z-[9999] mb-2">
					<DocumentMentionPicker
						ref={documentPickerRef}
						searchSpaceId={Number(search_space_id)}
						onSelectionChange={handleDocumentsMention}
						onDone={() => {
							setShowDocumentPopover(false);
							setMentionQuery("");
						}}
						initialSelectedDocuments={mentionedDocuments}
						externalSearch={mentionQuery}
					/>
				</div>
			)}
			{showPromptPicker && (
				<div
					className={cn(
						"absolute left-0 z-[9999]",
						"bottom-full mb-2"
					)}
				>
					<PromptPicker
						ref={promptPickerRef}
						onSelect={handleActionSelect}
						onDone={() => {
							setShowPromptPicker(false);
							setActionQuery("");
						}}
						externalSearch={actionQuery}
					/>
				</div>
			)}
			<div className="aui-composer-attachment-dropzone flex w-full flex-col overflow-hidden rounded-2xl border-input bg-muted outline-none transition-shadow">
				<div className="aui-composer-input-wrapper px-4 pt-3 pb-3">
					<InlineMentionEditor
						ref={editorRef}
						placeholder={currentPlaceholder}
						onMentionTrigger={handleMentionTrigger}
						onMentionClose={handleMentionClose}
						onActionTrigger={handleActionTrigger}
						onActionClose={handleActionClose}
						onChange={handleEditorChange}
						onDocumentRemove={handleDocumentRemove}
						onSubmit={handleSubmit}
						onKeyDown={handleKeyDown}
						className="min-h-[24px]"
					/>
				</div>
				<ComposerAction isBlockedByOtherUser={isBlockedByOtherUser} />
			</div>
		</ComposerPrimitive.Root>
	);
};

interface ComposerActionProps {
	isBlockedByOtherUser?: boolean;
}

const ComposerAction: FC<ComposerActionProps> = ({ isBlockedByOtherUser = false }) => {
	const mentionedDocuments = useAtomValue(mentionedDocumentsAtom);
	const isComposerTextEmpty = useAuiState(({ composer }) => {
		const text = composer.text?.trim() || "";
		return text.length === 0;
	});
	const isComposerEmpty = isComposerTextEmpty && mentionedDocuments.length === 0;

	const { data: userConfigs } = useAtomValue(newLLMConfigsAtom);
	const { data: globalConfigs } = useAtomValue(globalNewLLMConfigsAtom);
	const { data: preferences } = useAtomValue(llmPreferencesAtom);

	const hasModelConfigured = useMemo(() => {
		if (!preferences) return false;
		const agentLlmId = preferences.agent_llm_id;
		if (agentLlmId === null || agentLlmId === undefined) return false;

		if (agentLlmId <= 0) {
			return globalConfigs?.some((c) => c.id === agentLlmId) ?? false;
		}
		return userConfigs?.some((c) => c.id === agentLlmId) ?? false;
	}, [preferences, globalConfigs, userConfigs]);

	const isSendDisabled = isComposerEmpty || !hasModelConfigured || isBlockedByOtherUser;

	return (
		<div className="aui-composer-action-wrapper relative mx-3 mb-2 flex items-center justify-end">
			<div className="flex items-center gap-2">
				<AuiIf condition={({ thread }) => !thread.isRunning}>
					<ComposerPrimitive.Send asChild disabled={isSendDisabled}>
						<TooltipIconButton
							tooltip={
								isBlockedByOtherUser
									? "Wait for AI to finish responding"
									: !hasModelConfigured
										? "Please select a model from the header to start chatting"
										: isComposerEmpty
											? "Enter a message to send"
											: "Send message"
							}
							side="bottom"
							type="submit"
							variant="default"
							size="icon"
							className={cn(
								"aui-composer-send size-8 rounded-full",
								isSendDisabled && "cursor-not-allowed opacity-50"
							)}
							aria-label="Send message"
							disabled={isSendDisabled}
						>
							<ArrowUpIcon className="aui-composer-send-icon size-4" />
						</TooltipIconButton>
					</ComposerPrimitive.Send>
				</AuiIf>

				<AuiIf condition={({ thread }) => thread.isRunning}>
					<ComposerPrimitive.Cancel asChild>
						<Button
							type="button"
							variant="default"
							size="icon"
							className="aui-composer-cancel size-8 rounded-full"
							aria-label="Stop generating"
						>
							<SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
						</Button>
					</ComposerPrimitive.Cancel>
				</AuiIf>
			</div>
		</div>
	);
};

/** Convert snake_case tool names to human-readable labels */
function formatToolName(name: string): string {
	return name
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

interface ToolGroup {
	label: string;
	tools: string[];
	connectorIcon?: string;
	tooltip?: string;
}

const TOOL_GROUPS: ToolGroup[] = [
	{
		label: "Research",
		tools: ["search_surfsense_docs", "scrape_webpage"],
	},
	{
		label: "Generate",
		tools: ["generate_podcast", "generate_video_presentation", "generate_report", "generate_image"],
	},
	{
		label: "Memory",
		tools: ["update_memory"],
	},
	{
		label: "Gmail",
		tools: ["create_gmail_draft", "update_gmail_draft", "send_gmail_email", "trash_gmail_email"],
		connectorIcon: "gmail",
		tooltip: "Create drafts, update drafts, send emails, and trash emails in Gmail",
	},
	{
		label: "Google Calendar",
		tools: ["create_calendar_event", "update_calendar_event", "delete_calendar_event"],
		connectorIcon: "google_calendar",
		tooltip: "Create, update, and delete events in Google Calendar",
	},
	{
		label: "Google Drive",
		tools: ["create_google_drive_file", "delete_google_drive_file"],
		connectorIcon: "google_drive",
		tooltip: "Create and delete files in Google Drive",
	},
	{
		label: "OneDrive",
		tools: ["create_onedrive_file", "delete_onedrive_file"],
		connectorIcon: "onedrive",
		tooltip: "Create and delete files in OneDrive",
	},
	{
		label: "Dropbox",
		tools: ["create_dropbox_file", "delete_dropbox_file"],
		connectorIcon: "dropbox",
		tooltip: "Create and delete files in Dropbox",
	},
	{
		label: "Notion",
		tools: ["create_notion_page", "update_notion_page", "delete_notion_page"],
		connectorIcon: "notion",
		tooltip: "Create, update, and delete pages in Notion",
	},
	{
		label: "Linear",
		tools: ["create_linear_issue", "update_linear_issue", "delete_linear_issue"],
		connectorIcon: "linear",
		tooltip: "Create, update, and delete issues in Linear",
	},
	{
		label: "Jira",
		tools: ["create_jira_issue", "update_jira_issue", "delete_jira_issue"],
		connectorIcon: "jira",
		tooltip: "Create, update, and delete issues in Jira",
	},
	{
		label: "Confluence",
		tools: ["create_confluence_page", "update_confluence_page", "delete_confluence_page"],
		connectorIcon: "confluence",
		tooltip: "Create, update, and delete pages in Confluence",
	},
];

const EditComposer: FC = () => {
	return (
		<MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
			<ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
				<ComposerPrimitive.Input
					className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
					autoFocus
				/>
				<div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
					<ComposerPrimitive.Cancel asChild>
						<Button variant="ghost" size="sm">
							Cancel
						</Button>
					</ComposerPrimitive.Cancel>
					<ComposerPrimitive.Send asChild>
						<Button size="sm">Update</Button>
					</ComposerPrimitive.Send>
				</div>
			</ComposerPrimitive.Root>
		</MessagePrimitive.Root>
	);
};
