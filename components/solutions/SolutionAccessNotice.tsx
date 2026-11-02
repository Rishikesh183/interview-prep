"use client";

import Link from "next/link";
import { Loader2, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/components/auth/useAuth";

export function SolutionSignIn({
  status,
  returnTo,
}: {
  status: AuthState["status"];
  returnTo: string;
}) {
  if (status === "loading")
    return (
      <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Checking sign-in…
      </p>
    );
  return (
    <section className="space-y-3 rounded-lg border border-dashed p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <Lock className="size-4" /> Sign in to view solutions
      </h2>
      <p className="text-muted-foreground text-sm">
        {status === "disabled"
          ? "Sign-in is not configured for this deployment. Practice and design checks are available; viewing solutions requires an account."
          : "Reference solutions require a signed-in account, even if you unlocked or submitted this question before. Your draft stays saved in this browser."}
      </p>
      {status !== "disabled" && (
        <Button asChild size="sm">
          <Link href={`/login?next=${encodeURIComponent(returnTo)}`}>
            <LogIn /> Sign in to view solutions
          </Link>
        </Button>
      )}
    </section>
  );
}

export function SolutionLoading({ error, retry }: { error?: string; retry: () => void }) {
  return error ? (
    <section role="alert" className="space-y-3 rounded-lg border p-4">
      <p className="text-sm">{error}</p>
      <Button size="sm" variant="outline" onClick={retry}>
        Try again
      </Button>
    </section>
  ) : (
    <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="size-4 animate-spin" /> Loading solutions…
    </p>
  );
}
