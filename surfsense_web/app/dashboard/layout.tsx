"use client";

import { useEffect, useState } from "react";
import { USER_QUERY_KEY } from "@/atoms/user/user-query.atoms";
import { useGlobalLoadingEffect } from "@/hooks/use-global-loading";
import { ensureTokensFromElectron, getBearerToken, redirectToLogin } from "@/lib/auth-utils";
import { queryClient } from "@/lib/query-client/client";
import { DocumentTitle } from "@/components/document-title";
import { Navbar } from "@/components/homepage/navbar";
import { UserSettingsDialog } from "@/components/settings/user-settings-dialog";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);

	// Use the global loading screen - spinner animation won't reset
	useGlobalLoadingEffect(isCheckingAuth);

	useEffect(() => {
		async function checkAuth() {
			let token = getBearerToken();
			if (!token) {
				const synced = await ensureTokensFromElectron();
				if (synced) token = getBearerToken();
			}
			if (!token) {
				redirectToLogin();
				return;
			}
			queryClient.invalidateQueries({ queryKey: [...USER_QUERY_KEY] });
			setIsCheckingAuth(false);
		}
		checkAuth();
	}, []);

	// Return null while loading - the global provider handles the loading UI
	if (isCheckingAuth) {
		return null;
	}

	return (
		<div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-muted">
			<DocumentTitle />
			<Navbar />
			<main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted">{children}</main>
			<UserSettingsDialog />
		</div>
	);
}
