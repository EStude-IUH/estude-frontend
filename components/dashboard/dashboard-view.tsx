"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, ChevronRight, ClipboardCheck, FileText, LoaderCircle } from 'lucide-react';
import { StudentShell } from '@/components/student/student-shell';
import { Button } from '@/components/ui/button';
import { academicDataService } from '@/lib/assessment-api';
import { calendarService } from '@/lib/calendar-api';
import { getRecentStudentCourseAccesses } from '@/lib/student-recent-courses';
import { getVietnameseSubjectName } from '@/lib/subject-localization';
import type { StudentCourse } from '@/types/assessment';
import type { CalendarResponse } from '@/types/calendar';

const defaultZone = process.env.NEXT_PUBLIC_CALENDAR_TIME_ZONE || 'Asia/Ho_Chi_Minh';
const statusLabels: Record<string, string> = {
  UPCOMING: 'Sắp mở', OPEN: 'Đang mở', OVERDUE: 'Quá hạn · còn nhận nộp',
  CLOSED: 'Đã khóa', SUBMITTED: 'Đã nộp', EXCUSED: 'Được miễn',
  IN_PROGRESS: 'Đang làm', FINALIZED: 'Đã hoàn tất', ENDED: 'Đã kết thúc',
};

function dayKey(value: Date, zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function plusDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function displayTime(value: string, zone: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: zone, day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function formatRecentAccess(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60_000) return 'Vừa truy cập';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} phút trước`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} giờ trước`;
  return new Date(value).toLocaleDateString('vi-VN');
}

export function StudentDashboardView() {
  const router = useRouter();
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState('');
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [recentAccesses, setRecentAccesses] = useState(() => getRecentStudentCourseAccesses());
  useEffect(() => {
    let active = true;
    const from = dayKey(new Date(), defaultZone);
    void calendarService.month(from, plusDays(from, 6)).then((value) => {
      if (active) setCalendar(value);
    }).catch((cause: unknown) => {
      if (active) setCalendarError(cause instanceof Error ? cause.message : 'Không tải được lịch học tập');
    }).finally(() => { if (active) setCalendarLoading(false); });
    setRecentAccesses(getRecentStudentCourseAccesses());
    void academicDataService.getStudentCourses().then((value) => {
      if (active) setCourses(value);
    }).catch(() => { if (active) setCourses([]); })
      .finally(() => { if (active) setCoursesLoading(false); });
    return () => { active = false; };
  }, []);
  const footerCourses = useMemo(() => {
    const recent = recentAccesses.flatMap((access) => {
      const course = courses.find((item) => item.classId === access.classId &&
        item.subjectId === access.subjectId);
      return course ? [{ course, visitedAt: access.visitedAt }] : [];
    });
    return recent.length ? recent.slice(0, 3) : [...courses]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3).map((course) => ({ course, visitedAt: null }));
  }, [courses, recentAccesses]);
  const zone = calendar?.timeZone ?? defaultZone;
  return <StudentShell><main className="space-y-5 p-4 sm:p-6">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h1 className="font-extrabold text-slate-950">Lịch học tập 7 ngày tới</h1>
          <p className="mt-1 text-xs text-slate-500">Hạn bài tập và bài kiểm tra · múi giờ {zone}</p></div>
        <Button size="sm" variant="outline" onClick={() => router.push('/student/calendar')}>
          Xem lịch tháng <ChevronRight className="size-4" /></Button>
      </header>
      {calendarLoading ? <p className="flex items-center gap-2 p-6 text-sm text-slate-500"><LoaderCircle className="size-4 animate-spin" />Đang tải lịch...</p> : null}
      {calendarError ? <p role="alert" className="p-6 text-sm text-rose-700">{calendarError}</p> : null}
      {!calendarLoading && !calendarError && !calendar?.events.length ? <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-slate-500"><div><CalendarDays className="mx-auto size-9 text-slate-300" /><p className="mt-2">Không có hạn bài tập hoặc bài kiểm tra trong 7 ngày tới.</p></div></div> : null}
      {!calendarLoading && !calendarError ? <div className="divide-y divide-slate-100">{calendar?.events.map((event) => <button key={`${event.type}:${event.sourceId}`} onClick={() => router.push(event.sourceUrl)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-blue-50/40">
        {event.type === 'EXAM' ? <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-violet-600" /> : <FileText className="mt-0.5 size-5 shrink-0 text-amber-600" />}
        <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-500">{event.subject.name} · {event.schoolClass.code} · {event.type === 'EXAM' ? 'Bài kiểm tra' : 'Hạn bài tập'}</span>
          <span className="mt-1 block font-bold text-slate-900">{event.title}</span>
          <span className="mt-1 block text-xs text-slate-600">{event.type === 'EXAM' && event.endAt ? `${displayTime(event.startAt, zone)} – ${displayTime(event.endAt, zone)}` : displayTime(event.startAt, zone)} · {statusLabels[event.status] ?? event.status}</span></span>
        <ChevronRight className="size-4 shrink-0 text-slate-400" /></button>)}</div> : null}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><BookOpen className="size-5 text-brand-700" /><div><h2 className="font-extrabold">Lịch sử truy cập</h2><p className="text-xs text-slate-500">Tiếp tục nhanh từ những môn học bạn vừa xem.</p></div></div>
        <Button size="sm" variant="outline" onClick={() => router.push('/student/courses')}>Xem tất cả <ChevronRight className="size-4" /></Button></header>
      {coursesLoading ? <p className="p-6 text-sm text-slate-500">Đang tải môn học...</p> : null}
      {!coursesLoading && !footerCourses.length ? <p className="p-6 text-sm text-slate-500">Chưa có môn học để hiển thị.</p> : null}
      {!coursesLoading ? <div className="grid gap-3 p-4 md:grid-cols-3">{footerCourses.map(({ course, visitedAt }) => <button key={`${course.classId}:${course.subjectId}`} onClick={() => router.push(`/student/courses/${course.classId}/${course.subjectId}`)} className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:bg-blue-50/30">
        <span className="text-xs font-bold text-brand-700">{course.subject.code}</span><span className="mt-2 block font-extrabold">{getVietnameseSubjectName(course.subject)}</span>
        <span className="mt-1 block text-xs text-slate-500">{course.schoolClass.name} · {course.teacher.fullName}</span>
        <span className="mt-3 block text-xs text-slate-400">{visitedAt ? formatRecentAccess(visitedAt) : 'Môn học của bạn'}</span></button>)}</div> : null}
    </section>
  </main></StudentShell>;
}
