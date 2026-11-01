import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MySolutionRowSchema,
  ProgressRowSchema,
  type MySolutionRow,
  type ProgressRow,
} from "@/lib/schema";
import type { RemoteProfile } from "./engine";

/** Only best progress and explicitly saved solutions are transported. RLS scopes rows. */
export function supabaseRemote(client: SupabaseClient): RemoteProfile {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`Sync ${what} failed: ${error.message}`);
  };

  return {
    async listProgress() {
      const { data, error } = await client.from("progress").select("*");
      fail("progress pull", error);
      return (data ?? []).flatMap((row) => {
        const parsed = ProgressRowSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      });
    },
    async upsertProgress(rows: ProgressRow[]) {
      const { error } = await client
        .from("progress")
        .upsert(rows, { onConflict: "user_id,problem_id" });
      fail("progress push", error);
    },
    async listMySolutions() {
      const { data, error } = await client.from("my_solutions").select("*");
      fail("solutions pull", error);
      return (data ?? []).flatMap((row) => {
        const parsed = MySolutionRowSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      });
    },
    async upsertMySolutions(rows: MySolutionRow[]) {
      const { error } = await client.from("my_solutions").upsert(rows, { onConflict: "id" });
      fail("solutions push", error);
    },
    async removeMySolutions(ids) {
      const { error } = await client.from("my_solutions").delete().in("id", ids);
      fail("solutions delete", error);
    },
  };
}
