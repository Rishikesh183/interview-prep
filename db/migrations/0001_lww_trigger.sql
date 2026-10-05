-- Last-write-wins (PHASE-2 §1), enforced by the database: an upsert that carries an older
-- updated_at than the stored row is silently ignored, so a slow device can't clobber newer work.
CREATE OR REPLACE FUNCTION public.attempts_keep_newest() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN NULL; -- skip this update, keep the newer row
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS attempts_keep_newest ON public.attempts;
--> statement-breakpoint
CREATE TRIGGER attempts_keep_newest
  BEFORE UPDATE ON public.attempts
  FOR EACH ROW EXECUTE FUNCTION public.attempts_keep_newest();
