-- Apply before deploying the updated save API. No existing rows are removed.
BEGIN;
ALTER TABLE public.grade_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grade_submissions FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_aggregate_stats(float8) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aggregate_stats(float8) TO service_role;

CREATE OR REPLACE FUNCTION public.replace_session_grades(target_session uuid, new_rows jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(target_session::text, 0));
    IF jsonb_typeof(new_rows) <> 'array' OR jsonb_array_length(new_rows) NOT BETWEEN 1 AND 500 THEN
        RAISE EXCEPTION 'Invalid rows';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(new_rows) r WHERE (r->>'session_id')::uuid IS DISTINCT FROM target_session) THEN
        RAISE EXCEPTION 'Session mismatch';
    END IF;
    DELETE FROM public.grade_submissions WHERE session_id = target_session;
    INSERT INTO public.grade_submissions (session_id, faculty, subject_name, course_code, grade, credits, year, session_gpa, parser_version)
    SELECT session_id, faculty, subject_name, course_code, grade, credits, year, session_gpa, parser_version
    FROM jsonb_populate_recordset(NULL::public.grade_submissions, new_rows)
    ON CONFLICT (session_id, subject_name, year, grade) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_session_grades(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_session_grades(uuid, jsonb) TO service_role;
COMMIT;
