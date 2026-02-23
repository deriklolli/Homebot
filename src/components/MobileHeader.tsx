"use client";

import Link from "next/link";
import { HomebotLogo, MenuIcon } from "./icons";

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="md:hidden flex items-center px-4 h-14 bg-surface border-b border-border shrink-0"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <button
        onClick={onMenuOpen}
        className="flex items-center justify-center w-11 h-11 -ml-2 rounded-[var(--radius-md)] text-text-primary hover:bg-border transition-colors duration-[120ms]"
        aria-label="Open navigation menu"
      >
        <MenuIcon width={20} height={20} />
      </button>
      <Link href="/" className="flex items-center ml-2" aria-label="HOMEBOT home">
        <HomebotLogo />
      </Link>
    </header>
  );
}
