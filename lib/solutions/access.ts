import type { AuthState } from "@/components/auth/useAuth";

/** Local history/peek flags never override an absent account, including after sign-out. */
export function solutionAccess(
  status: AuthState["status"],
  userId: string | undefined,
  eligible: boolean | undefined,
): boolean | undefined {
  if (status === "loading") return undefined;
  if (status !== "signed-in" || !userId) return false;
  return eligible;
}
