export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY";
export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "VERY_HARD";

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

export interface Question {
  id: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
  options: QuestionOption[];
  correctOptionIds: string[];
  defaultPoints: number;
  explanation: string;
  generatedByAi?: boolean;
  sourceMaterialId?: string | null;
  source?: QuestionSource | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSource {
  documentName: string;
  page: number;
}

export type GeneratedQuestionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface GeneratedQuestion extends Omit<Question, "createdAt" | "updatedAt"> {
  teacherId: string;
  materialId: string;
  source: QuestionSource;
  status: GeneratedQuestionStatus;
  generatedByAi: true;
  sourceFocus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateAiQuestionsInput {
  materialId: string;
  subjectId?: string;
  topicId?: string;
  sourceFocus?: string;
  questionType: Extract<QuestionType, "SINGLE_CHOICE" | "TRUE_FALSE">;
  difficulty: Difficulty;
  quantity: number;
  includeExplanation: boolean;
  defaultPoints: number;
}

export interface DifficultyLevelDefinition {
  code: Difficulty;
  label: string;
  description: string;
}

export interface SystemDifficultySettings {
  levels: DifficultyLevelDefinition[];
  configured: boolean;
}

export interface TeacherDifficultySettings {
  systemLevels: DifficultyLevelDefinition[];
  customLevels: DifficultyLevelDefinition[] | null;
  effectiveLevels: DifficultyLevelDefinition[];
  usingSystemDefaults: boolean;
}

export interface UpdateGeneratedQuestionInput {
  content?: string;
  difficulty?: Difficulty;
  options?: QuestionOption[];
  correctOptionIds?: string[];
  explanation?: string;
}

export interface QuestionFilters {
  search?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
  page?: number;
  limit?: number;
}

export interface QuestionInput {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
  options: QuestionOption[];
  correctOptionIds: string[];
  defaultPoints: number;
  explanation: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
  deletedAt?: string | null;
}

export interface Term {
  id: string;
  academicYearId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  displayOrder: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "LOCKED";
  deletedAt?: string | null;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface GradeComponent {
  id: string;
  subjectId: string;
  code: string;
  name: string;
  requiredColumns: number;
  weight: number;
  teacherCanConfigureCalculation: boolean;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface SchoolClass {
  id: string;
  academicYearId: string;
  code: string;
  name: string;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface ClassRosterMember {
  id: string;
  fullName: string;
  accountName: string;
  role: "TEACHER" | "STUDENT";
  status: string;
  avatarUrl: string | null;
  assignmentId?: string;
  enrollmentId?: string;
  assignedAt?: string;
  joinedAt?: string;
}

export interface ClassRoster {
  classId: string;
  teachers: ClassRosterMember[];
  students: ClassRosterMember[];
}

export interface SubjectTeacherAssignment {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  teacher: {
    id: string;
    fullName: string;
    accountName: string;
    avatarUrl: string | null;
    status: string;
  };
  subject: Pick<Subject, "id" | "code" | "name">;
  schoolClass: Pick<SchoolClass, "id" | "code" | "name" | "academicYearId">;
}

export interface TeacherAssignedClass {
  id: string;
  code: string;
  name: string;
  academicYearId: string;
  studentCount: number;
  subjects: Array<Pick<Subject, "id" | "code" | "name">>;
}

export type StudentCourse = SubjectTeacherAssignment;

export interface LearningMaterial {
  id: string;
  topicId: string | null;
  teacherId: string;
  originalName: string;
  s3Key: string;
  mimeType: string;
  size: number;
  status: "PENDING" | "READY";
  createdAt: string;
  updatedAt: string;
  assignments?: MaterialClassAssignment[];
}

export interface MaterialClassAssignment {
  id: string;
  classId: string;
  subjectId: string;
  name: string;
  description: string;
  schoolClass: Pick<SchoolClass, "id" | "code" | "name">;
  subject: Pick<Subject, "id" | "code" | "name">;
}

export interface MaterialAssignmentTarget {
  classId: string;
  subjectId: string;
  topicId?: string;
  topicName?: string;
}

export interface BulkMaterialAssignmentResult {
  assignedCount: number;
  skippedCount: number;
  materialCount: number;
  topicCount: number;
}

export interface ClassTopic {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  subject: Pick<Subject, "id" | "code" | "name">;
  materials: LearningMaterial[];
}

export interface ClassTopicInput {
  subjectId: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  isActive: boolean;
}

export type ExamStatus = "DRAFT" | "SCHEDULED" | "ONGOING" | "ENDED";
export type StudentExamStatus = "UPCOMING" | "AVAILABLE" | "IN_PROGRESS" | "SUBMITTED" | "ENDED";

export interface StudentExamAttemptSummary {
  id: string;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
}

export interface ExamQuestion {
  questionId: string;
  points: number;
  order: number;
  question?: {
    id: string;
    content: string;
    type: QuestionType;
    options: QuestionOption[];
    correctOptionIds?: string[];
    explanation?: string;
  } | null;
}

export interface ExamSettings {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswers: boolean;
}

export interface Exam {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  topicName: string;
  description: string;
  teacherId: string;
  teacherName?: string;
  attemptedCount?: number;
  studentStatus?: StudentExamStatus;
  currentAttempt?: StudentExamAttemptSummary | null;
  attemptsUsed?: number;
  attemptsRemaining?: number;
  canStart?: boolean;
  status: ExamStatus;
  published: boolean;
  questions: ExamQuestion[];
  totalPoints: number;
  settings: ExamSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ExamInput {
  title: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  topicName: string;
  description: string;
  questions: ExamQuestion[];
  settings: ExamSettings;
}

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED";

export interface ExamAnswer {
  questionId: string;
  selectedOptionIds: string[];
  essayText: string;
  flagged: boolean;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  answers: ExamAnswer[];
  score: number | null;
  correctCount: number | null;
  durationSeconds: number | null;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Một đáp án",
  MULTIPLE_CHOICE: "Nhiều đáp án",
  TRUE_FALSE: "Đúng / Sai",
  ESSAY: "Tự luận",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
  VERY_HARD: "Rất khó",
};

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  DRAFT: "Bản nháp",
  SCHEDULED: "Sắp diễn ra",
  ONGOING: "Đang diễn ra",
  ENDED: "Đã kết thúc",
};
