"use client";

import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { activeTabAtom, type Tab } from "@/atoms/tabs/tabs.atom";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Header } from "../header";

const DocumentTabContent = dynamic(
	() => import("../tabs/DocumentTabContent").then((m) => ({ default: m.DocumentTabContent })),
	{
		ssr: false,
		loading: () => (
			<div className="flex-1 flex items-center justify-center h-full">
				<Spinner size="lg" />
			</div>
		),
	}
);

export interface MainContentPanelProps {
	isChatPage: boolean;
	onTabSwitch?: (tab: Tab) => void;
	onNewChat?: () => void;
	children: React.ReactNode;
}

export function MainContentPanel({
	isChatPage,
	children,
}: MainContentPanelProps) {
	const activeTab = useAtomValue(activeTabAtom);
	const isDocumentTab = activeTab?.type === "document";

	return (
		<div className="relative flex h-full min-h-0 max-h-full min-w-0 flex-1 flex-col overflow-hidden">
			<div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-main-panel min-w-0">
				<Header />

				{isDocumentTab && activeTab.documentId && activeTab.searchSpaceId ? (
					<div className="min-h-0 flex-1 overflow-hidden">
						<DocumentTabContent
							key={activeTab.documentId}
							documentId={activeTab.documentId}
							searchSpaceId={activeTab.searchSpaceId}
							title={activeTab.title}
						/>
					</div>
				) : (
					<div
						className={cn("min-h-0 flex-1", isChatPage ? "overflow-hidden" : "overflow-auto")}
					>
						{children}
					</div>
				)}
			</div>
		</div>
	);
}
