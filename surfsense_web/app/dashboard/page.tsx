"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { AlertCircle, Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { deleteSearchSpaceMutationAtom } from "@/atoms/search-spaces/search-space-mutation.atoms";
import { searchSpacesAtom } from "@/atoms/search-spaces/search-space-query.atoms";
import {
	searchSpaceSettingsDialogAtom,
	teamDialogAtom,
} from "@/atoms/settings/settings-dialog.atoms";
import { CreateSearchSpaceDialog } from "@/components/layout";
import { IconRail } from "@/components/layout/ui/icon-rail/IconRail";
import { SearchSpaceSettingsDialog } from "@/components/settings/search-space-settings-dialog";
import { TeamDialog } from "@/components/settings/team-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Spinner } from "@/components/ui/spinner";
import { useGlobalLoadingEffect } from "@/hooks/use-global-loading";
import { searchSpacesApiService } from "@/lib/apis/search-spaces-api.service";
import type { SearchSpace } from "@/components/layout/types/layout.types";

function ErrorScreen({ message }: { message: string }) {
	const t = useTranslations("dashboard");
	const router = useRouter();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<Card className="w-full max-w-[400px] border-destructive/20 bg-background/60 backdrop-blur-sm">
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-destructive" />
							<CardTitle className="text-xl font-medium">{t("error")}</CardTitle>
						</div>
						<CardDescription>{t("something_wrong")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{t("error_details")}</AlertTitle>
							<AlertDescription className="mt-2">{message}</AlertDescription>
						</Alert>
					</CardContent>
					<CardFooter className="flex justify-end gap-2 border-t pt-4">
						<Button variant="outline" onClick={() => router.refresh()}>
							{t("try_again")}
						</Button>
						<Button onClick={() => router.push("/")}>{t("go_home")}</Button>
					</CardFooter>
				</Card>
			</motion.div>
		</div>
	);
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
	const t = useTranslations("searchSpace");

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-col items-center gap-6 text-center"
			>
				<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
					<Search className="h-10 w-10 text-primary" />
				</div>

				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold">{t("welcome_title")}</h1>
					<p className="max-w-md text-muted-foreground">{t("welcome_description")}</p>
				</div>

				<Button size="lg" onClick={onCreateClick} className="gap-2">
					<Plus className="h-5 w-5" />
					{t("create_first_button")}
				</Button>
			</motion.div>
		</div>
	);
}

export default function DashboardPage() {
	const router = useRouter();
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [settingsSearchSpaceId, setSettingsSearchSpaceId] = useState<number | null>(null);

	const [confirmingSpace, setConfirmingSpace] = useState<SearchSpace | null>(null);
	const [confirmMode, setConfirmMode] = useState<"delete" | "leave" | null>(null);
	const [isConfirming, setIsConfirming] = useState(false);
	const [memberSpaceId, setMemberSpaceId] = useState<number | null>(null);

	const t = useTranslations("dashboard");
	const tSidebar = useTranslations("sidebar");
	const teamDialogOpen = useAtomValue(teamDialogAtom);
	const setTeamDialogOpen = useSetAtom(teamDialogAtom);

	useEffect(() => {
		if (!teamDialogOpen) setMemberSpaceId(null);
	}, [teamDialogOpen]);

	// Don't default data to [] here — we need to distinguish:
	// - "no data yet" (initial load) vs
	// - "cached data present" (background refetch)
	const { data: searchSpaces, isLoading, error, refetch } = useAtomValue(searchSpacesAtom);
	const { mutateAsync: deleteSearchSpace } = useAtomValue(deleteSearchSpaceMutationAtom);
	const setSearchSpaceSettingsDialog = useSetAtom(searchSpaceSettingsDialogAtom);

	// Only show the global loading screen on the first load.
	// If we already have cached data, keep rendering it while a background refetch happens.
	const hasSearchSpacesData = Array.isArray(searchSpaces);
	const shouldShowLoading = isLoading && !hasSearchSpacesData;

	// Use global loading screen - spinner animation won't reset
	useGlobalLoadingEffect(shouldShowLoading);

	const openSpaceSettings = useCallback(
		(space: SearchSpace) => {
			setSettingsSearchSpaceId(space.id);
			setSearchSpaceSettingsDialog({ open: true, initialTab: "general" });
		},
		[setSearchSpaceSettingsDialog]
	);

	const openManageMembers = useCallback(
		(space: SearchSpace) => {
			setMemberSpaceId(space.id);
			setTeamDialogOpen(true);
		},
		[setTeamDialogOpen]
	);

	const requestDeleteOrLeave = useCallback((space: SearchSpace) => {
		setConfirmingSpace(space);
		setConfirmMode(space.isOwner ? "delete" : "leave");
	}, []);

	const closeConfirmDialog = useCallback(() => {
		if (isConfirming) return;
		setConfirmingSpace(null);
		setConfirmMode(null);
	}, [isConfirming]);

	const runDeleteOrLeave = useCallback(async () => {
		if (!confirmingSpace || !confirmMode) return;
		setIsConfirming(true);
		try {
			if (confirmMode === "delete") {
				await deleteSearchSpace({ id: confirmingSpace.id });
			} else {
				await searchSpacesApiService.leaveSearchSpace(confirmingSpace.id);
			}
			await refetch?.();
		} catch (e) {
			console.error(e);
		} finally {
			setIsConfirming(false);
			setConfirmingSpace(null);
			setConfirmMode(null);
		}
	}, [confirmingSpace, confirmMode, deleteSearchSpace, refetch]);

	if (error) return <ErrorScreen message={error?.message || "Failed to load search spaces"} />;

	if (shouldShowLoading) {
		return null;
	}

	const mappedSpaces: SearchSpace[] = (Array.isArray(searchSpaces) ? searchSpaces : []).map((s) => ({
		id: s.id,
		name: s.name,
		description: s.description,
		isOwner: s.is_owner,
		memberCount: s.member_count || 0,
		createdAt: s.created_at,
	}));

	return (
		<>
			<div className="flex w-full h-full min-h-0 px-2 pb-2 pt-1 md:px-3 md:pb-3 md:pt-1 overflow-hidden bg-muted">
				<div className="mx-auto w-full max-w-[1100px] min-w-0 rounded-xl border bg-main-panel text-foreground overflow-hidden">
					{/* Header (matches new-chat sidebar style) */}
					<div className="flex h-14 shrink-0 items-center gap-0 px-1 border-b">
						<div className="flex min-w-0 flex-1 items-center px-3">
							<h2 className="select-none text-lg font-semibold truncate">
								Space
							</h2>
						</div>
						<div className="shrink-0 pr-1">
							<Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-2">
								<Plus className="h-4 w-4" />
								{t.has("create_space") ? t("create_space") : "New space"}
							</Button>
						</div>
					</div>

					{/* Content */}
					<div className="flex-1 min-h-0 overflow-auto p-3 md:p-4">
						{mappedSpaces.length === 0 && (
							<p className="text-sm text-muted-foreground mb-3">
								{t.has("no_spaces")
									? t("no_spaces")
									: "Create your first space to get started."}
							</p>
						)}

						{mappedSpaces.length === 0 ? (
							<div className="mt-8 flex flex-col items-center justify-center gap-4 text-center">
								<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
									<Search className="h-8 w-8 text-primary" />
								</div>
								<div className="flex flex-col gap-2">
									<div className="text-lg font-semibold">
										{t.has("welcome_title") ? t("welcome_title") : "Welcome"}
									</div>
									<p className="max-w-md text-sm text-muted-foreground">
										{t.has("welcome_description")
											? t("welcome_description")
											: "Create a space to start chatting and organizing your work."}
									</p>
								</div>
							</div>
						) : (
							<Table className="rounded-lg border overflow-hidden bg-main-panel/60">
								<TableBody>
									{mappedSpaces.map((space) => (
										<ContextMenu key={space.id}>
											<ContextMenuTrigger asChild>
												<TableRow
													role="button"
													tabIndex={0}
													onClick={() => router.push(`/dashboard/${space.id}/new-chat`)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															router.push(`/dashboard/${space.id}/new-chat`);
														}
													}}
													className="cursor-pointer"
												>
													<TableCell className="font-medium truncate">{space.name}</TableCell>
													<TableCell className="text-muted-foreground">
														{space.isOwner ? "Personal" : "Shared"}
													</TableCell>
													<TableCell className="text-right text-muted-foreground">
														{space.memberCount}
													</TableCell>
												</TableRow>
											</ContextMenuTrigger>
											<ContextMenuContent className="w-48">
												<ContextMenuItem onClick={() => openSpaceSettings(space)}>
													{t.has("settings") ? t("settings") : "Settings"}
												</ContextMenuItem>
												<ContextMenuItem onClick={() => openManageMembers(space)}>
													{tSidebar("manage_members")}
												</ContextMenuItem>
												<ContextMenuSeparator />
												<ContextMenuItem onClick={() => requestDeleteOrLeave(space)}>
													{space.isOwner ? (t.has("delete") ? t("delete") : "Delete") : "Leave"}
												</ContextMenuItem>
											</ContextMenuContent>
										</ContextMenu>
									))}
								</TableBody>
							</Table>
						)}
					</div>
				</div>
			</div>
			<CreateSearchSpaceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

			{settingsSearchSpaceId !== null && (
				<SearchSpaceSettingsDialog searchSpaceId={settingsSearchSpaceId} />
			)}

			{memberSpaceId !== null && <TeamDialog searchSpaceId={memberSpaceId} />}

			<AlertDialog open={!!confirmMode && !!confirmingSpace} onOpenChange={(open) => !open && closeConfirmDialog()}>
				<AlertDialogContent className="sm:max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmMode === "delete"
								? t.has("delete_search_space")
									? t("delete_search_space")
									: "Delete space"
								: "Leave space"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmMode === "delete"
								? t.has("delete_space_confirm")
									? t("delete_space_confirm", { name: confirmingSpace?.name || "" })
									: `Delete "${confirmingSpace?.name || ""}"?`
								: `Leave "${confirmingSpace?.name || ""}"?`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								runDeleteOrLeave();
							}}
							disabled={isConfirming}
							className="relative bg-destructive text-destructive-foreground hover:bg-destructive/90 items-center justify-center"
						>
							<span className={isConfirming ? "opacity-0" : ""}>
								{confirmMode === "delete" ? "Delete" : "Leave"}
							</span>
							{isConfirming && <Spinner size="sm" className="absolute" />}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
