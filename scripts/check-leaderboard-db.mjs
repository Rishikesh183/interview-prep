import assert from "node:assert/strict";
import fs from "node:fs/promises";
import postgres from "postgres";

// Run with: node --env-file=.env scripts/check-leaderboard-db.mjs
// All fixtures and the test function live in pg_temp, never public/auth tables.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the SQL check.");
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
try {
  const source = await fs.readFile(
    new URL("../db/migrations/0005_all_time_leaderboard.sql", import.meta.url),
    "utf8",
  );
  await sql.begin(async (tx) => {
    await tx.unsafe(
      "CREATE TEMP TABLE leaderboard_test_users (id uuid PRIMARY KEY, raw_user_meta_data jsonb) ON COMMIT DROP",
    );
    await tx.unsafe(
      "CREATE TEMP TABLE leaderboard_test_progress (user_id uuid, problem_id text, best_points integer, best_ratio real DEFAULT 0, solved_at timestamptz, PRIMARY KEY (user_id, problem_id)) ON COMMIT DROP",
    );
    await tx.unsafe(
      "CREATE TRIGGER test_keep_best BEFORE UPDATE ON leaderboard_test_progress FOR EACH ROW EXECUTE FUNCTION public.progress_keep_best()",
    );
    await tx.unsafe(
      source
        .split("--> statement-breakpoint")[0]
        .replace("public.all_time_leaderboard", "pg_temp.leaderboard_test")
        .replaceAll("public.progress", "pg_temp.leaderboard_test_progress")
        .replaceAll("auth.users", "pg_temp.leaderboard_test_users"),
    );
    const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const catalog = [
      { problem_id: "a", max_points: 10 },
      { problem_id: "b", max_points: 20 },
      { problem_id: "c", max_points: 40 },
    ];
    const board = async (viewer) =>
      (await tx`SELECT pg_temp.leaderboard_test(${tx.json(catalog)}, ${viewer}::uuid) AS result`)[0]
        .result;
    assert.deepEqual(await board(id(1)), {
      entries: [],
      current_user: null,
      total_participants: 0,
    });
    for (const [n, meta] of [
      [1, { user_name: "Ada" }],
      [2, { full_name: "Grace" }],
      [3, { name: "private@example.test" }],
      [4, {}],
      [5, { name: "Unknown-only" }],
    ]) {
      await tx`INSERT INTO leaderboard_test_users VALUES (${id(n)}::uuid, ${tx.json(meta)})`;
    }
    for (const [user, problem, points, solved] of [
      [1, "a", 10, true],
      [1, "b", 20, true],
      [2, "c", 30, true],
      [3, "c", 999, false],
      [4, "a", -9, false],
      [5, "unknown", 1000000, true],
    ]) {
      await tx`INSERT INTO leaderboard_test_progress (user_id, problem_id, best_points, solved_at) VALUES (${id(user)}::uuid, ${problem}, ${points}, ${solved ? "2026-11-02T00:00:00Z" : null}::timestamptz)`;
    }
    let result = await board(id(1));
    assert.equal(result.total_participants, 4);
    assert.deepEqual(
      result.entries.map((e) => [e.rank, e.total_points]),
      [
        [1, 40],
        [2, 30],
        [2, 30],
        [4, 0],
      ],
    );
    assert.equal(result.current_user.display_name, "Ada");
    assert.equal(result.current_user.solved_count, 2);
    assert.equal(result.current_user.attempted_count, 2);
    assert.ok(!JSON.stringify(result).includes("@"), "Email-like names must fall back to an alias");
    await tx`UPDATE leaderboard_test_progress SET best_points = 1 WHERE user_id = ${id(1)}::uuid AND problem_id = 'a'`;
    assert.equal(
      (await board(id(1))).current_user.total_points,
      30,
      "A worse retake must not lower the best score",
    );
    await tx`UPDATE leaderboard_test_progress SET best_points = 40 WHERE user_id = ${id(1)}::uuid AND problem_id = 'a'`;
    assert.equal(
      (await board(id(1))).current_user.total_points,
      30,
      "A question contributes no more than its current point cap",
    );
    for (let n = 10; n < 130; n++) {
      await tx`INSERT INTO leaderboard_test_users VALUES (${id(n)}::uuid, ${tx.json({ user_name: `Designer ${n}` })})`;
      await tx`INSERT INTO leaderboard_test_progress (user_id, problem_id, best_points) VALUES (${id(n)}::uuid, 'a', 5)`;
    }
    result = await board(id(4));
    assert.equal(result.entries.length, 100);
    assert.equal(result.total_participants, 124);
    assert.equal(result.current_user.rank, 124);
    assert.ok(!result.entries.some((entry) => entry.user_id === id(4)));
  });
  console.log(
    "Leaderboard SQL passed: aggregation, ties, caps, best-retake preservation, aliases, empty board and own rank outside top 100. Temporary fixtures only.",
  );
} catch (error) {
  console.error("Leaderboard SQL check failed", {
    code: error.code,
    message: error instanceof assert.AssertionError ? error.message : "Database operation failed",
  });
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
