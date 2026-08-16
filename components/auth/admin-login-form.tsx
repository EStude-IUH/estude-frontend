'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { AuthNotice } from '@/components/auth/auth-notice';
import { FormField } from '@/components/auth/form-field';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/auth-api';
import { getRoleHome } from '@/lib/role-routes';

interface LoginErrors {
  accountName?: string;
  password?: string;
}

export function AdminLoginForm() {
  const router = useRouter();
  const { user, isInitializing, signIn } = useAuth();
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitializing && user) {
      router.replace(getRoleHome(user.role));
    }
  }, [isInitializing, router, user]);

  function validate(): LoginErrors {
    const nextErrors: LoginErrors = {};
    if (!/^[a-z0-9._-]{3,50}$/.test(accountName.trim().toLowerCase())) {
      nextErrors.accountName = 'Tên tài khoản không hợp lệ.';
    }
    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setApiError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await signIn({ accountName, password }, ['ADMIN']);
      router.replace('/admin/dashboard');
    } catch (error) {
      setApiError(
        error instanceof ApiError && error.status === 403
          ? 'Tài khoản không có quyền quản trị hệ thống.'
          : error instanceof ApiError
            ? error.message
            : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4 py-10">
      <section className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/[0.06] sm:p-8">
        <BrandLogo />

        <div className="mt-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-600">
            Đăng nhập Admin
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sử dụng tài khoản quản trị để tiếp tục.
          </p>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          {apiError ? <AuthNotice message={apiError} /> : null}

          <FormField
            id="adminAccountName"
            name="accountName"
            type="text"
            label="Tên tài khoản"
            icon={UserRound}
            placeholder="Nhập tên tài khoản admin"
            autoComplete="username"
            autoFocus
            className="admin-login-input bg-slate-50 focus:bg-white"
            value={accountName}
            error={errors.accountName}
            onChange={(event) => {
              setAccountName(event.target.value);
              setErrors((current) => ({ ...current, accountName: undefined }));
            }}
          />

          <FormField
            id="adminPassword"
            name="password"
            type="password"
            label="Mật khẩu"
            icon={LockKeyhole}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            className="admin-login-input bg-slate-50 focus:bg-white"
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
          />

          <button
            type="submit"
            disabled={isSubmitting || isInitializing}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 font-bold text-white shadow-lg shadow-brand-600/20 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            ) : null}
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Chỉ dành cho quản trị viên được cấp quyền.
        </p>
      </section>
    </main>
  );
}
