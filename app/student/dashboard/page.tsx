import type { Metadata } from 'next';
import { RoleGate } from '@/components/auth/role-gate';
import { StudentDashboardView } from '@/components/dashboard/dashboard-view';

export const metadata: Metadata = {
  title: 'Không gian sinh viên',
  description: 'Theo dõi khóa học, lịch học và tiến độ học tập cá nhân.',
};

export default function StudentDashboardPage() {
  return (
    <RoleGate allowedRole="STUDENT">
      <StudentDashboardView />
    </RoleGate>
  );
}
