"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FormField } from "@/components/auth/form-field";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

interface SetupErrors {
  email?: string;
  verificationCode?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function FirstLoginSetupForm() {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<SetupErrors>({});
  const [codeSent, setCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  function handleSendCode() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors((current) => ({ ...current, email: "Email không hợp lệ." }));
      return;
    }
    setErrors((current) => ({ ...current, email: undefined }));
    setCodeSent(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: SetupErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Email không hợp lệ.";
    }
    if (!codeSent || !/^\d{6}$/.test(verificationCode)) {
      nextErrors.verificationCode = "Vui lòng nhập mã xác thực gồm 6 chữ số.";
    }
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[^\s]{8,128}$/.test(
        newPassword,
      )
    ) {
      nextErrors.newPassword =
        "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setCompleted(true);
    }, 500);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4 py-10">
      <section className="w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/[0.06] sm:p-8">
        <BrandLogo />
        <div className="mt-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-600">
            Thiết lập tài khoản lần đầu
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Đổi mật khẩu mặc định và xác thực email khôi phục của bạn.
          </p>
        </div>

        {completed ? (
          <div className="mt-7">
            <AuthNotice
              type="success"
              message="Thiết lập tài khoản thành công. Bạn có thể tiếp tục sử dụng EStude."
            />
            <span className="mx-auto mt-6 grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </span>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <FormField
                id="recoveryEmail"
                name="email"
                type="email"
                label="Email khôi phục"
                icon={Mail}
                placeholder="name@example.com"
                value={email}
                error={errors.email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((current) => ({ ...current, email: undefined }));
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={handleSendCode}
              >
                <ShieldCheck className="size-4" />{" "}
                {codeSent ? "Gửi lại mã" : "Gửi mã xác thực"}
              </Button>
            </div>
            <FormField
              id="verificationCode"
              name="verificationCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              label="Mã xác thực"
              icon={ShieldCheck}
              placeholder="Nhập mã gồm 6 chữ số"
              value={verificationCode}
              error={errors.verificationCode}
              onChange={(event) => {
                setVerificationCode(event.target.value.replace(/\D/g, ""));
                setErrors((current) => ({
                  ...current,
                  verificationCode: undefined,
                }));
              }}
            />
            <FormField
              id="firstNewPassword"
              name="newPassword"
              type="password"
              label="Mật khẩu mới"
              icon={KeyRound}
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              error={errors.newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  newPassword: undefined,
                }));
              }}
            />
            <FormField
              id="firstConfirmPassword"
              name="confirmPassword"
              type="password"
              label="Xác nhận mật khẩu mới"
              icon={KeyRound}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              error={errors.confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  confirmPassword: undefined,
                }));
              }}
            />
            <Button
              type="submit"
              className="h-[52px] w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
              {isSubmitting ? "Đang hoàn tất..." : "Hoàn tất thiết lập"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
