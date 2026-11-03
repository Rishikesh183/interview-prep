import assert from "node:assert/strict";
import fs from "node:fs/promises";
import postgres from "postgres";

// DATABASE_URL is required. Fixtures/function live in pg_temp; no public/auth records are inserted.
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
try {
  const source = await fs.readFile(new URL("../db/migrations/0006_design_drafts.sql", import.meta.url), "utf8");
  const fn = source.split("--> statement-breakpoint").find((part) => part.includes("CREATE OR REPLACE FUNCTION"));
  assert.ok(fn);
  await sql.begin(async (tx) => {
    await tx.unsafe("CREATE TEMP TABLE draft_sync_test (user_id uuid, problem_id text, revision integer NOT NULL DEFAULT 1, content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,problem_id)) ON COMMIT DROP");
    await tx.unsafe(fn.replaceAll("public.save_design_draft", "pg_temp.save_draft_test").replaceAll("public.design_drafts", "pg_temp.draft_sync_test"));
    const alice = "11111111-1111-4111-8111-111111111111", bob = "22222222-2222-4222-8222-222222222222";
    const content = { v: 1, graph: { v: 1, n: [], e: [] }, apis: [], entities: [], requirements: {}, estimation: {}, stage: "design", hintsRevealed: 0, solutionViewedBeforeSubmit: false };
    const save = async (connection, revision, expected, value = content) => (await connection`SELECT pg_temp.save_draft_test('rate-limiter', ${connection.json(value)}, ${revision}, ${expected}::uuid) AS result`)[0].result;
    await tx`SELECT set_config('request.jwt.claim.sub', ${alice}, true)`;
    let result = await save(tx, 0, alice); assert.equal(result.outcome, "saved"); assert.equal(result.row.revision, 1);
    result = await save(tx, 0, alice); assert.equal(result.outcome, "conflict"); assert.equal(result.row.revision, 1);
    result = await save(tx, 1, alice, { ...content, stage: "apis" }); assert.equal(result.outcome, "saved"); assert.equal(result.row.revision, 2);
    result = await save(tx, 1, alice); assert.equal(result.outcome, "conflict"); assert.equal(result.row.content.stage, "apis");
    await assert.rejects(tx.savepoint((sp) => save(sp, 2, bob)), (error) => error.code === "42501");
    await assert.rejects(tx.savepoint((sp) => save(sp, 2, alice, { ...content, graph: {} })), (error) => error.code === "22023");
    await assert.rejects(tx.savepoint((sp) => save(sp, 2, alice, { ...content, extra: "x".repeat(1048576) })), (error) => error.code === "22023");
    await tx`SELECT set_config('request.jwt.claim.sub', ${bob}, true)`;
    result = await save(tx, 0, bob); assert.equal(result.row.revision, 1); assert.equal(result.row.user_id, bob);
    assert.equal((await tx`SELECT count(*)::integer AS count FROM draft_sync_test`)[0].count, 2);
    await tx`SELECT set_config('request.jwt.claim.sub', '', true)`;
    await assert.rejects(tx.savepoint((sp) => save(sp, 0, alice)), (error) => error.code === "42501");
  });
  console.log("Draft SQL passed: revision CAS, stale-write conflict, separate accounts, expected-account fence, anonymous rejection, malformed/oversized payloads. Temporary fixtures only.");
} catch (error) {
  console.error("Draft SQL check failed", { code: error.code, message: error instanceof assert.AssertionError ? error.message : "Database operation failed" });
  process.exitCode = 1;
} finally { await sql.end({ timeout: 2 }); }
