"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { PanelRight, PanelRightClose } from "lucide-react";
import dynamic from "next/dynamic";
import { startTransition, useEffect } from "react";
import { closeHitlEditPanelAtom, hitlEditPanelAtom } from "@/atoms/chat/hitl-edit-panel.atom";
import { closeReportPanelAtom, reportPanelAtom } from "@/atoms/chat/report-panel.atom";
import { documentsSidebarOpenAtom } from "@/atoms/documents/ui.atoms";
import { closeEditorPanelAtom, editorPanelAtom } from "@/atoms/editor/editor-panel.atom";
import { rightPanelCollapsedAtom, rightPanelTabAtom } from "@/atoms/layout/right-panel.atom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRightPanelResize } from "../../hooks/useRightPanelResize";
import { DocumentsSidebar } from "../sidebar";

const EditorPanelContent = dynamic(
	() =>
		import("@/components/editor-panel/editor-panel").then((m) => ({
			default: m.EditorPanelContent,
		})),
	{ ssr: false, loading: () => null }
);

const HitlEditPanelContent = dynamic(
	() =>
		import("@/components/hitl-edit-panel/hitl-edit-panel").then((m) => ({
			default: m.HitlEditPanelContent,
		})),
	{ ssr: false, loading: () => null }
);

const ReportPanelContent = dynamic(
	() =>
		import("@/components/report-panel/report-panel").then((m) => ({
			default: m.ReportPanelContent,
		})),
	{ ssr: false, loading: () => null }
);

interface RightPanelProps {
	documentsPanel?: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};
}

function RightPanelCollapseButton({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 shrink-0">
					{isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
					<span className="sr-only">{isCollapsed ? "Expand panel" : "Collapse panel"}</span>
				</Button>
			</TooltipTrigger>
			<TooltipContent side={isCollapsed ? "left" : "bottom"}>
				{isCollapsed ? "Expand panel" : "Collapse panel"}
			</TooltipContent>
		</Tooltip>
	);
}

const PANEL_WIDTHS = { sources: 485, report: 640, editor: 640, "hitl-edit": 640 } as const;
const COLLAPSED_PANEL_WIDTH = 60;

export function RightPanel({ documentsPanel }: RightPanelProps) {
	if (!documentsPanel) return null;

	const [activeTab] = useAtom(rightPanelTabAtom);
	const reportState = useAtomValue(reportPanelAtom);
	const closeReport = useSetAtom(closeReportPanelAtom);
	const editorState = useAtomValue(editorPanelAtom);
	const closeEditor = useSetAtom(closeEditorPanelAtom);
	const hitlEditState = useAtomValue(hitlEditPanelAtom);
	const closeHitlEdit = useSetAtom(closeHitlEditPanelAtom);
	const [collapsed, setCollapsed] = useAtom(rightPanelCollapsedAtom);

	const documentsOpen = documentsPanel.open ?? false;
	const reportOpen = reportState.isOpen && !!reportState.reportId;
	const editorOpen = editorState.isOpen && !!editorState.documentId;
	const hitlEditOpen = hitlEditState.isOpen && !!hitlEditState.onSave;
	const hasContent = documentsOpen || reportOpen || editorOpen || hitlEditOpen;

	useEffect(() => {
		if (!reportOpen && !editorOpen && !hitlEditOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (hitlEditOpen) closeHitlEdit();
				else if (editorOpen) closeEditor();
				else if (reportOpen) closeReport();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [reportOpen, editorOpen, hitlEditOpen, closeReport, closeEditor, closeHitlEdit]);

	let effectiveTab = activeTab;
	if (effectiveTab === "hitl-edit" && !hitlEditOpen) {
		effectiveTab = editorOpen ? "editor" : reportOpen ? "report" : "sources";
	} else if (effectiveTab === "editor" && !editorOpen) {
		effectiveTab = reportOpen ? "report" : "sources";
	} else if (effectiveTab === "report" && !reportOpen) {
		effectiveTab = editorOpen ? "editor" : "sources";
	} else if (effectiveTab === "sources" && !documentsOpen) {
		effectiveTab = hitlEditOpen
			? "hitl-edit"
			: editorOpen
				? "editor"
				: reportOpen
					? "report"
					: "sources";
	}

	const targetWidth = PANEL_WIDTHS[effectiveTab];
	const { panelWidth, handleMouseDown: onResizeMouseDown, isDragging: isResizing } = useRightPanelResize(
		targetWidth
	);

	if (!hasContent) return null;

	return (
		<>
			{/* Resize handle — negative margins eat the flex gap so spacing stays unchanged */}
			{!collapsed && (
				<div
					role="slider"
					aria-label="Resize right panel"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={50}
					tabIndex={0}
					onMouseDown={onResizeMouseDown}
					className="hidden md:block h-full cursor-col-resize z-30 focus:outline-none"
					style={{ width: 8, marginLeft: -8, marginRight: -0 }}
				/>
			)}

			<aside
				className={[
					"relative flex h-full min-h-0 max-h-full shrink-0 flex-col overflow-hidden rounded-xl border bg-main-panel text-foreground select-none",
					!isResizing ? "transition-[width] duration-200 ease-out" : "",
					collapsed ? "w-[60px]" : "",
				].join(" ")}
				style={collapsed ? undefined : { width: panelWidth }}
				data-panel="right"
			>
				{collapsed ? (
					<div className="flex h-14 shrink-0 items-center justify-center border-b">
						<RightPanelCollapseButton
							isCollapsed={collapsed}
							onToggle={() => startTransition(() => setCollapsed(false))}
						/>
					</div>
				) : (
					<div className="relative flex-1 min-h-0 overflow-hidden">
							<div className="h-full">
								<DocumentsSidebar
									open={documentsPanel.open}
									onOpenChange={documentsPanel.onOpenChange}
									embedded
									variant="compact"
									headerAction={
										<RightPanelCollapseButton isCollapsed={false} onToggle={() => setCollapsed(true)} />
									}
								/>
							</div>
					</div>
				)}
			</aside>
		</>
	);
}
