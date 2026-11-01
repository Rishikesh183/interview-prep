-- Aggregate existing best-progress rows; no attempt history, new score table or profile copy.
-- Only the server service role can execute this function. Browser clients retain own-row RLS.
CREATE OR REPLACE FUNCTION public.all_time_leaderboard(p_catalog jsonb, p_viewer uuid)
RETURNS jsonb
-- Definer access is limited to this fixed aggregate: service_role cannot read auth.users directly.
-- No dynamic SQL; empty search_path; execute is revoked from all browser roles below.
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH catalog AS (
    SELECT problem_id, max_points
    FROM pg_catalog.jsonb_to_recordset(p_catalog) AS c(problem_id text, max_points integer)
    WHERE max_points > 0
  ), totals AS (
    SELECT p.user_id,
      SUM(LEAST(GREATEST(COALESCE(p.best_points, 0), 0), c.max_points))::integer AS total_points,
      COUNT(*) FILTER (WHERE p.solved_at IS NOT NULL)::integer AS solved_count,
      COUNT(*)::integer AS attempted_count
    FROM public.progress AS p
    JOIN catalog AS c ON c.problem_id = p.problem_id
    GROUP BY p.user_id
  ), named AS (
    SELECT t.*, LEFT(COALESCE(
      NULLIF(BTRIM(u.raw_user_meta_data->>'user_name'), ''),
      NULLIF(BTRIM(u.raw_user_meta_data->>'preferred_username'), ''),
      NULLIF(BTRIM(u.raw_user_meta_data->>'display_name'), ''),
      NULLIF(BTRIM(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(BTRIM(u.raw_user_meta_data->>'name'), '')
    ), 60) AS proposed_name
    FROM totals AS t
    JOIN auth.users AS u ON u.id = t.user_id
  ), ranked AS (
    SELECT user_id,
      CASE WHEN proposed_name IS NULL OR POSITION('@' IN proposed_name) > 0
        THEN 'Designer ' || LEFT(user_id::text, 8)
        ELSE proposed_name END AS display_name,
      total_points, solved_count, attempted_count,
      RANK() OVER (ORDER BY total_points DESC)::integer AS rank
    FROM named
  ), leaders AS (
    SELECT * FROM ranked
    ORDER BY rank, solved_count DESC, display_name, user_id
    LIMIT 100
  )
  SELECT pg_catalog.jsonb_build_object(
    'entries', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(l)
      ORDER BY l.rank, l.solved_count DESC, l.display_name, l.user_id) FROM leaders AS l), '[]'::jsonb),
    'current_user', (SELECT pg_catalog.to_jsonb(r) FROM ranked AS r WHERE r.user_id = p_viewer),
    'total_participants', (SELECT COUNT(*) FROM ranked)
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.all_time_leaderboard(jsonb, uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.all_time_leaderboard(jsonb, uuid) TO service_role;
--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
