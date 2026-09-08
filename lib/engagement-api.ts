import { authenticatedRequest } from "@/lib/auth-api";
import type {
  AttendanceRecord,
  AttendanceRoster,
  AttendanceStatus,
  PortalNotification,
  ParentOverview,
} from "@/types/engagement";

export const NOTIFICATIONS_CHANGED_EVENT = "estude:notifications-changed";

export const attendanceService = {
  getClassRoster(classId: string, subjectId: string, date: string): Promise<AttendanceRoster> {
    const query = new URLSearchParams({ subjectId, date });
    return authenticatedRequest<AttendanceRoster>(`/attendance/classes/${encodeURIComponent(classId)}?${query}`);
  },
  saveClassRoster(classId: string, subjectId: string, date: string, records: Array<{ studentId: string; status: AttendanceStatus }>): Promise<{ date: string; records: AttendanceRecord[] }> {
    return authenticatedRequest(`/attendance/classes/${encodeURIComponent(classId)}`, {
      method: "POST",
      body: JSON.stringify({ subjectId, date, records }),
    });
  },
  getMine(): Promise<AttendanceRecord[]> {
    return authenticatedRequest<AttendanceRecord[]>("/attendance/me");
  },
  getChild(studentId: string): Promise<AttendanceRecord[]> {
    return authenticatedRequest<AttendanceRecord[]>(`/attendance/children/${encodeURIComponent(studentId)}`);
  },
};

export const notificationService = {
  getMine(): Promise<PortalNotification[]> {
    return authenticatedRequest<PortalNotification[]>("/notifications/me");
  },
  markRead(id: string): Promise<Record<string, never>> {
    return authenticatedRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
  },
  sendClass(payload: { classId: string; subjectId: string; audience: "STUDENTS" | "PARENTS"; title: string; message: string }): Promise<{ recipientCount: number }> {
    return authenticatedRequest("/notifications/class", { method: "POST", body: JSON.stringify(payload) });
  },
  broadcast(payload: { targetRole?: "TEACHER" | "STUDENT" | "PARENT"; title: string; message: string }): Promise<{ recipientCount: number }> {
    return authenticatedRequest("/notifications/system", { method: "POST", body: JSON.stringify(payload) });
  },
};

export const parentEngagementService = {
  getOverview(): Promise<ParentOverview> {
    return authenticatedRequest<ParentOverview>("/parent/overview");
  },
};
