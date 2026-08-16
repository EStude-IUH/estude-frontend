import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'EStude | Không gian học tập số',
    template: '%s | EStude',
  },
  description: 'Nền tảng học tập và quản lý lớp học dành cho sinh viên IUH.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
