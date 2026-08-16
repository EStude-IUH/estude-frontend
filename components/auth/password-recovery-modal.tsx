"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  Send,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";

export function PasswordRecoveryModal({
  open,
  initialAccountName,
  onClose,
}: {
  open: boolean;
  initialAccountName: string;
  onClose: () => void;
}) {
  const [accountName, setAccountName] = useState(initialAccountName);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setError("");
    setSubmitted(false);
    setIsSubmitting(false);
    setAccountName(initialAccountName);
    onClose();
  }

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
    <Modal
      open={open}
      title="Quên mật khẩu"
      description="Khôi phục quyền truy cập bằng email đã xác thực."
      onClose={handleClose}
    >
      {submitted ? (
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" />
          </span>
          <h3 className="mt-4 text-lg font-extrabold text-slate-950">
            Kiểm tra email của bạn
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Nếu tài khoản có email đã xác thực, hướng dẫn đặt lại mật khẩu sẽ
            được gửi đến email đó.
          </p>
          <div className="mt-5 rounded-xl bg-blue-50 p-3 text-left text-xs leading-5 text-brand-700">
            <Mail className="mr-1 inline size-4" /> Liên kết khôi phục sẽ có
            thời hạn để bảo vệ tài khoản.
          </div>
          <Button className="mt-5 w-full" onClick={handleClose}>
            Quay lại đăng nhập
          </Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
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
          <p className="text-xs leading-5 text-slate-500">
            Hệ thống sẽ gửi hướng dẫn đến email đã được xác thực trong lần thiết
            lập tài khoản đầu tiên.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Gửi hướng dẫn
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
