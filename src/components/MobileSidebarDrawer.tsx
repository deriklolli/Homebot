"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { XIcon } from "./icons";

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function MobileSidebarDrawer({
  open,
  onClose,
  children,
}: MobileSidebarDrawerProps) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  // Close drawer on route change
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      onClose();
    }
    previousPathname.current = pathname;
  }, [pathname, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-surface border-r border-border shadow-[var(--shadow-hover)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        aria-label="Navigation drawer"
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-border shrink-0">
          <span className="text-[14px] font-semibold text-text-primary pl-1">Menu</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-[var(--radius-md)] text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            aria-label="Close navigation menu"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        {/* Drawer content */}
        {children}
      </aside>
    </>
  );
}
