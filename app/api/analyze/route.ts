import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
// Initialize Google Cloud Vision Client
const client = new ImageAnnotatorClient({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, ''),
        project_id: process.env.GOOGLE_PROJECT_ID,
    },
});

// Annotations Helper
interface Vertex { x: number; y: number; }
interface BoundingPoly { vertices: Vertex[]; }
interface EntityAnnotation { description: string; boundingPoly: BoundingPoly; }

interface ParsedLine {
    words: { text: string, x: number, y: number, width: number }[];
    avgY: number;
}

// Define the structure for our Grade Data - Imported from lib/types
import { Grade, AnalysisResult } from '@/lib/types';
import { calculateGPA } from '@/lib/gpa';

function normalizeGrade(rawGrade: string, textAround: string): Grade['grade'] | null {
    let g = rawGrade.toUpperCase();

    // Heuristic fixes for OCR number/letter confusion
    if (g === '8') g = 'B';
    if (g === '6') g = 'S';
    if (g === '5') g = 'S';
    if (g === '0') g = 'C';

    if (['S', 'A', 'B', 'C', 'F'].includes(g)) return g as Grade['grade'];
    if (rawGrade.includes('合')) return 'P';

    return null;
}




function reconstructLinesFromAnnotations(annotations: any[]): ParsedLine[] {
    // Skip index 0 (full text)
    const words = annotations.slice(1).map(a => {
        const vertices = a.boundingPoly?.vertices || [];
        if (vertices.length < 4) return null;

        return {
            text: a.description,
            // Calculate mid-Y for grouping
            y: (vertices[0].y + vertices[2].y) / 2,
            // X for sorting and column detection
            x: vertices[0].x,
            width: vertices[1].x - vertices[0].x
        };
    }).filter(w => w !== null) as { text: string, x: number, y: number, width: number }[];

    // Sort by Y primarily
    words.sort((a, b) => a.y - b.y);

    const lines: ParsedLine[] = [];
    const LINE_HEIGHT_TOLERANCE = 15;

    for (const word of words) {
        let matchedLine = lines.find(line => Math.abs(line.avgY - word.y) < LINE_HEIGHT_TOLERANCE);

        if (matchedLine) {
            matchedLine.words.push(word);
            // weighted avg update
            matchedLine.avgY = (matchedLine.avgY * (matchedLine.words.length - 1) + word.y) / matchedLine.words.length;
        } else {
            lines.push({ words: [word], avgY: word.y });
        }
    }

    // Sort lines by Y
    lines.sort((a, b) => a.avgY - b.avgY);

    // Within each line, sort words left to right
    lines.forEach(line => {
        line.words.sort((a, b) => a.x - b.x);
    });

    return lines;
}

// Coordinate-based Parser with Dynamic Column Separation
function parseOCRText(annotations: any[]): Grade[] {
    // 1. Reconstruct lines with coordinate info
    const lines = reconstructLinesFromAnnotations(annotations);
    const grades: Grade[] = [];

    // 2. Parse Data Rows
    // We process each line independently to handle slight skews or variable column widths
    const COLUMN_GAP_THRESHOLD = 15; // Minimum pixels to consider a column break vs word space

    for (const line of lines) {
        const lineStr = line.words.map(w => w.text).join(' ');

        // Anchor: Code and Year
        const codeMatch = lineStr.match(/(?:^|\D)(\d{6})(?:\D|$)/);
        const yearMatch = lineStr.match(/202[0-9]/);

        if (codeMatch && yearMatch) {
            const code = codeMatch[1];
            const year = parseInt(yearMatch[0]);

            // Find Code word and Year word to frame our content
            const codeWord = line.words.find(w => w.text.includes(code));
            const yearWord = line.words.find(w => w.text.includes(year.toString()));

            // Define boundaries
            // We want the text strictly between Code and Year
            // Note: Code might be split or stick to next word? Usually unlikely with 6 digits.
            const codeEndX = codeWord ? codeWord.x + codeWord.width : 0;
            const yearStartX = yearWord ? yearWord.x : 9999;

            // --- EXTRACT GRADE (Strict Right-to-Left) ---
            let finalGrade: Grade['grade'] | null = null;

            // Check words from right to left, starting from end of line
            // but ONLY consider words to the right of Year
            for (let i = line.words.length - 1; i >= 0; i--) {
                const w = line.words[i];
                if (w.x < yearStartX) continue;

                // Strict validation
                if (w.text.length > 2 && !w.text.includes('合')) continue;

                const g = normalizeGrade(w.text, lineStr);
                if (g) {
                    if (!finalGrade) {
                        finalGrade = g;
                    } else if (finalGrade === 'P' && g !== 'P') {
                        finalGrade = g;
                    }
                }
            }

            // Default Credits
            let credits = 2;

            // --- EXTRACT SUBJECT & TEACHER (Dynamic Gap Logic) ---
            // Gather all words between Code and Year
            const contentWords = line.words.filter(w => {
                const center = w.x + w.width / 2;
                return center > codeEndX && center < yearStartX;
            });

            // Sort by X just in case
            contentWords.sort((a, b) => a.x - b.x);

            let subject = "Unknown Subject";
            let teacher = "";

            if (contentWords.length > 0) {
                // Find the largest horizontal gap between words
                let maxGap = 0;
                let splitIndex = -1;

                for (let i = 0; i < contentWords.length - 1; i++) {
                    const current = contentWords[i];
                    const next = contentWords[i + 1];
                    const gap = next.x - (current.x + current.width);

                    if (gap > maxGap) {
                        maxGap = gap;
                        splitIndex = i;
                    }
                }

                // Decide if we split
                // If maxGap is small (e.g. just a space in a name), maybe there is no teacher?
                // Or maybe subject is long?
                // However, usually there is a distinct column gap.
                // Exception: "科目名" ... "先生" -> Gap is large.
                // Exception: "Subject Name" ... "Robert Scott" -> Gap is large.
                // Exception: "Subject Name" ... (No teacher?) -> No large gap.

                if (maxGap > COLUMN_GAP_THRESHOLD) {
                    // Split into Subject and Teacher
                    const subjectPart = contentWords.slice(0, splitIndex + 1);
                    const teacherPart = contentWords.slice(splitIndex + 1);

                    subject = subjectPart.map(w => w.text).join(' ');
                    teacher = teacherPart.map(w => w.text).join(' ');
                } else {
                    // No clear gap. Entirely subject?
                    // Or check if valid teacher name? Hard.
                    // Assume entirely subject if no gap.
                    subject = contentWords.map(w => w.text).join(' ');
                    teacher = ""; // Unknown
                }
            }

            // Clean Subject cleaning
            subject = subject.replace(/^[0-9]+\s*/, "").trim();
            teacher = teacher.trim();

            if (subject.length === 0) subject = "Unknown Subject";
            if (teacher.length === 0) teacher = "Unknown";

            if (finalGrade) {
                grades.push({
                    subject,
                    teacher,
                    semester: "前期", // Default
                    credits: credits,
                    grade: finalGrade,
                    year: year
                });
            }
        }
    }

    return grades;
}


export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        let parsedGrades: Grade[] = [];

        // --- IMAGE OCR PARSING ROUTE ---
        const [result] = await client.textDetection(buffer);
        const detections = result.textAnnotations;

        if (!detections || detections.length === 0) {
            return NextResponse.json({ error: 'No text detected in image' }, { status: 400 });
        }

        parsedGrades = parseOCRText(detections);
        console.log("Parsed Grades Count (OCR):", parsedGrades.length);

        if (parsedGrades.length === 0) {
            console.log("Parsing failed to find any grades. Check regex against detected text.");
        }

        const { cumulative, semesters, earnedCredits } = calculateGPA(parsedGrades);

        const response: AnalysisResult = {
            grades: parsedGrades,
            gpa: {
                cumulative,
                semesters,
            },
            earnedCredits: earnedCredits,
            graduationRequirement: {
                total: 124,
                current: earnedCredits,
                percentage: Math.round((earnedCredits / 124) * 100),
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error processing upload:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
