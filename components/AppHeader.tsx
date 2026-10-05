"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShortcutsButton } from "./app/ShortcutsDialog";
import { ThemeToggle } from "./app/ThemeToggle";

const LINKS = [
  { href: "/", label: "Problems" },
  { href: "/history", label: "History" },
  { href: "/sandbox", label: "Sandbox" },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          SysDesign Arena
        </Link>
        <nav className="flex gap-4 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                pathname === l.href && "text-foreground font-medium",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ShortcutsButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
