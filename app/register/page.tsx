import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản sinh viên EStude.',
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
