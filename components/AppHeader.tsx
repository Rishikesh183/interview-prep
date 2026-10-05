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
  { href: "/sandbox", label: "Sandbox" },
  { href: "/learn", label: "Learn" },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          SysDesign Arena
        </Link>
        <nav className="flex min-w-0 gap-4 overflow-x-auto text-sm whitespace-nowrap">
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
