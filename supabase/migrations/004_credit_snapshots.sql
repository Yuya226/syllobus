-- University-classified acquisition data is separate from legacy enrollment GPA/failure statistics.
BEGIN;
CREATE TABLE IF NOT EXISTS public.credit_snapshots (
 session_id uuid PRIMARY KEY,
 faculty text NOT NULL,
 grades jsonb NOT NULL CHECK (jsonb_typeof(grades) = 'array' AND jsonb_array_length(grades) BETWEEN 1 AND 500),
 profile jsonb NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.credit_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_snapshots TO service_role;
CREATE OR REPLACE FUNCTION public.replace_credit_snapshot(target_session uuid,payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(target_session::text,0));
 INSERT INTO public.credit_snapshots(session_id,faculty,grades,profile)
 VALUES(target_session,payload->>'faculty',payload->'grades',payload->'profile')
 ON CONFLICT(session_id) DO UPDATE SET faculty=EXCLUDED.faculty, grades=EXCLUDED.grades, profile=EXCLUDED.profile,updated_at=now();
 DELETE FROM public.grade_submissions WHERE session_id=target_session;
END; $$;
CREATE OR REPLACE FUNCTION public.delete_session_records(target_session uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(target_session::text,0));
 DELETE FROM public.credit_snapshots WHERE session_id=target_session;
 DELETE FROM public.grade_submissions WHERE session_id=target_session;
END; $$;
REVOKE ALL ON FUNCTION public.replace_credit_snapshot(uuid,jsonb), public.delete_session_records(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_credit_snapshot(uuid,jsonb), public.delete_session_records(uuid) TO service_role;
-- Legacy uploads replace a previous acquisition snapshot atomically too.
CREATE OR REPLACE FUNCTION public.clear_credit_snapshot_on_legacy_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 DELETE FROM public.credit_snapshots WHERE session_id=NEW.session_id;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clear_credit_snapshot_on_legacy_insert() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS clear_credit_snapshot ON public.grade_submissions;
CREATE TRIGGER clear_credit_snapshot BEFORE INSERT ON public.grade_submissions FOR EACH ROW EXECUTE FUNCTION public.clear_credit_snapshot_on_legacy_insert();
COMMIT;
