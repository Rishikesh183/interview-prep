import { useAuth } from "@/components/auth/useAuth";
import { supabaseBrowser } from "@/lib/supabase/browser";

export class SolutionAuthError extends Error {
  constructor(message = "Sign in to view solutions. Your draft stays saved in this browser.") {
    super(message);
    this.name = "SolutionAuthError";
  }
}

export function assertSolutionUser(expectedId?: string): string {
  const { status, user } = useAuth.getState();
  if (status !== "signed-in" || !user?.id || (expectedId && expectedId !== user.id))
    throw new SolutionAuthError();
  return user.id;
}

/** Early unlock may forfeit points only for a still-signed-in, verified identity. */
export async function verifySolutionUser(): Promise<string> {
  const userId = assertSolutionUser();
  const client = supabaseBrowser();
  if (!client) throw new SolutionAuthError();
  let identity;
  try {
    identity = await client.auth.getUser();
  } catch {
    throw new SolutionAuthError(
      "Couldn't verify your sign-in. Check your connection and try unlocking again.",
    );
  }
  if (identity.error || identity.data.user?.id !== userId) throw new SolutionAuthError();
  return assertSolutionUser(userId);
}
