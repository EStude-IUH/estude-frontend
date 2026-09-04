"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  History,
} from "lucide-react";
import { ErrorPanel, LoadingPanel } from "@/components/assessment/assessment-shell";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { academicDataService, examService } from "@/lib/assessment-api";
import {
  getRecentStudentCourseAccesses,
  type RecentStudentCourseAccess,
} from "@/lib/student-recent-courses";
import {
  getVietnameseSubjectName,
  toVietnameseSubjectName,
} from "@/lib/subject-localization";
import type { Exam, StudentCourse, StudentExamStatus } from "@/types/assessment";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const statusMeta: Record<
  StudentExamStatus,
  {
    label: string;
    tone: string;
    cellTone: string;
    priority: number;
  }
> = {
  IN_PROGRESS: {
    label: "Đang làm",
    tone: "border-blue-300 bg-blue-100 text-blue-900",
    cellTone: "bg-blue-50/70",
    priority: 0,
  },
  AVAILABLE: {
    label: "Đang mở",
    tone: "border-emerald-300 bg-emerald-100 text-emerald-900",
    cellTone: "bg-emerald-50/70",
    priority: 1,
  },
  UPCOMING: {
    label: "Sắp diễn ra",
    tone: "border-amber-300 bg-amber-100 text-amber-900",
    cellTone: "bg-amber-50/70",
    priority: 2,
  },
  SUBMITTED: {
    label: "Đã nộp",
    tone: "border-violet-300 bg-violet-100 text-violet-900",
    cellTone: "bg-violet-50/70",
    priority: 3,
  },
  ENDED: {
    label: "Đã kết thúc",
    tone: "border-slate-300 bg-slate-100 text-slate-700",
    cellTone: "bg-slate-50",
    priority: 4,
  },
};

interface CalendarExamEvent {
  exam: Exam;
  kind: "START" | "END";
  at: Date;
}

function getStudentStatus(exam: Exam): StudentExamStatus {
  if (exam.studentStatus) return exam.studentStatus;
  if (exam.status === "SCHEDULED") return "UPCOMING";
  if (exam.status === "ONGOING") return "AVAILABLE";
  return "ENDED";
}

function startOfWeek(value: Date): Date {
  const result = new Date(value);
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, amount: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function toDateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function toTimeKey(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function toCalendarDateValue(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseCalendarDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
  );
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function isInWeek(value: Date, weekStart: Date): boolean {
  const weekEnd = addDays(weekStart, 7);
  return value >= weekStart && value < weekEnd;
}

function courseHref(course: StudentCourse): string {
  return `/student/courses/${encodeURIComponent(course.classId)}/${encodeURIComponent(course.subjectId)}`;
}

function formatRecentAccess(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60_000) return "Vừa truy cập";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} phút trước`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} giờ trước`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)} ngày trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}

export function StudentDashboardView() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [recentAccesses, setRecentAccesses] = useState<
    RecentStudentCourseAccess[]
  >([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() =>
    toCalendarDateValue(new Date()),
  );

  useEffect(() => {
    void examService
      .getExams()
      .then((items) => {
        setExams(items);

        const currentWeek = startOfWeek(new Date());
        const hasExamThisWeek = items.some((exam) => {
          const startsAt = new Date(exam.settings.startsAt);
          const endsAt = new Date(exam.settings.endsAt);
          return isInWeek(startsAt, currentWeek) || isInWeek(endsAt, currentWeek);
        });

        if (!hasExamThisWeek) {
          const now = Date.now();
          const nearestExam = [...items]
            .filter((exam) => new Date(exam.settings.endsAt).getTime() >= now)
            .sort(
              (left, right) =>
                new Date(left.settings.startsAt).getTime() -
                new Date(right.settings.startsAt).getTime(),
            )[0];
          if (nearestExam) {
            const nearestDate = new Date(nearestExam.settings.startsAt);
            setWeekStart(startOfWeek(nearestDate));
            setSelectedDate(toCalendarDateValue(nearestDate));
          }
        }
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải danh sách bài kiểm tra",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setRecentAccesses(getRecentStudentCourseAccesses());
    void academicDataService
      .getStudentCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, []);

  const calendarEvents = useMemo<CalendarExamEvent[]>(
    () =>
      exams.flatMap((exam) => [
        { exam, kind: "START" as const, at: new Date(exam.settings.startsAt) },
        { exam, kind: "END" as const, at: new Date(exam.settings.endsAt) },
      ]),
    [exams],
  );

  const visibleEvents = useMemo(
    () => calendarEvents.filter((event) => isInWeek(event.at, weekStart)),
    [calendarEvents, weekStart],
  );

  const weekDays = useMemo(
    () => DAY_LABELS.map((short, index) => ({ short, date: addDays(weekStart, index) })),
    [weekStart],
  );

  const timeSlots = useMemo(
    () =>
      [...new Set(visibleEvents.map((event) => toTimeKey(event.at)))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [visibleEvents],
  );

  const recentCourses = useMemo(
    () =>
      recentAccesses.flatMap((access) => {
        const course = courses.find(
          (item) =>
            item.classId === access.classId && item.subjectId === access.subjectId,
        );
        return course ? [{ course, visitedAt: access.visitedAt }] : [];
      }),
    [courses, recentAccesses],
  );
  const footerCourses = useMemo(
    () =>
      recentCourses.length
        ? recentCourses.slice(0, 3)
        : [...courses]
            .sort(
              (left, right) =>
                new Date(right.updatedAt).getTime() -
                new Date(left.updatedAt).getTime(),
            )
            .slice(0, 3)
            .map((course) => ({ course, visitedAt: null })),
    [courses, recentCourses],
  );

  function openExam(exam: Exam) {
    const status = getStudentStatus(exam);
    if (status === "IN_PROGRESS" && exam.currentAttempt) {
      router.push(`/student/attempts/${exam.currentAttempt.id}`);
      return;
    }
    if (status === "SUBMITTED" && exam.currentAttempt) {
      router.push(`/student/attempts/${exam.currentAttempt.id}/result`);
      return;
    }
    router.push(`/student/exams/${exam.id}`);
  }

  function selectWeek(date: Date) {
    setSelectedDate(toCalendarDateValue(date));
    setWeekStart(startOfWeek(date));
  }

  function selectCalendarDate(value: string) {
    const date = parseCalendarDateValue(value);
    if (date) selectWeek(date);
  }

  return (
    <StudentShell>
      {error ? (
        <div className="mb-5">
          <ErrorPanel message={error} />
        </div>
      ) : null}

      {loading ? (
        <LoadingPanel />
      ) : (
        <>
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-extrabold text-slate-950">
                  Lịch bài kiểm tra tuần
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Tuần trước"
                  onClick={() => selectWeek(addDays(weekStart, -7))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <DateRangePicker
                  from={selectedDate}
                  to={selectedDate}
                  singleDate
                  className="w-[148px]"
                  buttonClassName="!h-8 !rounded-lg !px-3 !text-xs"
                  onChange={({ from }) => selectCalendarDate(from)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectWeek(new Date())}
                >
                  Tuần này
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Tuần sau"
                  onClick={() => selectWeek(addDays(weekStart, 7))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </header>

            <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-3">
              {(Object.entries(statusMeta) as Array<
                [StudentExamStatus, (typeof statusMeta)[StudentExamStatus]]
              >).map(([status, meta]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"
                >
                  <span className={`size-2 rounded-full border ${meta.tone}`} />
                  {meta.label}
                </span>
              ))}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1180px]">
                <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-slate-50/70">
                  <div />
                  {weekDays.map((day) => {
                    const isToday = toDateKey(day.date) === toDateKey(new Date());
                    return (
                      <div
                        key={day.short}
                        className={`border-l border-slate-100 px-3 py-3 text-center ${isToday ? "bg-blue-50" : ""}`}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {day.short}
                        </p>
                        <p
                          className={`mt-0.5 text-lg font-extrabold ${isToday ? "text-brand-700" : "text-slate-800"}`}
                        >
                          {day.date.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {timeSlots.length === 0 ? (
                  <div className="grid min-h-80 place-items-center p-8 text-center">
                    <div>
                      <FileCheck2 className="mx-auto size-10 text-slate-300" />
                      <p className="mt-3 font-bold text-slate-700">
                        Tuần này chưa có bài kiểm tra
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Dùng nút chuyển tuần để xem các bài kiểm tra khác.
                      </p>
                    </div>
                  </div>
                ) : (
                  timeSlots.map((time) => (
                    <div
                      key={time}
                      className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] border-b border-slate-100 last:border-b-0"
                    >
                      <div className="px-3 py-4 text-center text-xs font-bold text-slate-400">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const events = visibleEvents
                          .filter(
                            (event) =>
                              toDateKey(event.at) === toDateKey(day.date) &&
                              toTimeKey(event.at) === time,
                          )
                          .sort(
                            (left, right) =>
                              statusMeta[getStudentStatus(left.exam)].priority -
                              statusMeta[getStudentStatus(right.exam)].priority,
                          );
                        const firstMeta = events[0]
                          ? statusMeta[getStudentStatus(events[0].exam)]
                          : null;
                        const isToday = toDateKey(day.date) === toDateKey(new Date());

                        return (
                          <div
                            key={`${day.short}-${time}`}
                            className={`min-h-[180px] space-y-2 border-l border-slate-100 p-2 ${firstMeta?.cellTone ?? (isToday ? "bg-blue-50/30" : "")}`}
                          >
                            {events.map((event) => {
                              const meta = statusMeta[getStudentStatus(event.exam)];
                              return (
                                <button
                                  key={`${event.exam.id}-${event.kind}`}
                                  type="button"
                                  onClick={() => openExam(event.exam)}
                                  className={`block w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${meta.tone}`}
                                >
                                  <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide opacity-75">
                                    <span>
                                      {event.kind === "START" ? "Bắt đầu" : "Kết thúc"}
                                    </span>
                                    <Clock3 className="size-3" />
                                  </span>
                                  <span className="mt-1.5 line-clamp-2 block text-xs font-extrabold leading-4">
                                    {event.exam.title}
                                  </span>
                                  <span className="mt-2 block truncate text-[10px] font-semibold opacity-75">
                                    {toVietnameseSubjectName(event.exam.subjectName)}
                                  </span>
                                  <span className="mt-1 block text-[10px] opacity-70">
                                    {event.kind === "START"
                                      ? `Đến ${formatDateTime(event.exam.settings.endsAt)}`
                                      : `${event.exam.questions.length} câu · ${event.exam.totalPoints} điểm`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <footer className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <History className="size-5" />
                </span>
                <div>
                  <h2 className="font-black text-slate-900">
                    Lịch sử truy cập
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {recentCourses.length
                      ? "Tiếp tục nhanh từ những môn học bạn vừa xem."
                      : "Các môn học mới nhất trong danh sách của bạn."}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/student/courses")}
              >
                Xem tất cả <ChevronRight className="size-4" />
              </Button>
            </div>

            {coursesLoading ? (
              <div className="grid gap-3 p-4 md:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : footerCourses.length === 0 ? (
              <div className="grid min-h-40 place-items-center p-6 text-center">
                <div>
                  <BookOpen className="mx-auto size-9 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    Chưa có môn học để hiển thị
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-3">
                {footerCourses.map(({ course, visitedAt }) => (
                  <article
                    key={`${course.classId}-${course.subjectId}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-brand-600 to-cyan-400" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                          <BookOpen className="size-5" />
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                          {course.subject.code}
                        </span>
                      </div>
                      <h3 className="mt-3 truncate font-black text-slate-900">
                        {getVietnameseSubjectName(course.subject)}
                      </h3>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {course.schoolClass.name} · {course.teacher.fullName}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {visitedAt
                            ? formatRecentAccess(visitedAt)
                            : "Môn học của bạn"}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => router.push(courseHref(course))}
                        >
                          Mở môn học <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </footer>
        </>
      )}
    </StudentShell>
  );
}
