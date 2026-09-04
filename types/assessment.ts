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
  topicId: string | null;
  topicName: string;
  content: string;
  keyword?: string | null;
  type: QuestionType;
  difficulty: Difficulty;
  options: QuestionOption[];
  correctOptionIds: string[];
  defaultPoints: number;
  explanation: string;
  disabled: boolean;
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
}

export interface DifficultyLevelDefinition {
  code: Difficulty;
  label: string;
  description: string;
}

export interface SystemDifficultySettings {
  levels: DifficultyLevelDefinition[];
  maxQuestionsPerGeneration: number;
  configured: boolean;
}

export interface TeacherDifficultySettings {
  systemLevels: DifficultyLevelDefinition[];
  customLevels: DifficultyLevelDefinition[] | null;
  effectiveLevels: DifficultyLevelDefinition[];
  maxQuestionsPerGeneration: number;
  defaultQuantity: number;
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
  topicId: string | null;
  topicName: string;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
  options: QuestionOption[];
  correctOptionIds: string[];
  explanation: string;
  disabled: boolean;
}

export interface BulkMoveQuestionsInput {
  questionIds: string[];
  subjectId: string;
  topicId?: string;
  newTopicName?: string;
}

export interface BulkMoveQuestionsResult {
  topic: Pick<Topic, "id" | "name"> | null;
  questions: Question[];
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
  vietnameseName?: string | null;
  description: string;
  keyword?: string | null;
  isActive: boolean;
  createdById?: string | null;
  deletedAt?: string | null;
}

export interface SubjectImportResult {
  totalRows: number;
  createdCount: number;
  failedCount: number;
  errors: Array<{
    row: number;
    code?: string;
    message: string;
  }>;
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
  keyword?: string | null;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface ClassRosterMember {
  id: string;
  fullName: string;
  accountName: string;
  keyword?: string | null;
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

export interface AvailableStudentsPage {
  items: ClassRosterMember[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface SubjectTeacherAssignment {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  keyword?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  teacher: {
    id: string;
    fullName: string;
    accountName: string;
    email?: string | null;
    avatarUrl: string | null;
    status: string;
  };
  subject: Pick<Subject, "id" | "code" | "name" | "vietnameseName"> & { description?: string };
  schoolClass: Pick<SchoolClass, "id" | "code" | "name" | "academicYearId">;
}

export interface TeacherAssignedClass {
  id: string;
  code: string;
  name: string;
  academicYearId: string;
  keyword?: string | null;
  studentCount: number;
  subjects: Array<Pick<Subject, "id" | "code" | "name" | "vietnameseName">>;
}

export interface TeacherManagedStudent {
  id: string;
  fullName: string;
  accountName: string;
  email: string | null;
  avatarUrl: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "LOCKED";
  keyword?: string | null;
  classes: Array<Pick<SchoolClass, "id" | "code" | "name">>;
}

export type StudentCourse = SubjectTeacherAssignment;

export type StudentCourseMaterial = Omit<
  LearningMaterial,
  "s3Key" | "keyword" | "deletedAt"
>;

export interface StudentCourseTopic {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  materials: StudentCourseMaterial[];
}

export interface StudentCourseDetail extends StudentCourse {
  enrollment: { joinedAt: string };
  academicYear: Pick<
    AcademicYear,
    "id" | "name" | "startsAt" | "endsAt" | "status"
  > | null;
  terms: Array<
    Pick<
      Term,
      "id" | "name" | "startsAt" | "endsAt" | "displayOrder" | "status" | "isActive"
    >
  >;
  studentCount: number;
  topics: StudentCourseTopic[];
}

export interface LearningMaterial {
  id: string;
  topicId: string | null;
  teacherId: string;
  originalName: string;
  keyword?: string | null;
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
  subject: Pick<Subject, "id" | "code" | "name" | "vietnameseName">;
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
  keyword?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  subject: Pick<Subject, "id" | "code" | "name" | "vietnameseName">;
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
  keyword?: string | null;
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
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicName?: string;
  question?: {
    id: string;
    subjectId?: string;
    subjectName?: string;
    topicId?: string;
    topicName?: string;
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
  examVersionCount: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswers: boolean;
}

export interface TeacherExamDefaults {
  durationMinutes: number;
  attemptsAllowed: number;
  availabilityDays: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswers: boolean;
}

export interface TeacherExamDefaultSettings {
  examDefaults: TeacherExamDefaults;
  configured: boolean;
  updatedAt: string | null;
}

export interface Exam {
  id: string;
  title: string;
  keyword?: string | null;
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
  studentCode?: string | null;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  answers: ExamAnswer[];
  score: number | null;
  correctCount: number | null;
  durationSeconds: number | null;
  examCode: string | null;
}

export type StudySourceType = "COURSE_MATERIAL" | "EXTERNAL_KNOWLEDGE";

export interface StudyTopicPerformance {
  topicName: string;
  totalQuestions: number;
  correctCount: number;
  missedCount: number;
  pointsEarned: number;
  pointsPossible: number;
  accuracy: number;
}

export interface StudyWeakArea {
  id: string;
  topicName: string;
  sourceType: StudySourceType;
  missedCount: number;
  totalQuestions: number;
  accuracy: number;
  diagnosis: string;
  reviewSummary: string;
  keyPoints: string[];
  sourceReferences: Array<{ documentName: string; page: number }>;
}

export type StudyPerformanceLevel =
  | "PENDING"
  | "BELOW_AVERAGE"
  | "AVERAGE_TO_GOOD"
  | "STRONG";

export interface StudyLearningPathStep {
  order: number;
  topicName: string;
  title: string;
  objective: string;
  activities: string[];
  durationMinutes: number;
}

export interface StudyLearningPath {
  totalDurationMinutes: number;
  steps: StudyLearningPathStep[];
}

export interface StudyAnalysisReport {
  aiStatus: "READY" | "FALLBACK";
  summary: string;
  exam: {
    id: string;
    title: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
  };
  performance: {
    score: number | null;
    totalPoints: number;
    accuracy: number;
    correctCount: number;
    totalQuestions: number;
    ungradedEssayCount: number;
    scorePercentage: number | null;
    level: StudyPerformanceLevel;
    needsWarning: boolean;
  };
  topicPerformance: StudyTopicPerformance[];
  weakAreas: StudyWeakArea[];
  learningPath: StudyLearningPath;
}

export interface StudyPracticeQuestion {
  id: string;
  topicName: string;
  sourceType: StudySourceType;
  content: string;
  options: Array<{ id: string; label: string; text: string }>;
  correctOptionIds?: string[];
  explanation?: string;
  selectedOptionIds?: string[];
  correct?: boolean;
}

export interface StudyPracticeSet {
  id: string;
  analysisId: string;
  status: "READY" | "SUBMITTED";
  score: number | null;
  correctCount: number | null;
  submittedAt: string | null;
  questions: StudyPracticeQuestion[];
  totalQuestions: number;
}

export type StudyPracticeMode = "EASY" | "HARD";

export interface StudyAnalysis {
  id: string;
  attemptId: string;
  examId: string;
  studentId: string;
  classId: string;
  subjectId: string;
  report: StudyAnalysisReport;
  generatedAt: string;
  updatedAt: string;
  practiceSet: StudyPracticeSet | null;
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
