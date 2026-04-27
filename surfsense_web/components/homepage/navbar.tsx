"use client";
import { IconBrandDiscord, IconBrandReddit, IconMenu2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { NavbarGitHubStars } from "@/components/homepage/github-stars-badge";
import { Logo } from "@/components/Logo";
import { ThemeTogglerComponent } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface NavItem {
	name: string;
	link: string;
}

interface NavbarProps {
	/** Override the scrolled-state background classes (desktop & mobile). */
	scrolledBgClassName?: string;
}

interface DesktopNavProps {
	navItems: NavItem[];
	isScrolled: boolean;
	scrolledBgClassName?: string;
}

interface MobileNavProps {
	navItems: NavItem[];
	isScrolled: boolean;
	scrolledBgClassName?: string;
}

export const Navbar = ({ scrolledBgClassName }: NavbarProps = {}) => {
	const [isScrolled, setIsScrolled] = useState(false);

	const navItems = [
		{ name: "Free\u00A0AI", link: "/free" },
		{ name: "Pricing", link: "/pricing" },
		{ name: "Blog", link: "/blog" },
		{ name: "Changelog", link: "/changelog" },
		{ name: "Docs", link: "/docs" },
		{ name: "Contact\u00A0Us", link: "/contact" },
	];

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="sticky top-0 z-60 w-full select-none">
			<DesktopNav
				navItems={navItems}
				isScrolled={isScrolled}
				scrolledBgClassName={scrolledBgClassName}
			/>
			<MobileNav
				navItems={navItems}
				isScrolled={isScrolled}
				scrolledBgClassName={scrolledBgClassName}
			/>
		</div>
	);
};

const DesktopNav = ({ navItems, isScrolled, scrolledBgClassName }: DesktopNavProps) => {
	const [hovered, setHovered] = useState<number | null>(null);
	const pathname = usePathname();
	const logoHref = pathname?.startsWith("/dashboard") ? "/dashboard" : "/";
	return (
		<div className="hidden w-full px-2 pt-1 pb-0 md:px-3 lg:block">
			<motion.div
				onMouseLeave={() => {
					setHovered(null);
				}}
				className={cn(
					"flex w-full flex-row items-center justify-between self-start px-3 pt-1 pb-0 transition-[background-color,border-color,box-shadow] duration-300 rounded-xl border",
					isScrolled
						? (scrolledBgClassName ??
								"bg-muted/40 backdrop-blur-md border-border/60 shadow-sm")
						: "bg-muted/40 border-transparent"
				)}
			>
				<Link
					href={logoHref}
					className="flex flex-1 flex-row items-center gap-0.5 hover:opacity-80 transition-opacity"
				>
					<Logo className="h-8 w-8 rounded-md" disableLink />
					<span className="dark:text-white/90 text-gray-800 text-lg font-bold">LogicAnalyzer</span>
				</Link>
				<div className="flex flex-1 items-center justify-end gap-2">
					<SignInButton variant="desktop" />
				</div>
			</motion.div>
		</div>
	);
};

const MobileNav = ({ navItems, isScrolled, scrolledBgClassName }: MobileNavProps) => {
	const [open, setOpen] = useState(false);
	const navRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const logoHref = pathname?.startsWith("/dashboard") ? "/dashboard" : "/";

	useEffect(() => {
		if (!open) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			if (navRef.current && !navRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("touchstart", handleClickOutside, { passive: true });
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("touchstart", handleClickOutside);
		};
	}, [open]);

	return (
		<motion.div
			ref={navRef}
			animate={{ borderRadius: open ? "4px" : "2rem" }}
			key={String(open)}
			className={cn(
				"relative mx-auto flex w-full flex-col items-center justify-between px-4 py-3 lg:hidden transition-[background-color,border-color,box-shadow] duration-300",
				isScrolled
					? (scrolledBgClassName ??
							"bg-muted/40 backdrop-blur-md border-b border-border/60")
					: "bg-muted/40 border-b border-transparent"
			)}
		>
			<div className="flex w-full flex-row items-center justify-between">
				<Link
					href={logoHref}
					className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
				>
					<Logo className="h-8 w-8 rounded-md" disableLink />
					<span className="dark:text-white/90 text-gray-800 text-lg font-bold">LogicAnalyzer</span>
				</Link>
				<button
					type="button"
					onClick={() => setOpen((prev) => !prev)}
					className="relative z-50 flex items-center justify-center p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors touch-manipulation"
					aria-label={open ? "Close menu" : "Open menu"}
				>
					{open ? (
						<IconX className="h-6 w-6 text-black dark:text-white" />
					) : (
						<IconMenu2 className="h-6 w-6 text-black dark:text-white" />
					)}
				</button>
			</div>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="absolute inset-x-0 top-full mt-1 z-20 flex w-full flex-col items-start justify-start gap-4 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl px-4 py-6 dark:bg-neutral-950/90 dark:border-neutral-800/50"
					>
						{navItems.map((navItem: NavItem, idx: number) => (
							<Link
								key={`link=${idx}`}
								href={navItem.link}
								className="relative text-neutral-600 dark:text-neutral-300"
							>
								<motion.span className="block">{navItem.name} </motion.span>
							</Link>
						))}
						<div className="flex w-full items-center gap-2 pt-2">
							<Link
								href="https://discord.gg/ejRNvftDp9"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-center rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors touch-manipulation"
							>
								<IconBrandDiscord className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
							</Link>
							<Link
								href="https://www.reddit.com/r/SurfSense/"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-center rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors touch-manipulation"
							>
								<IconBrandReddit className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
							</Link>
							<NavbarGitHubStars className="rounded-lg" />
							<ThemeTogglerComponent />
						</div>
						<SignInButton variant="mobile" />
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};
