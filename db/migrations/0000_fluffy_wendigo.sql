CREATE TABLE "ai_usage" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"calls" integer DEFAULT 0,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	CONSTRAINT "ai_usage_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"duration_sec" integer,
	"requirements" jsonb,
	"estimation" jsonb,
	"entities" jsonb,
	"apis" jsonb,
	"graph" jsonb,
	"graph_hash" text,
	"tests_passed" integer,
	"tests_total" integer,
	"hints_used" integer DEFAULT 0,
	"solution_viewed_before_submit" boolean DEFAULT false,
	"points" integer,
	"client_state" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_status_check" CHECK ("attempts"."status" in ('in_progress', 'submitted'))
);
--> statement-breakpoint
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "my_solutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"title" text,
	"graph" jsonb,
	"apis" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "my_solutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "progress" (
	"user_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"best_points" integer DEFAULT 0,
	"best_ratio" real DEFAULT 0,
	"solved_at" timestamp with time zone,
	CONSTRAINT "progress_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
ALTER TABLE "progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_id" uuid,
	"graph_hash" text NOT NULL,
	"model" text NOT NULL,
	"overall" integer,
	"level" text,
	"scores" jsonb,
	"issues" jsonb,
	"follow_ups" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reviews_cache_key" UNIQUE("user_id","graph_hash","model")
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "my_solutions" ADD CONSTRAINT "my_solutions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_user_updated_idx" ON "attempts" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE POLICY "own rows (select)" ON "ai_usage" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("ai_usage"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "own rows (all)" ON "attempts" AS PERMISSIVE FOR ALL TO "authenticated" USING ("attempts"."user_id" = (select auth.uid())) WITH CHECK ("attempts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "own rows (all)" ON "my_solutions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("my_solutions"."user_id" = (select auth.uid())) WITH CHECK ("my_solutions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "own rows (all)" ON "progress" AS PERMISSIVE FOR ALL TO "authenticated" USING ("progress"."user_id" = (select auth.uid())) WITH CHECK ("progress"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "own rows (all)" ON "reviews" AS PERMISSIVE FOR ALL TO "authenticated" USING ("reviews"."user_id" = (select auth.uid())) WITH CHECK ("reviews"."user_id" = (select auth.uid()));