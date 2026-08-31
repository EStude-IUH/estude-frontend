import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function HomePage() {
  const roleHome = {
    ADMIN: '/admin/login',
    TEACHER: '/teacher/login',
    STUDENT: '/login',
  } as const;
  const portRole = {
    '3000': 'ADMIN',
    '3001': 'TEACHER',
    '3002': 'STUDENT',
  } as const;
  const host = (await headers()).get('host') ?? '';
  const port = host.match(/:(\d+)$/)?.[1] as keyof typeof portRole | undefined;
  const role = (port ? portRole[port] : undefined) ?? process.env.ESTUDE_APP_ROLE;

  redirect(roleHome[role as keyof typeof roleHome] ?? '/login');
}
