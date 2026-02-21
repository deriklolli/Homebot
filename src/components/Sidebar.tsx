"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomebotLogo,
  SidebarToggleIcon,
  GridIcon,
  WrenchIcon,
  UsersIcon,
  PackageIcon,
  GearIcon,
  HelpCircleIcon,
  ChevronDownIcon,
} from "./icons";

const navItems = [
  { href: "/", label: "Dashboard", icon: GridIcon },
  { href: "/projects", label: "Projects", icon: WrenchIcon },
  { href: "/contractors", label: "Contractors", icon: UsersIcon },
  { href: "/inventory", label: "Home Inventory", icon: PackageIcon },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: GearIcon },
  { href: "/help", label: "Help & Support", icon: HelpCircleIcon },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col shrink-0 bg-surface border-r border-border overflow-hidden z-10 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        expanded ? "w-[224px]" : "w-[56px]"
      }`}
      aria-label="Primary navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 min-h-[56px] border-b border-border gap-2 shrink-0">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 shrink-0"
          aria-label="HOMEBOT home"
        >
          <HomebotLogo />
        </Link>
        <button
          className={`flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-3 transition-all duration-[120ms] shrink-0 hover:bg-border hover:text-text-primary ${
            expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={() => setExpanded(!expanded)}
          aria-label="Toggle sidebar"
          aria-expanded={expanded}
        >
          <SidebarToggleIcon />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden scrollbar-none" aria-label="Main navigation">
        <ul className="flex flex-col gap-px px-2" role="list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 py-[9px] px-2 rounded-[var(--radius-md)] text-[13px] font-medium whitespace-nowrap transition-all duration-[120ms] ${
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
              className={`flex items-center gap-2 py-[9px] px-2 rounded-[var(--radius-md)] text-[13px] font-medium whitespace-nowrap transition-all duration-[120ms] ${
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
      </div>

      {/* User footer */}
      <div className="px-2 pb-3 border-t border-border shrink-0">
        <button
          className="flex items-center gap-2 w-full py-2 px-2 rounded-[var(--radius-md)] text-[13px] font-medium text-text-primary hover:bg-border transition-[background] duration-[120ms]"
          aria-label="Open user profile menu"
        >
          <div className="w-7 h-7 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">
            D
          </div>
          <span
            className={`flex-1 text-left transition-all duration-200 whitespace-nowrap ${
              expanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            Derik
          </span>
          <ChevronDownIcon
            className={`text-text-3 transition-opacity duration-200 ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          />
        </button>
      </div>
    </aside>
  );
}
