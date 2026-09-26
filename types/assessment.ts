export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY";
export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "VERY_HARD";

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

export interface Question {
  id: string;
  folderId?: string | null;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string;
  content: string;
  imageEnabled?: boolean;
  imageUrl?: string | null;
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

export interface QuestionFolder {
  id: string;
  parentId: string | null;
  name: string;
  depth: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSource {
  documentName: string;
  page: number;
  excerpt?: string;
  learningObjective?: string;
  verification?: "AI_REVIEWED" | "TEACHER_EDITED";
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

export interface ApprovedAiQuestion {
  generatedQuestion: GeneratedQuestion;
  question: Question;
}

export interface GenerateAiQuestionsInput {
  materialId: string;
  subjectId?: string;
  topicId?: string;
  sourceFocus?: string;
  learningObjective?: string;
  questionType: Extract<QuestionType, "SINGLE_CHOICE" | "TRUE_FALSE">;
  difficulty: Difficulty;
  quantity: number;
  includeExplanation: boolean;
}

export interface AiQuestionEditDraft {
  questionId: string;
  content: string;
  difficulty: Difficulty;
  options: QuestionOption[];
  correctOptionIds: string[];
  explanation: string;
}
export interface AiQuestionDraftInput {
  form: GenerateAiQuestionsInput;
  questionIds: string[];
  edits: AiQuestionEditDraft[];
  expectedVersion: number;
}
export interface AiQuestionDraft extends Omit<AiQuestionDraftInput, "expectedVersion"> {
  questions: GeneratedQuestion[];
  version: number;
  savedAt: string;
  missingQuestionIds: string[];
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
  folderId?: string | null;
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
  subject: Pick<Subject, "id" | "code" | "name" | "vietnameseName"> & {
    description?: string;
  };
  schoolClass: Pick<SchoolClass, "id" | "code" | "name" | "academicYearId">;
}

export interface TeacherAssignedClass {
  id: string;
  code: string;
  name: string;
  academicYearId: string;
  keyword?: string | null;
  studentCount: number;
  isHomeroomTeacher: boolean;
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

export type StudentCourseMaterial = Omit<LearningMaterial, "s3Key" | "keyword" | "deletedAt">;

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
  academicYear: Pick<AcademicYear, "id" | "name" | "startsAt" | "endsAt" | "status"> | null;
  terms: Array<
    Pick<
      Term,
      | "id"
      | "name"
      | "startsAt"
      | "endsAt"
      | "displayOrder"
      | "status"
      | "isActive"
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
    imageUrl?: string | null;
    imageEnabled?: boolean;
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
  requiresAccessCode: boolean;
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
  requiresAccessCode: boolean;
  accessCode?: string;
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
  teacherReview?: ExamClassReportReview | null;
}

export type ExamClassParticipationStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
export type TeacherReviewStatus = "DRAFT" | "PUBLISHED";

export interface ExamClassReportAttempt {
  id: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  durationSeconds: number | null;
  gradingStatus: "COMPLETE" | "PARTIAL";
  scoredPointsPossible: number | null;
  ungradedPointsPossible: number | null;
}

export interface ExamClassReportReview {
  comment: string;
  status: TeacherReviewStatus;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ExamClassReportStudent {
  id: string;
  fullName: string;
  studentCode: string;
  avatarUrl: string | null;
  participationStatus: ExamClassParticipationStatus;
  attemptCount: number;
  submittedAttemptCount: number;
  selectedAttempt: ExamClassReportAttempt | null;
  topicPerformance: Array<{
    topicId: string;
    topicName: string;
    opportunityCount: number;
    correctCount: number;
    accuracy: number;
  }>;
  needsSupport: boolean;
  supportTopicNames: string[];
  review: ExamClassReportReview | null;
}

export interface ExamClassQuestionPerformance {
  questionId: string;
  order: number;
  content: string;
  type: QuestionType | null;
  topicId: string;
  topicName: string;
  opportunityCount: number;
  answeredCount: number;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number;
  accuracy: number | null;
  supportStudentCount: number | null;
  supportStudentIds: string[];
  optionDistribution: Array<{
    optionId: string;
    label: string;
    text: string;
    selectedCount: number;
    selectedRate: number;
    isCorrect: boolean;
    functioningDistractor: boolean | null;
  }>;
  itemAnalysis: {
    sampleSize: number;
    discriminationSampleSize: number;
    discriminationMethod: "CORRECTED_ITEM_TOTAL_CORRELATION";
    evidenceLevel: "LIMITED" | "DEVELOPING" | "ESTABLISHED";
    difficultyLevel:
      | "NOT_APPLICABLE"
      | "VERY_DIFFICULT"
      | "DIFFICULT"
      | "MODERATE"
      | "EASY"
      | "VERY_EASY";
    discriminationIndex: number | null;
    discriminationLevel:
      | "INSUFFICIENT_DATA"
      | "NEGATIVE"
      | "POOR"
      | "ACCEPTABLE"
      | "GOOD"
      | "EXCELLENT";
    flags: Array<
      | "LOW_SAMPLE"
      | "TOO_DIFFICULT"
      | "TOO_EASY"
      | "NEGATIVE_DISCRIMINATION"
      | "LOW_DISCRIMINATION"
      | "NON_FUNCTIONING_DISTRACTOR"
    >;
  };
}

export interface ExamInsightActionInput {
  kind: "ASSIGNMENT" | "NOTIFICATION";
  studentIds: string[];
  title: string;
  message: string;
  groupLabel: string;
  dueAt?: string;
}

export interface ExamInsightActionResult {
  id: string;
  recipientCount: number;
  alreadySent: boolean;
}

export interface ExamClassTopicPerformance {
  topicId: string;
  topicName: string;
  questionCount: number;
  opportunityCount: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number | null;
  supportStudentCount: number;
  supportStudentIds: string[];
}

export interface ExamClassReport {
  generatedAt: string;
  policy: {
    enrollmentScope: "CURRENT_ACTIVE_ENROLLMENTS";
    selectedAttemptRule: "LATEST_SUBMITTED";
    activeAttemptFallback: "LATEST_IN_PROGRESS_FOR_DISPLAY_ONLY";
    supportThresholdPercent: number;
    note: string;
  };
  summary: {
    enrolledStudentCount: number;
    uniqueAttemptedStudentCount: number;
    totalAttemptCount: number;
    notStartedCount: number;
    inProgressStudentCount: number;
    submittedStudentCount: number;
    selectedSubmittedAttemptCount: number;
    ungradedSubmittedAttemptCount: number;
    averageScore: number | null;
    medianScore: number | null;
    averagePercentage: number | null;
    medianPercentage: number | null;
    averageDurationSeconds: number | null;
    medianDurationSeconds: number | null;
  };
  students: ExamClassReportStudent[];
  questionPerformance: ExamClassQuestionPerformance[];
  topicPerformance: ExamClassTopicPerformance[];
}

export interface ExamClassAiAnalysis {
  knowledgeGaps?: Array<{
    knowledge: string;
    questionNumbers: number[];
    evidence: string;
    remediation: string;
  }>;
  generatedAt: string;
  source: "AI" | "FALLBACK";
  model: string | null;
  headline: string;
  summary: string;
  strengths: Array<{ title: string; evidence: string }>;
  concerns: Array<{ title: string; evidence: string }>;
  recommendations: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    title: string;
    action: string;
  }>;
  lessonPlan: {
    focus: string;
    objective: string;
    activities: string[];
    durationMinutes: number;
  };
}

export interface ExamClassAnalysisState {
  status: "NOT_STARTED" | "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  analysis: ExamClassAiAnalysis | null;
  snapshot: {
    questions?: Array<{
      order: number;
      content?: string;
      topicName: string;
      opportunityCount: number;
      accuracy: number | null;
      incorrectCount?: number | null;
      unansweredCount: number;
    }>;
    title: string;
    className: string;
    subjectName: string;
    totalPoints: number;
    enrolledStudentCount: number;
    submittedStudentCount: number;
    averagePercentage: number | null;
    averageDurationSeconds: number | null;
  } | null;
  hasNewData: boolean;
  canAnalyze: boolean;
  currentSubmittedStudentCount: number;
  requestedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export interface SubjectSupportStudent {
  id: string;
  fullName: string;
  studentCode: string;
  parentCount: number;
  level: "INSUFFICIENT" | "HIGH" | "WATCH" | "STABLE";
  needsFollowUp: boolean;
  averagePercentage: number | null;
  recentAveragePercentage: number | null;
  trendPercentagePoints: number | null;
  scoredExamCount: number;
  submittedExamCount: number;
  overdueExamCount: number;
  reasons: string[];
  history: Array<{
    examId: string;
    title: string;
    endsAt: string;
    attemptId: string | null;
    status: string;
    percentage: number | null;
    awaitingGrading: boolean;
  }>;
  gaps: Array<{
    examId: string;
    examTitle: string;
    questionId: string;
    questionNumber: number;
    content: string;
    topicName: string;
  }>;
}

export interface SubjectSupportReport {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  version: string;
  generatedAt: string;
  examCount: number;
  policy: string;
  students: SubjectSupportStudent[];
  cache?: {
    source: "CACHE" | "COMPUTED";
    stale: boolean;
    expiresAt: string;
  };
}

export interface ExamListAiAnalysis extends ExamClassAiAnalysis {
  trend: {
    direction: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";
    evidence: string;
  };
}

export type StudySourceType = "COURSE_MATERIAL" | "EXTERNAL_KNOWLEDGE" | "SOURCE_UNAVAILABLE";

export interface StudyLearningProfile {
  objectiveId?: string;
  topicName: string;
  masteryEstimate: number;
  sampleSize: number;
  previousAccuracy: number | null;
  trend: "INSUFFICIENT_DATA" | "IMPROVING" | "DECLINING" | "STABLE";
  evidenceLevel: "LIMITED" | "DEVELOPING" | "ESTABLISHED";
  recurringMistakes: number;
  recommendedDifficulty: Difficulty;
  recommendation: string;
}

export interface StudyTopicPerformance {
  objectiveId?: string;
  topicName: string;
  totalQuestions: number;
  correctCount: number;
  missedCount: number;
  pointsEarned: number;
  pointsPossible: number;
  accuracy: number;
}

export interface StudyWeakArea {
  objectiveId?: string;
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

export type StudyPerformanceLevel = "PENDING" | "BELOW_AVERAGE" | "AVERAGE_TO_GOOD" | "STRONG";

export interface StudyLearningPathStep {
  objectiveId?: string;
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
  version?: number;
  learningProfile?: StudyLearningProfile[];
  historyAnalysisCount?: number;
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
    gradingStatus?: "COMPLETE" | "PARTIAL";
    snapshotOrigin?: "ORIGINAL" | "LEGACY_INCOMPLETE";
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
  objectiveId?: string;
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
  feedback?: Array<{
    objectiveId?: string;
    topicName: string;
    accuracy: number;
    correctCount: number;
    totalQuestions: number;
    reviewAfterDays: number;
    reviewAt: string;
    recommendation: string;
  }>;
  id: string;
  attemptId: string;
  attemptNumber: number;
  startedAt: string | null;
  mode: StudyPracticeMode | "UNSPECIFIED";
  assistance: string;
  attemptHistory: StudyPracticeAttemptSummary[];
  analysisId: string;
  status: "READY" | "SUBMITTED";
  score: number | null;
  correctCount: number | null;
  submittedAt: string | null;
  questions: StudyPracticeQuestion[];
  totalQuestions: number;
}

export interface StudyPracticeAttemptSummary {
  id: string;
  attemptNumber: number;
  status: "READY" | "SUBMITTED";
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  mode: StudyPracticeMode | "UNSPECIFIED";
  assistance: string;
  hintQuestionIds: string[];
  legacy: boolean;
  snapshotVersion: string;
  gradingVersion: string;
}

export interface StudyPracticeAttemptResult extends StudyPracticeAttemptSummary {
  questions: StudyPracticeQuestion[];
}

export interface AssessmentEvidence {
  id: string;
  objectiveId: string;
  source: "ASSIGNED_EXAM" | "STUDY_PRACTICE";
  sourceTitle: string;
  sourceAttemptId: string;
  observedAt: string;
  gradingStatus: "COMPLETE" | "PARTIAL";
  snapshotOrigin: string;
  assistance: string;
  totalQuestions: number;
  scorableCount: number;
  correctCount: number;
  accuracy: number | null;
  baselineEligible: boolean;
  ineligibleReason: string | null;
  objective: {
    id: string;
    title: string;
    granularity: string;
    version: number;
  };
  questionSnapshot: Array<{
    questionId: string;
    order: number;
    content: string;
    type: QuestionType;
    difficulty: string;
    imageEnabled?: boolean;
    imageUrl?: string | null;
    options: Array<{ id: string; label: string; text: string }>;
    correctOptionIds: string[];
    explanation: string;
  }>;
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
    essayText?: string;
  }>;
}

export interface BaselineSelection {
  id: string;
  studentId: string;
  objectiveId: string;
  evidenceId: string;
  reason: string;
  version: number;
  selectedAt: string;
}

export interface StudentEvidenceResult {
  items: AssessmentEvidence[];
  baselines: BaselineSelection[];
  baselineHistory: Array<{
    id: string;
    selectionId: string;
    evidenceId: string;
    reason: string;
    version: number;
    selectedAt: string;
  }>;
  missingSnapshotAttemptIds: string[];
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
