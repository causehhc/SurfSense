"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const RIGHT_PANEL_MIN_WIDTH = 295;
export const RIGHT_PANEL_MAX_WIDTH = 960;

interface UseRightPanelResizeReturn {
	panelWidth: number;
	handleMouseDown: (e: React.MouseEvent) => void;
	isDragging: boolean;
}

const DESKTOP_LAYOUT_SELECTOR = '[data-layout="desktop-shell"]';
const SIDEBAR_SELECTOR = '[data-panel="sidebar"]';
const MAIN_MIN_WIDTH = RIGHT_PANEL_MIN_WIDTH;

function clampWidth(width: number) {
	return Math.min(RIGHT_PANEL_MAX_WIDTH, Math.max(RIGHT_PANEL_MIN_WIDTH, width));
}

function getElementWidth(selector: string): number {
	if (typeof document === "undefined") return 0;
	const el = document.querySelector(selector) as HTMLElement | null;
	if (!el) return 0;
	return el.getBoundingClientRect().width;
}

export function useRightPanelResize(defaultWidth: number): UseRightPanelResizeReturn {
	// Intentionally not persisted: width resets on page reload.
	const [panelWidth, setPanelWidth] = useState(() => clampWidth(defaultWidth));
	const [isDragging, setIsDragging] = useState(false);

	const startXRef = useRef(0);
	const startWidthRef = useRef(panelWidth);
	const hasUserResizedRef = useRef(false);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			startXRef.current = e.clientX;
			startWidthRef.current = panelWidth;
			setIsDragging(true);

			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		},
		[panelWidth]
	);

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			// Dragging left increases width, dragging right decreases width.
			const delta = startXRef.current - e.clientX;
			const containerWidth = getElementWidth(DESKTOP_LAYOUT_SELECTOR);
			const sidebarWidth = getElementWidth(SIDEBAR_SELECTOR);

			// Dynamic max: determined by available space in the container.
			// Fixed MAX is only used as a fallback when measurement isn't available.
			const maxAllowed =
				containerWidth > 0 ? containerWidth - sidebarWidth - MAIN_MIN_WIDTH : RIGHT_PANEL_MAX_WIDTH;
			const minAllowed = RIGHT_PANEL_MIN_WIDTH;

			const next = startWidthRef.current + delta;
			const clamped = Math.min(Math.max(next, minAllowed), Math.max(minAllowed, maxAllowed));
			setPanelWidth(clamped);
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			hasUserResizedRef.current = true;
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
	}, [isDragging]);

	return { panelWidth, handleMouseDown, isDragging };
}

