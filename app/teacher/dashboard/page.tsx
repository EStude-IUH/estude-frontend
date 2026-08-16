import type { Metadata } from 'next';
import { RoleGate } from '@/components/auth/role-gate';
import { StaffDashboardView } from '@/components/dashboard/staff-dashboard-view';

export const metadata: Metadata = {
  title: 'Khu vực giảng viên',
  description: 'Không gian quản lý giảng dạy dành cho giảng viên EStude.',
};

export default function TeacherDashboardPage() {
  return (
    <RoleGate allowedRole="TEACHER">
      <StaffDashboardView />
    </RoleGate>
  );
}
