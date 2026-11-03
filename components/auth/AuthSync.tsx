"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { startSync, stopSync } from "@/lib/sync/worker";
import { useAuth } from "./useAuth";

/** Tracks the Supabase session and runs the sync worker while signed in. Renders nothing. */
export function AuthSync() {
  useEffect(() => {
    const client = supabaseBrowser();
    if (!client) {
      useAuth.setState({ status: "disabled", user: null });
      return;
    }

    let currentUserId: string | null = null;
    let version = 0,
      disposed = false;
    const apply = (user: import("@supabase/supabase-js").User | null) => {
      useAuth.setState({ status: user ? "signed-in" : "signed-out", user });
      if (user?.id === currentUserId) return;
      currentUserId = user?.id ?? null;
      if (user) startSync(client, user.id);
      else stopSync();
    };

    const initialVersion = version;
    void client.auth
      .getUser()
      .then(({ data }) => {
        if (!disposed && version === initialVersion) apply(data.user);
      })
      .catch(() => {
        if (!disposed && version === initialVersion) apply(null);
      });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (disposed) return;
      version++;
      apply(session?.user ?? null);
    });
    return () => {
      disposed = true;
      data.subscription.unsubscribe();
      stopSync();
    };
  }, []);

  return null;
}
