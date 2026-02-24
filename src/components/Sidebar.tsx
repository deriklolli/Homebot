"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  HomebotLogo,
  GridIcon,
  WrenchIcon,
  UsersIcon,
  PackageIcon,
  ClipboardCheckIcon,
  CalendarIcon,
  HomeIcon,
  GearIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
} from "./icons";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { href: "/", label: "Dashboard", icon: GridIcon },
  { href: "/projects", label: "Projects", icon: WrenchIcon },
  { href: "/contractors", label: "Contractors", icon: UsersIcon },
  { href: "/inventory", label: "Home Inventory", icon: PackageIcon },
  { href: "/services", label: "Home Services", icon: ClipboardCheckIcon },
  { href: "/home-assets", label: "Home Assets", icon: HomeIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: GearIcon },
  { href: "/help", label: "Help & Support", icon: HelpCircleIcon },
];

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export default function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const [expanded, setExpanded] = useState(variant === "mobile" ? true : true);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Auto-collapse below 1024px — desktop only
  useEffect(() => {
    if (variant === "mobile") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setExpanded(e.matches);
    };
    handleChange(mq);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [variant]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleLinkClick() {
    onNavigate?.();
  }

  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? "User";
  const initial = (
    user?.user_metadata?.full_name?.[0] ??
    user?.email?.[0] ??
    "?"
  ).toUpperCase();

  const sidebarContent = (
    <>
      {/* Header — desktop only (mobile has its own header) */}
      {variant === "desktop" && (
        <div className="flex items-center px-3 min-h-[56px] border-b border-border shrink-0">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 shrink-0"
            aria-label="HOMEBOT home"
          >
            <HomebotLogo />
          </Link>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden scrollbar-none" aria-label="Main navigation">
        <ul className="flex flex-col gap-px px-2" role="list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-2 py-3 md:py-[9px] px-2 rounded-[var(--radius-md)] text-[13px] font-medium whitespace-nowrap transition-all duration-[120ms] ${
                    isActive
                      ? "text-accent"
                      : "text-text-3 hover:bg-border hover:text-text-primary"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className={`shrink-0 ${isActive ? "text-accent" : ""}`} />
                  <span
                    className={`transition-all duration-200 whitespace-nowrap ${
                      expanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom links */}
      <div className="px-2 py-2 border-t border-border flex flex-col gap-px shrink-0">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={`flex items-center gap-2 py-3 md:py-[9px] px-2 rounded-[var(--radius-md)] text-[13px] font-medium whitespace-nowrap transition-all duration-[120ms] ${
                isActive
                  ? "text-accent"
                  : "text-text-3 hover:bg-border hover:text-text-primary"
              }`}
            >
              <item.icon className="shrink-0" />
              <span
                className={`transition-all duration-200 whitespace-nowrap ${
                  expanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        <div
          className={`flex items-center gap-2 py-[7px] px-2 ${
            expanded ? "" : "justify-center"
          }`}
        >
          <div
            className="inline-flex items-center rounded-full bg-border p-[2px] gap-0 shrink-0"
            role="radiogroup"
            aria-label="Theme toggle"
          >
            <button
              onClick={() => setTheme("light")}
              className={`inline-flex items-center justify-center w-[26px] h-[26px] rounded-full transition-all duration-200 ${
                !isDark
                  ? "bg-surface text-accent shadow-[var(--shadow-card)]"
                  : "text-text-3 hover:text-text-2"
              }`}
              role="radio"
              aria-checked={!isDark}
              aria-label="Light mode"
            >
              <SunIcon width={13} height={13} />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`inline-flex items-center justify-center w-[26px] h-[26px] rounded-full transition-all duration-200 ${
                isDark
                  ? "bg-surface text-accent shadow-[var(--shadow-card)]"
                  : "text-text-3 hover:text-text-2"
              }`}
              role="radio"
              aria-checked={isDark}
              aria-label="Dark mode"
            >
              <MoonIcon width={13} height={13} />
            </button>
          </div>
          <span
            className={`text-[13px] font-medium text-text-3 transition-all duration-200 whitespace-nowrap ${
              expanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            Theme
          </span>
        </div>
      </div>

      {/* User footer */}
      <div className="px-2 pb-3 border-t border-border shrink-0 relative" ref={menuRef}>
        <button
          className="flex items-center gap-2 w-full py-2 px-2 rounded-[var(--radius-md)] text-[13px] font-medium text-text-primary hover:bg-border transition-[background] duration-[120ms]"
          aria-label="Open user profile menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-7 h-7 rounded-full shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {initial}
            </div>
          )}
          <span
            className={`flex-1 text-left transition-all duration-200 whitespace-nowrap truncate ${
              expanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            {displayName}
          </span>
          <ChevronDownIcon
            className={`text-text-3 transition-opacity duration-200 ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          />
        </button>

        {/* Dropdown menu */}
        {menuOpen && expanded && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-surface rounded-[var(--radius-md)] border border-border shadow-[var(--shadow-hover)] overflow-hidden z-20">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full py-2.5 px-3 text-[13px] font-medium text-text-primary hover:bg-border transition-[background] duration-[120ms]"
            >
              <LogOutIcon width={15} height={15} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );

  // Mobile variant: no wrapper aside (the drawer provides it)
  if (variant === "mobile") {
    return sidebarContent;
  }

  // Desktop variant: full aside with collapse/expand
  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-surface border-r border-border overflow-hidden z-10 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        expanded ? "w-[224px]" : "w-[56px]"
      }`}
      aria-label="Primary navigation"
    >
      {sidebarContent}
    </aside>
  );
}
