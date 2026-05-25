"use client";

import { useEffect } from "react";
import { formatPageTitle } from "@/lib/brand";

interface DocumentTitleProps {
	/** When set, tab shows "{spaceName} - LogicAnalyzer". Otherwise "LogicAnalyzer". */
	spaceName?: string | null;
}

/**
 * Sets document.title on the client (dashboard / Space routes load data client-side).
 */
export function DocumentTitle({ spaceName }: DocumentTitleProps) {
	useEffect(() => {
		document.title = formatPageTitle(spaceName);
	}, [spaceName]);

	return null;
}
