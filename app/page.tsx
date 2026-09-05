import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getPortalFromHost } from '@/lib/portal';

export default async function HomePage() {
  const roleHome = {
    ADMIN: '/admin/login',
    TEACHER: '/teacher/login',
    STUDENT: '/login',
    PARENT: '/parent/login',
  } as const;
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const portal = getPortalFromHost(host);
  const role = portal?.toUpperCase() ?? process.env.ESTUDE_APP_ROLE;

  redirect(roleHome[role as keyof typeof roleHome] ?? '/login');
}
