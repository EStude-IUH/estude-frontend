import { RoleGate } from "@/components/auth/role-gate";
import { StudentExamsPage } from "@/components/assessment/student-exam-pages";

export default function StudentExamsRoute() {
  return <RoleGate allowedRole="STUDENT"><StudentExamsPage /></RoleGate>;
}
