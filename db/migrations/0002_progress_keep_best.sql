-- Progress only ever improves (PHASE-2 §3): an upsert keeps the best points/ratio and the
-- earliest solve time, so a worse re-submit (or a stale device) can never lower it.
CREATE OR REPLACE FUNCTION public.progress_keep_best() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.best_points := GREATEST(COALESCE(OLD.best_points, 0), COALESCE(NEW.best_points, 0));
  NEW.best_ratio := GREATEST(COALESCE(OLD.best_ratio, 0), COALESCE(NEW.best_ratio, 0));
  NEW.solved_at := CASE
    WHEN OLD.solved_at IS NULL THEN NEW.solved_at
    WHEN NEW.solved_at IS NULL THEN OLD.solved_at
    ELSE LEAST(OLD.solved_at, NEW.solved_at)
  END;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS progress_keep_best ON public.progress;
--> statement-breakpoint
CREATE TRIGGER progress_keep_best
  BEFORE UPDATE ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.progress_keep_best();
