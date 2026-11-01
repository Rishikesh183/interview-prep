import { useAuth } from "@/components/auth/useAuth";
import { supabaseBrowser } from "@/lib/supabase/browser";

export class SubmissionAuthError extends Error {
  constructor(message = "Sign in to submit this attempt. Your draft is saved in this browser.") {
    super(message);
    this.name = "SubmissionAuthError";
  }
}

/** Rechecked after asynchronous work so sign-out/account changes cannot submit a stale draft. */
export function assertSubmissionUser(userId?: string): string {
  const auth = useAuth.getState();
  if (auth.status !== "signed-in" || !auth.user?.id || (userId && auth.user.id !== userId))
    throw new SubmissionAuthError();
  return auth.user.id;
}

/** A UI flag alone is insufficient: validate the session with Supabase before scoring/locking. */
export async function verifySubmissionUser(): Promise<string> {
  const userId = assertSubmissionUser();
  const client = supabaseBrowser();
  if (!client) throw new SubmissionAuthError();
  let result;
  try {
    result = await client.auth.getUser();
  } catch {
    throw new SubmissionAuthError(
      "Couldn't verify your sign-in. Check your connection and try again. Your draft is saved.",
    );
  }
  if (result.error || !result.data.user) {
    if (
      result.error &&
      ![401, 403].includes(result.error.status ?? 0) &&
      result.error.name !== "AuthSessionMissingError"
    )
      throw new SubmissionAuthError(
        "Couldn't verify your sign-in. Check your connection and try again. Your draft is saved.",
      );
    throw new SubmissionAuthError();
  }
  if (result.data.user.id !== userId) throw new SubmissionAuthError();
  return assertSubmissionUser(userId);
}
