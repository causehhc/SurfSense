"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { type Tab } from "@/atoms/tabs/tabs.atom";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { InboxItem } from "@/hooks/use-inbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebarState } from "../../hooks";
import type { ChatItem, NavItem, PageUsage, SearchSpace, User } from "../../types/layout.types";
import { Header } from "../header";
import { MainContentPanel } from "../main-content-panel";
import { RightPanel } from "../right-panel/RightPanel";
import { SIDEBAR_MIN_WIDTH } from "../../hooks/useSidebarResize";
import {
	AllPrivateChatsSidebarContent,
	AllSharedChatsSidebarContent,
	AnnouncementsSidebarContent,
	DocumentsSidebar,
	InboxSidebarContent,
	MobileSidebar,
	MobileSidebarTrigger,
	Sidebar,
} from "../sidebar";
import { SidebarSlideOutPanel } from "../sidebar/SidebarSlideOutPanel";
// Per-tab data source
interface TabDataSource {
	items: InboxItem[];
	unreadCount: number;
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	loadMore: () => void;
	markAsRead: (id: number) => Promise<boolean>;
	markAllAsRead: () => Promise<boolean>;
}

export type ActiveSlideoutPanel = "inbox" | "shared" | "private" | "announcements" | null;

// Inbox-related props — per-tab data sources with independent loading/pagination
interface InboxProps {
	isOpen: boolean;
	totalUnreadCount: number;
	comments: TabDataSource;
	status: TabDataSource;
}

interface LayoutShellProps {
	searchSpaces: SearchSpace[];
	activeSearchSpaceId: number | null;
	onSearchSpaceSelect: (id: number) => void;
	onSearchSpaceDelete?: (searchSpace: SearchSpace) => void;
	onSearchSpaceSettings?: (searchSpace: SearchSpace) => void;
	onAddSearchSpace: () => void;
	searchSpace: SearchSpace | null;
	navItems: NavItem[];
	onNavItemClick?: (item: NavItem) => void;
	chats: ChatItem[];
	sharedChats?: ChatItem[];
	activeChatId?: number | null;
	onNewChat: () => void;
	onChatSelect: (chat: ChatItem) => void;
	onChatRename?: (chat: ChatItem) => void;
	onChatDelete?: (chat: ChatItem) => void;
	onChatArchive?: (chat: ChatItem) => void;
	onViewAllSharedChats?: () => void;
	onViewAllPrivateChats?: () => void;
	user: User;
	onSettings?: () => void;
	onManageMembers?: () => void;
	onUserSettings?: () => void;
	onLogout?: () => void;
	pageUsage?: PageUsage;
	theme?: string;
	setTheme?: (theme: "light" | "dark" | "system") => void;
	defaultCollapsed?: boolean;
	isChatPage?: boolean;
	children: React.ReactNode;
	className?: string;
	// Unified slide-out panel state
	activeSlideoutPanel?: ActiveSlideoutPanel;
	onSlideoutPanelChange?: (panel: ActiveSlideoutPanel) => void;
	// Inbox props
	inbox?: InboxProps;
	isLoadingChats?: boolean;
	// All chats panel props
	allSharedChatsPanel?: {
		searchSpaceId: string;
	};
	allPrivateChatsPanel?: {
		searchSpaceId: string;
	};
	documentsPanel?: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		isDocked?: boolean;
		onDockedChange?: (docked: boolean) => void;
	};
	onTabSwitch?: (tab: Tab) => void;
}

export function LayoutShell({
	searchSpaces,
	activeSearchSpaceId,
	onSearchSpaceSelect,
	onSearchSpaceDelete,
	onSearchSpaceSettings,
	onAddSearchSpace,
	searchSpace,
	navItems,
	onNavItemClick,
	chats,
	sharedChats,
	activeChatId,
	onNewChat,
	onChatSelect,
	onChatRename,
	onChatDelete,
	onChatArchive,
	onViewAllSharedChats,
	onViewAllPrivateChats,
	user,
	onSettings,
	onManageMembers,
	onUserSettings,
	onLogout,
	pageUsage,
	theme,
	setTheme,
	defaultCollapsed = false,
	isChatPage = false,
	children,
	className,
	activeSlideoutPanel = null,
	onSlideoutPanelChange,
	inbox,
	isLoadingChats = false,
	allSharedChatsPanel,
	allPrivateChatsPanel,
	documentsPanel,
	onTabSwitch,
}: LayoutShellProps) {
	const isMobile = useIsMobile();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const { isCollapsed, setIsCollapsed, toggleCollapsed } = useSidebarState(defaultCollapsed);

	// Memoize context value to prevent unnecessary re-renders
	const sidebarContextValue = useMemo(
		() => ({ isCollapsed, setIsCollapsed, toggleCollapsed, sidebarWidth: SIDEBAR_MIN_WIDTH }),
		[isCollapsed, setIsCollapsed, toggleCollapsed]
	);

	const closeSlideout = useCallback(
		(open: boolean) => {
			if (!open) onSlideoutPanelChange?.(null);
		},
		[onSlideoutPanelChange]
	);

	const anySlideOutOpen = activeSlideoutPanel !== null;

	const panelAriaLabel =
		activeSlideoutPanel === "inbox"
			? "Inbox"
			: activeSlideoutPanel === "shared"
				? "Shared Chats"
				: activeSlideoutPanel === "private"
					? "Private Chats"
					: activeSlideoutPanel === "announcements"
						? "Announcements"
						: "Panel";

	// Mobile layout

	// Desktop layout
	return (
		<SidebarProvider value={sidebarContextValue}>
			<TooltipProvider delayDuration={0}>
				<div
					className={cn(
						"flex h-full min-h-0 max-h-full w-full gap-2 overflow-hidden bg-muted",
						className
					)}
					data-layout="desktop-shell"
				>
					{/* Sidebar + slide-out panels share one container; overflow visible so panels can overlay main content */}
					<div
						className={cn(
							"relative hidden h-full min-h-0 max-h-full shrink-0 border bg-sidebar z-20 transition-[border-radius,border-color] duration-200 md:flex",
							anySlideOutOpen ? "rounded-l-xl border-r-0 delay-0" : "rounded-xl delay-150"
						)}
					>
						<Sidebar
							searchSpace={searchSpace}
							isCollapsed={isCollapsed}
							onToggleCollapse={toggleCollapsed}
							navItems={navItems}
							onNavItemClick={onNavItemClick}
							chats={chats}
							sharedChats={sharedChats}
							activeChatId={activeChatId}
							onNewChat={onNewChat}
							onChatSelect={onChatSelect}
							onChatRename={onChatRename}
							onChatDelete={onChatDelete}
							onChatArchive={onChatArchive}
							onViewAllSharedChats={onViewAllSharedChats}
							onViewAllPrivateChats={onViewAllPrivateChats}
							isSharedChatsPanelOpen={activeSlideoutPanel === "shared"}
							isPrivateChatsPanelOpen={activeSlideoutPanel === "private"}
							user={user}
							onSettings={onSettings}
							onManageMembers={onManageMembers}
							onUserSettings={onUserSettings}
							onLogout={onLogout}
							pageUsage={pageUsage}
							theme={theme}
							setTheme={setTheme}
							className={cn(
								"flex shrink-0 transition-[border-radius] duration-200",
								anySlideOutOpen ? "rounded-l-xl delay-0" : "rounded-xl delay-150"
							)}
							isLoadingChats={isLoadingChats}
						/>

						{/* Unified slide-out panel — shell stays open, content cross-fades */}
						<SidebarSlideOutPanel
							open={anySlideOutOpen}
							onOpenChange={closeSlideout}
							ariaLabel={panelAriaLabel}
						>
							<AnimatePresence mode="popLayout" initial={false}>
								{activeSlideoutPanel === "inbox" && inbox && (
									<motion.div
										key="inbox"
										className="h-full flex flex-col"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<InboxSidebarContent
											onOpenChange={(open) => closeSlideout(open)}
											comments={inbox.comments}
											status={inbox.status}
											totalUnreadCount={inbox.totalUnreadCount}
										/>
									</motion.div>
								)}
								{activeSlideoutPanel === "announcements" && (
									<motion.div
										key="announcements"
										className="h-full flex flex-col"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<AnnouncementsSidebarContent onOpenChange={(open) => closeSlideout(open)} />
									</motion.div>
								)}
								{activeSlideoutPanel === "shared" && allSharedChatsPanel && (
									<motion.div
										key="shared"
										className="h-full flex flex-col"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<AllSharedChatsSidebarContent
											onOpenChange={(open) => closeSlideout(open)}
											searchSpaceId={allSharedChatsPanel.searchSpaceId}
										/>
									</motion.div>
								)}
								{activeSlideoutPanel === "private" && allPrivateChatsPanel && (
									<motion.div
										key="private"
										className="h-full flex flex-col"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<AllPrivateChatsSidebarContent
											onOpenChange={(open) => closeSlideout(open)}
											searchSpaceId={allPrivateChatsPanel.searchSpaceId}
										/>
									</motion.div>
								)}
							</AnimatePresence>
						</SidebarSlideOutPanel>
					</div>

					{/* Main content panel */}
					<MainContentPanel isChatPage={isChatPage} onTabSwitch={onTabSwitch} onNewChat={onNewChat}>
						{children}
					</MainContentPanel>

					{/* Right panel — tabbed Sources/Report (desktop only) */}
					<div
						className={cn(
							"relative hidden h-full min-h-0 max-h-full shrink-0 border bg-sidebar z-20 transition-[border-radius,border-color] duration-200 md:flex",
							anySlideOutOpen ? "rounded-l-xl border-r-0 delay-0" : "rounded-xl delay-150"
						)}
					>
					{documentsPanel && (
						<RightPanel
							documentsPanel={{
								open: documentsPanel.open,
								onOpenChange: documentsPanel.onOpenChange,
							}}
						/>
					)}
					</div>
				</div>
			</TooltipProvider>
		</SidebarProvider>
	);
}
