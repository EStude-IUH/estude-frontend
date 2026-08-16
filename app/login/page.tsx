import type { Metadata } from "next";
import { StaffLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào không gian học tập EStude.",
};

export default function LoginPage() {
  return <StaffLoginForm role="STUDENT" />;
}
