export type GradeMark = number | "PASS" | "FAIL" | null;
export interface GradeMarks {
  regular: GradeMark[];
  midterm: GradeMark;
  final: GradeMark;
}
export interface GradeOutcome {
  average: number | null;
  assessment: "PASS" | "FAIL" | null;
  complete: boolean;
}
export interface GradePolicy {
  assessmentMode: "NUMERIC" | "COMMENT";
  annualPeriods: number;
  specialized: boolean;
}
export interface GradeScope {
  classId: string;
  subjectId: string;
  termId: string;
}
export interface Gradebook extends GradePolicy, GradeScope {
  id: string;
  revision: number;
}
export interface GradeRecord {
  marks: GradeMarks;
  comment: string;
  updatedAt: string;
}
export interface GradebookView {
  book: Gradebook | null;
  requiredRegular: number | null;
  term: { status: string };
  year?: { status: string };
  schoolClass?: { isActive: boolean };
  students: Array<{
    id: string;
    fullName: string;
    accountName: string;
    record: GradeRecord | null;
    outcome: GradeOutcome | null;
  }>;
}

export interface GradeImportPreview {
  revision: number;
  totalRows: number;
  changedRows: number;
  rows: Array<{
    row: number;
    studentId: string;
    fullName: string;
    accountName: string;
    marks: GradeMarks;
    comment: string;
  }>;
  errors: Array<{ row: number; message: string }>;
}
export interface LearningLevel {
  level: "TOT" | "KHA" | "DAT" | "CHUA_DAT" | "INCOMPLETE";
  adjusted: boolean;
}
export interface GradeReport {
  years: Array<{ id: string; name: string; status: string }>;
  terms: Array<{
    id: string;
    name: string;
    academicYearId: string;
    status: string;
  }>;
  classes: Array<{
    id: string;
    name: string;
    code: string;
    academicYearId: string;
  }>;
  results: Array<{
    classId: string;
    academicYearId: string;
    annualLevel: LearningLevel;
    semesterLevels: Array<LearningLevel & { termId: string }>;
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      annual: GradeOutcome;
      semesters: Array<{
        termId: string;
        displayOrder: number;
        policy: GradePolicy | null;
        marks: GradeMarks | null;
        comment: string;
        updatedAt: string | null;
        outcome: GradeOutcome;
      }>;
    }>;
  }>;
}
