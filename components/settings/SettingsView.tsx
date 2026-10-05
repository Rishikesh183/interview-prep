"use client";

import { LogIn, LogOut, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Button } from "@/components/ui/button";
import { refreshAiUsage, useAiUsage } from "@/lib/ai/useAiUsage";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { syncNow, useSyncStatus } from "@/lib/sync/worker";

/** AI model, daily budget and account (PHASE-2 §8). Secrets are never shown, only model names. */
export function SettingsView() {
  const usage = useAiUsage();
  const { status, user } = useAuth();
  const sync = useSyncStatus();

  // Signing in or out changes the budget shown.
  useEffect(() => {
    void refreshAiUsage();
  }, [status]);

  return (
    <div className="space-y-8">
      <Card title="AI review">
        {usage === undefined ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !usage?.configured ? (
          <p className="text-sm">
            Not configured. Set <code className="font-mono">OPENROUTER_API_KEY</code> (and
            optionally <code className="font-mono">REVIEW_MODEL</code>) in{" "}
            <code className="font-mono">.env.local</code> and restart the server.
          </p>
        ) : (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
            <Row label="Review model" value={usage.models.review} mono />
            <Row
              label="Fallbacks"
              value={usage.models.fallbacks.length ? usage.models.fallbacks.join(", ") : "none"}
              mono
            />
            <Row
              label="Deep review model"
              value={usage.models.deep ?? "not set (DEEP_REVIEW_MODEL)"}
              mono
            />
            <Row label="Reasoning effort" value={usage.reasoningEffort} />
            <Row label="Follow-ups per attempt" value={String(usage.maxFollowUps)} />
            <Row
              label="Today's budget"
              value={
                !usage.enforced
                  ? "Unlimited (local-only mode, no account)"
                  : !usage.signedIn
                    ? `${usage.limit} calls a day once signed in`
                    : `${usage.remaining} of ${usage.limit} calls left (resets at midnight IST)`
              }
            />
          </dl>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          Re-reviewing an unchanged design is served from the cache and doesn&apos;t use a call.
          Model ids and the budget are set with environment variables on the server.
        </p>
      </Card>

      <Card title="Account">
        {status === "disabled" ? (
          <p className="text-sm">
            Local-only mode: everything is saved in this browser. Set the Supabase variables to
            enable sign-in and sync across devices.
          </p>
        ) : status === "loading" ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : status === "signed-out" ? (
          <div className="space-y-2 text-sm">
            <p>Not signed in. Your work is saved in this browser only.</p>
            <Button asChild size="sm">
              <Link href="/login?next=/settings">
                <LogIn /> Sign in
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[180px_1fr]">
              <Row label="Signed in as" value={user?.email ?? user?.id ?? ""} />
              <Row
                label="Sync"
                value={`${sync.status}${sync.lastSyncedAt ? ` · last ${new Date(sync.lastSyncedAt).toLocaleTimeString()}` : ""}${sync.error ? ` · ${sync.error}` : ""}`}
              />
            </dl>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void syncNow()}>
                <RefreshCw /> Sync now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void supabaseBrowser()?.auth.signOut()}
              >
                <LogOut /> Sign out
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : undefined}>{value}</dd>
    </>
  );
}
