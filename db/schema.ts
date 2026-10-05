import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

/**
 * Supabase tables (PHASE-2 §1). Drizzle is used for migrations only; the browser talks to
 * Supabase through RLS, and row shapes are validated with zod (lib/schema/remote.ts).
 */

/** RLS: a signed-in user can only see and change their own rows. */
const ownRows = (userId: AnyPgColumn, ops: "all" | "select" = "all") =>
  pgPolicy(`own rows (${ops})`, {
    for: ops,
    to: authenticatedRole,
    using: sql`${userId} = ${authUid}` as SQL,
    ...(ops === "all" ? { withCheck: sql`${userId} = ${authUid}` as SQL } : {}),
  });

const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey(),
    userId: userId(),
    problemId: text("problem_id").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    durationSec: integer("duration_sec"),
    requirements: jsonb("requirements"),
    estimation: jsonb("estimation"),
    entities: jsonb("entities"),
    apis: jsonb("apis"),
    /** Compact StoredGraph (lib/graph/codec.ts), not React Flow's shape. */
    graph: jsonb("graph"),
    graphHash: text("graph_hash"),
    testsPassed: integer("tests_passed"),
    testsTotal: integer("tests_total"),
    hintsUsed: integer("hints_used").default(0),
    solutionViewedBeforeSubmit: boolean("solution_viewed_before_submit").default(false),
    points: integer("points"),
    /** Workspace UI state that should follow the user across devices (stage, timer, test run...). */
    clientState: jsonb("client_state"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("attempts_status_check", sql`${t.status} in ('in_progress', 'submitted')`),
    index("attempts_user_updated_idx").on(t.userId, t.updatedAt),
    ownRows(t.userId),
  ],
).enableRLS();

/** AI review cache: one row per (user, design hash, model). */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    attemptId: uuid("attempt_id").references(() => attempts.id, { onDelete: "cascade" }),
    graphHash: text("graph_hash").notNull(),
    model: text("model").notNull(),
    overall: integer("overall"),
    level: text("level"),
    scores: jsonb("scores"),
    issues: jsonb("issues"),
    followUps: jsonb("follow_ups"),
    /** The parsed review as the app shows it (no raw prompts or responses). */
    review: jsonb("review"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("reviews_cache_key").on(t.userId, t.graphHash, t.model), ownRows(t.userId)],
).enableRLS();

/** Best result per problem; drives points and mastery. */
export const progress = pgTable(
  "progress",
  {
    userId: userId(),
    problemId: text("problem_id").notNull(),
    bestPoints: integer("best_points").default(0),
    bestRatio: real("best_ratio").default(0),
    solvedAt: timestamp("solved_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.problemId] }), ownRows(t.userId)],
).enableRLS();

export const mySolutions = pgTable(
  "my_solutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    problemId: text("problem_id").notNull(),
    title: text("title"),
    graph: jsonb("graph"),
    apis: jsonb("apis"),
    entities: jsonb("entities"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [ownRows(t.userId)],
).enableRLS();

/** Daily AI budget. Users may read their own usage; only the server (service role) writes it. */
export const aiUsage = pgTable(
  "ai_usage",
  {
    userId: userId(),
    day: date("day").notNull(),
    calls: integer("calls").default(0),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), ownRows(t.userId, "select")],
).enableRLS();
