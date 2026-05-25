import { documentsApiService } from "@/lib/apis/documents-api.service";

export interface ChunkItem {
	id: number;
	content: string;
}

const CHUNK_PAGE_SIZE = 100;

/** Paginate all segments — used only for sidebar document browse, not chat citations. */
export async function fetchAllChunksForDocument(documentId: number): Promise<ChunkItem[]> {
	const all: ChunkItem[] = [];
	let offset = 0;

	while (true) {
		const result = await documentsApiService.getDocumentChunks({
			document_id: documentId,
			page: 0,
			page_size: CHUNK_PAGE_SIZE,
			start_offset: offset,
		});

		for (const c of result.items) {
			all.push({ id: c.id, content: c.content });
		}

		if (!result.has_more || result.items.length === 0) break;
		offset += result.items.length;
	}

	return all;
}
