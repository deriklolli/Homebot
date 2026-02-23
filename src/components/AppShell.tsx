"use client";

import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileSidebarDrawer from "./MobileSidebarDrawer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleClose = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="flex flex-col md:flex-row h-dvh overflow-hidden">
      {/* Mobile header — visible < md */}
      <MobileHeader onMenuOpen={() => setDrawerOpen(true)} />

      {/* Mobile drawer — visible < md when open */}
      <MobileSidebarDrawer open={drawerOpen} onClose={handleClose}>
        <Sidebar variant="mobile" onNavigate={handleClose} />
      </MobileSidebarDrawer>

      {/* Desktop sidebar — visible >= md */}
      <Sidebar variant="desktop" />

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
