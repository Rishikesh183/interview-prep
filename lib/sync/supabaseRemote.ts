import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  AttemptRowSchema,
  AttemptStampSchema,
  MySolutionRowSchema,
  ProgressRowSchema,
  type AttemptRow,
  type MySolutionRow,
  type ProgressRow,
} from "@/lib/schema";
import type { RemoteAttempts } from "./engine";

const PAGE = 1000;

/** Attempts table over PostgREST. RLS limits every query to the signed-in user's rows. */
export function supabaseRemote(client: SupabaseClient): RemoteAttempts {
  const table = () => client.from("attempts");
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`Sync ${what} failed: ${error.message}`);
  };

  return {
    async listStamps() {
      const out: { id: string; updatedAt: number }[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await table()
          .select("id, updated_at")
          .order("id")
          .range(from, from + PAGE - 1);
        fail("list", error);
        const rows = z.array(AttemptStampSchema).parse(data ?? []);
        out.push(...rows.map((r) => ({ id: r.id, updatedAt: new Date(r.updated_at).getTime() })));
        if (rows.length < PAGE) return out;
      }
    },
    async fetch(ids) {
      const { data, error } = await table().select("*").in("id", ids);
      fail("pull", error);
      // Skip (don't crash on) rows written by an incompatible future version.
      return (data ?? []).flatMap((row) => {
        const parsed = AttemptRowSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      });
    },
    async upsert(rows: AttemptRow[]) {
      const { error } = await table().upsert(rows, { onConflict: "id" });
      fail("push", error);
    },
    async remove(ids) {
      const { error } = await table().delete().in("id", ids);
      fail("delete", error);
    },
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
