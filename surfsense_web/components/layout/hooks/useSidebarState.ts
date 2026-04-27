"use client";

import { useCallback, useEffect, useState } from "react";

interface UseSidebarStateReturn {
	isCollapsed: boolean;
	setIsCollapsed: (collapsed: boolean) => void;
	toggleCollapsed: () => void;
}

export function useSidebarState(defaultCollapsed = false): UseSidebarStateReturn {
	// Intentionally not persisted: state resets on page reload.
	const [isCollapsed, setIsCollapsedState] = useState(defaultCollapsed);

	const setIsCollapsed = useCallback((collapsed: boolean) => {
		setIsCollapsedState(collapsed);
	}, []);

	const toggleCollapsed = useCallback(() => {
		setIsCollapsedState((prev) => !prev);
	}, []);

	// Keyboard shortcut: Cmd/Ctrl + \
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "\\" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				toggleCollapsed();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toggleCollapsed]);

	return {
		isCollapsed,
		setIsCollapsed,
		toggleCollapsed,
	};
}
