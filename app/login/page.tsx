import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào không gian học tập EStude.',
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
