/** Product name shown in the browser tab and UI branding. */
export const PRODUCT_NAME = "LogicAnalyzer";

/** Tab title when no Space context: "LogicAnalyzer" */
export function productTitle(): string {
	return PRODUCT_NAME;
}

/** Tab title inside a Space: "RAD600 - LogicAnalyzer" */
export function spaceTitle(spaceName: string): string {
	const name = spaceName.trim();
	return name ? `${name} - ${PRODUCT_NAME}` : PRODUCT_NAME;
}

/** Resolves the tab title from an optional Space name. */
export function formatPageTitle(spaceName?: string | null): string {
	return spaceName?.trim() ? spaceTitle(spaceName) : productTitle();
}
