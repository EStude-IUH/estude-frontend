"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-control";
import type { UserRole } from "@/types/auth";

const roleLabels: Record<Extract<UserRole, "TEACHER" | "STUDENT" | "PARENT">, string> = {
  TEACHER: "giảng viên",
  STUDENT: "học sinh",
  PARENT: "phụ huynh",
};

export function PasswordRecoveryPage({
  role,
}: {
  role: Extract<UserRole, "TEACHER" | "STUDENT" | "PARENT">;
}) {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAccountName = accountName.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,50}$/.test(normalizedAccountName)) {
      setError("Tên tài khoản không hợp lệ.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 400);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4 py-10">
      <div className="w-full max-w-[420px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.08]">
          <div className="px-6 pt-6 sm:px-8 sm:pt-8">
            <BrandLogo withShadow={false} />
            <div className="mt-6 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-brand-600">Quên mật khẩu</h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Khôi phục quyền truy cập tài khoản {roleLabels[role]} bằng email đã xác thực.
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
            {submitted ? (
              <div className="text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-8" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold text-slate-950">Kiểm tra email của bạn</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Nếu tài khoản có email đã xác thực, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email đó.
                </p>
                <div className="mt-5 rounded-xl bg-blue-50 p-4 text-left text-sm leading-6 text-brand-700">
                  <Mail className="mr-2 inline size-4" /> Liên kết khôi phục có thời hạn nhằm bảo vệ tài khoản của bạn.
                </div>
                <Button className="mt-6 h-11 w-full" onClick={() => router.push("/login")}>
                  Đăng nhập
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <Input
                  icon={UserRound}
                  label="Tên tài khoản"
                  value={accountName}
                  onChange={(event) => {
                    setAccountName(event.target.value);
                    setError("");
                  }}
                  error={error}
                  placeholder="Nhập tên tài khoản"
                  autoComplete="username"
                  autoFocus
                />
                <Button type="submit" className="h-12 w-full whitespace-nowrap" disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  {isSubmitting ? "Đang gửi..." : "Gửi mã xác thực"}
                </Button>
                <button
                  type="button"
                  className="mx-auto block text-sm font-bold text-brand-600 transition hover:text-brand-800"
                  onClick={() => router.push("/login")}
                >
                  Quay lại đăng nhập
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
