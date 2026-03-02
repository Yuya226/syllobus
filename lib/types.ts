export interface Grade {
    subject: string;
    teacher: string;
    semester: string;
    credits: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'F' | 'P'; // P = Pass (合)
    year: number;
}

export interface AnalysisResult {
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
