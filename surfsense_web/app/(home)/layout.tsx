"use client";

import { DocumentTitle } from "@/components/document-title";

export default function HomePageLayout({ children }: { children: React.ReactNode }) {
	// Minimal shell: no marketing navbar/footer.
	return (
		<>
			<DocumentTitle />
			{children}
		</>
	);
}
