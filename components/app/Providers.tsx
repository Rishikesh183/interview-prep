"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useShortcuts } from "@/components/useShortcuts";
import { ShortcutsDialog, useShortcutsDialog } from "./ShortcutsDialog";
import { useToggleTheme } from "./ThemeToggle";

function GlobalShortcuts() {
  const toggleTheme = useToggleTheme();
  useShortcuts({
    help: () => useShortcutsDialog.getState().setOpen(true),
    theme: toggleTheme,
  });
  return <ShortcutsDialog />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        {children}
        <GlobalShortcuts />
      </TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}
