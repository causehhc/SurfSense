"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { FileQuestionMark } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { citationViewAtom } from "@/atoms/editor/citation-view.atom";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { EditorPanelSkeleton } from "@/components/editor-panel/editor-panel-skeleton";
import type {
	GetDocumentByChunkResponse,
	GetSurfsenseDocsByChunkResponse,
} from "@/contracts/types/document.types";
import { documentsApiService } from "@/lib/apis/documents-api.service";
import { fetchAllChunksForDocument } from "@/lib/documents/document-chunks-cache";
import { cacheKeys } from "@/lib/query-client/cache-keys";
import { cn } from "@/lib/utils";

interface ChunkItem {
	id: number;
	content: string;
}

interface DocumentChunksPanelProps {
	documentId?: number | null;
	searchSpaceId?: number | null;
	title?: string | null;
	highlightChunkId?: number | null;
	isDocsChunk?: boolean;
	embedded?: boolean;
	className?: string;
	onResolved?: (info: { title: string; segmentCount: number }) => void;
}

const CHUNK_WINDOW = 5;
const CHUNK_QUERY_OPTIONS = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 } as const;

const SegmentCard = memo(function SegmentCard({
	chunkId,
	content,
	isHighlighted,
}: {
	chunkId: number;
	content: string;
	isHighlighted: boolean;
}) {
	return (
		<div
			data-chunk-id={chunkId}
			className={cn(
				"select-text rounded-lg border px-4 py-3 transition-colors",
				isHighlighted
					? "border-primary/50 bg-primary/5 shadow-sm"
					: "border-border/60 bg-card hover:border-border"
			)}
		>
			<p
				className={cn(
					"mb-2 text-xs font-medium",
					isHighlighted ? "text-primary" : "text-muted-foreground"
				)}
			>
				Chunk #{chunkId}
			</p>
			<div className="overflow-hidden select-text">
				<MarkdownViewer content={content} maxLength={100_000} />
			</div>
		</div>
	);
});

function mergeChunks(existing: ChunkItem[], incoming: ChunkItem[]): ChunkItem[] {
	if (incoming.length === 0) return existing;
	const byId = new Map(existing.map((c) => [c.id, c]));
	for (const c of incoming) {
		byId.set(c.id, c);
	}
	return [...byId.values()].sort((a, b) => a.id - b.id);
}

function scrollToChunkId(container: HTMLElement | null, chunkId: number, smooth: boolean) {
	if (!container) return;
	const target = container.querySelector(`[data-chunk-id="${chunkId}"]`) as HTMLElement | null;
	if (!target) return;
	target.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
}

/** Chat citation: fetch a small window, then scroll to chunkId when already loaded. */
function CitationChunksView({
	highlightChunkId,
	isDocsChunk,
	embedded,
	className,
	onResolved,
}: {
	highlightChunkId: number;
	isDocsChunk: boolean;
	embedded: boolean;
	className?: string;
	onResolved?: (info: { title: string; segmentCount: number }) => void;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [citationView, setCitationView] = useAtom(citationViewAtom);

	const sameContext =
		citationView.documentId != null && citationView.isDocsChunk === isDocsChunk;
	const visibleChunks = sameContext ? citationView.chunks : [];
	const chunkInMemory = visibleChunks.some((c) => c.id === highlightChunkId);

	const queryKey = isDocsChunk
		? cacheKeys.documents.byChunk(`doc-${highlightChunkId}`)
		: cacheKeys.documents.byChunk(String(highlightChunkId));

	const { data, isPending, error, isFetching } = useQuery<
		GetDocumentByChunkResponse | GetSurfsenseDocsByChunkResponse
	>({
		queryKey,
		queryFn: async () => {
			if (isDocsChunk) {
				return documentsApiService.getSurfsenseDocByChunk(highlightChunkId);
			}
			return documentsApiService.getDocumentByChunk({
				chunk_id: highlightChunkId,
				chunk_window: CHUNK_WINDOW,
			});
		},
		enabled: !chunkInMemory,
		...CHUNK_QUERY_OPTIONS,
	});

	useEffect(() => {
		if (!chunkInMemory) return;
		requestAnimationFrame(() => {
			scrollToChunkId(scrollRef.current, highlightChunkId, true);
		});
	}, [highlightChunkId, chunkInMemory]);

	useEffect(() => {
		if (!data) return;

		const incoming = data.chunks.map((c) => ({ id: c.id, content: c.content }));
		const totalSegments =
			"total_chunks" in data && data.total_chunks != null
				? data.total_chunks
				: incoming.length;

		let sameDocument = false;
		setCitationView((prev) => {
			sameDocument = prev.documentId === data.id && prev.isDocsChunk === isDocsChunk;
			return {
				documentId: data.id,
				isDocsChunk,
				title: data.title,
				totalSegments,
				chunks: sameDocument ? mergeChunks(prev.chunks, incoming) : incoming,
			};
		});

		requestAnimationFrame(() => {
			scrollToChunkId(scrollRef.current, highlightChunkId, sameDocument);
		});
	}, [data, highlightChunkId, isDocsChunk, setCitationView]);

	const displayTitle = citationView.title;
	const totalSegments = citationView.totalSegments;
	const chunks = sameContext ? citationView.chunks : visibleChunks;

	useEffect(() => {
		if (displayTitle && totalSegments > 0) {
			onResolved?.({ title: displayTitle, segmentCount: totalSegments });
		}
	}, [displayTitle, totalSegments, onResolved]);

	const showSkeleton = isPending && chunks.length === 0;

	if (showSkeleton) {
		return (
			<div className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
				<EditorPanelSkeleton />
			</div>
		);
	}

	if (error && chunks.length === 0) {
		return (
			<div
				className={cn(
					"flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center",
					className
				)}
			>
				<div className="rounded-full bg-muted/50 p-3">
					<FileQuestionMark className="size-6 text-muted-foreground" />
				</div>
				<p className="font-medium">无法加载来源</p>
				<p className="text-sm text-muted-foreground">
					{error instanceof Error ? error.message : "请稍后重试"}
				</p>
			</div>
		);
	}

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			{!embedded && (
				<div className="shrink-0 border-b px-4 py-2">
					<h3 className="truncate text-sm font-semibold">{displayTitle}</h3>
					{totalSegments > 0 && (
						<p className="text-xs text-muted-foreground mt-0.5">
							{isFetching && chunks.length > 0 ? "定位中… · " : ""}
							共 {totalSegments} 个分段
						</p>
					)}
				</div>
			)}
			<div ref={scrollRef} className="min-h-0 flex-1 select-text overflow-y-auto px-4 py-4">
				<div className="space-y-3">
					{chunks.map((chunk) => (
						<SegmentCard
							key={chunk.id}
							chunkId={chunk.id}
							content={chunk.content}
							isHighlighted={chunk.id === highlightChunkId}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

/** Sidebar document preview: load all segments (browse mode). */
function DocumentAllChunksView({
	documentId,
	title,
	embedded,
	className,
	onResolved,
}: {
	documentId: number;
	title?: string | null;
	embedded: boolean;
	className?: string;
	onResolved?: (info: { title: string; segmentCount: number }) => void;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const { data, isPending, error } = useQuery({
		queryKey: [...cacheKeys.documents.document(String(documentId)), "all-chunks"],
		queryFn: async () => {
			const chunks = await fetchAllChunksForDocument(documentId);
			return { title: title ?? "", chunks };
		},
		...CHUNK_QUERY_OPTIONS,
	});

	useEffect(() => {
		if (data?.title) {
			onResolved?.({ title: data.title, segmentCount: data.chunks.length });
		}
	}, [data, onResolved]);

	if (isPending) {
		return (
			<div className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
				<EditorPanelSkeleton />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div
				className={cn(
					"flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center",
					className
				)}
			>
				<div className="rounded-full bg-muted/50 p-3">
					<FileQuestionMark className="size-6 text-muted-foreground" />
				</div>
				<p className="font-medium">无法加载分段</p>
				<p className="text-sm text-muted-foreground">
					{error instanceof Error ? error.message : "请稍后重试"}
				</p>
			</div>
		);
	}

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			{!embedded && (
				<div className="shrink-0 border-b px-4 py-2">
					<h3 className="truncate text-sm font-semibold">{data.title || "文档"}</h3>
					<p className="text-xs text-muted-foreground mt-0.5">共 {data.chunks.length} 个分段</p>
				</div>
			)}
			<div ref={scrollRef} className="min-h-0 flex-1 select-text overflow-y-auto px-4 py-4">
				<div className="space-y-3">
					{data.chunks.map((chunk) => (
						<SegmentCard
							key={chunk.id}
							chunkId={chunk.id}
							content={chunk.content}
							isHighlighted={false}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

export function DocumentChunksPanel({
	documentId,
	searchSpaceId: _searchSpaceId,
	title,
	highlightChunkId = null,
	isDocsChunk = false,
	embedded = false,
	className,
	onResolved,
}: DocumentChunksPanelProps) {
	const isCitationByChunk = highlightChunkId != null && documentId == null;
	const isDirectDocument = documentId != null && documentId > 0;

	if (isCitationByChunk && highlightChunkId != null) {
		return (
			<CitationChunksView
				highlightChunkId={highlightChunkId}
				isDocsChunk={isDocsChunk}
				embedded={embedded}
				className={className}
				onResolved={onResolved}
			/>
		);
	}

	if (isDirectDocument) {
		return (
			<DocumentAllChunksView
				documentId={documentId}
				title={title}
				embedded={embedded}
				className={className}
				onResolved={onResolved}
			/>
		);
	}

	return null;
}
