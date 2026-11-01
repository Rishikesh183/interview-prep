"use client";

import { AccountMenu } from "./auth/AccountMenu";
import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ShortcutsButton } from "./app/ShortcutsDialog";
import { ThemeToggle } from "./app/ThemeToggle";

const LINKS = [
  { href: "/", label: "Problems" },
  { href: "/history", label: "History" },
  { href: "/progress", label: "Progress" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/learn", label: "Learn" },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center gap-x-3 px-4 py-2 sm:flex-nowrap sm:gap-6 sm:py-0">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight sm:text-base">
          SysDesign Arena
        </Link>
        <nav
          aria-label="Main navigation"
          className="order-last flex w-full min-w-0 gap-4 overflow-x-auto py-2 text-sm whitespace-nowrap sm:order-none sm:w-auto sm:py-0"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)) &&
                  "text-foreground font-medium",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <AccountMenu />
          <ShortcutsButton />
          <Button variant="ghost" size="icon" asChild aria-label="Settings" title="Settings">
            <Link href="/settings">
              <Settings />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
