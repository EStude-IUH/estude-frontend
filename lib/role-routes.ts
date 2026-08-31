import type { UserRole } from "@/types/auth";

export function getRoleHome(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    case "STUDENT":
      return "/student/dashboard";
  }
}

export function getRoleSessionSettings(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin/settings/sessions";
    case "TEACHER":
      return "/teacher/settings/sessions";
    case "STUDENT":
      return "/student/settings/sessions";
  }
}

export function getRoleLogin(role: UserRole): string {
  const loginPaths: Record<UserRole, string> = {
    ADMIN: "/login",
    TEACHER: "/login",
    STUDENT: "/login",
  };
  return loginPaths[role];
}
