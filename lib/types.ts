export interface Grade {
    subject: string;
    teacher: string;
    semester: string | null;
    credits: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'F' | 'P' | null; // null = OCRで成績未検出（レビューで要入力）
    year: number;
    courseCode?: string;
    /** subjects テーブルの category カラム（例: "liberal-arts", "language-1st" 等） */
    category?: string | null;
    categoryDetail?: string | null;
    categorySource?: 'university-csv' | 'university-image';
    passed?: boolean;
    /** Visible KOAN row number, used only to merge overlapping image crops. */
    sourceRow?: number;
}

export interface AnalysisResult {
    importInfo?: import('./credit-csv').ImportInfo;
    grades: Grade[];
    gpa: {
        cumulative: number;
        semesters: { [key: string]: number };
    };
    earnedCredits: number;
    graduationRequirement: {
        total: number;
        current: number;
        percentage: number;
    };
}

export type Faculty =
    | '文学部'
    | '人間科学部'
    | '外国語学部'
    | '法学部'
    | '経済学部'
    | '理学部'
    | '医学部'
    | '医学部（保健学科）'
    | '歯学部'
    | '薬学部'
    | '工学部'
    | '基礎工学部';

export const FACULTY_OPTIONS: Faculty[] = [
    '文学部',
    '人間科学部',
    '外国語学部',
    '法学部',
    '経済学部',
    '理学部',
    '医学部',
    '医学部（保健学科）',
    '歯学部',
    '薬学部',
    '工学部',
    '基礎工学部',
];

export interface SubmissionPayload {
    session_id: string;
    faculty: Faculty | '';
    grades: Grade[];
    session_gpa: number;
}

export interface HardCourse {
    subject_name: string;
    failRate: number;
    totalCount: number;
}

export interface AggregateStats {
    totalParticipants: number;
    averageGpa: number;
    stdDev: number;
    userPercentile: number | null;
    facultyBreakdown: Record<string, number>;
    facultyGpaBreakdown: Record<string, number>;
    hardCourses: HardCourse[];
}
