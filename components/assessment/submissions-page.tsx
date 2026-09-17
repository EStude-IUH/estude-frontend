"use client";

import { BarChart3, BookOpenCheck, CheckCircle2, CircleAlert, Eye, FileText, MessageSquareText, Save, Send, Timer, UserRoundSearch, UsersRound, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AssessmentShell, ErrorPanel, LoadingPanel, PageHeading } from "@/components/assessment/assessment-shell";
import { useActionNotification } from "@/components/ui/action-notification";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableEmptyRow, TableHead, TableHeader } from "@/components/ui/data-table";
import { Textarea } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { examService } from "@/lib/assessment-api";
import type { Exam, ExamAttempt, ExamClassReport, ExamClassReportStudent, TeacherReviewStatus } from "@/types/assessment";

export function SubmissionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { notify } = useActionNotification();
  const [exam, setExam] = useState<Exam | null>(null);
  const [report, setReport] = useState<ExamClassReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"students" | "topics" | "questions">("students");
  const [selectedStudent, setSelectedStudent] = useState<ExamClassReportStudent | null>(null);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    void Promise.all([examService.getExamById(params.id), examService.getClassReport(params.id)])
      .then(([loadedExam, loadedReport]) => {
        setExam(loadedExam);
        setReport(loadedReport);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo kết quả lớp"),
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  const supportStudents = useMemo(
    () => report?.students.filter((student) => student.needsSupport) ?? [],
    [report],
  );

  function openStudentSubjectProfile(studentId: string) {
    if (!exam) return;
    const query = new URLSearchParams({
      tab: "exams",
      classId: exam.classId,
      subjectId: exam.subjectId,
      returnTo: `/teacher/exams/${exam.id}/submissions`,
    });
    router.push(`/teacher/students/${encodeURIComponent(studentId)}?${query.toString()}`);
  }

  function openReview(student: ExamClassReportStudent) {
    setSelectedStudent(student);
    setComment(student.review?.comment ?? "");
  }

  async function saveReview(status: TeacherReviewStatus) {
    if (!selectedStudent || !report) return;
    setSavingReview(true);
    try {
      const review = await examService.updateStudentReview(
        params.id,
        selectedStudent.id,
        { comment, status },
      );
      setReport({
        ...report,
        students: report.students.map((student) =>
          student.id === selectedStudent.id ? { ...student, review } : student,
        ),
      });
      setSelectedStudent((current) => current ? { ...current, review } : current);
      notify(status === "PUBLISHED" ? "Đã công bố nhận xét" : "Đã lưu bản nháp nhận xét", {
        key: "exam-student-review-saved",
      });
      if (status === "PUBLISHED") setSelectedStudent(null);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Không thể lưu nhận xét", {
        key: "exam-student-review-error",
        variant: "error",
      });
    } finally {
      setSavingReview(false);
    }
  }

  if (loading) return <AssessmentShell><LoadingPanel /></AssessmentShell>;
  if (error || !exam || !report) return <AssessmentShell><ErrorPanel message={error || "Không tìm thấy báo cáo bài kiểm tra"} /></AssessmentShell>;
  const { summary } = report;
  return (
    <AssessmentShell>
      <PageHeading eyebrow="Class assessment report" title="Báo cáo kết quả lớp" description={`${exam.title} · ${exam.className} · ${exam.subjectName}`} />

      <section data-testid="class-report-policy" className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-brand-600" />
        <div>
          <p className="font-black">Quy tắc thống kê: lượt đã nộp gần nhất của mỗi học sinh</p>
          <p className="mt-0.5 leading-6 text-blue-800">{report.policy.note} Danh sách gồm toàn bộ học sinh đang ghi danh trong lớp; ngưỡng cần hỗ trợ là dưới {report.policy.supportThresholdPercent}%.</p>
        </div>
      </section>

      <div data-testid="class-report-summary" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<UsersRound className="size-5" />} label="Học sinh trong lớp" value={summary.enrolledStudentCount} detail={`${summary.uniqueAttemptedStudentCount} em đã bắt đầu`} tone="blue" />
        <Metric icon={<FileText className="size-5" />} label="Tổng lượt làm" value={summary.totalAttemptCount} detail={`${summary.submittedStudentCount} em đã nộp`} tone="violet" />
        <Metric icon={<BarChart3 className="size-5" />} label="Điểm trung bình" value={summary.averageScore === null ? "—" : `${formatNumber(summary.averageScore)}/${formatNumber(exam.totalPoints)}`} detail={`Trung vị ${summary.medianScore === null ? "—" : formatNumber(summary.medianScore)}`} tone="emerald" />
        <Metric icon={<Timer className="size-5" />} label="Thời gian trung bình" value={formatDuration(summary.averageDurationSeconds)} detail={`Trung vị ${formatDuration(summary.medianDurationSeconds)}`} tone="amber" />
      </div>

      <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-card">
        <StatusCount label="Chưa bắt đầu" value={summary.notStartedCount} className="text-slate-600" />
        <StatusCount label="Đang làm" value={summary.inProgressStudentCount} className="border-x border-slate-200 text-amber-700" />
        <StatusCount label="Đã nộp" value={summary.submittedStudentCount} className="text-emerald-700" />
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-card">
          <ReportTab active={view === "students"} onClick={() => setView("students")} label={`Học sinh (${summary.enrolledStudentCount})`} />
          <ReportTab active={view === "topics"} onClick={() => setView("topics")} label={`Chủ đề (${report.topicPerformance.length})`} />
          <ReportTab active={view === "questions"} onClick={() => setView("questions")} label={`Câu hỏi (${report.questionPerformance.length})`} />
        </div>
        <div data-testid="support-group-summary" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">
          <UserRoundSearch className="size-4" /> {supportStudents.length} học sinh cần hỗ trợ
        </div>
      </div>

      {view === "students" ? (
        <StudentReportTable students={report.students} onOpenAttempt={(attemptId) => router.push(`/teacher/exams/${exam.id}/submissions/${attemptId}`)} onOpenProfile={openStudentSubjectProfile} onReview={openReview} />
      ) : view === "topics" ? (
        <TopicReportTable report={report} onOpenStudent={openStudentSubjectProfile} />
      ) : (
        <QuestionReportTable report={report} />
      )}

      <Modal
        open={selectedStudent !== null}
        title={`Nhận xét cho ${selectedStudent?.fullName ?? "học sinh"}`}
        description="Lưu nháp để tiếp tục chỉnh sửa hoặc công bố khi giáo viên đã kiểm tra nội dung."
        width="max-w-2xl"
        onClose={() => setSelectedStudent(null)}
        footer={<><Button variant="outline" disabled={savingReview} onClick={() => void saveReview("DRAFT")}><Save className="size-4" />Lưu nháp</Button><Button disabled={savingReview || !comment.trim()} onClick={() => void saveReview("PUBLISHED")}><Send className="size-4" />Công bố nhận xét</Button></>}
      >
        <Textarea label="Nhận xét của giáo viên" hint="Tối đa 2.000 ký tự. Nêu rõ phần làm tốt, nội dung cần củng cố và bước tiếp theo." rows={7} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ví dụ: Em đã nắm được phần Đại số. Cần xem lại điều kiện áp dụng ở phần Hình học và làm bộ câu luyện được giao." />
        {selectedStudent?.supportTopicNames.length ? <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><b>Dữ liệu tham khảo:</b> {selectedStudent.supportTopicNames.join(", ")} đang dưới ngưỡng {report.policy.supportThresholdPercent}% trong lượt được chọn.</p> : null}
      </Modal>
    </AssessmentShell>
  );
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string | number; detail: string; tone: "blue" | "violet" | "emerald" | "amber" }) {
  const tones = { blue: "bg-blue-50 text-brand-700", violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-0.5 text-2xl font-black text-slate-950">{value}</p><p className="text-[11px] text-slate-400">{detail}</p></div></div>;
}

function ReportTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>;
}

function StatusCount({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className={`px-3 py-3 ${className}`}><p className="text-xl font-black">{value}</p><p className="text-xs font-semibold">{label}</p></div>;
}

function StudentReportTable({ students, onOpenAttempt, onOpenProfile, onReview }: { students: ExamClassReportStudent[]; onOpenAttempt: (attemptId: string) => void; onOpenProfile: (studentId: string) => void; onReview: (student: ExamClassReportStudent) => void }) {
  return <section data-testid="class-report-students" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"><div className="overflow-x-auto"><Table className="min-w-[1120px]"><TableHeader className="sticky top-0 z-10 !bg-brand-600 !text-white"><tr><TableHead className="!text-white">Học sinh</TableHead><TableHead className="!text-white">Trạng thái</TableHead><TableHead className="text-center !text-white">Số lượt</TableHead><TableHead className="text-center !text-white">Lượt dùng để báo cáo</TableHead><TableHead className="!text-white">Nội dung cần hỗ trợ</TableHead><TableHead className="!text-white">Nhận xét</TableHead><TableHead className="text-right !text-white">Thao tác</TableHead></tr></TableHeader><TableBody>{students.length === 0 ? <TableEmptyRow colSpan={7} message="Lớp chưa có học sinh đang ghi danh." /> : null}{students.map((student) => <tr key={student.id} className="transition hover:bg-slate-50/70"><TableCell><button type="button" className="text-left" onClick={() => onOpenProfile(student.id)}><p className="font-bold text-slate-900 hover:text-brand-700">{student.fullName}</p><p className="mt-1 font-mono text-xs text-slate-400">{student.studentCode}</p></button></TableCell><TableCell><ParticipationBadge status={student.participationStatus} /></TableCell><TableCell className="text-center"><b>{student.attemptCount}</b><p className="text-[11px] text-slate-400">{student.submittedAttemptCount} đã nộp</p></TableCell><TableCell className="text-center">{student.selectedAttempt?.status === "SUBMITTED" ? <><b className={student.needsSupport ? "text-rose-700" : "text-emerald-700"}>{student.selectedAttempt.score === null ? "—" : `${formatNumber(student.selectedAttempt.score)}/${formatNumber(student.selectedAttempt.maxScore)}`}</b><p className="text-[11px] text-slate-400">{student.selectedAttempt.percentage === null ? "Chưa có tỷ lệ" : `${formatNumber(student.selectedAttempt.percentage)}%`} · {formatDuration(student.selectedAttempt.durationSeconds)}</p></> : <span className="text-sm text-slate-400">Chưa có lượt đã nộp</span>}</TableCell><TableCell>{student.supportTopicNames.length ? <div className="flex max-w-72 flex-wrap gap-1.5">{student.supportTopicNames.map((topic) => <span key={topic} className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">{topic}</span>)}</div> : student.participationStatus === "SUBMITTED" ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><BookOpenCheck className="size-4" />Đạt ngưỡng các chủ đề</span> : <span className="text-sm text-slate-400">Chưa có dữ liệu</span>}</TableCell><TableCell>{student.review ? <><span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${student.review.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{student.review.status === "PUBLISHED" ? "Đã công bố" : "Bản nháp"}</span><p className="mt-1 max-w-64 truncate text-xs text-slate-500">{student.review.comment || "Chưa có nội dung"}</p></> : <span className="text-sm text-slate-400">Chưa nhận xét</span>}</TableCell><TableCell><div className="flex justify-end gap-2">{student.selectedAttempt ? <Button size="sm" variant="outline" onClick={() => onOpenAttempt(student.selectedAttempt!.id)}><Eye className="size-4" />Xem bài</Button> : null}<Button size="sm" variant="secondary" onClick={() => onReview(student)}><MessageSquareText className="size-4" />Nhận xét</Button></div></TableCell></tr>)}</TableBody></Table></div><p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Điểm và thời gian chỉ lấy từ lượt đã nộp gần nhất. Lượt đang làm không tham gia tính trung bình.</p></section>;
}

function TopicReportTable({ report, onOpenStudent }: { report: ExamClassReport; onOpenStudent: (studentId: string) => void }) {
  const names = new Map(report.students.map((student) => [student.id, student.fullName]));
  return <section data-testid="class-report-topics" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"><div className="overflow-x-auto"><Table className="min-w-[900px]"><TableHeader className="!bg-brand-600 !text-white"><tr><TableHead className="!text-white">Chủ đề</TableHead><TableHead className="text-center !text-white">Số câu</TableHead><TableHead className="text-center !text-white">Cơ hội trả lời</TableHead><TableHead className="text-center !text-white">Đúng</TableHead><TableHead className="text-center !text-white">Chính xác</TableHead><TableHead className="!text-white">Nhóm cần hỗ trợ</TableHead></tr></TableHeader><TableBody>{report.topicPerformance.length === 0 ? <TableEmptyRow colSpan={6} message="Chưa có câu hỏi khách quan để phân tích theo chủ đề." /> : null}{report.topicPerformance.map((topic) => <tr key={topic.topicId || topic.topicName}><TableCell><p className="font-bold text-slate-900">{topic.topicName}</p><p className="text-xs text-slate-400">{topic.incorrectCount} sai · {topic.unansweredCount} bỏ trống</p></TableCell><TableCell className="text-center font-bold">{topic.questionCount}</TableCell><TableCell className="text-center">{topic.opportunityCount}</TableCell><TableCell className="text-center font-bold text-emerald-700">{topic.correctCount}</TableCell><TableCell className="text-center"><AccuracyBadge value={topic.accuracy} threshold={report.policy.supportThresholdPercent} /></TableCell><TableCell><div className="flex max-w-xl flex-wrap gap-1.5">{topic.supportStudentIds.length ? topic.supportStudentIds.map((studentId) => <button type="button" key={studentId} onClick={() => onOpenStudent(studentId)} className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100">{names.get(studentId) ?? studentId}</button>) : <span className="text-sm text-emerald-700">Không có học sinh dưới ngưỡng</span>}</div></TableCell></tr>)}</TableBody></Table></div></section>;
}

function QuestionReportTable({ report }: { report: ExamClassReport }) {
  return <section data-testid="class-report-questions" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"><div className="overflow-x-auto"><Table className="min-w-[980px]"><TableHeader className="!bg-brand-600 !text-white"><tr><TableHead className="w-16 text-center !text-white">Câu</TableHead><TableHead className="!text-white">Nội dung</TableHead><TableHead className="!text-white">Chủ đề</TableHead><TableHead className="text-center !text-white">Mẫu số</TableHead><TableHead className="text-center !text-white">Đúng / sai / trống</TableHead><TableHead className="text-center !text-white">Chính xác</TableHead></tr></TableHeader><TableBody>{report.questionPerformance.length === 0 ? <TableEmptyRow colSpan={6} message="Bài kiểm tra chưa có câu hỏi." /> : null}{report.questionPerformance.map((question) => <tr key={question.questionId}><TableCell className="text-center font-black text-brand-700">{question.order}</TableCell><TableCell><p className="max-w-xl font-semibold leading-6 text-slate-900">{question.content}</p>{question.optionDistribution.length ? <p className="mt-1 text-xs text-slate-400">{question.optionDistribution.map((option) => `${option.label}: ${option.selectedCount}`).join(" · ")}</p> : null}</TableCell><TableCell><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-brand-700">{question.topicName}</span></TableCell><TableCell className="text-center">{question.opportunityCount}</TableCell><TableCell className="text-center">{question.correctCount === null ? <span className="text-slate-400">Tự luận, chưa tự chấm</span> : <><b className="text-emerald-700">{question.correctCount}</b> / <b className="text-rose-700">{question.incorrectCount}</b> / <b className="text-slate-500">{question.unansweredCount}</b></>}</TableCell><TableCell className="text-center"><AccuracyBadge value={question.accuracy} threshold={report.policy.supportThresholdPercent} /></TableCell></tr>)}</TableBody></Table></div><p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Mẫu số là số lượt được chọn có câu hỏi này trong snapshot; phù hợp khi hệ thống dùng nhiều mã đề hoặc tập câu khác nhau.</p></section>;
}

function ParticipationBadge({ status }: { status: ExamClassReportStudent["participationStatus"] }) {
  const content = status === "SUBMITTED" ? ["Đã nộp", "bg-emerald-50 text-emerald-700"] : status === "IN_PROGRESS" ? ["Đang làm", "bg-amber-50 text-amber-700"] : ["Chưa bắt đầu", "bg-slate-100 text-slate-600"];
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${content[1]}`}>{content[0]}</span>;
}

function AccuracyBadge({ value, threshold }: { value: number | null; threshold: number }) {
  if (value === null) return <span className="text-sm text-slate-400">Không áp dụng</span>;
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ${value < threshold ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{formatNumber(value)}%</span>;
}

function formatNumber(value: number): string { return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value); }
function formatDuration(value: number | null): string { if (value === null) return "—"; const totalSeconds = Math.round(value); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return minutes ? `${minutes} phút${seconds ? ` ${seconds} giây` : ""}` : `${seconds} giây`; }

export function SubmissionDetailPage() {
  const params = useParams<{ id: string; attemptId: string }>(); const [data, setData] = useState<(ExamAttempt & { exam: Exam }) | null>(null); const [error, setError] = useState("");
  useEffect(() => { void fetchAttempt(params.attemptId).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải bài làm")); }, [params.attemptId]);
  if (error) return <AssessmentShell><ErrorPanel message={error} /></AssessmentShell>; if (!data) return <AssessmentShell><LoadingPanel /></AssessmentShell>;
  const orderedQuestions = [...data.exam.questions].sort((left, right) => left.order - right.order);
  return (
    <AssessmentShell>
      <div className="mx-auto w-full max-w-[1440px] px-2 sm:px-4 lg:px-6">
        <PageHeading eyebrow="Submission review" title={`Bài làm của ${data.studentName}`} description={data.exam.title} />
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span className="inline-flex items-center gap-2 font-bold text-emerald-700"><CheckCircle2 className="size-4" />{data.status === "SUBMITTED" ? "Đã nộp" : "Đang làm"}</span>
            {data.examCode ? <span>Mã đề: <b>{data.examCode}</b></span> : null}
            <span>Điểm: <b>{data.score ?? "—"}/{data.exam.totalPoints}</b></span>
            <span>Đúng: <b>{data.correctCount ?? "—"}/{data.exam.questions.length}</b></span>
          </div>
        </section>

        <div className="space-y-4">
          {orderedQuestions.map((examQuestion, index) => {
            const question = examQuestion.question;
            const answer = data.answers.find((item) => item.questionId === examQuestion.questionId);
            const selectedOptionIds = answer?.selectedOptionIds ?? [];
            const correctOptionIds = question?.correctOptionIds ?? [];
            const isObjective = Boolean(question && question.type !== "ESSAY");
            const isCorrect = isObjective && selectedOptionIds.length > 0 && selectedOptionIds.length === correctOptionIds.length && selectedOptionIds.every((id) => correctOptionIds.includes(id));
            return (
              <article key={examQuestion.questionId} className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-card sm:px-6 lg:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-brand-600">Câu {index + 1}</p>
                    <h2 className="mt-1 text-[15px] font-black leading-6 text-slate-950">{question?.content ?? examQuestion.questionId}</h2>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{examQuestion.points} điểm</span>
                    {isObjective ? <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{isCorrect ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}{isCorrect ? "Đúng" : "Chưa đúng"}</span> : null}
                  </div>
                </div>

                {isObjective ? (
                  <div className="mt-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {question?.options.map((option, optionIndex) => {
                        const selected = selectedOptionIds.includes(option.id);
                        const correct = correctOptionIds.includes(option.id);
                        const optionLabel = option.label?.trim().toUpperCase() || String.fromCharCode(65 + optionIndex);
                        return (
                          <div key={option.id} className={`flex items-start gap-3 rounded-xl border p-3 ${correct ? "border-emerald-200 bg-emerald-50/70" : selected ? "border-rose-200 bg-rose-50/70" : "border-slate-200 bg-white"}`}>
                            <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black ${correct ? "bg-emerald-600 text-white" : selected ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"}`}>{optionLabel}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-5 text-slate-800">{option.text}</p>
                              {correct || selected ? <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">{selected ? <span className={correct ? "text-brand-700" : "text-rose-700"}>Học sinh chọn</span> : null}{correct ? <span className="text-emerald-700">Đáp án đúng</span> : null}</div> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Câu trả lời</p><p className="mt-2 whitespace-pre-wrap font-semibold leading-6 text-slate-700">{answer?.essayText || "Bỏ trống"}</p></div>
                )}
                {question?.explanation ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"><b>Giải thích:</b> {question.explanation}</p> : null}
              </article>
            );
          })}
        </div>
      </div>
    </AssessmentShell>
  );
}

async function fetchAttempt(id: string): Promise<ExamAttempt & { exam: Exam }> {
  const { examAttemptService } = await import("@/lib/assessment-api");
  return examAttemptService.getAttempt(id);
}
