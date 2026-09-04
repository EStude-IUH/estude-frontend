import type { Metadata } from "next";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentReviewPage } from "@/components/student/student-review-page";

export const metadata: Metadata = {
  title: "Ôn tập cùng AI",
  description: "Lộ trình ôn tập cá nhân hóa từ kết quả bài kiểm tra của sinh viên.",
};

export default function StudentReviewRoute() {
  return (
    <RoleGate allowedRole="STUDENT">
      <StudentReviewPage />
    </RoleGate>
  );
}
