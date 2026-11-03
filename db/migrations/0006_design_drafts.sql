-- One current editable design per user/question. Full attempt history remains device-local.
CREATE TABLE public.design_drafts (
  user_id uuid NOT NULL CONSTRAINT design_drafts_user_id_users_id_fk REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object' AND content->>'v' = '1'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id),
  CONSTRAINT design_drafts_size CHECK (octet_length(content::text) <= 1048576)
);
--> statement-breakpoint
ALTER TABLE public.design_drafts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "own rows (select)" ON public.design_drafts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
--> statement-breakpoint
REVOKE ALL ON public.design_drafts FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.design_drafts TO authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.save_design_draft(p_problem_id text, p_content jsonb, p_base_revision integer, p_expected_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE who uuid := auth.uid(); saved public.design_drafts;
BEGIN
  IF who IS NULL OR who IS DISTINCT FROM p_expected_user THEN RAISE EXCEPTION 'Sign in to the expected account to save a design' USING ERRCODE = '42501'; END IF;
  IF p_problem_id IS NULL OR p_problem_id !~ '^[a-z0-9-]{1,100}$' OR p_base_revision IS NULL OR p_base_revision < 0
    OR p_content IS NULL OR jsonb_typeof(p_content) <> 'object' OR p_content->>'v' IS DISTINCT FROM '1'
    OR jsonb_typeof(p_content->'graph') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_content->'graph'->'n') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_content->'graph'->'e') IS DISTINCT FROM 'array'
    OR p_content->'graph'->>'v' IS DISTINCT FROM '1'
    OR jsonb_typeof(p_content->'apis') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_content->'entities') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_content->'requirements') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_content->'estimation') IS DISTINCT FROM 'object'
    OR octet_length(p_content::text) > 1048576 THEN
    RAISE EXCEPTION 'Invalid design draft' USING ERRCODE = '22023';
  END IF;
  IF p_base_revision = 0 THEN
    INSERT INTO public.design_drafts(user_id, problem_id, content) VALUES (who, p_problem_id, p_content)
      ON CONFLICT (user_id, problem_id) DO NOTHING RETURNING * INTO saved;
  ELSE
    UPDATE public.design_drafts SET content = p_content, revision = revision + 1, updated_at = clock_timestamp()
      WHERE user_id = who AND problem_id = p_problem_id AND revision = p_base_revision RETURNING * INTO saved;
  END IF;
  IF saved.user_id IS NOT NULL THEN RETURN jsonb_build_object('outcome', 'saved', 'row', to_jsonb(saved)); END IF;
  SELECT * INTO saved FROM public.design_drafts WHERE user_id = who AND problem_id = p_problem_id;
  IF saved.user_id IS NULL THEN RAISE EXCEPTION 'Draft changed; refresh before saving' USING ERRCODE = '40001'; END IF;
  RETURN jsonb_build_object('outcome', 'conflict', 'row', to_jsonb(saved));
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.save_design_draft(text,jsonb,integer,uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.save_design_draft(text,jsonb,integer,uuid) TO authenticated;
--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
