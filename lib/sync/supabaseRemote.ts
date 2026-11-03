import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MySolutionRowSchema,
  ProgressRowSchema,
  DraftRowSchema,
  DraftWriteResultSchema,
  type MySolutionRow,
  type ProgressRow,
} from "@/lib/schema";
import type { RemoteProfile } from "./engine";

/** Only best progress and explicitly saved solutions are transported. RLS scopes rows. */
export function supabaseRemote(client: SupabaseClient, userId: string): RemoteProfile {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`Sync ${what} failed: ${error.message}`);
  };

  return {
    async listDrafts() {
      const { data, error } = await client.from("design_drafts").select("*").eq("user_id", userId);
      fail("draft pull (check design_drafts migration)", error);
      return (data ?? []).map((r) => DraftRowSchema.parse(r));
    },
    async saveDraft(problemId, content, revision, expectedUser) {
      const { data, error } = await client.rpc("save_design_draft", {
        p_problem_id: problemId,
        p_content: content,
        p_base_revision: revision,
        p_expected_user: expectedUser,
      });
      fail("draft save (check design_drafts migration)", error);
      return DraftWriteResultSchema.parse(data);
    },
    async listProgress() {
      const { data, error } = await client.from("progress").select("*").eq("user_id", userId);
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
      const { data, error } = await client.from("my_solutions").select("*").eq("user_id", userId);
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
