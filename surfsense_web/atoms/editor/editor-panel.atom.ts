import { atom } from "jotai";
import { startTransition } from "react";
import { rightPanelCollapsedAtom, rightPanelTabAtom } from "@/atoms/layout/right-panel.atom";

export type EditorPanelMode = "preview" | "edit";

interface EditorPanelState {
	isOpen: boolean;
	documentId: number | null;
	searchSpaceId: number | null;
	title: string | null;
	mode: EditorPanelMode;
	highlightChunkId: number | null;
	isDocsChunk: boolean;
}

const initialState: EditorPanelState = {
	isOpen: false,
	documentId: null,
	searchSpaceId: null,
	title: null,
	mode: "preview",
	highlightChunkId: null,
	isDocsChunk: false,
};

export const editorPanelAtom = atom<EditorPanelState>(initialState);

export const editorPanelOpenAtom = atom((get) => get(editorPanelAtom).isOpen);

const preEditorCollapsedAtom = atom<boolean | null>(null);

export const openEditorPanelAtom = atom(
	null,
	(
		get,
		set,
		{
			documentId,
			searchSpaceId,
			title,
			mode = "preview",
		}: {
			documentId: number;
			searchSpaceId: number;
			title?: string;
			mode?: EditorPanelMode;
		}
	) => {
		if (!get(editorPanelAtom).isOpen) {
			set(preEditorCollapsedAtom, get(rightPanelCollapsedAtom));
		}
		startTransition(() => {
			set(editorPanelAtom, {
				isOpen: true,
				documentId,
				searchSpaceId,
				title: title ?? null,
				mode,
				highlightChunkId: null,
				isDocsChunk: false,
			});
			set(rightPanelTabAtom, "editor");
			set(rightPanelCollapsedAtom, false);
		});
	}
);

/** Open citation view: only updates highlightChunkId; panel scrolls to chunk. */
export const openCitationPanelAtom = atom(
	null,
	(get, set, { chunkId, isDocsChunk = false }: { chunkId: number; isDocsChunk?: boolean }) => {
		const current = get(editorPanelAtom);

		if (
			current.isOpen &&
			current.highlightChunkId === chunkId &&
			current.isDocsChunk === isDocsChunk &&
			current.documentId == null
		) {
			return;
		}

		if (!current.isOpen) {
			set(preEditorCollapsedAtom, get(rightPanelCollapsedAtom));
		}

		startTransition(() => {
			set(editorPanelAtom, {
				isOpen: true,
				documentId: null,
				searchSpaceId: null,
				title: null,
				mode: "preview",
				highlightChunkId: chunkId,
				isDocsChunk,
			});
			set(rightPanelTabAtom, "editor");
			set(rightPanelCollapsedAtom, false);
		});
	}
);

export const closeEditorPanelAtom = atom(null, (get, set) => {
	set(editorPanelAtom, initialState);
	set(rightPanelTabAtom, "sources");
	const prev = get(preEditorCollapsedAtom);
	if (prev !== null) {
		set(rightPanelCollapsedAtom, prev);
		set(preEditorCollapsedAtom, null);
	}
});
