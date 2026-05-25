"use client";

import { useSetAtom } from "jotai";
import { FileText } from "lucide-react";
import type { FC } from "react";
import { openCitationPanelAtom } from "@/atoms/editor/editor-panel.atom";
import { useCitationMetadata } from "@/components/assistant-ui/citation-metadata-context";
import { Citation } from "@/components/tool-ui/citation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InlineCitationProps {
	chunkId: number;
	isDocsChunk?: boolean;
}

/**
 * Inline citation for knowledge-base chunks (numeric chunk IDs).
 * Opens the cited document segments in the right panel (shared with document preview).
 */
export const InlineCitation: FC<InlineCitationProps> = ({ chunkId, isDocsChunk = false }) => {
	const openCitationPanel = useSetAtom(openCitationPanelAtom);

	if (chunkId < 0) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span
						className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-md bg-primary/10 px-1.5 text-[11px] font-medium text-primary align-baseline shadow-sm"
						role="note"
					>
						<FileText className="size-3" />
						doc
					</span>
				</TooltipTrigger>
				<TooltipContent>Uploaded document</TooltipContent>
			</Tooltip>
		);
	}

	const chunkLabel = isDocsChunk ? `doc-${chunkId}` : String(chunkId);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={() => openCitationPanel({ chunkId, isDocsChunk })}
					className="ml-0.5 inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-md bg-muted/60 px-1.5 text-[11px] font-medium text-muted-foreground align-baseline shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
				>
					#{chunkLabel}
				</button>
			</TooltipTrigger>
			<TooltipContent>查看引用来源 · Chunk #{chunkLabel}</TooltipContent>
		</Tooltip>
	);
};

function extractDomain(url: string): string {
	try {
		const hostname = new URL(url).hostname;
		return hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

interface UrlCitationProps {
	url: string;
}

/**
 * Inline citation for live web search results (URL-based chunk IDs).
 */
export const UrlCitation: FC<UrlCitationProps> = ({ url }) => {
	const domain = extractDomain(url);
	const meta = useCitationMetadata(url);

	return (
		<Citation
			id={`url-cite-${url}`}
			href={url}
			title={meta?.title || domain}
			snippet={meta?.snippet}
			domain={domain}
			favicon={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
			variant="inline"
			type="webpage"
		/>
	);
};
