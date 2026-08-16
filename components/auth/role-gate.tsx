'use client';

import { useEffect, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getRoleHome } from '@/lib/role-routes';
import type { UserRole } from '@/types/auth';

function RoleLoadingScreen() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-slate-50"
      aria-live="polite"
    >
      <div className="text-center">
        <LoaderCircle
          className="mx-auto size-8 animate-spin text-brand-600"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-slate-500">
          Đang mở đúng không gian làm việc...
        </p>
      </div>
    </main>
  );
}

export function RoleGate({
  allowedRole,
  children,
}: {
  allowedRole: UserRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, isInitializing } = useAuth();
  const isAllowed = Boolean(user && user.role === allowedRole);

  useEffect(() => {
    if (isInitializing) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== allowedRole) {
      router.replace(getRoleHome(user.role));
    }
  }, [allowedRole, isInitializing, router, user]);

  if (isInitializing || !isAllowed) return <RoleLoadingScreen />;

  return children;
}
