"use client";

import { Cloud, CloudOff, LogIn, LogOut, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { syncNow, useSyncStatus, type SyncStatus } from "@/lib/sync/worker";
import { cn } from "@/lib/utils";
import { useAuth } from "./useAuth";

const STATUS: Record<SyncStatus, { label: string; dot: string }> = {
  off: { label: "Sync off", dot: "bg-muted-foreground" },
  syncing: { label: "Syncing...", dot: "bg-sky-500 animate-pulse" },
  synced: { label: "Synced", dot: "bg-emerald-500" },
  error: { label: "Sync error", dot: "bg-destructive" },
  offline: { label: "Offline: saved on this device", dot: "bg-amber-500" },
};

/** Sign-in button, or the signed-in user's menu with sync status. Hidden in local-only mode. */
export function AccountMenu() {
  const { status, user } = useAuth();
  const sync = useSyncStatus();
  const pathname = usePathname();

  if (status === "disabled" || status === "loading") return null;
  if (status === "signed-out" || !user) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
          <LogIn /> Sign in
        </Link>
      </Button>
    );
  }

  const s = STATUS[sync.status];
  const name = (user.user_metadata?.user_name as string | undefined) ?? user.email ?? "Account";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" title={sync.error ?? s.label}>
          <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
          <span className="max-w-32 truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate text-sm">{user.email}</div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal">
            {sync.status === "offline" || sync.status === "error" ? (
              <CloudOff className="size-3" />
            ) : (
              <Cloud className="size-3" />
            )}
            {s.label}
            {sync.lastSyncedAt && sync.status === "synced" && (
              <> · {new Date(sync.lastSyncedAt).toLocaleTimeString()}</>
            )}
          </div>
          {sync.error && <div className="text-destructive text-xs font-normal">{sync.error}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void syncNow()}>
          <RefreshCw /> Sync now
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void supabaseBrowser()?.auth.signOut()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
