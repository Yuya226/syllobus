-- collectionRate（母数15000のハードコードに基づく仮の回収率）を削除。
-- UIでは未使用のため、関数の返却値から除外する。
--
-- Run this in Supabase SQL Editor or via `supabase db push`.

CREATE OR REPLACE FUNCTION get_aggregate_stats(user_gpa float8 DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result jsonb;
BEGIN
    WITH sessions AS (
        -- One row per session_id to avoid double-counting re-uploads.
        SELECT DISTINCT ON (session_id) session_id, faculty, session_gpa
        FROM grade_submissions
        ORDER BY session_id
    ),
    session_agg AS (
        SELECT
            COUNT(*)::int                                                              AS total_participants,
            ROUND(AVG(session_gpa)::numeric, 2)                                       AS average_gpa,
            ROUND(STDDEV_POP(session_gpa)::numeric, 3)                                AS std_dev,
            CASE
                WHEN user_gpa IS NULL THEN 50
                ELSE (100 - ROUND(
                    100.0 * COUNT(*) FILTER (WHERE session_gpa <= user_gpa)
                    / NULLIF(COUNT(*), 0)
                ))::int
            END AS user_percentile
        FROM sessions
    ),
    faculty_counts AS (
        SELECT faculty, COUNT(*)::int AS cnt
        FROM sessions
        GROUP BY faculty
    ),
    faculty_gpas AS (
        SELECT faculty, ROUND(AVG(session_gpa)::numeric, 2) AS avg_gpa
        FROM sessions
        GROUP BY faculty
    ),
    deduped_courses AS (
        SELECT DISTINCT ON (session_id, subject_name) session_id, subject_name, grade
        FROM grade_submissions
        WHERE subject_name IS NOT NULL AND grade IS NOT NULL
        ORDER BY session_id, subject_name
    ),
    course_agg AS (
        SELECT
            subject_name,
            COUNT(*)::int                                                              AS total_count,
            ROUND(COUNT(*) FILTER (WHERE grade = 'F')::numeric / COUNT(*), 2)         AS fail_rate
        FROM deduped_courses
        GROUP BY subject_name
        HAVING COUNT(*) >= 3
    )
    SELECT jsonb_build_object(
        'totalParticipants', sa.total_participants,
        'averageGpa',        sa.average_gpa,
        'stdDev',            sa.std_dev,
        'userPercentile',    sa.user_percentile,
        'facultyBreakdown',  (SELECT jsonb_object_agg(faculty, cnt)     FROM faculty_counts),
        'facultyGpaBreakdown', (SELECT jsonb_object_agg(faculty, avg_gpa) FROM faculty_gpas),
        'hardCourses',       COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'subject_name', subject_name,
                'failRate',     fail_rate,
                'totalCount',   total_count
            ) ORDER BY fail_rate DESC)
            FROM (SELECT * FROM course_agg ORDER BY fail_rate DESC LIMIT 10) top),
            '[]'::jsonb
        )
    )
    INTO result
    FROM session_agg sa;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
