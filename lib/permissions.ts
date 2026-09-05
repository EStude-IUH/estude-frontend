export const MODULE_LINKS = [
  {
    href: "/admin/dashboard",
    label: "Tổng quan quản lý",
    permission: "dashboard.read",
  },
  { href: "/admin/accounts", label: "Tài khoản", permission: "accounts.read" },
  {
    href: "/admin/users/teachers",
    label: "Giáo viên",
    permission: "accounts.read",
  },
  {
    href: "/admin/users/students",
    label: "Học sinh",
    permission: "accounts.read",
  },
  {
    href: "/admin/users/parents",
    label: "Phụ huynh",
    permission: "accounts.read",
  },
  {
    href: "/admin/parent-student-links",
    label: "Liên kết phụ huynh – học sinh",
    permission: "parent_links.read",
  },
  {
    href: "/admin/academic-data",
    label: "Dữ liệu học vụ",
    permission: "academic.read",
  },
  { href: "/admin/subjects", label: "Môn học", permission: "subjects.read" },
  { href: "/admin/classes", label: "Lớp học", permission: "classes.read" },
  {
    href: "/admin/subject-assignments",
    label: "Phân công bộ môn",
    permission: "assignments.read",
  },
  {
    href: "/admin/settings/permissions",
    label: "Phân quyền động",
    permission: "authorization.read",
  },
  {
    href: "/admin/settings/default-passwords",
    label: "Mật khẩu mặc định",
    permission: "password_settings.read",
  },
  {
    href: "/admin/settings/ai-question",
    label: "Cấu hình AI",
    permission: "ai_settings.read",
  },
  {
    href: "/teacher/classes",
    label: "Lớp được phân công",
    permission: "teaching.read",
  },
  {
    href: "/teacher/students",
    label: "Học sinh được phân công",
    permission: "teaching.read",
  },
  {
    href: "/teacher/materials",
    label: "Thư viện tài liệu",
    permission: "materials.read",
  },
  {
    href: "/teacher/question-bank",
    label: "Ngân hàng câu hỏi",
    permission: "questions.read",
  },
  {
    href: "/teacher/exams",
    label: "Quản lý bài kiểm tra",
    permission: "exams.read",
  },
  {
    href: "/teacher/settings/exam-defaults",
    label: "Cấu hình bài kiểm tra",
    permission: "teacher_settings.read",
  },
  {
    href: "/student/courses",
    label: "Môn học của tôi",
    permission: "learning.read",
  },
  {
    href: "/student/grades",
    label: "Điểm số của tôi",
    permission: "learning.read",
  },
  { href: "/student/review", label: "Ôn tập", permission: "study.read" },
  {
    href: "/parent/dashboard",
    label: "Học sinh liên kết",
    permission: "children.read",
  },
] as const;

export function routePermission(path: string): string | null {
  if (path.endsWith("/settings/sessions")) return null;
  if (path === "/admin/users") return "accounts.read";
  if (/^\/(admin\/users|teacher)\/students\/[^/]+$/.test(path))
    return "student_reports.read";
  if (path === "/teacher/question-bank/generate") return "ai_questions.create";
  if (path === "/teacher/question-bank/new") return "questions.create";
  if (/^\/teacher\/question-bank\/[^/]+\/edit$/.test(path))
    return "questions.update";
  if (path === "/teacher/exams/new") return "exams.create";
  if (/^\/teacher\/exams\/[^/]+\/edit$/.test(path)) return "exams.update";
  if (path.includes("/submissions")) return "exams.submissions";
  if (path.startsWith("/student/attempts/") && path.endsWith("/study"))
    return "study.read";
  if (
    path.startsWith("/student/attempts/") ||
    path.startsWith("/student/exams") ||
    path === "/student/dashboard"
  )
    return "learning.read";
  if (path === "/teacher/dashboard") return "teaching.read";
  const link = MODULE_LINKS.find(
    (item) => path === item.href || path.startsWith(`${item.href}/`),
  );
  if (link) return link.permission;
  if (path.startsWith("/admin/settings")) return "system_settings.read";
  return '__unmapped__';
}
