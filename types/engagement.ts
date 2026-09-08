export type AttendanceStatus = "PRESENT" | "ABSENT";

export interface AttendanceRecord {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  studentId: string;
  sessionDate: string;
  status: AttendanceStatus;
  markedAt: string;
  class?: { id: string; code: string; name: string } | null;
  subject?: { id: string; name: string } | null;
}

export interface AttendanceRoster {
  date: string;
  class: { id: string; code: string; name: string } | null;
  subject: { id: string; name: string } | null;
  students: Array<{
    id: string;
    fullName: string;
    accountName: string;
    avatarUrl: string | null;
    status: string;
    attendance: AttendanceRecord | null;
  }>;
}

export interface PortalNotification {
  id: string;
  senderId: string;
  senderName: string;
  kind: "CLASS_STUDENTS" | "CLASS_PARENTS" | "SYSTEM";
  classId: string | null;
  subjectId: string | null;
  examId: string | null;
  actionUrl: string | null;
  targetRole: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | null;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface ParentOverview {
  children: Array<{ id: string; fullName: string; accountName: string; avatarUrl: string | null }>;
  attendance: Array<AttendanceRecord & { studentName: string }>;
  upcomingExams: Array<{ id: string; title: string; subjectName: string; classId: string; className: string; startsAt: string; endsAt: string }>;
  notifications: PortalNotification[];
}
