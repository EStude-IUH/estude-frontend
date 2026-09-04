"use client";

import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  GraduationCap,
  School,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { CustomSelect } from "@/components/ui/form-control";
import { studentOverviewService } from "@/lib/assessment-api";
import { toVietnameseSubjectName } from "@/lib/subject-localization";
import type { StudentExamScore, StudentOverview } from "@/types/student-overview";

function tenPointScore(percentage: number | null): string {
  if (percentage === null) return "--";
  return (percentage / 10).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function scoreClassification(percentage: number | null) {
  if (percentage === null) return { label: "Chưa có điểm", tone: "bg-slate-100 text-slate-500" };
  if (percentage >= 85) return { label: "Giỏi", tone: "bg-emerald-50 text-emerald-700" };
  if (percentage >= 70) return { label: "Khá", tone: "bg-blue-50 text-brand-700" };
  if (percentage >= 50) return { label: "Trung bình", tone: "bg-amber-50 text-amber-700" };
  return { label: "Chưa đạt", tone: "bg-rose-50 text-rose-700" };
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("vi-VN") : "--";
}

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

export function StudentGradesPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("all");

  useEffect(() => {
    void studentOverviewService
      .getMyOverview()
      .then((data) => {
        setOverview(data);
        const years = data.enrollments.flatMap((item) => item.academicYear ? [item.academicYear] : []);
        const selectedYear = years.find((year) => year.status === "ACTIVE") ?? years[0];
        if (selectedYear) {
          setYearId(selectedYear.id);
          const terms = data.semesterResults.filter((term) => term.academicYearId === selectedYear.id);
          setTermId((terms.find((term) => term.status === "ACTIVE") ?? terms[0])?.id ?? "all");
          setClassId(data.enrollments.find((item) => item.academicYear?.id === selectedYear.id)?.class.id ?? "all");
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải bảng điểm"))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const unique = new Map<string, NonNullable<StudentOverview["enrollments"][number]["academicYear"]>>();
    for (const enrollment of overview?.enrollments ?? []) {
      if (enrollment.academicYear) unique.set(enrollment.academicYear.id, enrollment.academicYear);
    }
    return [...unique.values()];
  }, [overview]);

  const terms = useMemo(
    () => overview?.semesterResults.filter((term) => !yearId || term.academicYearId === yearId) ?? [],
    [overview, yearId],
  );
  const enrollments = useMemo(
    () => overview?.enrollments.filter((item) => !yearId || item.academicYear?.id === yearId) ?? [],
    [overview, yearId],
  );
  const selectedEnrollment = useMemo(
    () => enrollments.find((item) => item.class.id === classId) ?? enrollments[0],
    [enrollments, classId],
  );
  const subjects = useMemo(
    () => selectedEnrollment?.subjects.filter((subject) => subject.isActive) ?? [],
    [selectedEnrollment],
  );

  useEffect(() => {
    if (!terms.some((term) => term.id === termId)) {
      setTermId((terms.find((term) => term.status === "ACTIVE") ?? terms[0])?.id ?? "all");
    }
    if (!enrollments.some((item) => item.class.id === classId)) {
      setClassId(enrollments[0]?.class.id ?? "all");
    }
    setSubjectId("all");
  }, [yearId, terms, enrollments, termId, classId]);

  const filteredAttempts = useMemo(() => {
    const items = (overview?.examResults ?? []).filter(
      (item) =>
        item.status === "SUBMITTED" &&
        item.score !== null &&
        (!classId || classId === "all" || item.classId === classId) &&
        (!termId || termId === "all" || item.termId === termId) &&
        (subjectId === "all" || item.subjectId === subjectId),
    );
    return bestAttempts(items);
  }, [overview, classId, termId, subjectId]);

  const subjectRows = useMemo(() => {
    const visibleSubjects = subjectId === "all" ? subjects : subjects.filter((item) => item.id === subjectId);
    return visibleSubjects.map((subject) => {
      const attempts = filteredAttempts.filter((item) => item.subjectId === subject.id);
      const values = attempts.flatMap((item) => item.percentage === null ? [] : [item.percentage]);
      const average = values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
        : null;
      return { ...subject, attempts, average };
    });
  }, [subjects, subjectId, filteredAttempts]);

  const gradedRows = subjectRows.filter((row) => row.average !== null);
  const overallAverage = gradedRows.length
    ? gradedRows.reduce((sum, row) => sum + (row.average ?? 0), 0) / gradedRows.length
    : null;

  if (loading) return <StudentShell><LoadingPanel /></StudentShell>;
  if (error) return <StudentShell><ErrorPanel message={error} /></StudentShell>;
  if (!overview) return null;

  return (
    <StudentShell>
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CustomSelect
            label="Năm học"
            value={yearId}
            options={years.map((year) => ({ value: year.id, label: year.name }))}
            onValueChange={setYearId}
            ariaLabel="Chọn năm học"
          />
          <CustomSelect
            label="Học kỳ"
            value={termId}
            options={[{ value: "all", label: "Cả năm học" }, ...terms.map((term) => ({ value: term.id, label: term.name }))]}
            onValueChange={setTermId}
            ariaLabel="Chọn học kỳ"
          />
          <CustomSelect
            label="Lớp học"
            value={classId}
            options={enrollments.map((item) => ({ value: item.class.id, label: `${item.class.code} · ${item.class.name}` }))}
            onValueChange={setClassId}
            ariaLabel="Chọn lớp học"
          />
          <CustomSelect
            label="Môn học"
            value={subjectId}
            options={[{ value: "all", label: "Tất cả môn học" }, ...subjects.map((subject) => ({ value: subject.id, label: `${subject.code} · ${toVietnameseSubjectName(subject.name)}` }))]}
            onValueChange={setSubjectId}
            ariaLabel="Chọn môn học"
          />
        </div>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={BarChart3} label="Điểm trung bình" value={tenPointScore(overallAverage)} detail="Thang điểm 10" tone="blue" />
        <SummaryCard icon={BookOpen} label="Môn đã có điểm" value={`${gradedRows.length}/${subjectRows.length}`} tone="violet" />
        <SummaryCard icon={CheckCircle2} label="Bài đã chấm" value={filteredAttempts.length.toString()} tone="emerald" />
        <SummaryCard icon={School} label="Lớp đang xem" value={selectedEnrollment?.class.code ?? "--"} tone="amber" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-black text-slate-950">Bảng điểm môn học</h2>
            <p className="mt-0.5 text-xs text-slate-500">Điểm trung bình được tính từ lượt làm tốt nhất của mỗi bài kiểm tra.</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
            {terms.find((term) => term.id === termId)?.name ?? "Cả năm học"}
          </span>
        </header>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-brand-600 text-white">
              <tr>
                <TableHead className="w-14 text-center text-white">#</TableHead>
                <TableHead className="text-white">Môn học</TableHead>
                <TableHead className="text-white">Giảng viên</TableHead>
                <TableHead className="text-center text-white">Bài đã chấm</TableHead>
                <TableHead className="text-center text-white">Điểm TB</TableHead>
                <TableHead className="text-center text-white">Kết quả</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {subjectRows.length === 0 ? <TableEmptyRow colSpan={6} message="Chưa có môn học trong phạm vi đã chọn" icon={<GraduationCap className="size-5 text-slate-400" />} /> : null}
              {subjectRows.map((row, index) => {
                const classification = scoreClassification(row.average);
                return (
                  <tr key={row.id} className="transition hover:bg-slate-50/70">
                    <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900">{row.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-brand-600">{row.code}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-slate-700">{row.teacher.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{row.teacher.accountName}</p>
                    </TableCell>
                    <TableCell className="text-center font-bold">{row.attempts.length}</TableCell>
                    <TableCell className="text-center text-base font-black text-slate-950">{tenPointScore(row.average)}</TableCell>
                    <TableCell className="text-center"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${classification.tone}`}>{classification.label}</span></TableCell>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-950">Chi tiết bài kiểm tra</h2>
          <p className="mt-0.5 text-xs text-slate-500">Các lượt làm tốt nhất trong phạm vi đang chọn.</p>
        </header>
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader className="bg-brand-600 text-white">
              <tr>
                <TableHead className="text-white">Bài kiểm tra</TableHead>
                <TableHead className="text-white">Môn học</TableHead>
                <TableHead className="text-white">Học kỳ</TableHead>
                <TableHead className="text-center text-white">Điểm</TableHead>
                <TableHead className="text-center text-white">Thang 10</TableHead>
                <TableHead className="text-white">Ngày nộp</TableHead>
                <TableHead className="w-20 text-right text-white">Thao tác</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredAttempts.length === 0 ? <TableEmptyRow colSpan={7} message="Chưa có bài kiểm tra đã chấm điểm" icon={<ClipboardCheck className="size-5 text-slate-400" />} /> : null}
              {filteredAttempts.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <TableCell className="font-bold text-slate-900">{item.title}</TableCell>
                  <TableCell>{toVietnameseSubjectName(item.subjectName)}</TableCell>
                  <TableCell>{item.termName ?? "Chưa xác định"}</TableCell>
                  <TableCell className="text-center font-bold">{item.score}/{item.totalPoints}</TableCell>
                  <TableCell className="text-center font-black">{tenPointScore(item.percentage)}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDate(item.submittedAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" title="Xem kết quả" aria-label={`Xem kết quả ${item.title}`} onClick={() => router.push(`/student/attempts/${item.id}/result`)}>
                        <Eye size={18} strokeWidth={2.5} />
                      </Button>
                    </div>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </StudentShell>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: typeof BarChart3; label: string; value: string; detail?: string; tone: "blue" | "violet" | "emerald" | "amber" }) {
  const tones = {
    blue: "bg-blue-50 text-brand-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} strokeWidth={2.25} /></span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="truncate text-xl font-black text-slate-950">{value}</p>
        {detail ? <p className="text-[11px] text-slate-400">{detail}</p> : null}
      </div>
    </div>
  );
}
