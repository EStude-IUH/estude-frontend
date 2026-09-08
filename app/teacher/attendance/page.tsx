import { RoleGate } from "@/components/auth/role-gate";
import { TeacherEngagementCenter } from "@/components/teacher/engagement-center";

export default function TeacherAttendancePage() {
  return <RoleGate allowedRole="TEACHER"><TeacherEngagementCenter /></RoleGate>;
}
