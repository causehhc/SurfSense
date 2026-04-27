import { AuthRedirect } from "@/components/homepage/auth-redirect";

export default function HomePage() {
	return (
		<div className="min-h-screen bg-white dark:bg-black">
			<AuthRedirect />
		</div>
	);
}
