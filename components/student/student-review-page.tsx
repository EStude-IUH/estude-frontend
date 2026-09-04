"use client";

import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  Route,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ErrorPanel, LoadingPanel } from "@/components/assessment/assessment-shell";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
} from "@/components/ui/data-table";
import { CustomSelect, Input } from "@/components/ui/form-control";
import { studentOverviewService } from "@/lib/assessment-api";
import { normalizeSearchKeyword } from "@/lib/search-keyword";
import { toVietnameseSubjectName } from "@/lib/subject-localization";
import type { StudentExamScore, StudentOverview } from "@/types/student-overview";

const REVIEW_THRESHOLD = 50;

function bestAttempts(items: StudentExamScore[]): StudentExamScore[] {
  const byExam = new Map<string, StudentExamScore>();
  for (const item of items) {
    const current = byExam.get(item.examId);
    if (!current || (item.percentage ?? -1) > (current.percentage ?? -1)) {
      byExam.set(item.examId, item);
    }
  }
  return [...byExam.values()];
}

function tenPointScore(percentage: number | null): string {
  if (percentage === null) return "--";
  return (percentage / 10).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatDate(value: string | null): string {
  return value
    ? new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "--";
}

function priorityFor(percentage: number | null) {
  if ((percentage ?? 0) < 30) {
    return { label: "Ưu tiên cao", tone: "bg-rose-50 text-rose-700" };
  }
  return { label: "Cần củng cố", tone: "bg-amber-50 text-amber-700" };
}

export function StudentReviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("all");

  useEffect(() => {
    void studentOverviewService
      .getMyOverview()
      .then(setOverview)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải danh sách ôn tập",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const submittedAttempts = useMemo(
    () =>
      bestAttempts(
        (overview?.examResults ?? []).filter(
          (item) => item.status === "SUBMITTED" && item.percentage !== null,
        ),
      ),
    [overview],
  );

  const reviewItems = useMemo(
    () =>
      submittedAttempts
        .filter((item) => (item.percentage ?? 100) < REVIEW_THRESHOLD)
        .sort((left, right) =>
          (left.percentage ?? 100) - (right.percentage ?? 100) ||
          (right.submittedAt ?? "").localeCompare(left.submittedAt ?? ""),
        ),
    [submittedAttempts],
  );

  const subjects = useMemo(() => {
    const unique = new Map<string, { id: string; name: string }>();
    for (const item of reviewItems) {
      unique.set(item.subjectId, {
        id: item.subjectId,
        name: toVietnameseSubjectName(item.subjectName),
      });
    }
    return [...unique.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "vi"),
    );
  }, [reviewItems]);

  const visibleItems = useMemo(() => {
    const keyword = normalizeSearchKeyword(search);
    return reviewItems.filter(
      (item) =>
        (subjectId === "all" || item.subjectId === subjectId) &&
        (!keyword ||
          normalizeSearchKeyword(
            item.title,
            item.subjectName,
            toVietnameseSubjectName(item.subjectName),
            item.className,
            item.termName,
          ).includes(keyword)),
    );
  }, [reviewItems, search, subjectId]);

  const lowestPercentage = reviewItems.reduce<number | null>(
    (lowest, item) =>
      lowest === null
        ? item.percentage
        : Math.min(lowest, item.percentage ?? lowest),
    null,
  );

  if (loading) {
    return (
      <StudentShell>
        <LoadingPanel />
      </StudentShell>
    );
  }
  if (error) {
    return (
      <StudentShell>
        <ErrorPanel message={error} />
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-cyan-500 px-5 py-5 text-white shadow-lg shadow-brand-700/10 sm:px-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-100">
              <Sparkles className="size-4" /> Lộ trình học tập cá nhân hóa
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Ôn tập cùng AI</h1>
            <p className="mt-2 text-sm leading-6 text-blue-50">
              AI phân tích câu trả lời sai, xác định phần kiến thức còn yếu và tạo bộ câu hỏi phù hợp cho từng bài kiểm tra chưa đạt.
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-2 text-center text-xs font-bold">
            <ReviewStep icon={Target} label="Phân tích lỗi" />
            <ReviewStep icon={BrainCircuit} label="Lập lộ trình" />
            <ReviewStep icon={BookOpenCheck} label="Luyện câu hỏi" />
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={BrainCircuit}
          label="Lộ trình cần ôn"
          value={reviewItems.length.toString()}
          detail="Bài có kết quả dưới 50%"
          tone="blue"
        />
        <SummaryCard
          icon={BookOpenCheck}
          label="Môn cần củng cố"
          value={subjects.length.toString()}
          detail="Tổng hợp từ kết quả thực tế"
          tone="violet"
        />
        <SummaryCard
          icon={Target}
          label="Điểm thấp nhất"
          value={tenPointScore(lowestPercentage)}
          detail="Theo thang điểm 10"
          tone="rose"
        />
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <header className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-slate-950">Lộ trình được đề xuất</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Mỗi bài chỉ lấy lượt làm có kết quả tốt nhất; bài đã đạt sẽ tự rời danh sách.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[300px_220px]">
            <Input
              icon={Search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm bài kiểm tra, môn hoặc lớp"
              aria-label="Tìm lộ trình ôn tập"
            />
            <CustomSelect
              value={subjectId}
              options={[
                { value: "all", label: "Tất cả môn học" },
                ...subjects.map((subject) => ({
                  value: subject.id,
                  label: subject.name,
                })),
              ]}
              onValueChange={setSubjectId}
              ariaLabel="Lọc theo môn học"
            />
          </div>
        </header>

        <div className="overflow-x-auto">
          <Table className="min-w-[940px]">
            <TableHeader className="!bg-brand-600 !text-white">
              <tr>
                <TableHead className="w-14 text-center !text-white">#</TableHead>
                <TableHead className="!text-white">Bài kiểm tra</TableHead>
                <TableHead className="!text-white">Môn học / lớp</TableHead>
                <TableHead className="!text-white">Học kỳ</TableHead>
                <TableHead className="text-center !text-white">Kết quả</TableHead>
                <TableHead className="text-center !text-white">Mức ưu tiên</TableHead>
                <TableHead className="w-48 text-right !text-white">Thao tác</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {visibleItems.length === 0 ? (
                <TableEmptyRow
                  colSpan={7}
                  icon={<BookOpenCheck className="size-5 text-emerald-600" />}
                  message={
                    reviewItems.length === 0
                      ? "Bạn chưa có bài kiểm tra dưới 50% cần ôn tập."
                      : "Không tìm thấy lộ trình phù hợp với bộ lọc."
                  }
                />
              ) : null}
              {visibleItems.map((item, index) => {
                const priority = priorityFor(item.percentage);
                const percentage = Math.round(item.percentage ?? 0);
                return (
                  <tr key={item.id} className="transition hover:bg-slate-50/80">
                    <TableCell className="text-center text-slate-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="!px-3">
                      <p className="font-bold text-slate-950">{item.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays className="size-3.5" /> Đã nộp {formatDate(item.submittedAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-800">
                        {toVietnameseSubjectName(item.subjectName)}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-brand-600">
                        {item.className}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-slate-700">
                        {item.termName ?? "Chưa xác định"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.academicYearName ?? ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="mx-auto w-28">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-rose-700">
                            {tenPointScore(item.percentage)}/10
                          </span>
                          <span className="text-slate-400">{percentage}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${priority.tone}`}>
                        {priority.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 whitespace-nowrap px-2.5"
                          onClick={() => router.push(`/student/attempts/${item.id}/study`)}
                        >
                          <Route className="size-3.5" /> Tạo / mở lộ trình
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </StudentShell>
  );
}

function ReviewStep({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-3 backdrop-blur-sm">
      <Icon className="mx-auto size-5" />
      <span className="mt-1.5 block whitespace-nowrap">{label}</span>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "violet" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-brand-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-xl font-black text-slate-950">{value}</p>
        <p className="truncate text-[11px] text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
