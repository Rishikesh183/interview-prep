"use client";

import { Loader2, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured, safeNext } from "@/lib/supabase/config";

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    params.get("error") ? "error" : "idle",
  );
  const [message, setMessage] = useState(params.get("error") ? "Sign-in failed. Try again." : "");

  if (!isSupabaseConfigured) {
    return (
      <p className="text-muted-foreground text-sm">
        Accounts aren&apos;t set up for this deployment, so everything is saved in this browser
        only. To enable sign-in and sync, set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
      </p>
    );
  }

  const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const github = async () => {
    const { error } = await supabaseBrowser()!.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: callback },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    }
  };

  const magicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await supabaseBrowser()!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else setState("sent");
  };

  return (
    <div className="space-y-6">
      <Button className="w-full" onClick={() => void github()}>
        <GithubMark /> Continue with GitHub
      </Button>

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" /> or <span className="bg-border h-px flex-1" />
      </div>

      {state === "sent" ? (
        <p className="rounded-md border p-3 text-sm">
          Check <strong>{email}</strong> for a sign-in link. Open it in this browser.
        </p>
      ) : (
        <form onSubmit={(e) => void magicLink(e)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={state === "sending"}>
            {state === "sending" ? <Loader2 className="animate-spin" /> : <Mail />} Email me a
            sign-in link
          </Button>
        </form>
      )}
      {state === "error" && <p className="text-destructive text-sm">{message}</p>}
    </div>
  );
}

/** GitHub's mark (lucide no longer ships brand icons). */
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
