"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  School,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, authenticatedRequest } from "@/lib/auth-api";
import type { User } from "@/types/auth";

type DetailTab = "overview" | "subjects" | "semesters" | "exams" | "warnings";

interface StudentOverview {
  student: User;
  summary: {
    classCount: number;
    subjectCount: number;
    completedExamCount: number;
    averagePercentage: number | null;
    warningCount: number;
  };
  enrollments: Array<{
    id: string;
    joinedAt: string;
    isActive: boolean;
    class: { id: string; code: string; name: string };
    academicYear: {
      id: string;
      name: string;
      status: string;
      startsAt: string;
      endsAt: string;
    } | null;
    subjects: Array<{
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      teacher: { id: string; fullName: string; accountName: string };
    }>;
  }>;
  semesterResults: Array<{
    id: string;
    name: string;
    status: string;
    startsAt: string;
    endsAt: string;
    academicYearId: string;
    academicYearName: string;
    examCount: number;
    averagePercentage: number | null;
  }>;
  examResults: Array<{
    id: string;
    examId: string;
    title: string;
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
    status: "IN_PROGRESS" | "SUBMITTED";
    score: number | null;
    totalPoints: number;
    percentage: number | null;
    correctCount: number | null;
    startedAt: string;
    submittedAt: string | null;
    durationSeconds: number | null;
    termId: string | null;
    termName: string | null;
    academicYearName: string | null;
  }>;
  warnings: Array<{
    id: string;
    level: "HIGH" | "MEDIUM";
    type: "LOW_SCORE" | "MISSED_EXAM";
    title: string;
    description: string;
    subjectId: string;
  }>;
}

const statusLabels: Record<User["status"], string> = {
  ACTIVE: "Đang hoạt động",
  PENDING: "Chờ đăng nhập",
  LOCKED: "Đã khóa",
  INACTIVE: "Ngừng hoạt động",
};

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "subjects", label: "Môn học & lớp" },
  { id: "semesters", label: "Điểm học kỳ" },
  { id: "exams", label: "Bài kiểm tra" },
  { id: "warnings", label: "Cảnh báo" },
];

function formatDate(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "--";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}p ${remainder.toString().padStart(2, "0")}s`;
}

function displayValue(value?: string | null) {
  return value?.trim() || "--";
}

function getInitial(name: string) {
  return name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? "?";
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
      <div>
        <BookOpen className="mx-auto size-8 text-slate-300" />
        <p className="mt-3 text-[13px] font-semibold text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

function ScoreBadge({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-slate-400">Chưa có điểm</span>;
  const tone =
    value >= 80
      ? "bg-emerald-50 text-emerald-700"
      : value >= 50
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      {value.toFixed(1)}%
    </span>
  );
}

export function StudentDetailPanel({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [data, setData] = useState<StudentOverview | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setData(
        await authenticatedRequest<StudentOverview>(
          `/users/${encodeURIComponent(studentId)}/student-overview`,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Không thể tải thông tin chi tiết học sinh.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const allSubjects = useMemo(
    () =>
      data?.enrollments.flatMap((enrollment) =>
        enrollment.subjects.map((subject) => ({ ...subject, enrollment })),
      ) ?? [],
    [data],
  );

  if (isLoading) {
    return (
      <div className="grid h-[calc(100dvh-88px)] place-items-center rounded-xl border border-slate-200 bg-white">
        <div className="text-center text-sm font-semibold text-slate-500">
          <LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-brand-600" />
          Đang tải hồ sơ học tập...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid h-[calc(100dvh-88px)] place-items-center rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div>
          <XCircle className="mx-auto size-10 text-rose-500" />
          <p className="mt-3 text-sm font-bold text-slate-800">
            {error || "Không tìm thấy học sinh."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/users/students")}
            >
              Quay lại danh sách
            </Button>
            <Button onClick={() => void loadDetail()}>Thử lại</Button>
          </div>
        </div>
      </div>
    );
  }

  const { student, summary } = data;
  const activeEnrollment =
    data.enrollments.find(
      (item) => item.isActive && item.academicYear?.status === "ACTIVE",
    ) ??
    data.enrollments.find((item) => item.isActive) ??
    data.enrollments[0];

  const renderSubjects = () =>
    allSubjects.length ? (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[850px] text-left text-[13px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã môn</th>
              <th className="px-4 py-3">Tên môn học</th>
              <th className="px-4 py-3">Lớp</th>
              <th className="px-4 py-3">Năm học</th>
              <th className="px-4 py-3">Giáo viên phụ trách</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {allSubjects.map((item) => (
              <tr key={`${item.enrollment.id}-${item.id}`}>
                <td className="px-4 py-3 font-mono font-semibold text-brand-700">
                  {item.code}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {item.name}
                </td>
                <td className="px-4 py-3">{item.enrollment.class.name}</td>
                <td className="px-4 py-3">
                  {item.enrollment.academicYear?.name ?? "--"}
                </td>
                <td className="px-4 py-3">{item.teacher.fullName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {item.isActive ? "Đang học" : "Ngừng áp dụng"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState message="Học sinh chưa được phân môn trong lớp học." />
    );

  const renderSemesters = () =>
    data.semesterResults.length ? (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Năm học</th>
              <th className="px-4 py-3">Học kỳ</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Bài đã chấm</th>
              <th className="px-4 py-3">Điểm trung bình</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {data.semesterResults.map((term) => (
              <tr key={term.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {term.academicYearName}
                </td>
                <td className="px-4 py-3">{term.name}</td>
                <td className="px-4 py-3">
                  {formatDate(term.startsAt)} – {formatDate(term.endsAt)}
                </td>
                <td className="px-4 py-3">{term.examCount}</td>
                <td className="px-4 py-3">
                  <ScoreBadge value={term.averagePercentage} />
                </td>
                <td className="px-4 py-3">
                  {term.status === "ACTIVE"
                    ? "Đang diễn ra"
                    : term.status === "COMPLETED"
                      ? "Đã kết thúc"
                      : term.status === "LOCKED"
                        ? "Đã khóa"
                        : "Sắp diễn ra"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState message="Chưa có học kỳ gắn với lớp của học sinh." />
    );

  const renderExams = () =>
    data.examResults.length ? (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] text-left text-[13px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Bài kiểm tra</th>
              <th className="px-4 py-3">Môn học</th>
              <th className="px-4 py-3">Lớp</th>
              <th className="px-4 py-3">Học kỳ</th>
              <th className="px-4 py-3">Điểm</th>
              <th className="px-4 py-3">Tỷ lệ</th>
              <th className="px-4 py-3">Thời gian làm</th>
              <th className="px-4 py-3">Ngày nộp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {data.examResults.map((result) => (
              <tr key={result.id}>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {result.title}
                </td>
                <td className="px-4 py-3">{result.subjectName}</td>
                <td className="px-4 py-3">{result.className}</td>
                <td className="px-4 py-3">{result.termName ?? "--"}</td>
                <td className="px-4 py-3 font-semibold">
                  {result.score === null
                    ? "Chưa chấm"
                    : `${result.score}/${result.totalPoints}`}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge value={result.percentage} />
                </td>
                <td className="px-4 py-3">
                  {formatDuration(result.durationSeconds)}
                </td>
                <td className="px-4 py-3">{formatDate(result.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState message="Học sinh chưa có lượt làm bài kiểm tra." />
    );

  const renderWarnings = () =>
    data.warnings.length ? (
      <div className="grid gap-3 lg:grid-cols-2">
        {data.warnings.map((warning) => (
          <div
            key={warning.id}
            className={`rounded-xl border p-4 ${warning.level === "HIGH" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`mt-0.5 size-5 shrink-0 ${warning.level === "HIGH" ? "text-rose-600" : "text-amber-600"}`}
              />
              <div>
                <p className="font-bold text-slate-900">{warning.title}</p>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">
                  {warning.description}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cảnh báo học tập tự động
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="grid min-h-52 place-items-center rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 text-center">
        <div>
          <CheckCircle2 className="mx-auto size-9 text-emerald-500" />
          <p className="mt-3 text-[13px] font-bold text-emerald-800">
            Chưa ghi nhận cảnh báo học tập.
          </p>
        </div>
      </div>
    );

  return (
    <div className="flex h-[calc(100dvh-88px)] min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center gap-2 text-[13px] text-slate-500">
        <button
          type="button"
          onClick={() => router.push("/admin/users/students")}
          className="inline-flex items-center gap-1.5 font-semibold transition hover:text-brand-700"
        >
          <ArrowLeft className="size-4" /> Học sinh
        </button>
        <span>/</span>
        <span className="truncate font-bold text-slate-800">
          {student.fullName}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl font-extrabold text-brand-700">
              {getInitial(student.fullName)}
            </div>
            <h2 className="mt-3 text-lg font-extrabold text-slate-950">
              {student.fullName}
            </h2>
            <p className="mt-1 font-mono text-xs font-bold text-brand-700">
              {student.accountName}
            </p>
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${student.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              {statusLabels[student.status]}
            </span>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Thông tin chung
            </h3>
            <dl className="mt-3 space-y-3 text-[13px]">
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-400">
                    Ngày sinh · Giới tính
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">
                    {formatDate(student.birthday)} ·{" "}
                    {student.gender === "M"
                      ? "Nam"
                      : student.gender === "F"
                        ? "Nữ"
                        : "--"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-400">Số điện thoại</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">
                    {displayValue(student.phoneNumber)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <dt className="text-xs text-slate-400">Email</dt>
                  <dd className="mt-0.5 break-all font-semibold text-slate-700">
                    {displayValue(student.email)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-400">Địa chỉ</dt>
                  <dd className="mt-0.5 font-semibold leading-5 text-slate-700">
                    {displayValue(student.specificAddress)},{" "}
                    {displayValue(student.provinceCity)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-400">Niên khóa</dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">
                    {displayValue(student.course)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <School className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-400">
                    Lớp import / lớp hiện tại
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">
                    {displayValue(student.grade)} /{" "}
                    {activeEnrollment?.class.name ?? "--"}
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="grid shrink-0 grid-cols-2 gap-2 p-3 lg:grid-cols-5">
            {[
              {
                label: "Lớp học",
                value: summary.classCount,
                icon: School,
                tone: "bg-blue-50 text-blue-700",
              },
              {
                label: "Môn học",
                value: summary.subjectCount,
                icon: BookOpen,
                tone: "bg-indigo-50 text-indigo-700",
              },
              {
                label: "Bài đã làm",
                value: summary.completedExamCount,
                icon: ClipboardCheck,
                tone: "bg-emerald-50 text-emerald-700",
              },
              {
                label: "Điểm trung bình",
                value:
                  summary.averagePercentage === null
                    ? "--"
                    : `${summary.averagePercentage.toFixed(1)}%`,
                icon: GraduationCap,
                tone: "bg-violet-50 text-violet-700",
              },
              {
                label: "Cảnh báo",
                value: summary.warningCount,
                icon: ShieldAlert,
                tone: summary.warningCount
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-50 text-slate-600",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${card.tone}`}
                >
                  <card.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-0.5 text-lg font-extrabold text-slate-950">
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 overflow-x-auto border-y border-slate-100 px-3">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-3 text-[13px] font-bold transition ${activeTab === tab.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  {tab.label}
                  {tab.id === "warnings" && summary.warningCount
                    ? ` (${summary.warningCount})`
                    : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activeTab === "overview" ? (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                    Lớp học hiện tại
                  </h3>
                  {data.enrollments.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {data.enrollments.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">
                                {item.class.name}
                              </p>
                              <p className="mt-1 font-mono text-xs font-semibold text-brand-700">
                                {item.class.code}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {item.isActive ? "Đang học" : "Đã kết thúc"}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                            <div>
                              <p className="text-xs text-slate-400">Năm học</p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {item.academicYear?.name ?? "--"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Số môn</p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {item.subjects.length}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="Học sinh chưa được xếp vào lớp học." />
                  )}
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                    Kết quả theo học kỳ
                  </h3>
                  {renderSemesters()}
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                    Cảnh báo cần chú ý
                  </h3>
                  {renderWarnings()}
                </div>
              </div>
            ) : null}
            {activeTab === "subjects" ? renderSubjects() : null}
            {activeTab === "semesters" ? renderSemesters() : null}
            {activeTab === "exams" ? renderExams() : null}
            {activeTab === "warnings" ? renderWarnings() : null}
          </div>
        </section>
      </div>
    </div>
  );
}
