CREATE TABLE credit_snapshots (
 session_id TEXT PRIMARY KEY,
 faculty TEXT NOT NULL,
 grades TEXT NOT NULL CHECK(json_valid(grades) AND json_array_length(grades) BETWEEN 1 AND 500),
 profile TEXT NOT NULL CHECK(json_valid(profile)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE grade_submissions (
 id INTEGER PRIMARY KEY,
 session_id TEXT NOT NULL,
 faculty TEXT NOT NULL,
 subject_name TEXT NOT NULL,
 course_code TEXT,
 grade TEXT NOT NULL,
 credits REAL NOT NULL CHECK(credits>0),
 year INTEGER NOT NULL,
 session_gpa REAL NOT NULL,
 parser_version INTEGER NOT NULL,
 UNIQUE(session_id,subject_name,year,grade)
);
CREATE INDEX grades_session ON grade_submissions(session_id);
CREATE INDEX grades_code ON grade_submissions(course_code);
CREATE INDEX grades_subject ON grade_submissions(subject_name);
CREATE TABLE subjects (
 id INTEGER PRIMARY KEY,
 code TEXT,
 name TEXT NOT NULL,
 category TEXT,
 credits REAL,
 teacher TEXT,
 semester TEXT,
 source TEXT NOT NULL,
 year INTEGER
);
CREATE INDEX subjects_code ON subjects(code,year);
