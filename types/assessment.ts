export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

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
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFilters {
  search?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
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

export interface ExamQuestion {
  questionId: string;
  points: number;
  order: number;
  question?: {
    id: string;
    content: string;
    type: QuestionType;
    options: QuestionOption[];
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
};

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  DRAFT: "Bản nháp",
  SCHEDULED: "Sắp diễn ra",
  ONGOING: "Đang diễn ra",
  ENDED: "Đã kết thúc",
};
