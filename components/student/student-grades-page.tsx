"use client";

import { StudentShell } from '@/components/student/student-shell';
import { OfficialGradeReport } from '@/components/assessment/official-grade-report';

export function StudentGradesPage() {
  return <StudentShell><OfficialGradeReport /></StudentShell>;
}
