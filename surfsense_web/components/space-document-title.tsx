"use client";

import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { searchSpacesAtom } from "@/atoms/search-spaces/search-space-query.atoms";
import { DocumentTitle } from "@/components/document-title";

interface SpaceDocumentTitleProps {
	searchSpaceId: string;
}

/** Resolves Space name from the search-spaces list and updates the browser tab. */
export function SpaceDocumentTitle({ searchSpaceId }: SpaceDocumentTitleProps) {
	const { data: searchSpacesData } = useAtomValue(searchSpacesAtom);

	const spaceName = useMemo(() => {
		if (!searchSpacesData || !Array.isArray(searchSpacesData)) return null;
		const id = Number(searchSpaceId);
		return searchSpacesData.find((space) => space.id === id)?.name ?? null;
	}, [searchSpacesData, searchSpaceId]);

	return <DocumentTitle spaceName={spaceName} />;
}
