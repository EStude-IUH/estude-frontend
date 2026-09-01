"use client";

import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Hash,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ErrorPanel, LoadingPanel } from "@/components/assessment/assessment-shell";
import { StudentExamList } from "@/components/assessment/student-exam-pages";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { academicDataService, examService } from "@/lib/assessment-api";
import type { Exam, StudentCourse } from "@/types/assessment";

function courseHref(course: StudentCourse): string {
  return `/student/courses/${encodeURIComponent(course.classId)}/${encodeURIComponent(course.subjectId)}`;
}

export function StudentCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void academicDataService
      .getStudentCourses()
      .then((items) =>
        setCourses(
          [...items].sort((left, right) =>
            left.subject.name.localeCompare(right.subject.name, "vi"),
          ),
        ),
      )
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải môn học",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
          Không gian học tập
        </p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
          Môn học của tôi
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Chọn đúng môn học và lớp để xem nội dung, tài liệu và bài kiểm tra
          được giao.
        </p>
      </div>

      {error ? <ErrorPanel message={error} /> : null}
      {loading ? (
        <LoadingPanel />
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <BookOpen className="mx-auto size-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Bạn chưa được gán vào môn học nào.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
            >
              <div className="h-1.5 bg-gradient-to-r from-brand-600 to-cyan-400" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <GraduationCap className="size-5" />
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {course.subject.code}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-950">
                  {course.subject.name}
                </h2>
                <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <BookOpen className="size-4 text-brand-500" />
                    <span className="font-semibold">{course.schoolClass.name}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Hash className="size-4 text-brand-500" />
                    Mã lớp: <b className="text-slate-800">{course.schoolClass.code}</b>
                  </p>
                  <p className="flex items-center gap-2">
                    <UserRound className="size-4 text-brand-500" />
                    {course.teacher.fullName}
                  </p>
                </div>
                <Button
                  className="mt-5 w-full"
                  onClick={() => router.push(courseHref(course))}
                >
                  Vào môn học
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}

type CourseSection = "overview" | "exams" | "review";

export function StudentCourseDetailPage() {
  const params = useParams<{ classId: string; subjectId: string }>();
  const router = useRouter();
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [activeSection, setActiveSection] = useState<CourseSection>("exams");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void academicDataService
      .getStudentCourses()
      .then(setCourses)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải môn học",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const course = useMemo(
    () =>
      courses.find(
        (item) =>
          item.classId === params.classId && item.subjectId === params.subjectId,
      ),
    [courses, params.classId, params.subjectId],
  );

  return (
    <StudentShell>
      {loading ? (
        <LoadingPanel />
      ) : error ? (
        <ErrorPanel message={error} />
      ) : !course ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="font-bold text-rose-700">
            Không tìm thấy môn học trong lớp của bạn.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/student/courses")}
          >
            <ArrowLeft className="size-4" /> Quay lại danh sách môn
          </Button>
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push("/student/courses")}
          >
            <ArrowLeft className="size-4" /> Môn học của tôi
          </Button>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="bg-gradient-to-r from-brand-700 to-cyan-500 px-6 py-7 text-white sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-bold text-blue-100">
                    {course.subject.code}
                  </p>
                  <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                    {course.subject.name}
                  </h1>
                  <p className="mt-3 text-sm text-blue-50">
                    {course.schoolClass.name} · Mã lớp {course.schoolClass.code}
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
                  <p className="text-xs text-blue-100">Giáo viên phụ trách</p>
                  <p className="mt-1 font-bold">{course.teacher.fullName}</p>
                </div>
              </div>
            </div>

            <nav
              className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:px-6"
              aria-label="Nội dung môn học"
            >
              <button
                type="button"
                onClick={() => setActiveSection("overview")}
                className={`relative flex h-14 shrink-0 items-center gap-2 px-3 text-sm font-bold ${activeSection === "overview" ? "text-brand-700" : "text-slate-500 hover:text-slate-900"}`}
              >
                <BookOpen className="size-4" /> Tổng quan
                {activeSection === "overview" ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 bg-brand-600" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("exams")}
                className={`relative flex h-14 shrink-0 items-center gap-2 px-3 text-sm font-bold ${activeSection === "exams" ? "text-brand-700" : "text-slate-500 hover:text-slate-900"}`}
              >
                <ClipboardCheck className="size-4" /> Bài kiểm tra
                {activeSection === "exams" ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 bg-brand-600" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("review")}
                className={`relative flex h-14 shrink-0 items-center gap-2 px-3 text-sm font-bold ${activeSection === "review" ? "text-brand-700" : "text-slate-500 hover:text-slate-900"}`}
              >
                <BrainCircuit className="size-4" /> Ôn tập
                {activeSection === "review" ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 bg-brand-600" />
                ) : null}
              </button>
            </nav>
          </section>

          <div className="mt-5">
            {activeSection === "overview" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="text-lg font-black text-slate-950">
                  Thông tin môn học
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">Tên lớp</p>
                    <p className="mt-1 font-bold">{course.schoolClass.name}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">Mã lớp</p>
                    <p className="mt-1 font-bold">{course.schoolClass.code}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">Giáo viên</p>
                    <p className="mt-1 font-bold">{course.teacher.fullName}</p>
                  </div>
                </div>
              </section>
            ) : activeSection === "exams" ? (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-black text-slate-950">
                    Bài kiểm tra
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Các bài kiểm tra được giao riêng cho môn học và lớp này.
                  </p>
                </div>
                <StudentExamList
                  classId={course.classId}
                  subjectId={course.subjectId}
                />
              </section>
            ) : (
              <StudentReviewList
                classId={course.classId}
                subjectId={course.subjectId}
              />
            )}
          </div>
        </>
      )}
    </StudentShell>
  );
}

function StudentReviewList({
  classId,
  subjectId,
}: {
  classId: string;
  subjectId: string;
}) {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void examService
      .getExams()
      .then((items) =>
        setExams(
          items.filter(
            (exam) =>
              exam.classId === classId &&
              exam.subjectId === subjectId &&
              exam.currentAttempt?.status === "SUBMITTED",
          ),
        ),
      )
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải nội dung ôn tập",
        ),
      )
      .finally(() => setLoading(false));
  }, [classId, subjectId]);

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-black text-slate-950">Phân tích và ôn tập</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn một bài đã nộp để xem phần kiến thức còn yếu và luyện câu hỏi
          thích ứng.
        </p>
      </div>
      {exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BrainCircuit className="mx-auto size-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Chưa có bài kiểm tra đã nộp để phân tích.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.map((exam) => (
            <article
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                    Đã nộp bài
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">{exam.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {exam.questions.length} câu · {exam.totalPoints} điểm
                  </p>
                </div>
              </div>
              <Button
                className="mt-5 w-full"
                onClick={() =>
                  router.push(
                    `/student/attempts/${exam.currentAttempt?.id}/study`,
                  )
                }
              >
                <BrainCircuit className="size-4" /> Xem phân tích và ôn tập
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
