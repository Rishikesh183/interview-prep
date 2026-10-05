-- Daily AI budget (PHASE-2 §2, layer 4). Only the server (service role) may call these:
-- a user can read their own ai_usage row but never raise their own limit.

-- Atomically takes one call from today's budget. Returns the new count, or NULL when the
-- limit was already reached (the row is left unchanged).
CREATE OR REPLACE FUNCTION public.reserve_ai_call(p_user uuid, p_day date, p_limit int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n int;
BEGIN
  IF p_limit <= 0 THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.ai_usage AS u (user_id, day, calls)
  VALUES (p_user, p_day, 1)
  ON CONFLICT (user_id, day) DO UPDATE
    SET calls = COALESCE(u.calls, 0) + 1
    WHERE COALESCE(u.calls, 0) < p_limit
  RETURNING u.calls INTO n;
  RETURN n;
END;
$$;
--> statement-breakpoint

-- Gives a reserved call back (the model call failed, so it shouldn't count).
CREATE OR REPLACE FUNCTION public.release_ai_call(p_user uuid, p_day date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.ai_usage
    SET calls = GREATEST(COALESCE(calls, 0) - 1, 0)
    WHERE user_id = p_user AND day = p_day;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.record_ai_tokens(p_user uuid, p_day date, p_input int, p_output int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.ai_usage
    SET input_tokens = COALESCE(input_tokens, 0) + GREATEST(p_input, 0),
        output_tokens = COALESCE(output_tokens, 0) + GREATEST(p_output, 0)
    WHERE user_id = p_user AND day = p_day;
$$;
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.reserve_ai_call(uuid, date, int) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.release_ai_call(uuid, date) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.record_ai_tokens(uuid, date, int, int) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.reserve_ai_call(uuid, date, int) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.release_ai_call(uuid, date) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_ai_tokens(uuid, date, int, int) TO service_role;
