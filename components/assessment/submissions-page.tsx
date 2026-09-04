"use client";

import { CheckCircle2, Clock3, Eye, FileText, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AssessmentShell, ErrorPanel, LoadingPanel, PageHeading } from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableEmptyRow, TableHead, TableHeader } from "@/components/ui/data-table";
import { examService } from "@/lib/assessment-api";
import type { Exam, ExamAttempt } from "@/types/assessment";

export function SubmissionsPage() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const [exam, setExam] = useState<Exam | null>(null); const [submissions, setSubmissions] = useState<ExamAttempt[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { void Promise.all([examService.getExamById(params.id), examService.getSubmissions(params.id)]).then(([loadedExam, loadedSubmissions]) => { setExam(loadedExam); setSubmissions(loadedSubmissions); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải bài nộp")).finally(() => setLoading(false)); }, [params.id]);
  if (loading) return <AssessmentShell><LoadingPanel /></AssessmentShell>; if (error || !exam) return <AssessmentShell><ErrorPanel message={error || "Không tìm thấy bài kiểm tra"} /></AssessmentShell>;
  const submitted = submissions.filter((item) => item.status === "SUBMITTED");
  return (
    <AssessmentShell>
      <PageHeading eyebrow="Submission management" title="Danh sách bài nộp" description={`${exam.title} · ${exam.className}`} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-700"><FileText className="size-5" /></span>
          <div><p className="text-xs font-semibold text-slate-500">Tổng bài nộp</p><p className="mt-0.5 text-2xl font-black text-slate-950">{submissions.length}</p><p className="text-[11px] text-slate-400">Tất cả lượt làm bài</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-5" /></span>
          <div><p className="text-xs font-semibold text-slate-500">Đã nộp</p><p className="mt-0.5 text-2xl font-black text-emerald-600">{submitted.length}</p><p className="text-[11px] text-slate-400">Đã hoàn thành</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="size-5" /></span>
          <div><p className="text-xs font-semibold text-slate-500">Đang làm</p><p className="mt-0.5 text-2xl font-black text-amber-600">{submissions.filter((item) => item.status === "IN_PROGRESS").length}</p><p className="text-[11px] text-slate-400">Chưa hoàn thành</p></div>
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <Table className="min-w-[1040px] table-fixed">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[17%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
            </colgroup>
            <TableHeader className="sticky top-0 z-10 !bg-brand-600 !text-white">
              <tr>
                <TableHead className="!text-white">Học sinh</TableHead>
                <TableHead className="!text-white">Mã học sinh</TableHead>
                <TableHead className="!text-white">Trạng thái</TableHead>
                <TableHead className="!text-white">Thời gian nộp</TableHead>
                <TableHead className="text-center !text-white">Điểm</TableHead>
                <TableHead className="text-right !text-white">Thao tác</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 ? <TableEmptyRow colSpan={6} message="Chưa có học sinh nộp bài." /> : null}
              {submissions.map((submission) => (
                <tr key={submission.id} className="transition hover:bg-slate-50/70">
                  <TableCell>
                    <p className="font-bold text-slate-900">{submission.studentName}</p>
                    <p className="mt-1 text-xs text-slate-400">{submission.examCode ? `Mã đề ${submission.examCode} · ` : ""}Mã bài làm: {submission.id.slice(0, 8)}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm font-bold text-brand-700">{submission.studentCode ?? "—"}</TableCell>
                  <TableCell><span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${submission.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{submission.status === "SUBMITTED" ? "Đã nộp" : "Đang làm"}</span></TableCell>
                  <TableCell className="whitespace-nowrap">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("vi-VN") : <span className="inline-flex items-center gap-1 text-slate-400"><Clock3 className="size-3" /> Chưa nộp</span>}</TableCell>
                  <TableCell className="text-center font-black text-slate-800">{submission.score === null ? "—" : `${submission.score}/${exam.totalPoints}`}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => router.push(`/teacher/exams/${exam.id}/submissions/${submission.id}`)}><Eye className="size-4" /> Xem</Button></TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </AssessmentShell>
  );
}

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
