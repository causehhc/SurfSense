import { atom } from "jotai";

export interface CitationChunkItem {
	id: number;
	content: string;
}

/** In-memory citation segments; survives panel close/reopen within the session. */
export interface CitationViewState {
	documentId: number | null;
	isDocsChunk: boolean;
	chunks: CitationChunkItem[];
	title: string;
	totalSegments: number;
}

export const citationViewAtom = atom<CitationViewState>({
	documentId: null,
	isDocsChunk: false,
	chunks: [],
	title: "文档",
	totalSegments: 0,
});
